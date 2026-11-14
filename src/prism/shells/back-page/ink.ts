/** Biro ink: every drawing on the page is made here, from a seed, so the same
 * page always looks the same (a camp never redraws itself differently). */

import { DRAWINGS, type Drawing } from "./drawings.ts";

/** The book's two pens and its pencil, as CSS variables: every book is its
 * own paper (themes.css), and the ink follows it. SVG built from these goes
 * through `svg()`/`paint()` (dom.ts), which move them into `style`, since a
 * presentation attribute can't hold a `var()`. */
export const BLUE = "var(--bp-blue)";
export const RED = "var(--bp-red)";
export const PENCIL = "var(--bp-pencil)";

export type Rng = () => number;

export function seed(key: string): Rng {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);
const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);

/** A circle drawn in one stroke: it wobbles and overshoots where it closes. */
export function handCircle(cx: number, cy: number, r: number, rng: Rng) {
  const start = rng() * Math.PI * 2;
  const sweep = Math.PI * 2 + between(rng, 0.25, 0.55);
  const steps = 14;
  const wobble = r * 0.05;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = start + (sweep * i) / steps;
    const rr = r + (rng() - 0.5) * 2 * wobble + (i / steps) * r * 0.06;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  // Catmull-Rom through the points, as cubic Béziers.
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** A pressed biro dot: a tiny blob, never a perfect circle. */
function dot(x: number, y: number, r: number, rng: Rng, ink: string) {
  const rx = r * between(rng, 0.85, 1.15);
  const ry = r * between(rng, 0.8, 1.1);
  const a = rng() * 180;
  const ax = Math.cos((a * Math.PI) / 180) * rx;
  const ay = Math.sin((a * Math.PI) / 180) * rx;
  // a tilted ellipse as two arcs, so it carries no transform of its own
  return `<path class="bp-dot" d="M${f(x + ax)} ${f(y + ay)}A${f(rx)} ${f(ry)} ${f(a)} 1 0 ${f(x - ax)} ${f(y - ay)}A${f(rx)} ${f(ry)} ${f(a)} 1 0 ${f(x + ax)} ${f(y + ay)}Z" fill="${ink}"/>`;
}

export function cross(x: number, y: number, s: number, rng: Rng, ink: string) {
  const a = rng() * 0.6 - 0.3;
  const c = Math.cos(a) * s;
  const sn = Math.sin(a) * s;
  return `<path class="bp-cross" d="M${f(x - c)} ${f(y - sn - s * 0.1)}L${f(x + c)} ${f(y + sn + s * 0.1)}M${f(x + sn - s * 0.1)} ${f(y - c)}L${f(x - sn + s * 0.1)} ${f(y + c)}" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
}

export interface CampOpts {
  cx: number;
  cy: number;
  r: number;
  ink: string;
  enemy: string;
  dots: number;
  /** How many of his soldiers have been crossed out. */
  hits: number;
  rng: Rng;
  /** Names the camp's group, so a hand can reach it later. */
  id?: string;
}

/** A camp: the pencilled guide circle, the ink ring, the soldiers in it. */
export function camp({ cx, cy, r, ink, enemy, dots, hits, rng, id }: CampOpts) {
  let out = `<circle class="bp-guide" cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 1.08)}" fill="none" stroke="${PENCIL}" stroke-opacity=".25" stroke-width="1"/>`;
  out += `<path class="bp-ink-ring" d="${handCircle(cx, cy, r, rng)}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" pathLength="1"/>`;
  const placed: [number, number][] = [];
  let guard = 0;
  while (placed.length < dots && guard++ < 400) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r * 0.68;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    if (placed.every(([px, py]) => Math.hypot(px - x, py - y) > r * 0.26))
      placed.push([x, y]);
  }
  const dr = Math.max(2.2, r * 0.085);
  placed.forEach(([x, y], i) => {
    out += dot(x, y, dr, rng, ink);
    if (i < hits) out += cross(x, y, dr * 2.1, rng, enemy);
  });
  return id ? `<g class="bp-camp-ink" data-camp="${id}">${out}</g>` : out;
}

/** A flick: the pen pulled back and let go, the line a little off true,
 * running on past where it was aimed. */
