/** Strand: how the cloth (fate.ts) is drawn, as thread under tension.
 *
 * Every piece is laid out on the rule's grid first: each cell's centre is a
 * pin, the thread runs straight from pin to pin, an uncrossed stretch
 * between two crossings bows a little (a tension bow, at most 0.07 cell),
 * and only a float running loose past the cloth hangs in a shallow curve.
 * A turn at the selvedge is a narrow chevron reaching past the last warp,
 * as far as the shorter of the two rows it joins allows (so a narrow tape
 * turns flat). Where two threads cross, the one underneath breaks for the
 * one on top; which lies on top is the page's fabric (fabric.ts). Then every
 * sample is carried to the page through the flow map (flow.ts), so straight
 * runs become long taut curves and crossings meet at the angle the map
 * gives them.
 *
 * Two layers per tile:
 *  - the ground: every thread, one path per colour, stroked twice (a faint
 *    chalk-grain bloom, then a fine solid line), faint, so words lead. It
 *    is repainted only round what changed: a piece depends only on cells
 *    within 5 of it, and covers its cell's footprint, so the repaint clip
 *    is the footprints of cells near a change, and every cell whose
 *    footprint touches the clip is drawn again;
 *  - the heads: redrawn each generation. Every cell younger than `wake`
 *    generations is lit by its age, wider and brighter toward the head, so
 *    a moving tip trails a wake that fades back into the cloth; the tip
 *    that grew this generation gets a bright needle with a white point and
 *    a soft glow; a fuse burning back through unpicked cloth shows pale and
 *    broken. */
import { type Fabric, topAt } from "./fabric";
import type { Fibre, Fate, Layer } from "./fate";
import type { FlowMap } from "./flow";
import { css, type Hue, type Patterns } from "./pastel";

const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x1b873593, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
};

export interface Look {
  /** strength of finished cloth, 0..1 */
  ground: number;
  /** thread width in px */
  weight: number;
  /** generations for a head's light to fall by 1/e */
  tau: number;
  /** oldest cell drawn on the head canvas (older wake is too faint to
   * show over the ground, and every lit cell is drawn each generation) */
  wake: number;
  /** tension bow between pins, in cells (a float's mid-point offset per 6 cells) */
  bow: number;
  /** how far past the last warp a turn reaches, in cells */
  tip: number;
  /** half-width of the break in an under thread, in cells */
  gap: number;
  /** strength of the head light */
  head: number;
}
export const LOOK: Look = {
  ground: 0.24,
  weight: 1.3,
  tau: 16,
  wake: 32,
  bow: 0.07,
  tip: 0.26,
  gap: 0.17,
  head: 1,
};

interface Laid {
  hue: Hue;
  L: Layer;
  xs: Float32Array;
  ys: Float32Array;
  n: number;
  /** per cell: sample index of the cell, and its piece as [f0, f1, f0, f1...] */
  at: number[];
  parts: number[][];
  /** per cell: the piece without the break */
  whole: number[][];
  cx: number[];
  cy: number[];
  cells: number[];
  live: boolean;
}

/** Ground to repaint after some generations: the clip (page px), the rows
 * of squares it spans, and the threads to lay in it. */
export interface Patch {
  clip: Path2D;
  r0: number;
  r1: number;
  paths: Record<Hue, Path2D>;
}

/** The heads in one strip of the page, laid once a generation. */
export interface Lit {
  glow: Record<Hue, Path2D>;
  band: Record<Hue, Path2D[]>;
  fuse: Record<Hue, Path2D>;
  tips: [Hue, number, number, number, number][];
}

const BANDS = 7;
/** a piece depends on cells at most this far away (grid) */
const REACH = 5;

export class Strands {
  private near: Uint8Array;
  private squares: Uint8Array;
  private readonly W: number;
  private readonly H: number;
  constructor(
    private life: Fate,
    private fm: FlowMap,
    private fabric: Fabric,
    private o: Look,
  ) {
    this.W = life.w;
    this.H = life.h;
    this.near = new Uint8Array(this.W * this.H);
    this.squares = new Uint8Array(this.W * this.H);
  }

  /** grid rows whose cells can show on rows of squares r0..r1 */
  private gridRows(r0: number, r1: number): [number, number] {
    const m = Math.ceil(this.fm.maxDy) + 3;
    return [r0 - m, r1 + m];
  }

  private lay(f: Fibre) {
    return lay(f, this.life, this.fm, this.fabric, this.o);
  }

