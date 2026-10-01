/** The medium: chalk pastel on black paper.
 *
 * Nothing here is a vector line with a glow filter. Every thread is laid
 * down the way a pastel stick lays it: as a run of short, overlapping marks,
 * each made of a few fibres of pigment with its own pressure, trimmed and
 * tapered at the ends, caught by the tooth of the paper (a grain texture in
 * page space, generated once). The light a thread gives off is its pigment
 * dust, scattered beside it, and a soft bloom drawn at quarter resolution
 * and blurred once, when the mark is laid. Marks are plain data; the same
 * seed always draws the same mark, so a canvas can be thrown away and
 * redrawn identically. */

export type Hue = "c" | "m";
type Tone = Hue | "cl" | "ml" | "k";

/** The two hion colours and the light at their heart. */
export const RGB: Record<Tone, [number, number, number]> = {
  c: [79, 233, 245],
  m: [255, 92, 200],
  cl: [214, 251, 255],
  ml: [255, 216, 241],
  k: [6, 4, 8],
};
export const css = (tone: Tone, alpha = 1) =>
  `rgba(${RGB[tone].join(",")},${alpha})`;
const SOLID = { c: css("c"), m: css("m") };

export function rng(seed: number) {
  let s = (Math.abs(Math.floor(seed * 9301 + 49297)) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/* ---------- Paper tooth ---------- */

const TOOTH = 256;
let teeth: Record<Tone, HTMLCanvasElement> | undefined;

function toothTile(rgb: number[], cover: number, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TOOTH;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(seed);
  const img = ctx.createImageData(TOOTH, TOOTH);
  const g = 24;
  const grid = Array.from({ length: g * g }, rand);
  const at = (a: number, b: number) => grid[(b % g) * g + (a % g)];
  for (let py = 0; py < TOOTH; py++) {
    for (let px = 0; px < TOOTH; px++) {
      const fx = (px / TOOTH) * g;
      const fy = (py / TOOTH) * g;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const value =
        (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) +
        (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
      // Laid paper: faint diagonal ridges the pigment catches on.
      const ridge = 0.5 + 0.5 * Math.sin((px * 0.9 + py * 0.35) * 0.9);
      const n = rand() * 0.55 + value * 0.3 + ridge * 0.15;
      const alpha = n < 1 - cover ? 0 : Math.min(1, (n - (1 - cover)) / 0.3);
      const i = (py * TOOTH + px) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function tooth() {
  return (teeth ??= {
    c: toothTile(RGB.c, 0.8, 3),
    m: toothTile(RGB.m, 0.8, 9),
    cl: toothTile(RGB.cl, 0.55, 11),
    ml: toothTile(RGB.ml, 0.55, 13),
    k: toothTile(RGB.k, 0.4, 17),
  });
}

export type Patterns = Record<Tone, CanvasPattern>;

/** Tooth patterns for one context, one texel per device pixel, anchored to
 * the context's user-space origin (page space for the loom). */
export function patterns(ctx: CanvasRenderingContext2D, dpr: number) {
  const t = tooth();
  const out = {} as Patterns;
  for (const key of Object.keys(t) as Tone[]) {
    const pattern = ctx.createPattern(t[key], "repeat")!;
    pattern.setTransform(new DOMMatrix().scale(1 / dpr));
    out[key] = pattern;
  }
  return out;
}

/* ---------- Marks ---------- */

export const enum Kind {
  Stroke,
  Glow,
  Erase,
}

export interface Mark {
  /** Reveal order: the page y at which this mark gets drawn. */
  key: number;
  kind: Kind;
  hue: Hue;
  /** Width of the mark (fibre spread, glow width, eraser width). */
  w: number;
  a: number;
  /** x,y pairs. */
  pts: number[];
  seed: number;
  core: boolean;
  /** Bounding box, padded for dust and glow. */
  y0: number;
  y1: number;
}

function bounds(pts: number[], pad: number) {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 1; i < pts.length; i += 2) {
    if (pts[i] < y0) y0 = pts[i];
    if (pts[i] > y1) y1 = pts[i];
  }
  return { y0: y0 - pad, y1: y1 + pad };
}

export function mark(
  kind: Kind,
  hue: Hue,
  w: number,
  a: number,
  pts: number[],
  seed: number,
  key?: number,
  core = true,
): Mark {
  // Short strokes get enough points to taper and trim.
  if (kind === Kind.Stroke && pts.length < 16) pts = densify(pts, 8);
  const pad = kind === Kind.Glow ? w * 2 + 24 : w + 18;
  const box = bounds(pts, pad);
  return {
    key: key ?? box.y0 + pad,
    kind,
    hue,
    w,
    a,
    pts,
    seed,
    core,
    ...box,
  };
}

function normals(pts: number[]) {
  const n = pts.length / 2;
  const out = new Float32Array(pts.length);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const dx = pts[b * 2] - pts[a * 2];
    const dy = pts[b * 2 + 1] - pts[a * 2 + 1];
    const len = Math.hypot(dx, dy) || 1;
    out[i * 2] = -dy / len;
    out[i * 2 + 1] = dx / len;
  }
  return out;
}

/** Lay one mark on a canvas whose user space is the marks' space. */
export function paint(
  ctx: CanvasRenderingContext2D,
  m: Mark,
  pats: Patterns,
) {
  const pts = m.pts;
  const n = pts.length / 2;
  if (n < 2) return;
  if (m.kind === Kind.Erase) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineWidth = m.w;
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const rand = rng(m.seed);
  const nm = normals(pts);
  // A few fibres of pigment per mark; fine marks are a single fibre.
  const fibres = m.w < 1 ? 1 : Math.max(2, Math.min(6, Math.round(m.w * 1.1)));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = pats[m.hue];
  for (let f = 0; f < fibres; f++) {
    const off = fibres === 1 ? 0 : (f / (fibres - 1) - 0.5) * m.w * (0.8 + rand() * 0.4);
    ctx.globalAlpha = m.a * (0.45 + rand() * 0.55);
    ctx.lineWidth = fibres === 1 ? 0.9 + rand() * 0.5 : Math.max(1, (m.w / fibres) * (0.9 + rand() * 0.9));
    const s0 = rand() * 0.16;
    const s1 = 1 - rand() * 0.16;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      if (t < s0 || t > s1) continue;
      const taper = Math.sqrt(Math.sin(Math.PI * ((t - s0) / (s1 - s0))));
      const o = off * taper;
      const x = pts[i * 2] + nm[i * 2] * o;
      const y = pts[i * 2 + 1] + nm[i * 2 + 1] * o;
      if (started) ctx.lineTo(x, y);
      else {
        ctx.moveTo(x, y);
        started = true;
      }
    }
    ctx.stroke();
  }
  if (m.core && n > 2) {
    ctx.globalAlpha = m.a * 0.85;
    ctx.strokeStyle = pats[m.hue === "c" ? "cl" : "ml"];
    ctx.lineWidth = Math.max(0.8, m.w * 0.3);
    ctx.beginPath();
    ctx.moveTo(pts[2], pts[3]);
    for (let i = 2; i < n - 1; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
    ctx.stroke();
  }
  // Pigment dust thrown off beside the stroke: the thread's own light.
  if (m.w >= 1.5) {
    ctx.fillStyle = SOLID[m.hue];
    for (let i = 0; i < n; i += 3) {
      if (rand() < 0.4) continue;
      const d = (rand() - 0.5) * 2 * (m.w + rand() * rand() * 15);
      ctx.globalAlpha = rand() * 0.55 * m.a;
      ctx.fillRect(
        pts[i * 2] + nm[i * 2] * d + (rand() - 0.5) * 3,
        pts[i * 2 + 1] + nm[i * 2 + 1] * d + (rand() - 0.5) * 3,
        0.9,
        0.9,
      );
    }
  }
  ctx.globalAlpha = 1;
}

/** Resample a short polyline to `count` points along its length. */
function densify(pts: number[], count: number) {
  const n = pts.length / 2;
  const lens = [0];
  for (let i = 1; i < n; i++) {
    lens.push(lens[i - 1] + Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]));
  }
  const total = lens[n - 1] || 1;
  const out: number[] = [];
  let j = 1;
  for (let k = 0; k < count; k++) {
    const s = (k / (count - 1)) * total;
    while (j < n - 1 && lens[j] < s) j++;
    const span = lens[j] - lens[j - 1] || 1;
    const t = Math.min(1, Math.max(0, (s - lens[j - 1]) / span));
    out.push(
      pts[(j - 1) * 2] + (pts[j * 2] - pts[(j - 1) * 2]) * t,
      pts[(j - 1) * 2 + 1] + (pts[j * 2 + 1] - pts[(j - 1) * 2 + 1]) * t,
    );
  }
  return out;
}

/** The bloom of a thread, on a quarter-resolution canvas. Glow marks along
 * one thread never overlap and add with "lighter", so the blur of the parts
 * sums to the blur of the whole: no beading where they meet. */
export function paintGlow(ctx: CanvasRenderingContext2D, m: Mark) {
  const pts = m.pts;
  const n = pts.length / 2;
  if (n < 2 || m.kind !== Kind.Glow) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // Runs of glow along one thread meet end to end: butt ends, so they
  // don't double up where they meet. A point of glow (a knot) is round.
  ctx.lineCap = n <= 2 ? "round" : "butt";
  ctx.lineJoin = "round";
  ctx.strokeStyle = css(m.hue);
  // No filters: a few widening, fainter passes on a quarter-resolution
  // canvas, softened by being scaled up. (A canvas blur filter per mark was
  // the single most expensive thing on the page.)
  const passes: [number, number][] = [
    [m.w * 1.7, m.a * 0.22],
    [m.w * 1.15, m.a * 0.3],
    [m.w * 0.65, m.a * 0.38],
  ];
  for (const [w, a] of passes) {
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
    ctx.stroke();
  }
  ctx.restore();
}

/** Blooms for a small canvas (ink, the line at the top): drawn at quarter
 * resolution on a scratch canvas and scaled up onto it, which is the blur. */
export function paintGlows(
  ctx: CanvasRenderingContext2D,
  marks: Mark[],
  width: number,
  height: number,
  strength = 1,
) {
  const glows = marks.filter((m) => m.kind === Kind.Glow);
  if (!glows.length) return;
  const scratch = document.createElement("canvas");
  scratch.width = Math.max(1, Math.ceil(width / 4));
  scratch.height = Math.max(1, Math.ceil(height / 4));
  const g = scratch.getContext("2d")!;
  g.setTransform(0.25, 0, 0, 0.25, 0, 0);
  for (const m of glows) paintGlow(g, strength === 1 ? m : { ...m, a: m.a * strength });
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(scratch, 0, 0, width, height);
  ctx.restore();
}

/* ---------- Paths ---------- */

export type Pt = [number, number];

/** A polyline resampled at an even step, with arc length. */
export class Path {
  xs: number[] = [];
  ys: number[] = [];
  ls: number[] = [];
  constructor(points: Pt[], step = 3) {
    if (!points.length) return;
    let carry = 0;
    this.push(points[0][0], points[0][1], 0);
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      const seg = Math.hypot(bx - ax, by - ay);
      if (seg === 0) continue;
      let d = step - carry;
      while (d <= seg) {
        const t = d / seg;
        this.push(ax + (bx - ax) * t, ay + (by - ay) * t, total + d);
        d += step;
      }
      carry = seg - (d - step);
      total += seg;
    }
    const [lx, ly] = points[points.length - 1];
    if (this.ls[this.ls.length - 1] < total)
      this.push(lx, ly, total);
  }
  private push(x: number, y: number, l: number) {
    this.xs.push(x);
    this.ys.push(y);
    this.ls.push(l);
  }
  get length() {
    return this.ls[this.ls.length - 1] ?? 0;
  }
  get count() {
    return this.xs.length;
  }
  /** Point and unit normal at arc length s. */
  at(s: number): [number, number, number, number] {
    const n = this.xs.length;
    if (n === 0) return [0, 0, 1, 0];
    s = Math.max(0, Math.min(this.length, s));
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.ls[mid] <= s) lo = mid;
      else hi = mid;
    }
    const span = this.ls[hi] - this.ls[lo] || 1;
    const t = (s - this.ls[lo]) / span;
    const x = this.xs[lo] + (this.xs[hi] - this.xs[lo]) * t;
    const y = this.ys[lo] + (this.ys[hi] - this.ys[lo]) * t;
    const a = Math.max(0, lo - 1);
    const b = Math.min(n - 1, hi + 1);
    const dx = this.xs[b] - this.xs[a];
    const dy = this.ys[b] - this.ys[a];
    const len = Math.hypot(dx, dy) || 1;
    return [x, y, -dy / len, dx / len];
  }
  /** Where the path is at page height y (first crossing, going down). */
  xAt(y: number) {
    const n = this.ys.length;
    for (let i = 1; i < n; i++) {
      if (this.ys[i] >= y) {
        const t = (y - this.ys[i - 1]) / (this.ys[i] - this.ys[i - 1] || 1);
        return this.xs[i - 1] + (this.xs[i] - this.xs[i - 1]) * t;
      }
    }
    return this.xs[n - 1] ?? 0;
  }
}

