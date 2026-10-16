/** Trace: a word's letters as one thread's way.
 *
 * Pure functions over a bitmap of the word (1 = ink). The letters are
 * thinned to their centre lines (Zhang-Suen), the centre lines read as a
 * graph (ends and junctions joined by runs), and each letter is drawn as
 * one stroke through its runs: depth first, doubling back along what it
 * has drawn where it must, and leaving near the foot of the letter when
 * that costs less than dropping from where it stands. Between letters the
 * thread runs along a line a little under their feet, straight down to it
 * and straight up from it, as a hand writes in one line; a dot (the one
 * under a "!") is a small knot tied where it sits; a mark hung high (an
 * apostrophe) is reached straight up from the line and left straight down.
 *
 * Everything is in the bitmap's pixels; the caller scales and places the
 * way on the page. */
import type { Pt } from "./pastel";

/** Zhang-Suen thinning, visiting only ink: a list of live pixels, kept
 * compact as they are cleared. */
export function thin(mask: Uint8Array, w: number, h: number): Uint8Array {
  const a = new Uint8Array(mask);
  let live: number[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (a[y * w + x]) live.push(y * w + x);
  for (let x = 0; x < w; x++) a[x] = a[(h - 1) * w + x] = 0;
  for (let y = 0; y < h; y++) a[y * w] = a[y * w + w - 1] = 0;
  const del: number[] = [];
  let changed = true;
  let guard = 200;
  while (changed && guard--) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      del.length = 0;
      for (const i of live) {
        if (!a[i]) continue;
        const p2 = a[i - w], p3 = a[i - w + 1], p4 = a[i + 1], p5 = a[i + w + 1];
        const p6 = a[i + w], p7 = a[i + w - 1], p8 = a[i - 1], p9 = a[i - w - 1];
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        let t = 0;
        if (!p2 && p3) t++;
        if (!p3 && p4) t++;
        if (!p4 && p5) t++;
        if (!p5 && p6) t++;
        if (!p6 && p7) t++;
        if (!p7 && p8) t++;
        if (!p8 && p9) t++;
        if (!p9 && p2) t++;
        if (t !== 1) continue;
        if (step === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
        del.push(i);
      }
      if (del.length) {
        changed = true;
        for (const i of del) a[i] = 0;
      }
    }
    if (changed) live = live.filter((i) => a[i]);
  }
  return a;
}

/** Neighbours of a skeleton pixel: the eight round it, but a diagonal is
 * not a neighbour where an orthogonal path between the two exists (no
 * triangles, so a line is a line). */
function neighbours(s: Uint8Array, w: number, i: number): number[] {
  const out: number[] = [];
  const u = s[i - w], d = s[i + w], l = s[i - 1], r = s[i + 1];
  if (u) out.push(i - w);
  if (s[i - w + 1] && !u && !r) out.push(i - w + 1);
  if (r) out.push(i + 1);
  if (s[i + w + 1] && !d && !r) out.push(i + w + 1);
  if (d) out.push(i + w);
  if (s[i + w - 1] && !d && !l) out.push(i + w - 1);
  if (l) out.push(i - 1);
  if (s[i - w - 1] && !u && !l) out.push(i - w - 1);
  return out;
}

/** How many neighbours a skeleton pixel has (as `neighbours` counts). */
function degree(s: Uint8Array, w: number, i: number): number {
  const u = s[i - w], d = s[i + w], l = s[i - 1], r = s[i + 1];
  return (
    u + d + l + r +
    (s[i - w + 1] && !u && !r ? 1 : 0) +
    (s[i + w + 1] && !d && !r ? 1 : 0) +
    (s[i + w - 1] && !d && !l ? 1 : 0) +
    (s[i - w - 1] && !u && !l ? 1 : 0)
  );
}

/** Take off spurs: runs from an end shorter than `max` that meet a
 * junction (thinning leaves them at corners). The border is clear. */
