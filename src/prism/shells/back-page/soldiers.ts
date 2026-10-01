/** Soldier life in the margins, after Dotfight's soldier-life PRs (#10, with
 * #20 clarity and #24 moments stacked on it). Little dot-men camp in the
 * empty paper of each open page: the margin, the foot of a short page, the
 * gaps a heading leaves. They're alive the way Dotfight's living are, by being
 * drawn again and again: each man swaps between three drawings of himself, and
 * how fast he swaps is his heartbeat (racing when scared, held when a comrade
 * falls). Their bodies do the rest, in short runs of key drawings on twos:
 * hops, looks, shuffles, the flinch, the recoil, the volley.
 *
 * Now and then one says something in pencil, in a gap beside him, and it's
 * rubbed out after; sometimes a comrade answers. Now and then there's a quick
 * war: a snipe shoots between two lines of writing (or across the spread) and
 * a cross lands, or a man lunges into an enemy camp and its men turn on him.
 * The ink stays on the page, under the words, up to a limit.
 *
 * And the visitor plays Blue: pull a blue man back and let go to flick him at
 * Red, the way the game is played; Dawood answers with a shot of his own. A
 * poke makes a man jump and say something.
 *
 * Cheap on purpose: two SVG layers per page (ink under the words, men and
 * notes over them), sprites drawn once, the boil and the heartbeat in CSS (so
 * they stop when the prism goes idle), reactions as Web Animations, and no
 * frame loop at all: a few timers, cleared while idle. Prism faces get still
 * soldiers; reduced motion gets still soldiers and notes that come and go at
 * once, and no wars. */
import type { ShellContext } from "../types";
import type { Book } from "./book";
import { paint, svg } from "./dom";
import { BLUE, RED, cross, handCircle, seed, type Rng } from "./ink";
import { CHATS, IDLE, LINES, PAGE_LINES, PAPER_LINES, fill, pick, read, type Line, type Mood } from "./lines";
import { penNames, type ThemeId } from "./themes";
import * as notes from "./notes";
import { measurePage, type Box, type Space } from "./space";

const NS = "http://www.w3.org/2000/svg";
const FRAME = 1000 / 12;
const f = (n: number) => n.toFixed(1);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const chance = (p: number) => Math.random() < p;

type Side = "blue" | "red";
const INK: Record<Side, string> = { blue: BLUE, red: RED };
const foe = (s: Side): Side => (s === "blue" ? "red" : "blue");

/** Sprite size: every man is drawn at this radius and scaled to his own. */
const U = 4;
/** How many marks a page keeps before the oldest fade, and how many before
 * the page's own war stops. */
const MAX_MARKS = 10;
const WAR_MARKS = 6;
const PULL_MAX = 90;

// ---- key drawings (Dotfight life.ts KEYS) -----------------------------------------

/** `d` along the reaction's direction, `side` across it, `s` a stretch along
 * it (under 1 squashes), `k` a swell, `r` the heartbeat. */
interface Key {
  d?: number;
  side?: number;
  s?: number;
  k?: number;
  r?: number;
}
const KEYS = {
  hop: [{ d: 0, s: 0.76, k: 0.98 }, { d: 0.55, s: 1.3 }, { d: 1, s: 1.06 }, { d: 0.62, s: 1.2 }, { d: 0, s: 0.74, k: 1.02 }, { d: 0, s: 1.08 }],
  flinch: [
    { d: 0.15, s: 1.08, r: 2 },
    { d: 0.3, s: 1.14, k: 0.98, r: 2.6 },
    { d: 1, s: 0.58, k: 0.8, r: 4 },
    { d: 0.95, s: 0.7, k: 0.82, r: 4 },
    { d: 0.75, side: 0.3, s: 0.92, k: 0.88, r: 3.5 },
    { d: 0.6, side: -0.28, s: 1.04, k: 0.9, r: 3.2 },
    { d: 0.45, side: 0.22, k: 0.92, r: 3 },
    { d: 0.35, side: -0.16, k: 0.94, r: 2.8 },
    { d: 0.25, side: 0.1, k: 0.96, r: 2.5 },
    { d: 0.15, side: -0.05, k: 0.98, r: 2.2 },
    { d: 0.06, s: 1.04, k: 1.05, r: 1.2 },
    { d: 0, s: 1.06, k: 1.08, r: 0.5 },
    { k: 1.06, r: 0.4 },
    { k: 1.03, r: 0.6 },
    { k: 1.01, r: 0.85 },
  ],
  gasp: [{ d: 0.2, s: 1.12, k: 1.02, r: 2.5 }, { d: 0.5, s: 1.3, k: 1.06, r: 3.5 }, { d: 0.7, s: 1.38, k: 1.08, r: 4 }, { d: 0.75, s: 1.36, k: 1.08, r: 4 }],
  recoil: [{ d: -0.8, s: 0.7, k: 1.02, r: 2 }, { d: -0.5, s: 1.18, r: 1.8 }, { d: -0.15, s: 0.94, r: 1.5 }, { d: 0, s: 1.04, r: 1.3 }],
  perk: [{ d: 0, s: 0.74, k: 0.96, r: 1.4 }, { d: 0.45, s: 1.38, k: 1.1, r: 2.2 }, { d: 0.25, s: 1.16, k: 1.07, r: 2 }, { d: 0, s: 0.92, k: 1.04, r: 1.8 }, { d: 0, s: 1.06, k: 1.05, r: 1.7 }],
  jab: [{ d: 0.3, s: 1.15, r: 2.5 }, { d: 0.5, s: 1.25, k: 1.04, r: 3 }, { d: -0.35, s: 0.78, k: 1.02, r: 3.5 }, { d: 1, s: 1.38, r: 4 }, { d: 0.55, s: 1.12, r: 3 }, { d: 0.25, s: 1.04, r: 2 }, { d: 0.1, r: 1.5 }],
  land: [{ d: 0.5, s: 0.66, k: 1.04, r: 2 }, { d: 0.2, s: 1.22, r: 1.8 }, { d: 0, s: 0.9, r: 1.5 }, { d: 0, s: 1.05, r: 1.2 }],
  // new here: a man looking about, leaning one way and holding it
  look: [{ d: 0.2, s: 1.04 }, { d: 0.45, s: 1.1 }, { d: 0.5, s: 1.1 }, { d: 0.5, s: 1.1 }, { d: 0.5, s: 1.08 }, { d: 0.5, s: 1.1 }, { d: 0.35, s: 1.05 }, { d: 0.12 }],
  // dread: a pen lines up on him, and he cowers away from it, trembling
  dread: [{ d: 0.3, s: 0.9, k: 0.94, r: 2.5 }, { d: 0.5, side: 0.1, s: 0.86, k: 0.9, r: 3 }, { d: 0.55, side: -0.1, s: 0.86, k: 0.9, r: 3 }, { d: 0.55, side: 0.1, s: 0.86, k: 0.9, r: 3 }, { d: 0.55, side: -0.1, s: 0.86, k: 0.9, r: 3 }, { d: 0.5, side: 0.08, s: 0.88, k: 0.9, r: 3 }, { d: 0.5, side: -0.08, s: 0.88, k: 0.9, r: 3 }, { d: 0.45, s: 0.9, k: 0.92, r: 3 }],
  // wind-up before a shot: drawn back from the line, stretched along it, shivering
  windup: [{ d: -0.2, s: 1.1, r: 2 }, { d: -0.45, s: 1.22, r: 2.5 }, { d: -0.6, s: 1.3, r: 3 }, { d: -0.62, side: 0.06, s: 1.32, r: 3.5 }, { d: -0.62, side: -0.06, s: 1.32, r: 3.5 }, { d: -0.62, side: 0.06, s: 1.32, r: 3.5 }, { d: -0.62, side: -0.06, s: 1.32, r: 3.5 }, { d: -0.62, side: 0.06, s: 1.32, r: 3.5 }],
  // a campmate falls: he holds still, leaning toward the cross, a little smaller
  mourn: [{ d: 0.2, k: 0.97, r: 0 }, { d: 0.35, k: 0.94, r: 0 }, { d: 0.4, k: 0.93, r: 0 }, { d: 0.4, k: 0.93, r: 0 }, { d: 0.4, k: 0.93, r: 0 }, { d: 0.4, k: 0.93, r: 0 }, { d: 0.4, k: 0.93, r: 0 }, { d: 0.4, k: 0.93, r: 0 }, { d: 0.35, k: 0.94, r: 0.3 }, { d: 0.3, k: 0.95, r: 0.4 }, { d: 0.2, k: 0.97, r: 0.5 }, { d: 0.1, k: 0.98, r: 0.6 }],
} satisfies Record<string, Key[]>;
type KeyName = keyof typeof KEYS;