/** Points of a cubic Bézier. */
export function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    out.push([
      mt * mt * mt * p0[0] +
        3 * mt * mt * t * p1[0] +
        3 * mt * t * t * p2[0] +
        t * t * t * p3[0],
      mt * mt * mt * p0[1] +
        3 * mt * mt * t * p1[1] +
        3 * mt * t * t * p2[1] +
        t * t * t * p3[1],
    ]);
  }
  return out;
}

/** A hand-guided route through points: leaves and arrives at each one
 * travelling downward, so it hangs and swings rather than zigzags. */
export function hang(points: Pt[], pull = 0.5): Pt[] {
  if (points.length < 2) return points.slice();
  const out: Pt[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dy = Math.max(30, Math.abs(b[1] - a[1]) * pull);
    const seg = cubic(a, [a[0], a[1] + dy], [b[0], b[1] - dy], b, 32);
    out.push(...seg.slice(1));
  }
  return out;
}

/* ---------- Things drawn with marks ---------- */

interface ThreadOptions {
  hue: Hue;
  w?: number;
  alpha?: number;
  seed: number;
  /** Bloom strength, 0 for none. */
  glow?: number;
  /** How much the hand wobbles. */
  wobble?: number;
  /** Reveal keys: by page y (default), or a fixed key for the whole thread,
   * or spread along the thread from `from` to `to`. */
  key?: number | [number, number];
  core?: boolean;
}

