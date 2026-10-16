/** The skein: every thread on a Hion screen, as one kind of thing, of one
 * material.
 *
 * A strand is a body grown from its head, a goal that steers the head, a
 * hue, a width, some slack, a glow, a body strength and a lifetime. The
 * kinds differ only in those numbers (NATURE) and in what steers them:
 *
 *   hion     the two hions: persistent and brightest. Their ways down the
 *            page are composed from the screen's stations (weave.ts);
 *            here they are grown along those ways as far as the loom has
 *            drawn (scroll), their bodies laid on the ground as their
 *            heads pass, like every other thread's.
 *   ground   born where the hions come down from the line and in from the
 *            page edges as the drawing reaches them; steered by fate.ts
 *            (taut, bowed, turning at decisions, falling in alongside
 *            company, gathering into bundles, a few running off alone);
 *            long and quiet. Home has the most.
 *   pointer  born at a click or tap (a pair), or as a branch off a thread
 *            you brush (a hion, or one lying on the ground: the branch
 *            takes its hue and leaves at a slant). It seeks the nearest
 *            structure nobody else is going to (a heading, a picture, a
 *            charm; otherwise a hion), winds round it (through a heading's
 *            words, a loose band round a picture, stitches across a hion),
 *            and then either lets go into fate and runs on to join the
 *            ground's flow, or ends there. Nothing issues from the pointer
 *            merely moving.
 *   loop     born where you hover something hung, strung or linked: it
 *            weaves through its words (a title, a link) or ties a loop
 *            round it (a picture, a card), quick, holds while you stay, and
 *            unties from its end back when you leave. Threads from the
 *            pointer still on their way somewhere near turn to it too.
 *            Left alone a while, the hions now and then tie a small one of
 *            their own (life.ts).
 *   title    a large word written by one thread (spun.ts measures it,
 *            trace.ts finds the way): off the hion if one runs near, else
 *            in from the page's edge or from just before the word, along
 *            a line under its feet and up through each letter in turn,
 *            out past the last. Its way is kept and measured again when
 *            the page is laid out anew; it never fades. Its width is the
 *            letters' own stroke, in the family.
 *
 * One material (strokeRun): every run of thread is a soft light under it,
 * two or three fibres of pigment twisted loosely about its line (with the
 * paper's tooth in them) wavering a little together as a hand lays them,
 * a pale core, and, once settled, pigment dust thrown off beside it. The
 * widths are one family (a hion 3.1 or 4.1; the rest 2.5 to 3.1); what
 * differs is how firmly a body lies. The run behind a head is the same
 * run drawn hot: the fibres swell and brighten toward the tip, the core
 * goes white, the light spreads, and a small halo sits on the tip itself;
 * a moving head throws off specks of dust that fall to the paper. No bead
 * on a stick: the light is the thread's own.
 *
 * Every strand is in one index (fate's): the hions are fixed company, so
 * ground threads fall in alongside them; ground threads fall in alongside
 * pointer threads that have let go; crossings go over and under, and a
 * hion lies over everything.
 *
 * A head moves every frame while it is active, pulled, eased and pulled
 * again rather than at one rate, drawn between the points fate laid, so
 * it never steps. Behind it a short rope (KNOTS nodes, slightly longer
 * than the path it spans) hangs from the head to where the thread has
 * settled: it sags a little, lags on a turn and sways while the head
 * moves, and settles onto the path as it cools, so what is laid down is
 * what you saw. A hion's head rides a rope too, chasing the loom's reach,
 * and dims to half once it has caught up and waits.
 *
 * Paid for elsewhere: one live canvas for everything that moves (a band
 * of the page about one and a half screens tall, so scrolling carries it
 * and only moving it on repaints it), repainted only where something
 * changed (each thing's old and new box); what has cooled is baked onto
 * page-space panes near the viewport, a batch at a time on a beat (each
 * bake re-stills a pane), and never repainted until it has faded (a fade
 * is a few steps on one beat, taken off the paper in place along its own
 * fibres, and one repaint at the end; threads fade in waves); at most
 * three ground heads grow near the
 * reader (six on home; heads out of sight hurry, unpainted, a beat at a
 * time); when a frame's painting runs long the live canvas is painted
 * every other frame. Ground heads grow while someone is there (6s after
 * arriving and after any input; 12s on home), then rest; everything
 * sleeps while the prism holds the page idle, the tab is hidden, and once
 * nothing is moving.
 *
 * Reduced motion and a still face grow everything out of sight and show
 * it settled, the hions whole, with no heads and nothing from the pointer.
 *
 * What stays its own: what hangs from the hions (wefts, knots, ties and
 * cords, pastel marks laid by the loom above the ground), the woven
 * covers (woven.ts: a cellular cloth, a different medium), the menu
 * cord and its swatches (nav.ts), the ribbon a new screen comes down as
 * (index.ts: a page transition on the compositor, which has to run while
 * the main thread is busiest), and the resume track (its own loom, its
 * hions still in pastel). */
import { TEMPER } from "./dance";
import { Fate, goalsFor, Ground, type Near, plan, type Gather, type Seed, STEP, type Thread } from "./fate";
import type { createLoom } from "./loom";
import { still, unshow } from "./dom";
import type { Pulse } from "./pulse";
import { type Hue, patterns, type Patterns, type Pt, RGB, rng } from "./pastel";
import { type Box, encircle as encircle_, ring, smooth, stitches, weave, wordBoxes } from "./wind";
import type { Measure, Spun } from "./spun";

type Loom = ReturnType<typeof createLoom>;

/** Something else that moves on the live canvas (life.ts: plucks,
 * runners, dust), stepped and painted with the strands, in page px. */
export interface Effect {
  /** Move on by dt (ms); false once nothing of it is left. */
  step(now: number, dt: number): boolean;
  /** Where it is now. */
  boxes(): Box[];
  paint(ctx: CanvasRenderingContext2D): void;
}

export type Kind = "hion" | "ground" | "pointer" | "loop" | "title";

interface Nature {
  /** Thread width (css px): the spread of its fibres. */
  w: number;
  /** How fast the head goes (px a second). */
  speed: number;
  /** The warm run behind the head (px), which the rope spans. */
  tail: number;
  /** The rope's length over the path it spans. */
  slack: number;
  /** The soft light along its settled body (the fibres being 1). */
  glow: number;
  /** How strongly its settled body lies (a hion being 1). */
  body: number;
  /** How long it lies once finished, before it fades (ms). */
  hold: number;
}