/** How far each reaction travels, in his own radii. */
const AMP: Record<KeyName, number> = { hop: 1.7, flinch: 1.9, gasp: 1, recoil: 1.4, perk: 1.2, jab: 1.6, land: 1.2, look: 0.9, dread: 1.4, windup: 1.4, mourn: 0.5 };

function pose(dir: number, k: Key, amp: number) {
  const a = (dir * Math.PI) / 180;
  const d = (k.d ?? 0) * amp;
  const sd = (k.side ?? 0) * amp;
  const ox = Math.cos(a) * d - Math.sin(a) * sd;
  const oy = Math.sin(a) * d + Math.cos(a) * sd;
  const s = k.s ?? 1;
  const sw = k.k ?? 1;
  return `translate(${f(ox)}px, ${f(oy)}px) rotate(${f(dir)}deg) scale(${(sw * s).toFixed(3)}, ${(sw / Math.sqrt(s)).toFixed(3)}) rotate(${f(-dir)}deg)`;
}
const REST = pose(0, {}, 0);

/** Where a cubic-bezier easing has got to: given how far along the path a
 * point is, when (0..1 of the duration) the line's head passes it. */
function whenAt(progress: number, [x1, y1, x2, y2]: number[]) {
  const bez = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  for (let i = 1; i <= 60; i++) {
    const t = i / 60;
    if (bez(t, y1, y2) >= progress) return bez(t, x1, x2);
  }
  return 1;
}
const SHOT_EASE = [0.05, 0.6, 0.15, 1];

// ---- sprites, drawn once --------------------------------------------------------------

/** A man: a pressed biro blob and a loose scribble round it. Three drawings
 * of him, which he swaps between. */
function manDrawing(ink: string, rng: Rng) {
  const pts: [number, number][] = [];
  const n = 9;
  const start = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    const r = U * (0.86 + rng() * 0.22);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  const loop = handCircle((rng() - 0.5) * 0.6, (rng() - 0.5) * 0.6, U * 1.12, rng);
  return `<path d="${d}Z" fill="${ink}"/><path d="${loop}" fill="none" stroke="${ink}" stroke-width=".7" stroke-opacity=".75" stroke-linecap="round"/>`;
}

function mountSprites(desk: HTMLElement) {
  let defs = "";
  for (const side of ["blue", "red"] as Side[]) {
    const rng = seed(`man-${side}`);
    for (let i = 0; i < 3; i++) defs += `<g id="bp-man-${side}-${i}">${manDrawing(INK[side], rng)}</g>`;
  }
  desk.append(svg(`<svg class="bp-life-defs" width="0" height="0" aria-hidden="true"><defs>${defs}</defs></svg>`));
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  paint(e);
  return e;
}

// ---- who's on a page --------------------------------------------------------------------

interface Man {
  side: Side;
  camp: Camp;
  life: PageLife;
  x: number;
  y: number;
  r: number;
  g: SVGGElement;
  pose: SVGGElement;
  alive: boolean;
  /** Mid-something: a walk, a lunge, in the visitor's hand. */
  busy: boolean;
  pokes: number;
  lastPoke: number;
  pulse?: number;
}

interface Camp {
  side: Side;
  x: number;
  y: number;
  R: number;
  men: Man[];
  g: SVGGElement;
  stand: boolean;
}

interface PageLife {
  page: HTMLElement;
  kind: string;
  space: Space;
  ink: SVGSVGElement;
  top: SVGSVGElement;
  camps: Camp[];
  marks: SVGElement[];
  /** The handwriting size of the page, for notes. */
  base: number;
  /** Where the page sits on the open spread, in page widths. */
  ready: boolean;
  spare: boolean;
  ended: boolean;
}

const byMan = new WeakMap<Element, Man>();

export function mountSoldiers(ctx: ShellContext, book: Book, desk: HTMLElement) {
  const troupe = new Troupe(ctx, book, desk);
  book.placed = (pages) => troupe.placed(pages);
  // a handle for capture scripts in development: bpLife.war(), bpLife.chatter()
  if (import.meta.env.DEV) (window as unknown as { bpLife: Troupe }).bpLife = troupe;
  return troupe;
}

class Troupe {
  private lives = new WeakMap<HTMLElement, PageLife>();
  private timers = new Set<number>();
  private talking = 0;
  private quietUntil = 0;
  private hinted = false;
  private running = false;
  /** Alive: boiling, reacting, fighting. Still: prism faces and reduced motion. */
  private alive: boolean;

  constructor(
    private ctx: ShellContext,
    private book: Book,
    desk: HTMLElement,
  ) {
    this.alive = !ctx.face && !ctx.reducedMotion;
    mountSprites(desk);
    if (ctx.face) return;
    ctx.onIdleChange((idle) => (idle ? this.stop() : this.start()));
    ctx.signal.addEventListener("abort", () => this.stop());
    this.listen(desk);
    if (!ctx.isIdle()) this.start();
  }

  // ---- timers: the only clock, cleared while the prism is idle --------------------------

