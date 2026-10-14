/** Life: how the two hions answer the visitor.
 *
 * The loom lays the drawing down once and leaves it. This layer is what
 * moves on top of it: one viewport-sized canvas (cleared and redrawn only
 * while something is alive) and a few light spans, driven by one frame
 * loop that sleeps the moment nothing moves and never runs while the page
 * is idle.
 *
 *   intents   the pointer is a source: as it moves, or rests a moment,
 *             loose threads of intent issue from it, creep (taut, turning
 *             in drawn curves) to the nearest thing on the page (a
 *             heading, a picture, a charm, the hions' own way) and weave
 *             loosely round it, then fade. A tap does the same on touch.
 *   loops     hover something hung, strung or linked and cyan runs over and
 *             ties a loop round it; leave and it unties, from the end back.
 *             Magenta drifts under it to look.
 *   runners   touch a thread and a bead of light runs away along it both
 *             ways; a glint rides slowly round each circle the hions drew.
 *   plucks    a click or tap plucks the nearest thread like a string, and
 *             shakes pastel dust off it.
 *   dust      pigment drifts off the threads near a moving pointer and
 *             falls, slowly, onto the paper.
 *   sway      scrolling swings everything that hangs, through one custom
 *             property on the world; brushing the cord a row hangs from
 *             sends a ripple down it; the destinations chime on hover.
 *   eggs      left alone, the threads now and then tie a small knot of
 *             their own, or chase each other down the page. */
import { type Hue, Kind, type Mark, paint, patterns, type Patterns, Path, type Pt, RGB, rng, thread } from "./pastel";
import type { createLoom } from "./loom";

type Loom = ReturnType<typeof createLoom>;

interface LifeOptions {
  /** Where the overlay lives (fixed, over the page, under the line). */
  world: HTMLElement;
  /** The screen: the loom's host, whose space the drawing is in. */
  page: HTMLElement;
  loom: Loom;
  signal: AbortSignal;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

/** What hangs and swings with a scroll (shell.css reads --hion-sway). */
const SWINGS =
  ".hion-charm, .hion-tag, .hion-pullcord[data-hang], .hion-work--lab, .hion-end, .hion-title, .hion-display__word, .hion-pull";

/* ---------- A drawn thread, searchable ---------- */

const CELL = 64;
/** Points further apart than this are either side of a gap in a thread. */
const GAP = 400;

class Strand {
  xs: Float64Array;
  ys: Float64Array;
  ls: Float64Array;
  keys: Float64Array;
  total: number;
  private grid = new Map<number, number[]>();

  constructor(points: Pt[], keys: Float64Array) {
    const n = points.length;
    this.xs = new Float64Array(n);
    this.ys = new Float64Array(n);
    this.ls = new Float64Array(n);
    this.keys = keys;
    for (let i = 0; i < n; i++) {
      this.xs[i] = points[i][0];
      this.ys[i] = points[i][1];
      // A thread that leaves the page for a track (weave.ts `gap`) comes
      // back further down: nothing runs across the stretch between.
      const step = i ? Math.hypot(this.xs[i] - this.xs[i - 1], this.ys[i] - this.ys[i - 1]) : 0;
      this.ls[i] = i ? this.ls[i - 1] + (step > GAP ? 0 : step) : 0;
      const cell = this.cell(this.xs[i], this.ys[i]);
      const bucket = this.grid.get(cell);
      if (bucket) bucket.push(i);
      else this.grid.set(cell, [i]);
    }
    this.total = n ? this.ls[n - 1] : 0;
  }
  private cell(x: number, y: number) {
    return Math.floor(x / CELL) * 65536 + Math.floor(y / CELL);
  }
  /** Nearest drawn point within r of (x, y). */
  nearest(x: number, y: number, r: number, reach: number) {
    let best = -1;
    let bd = r * r;
    const cx0 = Math.floor((x - r) / CELL);
    const cx1 = Math.floor((x + r) / CELL);
    const cy0 = Math.floor((y - r) / CELL);
    const cy1 = Math.floor((y + r) / CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const bucket = this.grid.get(cx * 65536 + cy);
        if (!bucket) continue;
        for (const i of bucket) {
          if (this.keys[i] > reach) continue;
          const dx = this.xs[i] - x;
          const dy = this.ys[i] - y;
          const d = dx * dx + dy * dy;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
      }
    }
    return best < 0 ? null : { i: best, d: Math.sqrt(bd), s: this.ls[best] };
  }
  index(s: number) {
    let lo = 0;
    let hi = this.ls.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.ls[mid] <= s) lo = mid;
      else hi = mid;
    }
    return lo;
  }
  /** Point and unit normal at arc length s. */
  at(s: number): [number, number, number, number] {
    const n = this.xs.length;
    s = Math.max(0, Math.min(this.total, s));
    const lo = this.index(s);
    const hi = Math.min(n - 1, lo + 1);
    const span = this.ls[hi] - this.ls[lo] || 1;
    const t = Math.min(1, (s - this.ls[lo]) / span);
    const a = Math.max(0, lo - 2);
    const b = Math.min(n - 1, hi + 2);
    const dx = this.xs[b] - this.xs[a];
    const dy = this.ys[b] - this.ys[a];
    const len = Math.hypot(dx, dy) || 1;
    return [
      this.xs[lo] + (this.xs[hi] - this.xs[lo]) * t,
      this.ys[lo] + (this.ys[hi] - this.ys[lo]) * t,
      -dy / len,
      dx / len,
    ];
  }
  drawnAt(s: number, reach: number) {
    return this.keys[this.index(s)] <= reach;
  }
}