/** One material: every thread is the hions' thread, at a width in their
 * family (a hion is 3.1 or 4.1 wide: dance.ts TEMPER). What differs is how
 * firmly the body lies and how long. */
const NATURE: Record<Kind, Nature> = {
  hion: { w: 3.6, speed: 700, tail: 130, slack: 1.04, glow: 0.16, body: 1, hold: Infinity },
  ground: { w: 2.5, speed: 150, tail: 110, slack: 1.07, glow: 0, body: 0.5, hold: 55000 },
  pointer: { w: 2.8, speed: 360, tail: 90, slack: 1.1, glow: 0, body: 0.62, hold: 12000 },
  loop: { w: 3.1, speed: 1100, tail: 80, slack: 1.05, glow: 0.14, body: 0.95, hold: Infinity },
  // Width and speed are set per word (its stroke; about two seconds).
  title: { w: 3.4, speed: 900, tail: 70, slack: 1.02, glow: 0.16, body: 1, hold: Infinity },
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
  /** A busy screen (home): more ground, more heads at work, longer. */
  lively?: boolean;
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
  | { by: "wind"; way: Pt[]; at: number; letGo: boolean }
  | { by: "loop"; el: Element | null; state: "tying" | "held" | "untying"; until: number }
  | { by: "hion"; keys: Float64Array }
  | { by: "title"; el: HTMLElement };

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
  /** The extent of what is baked (page px). */
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** When it was last baked (performance.now()). */
  bakedAt: number;
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
  /** How far the head has moved since it last threw off dust (px). */
  spun: number;
}

/** A speck of pigment thrown off a moving head, falling to the paper. */
interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  hue: Hue;
  pale: boolean;
  size: number;
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
/** Segments laid onto the ground at once, and the least time between
 * two bakes of one strand (ms). */
const BATCH = 8;
const BEAT = 320;
/** Rope nodes. */
const KNOTS = 12;
/** Ground heads growing at once near the reader (fewer on a screen seen
 * close, where each is twice the size and its page otherwise very still). */
const LIVE = 3;
/** How long the ground keeps growing after the reader last did anything,
 * and after the screen arrives (ms). */
const ATTEND = 6000;
const ARRIVE = 6000;
/** A fade: this long, in this many steps. Every step repaints whole panes
 * (every strand on them, and a new bitmap each), so steps are few, and
 * finished strands are grouped to fade together, to GROUP ms, so a pane
 * fades its threads in waves with rest between. */
const FADE = 3000;
const FADES = 4;
const GROUP = 16000;
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
/** What a loop is tied round when you hover it. */
const HOVER = "[data-ink]:not(.hion-pull), .hion-strung, .hion-tie, .hion-prose a, .hion-foot__mail a";

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
export const seedOf = (path: string) => hash(path) % 100000;

/** A cheap hash of two integers in [0, 1): the same mark every time. */
function hash01(a: number, b: number) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const TAU = Math.PI * 2;
/** The farthest apart two consecutive points of one thread can be and
 * still be the same stretch (a hion leaves the page for a track). */
const JUMP = 120;

const gapTo = (b: Box, x: number, y: number) => Math.hypot(Math.max(b.l - x, 0, x - b.r), Math.max(b.t - y, 0, y - b.b));
const meets = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

