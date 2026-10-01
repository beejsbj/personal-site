/** The hand at the desk: microanimations for the Back Page that need a
 * script. When a page lands open its heading is written in and its ink drawn
 * stroke by stroke (underlines, tally marks, doodles, the camps and flicks of
 * the war). Hovering a link makes the biro scribble under it, and the pen of
 * that colour rolls on the desk. Corners curl as the pointer nears them. On
 * the war map, reaching for a camp makes its soldiers jiggle and fires a fresh
 * flick at the enemy, ending in a cross. Dust drifts in the lamp light.
 * Everything composes on top of the CSS in micro.css, respects reduced
 * motion, and is event driven (no loops to pause). */
import type { ShellContext } from "../types";
import type { Book } from "./book";
import { h, svg } from "./dom";
import { BLUE, RED, cross, flick, seed } from "./ink";

const fine = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
const OUT = "cubic-bezier(.2,.8,.25,1)";
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

let ctx: ShellContext | null = null;

export function mountMicro(context: ShellContext, book: Book, desk: HTMLElement) {
  ctx = context;
  if (context.face || context.reducedMotion) return;
  book.land = (page, delay) => writeIn(page, delay);
  const { signal } = context;
  scribbles(desk, signal);
  penRolls(desk, signal);
  corners(book, signal);
  warMap(desk, signal);
  doodles(desk, signal);
  if (fine() && innerWidth >= 880) motes(desk);
}

/* ---------- landing: the page is written in ---------------------------- */

/** Draw a stroke as a pen would: dash it and pull the offset back. */
function draw(el: SVGGeometryElement, delay: number, duration: number, easing = "linear") {
  if (!el.hasAttribute("pathLength")) el.setAttribute("pathLength", "1");
  const own = el.getAttribute("stroke-dasharray");
  if (own) {
    // a dotted line: it can't be dashed again, so it appears in one go
    el.animate([{ opacity: 0 }, { opacity: 0, offset: 0.99 }, { opacity: 1 }], {
      delay,
      duration: Math.max(1, duration),
      fill: "backwards",
    });
    return;
  }
  el.style.strokeDasharray = "1";
  el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
    delay,
    duration,
    easing,
    fill: "backwards",
  }).finished.then(
    () => (el.style.strokeDasharray = ""),
    () => (el.style.strokeDasharray = ""),
  );
}

/** A dot pressed onto the page, or a cross stamped on it. */
function press(el: Element, delay: number) {
  el.animate(
    [
      { opacity: 0, transform: "scale(0.2)" },
      { opacity: 1, transform: "scale(1.35)", offset: 0.6 },
      { opacity: 1, transform: "scale(1)" },
    ],
    { delay, duration: 160, easing: OUT, fill: "backwards", composite: "add" },
  );
}

function writeIn(page: HTMLElement, delay: number) {
  if (!ctx || ctx.reducedMotion) return;
  let t = delay;
  const h1 = page.querySelector<HTMLElement>(".bp-h1");
  if (h1) {
    const chars = (h1.textContent ?? "").trim().length;
    const dur = clamp(chars * 34, 380, 1000);
    h1.animate(
      [
        { clipPath: "inset(-0.3em 100% -0.6em -0.2em)" },
        { clipPath: "inset(-0.3em -3% -0.6em -0.2em)" },
      ],
      { delay: t, duration: dur, easing: "cubic-bezier(.3,.1,.7,.9)", fill: "backwards" },
    );
    t += dur - 60;
  }

  // then the rest of the page, line by line, quickly, the way a hand fills it
  writeLines(page, h1 ? Math.max(delay, t - 260) : delay);

  // underlines, after the words they sit beneath
  for (const p of page.querySelectorAll<SVGPathElement>(".bp-underline path")) {
    draw(p, t, 340, OUT);
    t += 120;
  }
  // tally marks, one by one
  let tally = t + 60;
  for (const p of page.querySelectorAll<SVGPathElement>(".bp-tally path")) {
    draw(p, tally, 90, OUT);
    tally += 95;
  }
  // doodles in the margin, line by line
  let dd = t + 80;
  for (const d of page.querySelectorAll<SVGSVGElement>(".bp-doodle")) {
    for (const p of d.querySelectorAll<SVGPathElement>("path")) {
      draw(p, dd, 260, "cubic-bezier(.4,0,.6,1)");
      dd += 170;
    }
    dd += 120;
  }

  // wars: camps are drawn first, soldiers pressed in, then the flicks fly
  for (const war of page.querySelectorAll<SVGSVGElement>(".bp-map__ink, .bp-miniwar, .bp-owncamp, .bp-cover-doodle")) {
    const big = war.classList.contains("bp-map__ink");
    let w = t + 40;
    const guides = war.querySelectorAll<SVGCircleElement>(".bp-guide");
    const rings = war.querySelectorAll<SVGPathElement>(".bp-ink-ring");
    const dots = war.querySelectorAll<SVGPathElement>(".bp-dot");
    const crosses = war.querySelectorAll<SVGPathElement>(".bp-cross");
    const flicks = war.querySelectorAll<SVGPathElement>(".bp-flick");
    const ringGap = big ? 110 : 90;
    guides.forEach((g, i) => draw(g, w + i * ringGap, 300, OUT));
    rings.forEach((r, i) => draw(r, w + 120 + i * ringGap, 420, "cubic-bezier(.4,.05,.6,1)"));
    w += 260 + rings.length * ringGap;
    const dotGap = clamp(600 / Math.max(1, dots.length), 12, 45);
    dots.forEach((d, i) => press(d, w + i * dotGap));
    w += dots.length * dotGap + 80;
    const flickGap = big ? 55 : 70;
    flicks.forEach((f, i) => draw(f, w + i * flickGap, 180, "cubic-bezier(.1,.7,.2,1)"));
    w += flicks.length * flickGap + 100;
    crosses.forEach((c, i) => press(c, w + i * 60));
  }
}

