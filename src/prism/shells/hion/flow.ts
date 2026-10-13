/** Flow: the cloth's rule lives on a square grid (fate.ts); it is drawn
 * through a smooth, slowly varying map from grid to page, so the lattice
 * sweeps, gathers and fans instead of sitting square (strand.ts).
 *
 * Two kinds of displacement, summed (all lengths in cells):
 *  - gathers: an anisotropic pinch. Threads running along the gather's
 *    direction are drawn together across it (toward its axis), most at its
 *    centre, as if pulled through a hand or a reed; threads crossing it are
 *    shortened, and so meet the gathered ones at an acute angle. Alone, a
 *    gather of strength s < 1 can never fold (the across-axis stretch is at
 *    least 1 - s); the sum is checked numerically (`minDet`).
 *  - sweep: a low, slow displacement (a few sines), so long runs become
 *    long curves. It fades at the left and right edges.
 *
 * Where the gathers go is the page's business (cloth.ts places them where
 * the two hions meet). The map is tabulated once at half-cell resolution
 * and read by bilinear interpolation. For incremental paint each cell also
 * gets its page footprint (the squares, one cell in size, its pieces can
 * touch), and for holds and taps the inverse questions are answered from
 * the table. */

export interface Gather {
  /** centre, cells */
  x: number;
  y: number;
  /** direction the gathered threads run, radians (pi/2: warps, 0: wefts) */
  ang: number;
  /** strength, 0..1: share of the across-axis width taken out at the centre */
  s: number;
  /** reach along and across the axis, cells (gaussian sigma) */
  la: number;
  lc: number;
}

export interface FlowSpec {
  gathers: Gather[];
  /** sweep amplitude and wavelength, cells */
  sweep: number;
  wave: number;
  seed: number;
}

export class FlowMap {
  private readonly tw: number;
  private readonly tx: Float32Array;
  private readonly ty: Float32Array;
  /** per cell: footprint in squares (one cell of the page each), x0,y0,x1,y1
   * (filled by `measure`) */
  foot = new Int16Array(0);
  /** smallest Jacobian determinant over the field (1 = identity; <= 0 would fold) */
  minDet = 1;
  /** largest vertical displacement, cells */
  maxDy = 0;
  constructor(
    readonly W: number,
    readonly H: number,
    readonly S: number,
    spec: FlowSpec,
  ) {
    const tw = (this.tw = 2 * W + 1);
    const th = 2 * H + 1;
    this.tx = new Float32Array(tw * th);
    this.ty = new Float32Array(tw * th);
    const ph = Array.from({ length: 4 }, (_, k) => hash(spec.seed, k, 3) * Math.PI * 2);
    const k = (2 * Math.PI) / spec.wave;
    for (let j = 0; j < th; j++) {
      const y = j / 2;
      // only the gathers near this row (beyond five sigma they are nothing)
      const near = spec.gathers.filter((g) => Math.abs(y - g.y) < 5 * Math.max(g.la, g.lc));
      for (let i = 0; i < tw; i++) {
        const x = i / 2;
        let dx = 0;
        let dy = 0;
        for (const g of near) {
          const ux = Math.cos(g.ang);
          const uy = Math.sin(g.ang);
          const rx = x - g.x;
          const ry = y - g.y;
          const along = rx * ux + ry * uy;
          const across = -rx * uy + ry * ux;
          const w = Math.exp(-(along * along) / (2 * g.la * g.la) - (across * across) / (2 * g.lc * g.lc));
          const d = -g.s * w * across;
          dx += -uy * d;
          dy += ux * d;
        }
        if (spec.sweep) {
          const edge = Math.sin((Math.PI * Math.min(Math.max(x, 0), W)) / W);
          dx += spec.sweep * edge * (0.6 * Math.sin(y * k * 0.9 + x * k * 0.3 + ph[0]) + 0.4 * Math.sin(y * k * 1.7 - x * k * 0.5 + ph[1]));
          dy += spec.sweep * (0.6 * Math.sin(x * k * 0.8 - y * k * 0.35 + ph[2]) + 0.4 * Math.sin(x * k * 1.6 + y * k * 0.6 + ph[3]));
        }
        this.tx[j * tw + i] = (x + dx) * S;
        this.ty[j * tw + i] = (y + dy) * S;
        if (Math.abs(dy) > this.maxDy) this.maxDy = Math.abs(dy);
      }
    }
    // fold check: Jacobian determinant on the half-cell table
    for (let j = 0; j < th - 1; j++)
      for (let i = 0; i < tw - 1; i++) {
        const q = j * tw + i;
        const ax = this.tx[q + 1] - this.tx[q];
        const ay = this.ty[q + 1] - this.ty[q];
        const bx = this.tx[q + tw] - this.tx[q];
        const by = this.ty[q + tw] - this.ty[q];
        const det = (ax * by - ay * bx) / ((S / 2) * (S / 2));
        if (det < this.minDet) this.minDet = det;
      }
  }