export function flick(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  ink: string,
  rng: Rng,
  overshoot = 0.25,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const ex = x2 + dx * overshoot;
  const ey = y2 + dy * overshoot;
  const bend = (rng() - 0.5) * 0.08;
  const mx = (x1 + ex) / 2 - dy * bend;
  const my = (y1 + ey) / 2 + dx * bend;
  return `<path class="bp-flick" d="M${f(x1)} ${f(y1)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}" fill="none" stroke="${ink}" stroke-width="${f(between(rng, 0.9, 1.4))}" stroke-linecap="round" stroke-opacity="${f(between(rng, 0.55, 0.8))}" pathLength="1"/>`;
}

/** A pen stroke under a word, sometimes twice. */
export function underline(ink: string, rng: Rng, twice = false) {
  const y = between(rng, 4, 6);
  let d = `M2 ${f(y + 1)} C ${f(between(rng, 20, 30))} ${f(y - 2)}, ${f(between(rng, 45, 60))} ${f(y + 3)}, 98 ${f(y - 1)}`;
  if (twice)
    d += ` M8 ${f(y + 6)} C 35 ${f(y + 3)}, 62 ${f(y + 8)}, 90 ${f(y + 5)}`;
  return `<svg class="bp-underline" viewBox="0 0 100 ${twice ? 14 : 10}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke" pathLength="1"/></svg>`;
}

/** A quick war scratched on a spare page: a few camps and their flicks. */
export function miniWar(w: number, h: number, rng: Rng) {
  const camps: { x: number; y: number; ink: string }[] = [];
  const n = 4 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const blue = i % 2 === 0;
    camps.push({
      x: between(rng, 0.18, 0.82) * w,
      y: blue ? between(rng, 0.55, 0.88) * h : between(rng, 0.12, 0.45) * h,
      ink: blue ? BLUE : RED,
    });
  }
  const r = Math.min(w, h) * 0.07;
  let lines = "";
  for (let i = 0; i < n + 3; i++) {
    const a = camps[Math.floor(rng() * n)];
    const targets = camps.filter((c) => c.ink !== a.ink);
    const b = targets[Math.floor(rng() * targets.length)];
    lines += flick(a.x, a.y, b.x + (rng() - 0.5) * r * 2, b.y + (rng() - 0.5) * r * 2, a.ink, rng, between(rng, 0.1, 0.9));
  }
  const rings = camps
    .map((c) =>
      camp({
        cx: c.x,
        cy: c.y,
        r,
        ink: c.ink,
        enemy: c.ink === BLUE ? RED : BLUE,
        dots: 6 + Math.floor(rng() * 4),
        hits: Math.floor(rng() * 4),
        rng,
      }),
    )
    .join("");
  return `<svg class="bp-miniwar" viewBox="0 0 ${f(w)} ${f(h)}" aria-hidden="true">${lines}${rings}</svg>`;
}

/** Tally marks, in fives. */
export function tally(n: number, ink: string, rng: Rng) {
  let out = "";
  let x = 4;
  for (let i = 0; i < n; i++) {
    const inGroup = i % 5;
    if (inGroup === 4) {
      out += `<path d="M${f(x - 30)} ${f(24 + rng() * 2)}L${f(x + 2)} ${f(6 + rng() * 2)}" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" pathLength="1"/>`;
      x += 12;
    } else {
      out += `<path d="M${f(x + rng() * 2)} ${f(4 + rng() * 2)}L${f(x + rng() * 2 - 1)} ${f(26 + rng() * 2)}" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" pathLength="1"/>`;
      x += 7;
    }
  }
  return `<svg class="bp-tally" viewBox="0 0 ${f(x + 4)} 32" width="${f(x + 4)}" height="32" aria-hidden="true">${out}</svg>`;
}

/** The drawings in the margin, by name (drawings.ts chooses one for each
 * experiment in the lab from what it is). */
