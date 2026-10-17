/** Spun type: every heading written by one thread.
 *
 * Every heading on a screen (page and project titles, the home words,
 * strung section headings, the titles of updates, posts, roles and
 * courses, the forks, prose headings, the 404) is not inked: when the
 * drawing reaches it, a thread of its hue comes along a line under the
 * word's feet and writes it, each letter in one stroke along its centre
 * line, straight up from the line and straight down to it, and runs on a
 * little past the last letter (trace.ts). A heading of several lines is
 * written as a weft goes: the first line left to right, the next back
 * right to left, turning at the side. The thread branches off the hion if
 * one runs near on the heading's own side, otherwise comes in from the
 * page's edge or from a little before the word; a heading strung on a
 * weft is written by the weft itself, which stops either side of it in
 * a knot (weave.ts), down from the knot before and up into the knot
 * after. Only body text is type.
 *
 * Most headings are strands like every other (skein.ts, the `title` kind: a
 * growing end on a slack rope, finer toward its tip, laid on the ground
 * as it settles, the one material), so a hover loop weaves over and under thread, and a thread
 * from a click winds through it. The real text stays where it was,
 * transparent from the moment the screen is built (shell.css `WRITTEN`),
 * so nothing shows before the thread writes it, and it still reads,
 * selects, finds and speaks as text.
 *
 * Three kinds of heading are written on a canvas of their own inside the
 * heading, with the skein's material and a head of their own, rather
 * than on the page's ground: a strung heading, whose black box keeps the
 * hions and the weft from showing through its words (the thread is drawn
 * over the box), any heading inside something that slides over the
 * page (the resume's track across, `[data-cloth-hold]`), which slides
 * with it, and every label (`LABELS`), most of which hang and sway.
 *
 * This file measures and queues: it reads a heading's letters off the
 * page as a bitmap, a line at a time, in the real face (every heading is
 * set in the display face whatever its size: a thread has one weight,
 * and so has Aboreto), and hands the way in page px to the skein, which
 * keeps it, draws it, and asks again when the page is laid out anew; a
 * line's trace is kept, so asking again costs a lookup. A heading is
 * begun when the drawing reaches it, one per idle slot; a still screen
 * (reduced motion, a prism face) gets every heading written at once,
 * those in sight first.
 *
 * Never blank: a heading the thread cannot write (too small, nothing to
 * trace, an error) gets its chalk back (`data-spun-state="chalk"`); so
 * does every heading on the screen if the face is late or will not load;
 * and a heading left in sight unwritten is begun anyway, then given its
 * chalk. */
import { still } from "./dom";
import { type Hue, type Pt, THREAD } from "./pastel";
import type { Pulse } from "./pulse";
import { joinLines, type Traced, traceWord } from "./trace";
import { smooth } from "./wind";

/** What the skein needs of a spun word: its way, its letters' stroke
 * width and size, in page px. The way begins a little before the first
 * letter and ends a little past the last; the skein adds the approach,
 * unless the way already has one (`knotted`: it comes from a weft). */
export interface Spun {
  way: Pt[];
  width: number;
  /** The font size (px): the letters' scale, for the rope and pace. */
  size: number;
  /** Where its words are (page px): an approach must not cross them. */
  box: { l: number; t: number; r: number; b: number };
  knotted: boolean;
}

export interface Measure {
  (page: DOMRect): Spun | null;
}

/** The one material, lent by the skein for a heading written on its own
 * canvas: a run of thread (pts are x,y pairs; `heat` per point warms it
 * toward a head) and the head's own light. */
export interface Material {
  run(ctx: CanvasRenderingContext2D, hue: Hue, w: number, glow: number, pts: number[], base: number): void;
  /** A growing end, finer toward its tip by `grow` (pts end at the tip). */
  tip(ctx: CanvasRenderingContext2D, hue: Hue, glow: number, pts: number[], base: number, grow: number): void;
  /** The title kind's width and glow. */
  nature(): { w: number; glow: number };
  /** How a title is written: its width, pace (px a second) and the warm
   * run behind its head, for a way this long at this size. */
  pace(spun: Spun, total: number): { w: number; speed: number; tail: number };
}

export interface Spinner {
  inscribe(el: HTMLElement, hue: Hue, measure: Measure): void;
  material(): Material;
}

interface SpunOptions {
  skein: Spinner;
  pulse: Pulse;
  /** Write every heading at once. */
  instant: boolean;
  signal: AbortSignal;
}

/** The small words set in the label face: eyebrows, dates and kinds
 * (project meta, an update's date, a role's dates), the resume's years,
 * tags, link charms and the tools on a project. Written by thread like a
 * heading, each on a canvas of its own inside it (most of them hang and
 * sway). Kept in step with shell.css. */
