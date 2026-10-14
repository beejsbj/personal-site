/** Fate: how a thread of intent finds its way across a page.
 *
 * Pure geometry, no DOM: threads.ts lays the page in and paints what grows.
 *
 * A thread grows only from its head. It holds a heading with a slight bow
 * (the tension of a taut thread), and only at a moment of decision turns:
 * when a run is spent, when words are ahead, when it reaches a place it
 * meant to pass, or when it meets another thread at a slant. Then it weighs
 * a fan of headings, never more than 48 degrees off its own unless it must
 * get round content: open paper ahead, room either side of the way, the
 * bearing to where it means to go, and the company of a thread nearby (it
 * falls in alongside, a lane apart, so threads run together in bundles).
 * The turn is drawn, a curve eased in and out (its curvature changes a
 * little each step, never jumps, so a run and a turn meet without a
 * corner), and the turning over its last few hundred pixels is limited, so
 * it never comes round on itself. Between turns it meanders a little, a
 * slow drift either side of its bow, like a thread laid by hand rather
 * than ruled. Where it crosses another, one goes under (a short break).
 *
 * Every thread on the screen is in the same index (skein.ts): the hions
 * are fixed company (fix()), so threads fall in alongside them; threads
 * steered by something else (one from the pointer, winding round a
 * heading) grow by extend(), and can be handed back to fate to run on.
 *
 * Where a thread means to go is planned for it (plan()): most pass through
 * a gather, a lane in the most open place of a stretch of the page, so
 * several converge there and part again; a few are lone and run off into
 * the distance. Everything is deterministic for a seed and a layout. */

import { type Hue, type Pt, rng } from "./pastel";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const wrap = (a: number) => {
  a %= TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
};

/** How far a head grows in one step (px). */
export const STEP = 5;
/** Spatial hash cell for thread points (px). */
const CELL = 40;
/** Clear paper a head keeps from held ground (px). */
const MARGIN = 8;

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Where content keeps the paper clear: a coarse mask and the distance to
 * it, in cells. */
export class Ground {
  readonly w: number;
  readonly h: number;
  private dist: Uint8Array;
  constructor(
    readonly width: number,
    readonly height: number,
    readonly G = 8,
  ) {
    this.w = Math.max(1, Math.ceil(width / G));
    this.h = Math.max(1, Math.ceil(height / G));
    this.dist = new Uint8Array(this.w * this.h).fill(255);
  }
  hold(b: Box, mx = 0, my = 0) {
    const { G, w } = this;
    const x0 = Math.max(0, Math.floor((b.l - mx) / G));
    const x1 = Math.min(w - 1, Math.floor((b.r + mx) / G));
    const y0 = Math.max(0, Math.floor((b.t - my) / G));
    const y1 = Math.min(this.h - 1, Math.floor((b.b + my) / G));
    if (x1 < x0) return;
    for (let y = y0; y <= y1; y++) this.dist.fill(0, y * w + x0, y * w + x1 + 1);
  }
  /** Chamfer distance to held cells, capped (call once, after holding). */
  finish() {
    const { w, h, dist } = this;
    const CAP = 60;
    for (let i = 0; i < w * h; i++) dist[i] = dist[i] === 0 ? 0 : CAP;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let d = dist[i];
        if (x > 0 && dist[i - 1] + 1 < d) d = dist[i - 1] + 1;
        if (y > 0 && dist[i - w] + 1 < d) d = dist[i - w] + 1;
        dist[i] = d;
      }
    }
    for (let y = h - 1; y >= 0; y--) {
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        let d = dist[i];
        if (x < w - 1 && dist[i + 1] + 1 < d) d = dist[i + 1] + 1;
        if (y < h - 1 && dist[i + w] + 1 < d) d = dist[i + w] + 1;
        dist[i] = d;
      }
    }
  }
  /** Clear paper at a point (px): 0 on held ground; off the page is open. */
  clear(x: number, y: number) {
    const cx = Math.floor(x / this.G);
    const cy = Math.floor(y / this.G);
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return 480;
    return this.dist[cy * this.w + cx] * this.G;
  }
  /** How far a ray runs clear (px), up to max. */
  ray(x: number, y: number, a: number, max: number, margin = 10) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (let d = 8; d <= max; d += 8) {
      if (this.clear(x + c * d, y + s * d) < margin) return d - 8;
    }
    return max;
  }
}