export function doodle(name: Drawing, rng: Rng) {
  const s = `fill="none" stroke="${BLUE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="1"`;
  const r = `fill="none" stroke="${RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="1"`;
  const body = [
    // a lotus, drawn one line at a time
    `<path ${s} d="M60 92 C 40 80, 34 56, 60 26 C 86 56, 80 80, 60 92 Z"/>
     <path ${s} d="M60 92 C 30 90, 14 70, 16 48 C 34 52, 50 66, 60 92"/>
     <path ${s} d="M60 92 C 90 90, 106 70, 104 48 C 86 52, 70 66, 60 92"/>
     <path ${s} d="M60 92 C 38 98, 14 94, 4 80 C 22 74, 44 80, 60 92"/>
     <path ${s} d="M60 92 C 82 98, 106 94, 116 80 C 98 74, 76 80, 60 92"/>
     <path ${r} d="M24 104 C 44 100, 76 100, 96 104"/>
     <path ${r} d="M60 26 C 62 18, 58 12, 60 6" stroke-dasharray=".08 .06"/>`,
    // shapes keeping time
    `<path ${s} d="M${f(24 + rng() * 2)} 70 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0"/>
     <path ${s} d="M48 44 L76 44 L76 72 L48 72 Z"/>
     <path ${s} d="M88 76 L102 50 L116 76 Z"/>
     <path ${r} d="M8 96 C 20 90, 30 102, 42 96 S 64 90, 76 96 S 98 102, 112 96"/>
     <path ${r} d="M18 44 l-4 -8 M28 40 l0 -9 M38 44 l4 -8"/>
     <path ${r} d="M56 30 l-3 -8 M64 28 l0 -9 M72 30 l3 -8"/>
     <path ${r} d="M96 40 l-3 -8 M104 38 l2 -8"/>`,
    // a spiral, the kind you draw when you should be listening
    `<path ${s} d="M60 60 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 8 a14 14 0 1 1 -14 -14 a22 22 0 1 1 22 22 a32 32 0 1 1 -32 -32"/>
     <path ${r} d="M96 20 l6 10 l-12 0 z"/>`,
    // a flask with something in it
    `<path ${s} d="M48 12 L72 13"/>
     <path ${s} d="M53 13 L54 44 L27 91 C 22 100, 28 105, 38 105 L83 104 C 93 104, 98 99, 93 91 L66 44 L67 13"/>
     <path ${r} d="M38 78 C 48 71, 58 84, 68 77 S 80 74, 84 78"/>
     <path ${r} d="M57 62 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"/>
     <path ${r} d="M66 52 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0"/>
     <path ${r} d="M60 34 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0"/>`,
    // a box drawn the way everyone learns to, one face shaded
    `<path ${s} d="M28 42 L60 27 L94 39 L63 56 Z"/>
     <path ${s} d="M28 42 L29 78 L63 95 L63 56"/>
     <path ${s} d="M63 95 L93 76 L94 39"/>
     <path ${r} d="M70 60 l17 -10 M70 69 l18 -11 M70 78 l18 -11 M71 86 l15 -9"/>`,
    // a light bulb: an idea
    `<path ${s} d="M60 16 C 37 15, 27 36, 38 53 C 44 62, 46 67, 46 75 L74 75 C 74 67, 77 62, 83 53 C 93 36, 83 16, 60 16 Z"/>
     <path ${s} d="M48 83 L72 82 M50 91 L70 90 M56 99 L65 98"/>
     <path ${s} d="M52 74 L56 50 L60 58 L64 50 L68 74"/>
     <path ${r} d="M60 2 l0 7 M25 19 l6 6 M95 19 l-6 6 M11 47 l9 0 M109 47 l-9 0"/>`,
    // a paper plane, and where it has been
    `<path ${s} d="M12 58 L108 20 L76 97 L60 66 Z"/>
     <path ${s} d="M60 66 L108 20"/>
     <path ${s} d="M60 66 L62 88 L70 78"/>
     <path ${r} d="M8 96 C 20 86, 32 100, 46 88" stroke-dasharray=".12 .08"/>`,
    // a planet with a ring, and two stars
    `<path ${s} d="M60 56 m-25 0 a25 25 0 1 0 50 0 a25 25 0 1 0 -50 0"/>
     <path ${r} d="M37 65 C 14 72, 10 62, 30 50 M88 44 C 110 38, 112 50, 92 62 C 84 67, 74 70, 62 72"/>
     <path ${r} d="M100 14 l0 10 M95 19 l10 0"/>
     <path ${r} d="M18 88 l0 8 M14 92 l8 0"/>`,
    // noughts and crosses, played against yourself
    `<path ${s} d="M45 18 L43 98 M77 16 L79 99"/>
     <path ${s} d="M14 44 L106 42 M13 74 L107 76"/>
     <path ${r} d="M20 20 l15 15 M35 20 l-15 15"/>
     <path ${s} d="M61 59 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0"/>
     <path ${r} d="M86 82 l14 14 M100 82 l-14 14"/>
     <path ${s} d="M93 29 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"/>`,
    // a star in one go, without lifting the pen
    `<path ${s} d="M60 12 L79 100 L13 45 L107 44 L41 101 Z"/>
     <path ${r} d="M100 82 l0 12 M94 88 l12 0"/>
     <path ${r} d="M20 16 l0 9 M15.5 20.5 l9 0"/>`,
    // a bolt of lightning
    `<path ${s} d="M70 8 L34 58 L57 58 L46 103 L88 46 L64 47 Z"/>
     <path ${r} d="M96 18 l9 -7 M100 31 l11 -2 M22 78 l-9 6 M24 90 l-10 1"/>`,
    // a rocket, going
    `<path ${s} d="M60 8 C 45 28, 42 54, 46 78 L74 78 C 78 54, 75 28, 60 8 Z"/>
     <path ${s} d="M60 40 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0"/>
     <path ${s} d="M46 60 L30 87 L46 78 M74 60 L90 87 L74 78"/>
     <path ${r} d="M52 82 C 53 94, 58 97, 60 106 C 62 97, 67 94, 68 82"/>`,
    // hills, and the sun over them
    `<path ${s} d="M6 96 L40 42 L58 70 L78 30 L114 96"/>
     <path ${s} d="M30 58 L38 62 L46 54 M68 48 L77 54 L86 46"/>
     <path ${r} d="M22 22 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0"/>
     <path ${r} d="M22 6 l0 4 M6 22 l4 0 M38 22 l-4 0 M11 11 l3 3 M33 11 l-3 3 M11 33 l3 -3 M33 33 l-3 -3"/>`,
    // a note, two of them, joined; and the sound going out
    `<path ${s} d="M20 84 a10 8 -20 1 0 20 0 a10 8 -20 1 0 -20 0"/>
     <path ${s} d="M62 74 a10 8 -20 1 0 20 0 a10 8 -20 1 0 -20 0"/>
     <path ${s} d="M39 82 L39 28 M81 72 L81 18"/>
     <path ${s} d="M39 28 L81 18 L81 29 L39 39 Z"/>
     <path ${r} d="M96 40 C 104 46, 104 56, 96 62 M104 31 C 116 42, 116 60, 104 71"/>`,
    // a bird on a branch, and another going over
    `<path ${s} d="M30 66 C 28 44, 48 34, 66 40 C 74 30, 90 30, 96 40 L 108 44 L 96 50 C 96 62, 88 70, 80 76 C 66 92, 38 90, 30 66 Z"/>
     <path ${s} d="M30 66 L8 86 L36 80"/>
     <path ${s} d="M52 56 C 60 50, 74 54, 78 62 C 68 72, 56 70, 52 56"/>
     <path ${s} d="M52 88 L52 100 M66 86 L66 100"/>
     <path ${r} d="M90 40 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0"/>
     <path ${r} d="M4 102 C 30 98, 70 106, 116 100"/>
     <path ${r} d="M14 20 q6 -8 12 0 q6 -8 12 0"/>`,
    // a clapperboard, as a film begins
    `<path ${s} d="M16 46 L104 46 L104 98 L16 98 Z"/>
     <path ${s} d="M14 26 L102 18 L104 46 L16 46 Z"/>
     <path ${r} d="M30 46 L38 24 M52 46 L60 22 M74 46 L82 20"/>
     <path ${r} d="M52 62 L52 84 L72 73 Z"/>`,
    // a house, with smoke from the chimney
    `<path ${s} d="M12 58 L60 16 L108 58"/>
     <path ${s} d="M26 50 L26 98 L94 98 L94 50"/>
     <path ${s} d="M84 36 L84 20 L95 20 L95 45"/>
     <path ${s} d="M78 62 L90 62 L90 76 L78 76 Z"/>
     <path ${r} d="M50 98 L50 72 L68 72 L68 98"/>
     <path ${r} d="M89 14 C 84 9, 94 6, 89 1"/>`,
    // a book lying open, its lines ruled
    `<path ${s} d="M60 36 C 44 24, 26 24, 12 30 L12 86 C 26 80, 44 80, 60 92 C 76 80, 94 80, 108 86 L108 30 C 94 24, 76 24, 60 36 Z"/>
     <path ${s} d="M60 36 L60 92"/>
     <path ${r} d="M22 44 C 32 42, 42 44, 50 48 M22 56 C 32 54, 42 56, 50 60 M22 68 C 32 66, 42 68, 50 72"/>
     <path ${s} d="M70 48 C 78 44, 88 42, 98 44 M70 60 C 78 56, 88 54, 98 56 M70 72 C 78 68, 88 66, 98 68"/>`,
    // a pot on the boil
    `<path ${s} d="M24 54 L96 54 L90 92 C 89 98, 84 100, 78 100 L42 100 C 36 100, 31 98, 30 92 Z"/>
     <path ${s} d="M24 62 C 10 60, 8 74, 26 74 M96 62 C 110 60, 112 74, 94 74"/>
     <path ${s} d="M18 54 C 24 42, 96 42, 102 54"/>
     <path ${s} d="M54 43 C 54 34, 66 34, 66 43"/>
     <path ${r} d="M44 30 C 38 22, 50 16, 44 8 M60 26 C 54 18, 66 12, 60 4 M76 30 C 70 22, 82 16, 76 8"/>`,
  ];
  const at = DRAWINGS.indexOf(name);
  return `<svg class="bp-doodle" data-doodle="${at}" data-drawing="${name}" viewBox="0 0 120 110" aria-hidden="true">${body[at]}</svg>`;
}

