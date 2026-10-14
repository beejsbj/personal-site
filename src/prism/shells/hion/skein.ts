/** The skein: every thread on a Hion screen, as one kind of thing.
 *
 * A strand is a body grown from its head, a goal that steers the head, a
 * hue, a width, some slack, a brightness and a lifetime. The kinds differ
 * only in those numbers (NATURE) and in what steers them:
 *
 *   ground   born where the hions come down from the line and in from the
 *            page edges as the drawing reaches them; steered by fate.ts
 *            (taut, bowed, turning at decisions, falling in alongside
 *            company, gathering into bundles, a few running off alone);
 *            long and quiet.
 *   pointer  born at the mouse (as it moves, or rests) or a tap; seeks the
 *            nearest structure nobody else is going to (a heading, a
 *            picture, a charm; otherwise a hion), winds round it (through
 *            a heading's words, a loose band round a picture, stitches
 *            across a hion), and then either lets go into fate and runs on
 *            to join the ground's flow, or ends there.
 *
 * Every strand is in one index (fate's): the hions are fixed company, so
 * ground threads fall in alongside them; ground threads fall in alongside
 * pointer threads that have let go; crossings go over and under.
 *
 * A head moves every frame while it is active, drawn between the points
 * fate laid, so it never steps. Behind it a short rope (KNOTS nodes,
 * slightly longer than the path it spans) hangs from the head to where
 * the thread has settled: it sags a little, lags on a turn and sways while
 * the head moves, and settles onto the path as it cools, so what is laid
 * down is what you saw. Only heads give light.
 *
 * Paid for elsewhere: one live canvas for everything that moves (a band
 * of the page about one and a half screens tall, so scrolling carries it
 * and only moving it on repaints it), repainted only where something
 * changed (each thing's old and new box); what has cooled is baked onto
 * page-space panes near the viewport, a batch at a time, and never
 * repainted until it fades; at most three ground heads grow near the
 * reader (heads out of sight hurry, unpainted, a beat at a time); when a
 * frame's painting runs long the live canvas is painted every other frame.
 * Ground heads grow while someone is there (6s after arriving and after
 * any input), then rest; everything sleeps while the prism holds the page
 * idle, the tab is hidden, and once nothing is moving.
 *
 * Reduced motion and a still face grow everything out of sight and show
 * it settled, with no heads and nothing from the pointer.
 *
 * What stays its own: the hions' pastel bodies (composed by weave.ts from
 * the screen's stations and laid by the loom), the woven words and covers
 * (woven.ts: a cellular cloth, a different medium), the menu cord and its
 * swatches (nav.ts), and the ribbon a new screen comes down as (index.ts:
 * a page transition on the compositor, which has to run while the main
 * thread is busiest). */
import { Fate, goalsFor, Ground, plan, type Gather, type Seed, STEP, type Thread } from "./fate";
import type { createLoom } from "./loom";
import type { Pulse } from "./pulse";
import { type Hue, patterns, type Patterns, type Pt, RGB, rng } from "./pastel";
import { type Box, ring, stitches, weave, wordBoxes } from "./wind";

type Loom = ReturnType<typeof createLoom>;

export type Kind = "ground" | "pointer";

interface Nature {
  /** Line width (css px). */
  w: number;
  /** How fast the head goes (px a second). */
  speed: number;
  /** The warm run behind the head (px), which the rope spans. */
  tail: number;
  /** The rope's length over the path it spans. */
  slack: number;
  /** The bead's radius, and the head's brightness. */
  bead: number;
  bright: number;
  /** How strongly its settled body lies (the head being 1). */
  body: number;
  /** How long it lies once finished, before it fades (ms). */
  hold: number;
}

/** The ground's strength, the bright head being 1: the paper's tooth takes
 * about half again, so it lies at a quarter or so. */
const GROUND = 0.6;

const NATURE: Record<Kind, Nature> = {
  ground: { w: 1.25, speed: 120, tail: 110, slack: 1.07, bead: 8, bright: 1, body: GROUND, hold: 40000 },
  pointer: { w: 1.5, speed: 340, tail: 80, slack: 1.12, bead: 6, bright: 0.9, body: 0.55, hold: 11000 },
};

interface SkeinOptions {
  page: HTMLElement;
  loom: Loom;
  pulse: Pulse;
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
}

/** A piece of ground: one column of a row of the page. */
interface Pane {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pats: Patterns;
  x0: number;
  x1: number;
}

interface Tile {
  index: number;
  panes: Pane[];
}

/** The slack run behind a head: KNOTS + 1 nodes, head first. */
interface Rope {
  x: Float32Array;
  y: Float32Array;
  ox: Float32Array;
  oy: Float32Array;
  energy: number;
}

/** Something on the page a thread can go to. */
interface Aim {
  box: Box;
  el: Element;
  /** It has words to weave through. */
  words: boolean;
}

type Drive =
  | { by: "fate" }
  | { by: "seek"; aim: Aim | null; on: { hue: Hue; s: number } | null; crept: number; letGo: boolean }
  | { by: "wind"; way: Pt[]; at: number; letGo: boolean };

interface Strand {
  kind: Kind;
  n: Nature;
  t: Thread;
  /** Arc length at each point of the body. */
  ls: number[];
  /** The head, along the body (px). */
  s: number;
  drive: Drive;
  rand: () => number;
  rope: Rope | null;
  /** Segments [0, laid) are baked onto the ground. */
  laid: number;
  /** When it starts to fade (performance.now()), once finished. */
  fadeAt: number;
  /** How much of it is left (1, fading to 0). */
  alpha: number;
  top: number;
  bottom: number;
  /** How much its head is moving (eases to 0 when it stops). */
  motion: number;
  /** The head's light: 1 while it grows, cooling to 0 once it has ended. */
  heat: number;
  resting: boolean;
  /** Its box on the live canvas when last painted (page px). */
  box: Box | null;
  dirty: boolean;
  /** Baked whole and off the live canvas. */
  cold: boolean;
}

/** A hion, as company and as somewhere for a thread to go. */
interface Hion {
  hue: Hue;
  xs: Float64Array;
  ys: Float64Array;
  ls: Float64Array;
  keys: Float64Array;
}