/* ---------- Things alive on the page ---------- */

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** A thread of intent from the pointer: it creeps to a thing, weaves
 * round it, and fades. Points are page space, x, y pairs. */
interface Intent {
  hue: Hue;
  pts: number[];
  a: number;
  /** What it means to reach: a thing's box, or a point on a hion. */
  box: Box | null;
  on: { hue: Hue; s: number } | null;
  /** The way round it, once it has arrived, and how far along. */
  round: Pt[] | null;
  at: number;
  /** Steps owed (fractional), and how far it has crept. */
  owed: number;
  crept: number;
  /** 1 while it lives, fading to 0. */
  alpha: number;
  rand: () => number;
}

interface Loop {
  el: Element | null;
  path: Path;
  marks: Mark[];
  total: number;
  progress: number;
  state: "tying" | "held" | "untying";
  holdUntil: number;
  head: Pt;
}

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

interface Pluck {
  hue: Hue;
  s: number;
  age: number;
}

interface Runner {
  hue: Hue;
  s: number;
  v: number;
  /** Stop here (arc length). */
  to: number;
  age: number;
}

interface OrbitGlint {
  hue: Hue;
  path: Path;
  key: number;
  top: number;
  bottom: number;
  el: HTMLElement;
  s: number;
  v: number;
  shown: boolean;
}

interface Row {
  holder: HTMLElement;
  items: HTMLElement[];
  y: number;
  l: number;
  r: number;
  last: number;
}

/** What threads of intent go to, on the page. */
const AIMS = "main h1, main h2, main h3, [data-weft], main img, .hion-woven-cover, .hion-tag, .hion-pullcord, .hion-charm";
/** Intents at once, how far one looks for a thing, how fast it creeps
 * (px a second), and how far it may creep before it gives up. */
const INTENTS = 5;
const SEEK = 360;
const CREEP = 240;
const REACH = 520;

const HOVER = "[data-ink]:not(.hion-pull), .hion-strung, .hion-tie, .hion-prose a, .hion-foot__mail a";