export function prune(skel: Uint8Array, w: number, max: number): Uint8Array {
  const s = new Uint8Array(skel);
  const n = s.length;
  const pixels: number[] = [];
  for (let i = w + 1; i < n - w - 1; i++) if (s[i]) pixels.push(i);
  const deg = new Uint8Array(n);
  for (let pass = 0; pass < 2; pass++) {
    for (const i of pixels) deg[i] = s[i] ? degree(s, w, i) : 0;
    for (const i of pixels) {
      if (!s[i] || deg[i] !== 1) continue;
      const chain = [i];
      let prev = -1;
      let cur = i;
      let junction = false;
      while (chain.length <= max) {
        const nb = neighbours(s, w, cur).filter((p) => p !== prev);
        if (nb.length !== 1) {
          junction = nb.length > 1;
          break;
        }
        if (deg[nb[0]] >= 3) {
          junction = true;
          break;
        }
        prev = cur;
        cur = nb[0];
        chain.push(cur);
      }
      if (junction && chain.length <= max) for (const c of chain) s[c] = 0;
    }
  }
  return s;
}

interface Node {
  id: number;
  x: number;
  y: number;
  members: number[];
  edges: Edge[];
}

interface Edge {
  a: Node;
  b: Node;
  /** Pixel indices from a to b. */
  pts: number[];
}

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

interface Component {
  nodes: Node[];
  edges: Edge[];
  box: Box;
}

/** The skeleton as a graph: nodes (pixels not of degree 2, merged when
 * adjacent) and edges (runs between them), by connected component. A
 * ring without a node gets one at its lowest pixel. */
export function graph(s: Uint8Array, w: number, h: number): Component[] {
  const n = w * h;
  const nbs = new Map<number, number[]>();
  for (let i = w + 1; i < n - w - 1; i++) if (s[i]) nbs.set(i, neighbours(s, w, i));
  const comp = new Int32Array(n).fill(-1);
  const comps: number[][] = [];
  for (const [i] of nbs) {
    if (comp[i] >= 0) continue;
    const id = comps.length;
    const pixels: number[] = [];
    const stack = [i];
    comp[i] = id;
    while (stack.length) {
      const p = stack.pop()!;
      pixels.push(p);
      for (const q of nbs.get(p)!) {
        if (comp[q] < 0) {
          comp[q] = id;
          stack.push(q);
        }
      }
    }
    comps.push(pixels);
  }
  const nodeOf = new Int32Array(n).fill(-1);
  const nodes: Node[] = [];
  const out: Component[] = [];
  for (const pixels of comps) {
    if (pixels.length < 3) continue;
    let nodePixels = pixels.filter((p) => nbs.get(p)!.length !== 2);
    if (!nodePixels.length) {
      let best = pixels[0];
      for (const p of pixels) {
        const py = Math.floor(p / w);
        const by = Math.floor(best / w);
        if (py > by || (py === by && p % w < best % w)) best = p;
      }
      nodePixels = [best];
    }
    const cnodes: Node[] = [];
    for (const p of nodePixels) {
      if (nodeOf[p] >= 0) continue;
      const id = nodes.length;
      const members: number[] = [];
      const stack = [p];
      nodeOf[p] = id;
      while (stack.length) {
        const q = stack.pop()!;
        members.push(q);
        for (const r of nbs.get(q)!) {
          if (nbs.get(r)!.length !== 2 && nodeOf[r] < 0) {
            nodeOf[r] = id;
            stack.push(r);
          }
        }
      }
      let sx = 0;
      let sy = 0;
      for (const m of members) {
        sx += m % w;
        sy += Math.floor(m / w);
      }
      const node: Node = { id, x: sx / members.length, y: sy / members.length, members, edges: [] };
      nodes.push(node);
      cnodes.push(node);
    }
    const used = new Set<number>();
    const edges: Edge[] = [];
    for (const node of cnodes) {
      for (const m of node.members) {
        for (const q of nbs.get(m)!) {
          if (nodeOf[q] >= 0) {
            // Two nodes touching: the shortest of edges.
            if (nodeOf[q] !== node.id) {
              const key = Math.min(m, q) * n + Math.max(m, q);
              if (used.has(key)) continue;
              used.add(key);
              const e: Edge = { a: node, b: nodes[nodeOf[q]], pts: [m, q] };
              edges.push(e);
              node.edges.push(e);
              e.b.edges.push(e);
            }
            continue;
          }
          if (used.has(q)) continue;
          const pts = [m, q];
          used.add(q);
          let prev = m;
          let cur = q;
          let end: Node | null = null;
          let guard = n;
          while (guard--) {
            const nb = nbs.get(cur)!.filter((r) => r !== prev);
            const toNode = nb.find((r) => nodeOf[r] >= 0);
            if (toNode !== undefined) {
              end = nodes[nodeOf[toNode]];
              pts.push(toNode);
              break;
            }
            const next = nb.find((r) => !used.has(r));
            if (next === undefined) break;
            used.add(next);
            pts.push(next);
            prev = cur;
            cur = next;
          }
          if (!end) continue;
          const e: Edge = { a: node, b: end, pts };
          edges.push(e);
          node.edges.push(e);
          if (end !== node) end.edges.push(e);
        }
      }
    }
    let l = Infinity;
    let r = -Infinity;
    let t = Infinity;
    let b = -Infinity;
    for (const p of pixels) {
      const x = p % w;
      const y = Math.floor(p / w);
      if (x < l) l = x;
      if (x > r) r = x;
      if (y < t) t = y;
      if (y > b) b = y;
    }
    out.push({ nodes: cnodes, edges, box: { l, t, r, b } });
  }
  return out;
}