  private after(ms: number, fn: () => void) {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  private start() {
    if (this.running || this.ctx.signal.aborted) return;
    this.running = true;
    if (this.alive) {
      this.loop(() => rand(900, 2000), () => this.fidget(), rand(800, 1500));
      this.loop(() => rand(9000, 16000), () => this.war(), rand(6000, 9000));
    }
    this.loop(() => rand(7500, 13000), () => this.chatter(), rand(2600, 4200));
  }

  private stop() {
    this.running = false;
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
  }

  private loop(every: () => number, fn: () => void, first: number) {
    const tick = () => {
      if (!this.running) return;
      if (this.calm()) fn();
      this.after(every(), tick);
    };
    this.after(first, tick);
  }

  /** Nothing in the way: no page turning, no sheet over the book, the tab seen. */
  private calm() {
    return (
      !this.ctx.isIdle() &&
      document.visibilityState === "visible" &&
      this.book.corners.dataset.state !== "turning" &&
      !this.book.loose
    );
  }

  // ---- pages arrive ------------------------------------------------------------------

  placed(pages: HTMLElement[]) {
    for (const page of pages) {
      if (this.lives.has(page)) continue;
      const kind = page.dataset.kind ?? "";
      if (["cover", "inside-cover", "back"].includes(kind) || "oversize" in page.dataset) continue;
      this.settle(page, 0);
    }
  }

  /** Wait for the page to lie still (the book arriving, a leaf landing), then
   * measure it and camp the men on it. */
  private settle(page: HTMLElement, tries: number) {
    const still =
      page.isConnected &&
      page.parentElement?.classList.contains("bp-slot") &&
      this.book.el.getAnimations().length === 0 &&
      this.book.corners.dataset.state !== "turning";
    if (!still) {
      if (tries < 40 && page.isConnected) setTimeout(() => this.settle(page, tries + 1), 150);
      return;
    }
    if (this.lives.has(page)) return;
    const life = this.populate(page);
    if (life) this.lives.set(page, life);
  }

  private populate(page: HTMLElement): PageLife | null {
    const spare = !!page.querySelector(".bp-spare");
    if (spare && !this.alive) return null;
    const war = page.querySelector<SVGSVGElement>(".bp-miniwar");
    if (spare && war) {
      war.style.display = "none";
      const note = page.querySelector(".bp-spare__note");
      const [mine] = penNames(page);
      if (note) note.textContent = `(a quick war, during maths. Your go: pull a ${mine.toLowerCase()} man back, let go)`;
    }
    const others = [...this.book.corners.querySelectorAll(".bp-corner"), ...this.book.shelf.querySelectorAll("li")];
    const space = measurePage(page, others);
    const flow = page.querySelector<HTMLElement>(".bp-flow");
    const cs = getComputedStyle(page);
    const fs = parseFloat(cs.fontSize) || 18;
    const margin = flow ? parseFloat(getComputedStyle(flow).paddingLeft) - fs * 0.55 : 0;
    const side = page.dataset.side;
    const rng = seed(`${location.pathname}|${page.dataset.kind}|${page.querySelector(".bp-page__head b")?.textContent ?? ""}|${side}`);

    // camps, in the clearest paper: the margin first, then any wide gap
    const dotR = clamp(fs * 0.14, 2.3, 3.1);
    const big = spare ? fs * 1.05 : fs * 0.82;
    const small = fs * 0.6;
    const edge = 7;
    const spineL = side === "right" ? 20 : edge;
    const spineR = side === "left" ? 20 : edge;
    const found: { x: number; y: number; R: number; score: number }[] = [];
    for (const R of [big, small]) {
      const pad = R + 4;
      // never up in the head of the page, among its number and date
      const headEl = page.querySelector<HTMLElement>(".bp-page__head");
      const head = headEl && !spare ? headEl.offsetTop + headEl.offsetHeight + fs * 1.2 : 0;
      for (let y = Math.max(pad + edge, head + pad); y < space.h - pad - edge; y += 6) {
        for (let x = pad + spineL; x < space.w - pad - spineR; x += 6) {
          if (!space.clear({ x0: x - pad, y0: y - pad, x1: x + pad, y1: y + pad })) continue;
          let score = rng() * 3 + (R === big ? 2 : 0);
          if (x < margin && !spare) score += 4;
          found.push({ x, y, R, score });
        }
      }
    }
    found.sort((a, b) => b.score - a.score);
    const want = spare ? 6 : page.dataset.side === "single" ? 2 : 3;
    const chosen: typeof found = [];
    if (spare) {
      // an empty page: spread the camps over it, each as far from the rest as it can be
      const pool = found.filter((c) => c.R === big);
      if (pool.length) chosen.push(pool[Math.floor(rng() * pool.length)]);
      while (chosen.length < want && pool.length) {
        let best: (typeof found)[number] | null = null;
        let bestD = 0;
        for (const c of pool) {
          const d = Math.min(...chosen.map((o) => Math.hypot(o.x - c.x, o.y - c.y))) * (0.85 + rng() * 0.3);
          if (d > bestD) {
            bestD = d;
            best = c;
          }
        }
        if (!best || bestD < big * 3.2) break;
        chosen.push(best);
      }
    } else
      for (const c of found) {
        if (chosen.length >= want) break;
        if (chosen.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < (o.R + c.R) * 2.2 + 14)) continue;
        chosen.push(c);
      }
    if (!chosen.length) return null;

    const ink = el("svg", { class: "bp-life-ink", viewBox: `0 0 ${f(space.w)} ${f(space.h)}`, "aria-hidden": "true" });
    const top = el("svg", { class: "bp-life", viewBox: `0 0 ${f(space.w)} ${f(space.h)}`, "aria-hidden": "true" });
    page.prepend(ink);
    page.append(top);
    const life: PageLife = {
      page,
      kind: spare ? "spare" : (page.dataset.kind ?? ""),
      space,
      ink,
      top,
      camps: [],
      marks: [],
      base: fs,
      ready: true,
      spare,
      ended: false,
    };
    // sides: on a spare page, Red up top and Blue below, like the war drawn
    // there before; elsewhere they take turns, so every page has both if it can
    const first: Side = side === "right" ? "red" : "blue";
    const byY = [...chosen].sort((p, q) => p.y - q.y);
    const sides = chosen.map((c, i): Side =>
      spare ? (byY.indexOf(c) < Math.floor(chosen.length / 2) ? "red" : "blue") : i % 2 ? foe(first) : first,
    );
    const reveal = this.alive;
    chosen.forEach((c, i) => {
      const camp = this.camp(life, c.x, c.y, c.R, sides[i], dotR, spare ? 5 : c.R === big ? 4 : 3, rng, reveal ? 500 + i * 260 : -1);
      life.camps.push(camp);
      space.taken.push({ x0: c.x - c.R - 3, y0: c.y - c.R - 3, x1: c.x + c.R + 3, y1: c.y + c.R + 3 });
    });
    if (this.alive) setTimeout(() => top.setAttribute("data-boil", ""), 500 + chosen.length * 260 + 600);
    return life;
  }

