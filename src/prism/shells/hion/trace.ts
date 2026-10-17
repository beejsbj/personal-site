/** Trace: a word's letters as one thread's way.
 *
 * Pure functions over a bitmap of the word (1 = ink). The letters are
 * thinned to their centre lines (Zhang-Suen), the centre lines read as a
 * graph (ends, junctions, sharp corners and the foot of a round letter,
 * joined by runs), and each letter is drawn as one stroke through its
 * runs, depth first. Between letters the thread runs along a line under
 * their feet, straight down to it and straight up from it, as a hand
 * writes in one line. The rule that keeps letters legible: no thread
 * stands where a letter has no ink. A connector that would (the drop from
 * the top of an S, which reads as an I beside it; the rise into the end
 * of a C, which makes it a Q; the foot of an L bent down to the line) is
 * weighed against going back along what is already drawn to leave from a
 * lower node, and doubling back nearly always wins: drawn twice, a stroke
 * is still one line. Short spurs gone up and straight back are taken off.
 *
 * Punctuation is beads and loops, never a letter's stroke: a full stop is
 * a knot; the dot of a "!" is a ring, its bar a narrow loop above it (a
 * single line there is an I); a colon two rings; a mark hung clear of the
 * line (an apostrophe, a hyphen) is tied to the nearest letter and drawn
 * out from it and back.
 *
 * A heading of several lines is one thread as a weft goes (`joinLines`):
 * every other line is traced mirrored, so it runs back right to left, and
 * each line turns down into the next at the side, beyond both.
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

/** Split a run at its k-th pixel: a node there, and two runs. */
function splitEdge(e: Edge, k: number, nodes: Node[], edges: Edge[], w: number): Node {
  const p = e.pts[k];
  const node: Node = { id: nodes.length, x: p % w, y: Math.floor(p / w), members: [p], edges: [] };
  nodes.push(node);
  const b = e.b;
  const second: Edge = { a: node, b, pts: e.pts.slice(k) };
  e.pts = e.pts.slice(0, k + 1);
  e.b = node;
  node.edges.push(e, second);
  if (b === e.a) b.edges.push(second);
  else {
    const i = b.edges.indexOf(e);
    if (i >= 0) b.edges[i] = second;
    else b.edges.push(second);
  }
  edges.push(second);
  return node;
}

/** The skeleton as a graph: nodes (pixels not of degree 2, merged when
 * adjacent) and edges (runs between them), by connected component. A
 * ring without a node gets one at its lowest pixel; a letter whose
 * lowest point is partway along a run gets one there. A dot is a node
 * with no runs. */
export function graph(s: Uint8Array, w: number, h: number, short = 0): Component[] {
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
    // A dot thins to a pixel or two: kept, as a node with no runs.
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
    // Thinning splits a junction into two or three a pixel or two apart:
    // one node, not a stub between them.
    for (let merged = true; merged; ) {
      merged = false;
      for (const e of edges) {
        if (e.a === e.b || e.pts.length - 1 >= short || e.a.edges.length < 3 || e.b.edges.length < 3) continue;
        const { a, b } = e;
        a.x = (a.x + b.x) / 2;
        a.y = (a.y + b.y) / 2;
        a.members.push(...b.members);
        for (const f of b.edges) {
          if (f === e) continue;
          if (f.a === b) f.a = a;
          if (f.b === b) f.b = a;
          if (!a.edges.includes(f)) a.edges.push(f);
        }
        const keep = (f: Edge) => f !== e && !(f.a === f.b && f.pts.length - 1 < short);
        a.edges = a.edges.filter(keep);
        edges.splice(0, edges.length, ...edges.filter(keep));
        cnodes.splice(cnodes.indexOf(b), 1);
        merged = true;
        break;
      }
    }
    // A sharp corner partway along a run (the foot of an L, the corners
    // of an E, a Z, an N) is a node too: the thread can come into the
    // letter or leave it there, where a stroke meets the line square.
    const reach = Math.max(3, Math.round(short * 1.5));
    const todo = edges.slice();
    while (todo.length) {
      const e = todo.pop()!;
      const p = e.pts;
      let at = -1;
      let sharpest = 0.35;
      for (let k = reach; k < p.length - reach; k++) {
        const ax = (p[k] % w) - (p[k - reach] % w);
        const ay = Math.floor(p[k] / w) - Math.floor(p[k - reach] / w);
        const bx = (p[k + reach] % w) - (p[k] % w);
        const by = Math.floor(p[k + reach] / w) - Math.floor(p[k] / w);
        const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
        if (cos < sharpest) {
          sharpest = cos;
          at = k;
        }
      }
      if (at < 0) continue;
      cnodes.push(splitEdge(e, at, nodes, edges, w));
      todo.push(e, edges[edges.length - 1]);
    }
    // The foot of a round letter (the bottom of a C, an S, a U) is
    // partway along a run: a node there, so the thread can come up into
    // the letter where it sits on the line rather than at a terminal.
    let low: { e: Edge; k: number; y: number } | null = null;
    for (const e of edges) {
      for (let k = 1; k < e.pts.length - 1; k++) {
        const y = Math.floor(e.pts[k] / w);
        if (!low || y > low.y) low = { e, k, y };
      }
    }
    const lowestNode = Math.max(...cnodes.map((nd) => nd.y));
    if (low && low.y > lowestNode + Math.max(2, short)) cnodes.push(splitEdge(low.e, low.k, nodes, edges, w));
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
 * once every run is drawn. Also what it passed through (`stack`), so the
 * caller can go back down along what it drew to leave from a lower node. */
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
  return { path, end: node, stack };
}

