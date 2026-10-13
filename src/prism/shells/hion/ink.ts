/** Ink: the threads that belong to one hung thing and move with it.
 *
 * Anything with `data-ink` carries a small canvas of its own, drawn once
 * (and again only if it changes size): the drop it hangs from, the knot it
 * is tied with, the thread wound round the corners of a picture, a tassel.
 * Because the thread is part of the thing, it swings with it, slides with
 * it along a cord, and is revealed with it.
 *
 *   drop   one thread from the cord above to the top of the element,
 *          knotted at both ends (charm: the same, for the line at the top)
 *   pair   two threads to its top corners, wound round them (pictures)
 *   sign   two threads to the ends of its words (hung headings)
 *   pull   a pull-cord: a thread down to a knot beside its label
 *   tassel the two hions falling from a knot and parting in two curls
 *
 * The hang length is `--hion-hang` on the element (px). */
import { pendant } from "./dance";
import { textExtent } from "./dom";
import { Kind, type Mark, Path, knot, paint, paintGlows, patterns, rng, thread, wraps, type Hue } from "./pastel";

const PAD = 26;

function hangOf(el: HTMLElement) {
  return parseFloat(getComputedStyle(el).getPropertyValue("--hion-hang")) || 0;
}

function marksFor(el: HTMLElement, w: number, h: number, drop: number): Mark[] {
  const type = el.dataset.ink;
  const seed = Number(el.dataset.seed ?? 1);
  const hue: Hue = el.dataset.hue === "m" ? "m" : "c";
  const top = PAD; // the cord
  const at = PAD + drop; // the element's top edge
  const line = (x0: number, y0: number, x1: number, y1: number, s: number, hueOf = hue) =>
    thread(
      new Path(
        [
          [x0, y0],
          [x0 + (x1 - x0) * 0.5 + (rng(s)() - 0.5) * 1.5, (y0 + y1) / 2],
          [x1, y1],
        ],
        3,
      ),
      { hue: hueOf, w: 2.4, seed: s, glow: 0.24, wobble: 0.5 },
    );
  const out: Mark[] = [];
  if (type === "drop" || type === "charm") {
    const x = PAD + w * parseFloat(el.dataset.inkX ?? "0.5");
    if (drop > 2) out.push(...line(x, top, x, at + 2, seed));
    out.push(...knot(x, top + 1, 3.5, seed + 1));
    out.push(...knot(x, at + 1, type === "charm" ? 5.5 : 4.5, seed + 2));
  } else if (type === "pair") {
    const inset = Math.min(18, w * 0.08);
    const xl = PAD + inset;
    const xr = PAD + w - inset;
    if (drop > 2) {
      out.push(...line(xl, top, xl, at + 4, seed, "c"));
      out.push(...line(xr, top, xr, at + 4, seed + 5, "m"));
    }
    out.push(...knot(xl, top + 1, 3.5, seed + 1), ...knot(xr, top + 1, 3.5, seed + 2));
    out.push(...wraps(PAD + 2, at + 2, 1, seed + 3), ...wraps(PAD + w - 2, at + 2, -1, seed + 4));
  } else if (type === "sign") {
    const [l, r] = textExtent(el) ?? [0, w];
    const inset = Math.min(28, (r - l) * 0.12);
    const xl = PAD + l + inset;
    const xr = PAD + r - inset;
    if (drop > 2) {
      out.push(...line(xl, top, xl, at, seed, "c"));
      out.push(...line(xr, top, xr, at, seed + 5, "m"));
    }
    out.push(...knot(xl, top + 1, 3.5, seed + 1), ...knot(xr, top + 1, 3.5, seed + 2));
    out.push(...knot(xl, at, 4.5, seed + 3), ...knot(xr, at, 4.5, seed + 4));
  } else if (type === "pull") {
    const x = PAD + 6;
    if (drop > 2) out.push(...line(x, top, x, at + h * 0.5 - 6, seed));
    if (!el.hasAttribute("data-hang")) out.push(...knot(x, top + 1, 3.5, seed + 2));
    out.push(...knot(x, at + h * 0.5, 5, seed + 1));
  } else if (type === "tassel") {
    const side = parseFloat(getComputedStyle(el).getPropertyValue("--hion-tassel-x"));
    const x = PAD + (Number.isNaN(side) ? w / 2 : 12 + side * (w - 24));
    if (drop > 2) out.push(...line(x, top, x, at, seed));
    out.push(...pendant(x, at, Math.min(70, h * 0.85), seed + 2));
  }
  return out;
}

const drawn = new WeakMap<HTMLElement, string>();

function inkOne(el: HTMLElement) {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (!w || !h) return;
  const drop = hangOf(el);
  const type = el.dataset.ink;
  const tall = type === "tassel" ? h + 40 : type === "pull" ? h : 28;
  const signature = `${w}x${h}:${drop}:${getComputedStyle(el).getPropertyValue("--hion-tassel-x")}`;
  if (drawn.get(el) === signature) return;
  drawn.set(el, signature);
  let canvas = el.querySelector<HTMLCanvasElement>(":scope > canvas.hion-ink");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "hion-ink";
    canvas.setAttribute("aria-hidden", "true");
    el.prepend(canvas);
  }
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cw = w + PAD * 2;
  const ch = drop + tall + PAD * 2;
  canvas.width = Math.ceil(cw * dpr);
  canvas.height = Math.ceil(ch * dpr);
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  canvas.style.left = `${-PAD}px`;
  canvas.style.top = `${-PAD - drop}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pats = patterns(ctx, dpr);
  const marks = marksFor(el, w, h, drop);
  // Blooms first, faintly, under the threads.
  paintGlows(ctx, marks, cw, ch, 0.6);
  for (const m of marks) if (m.kind !== Kind.Glow) paint(ctx, m, pats);
}

/** Ink every hung thing under root (cheap when nothing changed). */
export function ink(root: ParentNode) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-ink]")) {
    if (el.offsetParent === null) continue;
    inkOne(el);
  }
}
