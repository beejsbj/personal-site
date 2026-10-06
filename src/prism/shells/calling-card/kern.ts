/** Optical kerning for ransom-note lettering.
 *
 * Every letter is its own inline-block cut from a different face at a
 * different size, so the fonts' own kerning never applies across them. A
 * wide capital with an open lower half (W, V, Y, T, P, F…) leading into a
 * small italic lowercase leaves a hole you can drive through ("W  riting").
 *
 * This reads each glyph's ink profile once (row by row, from a canvas),
 * then for each pair finds the narrowest horizontal gap where both letters
 * have ink at the same height — after their scale, baseline shift and tilt.
 * Pairs that open wider than LOOSE are pulled in to TARGET. Tight pairs are
 * left alone, so the cut-outs keep their jostle; only the holes close. */

export interface Cut {
  el: HTMLElement;
  char: string;
  /** Face index: 0 Anton, 1 Bodoni roman, 2 Bodoni italic. */
  font: number;
  /** Size relative to the word. */
  scale: number;
  /** Baseline shift in the letter's own em (positive is down). */
  y: number;
  /** Tilt in degrees (positive is clockwise). */
  r: number;
  boxed: boolean;
}

/** Must match `.cc-l[data-f]` in base.css. */
const FACES = [
  { css: `normal 400 100px "Anton"`, family: "Anton" },
  { css: `normal 900 100px "Bodoni Moda Variable"`, family: "Bodoni Moda Variable" },
  { css: `italic 800 100px "Bodoni Moda Variable"`, family: "Bodoni Moda Variable" },
];
/** `.cc-l` horizontal padding, in the letter's em. */
const PAD = 0.015;
/** Gaps (in the word's em) wider than this are holes... */
const LOOSE = 0.11;
/** ...and get pulled in to this. */
const TARGET = 0.06;
/** Never pull a pair in by more than this (word em). */
const MAX_PULL = 0.3;

const SIZE = 100;
const ORIGIN_X = 60;
const BASELINE = 140;
const W = 280;
const H = 200;

interface Profile {
  advance: number;
  /** Per canvas row: leftmost / rightmost ink, in em from the pen origin. */
  left: Float32Array;
  right: Float32Array;
}

const cache = new Map<string, Profile>();
let ctx: CanvasRenderingContext2D | null | undefined;

function profile(char: string, font: number): Profile | null {
  const key = `${font}:${char}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (ctx === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!ctx) return null;
  ctx.clearRect(0, 0, W, H);
  ctx.font = FACES[font].css;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(char, ORIGIN_X, BASELINE);
  const advance = ctx.measureText(char).width / SIZE;
  const { data } = ctx.getImageData(0, 0, W, H);
  const left = new Float32Array(H).fill(NaN);
  const right = new Float32Array(H).fill(NaN);
  for (let row = 0; row < H; row++) {
    let first = -1;
    let last = -1;
    for (let x = 0; x < W; x++) {
      if (data[(row * W + x) * 4 + 3] > 80) {
        if (first < 0) first = x;
        last = x;
      }
    }
    if (first >= 0) {
      left[row] = (first - ORIGIN_X) / SIZE;
      right[row] = (last + 1 - ORIGIN_X) / SIZE;
    }
  }
  const out = { advance, left, right };
  cache.set(key, out);
  return out;
}

/** Ink edge of a cut at a height `v` above the word's baseline (word em),
 * measured from the left edge of its box (word em). */
function edge(cut: Cut, p: Profile, v: number, side: "left" | "right") {
  const s = cut.scale;
  // Undo the baseline shift: translateY(+y) moves ink down.
  const h = v / s + cut.y;
  const row = Math.round(BASELINE - h * SIZE - 0.5);
  if (row < 0 || row >= H) return NaN;
  const ink = side === "left" ? p.left[row] : p.right[row];
  if (Number.isNaN(ink)) return NaN;
  // Tilt about the box's middle, roughly 0.35em above the baseline.
  const tilt = (v - 0.35 * s) * Math.sin((cut.r * Math.PI) / 180);
  return s * (PAD + ink) + tilt;
}

function pull(prev: Cut, cur: Cut) {
  if (prev.boxed || cur.boxed) return 0;
  const a = profile(prev.char, prev.font);
  const b = profile(cur.char, cur.font);
  if (!a || !b) return 0;
  const width = prev.scale * (a.advance + 2 * PAD);
  let gap = Infinity;
  for (let v = -0.3; v <= 1.3; v += 0.01) {
    const l = edge(cur, b, v, "left");
    if (Number.isNaN(l)) continue;
    // A diagonal stroke is closest a little above or below, not level.
    let r = -Infinity;
    for (let dv = -0.04; dv <= 0.04; dv += 0.02) {
      const x = edge(prev, a, v + dv, "right");
      if (!Number.isNaN(x) && x > r) r = x;
    }
    if (r === -Infinity) continue;
    gap = Math.min(gap, width - r + l);
  }
  if (!Number.isFinite(gap) || gap <= LOOSE) return 0;
  return Math.min(gap - TARGET, MAX_PULL);
}

function apply(words: Cut[][]) {
  for (const word of words) {
    for (let i = 1; i < word.length; i++) {
      const amount = pull(word[i - 1], word[i]);
      if (amount > 0)
        word[i].el.style.marginLeft = `${(-amount / word[i].scale).toFixed(3)}em`;
    }
  }
}

let ready: Promise<unknown> | undefined;
const loaded = () =>
  FACES.every((face) => document.fonts.check(face.css));

/** Kern every word once its faces are in. Synchronous when they already are,
 * so a screen built after the first paints lands already kerned. */
export function kern(words: Cut[][]) {
  if (typeof document === "undefined" || !words.length) return;
  if (!document.fonts || loaded()) return apply(words);
  ready ??= Promise.all(FACES.map((face) => document.fonts.load(face.css, "AWa"))).catch(() => undefined);
  void ready.then(() => apply(words));
}