export function createLife(options: LifeOptions) {
  const { world, page, loom, signal } = options;
  const fine = matchMedia("(pointer: fine)").matches;
  const layer = document.createElement("div");
  layer.className = "hion-life";
  layer.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  layer.append(canvas);
  world.append(layer);
  const ctx = canvas.getContext("2d")!;
  let pats: Patterns | undefined;
  let dpr = 1;
  let cw = 0;
  let ch = 0;

  let strands: Partial<Record<Hue, Strand>> = {};
  let version = -1;
  let glints: OrbitGlint[] = [];
  let rows: Row[] = [];
  let intents: Intent[] = [];
  let aims: Box[] = [];
  let travelled = 0;
  let lastIntent = 0;
  let rests = 0;
  let intentHue: Hue = "c";
  /** What was drawn last frame (canvas css px), when it was only intents:
   * the next frame clears just that. */
  let drawnBox: Box | null = null;
  let loops: Loop[] = [];
  let motes: Mote[] = [];
  let plucks: Pluck[] = [];
  let runners: Runner[] = [];
  let hovered: Element | null = null;
  let hoverBox: { l: number; t: number; r: number; b: number } | null = null;
  const touched: Record<Hue, number> = { c: 0, m: 0 };

  // The pointer, in page space.
  const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, speed: 0, at: 0, here: false };
  let pageTop = 0;
  let pageLeft = 0;
  let sway = 0;
  let swayV = 0;
  let lastScroll = scrollY;
  let lastInput = performance.now();
  let lastEgg = performance.now();
  let frame = 0;
  let last = 0;
  let canvasDirty = false;
  const rand = rng(Date.now() % 10007);

  /** The things that swing, given the angle each frame. Set on each of them
   * rather than once on the world: a custom property changed on the world
   * restyles the whole page every frame of a scroll. */
  let swung: HTMLElement[] = [];
  let swungAt = 0;
  let swungAngle = "";
  function swing(angle: string) {
    if (angle === swungAngle) return;
    const now = performance.now();
    // Only what is on screen (looked for again as you scroll on).
    if (angle && (!swung.length || now - swungAt > 400)) {
      for (const el of swung) el.style.removeProperty("--hion-sway");
      swungAt = now;
      swung = [...world.querySelectorAll<HTMLElement>(SWINGS)].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > -80 && r.top < innerHeight + 80 && r.width > 0;
      });
    }
    swungAngle = angle;
    for (const el of swung) {
      if (angle) el.style.setProperty("--hion-sway", angle);
      else el.style.removeProperty("--hion-sway");
    }
    if (!angle) swung = [];
  }

  function measure() {
    const box = page.getBoundingClientRect();
    pageTop = box.top;
    pageLeft = box.left;
  }

  /** Layout position in page space (unmoved by any swing in progress). */
  function offset(el: HTMLElement): Pt {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== page) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return [x, y];
  }

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    cw = innerWidth;
    ch = innerHeight;
    canvas.width = Math.ceil(cw * dpr);
    canvas.height = Math.ceil(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    pats = patterns(ctx, dpr);
  }

  /** Pick up the drawing again whenever the loom recomposed it. */
  function sync() {
    if (loom.version() === version) return;
    version = loom.version();
    strands = {};
    for (const tip of loom.journeys()) strands[tip.hue] = new Strand(tip.points, tip.keys);
    for (const g of glints) g.el.remove();
    glints = loom.orbits().map((orbit) => {
      const el = document.createElement("span");
      el.className = "hion-glint";
      el.dataset.hue = orbit.hue;
      layer.append(el);
      const ys = orbit.points.map((p) => p[1]);
      return {
        hue: orbit.hue,
        path: new Path(orbit.points, 4),
        key: orbit.key,
        top: Math.min(...ys),
        bottom: Math.max(...ys),
        el,
        s: 0,
        v: orbit.hue === "c" ? 0.075 : 0.05,
        shown: false,
      };
    });
    intents = [];
    measureAims();
    loops = [];
    rows = [];
    for (const holder of page.querySelectorAll<HTMLElement>("[data-cord]")) {
      const items = [...holder.querySelectorAll<HTMLElement>("[data-hang]")].filter(
        (item) => item.closest("[data-cord]") === holder && item.offsetParent !== null,
      );
      if (!items.length) continue;
      const hl = offset(holder)[0];
      const ys = items.map((item) => {
        const hang = parseFloat(item.style.getPropertyValue("--hion-hang")) || 0;
        return offset(item)[1] - hang;
      });
      rows.push({
        holder,
        items,
        y: Math.min(...ys),
        l: hl,
        r: hl + holder.offsetWidth,
        last: 0,
      });
    }
  }

  /* ---------- Dust ---------- */

  function dust(x: number, y: number, hue: Hue, count: number, spread = 1) {
    for (let k = 0; k < count; k++) {
      if (motes.length >= 160) motes.shift();
      const a = rand() * Math.PI * 2;
      const sp = (0.02 + rand() * 0.07) * spread;
      motes.push({
        x: x + (rand() - 0.5) * 6,
        y: y + (rand() - 0.5) * 6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.02,
        age: 0,
        life: 900 + rand() * 1100,
        hue,
        pale: rand() < 0.25,
        size: 1 + rand() * 1.3,
      });
    }
  }

  /* ---------- Loops: cyan ties a loop round something ---------- */

  function loopPath(box: { l: number; t: number; r: number; b: number }, from: Pt, pad: number, seed: number): Pt[] {
    const cx = (box.l + box.r) / 2;
    const cy = (box.t + box.b) / 2;
    const rx = (box.r - box.l) / 2 + pad;
    const ry = (box.b - box.t) / 2 + pad;
    // Long low things get a rounded-oblong loop rather than a vast ellipse.
    const n = rx / ry > 2.2 || ry / rx > 2.2 ? 3.2 : 2;
    const r = rng(seed);
    const start = Math.atan2((from[1] - cy) / ry, (from[0] - cx) / rx);
    const turns = 1.05 + r() * 0.08;
    const out: Pt[] = [];
    const steps = Math.max(40, Math.round((rx + ry) / 4));
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const a = start + u * turns * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const wob = 1 + Math.sin(u * Math.PI * 4 + seed) * 0.03 + (u - 0.5) * 0.05;
      out.push([
        cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx * wob,
        cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry * wob,
      ]);
    }
    return out;
  }

  function tie(el: Element | null, box: { l: number; t: number; r: number; b: number }, from: Pt, pad: number) {
    const pts = loopPath(box, from, pad, Math.floor(rand() * 1000));
    const path = new Path(pts, 3);
    const total = path.length;
    const marks = thread(path, {
      hue: "c",
      w: 2.3,
      seed: 300 + Math.floor(rand() * 500),
      glow: 0,
      wobble: 0.5,
      key: [0, total],
    });
    const loop: Loop = { el, path, marks, total, progress: 0, state: "tying", holdUntil: Infinity, head: pts[0] };
    loops.push(loop);
    return loop;
  }

  function untie(el: Element | null) {
    for (const loop of loops) if (loop.el === el && loop.state !== "untying") loop.state = "untying";
  }

  function hoverPad(el: Element) {
    if (el.matches(".hion-prose a, .hion-foot__mail a")) return 7;
    if (el.matches(".hion-strung, .hion-tie")) return 12;
    if (el.matches(".hion-picture, .hion-work")) return 20;
    return 14;
  }

  function enter(el: Element) {
    if (hovered === el) return;
    if (hovered) untie(hovered);
    hovered = el;
    const r = el.getBoundingClientRect();
    hoverBox = { l: r.left - pageLeft, t: r.top - pageTop, r: r.right - pageLeft, b: r.bottom - pageTop };
    tie(el, hoverBox, [pointer.x, pointer.y], hoverPad(el));
    wake();
  }

  function leave() {
    if (!hovered) return;
    untie(hovered);
    hovered = null;
    hoverBox = null;
    wake();
  }

  /* ---------- Rows: brushing a cord ---------- */

  function ripple(row: Row, x: number, dir: number, now: number) {
    if (now - row.last < 900) return;
    row.last = now;
    for (const item of row.items) {
      const b = item.getBoundingClientRect();
      const cx = b.left - pageLeft + b.width / 2;
      const delay = Math.abs(cx - x) / 1.3;
      const a = (2.6 + rand() * 1.2) * dir;
      item.animate(
        [
          { rotate: "0deg" },
          { rotate: `${a}deg`, offset: 0.2 },
          { rotate: `${-a * 0.55}deg`, offset: 0.48 },
          { rotate: `${a * 0.25}deg`, offset: 0.74 },
          { rotate: "0deg" },
        ],
        { duration: 1300, delay, easing: "ease-in-out", composite: "add" },
      );
    }
  }

  function chime(charm: Element) {
    const list = charm.closest(".hion-nav__list");
    if (!list) return;
    const all = [...list.querySelectorAll<HTMLElement>(".hion-charm")];
    const at = all.indexOf(charm as HTMLElement);
    all.forEach((other, i) => {
      if (i === at) return;
      const d = Math.abs(i - at);
      const a = 1.6 / d;
      other.animate(
        [
          { rotate: "0deg" },
          { rotate: `${a}deg`, offset: 0.25 },
          { rotate: `${-a * 0.6}deg`, offset: 0.55 },
          { rotate: "0deg" },
        ],
        { duration: 900, delay: 70 * d, easing: "ease-in-out", composite: "add" },
      );
    });
  }

  /* ---------- Plucks and runners ---------- */

  function pluckAt(x: number, y: number) {
    const reach = loom.reach();
    let best: { hue: Hue; s: number; d: number; x: number; y: number } | null = null;
    for (const hue of ["c", "m"] as Hue[]) {
      const strand = strands[hue];
      const hit = strand?.nearest(x, y, 80, reach);
      if (hit && (!best || hit.d < best.d)) best = { hue, s: hit.s, d: hit.d, x: strand!.xs[hit.i], y: strand!.ys[hit.i] };
    }
    if (!best) return false;
    plucks.push({ hue: best.hue, s: best.s, age: 0 });
    dust(best.x, best.y, best.hue, 12, 1.4);
    return true;
  }

  function run(hue: Hue, s: number, both: boolean, v = 0.9, span = 340) {
    const strand = strands[hue];
    if (!strand) return;
    runners.push({ hue, s, v, to: Math.min(strand.total, s + span), age: 0 });
    if (both) runners.push({ hue, s, v: -v, to: Math.max(0, s - span), age: 0 });
  }

  /* ---------- Easter eggs ---------- */

  function visibleSpan(strand: Strand, reach: number): [number, number] | null {
    const top = -pageTop;
    const bottom = top + innerHeight;
    let s0 = Infinity;
    let s1 = -Infinity;
    for (let i = 0; i < strand.ys.length; i += 4) {
      if (strand.keys[i] > reach) break;
      if (strand.ys[i] >= top && strand.ys[i] <= bottom) {
        s0 = Math.min(s0, strand.ls[i]);
        s1 = Math.max(s1, strand.ls[i]);
      }
    }
    return s1 - s0 > 200 ? [s0, s1] : null;
  }

  function egg(now: number) {
    const reach = loom.reach();
    if (rand() < 0.5) {
      // A chase: magenta sets off down the page, cyan tears after it.
      const m = strands.m && visibleSpan(strands.m, reach);
      const c = strands.c && visibleSpan(strands.c, reach);
      if (!m || !c) return false;
      runners.push({ hue: "m", s: m[0], v: 0.42, to: m[1], age: 0 });
      runners.push({ hue: "c", s: c[0], v: 0.95, to: c[1], age: -500 });
    } else {
      // Each ties a small knot of its own, holds it, and lets it go.
      let any = false;
      (["c", "m"] as Hue[]).forEach((hue, i) => {
        const strand = strands[hue];
        const span = strand && visibleSpan(strand, reach);
        if (!strand || !span) return;
        const s = span[0] + (0.2 + rand() * 0.6) * (span[1] - span[0]);
        const [x, y] = strand.at(s);
        const loop = tie(null, { l: x - 9, t: y - 9, r: x + 9, b: y + 9 }, [x, y], 6 + i * 3);
        loop.holdUntil = now + 1500 + i * 500;
        for (const mark of loop.marks) mark.hue = hue;
        any = true;
      });
      if (!any) return false;
    }
    lastEgg = now;
    return true;
  }

  /* ---------- Intents: threads from the pointer ---------- */

  /** Where the things are that intents go to (page px). */
  function measureAims() {
    const p = page.getBoundingClientRect();
    aims = [];
    for (const el of page.querySelectorAll(AIMS)) {
      const r = el.getBoundingClientRect();
      // Too small to go round, or so big the way round would be a frame.
      if (r.width < 4 || r.height < 4 || r.width > 640 || r.height > 420) continue;
      aims.push({ l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top });
      if (aims.length >= 240) break;
    }
  }

  const gap = (b: Box, x: number, y: number) =>
    Math.hypot(Math.max(b.l - x, 0, x - b.r), Math.max(b.t - y, 0, y - b.b));

  /** Send a thread of intent out from (x, y) to the nearest thing it can
   * find that no other is already going to. */
  function issue(x: number, y: number, now: number) {
    if (intents.length >= INTENTS) return;
    let box: Box | null = null;
    let best = SEEK;
    for (const b of aims) {
      const d = gap(b, x, y);
      if (d < 18 || d >= best) continue;
      if (intents.some((it) => it.box === b)) continue;
      best = d;
      box = b;
    }
    let on: Intent["on"] = null;
    let target: Pt | null = null;
    if (box) target = [Math.max(box.l, Math.min(box.r, x)), Math.max(box.t, Math.min(box.b, y))];
    else {
      // Nothing near: the hions' own way, if it is.
      const reach = loom.reach();
      for (const hue of ["c", "m"] as Hue[]) {
        const hit = strands[hue]?.nearest(x, y, best, reach);
        if (hit && hit.d > 24 && hit.d < best) {
          best = hit.d;
          on = { hue, s: hit.s };
          target = [strands[hue]!.xs[hit.i], strands[hue]!.ys[hit.i]];
        }
      }
    }
    if (!target) return;
    const rand = rng(Math.floor(now * 7 + x * 13 + y));
    intentHue = intentHue === "c" ? "m" : "c";
    // Out at a slant, so it comes round in a drawn curve, not a beeline.
    const a = Math.atan2(target[1] - y, target[0] - x) + (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.4);
    intents.push({ hue: intentHue, pts: [x, y], a, box, on, round: null, at: 0, owed: 0, crept: 0, alpha: 1, rand });
    lastIntent = now;
    wake();
  }

  /** The way round a thing: a loose band at a little distance, its corners
   * cut (no right angles), from where the thread arrives, part way round
   * in the sense it was going. */
  function roundBox(b: Box, x: number, y: number, a: number, rand: () => number): Pt[] {
    const pad = 10 + rand() * 6;
    const l = b.l - pad;
    const t = b.t - pad;
    const r = b.r + pad;
    const btm = b.b + pad;
    const c = Math.min(26, (r - l) / 3, (btm - t) / 3);
    const ring: Pt[] = [
      [l + c, t], [r - c, t], [r, t + c], [r, btm - c], [r - c, btm], [l + c, btm], [l, btm - c], [l, t + c],
    ];
    // Where on the ring it arrives, and which way it goes on.
    let start = 0;
    let bd = Infinity;
    ring.forEach(([px, py], i) => {
      const d = Math.hypot(px - x, py - y);
      if (d < bd) {
        bd = d;
        start = i;
      }
    });
    const [nx, ny] = ring[(start + 1) % 8];
    const forward = (nx - x) * Math.cos(a) + (ny - y) * Math.sin(a) >= 0 ? 1 : -1;
    const corners: Pt[] = [];
    const count = 3 + Math.floor(rand() * 4);
    for (let k = 0; k <= count; k++) {
      const [px, py] = ring[(((start + k * forward) % 8) + 8) % 8];
      corners.push([px + (rand() - 0.5) * 6, py + (rand() - 0.5) * 6]);
    }
    // Each side bows out a little, loose, never ruled.
    const cx = (b.l + b.r) / 2;
    const cy = (b.t + b.b) / 2;
    const out: Pt[] = [corners[0]];
    for (let k = 1; k < corners.length; k++) {
      const [ax, ay] = corners[k - 1];
      const [bx, by] = corners[k];
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const d = Math.hypot(mx - cx, my - cy) || 1;
      const bow = 3 + rand() * 5;
      out.push([mx + ((mx - cx) / d) * bow, my + ((my - cy) / d) * bow], [bx, by]);
    }
    return out;
  }

  /** The way along a hion: crossing it back and forth, over and under, in
   * taut stitches. */
  function roundStrand(on: { hue: Hue; s: number }, rand: () => number): Pt[] {
    const strand = strands[on.hue];
    if (!strand) return [];
    const dir = rand() < 0.5 ? -1 : 1;
    const span = 80 + rand() * 80;
    const out: Pt[] = [];
    for (let k = 0, u = 0; u <= span; k++, u += 22) {
      const [x, y, nx, ny] = strand.at(on.s + dir * u);
      const side = k % 2 ? 5 : -5;
      out.push([x + nx * side, y + ny * side]);
    }
    return out;
  }

  /** One frame of an intent: creep toward its thing, then weave round it,
   * then fade. */
  function grow(it: Intent, dt: number) {
    if (it.round && it.at >= it.round.length) {
      it.alpha = Math.max(0, it.alpha - dt / 900);
      return;
    }
    it.owed = Math.min(12, it.owed + (CREEP * dt) / 1000 / 4);
    while (it.owed >= 1) {
      it.owed--;
      const n = it.pts.length;
      const x = it.pts[n - 2];
      const y = it.pts[n - 1];
      if (it.round) {
        // Along the way round, a stitch at a time.
        const [tx, ty] = it.round[it.at];
        const d = Math.hypot(tx - x, ty - y);
        if (d <= 4) {
          it.pts.push(tx, ty);
          it.at++;
          if (it.at >= it.round.length) return;
        } else it.pts.push(x + ((tx - x) / d) * 4, y + ((ty - y) / d) * 4);
        continue;
      }
      // Creeping: toward its target, turning no faster than a drawn curve,
      // with a little looseness.
      const target: Pt = it.box
        ? [Math.max(it.box.l - 12, Math.min(it.box.r + 12, x)), Math.max(it.box.t - 12, Math.min(it.box.b + 12, y))]
        : (strands[it.on!.hue]?.at(it.on!.s).slice(0, 2) as Pt) ?? [x, y];
      const dx = target[0] - x;
      const dy = target[1] - y;
      if (Math.hypot(dx, dy) < 6) {
        it.round = it.box ? roundBox(it.box, x, y, it.a, it.rand) : roundStrand(it.on!, it.rand);
        it.at = 0;
        continue;
      }
      let turn = Math.atan2(dy, dx) - it.a;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      const max = 0.12;
      it.a += Math.max(-max, Math.min(max, turn)) + (it.rand() - 0.5) * 0.06;
      it.pts.push(x + Math.cos(it.a) * 4, y + Math.sin(it.a) * 4);
      it.crept += 4;
      if (it.crept > REACH) {
        // Never got there: let it go.
        it.round = [];
        it.at = 0;
        return;
      }
    }
  }

  /** The box (canvas css px) all intents lie in, padded. */
  function intentsBox(): Box | null {
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    for (const it of intents) {
      for (let i = 0; i < it.pts.length; i += 2) {
        l = Math.min(l, it.pts[i]);
        r = Math.max(r, it.pts[i]);
        t = Math.min(t, it.pts[i + 1]);
        b = Math.max(b, it.pts[i + 1]);
      }
    }
    if (l === Infinity) return null;
    return { l: l + pageLeft - 14, t: t + pageTop - 14, r: r + pageLeft + 14, b: b + pageTop + 14 };
  }

  function paintIntent(it: Intent) {
    if (!pats) return;
    const { pts } = it;
    const n = pts.length / 2;
    if (n < 2) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = pats[it.hue];
    ctx.lineWidth = 1.9;
    // Loose: its oldest part already faint, the newest bright.
    const bands = 6;
    for (let k = 0; k < bands; k++) {
      const i0 = Math.floor(((n - 1) * k) / bands);
      const i1 = Math.floor(((n - 1) * (k + 1)) / bands);
      if (i1 <= i0) continue;
      ctx.globalAlpha = it.alpha * (0.45 + (0.55 * (k + 1)) / bands);
      ctx.beginPath();
      ctx.moveTo(pts[i0 * 2], pts[i0 * 2 + 1]);
      for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!it.round || it.at < it.round.length) spark(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1], it.hue, 0.85 * it.alpha, 7);
  }

  /* ---------- The loop ---------- */

  function alive() {
    return (
      motes.length > 0 ||
      plucks.length > 0 ||
      runners.length > 0 ||
      loops.length > 0 ||
      intents.length > 0 ||
      (pointer.here && rests < 2) ||
      Math.abs(sway) > 0.02 ||
      Math.abs(swayV) > 0.002 ||
      glints.some((g) => g.shown)
    );
  }

  function wake() {
    if (!frame && !options.isIdle()) frame = requestAnimationFrame(tick);
  }

  function tick(now: number) {
    frame = 0;
    if (options.isIdle()) return;
    const dt = Math.min(48, now - (last || now));
    last = now;
    measure();
    sync();
    const reach = loom.reach();
    let draw = false;

    /* Sway: everything hung swings with the scroll, and settles. */
    if (Math.abs(sway) > 0.001 || Math.abs(swayV) > 0.0005) {
      swayV += (-sway * 0.00028 - swayV * 0.0036) * dt;
      sway += swayV * dt;
      if (Math.abs(sway) < 0.02 && Math.abs(swayV) < 0.0005) {
        sway = 0;
        swayV = 0;
      }
      // In tenths of a degree: finer is not seen, and each change restyles.
      swing(sway ? `${Math.max(-5, Math.min(5, sway)).toFixed(1)}deg` : "");
    }

    /* Glints ride the circles. */
    const viewTop = -pageTop;
    const viewBottom = viewTop + innerHeight;
    for (const g of glints) {
      const show = g.key <= reach && g.bottom > viewTop && g.top < viewBottom && !document.hidden;
      if (show !== g.shown) {
        g.shown = show;
        g.el.dataset.state = show ? "on" : "";
      }
      if (!show) continue;
      g.s = (g.s + g.v * dt) % g.path.length;
      const [x, y] = g.path.at(g.s);
      g.el.style.transform = `translate(${(x + pageLeft).toFixed(1)}px, ${(y + pageTop).toFixed(1)}px)`;
    }

    /* Intents creep, weave and fade; a pointer at rest sends one or two. */
    if (fine && pointer.here && now - pointer.at > 700 && rests < 2 && now - lastIntent > 1100) {
      rests++;
      issue(pointer.x, pointer.y, now);
    }
    if (intents.length) {
      draw = true;
      for (const it of intents) grow(it, dt);
      intents = intents.filter((it) => it.alpha > 0);
    }

    /* Loops tie and untie. */
    for (const loop of loops) {
      if (loop.state === "tying") {
        loop.progress = Math.min(loop.total, loop.progress + 2.2 * dt);
        if (loop.progress >= loop.total) loop.state = "held";
      } else if (loop.state === "held") {
        if (now >= loop.holdUntil) loop.state = "untying";
      } else {
        loop.progress -= 3.2 * dt;
      }
    }
    loops = loops.filter((loop) => loop.progress > 0);
    if (loops.length) draw = true;

    /* Motes fall. */
    if (motes.length) {
      draw = true;
      for (const m of motes) {
        m.age += dt;
        m.vy += 0.00011 * dt;
        m.vx *= Math.pow(0.996, dt);
        m.x += m.vx * dt + Math.sin((m.age + m.size * 100) / 180) * 0.05;
        m.y += m.vy * dt;
      }
      motes = motes.filter((m) => m.age < m.life);
    }

    /* Plucks ring down. */
    if (plucks.length) {
      draw = true;
      for (const p of plucks) p.age += dt;
      plucks = plucks.filter((p) => p.age < 950);
    }

    /* Runners run. */
    if (runners.length) {
      draw = true;
      for (const r of runners) {
        r.age += dt;
        if (r.age < 0) continue;
        r.s += r.v * dt;
      }
      runners = runners.filter((r) => (r.v > 0 ? r.s < r.to : r.s > r.to));
    }

    /* Draw: only near the pointer when only intents are out. */
    if (draw) {
      const near = !loops.length && !motes.length && !plucks.length && !runners.length ? intentsBox() : null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (near && (drawnBox || !canvasDirty)) {
        for (const b of [drawnBox, near]) if (b) ctx.clearRect(b.l, b.t, b.r - b.l, b.b - b.t);
      } else ctx.clearRect(0, 0, cw, ch);
      drawnBox = near;
      ctx.setTransform(dpr, 0, 0, dpr, pageLeft * dpr, pageTop * dpr);
      paintAll();
      canvasDirty = true;
    } else if (canvasDirty) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvasDirty = false;
      drawnBox = null;
    }

    if (alive()) frame = requestAnimationFrame(tick);
    else last = 0;
  }

  function paintAll() {
    if (!pats) return;
    const reach = loom.reach();

    for (const it of intents) paintIntent(it);

    for (const loop of loops) {
      const hue = loop.marks[0]?.hue ?? "c";
      halo(loop.path, 0, Math.min(loop.progress, loop.total), hue, 0.8);
      for (const m of loop.marks) {
        if (m.key > loop.progress) break;
        paint(ctx, m, pats);
      }
      // The hand, where the loop is being tied or untied.
      if (loop.state !== "held") {
        let head: Pt | null = null;
        for (const m of loop.marks) {
          if (m.key > loop.progress) break;
          if (m.kind === Kind.Stroke) head = [m.pts[m.pts.length - 2], m.pts[m.pts.length - 1]];
        }
        if (head) {
          loop.head = head;
          spark(head[0], head[1], loop.marks[0]?.hue ?? "c", 0.8, 6);
        }
      }
    }

    for (const p of plucks) {
      const strand = strands[p.hue];
      if (!strand) continue;
      const half = 84;
      const decay = Math.exp(-p.age / 300);
      // It rings where it lies: a standing wave of light along the string
      // itself, its bright bellies breathing in and out. Nothing moves off
      // the thread, so no second copy of it shows.
      const breath = Math.abs(Math.sin(p.age / 52)) * decay;
      const core = `rgb(${RGB[p.hue === "c" ? "cl" : "ml"].join(" ")})`;
      const light = `rgb(${RGB[p.hue].join(" ")})`;
      ctx.lineCap = "round";
      const step = 0.05;
      for (let u = -1; u < 1; u += step) {
        // Two bellies either side of the pluck, fading toward the ends.
        const belly = Math.abs(Math.sin((u + 1) * Math.PI)) * Math.cos((u * Math.PI) / 2);
        const a = breath * belly;
        if (a < 0.03) continue;
        const [x0, y0] = strand.at(p.s + u * half);
        const [x1, y1] = strand.at(p.s + (u + step) * half);
        if (Math.abs(y1 - y0) + Math.abs(x1 - x0) > 60) continue;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.globalAlpha = 0.2 * a;
        ctx.lineWidth = 12;
        ctx.strokeStyle = light;
        ctx.stroke();
        ctx.globalAlpha = 0.85 * a;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = core;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    for (const r of runners) {
      if (r.age < 0) continue;
      const strand = strands[r.hue];
      if (!strand) continue;
      const trail = 64 * Math.sign(r.v);
      const rgb = RGB[r.hue === "c" ? "cl" : "ml"].join(" ");
      ctx.lineCap = "round";
      ctx.lineWidth = 2.6;
      for (let k = 0; k < 6; k++) {
        const s0 = r.s - (trail * k) / 6;
        const s1 = r.s - (trail * (k + 1)) / 6;
        if (!strand.drawnAt(s0, reach)) continue;
        const [x0, y0] = strand.at(s0);
        const [x1, y1] = strand.at(s1);
        if (Math.abs(y1 - y0) + Math.abs(x1 - x0) > 60) continue;
        ctx.globalAlpha = 0.85 * (1 - k / 6);
        ctx.strokeStyle = `rgb(${rgb})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      const [x, y] = strand.at(r.s);
      spark(x, y, r.hue, 1, 11);
      ctx.globalAlpha = 1;
    }

    for (const m of motes) {
      const life = 1 - m.age / m.life;
      ctx.globalAlpha = Math.min(1, life * 1.6) * 0.85;
      ctx.fillStyle = `rgb(${RGB[m.pale ? (m.hue === "c" ? "cl" : "ml") : m.hue].join(" ")})`;
      ctx.fillRect(m.x, m.y, m.size, m.size);
    }
    ctx.globalAlpha = 1;
  }

  /** The soft light a thread gives off: two wide faint passes under it. */
  function halo(path: Path, from: number, to: number, hue: Hue, alpha: number) {
    if (to - from < 4) return;
    ctx.beginPath();
    for (let s = from; s <= to; s += 6) {
      const [x, y] = path.at(s);
      if (s === from) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const [ex, ey] = path.at(to);
    ctx.lineTo(ex, ey);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgb(${RGB[hue].join(" ")})`;
    ctx.globalAlpha = 0.11 * alpha;
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.globalAlpha = 0.18 * alpha;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** A point of light: the bright heart of a thread. */
  function spark(x: number, y: number, hue: Hue, alpha: number, r: number) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r);
    const [cr, cg, cb] = RGB[hue];
    const [lr, lg, lb] = RGB[hue === "c" ? "cl" : "ml"];
    halo.addColorStop(0, `rgba(${lr},${lg},${lb},${alpha})`);
    halo.addColorStop(0.35, `rgba(${cr},${cg},${cb},${alpha * 0.55})`);
    halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* ---------- Input ---------- */

  function onMove(event: PointerEvent) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const now = performance.now();
    lastInput = now;
    measure();
    const x = event.clientX - pageLeft;
    const y = event.clientY - pageTop;
    const dt = Math.max(8, now - pointer.at);
    if (pointer.here) {
      pointer.vx = (x - pointer.x) / dt;
      pointer.vy = (y - pointer.y) / dt;
      pointer.speed = Math.hypot(pointer.vx, pointer.vy);
    }
    if (pointer.here) travelled += Math.hypot(x - pointer.x, y - pointer.y);
    pointer.x = x;
    pointer.y = y;
    pointer.at = now;
    pointer.here = true;
    rests = 0;
    sync();
    // Moving sends threads of intent out, every so far; too quick, none.
    if (fine && travelled > 150 && now - lastIntent > 240 && pointer.speed < 2.4) {
      travelled = 0;
      issue(x, y, now);
    }
    const reach = loom.reach();
    // A finger along the thread sends light running down it.
    for (const hue of ["c", "m"] as Hue[]) {
      const strand = strands[hue];
      if (!strand || now - touched[hue] < 1100) continue;
      const hit = strand.nearest(x, y, 11, reach);
      if (hit) {
        touched[hue] = now;
        run(hue, hit.s, true);
      }
    }
    // Brushing the cord a row hangs from.
    for (const row of rows) {
      if (Math.abs(y - row.y) < 9 && x > row.l - 24 && x < row.r + 24 && pointer.speed > 0.05) {
        ripple(row, x, pointer.vx >= 0 ? 1 : -1, now);
      }
    }
    wake();
  }

  function onOver(event: PointerEvent) {
    if (!fine) return;
    const target = (event.target as Element).closest(HOVER);
    if (!target || !page.contains(target)) return;
    if (target.hasAttribute("data-reveal") && !target.hasAttribute("data-lit")) return;
    enter(target);
  }

  function onOut(event: PointerEvent) {
    if (!hovered) return;
    const to = event.relatedTarget as Node | null;
    if (to && hovered.contains(to)) return;
    if ((event.target as Element).closest(HOVER) !== hovered) return;
    leave();
  }

  function onDown(event: PointerEvent) {
    lastInput = performance.now();
    measure();
    const x = event.clientX - pageLeft;
    const y = event.clientY - pageTop;
    sync();
    const target = event.target as Element;
    const cord = target.closest<HTMLElement>(".hion-pullcord, .hion-charm, .hion-pull, .hion-tag, .hion-end");
    if (cord) {
      // Tugging a cord shakes dust off its knot.
      const b = cord.getBoundingClientRect();
      const hue: Hue = cord.dataset.hue === "m" ? "m" : "c";
      const kx = cord.matches(".hion-pullcord") ? b.left - pageLeft + 6 : b.left - pageLeft + b.width / 2;
      const ky = cord.matches(".hion-pullcord") ? b.top - pageTop + b.height / 2 : b.top - pageTop;
      dust(kx, ky, hue, 9, 1.2);
      dust(kx, ky, hue === "c" ? "m" : "c", 4, 1.2);
      wake();
      return;
    }
    if (target.closest("a, button, input, textarea, select")) return;
    // On touch, a tap is the source: a pair of intents from there.
    if (event.pointerType === "touch") {
      issue(x, y, performance.now());
      issue(x, y, performance.now() + 1);
    }
    if (pluckAt(x, y)) wake();
  }

  function onScroll() {
    const now = performance.now();
    lastInput = now;
    const dy = scrollY - lastScroll;
    lastScroll = scrollY;
    swayV += Math.max(-0.22, Math.min(0.22, dy * 0.0007));
    if (hovered) leave();
    wake();
  }

  function onLeave() {
    pointer.here = false;
    leave();
    wake();
  }

  options.onIdleChange((idle) => {
    if (!idle) wake();
  });

  // Left alone, the threads amuse themselves. Rarely.
  const eggs = window.setInterval(() => {
    const now = performance.now();
    if (options.isIdle() || document.hidden || !strands.c) return;
    if (now - lastInput < 14000 || now - lastEgg < 30000 || rand() > 0.3) return;
    if (egg(now)) wake();
  }, 4000);

  return {
    start() {
      size();
      measure();
      sync();
      addEventListener("pointermove", onMove, { passive: true, signal });
      addEventListener("pointerdown", onDown, { passive: true, signal });
      world.addEventListener("pointerover", onOver, { signal });
      world.addEventListener("pointerout", onOut, { signal });
      document.addEventListener("pointerleave", onLeave, { signal });
      addEventListener("scroll", onScroll, { passive: true, signal });
      addEventListener("resize", () => { size(); measureAims(); wake(); }, { signal });
      if (fine) {
        world.addEventListener(
          "pointerenter",
          (event) => {
            const charm = event.target as Element;
            if (charm.matches?.(".hion-nav__list .hion-charm")) chime(charm);
          },
          { capture: true, signal },
        );
      }
      signal.addEventListener("abort", () => {
        clearInterval(eggs);
        cancelAnimationFrame(frame);
        frame = 0;
        layer.remove();
        swing("");
      });
      wake();
    },
    /** The page is leaving: everything alive lets go. */
    release() {
      layer.dataset.state = "leaving";
      leave();
    },
  };
}