/** A closed stroke through a component: from its lowest node through
 * every run and back down along what it drew to where it began. */
function tour(comp: Component, w: number): number[] {
  const low = comp.nodes.reduce((a, b) => (b.y > a.y ? b : a));
  const { path, stack } = stroke(comp, low, 1, w);
  const back: number[] = [];
  for (let k = stack.length - 1; k >= 0; k--) back.push(...stack[k].pts.slice().reverse());
  return path.concat(back);
}

const length = (path: number[], w: number) => {
  let len = 0;
  for (let k = 1; k < path.length; k++) len += Math.hypot((path[k] % w) - (path[k - 1] % w), Math.floor(path[k] / w) - Math.floor(path[k - 1] / w));
  return len;
};

/** What a straight drop from (x, y) to the letters' feet would show:
 * how much of it lies clear of the letter's own ink (read as a stroke of
 * its own: an I beside an S, the tail that makes a C a Q), and whether
 * it meets ink again after leaving it (crosses the letter). */
function drop(mask: Uint8Array, w: number, x: number, y: number, base: number, width: number) {
  const band = Math.max(1, Math.round(width * 0.9));
  const x0 = Math.round(x);
  let bare = 0;
  let gap = 0;
  let cross = false;
  for (let yy = Math.round(y); yy < base; yy++) {
    let ink = false;
    for (let xx = Math.max(0, x0 - band); xx <= Math.min(w - 1, x0 + band) && !ink; xx++) ink = !!mask[yy * w + xx];
    if (ink) {
      if (gap > width * 1.2) cross = true;
      gap = 0;
    } else {
      bare++;
      gap++;
    }
  }
  return { bare, cross };
}

/** What a stretch of bare connector costs against thread drawn twice: a
 * stroke where the letter has none reads as another letter, while going
 * back along what is drawn only takes a moment longer. */
const BARE = 4;

/** The best stroke for a letter arriving from `from`, its feet at `base`:
 * up into it from the line and back down to it, with as little thread
 * standing where the letter has no ink as can be (it goes back along what
 * it has drawn instead), never crossing the letter, then as little thread
 * as that allows. Also whether each end is a terminal (where thinning ate
 * half a stroke). */
function letterStroke(comp: Component, from: Pt, base: number, w: number, mask: Uint8Array, width: number) {
  // A stroke that ends running across (the foot of an L, of an E): a
  // connector there bends it down, and the bend reads as the letter's.
  const across = (n: Node) => {
    if (n.edges.length !== 1) return false;
    const e = n.edges[0];
    const pts = e.a === n ? e.pts : e.pts.slice().reverse();
    const q = pts[Math.min(pts.length - 1, Math.round(width * 2))];
    const dx = (pts[0] % w) - (q % w);
    const dy = Math.floor(pts[0] / w) - Math.floor(q / w);
    return Math.abs(dy) < Math.hypot(dx, dy) * 0.6;
  };
  const nodes = comp.nodes.slice().sort((p, q) => q.y - p.y);
  const starts = nodes.length > 8 ? nodes.slice(0, 6) : nodes;
  const costs = new Map<Node, number>();
  const end = (n: Node) => {
    let c = costs.get(n);
    if (c === undefined) {
      const d = drop(mask, w, n.x, n.y, base, width);
      c = d.cross ? 1e6 : (d.bare + (across(n) ? width * 3 : 0)) * BARE;
      costs.set(n, c);
    }
    return c;
  };
  let best: { path: number[]; score: number; start: Node; end: Node } | null = null;
  for (const start of starts) {
    const entry = end(start) + Math.abs(start.x - from[0]) * 0.15;
    for (const prefer of [1, -1]) {
      const run = stroke(comp, start, prefer, w);
      let len = length(run.path, w);
      // Leave from where it ends, or from a node it passed, back down
      // along what it drew to get there.
      let pick = { path: run.path, score: len + entry + end(run.end), end: run.end };
      const back: number[] = [];
      for (let k = run.stack.length - 1; k >= 0; k--) {
        const pts = run.stack[k].pts.slice().reverse();
        back.push(...pts);
        len += length(pts, w);
        const score = len + entry + end(run.stack[k].node);
        if (score < pick.score) pick = { path: run.path.concat(back), score, end: run.stack[k].node };
      }
      if (!best || pick.score < best.score) best = { ...pick, start };
    }
  }
  const b = best!;
  return { path: b.path, open: [b.start.edges.length === 1, b.end.edges.length === 1] as [boolean, boolean] };
}