/** Everything written on a page besides its title: the page number and date
 * in the corner, headings, margin notes, and the body itself, a line at a
 * time. Each line is uncovered left to right as the pen crosses it, the
 * lines overlapping so a whole page is down in about a second and a half. On
 * typed paper the lines are typed, a few characters at a clack. */
const WRITTEN =
  ".bp-page__head b, .bp-flow :is(p, li, dt, dd, h2, h3, h4, figcaption, blockquote, time)";
const NOT_WRITTEN = ".bp-h1, .bp-sr, .bp-loose, .bp-contents, .bp-label, .bp-return, .bp-belongs, .bp-map";

function writeLines(page: HTMLElement, start: number) {
  const all = [...page.querySelectorAll<HTMLElement>(WRITTEN)];
  const els = all.filter(
    (el) =>
      !el.closest(NOT_WRITTEN) &&
      !el.querySelector("img, video, figure, iframe, svg:not(.bp-underline)") &&
      !all.some((o) => o !== el && el.contains(o)) &&
      el.offsetHeight > 0 &&
      (el.textContent ?? "").trim().length > 0,
  );
  if (!els.length) return;
  const typed = page.dataset.paper === "typed";
  const fs = parseFloat(getComputedStyle(page).fontSize) || 18;
  const jobs = els.map((el) => {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || fs * 1.5;
    const h = el.offsetHeight;
    const w = el.offsetWidth;
    const lines = Math.max(1, Math.round(h / lh));
    const chars = (el.textContent ?? "").trim().length;
    const per = clamp(((lines > 1 ? w : Math.min(w, chars * fs * 0.45)) * 0.5), 110, 260);
    return { el, lh, h, w, lines, chars, per };
  });
  // overlapping lines; the whole page inside about 1.4 s of starting
  const totalLines = jobs.reduce((n, j) => n + j.lines, 0);
  const gap = clamp(1400 / totalLines, 18, 70);
  let t = start;
  for (const j of jobs) {
    const dur = j.per + (j.lines - 1) * gap * 1.6;
    sweep(j, t, dur, typed, fs);
    t += j.lines * gap;
  }
}

function sweep(
  j: { el: HTMLElement; lh: number; h: number; w: number; lines: number; chars: number },
  delay: number,
  duration: number,
  typed: boolean,
  fs: number,
) {
  const L = -8;
  const R = j.w + 10;
  const T = -6;
  const B = j.h + 10;
  const poly = (x: number, y0: number, y1: number) =>
    `polygon(${L}px ${T}px, ${R}px ${T}px, ${R}px ${y0}px, ${x}px ${y0}px, ${x}px ${y1}px, ${L}px ${y1}px)`;
  const frames: Keyframe[] = [];
  const clacks = (w: number) => `steps(${Math.max(3, Math.round(w / (fs * 0.55)))}, end)`;
  for (let k = 0; k < j.lines; k++) {
    const y0 = k === 0 ? T : Math.round(k * j.lh);
    const y1 = k === j.lines - 1 ? B : Math.round((k + 1) * j.lh);
    const a = k / j.lines;
    const b = (k + 1) / j.lines;
    frames.push({ clipPath: poly(L, y0, y1), offset: a, easing: typed ? clacks(j.w) : "cubic-bezier(.3,.1,.7,.9)" });
    frames.push({ clipPath: poly(R, y0, y1), offset: Math.max(a, b - 0.0001) });
  }
  frames.push({ clipPath: poly(R, B, B), offset: 1 });
  j.el.animate(frames, { delay, duration, fill: "backwards" });
}

/* ---------- links: the pen goes over the line again ------------------- */

const SKIP = ".bp-camp, .bp-shelf a, .bp-corner, .bp-loose a, .bp-contents__list a";

