/** Stitch: how a living cloth is drawn, so it reads as thread, not pixels.
 *
 * A live crossing is not painted as a square. Thread runs between
 * neighbouring live crossings of the same colour: across, down, or on the
 * diagonal when there is no square way round. So a block is a small square
 * loop, a beehive a hexagon, a glider a hook tumbling across the cloth, and
 * a lone crossing a tiny knot. Where a cyan and a magenta thread cross on a
 * diagonal, which one lies on top follows the plain weave: it alternates
 * from crossing to crossing, like a checkerboard.
 *
 * Every piece of thread is a pastel mark (pastel.ts) drawn once into a
 * small sprite, a few variants each, so a generation repaints with
 * `drawImage` only. The light the threads give off goes on a separate
 * quarter-resolution canvas, scaled up, which is the blur. At a large
 * scale (a cloth seen close up) each thread is itself two plies twisting
 * round each other: the same weave inside the thread. */
import { type Fabric, topAt } from "./fabric";
import { css, type Hue, Kind, mark, paint, patterns, type Pt, rng } from "./pastel";

/** Directions thread runs from a crossing (the others are drawn from the
 * crossing at their other end). */
const DIRS: readonly Pt[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [-1, 1],
];
const VARIANTS = 4;

export interface Stitches {
  /** Crossing pitch, page px. */
  size: number;
  /** How far a sprite reaches past its crossings. */
  pad: number;
  /** [hue][dir][variant] */
  threads: HTMLCanvasElement[][][];
  /** [hue][variant] */
  knots: HTMLCanvasElement[][];
  /** The woven ground, [hue][variant]: a cyan float up the warp, a
   * magenta one along the weft. */
  ground: HTMLCanvasElement[][];
  dpr: number;
  /** How strongly it is laid (0 to 1): a cloth that is only ground is faint. */
  strength: number;
}

const HUES: Hue[] = ["c", "m"];

function sprite(w: number, h: number, dpr: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx };
}

/** Points along a short thread from a to b, sagging a little and wobbling
 * like a hand, running a touch past both ends so neighbours overlap. */
function float(a: Pt, b: Pt, rand: () => number, over: number): number[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const sag = (rand() - 0.5) * len * 0.3;
  const out: number[] = [];
  const steps = 7;
  for (let k = 0; k <= steps; k++) {
    const u = -over + (1 + over * 2) * (k / steps);
    const bow = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) * sag + (rand() - 0.5) * 0.9;
    out.push(a[0] + dx * u + nx * bow, a[1] + dy * u + ny * bow);
  }
  return out;
}

/** Sprites for a cloth of crossings `size` apart. `heavy` lays thicker
 * thread for a fine cloth that has to read (woven type); `strength` lays
 * all of it fainter. */
export function stitches(size: number, dpr: number, heavy = false, strength = 1): Stitches {
  // Drawn once for each kind of cloth: dozens of pastel marks each, and
  // only ever read after.
  const key = `${size}:${dpr}:${heavy}:${strength}`;
  let made = sewn.get(key);
  if (!made) sewn.set(key, (made = sew(size, dpr, heavy, strength)));
  return made;
}

const sewn = new Map<string, Stitches>();

