/** Woven type: words the living cloth weaves out of itself.
 *
 * A word marked `data-woven` is written by life. When the drawing reaches
 * it, a fine cloth behind it (the same weave as the page's, seen closer)
 * fills with a living soup of cyan and magenta thread; generation by
 * generation the life is drawn toward the letters (births favoured inside
 * them, deaths outside) until what is left alive is the word, and the
 * word is woven in: thread between neighbouring crossings, a float at each.
 * The real text stays where it was, invisible, so it reads, selects and
 * speaks as text; only its ink is woven.
 *
 * A visitor who prefers less motion, and a still prism face, get the woven
 * word at once. Nothing runs while the prism holds the page idle: the word
 * is simply finished. */
import type { Fabric } from "./fabric";
import { Immigration, type Species } from "./immigration";
import { rng } from "./pastel";
import { drape, paintCrossing, paintGround, paintRegion, stitches } from "./stitch";

interface WovenOptions {
  /** The page's weave. */
  fabric: Fabric;
  /** Weave the finished word at once. */
  instant: boolean;
  signal: AbortSignal;
  isIdle(): boolean;
}

/** How long life takes to find the word. */
const SPIN = 1500;
/** Room round the word for the soup to live in, px. */
const ROOM = 18;

export function weaveType(root: ParentNode, options: WovenOptions) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-woven]")) weaveWord(el, options);
}

function hueOf(el: HTMLElement): Species {
  const hue = el.closest<HTMLElement>("[data-hue]")?.dataset.hue ?? el.dataset.woven;
  return hue === "c" ? 1 : 2;
}

/** The word's letters as a mask of crossings `pitch` apart, in a box
 * `ROOM` larger than the element all round. */
function letters(el: HTMLElement, pitch: number) {
  const own = el.getBoundingClientRect();
  const w = Math.ceil(own.width + ROOM * 2);
  const h = Math.ceil(own.height + ROOM * 2);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const style = getComputedStyle(el);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = style.letterSpacing;
  ctx.fillStyle = ctx.strokeStyle = "#000";
  // Thicken the hairlines, so they still cross a crossing or two.
  ctx.lineWidth = pitch * 0.7;
  ctx.lineJoin = "round";
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    for (const match of text.matchAll(/\S+/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      if (!range.getClientRects()[0]) continue;
      // A word broken over two lines (at a hyphen) is drawn a line at a time.
      for (const [start, end] of lineRuns(range, node, match.index, match.index + match[0].length)) {
        range.setStart(node, start);
        range.setEnd(node, end);
        const rect = range.getClientRects()[0];
        if (!rect) continue;
        const piece = text.slice(start, end);
        const metrics = ctx.measureText(piece);
        const x = rect.left - own.left + ROOM;
        const y = rect.top - own.top + ROOM + metrics.fontBoundingBoxAscent;
        ctx.fillText(piece, x, y);
        ctx.strokeText(piece, x, y);
      }
    }
  }
  range.detach();
  const cols = Math.ceil(w / pitch);
  const rows = Math.ceil(h / pitch);
  const data = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      // Inked if enough of the crossing's square is.
      let ink = 0;
      let all = 0;
      for (let y = cy * pitch; y < Math.min(h, (cy + 1) * pitch); y++) {
        for (let x = cx * pitch; x < Math.min(w, (cx + 1) * pitch); x++) {
          ink += data[(y * w + x) * 4 + 3];
          all += 255;
        }
      }
      if (all && ink / all > 0.42) mask[cy * cols + cx] = 1;
    }
  }
  return { mask, cols, rows, w, h };
}

/** The stretches of [from, to) in a text node that sit on one line each. */
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

/** Below this size a woven letter is too few crossings to read: the
 * word keeps its chalk. */
const SMALLEST = 52;