/** A strip of masking tape, torn at both ends. */
export function tapeClip(rng: Rng) {
  const j = () => f(between(rng, 0, 9));
  return `polygon(0 ${j()}%, 6% 0, 94% ${j()}%, 100% 0, 97% 50%, 100% 100%, 93% ${f(91 + rng() * 9)}%, 5% 100%, 0 ${f(90 + rng() * 10)}%, 3% 50%)`;
}

// ---- a used book: what a bored hand leaves on printed matter ---------------------
// Each is an SVG stretched over the thing it marks (a cell, a row, a word), so
// it lands where the print is at any size; the strokes keep their weight.

const scrawl = (kind: string, view: string, body: string, stretch = true) =>
  `<svg class="bp-scrawl bp-scrawl--${kind}" viewBox="${view}"${stretch ? ' preserveAspectRatio="none"' : ""} aria-hidden="true">${body}</svg>`;
const NS = 'fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';

/** Pencil shading, back and forth along a row, `cells` cells of it, the
 * strokes leaning the way a right hand leans them: even where he meant it,
 * then shorter and further apart where he gave up. */
export function shading(cells: number, rng: Rng) {
  const W = cells * 100;
  let x = between(rng, 0, 4);
  let d = `M${f(x)} ${f(between(rng, 86, 94))}`;
  while (x < W - 24) {
    // how far from where he stopped: the last stretch thins and shortens
    const tail = Math.max(0, Math.min(1, (W - x) / 180));
    const reach = 42 * (0.45 + 0.55 * tail) + between(rng, -4, 2);
    const mid = 50 + between(rng, -3, 3);
    const lean = between(rng, 16, 22);
    d += `L${f(x + lean)} ${f(mid - reach)}`;
    x += between(rng, 5, 8) + (1 - tail) * between(rng, 3, 10);
    d += `L${f(x)} ${f(mid + reach)}`;
  }
  return scrawl("shade", `0 0 ${W} 100`, `<path d="${d}" stroke="${PENCIL}" stroke-width=".9" ${NS}/>`);
}