function inkOf(el: Element) {
  const c = getComputedStyle(el).color;
  const m = c.match(/\d+/g);
  if (!m) return BLUE;
  const [r, , b] = m.map(Number);
  return r > b ? RED : BLUE;
}

function scribbles(desk: HTMLElement, signal: AbortSignal) {
  if (!fine()) return;
  const live = new WeakMap<Element, SVGSVGElement>();
  desk.addEventListener(
    "pointerover",
    (event) => {
      const a = (event.target as Element).closest<HTMLAnchorElement>(".bp-page a");
      if (!a || a.matches(SKIP) || live.has(a)) return;
      const rects = a.getClientRects();
      if (rects.length !== 1) return;
      const rng = seed(a.href + a.textContent);
      const y = 5 + rng() * 2;
      const d = `M1 ${y.toFixed(1)} C ${(20 + rng() * 12).toFixed(1)} ${(y - 2.5).toFixed(1)}, ${(48 + rng() * 14).toFixed(1)} ${(y + 3).toFixed(1)}, 99 ${(y - 1 + rng() * 2).toFixed(1)}`;
      const mark = svg(
        `<svg class="bp-scribble" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${inkOf(a)}" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke" pathLength="1"/></svg>`,
      );
      a.classList.add("bp-scribbled");
      a.append(mark);
      live.set(a, mark);
      const path = mark.firstElementChild as SVGPathElement;
      path.style.strokeDasharray = "1";
      const dur = clamp(rects[0].width * 1.6, 160, 420);
      path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        duration: dur,
        easing: "cubic-bezier(.3,.1,.5,1)",
        fill: "forwards",
      });
      const leave = () => {
        a.removeEventListener("pointerleave", leave);
        live.delete(a);
        mark
          .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" })
          .finished.then(
            () => {
              mark.remove();
              a.classList.remove("bp-scribbled");
            },
            () => mark.remove(),
          );
      };
      a.addEventListener("pointerleave", leave, { signal });
    },
    { signal },
  );
}

/* ---------- the pens on the desk -------------------------------------- */

function penRolls(desk: HTMLElement, signal: AbortSignal) {
  if (!fine()) return;
  const pens = {
    blue: desk.querySelector<HTMLElement>(".bp-pen--blue"),
    red: desk.querySelector<HTMLElement>(".bp-pen--red"),
  };
  const rolling = new WeakSet<Element>();
  desk.addEventListener(
    "pointerover",
    (event) => {
      const a = (event.target as Element).closest<HTMLElement>("a, button");
      if (!a || !desk.contains(a)) return;
      const pen = inkOf(a) === RED ? pens.red : pens.blue;
      if (!pen || rolling.has(pen)) return;
      rolling.add(pen);
      const sign = pen === pens.red ? 1 : -1;
      // a pen nudged on the desk: it rolls a little and settles back
      pen
        .animate(
          [
            { transform: "translate(0,0) rotate(0deg)" },
            { transform: `translate(${sign * 3}px, 1px) rotate(${sign * 1.6}deg)`, offset: 0.35 },
            { transform: `translate(${sign * 1}px, 0) rotate(${sign * 0.4}deg)`, offset: 0.7 },
            { transform: "translate(0,0) rotate(0deg)" },
          ],
          { duration: 520, easing: "cubic-bezier(.2,.7,.3,1)", composite: "add" },
        )
        .finished.then(
          () => rolling.delete(pen),
          () => rolling.delete(pen),
        );
    },
    { signal },
  );
}

/* ---------- corners curl as the hand comes near ----------------------- */

function corners(book: Book, signal: AbortSignal) {
  if (!fine()) return;
  let raf = 0;
  let last: PointerEvent | null = null;
  const update = () => {
    raf = 0;
    if (!last) return;
    for (const corner of book.corners.querySelectorAll<HTMLElement>(".bp-corner")) {
      const ear = corner.querySelector<HTMLElement>(".bp-corner__ear");
      if (!ear) continue;
      const r = ear.getBoundingClientRect();
      const d = Math.hypot(last.clientX - (r.left + r.width / 2), last.clientY - (r.top + r.height / 2));
      const curl = clamp(1 - (d - 30) / 260, 0, 1);
      corner.style.setProperty("--curl", curl.toFixed(2));
    }
  };
  book.el.addEventListener(
    "pointermove",
    (event) => {
      last = event;
      if (!raf) raf = requestAnimationFrame(update);
    },
    { signal, passive: true },
  );
  book.el.addEventListener(
    "pointerleave",
    () => {
      last = null;
      for (const corner of book.corners.querySelectorAll<HTMLElement>(".bp-corner"))
        corner.style.setProperty("--curl", "0");
    },
    { signal },
  );
}

/* ---------- the war map: reach for a camp and it fires ---------------- */

