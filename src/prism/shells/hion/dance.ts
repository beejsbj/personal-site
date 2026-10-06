/** The dance: two hions, each its own creature.
 *
 * Down the page there is no cord, only a line of travel (the route
 * through the screen's stations), and two threads that keep company
 * along it without being tied to it. Cyan is quick and restless: a short
 * stride, a tight sway, and every so often it throws a loop. Magenta is
 * slow and wide: long swings, few curls, a lazier arc. Their strides never
 * match, so they cross, part and cross again where they please, closing in
 * only where the route asks them to meet (the openings of loops, the line
 * at the top) and spreading out where the page gives them room.
 *
 * Everything here is geometry; pastel.ts lays it down. */
import { knot, type Mark, Path, type Pt, rng, thread, type Hue } from "./pastel";

/** Smooth 1D value noise in [0, 1]. */
function noise(seed: number) {
  const rand = rng(seed);
  const values = Array.from({ length: 97 }, rand);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = values[((i % 97) + 97) % 97];
    const b = values[(((i + 1) % 97) + 97) % 97];
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}

export interface Temper {
  /** Length of one sway, px. */
  stride: number;
  /** How far it strays from the line of travel, px. */
  reach: number;
  /** How readily it throws a loop, 0..1. */
  curl: number;
  /** Line weight. */
  weight: number;
  seed: number;
}

export const TEMPER: Record<Hue, Temper> = {
  c: { stride: 170, reach: 36, curl: 0.95, weight: 3.1, seed: 7 },
  m: { stride: 360, reach: 74, curl: 0.45, weight: 4.1, seed: 19 },
};

/** One thread's path along a line of travel. `scale` shrinks the dance on
 * narrow pages; it fades to nothing at both ends of the run, so the two
 * threads meet wherever a run starts or ends. */
