/** Biro ink: every drawing on the page is made here, from a seed, so the same
 * page always looks the same (a camp never redraws itself differently). */

export const BLUE = "#1b3899";
export const RED = "#c01e2a";
export const PENCIL = "#3f3c39";

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

/** Doodles in the margin, one for each experiment in the lab. */
export function doodle(kind: number, rng: Rng) {
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
  ][kind % 3];
  return `<svg class="bp-doodle" data-doodle="${kind % 3}" viewBox="0 0 120 110" aria-hidden="true">${body}</svg>`;
}

/** A strip of masking tape, torn at both ends. */
export function tapeClip(rng: Rng) {
  const j = () => f(between(rng, 0, 9));
  return `polygon(0 ${j()}%, 6% 0, 94% ${j()}%, 100% 0, 97% 50%, 100% 100%, 93% ${f(91 + rng() * 9)}%, 5% 100%, 0 ${f(90 + rng() * 10)}%, 3% 50%)`;
}