function sew(size: number, dpr: number, heavy: boolean, strength: number): Stitches {
  const pad = Math.ceil(size * 0.7 + 6);
  const ply = size >= 17 ? 2 : 1;
  // (Scaled by 0.85: pastel.ts paint once thinned every mark by that,
  // and the cloth should look as it did.)
  const weight =
    (heavy ? size * 0.5 : size >= 17 ? Math.min(4.4, size * 0.13) : Math.max(1.5, size * 0.15)) * 0.85;
  const threads: HTMLCanvasElement[][][] = [];
  const knots: HTMLCanvasElement[][] = [];
  HUES.forEach((hue, hi) => {
    threads[hi] = DIRS.map(([dx, dy], di) =>
      Array.from({ length: VARIANTS }, (_, v) => {
        const w = Math.abs(dx) * size + pad * 2;
        const h = Math.abs(dy) * size + pad * 2;
        const { canvas, ctx } = sprite(w, h, dpr);
        const pats = patterns(ctx, dpr);
        const rand = rng(hi * 1000 + di * 100 + v * 7 + size);
        // Crossings in sprite space: a at the anchor (pad, pad), or offset
        // right when the thread runs down and to the left.
        const a: Pt = [pad + (dx < 0 ? size : 0), pad];
        const b: Pt = [a[0] + dx * size, a[1] + dy * size];
        if (ply === 1) {
          paint(ctx, mark(Kind.Stroke, hue, weight * (0.85 + rand() * 0.3), 0.8 + rand() * 0.2, float(a, b, rand, 0.22), rand() * 1e6), pats);
        } else {
          // Two plies, twisting round each other along the thread.
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const nx = -(b[1] - a[1]) / len;
          const ny = (b[0] - a[0]) / len;
          const phase = rand() * Math.PI;
          for (let p = 0; p < 2; p++) {
            const pts: number[] = [];
            const steps = 14;
            for (let k = 0; k <= steps; k++) {
              const u = -0.18 + 1.36 * (k / steps);
              const o = Math.sin(u * Math.PI * 2 + phase + p * Math.PI) * weight * 0.9;
              pts.push(a[0] + (b[0] - a[0]) * u + nx * o, a[1] + (b[1] - a[1]) * u + ny * o);
            }
            paint(ctx, mark(Kind.Stroke, hue, weight * 0.62, 0.9, pts, rand() * 1e6), pats);
          }
        }
        return canvas;
      }),
    );
    knots[hi] = Array.from({ length: VARIANTS }, (_, v) => {
      const { canvas, ctx } = sprite(pad * 2, pad * 2, dpr);
      const pats = patterns(ctx, dpr);
      const rand = rng(hi * 77 + v * 13 + size);
      const r = size * 0.24;
      const pts: number[] = [];
      const start = rand() * Math.PI * 2;
      for (let k = 0; k <= 16; k++) {
        const t = start + (k / 16) * Math.PI * 2.3;
        const rr = r * (1 - (k / 16) * 0.35);
        pts.push(pad + Math.cos(t) * rr * 1.15, pad + Math.sin(t) * rr);
      }
      paint(ctx, mark(Kind.Stroke, hue, weight * 0.9, 0.95, pts, rand() * 1e6), pats);
      return canvas;
    });
  });
  // The woven ground: where life has been, a float of each colour that
  // passed through, faint, the warp up and the weft across.
  const ground: HTMLCanvasElement[][] = HUES.map((hue, hi) =>
    Array.from({ length: VARIANTS }, (_, v) => {
      const { canvas, ctx } = sprite(pad * 2, pad * 2, dpr);
      const pats = patterns(ctx, dpr);
      const rand = rng(hi * 31 + v * 17 + size * 3);
      const half = size * (0.68 + rand() * 0.06);
      const a: Pt = hi ? [pad - half, pad] : [pad, pad - half];
      const b: Pt = hi ? [pad + half, pad] : [pad, pad + half];
      paint(ctx, mark(Kind.Stroke, hue, weight * 0.75, (heavy ? 0.8 : 0.24) + rand() * 0.08, float(a, b, rand, 0), rand() * 1e6, undefined, false), pats);
      return canvas;
    }),
  );
  return { size, pad, threads, knots, ground, dpr, strength };
}

/** How the cloth hangs: a smooth offset for every crossing, so its rows
 * and columns wave a little, like cloth hung up rather than a grid. */
export interface Drape {
  dx: Float32Array;
  dy: Float32Array;
  w: number;
}

export function drape(w: number, h: number, size: number, seed: number): Drape {
  const rand = rng(seed);
  const dx = new Float32Array(w * h);
  const dy = new Float32Array(w * h);
  const a = size * 0.3;
  const p = Array.from({ length: 6 }, () => rand() * Math.PI * 2);
  const f = Array.from({ length: 6 }, () => 0.28 + rand() * 0.22);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = x + y * w;
      dx[i] = a * (Math.sin(y * f[0] + p[0]) * 0.7 + Math.sin((x + y) * f[1] * 0.6 + p[1]) * 0.45);
      dy[i] = a * (Math.sin(x * f[2] + p[2]) * 0.6 + Math.sin((x - y) * f[3] * 0.5 + p[3]) * 0.4);
    }
  }
  return { dx, dy, w };
}

/** Variant for a thread, the same every time it is drawn. */
const variant = (x: number, y: number, d: number) => ((x * 73856093) ^ (y * 19349663) ^ (d * 83492791)) >>> 0;

/** Lay one crossing of woven ground: the float of each colour that has
 * passed through (`bits`: 1 cyan, 2 magenta), and where both have, only
 * the one the fabric puts on top, as in a real weave. */
export function paintCrossing(
  ctx: CanvasRenderingContext2D,
  st: Stitches,
  x: number,
  y: number,
  bits: number,
  drape: Drape,
  fabric: Fabric,
) {
  if (!bits) return;
  const S = st.size;
  const di = x + y * drape.w;
  const px = x * S + S / 2 - st.pad + drape.dx[di];
  const py = y * S + S / 2 - st.pad + drape.dy[di];
  const bit = bits === 3 ? topAt(fabric, x, y) : bits;
  const g = st.ground[bit - 1][variant(x, y, 5) % VARIANTS];
  ctx.globalAlpha = st.strength;
  ctx.drawImage(g, px, py, g.width / st.dpr, g.height / st.dpr);
  ctx.globalAlpha = 1;
}