  /** Lay the whole ground of rows of squares r0..r1 on a tile (its context
   * set to page px), clearing them first. */
  full(ctx: CanvasRenderingContext2D, pats: Patterns, r0: number, r1: number) {
    const { fm, W } = this;
    const S = fm.S;
    ctx.clearRect(0, r0 * S, W * S, (r1 - r0 + 1) * S);
    const [g0, g1] = this.gridRows(r0, r1);
    const want = (x: number, y: number) => {
      const o = (x + y * W) * 4;
      return fm.foot[o + 3] >= r0 && fm.foot[o + 1] <= r1;
    };
    const paths = { c: new Path2D(), m: new Path2D() };
    for (const f of this.life.fibres(g0, g1)) {
      const t = this.lay(f);
      for (let k = 0; k < t.at.length; k++) if (want(t.cx[k], t.cy[k])) addParts(paths[t.hue], t, t.parts[k]);
    }
    this.stroke(ctx, pats, paths);
  }

  /** The ground to repaint round cells that changed (x + y * W), within
   * rows of squares r0..r1; null if nothing there. */
  patch(changed: Int32Array, count: number, r0: number, r1: number): Patch | null {
    const { fm, W, H } = this;
    const S = fm.S;
    const near = this.near;
    const squares = this.squares;
    near.fill(0);
    squares.fill(0);
    const [g0, g1] = this.gridRows(r0, r1);
    let any = 0;
    let tMin = H;
    let tMax = -1;
    for (let k = 0; k < count; k++) {
      const c = changed[k];
      const cx = c % W;
      const cy = (c / W) | 0;
      if (cy < g0 - REACH || cy > g1 + REACH) continue;
      for (let y = Math.max(0, cy - REACH); y <= Math.min(H - 1, cy + REACH); y++)
        for (let x = Math.max(0, cx - REACH); x <= Math.min(W - 1, cx + REACH); x++) {
          const i = x + y * W;
          if (near[i]) continue;
          near[i] = 1;
          const o = i * 4;
          const ty0 = Math.max(fm.foot[o + 1], r0);
          const ty1 = Math.min(fm.foot[o + 3], r1);
          for (let ty = ty0; ty <= ty1; ty++)
            for (let tx = fm.foot[o]; tx <= fm.foot[o + 2]; tx++) {
              const t = tx + ty * W;
              if (!squares[t]) {
                squares[t] = 1;
                any++;
                if (ty < tMin) tMin = ty;
                if (ty > tMax) tMax = ty;
              }
            }
        }
    }
    if (!any) return null;
    const clip = new Path2D();
    for (let y = tMin; y <= tMax; y++) {
      let x = 0;
      while (x < W) {
        if (!squares[x + y * W]) {
          x++;
          continue;
        }
        const xa = x;
        while (x < W && squares[x + y * W]) x++;
        clip.rect(xa * S, y * S, (x - xa) * S, S);
      }
    }
    // every cell whose footprint touches the clip is drawn again
    const draw = (x: number, y: number) => {
      const o = (x + y * W) * 4;
      const ty0 = Math.max(fm.foot[o + 1], tMin);
      const ty1 = Math.min(fm.foot[o + 3], tMax);
      for (let ty = ty0; ty <= ty1; ty++)
        for (let tx = fm.foot[o]; tx <= fm.foot[o + 2]; tx++) if (squares[tx + ty * W]) return true;
      return false;
    };
    const paths = { c: new Path2D(), m: new Path2D() };
    for (const f of this.life.fibres(g0, g1)) {
      let hit = false;
      for (const c of f.cells)
        if (draw(c % W, (c / W) | 0)) {
          hit = true;
          break;
        }
      if (!hit) continue;
      const t = this.lay(f);
      for (let k = 0; k < t.at.length; k++) if (draw(t.cx[k], t.cy[k])) addParts(paths[t.hue], t, t.parts[k]);
    }
    return { clip, r0: tMin, r1: tMax, paths };
  }

  /** Repaint a patch on a tile (its context set to page px). */
  mend(ctx: CanvasRenderingContext2D, pats: Patterns, patch: Patch) {
    const S = this.fm.S;
    ctx.save();
    ctx.clip(patch.clip);
    ctx.clearRect(0, patch.r0 * S, this.W * S, (patch.r1 - patch.r0 + 1) * S);
    this.stroke(ctx, pats, patch.paths);
    ctx.restore();
  }

