/** Threads of intent: the ground under the two hions.
 *
 * Behind every screen, long threads of cyan and magenta find their way
 * down the page (fate.ts). Each grows only from its head, a bead of light
 * trailing a run of thread that cools, a little way behind it, into a
 * quiet ground. They come down from where the hions leave the line and in
 * from either edge, each when the drawing reaches it; they run taut, turn
 * at the words and never through them, fall in alongside one another,
 * converge on a gather and part again, cross over and under; a few run off
 * alone. A finished thread lies a while, then fades, and new ones come in
 * from the edges near you, so the page lives without ever filling. A tap
 * on the paper sends a pair out from there.
 *
 * Cheap on purpose: the ground is painted onto page-space tiles that exist
 * only near the viewport, a few dozen pixels of thread at a time; each
 * growing head (and the bright run behind it) has a small canvas of its
 * own, repainted a few times a second (a beat, not a frame) and only
 * while it is on screen.
 * The loop sleeps while the prism holds the page still, while the tab is
 * hidden, and between births and fades. For a reduced-motion visitor (or a
 * still prism face) the threads are grown to their end out of sight, shown
 * settled, and never move. */
import { Fate, goalsFor, Ground, plan, type Gather, type Seed, STEP, type Thread } from "./fate";
import type { createLoom } from "./loom";
import { type Hue, patterns, type Patterns, type Pt, RGB, rng } from "./pastel";

type Loom = ReturnType<typeof createLoom>;