/** One stroke through a component from `start`: depth first, preferring
 * (by `prefer`, 1 or -1) the run whose far end is higher or lower, then
 * the one that continues the heading; back along a run when stuck; done
 * once every run is drawn. Also the way back down along what it drew to
 * the lowest node it passed, should the caller want to leave from there. */
function stroke(comp: Component, start: Node, prefer: number, w: number) {
  const seen = new Set<Edge>();
  const path: number[] = [];
  const total = comp.edges.length;
  let hx = 1;
  let hy = 0;
  const push = (pts: number[]) => {
    for (const p of pts) if (path[path.length - 1] !== p) path.push(p);
    if (pts.length >= 2) {
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      const dx = (b % w) - (a % w);
      const dy = Math.floor(b / w) - Math.floor(a / w);
      const d = Math.hypot(dx, dy) || 1;
      hx = dx / d;
      hy = dy / d;
    }
  };
  const stack: { node: Node; pts: number[] }[] = [];
  let node = start;
  path.push(node.members[0]);
  for (;;) {
    let best: { far: Node; pts: number[]; e: Edge } | null = null;
    let bestScore = -Infinity;
    for (const e of node.edges) {
      if (seen.has(e)) continue;
      const far = e.a === node ? e.b : e.a;
      const pts = e.a === node ? e.pts : e.pts.slice().reverse();
      const a = pts[0];
      const b = pts[Math.min(pts.length - 1, 4)];
      const dx = (b % w) - (a % w);
      const dy = Math.floor(b / w) - Math.floor(a / w);
      const d = Math.hypot(dx, dy) || 1;
      const score = prefer * (node.y - far.y) * 2 + ((dx / d) * hx + (dy / d) * hy) * 6 + (e.a === e.b ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = { far, pts, e };
      }
    }
    if (best) {
      seen.add(best.e);
      push(best.pts);
      stack.push({ node, pts: best.pts });
      node = best.far;
      if (seen.size === total) break;
      continue;
    }
    if (!stack.length) break;
    const back = stack.pop()!;
    push(back.pts.slice().reverse());
    node = back.node;
  }
  const unwind: number[] = [];
  let lowest = node;
  let lowAt = -1;
  stack.forEach((f, k) => {
    if (f.node.y > lowest.y + 0.5) {
      lowest = f.node;
      lowAt = k;
    }
  });
  for (let k = stack.length - 1; k > lowAt; k--) unwind.push(...stack[k].pts.slice().reverse());
  return { path, unwind, end: node, lowest };
}