function keyFor(opts: { key?: ThreadOptions["key"] }, s: number, total: number, y: number) {
  if (opts.key === undefined) return y;
  if (typeof opts.key === "number") return opts.key;
  const [from, to] = opts.key;
  return from + (to - from) * (s / (total || 1));
}

/** A single thread, laid as overlapping pastel marks, plus its bloom. */
export function thread(path: Path, opts: ThreadOptions): Mark[] {
  const out: Mark[] = [];
  const total = path.length;
  if (total < 2) return out;
  const rand = rng(opts.seed);
  const w = opts.w ?? 3;
  const wobble = opts.wobble ?? 0.8;
  let s = 0;
  let index = 0;
  while (s < total - 1) {
    const len = Math.min(total - s, 36 + rand() * 54);
    const pts: number[] = [];
    const phase = rand() * 6;
    const steps = Math.max(2, Math.round(len / 3));
    for (let k = 0; k <= steps; k++) {
      const [x, y, nx, ny] = path.at(s + (len * k) / steps);
      const o = Math.sin(k * 0.45 + phase) * wobble;
      pts.push(x + nx * o, y + ny * o);
    }
    const [, y0] = path.at(s);
    out.push(
      mark(
        Kind.Stroke,
        opts.hue,
        w * (0.8 + rand() * 0.4),
        (opts.alpha ?? 1) * (0.75 + rand() * 0.25),
        pts,
        opts.seed * 131 + index++,
        keyFor(opts, s, total, y0),
        opts.core ?? true,
      ),
    );
    if (s + len >= total - 1) break;
    s += Math.max(8, len - 6 - rand() * 12);
  }
  if (opts.glow !== 0) out.push(...bloom(path, opts.hue, w * 2.6 + 6, opts.glow ?? 0.26, opts));
  return out;
}