export function createSkein(options: SkeinOptions) {
  const { page, loom, signal, instant } = options;
  const scale = options.scale ?? 1;
  const close = scale > 1;
  const fine = matchMedia("(pointer: fine)").matches;
  const lively = !!options.lively && !close;
  const nature = (kind: Kind): Nature => {
    const n = NATURE[kind];
    return close && kind !== "title" ? { ...n, w: n.w * 1.6 } : n;
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
  /** The words written by thread, by element: measured again whenever
   * the page is laid out anew. */
  const titles = new Map<HTMLElement, { hue: Hue; measure: Measure }>();
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
  const live = close ? LIVE - 1 : lively ? LIVE + 3 : LIVE;
  // A single thing seen close arrives still: its threads wait for the
  // reader; home keeps busy longer.
  const arrive = close ? 0 : lively ? ARRIVE * 2 : ARRIVE;
  const attend = lively ? ATTEND * 2 : ATTEND;
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
  const effects: { e: Effect; last: Box[] }[] = [];
  const motes: Mote[] = [];
  // The pointer, in page space.
  const pointer = { x: -1e4, y: -1e4, at: 0, here: false, lastIssue: 0, hue: "c" as Hue };
  /** When each thread last sent a branch off under the pointer, by id. */
  const branched = new Map<number, number>();
  let lastBranch = 0;

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
        ls[i] = i ? ls[i - 1] + (d > JUMP ? 0 : d) : 0;
      }
      hions.push({ hue: tip.hue, xs, ys, ls, keys: tip.keys });
      fate.fix(tip.hue, tip.points);
    }
    // The hions themselves: strands grown along their composed ways, as
    // far as the loom has drawn. Each at its own weight (cyan the finer).
    strands = strands.filter((st) => {
      if (st.kind !== "hion") return true;
      if (st.box) cleared.push(st.box);
      return false;
    });
    const narrow = width < 720;
    for (const tip of loom.journeys()) {
      if (tip.points.length < 2) continue;
      const n = nature("hion");
      const w = TEMPER[tip.hue].weight * (narrow ? 0.85 : 1) * (close ? 1.3 : 1);
      const st = make("hion", { ...n, w }, fate.bare(tip.hue, tip.points), { by: "hion", keys: tip.keys });
      measureBody(st);
      st.s = hionTarget(st);
      st.laid = Math.max(0, indexAt(st, st.s - n.tail) - 1);
      strands.unshift(st);
    }
  }

  /** How far along its way a hion's drawing has got. */
  function hionTarget(st: Strand) {
    const keys = (st.drive as Extract<Drive, { by: "hion" }>).keys;
    const reach = loom.reach();
    if (keys[0] > reach) return 0;
    let lo = 0;
    let hi = keys.length - 1;
    if (keys[hi] <= reach) return st.ls[hi];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (keys[mid] <= reach) lo = mid;
      else hi = mid;
    }
    const span = keys[lo + 1] - keys[lo];
    const u = span > 0 ? Math.min(1, (reach - keys[lo]) / span) : 0;
    return st.ls[lo] + (st.ls[lo + 1] - st.ls[lo]) * u;
  }

  /** A hion's head chases its drawing: quick, never a jump unless the
   * drawing jumped far (a fling), a little dimmer once it has caught up. */
  function chase(st: Strand, dt: number, now: number) {
    const before = st.s;
    const target = hionTarget(st);
    const total = measureBody(st);
    const gap = target - st.s;
    if (Math.abs(gap) > 900) st.s = target - Math.sign(gap) * 240;
    else if (gap) {
      const speed = Math.max(st.n.speed, Math.abs(gap) * 7);
      st.s += Math.sign(gap) * Math.min(Math.abs(gap), (speed * dt) / 1000);
    }
    const going = st.s !== before || loom.drawing();
    st.resting = !going;
    st.motion += ((going ? 1 : 0) - st.motion) * Math.min(1, dt / 220);
    // At the end of its way (or not yet begun) it gives no light; waiting
    // for the reader, half.
    const lit = st.s > 2 && st.s < total - 2;
    const heat = st.heat;
    const want = lit ? (going ? 1 : 0.45) : 0;
    st.heat += (want - st.heat) * Math.min(1, dt / (want > st.heat ? 300 : 700));
    if (Math.abs(st.heat - want) < 0.005) st.heat = want;
    if (!seen(headY(st), 0.2)) {
      if (st.rope || st.box) {
        st.rope = null;
        st.dirty = true;
      }
      return false;
    }
    swing(st, Math.min(dt, 40), now);
    throwDust(st, st.s - before);
    const moving = st.s !== before || st.heat !== heat || (st.rope?.energy ?? 0) > 0.04 || st.motion > 0.01;
    if (moving || st.box === null) st.dirty = true;
    return moving;
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
    const spun = measureTitles();
    page.classList.remove("hion-measuring");
    ground.finish();
    fate = new Fate(ground);
    strands = [];
    hionVersion = -1;
    readHions();
    // The words written by thread, laid again (settled by settle()).
    for (const [el, s] of spun) title(el, titles.get(el)!.hue, s);
    const origin = options.origin();
    const planned = plan(ground, {
      width,
      height,
      drop: origin?.[0] ?? width * 0.56,
      top: (origin?.[1] ?? 110) + 16,
      seed: options.seed,
      close,
      lively,
    });
    all = planned.gathers;
    seeds = planned.seeds;
    sown = 0;
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
      const d = i ? Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]) : 0;
      // A stretch a hion leaves the page for (a track) is no length.
      ls.push(i ? ls[i - 1] + (d > JUMP ? 0 : d) : 0);
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
    // A loop is laid whole when it is tied; a hion, by the loom; a title
    // when it is measured.
    if (d.by === "loop" || d.by === "hion" || d.by === "title") return;
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
  function nearestHion(x: number, y: number, r: number, hue?: Hue) {
    const reach = loom.reach();
    let best: { hue: Hue; s: number; d: number; x: number; y: number } | null = null;
    for (const h of hions) {
      if (hue && h.hue !== hue) continue;
      for (let i = 0; i < h.xs.length; i += 2) {
        if (h.keys[i] > reach) break;
        const d = Math.hypot(h.xs[i] - x, h.ys[i] - y);
        if (d < r && (!best || d < best.d)) best = { hue: h.hue, s: h.ls[i], d, x: h.xs[i], y: h.ys[i] };
      }
    }
    return best;
  }

  /* ---------- Words written by thread ---------- */

  /** Measure every registered word where it rests (the page is held
   * still by the caller). A word that cannot be written stays chalk. */
  function measureTitles() {
    const out: [HTMLElement, Spun][] = [];
    const p = page.getBoundingClientRect();
    for (const [el, t] of titles) {
      if (!el.isConnected) {
        titles.delete(el);
        continue;
      }
      const s = t.measure(p);
      if (s) out.push([el, s]);
    }
    return out;
  }

  /** A word's thread, laid whole (its head at the start; the caller moves
   * it or settles it). It comes off the nearest drawn hion of its own hue
   * if one runs near, otherwise in from the page's edge when the word is
   * near it, otherwise from a little before the word. */
  function title(el: HTMLElement, hue: Hue, spun: Spun) {
    const [x0, y0] = spun.way[0];
    let way = spun.way;
    // Only from this side of the word: an approach from beyond its start
    // would cross the letters.
    const off = nearestHion(x0, y0, 300, hue) ?? nearestHion(x0, y0, 180);
    if (off && off.d > 20 && off.x <= x0 + 24) way = [[off.x, off.y], [(off.x + x0) / 2, (off.y + y0) / 2 + 4], ...way];
    else if (x0 < 240) way = [[-6, y0 + 2], ...way];
    const n: Nature = { ...nature("title"), w: Math.max(2, Math.min(4.2, spun.width * 0.8)) };
    const t = fate.bare(hue, smooth(way, 4));
    const st = make("title", n, t, { by: "title", el });
    const total = measureBody(st);
    // About two seconds a word, however long; a short one no quicker.
    n.speed = Math.max(700, total / 1.8);
    strands.push(st);
    el.dataset.spunState = "spun";
    return st;
  }

  /** A word's thread, written at once and lying cold. */
  function whole(st: Strand) {
    st.s = measureBody(st);
    st.heat = 0;
    st.motion = 0;
    st.rope = null;
    finish(st, performance.now());
  }

  /* ---------- The thread itself ---------- */

  /** How strongly segment i lies: tapered at its start, and at its end
   * once it has one. */
  function taper(st: Strand, i: number) {
    const n = st.t.xs.length - 1;
    let a = Math.min(1, (i + 1) / 16);
    if (st.t.done && st.kind !== "hion") a = Math.min(a, (n - i) / 10);
    return Math.max(0, a) * st.alpha;
  }

  /** One run of thread, the one way every thread is drawn: a soft light
   * under it, two or three fibres of pigment twisted loosely about its
   * line (the paper's tooth in them), a pale core, and, once settled,
   * pigment dust thrown off beside it. `pts` are x,y pairs and `arc` the
   * distance along the thread at each (the twist runs along it, so a run
   * drawn in pieces still reads as one). `heat`, per point, warms the run
   * toward the head: the fibres swell and brighten and the core goes
   * white; the light under it spreads. */
  function strokeRun(
    ctx: CanvasRenderingContext2D,
    pats: Patterns,
    hue: Hue,
    w: number,
    glow: number,
    pts: number[],
    arc: number[],
    base: number,
    heat: number[] | null,
    dust: boolean,
    seed: number,
    erase?: number,
  ) {
    const n = pts.length / 2;
    if (n < 2 || base <= 0) return;
    const nx = new Float32Array(n);
    const ny = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const a = Math.max(0, k - 1);
      const b = Math.min(n - 1, k + 1);
      const dx = pts[b * 2] - pts[a * 2];
      const dy = pts[b * 2 + 1] - pts[a * 2 + 1];
      const len = Math.hypot(dx, dy) || 1;
      nx[k] = -dy / len;
      ny[k] = dx / len;
    }
    const F = w < 3 ? 2 : 3;
    const ph = hash01(seed, 1) * TAU;
    const pale = hue === "c" ? "cl" : "ml";
    const [cr, cg, cb] = RGB[hue];
    const bands = heat ? 4 : 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // The bundle wavers a little together, as a hand lays it (once per
    // point); each fibre winds slowly about the line on top of that.
    const waver = new Float32Array(n);
    for (let k = 0; k < n; k++) waver[k] = 0.5 * Math.sin(arc[k] * 0.21 + ph * 3);
    const path = (k0: number, k1: number, f: number) => {
      ctx.beginPath();
      const bf = f < 0 ? 0 : (f / (F - 1) - 0.5) * w * 0.85;
      for (let k = k0; k <= k1; k++) {
        const o = f < 0 ? 0 : bf * (0.7 + 0.3 * Math.sin(arc[k] * 0.05 + ph + f * 2.4)) + waver[k];
        const x = pts[k * 2] + nx[k] * o;
        const y = pts[k * 2 + 1] + ny[k] * o;
        if (k === k0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    };
    if (erase !== undefined) {
      // Taking this fraction of the run off the paper, along its own
      // fibres (a fade step that repaints nothing else).
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
      ctx.globalAlpha = erase;
      ctx.lineWidth = Math.max(0.9, (w / F) * 1.25) + 1;
      for (let f = 0; f < F; f++) {
        path(0, n - 1, f);
        ctx.stroke();
      }
      ctx.lineWidth = Math.max(0.8, w * 0.28) + 1;
      path(0, n - 1, -1);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      return;
    }
    for (let b = 0; b < bands; b++) {
      const k0 = Math.floor(((n - 1) * b) / bands);
      const k1 = Math.floor(((n - 1) * (b + 1)) / bands);
      if (k1 <= k0) continue;
      let h = 0;
      if (heat) {
        for (let k = k0; k <= k1; k++) h += heat[k];
        h /= k1 - k0 + 1;
      }
      const swell = 1 + 0.32 * h;
      const g = glow * base + 0.2 * h;
      if (g > 0.01) {
        ctx.strokeStyle = `rgb(${cr} ${cg} ${cb})`;
        ctx.globalAlpha = g;
        ctx.lineWidth = w * (3 + 2.5 * h);
        path(k0, k1, -1);
        ctx.stroke();
      }
      ctx.strokeStyle = pats[hue];
      ctx.lineWidth = Math.max(0.9, (w / F) * 1.25) * swell;
      for (let f = 0; f < F; f++) {
        const a0 = base * (0.55 + 0.4 * hash01(seed, f + 3));
        ctx.globalAlpha = Math.min(1, a0 + (1 - a0) * h * 0.85);
        path(k0, k1, f);
        ctx.stroke();
      }
      ctx.strokeStyle = pats[pale];
      ctx.globalAlpha = Math.min(1, base * 0.7 + 0.3 * h);
      ctx.lineWidth = Math.max(0.8, w * 0.28) * (1 + 0.9 * h);
      path(k0, k1, -1);
      ctx.stroke();
    }
    if (dust && w >= 1.5) {
      ctx.fillStyle = `rgb(${cr} ${cg} ${cb})`;
      for (let k = 0; k < n; k += 2) {
        const i = Math.round(arc[k]);
        if (hash01(seed, i) < 0.6) continue;
        const r1 = hash01(seed, i + 7);
        const d = (hash01(seed, i + 11) - 0.5) * 2 * (w + r1 * r1 * 12);
        ctx.globalAlpha = hash01(seed, i + 3) * 0.5 * base;
        ctx.fillRect(pts[k * 2] + nx[k] * d, pts[k * 2 + 1] + ny[k] * d, 0.9, 0.9);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Lay segments [i0, i1) of a strand's body on a context, settled.
   * With `clip` (a pane's box), segments wholly outside it are skipped:
   * a hion's body is thousands of segments, and a pane sees a few. */
  function lay(ctx: CanvasRenderingContext2D, pats: Patterns, st: Strand, i0: number, i1: number, tip?: Pt, clip?: Box, erase?: number) {
    const { xs, ys, under, hue, id } = st.t;
    const { ls } = st;
    const base = st.n.body;
    const pad = st.n.w * 3 + 14;
    const outside = (i: number) =>
      !!clip &&
      (Math.max(xs[i], xs[i + 1]) < clip.l - pad ||
        Math.min(xs[i], xs[i + 1]) > clip.r + pad ||
        Math.max(ys[i], ys[i + 1]) < clip.t - pad ||
        Math.min(ys[i], ys[i + 1]) > clip.b + pad);
    let pts: number[] = [];
    let arc: number[] = [];
    const flush = (alpha: number) => {
      if (pts.length >= 4) strokeRun(ctx, pats, hue, st.n.w, st.n.glow, pts, arc, base * alpha, null, true, id, erase);
      pts = [];
      arc = [];
    };
    for (let i = i0; i < i1; i++) {
      const a = taper(st, i);
      // Under another thread, across a stretch it leaves the page for, or
      // out of this pane's sight.
      if (under.has(i) || a <= 0 || ls[i + 1] - ls[i] <= 0 || outside(i)) {
        flush(st.alpha);
        continue;
      }
      if (a < st.alpha) {
        flush(st.alpha);
        strokeRun(ctx, pats, hue, st.n.w, st.n.glow, [xs[i], ys[i], xs[i + 1], ys[i + 1]], [ls[i], ls[i + 1]], base * a, null, true, id, erase);
        continue;
      }
      if (!pts.length) {
        pts.push(xs[i], ys[i]);
        arc.push(ls[i]);
      }
      pts.push(xs[i + 1], ys[i + 1]);
      arc.push(ls[i + 1]);
    }
    if (tip && pts.length) {
      const k = pts.length - 2;
      const d = Math.hypot(tip[0] - pts[k], tip[1] - pts[k + 1]);
      if (d < JUMP) {
        pts.push(tip[0], tip[1]);
        arc.push(arc[arc.length - 1] + d);
      }
    }
    flush(st.alpha);
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
        if (!st.laid || st.bottom < t0 - 4 || st.top > t0 + TILE + 4) continue;
        if (st.right < pane.x0 - 16 || st.left > pane.x1 + 16) continue;
        lay(ctx, pane.pats, st, 0, st.laid, undefined, { l: pane.x0, t: t0, r: pane.x1, b: t0 + TILE });
      }
      still(pane.el);
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
        for (const pane of tile.panes) unshow(pane.el);
        tiles.delete(index);
      }
    }
    for (let i = from; i <= to; i++) if (!tiles.has(i)) tiles.set(i, makeTile(i));
  }

  /** The extent of a strand's baked body (points [0, laid]). */
  function extent(st: Strand) {
    const { xs, ys } = st.t;
    for (let i = 0; i <= st.laid; i++) {
      if (ys[i] < st.top) st.top = ys[i];
      if (ys[i] > st.bottom) st.bottom = ys[i];
      if (xs[i] < st.left) st.left = xs[i];
      if (xs[i] > st.right) st.right = xs[i];
    }
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
    st.left = Math.min(st.left, left);
    st.right = Math.max(st.right, right);
    st.bakedAt = performance.now();
    const [a, b] = tileRange(top, bottom);
    for (let k = a; k <= b; k++) {
      const tile = tiles.get(k);
      if (!tile) continue;
      for (const pane of panesIn(tile, left, right)) {
        lay(pane.ctx, pane.pats, st, st.laid, to, undefined, { l: pane.x0, t: k * TILE, r: pane.x1, b: (k + 1) * TILE });
        still(pane.el);
      }
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
      for (const { ctx, el } of panesIn(tile, Math.min(x0, x1), Math.max(x0, x1))) {
        still(el);
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
    const pad = st.n.w * 3 + 14;
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

  /** A strand's live part: what has settled but is not yet baked, and the
   * warm run on its rope up to the head, where the thread is hot. */
  function paintStrand(ctx: CanvasRenderingContext2D, pats: Patterns, st: Strand) {
    const { hue } = st.t;
    const span = Math.min(st.n.tail, st.s);
    const settled = st.s - span;
    // Settled: exactly as the ground will have it.
    const i1 = indexAt(st, settled);
    if (st.n.body > 0 && (i1 > st.laid || settled > st.ls[st.laid])) {
      const [tx, ty] = at(st, settled);
      lay(ctx, pats, st, st.laid, i1, [tx, ty]);
    }
    if (span < 2) return;
    // The warm run, from where it settles to the head.
    let pts: number[] = [];
    let arc: number[] = [];
    if (st.rope) {
      // The rope's nodes, smoothed between.
      const r = st.rope;
      const step = span / KNOTS;
      for (let k = KNOTS; k >= 0; k--) {
        if (k < KNOTS && k > 0) {
          const mx0 = (r.x[k + 1] + r.x[k]) / 2;
          const my0 = (r.y[k + 1] + r.y[k]) / 2;
          const mx1 = (r.x[k] + r.x[k - 1]) / 2;
          const my1 = (r.y[k] + r.y[k - 1]) / 2;
          pts.push(mx0, my0, 0.25 * mx0 + 0.5 * r.x[k] + 0.25 * mx1, 0.25 * my0 + 0.5 * r.y[k] + 0.25 * my1);
          arc.push(st.s - (k + 0.5) * step, st.s - k * step);
        } else {
          pts.push(r.x[k], r.y[k]);
          arc.push(st.s - k * step);
        }
      }
    } else {
      const steps = Math.max(2, Math.ceil(span / 6));
      for (let k = steps; k >= 0; k--) {
        const [x, y] = at(st, st.s - (k * span) / steps);
        pts.push(x, y);
        arc.push(st.s - (k * span) / steps);
      }
    }
    // Not across a stretch a hion leaves the page for.
    for (let i = pts.length - 4; i >= 0; i -= 2) {
      if (Math.abs(pts[i + 2] - pts[i]) + Math.abs(pts[i + 3] - pts[i + 1]) > JUMP) {
        pts = pts.slice(i + 2);
        arc = arc.slice(i / 2 + 1);
        break;
      }
    }
    const count = pts.length / 2;
    if (count < 2) return;
    const heat = st.heat * st.alpha;
    const warm = new Array<number>(count);
    for (let k = 0; k < count; k++) {
      const u = k / (count - 1);
      warm[k] = heat * u * u;
    }
    strokeRun(ctx, pats, hue, st.n.w, st.n.glow, pts, arc, st.n.body * st.alpha, warm, false, st.t.id);
    if (heat > 0.02) {
      // The head: the thread's own light, white-hot at the very tip.
      const hx = pts[(count - 1) * 2];
      const hy = pts[(count - 1) * 2 + 1];
      const [cr, cg, cb] = RGB[hue];
      const [lr, lg, lb] = RGB[hue === "c" ? "cl" : "ml"];
      const rad = st.n.w * 2.4;
      const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, rad);
      halo.addColorStop(0, `rgba(${lr},${lg},${lb},${0.9 * heat})`);
      halo.addColorStop(0.3, `rgba(${cr},${cg},${cb},${0.45 * heat})`);
      halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(hx - rad, hy - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Dust ---------- */

  /** A moving head throws off a speck of pigment every so far. */
  function throwDust(st: Strand, moved: number) {
    if (moved <= 0 || st.heat < 0.3) return;
    st.spun += moved;
    while (st.spun > 7) {
      st.spun -= 7;
      if (st.rand() < 0.45 || motes.length >= 90) continue;
      const [x, y, nx, ny] = at(st, st.s);
      const side = (st.rand() - 0.5) * 2;
      const sp = 0.01 + st.rand() * 0.05;
      motes.push({
        x: x + nx * side * st.n.w,
        y: y + ny * side * st.n.w,
        vx: nx * side * sp + (st.rand() - 0.5) * 0.02,
        vy: ny * side * sp - 0.01,
        age: 0,
        life: 500 + st.rand() * 700,
        hue: st.t.hue,
        pale: st.rand() < 0.3,
        size: 0.9 + st.rand() * 1.1,
      });
    }
  }

  effects.push({
    last: [],
    e: {
      step(_now, dt) {
        for (const m of motes) {
          m.age += dt;
          m.vy += 0.00009 * dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
        }
        for (let i = motes.length - 1; i >= 0; i--) if (motes[i].age >= motes[i].life) motes.splice(i, 1);
        return motes.length > 0;
      },
      boxes() {
        return motes.map((m) => ({ l: m.x - 2, t: m.y - 2, r: m.x + m.size + 2, b: m.y + m.size + 2 }));
      },
      paint(ctx) {
        for (const m of motes) {
          const life = 1 - m.age / m.life;
          ctx.globalAlpha = Math.min(1, life * 1.6) * 0.8;
          ctx.fillStyle = `rgb(${RGB[m.pale ? (m.hue === "c" ? "cl" : "ml") : m.hue].join(" ")})`;
          ctx.fillRect(m.x, m.y, m.size, m.size);
        }
        ctx.globalAlpha = 1;
      },
    },
  });

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
      for (const fx of effects) if (fx.last.some((b) => meets(b, r))) fx.e.paint(ctx);
      ctx.restore();
    }
  }

  /* ---------- Growing ---------- */

  function make(kind: Kind, n: Nature, t: Thread, drive: Drive): Strand {
    return {
      kind,
      n,
      t,
      ls: [0],
      s: 0,
      drive,
      rand: rng(t.id * 31 + t.xs[0] * 7 + 1),
      rope: null,
      laid: 0,
      fadeAt: Infinity,
      alpha: 1,
      top: t.ys[0],
      bottom: t.ys[0],
      left: t.xs[0],
      right: t.xs[0],
      bakedAt: 0,
      motion: 1,
      heat: 1,
      resting: false,
      box: null,
      dirty: true,
      cold: false,
      spun: 0,
    };
  }

  function spawn(kind: Kind, seed: Seed, drive: Drive): Strand {
    const st = make(kind, nature(kind), fate.add(seed), drive);
    st.rand = rng(seed.seed * 3 + 1);
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
    st.fadeAt = fadeFrom(now, st, 0.7 + st.rand() * 0.8);
    // Too short to read as a thread: let it go now.
    if (st.t.xs.length < 14) st.fadeAt = now;
  }

  /** New threads in from the edges near the reader, once the page's own
   * have been born: the page keeps living without filling up. */
  function trickle(now: number, near: number) {
    if (now < nextTrickle) return;
    const rand = rng(options.seed * 7 + ++trickles * 131);
    // Sooner when nothing near the reader is growing; sooner on home.
    nextTrickle = now + (2500 + near * 3000 + rand() * 3000) * (lively ? 0.45 : 1);
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

  /** Fade what has lain long enough, a step at a time. Every step falls
   * on one shared beat (so however many are fading, a tile is repainted
   * at most FADES times in FADE ms), and strands finish in groups. */
  function fade(now: number) {
    let swept = false;
    const touched = new Set<number>();
    const beat = FADE / FADES;
    const tick = Math.floor(now / beat) * beat;
    for (const st of strands) {
      if (tick < st.fadeAt) continue;
      const left = Math.max(0, 1 - Math.ceil(((tick - st.fadeAt) / FADE) * FADES) / FADES);
      if (left === st.alpha) continue;
      const before = st.alpha;
      st.alpha = left;
      if (left > 0) {
        // A step: this much of it taken off the paper, in place. (Where
        // another thread crosses it a little of that goes too, put back
        // by the repaint at the end.)
        dim(st, 1 - left / before);
        continue;
      }
      const [a, b] = tileRange(st.top, st.bottom);
      for (let k = a; k <= b; k++) touched.add(k);
      st.t.gone = true;
      swept = true;
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

  /** Take a fraction of a strand's baked body off the panes it lies on. */
  function dim(st: Strand, fraction: number) {
    if (!st.laid) return;
    const [a, b] = tileRange(st.top, st.bottom);
    for (let k = a; k <= b; k++) {
      const tile = tiles.get(k);
      if (!tile) continue;
      for (const pane of panesIn(tile, st.left, st.right)) {
        lay(pane.ctx, pane.pats, st, 0, st.laid, undefined, { l: pane.x0, t: k * TILE, r: pane.x1, b: (k + 1) * TILE }, fraction);
        still(pane.el);
      }
    }
  }

  function nextFade(now: number) {
    let next = Infinity;
    const beat = FADE / FADES;
    for (const st of strands) {
      if (st.fadeAt === Infinity) continue;
      next = Math.min(next, st.fadeAt <= now ? Math.floor(now / beat) * beat + beat : st.fadeAt);
    }
    return next;
  }

  /** When a strand finishing now should start to fade: its own hold,
   * rounded to a GROUP so neighbours fade together (fewer repaints). */
  const fadeFrom = (now: number, st: Strand, spread: number) =>
    Math.ceil((now + st.n.hold * spread) / GROUP) * GROUP;

  const asleep = () => options.isIdle() || document.hidden;
  /** Someone is reading: they arrived a moment ago or did something lately.
   * Left alone, the ground holds where it is (its beads dim) until the
   * reader moves again. */
  const present = (now: number) => now - lastInput < attend || now - began < arrive;

  /** Move a strand's head on by this long, and its rope with it. Returns
   * whether it is still visibly moving. */
  function move(st: Strand, now: number, dt: number, here: boolean) {
    const before = st.s;
    if (st.drive.by === "loop") return tie(st, st.drive, now, Math.min(dt, 64), before);
    if (st.drive.by === "hion") return chase(st, Math.min(dt, 64), now);
    const near = seen(headY(st), 0.2);
    st.resting = st.kind === "ground" && !here;
    if (!st.resting) {
      // Out of sight a head hurries (a beat at a time, unpainted).
      const pace = near ? 1 : 6;
      const by = st.drive.by;
      // Drawn out by hand: pulled, eased, pulled again, never at one rate.
      const pull = 0.72 + 0.28 * Math.sin(now * 0.0021 + st.t.id * 1.3) + 0.14 * Math.sin(now * 0.0053 + st.t.id * 0.7);
      const speed = st.n.speed * pull * (by === "wind" ? 1.25 : by === "fate" && st.kind === "pointer" ? 0.55 : 1);
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
    throwDust(st, st.s - before);
    const moving = st.s !== before || (st.rope?.energy ?? 0) > 0.04 || (ended && st.heat > 0) || st.motion > 0.01;
    if (moving) st.dirty = true;
    return moving;
  }

  /** A loop: tied quickly round, held, untied from its end back. */
  function tie(st: Strand, d: Extract<Drive, { by: "loop" }>, now: number, dt: number, before: number) {
    const total = measureBody(st);
    if (d.state === "tying") {
      st.s = Math.min(total, st.s + (st.n.speed * dt) / 1000);
      if (st.s >= total) d.state = "held";
    } else if (d.state === "held") {
      if (now >= d.until) d.state = "untying";
    } else st.s = Math.max(0, st.s - (st.n.speed * 1.5 * dt) / 1000);
    const going = d.state !== "held";
    st.motion += ((going ? 1 : 0) - st.motion) * Math.min(1, dt / 220);
    st.heat = going ? Math.min(1, st.heat + dt / 200) : Math.max(0, st.heat - dt / 500);
    if (!seen(headY(st), 0.2)) {
      st.rope = null;
      return going;
    }
    swing(st, Math.min(dt, 40), now);
    throwDust(st, st.s - before);
    const moving = st.s !== before || (st.rope?.energy ?? 0) > 0.04 || (st.heat > 0 && !going) || st.motion > 0.01 || (going && st.heat < 1);
    if (moving) st.dirty = true;
    return moving;
  }

  function tick(now: number): boolean {
    if (asleep() || busy || !built) return false;
    const dt = Math.min(250, now - (lastTick || now));
    lastTick = now;
    const here = present(performance.now());
    anchor();
    readHions();
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
    let moving = false;
    let offscreen = false;
    for (const fx of effects) {
      const alive = fx.e.step(now, Math.min(dt, 64));
      const boxes = alive ? fx.e.boxes() : [];
      if (alive || fx.last.length) cleared.push(...fx.last, ...boxes);
      fx.last = boxes;
      if (alive) moving = true;
    }
    let untied = false;
    for (const st of strands) {
      if (st.cold) continue;
      if (move(st, now, dt, here)) moving = true;
      if (st.drive.by === "loop") {
        if (st.drive.state === "untying" && st.s <= 0) {
          if (st.box) cleared.push(st.box);
          st.box = null;
          st.t.gone = untied = true;
        } else if (st.drive.state === "held" && st.drive.until < Infinity) offscreen = true;
        continue;
      }
      // Lay what has cooled behind the head, a batch at a time.
      // Lay what has cooled behind the head, a batch at a time, and not
      // more often than a few times a second: every bake re-stills a pane
      // (a new bitmap), and a quick head would do that every frame.
      const settled = st.s - Math.min(st.n.tail, st.s);
      const to = indexAt(st, settled);
      if (to - st.laid >= BATCH && now - st.bakedAt > BEAT) bake(st, to);
      // A hion is never finished: its way is drawn as far as the loom has.
      if (st.kind === "hion") continue;
      if (st.t.done && st.heat <= 0 && (!st.rope || st.rope.energy < 0.04)) finish(st, now);
      else if (!st.cold && !st.resting && !seen(headY(st), 0.2)) offscreen = true;
    }
    if (untied) strands = strands.filter((st) => !st.t.gone);
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
    if (here) wait = Math.min(wait, attend - (now - lastInput) + 20);
    if (wait < Infinity) task.wakeIn(Math.max(30, wait));
    return false;
  }

  /* ---------- From a click, and from a touched thread ---------- */

  /** The nearest thing nobody else is going to, within reach of (x, y). */
  function aimNear(x: number, y: number, reach: number) {
    let aim: Aim | null = null;
    let best = reach;
    for (const a of aims) {
      const d = gapTo(a.box, x, y);
      if (d < 18 || d >= best) continue;
      if (strands.some((st) => st.drive.by === "seek" && st.drive.aim === a)) continue;
      best = d;
      aim = a;
    }
    return { aim, best };
  }

  /** Send a thread out from (x, y) to the nearest thing nobody else is
   * going to (a heading, a picture, a charm; otherwise a hion), winding
   * round it. With nothing near (and `anywhere`), it runs on with fate.
   * `from` is a thread it branches off: it takes that thread's hue and
   * leaves at a slant from the way the thread runs. */
  function issue(x: number, y: number, now: number, anywhere: boolean, from?: Near) {
    if (growing("pointer").length >= INTENTS + (anywhere ? 2 : 0)) return false;
    const { aim, best } = aimNear(x, y, SEEK);
    let on: { hue: Hue; s: number } | null = null;
    let target: Pt | null = null;
    if (aim) target = [Math.max(aim.box.l, Math.min(aim.box.r, x)), Math.max(aim.box.t, Math.min(aim.box.b, y))];
    else if (!from?.fixed) {
      // Nothing near: the hions' own way, if it is.
      const hit = nearestHion(x, y, best);
      if (hit && hit.d > 24) {
        on = { hue: hit.hue, s: hit.s };
        target = [hit.x, hit.y];
      }
    }
    const seed = Math.floor(now * 7 + x * 13 + y);
    const rand = rng(seed);
    const hue = from ? from.hue : (pointer.hue = pointer.hue === "c" ? "m" : "c");
    pointer.lastIssue = now;
    // Off a thread: along it one way or the other, bending off to the side.
    const slant = from ? Math.atan2(from.dy, from.dx) + (rand() < 0.5 ? Math.PI : 0) + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.5) : 0;
    if (!target) {
      if (!anywhere || (!from && ground.clear(x, y) < 12)) return false;
      const a = from ? slant : (rand() - 0.5) * Math.PI * 2;
      const st = spawn("pointer", { x, y, a, hue, len: 500 + rand() * 700, seed, key: y, free: from ? 160 : 0, grace: from ? 30 : 0, goals: goalsFor(all, x, y, a, false, rand) }, { by: "fate" });
      st.t.wander = 1.4;
      task.wake();
      return true;
    }
    // Out at a slant, so it comes round in a drawn curve, not a beeline.
    const toward = Math.atan2(target[1] - y, target[0] - x);
    const a = from ? slant + ((((toward - slant + Math.PI) % TAU) + TAU) % TAU - Math.PI) * 0.4 : toward + (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.4);
    const st = spawn("pointer", { x, y, a, hue, len: 0, seed, key: y, free: from ? 160 : 0, grace: from ? 30 : 0, goals: [] }, { by: "seek", aim, on, crept: 0, letGo: !!aim && rand() < 0.5 });
    st.t.len = Infinity;
    task.wake();
    return true;
  }

  /** The thread under (x, y), if one is drawn there: a hion (as far as it
   * is drawn) or any strand lying on the ground. */
  function touching(x: number, y: number): Near | null {
    const hit = fate.nearest(x, y, 10);
    if (!hit) return null;
    if (hit.fixed && !nearestHion(x, y, 12)) return null;
    return hit;
  }

  /** Brushing a thread sends a branch off it: from where it was touched,
   * off to the nearest thing, or away with fate. Not twice in a moment
   * from the same thread. */
  function branch(x: number, y: number, now: number) {
    if (now - lastBranch < 700) return;
    const hit = touching(x, y);
    if (!hit) return;
    const key = hit.fixed ? -1 - (hit.hue === "c" ? 0 : 1) : hit.id;
    if (now - (branched.get(key) ?? 0) < 2600) return;
    if (issue(hit.x, hit.y, now, true, hit)) {
      branched.set(key, now);
      lastBranch = now;
    }
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

  /** A loop for something you hover: through its words if it has any to
   * speak of, otherwise round it. Threads from the pointer on their way
   * somewhere near turn to it too. */
  function encircle(el: Element, from: Pt) {
    untie(null);
    const p = page.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const box: Box = { l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top };
    const seed = Math.floor(performance.now() * 3 + box.l * 7 + box.t);
    const rand = rng(seed);
    const pictured = el.querySelector("img, video, canvas.hion-woven-cover, .hion-woven-cover");
    const text = (el.textContent ?? "").trim();
    let way: Pt[] = [];
    if (!pictured && text.length > 0 && text.length < 90) way = weave(wordBoxes(el, p), from, rand);
    if (way.length < 2) way = encircle_(box, from, padFor(el), seed);
    if (way.length < 2) return;
    loop(el, "c", way, Infinity);
    // Those still on their way somewhere near come to it instead.
    const aim: Aim = { box, el, words: !pictured && text.length < 90 };
    for (const st of strands) {
      const d = st.drive;
      if (d.by !== "seek" || d.on) continue;
      const [hx, hy] = at(st, st.s);
      if (gapTo(box, hx, hy) < 320) d.aim = aim;
    }
  }

  function padFor(el: Element) {
    if (el.matches(".hion-prose a, .hion-foot__mail a")) return 7;
    if (el.matches(".hion-strung, .hion-tie")) return 12;
    if (el.matches(".hion-picture, .hion-work")) return 20;
    return 14;
  }

  function loop(el: Element | null, hue: Hue, way: Pt[], until: number) {
    const st = make("loop", nature("loop"), fate.bare(hue, way), { by: "loop", el, state: "tying", until });
    measureBody(st);
    strands.push(st);
    task.wake();
    return st;
  }

  /** Untie the loop round el (null: whatever is hovered). */
  function untie(el: Element | null) {
    for (const st of strands) {
      const d = st.drive;
      if (d.by === "loop" && d.until === Infinity && (el === null || d.el === el) && d.state !== "untying") d.state = "untying";
    }
    task.wake();
  }

  let hovered: Element | null = null;
  function onOver(event: PointerEvent) {
    if (!fine || !built || busy) return;
    const target = (event.target as Element).closest(HOVER);
    if (!target || !page.contains(target) || target === hovered) return;
    if (target.hasAttribute("data-reveal") && !target.hasAttribute("data-lit")) return;
    hovered = target;
    encircle(target, [event.clientX, event.clientY + scrollY - pageTop]);
  }

  function onOut(event: PointerEvent) {
    if (!hovered) return;
    const to = event.relatedTarget as Node | null;
    if (to && hovered.contains(to)) return;
    if ((event.target as Element).closest(HOVER) !== hovered) return;
    hovered = null;
    untie(null);
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
    const speed = pointer.here ? Math.hypot(x - pointer.x, y - pointer.y) / Math.max(8, now - pointer.at) : 0;
    pointer.x = x;
    pointer.y = y;
    pointer.at = now;
    pointer.here = true;
    // Brushing a thread (not racing across it) sends a branch off it.
    if (speed < 2.4) branch(x, y, now);
    task.wake();
  }

  /** A tap on the paper sends a pair out from there; on a thread, a
   * branch off it too. */
  function onDown(event: PointerEvent) {
    lastInput = performance.now();
    if (!built || busy || event.button > 0) return;
    const target = event.target as Element;
    if (target.closest("a, button, input, textarea, select, .hion-top")) return;
    const x = event.clientX;
    const y = event.clientY + scrollY - pageTop;
    if (y < 0 || y > height) return;
    const now = performance.now();
    issue(x, y, now, true);
    issue(x, y, now + 1, true);
    lastBranch = 0;
    branch(x, y, now);
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
        if (st.kind === "hion") {
          // As far as the loom has drawn; whole and still when nothing moves.
          st.s = hionTarget(st);
          st.laid = instant ? st.t.xs.length - 1 : Math.max(0, indexAt(st, st.s - st.n.tail) - 1);
          st.cold = instant;
          if (instant) st.heat = 0;
        } else {
          st.s = measureBody(st);
          st.laid = st.t.xs.length - 1;
          st.cold = true;
          st.heat = 0;
          st.fadeAt = instant ? Infinity : fadeFrom(now, st, 0.4 + st.rand());
        }
        extent(st);
      }
      for (const tile of tiles.values()) for (const pane of tile.panes) unshow(pane.el);
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
        st.fadeAt = fadeFrom(now, st, 0.5 + st.t.rand());
      } else st.laid = Math.max(0, indexAt(st, st.s - st.n.tail) - 1);
      extent(st);
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
        document.addEventListener(
          "pointerleave",
          () => {
            pointer.here = false;
            hovered = null;
            untie(null);
          },
          { signal },
        );
        page.addEventListener("pointerover", onOver, { signal });
        page.addEventListener("pointerout", onOut, { signal });
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
    /** A small loop of a hion's own, tied round a point and let go after
     * a while (life.ts: left alone, they amuse themselves). */
    knot(hue: Hue, x: number, y: number, r: number, hold: number) {
      if (!built || busy) return false;
      const way = encircle_({ l: x - r, t: y - r, r: x + r, b: y + r }, [x, y - r], 4, Math.floor(x + y));
      loop(null, hue, way, performance.now() + hold);
      return true;
    },
    /** Something else to move and paint on the live canvas. */
    effect(e: Effect) {
      effects.push({ e, last: [] });
    },
    /** A word to be written by thread (spun.ts): kept, written now if the
     * screen is ready (at once for a still screen), and written again
     * whenever the page is laid out anew. */
    inscribe(el: HTMLElement, hue: Hue, measure: Measure) {
      titles.set(el, { hue, measure });
      if (!built || busy || signal.aborted) return;
      page.classList.add("hion-measuring");
      const spun = measure(page.getBoundingClientRect());
      page.classList.remove("hion-measuring");
      if (!spun) return;
      const st = title(el, hue, spun);
      if (instant) whole(st);
      task.wake();
    },
    /** The loom drew on: the hions' heads follow. */
    wake: () => task.wake(),
    /** For a check: the threads themselves. */
    fate: () => fate,
    strands: () => strands,
  };
}