const TILE = 512;
const PANE = 320;
/** Segments laid onto the ground at once. */
const BATCH = 8;
/** Rope nodes. */
const KNOTS = 12;
/** Ground heads growing at once near the reader (fewer on a screen seen
 * close, where each is twice the size and its page otherwise very still). */
const LIVE = 3;
/** How long the ground keeps growing after the reader last did anything,
 * and after the screen arrives (ms). */
const ATTEND = 6000;
const ARRIVE = 6000;
const FADE = 3000;
const FADES = 6;
/** The live canvas, in screens tall. */
const BAND = 1.6;
/** When a frame's painting takes longer than this (ms, averaged), paint
 * every other frame. */
const SLOW = 6;

/** What threads from the pointer go to. */
const AIMS = "main h1, main h2, main h3, [data-weft], main img, .hion-woven-cover, .hion-tag, .hion-pullcord, .hion-charm";
/** Pointer threads at once, how far one looks for a thing, and how far it
 * may creep before it gives up (px). */
const INTENTS = 3;
const SEEK = 360;
const REACH = 520;

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
export const seedOf = (path: string) => hash(path) % 100000;

const gapTo = (b: Box, x: number, y: number) => Math.hypot(Math.max(b.l - x, 0, x - b.r), Math.max(b.t - y, 0, y - b.b));
const meets = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