function bloom(
  path: Path,
  hue: Hue,
  w: number,
  alpha: number,
  opts: { key?: ThreadOptions["key"] },
): Mark[] {
  const out: Mark[] = [];
  const total = path.length;
  const chunk = 60;
  for (let s = 0; s < total; s += chunk) {
    const pts: number[] = [];
    const end = Math.min(total, s + chunk);
    for (let t = s; t < end; t += 6) {
      const [x, y] = path.at(t);
      pts.push(x, y);
    }
    const [ex, ey] = path.at(end);
    pts.push(ex, ey);
    const [, y0] = path.at(s);
    out.push(
      mark(Kind.Glow, hue, w, alpha, pts, 0, keyFor(opts, s, total, y0)),
    );
  }
  return out;
}

/** Two strands plaited into one cord along a path: leaf-shaped lobes from
 * alternate sides, cyan over magenta over cyan. */
export function braid(
  path: Path,
  opts: { w?: number; seed: number; key?: number | [number, number]; from?: Hue },
): Mark[] {
  const out: Mark[] = [];
  const w = opts.w ?? 14;
  const total = path.length;
  if (total < 4) return out;
  const step = w * 0.46;
  const count = Math.floor(total / step);
  const rand = rng(opts.seed);
  const first = opts.from ?? "c";
  const second: Hue = first === "c" ? "m" : "c";
  const keyOf = (s: number, y: number) =>
    keyFor({ key: opts.key }, s, total, y);
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const hue = i % 2 ? second : first;
    const s0 = i * step;
    const s1 = Math.min(total, (i + 2.5) * step);
    const jitter = (rand() - 0.5) * w * 0.12;
    const centre: Pt[] = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const [x, y, nx, ny] = path.at(s0 + (s1 - s0) * t);
      const across = side * (w * 0.5 + jitter) * Math.cos(Math.PI * t);
      centre.push([x + nx * across, y + ny * across]);
    }
    const [, y0] = path.at(s0);
    out.push(
      mark(
        Kind.Stroke,
        hue,
        step * (1.25 + rand() * 0.25),
        0.85 + rand() * 0.15,
        centre.flat(),
        opts.seed * 977 + i,
        keyOf(s0, y0),
      ),
    );
  }
  out.push(...rays(path, w * 0.5, opts.seed + 7, opts.key, ["c", "m"], 1.6));
  out.push(...bloom(path, "c", w * 2.2, 0.14, opts));
  out.push(...bloom(path, "m", w * 1.2, 0.14, opts));
  return out;
}