  /** A faint grained bloom along each colour's thread, a fine solid line inside it. */
  private stroke(ctx: CanvasRenderingContext2D, pats: Patterns, paths: Record<Hue, Path2D>) {
    const { o } = this;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const hue of ["c", "m"] as Hue[]) {
      ctx.globalAlpha = o.ground * 0.6;
      ctx.strokeStyle = pats[hue];
      ctx.lineWidth = o.weight * 2;
      ctx.stroke(paths[hue]);
      ctx.globalAlpha = o.ground;
      ctx.strokeStyle = css(hue);
      ctx.lineWidth = o.weight;
      ctx.stroke(paths[hue]);
    }
    ctx.globalAlpha = 1;
  }

  /** The heads in rows of squares r0..r1: every young cell lit by its age,
   * a needle at each moving tip, the unpick fire; sorted into the strips
   * of the page (`stripOf` a page y) they show in, so a strip is drawn
   * only with what is in it. */
  heads(r0: number, r1: number, stripOf: (y: number) => number): Map<number, Lit> {
    const { life, fm, o, W } = this;
    const S = fm.S;
    const gen = life.generation;
    const out = new Map<number, Lit>();
    const strip = (id: number) => {
      let lit = out.get(id);
      if (!lit) {
        lit = {
          glow: { c: new Path2D(), m: new Path2D() },
          band: { c: [], m: [] },
          fuse: { c: new Path2D(), m: new Path2D() },
          tips: [],
        };
        for (let b = 0; b < BANDS; b++) {
          lit.band.c.push(new Path2D());
          lit.band.m.push(new Path2D());
        }
        out.set(id, lit);
      }
      return lit;
    };
    /** add a piece to every strip it shows in (with room for its light) */
    const add = (t: Laid, parts: number[], to: (lit: Lit) => Path2D) => {
      let top = Infinity;
      let bottom = -Infinity;
      for (let j = 0; j < parts.length; j += 2) {
        const pts = cut(t, parts[j], parts[j + 1]);
        for (let i = 1; i < pts.length; i += 2) {
          if (pts[i] < top) top = pts[i];
          if (pts[i] > bottom) bottom = pts[i];
        }
      }
      if (top > bottom) return;
      const a = stripOf(top - S * 0.5);
      const b = stripOf(bottom + S * 0.5);
      for (let id = a; id <= b; id++) addParts(to(strip(id)), t, parts);
    };
    const vis = (x: number, y: number) => {
      const q = (x + y * W) * 4;
      return fm.foot[q + 3] >= r0 && fm.foot[q + 1] <= r1;
    };
    const [g0, g1] = this.gridRows(r0, r1);
    for (const f of life.fibres(g0, g1)) {
      // only fibres with something young or burning
      let young = false;
      for (let k = f.cells.length - 1; k >= 0; k--) {
        const c = f.cells[k];
        if (gen - life.bornAt(f.L, c) < o.wake || life.burning(f.L, c)) {
          young = true;
          break;
        }
      }
      if (!young) continue;
      const t = this.lay(f);
      const hue = t.hue;
      for (let k = 0; k < t.at.length; k++) {
        if (!vis(t.cx[k], t.cy[k])) continue;
        const c = t.cells[k];
        if (life.burning(t.L, c)) {
          add(t, t.parts[k], (lit) => lit.fuse[hue]);
          continue;
        }
        const age = gen - 1 - life.bornAt(t.L, c);
        if (age >= o.wake) continue;
        const lv = Math.exp(-Math.max(0, age) / o.tau);
        const b = Math.min(BANDS - 1, Math.floor((1 - lv) * BANDS));
        add(t, t.whole[k], (lit) => lit.band[hue][b]);
        if (b < 3) add(t, t.whole[k], (lit) => lit.glow[hue]);
      }
      // the needle: a tip that grew in the last generation or two
      const kt = t.at.length - 1;
      const ta = gen - 1 - life.bornAt(t.L, t.cells[kt]);
      if (t.live && ta <= 1 && vis(t.cx[kt], t.cy[kt])) {
        const j = t.n - 1;
        const i0 = Math.max(0, j - 3);
        const dx = t.xs[j] - t.xs[i0];
        const dy = t.ys[j] - t.ys[i0];
        const l = Math.hypot(dx, dy) || 1;
        const y = t.ys[j];
        for (let id = stripOf(y - S); id <= stripOf(y + S); id++) strip(id).tips.push([hue, t.xs[j], y, dx / l, dy / l]);
      }
    }
    return out;
  }

  /** Draw the heads in a strip on its canvas (cleared by the caller). */
  light(ctx: CanvasRenderingContext2D, lit: Lit) {
    const { o } = this;
    const S = this.fm.S;
    // butt caps: a wake is many short pieces end to end, and round caps would bead where they meet
    ctx.lineCap = "butt";
    ctx.lineJoin = "round";
    for (const hue of ["c", "m"] as Hue[]) {
      // the light the brightest part of a wake gives off
      ctx.globalAlpha = o.head * 0.1;
      ctx.strokeStyle = css(hue);
      ctx.lineWidth = S * 0.4;
      ctx.stroke(lit.glow[hue]);
      for (let b = BANDS - 1; b >= 0; b--) {
        const lv = 1 - (b + 0.5) / BANDS;
        // strength above the ground: the wake fades into the cloth
        ctx.globalAlpha = Math.min(1, o.head * lv * (1 - o.ground) + 0.02);
        ctx.strokeStyle = css(hue);
        ctx.lineWidth = o.weight * (0.9 + 0.7 * lv);
        ctx.stroke(lit.band[hue][b]);
        if (b === 0) {
          ctx.globalAlpha = o.head * 0.75;
          ctx.strokeStyle = css(hue === "c" ? "cl" : "ml");
          ctx.lineWidth = o.weight * 0.6;
          ctx.stroke(lit.band[hue][b]);
        }
      }
      // the fuse: pale, broken, burning back
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = css(hue === "c" ? "cl" : "ml");
      ctx.lineWidth = o.weight * 0.9;
      ctx.stroke(lit.fuse[hue]);
      ctx.setLineDash([]);
    }
    // needles: a bright point running ahead of the tip, in a soft glow
    for (const [hue, x, y, ux, uy] of lit.tips) {
      const halo = ctx.createRadialGradient(x, y, 0, x, y, S * 0.7);
      halo.addColorStop(0, css(hue, 0.45 * o.head));
      halo.addColorStop(1, css(hue, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, S * 0.7, 0, Math.PI * 2);
      ctx.fill();
      const len = S * 0.55;
      const back = S * 0.5;
      const g = ctx.createLinearGradient(x - ux * back, y - uy * back, x + ux * len, y + uy * len);
      g.addColorStop(0, css(hue, 0));
      g.addColorStop(0.55, css(hue === "c" ? "cl" : "ml", o.head));
      g.addColorStop(1, css(hue === "c" ? "cl" : "ml", 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = o.weight * 1.5;
      ctx.beginPath();
      ctx.moveTo(x - ux * back, y - uy * back);
      ctx.lineTo(x + ux * len, y + uy * len);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.85 * o.head;
      ctx.beginPath();
      ctx.arc(x + ux * S * 0.18, y + uy * S * 0.18, o.weight * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function addParts(p: Path2D, t: Laid, parts: number[]) {
  for (let j = 0; j < parts.length; j += 2) {
    const pts = cut(t, parts[j], parts[j + 1]);
    if (pts.length < 4) continue;
    p.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  }
}

/** Lay out one fibre's path on the grid (straight between pins, a tight
 * chevron at each turn), then carry it to the page through the flow map. */
function lay(f: Fibre, life: Fate, fm: FlowMap, fabric: Fabric, o: Look): Laid {
  const W = life.w;
  const n = f.cells.length;
  const L = f.L;
  const ax = L === 0 ? 0 : 1;
  const ay = L === 0 ? 1 : 0;
  const P: [number, number][] = [];
  const cross: boolean[] = [];
  const top: boolean[] = [];
  const hv: number[] = [];
  for (let k = 0; k < n; k++) {
    const c = f.cells[k];
    const x = c % W;
    const y = (c / W) | 0;
    P.push([x + 0.5, y + 0.5]);
    const cr = life.sp((1 - L) as Layer, x, y) > 0;
    cross.push(cr);
    // the fabric says which lies on top: 1, the warp; 2, the weft
    top.push(cr && topAt(fabric, x, y) === (L === 0 ? 1 : 2));
    hv.push(f.neg[k] ? -1 : 1);
  }
  const SEEK = 4;
  for (let k = 0; k < n; k++) {
    if (cross[k]) continue;
    let d1 = 0;
    for (let t = 1; t <= SEEK && k - t >= 0 && !f.turn[k - t]; t++)
      if (cross[k - t]) {
        d1 = t;
        break;
      }
    let d2 = 0;
    for (let t = 1; t <= SEEK && k + t < n && !f.turn[k + t - 1]; t++)
      if (cross[k + t]) {
        d2 = t;
        break;
      }
    let off = 0;
    if (d1 && d2) {
      const m = d1 + d2;
      off = o.bow * Math.min(1, m / 6) * Math.sin((Math.PI * d1) / m);
    } else if (d1 || d2) {
      const d = d1 || d2;
      off = L === 1 ? Math.min(0.4, 0.03 * Math.pow(d, 1.7)) : 0;
    }
    if (L === 1) P[k][1] += off;
    else P[k][0] += (hash(f.cells[k] % W, 0, 99) < 0.5 ? -0.5 : 0.5) * off;
  }
  // straight run length either side of each turn, capped at 4 (keeps a piece local)
  const runLen = (i: number, dir: number) => {
    let r = 1;
    let k = i;
    if (dir < 0)
      while (r < 4 && k - 1 >= 0 && !f.turn[k - 1]) {
        r++;
        k--;
      }
    else
      while (r < 4 && k + 1 < n && !f.turn[k]) {
        r++;
        k++;
      }
    return r;
  };
  const X: number[] = [];
  const Y: number[] = [];
  const at: number[] = [];
  X.push(P[0][0] - ax * hv[0] * 0.3);
  Y.push(P[0][1] - ay * hv[0] * 0.3);
  for (let i = 0; i < n; i++) {
    at.push(X.length);
    X.push(P[i][0]);
    Y.push(P[i][1]);
    if (i === n - 1) break;
    if (f.turn[i]) {
      // the shorter row decides how far the turn reaches: a narrow tape turns flat
      const short = Math.min(runLen(i, -1), runLen(i + 1, 1));
      const tip = o.tip * Math.max(0.3, Math.min(1, (short - 1) / 3));
      const tx = (P[i][0] + P[i + 1][0]) / 2 + ax * hv[i] * tip;
      const ty = (P[i][1] + P[i + 1][1]) / 2 + ay * hv[i] * tip;
      const r = 0.82;
      const axp = P[i][0] + (tx - P[i][0]) * r;
      const ayp = P[i][1] + (ty - P[i][1]) * r;
      const bxp = P[i + 1][0] + (tx - P[i + 1][0]) * r;
      const byp = P[i + 1][1] + (ty - P[i + 1][1]) * r;
      X.push(axp);
      Y.push(ayp);
      for (const u of [0.33, 0.67]) {
        const mu = 1 - u;
        X.push(mu * mu * axp + 2 * mu * u * tx + u * u * bxp);
        Y.push(mu * mu * ayp + 2 * mu * u * ty + u * u * byp);
      }
      X.push(bxp);
      Y.push(byp);
    } else {
      X.push((P[i][0] + P[i + 1][0]) / 2);
      Y.push((P[i][1] + P[i + 1][1]) / 2);
    }
  }
  X.push(P[n - 1][0] + ax * hv[n - 1] * 0.22);
  Y.push(P[n - 1][1] + ay * hv[n - 1] * 0.22);
  const N = X.length;
  const xs = new Float32Array(N);
  const ys = new Float32Array(N);
  const q = [0, 0];
  for (let i = 0; i < N; i++) {
    fm.pt(X[i], Y[i], q);
    xs[i] = q[0];
    ys[i] = q[1];
  }
  const parts: number[][] = [];
  const whole: number[][] = [];
  const cx: number[] = [];
  const cy: number[] = [];
  const ov = 0.52;
  for (let k = 0; k < n; k++) {
    const a = at[k];
    const lo = k === 0 ? 0 : a - (a - at[k - 1]) * ov;
    const hi = k === n - 1 ? N - 1 : a + (at[k + 1] - a) * ov;
    whole.push([lo, hi]);
    if (cross[k] && !top[k]) {
      const gl = (k === 0 ? 1 : (a - at[k - 1]) / 2) * o.gap * 2;
      const gr = (k === n - 1 ? 1 : (at[k + 1] - a) / 2) * o.gap * 2;
      parts.push([lo, a - gl, a + gr, hi]);
    } else parts.push([lo, hi]);
    const c = f.cells[k];
    cx.push(c % W);
    cy.push((c / W) | 0);
  }
  return { hue: f.sp === 1 ? "c" : "m", L, xs, ys, n: N, at, parts, whole, cx, cy, cells: f.cells, live: f.live };
}

/** The path between two fractional sample indices, as x,y pairs. */
function cut(t: Laid, f0: number, f1: number): number[] {
  const { xs, ys, n } = t;
  f0 = Math.max(0, f0);
  f1 = Math.min(n - 1, f1);
  if (f1 <= f0 || n < 2) return [];
  const out: number[] = [];
  const at = (f: number) => {
    const j = Math.min(n - 2, Math.floor(f));
    const u = f - j;
    out.push(xs[j] + (xs[j + 1] - xs[j]) * u, ys[j] + (ys[j + 1] - ys[j]) * u);
  };
  at(f0);
  for (let i = Math.floor(f0) + 1; i < f1; i++) out.push(xs[i], ys[i]);
  at(f1);
  return out;
}