function weaveWord(el: HTMLElement, options: WovenOptions) {
  const { signal } = options;
  const size = parseFloat(getComputedStyle(el).fontSize) || 48;
  if (size < SMALLEST) return;
  const pitch = Math.max(3, Math.min(6, Math.round(size / 18)));
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.className = "hion-woven";
  canvas.setAttribute("aria-hidden", "true");
  el.append(canvas);
  const species = hueOf(el);
  const other: Species = species === 1 ? 2 : 1;
  const st = stitches(pitch, dpr, true);
  let frame = 0;

  function shape() {
    const page = el.closest(".hion-page");
    // Measure where the word will rest, not where it swings in from.
    page?.classList.add("hion-measuring");
    const shaped = letters(el, pitch);
    page?.classList.remove("hion-measuring");
    canvas.width = Math.ceil(shaped.cols * pitch * dpr);
    canvas.height = Math.ceil(shaped.rows * pitch * dpr);
    canvas.style.width = `${shaped.cols * pitch}px`;
    canvas.style.height = `${shaped.rows * pitch}px`;
    canvas.style.left = canvas.style.top = `${-ROOM}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const life = new Immigration(shaped.cols, shaped.rows);
    const hang = drape(shaped.cols, shaped.rows, pitch, 23);
    return { ...shaped, ctx, life, hang };
  }

  let woven = shape();

  /** A fleck of the other colour, here and there: it is cloth. */
  const fleck = (i: number) => {
    let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) % 11 === 0;
  };

  function paint(final: boolean) {
    const { ctx, life, cols, rows, hang } = woven;
    paintRegion(ctx, null, life, st, 0, 0, cols, rows, hang);
    if (!final) return;
    // The finished word: a float of its colour at every crossing, under
    // the thread.
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (woven.mask[y * cols + x]) paintGround(ctx, life, st, x, y, hang, options.fabric);
      }
    }
    ctx.restore();
  }

  function finish() {
    cancelAnimationFrame(frame);
    frame = 0;
    const { life, mask, cols, rows } = woven;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const v: 0 | Species = mask[i] ? (fleck(i) ? other : species) : 0;
        life.set(x, y, v);
        if (v) life.weave(x, y, v === 1 ? 1 : 2);
      }
    }
    paint(true);
    el.dataset.wovenState = "done";
  }

  function spin() {
    if (options.instant) {
      finish();
      return;
    }
    const { life, mask, cols, rows } = woven;
    const rand = rng(cols * 31 + rows);
    // A soup in and round the letters (not the whole box), mostly its
    // colour.
    const near = new Uint8Array(mask.length);
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue;
      const x = i % cols;
      const y = Math.floor(i / cols);
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < cols && yy < rows) near[yy * cols + xx] = 1;
        }
      }
    }
    for (let i = 0; i < mask.length; i++) {
      if (near[i] && rand() < 0.4) life.set(i % cols, Math.floor(i / cols), rand() < 0.8 ? species : other);
    }
    el.dataset.wovenState = "spinning";
    const start = performance.now();
    let last = 0;
    const tick = (now: number) => {
      frame = 0;
      if (signal.aborted) return;
      const t = (now - start) / SPIN;
      if (t >= 1 || options.isIdle()) {
        finish();
        return;
      }
      // About thirty generations a second.
      if (now - last > 32) {
        last = now;
        life.step();
        // Drawn toward the word: born in the letters, dying outside them.
        const pull = t * t;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            const alive = life.at(x, y);
            if (mask[i] && !alive && rand() < pull * 0.9) life.set(x, y, fleck(i) ? other : species);
            else if (!mask[i] && alive && rand() < t * 0.7) life.set(x, y, 0);
          }
        }
        paint(false);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  // Begin when the drawing reaches the word (it lights its hung thing).
  const lit = el.closest<HTMLElement>("[data-reveal]") ?? el;
  if (options.instant || !lit.hasAttribute("data-reveal") || lit.hasAttribute("data-lit")) spin();
  else {
    const watch = new MutationObserver(() => {
      if (!lit.hasAttribute("data-lit")) return;
      watch.disconnect();
      spin();
    });
    watch.observe(lit, { attributes: true, attributeFilter: ["data-lit"] });
    signal.addEventListener("abort", () => watch.disconnect());
  }

  // A new width can rewrap the word: weave it again, finished.
  let seen = el.offsetWidth;
  const resize = new ResizeObserver(() => {
    if (el.offsetWidth === seen || el.dataset.wovenState === "spinning") return;
    seen = el.offsetWidth;
    woven = shape();
    finish();
  });
  resize.observe(el);
  signal.addEventListener("abort", () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
  });
}

/* ---------- Woven pictures ---------- */

/** 4×4 ordered dither, so a picture's greys become a pattern of crossings. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** A cover marked `data-woven-cover` is woven into the page's fabric: its
 * light becomes thread, dithered at a fine pitch (dark is black paper, mid
 * tones a float of its colour, the brightest both colours, with the fabric
 * choosing which shows). The picture itself comes back when you reach for
 * it. Each is woven once, when it is near the screen and loaded. */
export function weaveCovers(root: ParentNode, options: WovenOptions) {
  const figures = [...root.querySelectorAll<HTMLElement>("[data-woven-cover]")];
  if (!figures.length) return;
  const queue: HTMLElement[] = [];
  let frame = 0;
  const next = () => {
    frame = 0;
    const figure = queue.shift();
    if (!figure || options.signal.aborted) return;
    weaveCover(figure, options);
    // One a frame, so a list of them never stalls the page.
    if (queue.length) frame = requestAnimationFrame(next);
  };
  const near = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        near.unobserve(entry.target);
        const figure = entry.target as HTMLElement;
        const img = figure.querySelector("img");
        if (!img) continue;
        const ready = () => {
          queue.push(figure);
          if (!frame) frame = requestAnimationFrame(next);
        };
        if (img.complete && img.naturalWidth) ready();
        else img.addEventListener("load", ready, { once: true, signal: options.signal });
      }
    },
    { rootMargin: "50% 0px" },
  );
  for (const figure of figures) near.observe(figure);
  options.signal.addEventListener("abort", () => {
    near.disconnect();
    cancelAnimationFrame(frame);
  });
}

function weaveCover(figure: HTMLElement, options: WovenOptions) {
  const frameEl = figure.querySelector<HTMLElement>(".hion-picture__frame");
  const img = figure.querySelector("img");
  if (!frameEl || !img) return;
  const w = frameEl.clientWidth;
  const h = frameEl.clientHeight;
  if (w < 20 || h < 20) {
    frameEl.dataset.wovenState = "plain";
    return;
  }
  const pitch = w < 260 ? 3 : 4;
  const cols = Math.ceil(w / pitch);
  const rows = Math.ceil(h / pitch);
  // The picture at one sample per crossing, cropped as the frame crops it.
  const sample = document.createElement("canvas");
  sample.width = cols;
  sample.height = rows;
  const sctx = sample.getContext("2d", { willReadFrequently: true })!;
  const scale = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
  const sw = img.naturalWidth * scale;
  const sh = img.naturalHeight * scale;
  sctx.drawImage(img, (cols - sw) / 2, (rows - sh) / 2, sw, sh);
  let data: Uint8ClampedArray;
  try {
    data = sctx.getImageData(0, 0, cols, rows).data;
  } catch {
    // A picture from elsewhere cannot be read: it stays a picture.
    frameEl.dataset.wovenState = "plain";
    return;
  }
  const hue: 1 | 2 = figure.dataset.hue === "m" ? 2 : 1;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.className = "hion-woven-cover";
  canvas.setAttribute("aria-hidden", "true");
  canvas.width = Math.ceil(cols * pitch * dpr);
  canvas.height = Math.ceil(rows * pitch * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const st = stitches(pitch, dpr, true);
  const hang = drape(cols, rows, pitch, 31);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const light = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255;
      const b = BAYER[(y & 3) * 4 + (x & 3)];
      const bits = light > 0.55 + b * 0.45 ? 3 : light > b * 0.6 ? hue : 0;
      paintCrossing(ctx, st, x, y, bits, hang, options.fabric);
    }
  }
  frameEl.append(canvas);
  frameEl.dataset.wovenState = "done";
}