export const LABELS = ".hion-eyebrow, .hion-meta, .hion-resume__when, .hion-tag:not(.hion-tag--meta), .hion-tag--meta dt, .hion-beads > li";

/** What is written by thread: every heading on a screen, the titles of
 * updates (set as paragraphs), and the labels. Kept in step with
 * shell.css. */
export const WRITTEN = `h1, h2, h3, h4, h5, h6, .hion-tied__title, ${LABELS}`;

/** Below this font size a thread cannot write legibly. */
const SMALLEST = 15;
/** How long the face may take before every heading gets its chalk (ms). */
const FONT_WAIT = 2500;
/** How long a heading may sit in sight unwritten before it is begun
 * anyway, and again before it gets its chalk back (ms). */
const LATE = 2500;
/** How far either side of a strung heading's words its weft stops (px).
 * weave.ts knots the weft there. */
export const WEFT_GAP = 12;

export function spinType(root: HTMLElement, options: SpunOptions) {
  const words = headings(root);
  if (!words.length) return;
  const { signal } = options;
  let given = false;
  const giveUp = () => {
    if (given || signal.aborted) return;
    given = true;
    for (const el of words) chalk(el);
  };
  // The letters have to be the real face: a trace of a fallback would not
  // be the heading. Late or missing, every heading is type instead.
  const late = window.setTimeout(giveUp, FONT_WAIT);
  signal.addEventListener("abort", () => clearTimeout(late), { once: true });
  const family = getComputedStyle(words[0]).fontFamily;
  document.fonts.load(`40px ${family}`, "A").then(
    (faces) => {
      clearTimeout(late);
      if (given || signal.aborted) return;
      if (!faces.length) giveUp();
      else write(words, options);
    },
    () => {
      clearTimeout(late);
      giveUp();
    },
  );
}

const chalk = (el: HTMLElement) => {
  if (!el.dataset.spunState) el.dataset.spunState = "chalk";
};

/** What is written: every heading in the screen, or the marked words
 * inside it (the home words, one thread each), in document order. */
function headings(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(`main :is(${WRITTEN}), main [data-spun]`)) {
    if (el.closest(".hion-sr, [hidden]")) continue;
    if (el.matches(WRITTEN) && el.querySelector("[data-spun]")) continue;
    if (!el.hasAttribute("data-spun") && el.closest("[data-spun]")) continue;
    if (!(el.textContent ?? "").trim()) continue;
    if (!out.includes(el)) out.push(el);
  }
  return out;
}

function write(words: HTMLElement[], options: SpunOptions) {
  const { signal } = options;
  const begun = new Set<HTMLElement>();
  const begin = (el: HTMLElement) => {
    if (begun.has(el) || signal.aborted) return;
    begun.add(el);
    try {
      spin(el, options);
    } catch {
      el.dataset.spunState = "chalk";
    }
  };
  // One heading per idle slot.
  const queue: HTMLElement[] = [];
  let waiting = false;
  const pump = () => {
    waiting = false;
    const el = queue.shift();
    if (!el || signal.aborted) return;
    begin(el);
    if (queue.length) {
      waiting = true;
      soon(pump);
    }
  };
  const want = (el: HTMLElement) => {
    if (begun.has(el) || queue.includes(el)) return;
    queue.push(el);
    if (!waiting) {
      waiting = true;
      soon(pump);
    }
  };
  if (options.instant) {
    // Those in sight now, the rest as the page has room.
    for (const el of words) if (near(el)) begin(el);
    for (const el of words) want(el);
    return;
  }
  for (const el of words) {
    // Begun when the drawing reaches it (it lights what it hangs in).
    const lit = el.closest<HTMLElement>("[data-reveal]") ?? el;
    if (!lit.hasAttribute("data-reveal") || lit.hasAttribute("data-lit")) {
      want(el);
      continue;
    }
    const watch = new MutationObserver(() => {
      if (!lit.hasAttribute("data-lit")) return;
      watch.disconnect();
      want(el);
    });
    watch.observe(lit, { attributes: true, attributeFilter: ["data-lit"] });
    signal.addEventListener("abort", () => watch.disconnect(), { once: true });
  }
  // Never left blank in sight: begun anyway, then given its chalk.
  const after = (ms: number, run: () => void) => {
    const timer = window.setTimeout(() => signal.aborted || run(), ms);
    signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  };
  const sight = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      sight.unobserve(el);
      after(LATE, () => {
        if (el.dataset.spunState) return;
        begin(el);
        after(LATE, () => chalk(el));
      });
    }
  });
  for (const el of words) sight.observe(el);
  signal.addEventListener("abort", () => sight.disconnect(), { once: true });
}