const length = (path: number[], w: number) => {
  let len = 0;
  for (let k = 1; k < path.length; k++) len += Math.hypot((path[k] % w) - (path[k - 1] % w), Math.floor(path[k] / w) - Math.floor(path[k - 1] / w));
  return len;
};

/** The best stroke for a letter arriving from `from` with the line at
 * `base`: the least thread, entering and leaving near its foot, and never
 * dropping from where it ends through the letter's own ink. */
function letterStroke(comp: Component, from: Pt, base: number, w: number, mask: Uint8Array, width: number): number[] {
  const cuts = (x: number, y: number) => {
    const x0 = Math.round(x);
    for (let yy = Math.round(y + width * 1.5); yy < base; yy++) if (mask[yy * w + x0]) return true;
    return false;
  };
  const starts = comp.nodes
    .slice()
    .sort((p, q) => q.y - p.y || Math.abs(p.x - from[0]) - Math.abs(q.x - from[0]))
    .slice(0, 3);
  let best: { path: number[]; score: number } | null = null;
  for (const start of starts) {
    for (const prefer of [1, -1]) {
      const { path, unwind, end, lowest } = stroke(comp, start, prefer, w);
      const entryDrop = base - start.y;
      const options = [{ path, exit: end }];
      if (unwind.length && lowest.y > end.y + 1) options.push({ path: path.concat(unwind), exit: lowest });
      for (const o of options) {
        const exitDrop = base - o.exit.y;
        const through = exitDrop > width * 2 && cuts(o.exit.x, o.exit.y);
        const score = length(o.path, w) + entryDrop * 1.2 + exitDrop * (through ? 4 : 1) + Math.abs(start.x - from[0]) * 0.3;
        if (!best || score < best.score) best = { path: o.path, score };
      }
    }
  }
  return best!.path;
}

const median = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/** Thinning eats half a stroke's width at every end: put it back, unless
 * that runs into a neighbour (the dot under a "!"). */
function extendEnds(path: Pt[], by: number, others: Box[], clear: number) {
  if (path.length < 4) return;
  const ext = (a: Pt, b: Pt): Pt => {
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    return [a[0] + ((a[0] - b[0]) / d) * by, a[1] + ((a[1] - b[1]) / d) * by];
  };
  const free = ([x, y]: Pt) => !others.some((b) => x > b.l - clear && x < b.r + clear && y > b.t - clear && y < b.b + clear);
  const head = ext(path[0], path[3]);
  const tail = ext(path[path.length - 1], path[path.length - 4]);
  if (free(head)) path.unshift(head);
  if (free(tail)) path.push(tail);
}

