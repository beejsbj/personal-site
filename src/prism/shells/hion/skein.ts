/** The skein: every thread on a Hion screen, as one kind of thing, of one
 * material.
 *
 * A strand is a body grown from its head, a goal that steers the head, a
 * hue, some slack, a body strength and a lifetime (the width is
 * every thread's: pastel.ts THREAD). The kinds differ only in those
 * numbers (NATURE) and in what steers them:
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
 *   title    a heading written by one thread (spun.ts measures it,
 *            trace.ts finds the way): from the knot its weft stops in, or
 *            off the hion if one runs near, else in from the page's edge
 *            or from just before the word, along a line under its feet
 *            and up through each letter in turn, out past the last. At a
 *            hand's pace for its size, slower into the letters' turns,
 *            its rope held close. Its way is kept and measured again when
 *            the page is laid out anew; it never fades. Of the one width,
 *            like every thread.
 *
 * One material (strokeRun): every run of thread is one smooth line of
 * its hue with a little light added under it, and nothing else (no
 * grain: the colour is the thread). One width for every thread on the
 * screen (pastel.ts THREAD); what differs is how strongly a body lies,
 * which is the hue dimmed, never see-through. The run behind a
 * head is the same line drawn hot: it brightens toward the tip, a pale
 * core comes up inside it, the light grows a little, and a small halo no
 * bigger than the thread sits on the tip. No bead on a stick: the light
 * is the thread's own.
 *
 * Every strand is in one index (fate's): the hions are fixed company, so
 * ground threads fall in alongside them; ground threads fall in alongside
 * pointer threads that have let go; crossings go over and under, and a
 * hion lies over everything.
 *
 * A head moves every frame while it is active, pulled, eased and pulled
 * again rather than at one rate, drawn between the points fate laid, so
 * it never steps. Behind it a short rope (KNOTS nodes, a hair longer
 * than the path it spans: taut) hangs from the head to where the thread
 * has settled: it lags a little on a turn and sways slightly while the
 * head moves, and settles onto the path as it cools, so what is laid
 * down is what you saw. A hion's head rides a rope too, chasing the
 * loom's reach, and dims to half once it has caught up and waits. On a
 * screen travelled to the hions set out from where they come down and
 * run their way at SETOUT, the loom pacing its drawing to them, and the
 * ground is born live behind them: the screen is seen growing from the
 * line, not appearing.
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
 * cords, marks laid by the loom above the ground), the woven covers
 * (woven.ts: a cellular cloth, a different medium), the menu cord and the
 * loose ends under its names (nav.ts), and the resume track (its own
 * loom, its hions laid as marks). All of it the one thread, of the one
 * width (pastel.ts THREAD). */
import { type Bud, buds, Fate, goalsFor, Ground, leave, type Gather, type Seed, STEP, type Thread } from "./fate";
import type { createLoom, Limb } from "./loom";
import { measured, still, unshow } from "./dom";
import type { Pulse } from "./pulse";
import { type Hue, type Pt, RGB, rng, THREAD } from "./pastel";
import { type Box, encircle as encircle_, ring, smooth, stitches, weave, wordBoxes } from "./wind";
import type { Material, Measure, Spun } from "./spun";

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

export type Kind = "hion" | "ground" | "limb" | "loop" | "title";

interface Nature {
  /** How fast the head goes (px a second). */
  speed: number;
  /** The warm run behind the head (px), which the rope spans. */
  tail: number;
  /** The rope's length over the path it spans. */
  slack: number;
  /** How strongly its settled body lies (a hion being 1). */
  body: number;
  /** How long it lies once finished, before it fades (ms). */
  hold: number;
}

/** One material, one brightness: every thread is one of the two hions or
 * a branch of one, of the one width (pastel.ts THREAD), and lies as
 * brightly as they do. What differs is how fast it grows and how long it
 * lies. */
const NATURE: Record<Kind, Nature> = {
  hion: { speed: 700, tail: 130, slack: 1.012, body: 1, hold: Infinity },
  ground: { speed: 150, tail: 110, slack: 1.016, body: 1, hold: 55000 },
  limb: { speed: 460, tail: 80, slack: 1.012, body: 1, hold: Infinity },
  loop: { speed: 1100, tail: 80, slack: 1.012, body: 1, hold: Infinity },
  // Speed and the warm run are set per heading (spun.ts: its size and
  // length).
  title: { speed: 900, tail: 70, slack: 1.012, body: 1, hold: Infinity },
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
  /** A screen travelled to (not the one arrived on): its threads are
   * seen growing from where the hions come down, none ready-made. */
  travelled?: boolean;
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
  | { by: "title"; el: HTMLElement }
  | { by: "way" };

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
  /** The extent of the whole body grown so far (page px): a search for
   * the nearest point skips a strand nowhere near. */
  ext: Box;
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
  /** A heading's pace at each point of its way (paceOf). */
  pace?: Float32Array;
  /** The thread it is a branch of (null for the two hions), how far along
   * that thread it leaves (arc length), and its own branches. */
  parent: Strand | null;
  root: number;
  children: Strand[];
  /** Forks from a hion (a hion 0, a branch of it 1, ...). */
  depth: number;
  /** How far along itself it next forks (arc length; Infinity: never). */
  fork: number;
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
/** How often what has cooled is laid onto the ground (ms): every strand
 * on one shared beat, so a pane many heads cross is re-stilled (a new
 * bitmap) once a beat, not once for each. */
const BEAT = 320;
/** How fast a hion runs down a screen it has just come to (px a second). */
const SETOUT = 1800;
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

/** What a branch can go to and wind round. */
const AIMS = "main h1, main h2, main h3, [data-weft], main img, .hion-woven-cover, .hion-tag, .hion-pullcord, .hion-charm";
/** How far a branch seeking something may creep before it gives up (px). */
const REACH = 520;
/** What a loop is tied round when you hover it. */
const HOVER = "[data-ink]:not(.hion-pull), .hion-strung, .hion-tie, .hion-prose a, .hion-foot__mail a";

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
export const seedOf = (path: string) => hash(path) % 100000;

/** The farthest apart two consecutive points of one thread can be and
 * still be the same stretch (a hion leaves the page for a track). */
const JUMP = 120;

/** n + 1 points along a cubic Bezier. */
function cubicWay(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const v = 1 - u;
    out.push([
      v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
      v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
    ]);
  }
  return out;
}

const meets = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

/** How a heading is written: at a hand's pace for letters its size (a
 * few capitals a second, so larger letters go faster), every heading in
 * one to three seconds and every label in under two; the warm run
 * behind the head about a capital long. */
export function writing(spun: Spun, total: number) {
  // A label (small, and there are many) is a quick hand: a screen is not
  // left half written.
  const small = spun.size < 30;
  const time = Math.max(small ? 0.6 : 1.1, Math.min(small ? 1.6 : 3, total / (spun.size * (small ? 16 : 11))));
  return { speed: total / time, tail: Math.max(22, Math.min(70, spun.size * 1.1)) };
}

/** The colour of a thread at a strength, over black paper: the hue
 * dimmed, not made see-through, so pieces of one thread meet without a
 * seam and nothing shows through. */
function tone(hue: Hue, strength: number, pale = 0) {
  const [r, g, b] = RGB[hue];
  const [lr, lg, lb] = RGB[hue === "c" ? "cl" : "ml"];
  const k = Math.max(0, Math.min(1, strength));
  return `rgb(${((r + (lr - r) * pale) * k) | 0} ${((g + (lg - g) * pale) * k) | 0} ${((b + (lb - b) * pale) * k) | 0})`;
}

/** One run of thread, the one way every thread is drawn: one smooth
 * line of the hue at the thread's strength, flat light, no glow and no
 * taper (a thread is as strong at its ends as along it). `pts` are x,y
 * pairs. `erase` instead takes that fraction of the run off the paper,
 * along the same line (a fade step that repaints nothing else). */
function strokeRun(ctx: CanvasRenderingContext2D, hue: Hue, w: number, pts: number[], base: number, erase?: number) {
  const n = pts.length / 2;
  if (n < 2 || base <= 0) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let k = 1; k < n; k++) ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
  if (erase !== undefined) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
    ctx.globalAlpha = erase;
    ctx.lineWidth = w + 1.2;
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    return;
  }
  ctx.strokeStyle = tone(hue, base);
  ctx.lineWidth = w;
  ctx.stroke();
}

/** The one material, lent to a heading written on a canvas of its own
 * (spun.ts: inside something that slides over the page). Pure: it holds
 * no screen, so the nav can keep it for the life of the lens. */