export interface Gather {
  x: number;
  y: number;
  r: number;
  /** The way threads run through it. */
  axis: number;
}

export interface Seed {
  x: number;
  y: number;
  a: number;
  hue: Hue;
  /** How long it may grow (px). */
  len: number;
  /** Where it means to go, in order. */
  goals: Pt[];
  /** A lone thread keeps no company. */
  lone?: boolean;
  /** Keeps no company for this far after it is born (px). */
  free?: number;
  /** May pass held ground for this far after it is born (px): a thread
   * that starts beside the words, leaving them. */
  grace?: number;
  /** How much it meanders (1 is a ground thread's). */
  wander?: number;
  seed: number;
  /** Reveal key: born when the hions' drawing reaches this page y. */
  key: number;
}

export interface Thread {
  id: number;
  hue: Hue;
  xs: number[];
  ys: number[];
  /** Segments (point i to i + 1) that pass under another: not drawn. */
  under: Set<number>;
  done: boolean;
  /** Faded away: no longer company for others. */
  gone: boolean;
  a: number;
  len: number;
  lone: boolean;
  free: number;
  rand: () => number;
  bow: number;
  runLeft: number;
  turnTo: number | null;
  turns: number[];
  turned: number;
  joined: number;
  goals: Pt[];
  goal: number;
  /** Its curvature now (radians a step): eased toward what it wants. */
  k: number;
  /** The phase and strength of its meander. */
  phase: number;
  wander: number;
  grace: number;
  /** Company only: drawn by something else (a hion), never steps, never
   * goes under. */
  fixed: boolean;
}

interface Near {
  d: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  id: number;
  fixed: boolean;
}

export class Fate {
  threads: Thread[] = [];
  private grid = new Map<number, number[]>();
  private nextId = 0;
  private byId = new Map<number, Thread>();

  constructor(readonly ground: Ground) {}

  add(seed: Seed) {
    const rand = rng(seed.seed);
    const t: Thread = {
      id: this.nextId++,
      hue: seed.hue,
      xs: [seed.x],
      ys: [seed.y],
      under: new Set(),
      done: false,
      gone: false,
      a: seed.a,
      len: seed.len,
      lone: !!seed.lone,
      free: seed.free ?? 0,
      rand,
      bow: 0,
      runLeft: 0,
      turnTo: null,
      turns: [],
      turned: 0,
      joined: -1,
      goals: seed.goals,
      goal: 0,
      k: 0,
      phase: rand() * 100,
      wander: seed.wander ?? 1,
      grace: seed.grace ?? 0,
      fixed: false,
    };
    this.newRun(t);
    this.threads.push(t);
    this.byId.set(t.id, t);
    this.index(t, 0);
    return t;
  }