interface ThreadsOptions {
  page: HTMLElement;
  loom: Loom;
  signal: AbortSignal;
  /** Settle at once and never move (reduced motion, a still face). */
  instant: boolean;
  /** How close the page is seen: 2 is a single thing, close up. */
  scale?: number;
  /** Where the hions come down from the line (page px). */
  origin(): Pt | null;
  /** The page's own seed (its path): the same page grows the same way. */
  seed: number;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

/** A piece of ground: one column of a row of the page. */
interface Pane {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pats: Patterns;
  x0: number;
  x1: number;
}

/** A row of ground, in panes: a batch of thread laid re-sends only the
 * panes it touched, not the page's width. */
interface Tile {
  index: number;
  panes: Pane[];
}

interface Head {
  /** The bead and the bright run behind it. */
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Where the canvas sits on the page. */
  x: number;
  y: number;
}

interface Strand {
  t: Thread;
  /** Segments [0, laid) are on the ground. */
  laid: number;
  /** Steps owed (fractional). */
  owed: number;
  /** When it starts to fade (performance.now()), once finished. */
  fadeAt: number;
  /** How much of it is left (1, fading to 0). */
  alpha: number;
  top: number;
  bottom: number;
  /** Held still while the reader is away. */
  resting?: boolean;
  head?: Head;
}

const TILE = 512;
const PANE = 320;
/** How fast a head grows (px a second). */
const SPEED = 40;
/** The bright run behind a head (steps), and how much is laid at once. */
const TAIL = 24;
const BATCH = 8;
/** The ground's strength, the bright head being 1: the paper's tooth takes
 * about half again, so it lies at a quarter or so. */
const GROUND = 0.6;
/** Heads growing at once, near the reader (fewer on a screen seen close,
 * where each is twice the size and its page otherwise very still). */
const LIVE = 3;
/** The beat: heads grow and their runs are repainted this often (ms). A
 * hand drawing in short strokes, and a frame the page must commit only a
 * few times a second. */
const BEAT = 200;
/** How long the threads keep growing after the reader last did anything,
 * and after the screen arrives (ms). */
const ATTEND = 6000;
const ARRIVE = 6000;
/** How long a finished thread lies before it fades (ms), and the fade. */
const HOLD = 50000;
const FADE = 3000;
const FADES = 6;
/** The head's canvas (css px). */
const HEAD = (TAIL + BATCH) * STEP + 32;

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
export const seedOf = (path: string) => hash(path) % 100000;

export function createThreads(options: ThreadsOptions) {
  const { page, loom, signal, instant } = options;
  const scale = options.scale ?? 1;
  const layer = document.createElement("div");
  layer.className = "hion-threads";
  layer.setAttribute("aria-hidden", "true");
  page.prepend(layer);

  let ground = new Ground(1, 1);
  let fate = new Fate(ground);
  let all: Gather[] = [];
  let seeds: Seed[] = [];
  let sown = 0;
  let strands: Strand[] = [];
  const tiles = new Map<number, Tile>();
  let width = 0;
  let height = 0;
  let pageTop = 0;
  let tileRows = 1;
  let dpr = 1;
  let built = false;
  let busy = false;
  let frame = 0;
  let timer = 0;
  let last = 0;
  let lastBirth = 0;
  let nextTrickle = 0;
  /** When the reader last did anything (scrolled, pointed, typed), and
   * when the threads began: they grow while someone is there. */
  let lastInput = 0;
  let began = 0;
  let trickles = 0;
  const lineW = 1.25 * (scale > 1 ? 1.6 : 1);
  const live = scale > 1 ? LIVE - 1 : LIVE;
  // A single thing seen close arrives still: its threads wait for the reader.
  const arrive = scale > 1 ? 0 : ARRIVE;

  /* ---------- Reading the screen ---------- */

  /** Words, pictures and anything you can press keep the paper clear. */
  function holdContent() {
    const p = page.getBoundingClientRect();
    const range = document.createRange();
    for (const root of page.querySelectorAll(":scope > main, :scope > footer")) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.nodeValue?.trim()) continue;
        const el = node.parentElement;
        if (!el || el.closest(".hion-sr, [hidden]")) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width < 1 || r.height < 1) continue;
          ground.hold({ l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top }, 12, 7);
        }
      }
      for (const el of root.querySelectorAll("img, video, picture, svg, a, button, input")) {
        const r = el.getBoundingClientRect();
        if (r.width < 1) continue;
        ground.hold({ l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top }, 9, 9);
      }
    }
    range.detach();
  }

  function build() {
    width = page.clientWidth;
    height = page.scrollHeight;
    pageTop = page.getBoundingClientRect().top + scrollY;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    layer.style.height = `${height}px`;
    tileRows = Math.ceil(height / TILE);
    ground = new Ground(width, height, 8);
    page.classList.add("hion-measuring");
    holdContent();
    page.classList.remove("hion-measuring");
    ground.finish();
    fate = new Fate(ground);
    const origin = options.origin();
    const planned = plan(ground, {
      width,
      height,
      drop: origin?.[0] ?? width * 0.56,
      top: (origin?.[1] ?? 110) + 16,
      seed: options.seed,
      close: scale > 1,
    });
    all = planned.gathers;
    seeds = planned.seeds;
    sown = 0;
    for (const s of strands) dropHead(s);
    strands = [];
    trickles = 0;
    built = true;
  }

  /* ---------- Painting ---------- */

  /** How strongly segment i of a strand lies on the ground: tapered at
   * its start, and at its end once it has one. */
  function taper(s: Strand, i: number) {
    const n = s.t.xs.length - 1;
    let a = Math.min(1, (i + 1) / 16);
    if (s.t.done) a = Math.min(a, (n - i) / 10);
    return Math.max(0, a) * s.alpha;
  }

  /** Lay segments [i0, i1) of a strand on a ground context. */
  function lay(ctx: CanvasRenderingContext2D, pats: Patterns, s: Strand, i0: number, i1: number) {
    const { xs, ys, under, hue } = s.t;
    ctx.strokeStyle = pats[hue];
    ctx.lineWidth = lineW;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // The body in one path; the tapered ends a segment at a time.
    ctx.globalAlpha = GROUND * s.alpha;
    ctx.beginPath();
    let open = false;
    for (let i = i0; i < i1; i++) {
      const a = taper(s, i);
      if (under.has(i) || a < s.alpha) {
        open = false;
        continue;
      }
      if (!open) ctx.moveTo(xs[i], ys[i]);
      ctx.lineTo(xs[i + 1], ys[i + 1]);
      open = true;
    }
    ctx.stroke();
    for (let i = i0; i < i1; i++) {
      const a = taper(s, i);
      if (under.has(i) || a >= s.alpha || a <= 0) continue;
      ctx.globalAlpha = GROUND * a;
      ctx.beginPath();
      ctx.moveTo(xs[i], ys[i]);
      ctx.lineTo(xs[i + 1], ys[i + 1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function tileRange(top: number, bottom: number) {
    return [Math.max(0, Math.floor((top - 4) / TILE)), Math.min(tileRows - 1, Math.floor((bottom + 4) / TILE))];
  }

  /** The panes of a tile a stretch of x touches. */
  function panesIn(tile: Tile, l: number, r: number) {
    return tile.panes.filter((p) => p.x1 >= l - 4 && p.x0 <= r + 4);
  }

  function paintTile(tile: Tile) {
    const t0 = tile.index * TILE;
    for (const pane of tile.panes) {
      const { ctx } = pane;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pane.el.width, pane.el.height);
      ctx.restore();
      for (const s of strands) {
        if (s.laid && s.bottom >= t0 - 4 && s.top <= t0 + TILE + 4) lay(ctx, pane.pats, s, 0, s.laid);
      }
    }
  }

  function makeTile(index: number): Tile {
    const h = Math.min(TILE, height - index * TILE);
    const panes: Pane[] = [];
    for (let x0 = 0; x0 < width; x0 += PANE) {
      const w = Math.min(PANE, width - x0);
      const el = document.createElement("canvas");
      el.className = "hion-threads__tile";
      Object.assign(el.style, { top: `${index * TILE}px`, left: `${x0}px`, width: `${w}px`, height: `${h}px` });
      el.width = Math.ceil(w * dpr);
      el.height = Math.ceil(h * dpr);
      const ctx = el.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -index * TILE * dpr);
      layer.append(el);
      panes.push({ el, ctx, pats: patterns(ctx, dpr), x0, x1: x0 + w });
    }
    const tile = { index, panes };
    paintTile(tile);
    return tile;
  }

  /** Keep tiles near the viewport; drop far ones. */
  function cull() {
    const top = scrollY - pageTop;
    const from = Math.max(0, Math.floor((top - innerHeight * 0.3) / TILE));
    const to = Math.min(tileRows - 1, Math.floor((top + innerHeight * 1.3) / TILE));
    for (const [index, tile] of tiles) {
      if (index < from - 1 || index > to + 1) {
        for (const pane of tile.panes) pane.el.remove();
        tiles.delete(index);
      }
    }
    for (let i = from; i <= to; i++) if (!tiles.has(i)) tiles.set(i, makeTile(i));
  }

  /** Lay what has cooled behind a head (all of it, once it has finished). */
  function cool(s: Strand, all = false) {
    const n = s.t.xs.length - 1;
    const to = all || s.t.done ? n : Math.max(0, n - TAIL);
    if (to - s.laid < (all || s.t.done ? 1 : BATCH)) return;
    let top = Infinity;
    let bottom = -Infinity;
    let left = Infinity;
    let right = -Infinity;
    for (let i = s.laid; i <= to; i++) {
      top = Math.min(top, s.t.ys[i]);
      bottom = Math.max(bottom, s.t.ys[i]);
      left = Math.min(left, s.t.xs[i]);
      right = Math.max(right, s.t.xs[i]);
    }
    s.top = Math.min(s.top, top);
    s.bottom = Math.max(s.bottom, bottom);
    const [a, b] = tileRange(top, bottom);
    for (let k = a; k <= b; k++) {
      const tile = tiles.get(k);
      if (tile) for (const pane of panesIn(tile, left, right)) lay(pane.ctx, pane.pats, s, s.laid, to);
    }
    s.laid = to;
  }

  /** A thread went under one crossing it after it was laid: break it. */
  function breakAt(t: Thread, i: number) {
    const s = strands.find((s) => s.t === t);
    if (!s || i >= s.laid) return;
    const [x0, y0, x1, y1] = [t.xs[i], t.ys[i], t.xs[i + 1], t.ys[i + 1]];
    const [a, b] = tileRange(Math.min(y0, y1), Math.max(y0, y1));
    const panes = [];
    for (let k = a; k <= b; k++) {
      const tile = tiles.get(k);
      if (tile) panes.push(...panesIn(tile, Math.min(x0, x1), Math.max(x0, x1)));
    }
    for (const { ctx } of panes) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = lineW + 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    }
  }

  function makeHead(s: Strand): Head {
    const el = document.createElement("canvas");
    el.className = "hion-threads__head";
    // A bright run is soft anyway: one pixel per css pixel is enough, and it
    // is repainted every beat.
    el.width = el.height = HEAD;
    el.style.width = el.style.height = `${HEAD}px`;
    layer.append(el);
    const ctx = el.getContext("2d")!;
    const n = s.t.xs.length - 1;
    return { el, ctx, x: s.t.xs[n] - HEAD / 2, y: s.t.ys[n] - HEAD / 2 };
  }

  /** The head and the bright run behind it, cooling toward the ground. */
  function paintHead(s: Strand) {
    const { xs, ys, under, hue } = s.t;
    const n = xs.length - 1;
    const hx = xs[n];
    const hy = ys[n];
    const view = scrollY - pageTop;
    const seen = hy > view - 200 && hy < view + innerHeight + 200;
    if (!seen) {
      dropHead(s);
      return;
    }
    const head = (s.head ??= makeHead(s));
    // The canvas sits over the run, which is never longer than it is wide.
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    for (let i = s.laid; i <= n; i++) {
      l = Math.min(l, xs[i]);
      r = Math.max(r, xs[i]);
      t = Math.min(t, ys[i]);
      b = Math.max(b, ys[i]);
    }
    head.x = Math.round((l + r) / 2 - HEAD / 2);
    head.y = Math.round((t + b) / 2 - HEAD / 2);
    head.el.style.transform = `translate(${head.x.toFixed(1)}px, ${head.y.toFixed(1)}px)`;
    const { ctx } = head;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, head.el.width, head.el.height);
    ctx.setTransform(1, 0, 0, 1, -head.x, -head.y);
    ctx.lineCap = "round";
    // As few strokes as will do: the cooled part in one, the bright part in
    // a few bands, and its light in one.
    const path = (i0: number, i1: number) => {
      ctx.beginPath();
      let open = false;
      for (let i = i0; i < i1; i++) {
        if (under.has(i) || taper(s, i) <= 0) {
          open = false;
          continue;
        }
        if (!open) ctx.moveTo(xs[i], ys[i]);
        ctx.lineTo(xs[i + 1], ys[i + 1]);
        open = true;
      }
    };
    const warm = Math.max(s.laid, n - TAIL);
    // Plain colour, not the tooth (cheaper to raster every beat), a shade
    // fainter to read the same.
    ctx.strokeStyle = `rgb(${RGB[hue].join(" ")})`;
    ctx.globalAlpha = GROUND * 0.7;
    ctx.lineWidth = lineW;
    path(s.laid, warm);
    ctx.stroke();
    const BANDS = 4;
    for (let k = 0; k < BANDS; k++) {
      const i0 = warm + Math.floor(((n - warm) * k) / BANDS);
      const i1 = warm + Math.floor(((n - warm) * (k + 1)) / BANDS);
      if (i1 <= i0) continue;
      const h = 1 - (n - (i0 + i1) / 2) / TAIL;
      ctx.globalAlpha = GROUND * 0.7 + (1 - GROUND * 0.7) * h * h;
      ctx.lineWidth = lineW + h * 1.3;
      path(i0, i1);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = `rgb(${RGB[hue === "c" ? "cl" : "ml"].join(" ")})`;
    ctx.lineWidth = 0.9;
    path(Math.max(warm, n - Math.round(TAIL * 0.4)), n);
    ctx.stroke();
    // The bead: the bright heart of the thread. Dimmed while it rests.
    ctx.globalAlpha = s.resting ? 0.55 : 1;
    const rad = 9 * (scale > 1 ? 1.4 : 1);
    const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, rad);
    const [cr, cg, cb] = RGB[hue];
    const [lr, lg, lb] = RGB[hue === "c" ? "cl" : "ml"];
    glow.addColorStop(0, `rgba(${lr},${lg},${lb},0.95)`);
    glow.addColorStop(0.35, `rgba(${cr},${cg},${cb},0.5)`);
    glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(hx - rad, hy - rad, rad * 2, rad * 2);
    ctx.globalAlpha = 1;
  }

  function dropHead(s: Strand) {
    s.head?.el.remove();
    s.head = undefined;
  }

  /* ---------- Growing ---------- */

  function born(seed: Seed) {
    const t = fate.add(seed);
    const s: Strand = { t, laid: 0, owed: 0, fadeAt: Infinity, alpha: 1, top: seed.y, bottom: seed.y };
    strands.push(s);
    return s;
  }

  const growing = () => strands.filter((s) => !s.t.done);

  /** Is a head near enough the reader to be seen growing? */
  function inView(s: Strand, margin = 0.5) {
    const y = s.t.ys[s.t.ys.length - 1];
    const view = scrollY - pageTop;
    return y > view - innerHeight * margin && y < view + innerHeight * (1 + margin);
  }

  /** A finished thread: lay the rest, put out its head, and let it lie. */
  function finish(s: Strand, now: number) {
    cool(s, true);
    dropHead(s);
    s.fadeAt = now + HOLD * (0.7 + s.t.rand() * 0.8);
    // Too short to read as a thread: let it go now.
    if (s.t.xs.length < 14) s.fadeAt = now;
  }

  /** New threads in from the edges near the reader, once the page's own
   * have been born: the page keeps living without filling up. */
  function trickle(now: number) {
    if (now < nextTrickle) return;
    const rand = rng(options.seed * 7 + ++trickles * 131);
    nextTrickle = now + 6000 + rand() * 6000;
    const view = scrollY - pageTop;
    const y = Math.max(0, view) + innerHeight * (0.1 + rand() * 0.6);
    if (y > height - 80) return;
    const side = rand() < 0.5 ? 0 : 1;
    const tilt = (14 + rand() * 40) * (Math.PI / 180);
    const a = side ? Math.PI - tilt : tilt;
    const x = side ? width + 6 : -6;
    const hue: Hue = side ? (rand() < 0.72 ? "m" : "c") : rand() < 0.72 ? "c" : "m";
    const lone = rand() < 0.25;
    born({ x, y, a, hue, len: 700 + rand() * 1400, seed: options.seed * 13 + trickles * 71, key: y, lone, goals: goalsFor(all, x, y, a, lone, rand) });
  }

  /** Fade what has lain long enough, a step at a time. */
  function fade(now: number) {
    let swept = false;
    const touched = new Set<number>();
    for (const s of strands) {
      if (now < s.fadeAt) continue;
      const left = Math.max(0, 1 - Math.ceil(((now - s.fadeAt) / FADE) * FADES) / FADES);
      if (left === s.alpha) continue;
      s.alpha = left;
      const [a, b] = tileRange(s.top, s.bottom);
      for (let k = a; k <= b; k++) touched.add(k);
      if (!left) {
        s.t.gone = true;
        swept = true;
      }
    }
    if (swept) {
      strands = strands.filter((s) => !s.t.gone);
      fate.sweep();
    }
    for (const k of touched) {
      const tile = tiles.get(k);
      if (tile) paintTile(tile);
    }
  }

  function nextFade() {
    let at = Infinity;
    for (const s of strands) {
      if (s.fadeAt === Infinity) continue;
      at = Math.min(at, s.fadeAt <= performance.now() ? performance.now() + FADE / FADES : s.fadeAt);
    }
    return at;
  }

  const asleep = () => options.isIdle() || document.hidden;
  /** Someone is reading: they arrived a moment ago or did something lately.
   * Left alone, the threads hold where they are (their beads dim) and the
   * loop sleeps until the reader moves again. */
  const present = (now: number) => now - lastInput < ATTEND || now - began < arrive;

  function tick(now: number) {
    frame = 0;
    if (asleep() || busy || !built) return;
    if (!present(performance.now())) {
      for (const s of strands) {
        if (!s.head || s.resting) continue;
        s.resting = true;
        paintHead(s);
      }
      last = 0;
      return;
    }
    const dt = Math.min(250, now - (last || now));
    last = now;
    const reach = loom.reach();
    // Born as the drawing reaches them, a moment apart.
    // Only heads near the reader count: the rest hurry out of sight.
    let growingNear = growing().filter((s) => inView(s)).length;
    while (sown < seeds.length && seeds[sown].key <= reach && growingNear < live && now - lastBirth > 350) {
      born(seeds[sown++]);
      lastBirth = now;
      growingNear++;
    }
    if (sown >= seeds.length && growingNear < live) trickle(now);
    for (const s of strands) {
      if (s.t.done) continue;
      const pace = inView(s) ? 1 : 6;
      s.owed = Math.min(6 * pace, s.owed + (SPEED * pace * dt) / 1000 / STEP);
      while (s.owed >= 1 && !s.t.done) {
        fate.step(s.t);
        s.owed--;
      }
      if (s.t.done) finish(s, now);
      else cool(s);
    }
    for (const [t, i] of fate.breaks) breakAt(t, i);
    fate.breaks.length = 0;
    fade(now);
    const heads = growing();
    for (const s of heads) {
      s.resting = false;
      paintHead(s);
    }
    last = heads.length ? now : 0;
    // Growing: the next beat. Otherwise wake for the next birth, trickle
    // or fade.
    let at = heads.length ? now + BEAT : nextFade();
    if (sown < seeds.length) at = Math.min(at, now + 400);
    else at = Math.min(at, Math.max(nextTrickle, now + 400));
    if (at < Infinity) {
      timer = window.setTimeout(() => {
        timer = 0;
        wake();
      }, Math.max(30, at - now));
    }
  }

  function wake() {
    if (instant || frame || timer || asleep() || !built || busy) return;
    frame = requestAnimationFrame(tick);
  }

  function onScroll() {
    if (!built || busy) return;
    cull();
    attend();
  }

  /** The reader did something: the threads go on. */
  function attend() {
    lastInput = performance.now();
    wake();
  }

  /** A tap on the paper sends a pair out from there. */
  function onDown(event: PointerEvent) {
    lastInput = performance.now();
    if (!built || busy || event.button > 0) return;
    const target = event.target as Element;
    if (target.closest("a, button, input, .hion-top")) return;
    const x = event.clientX;
    const y = event.clientY + scrollY - pageTop;
    if (y < 0 || y > height || ground.clear(x, y) < 12) return;
    if (growing().length >= live + 4) return;
    const rand = rng(Math.floor(x * 31 + y * 17));
    const a = (rand() - 0.5) * Math.PI * 2;
    (["c", "m"] as Hue[]).forEach((hue, i) => {
      const dir = a + i * Math.PI + (rand() - 0.5) * 0.6;
      born({ x, y, a: dir, hue, len: 600 + rand() * 900, seed: Math.floor(rand() * 1e6), key: y, goals: goalsFor(all, x, y, dir, false, rand) });
    });
    wake();
  }

  /** Grow every thread the drawing has reached to its end, out of sight, a
   * few milliseconds at a time and never while the prism holds the page
   * still; then show them. A screen already showing keeps its threads until
   * the new ones are ready (a picture loading changes the page's height). */
  let settling = 0;
  let settleTimer = 0;
  function settle(reach: number) {
    const mine = ++settling;
    busy = true;
    if (!tiles.size) layer.dataset.state = "settling";
    let waiting = false;
    const slice = () => {
      if (mine !== settling || signal.aborted) return;
      if (options.isIdle()) {
        if (!waiting) {
          waiting = true;
          options.onIdleChange((idle) => {
            if (idle || !waiting) return;
            waiting = false;
            slice();
          });
        }
        return;
      }
      const end = performance.now() + 6;
      while (performance.now() < end) {
        const s = strands.find((s) => !s.t.done);
        if (s) {
          // Interleaved a little, so later threads find earlier ones.
          for (let k = 0; k < 40 && fate.step(s.t); k++);
          continue;
        }
        if (sown < seeds.length && seeds[sown].key <= reach) {
          born(seeds[sown++]);
          continue;
        }
        break;
      }
      if (strands.some((s) => !s.t.done) || (sown < seeds.length && seeds[sown].key <= reach)) {
        settleTimer = window.setTimeout(slice, 16);
        return;
      }
      settling++;
      busy = false;
      delete layer.dataset.state;
      fate.breaks.length = 0;
      const now = performance.now();
      for (const s of strands) {
        s.laid = s.t.xs.length - 1;
        for (const y of s.t.ys) {
          if (y < s.top) s.top = y;
          if (y > s.bottom) s.bottom = y;
        }
        s.fadeAt = instant ? Infinity : now + HOLD * (0.4 + s.t.rand());
      }
      for (const tile of tiles.values()) for (const pane of tile.panes) pane.el.remove();
      tiles.clear();
      cull();
      wake();
    };
    slice();
  }

  /** On arrival the first screen is not bare: its threads are already
   * part grown (the first few still growing, their heads live), so the
   * ground is there at once and a few heads are at work in it. */
  function pregrow() {
    const fold = Math.max(0, scrollY - pageTop) + innerHeight;
    let started = 0;
    while (sown < seeds.length && seeds[sown].key <= fold) {
      const s = born(seeds[sown++]);
      const stop = started < live ? s.t.len * (0.3 + s.t.rand() * 0.25) : Infinity;
      if (stop < Infinity) started++;
      while ((s.t.xs.length - 1) * STEP < stop && fate.step(s.t));
      if (s.t.done) {
        s.laid = s.t.xs.length - 1;
        s.fadeAt = performance.now() + HOLD * (0.5 + s.t.rand());
      } else s.laid = Math.max(0, s.t.xs.length - 1 - TAIL);
      for (let i = 0; i <= s.laid; i++) {
        s.top = Math.min(s.top, s.t.ys[i]);
        s.bottom = Math.max(s.bottom, s.t.ys[i]);
      }
    }
    fate.breaks.length = 0;
    lastBirth = performance.now();
  }

  let resizeTimer = 0;
  let seenWidth = 0;
  let seenHeight = 0;
  const observer = new ResizeObserver(() => {
    if (page.clientWidth === seenWidth && page.scrollHeight === seenHeight) return;
    clearTimeout(resizeTimer);
    // After the loom has re-composed the hions (it waits 140ms).
    resizeTimer = window.setTimeout(() => {
      seenWidth = page.clientWidth;
      seenHeight = page.scrollHeight;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      frame = timer = 0;
      build();
      settle(instant ? Infinity : loom.reach());
    }, 220);
  });

  return {
    start() {
      seenWidth = page.clientWidth;
      seenHeight = page.scrollHeight;
      build();
      observer.observe(page);
      addEventListener("scroll", onScroll, { passive: true, signal });
      addEventListener("resize", onScroll, { passive: true, signal });
      if (!instant) {
        page.addEventListener("pointerdown", onDown, { passive: true, signal });
        document.addEventListener("visibilitychange", wake, { signal });
        addEventListener("pointermove", attend, { passive: true, signal });
        addEventListener("keydown", attend, { passive: true, signal });
        options.onIdleChange((idle) => {
          if (!idle) wake();
        });
      }
      signal.addEventListener("abort", () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        clearTimeout(settleTimer);
        clearTimeout(resizeTimer);
      });
      if (instant) settle(Infinity);
      else {
        began = performance.now();
        pregrow();
        cull();
        layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease" });
        wake();
      }
    },
    /** Let the threads go. Toward a point (page px): they magnify round
     * it, as if you leant in to look at one thread. */
    release(toward?: Pt) {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      frame = timer = 0;
      built = false;
      const keyframes: Keyframe[] = toward
        ? [
            { transformOrigin: `${toward[0]}px ${toward[1]}px`, transform: "scale(1)", opacity: 1 },
            { transformOrigin: `${toward[0]}px ${toward[1]}px`, transform: "scale(2.4)", opacity: 0 },
          ]
        : [{ opacity: 1 }, { opacity: 0 }];
      layer.animate(keyframes, { duration: 420, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" });
    },
    /** For a check: the threads themselves. */
    fate: () => fate,
  };
}