export function threadMaterial(): Material {
  return {
    run: strokeRun,
    pace: (spun, total) => ({ w: THREAD, ...writing(spun, total) }),
  };
}

export function createSkein(options: SkeinOptions) {
  const { page, loom, signal, instant } = options;
  const scale = options.scale ?? 1;
  const close = scale > 1;
  const fine = matchMedia("(pointer: fine)").matches;
  const lively = !!options.lively && !close;
  /** The hions have yet to set out (a screen travelled to). */
  let fresh = !!options.travelled && !options.instant;
  const nature = (kind: Kind): Nature => NATURE[kind];

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

  let ground = new Ground(1, 1);
  let fate = new Fate(ground);
  let all: Gather[] = [];
  /** Where the ground's branches leave the hions, in the order the drawing
   * reaches them. */
  let seeds: Bud[] = [];
  /** What hangs from the hions (weave.ts limbs), in the order the drawing
   * reaches them, and how many have been born. */
  let limbs: Limb[] = [];
  let limbSown = 0;
  /** Things hung on drops from a cord: where each drop meets its cord
   * (page px), so it is shown when the cord's head has grown over it, not
   * before (shell.css `data-tied`); and when it was lit, for one whose cord
   * is not grown here (it is tied 1.4s after, whatever). */
  let hangers: { el: HTMLElement; x: number; y: number; lit: number }[] = [];
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
  /** The viewport on the page (its top in page px, its height), read when
   * the reader scrolls or the window changes: a frame reads no layout (a
   * read of scrollY mid-frame lays the page out again for every change
   * the frame has made). */
  let viewTop = 0;
  let viewH = 0;
  let tileRows = 1;
  let dpr = 1;
  let built = false;
  let busy = false;
  let lastTick = 0;
  let lastBeat = 0;
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
  /** Panes broken (a thread went under) since the last beat, to still. */
  const stale = new Set<HTMLCanvasElement>();
  const effects: { e: Effect; last: Box[] }[] = [];
  // The pointer, in page space.
  const pointer = { x: -1e4, y: -1e4, at: 0, here: false, looked: 0 };
  /** When each thread last answered a brush. */
  const brushed = new WeakMap<Strand, number>();

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
    // far as the loom has drawn. Their branches stay theirs.
    const was = new Map<Hue, Strand>();
    strands = strands.filter((st) => {
      if (st.kind !== "hion") return true;
      if (st.box) cleared.push(st.box);
      was.set(st.t.hue, st);
      return false;
    });
    for (const tip of loom.journeys()) {
      if (tip.points.length < 2) continue;
      const n = nature("hion");
      const st = make("hion", n, fate.bare(tip.hue, tip.points), { by: "hion", keys: tip.keys });
      measureBody(st);
      // On a screen travelled to, they set out from where they come down
      // and run after the drawing; a screen arrived on (or re-laid) has
      // them where the drawing is.
      st.s = fresh ? 0 : hionTarget(st);
      st.laid = Math.max(0, indexAt(st, st.s - n.tail) - 1);
      const old = was.get(tip.hue);
      if (old) {
        st.children = old.children;
        for (const c of st.children) c.parent = st;
      }
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
    if (fresh) {
      // Setting out: down from the line at a pace that can be seen, the
      // drawing waiting for it; once caught up, as the drawing goes.
      st.s += Math.min(gap, (SETOUT * dt) / 1000);
      if (gap <= 2) fresh = false;
    } else if (Math.abs(gap) > 900) st.s = target - Math.sign(gap) * 240;
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
    const moving = st.s !== before || st.heat !== heat || (st.rope?.energy ?? 0) > 0.04 || st.motion > 0.01;
    if (moving || st.box === null) st.dirty = true;
    return moving;
  }

  /** Where the reader is looking. */
  function look() {
    viewTop = scrollY - pageTop;
    viewH = innerHeight;
  }

  function build() {
    width = page.clientWidth;
    height = page.scrollHeight;
    pageTop = page.getBoundingClientRect().top + scrollY;
    look();
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    layer.style.height = liveLayer.style.height = `${height}px`;
    tileRows = Math.ceil(height / TILE);
    ground = new Ground(width, height, 8);
    const spun = measured(page, () => {
      readPage();
      return measureTitles();
    });
    ground.finish();
    fate = new Fate(ground);
    strands = [];
    hionVersion = -1;
    readHions();
    // The words written by thread, laid again (settled by settle()).
    for (const [el, s] of spun) title(el, titles.get(el)!.hue, s);
    const origin = options.origin();
    const planned = buds(ground, hions, {
      width,
      height,
      drop: origin?.[0] ?? width * 0.56,
      top: (origin?.[1] ?? 110) + 16,
      seed: options.seed,
      close,
      lively,
    });
    all = planned.gathers;
    seeds = planned.buds;
    limbs = loom.limbs().slice().sort((a, b) => a.key - b.key);
    limbSown = 0;
    readHangers();
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
    const e = st.ext;
    for (let i = ls.length; i < xs.length; i++) {
      const d = i ? Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]) : 0;
      // A stretch a hion leaves the page for (a track) is no length.
      ls.push(i ? ls[i - 1] + (d > JUMP ? 0 : d) : 0);
      if (xs[i] < e.l) e.l = xs[i];
      if (xs[i] > e.r) e.r = xs[i];
      if (ys[i] < e.t) e.t = ys[i];
      if (ys[i] > e.b) e.b = ys[i];
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
      stepGround(st);
      return;
    }
    // A loop is laid whole when it is tied; a hion, by the loom; a title
    // when it is measured; a limb when it is born.
    if (d.by === "loop" || d.by === "hion" || d.by === "title" || d.by === "way") return;
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

  /** Where each hung thing's drop meets its cord, read with the page
   * still (no swing, no reveal offset). */
  function readHangers() {
    hangers = [];
    const tied: HTMLElement[] = [];
    measured(page, () => {
      const p = page.getBoundingClientRect();
      for (const el of page.querySelectorAll<HTMLElement>("[data-reveal][data-ink]")) {
        if (el.hasAttribute("data-tied")) continue;
        if (instant || el.closest("[data-cloth-hold]")) {
          tied.push(el);
          continue;
        }
        const r = el.getBoundingClientRect();
        const hang = parseFloat(el.style.getPropertyValue("--hion-hang")) || 0;
        const kx = parseFloat(el.dataset.knot ?? "");
        hangers.push({ el, x: r.left - p.left + (Number.isNaN(kx) ? r.width / 2 : kx), y: r.top - p.top - hang, lit: 0 });
      }
    });
    for (const el of tied) el.setAttribute("data-tied", "");
  }

  /** Show what hangs once its cord has grown to it. */
  function tieHangers(now: number) {
    if (!hangers.length) return false;
    const heads = strands.filter((st) => st.kind === "limb" && !st.cold).map((st) => at(st, st.s));
    let waiting = false;
    hangers = hangers.filter((hg) => {
      const lit = hg.el.hasAttribute("data-lit");
      if (lit && !hg.lit) hg.lit = now;
      // Hung from the thing above it: tied when that is.
      let above = hg.el.dataset.hangFrom === "prev" ? (hg.el.previousElementSibling as HTMLElement | null) : null;
      while (above && !above.hasAttribute("data-ink")) above = above.previousElementSibling as HTMLElement | null;
      const reached = above ? above.hasAttribute("data-tied") : heads.some(([x, y]) => Math.abs(x - hg.x) < 14 && Math.abs(y - hg.y) < 18);
      if (reached || (lit && now - hg.lit > 1400) || !hg.el.isConnected) {
        hg.el.setAttribute("data-tied", "");
        return false;
      }
      if (lit) waiting = true;
      return true;
    });
    return waiting;
  }

  /* ---------- Where a branch leaves from ---------- */

  /** Where a branch to `to` leaves the tree, and the way it grows there:
   * from a point already grown on some thread (a hion, a branch lying on
   * the ground, a heading's thread), forward along that thread's own way
   * and bending off it at a slant, arriving going `arrive` (a unit
   * vector), across as little of the words as it can. Prefers threads of
   * `hue`. Null if nothing has grown within `far`. */
  function rootFor(to: Pt, arrive: Pt, hue?: Hue, far = 760, not?: Strand, only = false): { parent: Strand; s: number; way: Pt[] } | null {
    const [tx, ty] = to;
    const [ax, ay] = arrive;
    const now = performance.now();
    // Every point it could leave from, weighed cheaply first (how far, how
    // far off forward, its hue, its depth); the way itself (a curve,
    // sampled against the words) is drawn only for the likeliest, in that
    // order, until none left could beat the best. With a heading hemmed
    // in by words every way is across some, and once every point of a
    // busy screen was drawn to it: a hitch of a few hundred milliseconds
    // on a hover.
    const cands: { st: Strand; i: number; d: number; fx: number; fy: number; lb: number }[] = [];
    for (const st of strands) {
      if (st === not || st.kind === "loop" || st.t.gone || st.alpha < 1 || st.s < 30 || (only && st.t.hue !== hue)) continue;
      if (st.kind === "ground" && st.fadeAt - now < 15000) continue;
      const e = st.ext;
      if (tx < e.l - far || tx > e.r + far || ty < e.t - far || ty > e.b + far) continue;
      const prefer = hue && st.t.hue !== hue ? 700 : 0;
      const { xs, ys } = st.t;
      const end = Math.min(xs.length - 1, indexAt(st, st.s));
      for (let i = 3; i <= end - 3; i += 4) {
        const x = xs[i];
        const y = ys[i];
        const d = Math.hypot(tx - x, ty - y);
        if (d < 24 || d > far) continue;
        // Forward along the thread (the way it grew), never back.
        const dx = xs[i + 3] - xs[i - 3];
        const dy = ys[i + 3] - ys[i - 3];
        const dl = Math.hypot(dx, dy);
        if (dl < 4 || dl > 60) continue;
        const fx = dx / dl;
        const fy = dy / dl;
        const cos = ((tx - x) * fx + (ty - y) * fy) / d;
        // Behind it or square to it: it would have to turn back on itself.
        if (cos < 0.05) continue;
        cands.push({ st, i, d, fx, fy, lb: d + (1 - cos) * 260 + prefer + st.depth * 30 });
      }
    }
    cands.sort((a, b) => a.lb - b.lb);
    let best: (typeof cands)[number] | null = null;
    let bestCost = Infinity;
    for (let c = 0; c < cands.length && c < 400; c++) {
      const cand = cands[c];
      if (cand.lb >= bestCost) break;
      const { st, i, d, fx, fy } = cand;
      const x = st.t.xs[i];
      const y = st.t.ys[i];
      const k1 = Math.min(140, d * 0.38);
      const k2 = Math.min(120, d * 0.34);
      const p1x = x + fx * k1;
      const p1y = y + fy * k1;
      const p2x = tx - ax * k2;
      const p2y = ty - ay * k2;
      const n = Math.max(22, Math.ceil(d / 8));
      // Across the words: all but never (the last stretch arrives beside
      // the words it writes, the first leaves a thread that may run
      // beside others). Off the page is no way to go.
      const k0 = Math.ceil(n * 0.06);
      const k1n = Math.floor(n * 0.84);
      let blocked = 0;
      let off = 0;
      for (let k = 0; k <= n; k++) {
        const u = k / n;
        const v = 1 - u;
        const px = v * v * v * x + 3 * v * v * u * p1x + 3 * v * u * u * p2x + u * u * u * tx;
        const py = v * v * v * y + 3 * v * v * u * p1y + 3 * v * u * u * p2y + u * u * u * ty;
        if (k >= k0 && k < k1n && ground.clear(px, py) < 5) blocked++;
        if (px < 4 || px > width - 4 || py < 0) off++;
      }
      const cost = cand.lb + blocked * 900 + off * 400;
      if (cost < bestCost) {
        bestCost = cost;
        best = cand;
      }
    }
    if (!best) return null;
    const { st, i, d, fx, fy } = best;
    const x = st.t.xs[i];
    const y = st.t.ys[i];
    const k1 = Math.min(140, d * 0.38);
    const k2 = Math.min(120, d * 0.34);
    const way = cubicWay([x, y], [x + fx * k1, y + fy * k1], [tx - ax * k2, ty - ay * k2], [tx, ty], Math.max(22, Math.ceil(d / 8)));
    return { parent: st, s: st.ls[i], way };
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
      const s = t.measure(() => p);
      if (s) out.push([el, s]);
      else el.dataset.spunState = "chalk";
    }
    return out;
  }

  /** A heading's thread, laid whole (its head at the start; the caller
   * moves it or settles it). Strung on a weft, the weft writes it (the way
   * already comes from the knot it stops in). Otherwise it comes off the
   * nearest drawn hion of its own hue if one runs near, otherwise in from
   * the page's edge when the heading is near it, otherwise from a little
   * before the word. */
  function title(el: HTMLElement, hue: Hue, spun: Spun, twist: 0 | 1 | -1 = el.matches(SAID) ? 1 : 0): Strand {
    let way = spun.way;
    let from: { parent: Strand; s: number } | undefined;
    let approach = 0;
    if (!spun.knotted) {
      // A branch off the tree: it leaves a thread already grown near the
      // heading and comes in along the line under its feet, going the way
      // the line is written. Its hue is the thread's it leaves.
      const [x0, y0] = way[0];
      const [x1, y1] = way[Math.min(way.length - 1, 3)];
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      // A said word's second thread comes off the other tree.
      const root = rootFor([x0, y0], [(x1 - x0) / l, (y1 - y0) / l], hue, 760, undefined, twist < 0) ?? hionRoot(x0, y0, hue);
      if (root) {
        from = { parent: root.parent, s: root.s };
        hue = root.parent.t.hue;
        approach = root.way.length;
        way = [...root.way.slice(0, -1), ...way];
      }
    }
    const n: Nature = { ...nature("title") };
    let smoothed = smooth(way, 4);
    let under: number[] = [];
    if (twist) {
      // Where the letters begin along the smoothed way.
      const lead = approach ? approachLength(way, approach) : 0;
      let at = 0;
      for (let run = 0; at < smoothed.length - 1 && run < lead; at++) run += Math.hypot(smoothed[at + 1][0] - smoothed[at][0], smoothed[at + 1][1] - smoothed[at][1]);
      const tw = twisted(smoothed.slice(at), twist, at);
      smoothed = [...smoothed.slice(0, at), ...tw.out];
      under = tw.under;
    }
    const t = fate.bare(hue, smoothed);
    for (const i of under) t.under.add(i);
    const st = make("title", n, t, { by: "title", el }, from);
    const total = measureBody(st);
    // Where the letters begin along it: the approach is grown, not written.
    const letters = approach ? indexAt(st, approachLength(way, approach)) : 0;
    Object.assign(n, writing(spun, total - st.ls[letters]));
    st.pace = paceOf(st, letters);
    strands.push(st);
    el.dataset.spunState = "spun";
    // Said: written by both trees at once, the other's thread twisted
    // round this one.
    if (twist > 0) twins.set(st, title(el, hue === "c" ? "m" : "c", spun, -1));
    return st;
  }

  /** What is said (spun.ts LABELS: the greeting, the role line, the
   * portrait's word, the foot's call): written by both trees. */
  const SAID = ".hion-hello, .hion-role, .hion-portrait__link, .hion-foot__call";
  /** A said word's two threads: how far either side of its letters (in
   * threads), and how often they cross (px). */
  const TWIST = 1.3;
  const TURN = 48;

  /** A said word's second thread, by its first. */
  const twins = new WeakMap<Strand, Strand>();

  /** A said word's two threads through its letters: along the run under
   * their feet they twist round each other, each going under the other by
   * turns; up through a letter they are one, the cyan and the magenta on
   * top letter by letter, so each letter is one clean stroke (twisted
   * through the letters themselves, they could not be read). */
  function twisted(piece: Pt[], sign: 1 | -1, base: number) {
    const out: Pt[] = [];
    const under: number[] = [];
    let run = 0;
    let letter = 0;
    let was = 1;
    piece.forEach(([x, y], i) => {
      if (i) run += Math.hypot(x - piece[i - 1][0], y - piece[i - 1][1]);
      // The run is the lowest of the way near by (capitals have no tails).
      let low = y;
      for (let k = Math.max(0, i - 24); k < Math.min(piece.length, i + 25); k++) low = Math.max(low, piece[k][1]);
      const on = Math.max(0, Math.min(1, (y - (low - 7)) / 4));
      if (was >= 0.5 && on < 0.5) letter++;
      was = on;
      const a = piece[Math.max(0, i - 3)];
      const b = piece[Math.min(piece.length - 1, i + 3)];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const tx = (b[0] - a[0]) / d;
      const ty = (b[1] - a[1]) / d;
      const w = Math.sin((run / TURN) * Math.PI * 2) * on;
      out.push([x - ty * w * TWIST * THREAD * sign, y + tx * w * TWIST * THREAD * sign]);
      const c = Math.round(run / (TURN / 2));
      if (on < 0.5 ? letter % 2 === 0 : Math.abs(w) < 0.5 * on && c % 2 === 0) {
        if (sign > 0) under.push(base + i);
      } else if (on < 0.5 || Math.abs(w) < 0.5 * on) {
        if (sign < 0) under.push(base + i);
      }
    });
    return { out, under };
  }

  /** How long the first `n` points of a way run (px). */
  function approachLength(way: Pt[], n: number) {
    let l = 0;
    for (let k = 1; k < n && k < way.length; k++) l += Math.hypot(way[k][0] - way[k - 1][0], way[k][1] - way[k - 1][1]);
    return l;
  }

  /** With nothing grown near yet: off the nearest point of a hion's way
   * (the hion is coming; it is never far behind a heading it has lit). */
  function hionRoot(x: number, y: number, hue: Hue) {
    let best: { parent: Strand; s: number; way: Pt[] } | null = null;
    let bd = Infinity;
    for (const st of strands) {
      if (st.kind !== "hion") continue;
      const { xs, ys } = st.t;
      for (let i = 0; i < xs.length; i += 3) {
        const d = Math.hypot(xs[i] - x, ys[i] - y) + (st.t.hue === hue ? 0 : 120);
        if (d < bd) {
          bd = d;
          const mx = (xs[i] + x) / 2;
          const my = (ys[i] + y) / 2 + 10;
          best = { parent: st, s: st.ls[i], way: smooth([[xs[i], ys[i]], [mx, my], [x, y]], 6) };
        }
      }
    }
    return best;
  }

  /** How fast a heading's head goes at each point of its way, as a share
   * of its speed: a hand slows into the turns of the letters and runs on
   * along the line between them, and eases out at the start and in at the
   * end. Averages to 1 over the letters, so the heading takes as long as
   * `writing` says; the branch that brings it there (points before
   * `letters`) grows at a branch's pace, easing into the first letter. */
  function paceOf(st: Strand, letters = 0) {
    const { xs, ys } = st.t;
    const n = xs.length;
    const raw = new Float32Array(n);
    const k = 3;
    for (let i = letters; i < n; i++) {
      const a = Math.max(0, i - k);
      const b = Math.min(n - 1, i + k);
      const ax = xs[i] - xs[a];
      const ay = ys[i] - ys[a];
      const bx = xs[b] - xs[i];
      const by = ys[b] - ys[i];
      const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
      raw[i] = 1.3 - 0.75 * Math.sqrt(Math.max(0, (1 - cos) / 2));
    }
    const pace = new Float32Array(n);
    const total = st.ls[n - 1] || 1;
    const start = st.ls[letters] ?? 0;
    let sum = 0;
    for (let i = letters; i < n; i++) {
      let s = 0;
      let c = 0;
      for (let j = Math.max(letters, i - 5); j <= Math.min(n - 1, i + 5); j++, c++) s += raw[j];
      const at = st.ls[i] - start;
      pace[i] = (s / c) * Math.min(1, (letters ? 0.6 : 0.3) + at / 60, 0.3 + (total - st.ls[i]) / 90);
      sum += pace[i];
    }
    const mean = sum / (n - letters) || 1;
    for (let i = letters; i < n; i++) pace[i] /= mean;
    // The branch on its way: brisk, eased out of the thread it leaves and
    // into the first letter.
    const brisk = Math.max(1.4, 520 / st.n.speed);
    for (let i = 0; i < letters; i++) {
      const u = start ? st.ls[i] / start : 1;
      pace[i] = brisk * Math.min(1, 0.35 + u * 3, 0.6 + (1 - u) * 3);
    }
    return pace;
  }

  /** A word's thread, written at once and lying cold. */
  function whole(st: Strand) {
    const twin = twins.get(st);
    if (twin) whole(twin);
    st.s = measureBody(st);
    st.heat = 0;
    st.motion = 0;
    st.rope = null;
    finish(st, performance.now());
  }

  /* ---------- The thread itself ---------- */

  /** Lay segments [i0, i1) of a strand's body on a context, settled.
   * With `clip` (a pane's box), segments wholly outside it are skipped:
   * a hion's body is thousands of segments, and a pane sees a few. */
  function lay(ctx: CanvasRenderingContext2D, st: Strand, i0: number, i1: number, tip?: Pt, clip?: Box, erase?: number) {
    const { xs, ys, under, hue } = st.t;
    const { ls } = st;
    const base = st.n.body;
    const pad = THREAD * 3 + 14;
    const outside = (i: number) =>
      !!clip &&
      (Math.max(xs[i], xs[i + 1]) < clip.l - pad ||
        Math.min(xs[i], xs[i + 1]) > clip.r + pad ||
        Math.max(ys[i], ys[i + 1]) < clip.t - pad ||
        Math.min(ys[i], ys[i + 1]) > clip.b + pad);
    let pts: number[] = [];
    const flush = (alpha: number) => {
      if (pts.length >= 4) strokeRun(ctx, hue, THREAD, pts, base * alpha, erase);
      pts = [];
    };
    for (let i = i0; i < i1; i++) {
      // Under another thread, across a stretch it leaves the page for, or
      // out of this pane's sight.
      if (under.has(i) || st.alpha <= 0 || ls[i + 1] - ls[i] <= 0 || outside(i)) {
        flush(st.alpha);
        continue;
      }
      if (!pts.length) pts.push(xs[i], ys[i]);
      pts.push(xs[i + 1], ys[i + 1]);
    }
    if (tip && pts.length) {
      const k = pts.length - 2;
      if (Math.hypot(tip[0] - pts[k], tip[1] - pts[k + 1]) < JUMP) pts.push(tip[0], tip[1]);
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
        lay(ctx, st, 0, st.laid, undefined, { l: pane.x0, t: t0, r: pane.x1, b: t0 + TILE });
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
      panes.push({ el, ctx, x0, x1: x0 + w });
    }
    const tile = { index, panes };
    paintTile(tile);
    return tile;
  }

  /** Keep ground near the viewport; drop far panes. */
  function cull() {
    const from = Math.max(0, Math.floor((viewTop - viewH * 0.3) / TILE));
    const to = Math.min(tileRows - 1, Math.floor((viewTop + viewH * 1.3) / TILE));
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
    const [a, b] = tileRange(top, bottom);
    for (let k = a; k <= b; k++) {
      const tile = tiles.get(k);
      if (!tile) continue;
      for (const pane of panesIn(tile, left, right)) {
        lay(pane.ctx, st, st.laid, to, undefined, { l: pane.x0, t: k * TILE, r: pane.x1, b: (k + 1) * TILE });
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
        // Shown on the beat, with the bakes: a crossing a frame would have
        // the pane stilled (a new bitmap) every frame. The thread going
        // over lies live on top until then anyway.
        stale.add(el);
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = THREAD + 2.5;
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
    const view = viewTop;
    const want = Math.min(height, Math.ceil(viewH * BAND));
    const w = width;
    if (!bandFresh && want === bandH && w === bandW && view >= bandTop - 1 && view + viewH <= bandTop + bandH + 1) {
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
    }
    bandTop = Math.round(Math.max(0, Math.min(height - bandH, view - (bandH - viewH) / 2)));
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
    const pad = THREAD * 3 + 14;
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
      // A slight sway across the thread while the head moves, and a
      // little sag: a thread drawn out taut, not a tail.
      // A heading's rope is held closer: its letters are small beside it.
      const calm = st.kind === "title" ? 0.3 : 1;
      const sway = calm * st.motion * 420 * Math.sin(now * 0.0031 + k * 0.5 + st.t.id * 1.7) * (1 - u) * u * 4;
      x += vx + nx * sway * sec * sec;
      y += vy + (ny * sway + calm * 220 * st.motion) * sec * sec;
      const f = 1 - Math.exp(-(3 + 34 * u * u) * sec);
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
  function paintStrand(ctx: CanvasRenderingContext2D, st: Strand) {
    const { hue } = st.t;
    const span = Math.min(st.n.tail, st.s);
    const settled = st.s - span;
    // Settled: exactly as the ground will have it.
    const i1 = indexAt(st, settled);
    if (st.n.body > 0 && (i1 > st.laid || settled > st.ls[st.laid])) {
      const [tx, ty] = at(st, settled);
      lay(ctx, st, st.laid, i1, [tx, ty]);
    }
    if (span < 2) return;
    // The warm run, from where it settles to the head.
    let pts: number[] = [];
    if (st.rope) {
      // The rope's nodes, smoothed between.
      const r = st.rope;
      for (let k = KNOTS; k >= 0; k--) {
        if (k < KNOTS && k > 0) {
          const mx0 = (r.x[k + 1] + r.x[k]) / 2;
          const my0 = (r.y[k + 1] + r.y[k]) / 2;
          const mx1 = (r.x[k] + r.x[k - 1]) / 2;
          const my1 = (r.y[k] + r.y[k - 1]) / 2;
          pts.push(mx0, my0, 0.25 * mx0 + 0.5 * r.x[k] + 0.25 * mx1, 0.25 * my0 + 0.5 * r.y[k] + 0.25 * my1);
        } else pts.push(r.x[k], r.y[k]);
      }
    } else {
      const steps = Math.max(2, Math.ceil(span / 6));
      for (let k = steps; k >= 0; k--) {
        const [x, y] = at(st, st.s - (k * span) / steps);
        pts.push(x, y);
      }
    }
    // Not across a stretch a hion leaves the page for.
    for (let i = pts.length - 4; i >= 0; i -= 2) {
      if (Math.abs(pts[i + 2] - pts[i]) + Math.abs(pts[i + 3] - pts[i + 1]) > JUMP) {
        pts = pts.slice(i + 2);
        break;
      }
    }
    const count = pts.length / 2;
    if (count < 2) return;
    // Growing or being written, it lies as it will lie: one line, no hot
    // head, no glow.
    strokeRun(ctx, hue, THREAD, pts, st.n.body * st.alpha);
  }

  /** Repaint only where something changed: each changed thing's old box
   * and new one, merged. */
  function paintLive() {
    if (!bandW) return;
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
      for (const st of strands) if (st.box && meets(st.box, r)) paintStrand(ctx, st);
      for (const fx of effects) if (fx.last.some((b) => meets(b, r))) fx.e.paint(ctx);
      ctx.restore();
    }
  }

  /* ---------- Growing ---------- */

  /** A strand; with `from`, a branch leaving that thread at arc length s,
   * of its hue. */
  function make(kind: Kind, n: Nature, t: Thread, drive: Drive, from?: { parent: Strand; s: number }): Strand {
    const st: Strand = {
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
      ext: { l: t.xs[0], t: t.ys[0], r: t.xs[0], b: t.ys[0] },
      motion: 1,
      heat: 1,
      resting: false,
      box: null,
      dirty: true,
      cold: false,
      parent: from?.parent ?? null,
      root: from?.s ?? 0,
      children: [],
      depth: from ? from.parent.depth + 1 : 0,
      fork: Infinity,
    };
    from?.parent.children.push(st);
    return st;
  }

  /** Off the tree: its parent no longer carries it. */
  function prune(st: Strand) {
    const p = st.parent;
    if (p) p.children = p.children.filter((c) => c !== st);
  }

  function spawn(kind: Kind, seed: Seed, drive: Drive, from?: { parent: Strand; s: number }): Strand {
    const st = make(kind, nature(kind), fate.add(seed), drive, from);
    st.rand = rng(seed.seed * 3 + 1);
    strands.push(st);
    return st;
  }

  /** How deep the ground's branches fork (home deepest). */
  const deepest = close ? 1 : 2;

  /** A ground branch, off a thread: it forks again (a shorter branch, at
   * a slant) once it has grown a while, down to `deepest`. */
  function sprout(seed: Seed, parent: Strand, s: number): Strand {
    const st = spawn("ground", seed, { by: "fate" }, { parent, s });
    if (st.depth < deepest) st.fork = 200 + st.rand() * 320;
    return st;
  }

  /** The hion of a hue, as it is now (they are made again on a new
   * composition). */
  const hionOf = (hue: Hue) => strands.find((st) => st.kind === "hion" && st.t.hue === hue) ?? null;

  const ready = (bud: Bud, reach: number) => bud.seed.key <= reach && (hionOf(bud.hue)?.s ?? 0) >= bud.s;

  /** A bud is born when its hion has grown past where it leaves. */
  function born(bud: Bud) {
    const parent = hionOf(bud.hue);
    if (!parent) return null;
    return sprout(bud.seed, parent, bud.s);
  }

  /** A limb (weave.ts): a weft, cord, tie or knot, grown as a branch. One
   * thrown from a hion forks off it a little before where it is tied and
   * bends into its line; any other grows from whatever thread has grown
   * nearest its start. It ties itself off at its end. False while the hion
   * it is thrown from has yet to grow there (unless `force`). */
  function bear(limb: Limb, force: boolean) {
    const way = limb.way;
    if (way.length < 2) return true;
    const k = Math.min(way.length - 2, 12);
    const [kx, ky] = way[k];
    const [nx, ny] = way[k + 1];
    const dl = Math.hypot(nx - kx, ny - ky) || 1;
    const D: Pt = [(nx - kx) / dl, (ny - ky) / dl];
    let from: { parent: Strand; s: number } | undefined;
    let path: Pt[] | null = null;
    const hion = hionOf(limb.hue);
    if (limb.tied && hion) {
      // Where on the hion it is tied.
      const [x0, y0] = way[0];
      const { xs, ys } = hion.t;
      let best = -1;
      let bd = 40;
      for (let i = 0; i < xs.length; i += 2) {
        const d = Math.abs(xs[i] - x0) + Math.abs(ys[i] - y0);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best >= 0) {
        const tiedAt = hion.ls[best];
        if (!force && hion.s < tiedAt) return false;
        const s = Math.max(0, tiedAt - Math.min(44, approachLength(way, k) * 0.9 + 10));
        const [px, py, qx, qy] = at(hion, s);
        const F: Pt = [qy, -qx];
        const d = Math.hypot(kx - px, ky - py);
        const lead = cubicWay([px, py], [px + F[0] * d * 0.5, py + F[1] * d * 0.5], [kx - D[0] * d * 0.45, ky - D[1] * d * 0.45], [kx, ky], 10);
        path = [...lead.slice(0, -1), ...way.slice(k)];
        from = { parent: hion, s };
      }
    }
    if (!path) {
      // Of its own hue: what hangs from it is already that hue.
      const root = rootFor([kx, ky], D, limb.hue, 700, undefined, true) ?? hionRoot(kx, ky, limb.hue);
      if (!root) return true;
      path = [...root.way.slice(0, -1), ...way.slice(k)];
      from = { parent: root.parent, s: root.s };
    }
    if (limb.knot) path.push(...knotAt(path));
    const t = fate.bare(from?.parent.t.hue ?? limb.hue, smooth(path, 4));
    if (limb.under) {
      for (let i = 0; i < t.xs.length - 1; i++) if (limb.under.some((u) => Math.abs(t.xs[i] - u) < 6)) t.under.add(i);
    }
    const st = make("limb", nature("limb"), t, { by: "way" }, from);
    measureBody(st);
    strands.push(st);
    task.wake();
    return true;
  }

  /** A small knot at the end of a way: the thread loops round once just
   * past its end and comes back through itself. */
  function knotAt(way: Pt[]): Pt[] {
    const n = way.length - 1;
    const [ex, ey] = way[n];
    const [px, py] = way[Math.max(0, n - 3)];
    const l = Math.hypot(ex - px, ey - py) || 1;
    const dx = (ex - px) / l;
    const dy = (ey - py) / l;
    const r = 3.4;
    const cx = ex + dx * r;
    const cy = ey + dy * r;
    const a0 = Math.atan2(-dy, -dx);
    const out: Pt[] = [];
    for (let k = 1; k <= 14; k++) {
      const a = a0 + (k / 14) * Math.PI * 2.15;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }

  /** Grow a ground branch one step; when it has grown to its fork, a
   * shorter branch leaves it there, at a slant, into open paper. */
  function stepGround(st: Strand) {
    const going = fate.step(st.t);
    const grown = (st.t.xs.length - 1) * STEP;
    if (grown >= st.fork && !st.t.done) {
      st.fork = st.depth + 1 < deepest ? grown + 260 + st.rand() * 420 : Infinity;
      const n = st.t.xs.length - 1;
      const x = st.t.xs[n];
      const y = st.t.ys[n];
      const a = leave(ground, x, y, st.t.a, st.rand() < 0.5 ? 1 : -1, st.rand);
      if (a !== null) {
        const seed = Math.floor(st.t.id * 131 + grown);
        const r = rng(seed);
        const left = Math.max(0, st.t.len - grown);
        const lone = r() < 0.3;
        sprout(
          { x, y, a, hue: st.t.hue, len: Math.max(260, left * (0.45 + r() * 0.3)), seed, key: y, lone, free: 120, grace: 24, goals: goalsFor(all, x, y, a, lone, r) },
          st,
          measureBody(st),
        );
      }
    }
    return going;
  }

  const growing = (kind?: Kind) => strands.filter((st) => !st.cold && st.heat > 0 && (!kind || st.kind === kind));

  /** Is a point near enough the reader to be seen? */
  function seen(y: number, margin = 0.5) {
    return y > viewTop - viewH * margin && y < viewTop + viewH * (1 + margin);
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

  /** New branches off the threads near the reader, once the page's own
   * have been born: the page keeps living without filling up. A branch
   * leaves a hion or a branch lying in sight (not one fading), forward and
   * at a slant, into open paper. */
  function trickle(now: number, near: number) {
    if (now < nextTrickle) return;
    const rand = rng(options.seed * 7 + ++trickles * 131);
    // Sooner when nothing near the reader is growing; sooner on home.
    nextTrickle = now + (2500 + near * 3000 + rand() * 3000) * (lively ? 0.45 : 1);
    const top = Math.max(0, viewTop) + viewH * 0.08;
    const bottom = viewTop + viewH * 0.8;
    const from = strands.filter(
      (st) =>
        (st.kind === "hion" || (st.kind === "ground" && st.cold && st.alpha === 1 && st.fadeAt - now > 20000)) &&
        st.top < bottom &&
        st.bottom > top,
    );
    for (let tries = 0; tries < 6 && from.length; tries++) {
      const parent = from[Math.floor(rand() * from.length)];
      const grown = parent.kind === "hion" ? parent.s : measureBody(parent);
      if (grown < 120) continue;
      const s = 40 + rand() * (grown - 80);
      const [x, y, nx, ny] = at(parent, s);
      if (y < top || y > bottom) continue;
      const a = leave(ground, x, y, Math.atan2(-nx, ny), rand() < 0.5 ? 1 : -1, rand);
      if (a === null) continue;
      const lone = rand() < 0.25;
      sprout(
        { x, y, a, hue: parent.t.hue, len: 600 + rand() * 1200, seed: options.seed * 13 + trickles * 71, key: y, lone, free: 140, grace: 30, goals: goalsFor(all, x, y, a, lone, rand) },
        parent,
        s,
      );
      return;
    }
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
      // Leaves first: a thread that still carries a branch waits for it.
      if (st.alpha === 1 && st.children.length) {
        st.fadeAt = Math.ceil((now + 1) / GROUP) * GROUP;
        continue;
      }
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
      strands = strands.filter((st) => {
        if (st.t.gone) prune(st);
        return !st.t.gone;
      });
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
        lay(pane.ctx, st, 0, st.laid, undefined, { l: pane.x0, t: k * TILE, r: pane.x1, b: (k + 1) * TILE }, fraction);
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
      // A heading is written at its own pace (slower into the turns of its
      // letters), barely pulled, so its letters come out even.
      const pull = st.pace
        ? st.pace[indexAt(st, st.s)] * (0.94 + 0.06 * Math.sin(now * 0.0021 + st.t.id * 1.3))
        : 0.72 + 0.28 * Math.sin(now * 0.0021 + st.t.id * 1.3) + 0.14 * Math.sin(now * 0.0053 + st.t.id * 0.7);
      const speed = st.n.speed * pull * (by === "wind" ? 1.25 : 1);
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
    // What hangs from the hions grows off them as the drawing reaches it,
    // whether or not anyone is moving: it is what the words hang from.
    while (limbSown < limbs.length && limbs[limbSown].key <= loom.reach() && bear(limbs[limbSown], false)) limbSown++;
    const tying = tieHangers(now);
    if (here) {
      // Born as the drawing reaches them, a moment apart; only heads near
      // the reader count (the rest hurry out of sight).
      const reach = loom.reach();
      let growingNear = growing("ground").filter((st) => seen(headY(st))).length;
      // Each when its hion's head has passed where it leaves.
      while (sown < seeds.length && ready(seeds[sown], reach) && growingNear < live && now - lastBirth > 350) {
        born(seeds[sown++]);
        lastBirth = now;
        growingNear++;
      }
      // Nothing of the page's own left to be born here: new branches leave
      // the threads near the reader.
      if (growingNear < live && (sown >= seeds.length || seeds[sown].seed.key > reach)) trickle(now, growingNear);
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
    const beat = Math.floor(now / BEAT);
    const baking = beat !== lastBeat;
    lastBeat = beat;
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
      // Lay what has cooled behind the head, on the beat.
      if (baking) {
        const to = indexAt(st, st.s - Math.min(st.n.tail, st.s));
        if (to > st.laid) bake(st, to);
      }
      // A hion is never finished: its way is drawn as far as the loom has.
      if (st.kind === "hion") continue;
      if (st.t.done && st.heat <= 0 && (!st.rope || st.rope.energy < 0.04)) finish(st, now);
      else if (!st.cold && !st.resting && !seen(headY(st), 0.2)) offscreen = true;
    }
    if (untied) {
      strands = strands.filter((st) => {
        if (st.t.gone) prune(st);
        return !st.t.gone;
      });
    }
    for (const [t, i] of fate.breaks) breakAt(t, i);
    fate.breaks.length = 0;
    if (baking && stale.size) {
      for (const el of stale) still(el);
      stale.clear();
    }
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
    if (here && sown < seeds.length && seeds[sown].seed.key <= loom.reach()) wait = Math.min(wait, 400);
    else if (here) wait = Math.min(wait, Math.max(nextTrickle - now, 400));
    if (here) wait = Math.min(wait, attend - (now - lastInput) + 20);
    if (tying) wait = Math.min(wait, 200);
    if (wait < Infinity) task.wakeIn(Math.max(30, wait));
    return false;
  }

  /* ---------- Light along the threads (a pluck, a brush) ---------- */

  /** The nearest grown point of any thread (of `hue`, if given) within r
   * of (x, y). */
  function touch(x: number, y: number, r: number, hue?: Hue): { st: Strand; s: number } | null {
    let best: { st: Strand; s: number } | null = null;
    let bd = r;
    for (const st of strands) {
      if (st.t.gone || st.s < 4 || st.alpha < 1 || (hue && st.t.hue !== hue)) continue;
      const e = st.ext;
      if (x < e.l - bd || x > e.r + bd || y < e.t - bd || y > e.b + bd) continue;
      const { xs, ys } = st.t;
      const end = Math.min(xs.length - 1, indexAt(st, st.s));
      for (let i = 0; i <= end; i += 2) {
        const dx = xs[i] - x;
        const dy = ys[i] - y;
        if (Math.abs(dx) > bd || Math.abs(dy) > bd) continue;
        const d = Math.hypot(dx, dy);
        if (d < bd) {
          bd = d;
          best = { st, s: st.ls[i] };
        }
      }
    }
    return best;
  }

  /** Light on its way along a thread: at arc length s, going v (px a ms),
   * with this much left of it. It came from `from` (a parent or a branch),
   * and does not go back into it. */
  interface Light {
    st: Strand;
    s: number;
    v: number;
    e: number;
    from: Strand | null;
  }
  /** A thread ringing where it was plucked. */
  interface Ring {
    st: Strand;
    s: number;
    age: number;
  }
  let lights: Light[] = [];
  let rings: Ring[] = [];
  /** Lights at once, and the least a light can be and still go on. */
  const LIGHTS = 56;
  const FAINT = 0.16;
  /** How far light goes before it has lost about two thirds (px). */
  const CARRY = 1300;

  function shine(st: Strand, s: number, v: number, e: number, from: Strand | null) {
    if (lights.length >= LIGHTS || e < FAINT || st.s < 8) return;
    lights.push({ st, s, v, e, from });
    task.wake();
  }

  /** Light out from a point on a thread, both ways, and on through the
   * tree: into every branch it passes the root of, and back into the
   * thread a branch leaves when it reaches the branch's root. */
  function light(st: Strand, s: number, e: number, v = 0.9) {
    shine(st, s, v, e, null);
    shine(st, s, -v, e, null);
  }

  function stepLights(dt: number) {
    const born: Light[] = [];
    for (const l of lights) {
      const before = l.s;
      l.s += l.v * dt;
      l.e *= Math.exp(-Math.abs(l.v * dt) / CARRY);
      const lo = Math.min(before, l.s);
      const hi = Math.max(before, l.s);
      for (const c of l.st.children) {
        if (c === l.from || c.root < lo || c.root >= hi || c.s < 12) continue;
        born.push({ st: c, s: 0, v: Math.abs(l.v), e: l.e * 0.82, from: l.st });
      }
      const p = l.st.parent;
      if (l.s <= 0 && l.v < 0 && p && p !== l.from) {
        born.push({ st: p, s: l.st.root, v: Math.abs(l.v), e: l.e * 0.82, from: l.st });
        born.push({ st: p, s: l.st.root, v: -Math.abs(l.v), e: l.e * 0.82, from: l.st });
      }
    }
    lights = lights.filter((l) => l.e >= FAINT && l.s > 0 && l.s < l.st.s && !l.st.t.gone);
    for (const l of born) shine(l.st, l.s, l.v, l.e, l.from);
    for (const r of rings) r.age += dt;
    rings = rings.filter((r) => r.age < 950 && !r.st.t.gone);
    return lights.length + rings.length > 0;
  }

  function lightBox(st: Strand, s0: number, s1: number, pad: number): Box | null {
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    const a = Math.max(0, Math.min(s0, s1));
    const z = Math.min(st.s, Math.max(s0, s1));
    for (let s = a; s <= z + 6; s += 6) {
      const [x, y] = at(st, Math.min(s, z));
      l = Math.min(l, x);
      r = Math.max(r, x);
      t = Math.min(t, y);
      b = Math.max(b, y);
    }
    return l < Infinity ? { l: l - pad, t: t - pad, r: r + pad, b: b + pad } : null;
  }

  effects.push({
    last: [],
    e: {
      step: (_now, dt) => stepLights(Math.min(dt, 48)),
      boxes() {
        const out: Box[] = [];
        for (const r of rings) {
          const b = lightBox(r.st, r.s - 90, r.s + 90, 12);
          if (b) out.push(b);
        }
        for (const l of lights) {
          const b = lightBox(l.st, l.s - 56 * Math.sign(l.v), l.s, 10);
          if (b) out.push(b);
        }
        return out;
      },
      paint(ctx) {
        ctx.lineCap = "round";
        for (const r of rings) {
          // It rings where it lies: a standing wave of light along the
          // thread itself, its bright bellies breathing in and out.
          const decay = Math.exp(-r.age / 300);
          const breath = Math.abs(Math.sin(r.age / 52)) * decay;
          const hue = r.st.t.hue;
          const step = 0.05;
          for (let u = -1; u < 1; u += step) {
            const belly = Math.abs(Math.sin((u + 1) * Math.PI)) * Math.cos((u * Math.PI) / 2);
            const a = breath * belly;
            if (a < 0.03) continue;
            const [x0, y0] = at(r.st, r.s + u * 84);
            const [x1, y1] = at(r.st, r.s + (u + step) * 84);
            if (Math.abs(y1 - y0) + Math.abs(x1 - x0) > 60) continue;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.lineWidth = THREAD;
            ctx.strokeStyle = tone(hue, 1, 0.85 * a);
            ctx.stroke();
          }
        }
        for (const l of lights) {
          // The thread's own light running along it: a short pale run,
          // brightest at its front, of the thread's own width (no glow).
          const hue = l.st.t.hue;
          const trail = 56 * Math.sign(l.v);
          ctx.lineCap = "round";
          for (let k = 0; k < 6; k++) {
            const s0 = l.s - (trail * k) / 6;
            const s1 = l.s - (trail * (k + 1)) / 6;
            if (s1 < 0 || s1 > l.st.s) continue;
            const [x0, y0] = at(l.st, s0);
            const [x1, y1] = at(l.st, s1);
            if (Math.abs(y1 - y0) + Math.abs(x1 - x0) > 60) continue;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.lineWidth = THREAD;
            ctx.strokeStyle = tone(hue, 1, 0.9 * l.e * (1 - k / 6));
            ctx.stroke();
          }
        }
      },
    },
  });

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

  /** A branch to something you hover: it grows from the nearest thread
   * already grown (forward off it, at a slant), then weaves through its
   * words if it has any to speak of, otherwise loops round it; when you
   * leave, it withdraws into the thread it came from. Nothing near to
   * grow from, nothing grows. */
  function encircle(el: Element) {
    untie(null);
    const p = page.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const box: Box = { l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top };
    const seed = Math.floor(performance.now() * 3 + box.l * 7 + box.t);
    const rand = rng(seed);
    const pictured = el.querySelector("img, video, canvas.hion-woven-cover, .hion-woven-cover");
    const text = (el.textContent ?? "").trim();
    // The other hion reaches through it: a heading written in magenta is
    // woven by a branch of the cyan, and the other way about. It comes in
    // from the side that tree is on.
    // Its words' hue: a heading's strand, or a label written on a canvas
    // of its own (spun.ts notes the hue).
    const own = strands.find((st) => st.drive.by === "title" && (el === st.drive.el || el.contains(st.drive.el)));
    const local = (el.matches("[data-spun-hue]") ? el : el.querySelector("[data-spun-hue]")) as HTMLElement | null;
    const ownHue = own?.t.hue ?? (local?.dataset.spunHue as Hue | undefined);
    const other: Hue | undefined = ownHue ? (ownHue === "c" ? "m" : "c") : undefined;
    const centre: Pt = [(box.l + box.r) / 2, (box.t + box.b) / 2];
    const near = touch(centre[0], centre[1], 700, other) ?? touch(centre[0], centre[1], 700);
    const toward: Pt = near ? at(near.st, near.s).slice(0, 2) as Pt : [box.l - 40, centre[1]];
    let way: Pt[] = [];
    if (!pictured && text.length > 0 && text.length < 90) way = weave(wordBoxes(el, p), toward, rand);
    if (way.length < 2) way = encircle_(box, toward, padFor(el), seed);
    if (way.length < 2) return;
    const [x1, y1] = way[Math.min(way.length - 1, 3)];
    const l = Math.hypot(x1 - way[0][0], y1 - way[0][1]) || 1;
    const arrive: Pt = [(x1 - way[0][0]) / l, (y1 - way[0][1]) / l];
    const root = (other && rootFor(way[0], arrive, other, 900, own, true)) || rootFor(way[0], arrive, undefined, 700, own);
    if (!root) return;
    loop(el, root.parent.t.hue, smooth([...root.way.slice(0, -1), ...way], 4), Infinity, { parent: root.parent, s: root.s });
  }

  function padFor(el: Element) {
    if (el.matches(".hion-prose a, .hion-foot__mail a")) return 7;
    if (el.matches(".hion-strung, .hion-tie")) return 12;
    if (el.matches(".hion-picture, .hion-work")) return 20;
    return 14;
  }

  function loop(el: Element | null, hue: Hue, way: Pt[], until: number, from?: { parent: Strand; s: number }) {
    const st = make("loop", nature("loop"), fate.bare(hue, way), { by: "loop", el, state: "tying", until }, from);
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
    encircle(target);
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
    // Brushing a thread (not racing across it) sends light along it, and
    // on through every branch of it; a thread answers once a second.
    if (speed < 1.6 && now - pointer.looked > 50) {
      pointer.looked = now;
      const hit = touch(x, y, 9);
      if (hit && now - (brushed.get(hit.st) ?? 0) > 1100) {
        brushed.set(hit.st, now);
        light(hit.st, hit.s, 0.62);
      }
    }
    task.wake();
  }

  /** A tap on a thread plucks it: it rings where it was struck, and light
   * runs away from there both ways through the whole tree. Anywhere, a tap
   * sends out a pair: a branch off each tree grows out through where you
   * tapped and on to a thread of the other near by, and weaves into it
   * (`sendOut`). */
  function onDown(event: PointerEvent) {
    lastInput = performance.now();
    if (!built || busy || event.button > 0) return;
    const target = event.target as Element;
    if (target.closest("a, button, input, textarea, select, .hion-top")) return;
    const x = event.clientX;
    const y = event.clientY + scrollY - pageTop;
    if (y < 0 || y > height) return;
    const hit = touch(x, y, 24);
    if (hit) {
      rings.push({ st: hit.st, s: hit.s, age: 0 });
      light(hit.st, hit.s, 1);
    }
    sendOut(x, y, performance.now());
  }

  /** How many of a tap's branches may lie at once (the oldest fade). */
  const SENT = 8;
  let sent: Strand[] = [];

  /** A pair from a tap: for each hue, a branch off its own tree out
   * through the point, and on from there, the way it was going, into the
   * nearest other branch ahead (of the other tree by preference, never the
   * one it grew from or anything that one grew from), weaving over and
   * under along it. It never goes back: it lies as the ground does, and
   * fades as it does, leaves first. */
  function sendOut(x: number, y: number, now: number) {
    sent = sent.filter((st) => !st.t.gone);
    for (const st of sent.slice(0, Math.max(0, sent.length - SENT + 2))) st.fadeAt = Math.min(st.fadeAt, now);
    const rand = rng(Math.floor(now * 7 + x * 13 + y));
    for (const hue of ["c", "m"] as Hue[]) {
      const other: Hue = hue === "c" ? "m" : "c";
      // Out to the tap from the nearest grown thread of its tree, going
      // away from it.
      const near = touch(x, y, 700, hue) ?? touch(x, y, 700);
      if (!near) continue;
      const [nx0, ny0] = at(near.st, near.s);
      const fl = Math.hypot(x - nx0, y - ny0) || 1;
      const fwd: Pt = [(x - nx0) / fl, (y - ny0) / fl];
      const root = rootFor([x, y], fwd, hue, 700, undefined, true) ?? rootFor([x, y], fwd, undefined, 700);
      if (!root) continue;
      // Never back into its own line: not the thread it leaves, nor any it
      // came from.
      const lineage = new Set<Strand>();
      for (let p: Strand | null = root.parent; p; p = p.parent) lineage.add(p);
      const [rx, ry] = at(root.parent, root.s);
      let into: { st: Strand; s: number; d: number } | null = null;
      let bestScore = Infinity;
      for (const st of strands) {
        if (lineage.has(st) || st.kind === "loop" || st.t.gone || st.alpha < 1 || st.s < 30) continue;
        const e = st.ext;
        if (x < e.l - 420 || x > e.r + 420 || y < e.t - 420 || y > e.b + 420) continue;
        const { xs, ys } = st.t;
        const end = Math.min(xs.length - 1, indexAt(st, st.s));
        for (let i = 0; i <= end; i += 3) {
          const dx = xs[i] - x;
          const dy = ys[i] - y;
          if (Math.abs(dx) > 420 || Math.abs(dy) > 420) continue;
          const d = Math.hypot(dx, dy);
          if (d < 50 || d > 420 || Math.hypot(xs[i] - rx, ys[i] - ry) < 140) continue;
          // Ahead, the way it was going (a little to either side).
          const ahead = (dx * fwd[0] + dy * fwd[1]) / d;
          if (ahead < 0.1) continue;
          const score = d * (st.t.hue === other ? 1 : 1.3) - ahead * 60;
          if (score < bestScore) {
            bestScore = score;
            into = { st, s: st.ls[i], d };
          }
        }
      }
      if (!into) continue;
      const [tx, ty, nx, ny] = at(into.st, into.s);
      // Along that thread the way that carries on, not back.
      const dir = ny * (tx - x) - nx * (ty - y) >= 0 ? 1 : -1;
      const ax = ny * dir;
      const ay = -nx * dir;
      const d = into.d;
      const reach = cubicWay([x, y], [x + fwd[0] * d * 0.45, y + fwd[1] * d * 0.45], [tx - ax * d * 0.35, ty - ay * d * 0.35], [tx, ty], Math.max(6, Math.ceil(d / 6)));
      // Over and under it, a good way along.
      const weaveIn: Pt[] = [];
      const span = 160 + rand() * 140;
      for (let k = 0, u = 0; u <= span; k++, u += 22) {
        const [px, py, qx, qy] = at(into.st, into.s + dir * u);
        const side = k % 2 ? 8 : -8;
        weaveIn.push([px + qx * side, py + qy * side]);
      }
      const t = fate.bare(root.parent.t.hue, smooth([...root.way.slice(0, -1), ...reach.slice(1), ...weaveIn.slice(1)], 4));
      const st = make("ground", nature("ground"), t, { by: "way" }, { parent: root.parent, s: root.s });
      measureBody(st);
      strands.push(st);
      sent.push(st);
      task.wake();
    }
  }

  function onScroll() {
    look();
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
        const st = strands.find((st) => !st.t.done && st.drive.by === "fate");
        if (st) {
          // Interleaved a little, so later threads find earlier ones.
          for (let k = 0; k < 40 && stepGround(st); k++);
          continue;
        }
        if (sown < seeds.length && seeds[sown].seed.key <= reach) {
          born(seeds[sown++]);
          continue;
        }
        break;
      }
      if (strands.some((st) => !st.t.done && st.drive.by === "fate") || (sown < seeds.length && seeds[sown].seed.key <= reach)) {
        settleTimer = window.setTimeout(slice, 16);
        return;
      }
      settling++;
      busy = false;
      delete layer.dataset.state;
      fate.breaks.length = 0;
      while (limbSown < limbs.length && limbs[limbSown].key <= reach) bear(limbs[limbSown++], true);
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
      layWaiting();
      task.wake();
    };
    slice();
  }

  /** Headings begun while the screen was settling (spun.ts): laid now,
   * written at once on a still screen. */
  function layWaiting() {
    const laid = new Set(strands.map((st) => (st.drive.by === "title" ? st.drive.el : null)));
    const waiting = [...titles.keys()].filter((el) => !laid.has(el));
    if (!waiting.length) return;
    const spuns = measured(page, () => {
      const p = page.getBoundingClientRect();
      return waiting.map((el) => [el, el.isConnected ? titles.get(el)!.measure(() => p) : null] as const);
    });
    for (const [el, spun] of spuns) {
      if (!spun) {
        el.dataset.spunState = "chalk";
        titles.delete(el);
        continue;
      }
      const st = title(el, titles.get(el)!.hue, spun);
      if (instant) whole(st);
    }
  }

  /** On arrival the first screen is not bare: its threads are already
   * part grown (the first few still growing, their heads live), so the
   * ground is there at once and a few heads are at work in it. */
  function pregrow() {
    const fold = Math.max(0, viewTop) + viewH;
    let started = 0;
    const now = performance.now();
    // Branches that leave the hions above the fold, as far as the drawing
    // reaches, and the branches they fork as they grow.
    const queue: Strand[] = [];
    while (sown < seeds.length && seeds[sown].seed.key <= fold) {
      const st = born(seeds[sown++]);
      if (st) queue.push(st);
    }
    for (let q = 0; q < queue.length && q < 200; q++) {
      const st = queue[q];
      const stop = started < live ? st.t.len * (0.3 + st.t.rand() * 0.25) : Infinity;
      if (stop < Infinity) started++;
      const before = st.children.length;
      while ((st.t.xs.length - 1) * STEP < stop && stepGround(st));
      queue.push(...st.children.slice(before));
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
        // The screen arrived on is not bare; one travelled to grows all
        // of its threads in sight, from where the hions come down.
        if (!options.travelled) {
          pregrow();
          for (const l of [layer, liveLayer]) l.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease" });
        }
        cull();
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
    /** A small loop of a hion's own, tied off it at arc length s and let
     * go after a while (life.ts: left alone, they amuse themselves). */
    knot(hue: Hue, s: number, r: number, hold: number) {
      const parent = hionOf(hue);
      if (!built || busy || !parent || s > parent.s) return false;
      const [x, y, nx, ny] = at(parent, s);
      // Out to one side of the hion and back through itself.
      const side = nx > 0 ? 1 : -1;
      const cx = x + nx * side * r * 1.1;
      const cy = y + ny * side * r * 1.1;
      const way = encircle_({ l: cx - r, t: cy - r, r: cx + r, b: cy + r }, [x, y], 4, Math.floor(x + y));
      loop(null, hue, [[x, y], ...way], performance.now() + hold, { parent, s });
      return true;
    },
    /** Light set off along a hion from arc length s (after a delay): it
     * runs on into every branch it passes. */
    chase(hue: Hue, s: number, v: number, delay: number) {
      const go = () => {
        const st = hionOf(hue);
        if (st && built) shine(st, s, v, 1, null);
      };
      if (delay) window.setTimeout(go, delay);
      else go();
    },
    /** A word to be written by thread (spun.ts): kept, written now if the
     * screen is ready (at once for a still screen), and written again
     * whenever the page is laid out anew. */
    inscribe(el: HTMLElement, hue: Hue, measure: Measure) {
      titles.set(el, { hue, measure });
      if (!built || busy || signal.aborted) return;
      // (spun.ts reads the page under one pass for several words at once,
      // and only when it has to.)
      const spun = measure(() => page.getBoundingClientRect());
      if (!spun) {
        // It gets its chalk back.
        el.dataset.spunState = "chalk";
        titles.delete(el);
        return;
      }
      const st = title(el, hue, spun);
      if (instant) whole(st);
      task.wake();
    },
    material: threadMaterial,
    /** The loom drew on: the hions' heads follow. */
    wake: () => task.wake(),
    /** For a check: the threads themselves. */
    fate: () => fate,
    strands: () => strands,
  };
}