  /** A thread drawn by something else (a hion): company for the rest,
   * already whole. Points closer than a step are skipped. */
  fix(hue: Hue, points: Pt[]) {
    const t = this.add({ x: points[0]?.[0] ?? 0, y: points[0]?.[1] ?? 0, a: 0, hue, len: 0, goals: [], seed: 1, key: 0 });
    t.fixed = true;
    t.done = true;
    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i];
      const n = t.xs.length - 1;
      if (Math.abs(x - t.xs[n]) + Math.abs(y - t.ys[n]) < STEP) continue;
      t.xs.push(x);
      t.ys.push(y);
      this.index(t, n + 1);
    }
    return t;
  }

  /** A thread that is no one's company: drawn whole and soon taken back
   * (a loop tied round something while it is hovered). Not indexed. */
  bare(hue: Hue, points: Pt[]): Thread {
    const t = this.add({ x: points[0][0], y: points[0][1], a: 0, hue, len: 0, goals: [], seed: 7, key: 0 });
    this.threads.pop();
    this.byId.delete(t.id);
    const k = this.key(t.xs[0], t.ys[0]);
    this.grid.get(k)?.pop();
    for (let i = 1; i < points.length; i++) {
      t.xs.push(points[i][0]);
      t.ys.push(points[i][1]);
    }
    t.done = true;
    return t;
  }

  /** Grow a thread by a point something else chose (its head is steered
   * from outside: the pointer's, winding round a heading). It still goes
   * over and under what it crosses, and is company. */
  extend(t: Thread, x: number, y: number) {
    const n = t.xs.length - 1;
    const px = t.xs[n];
    const py = t.ys[n];
    if (x === px && y === py) return;
    this.cross(t, px, py, x, y);
    t.a = Math.atan2(y - py, x - px);
    t.xs.push(x);
    t.ys.push(y);
    this.index(t, n + 1);
  }

  /** Hand a thread back to fate from where it is: it runs on toward these
   * goals for this much further. */
  resume(t: Thread, goals: Pt[], further: number, grace = 40) {
    t.done = false;
    t.goals = goals;
    t.goal = 0;
    t.len = (t.xs.length - 1) * STEP + further;
    t.free = 0;
    t.grace = (t.xs.length - 1) * STEP + grace;
    t.turns = [];
    t.turned = 0;
    t.turnTo = null;
    t.k = 0;
    t.joined = -1;
    this.newRun(t);
  }

  /** Forget threads that have faded away (they are no company). */
  sweep() {
    const kept = this.threads.filter((t) => !t.gone);
    if (kept.length === this.threads.length) return;
    this.threads = kept;
    this.byId = new Map(kept.map((t) => [t.id, t]));
    this.grid.clear();
    for (const t of kept) for (let i = 0; i < t.xs.length; i++) this.index(t, i);
  }

  private key(x: number, y: number) {
    return Math.floor(x / CELL) * 100003 + Math.floor(y / CELL);
  }

  private index(t: Thread, i: number) {
    const k = this.key(t.xs[i], t.ys[i]);
    const v = t.id * 65536 + i;
    const b = this.grid.get(k);
    if (b) b.push(v);
    else this.grid.set(k, [v]);
  }

  /** The nearest point of another thread within r, and its direction. */
  private near(t: Thread, x: number, y: number, r: number): Near | null {
    let best = r * r;
    let hit: Near | null = null;
    const c0 = Math.floor((x - r) / CELL);
    const c1 = Math.floor((x + r) / CELL);
    const r0 = Math.floor((y - r) / CELL);
    const r1 = Math.floor((y + r) / CELL);
    for (let cx = c0; cx <= c1; cx++) {
      for (let cy = r0; cy <= r1; cy++) {
        const b = this.grid.get(cx * 100003 + cy);
        if (!b) continue;
        for (const v of b) {
          const id = Math.floor(v / 65536);
          if (id === t.id) continue;
          const o = this.byId.get(id);
          if (!o || o.gone) continue;
          const i = v % 65536;
          const dx = o.xs[i] - x;
          const dy = o.ys[i] - y;
          const d = dx * dx + dy * dy;
          if (d >= best) continue;
          best = d;
          const j = Math.min(o.xs.length - 1, i + 1);
          const k = Math.max(0, j - 2);
          const ex = o.xs[j] - o.xs[k];
          const ey = o.ys[j] - o.ys[k];
          const el = Math.hypot(ex, ey) || 1;
          hit = { d: Math.sqrt(d), x: o.xs[i], y: o.ys[i], dx: ex / el, dy: ey / el, id, fixed: o.fixed };
        }
      }
    }
    return hit;
  }

  private newRun(t: Thread) {
    t.runLeft = 140 + t.rand() * 320;
    // The slight bow of a taut thread: a little curvature, one way, a run.
    t.bow = (t.rand() - 0.5) * 0.5 * DEG;
  }

  /** The bearing to where it means to go next, passing goals it reached. */
  private bearing(t: Thread, x: number, y: number) {
    while (t.goal < t.goals.length) {
      const [gx, gy] = t.goals[t.goal];
      const dx = gx - x;
      const dy = gy - y;
      const d = Math.hypot(dx, dy);
      if (d < 48 || (d < 160 && dx * Math.cos(t.a) + dy * Math.sin(t.a) < 0)) {
        t.goal++;
        t.joined = -1;
        continue;
      }
      return Math.atan2(dy, dx);
    }
    return null;
  }

  private steer(t: Thread, x: number, y: number) {
    t.runLeft -= STEP;
    let decide = t.runLeft <= 0;
    const ahead = this.ground.ray(x, y, t.a, 64);
    if (ahead < 64 && t.turnTo === null) decide = true;
    const goal = t.goal;
    const b = this.bearing(t, x, y);
    if (t.goal !== goal) decide = true;
    // Strayed well off its way: think again.
    if (b !== null && t.turnTo === null && t.runLeft < 100 && Math.abs(wrap(b - t.a)) > 50 * DEG) decide = true;
    let n: Near | null = null;
    if (!t.lone && (t.xs.length - 1) * STEP > t.free) {
      n = this.near(t, x, y, 70);
      if (n && n.id !== t.joined && t.turnTo === null) {
        const s = Math.abs(n.dx * Math.cos(t.a) + n.dy * Math.sin(t.a));
        // Meeting another at a slant: fall in beside it.
        if (s > 0.6 && s < 0.985) decide = true;
      }
    }
    if (decide) {
      const r = t.rand;
      let best = -Infinity;
      let pick = t.a;
      // Turns are drawn, never sharp: up to 48 degrees at a time, more only
      // to get round content.
      const wide = ahead < 64 ? 6 : 4;
      for (let k = -wide; k <= wide; k++) {
        const turn = k * 12 * DEG;
        const a = t.a + turn;
        // Never round on itself.
        if (Math.abs(t.turned + turn) > 100 * DEG) continue;
        const clear = this.ground.ray(x, y, a, 240) / 240;
        // Keep off the words' edges: a thread skimming a box draws the box.
        let room = 0;
        for (const d of [24, 56, 96]) room += Math.min(40, this.ground.clear(x + Math.cos(a) * d, y + Math.sin(a) * d));
        let score = clear * 3 + (room / 120) * 1.2 - Math.abs(turn) * 0.25 + r() * 0.3;
        if (b !== null) score += Math.cos(wrap(a - b)) * 1.3;
        if (n) {
          // A hion is company too, a little less keenly kept, a lane
          // further off.
          const keen = n.fixed ? 0.8 : 1;
          const along = Math.abs(n.dx * Math.cos(a) + n.dy * Math.sin(a));
          score += along * 1.4 * keen * (1 - n.d / 70);
          if (n.d > (n.fixed ? 26 : 16)) score += (((n.x - x) * Math.cos(a) + (n.y - y) * Math.sin(a)) / n.d) * 0.35 * keen;
        }
        if (k && clear < 0.2) score -= 2;
        if (score > best) {
          best = score;
          pick = a;
        }
      }
      if (n) t.joined = n.id;
      t.turnTo = Math.abs(wrap(pick - t.a)) > DEG ? pick : null;
      this.newRun(t);
    }
    // What it wants to turn by this step: its drift (the bow and a slow
    // meander), or a drawn turn. Its curvature eases toward that a little
    // each step, never jumps; a turn eases out so it ends on its heading.
    const at = t.xs.length;
    let want = t.bow + (Math.sin(at * 0.09 + t.phase) * 0.35 + Math.sin(at * 0.017 + t.phase * 2.3) * 0.12) * DEG * t.wander;
    let ramp = 0.5 * DEG;
    if (t.turnTo !== null) {
      const left = wrap(t.turnTo - t.a);
      const urgent = ahead < 40;
      ramp = (urgent ? 3 : 1.4) * DEG;
      const max = (urgent ? 10 : 7) * DEG;
      // As fast as it can still ease out of by the time it is round.
      want = Math.sign(left) * Math.min(max, Math.sqrt(2 * ramp * Math.abs(left)) * 0.92);
      if (Math.abs(left) < 0.8 * DEG && Math.abs(t.k) < ramp) t.turnTo = null;
    }
    t.k += Math.max(-ramp, Math.min(ramp, want - t.k));
    return t.k;
  }

  /** Grow a thread one step from its head. False once it has finished. */
  step(t: Thread) {
    if (t.done || t.fixed) return false;
    const n = t.xs.length - 1;
    const x = t.xs[n];
    const y = t.ys[n];
    let turn = this.steer(t, x, y);
    if (t.goals.length && t.goal >= t.goals.length) {
      t.done = true;
      return false;
    }
    // Never into content: the turn, or harder either way, or stop. (Unless
    // it is still leaving the words it started beside.)
    const g = this.ground;
    let ok = n * STEP < t.grace;
    for (const extra of ok ? [] : [0, 8, -8, 16, -16, 26, -26, 40, -40]) {
      const a = t.a + turn + extra * DEG;
      if (g.clear(x + Math.cos(a) * STEP * 2, y + Math.sin(a) * STEP * 2) >= MARGIN) {
        turn += extra * DEG;
        ok = true;
        break;
      }
    }
    if (!ok) {
      t.done = true;
      return false;
    }
    t.a = wrap(t.a + turn);
    t.turns.push(turn);
    t.turned += turn;
    if (t.turns.length > 110) t.turned -= t.turns.shift()!;
    const nx = x + Math.cos(t.a) * STEP;
    const ny = y + Math.sin(t.a) * STEP;
    this.cross(t, x, y, nx, ny);
    t.xs.push(nx);
    t.ys.push(ny);
    this.index(t, n + 1);
    const out = nx < -40 || ny < -40 || nx > g.width + 40 || ny > g.height + 40;
    if (out || n * STEP >= t.len || n >= 65000) t.done = true;
    return !t.done;
  }

  /** Threads that went under another since asked: [thread, segment]. */
  breaks: [Thread, number][] = [];

  /** Crossing another: one goes over, one under (a short break in it). */
  private cross(t: Thread, ax: number, ay: number, bx: number, by: number) {
    const b = this.grid.get(this.key(bx, by));
    if (!b) return;
    for (const v of b) {
      const id = Math.floor(v / 65536);
      if (id === t.id) continue;
      const o = this.byId.get(id);
      const i = v % 65536;
      // A hion lies over every thread anyway (the loom is above the ground).
      if (!o || o.gone || o.fixed || i + 1 >= o.xs.length) continue;
      const cx = o.xs[i];
      const cy = o.ys[i];
      const dx = o.xs[i + 1];
      const dy = o.ys[i + 1];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (!den) continue;
      const s = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
      const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (s < 0 || s > 1 || u < 0 || u > 1) continue;
      const n = t.xs.length - 1;
      if (((t.id * 7 + id * 13 + i) & 1) === 0) {
        t.under.add(n - 1).add(n).add(n + 1);
      } else {
        for (const k of [i - 1, i, i + 1]) {
          if (k < 0 || o.under.has(k)) continue;
          o.under.add(k);
          this.breaks.push([o, k]);
        }
      }
    }
  }
}