  /** Work out every cell's footprint (once the map is accepted): the cell
   * grown by 1.5 cells each way (a piece reaches half way to its
   * neighbours, a turn's tip a little beyond, the bloom a pixel or two). */
  measure() {
    const { W, H, S } = this;
    this.foot = new Int16Array(W * H * 4);
    const p = [0, 0];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let x0 = 1e9;
        let y0 = 1e9;
        let x1 = -1e9;
        let y1 = -1e9;
        for (let b = -1.5; b <= 2.5; b += 1)
          for (let a = -1.5; a <= 2.5; a += 1) {
            this.pt(x + a, y + b, p);
            if (p[0] < x0) x0 = p[0];
            if (p[0] > x1) x1 = p[0];
            if (p[1] < y0) y0 = p[1];
            if (p[1] > y1) y1 = p[1];
          }
        const o = (x + y * W) * 4;
        this.foot[o] = Math.max(0, Math.floor((x0 - 3) / S));
        this.foot[o + 1] = Math.max(0, Math.floor((y0 - 3) / S));
        this.foot[o + 2] = Math.min(W - 1, Math.floor((x1 + 3) / S));
        this.foot[o + 3] = Math.min(H - 1, Math.floor((y1 + 3) / S));
      }
  }

  /** grid point (cells, may be fractional) to page px */
  pt(gx: number, gy: number, out: number[]) {
    const { tw } = this;
    const th = 2 * this.H + 1;
    const fx = gx * 2;
    const fy = gy * 2;
    // outside the table: extend the edge displacement
    const cx = Math.min(Math.max(fx, 0), tw - 1.001);
    const cy = Math.min(Math.max(fy, 0), th - 1.001);
    const i = Math.floor(cx);
    const j = Math.floor(cy);
    const u = cx - i;
    const v = cy - j;
    const k = j * tw + i;
    const a = this.tx;
    const b = this.ty;
    const x = (a[k] * (1 - u) + a[k + 1] * u) * (1 - v) + (a[k + tw] * (1 - u) + a[k + tw + 1] * u) * v;
    const y = (b[k] * (1 - u) + b[k + 1] * u) * (1 - v) + (b[k + tw] * (1 - u) + b[k + tw + 1] * u) * v;
    out[0] = x + (fx - cx) * this.S * 0.5;
    out[1] = y + (fy - cy) * this.S * 0.5;
  }

  /** Cells any part of which the map carries onto a marked square of a page
   * mask (`mask[x + y * mw]`, squares of `px` page px). */
  cellsOn(mask: Uint8Array, mw: number, mh: number, px: number, each: (x: number, y: number) => void) {
    const p = [0, 0];
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++) {
        let hit = false;
        for (let b = 0; b <= 1 && !hit; b += 0.5)
          for (let a = 0; a <= 1 && !hit; a += 0.5) {
            this.pt(x + a, y + b, p);
            const mx = Math.floor(p[0] / px);
            const my = Math.floor(p[1] / px);
            if (mx >= 0 && my >= 0 && mx < mw && my < mh && mask[mx + my * mw]) hit = true;
          }
        if (hit) each(x, y);
      }
  }

  /** The cell whose centre the map carries nearest a page point. */
  nearest(px: number, py: number): [number, number] {
    const { S } = this;
    let best = Infinity;
    let bx = 0;
    let by = 0;
    const p = [0, 0];
    const y0 = Math.max(0, Math.floor(py / S - this.maxDy - 2));
    const y1 = Math.min(this.H - 1, Math.ceil(py / S + this.maxDy + 2));
    for (let y = y0; y <= y1; y++)
      for (let x = 0; x < this.W; x++) {
        this.pt(x + 0.5, y + 0.5, p);
        const d = (p[0] - px) ** 2 + (p[1] - py) ** 2;
        if (d < best) {
          best = d;
          bx = x;
          by = y;
        }
      }
    return [bx, by];
  }
}

const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a ^ 0x9e3779b1, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x1b873593, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
};