const median = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/** Thinning eats half a stroke's width at a terminal: put it back, unless
 * that runs into a neighbour. Only at a terminal: at a corner or a
 * junction it would be a stub. */
function extendEnds(path: Pt[], by: number, others: Box[], clear: number, open: [boolean, boolean]) {
  if (path.length < 4) return;
  const ext = (a: Pt, b: Pt): Pt => {
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    return [a[0] + ((a[0] - b[0]) / d) * by, a[1] + ((a[1] - b[1]) / d) * by];
  };
  const free = ([x, y]: Pt) => !others.some((b) => x > b.l - clear && x < b.r + clear && y > b.t - clear && y < b.b + clear);
  const head = ext(path[0], path[3]);
  const tail = ext(path[path.length - 1], path[path.length - 4]);
  if (open[0] && free(head)) path.unshift(head);
  if (open[1] && free(tail)) path.push(tail);
}

/** Take short out-and-back excursions off a stroke (a spur thinning left
 * at a flared end or a corner, gone up and straight back): smoothed, each
 * would be a little loop. `max` is the longest taken off (px, one way). */
function trim(path: Pt[], max: number): Pt[] {
  const out = path.slice();
  const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];
  for (let j = 1; j < out.length - 1; j++) {
    let k = 0;
    while (j - k - 1 >= 0 && j + k + 1 < out.length && same(out[j - k - 1], out[j + k + 1])) k++;
    if (k === 0 || k > max) continue;
    out.splice(j - k + 1, 2 * k);
    j = Math.max(0, j - k - 1);
  }
  return out;
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

/** Pixels on the straight line from a to b. */
function pixelLine(a: number, b: number, w: number): number[] {
  const x0 = a % w;
  const y0 = Math.floor(a / w);
  const x1 = b % w;
  const y1 = Math.floor(b / w);
  const n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(Math.round(y0 + ((y1 - y0) * i) / n) * w + Math.round(x0 + ((x1 - x0) * i) / n));
  return out;
}

/** Tie a mark that hangs clear of the line (an apostrophe, a hyphen) to
 * a letter: a short run from the nearest point of the letter to the
 * nearest end of the mark. The thread goes out to it from the letter and
 * back along it, and no stroke stands for it in the gap. */
function attach(host: Component, mark: Component, extra: Node[], w: number) {
  const best = { d: Infinity, p: -1, e: null as Edge | null, k: -1, node: null as Node | null, m: null as Node | null };
  for (const m of mark.nodes) {
    const consider = (p: number, e: Edge | null, k: number, node: Node | null) => {
      const d = Math.hypot((p % w) - m.x, Math.floor(p / w) - m.y);
      if (d < best.d) Object.assign(best, { d, p, e, k, node, m });
    };
    for (const e of host.edges) e.pts.forEach((p, k) => consider(p, e, k, null));
    for (const nd of host.nodes) for (const p of nd.members) consider(p, null, -1, nd);
  }
  const { e, k, m } = best;
  if (!m) return;
  let at: Node;
  if (best.node) at = best.node;
  else if (!e) return;
  else if (k === 0) at = e.a;
  else if (k === e.pts.length - 1) at = e.b;
  else {
    at = splitEdge(e, k, extra, host.edges, w);
    host.nodes.push(at);
  }
  const bridge: Edge = { a: at, b: m, pts: pixelLine(best.p, m.members[0], w) };
  at.edges.push(bridge);
  m.edges.push(bridge);
  host.nodes.push(...mark.nodes);
  host.edges.push(...mark.edges, bridge);
  host.box = {
    l: Math.min(host.box.l, mark.box.l),
    t: Math.min(host.box.t, mark.box.t),
    r: Math.max(host.box.r, mark.box.r),
    b: Math.max(host.box.b, mark.box.b),
  };
}