function warMap(desk: HTMLElement, signal: AbortSignal) {
  let shots = 0;
  desk.addEventListener(
    "pointerover",
    (event) => {
      const a = (event.target as Element).closest<HTMLAnchorElement>(".bp-camp[data-slug]");
      if (!a) return;
      const map = a.closest<HTMLElement>(".bp-map");
      const ink = map?.querySelector<SVGSVGElement>(".bp-map__ink");
      const group = ink?.querySelector<SVGGElement>(`[data-camp="${a.dataset.slug}"]`);
      if (!map || !ink || !group || group.classList.contains("bp-hot")) return;
      // the soldiers stir
      group.classList.add("bp-hot");
      a.addEventListener("pointerleave", () => group.classList.remove("bp-hot"), { once: true, signal });
      if (shots >= 4) return;

      // one of them flicks at the enemy
      const li = a.parentElement as HTMLElement;
      const from = { x: parseFloat(li.style.left), y: parseFloat(li.style.top) };
      const mine = li.dataset.ink;
      const foes = [...map.querySelectorAll<HTMLElement>(".bp-map__camps li")].filter(
        (el) => el !== li && el.dataset.ink !== mine,
      );
      const pool = foes.length ? foes : [...map.querySelectorAll<HTMLElement>(".bp-map__camps li")].filter((el) => el !== li);
      if (!pool.length) return;
      const rng = seed(`${a.dataset.slug}-${Date.now()}`);
      const foe = pool[Math.floor(rng() * pool.length)];
      const r = parseFloat(getComputedStyle(map).getPropertyValue("--r")) || 30;
      const miss = r * (0.1 + rng() * 0.6);
      const ang = rng() * Math.PI * 2;
      const tx = parseFloat(foe.style.left) + Math.cos(ang) * miss;
      const ty = parseFloat(foe.style.top) + Math.sin(ang) * miss;
      const colour = mine === "red" ? RED : BLUE;
      const shot = svg(`<svg>${flick(from.x, from.y, tx, ty, colour, rng, 0.2 + rng() * 0.5)}</svg>`)
        .firstElementChild as SVGPathElement;
      shot.setAttribute("stroke-opacity", "0.9");
      const hit = svg(`<svg>${cross(tx, ty, Math.max(4, r * 0.18), rng, colour)}</svg>`)
        .firstElementChild as SVGPathElement;
      hit.classList.add("bp-shot__cross");
      ink.insertBefore(shot, ink.querySelector("[data-camp]"));
      ink.append(hit);
      shots++;
      const len = Math.hypot(tx - from.x, ty - from.y);
      const dur = clamp(len * 0.9, 140, 320);
      draw(shot, 0, dur, "cubic-bezier(.05,.6,.15,1)");
      press(hit, dur - 30);
      const fade = (el: Element) =>
        el.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 2400, duration: 600, fill: "forwards" }).finished;
      Promise.all([fade(shot), fade(hit)])
        .catch(() => {})
        .then(() => {
          shot.remove();
          hit.remove();
          shots--;
        });
    },
    { signal },
  );
}

/* ---------- doodles: go over them again on hover ---------------------- */

function doodles(desk: HTMLElement, signal: AbortSignal) {
  if (!fine()) return;
  const busy = new WeakSet<Element>();
  desk.addEventListener(
    "pointerover",
    (event) => {
      const item = (event.target as Element).closest<HTMLElement>(".bp-labitem, .bp-bigdoodle");
      const doodle = item?.querySelector<SVGSVGElement>(".bp-doodle");
      if (!item || !doodle || busy.has(doodle)) return;
      busy.add(doodle);
      let t = 0;
      const paths = doodle.querySelectorAll<SVGPathElement>("path");
      paths.forEach((p) => {
        draw(p, t, 220, "cubic-bezier(.4,0,.6,1)");
        t += 140;
      });
      setTimeout(() => busy.delete(doodle), t + 400);
    },
    { signal },
  );
}

/* ---------- dust in the lamp light ------------------------------------ */

function motes(desk: HTMLElement) {
  const rng = seed("dust");
  const layer = h("div", { class: "bp-motes", "aria-hidden": "true" });
  for (let i = 0; i < 14; i++) {
    layer.append(
      h("i", {
        style: `--x:${(18 + rng() * 52).toFixed(1)}%;--y:${(10 + rng() * 60).toFixed(1)}%;--dx:${((rng() - 0.5) * 90).toFixed(0)}px;--dy:${(20 + rng() * 70).toFixed(0)}px;--t:${(14 + rng() * 16).toFixed(1)}s;--d:${(-rng() * 30).toFixed(1)}s;--s:${(1 + rng() * 1.6).toFixed(1)}px`,
      }),
    );
  }
  desk.querySelector(".bp-lamp")?.after(layer);
}