/** A ring drawn round a cell's number. */
export function ring(ink: string, rng: Rng) {
  return scrawl("ring", "-50 -50 100 100", `<path d="${handCircle(0, 0, 40, rng)}" stroke="${ink}" stroke-width="1.4" ${NS}/>`);
}

/** A tick, the kind that means "know this one". */
export function tick(ink: string, rng: Rng) {
  const j = () => between(rng, -1.2, 1.2);
  return scrawl(
    "tick",
    "0 0 20 16",
    `<path d="M${f(2 + j())} ${f(8 + j())}Q${f(5)} ${f(11)} ${f(7 + j())} ${f(14.5)}Q${f(11)} ${f(6)} ${f(19 + j())} ${f(1.5 + j())}" stroke="${ink}" stroke-width="1.7" ${NS}/>`,
    false,
  );
}

/** Two quick strokes through a wrong answer. */
export function strike(ink: string, rng: Rng) {
  const y = () => f(between(rng, 38, 62));
  return scrawl(
    "strike",
    "0 0 100 100",
    `<path d="M-6 ${y()}L106 ${y()}M-2 ${f(between(rng, 70, 85))}L104 ${f(between(rng, 15, 30))}" stroke="${ink}" stroke-width="1.5" ${NS}/>`,
  );
}