/* ---------- Planning a page ---------- */

interface PlanOptions {
  width: number;
  height: number;
  /** Where the hions come down from the line (page px), if known. */
  drop: number;
  /** Below the line: where threads may start. */
  top: number;
  seed: number;
  /** A screen seen close: fewer threads. */
  close: boolean;
}

/** The gathers of a page: the most open place in each stretch of it,
 * leaning to the middle, so threads converge where there is room. */
export function gathers(ground: Ground, o: PlanOptions): Gather[] {
  const rand = rng(o.seed * 101 + 7);
  const { width: W, height: H } = o;
  const band = W < 720 ? 1100 : 820;
  const out: Gather[] = [];
  for (let y0 = o.top + 140; y0 < H - 200; y0 += band) {
    let best = 0;
    let bx = 0;
    let by = 0;
    for (let y = y0; y < Math.min(H - 100, y0 + band); y += 16) {
      for (let x = W * 0.18; x < W * 0.82; x += 16) {
        const c = Math.min(ground.clear(x, y), 200) - Math.abs(x - W / 2) * 0.12 + rand() * 6;
        if (c > best) {
          best = c;
          bx = x;
          by = y;
        }
      }
    }
    if (best > 40) {
      out.push({ x: bx, y: by, r: Math.min(280, 140 + best * 1.2), axis: Math.PI / 2 + (rand() - 0.5) * 70 * DEG });
    }
  }
  return out;
}