export function dancer(
  centre: Path,
  hue: Hue,
  opts: { scale?: number; seed?: number; meetStart?: boolean; meetEnd?: boolean } = {},
): Pt[] {
  const temper = TEMPER[hue];
  const seed = temper.seed * 31 + (opts.seed ?? 0);
  const sway = noise(seed);
  const drift = noise(seed + 101);
  const loopy = noise(seed + 211);
  const scale = opts.scale ?? 1;
  const total = centre.length;
  const out: Pt[] = [];
  if (total < 2) return out;
  const ramp = Math.min(150, total / 3);
  let theta = hue === "c" ? 0.4 : Math.PI + 0.9;
  const step = 3;
  for (let s = 0; s <= total; s += step) {
    const [x, y, nx, ny] = centre.at(s);
    const inRamp = opts.meetStart === false ? 1 : Math.min(1, s / ramp);
    const outRamp = opts.meetEnd === false ? 1 : Math.min(1, (total - s) / ramp);
    const env = smooth(Math.min(inRamp, outRamp));
    // Its own pace: the stride stretches and shortens as it goes.
    theta += ((Math.PI * 2) / temper.stride) * (0.65 + 0.7 * sway(s / 260)) * step;
    const amp = temper.reach * scale * env * (0.55 + 0.9 * drift(s / 340));
    const lateral = Math.sin(theta) * amp;
    // Now and then the swing carries it back on itself: a loop.
    const looping = Math.max(0, loopy(s / 230) - (1 - temper.curl * 0.6)) * 2.6;
    const along = Math.cos(theta) * amp * looping * env;
    // Tangent from the normal (nx, ny) = (-ty, tx).
    out.push([x + nx * lateral + ny * along, y + ny * lateral - nx * along]);
  }
  const [ex, ey] = centre.at(total);
  out.push([ex, ey]);
  return out;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** A thread's detour round something it passes: in from where it is, once
 * round (a little more), and back out to carry on. */
export function orbit(
  path: Pt[],
  box: { l: number; t: number; r: number; b: number },
  dir: 1 | -1,
  seed: number,
  pad: [number, number] = [34, 30],
): { points: Pt[]; from: number; to: number } | null {
  const cx = (box.l + box.r) / 2;
  const cy = (box.t + box.b) / 2;
  const at = path.findIndex(([, y]) => y >= cy - (box.b - box.t) * 0.15);
  if (at < 1) return null;
  const rand = rng(seed);
  const rx = (box.r - box.l) / 2 + pad[0];
  const ry = (box.b - box.t) / 2 + pad[1];
  const [px, py] = path[at];
  const start = Math.atan2((py - cy) / ry, (px - cx) / rx);
  const tilt = (rand() - 0.5) * 0.18;
  const turns = 1.1 + rand() * 0.15;
  const loop: Pt[] = [];
  const steps = 120;
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const a = start + dir * u * turns * Math.PI * 2;
    // Not a compass circle: it swells and tightens as the hand goes round.
    const wobble = 1 + Math.sin(u * Math.PI * 3 + seed) * 0.05 + (u - 0.5) * 0.06;
    const ex = Math.cos(a) * rx * wobble;
    const ey = Math.sin(a) * ry * wobble;
    loop.push([cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
  }
  const points = [...path.slice(0, at), ...loop, ...path.slice(at)];
  return { points, from: at, to: at + loop.length };
}

/** A loose curl: a thread falling and looping on itself, smaller each
 * turn, like the end of a ribbon. `dir` sends it left or right. */
export function curl(x: number, y: number, dir: 1 | -1, length: number, seed: number, turns = 2.2): Pt[] {
  const rand = rng(seed);
  const out: Pt[] = [];
  const steps = 90;
  const speed = length / (turns * Math.PI * 2);
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const theta = u * turns * Math.PI * 2;
    const shrink = 1 - u * 0.65;
    const r = length * 0.16 * shrink * (0.9 + rand() * 0.04);
    out.push([
      x + dir * (r * (1 - Math.cos(theta)) + u * length * 0.18),
      y + speed * theta - r * 1.35 * Math.sin(theta),
    ]);
  }
  return out;
}

/** Reveal keys along a list of points: the page height the thread has
 * reached so far (so a loop is drawn round in order, not top-down), with
 * detours spread over their own height. */
export function journeyKeys(points: Pt[], detours: { from: number; to: number }[] = []) {
  const lens = [0];
  for (let i = 1; i < points.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const keys = new Float64Array(points.length);
  let high = -Infinity;
  for (let i = 0; i < points.length; i++) {
    high = Math.max(high, points[i][1]);
    keys[i] = high;
  }
  for (const { from, to } of detours) {
    const k0 = keys[Math.max(0, from - 1)];
    let lowest = k0;
    for (let i = from; i < to; i++) lowest = Math.max(lowest, points[i][1]);
    const k1 = Math.max(k0 + 10, lowest + 60);
    const span = lens[to - 1] - lens[from] || 1;
    for (let i = from; i < to; i++) keys[i] = k0 + ((lens[i] - lens[from]) / span) * (k1 - k0);
    for (let i = to; i < points.length; i++) keys[i] = Math.max(keys[i], k1);
  }
  const keyAt = (s: number) => {
    let lo = 0;
    let hi = lens.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lens[mid] <= s) lo = mid;
      else hi = mid;
    }
    return keys[lo];
  };
  return { keyAt, keys, lens };
}

/** Where a tassel would hang: the two hions instead, falling from one knot
 * and parting in two loose curls, one each way. */
export function pendant(
  x: number,
  y: number,
  length: number,
  seed: number,
  opts: { key?: number } = {},
): Mark[] {
  const out: Mark[] = [];
  const key = opts.key ?? y;
  (["c", "m"] as Hue[]).forEach((hue, i) => {
    const dir = i ? 1 : -1;
    const pts = curl(x, y, dir as 1 | -1, length * (i ? 1 : 0.85), seed + i * 17, i ? 1.4 : 1.8);
    out.push(
      ...thread(new Path(pts, 2), {
        hue,
        w: i ? 2.6 : 2.2,
        seed: seed * 3 + i,
        key: [key, key + length],
        glow: 0.26,
        wobble: 0.4,
      }),
    );
  });
  out.push(...knot(x, y, 4.5, seed + 5, key));
  return out;
}