const near = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.bottom > -innerHeight * 0.5 && r.top < innerHeight * 1.5;
};

const soon = (run: () => void) =>
  "requestIdleCallback" in window ? requestIdleCallback(run, { timeout: 300 }) : setTimeout(run, 16);

/** A heading's hue: its weft's (weave.ts), its own or its holder's, else
 * by turns down the screen (cyan, magenta, cyan). */
function hueOf(el: HTMLElement): Hue {
  const hue = el.dataset.weftHue ?? el.closest<HTMLElement>("[data-hue]")?.dataset.hue ?? el.dataset.spun;
  if (hue === "c" || hue === "m") return hue;
  const all = [...document.querySelectorAll(`main :is(${WRITTEN})`)];
  const i = all.indexOf(el.closest(WRITTEN) ?? el);
  return i % 2 ? "m" : "c";
}

function spin(el: HTMLElement, options: SpunOptions) {
  if (el.closest("[data-cloth-hold]") || el.matches(`.hion-strung, ${LABELS}`)) {
    writeLocal(el, hueOf(el), options);
    return;
  }
  options.skein.inscribe(el, hueOf(el), (page) => {
    const t0 = performance.now();
    const spun = measure(el, page);
    // For a look while developing: how long a heading takes to read.
    if (import.meta.env.DEV) performance.measure("hion:spun", { start: t0, detail: el.textContent });
    return spun;
  });
}

/** Lines already traced, by everything that makes the bitmap: a page
 * laid out anew (a resize, a font swap elsewhere) asks again, and a
 * screen come back to is the same words. */
const traced = new Map<string, Traced | null>();
const TRACED = 400;

/** The face's descent, by font. */
const descents = new Map<string, number>();
function descentOf(font: string) {
  let d = descents.get(font);
  if (d === undefined) {
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) return 0;
    probe.font = font;
    d = probe.measureText("Hg").fontBoundingBoxDescent;
    descents.set(font, d);
  }
  return d;
}

/** The heading's letters, read off the page a line at a time and traced,
 * as one way in page px. Null when there is nothing to write. */
export function measure(el: HTMLElement, page: DOMRect): Spun | null {
  const style = getComputedStyle(el);
  const size = parseFloat(style.fontSize) || 0;
  if (size < SMALLEST) return null;
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  // Drawn large enough that a stroke is about five pixels, which thins
  // cleanly; a big word is drawn as it is.
  const scale = Math.max(1, Math.min(4, 5 / (size * 0.058)));
  const room = Math.round(size * 0.12) + 6;
  const runs = textRuns(el);
  if (!runs.length) return null;
  // The letters as they are set (a label is set in capitals by CSS).
  if (style.textTransform === "uppercase") for (const run of runs) run.text = run.text.toUpperCase();
  // Where the words sit is read from the bottom of their boxes (the
  // baseline is that less the face's descent): the top of a text box can
  // carry a line's extra height.
  const descent = descentOf(font);
  const lines: Run[][] = [];
  for (const run of runs) {
    const line = lines.find((ln) => Math.abs(ln[0].rect.bottom - run.rect.bottom) < run.rect.height * 0.5);
    if (line) line.push(run);
    else lines.push([run]);
  }
  lines.sort((a, b) => a[0].rect.bottom - b[0].rect.bottom);
  const ways: { way: Pt[]; line: number }[] = [];
  const widths: number[] = [];
  lines.forEach((line, k) => {
    // Every other line is written back, right to left.
    const back = k % 2 === 1;
    const l = Math.min(...line.map((r) => r.rect.left));
    const r = Math.max(...line.map((r) => r.rect.right));
    const baseline = line[0].rect.bottom - descent;
    // Room above the baseline for the capitals, below for a tail.
    const t = baseline - size * 1.05;
    const w = Math.ceil((r - l + room * 2) * scale);
    const h = Math.ceil((size * 1.4 + room * 2) * scale);
    if (w < 4 || h < 4 || w * h > 4e6) return;
    const key = [font, style.letterSpacing, scale, back ? "<" : ">", ...line.map((run) => `${(run.rect.left - l).toFixed(1)}:${run.text}`)].join("|");
    let trace = traced.get(key);
    if (trace === undefined) {
      trace = traceLine(line, { font, spacing: style.letterSpacing, scale, room, l, w, h, top: baseline - t + room, back });
      if (traced.size >= TRACED) traced.delete(traced.keys().next().value!);
      traced.set(key, trace);
    }
    if (!trace) return;
    const toPage = ([x, y]: Pt): Pt => [x / scale - room + l - page.left, y / scale - room + t - page.top];
    ways.push({ way: trace.way.map(toPage), line: toPage([0, trace.line])[1] });
    widths.push(trace.width / scale);
  });
  if (!ways.length) return null;
  let way = joinLines(ways, Math.max(6, size * 0.22));
  if (way.length < 4) return null;
  widths.sort((a, b) => a - b);
  // Strung on a weft: written by the weft, down from the knot it stops in
  // before the words, and (when it ends on that side) up into the knot
  // after.
  let knotted = false;
  const strung = el.matches(".hion-strung") ? el.querySelector(".hion-strung__box")?.getBoundingClientRect() : null;
  if (strung) {
    const first = runs.reduce((a, b) => (b.rect.top < a.rect.top ? b : a)).rect;
    const y = first.top + first.height * 0.56 - page.top;
    const from: Pt = [strung.left - WEFT_GAP - page.left, y];
    const to: Pt = [strung.right + WEFT_GAP - page.left, y];
    way = [from, ...way];
    if (ways.length % 2) way = [...way.slice(0, -1), to];
    knotted = true;
  }
  const box = {
    l: Math.min(...runs.map((r) => r.rect.left)) - page.left,
    t: Math.min(...runs.map((r) => r.rect.top)) - page.top,
    r: Math.max(...runs.map((r) => r.rect.right)) - page.left,
    b: Math.max(...runs.map((r) => r.rect.bottom)) - page.top,
  };
  return { way, width: widths[Math.floor(widths.length / 2)], size, box, knotted };
}