/** Where a thread born at (x, y) heading a means to go: through the lane
 * of a gather below it (unless lone), on through the waist the way it came
 * in, then fanning out to somewhere far. */
export function goalsFor(all: Gather[], x: number, y: number, a: number, lone: boolean, r: () => number): Pt[] {
  const goals: Pt[] = [];
  const g = lone
    ? undefined
    : all
        .filter((g) => g.y > y + 120 && g.y < y + 1300)
        .sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y))[0];
  let ax = x;
  let ay = y;
  // With nowhere to gather, it leans down the page (down the margins,
  // past the words), not across it.
  let dir = a + wrap(Math.PI / 2 - a) * 0.55 + (r() - 0.5) * 30 * DEG;
  if (g && r() < 0.85) {
    const lane = (r() - 0.5) * 2 * 22;
    const gx = g.x - Math.sin(g.axis) * lane;
    const gy = g.y + Math.cos(g.axis) * lane;
    const into = Math.atan2(gy - y, gx - x);
    const axis = Math.cos(into - g.axis) >= 0 ? g.axis : g.axis + Math.PI;
    goals.push([gx, gy]);
    ax = gx + Math.cos(axis) * 90;
    ay = gy + Math.sin(axis) * 90;
    goals.push([ax, ay]);
    dir = axis + (r() - 0.5) * 70 * DEG;
  }
  const far = 900 + r() * 1400;
  goals.push([ax + Math.cos(dir) * far, ay + Math.sin(dir) * far]);
  return goals;
}

