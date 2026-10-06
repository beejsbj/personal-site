/** The loom: the drawing surface of one screen.
 *
 * A page-tall stack of canvas tiles behind the content. The marks for the
 * whole screen are composed from its layout (see weave.ts) and sorted by
 * reveal key (roughly, page y; a thread's detour round something is keyed
 * in the order the hand goes round). As the reader scrolls, the reach (how
 * far down the page the hand has drawn) runs ahead of the viewport, and
 * every mark it passes is laid on the tiles it touches: the threads draw
 * themselves just ahead of you, and stay drawn. A bead of light rides the
 * tip of each hion, so there is always something to follow.
 *
 * Cheap on purpose: tiles exist only near the viewport (others are dropped
 * and redrawn identically when you come back), each mark is drawn once and
 * within a per-frame budget, blooms live on quarter-resolution canvases,
 * and nothing runs while the page is idle or once the drawing has caught
 * up with you. */
import { type Hue, Kind, type Mark, paint, paintGlow, patterns, type Patterns, type Pt } from "./pastel";

const TILE = 1024;
const GLOW = 0.25;

interface Tile {
  index: number;
  el: HTMLElement;
  ctx: CanvasRenderingContext2D;
  gctx: CanvasRenderingContext2D;
  pats: Patterns;
  /** Next position in this tile's bucket still to lay. */
  cursor: number;
}

export interface Composition {
  marks: Mark[];
  /** Each hion's whole way down the page, with the reveal key of every
   * point, for its bead to ride. */
  tips: { hue: Hue; points: Pt[]; keys: Float64Array }[];
  /** The detours round things a hion circles, once drawn (key is the
   * reveal key of their last point), for a glint to ride. */
  orbits: { hue: Hue; points: Pt[]; key: number }[];
  /** Where the threads end (page y), if they do. */
  end: number | null;
}

interface LoomOptions {
  host: HTMLElement;
  signal: AbortSignal;
  /** Draw everything at once (reduced motion, still face). */
  instant: boolean;
  /** How far beyond the viewport to keep tiles, in viewports (a still
   * face never scrolls, so it keeps none). */
  lookahead?: number;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
  compose(): Composition;
}