/** One line's letters as a bitmap, traced (written back: mirrored, traced,
 * and turned round again). Bitmap px. */
function traceLine(
  line: Run[],
  o: { font: string; spacing: string; scale: number; room: number; l: number; w: number; h: number; top: number; back: boolean },
): Traced | null {
  const canvas = document.createElement("canvas");
  canvas.width = o.w;
  canvas.height = o.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.setTransform(o.scale, 0, 0, o.scale, 0, 0);
  ctx.font = o.font;
  if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = o.spacing;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  for (const run of line) ctx.fillText(run.text, run.rect.left - o.l + o.room, o.top);
  const data = ctx.getImageData(0, 0, o.w, o.h).data;
  const mask = new Uint8Array(o.w * o.h);
  for (let y = 0; y < o.h; y++) {
    for (let x = 0; x < o.w; x++) {
      const from = y * o.w + (o.back ? o.w - 1 - x : x);
      mask[y * o.w + x] = data[from * 4 + 3] > 128 ? 1 : 0;
    }
  }
  const trace = traceWord(mask, o.w, o.h, 16 * o.scale, 28 * o.scale, THREAD * o.scale);
  if (!trace || !o.back) return trace;
  return { ...trace, way: trace.way.map(([x, y]) => [o.w - 1 - x, y]) };
}

interface Run {
  text: string;
  rect: DOMRect;
}

/** The heading's text, a stretch per line it sits on (viewport px). */
function textRuns(el: HTMLElement): Run[] {
  const runs: Run[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    const parent = node.parentElement;
    if (!parent || parent.closest(".hion-sr, [hidden]")) continue;
    // Hidden from a reader inside the word (an icon, a mark); a word
    // hidden as a whole (the resume's years, a picture of the dates read
    // elsewhere) is still written.
    const hid = parent.closest("[aria-hidden='true']");
    if (hid && hid !== el && el.contains(hid)) continue;
    for (const match of text.matchAll(/\S+/g)) {
      const from = match.index;
      const to = from + match[0].length;
      for (const [start, end] of lineRuns(range, node, from, to)) {
        range.setStart(node, start);
        range.setEnd(node, end);
        const rect = range.getClientRects()[0];
        if (!rect || rect.width < 1) continue;
        runs.push({ text: text.slice(start, end), rect });
      }
    }
  }
  range.detach();
  return runs;
}

/** The stretches of [from, to) in a text node that sit on one line each
 * (a word broken at a hyphen). */
function lineRuns(range: Range, node: Node, from: number, to: number): [number, number][] {
  range.setStart(node, from);
  range.setEnd(node, to);
  if (range.getClientRects().length < 2) return [[from, to]];
  const runs: [number, number][] = [];
  let start = from;
  let bottom: number | undefined;
  for (let i = from; i < to; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getClientRects()[0];
    if (!rect) continue;
    if (bottom !== undefined && Math.abs(rect.bottom - bottom) > rect.height / 2) {
      runs.push([start, i]);
      start = i;
    }
    bottom = rect.bottom;
  }
  runs.push([start, to]);
  return runs;
}