/** A page's threads: a fan from where the hions come down, and threads in
 * from either edge down the page (cyan-leaning left, magenta-leaning
 * right), each born as the drawing reaches it. */
export function plan(ground: Ground, o: PlanOptions) {
  const all = gathers(ground, o);
  const rand = rng(o.seed * 31 + 3);
  const { width: W, height: H } = o;
  const narrow = W < 720;
  const seeds: Seed[] = [];
  // Clear of the way the hions themselves come down (straight below).
  const fan = o.close ? [-48, -26, 28, 50] : narrow ? [-40, -22, 22, 40] : [-66, -50, -34, -22, 24, 36, 52, 68];
  const down = Math.PI / 2;
  fan.forEach((d, i) => {
    const s = o.seed * 977 + i;
    const r = rng(s);
    const a = down + d * DEG;
    const lone = i === 0 || i === fan.length - 1;
    seeds.push({
      x: o.drop + d * 0.5,
      y: o.top,
      a,
      hue: i % 2 ? "m" : "c",
      len: 1400 + r() * 1800,
      seed: s,
      key: o.top + i * 30,
      lone,
      free: 240,
      goals: goalsFor(all, o.drop, o.top, a, lone, r),
    });
  });
  let k = 0;
  const gap = (narrow ? 520 : 380) * (o.close ? 1.4 : 1);
  for (let y = o.top + 180; y < H - 120; y += gap) {
    for (const side of [0, 1]) {
      if (rand() < 0.3) continue;
      const tilt = (14 + rand() * 40) * DEG;
      const hue: Hue = side ? (rand() < 0.72 ? "m" : "c") : rand() < 0.72 ? "c" : "m";
      const yy = y + rand() * 160;
      const lone = rand() < 0.22;
      const a = side ? Math.PI - tilt : tilt;
      const s = o.seed * 31 + ++k * 7;
      seeds.push({
        x: side ? W + 6 : -6,
        y: yy,
        a,
        hue,
        len: 900 + rand() * 1800,
        seed: s,
        key: yy - 260 + rand() * 120,
        lone,
        goals: goalsFor(all, side ? W : 0, yy, a, lone, rng(s)),
      });
    }
  }
  return { gathers: all, seeds: seeds.sort((a, b) => a.key - b.key) };
}
