/** Route: how a branch travels from where it leaves to what it goes to.
 *
 * Pure geometry. Every travel is a curve that leaves along the way it is
 * going and arrives going the way the next thing is written (or the way
 * into a fork's hub), bowed over or under a little, weighed by its length
 * and by how much of it would cross words (all but never). */
import type { Pt } from "./pastel";

/** Clear paper at a point (px): under 5 is words. */
export type Clear = (x: number, y: number) => number;

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, step = 6): Pt[] {
  const d = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) + Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
  const n = Math.max(6, Math.ceil(d / step));
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

/** What a travel costs: its length, and a great deal for each stretch of
 * it over words (not its first and last bits, which leave and arrive
 * beside words), and a little for leaving the screen's sides. */
function cost(pts: Pt[], clear: Clear, width: number): { cost: number; len: number } {
  const n = pts.length;
  const along = new Float32Array(n);
  for (let k = 1; k < n; k++) along[k] = along[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  const len = along[n - 1];
  let blocked = 0;
  let off = 0;
  for (let k = 1; k < n; k++) {
    // Only where it sets off and arrives beside words is it let off.
    if (along[k] > 16 && len - along[k] > 16 && clear(pts[k][0], pts[k][1]) < 5) blocked++;
    if (pts[k][0] < 4 || pts[k][0] > width - 4) off++;
  }
  return { cost: len + blocked * 150 + off * 300, len };
}

/** A travel from a point going `d0` to a point arriving going `d1`, bowed
 * over or under a little (the least crossing of the bows tried, a wide bow
 * only when a shallow one would cross a good deal of words: a calm line
 * rather than one that leaps round everything). */
export function travel(a: Pt, d0: Pt, b: Pt, d1: Pt, clear: Clear, width: number): { pts: Pt[]; cost: number } {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const k = Math.min(120, Math.max(20, d * 0.35));
  let best: { pts: Pt[]; cost: number } | null = null;
  for (const lift of [0, -1, 1, -2, 2]) {
    const h = lift * Math.max(24, Math.min(90, d * 0.14));
    const pts = cubic([a[0], a[1]], [a[0] + d0[0] * k, a[1] + d0[1] * k + h], [b[0] - d1[0] * k, b[1] - d1[1] * k + h], [b[0], b[1]]);
    const c = cost(pts, clear, width);
    const total = c.cost + Math.abs(lift) * 60;
    if (!best || total < best.cost) best = { pts, cost: total };
    // Clear of every word and on the page: no bow will do better.
    if (c.cost <= c.len + 0.5) break;
  }
  return best!;
}
