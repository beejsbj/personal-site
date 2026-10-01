/** Pencil notes, after Dotfight's soldier life (PR #10): when a man says
 * something, it's pencilled on the same sheet, in a gap beside him, in his
 * side's colour, with a loose ring round the words, a small tail to him and a
 * ring round his dot, so who's talking is plain. Written the way a hand writes
 * (the words, then the ring, then the tail), read, then rubbed out by an
 * eraser: two zigzag scrubs, the first leaving a ghost, the second taking the
 * rest, and a few crumbs that are brushed off after. Never inked; the page
 * keeps nothing of it. */
import type { Mood } from "./lines";
import { seed, type Rng } from "./ink";
import type { Box, Space } from "./space";

const NS = "http://www.w3.org/2000/svg";
const f = (n: number) => n.toFixed(1);
let uid = 0;

export const PENCIL_INK = { blue: "#3d4f94", red: "#a8393d" } as const;

const SIZE: Record<Mood, number> = { tiny: 0.6, whisper: 0.7, say: 0.8, shout: 1.02 };

export interface Spot {
  cx: number;
  cy: number;
  /** Degrees: 0, or -90 written up the margin. Never upside down. */
  angle: number;
  w: number;
  h: number;
  box: Box;
}

export interface Measured {
  text: string;
  mood: Mood;
  size: number;
  tw: number;
  w: number;
  h: number;
}

/** How big the words will be, written in this layer's hand. */
export function measure(layer: SVGSVGElement, text: string, mood: Mood, base: number): Measured {
  const size = base * SIZE[mood];
  const t = document.createElementNS(NS, "text");
  t.setAttribute("class", `bp-note__words bp-note__words--${mood}`);
  t.setAttribute("font-size", f(size));
  t.textContent = text;
  layer.append(t);
  const tw = t.getComputedTextLength() || text.length * size * 0.42;
  t.remove();
  const padX = size * (mood === "shout" ? 0.75 : 0.5);
  const padY = size * (mood === "shout" ? 0.55 : 0.32);
  return { text, mood, size, tw, w: tw + padX * 2, h: size * 1.05 + padY * 2 };
}

/** A gap beside him the words fit in: close to him, upright if it can be,
 * up the margin if it can't, and above him rather than below. */
export function findSpot(
  space: Space,
  at: { x: number; y: number },
  m: Measured,
  away?: { x: number; y: number },
): Spot | null {
  let best: Spot | null = null;
  let bestScore = Infinity;
  for (const angle of [0, -90]) {
    const ew = angle ? m.h : m.w;
    const eh = angle ? m.w : m.h;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      // distance from him to the box's edge along this way, plus a gap
      const reach = Math.min(Math.abs(dx) > 1e-3 ? ew / 2 / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-3 ? eh / 2 / Math.abs(dy) : Infinity);
      for (const gap of [8, 16, 26, 40, 56, 74]) {
        const cx = at.x + dx * (reach + gap);
        const cy = at.y + dy * (reach + gap);
        const box = { x0: cx - ew / 2, y0: cy - eh / 2, x1: cx + ew / 2, y1: cy + eh / 2 };
        if (!space.clear(box)) continue;
        let score = gap + (angle ? 30 : 0) + (dy > 0.3 ? 8 : 0);
        // an answer sits on the far side of him from the question
        if (away) score += (dx * (away.x - at.x) + dy * (away.y - at.y) > 0 ? 20 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = { cx, cy, angle, w: m.w, h: m.h, box };
        }
        break;
      }
    }
  }
  return best;
}

/** A loose pencil loop round the words: a rounded oblong, wobbling, its end
 * running past its start. A shout gets a spiky burst instead. */
