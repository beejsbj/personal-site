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
 * On a page the hions themselves are the skein's (skein.ts): strands like
 * every other thread, grown along their composed ways as far as the loom
 * has drawn; the loom lays only what hangs from them (wefts, knots, ties,
 * cords) and says how far it has drawn. A track lays its hions in pastel
 * and keeps beads of its own.
 *
 * Cheap on purpose: tiles exist only near the viewport (others are dropped
 * and redrawn identically when you come back), each mark is drawn once and
 * within a per-frame budget, blooms live on quarter-resolution canvases,
 * and nothing runs while the page is idle or once the drawing has caught
 * up with you.
 *
 * A drawing can also read across (`axis: "x"`): the timeline on a wide
 * resume, a track slid sideways as the page scrolls (track.ts). Then the
 * tiles are columns, the reach runs left to right, and what is in sight is
 * the stretch of the track its `view()` reports. Everything else is the
 * same: the marks only need composing with their keys and extents along x
 * (weave.ts composes such a drawing turned, as if it read down). */
import { type Hue, Kind, type Mark, paint, paintGlow, patterns, type Patterns, type Pt } from "./pastel";
import { still } from "./dom";
import { createPulse, type Pulse } from "./pulse";

/** Tile length: a frame that draws re-sends only the tiles it touched,
 * so shorter tiles cost less each frame. */
const TILE = 512;
const GLOW = 0.25;

interface Tile {
  index: number;
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  glow: HTMLCanvasElement;
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
  /** Where the threads end (along the axis the drawing reads), if they do. */
  end: number | null;
}

/** The stretch of a drawing in sight: where it starts along the axis the
 * drawing reads, how long it is, and whether any of it is on screen. */
export interface View {
  start: number;
  size: number;
  shown: boolean;
}

interface LoomOptions {
  host: HTMLElement;
  signal: AbortSignal;
  /** Draw everything at once (reduced motion, still face). */
  instant: boolean;
  /** How far beyond the viewport to keep tiles, in viewports (a still
   * face never scrolls, so it keeps none). */
  lookahead?: number;
  /** A screen you travelled to: its first drawing comes down briskly, so
   * what you came for is lit while the ribbon is still unfurling (the
   * screen you arrive on is drawn slowly enough to watch). */
  brisk?: boolean;
  /** Which way the drawing reads: down the page (default), or across. */
  axis?: "x" | "y";
  /** Reading across: what of the track is in sight. */
  view?: () => View;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
  compose(): Composition;
  /** The screen's frame loop (a track without one makes its own). */
  pulse?: Pulse;
  /** Beads of light at the hions' tips (default). Off where the skein
   * draws their heads. */
  beads?: boolean;
  /** Told each frame the drawing moves on. */
  onDraw?(): void;
}

