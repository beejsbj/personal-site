/** Woven covers: pictures the living cloth weaves out of itself.
 *
 * A cover marked `data-woven-cover` is woven into the page's fabric: its
 * light becomes thread, dithered at a fine pitch on the same weave as the
 * page's, seen closer. The picture itself comes back when you reach for
 * it. (Titles were once woven the same way, a cellular cloth pulled into
 * a letter mask; they are now written by one thread, spun.ts.) Nothing
 * runs while the prism holds the page idle. */
import type { Fabric } from "./fabric";
import { still } from "./dom";
import { drape, paintCrossing, stitches } from "./stitch";

interface WovenOptions {
  /** The page's weave. */
  fabric: Fabric;
  signal: AbortSignal;
}

const soon = (run: () => void) =>
  "requestIdleCallback" in window ? requestIdleCallback(run, { timeout: 300 }) : setTimeout(run, 16);

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
  let weaving = false;
  const next = () => {
    frame = 0;
    const figure = queue.shift();
    if (!figure || options.signal.aborted) return;
    // One at a time, a few rows a slice, so a list of them never stalls
    // the page.
    weaving = true;
    weaveCover(figure, options, () => {
      weaving = false;
      if (queue.length) frame = requestAnimationFrame(next);
    });
  };
  const near = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        near.unobserve(entry.target);
        const figure = entry.target as HTMLElement;
        const img = figure.querySelector("img");
        if (!img) continue;
        // Decoded off the main thread before it is read.
        const ready = () =>
          img.decode().then(
            () => {
              queue.push(figure);
              if (!frame && !weaving) frame = requestAnimationFrame(next);
            },
            () => {},
          );
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

function weaveCover(figure: HTMLElement, options: WovenOptions, done: () => void) {
  const frameEl = figure.querySelector<HTMLElement>(".hion-picture__frame");
  const img = figure.querySelector("img");
  if (!frameEl || !img) return done();
  const w = frameEl.clientWidth;
  const h = frameEl.clientHeight;
  if (w < 20 || h < 20) {
    frameEl.dataset.wovenState = "plain";
    return done();
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
    return done();
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
  let y = 0;
  const slice = () => {
    if (options.signal.aborted) return;
    const end = performance.now() + 8;
    for (; y < rows && performance.now() < end; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const light = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255;
        const b = BAYER[(y & 3) * 4 + (x & 3)];
        const bits = light > 0.55 + b * 0.45 ? 3 : light > b * 0.6 ? hue : 0;
        paintCrossing(ctx, st, x, y, bits, hang, options.fabric);
      }
    }
    if (y < rows) {
      soon(slice);
      return;
    }
    frameEl.append(canvas);
    still(canvas);
    frameEl.dataset.wovenState = "done";
    done();
  };
  slice();
}