/** A polyline at roughly `step` spacing, ends kept. */
function decimate(pts: Pt[], step: number): Pt[] {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc >= step) {
      out.push(pts[i]);
      acc = 0;
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export interface Traced {
  /** The way, bitmap px: in from the left along the line, through every
   * letter, and out past the last. Not yet smoothed. */
  way: Pt[];
  /** The letters' stroke width, bitmap px. */
  width: number;
  /** The line the thread runs along between letters, bitmap px. */
  line: number;
}

/** Trace a word. `lead`: how far before the first letter the thread
 * begins, and `tail` how far past the last it runs (bitmap px). Null when
 * there is nothing to trace. */
export function traceWord(mask: Uint8Array, w: number, h: number, lead: number, tail: number): Traced | null {
  let ink = 0;
  for (let i = 0; i < mask.length; i++) ink += mask[i];
  if (ink < 12) return null;
  let s = thin(mask, w, h);
  let spine = 0;
  for (let i = 0; i < s.length; i++) spine += s[i];
  if (!spine) return null;
  const width = ink / spine;
  s = prune(s, w, Math.max(2, Math.round(width * 0.9)));
  const comps = graph(s, w, h).sort((a, b) => a.box.l - b.box.l);
  if (!comps.length) return null;
  const base = median(comps.map((c) => c.box.b));
  const line = base + width * 2.2;
  const pieces: { box: Box; path: Pt[] }[] = [];
  let prev: Pt = [-lead, line];
  let prevBox: Box | null = null;
  const stacked: Box[] = [];
  for (const c of comps) {
    const small = c.box.r - c.box.l < width * 2.6 && c.box.b - c.box.t < width * 2.6;
    let path: Pt[];
    if (small) {
      // A dot: a knot tied where it sits. Under a bar (a "!"), the thread
      // comes down into it from the top and leaves it at the bottom.
      const under = !!prevBox && c.box.l < prevBox.r && c.box.r > prevBox.l && c.box.t >= prevBox.b - width;
      const cx = (c.box.l + c.box.r) / 2;
      const cy = (c.box.t + c.box.b) / 2;
      const r = Math.max(width * 1.3, (c.box.r - c.box.l) / 2 + width * 0.4);
      path = [];
      const turns = under ? 1.25 : 1.075;
      const a0 = under ? -Math.PI * 0.5 : Math.PI * 0.5;
      for (let k = 0; k <= 16; k++) {
        const a = a0 + (k / 16) * Math.PI * 2 * turns;
        path.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      if (under) stacked.push(c.box);
    } else {
      path = letterStroke(c, prev, base, w, mask, width).map((p) => [p % w, Math.floor(p / w)]);
      extendEnds(
        path,
        width * 0.5,
        comps.filter((o) => o !== c).map((o) => o.box),
        width * 1.6,
      );
    }
    pieces.push({ box: c.box, path });
    prev = path[path.length - 1];
    prevBox = c.box;
  }
  // Assemble: along the line, straight up into each letter, through it,
  // straight down, and on.
  const pts: Pt[] = [];
  const push = (...ps: Pt[]) => {
    for (const p of ps) {
      const q = pts[pts.length - 1];
      if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.5) pts.push(p);
    }
  };
  const first = pieces[0].path[0];
  push([first[0] - lead, line]);
  let last: Pt | null = null;
  let lastBox: Box | null = null;
  let lastHigh = false;
  for (const piece of pieces) {
    const p0 = piece.path[0];
    const high = piece.box.b - piece.box.t < width * 3 && piece.box.b < line - width * 4;
    if (last && lastBox) {
      if (stacked.includes(piece.box)) {
        // Straight down into the knot.
      } else if (high) {
        if (last[1] < line - width) push([last[0], line]);
        push([p0[0], line], [p0[0], (p0[1] + line) / 2]);
      } else if (lastHigh) {
        push([last[0], (last[1] + line) / 2], [last[0], line]);
        if (p0[1] < line - width) push([p0[0], line]);
      } else {
        if (last[1] < line - width) push([last[0], (last[1] + line) / 2], [last[0], line]);
        if (p0[1] < line - width) push([p0[0], line], [p0[0], (p0[1] + line) / 2]);
      }
    } else push([p0[0] - width * 1.5, line]);
    for (const p of decimate(piece.path, Math.max(2.5, width * 0.9))) push(p);
    last = piece.path[piece.path.length - 1];
    lastBox = piece.box;
    lastHigh = high;
  }
  if (last) {
    if (last[1] < line - width) push([last[0], line]);
    push([last[0] + tail * 0.5, line + 1], [last[0] + tail, line + 3]);
  }
  return { way: pts, width, line };
}