function loop(w: number, h: number, rng: Rng, spiky: boolean) {
  const rx = w / 2;
  const ry = h / 2;
  const pts: [number, number][] = [];
  const start = rng() * Math.PI * 2;
  const n = spiky ? 22 : 16;
  const sweep = Math.PI * 2 + (spiky ? 0.15 : 0.35 + rng() * 0.3);
  for (let i = 0; i <= n; i++) {
    const a = start + (sweep * i) / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // a superellipse: squarer than an ellipse, so it hugs a line of words
    const ex = Math.sign(c) * Math.abs(c) ** 0.55;
    const ey = Math.sign(s) * Math.abs(s) ** 0.55;
    const spike = spiky ? (i % 2 ? 1.22 : 0.96) : 1;
    const wob = 1 + (rng() - 0.5) * 0.06 + (i / n) * 0.05;
    pts.push([ex * rx * spike * wob, ey * ry * spike * wob]);
  }
  if (spiky) return "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L");
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function circle(cx: number, cy: number, r: number, rng: Rng) {
  const start = rng() * Math.PI * 2;
  let d = "";
  for (let i = 0; i <= 12; i++) {
    const a = start + ((Math.PI * 2 + 0.5) * i) / 12;
    const rr = r * (1 + (rng() - 0.5) * 0.12);
    d += `${i ? "L" : "M"}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
  }
  return d;
}

/** The eraser's path: back and forth down a box (local units), a little off
 * the horizontal, each stroke running past the sides. */
function scrub(x0: number, y0: number, x1: number, y1: number, gap: number, off: number, rng: Rng) {
  const tilt = (rng() - 0.5) * 0.12 * (x1 - x0);
  let d = "";
  let i = 0;
  for (let y = y0 + off; y < y1 + gap * 0.6; y += gap, i++) {
    const l = `${f(x0 - gap * 0.3)} ${f(y - tilt + (rng() - 0.5) * gap * 0.3)}`;
    const r = `${f(x1 + gap * 0.3)} ${f(y + tilt + (rng() - 0.5) * gap * 0.3)}`;
    d += i === 0 ? `M${l}L${r}` : i % 2 ? `L${l}` : `L${r}`;
  }
  return d;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

const stroke = (p: SVGPathElement, delay: number, duration: number, easing = "cubic-bezier(.4,.1,.6,1)") => {
  p.setAttribute("pathLength", "1");
  p.style.strokeDasharray = "1";
  return p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay, duration, easing, fill: "both" });
};

export interface Written {
  /** Resolves once it's rubbed out and gone. */
  done: Promise<void>;
  /** When the eraser starts (ms from now). */
  eraseAt: number;
  box: Box;
  /** Rub it out now (an answer's question, or a page turning). */
  rub(): void;
}

/** Write a note in a page's layer. `hold` stretches the reading time. */
export function write(
  layer: SVGSVGElement,
  space: Space,
  spot: Spot,
  m: Measured,
  speaker: { x: number; y: number; r: number },
  side: "blue" | "red",
  still: boolean,
  hold = 0,
): Written {
  const id = `bp-n${++uid}`;
  const rng = seed(`${id}${m.text}`);
  const ink = PENCIL_INK[side];
  const shout = m.mood === "shout";
  const tilt = spot.angle + (shout ? (rng() - 0.5) * 7 : (rng() - 0.5) * 2.4);
  const rad = (tilt * Math.PI) / 180;
  const g = el("g", { class: `bp-note bp-note--${m.mood}`, "data-side": side, mask: `url(#${id}-rub)` });
  const inner = el("g", { transform: `translate(${f(spot.cx)} ${f(spot.cy)}) rotate(${f(tilt)})` });

  // the words, revealed left to right through a growing mask
  const words = el("text", {
    class: `bp-note__words bp-note__words--${m.mood}`,
    "font-size": f(m.size),
    fill: ink,
    "text-anchor": "middle",
    "dominant-baseline": "central",
    textLength: f(m.tw),
    mask: `url(#${id}-pen)`,
  });
  words.textContent = m.text;
  const pen = el("mask", { id: `${id}-pen`, maskUnits: "userSpaceOnUse", x: f(-m.w), y: f(-m.h * 2), width: f(m.w * 2), height: f(m.h * 4) });
  const reveal = el("rect", { x: f(-m.tw / 2 - m.size * 0.3), y: f(-m.h), width: f(m.tw + m.size * 0.6), height: f(m.h * 2), fill: "#fff" });
  reveal.classList.add("bp-note__reveal");
  pen.append(reveal);
  const ring = el("path", { class: "bp-note__ring", d: loop(m.w, m.h, rng, shout), fill: "none", stroke: ink });
  inner.append(pen, words, ring);

  // the tail, from the ring's edge toward him, stopping short of his ring
  const dx = speaker.x - spot.cx;
  const dy = speaker.y - spot.cy;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const lx = ux * Math.cos(-rad) - uy * Math.sin(-rad);
  const ly = ux * Math.sin(-rad) + uy * Math.cos(-rad);
  const edge = 1 / Math.sqrt((lx / (m.w / 2)) ** 2 + (ly / (m.h / 2)) ** 2);
  const ringR = speaker.r * 2.3;
  const t0 = edge + 1.5;
  const t1 = dist - ringR - 2;
  const parts: SVGPathElement[] = [];
  let tailBox: Box | null = null;
  if (t1 - t0 > 3) {
    const ax = spot.cx + ux * t0;
    const ay = spot.cy + uy * t0;
    const bx = spot.cx + ux * t1;
    const by = spot.cy + uy * t1;
    const bend = (rng() - 0.5) * 0.3;
    const mx = (ax + bx) / 2 - (by - ay) * bend;
    const my = (ay + by) / 2 + (bx - ax) * bend;
    parts.push(el("path", { class: "bp-note__tail", d: `M${f(ax)} ${f(ay)}Q${f(mx)} ${f(my)} ${f(bx)} ${f(by)}`, fill: "none", stroke: ink }));
    tailBox = {
      x0: Math.min(ax, bx, speaker.x - ringR) - 3,
      y0: Math.min(ay, by, speaker.y - ringR) - 3,
      x1: Math.max(ax, bx, speaker.x + ringR) + 3,
      y1: Math.max(ay, by, speaker.y + ringR) + 3,
    };
  }
  parts.push(el("path", { class: "bp-note__who", d: circle(speaker.x, speaker.y, ringR, rng), fill: "none", stroke: ink }));
  if (!tailBox)
    tailBox = { x0: speaker.x - ringR - 3, y0: speaker.y - ringR - 3, x1: speaker.x + ringR + 3, y1: speaker.y + ringR + 3 };

  // the eraser: a mask over everything, page units
  const rub = el("mask", { id: `${id}-rub`, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: f(space.w), height: f(space.h) });
  rub.append(el("rect", { x: 0, y: 0, width: f(space.w), height: f(space.h), fill: "#fff" }));
  const eraser = m.size * 0.75;
  const gap = eraser * 0.72;
  const rubs: SVGPathElement[] = [];
  const box = { x0: -m.w / 2, y0: -m.h / 2, x1: m.w / 2, y1: m.h / 2 };
  for (const [off, alpha, width] of [
    [0, 0.72, eraser],
    [gap * 0.5, 1, eraser * 1.15],
  ] as const) {
    const s = el("path", {
      d: scrub(box.x0, box.y0, box.x1, box.y1, gap, off, rng),
      transform: `translate(${f(spot.cx)} ${f(spot.cy)}) rotate(${f(tilt)})`,
      fill: "none",
      stroke: "#000",
      "stroke-opacity": alpha,
      "stroke-width": f(width),
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    rubs.push(s);
    const t = el("path", {
      d: scrub(tailBox.x0, tailBox.y0, tailBox.x1, tailBox.y1, gap * 0.9, off, rng),
      fill: "none",
      stroke: "#000",
      "stroke-opacity": alpha,
      "stroke-width": f(width),
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    rubs.push(t);
  }

  // crumbs, gathered under where it was rubbed
  const crumbs = el("g", { class: "bp-note__crumbs", fill: "#6d665c" });
  const under = { x: spot.cx, y: spot.cy + (spot.angle ? m.w / 2 : m.h / 2) + 2 };
  for (let i = 0; i < 6; i++) {
    const c = el("ellipse", {
      cx: f(under.x + (rng() - 0.5) * (spot.angle ? m.h : m.w) * 0.9),
      cy: f(under.y + rng() * 4),
      rx: f(0.9 + rng() * 0.8),
      ry: f(0.5 + rng() * 0.4),
      opacity: 0,
    });
    crumbs.append(c);
  }

  g.append(rub, inner, ...parts);
  layer.append(g, crumbs);

  const chars = m.text.length;
  const writeMs = still ? 0 : Math.min(1000, Math.max(280, chars * (shout ? 34 : 48)));
  const readMs = Math.min(2600, 1300 + chars * 45) + hold;
  const eraseMs = 720;
  const eraseAt = writeMs + 380 + readMs;
  const box2: Box = {
    x0: Math.min(spot.box.x0, tailBox.x0),
    y0: Math.min(spot.box.y0, tailBox.y0),
    x1: Math.max(spot.box.x1, tailBox.x1),
    y1: Math.max(spot.box.y1, tailBox.y1),
  };
  space.taken.push(box2);

  if (!still) {
    // on twos, like everything drawn by hand on the page
    const frames = Math.max(3, Math.round(writeMs / 83));
    reveal.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: writeMs,
      easing: `steps(${frames}, end)`,
      fill: "both",
    });
    stroke(ring, writeMs * 0.7, shout ? 200 : 280);
    let t = writeMs * 0.7 + 220;
    for (const p of parts) {
      stroke(p, t, 120);
      t += 90;
    }
  }

  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  let gone = false;
  let erasing = false;
  const finish = () => {
    if (gone) return;
    gone = true;
    g.remove();
    space.taken = space.taken.filter((b) => b !== box2);
    if (!crumbs.childElementCount || still) crumbs.remove();
    else
      crumbs
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: 500, fill: "forwards" })
        .finished.catch(() => {})
        .then(() => crumbs.remove());
    resolve();
  };
  const erase = () => {
    if (erasing || gone) return;
    erasing = true;
    clearTimeout(timer);
    if (still || !g.isConnected) {
      finish();
      return;
    }
    rub.append(...rubs);
    rubs.forEach((r, i) => {
      r.setAttribute("pathLength", "1");
      r.style.strokeDasharray = "1";
      r.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        delay: i < 2 ? 0 : eraseMs * 0.45,
        duration: eraseMs * (i < 2 ? 0.5 : 0.55),
        easing: "steps(8, end)",
        fill: "both",
      });
    });
    [...crumbs.children].forEach((c, i) =>
      c.animate([{ opacity: 0 }, { opacity: 0.5 }], { delay: 120 + i * 70, duration: 1, fill: "forwards" }),
    );
    setTimeout(finish, eraseMs + 40);
  };
  const timer = window.setTimeout(erase, eraseAt);
  return { done, eraseAt, box: box2, rub: erase };
}
