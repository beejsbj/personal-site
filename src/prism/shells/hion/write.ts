/** Hion writes the headings. The heading stays real, selectable HTML text;
 * over it, for a moment, each word is traced as a line of light (its glyph
 * outlines stroked in cyan or magenta, word after word), and then the ink
 * fills in behind the line and the tracing lets go. */
import { s } from "./dom";

interface WriteOptions {
  instant: boolean;
  delay?: number;
}

const measure = document.createElement("canvas").getContext("2d");

export function writeHeading(
  el: HTMLElement,
  { instant, delay = 0 }: WriteOptions,
) {
  el.classList.add("hion-written");
  if (instant) {
    el.setAttribute("data-written", "");
    return;
  }
  el.setAttribute("data-writing", "");
  // Wait for the heading's face so outlines match the text they trace.
  const style = getComputedStyle(el);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const ready =
    document.fonts?.load(font, el.textContent ?? "") ?? Promise.resolve();
  ready.catch(() => {}).then(() => trace(el, delay));
}

function trace(el: HTMLElement, delay: number) {
  if (!el.isConnected) return;
  const style = getComputedStyle(el);
  const size = parseFloat(style.fontSize);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  let ascent = size * 0.9;
  if (measure) {
    measure.font = font;
    const metrics = measure.measureText("Hg");
    ascent = metrics.fontBoundingBoxAscent || ascent;
  }
  const box = el.getBoundingClientRect();
  const svg = s("svg", {
    class: "hion-write",
    "aria-hidden": "true",
    width: String(Math.ceil(box.width)),
    height: String(Math.ceil(box.height)),
    viewBox: `0 0 ${Math.ceil(box.width)} ${Math.ceil(box.height)}`,
  });
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let index = 0;
  const dash = Math.round(size * 9);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.nodeValue ?? "";
    for (const match of value.matchAll(/\S+/g)) {
      range.setStart(node, match.index ?? 0);
      range.setEnd(node, (match.index ?? 0) + match[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      const r = rects[0];
      const word = s(
        "text",
        {
          x: (r.left - box.left).toFixed(1),
          y: (r.top - box.top + ascent).toFixed(1),
          class: `hion-write__word hion-write__word--${index % 2 ? "magenta" : "cyan"}`,
          style: `font:${font};letter-spacing:${style.letterSpacing};--hion-dash:${dash};--hion-word-delay:${delay + index * 170}ms`,
        },
        match[0],
      );
      svg.append(word);
      index++;
    }
  }
  // A sibling, not a child: the heading's text stays exactly its words.
  const host = (el.offsetParent as HTMLElement | null) ?? el.parentElement!;
  const hostBox = host.getBoundingClientRect();
  svg.style.left = `${box.left - hostBox.left + host.scrollLeft - host.clientLeft}px`;
  svg.style.top = `${box.top - hostBox.top + host.scrollTop - host.clientTop}px`;
  el.after(svg);
  const duration = delay + index * 170 + 1100;
  window.setTimeout(() => {
    el.removeAttribute("data-writing");
    el.setAttribute("data-written", "");
  }, duration - 350);
  window.setTimeout(() => svg.remove(), duration + 900);
}