/** Light drawn the way a pastel draws it: short, faint strokes thrown out
 * from a thread, more of them near it than far. */
export function rays(
  path: Path,
  from: number,
  seed: number,
  key?: number | [number, number],
  hues: Hue[] = ["c", "m"],
  sparse = 1,
): Mark[] {
  const out: Mark[] = [];
  const rand = rng(seed);
  const total = path.length;
  for (let s = rand() * 4; s < total; s += (2.5 + rand() * 4.5) * sparse) {
    const [x, y, nx, ny] = path.at(s);
    const side = rand() < 0.5 ? -1 : 1;
    const start = from - 1 + rand() * 2;
    const len = 2 + Math.pow(rand(), 2.6) * 18;
    // Mostly straight out, leaning along the thread a little.
    const lean = (rand() - 0.5) * 0.7;
    const dx = nx * side + -ny * lean;
    const dy = ny * side + nx * lean;
    const norm = Math.hypot(dx, dy) || 1;
    const ux = dx / norm;
    const uy = dy / norm;
    const hue = hues[Math.floor(rand() * hues.length)];
    out.push(
      mark(
        Kind.Stroke,
        hue,
        0.5,
        // Longer rays are fainter: the light thins as it travels.
        (0.5 - (len / 25) * 0.3) * (0.5 + rand() * 0.5),
        [x + ux * start, y + uy * start, x + ux * (start + len), y + uy * (start + len)],
        seed * 7919 + Math.round(s * 10),
        keyFor({ key }, s, total, y),
        false,
      ),
    );
  }
  return out;
}