export function createLoom(options: LoomOptions) {
  const { host, signal, instant } = options;
  const layer = document.createElement("div");
  layer.className = "hion-loom";
  layer.setAttribute("aria-hidden", "true");
  // One bead of light at the tip of each hion, riding its own thread.
  const beads = (["c", "m"] as Hue[]).map((hue) => {
    const el = document.createElement("span");
    el.className = "hion-bead";
    el.dataset.hue = hue;
    layer.append(el);
    return el;
  });
  host.prepend(layer);

  let marks: Mark[] = [];
  let tips: Composition["tips"] = [];
  let orbits: Composition["orbits"] = [];
  let end = Infinity;
  /** Counts up each time the drawing is composed afresh. */
  let version = 0;
  let upto = 0; // marks[0..upto) are due on every tile
  let buckets: number[][] = []; // per tile, the marks that touch it
  let reach = 0;
  let target = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  const tiles = new Map<number, Tile>();
  let reveals: { el: HTMLElement; at: number }[] = [];
  let frame = 0;
  let last = 0;
  let built = false;
  /** The first drawing of a screen is slow enough to watch; after that, it
   * keeps up with the reader. */
  let intro = true;

  function hostTop() {
    return host.getBoundingClientRect().top + scrollY;
  }

  function build() {
    width = host.clientWidth;
    height = host.scrollHeight;
    dpr = Math.min(devicePixelRatio || 1, width > 800 ? 1.5 : 2);
    layer.style.height = `${height}px`;
    const composed = options.compose();
    marks = composed.marks.sort((a, b) => a.key - b.key);
    buckets = Array.from({ length: Math.ceil(height / TILE) }, () => []);
    marks.forEach((m, i) => {
      const from = Math.max(0, Math.floor(m.y0 / TILE));
      const to = Math.min(buckets.length - 1, Math.floor(m.y1 / TILE));
      for (let t = from; t <= to; t++) buckets[t].push(i);
    });
    tips = composed.tips;
    orbits = composed.orbits;
    end = composed.end ?? Infinity;
    version++;
    for (const tile of tiles.values()) tile.el.remove();
    tiles.clear();
    upto = 0;
    const top = hostTop();
    reveals = [...host.querySelectorAll<HTMLElement>("[data-reveal]")]
      .map((el) => ({
        el,
        at: el.getBoundingClientRect().top + scrollY - top + 24,
      }))
      .sort((a, b) => a.at - b.at);
    built = true;
  }

  function makeTile(index: number): Tile {
    const el = document.createElement("div");
    el.className = "hion-loom__tile";
    const tileHeight = Math.min(TILE, height - index * TILE);
    el.style.top = `${index * TILE}px`;
    el.style.height = `${tileHeight}px`;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(tileHeight * dpr);
    const glow = document.createElement("canvas");
    glow.className = "hion-loom__glow";
    glow.width = Math.ceil(width * GLOW);
    glow.height = Math.ceil(tileHeight * GLOW);
    el.append(glow, canvas);
    layer.append(el);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, -index * TILE * dpr);
    const gctx = glow.getContext("2d")!;
    gctx.setTransform(GLOW, 0, 0, GLOW, 0, -index * TILE * GLOW);
    return { index, el, ctx, gctx, pats: patterns(ctx, dpr), cursor: 0 };
  }

  function lay(tile: Tile, m: Mark) {
    if (m.kind === Kind.Glow) paintGlow(tile.gctx, m);
    else paint(tile.ctx, m, tile.pats);
  }

  /** Lay what is due on each tile, nearest the reader first, within a
   * budget, so a new tile never stalls a frame: tiles are made well ahead
   * of the viewport and fill in over a few frames. */
  function fill(deadline: number, inView = false) {
    const top = scrollY - hostTop();
    const middle = top + innerHeight / 2;
    const order = [...tiles.values()]
      .filter(
        (tile) =>
          !inView ||
          ((tile.index + 1) * TILE > top && tile.index * TILE < top + innerHeight),
      )
      .sort(
      (a, b) =>
        Math.abs((a.index + 0.5) * TILE - middle) -
        Math.abs((b.index + 0.5) * TILE - middle),
    );
    let behind = false;
    for (const tile of order) {
      const bucket = buckets[tile.index] ?? [];
      while (tile.cursor < bucket.length && bucket[tile.cursor] < upto) {
        if (performance.now() > deadline) return true;
        lay(tile, marks[bucket[tile.cursor++]]);
      }
      if (tile.cursor < bucket.length && bucket[tile.cursor] < upto) behind = true;
    }
    return behind;
  }

  /** Keep tiles near the viewport; drop far ones. */
  function cull() {
    const top = scrollY - hostTop();
    const ahead = options.lookahead ?? 0.6;
    const from = Math.max(0, Math.floor((top - innerHeight * Math.min(0.5, ahead)) / TILE));
    const to = Math.min(
      Math.ceil(height / TILE) - 1,
      Math.floor((top + innerHeight * (1 + ahead)) / TILE),
    );
    for (const [index, tile] of tiles) {
      if (index < from - 1 || index > to + 1 || (ahead === 0 && (index < from || index > to))) {
        tile.el.remove();
        tiles.delete(index);
      }
    }
    for (let i = from; i <= to; i++) {
      if (!tiles.has(i)) tiles.set(i, makeTile(i));
    }
  }

  function advance(to: number) {
    reach = to;
    while (upto < marks.length && marks[upto].key <= reach) upto++;
    while (reveals.length && reveals[0].at <= reach) {
      reveals.shift()!.el.setAttribute("data-lit", "");
    }
    beads.forEach((bead, i) => {
      const tip = tips.find((t) => t.hue === (i ? "m" : "c"));
      if (!tip || instant || reach - 30 > end) {
        bead.dataset.state = "gone";
        return;
      }
      // The furthest point of this thread already drawn.
      let lo = 0;
      let hi = tip.keys.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (tip.keys[mid] <= reach) lo = mid;
        else hi = mid;
      }
      const [x, y] = tip.points[lo];
      bead.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      bead.dataset.state = reach >= target - 1 ? "resting" : "drawing";
    });
  }

  function aim() {
    const top = scrollY - hostTop();
    target = instant
      ? height + 1
      : Math.max(target, Math.min(height + 1, top + innerHeight * (intro ? 0.94 : 1.05)));
  }

  function tick(now: number) {
    frame = 0;
    if (options.isIdle()) return;
    const deadline = performance.now() + 7;
    const dt = Math.min(64, now - (last || now));
    last = now;
    // The hand draws at a pace you can watch, and hurries when you scroll
    // far ahead of it.
    let gap = target - reach;
    // Far behind (a jump, a fling): lay what you have passed at once, and
    // draw only the last stretch in front of you.
    if (gap > innerHeight * 1.4) {
      advance(target - innerHeight * 0.9);
      gap = target - reach;
    }
    if (gap > 0.5) {
      const speed = intro ? 0.26 + gap / 800 : 0.45 + gap / 450; // px per ms
      advance(Math.min(target, reach + speed * dt));
    } else {
      last = 0;
      advance(target);
    }
    const behind = fill(deadline);
    if (gap > 0.5 || behind) frame = requestAnimationFrame(tick);
    else last = 0;
  }

  function wake() {
    if (!frame && !options.isIdle()) frame = requestAnimationFrame(tick);
  }

  function onScroll() {
    if (!built) return;
    if (scrollY > 0) intro = false;
    cull();
    aim();
    if (instant) advance(target);
    wake();
  }

  let resizeTimer = 0;
  let observedWidth = 0;
  let observedHeight = 0;
  const observer = new ResizeObserver(() => {
    if (
      host.clientWidth === observedWidth &&
      host.scrollHeight === observedHeight
    )
      return;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      observedWidth = host.clientWidth;
      observedHeight = host.scrollHeight;
      const kept = reach;
      build();
      cull();
      advance(kept);
      // What you are looking at is redrawn before the next paint.
      fill(Infinity, true);
      aim();
      wake();
    }, 140);
  });

  options.onIdleChange((idle) => {
    if (!idle) wake();
  });

  return {
    start() {
      observedWidth = host.clientWidth;
      observedHeight = host.scrollHeight;
      build();
      cull();
      aim();
      if (instant) {
        advance(target);
        fill(Infinity, true);
      } else advance(0);
      wake();
      addEventListener("scroll", onScroll, { passive: true, signal });
      addEventListener("resize", onScroll, { passive: true, signal });
      observer.observe(host);
      signal.addEventListener("abort", () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        clearTimeout(resizeTimer);
      });
    },
    /** Let the drawing go: the threads lift away. */
    release() {
      layer.dataset.state = "leaving";
      // Reeled back in: the drawing withdraws up the screen, toward the
      // line at the top it came from.
      const top = scrollY - hostTop();
      const bottom = Math.max(0, height - (top + innerHeight));
      const gone = Math.max(0, height - Math.max(0, top));
      layer.animate(
        [{ clipPath: `inset(0 0 ${bottom}px 0)` }, { clipPath: `inset(0 0 ${gone}px 0)` }],
        { duration: 420, easing: "cubic-bezier(0.55, 0, 0.8, 0.2)", fill: "forwards" },
      );
      cancelAnimationFrame(frame);
      frame = 0;
    },
    /** Light everything now (e.g. focus jumped far ahead). */
    catchUp(y: number) {
      target = Math.max(target, Math.min(height + 1, y));
      wake();
    },
    /* What is drawn, for life.ts: the threads answer the visitor on it. */
    journeys: () => tips,
    orbits: () => orbits,
    reach: () => reach,
    version: () => version,
  };
}
