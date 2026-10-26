/** Wind: the ways a thread goes round a thing on the page.
 *
 * Pure geometry (the words' boxes are read by wordBoxes, the rest is
 * points). A thread that arrives at a heading weaves through its words:
 * over one, down through the gap, under the next, up through the next
 * gap, a line at a time and back along the next; the layer it is drawn on
 * lies under the words, so where it passes a letter it goes behind it. A
 * thread that arrives at a picture or a charm goes round it in a loose
 * band (corners cut, sides bowed). One that arrives at a hion stitches
 * back and forth across it. Every way is smoothed (a Catmull-Rom curve
 * through its points) and resampled at an even step, so a head can follow
 * it at a steady pace. */
import { type Pt, rng } from "./pastel";

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** The words of an element, line by line (page px, the page's box given),
 * at most `max` of them. Empty when it has no words to speak of. */
export function wordBoxes(el: Element, page: DOMRect, max = 14): Box[][] {
  const lines: Box[][] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let count = 0;
  for (let node = walker.nextNode(); node && count < max; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    const parent = node.parentElement;
    if (!parent || parent.closest(".hion-sr, [hidden], [aria-hidden='true']")) continue;
    for (const m of text.matchAll(/\S+/g)) {
      if (count >= max) break;
      range.setStart(node, m.index ?? 0);
      range.setEnd(node, (m.index ?? 0) + m[0].length);
      const r = [...range.getClientRects()].find((r) => r.width > 2 && r.height > 4);
      if (!r) continue;
      const box = { l: r.left - page.left, t: r.top - page.top, r: r.right - page.left, b: r.bottom - page.top };
      const line = lines.find((ln) => Math.abs((ln[0].t + ln[0].b) / 2 - (box.t + box.b) / 2) < (box.b - box.t) * 0.5);
      if (line) line.push(box);
      else lines.push([box]);
      count++;
    }
  }
  range.detach();
  for (const line of lines) line.sort((a, b) => a.l - b.l);
  return lines.sort((a, b) => a[0].t - b[0].t);
}

/** A smooth curve through points (Catmull-Rom), resampled every `step` px. */
export function smooth(points: Pt[], step = 4): Pt[] {
  if (points.length < 2) return points.slice();
  const dense: Pt[] = [];
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.ceil(len / 2));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      dense.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  dense.push(points[n - 1]);
  // Even steps along it.
  const out: Pt[] = [dense[0]];
  let carry = 0;
  for (let i = 1; i < dense.length; i++) {
    const [ax, ay] = dense[i - 1];
    const [bx, by] = dense[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (!seg) continue;
    let d = step - carry;
    while (d <= seg) {
      out.push([ax + ((bx - ax) * d) / seg, ay + ((by - ay) * d) / seg]);
      d += step;
    }
    carry = seg - (d - step);
  }
  const last = dense[dense.length - 1];
  const end = out[out.length - 1];
  if (Math.hypot(last[0] - end[0], last[1] - end[1]) > step * 0.3) out.push(last);
  return out;
}

/** Through a heading's words: in at the side nearest `from`, over a word,
 * down through the gap, under the next, and so on along the line; down at
 * its end to the next line and back along that. `words` limits how many it
 * passes (a thread from the pointer weaves a few, then lets go). The last
 * point is where it leaves, a little way past the last word. */
export function weave(lines: Box[][], from: Pt, rand: () => number, words = Infinity): Pt[] {
  if (!lines.length) return [];
  const pts: Pt[] = [];
  const first = lines[0];
  const lineMid = (ln: Box[]) => ({ l: ln[0].l, r: ln[ln.length - 1].r });
  const m = lineMid(first);
  // Start at the end of the first line nearest where it comes from.
  let rightward = Math.abs(from[0] - m.l) <= Math.abs(from[0] - m.r);
  let over = rand() < 0.5;
  let left = words;
  for (let li = 0; li < lines.length && left > 0; li++) {
    const line = rightward ? lines[li] : lines[li].slice().reverse();
    const h = Math.max(...line.map((w) => w.b - w.t));
    const pad = Math.min(9, 3 + h * 0.08);
    const dir = rightward ? 1 : -1;
    const w0 = line[0];
    const waist = (w0.t + w0.b) / 2;
    const edge = rightward ? w0.l : w0.r;
    // In beside the first word, at the waist (or down from the line above).
    pts.push([edge - dir * (10 + h * 0.25), waist + (rand() - 0.5) * h * 0.15]);
    for (let wi = 0; wi < line.length && left > 0; wi++, left--) {
      const w = line[wi];
      const mid = (w.l + w.r) / 2;
      const span = w.r - w.l;
      const y = over ? w.t - pad : w.b + pad;
      // A long word is passed in two beats, so the arc hugs it.
      if (span > h * 2.2) {
        pts.push([mid - span * 0.28, y + (rand() - 0.5) * 2], [mid + span * 0.28, y + (rand() - 0.5) * 2]);
      } else pts.push([mid, y + (rand() - 0.5) * 2]);
      const next = line[wi + 1];
      if (next && left > 1) {
        // Down (or up) through the gap between the words, upright, so it
        // passes between letters rather than across them.
        const gx = rightward ? (w.r + next.l) / 2 : (w.l + next.r) / 2;
        const top = Math.min(w.t, next.t) + h * 0.22;
        const bottom = Math.max(w.b, next.b) - h * 0.22;
        const jitter = (rand() - 0.5) * 1.5;
        if (over) pts.push([gx + jitter, top], [gx - jitter, bottom]);
        else pts.push([gx + jitter, bottom], [gx - jitter, top]);
      }
      over = !over;
    }
    const last = pts[pts.length - 1];
    const lastWord = line[Math.min(line.length - 1, Math.max(0, line.length - 1))];
    const out = rightward ? lastWord.r : lastWord.l;
    pts.push([out + dir * (10 + h * 0.25), (lastWord.t + lastWord.b) / 2 + (last[1] > waist ? 4 : -4)]);
    rightward = !rightward;
  }
  return smooth(pts, 4);
}

/** A loose band round a box: corners cut (no right angles), each side bowed
 * out a little, from where it arrives, part way or all the way round. */
export function ring(b: Box, from: Pt, heading: number, rand: () => number, sides = 3 + Math.floor(rand() * 4)): Pt[] {
  const pad = 10 + rand() * 6;
  const l = b.l - pad;
  const t = b.t - pad;
  const r = b.r + pad;
  const btm = b.b + pad;
  const c = Math.min(26, (r - l) / 3, (btm - t) / 3);
  const corners: Pt[] = [
    [l + c, t], [r - c, t], [r, t + c], [r, btm - c], [r - c, btm], [l + c, btm], [l, btm - c], [l, t + c],
  ];
  let start = 0;
  let bd = Infinity;
  corners.forEach(([px, py], i) => {
    const d = Math.hypot(px - from[0], py - from[1]);
    if (d < bd) {
      bd = d;
      start = i;
    }
  });
  const [nx, ny] = corners[(start + 1) % 8];
  const forward = (nx - from[0]) * Math.cos(heading) + (ny - from[1]) * Math.sin(heading) >= 0 ? 1 : -1;
  const cx = (b.l + b.r) / 2;
  const cy = (b.t + b.b) / 2;
  const pts: Pt[] = [from];
  for (let k = 0; k <= sides; k++) {
    const [px, py] = corners[(((start + k * forward) % 8) + 8) % 8];
    const prev = pts[pts.length - 1];
    const mx = (prev[0] + px) / 2;
    const my = (prev[1] + py) / 2;
    const d = Math.hypot(mx - cx, my - cy) || 1;
    const bow = 3 + rand() * 6;
    if (k) pts.push([mx + ((mx - cx) / d) * bow, my + ((my - cy) / d) * bow]);
    pts.push([px + (rand() - 0.5) * 6, py + (rand() - 0.5) * 6]);
  }
  return smooth(pts, 4);
}

/** Once round a box and a little more (a loop tied round it), from the
 * side nearest `from`: rounder for a compact thing, an oblong for a long
 * low one. */
export function encircle(b: Box, from: Pt, pad: number, seed: number, turns = 1.05): Pt[] {
  const cx = (b.l + b.r) / 2;
  const cy = (b.t + b.b) / 2;
  const rx = (b.r - b.l) / 2 + pad;
  const ry = (b.b - b.t) / 2 + pad;
  const n = rx / ry > 2.2 || ry / rx > 2.2 ? 3.2 : 2;
  const r = rng(seed);
  const start = Math.atan2((from[1] - cy) / ry, (from[0] - cx) / rx);
  const more = turns + r() * 0.08;
  const out: Pt[] = [];
  const steps = Math.max(40, Math.round((rx + ry) / 4));
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const a = start + u * more * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const wob = 1 + Math.sin(u * Math.PI * 4 + seed) * 0.03 + (u - 0.5) * 0.05;
    out.push([cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx * wob, cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry * wob]);
  }
  return smooth(out, 4);
}

/** Taut stitches back and forth across a hion: `at(s)` is the hion's
 * point and normal at arc length s. */
export function stitches(at: (s: number) => [number, number, number, number], s: number, rand: () => number): Pt[] {
  const dir = rand() < 0.5 ? -1 : 1;
  const span = 80 + rand() * 80;
  const out: Pt[] = [];
  for (let k = 0, u = 0; u <= span; k++, u += 22) {
    const [x, y, nx, ny] = at(s + dir * u);
    const side = k % 2 ? 6 : -6;
    out.push([x + nx * side, y + ny * side]);
  }
  return smooth(out, 4);
}