/** A knot: a few tight loops of both colours, scribbled round a point. */
export function knot(
  x: number,
  y: number,
  r: number,
  seed: number,
  key?: number,
): Mark[] {
  const out: Mark[] = [];
  const rand = rng(seed);
  // Two scribbled spirals, one of each colour, wound into a lump.
  for (let l = 0; l < 2; l++) {
    const hue: Hue = l ? "m" : "c";
    const tilt = rand() * Math.PI;
    const squash = 0.6 + rand() * 0.25;
    const start = rand() * Math.PI * 2;
    const pts: number[] = [];
    const turns = 2.2;
    const steps = 30;
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const t = start + u * Math.PI * 2 * turns;
      const rr = r * (1 - u * 0.75);
      const ex = Math.cos(t) * rr;
      const ey = Math.sin(t) * rr * squash;
      pts.push(
        x + ex * Math.cos(tilt) - ey * Math.sin(tilt),
        y + ex * Math.sin(tilt) + ey * Math.cos(tilt),
      );
    }
    out.push(
      mark(Kind.Stroke, hue, Math.max(1.4, r * 0.5), 0.95, pts, seed * 37 + l, key ?? y - r),
    );
  }
  out.push(
    mark(Kind.Glow, "c", r * 2.4, 0.3, [x - 0.5, y, x + 0.5, y], 0, key ?? y - r),
    mark(Kind.Glow, "m", r * 1.6, 0.3, [x, y - 0.5, x, y + 0.5], 0, key ?? y - r),
  );
  return out;
}

/** A tassel: a wrapped neck, then a fall of loose fibres. */
export function tassel(
  x: number,
  y: number,
  len: number,
  seed: number,
  opts: { spread?: number; key?: number; hue?: Hue } = {},
): Mark[] {
  const out: Mark[] = [];
  const rand = rng(seed);
  const spread = opts.spread ?? len * 0.28;
  const fibres = 13;
  const key = opts.key ?? y;
  for (let f = 0; f < fibres; f++) {
    const u = f / (fibres - 1) - 0.5;
    const hue: Hue = opts.hue ?? (f % 2 ? "m" : "c");
    const end = len * (0.82 + rand() * 0.22);
    const pts: number[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const fan = u * spread * Math.pow(t, 0.7) * 2;
      pts.push(x + u * 4 + fan + Math.sin(t * 5 + f) * 0.8, y + 6 + t * end);
    }
    out.push(
      mark(Kind.Stroke, hue, 1.4 + rand(), 0.7 + rand() * 0.3, pts, seed * 53 + f, key + 4, false),
    );
  }
  // The wrapped neck.
  for (let k = 0; k < 4; k++) {
    const yy = y + 4 + k * 3.2;
    out.push(
      mark(
        Kind.Stroke,
        k % 2 ? "m" : "c",
        2.2,
        1,
        [x - 6, yy + 1.5, x, yy, x + 6, yy - 1.2],
        seed * 71 + k,
        key + 2,
        false,
      ),
    );
  }
  out.push(...knot(x, y, 6, seed + 5, key));
  out.push(
    mark(Kind.Glow, opts.hue ?? "m", spread + 10, 0.24, [x, y + 6, x, y + len * 0.9], 0, key + 4),
  );
  return out;
}

/** Thread wound round a corner: a few short marks across it. */
export function wraps(
  x: number,
  y: number,
  dir: 1 | -1,
  seed: number,
  key?: number,
): Mark[] {
  const out: Mark[] = [];
  const rand = rng(seed);
  for (let k = 0; k < 4; k++) {
    const hue: Hue = (k + (dir > 0 ? 0 : 1)) % 2 ? "m" : "c";
    const o = (k - 1.5) * 3.6;
    const len = 13 + rand() * 6;
    // Across the corner, perpendicular to its diagonal.
    const cx = x + dir * o * 0.7;
    const cy = y + o * 0.7;
    out.push(
      mark(
        Kind.Stroke,
        hue,
        2.4,
        0.95,
        [cx - dir * len * 0.5, cy + len * 0.5, cx, cy, cx + dir * len * 0.5, cy - len * 0.5].map(
          (v, i) => v + (i % 2 ? rand() - 0.5 : rand() - 0.5),
        ),
        seed * 19 + k,
        key ?? y,
        false,
      ),
    );
  }
  return out;
}