/* ---------- A heading that slides: written on its own canvas ---------- */

/** Write a heading inside something that moves over the page on a
 * canvas of its own, with the skein's material and a head of its own (on
 * the screen's one frame loop), then let it lie cold. Written again,
 * settled, if the heading is laid out anew. */
function writeLocal(el: HTMLElement, hue: Hue, options: SpunOptions, settled = options.instant) {
  const { signal } = options;
  const material = options.skein.material();
  const { glow } = material.nature();
  const own = el.getBoundingClientRect();
  const spun = measure(el, own);
  el.querySelector(":scope > .hion-spun-local")?.remove();
  if (!spun) {
    el.dataset.spunState = "chalk";
    return;
  }
  el.dataset.spunState = "spun";
  el.setAttribute("data-spun-local", "");
  // Its canvas is placed inside it: somewhere to place it from, unless it
  // is placed already (the resume's years hang where the track puts them).
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  // A little line in before the first letter: shorter for a small word,
  // or it reads as an underline.
  const lead = Math.min(36, spun.size * 0.8);
  const way = smooth(spun.knotted ? spun.way : [[spun.way[0][0] - lead, spun.way[0][1] + 2], ...spun.way], 4);
  const arcs = [0];
  for (let k = 1; k < way.length; k++) arcs.push(arcs[k - 1] + Math.hypot(way[k][0] - way[k - 1][0], way[k][1] - way[k - 1][1]));
  const total = arcs[arcs.length - 1];
  const { w, speed, tail } = material.pace(spun, total);
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const [x, y] of way) {
    l = Math.min(l, x);
    r = Math.max(r, x);
    t = Math.min(t, y);
    b = Math.max(b, y);
  }
  const pad = w * 4 + 10;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.className = "hion-spun-local";
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = Math.ceil((r - l + pad * 2) * dpr);
  canvas.height = Math.ceil((b - t + pad * 2) * dpr);
  Object.assign(canvas.style, {
    width: `${Math.ceil(r - l + pad * 2)}px`,
    height: `${Math.ceil(b - t + pad * 2)}px`,
    left: `${l - pad}px`,
    top: `${t - pad}px`,
  });
  el.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, (pad - l) * dpr, (pad - t) * dpr);
  const at = (s: number): Pt => {
    let i = 1;
    while (i < arcs.length - 1 && arcs[i] < s) i++;
    const u = (s - arcs[i - 1]) / (arcs[i] - arcs[i - 1] || 1);
    return [way[i - 1][0] + (way[i][0] - way[i - 1][0]) * u, way[i - 1][1] + (way[i][1] - way[i - 1][1]) * u];
  };
  const paint = (s: number, heat: number) => {
    ctx.clearRect(l - pad, t - pad, r - l + pad * 2, b - t + pad * 2);
    const span = Math.min(tail, s);
    const cool = s - span;
    const pts: number[] = [];
    for (let k = 0; k < way.length && arcs[k] <= cool; k++) pts.push(way[k][0], way[k][1]);
    if (cool > 0 && cool < total) pts.push(...at(cool));
    if (pts.length >= 4) material.run(ctx, hue, w, glow, pts, 1);
    if (heat <= 0.001 || span < 2) return;
    const growing: number[] = [];
    const steps = Math.max(2, Math.ceil(span / 4));
    for (let j = 0; j <= steps; j++) growing.push(...at(cool + (span * j) / steps));
    material.tip(ctx, hue, glow, growing, 1, heat);
  };
  // Laid out anew (the track fits its roles to the window): written
  // again, settled.
  const width = el.clientWidth;
  const resized = new ResizeObserver(() => {
    if (el.clientWidth === width || signal.aborted) return;
    resized.disconnect();
    writeLocal(el, hue, options, true);
  });
  resized.observe(el);
  signal.addEventListener("abort", () => resized.disconnect(), { once: true });
  if (settled || signal.aborted) {
    paint(total, 0);
    still(canvas);
    return;
  }
  let s = 0;
  let heat = 1;
  const task = options.pulse.add((now, dt) => {
    if (signal.aborted || !canvas.isConnected) return false;
    if (s < total) {
      // Eased in and out, nearly steady between.
      const ease = Math.min(1, 0.35 + s / 60, 0.35 + (total - s) / 80);
      s = Math.min(total, s + (speed * ease * (0.92 + 0.08 * Math.sin(now * 0.0021)) * dt) / 1000);
    } else heat = Math.max(0, heat - dt / 700);
    paint(s, heat);
    if (s < total || heat > 0) return true;
    still(canvas);
    return false;
  });
  task.wake();
}