/** A word scribbled out, `letters` long: the pen run back and forth along
 * it, close, then dragged through it twice more. There was never a word
 * under it: the scribble is all the page is given. */
export function scribbledOut(letters: number, ink: string, rng: Rng) {
  const W = Math.max(1, letters) * 10;
  const zigzag = (step: number, top: number, foot: number) => {
    let x = -between(rng, 0, 2);
    let d = `M${f(x)} ${f(foot + between(rng, -1, 1))}`;
    while (x < W) {
      x += step * between(rng, 0.7, 1.3);
      d += `L${f(x + between(rng, 0.5, 2))} ${f(top + between(rng, -1, 1.5))}`;
      x += step * between(rng, 0.5, 1);
      d += `L${f(Math.min(x, W + 2))} ${f(foot + between(rng, -1.5, 1))}`;
    }
    return d;
  };
  const through = (y: number) =>
    `M${f(W + between(rng, 0, 3))} ${f(y + between(rng, -1, 1))}Q${f(W / 2)} ${f(y + between(rng, -2.5, 2.5))} ${f(-between(rng, 0, 3))} ${f(y + between(rng, -1, 1))}`;
  const stroke = (d: string, width: number) =>
    `<path d="${d}" stroke="${ink}" stroke-width="${width}" pathLength="1" ${NS}/>`;
  return `<svg class="bp-struck" viewBox="0 0 ${W} 16" preserveAspectRatio="none" aria-hidden="true">${stroke(zigzag(1.7, 2.5, 13.5), 2.4)}${stroke(zigzag(2.3, 4, 12), 2.2)}${stroke(`${through(6)}${through(10.5)}`, 2.6)}</svg>`;
}

/** A curling arrow from a note to what it's about, pointing right. */
export function arrow(ink: string, rng: Rng) {
  const lift = between(rng, 6, 10);
  return scrawl(
    "arrow",
    "0 0 40 24",
    `<path d="M2 ${f(16 + lift / 3)}C 12 ${f(4 - lift / 2)}, 26 ${f(4)}, 37 12M30 ${f(6.5)}L37 12L${f(29.5)} ${f(15.5)}" stroke="${ink}" stroke-width="1.5" ${NS}/>`,
    false,
  );
}

/** A face drawn round a hundred: its noughts are the eyes. The pupils are
 * inked on the noughts themselves (.bp-eye), so they stay put whatever the
 * cell's width or the font. */
export function face(ink: string, rng: Rng) {
  const j = () => between(rng, -1.5, 1.5);
  return scrawl(
    "face",
    "-50 -50 100 100",
    `<path d="${handCircle(6, 4, 47, rng)}" stroke="${ink}" stroke-width="1.3" ${NS}/>` +
      `<path d="M-4 ${f(24 + j())}Q12 ${f(38 + j())} 30 ${f(22 + j())}" stroke="${ink}" stroke-width="1.6" ${NS}/>` +
      // and a tuft of hair
      `<path d="M4 -40q0 -12 6 -16M13 -41q5 -10 11 -11" stroke="${ink}" stroke-width="1.3" ${NS}/>`,
  );
}

/** A soldier from an old war, pressed in and crossed out where he fell. */
export function fallen(ink: string, killer: string, rng: Rng) {
  return scrawl("fallen", "-10 -10 20 20", `${dot(0, 0, 3.4, rng, ink)}${cross(0, 0, 6.6, rng, killer)}`, false);
}
