/** Route: how one line goes out of its way to write words and come back.
 *
 * Pure geometry. A hion's composed way down a screen (weave.ts, dance.ts)
 * is its journey; everything it writes is a leg off it: it leaves the
 * journey at a point, travels to the first word of a group (a heading, a
 * row of tags), writes it, arcs over or under to the next and writes that,
 * and comes back to the journey a little further on (or, past the end of
 * the journey, simply ends there). A picture is rung round rather than
 * written. Every travel is a curve that leaves along the way it is going
 * and arrives going the way the next thing is written, weighed by its
 * length and by how much of it would cross words (all but never). */
import type { Pt } from "./pastel";

/** A run of points with the way it goes at each end. */
export interface Piece {
  pts: Pt[];
}

/** A leg off a journey: it leaves at journey index `at`, runs `pts`, and
 * comes back at journey index `back` (-1: it ends there). `marks` are the
 * ranges of `pts` that are a word's letters or a ring (written at a hand's
 * pace; the rest is travel, brisk), with which piece each is. */
export interface Leg {
  at: number;
  back: number;
  pts: Pt[];
  marks: { from: number; to: number; piece: number }[];
}

export interface Journey {
  xs: ArrayLike<number>;
  ys: ArrayLike<number>;
}

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

const unit = (dx: number, dy: number): Pt => {
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};

/** The way a run goes at its start, and at its end. */
function dirs(pts: Pt[]): { start: Pt; end: Pt } {
  const n = pts.length - 1;
  const k = Math.min(n, 3);
  return {
    start: unit(pts[k][0] - pts[0][0], pts[k][1] - pts[0][1]),
    end: unit(pts[n][0] - pts[n - k][0], pts[n][1] - pts[n - k][1]),
  };
}

/** What a travel costs: its length, and a great deal for each stretch of
 * it over words (not its first and last bits, which leave and arrive
 * beside words), and a little for leaving the screen's sides. */
function cost(pts: Pt[], clear: Clear, width: number) {
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
  return len + blocked * 900 + off * 300;
}

/** A travel from a point going `d0` to a point arriving going `d1`, bowed
 * over or under (the least crossing of the bows tried). */
export function travel(a: Pt, d0: Pt, b: Pt, d1: Pt, clear: Clear, width: number): { pts: Pt[]; cost: number } {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const k = Math.min(160, Math.max(24, d * 0.4));
  let best: { pts: Pt[]; cost: number } | null = null;
  for (const lift of [0, -1, 1, -2, 2, -3, 3, -4.5, 4.5]) {
    const h = lift * Math.max(28, d * 0.18);
    const pts = cubic([a[0], a[1]], [a[0] + d0[0] * k, a[1] + d0[1] * k + h], [b[0] - d1[0] * k, b[1] - d1[1] * k + h], [b[0], b[1]]);
    const c = cost(pts, clear, width) + Math.abs(lift) * 20;
    if (!best || c < best.cost) best = { pts, cost: c };
  }
  return best!;
}

/** A leg off a journey to write a group of pieces (each a word's way, or a
 * ring), in order, leaving at or after journey index `from`. Null if
 * nothing on the journey is near enough to reach it from. */
export function leg(j: Journey, from: number, pieces: Piece[], clear: Clear, width: number, reach = 900): Leg | null {
  const n = j.xs.length;
  if (!pieces.length || n < 4) return null;
  const first = pieces[0].pts;
  const last = pieces[pieces.length - 1].pts;
  const f = dirs(first);
  const l = dirs(last);
  const along = (i: number): Pt => {
    const a = Math.max(0, i - 3);
    const b = Math.min(n - 1, i + 3);
    return unit(j.xs[b] - j.xs[a], j.ys[b] - j.ys[a]);
  };
  // Where it leaves: the best point of the journey from `from` on.
  let out: { i: number; pts: Pt[]; cost: number } | null = null;
  const lo = Math.max(1, from);
  for (let i = lo; i < n - 1; i += 3) {
    const x = j.xs[i];
    const y = j.ys[i];
    const d = Math.hypot(first[0][0] - x, first[0][1] - y);
    if (d > reach || (out && d > out.cost)) continue;
    // A journey that leaves the page for a stretch (a track) is no way.
    if (Math.abs(j.xs[i + 1] - x) + Math.abs(j.ys[i + 1] - y) > 60) continue;
    const t = travel([x, y], along(i), first[0], f.start, clear, width);
    // Later is dearer: the line should not wait to write what it passes.
    const c = t.cost + (i - lo) * 0.4;
    if (!out || c < out.cost) out = { i, pts: t.pts, cost: c };
  }
  if (!out) return null;
  const pts: Pt[] = out.pts.slice(0, -1);
  const marks: Leg["marks"] = [];
  pieces.forEach((piece, p) => {
    if (p > 0) {
      const prev = pieces[p - 1].pts;
      const t = travel(prev[prev.length - 1], dirs(prev).end, piece.pts[0], dirs(piece.pts).start, clear, width);
      pts.push(...t.pts.slice(1, -1));
    }
    const from = pts.length;
    pts.push(...piece.pts);
    marks.push({ from, to: pts.length - 1, piece: p });
  });
  // Where it comes back: the best point of the journey after it left,
  // weighing what of the journey it would leave out.
  const end = last[last.length - 1];
  let back: { i: number; pts: Pt[]; cost: number } | null = null;
  let skipped = 0;
  for (let i = out.i + 2; i < n - 1; i += 3) {
    skipped += Math.hypot(j.xs[i] - j.xs[i - 3], j.ys[i] - j.ys[i - 3]);
    const x = j.xs[i];
    const y = j.ys[i];
    const d = Math.hypot(end[0] - x, end[1] - y);
    if (d > reach) {
      if (back && skipped > back.cost) break;
      continue;
    }
    if (Math.abs(j.xs[i + 1] - x) + Math.abs(j.ys[i + 1] - y) > 60) continue;
    const t = travel(end, l.end, [x, y], along(i), clear, width);
    const c = t.cost + skipped * 0.6;
    if (!back || c < back.cost) back = { i, pts: t.pts, cost: c };
    if (skipped > 2400) break;
  }
  if (back) pts.push(...back.pts.slice(1, -1));
  return { at: out.i, back: back ? back.i : -1, pts, marks };
}

/** Add a group to a leg that ends the line (it does not come back): on
 * from where it ended. */
export function extend(end: Leg, pieces: Piece[], clear: Clear, width: number): Leg {
  const pts = end.pts.slice();
  const marks = end.marks.slice();
  let prev = pts;
  const base = end.marks.length ? Math.max(...end.marks.map((m) => m.piece)) + 1 : 0;
  pieces.forEach((piece, p) => {
    const t = travel(prev[prev.length - 1], dirs(prev).end, piece.pts[0], dirs(piece.pts).start, clear, width);
    pts.push(...t.pts.slice(1, -1));
    const from = pts.length;
    pts.push(...piece.pts);
    marks.push({ from, to: pts.length - 1, piece: base + p });
    prev = piece.pts;
  });
  return { at: end.at, back: -1, pts, marks };
}
