/** Spun type: a word written by one thread.
 *
 * A word marked `data-spun` is not inked: when the drawing reaches it, a
 * thread of its hue (branching off the hion if one runs near, otherwise
 * in from the page's edge or from a little before the word) comes along a
 * line under the word's feet and writes it, each letter in one stroke
 * along its centre line, straight up from the line and straight down to
 * it, and runs on a little past the last letter. It is a strand like every
 * other (skein.ts, the `title` kind: a hot head on a slack rope, laid on
 * the ground as it cools, the one material), so a hover loop weaves over
 * and under thread, and a thread from a click winds through it. The real
 * text stays where it was, invisible, so it reads, selects and speaks as
 * text; only its ink is thread.
 *
 * This file only measures: it reads the word's letters off the page as a
 * bitmap, a line of it at a time (trace.ts turns that into one way), and
 * hands the way in page px to the skein, which keeps it, draws it, and
 * asks again when the page is laid out anew. A visitor who prefers less
 * motion, and a still prism face, get the word written at once. Below
 * SMALLEST the thread would be too fine to read: the word keeps its
 * chalk. */
import type { Hue, Pt } from "./pastel";
import { traceWord } from "./trace";

/** What the skein needs of a spun word: its way and its letters' stroke
 * width, in page px. The way begins a little before the first letter and
 * ends a little past the last; the skein adds the approach. */
export interface Spun {
  way: Pt[];
  width: number;
}

export interface Measure {
  (page: DOMRect): Spun | null;
}

export interface Spinner {
  inscribe(el: HTMLElement, hue: Hue, measure: Measure): void;
}

interface SpunOptions {
  skein: Spinner;
  /** Write the word at once. */
  instant: boolean;
  signal: AbortSignal;
}

/** Below this font size a thread cannot write legibly. */
const SMALLEST = 36;

export function spinType(root: ParentNode, options: SpunOptions) {
  const words = [...root.querySelectorAll<HTMLElement>("[data-spun]")];
  if (!words.length) return;
  const { signal } = options;
  // The letters have to be the real face: Aboreto, not a fallback.
  document.fonts.ready.then(() => {
    if (signal.aborted) return;
    if (options.instant) {
      for (const el of words) spinWord(el, options);
      return;
    }
    // A word at a time, when the page has room.
    const next = () => {
      const el = words.shift();
      if (!el || signal.aborted) return;
      spinWord(el, options);
      if (words.length) soon(next);
    };
    soon(next);
  });
}

const soon = (run: () => void) =>
  "requestIdleCallback" in window ? requestIdleCallback(run, { timeout: 300 }) : setTimeout(run, 16);

function hueOf(el: HTMLElement): Hue {
  const hue = el.closest<HTMLElement>("[data-hue]")?.dataset.hue ?? el.dataset.spun;
  return hue === "c" ? "c" : "m";
}

function spinWord(el: HTMLElement, options: SpunOptions) {
  if ((parseFloat(getComputedStyle(el).fontSize) || 0) < SMALLEST) return;
  const begin = () =>
    options.skein.inscribe(el, hueOf(el), (page) => {
      const t0 = performance.now();
      const spun = measure(el, page);
      // For a look while developing: how long a word takes to read.
      if (import.meta.env.DEV) performance.measure("hion:spun", { start: t0, detail: el.textContent });
      return spun;
    });
  // Begin when the drawing reaches the word (it lights its hung thing).
  const lit = el.closest<HTMLElement>("[data-reveal]") ?? el;
  if (options.instant || !lit.hasAttribute("data-reveal") || lit.hasAttribute("data-lit")) begin();
  else {
    const watch = new MutationObserver(() => {
      if (!lit.hasAttribute("data-lit")) return;
      watch.disconnect();
      begin();
    });
    watch.observe(lit, { attributes: true, attributeFilter: ["data-lit"] });
    options.signal.addEventListener("abort", () => watch.disconnect());
  }
}

/** The word's letters, read off the page a line at a time and traced,
 * as one way in page px. Null when there is nothing to write. */
function measure(el: HTMLElement, page: DOMRect): Spun | null {
  const style = getComputedStyle(el);
  const size = parseFloat(style.fontSize) || 0;
  if (size < SMALLEST) return null;
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  // Drawn large enough that a stroke is five or six pixels, which thins
  // cleanly; a big word is drawn as it is.
  const scale = Math.max(1, Math.min(2.5, 5 / (size * 0.058)));
  const room = Math.round(size * 0.12) + 6;
  const runs = textRuns(el);
  if (!runs.length) return null;
  // Lines: runs sharing a top.
  const lines: Run[][] = [];
  for (const run of runs) {
    const line = lines.find((ln) => Math.abs(ln[0].rect.top - run.rect.top) < run.rect.height * 0.5);
    if (line) line.push(run);
    else lines.push([run]);
  }
  lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
  const way: Pt[] = [];
  const widths: number[] = [];
  let lastLine = 0;
  for (const line of lines) {
    const l = Math.min(...line.map((r) => r.rect.left));
    const t = Math.min(...line.map((r) => r.rect.top));
    const r = Math.max(...line.map((r) => r.rect.right));
    const b = Math.max(...line.map((r) => r.rect.bottom));
    const w = Math.ceil((r - l + room * 2) * scale);
    const h = Math.ceil((b - t + room * 2) * scale);
    if (w < 4 || h < 4 || w * h > 4e6) continue;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.font = font;
    if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = style.letterSpacing;
    ctx.fillStyle = "#000";
    ctx.textBaseline = "alphabetic";
    for (const run of line) {
      const ascent = ctx.measureText(run.text).fontBoundingBoxAscent;
      ctx.fillText(run.text, run.rect.left - l + room, run.rect.top - t + room + ascent);
    }
    const data = ctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 128 ? 1 : 0;
    const traced = traceWord(mask, w, h, 16 * scale, 28 * scale);
    if (!traced) continue;
    const toPage = ([x, y]: Pt): Pt => [x / scale - room + l - page.left, y / scale - room + t - page.top];
    const start = toPage(traced.way[0]);
    if (way.length) {
      // On to the next line: back along the line it just ran, then down.
      const end = way[way.length - 1];
      way.push([end[0], lastLine], [start[0], lastLine]);
    }
    for (const p of traced.way) way.push(toPage(p));
    widths.push(traced.width / scale);
    lastLine = toPage([0, traced.line])[1];
  }
  if (way.length < 4) return null;
  widths.sort((a, b) => a - b);
  return { way, width: widths[Math.floor(widths.length / 2)] };
}

interface Run {
  text: string;
  rect: DOMRect;
}

/** The word's text, a stretch per line it sits on (viewport px). */
function textRuns(el: HTMLElement): Run[] {
  const runs: Run[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
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
  let top: number | undefined;
  for (let i = from; i < to; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getClientRects()[0];
    if (!rect) continue;
    if (top !== undefined && Math.abs(rect.top - top) > rect.height / 2) {
      runs.push([start, i]);
      start = i;
    }
    top = rect.top;
  }
  runs.push([start, to]);
  return runs;
}