export function createLoom(options: LoomOptions) {
  const { host, signal, instant } = options;
  const across = options.axis === "x";
  // Whose drawing a thing on the page belongs to: a track inside the page
  // draws its own (weave.ts and the reveals here keep to their host's).
  host.dataset.loom = across ? "x" : "y";
  const layer = document.createElement("div");
  layer.className = across ? "hion-loom hion-loom--across" : "hion-loom";
  layer.setAttribute("aria-hidden", "true");
  // One bead of light at the tip of each hion, riding its own thread.
  const beads = (options.beads === false ? [] : (["c", "m"] as Hue[])).map((hue) => {
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
  /** Length along the axis the drawing reads, and breadth across it. */
  let length = 0;
  let breadth = 0;
  let dpr = 1;
  const tiles = new Map<number, Tile>();
  let reveals: { el: HTMLElement; at: number }[] = [];
  let built = false;
  /** The first drawing of a screen is slow enough to watch; after that, it
   * keeps up with the reader. */
  let intro = true;

  function hostTop() {
    return host.getBoundingClientRect().top + scrollY;
  }

  /** What of the drawing is in sight. */
  function sight(): View {
    if (across && options.view) return options.view();
    return { start: scrollY - hostTop(), size: innerHeight, shown: true };
  }

  const measureLength = () => (across ? host.scrollWidth : host.scrollHeight);
  const measureBreadth = () => (across ? host.clientHeight : host.clientWidth);

  function build() {
    length = measureLength();
    breadth = measureBreadth();
    dpr = Math.min(devicePixelRatio || 1, across || breadth > 800 ? 1.5 : 2);
    if (across) {
      layer.style.width = `${length}px`;
      layer.style.height = `${breadth}px`;
    } else layer.style.height = `${length}px`;
    const composed = options.compose();
    marks = composed.marks.sort((a, b) => a.key - b.key);
    buckets = Array.from({ length: Math.ceil(length / TILE) }, () => []);
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
    const hostBox = host.getBoundingClientRect();
    reveals = [...host.querySelectorAll<HTMLElement>("[data-reveal]")]
      .filter((el) => el.parentElement?.closest("[data-loom]") === host)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { el, at: (across ? r.left - hostBox.left : r.top - hostBox.top) + 24 };
      })
      .sort((a, b) => a.at - b.at);
    built = true;
  }

  function makeTile(index: number): Tile {
    const el = document.createElement("div");
    el.className = "hion-loom__tile";
    const tileLength = Math.min(TILE, length - index * TILE);
    // Rows down the page; columns across a track.
    const [w, h] = across ? [tileLength, breadth] : [breadth, tileLength];
    if (across) {
      Object.assign(el.style, { left: `${index * TILE}px`, top: "0", width: `${w}px`, height: `${h}px` });
    } else {
      el.style.top = `${index * TILE}px`;
      el.style.height = `${h}px`;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    const glow = document.createElement("canvas");
    glow.className = "hion-loom__glow";
    glow.width = Math.ceil(w * GLOW);
    glow.height = Math.ceil(h * GLOW);
    el.append(glow, canvas);
    layer.append(el);
    const shift = -index * TILE;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, across ? shift * dpr : 0, across ? 0 : shift * dpr);
    const gctx = glow.getContext("2d")!;
    gctx.setTransform(GLOW, 0, 0, GLOW, across ? shift * GLOW : 0, across ? 0 : shift * GLOW);
    return { index, el, canvas, glow, ctx, gctx, pats: patterns(ctx, dpr), cursor: 0 };
  }

  function lay(tile: Tile, m: Mark) {
    if (m.kind === Kind.Glow) paintGlow(tile.gctx, m);
    else paint(tile.ctx, m, tile.pats);
  }

  /** Lay what is due on each tile, nearest the reader first, within a
   * budget, so a new tile never stalls a frame: tiles are made well ahead
   * of the viewport and fill in over a few frames. */
  function fill(deadline: number, inView = false) {
    const { start: top, size } = sight();
    const middle = top + size / 2;
    const order = [...tiles.values()]
      .filter(
        (tile) =>
          !inView ||
          ((tile.index + 1) * TILE > top && tile.index * TILE < top + size),
      )
      .sort(
      (a, b) =>
        Math.abs((a.index + 0.5) * TILE - middle) -
        Math.abs((b.index + 0.5) * TILE - middle),
    );
    let behind = false;
    // Each tile drawn on is shown as a still again (dom.ts), once.
    const drawn = new Set<Tile>();
    const show = () => {
      for (const tile of drawn) {
        still(tile.canvas);
        still(tile.glow);
      }
    };
    for (const tile of order) {
      const bucket = buckets[tile.index] ?? [];
      while (tile.cursor < bucket.length && bucket[tile.cursor] < upto) {
        if (performance.now() > deadline) {
          show();
          return true;
        }
        lay(tile, marks[bucket[tile.cursor++]]);
        drawn.add(tile);
      }
      if (tile.cursor < bucket.length && bucket[tile.cursor] < upto) behind = true;
    }
    show();
    return behind;
  }

  /** Keep tiles near the viewport; drop far ones. */
  function cull() {
    const { start: top, size } = sight();
    const ahead = options.lookahead ?? 0.6;
    const from = Math.max(0, Math.floor((top - size * Math.min(0.5, ahead)) / TILE));
    const to = Math.min(
      Math.ceil(length / TILE) - 1,
      Math.floor((top + size * (1 + ahead)) / TILE),
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
    const { start: top, size, shown } = sight();
    // A track not yet in sight waits to be drawn until you get to it.
    if (!instant && !shown) return;
    target = instant
      ? length + 1
      : Math.max(target, Math.min(length + 1, top + size * (intro ? 0.94 : 1.05)));
  }

  function tick(_now: number, dt: number) {
    if (options.isIdle() || !built) return false;
    const deadline = performance.now() + 7;
    // The hand draws at a pace you can watch, and hurries when you scroll
    // far ahead of it.
    let gap = target - reach;
    // Far behind (a jump, a fling): lay what you have passed at once, and
    // draw only the last stretch in front of you.
    const size = across ? sight().size : innerHeight;
    if (gap > size * 1.4) {
      advance(target - size * 0.9);
      gap = target - reach;
    }
    if (gap > 0.5) {
      const speed = intro
        ? options.brisk
          ? 1.4 + gap / 220
          : 0.26 + gap / 800
        : 0.45 + gap / 450; // px per ms
      advance(Math.min(target, reach + speed * dt));
      options.onDraw?.();
    } else advance(target);
    const behind = fill(deadline);
    return gap > 0.5 || behind;
  }

  const task = (options.pulse ?? createPulse({ signal, isIdle: options.isIdle, onIdleChange: options.onIdleChange })).add(tick);

  function wake() {
    task.wake();
  }

  function onScroll() {
    if (!built) return;
    if (across ? sight().start > 0 : scrollY > 0) intro = false;
    cull();
    aim();
    if (instant) advance(target);
    wake();
  }

  let resizeTimer = 0;
  let observedWidth = 0;
  let observedHeight = 0;
  const observer = new ResizeObserver(() => {
    if (measureBreadth() === observedWidth && measureLength() === observedHeight) return;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      observedWidth = measureBreadth();
      observedHeight = measureLength();
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

  return {
    start() {
      observedWidth = measureBreadth();
      observedHeight = measureLength();
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
        clearTimeout(resizeTimer);
      });
    },
    /** Let the drawing go: the threads lift away. */
    release() {
      layer.dataset.state = "leaving";
      // Reeled back in: the drawing withdraws up the screen, toward the
      // line at the top it came from (a track is in sight top to bottom).
      const top = across ? 0 : scrollY - hostTop();
      const tall = across ? breadth : length;
      const bottom = across ? 0 : Math.max(0, tall - (top + innerHeight));
      const gone = Math.max(0, tall - Math.max(0, top));
      layer.animate(
        [{ clipPath: `inset(0 0 ${bottom}px 0)` }, { clipPath: `inset(0 0 ${gone}px 0)` }],
        { duration: 420, easing: "cubic-bezier(0.55, 0, 0.8, 0.2)", fill: "forwards" },
      );
      built = false;
    },
    /** Light everything now (e.g. focus jumped far ahead), to this far
     * along the axis the drawing reads. */
    catchUp(to: number) {
      target = Math.max(target, Math.min(length + 1, to));
      wake();
    },
    /* What is drawn, for life.ts: the threads answer the visitor on it. */
    journeys: () => tips,
    orbits: () => orbits,
    reach: () => reach,
    /** Whether the hand is still drawing toward where you are. */
    drawing: () => target - reach > 0.5,
    version: () => version,
  };
}