/** An arc round (cx, cy) from angle a0 through `sweep` (radians; a
 * quarter turn on is downward). */
function arc(cx: number, cy: number, r: number, a0: number, sweep: number): Pt[] {
  const n = Math.max(8, Math.ceil((Math.abs(sweep) * r) / 1.5));
  const out: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const a = a0 + (sweep * k) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

const BELOW = Math.PI / 2;
const ABOVE = -Math.PI / 2;

/** The bar of a "!" as a narrow loop: from its tip up one side, round its
 * head and down the other. A single line there would be an I. */
function teardrop(x: number, top: number, tip: number, r: number): Pt[] {
  const out: Pt[] = [];
  const cy = top + r;
  const n = 10;
  for (let k = 0; k <= n; k++) out.push([x - r * Math.sqrt(k / n), tip + (cy - tip) * (k / n)]);
  out.push(...arc(x, cy, r, Math.PI, Math.PI).slice(1, -1));
  for (let k = n; k >= 0; k--) out.push([x + r * Math.sqrt(k / n), tip + (cy - tip) * (k / n)]);
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
 * begins, `tail` how far past the last it runs, and `thread` how wide the
 * thread that writes it is (bitmap px: a bead or a loop is never smaller
 * than the thread can draw open). Null when there is nothing to trace.
 *
 * Letters are strokes; punctuation is beads and loops, so it never reads
 * as a letter: a full stop is a knot tied where it sits; the dot of a "!"
 * (or "?", or the foot of a ":") a ring the thread comes up into, goes
 * on up from to draw what is above it (the bar of a "!" as a narrow loop,
 * the hook of a "?", the colon's other ring) and comes back down to; a
 * mark hung clear of the line (an apostrophe, a hyphen) is tied to the
 * nearest letter and drawn out from it and back. */
export function traceWord(mask: Uint8Array, w: number, h: number, lead: number, tail: number, thread = 0): Traced | null {
  let ink = 0;
  for (let i = 0; i < mask.length; i++) ink += mask[i];
  if (ink < 12) return null;
  let s = thin(mask, w, h);
  let spine = 0;
  for (let i = 0; i < s.length; i++) spine += s[i];
  if (!spine) return null;
  const width = ink / spine;
  s = prune(s, w, Math.max(2, Math.round(width * 1.4)));
  const comps = graph(s, w, h, Math.max(2, Math.round(width * 0.8))).sort((a, b) => a.box.l - b.box.l);
  if (!comps.length) return null;
  const small = (c: Component) => c.box.r - c.box.l < width * 2.6 && c.box.b - c.box.t < width * 2.6;
  const body = comps.some((c) => !small(c)) ? comps.filter((c) => !small(c)) : comps;
  const base = median(body.map((c) => c.box.b));
  const cap = Math.max(width * 3, base - Math.min(...body.map((c) => c.box.t)));
  // Under their feet, with room between for the thread to read as its own.
  const line = base + Math.max(width * 2.2, thread * 2.6);
  const centre = (c: Component): Pt => [(c.box.l + c.box.r) / 2, (c.box.t + c.box.b) / 2];
  const bead = (c: Component) => Math.max(width * 1.2, thread * 0.9, (c.box.r - c.box.l) / 2 + width * 0.4);
  // A dot with something over it (a "!", a "?", a ":"): one mark.
  const over = new Map<Component, Component>();
  for (const d of comps) {
    if (!small(d) || d.box.b < base - cap * 0.45) continue;
    const [cx] = centre(d);
    const u = comps.find(
      (o) =>
        o !== d &&
        !over.has(o) &&
        o.box.b < d.box.t - width * 0.5 &&
        d.box.t - o.box.b < cap * 0.8 &&
        cx > o.box.l - width &&
        cx < o.box.r + width,
    );
    if (u) over.set(d, u);
  }
  const tops = new Set(over.values());
  // Marks clear of the line, tied to the nearest letter.
  const letters: Component[] = [];
  const marks: Component[] = [];
  for (const c of comps) {
    if (over.has(c) || tops.has(c)) continue;
    if (c.box.b < base - cap * 0.25 && (small(c) || c.box.b - c.box.t < cap * 0.55)) marks.push(c);
    else letters.push(c);
  }
  const extra: Node[] = [];
  for (const m of marks) {
    let host: Component | null = null;
    let gap = Infinity;
    for (const c of letters) {
      if (small(c) || !c.edges.length) continue;
      const g = Math.max(c.box.l - m.box.r, m.box.l - c.box.r, 0);
      if (g < gap) {
        gap = g;
        host = c;
      }
    }
    if (host && gap < cap * 0.6) attach(host, m, extra, w);
    else letters.push(m);
  }
  const toPt = (p: number): Pt => [p % w, Math.floor(p / w)];
  const pieces: { box: Box; make(prev: Pt): Pt[] }[] = [];
  for (const c of letters) {
    if (!c.edges.length) {
      // A dot on the line: a knot tied where it sits.
      const [cx, cy] = centre(c);
      const r = bead(c);
      pieces.push({ box: c.box, make: () => arc(cx, cy, r, BELOW, Math.PI * 2.15) });
      continue;
    }
    pieces.push({
      box: c.box,
      make: (prev) => {
        const { path, open } = letterStroke(c, prev, base, w, mask, width);
        const pts = trim(path.map(toPt), width * 2.5);
        extendEnds(pts, width * 0.5, comps.filter((o) => o !== c).map((o) => o.box), width * 1.6, open);
        return pts;
      },
    });
  }
  for (const [d, u] of over) {
    const [cx, cy] = centre(d);
    const r = bead(d);
    const box: Box = { l: Math.min(d.box.l, u.box.l), t: u.box.t, r: Math.max(d.box.r, u.box.r), b: d.box.b };
    pieces.push({
      box,
      make: () => {
        // Up into the ring from below, round, on up from its top...
        const pts = arc(cx, cy, r, BELOW, Math.PI * 3);
        if (small(u) || !u.edges.length) {
          const [ux, uy] = centre(u);
          pts.push(...arc(ux, uy, bead(u), BELOW, Math.PI * 2));
        } else if (u.edges.length === 1 && u.box.r - u.box.l < width * 2.6 && u.box.b - u.box.t > width * 2.5) {
          pts.push(...teardrop((u.box.l + u.box.r) / 2, u.box.t, u.box.b, Math.max(width * 1.15, thread * 0.9, (u.box.r - u.box.l) / 2 + width * 0.5)));
        } else pts.push(...tour(u, w).map(toPt));
        // ...and back down to it, round its far side, and down.
        pts.push(...arc(cx, cy, r, ABOVE, Math.PI));
        return pts;
      },
    });
  }
  pieces.sort((a, b) => a.box.l - b.box.l);
  // Assemble: along the line, straight up into each, through it, straight
  // down, and on.
  const pts: Pt[] = [];
  const push = (...ps: Pt[]) => {
    for (const p of ps) {
      const q = pts[pts.length - 1];
      if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.5) pts.push(p);
    }
  };
  let prev: Pt = [-lead, line];
  let last: Pt | null = null;
  for (const piece of pieces) {
    const path = piece.make(prev);
    const p0 = path[0];
    if (last) {
      if (last[1] < line - width) push([last[0], (last[1] + line) / 2], [last[0], line]);
      if (p0[1] < line - width) push([p0[0], line], [p0[0], (p0[1] + line) / 2]);
    } else {
      push([Math.min(p0[0], piece.box.l) - lead, line]);
      if (p0[1] < line - width) push([p0[0], line], [p0[0], (p0[1] + line) / 2]);
    }
    for (const p of decimate(path, Math.max(2.5, width * 0.9))) push(p);
    last = path[path.length - 1];
    prev = last;
  }
  if (last) {
    if (last[1] < line - width) push([last[0], line]);
    push([last[0] + tail * 0.5, line + 1], [last[0] + tail, line + 3]);
  }
  return { way: pts, width, line };
}

/** A heading's lines as one thread, as a weft goes: the first line left
 * to right, the next back right to left, and so on, each joined to the
 * next by a turn down at the side, beyond both lines' ends, from the one
 * line's run to the next's. Each way is in page px and runs its own way;
 * `line` is where its run lies. */
export function joinLines(lines: { way: Pt[]; line: number }[], gap: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < lines.length; k++) {
    const { way, line } = lines[k];
    if (!way.length) continue;
    const a = out[out.length - 1];
    if (a) {
      const above = lines[k - 1].line;
      const b = way[0];
      // This line runs right to left: the turn is on the right.
      const right = b[0] >= way[way.length - 1][0];
      const s = right ? 1 : -1;
      const x = right ? Math.max(a[0], b[0]) + gap : Math.min(a[0], b[0]) - gap;
      const r = Math.max(2, Math.min(gap, (line - above) / 3));
      out.push([x - s * r, above], [x, above + r], [x, line - r], [x - s * r, line]);
    }
    out.push(...way);
  }
  return out;
}