export function createSkein(options: SkeinOptions) {
  const { page, loom, signal, instant } = options;
  const scale = options.scale ?? 1;
  const close = scale > 1;
  const fine = matchMedia("(pointer: fine)").matches;
  const nature = (kind: Kind): Nature => {
    const n = NATURE[kind];
    return close ? { ...n, w: n.w * 1.6, bead: n.bead * 1.4 } : n;
  };

  // Under the hions: the ground. Over them (under the words): what moves.
  const layer = document.createElement("div");
  layer.className = "hion-skein";
  layer.setAttribute("aria-hidden", "true");
  page.prepend(layer);
  const liveLayer = document.createElement("div");
  liveLayer.className = "hion-skein hion-skein--live";
  liveLayer.setAttribute("aria-hidden", "true");
  const band = document.createElement("canvas");
  band.className = "hion-skein__band";
  liveLayer.append(band);
  const bctx = band.getContext("2d")!;
  let bpats: Patterns | undefined;

  let ground = new Ground(1, 1);
  let fate = new Fate(ground);
  let all: Gather[] = [];
  let seeds: Seed[] = [];
  let sown = 0;
  let strands: Strand[] = [];
  let hions: Hion[] = [];
  let hionVersion = -1;
  let aims: Aim[] = [];
  const tiles = new Map<number, Tile>();
  let width = 0;
  let height = 0;
  let pageTop = 0;
  let tileRows = 1;
  let dpr = 1;
  let built = false;
  let busy = false;
  let lastTick = 0;
  let lastBirth = 0;
  let nextTrickle = 0;
  let lastInput = 0;
  let began = 0;
  let trickles = 0;
  const live = close ? LIVE - 1 : LIVE;
  // A single thing seen close arrives still: its threads wait for the reader.
  const arrive = close ? 0 : ARRIVE;
  // The live band: where it sits on the page, and its size.
  let bandTop = 0;
  let bandH = 0;
  let bandW = 0;
  let bandDpr = 1;
  let bandFresh = true;
  let paintCost = 0;
  let skipPaint = false;
  /** Boxes of things gone from the live canvas, to clear. */
  let cleared: Box[] = [];
  // The pointer, in page space.
  const pointer = { x: -1e4, y: -1e4, at: 0, here: false, travelled: 0, lastIssue: 0, rests: 0, hue: "c" as Hue };

  const task = options.pulse.add(tick);

  /* ---------- Reading the screen ---------- */

  /** Words, pictures and anything you can press keep the paper clear;
   * headings, pictures and charms are somewhere a thread can go. */
  function readPage() {
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
    // A stretch left to something that draws its own (the resume's timeline
    // when it runs across: track.ts), whole.
    for (const el of page.querySelectorAll("[data-cloth-hold]")) {
      const r = el.getBoundingClientRect();
      ground.hold({ l: 0, t: r.top - p.top, r: page.clientWidth, b: r.bottom - p.top }, 0, 0);
    }
    aims = [];
    for (const el of page.querySelectorAll(AIMS)) {
      if (el.closest("[data-cloth-hold]")) continue;
      const r = el.getBoundingClientRect();
      // Too small to go round, or so big the way round would be a frame.
      if (r.width < 4 || r.height < 4 || r.width > 640 || r.height > 420) continue;
      const words = el.matches("h1, h2, h3, [data-weft]");
      aims.push({ box: { l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top }, el, words });
      if (aims.length >= 240) break;
    }
  }

  /** The hions as they are composed now: company for every thread, and
   * somewhere for one from the pointer to go. */
  function readHions() {
    if (loom.version() === hionVersion) return;
    hionVersion = loom.version();
    for (const t of fate.threads) if (t.fixed) t.gone = true;
    fate.sweep();
    hions = [];
    for (const tip of loom.journeys()) {
      const n = tip.points.length;
      if (n < 2) continue;
      const xs = new Float64Array(n);
      const ys = new Float64Array(n);
      const ls = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        xs[i] = tip.points[i][0];
        ys[i] = tip.points[i][1];
        const d = i ? Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]) : 0;
        // A stretch it leaves the page for (a track) is no length.
        ls[i] = i ? ls[i - 1] + (d > 400 ? 0 : d) : 0;
      }
      hions.push({ hue: tip.hue, xs, ys, ls, keys: tip.keys });
      fate.fix(tip.hue, tip.points);
    }
  }

  function build() {
    width = page.clientWidth;
    height = page.scrollHeight;
    pageTop = page.getBoundingClientRect().top + scrollY;
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    layer.style.height = liveLayer.style.height = `${height}px`;
    tileRows = Math.ceil(height / TILE);
    ground = new Ground(width, height, 8);
    page.classList.add("hion-measuring");
    readPage();
    page.classList.remove("hion-measuring");
    ground.finish();
    fate = new Fate(ground);
    hionVersion = -1;
    readHions();
    const origin = options.origin();
    const planned = plan(ground, {
      width,
      height,
      drop: origin?.[0] ?? width * 0.56,
      top: (origin?.[1] ?? 110) + 16,
      seed: options.seed,
      close,
    });
    all = planned.gathers;
    seeds = planned.seeds;
    sown = 0;
    strands = [];
    trickles = 0;
    cleared = [];
    bandFresh = true;
    built = true;
  }

  /* ---------- A strand's body ---------- */

  function measureBody(st: Strand) {
    const { xs, ys } = st.t;
    const ls = st.ls;
    for (let i = ls.length; i < xs.length; i++) {
      ls.push(i ? ls[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]) : 0);
    }
    return ls[ls.length - 1] ?? 0;
  }

  /** The last point at or before arc length s. */
  function indexAt(st: Strand, s: number) {
    const ls = st.ls;
    let lo = 0;
    let hi = ls.length - 1;
    if (s >= ls[hi]) return hi;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ls[mid] <= s) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /** Point and unit normal at arc length s. */
  function at(st: Strand, s: number): [number, number, number, number] {
    const { xs, ys } = st.t;
    const n = xs.length;
    if (n < 2) return [xs[0], ys[0], 0, 1];
    s = Math.max(0, Math.min(st.ls[n - 1], s));
    const i = Math.min(n - 2, indexAt(st, s));
    const span = st.ls[i + 1] - st.ls[i] || 1;
    const u = Math.min(1, (s - st.ls[i]) / span);
    const dx = xs[i + 1] - xs[i];
    const dy = ys[i + 1] - ys[i];
    const len = Math.hypot(dx, dy) || 1;
    return [xs[i] + dx * u, ys[i] + dy * u, -dy / len, dx / len];
  }

  /** Grow a strand's body until it reaches past arc length `to`. */
  function grow(st: Strand, to: number) {
    let length = measureBody(st);
    let guard = 400;
    while (length < to && !st.t.done && guard--) {
      const before = st.t.xs.length;
      advance(st);
      length = measureBody(st);
      if (st.t.xs.length === before && !st.t.done) break;
    }
  }

  /** One more point, as its drive steers it. */
  function advance(st: Strand) {
    const d = st.drive;
    const { t } = st;
    if (d.by === "fate") {
      fate.step(t);
      return;
    }
    const n = t.xs.length - 1;
    const x = t.xs[n];
    const y = t.ys[n];
    if (d.by === "wind") {
      // Along the way round, a stitch at a time.
      const [tx, ty] = d.way[d.at];
      const dist = Math.hypot(tx - x, ty - y);
      if (dist <= 4.5) {
        fate.extend(t, tx, ty);
        d.at++;
      } else fate.extend(t, x + ((tx - x) / dist) * 4, y + ((ty - y) / dist) * 4);
      if (d.at >= d.way.length) letGo(st, d.letGo);
      return;
    }
    // Seeking: toward its target, turning no faster than a drawn curve,
    // with a little looseness.
    const target = seekPoint(d, x, y);
    if (!target) {
      t.done = true;
      return;
    }
    const dx = target[0] - x;
    const dy = target[1] - y;
    if (Math.hypot(dx, dy) < 6) {
      const way = windWay(st, d, [x, y]);
      if (way.length < 2) letGo(st, d.letGo);
      else st.drive = { by: "wind", way, at: 0, letGo: d.letGo };
      return;
    }
    let turn = Math.atan2(dy, dx) - t.a;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    const a = t.a + Math.max(-0.12, Math.min(0.12, turn)) + (st.rand() - 0.5) * 0.06;
    fate.extend(t, x + Math.cos(a) * 4, y + Math.sin(a) * 4);
    d.crept += 4;
    // Never got there: let it go.
    if (d.crept > REACH) t.done = true;
  }

  function windWay(st: Strand, d: Extract<Drive, { by: "seek" }>, from: Pt): Pt[] {
    if (d.on) {
      const h = hions.find((h) => h.hue === d.on!.hue);
      if (!h) return [];
      return stitches((s) => hionAt(h, s), d.on.s, st.rand);
    }
    const aim = d.aim!;
    if (aim.words) {
      const lines = wordBoxes(aim.el, page.getBoundingClientRect());
      // A few words, then on.
      if (lines.length) return weave(lines, from, st.rand, 2 + Math.floor(st.rand() * 3));
    }
    return ring(aim.box, from, st.t.a, st.rand);
  }

  /** Done winding: run on with fate toward a gather, or end here. */
  function letGo(st: Strand, on: boolean) {
    const { t } = st;
    const n = t.xs.length - 1;
    if (!on) {
      t.done = true;
      return;
    }
    fate.resume(t, goalsFor(all, t.xs[n], t.ys[n], t.a, false, st.rand), 220 + st.rand() * 380);
    t.wander = 1.4;
    st.drive = { by: "fate" };
  }

  /* ---------- Hions ---------- */

  function hionIndex(h: Hion, s: number) {
    let lo = 0;
    let hi = h.ls.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (h.ls[mid] <= s) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  function hionAt(h: Hion, s: number): [number, number, number, number] {
    const n = h.xs.length;
    s = Math.max(0, Math.min(h.ls[n - 1], s));
    const lo = hionIndex(h, s);
    const hi = Math.min(n - 1, lo + 1);
    const span = h.ls[hi] - h.ls[lo] || 1;
    const u = Math.min(1, (s - h.ls[lo]) / span);
    const a = Math.max(0, lo - 2);
    const b = Math.min(n - 1, hi + 2);
    const dx = h.xs[b] - h.xs[a];
    const dy = h.ys[b] - h.ys[a];
    const len = Math.hypot(dx, dy) || 1;
    return [h.xs[lo] + (h.xs[hi] - h.xs[lo]) * u, h.ys[lo] + (h.ys[hi] - h.ys[lo]) * u, -dy / len, dx / len];
  }

  /** The nearest drawn point of a hion within r of (x, y). */
  function nearestHion(x: number, y: number, r: number) {
    const reach = loom.reach();
    let best: { hue: Hue; s: number; d: number; x: number; y: number } | null = null;
    for (const h of hions) {
      for (let i = 0; i < h.xs.length; i += 2) {
        if (h.keys[i] > reach) break;
        const d = Math.hypot(h.xs[i] - x, h.ys[i] - y);
        if (d < r && (!best || d < best.d)) best = { hue: h.hue, s: h.ls[i], d, x: h.xs[i], y: h.ys[i] };
      }
    }
    return best;
  }

  /* ---------- Painting the ground ---------- */

  /** How strongly segment i lies: tapered at its start, and at its end
   * once it has one. */
  function taper(st: Strand, i: number) {
    const n = st.t.xs.length - 1;
    let a = Math.min(1, (i + 1) / 16);
    if (st.t.done) a = Math.min(a, (n - i) / 10);
    return Math.max(0, a) * st.alpha;
  }

  /** Lay segments [i0, i1) of a strand's body on a context, settled. */
  function lay(ctx: CanvasRenderingContext2D, pats: Patterns, st: Strand, i0: number, i1: number, tip?: Pt) {
    const { xs, ys, under, hue } = st.t;
    ctx.strokeStyle = pats[hue];
    ctx.lineWidth = st.n.w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // The body in one path; the tapered ends a segment at a time.
    ctx.globalAlpha = st.n.body * st.alpha;
    ctx.beginPath();
    let open = false;
    for (let i = i0; i < i1; i++) {
      const a = taper(st, i);
      if (under.has(i) || a < st.alpha) {
        open = false;
        continue;
      }
      if (!open) ctx.moveTo(xs[i], ys[i]);
      ctx.lineTo(xs[i + 1], ys[i + 1]);
      open = true;
    }
    if (tip && open) ctx.lineTo(tip[0], tip[1]);
    ctx.stroke();
    for (let i = i0; i < i1; i++) {
      const a = taper(st, i);
      if (under.has(i) || a >= st.alpha || a <= 0) continue;
      ctx.globalAlpha = st.n.body * a;
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
      for (const st of strands) {
        if (st.laid && st.bottom >= t0 - 4 && st.top <= t0 + TILE + 4) lay(ctx, pane.pats, st, 0, st.laid);
      }
    }
  }

  function makeTile(index: number): Tile {
    const h = Math.min(TILE, height - index * TILE);
    const panes: Pane[] = [];
    for (let x0 = 0; x0 < width; x0 += PANE) {
      const w = Math.min(PANE, width - x0);
      const el = document.createElement("canvas");
      el.className = "hion-skein__pane";
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

  /** Keep ground near the viewport; drop far panes. */
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

  /** Lay segments [laid, to) of a strand onto the ground. */
  function bake(st: Strand, to: number) {
    if (to <= st.laid) return;
    const { xs, ys } = st.t;
    let top = Infinity;
    let bottom = -Infinity;
    let left = Infinity;
    let right = -Infinity;
    for (let i = st.laid; i <= to; i++) {
      top = Math.min(top, ys[i]);
      bottom = Math.max(bottom, ys[i]);
      left = Math.min(left, xs[i]);
      right = Math.max(right, xs[i]);
    }
    st.top = Math.min(st.top, top);
    st.bottom = Math.max(st.bottom, bottom);
    const [a, b] = tileRange(top, bottom);
    for (let k = a; k <= b; k++) {
      const tile = tiles.get(k);
      if (tile) for (const pane of panesIn(tile, left, right)) lay(pane.ctx, pane.pats, st, st.laid, to);
    }
    st.laid = to;
  }

  /** A thread went under one crossing it after it was laid: break it. */
  function breakAt(t: Thread, i: number) {
    const st = strands.find((s) => s.t === t);
    if (!st) return;
    if (i >= st.laid) {
      st.dirty = true;
      return;
    }
    const [x0, y0, x1, y1] = [t.xs[i], t.ys[i], t.xs[i + 1], t.ys[i + 1]];
    const [a, b] = tileRange(Math.min(y0, y1), Math.max(y0, y1));
    for (let k = a; k <= b; k++) {
      const tile = tiles.get(k);
      if (!tile) continue;
      for (const { ctx } of panesIn(tile, Math.min(x0, x1), Math.max(x0, x1))) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = st.n.w + 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /* ---------- The live canvas ---------- */

  /** Keep the band over the viewport; moved (and repainted whole) only
   * when the reader has scrolled near its edge. */
  function anchor() {
    const view = scrollY - pageTop;
    const want = Math.min(height, Math.ceil(innerHeight * BAND));
    const w = width;
    if (!bandFresh && want === bandH && w === bandW && view >= bandTop - 1 && view + innerHeight <= bandTop + bandH + 1) {
      return;
    }
    const d = Math.min(devicePixelRatio || 1, 1.5);
    if (want !== bandH || w !== bandW || d !== bandDpr) {
      bandH = want;
      bandW = w;
      bandDpr = d;
      band.width = Math.ceil(bandW * bandDpr);
      band.height = Math.ceil(bandH * bandDpr);
      band.style.width = `${bandW}px`;
      band.style.height = `${bandH}px`;
      bpats = patterns(bctx, bandDpr);
    }
    bandTop = Math.round(Math.max(0, Math.min(height - bandH, view - (bandH - innerHeight) / 2)));
    band.style.transform = `translateY(${bandTop}px)`;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, band.width, band.height);
    bandFresh = false;
    for (const st of strands) {
      st.box = null;
      st.dirty = true;
    }
    cleared = [];
  }

  /** The box a strand's live part covers (page px), or null. */
  function boxOf(st: Strand): Box | null {
    if (st.cold) return null;
    const { xs, ys } = st.t;
    const pad = Math.max(st.n.bead * (st.heat > 0 ? 1 : 0), st.n.w + 3) + 3;
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    const end = Math.min(xs.length - 1, indexAt(st, st.s) + 1);
    for (let i = st.laid; i <= end; i++) {
      if (xs[i] < l) l = xs[i];
      if (xs[i] > r) r = xs[i];
      if (ys[i] < t) t = ys[i];
      if (ys[i] > b) b = ys[i];
    }
    const rope = st.rope;
    if (rope) {
      for (let k = 0; k <= KNOTS; k++) {
        if (rope.x[k] < l) l = rope.x[k];
        if (rope.x[k] > r) r = rope.x[k];
        if (rope.y[k] < t) t = rope.y[k];
        if (rope.y[k] > b) b = rope.y[k];
      }
    }
    if (l === Infinity) return null;
    return { l: l - pad, t: t - pad, r: r + pad, b: b + pad };
  }

  /** The slack run behind a head: hung from the head to where the thread
   * has settled, pulled toward the path more firmly the further back, so it
   * lags and sways near the head and lies on the path at the far end. */
  function swing(st: Strand, dt: number, now: number) {
    const span = Math.min(st.n.tail, st.s);
    if (span < 10) {
      st.rope = null;
      return;
    }
    let rope = st.rope;
    const fresh = !rope;
    if (!rope) {
      rope = st.rope = {
        x: new Float32Array(KNOTS + 1),
        y: new Float32Array(KNOTS + 1),
        ox: new Float32Array(KNOTS + 1),
        oy: new Float32Array(KNOTS + 1),
        energy: 1,
      };
    }
    const sec = dt / 1000;
    const rest = (span * st.n.slack) / KNOTS;
    let energy = 0;
    for (let k = 0; k <= KNOTS; k++) {
      const [tx, ty, nx, ny] = at(st, st.s - (k * span) / KNOTS);
      if (fresh || k === 0 || k === KNOTS) {
        rope.x[k] = rope.ox[k] = tx;
        rope.y[k] = rope.oy[k] = ty;
        continue;
      }
      const u = k / KNOTS;
      let x = rope.x[k];
      let y = rope.y[k];
      const vx = (x - rope.ox[k]) * 0.9;
      const vy = (y - rope.oy[k]) * 0.9;
      rope.ox[k] = x;
      rope.oy[k] = y;
      // A sway across the thread while the head moves, and a little sag.
      const sway = st.motion * 1300 * Math.sin(now * 0.0036 + k * 0.5 + st.t.id * 1.7) * (1 - u) * u * 4;
      x += vx + nx * sway * sec * sec;
      y += vy + (ny * sway + 700 * st.motion) * sec * sec;
      const f = 1 - Math.exp(-(2 + 26 * u * u) * sec);
      x += (tx - x) * f;
      y += (ty - y) * f;
      rope.x[k] = x;
      rope.y[k] = y;
    }
    // A rope, not a rod: no longer than its slack allows.
    for (let pass = 0; pass < 3; pass++) {
      for (let k = 0; k < KNOTS; k++) {
        const dx = rope.x[k + 1] - rope.x[k];
        const dy = rope.y[k + 1] - rope.y[k];
        const d = Math.hypot(dx, dy);
        if (d <= rest || !d) continue;
        const over = (d - rest) / d;
        const a = k === 0 ? 0 : k + 1 === KNOTS ? 1 : 0.5;
        const b = k + 1 === KNOTS ? 0 : k === 0 ? 1 : 0.5;
        rope.x[k] += dx * over * a;
        rope.y[k] += dy * over * a;
        rope.x[k + 1] -= dx * over * b;
        rope.y[k + 1] -= dy * over * b;
      }
    }
    for (let k = 1; k < KNOTS; k++) energy += Math.abs(rope.x[k] - rope.ox[k]) + Math.abs(rope.y[k] - rope.oy[k]);
    rope.energy = energy;
  }

  /** A strand's live part: what has settled but is not yet baked, the warm
   * run on its rope, and its bead. */
  function paintStrand(ctx: CanvasRenderingContext2D, pats: Patterns, st: Strand) {
    const { hue } = st.t;
    const span = Math.min(st.n.tail, st.s);
    const settled = st.s - span;
    // Settled: exactly as the ground will have it.
    const i1 = indexAt(st, settled);
    if (i1 > st.laid || settled > st.ls[st.laid]) {
      const [tx, ty] = at(st, settled);
      lay(ctx, pats, st, st.laid, i1, [tx, ty]);
    }
    if (span < 2) return;
    // The warm run, from where it settles to the head, brightening.
    const pts: number[] = [];
    if (st.rope) {
      for (let k = KNOTS; k >= 0; k--) pts.push(st.rope.x[k], st.rope.y[k]);
    } else {
      const steps = Math.max(2, Math.ceil(span / 6));
      for (let k = steps; k >= 0; k--) {
        const [x, y] = at(st, st.s - (k * span) / steps);
        pts.push(x, y);
      }
    }
    const count = pts.length / 2;
    const heat = st.heat * st.alpha;
    const base = st.n.body * st.alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgb(${RGB[hue].join(" ")})`;
    const BANDS = 4;
    const curve = (i0: number, i1: number) => {
      ctx.beginPath();
      ctx.moveTo(pts[i0 * 2], pts[i0 * 2 + 1]);
      for (let i = i0 + 1; i < i1; i++) {
        const mx = (pts[i * 2] + pts[i * 2 + 2]) / 2;
        const my = (pts[i * 2 + 1] + pts[i * 2 + 3]) / 2;
        ctx.quadraticCurveTo(pts[i * 2], pts[i * 2 + 1], mx, my);
      }
      ctx.lineTo(pts[i1 * 2], pts[i1 * 2 + 1]);
    };
    for (let k = 0; k < BANDS; k++) {
      const i0 = Math.floor(((count - 1) * k) / BANDS);
      const i1b = Math.floor(((count - 1) * (k + 1)) / BANDS);
      if (i1b <= i0) continue;
      const h = (k + 1) / BANDS;
      // Plain colour, not the tooth (cheaper to raster every frame), a
      // shade fainter to read the same as it cools.
      ctx.globalAlpha = base * 0.75 + (st.n.bright * st.alpha - base * 0.75) * h * h * heat;
      ctx.lineWidth = st.n.w + h * 1.3 * heat;
      curve(i0, i1b);
      ctx.stroke();
    }
    if (heat > 0.02) {
      // Its light: a finer, paler line near the head, and the bead.
      ctx.globalAlpha = 0.7 * heat;
      ctx.strokeStyle = `rgb(${RGB[hue === "c" ? "cl" : "ml"].join(" ")})`;
      ctx.lineWidth = 0.9;
      curve(Math.floor((count - 1) * 0.6), count - 1);
      ctx.stroke();
      const hx = pts[(count - 1) * 2];
      const hy = pts[(count - 1) * 2 + 1];
      const rad = st.n.bead;
      ctx.globalAlpha = heat * (st.resting ? 0.55 : 1);
      const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, rad);
      const [cr, cg, cb] = RGB[hue];
      const [lr, lg, lb] = RGB[hue === "c" ? "cl" : "ml"];
      glow.addColorStop(0, `rgba(${lr},${lg},${lb},0.95)`);
      glow.addColorStop(0.35, `rgba(${cr},${cg},${cb},0.5)`);
      glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(hx - rad, hy - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Repaint only where something changed: each changed thing's old box
   * and new one, merged. */
  function paintLive() {
    if (!bpats) return;
    const dirty: Box[] = cleared;
    cleared = [];
    for (const st of strands) {
      if (!st.dirty) continue;
      st.dirty = false;
      const next = boxOf(st);
      if (st.box) dirty.push(st.box);
      if (next) dirty.push(next);
      st.box = next;
    }
    if (!dirty.length) return;
    const view: Box = { l: 0, t: bandTop, r: bandW, b: bandTop + bandH };
    const rects: Box[] = [];
    for (const d of dirty) {
      if (!meets(d, view)) continue;
      let r = { l: Math.max(0, Math.floor(d.l)), t: Math.max(bandTop, Math.floor(d.t)), r: Math.min(bandW, Math.ceil(d.r)), b: Math.min(bandTop + bandH, Math.ceil(d.b)) };
      // Merge with any it overlaps (and anything that then overlaps).
      for (let i = rects.length - 1; i >= 0; i--) {
        if (!meets(rects[i], { l: r.l - 8, t: r.t - 8, r: r.r + 8, b: r.b + 8 })) continue;
        const o = rects.splice(i, 1)[0];
        r = { l: Math.min(o.l, r.l), t: Math.min(o.t, r.t), r: Math.max(o.r, r.r), b: Math.max(o.b, r.b) };
        i = rects.length;
      }
      rects.push(r);
    }
    const ctx = bctx;
    ctx.setTransform(bandDpr, 0, 0, bandDpr, 0, -bandTop * bandDpr);
    for (const r of rects) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.l, r.t, r.r - r.l, r.b - r.t);
      ctx.clip();
      ctx.clearRect(r.l, r.t, r.r - r.l, r.b - r.t);
      for (const st of strands) if (st.box && meets(st.box, r)) paintStrand(ctx, bpats, st);
      ctx.restore();
    }
  }

  /* ---------- Growing ---------- */

  function spawn(kind: Kind, seed: Seed, drive: Drive): Strand {
    const t = fate.add(seed);
    const st: Strand = {
      kind,
      n: nature(kind),
      t,
      ls: [0],
      s: 0,
      drive,
      rand: rng(seed.seed * 3 + 1),
      rope: null,
      laid: 0,
      fadeAt: Infinity,
      alpha: 1,
      top: seed.y,
      bottom: seed.y,
      motion: 1,
      heat: 1,
      resting: false,
      box: null,
      dirty: true,
      cold: false,
    };
    strands.push(st);
    return st;
  }

  const born = (seed: Seed) => spawn("ground", seed, { by: "fate" });

  const growing = (kind?: Kind) => strands.filter((st) => !st.cold && st.heat > 0 && (!kind || st.kind === kind));

  /** Is a point near enough the reader to be seen? */
  function seen(y: number, margin = 0.5) {
    const view = scrollY - pageTop;
    return y > view - innerHeight * margin && y < view + innerHeight * (1 + margin);
  }

  const headY = (st: Strand) => at(st, st.s)[1];

  /** A finished strand: lay the rest, and let it lie. */
  function finish(st: Strand, now: number) {
    bake(st, st.t.xs.length - 1);
    if (st.box) cleared.push(st.box);
    st.box = null;
    st.rope = null;
    st.cold = true;
    st.fadeAt = now + st.n.hold * (0.7 + st.rand() * 0.8);
    // Too short to read as a thread: let it go now.
    if (st.t.xs.length < 14) st.fadeAt = now;
  }

  /** New threads in from the edges near the reader, once the page's own
   * have been born: the page keeps living without filling up. */
  function trickle(now: number, near: number) {
    if (now < nextTrickle) return;
    const rand = rng(options.seed * 7 + ++trickles * 131);
    // Sooner when nothing near the reader is growing.
    nextTrickle = now + 2500 + near * 3000 + rand() * 3000;
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
    for (const st of strands) {
      if (now < st.fadeAt) continue;
      const left = Math.max(0, 1 - Math.ceil(((now - st.fadeAt) / FADE) * FADES) / FADES);
      if (left === st.alpha) continue;
      st.alpha = left;
      const [a, b] = tileRange(st.top, st.bottom);
      for (let k = a; k <= b; k++) touched.add(k);
      if (!left) {
        st.t.gone = true;
        swept = true;
      }
    }
    if (swept) {
      strands = strands.filter((st) => !st.t.gone);
      fate.sweep();
    }
    for (const k of touched) {
      const tile = tiles.get(k);
      if (tile) paintTile(tile);
    }
  }

  function nextFade(now: number) {
    let next = Infinity;
    for (const st of strands) {
      if (st.fadeAt === Infinity) continue;
      next = Math.min(next, st.fadeAt <= now ? now + FADE / FADES : st.fadeAt);
    }
    return next;
  }

  const asleep = () => options.isIdle() || document.hidden;
  /** Someone is reading: they arrived a moment ago or did something lately.
   * Left alone, the ground holds where it is (its beads dim) until the
   * reader moves again. */
  const present = (now: number) => now - lastInput < ATTEND || now - began < arrive;

  /** Move a strand's head on by this long, and its rope with it. Returns
   * whether it is still visibly moving. */
  function move(st: Strand, now: number, dt: number, here: boolean) {
    const before = st.s;
    const near = seen(headY(st), 0.2);
    st.resting = st.kind === "ground" && !here;
    if (!st.resting) {
      // Out of sight a head hurries (a beat at a time, unpainted).
      const pace = near ? 1 : 6;
      const by = st.drive.by;
      const speed = st.n.speed * (by === "wind" ? 1.25 : by === "fate" && st.kind === "pointer" ? 0.5 : 1);
      st.s += (speed * pace * (near ? Math.min(dt, 64) : dt)) / 1000;
      grow(st, st.s + STEP);
      st.s = Math.min(st.s, measureBody(st));
    }
    dt = Math.min(dt, 64);
    const ended = st.t.done && st.s >= measureBody(st) - 0.01;
    st.motion += ((st.resting || ended ? 0 : 1) - st.motion) * Math.min(1, dt / 220);
    if (ended) st.heat = Math.max(0, st.heat - dt / 700);
    if (!near) {
      if (st.rope || st.box) {
        st.rope = null;
        st.dirty = true;
      }
      return false;
    }
    swing(st, Math.min(dt, 40), now);
    const moving = st.s !== before || (st.rope?.energy ?? 0) > 0.04 || (ended && st.heat > 0) || st.motion > 0.01;
    if (moving) st.dirty = true;
    return moving;
  }

  function tick(now: number): boolean {
    if (asleep() || busy || !built) return false;
    const dt = Math.min(250, now - (lastTick || now));
    lastTick = now;
    const here = present(performance.now());
    anchor();
    if (here) {
      // Born as the drawing reaches them, a moment apart; only heads near
      // the reader count (the rest hurry out of sight).
      const reach = loom.reach();
      let growingNear = growing("ground").filter((st) => seen(headY(st))).length;
      while (sown < seeds.length && seeds[sown].key <= reach && growingNear < live && now - lastBirth > 350) {
        born(seeds[sown++]);
        lastBirth = now;
        growingNear++;
      }
      // Nothing of the page's own left to be born here: new ones come in
      // from the edges near the reader.
      if (growingNear < live && (sown >= seeds.length || seeds[sown].key > reach)) trickle(now, growingNear);
    }
    // A pointer at rest sends a thread or two.
    if (fine && pointer.here && now - pointer.at > 700 && pointer.rests < 2 && now - pointer.lastIssue > 1100) {
      pointer.rests++;
      issue(pointer.x, pointer.y, now, false);
    }
    let moving = false;
    let offscreen = false;
    for (const st of strands) {
      if (st.cold) continue;
      if (move(st, now, dt, here)) moving = true;
      // Lay what has cooled behind the head, a batch at a time.
      const settled = st.s - Math.min(st.n.tail, st.s);
      const to = indexAt(st, settled);
      if (to - st.laid >= BATCH) bake(st, to);
      if (st.t.done && st.heat <= 0 && (!st.rope || st.rope.energy < 0.04)) finish(st, now);
      else if (!st.cold && !st.resting && !seen(headY(st), 0.2)) offscreen = true;
    }
    for (const [t, i] of fate.breaks) breakAt(t, i);
    fate.breaks.length = 0;
    fade(now);
    // Paint, every other frame when frames run long.
    if (!skipPaint || !moving) {
      const t0 = performance.now();
      paintLive();
      paintCost = paintCost * 0.9 + (performance.now() - t0) * 0.1;
      skipPaint = paintCost > SLOW;
    } else skipPaint = false;
    if (moving) return true;
    // Nothing on screen moving: wake for heads out of sight (a beat), the
    // next birth, trickle or fade.
    lastTick = offscreen ? lastTick : 0;
    let wait = nextFade(now) - now;
    if (offscreen) wait = Math.min(wait, 200);
    if (here && sown < seeds.length && seeds[sown].key <= loom.reach()) wait = Math.min(wait, 400);
    else if (here) wait = Math.min(wait, Math.max(nextTrickle - now, 400));
    if (here) wait = Math.min(wait, ATTEND - (now - lastInput) + 20);
    if (fine && pointer.here && pointer.rests < 2) {
      wait = Math.min(wait, Math.max(700 - (now - pointer.at), 1100 - (now - pointer.lastIssue)) + 20);
    }
    if (wait < Infinity) task.wakeIn(Math.max(30, wait));
    return false;
  }

  /* ---------- From the pointer ---------- */

  /** Send a thread out from (x, y) to the nearest thing nobody else is
   * going to. With nothing near (and `anywhere`), it runs on with fate. */
  function issue(x: number, y: number, now: number, anywhere: boolean) {
    if (growing("pointer").length >= INTENTS + (anywhere ? 2 : 0)) return;
    let aim: Aim | null = null;
    let best = SEEK;
    for (const a of aims) {
      const d = gapTo(a.box, x, y);
      if (d < 18 || d >= best) continue;
      if (strands.some((st) => st.drive.by === "seek" && st.drive.aim === a)) continue;
      best = d;
      aim = a;
    }
    let on: { hue: Hue; s: number } | null = null;
    let target: Pt | null = null;
    if (aim) target = [Math.max(aim.box.l, Math.min(aim.box.r, x)), Math.max(aim.box.t, Math.min(aim.box.b, y))];
    else {
      // Nothing near: the hions' own way, if it is.
      const hit = nearestHion(x, y, best);
      if (hit && hit.d > 24) {
        on = { hue: hit.hue, s: hit.s };
        target = [hit.x, hit.y];
      }
    }
    const seed = Math.floor(now * 7 + x * 13 + y);
    const rand = rng(seed);
    pointer.hue = pointer.hue === "c" ? "m" : "c";
    pointer.lastIssue = now;
    if (!target) {
      if (!anywhere || ground.clear(x, y) < 12) return;
      const a = (rand() - 0.5) * Math.PI * 2;
      const st = spawn("pointer", { x, y, a, hue: pointer.hue, len: 500 + rand() * 700, seed, key: y, goals: goalsFor(all, x, y, a, false, rand) }, { by: "fate" });
      st.t.wander = 1.4;
      task.wake();
      return;
    }
    // Out at a slant, so it comes round in a drawn curve, not a beeline.
    const a = Math.atan2(target[1] - y, target[0] - x) + (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.4);
    const st = spawn("pointer", { x, y, a, hue: pointer.hue, len: 0, seed, key: y, goals: [] }, { by: "seek", aim, on, crept: 0, letGo: !!aim && rand() < 0.5 });
    st.t.len = Infinity;
    task.wake();
  }

  function seekPoint(d: Extract<Drive, { by: "seek" }>, x: number, y: number): Pt | null {
    if (d.aim) {
      const b = d.aim.box;
      return [Math.max(b.l - 12, Math.min(b.r + 12, x)), Math.max(b.t - 12, Math.min(b.b + 12, y))];
    }
    if (d.on) {
      const h = hions.find((h) => h.hue === d.on!.hue);
      if (h) return hionAt(h, d.on.s).slice(0, 2) as Pt;
    }
    return null;
  }

  function onMove(event: PointerEvent) {
    lastInput = performance.now();
    if (!fine || (event.pointerType !== "mouse" && event.pointerType !== "pen") || !built || busy) {
      task.wake();
      return;
    }
    const now = performance.now();
    const x = event.clientX;
    const y = event.clientY + scrollY - pageTop;
    if (pointer.here) pointer.travelled += Math.hypot(x - pointer.x, y - pointer.y);
    const speed = pointer.here ? Math.hypot(x - pointer.x, y - pointer.y) / Math.max(8, now - pointer.at) : 0;
    pointer.x = x;
    pointer.y = y;
    pointer.at = now;
    pointer.here = true;
    pointer.rests = 0;
    // Moving sends threads out, every so far; too quick, none.
    if (pointer.travelled > 150 && now - pointer.lastIssue > 240 && speed < 2.4) {
      pointer.travelled = 0;
      issue(x, y, now, false);
    }
    task.wake();
    task.wakeIn(720);
  }

  /** A tap on the paper sends a pair out from there. */
  function onDown(event: PointerEvent) {
    lastInput = performance.now();
    if (!built || busy || event.button > 0) return;
    const target = event.target as Element;
    if (target.closest("a, button, input, textarea, select, .hion-top")) return;
    const x = event.clientX;
    const y = event.clientY + scrollY - pageTop;
    if (y < 0 || y > height) return;
    const now = performance.now();
    pointer.lastIssue = 0;
    issue(x, y, now, true);
    pointer.lastIssue = 0;
    issue(x, y, now + 1, true);
    task.wake();
  }

  function onScroll() {
    if (!built || busy) return;
    cull();
    lastInput = performance.now();
    task.wake();
  }

  /* ---------- Arriving, and a new layout ---------- */

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
    const slice = () => {
      if (mine !== settling || signal.aborted) return;
      if (options.isIdle()) {
        settleTimer = window.setTimeout(slice, 250);
        return;
      }
      const end = performance.now() + 6;
      while (performance.now() < end) {
        const st = strands.find((st) => !st.t.done);
        if (st) {
          // Interleaved a little, so later threads find earlier ones.
          for (let k = 0; k < 40 && fate.step(st.t); k++);
          continue;
        }
        if (sown < seeds.length && seeds[sown].key <= reach) {
          born(seeds[sown++]);
          continue;
        }
        break;
      }
      if (strands.some((st) => !st.t.done) || (sown < seeds.length && seeds[sown].key <= reach)) {
        settleTimer = window.setTimeout(slice, 16);
        return;
      }
      settling++;
      busy = false;
      delete layer.dataset.state;
      fate.breaks.length = 0;
      const now = performance.now();
      for (const st of strands) {
        st.s = measureBody(st);
        st.laid = st.t.xs.length - 1;
        st.cold = true;
        st.heat = 0;
        for (const y of st.t.ys) {
          if (y < st.top) st.top = y;
          if (y > st.bottom) st.bottom = y;
        }
        st.fadeAt = instant ? Infinity : now + st.n.hold * (0.4 + st.rand());
      }
      for (const tile of tiles.values()) for (const pane of tile.panes) pane.el.remove();
      tiles.clear();
      cull();
      bandFresh = true;
      task.wake();
    };
    slice();
  }

  /** On arrival the first screen is not bare: its threads are already
   * part grown (the first few still growing, their heads live), so the
   * ground is there at once and a few heads are at work in it. */
  function pregrow() {
    const fold = Math.max(0, scrollY - pageTop) + innerHeight;
    let started = 0;
    const now = performance.now();
    while (sown < seeds.length && seeds[sown].key <= fold) {
      const st = born(seeds[sown++]);
      const stop = started < live ? st.t.len * (0.3 + st.t.rand() * 0.25) : Infinity;
      if (stop < Infinity) started++;
      while ((st.t.xs.length - 1) * STEP < stop && fate.step(st.t));
      st.s = measureBody(st);
      if (st.t.done) {
        st.laid = st.t.xs.length - 1;
        st.cold = true;
        st.heat = 0;
        st.fadeAt = now + st.n.hold * (0.5 + st.t.rand());
      } else st.laid = Math.max(0, indexAt(st, st.s - st.n.tail) - 1);
      for (let i = 0; i <= st.laid; i++) {
        st.top = Math.min(st.top, st.t.ys[i]);
        st.bottom = Math.max(st.bottom, st.t.ys[i]);
      }
    }
    fate.breaks.length = 0;
    lastBirth = now;
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
      build();
      settle(instant ? Infinity : loom.reach());
    }, 220);
  });

  return {
    start() {
      seenWidth = page.clientWidth;
      seenHeight = page.scrollHeight;
      page.insertBefore(liveLayer, page.querySelector(":scope > main"));
      build();
      observer.observe(page);
      addEventListener("scroll", onScroll, { passive: true, signal });
      addEventListener("resize", onScroll, { passive: true, signal });
      if (!instant) {
        page.addEventListener("pointerdown", onDown, { passive: true, signal });
        addEventListener("pointermove", onMove, { passive: true, signal });
        addEventListener("keydown", () => ((lastInput = performance.now()), task.wake()), { passive: true, signal });
        document.addEventListener("pointerleave", () => (pointer.here = false), { signal });
      }
      signal.addEventListener("abort", () => {
        observer.disconnect();
        clearTimeout(settleTimer);
        clearTimeout(resizeTimer);
        built = false;
      });
      if (instant) settle(Infinity);
      else {
        began = performance.now();
        pregrow();
        cull();
        for (const l of [layer, liveLayer]) l.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease" });
        task.wake();
      }
    },
    /** Let the threads go. Toward a point (page px): they magnify round
     * it, as if you leant in to look at one thread. */
    release(toward?: Pt) {
      built = false;
      const keyframes: Keyframe[] = toward
        ? [
            { transformOrigin: `${toward[0]}px ${toward[1]}px`, transform: "scale(1)", opacity: 1 },
            { transformOrigin: `${toward[0]}px ${toward[1]}px`, transform: "scale(2.4)", opacity: 0 },
          ]
        : [{ opacity: 1 }, { opacity: 0 }];
      for (const l of [layer, liveLayer]) l.animate(keyframes, { duration: 420, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" });
    },
    /** For a check: the threads themselves. */
    fate: () => fate,
    strands: () => strands,
  };
}