  private camp(life: PageLife, cx: number, cy: number, R: number, side: Side, r: number, count: number, rng: Rng, reveal: number): Camp {
    const g = el("g", { class: "bp-camp-life", "data-side": side });
    g.style.setProperty("--beat", "0.62s");
    g.style.setProperty("--o", `${(-rng() * 2).toFixed(2)}s`);
    const guide = el("circle", { class: "bp-camp-life__guide", cx: f(cx), cy: f(cy), r: f(R * 1.08), fill: "none" });
    const ring = el("g", { class: "bp-camp-life__ring" });
    for (let i = 0; i < 3; i++) {
      const p = el("path", { d: handCircle(cx, cy, R, rng), class: `bp-f${i}`, fill: "none", stroke: INK[side] });
      p.style.setProperty("--k", String(i));
      ring.append(p);
    }
    g.append(guide, ring);
    life.top.append(g);
    const camp: Camp = { side, x: cx, y: cy, R, men: [], g, stand: false };
    const spots: [number, number][] = [];
    let guard = 0;
    while (spots.length < count && guard++ < 300) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * R * 0.6;
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      if (spots.every(([px, py]) => Math.hypot(px - x, py - y) > r * 2.9)) spots.push([x, y]);
    }
    spots.forEach(([x, y], i) => {
      const man = this.man(life, camp, x, y, r, rng);
      camp.men.push(man);
      if (reveal >= 0)
        man.pose.animate(
          [
            { opacity: 0, transform: "scale(0.2)" },
            { opacity: 1, transform: "scale(1.35)", offset: 0.6 },
            { opacity: 1, transform: "scale(1)" },
          ],
          { delay: reveal + 380 + i * 70, duration: 170, easing: "cubic-bezier(.2,.8,.25,1)", fill: "backwards" },
        );
    });
    if (reveal >= 0) {
      const p = ring.querySelector<SVGPathElement>(".bp-f0")!;
      p.setAttribute("pathLength", "1");
      p.style.strokeDasharray = "1";
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        delay: reveal,
        duration: 420,
        easing: "cubic-bezier(.4,.05,.6,1)",
        fill: "backwards",
      }).finished.then(
        () => (p.style.strokeDasharray = ""),
        () => {},
      );
      guide.animate([{ opacity: 0 }, { opacity: 1 }], { delay: reveal, duration: 200, fill: "backwards" });
    }
    return camp;
  }

  private man(life: PageLife, camp: Camp, x: number, y: number, r: number, rng: Rng): Man {
    const g = el("g", { class: "bp-man", "data-side": camp.side });
    g.style.transform = `translate(${f(x)}px, ${f(y)}px)`;
    g.style.setProperty("--o", `${(-rng() * 2).toFixed(2)}s`);
    const p = el("g", { class: "bp-man__pose" });
    const body = el("g", { class: "bp-man__body", transform: `scale(${(r / U).toFixed(3)})` });
    for (let i = 0; i < 3; i++) {
      const use = el("use", { href: `#bp-man-${camp.side}-${i}`, class: `bp-f${i}` });
      use.style.setProperty("--k", String(i));
      body.append(use);
    }
    p.append(body);
    g.append(p);
    if (!this.ctx.face) {
      const hit = el("circle", { class: "bp-man__hit", r: f(Math.max(9, r * 3.4)) });
      g.append(hit);
    }
    camp.g.append(g);
    const man: Man = { side: camp.side, camp, life, x, y, r, g, pose: p, alive: true, busy: false, pokes: 0, lastPoke: -Infinity };
    const hit = g.querySelector(".bp-man__hit");
    if (hit) byMan.set(hit, man);
    return man;
  }

  // ---- who's about -------------------------------------------------------------------------

  private showing(): PageLife[] {
    const out: PageLife[] = [];
    for (const page of this.book.showing) {
      const life = this.lives.get(page);
      if (life?.ready && page.isConnected && page.dataset.side !== "leaf") out.push(life);
    }
    return out;
  }

  /** Where a page sits on the open spread: the right page starts a page's width in. */
  private offset(life: PageLife) {
    return life.page.dataset.side === "right" ? life.space.w : 0;
  }

  private living(lives = this.showing()) {
    return lives.flatMap((l) => l.camps.flatMap((c) => c.men.filter((m) => m.alive)));
  }

  private at(m: Man) {
    return { x: this.offset(m.life) + m.x, y: m.y };
  }

  // ---- bodies -------------------------------------------------------------------------------

  private react(m: Man, name: KeyName, dir: number, delay = 0, scale = 1) {
    if (!this.alive) return;
    const keys: Key[] = KEYS[name];
    const amp = AMP[name] * m.r * scale;
    const frames: Keyframe[] = keys.map((k) => ({ transform: pose(dir, k, amp), easing: "step-end" }));
    frames.push({ transform: REST });
    m.pose.animate(frames, { duration: keys.length * FRAME, delay, easing: "linear" });
    const beat = Math.max(...keys.map((k) => k.r ?? 1));
    const still = keys.every((k) => (k.r ?? 1) === 0 || k.r === undefined) && name === "mourn";
    if (beat > 2.2) this.beat(m, "race", delay, keys.length * FRAME + 300);
    else if (still) this.beat(m, "still", delay, 750).then(() => this.beat(m, "slow", 0, 2600));
  }

  /** His heartbeat: how fast his drawings swap, for a while. */
  private beat(m: Man | Camp, pulse: "race" | "slow" | "still", delay: number, ms: number) {
    return new Promise<void>((done) => {
      setTimeout(() => {
        m.g.setAttribute("data-pulse", pulse);
        setTimeout(() => {
          if (m.g.getAttribute("data-pulse") === pulse) m.g.removeAttribute("data-pulse");
          done();
        }, ms);
      }, delay);
    });
  }

  private moveTo(m: Man, x: number, y: number, ms: number, hops: number) {
    const from = `translate(${f(m.x)}px, ${f(m.y)}px)`;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= hops; i++) {
      const t = i / hops;
      frames.push({ transform: `translate(${f(m.x + (x - m.x) * t)}px, ${f(m.y + (y - m.y) * t)}px)`, easing: "step-end" });
    }
    frames[0] = { transform: from, easing: "step-end" };
    m.x = x;
    m.y = y;
    m.g.style.transform = `translate(${f(x)}px, ${f(y)}px)`;
    m.g.animate(frames, { duration: ms, easing: "linear" });
    for (let i = 0; i < hops; i++) this.react(m, "hop", -90, (ms / hops) * i, 0.5);
  }

  private die(m: Man, killer: Side, delay: number) {
    m.alive = false;
    setTimeout(() => {
      m.g.setAttribute("data-dead", "");
      m.g.removeAttribute("data-pulse");
      const rng = seed(`x${m.x}${m.y}`);
      const x = svg(`<svg>${cross(m.x, m.y, m.r * 2.1, rng, INK[killer])}</svg>`).firstElementChild as SVGPathElement;
      x.classList.add("bp-life-cross");
      m.g.after(x);
      if (this.alive)
        x.animate(
          [
            { opacity: 0, transform: "scale(0.2)" },
            { opacity: 1, transform: "scale(1.35)", offset: 0.6 },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 160, easing: "cubic-bezier(.2,.8,.25,1)" },
        );
      // his campmates hold still, leaning toward him, and their ring with them
      for (const mate of m.camp.men)
        if (mate.alive && mate !== m) this.react(mate, "mourn", angle(mate, m), 80 + Math.random() * 120);
      this.beat(m.camp, "still", 0, 900);
      const left = m.camp.men.filter((x) => x.alive);
      if (left.length === 1 && m.camp.men.length > 2 && !m.camp.stand) this.lastStand(m.camp);
    }, delay);
  }

  /** The last man of a camp (Dotfight #24): the ring inked twice, heavier,
   * and he says so. */
  private lastStand(camp: Camp) {
    camp.stand = true;
    const ring = el("path", { class: "bp-camp-life__stand", d: handCircle(camp.x, camp.y, camp.R * 1.18, seed(`stand${camp.x}`)), fill: "none", stroke: INK[camp.side] });
    camp.g.prepend(ring);
    ring.setAttribute("pathLength", "1");
    ring.style.strokeDasharray = "1";
    ring.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 380, fill: "backwards" }).finished.then(
      () => (ring.style.strokeDasharray = ""),
      () => {},
    );
    const last = camp.men.find((m) => m.alive);
    if (last) setTimeout(() => this.say(last, { t: "LAST STAND!", mood: "shout" }, { force: true }), 500);
  }

  // ---- idle life --------------------------------------------------------------------------

  private fidget() {
    const men = this.living().filter((m) => !m.busy);
    const m = pick(men);
    if (!m) return;
    const roll = Math.random();
    if (roll < 0.36) {
      // looks about; sometimes one way, then the other
      const dir = rand(-180, 180);
      this.react(m, "look", dir);
      if (chance(0.4)) this.react(m, "look", dir + 180 + rand(-30, 30), KEYS.look.length * FRAME + 120);
    } else if (roll < 0.6) {
      this.react(m, "hop", -90, 0, 0.8);
    } else if (roll < 0.8) {
      // shuffles to a new spot in the camp
      const c = m.camp;
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * c.R * 0.6;
        const x = c.x + Math.cos(a) * d;
        const y = c.y + Math.sin(a) * d;
        if (Math.hypot(x - m.x, y - m.y) < m.r * 1.5) continue;
        if (c.men.some((o) => o !== m && Math.hypot(o.x - x, o.y - y) < m.r * 2.8)) continue;
        this.moveTo(m, x, y, 420, 3);
        break;
      }
    } else if (roll < 0.94) {
      // turns to a mate, who turns back: they're talking
      const mate = pick(m.camp.men.filter((o) => o.alive && o !== m && !o.busy));
      if (!mate) return;
      this.react(m, "look", angle(m, mate));
      this.react(mate, "look", angle(mate, m), 250);
    } else this.stroll(m);
  }

  /** Out of camp for a bit, and back. */
  private stroll(m: Man) {
    const { space } = m.life;
    const c = m.camp;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = c.R + rand(8, 22);
      const x = c.x + Math.cos(a) * d;
      const y = c.y + Math.sin(a) * d;
      const pad = m.r * 2;
      const box = { x0: x - pad, y0: y - pad, x1: x + pad, y1: y + pad };
      // the paper must be clear, apart from his own camp
      const taken = space.taken;
      space.taken = taken.filter((t) => !(t.x0 < c.x && t.x1 > c.x && t.y0 < c.y && t.y1 > c.y));
      const ok = space.clear(box);
      space.taken = taken;
      if (!ok) continue;
      const hx = m.x;
      const hy = m.y;
      m.busy = true;
      this.moveTo(m, x, y, 900, 6);
      this.after(900 + rand(1400, 2600), () => {
        if (m.alive) this.moveTo(m, hx, hy, 800, 5);
        setTimeout(() => (m.busy = false), 820);
      });
      if (chance(0.35)) this.after(1000, () => this.say(m, pick(["it's cold out here", "I'm very alone", "can I come back in", "it's quiet. too quiet", "long way from camp", "just stretching"])));
      return;
    }
  }

  // ---- talk -----------------------------------------------------------------------------------

  chatter() {
    if (this.talking) return;
    const lives = this.showing();
    const men = this.living(lives);
    const m = pick(men);
    if (!m) return;
    if (m.life.ended && chance(0.5)) return void this.say(m, pick(LINES.ended));
    const mates = m.camp.men.filter((o) => o.alive && o !== m);
    const roll = Math.random();
    const page = PAGE_LINES[m.life.kind];
    const theme = m.life.page.closest<HTMLElement>("[data-theme]")?.dataset.theme as ThemeId | undefined;
    const paper = theme ? PAPER_LINES[theme] : undefined;
    let line: Line;
    if (roll < 0.4 && mates.length) line = pick(CHATS);
    else if (roll < 0.58 && page) line = pick(page);
    else if (roll < 0.7 && paper) line = pick(paper);
    else if (roll < 0.78) line = pick(LINES.banter);
    else line = pick(IDLE);
    if (typeof line !== "string" && line.reply && !mates.length) line = pick(IDLE);
    void this.say(m, line);
  }

  /** He writes a line beside him; an exchange's answer comes from a mate. */
  async say(m: Man, line: Line, { force = false, hold = 0 } = {}): Promise<boolean> {
    if (!force && this.talking) return false;
    const life = m.life;
    if (!life.page.isConnected) return false;
    const said = read(line, "say");
    const names = penNames(life.page);
    const me = m.side === "blue" ? names[0] : names[1];
    const them = m.side === "blue" ? names[1] : names[0];
    const text = fill(said.text, me, them);
    const reply = said.reply ? fill(said.reply, me, them) : undefined;
    const mood = said.mood;
    const words = notes.measure(life.top, text, mood, life.base);
    const spot = notes.findSpot(life.space, m, words);
    if (!spot) return false;
    this.talking++;
    const still = !this.alive;
    const w = notes.write(life.top, life.space, spot, words, m, m.side, still, hold + (reply ? 900 : 0));
    if (this.alive && m.alive) this.react(m, "perk", -90, 0, 0.6);
    if (reply) {
      const mate = pick(m.camp.men.filter((o) => o.alive && o !== m)) ?? null;
      if (mate)
        setTimeout(() => {
          if (!this.alive || mate.alive) this.react(mate, "look", angle(mate, m));
          void this.answer(mate, reply, m, w);
        }, Math.min(w.eraseAt - 400, 1150 + text.length * 30));
    }
    await w.done;
    this.talking--;
    return true;
  }

  private async answer(mate: Man, text: string, to: Man, question: notes.Written) {
    const life = mate.life;
    const words = notes.measure(life.top, text, "say", life.base);
    const spot = notes.findSpot(life.space, mate, words, to);
    if (!spot) return;
    this.talking++;
    const w = notes.write(life.top, life.space, spot, words, mate, mate.side, !this.alive);
    // the question is rubbed out a moment before the answer
    setTimeout(() => question.rub(), Math.max(0, w.eraseAt - 450));
    await w.done;
    this.talking--;
  }

  /** A moment worth a word, if no one's talking and the dice say so. */
  private maybe(m: Man | undefined, lines: Line[], p: number, mood: Mood = "say") {
    if (!m || this.talking || !chance(p)) return;
    const l = pick(lines);
    void this.say(m, typeof l === "string" ? { t: l, mood } : l);
  }

  // ---- war ----------------------------------------------------------------------------------

  war() {
    if (performance.now() < this.quietUntil) return;
    const lives = this.showing().filter((l) => !l.ended && l.marks.length < WAR_MARKS);
    if (!lives.length) return;
    const men = this.living(lives).filter((m) => !m.busy);
    if (!men.length) return;
    // a lunge if a camp of the other side is on the same page and the way is clear
    if (chance(0.3)) {
      for (const m of shuffle(men).slice(0, 8)) {
        const camps = m.life.camps.filter((c) => c.side === foe(m.side) && c.men.some((x) => x.alive));
        for (const c of shuffle(camps)) {
          const tx = c.x + rand(-0.25, 0.25) * c.R;
          const ty = c.y + rand(-0.25, 0.25) * c.R;
          if (Math.hypot(tx - m.x, ty - m.y) < c.R * 2.5) continue;
          if (!m.life.space.passes(m.x, m.y, tx, ty)) continue;
          this.lunge(m, c, tx, ty);
          return;
        }
      }
    }
    const wide = chance(0.4);
    const shot = this.lane(men, lives, undefined, wide) ?? this.lane(men, lives, undefined, !wide);
    if (shot) this.snipe(shot.m, shot.to, "auto", shot.from);
    else {
      // nothing left to shoot at: this war's over
      for (const l of lives) {
        const own = this.living([l]);
        if (!this.lane(own, [l], undefined, false) && !this.lane(own, [l], undefined, true)) l.ended = true;
      }
    }
  }

  /** Find a shot that runs clear of the writing on every page it crosses:
   * between two lines, down the margin, over the gap at the foot. Prefer the
   * long ones, which cross the most paper. */
  /** Find a shot that runs clear of the writing on every page it crosses:
   * between two lines of words, across the spread, down the margin, over the
   * gap at the foot of a page. A man may shuffle up or down his camp to line
   * up with a gap first (positioning, as in Dotfight). The best shots cross
   * the most paper. */
  private lane(men: Man[], lives: PageLife[], prefer?: Camp, wide = chance(0.4)) {
    type Shot = { m: Man; from: { x: number; y: number }; to: { x: number; y: number }; score: number };
    const found: Shot[] = [];
    const ready = new Set(men);
    const camps = lives.flatMap((l) => l.camps.map((c) => ({ c, l })));
    let checks = 0;
    const pairs: { A: (typeof camps)[number]; B: (typeof camps)[number] }[] = [];
    for (const A of camps)
      for (const B of camps)
        if (A.c.side !== B.c.side && A.c.men.some((m) => m.alive && ready.has(m)) && B.c.men.some((m) => m.alive))
          pairs.push({ A, B });
    const ordered = shuffle(pairs).sort((p, q) => (prefer ? +(q.B.c === prefer) - +(p.B.c === prefer) : 0));
    for (const { A, B } of ordered) {
      const ao = this.offset(A.l);
      const bo = this.offset(B.l);
      const ax = ao + A.c.x;
      const bx = bo + B.c.x;
      if (Math.hypot(bx - ax, B.c.y - A.c.y) < A.c.R * 4) continue;
      const toward = Math.sign(bx - ax) || 1;
      let best: Shot | null = null;
      const dys: number[] = [];
      for (let d = 0; d <= A.c.R * 0.62; d += 2) dys.push(d, -d);
      const eys: number[] = [];
      for (let e = 0; e <= B.c.R * 1.15; e += 2) eys.push(e, -e);
      outer: for (const dy of shuffle(dys)) {
        const from = { x: ax + toward * A.c.R * 0.25, y: A.c.y + dy };
        for (const ey of eys) {
          if (++checks > 9000) break outer;
          const to = { x: bx, y: B.c.y + ey };
          if (!lives.every((l) => this.clearOn(l, from, to))) continue;
          const close = B.c.men.some((t) => t.alive && segDist(this.at(t), from, to).d < t.r * 1.9);
          if (close === wide) continue;
          const shooter = A.c.men
            .filter((m) => m.alive && ready.has(m))
            .sort((p, q) => Math.abs(p.y - from.y) - Math.abs(q.y - from.y))[0];
          if (!shooter) break outer;
          const across = Math.abs(to.x - from.x);
          best = { m: shooter, from, to, score: across * 1.2 + Math.abs(to.y - from.y) * 0.2 + Math.random() * 80 + (B.c === prefer ? 400 : 0) };
          break outer;
        }
      }
      if (best) found.push(best);
      if (checks > 9000 || found.length > 6) break;
    }
    if (!found.length) return null;
    found.sort((p, q) => q.score - p.score);
    return found[Math.floor(Math.random() * Math.min(2, found.length))];
  }

  private clearOn(l: PageLife, a: { x: number; y: number }, b: { x: number; y: number }) {
    const o = this.offset(l);
    return l.space.passes(a.x - o, a.y, b.x - o, b.y);
  }

  /** A flick: the line shoots out, men by it flinch, a man it reaches is
   * crossed out. `to` is where it's aimed (spread coordinates); the visitor's
   * flicks run their full reach, Dawood's stop at their mark. */
  private snipe(m: Man, to: { x: number; y: number }, by: "auto" | "user" | "bot", from?: { x: number; y: number }) {
    const lives = this.showing();
    if (from) {
      const here = this.at(m);
      if (Math.hypot(from.x - here.x, from.y - here.y) > 1.5) {
        // he shuffles into position first
        m.busy = true;
        const o = this.offset(m.life);
        const others = m.camp.men.filter((x) => x !== m && x.alive && Math.hypot(x.x - (from.x - o), x.y - from.y) < m.r * 2.6);
        // anyone standing there budges up
        for (const x of others) this.moveTo(x, x.x + (x.x < from.x - o ? -1 : 1) * m.r * 2.4, x.y, 260, 2);
        this.moveTo(m, from.x - o, from.y, 380, 3);
        setTimeout(() => this.snipe(m, to, by), 430);
        return;
      }
    }
    const a = this.at(m);
    const aim = by === "user" ? 0 : 700;
    m.busy = true;
    const dir = Math.atan2(to.y - a.y, to.x - a.x);
    const deg = (dir * 180) / Math.PI;
    const len = Math.hypot(to.x - a.x, to.y - a.y);
    // the line runs on a little past where it was aimed, if the paper's clear
    let end = to;
    if (by !== "user") {
      const run = len * rand(0.05, 0.25);
      const far = { x: to.x + Math.cos(dir) * run, y: to.y + Math.sin(dir) * run };
      if (lives.every((l) => this.clearOn(l, to, far))) end = far;
    }
    const total = Math.hypot(end.x - a.x, end.y - a.y);
    const dur = clamp(total * 0.9, 150, 340);

    // aiming: he winds up; the men in the line of fire cower
    if (aim) {
      this.react(m, "windup", deg);
      for (const x of this.living(lives)) {
        if (x === m || x.side === m.side) continue;
        const near = segDist(this.at(x), a, end);
        if (near.d < x.r * 9) this.react(x, "dread", angleFromLine(this.at(x), a, end), rand(80, 260));
      }
      if (by === "auto") this.maybe(m, LINES.snipe, 0.25, "shout");
    }

    setTimeout(() => {
      if (!m.life.page.isConnected) return;
      m.busy = false;
      this.react(m, "recoil", deg);
      // the ink, on every open page it crosses, under the words
      const rng = seed(`${a.x}${a.y}${Date.now()}`);
      const width = (0.9 + rng() * 0.5).toFixed(2);
      for (const l of lives) {
        const o = this.offset(l);
        const line = el("path", {
          class: "bp-life-flick",
          d: `M${f(a.x - o)} ${f(a.y)}L${f(end.x - o)} ${f(end.y)}`,
          stroke: INK[m.side],
          "stroke-width": width,
          fill: "none",
        });
        if (by === "user") line.setAttribute("data-by", "you");
        l.ink.append(line);
        this.mark(l, line);
        if (this.alive) {
          line.setAttribute("pathLength", "1");
          line.style.strokeDasharray = "1";
          line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur, easing: `cubic-bezier(${SHOT_EASE.join(",")})`, fill: "backwards" }).finished.then(
            () => (line.style.strokeDasharray = ""),
            () => {},
          );
        }
      }
      // who it reaches, and who it goes by
      const killed: Man[] = [];
      let nearest: Man | null = null;
      let nearestD = Infinity;
      for (const x of this.living(lives)) {
        if (x === m) continue;
        const p = this.at(x);
        const near = segDist(p, a, end);
        const when = whenAt(near.t, SHOT_EASE) * dur;
        if (x.side !== m.side && near.d <= x.r * 1.9) {
          killed.push(x);
          this.react(x, "gasp", angleFromLine(p, a, end), Math.max(0, when - 4 * FRAME));
          this.die(x, m.side, when);
        } else if (near.d < x.r * 9) {
          this.react(x, "flinch", angleFromLine(p, a, end), Math.max(0, when - 2 * FRAME), x.side === m.side ? 0.6 : 1);
          if (x.side !== m.side && near.d < nearestD) {
            nearestD = near.d;
            nearest = x;
          }
        }
      }
      // after: the shooter's camp cheers a kill, the near-missed breathe out
      setTimeout(() => {
        if (killed.length) {
          m.camp.men
            .filter((x) => x.alive)
            .forEach((x, i) => {
              this.react(x, "hop", -90, i * 70);
              if (x === m) this.react(x, "hop", -90, i * 70 + KEYS.hop.length * FRAME);
            });
          if (killed.length > 1) void this.say(m, { t: pick(LINES.more) as string, mood: "say" }, { force: true });
          else if (chance(0.5)) this.maybe(m, LINES.kill, 0.6);
          else this.maybe(pick(killed[0].camp.men.filter((x) => x.alive)), LINES.mourn, 0.6);
        } else if (nearest) this.maybe(nearest, LINES.phew, 0.5);
        else if (by !== "user") this.maybe(m, LINES.miss, 0.3);
      }, dur + 260);
    }, aim);
  }

  /** A lunge (Dotfight's core rules): he rides his ink into their camp, and
   * the men inside turn on him, a ripple of jabs, and he's crossed out. */
  private lunge(m: Man, c: Camp, tx: number, ty: number) {
    const life = m.life;
    m.busy = true;
    const deg = angle(m, { x: tx, y: ty });
    const len = Math.hypot(tx - m.x, ty - m.y);
    this.react(m, "windup", deg, 0, 0.6);
    this.maybe(m, LINES.lunge, 0.55, "shout");
    // the defenders see him coming
    for (const d of c.men) if (d.alive) this.react(d, "dread", angle(m, d), rand(200, 500), 0.6);
    const ride = clamp(len * 1.5, 280, 650);
    const ease = "cubic-bezier(.25,.7,.3,1)";
    setTimeout(() => {
      if (!life.page.isConnected) return;
      const line = el("path", {
        class: "bp-life-flick",
        d: `M${f(m.x)} ${f(m.y)}L${f(tx)} ${f(ty)}`,
        stroke: INK[m.side],
        "stroke-width": "1.3",
        fill: "none",
      });
      life.ink.append(line);
      this.mark(life, line);
      line.setAttribute("pathLength", "1");
      line.style.strokeDasharray = "1";
      line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ride, easing: ease, fill: "backwards" }).finished.then(
        () => (line.style.strokeDasharray = ""),
        () => {},
      );
      // he rides it, smeared along the way he's going
      const from = `translate(${f(m.x)}px, ${f(m.y)}px)`;
      m.x = tx;
      m.y = ty;
      m.g.style.transform = `translate(${f(tx)}px, ${f(ty)}px)`;
      m.g.animate([{ transform: from }, { transform: m.g.style.transform }], { duration: ride, easing: ease });
      m.pose.animate([{ transform: pose(deg, { s: 1.5, k: 0.92 }, 0) }, { transform: pose(deg, { s: 1.5, k: 0.92 }, 0) }], { duration: ride });
      // the camp he left: gone from it
      m.camp.men = m.camp.men.filter((x) => x !== m);
      setTimeout(() => {
        this.react(m, "land", deg);
        const defenders = c.men.filter((d) => d.alive).sort((p, q) => Math.hypot(p.x - tx, p.y - ty) - Math.hypot(q.x - tx, q.y - ty));
        if (!defenders.length) {
          m.busy = false;
          return;
        }
        // the volley: every man home jabs at him in a ripple, 55 ms apart
        defenders.forEach((d, i) => {
          const at = 140 + i * 55;
          const toward = angle(d, m);
          this.react(d, "jab", toward, at, 0.7);
          setTimeout(() => this.jab(life, d, m), at + 3 * FRAME);
          this.react(m, "gasp", (toward * 1), at + 3 * FRAME, 0.5);
        });
        const last = 140 + (defenders.length - 1) * 55 + 3 * FRAME + 40;
        m.camp = c;
        this.die(m, c.side, last);
        setTimeout(() => {
          for (const d of defenders) if (d.alive) this.react(d, "hop", -90, rand(0, 120), 0.6);
          this.beat(c, "still", 0, 700);
          this.maybe(defenders[0], LINES.deny, 0.6);
        }, last + 160);
      }, ride);
    }, 520);
  }

  /** A jab: a tiny quick line from a defender's dot to the intruder's, a
   * pen's flick, gone in half a second (it isn't ink). */
  private jab(life: PageLife, d: Man, at: Man) {
    const len = Math.hypot(at.x - d.x, at.y - d.y) || 1;
    const ux = (at.x - d.x) / len;
    const uy = (at.y - d.y) / len;
    const line = el("path", {
      class: "bp-life-jab",
      d: `M${f(d.x + ux * d.r * 1.3)} ${f(d.y + uy * d.r * 1.3)}L${f(at.x - ux * at.r)} ${f(at.y - uy * at.r)}`,
      stroke: INK[d.side],
      fill: "none",
    });
    life.top.append(line);
    line
      .animate([{ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: 480, fill: "forwards" })
      .finished.then(
        () => line.remove(),
        () => line.remove(),
      );
  }

  /** The page keeps its ink, up to a point; then the oldest fades. */
  private mark(l: PageLife, line: SVGElement) {
    l.marks.push(line);
    while (l.marks.length > MAX_MARKS) {
      const old = l.marks.shift()!;
      old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: "forwards" }).finished.then(
        () => old.remove(),
        () => old.remove(),
      );
    }
  }

  // ---- the visitor's hand ---------------------------------------------------------------------

  private listen(desk: HTMLElement) {
    const { signal } = this.ctx;
    let hold: {
      m: Man;
      id: number;
      x: number;
      y: number;
      pulled: boolean;
      off: boolean;
      v: { x: number; y: number };
      aim: SVGGElement | null;
      target: Element;
    } | null = null;

    const clearAim = () => {
      if (!hold) return;
      hold.aim?.remove();
      hold.m.pose.style.transform = "";
      hold.m.g.removeAttribute("data-shiver");
      hold.m.busy = false;
    };

    desk.addEventListener(
      "pointerover",
      (event) => {
        const man = byMan.get(event.target as Element);
        if (!man || this.hinted || !man.alive || man.side !== "blue" || event.pointerType !== "mouse") return;
        if (!this.alive) return;
        this.hinted = true;
        void this.say(man, pick(LINES.hint), { force: !this.talking });
      },
      { signal },
    );

    desk.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target as Element;
        const man = byMan.get(target);
        if (!man || event.button > 0) return;
        event.stopPropagation();
        event.preventDefault();
        if (!man.alive) {
          const mate = man.camp.men.find((x) => x.alive);
          if (mate) void this.say(mate, pick(LINES.pokeDead), { force: !this.talking });
          return;
        }
        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          /* fine */
        }
        hold = { m: man, id: event.pointerId, x: event.clientX, y: event.clientY, pulled: false, off: false, v: { x: 0, y: 0 }, aim: null, target };
      },
      { signal },
    );

    desk.addEventListener(
      "pointermove",
      (event) => {
        if (!hold || event.pointerId !== hold.id) return;
        const { m } = hold;
        const v = { x: hold.x - event.clientX, y: hold.y - event.clientY };
        const pull = Math.hypot(v.x, v.y);
        if (m.side !== "blue" || !this.alive) return;
        if (!hold.pulled && pull < 8) return;
        if (!hold.pulled) {
          hold.pulled = true;
          m.busy = true;
          // his campmates turn to him
          m.camp.men.forEach((x, i) => x !== m && x.alive && this.react(x, "look", angle(x, m), i * 60));
          if (chance(0.25)) this.maybe(m, LINES.aim, 1, "whisper");
        }
        // slid back to where it started: put down
        hold.off = pull < 6;
        hold.v = v;
        const p = Math.min(1, pull / PULL_MAX);
        const deg = (Math.atan2(v.y, v.x) * 180) / Math.PI;
        m.pose.getAnimations().forEach((a) => a.cancel());
        m.pose.style.transform = hold.off ? "" : pose(deg, { d: -0.7 * p, s: 1 + 0.4 * p }, m.r * 1.4);
        m.g.toggleAttribute("data-shiver", p >= 1);
        const range = this.range(m.life) * p;
        const ux = pull ? v.x / pull : 0;
        const uy = pull ? v.y / pull : 0;
        const pen = PENCIL[m.side];
        hold.aim?.remove();
        if (hold.off) {
          hold.aim = null;
          return;
        }
        const g = el("g", { class: "bp-life-aim" });
        g.append(
          el("path", { class: "bp-life-aim__pull", d: `M${f(m.x)} ${f(m.y)}L${f(m.x - v.x)} ${f(m.y - v.y)}`, stroke: "#5b554d" }),
          el("path", { class: "bp-life-aim__line", d: `M${f(m.x + ux * m.r * 2.5)} ${f(m.y + uy * m.r * 2.5)}L${f(m.x + ux * range)} ${f(m.y + uy * range)}`, stroke: pen }),
        );
        m.life.top.append(g);
        hold.aim = g;
      },
      { signal },
    );

    const release = (event: PointerEvent, fire: boolean) => {
      if (!hold || event.pointerId !== hold.id) return;
      const h = hold;
      clearAim();
      hold = null;
      const { m } = h;
      if (!h.pulled) return void this.poke(m);
      if (!fire || h.off || !m.alive) return;
      const pull = Math.hypot(h.v.x, h.v.y);
      const p = Math.min(1, pull / PULL_MAX);
      const range = Math.max(m.r * 8, this.range(m.life) * p);
      const a = this.at(m);
      const to = { x: a.x + (h.v.x / pull) * range, y: a.y + (h.v.y / pull) * range };
      this.quietUntil = performance.now() + 15000;
      this.snipe(m, to, "user");
      // and Dawood takes his go
      this.after(1700, () => this.reply(m));
    };
    desk.addEventListener("pointerup", (e) => release(e, true), { signal });
    desk.addEventListener("pointercancel", (e) => release(e, false), { signal });
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || !hold) return;
        hold.off = true;
        clearAim();
        hold.pulled = true;
      },
      { signal },
    );
  }

  private range(l: PageLife) {
    return Math.min(l.space.w * 1.1, 520);
  }

  private poke(m: Man) {
    const now = performance.now();
    const again = now - m.lastPoke < 4000;
    m.lastPoke = now;
    m.pokes = again ? m.pokes + 1 : 1;
    this.react(m, chance(0.5) ? "perk" : "hop", -90);
    if (m.pokes > 3 && this.alive) {
      // poked enough: he runs a lap of the camp
      this.react(m, "flinch", rand(-180, 180));
    }
    const lines = m.side === "red" ? LINES.pokeRed : again ? LINES.pokeAgain : LINES.poke;
    void this.say(m, pick(lines), { force: !this.talking || again });
  }

  /** Dawood's go: a red man answers the visitor's flick, at the camp it came from if he can. */
  private reply(shooter: Man) {
    if (!this.alive) return;
    const lives = this.showing();
    const reds = this.living(lives).filter((x) => x.side === "red" && !x.busy);
    if (!reds.length) return;
    const shot = this.lane(reds, lives, shooter.camp);
    if (!shot) return;
    this.maybe(shot.m, LINES.botGo, 0.45);
    this.snipe(shot.m, shot.to, "bot", shot.from);
  }
}

const PENCIL = notes.PENCIL_INK;

function angle(a: { x: number; y: number }, b: { x: number; y: number }) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Distance from p to the segment ab, and how far along it the nearest point is. */
function segDist(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = dx * dx + dy * dy || 1;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / L, 0, 1);
  return { d: Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)), t };
}

/** The way away from a line, from where he stands. */
function angleFromLine(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const { t } = segDist(p, a, b);
  const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  if (Math.hypot(p.x - q.x, p.y - q.y) < 0.5) return angle(a, b) + 90;
  return angle(q, p);
}

function shuffle<T>(list: T[]) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type { Box };
