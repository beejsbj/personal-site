/** Tiny DOM helpers for the hion shell. */

type Child = Node | string | false | null | undefined;
type Attrs = Record<string, string | number | boolean | undefined | null>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    el.setAttribute(key, value === true ? "" : String(value));
  }
  append(el, children);
  return el;
}

function append(el: Element, children: (Child | Child[])[]) {
  for (const child of children.flat()) {
    if (child === false || child === null || child === undefined) continue;
    el.append(child);
  }
}

/** What a screen reader hears after a link that opens a new tab; the
 * lens's copy, set once at mount. */
let newTabNote = "";
export function setNewTabNote(note: string) {
  newTabNote = note;
}

/** The hidden note on a link that opens a new tab. */
export const newTab = () => h("span", { class: "hion-sr" }, ` ${newTabNote}`);

/** An ordinary link; external ones open in a new tab and say so. */
export function link(
  href: string,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
) {
  const external = /^https?:/.test(href);
  return h(
    "a",
    {
      href,
      ...(external ? { target: "_blank", rel: "noreferrer" } : {}),
      ...attrs,
    },
    ...children,
    external ? newTab() : null,
  );
}

/** Clean Astro dev noise off markup borrowed from Daylight's page. */
export function scrub(root: Element) {
  const all = [root, ...root.querySelectorAll("*")];
  for (const el of all) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("data-astro")) el.removeAttribute(attr.name);
    }
  }
}

export const text = (el: Element | null | undefined) =>
  el?.textContent?.replace(/\s+/g, " ").trim() ?? "";

export const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Left and right of the words inside an element, from its own left edge. */
export function textExtent(el: HTMLElement): [number, number] | null {
  const own = el.getBoundingClientRect();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let l = Infinity;
  let r = -Infinity;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue?.trim()) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width < 1) continue;
      l = Math.min(l, rect.left - own.left);
      r = Math.max(r, rect.right - own.left);
    }
  }
  range.detach();
  return l < r ? [l, r] : null;
}

/* ---------- Still pictures ---------- */

/** A 2D canvas on the page costs every frame the page commits, changed or
 * not (about a tenth of a millisecond each, measured on a software-
 * rendered machine; a Hion screen has fifty or so). A bitmap shown in a
 * `bitmaprenderer` canvas costs nothing until it changes. So a canvas
 * drawn now and then is drawn out of sight and shown as a still: `still`
 * swaps a twin into its place the first time and updates the twin after
 * that (coalesced, once per task); the 2D canvas stays the thing drawn on.
 * Where the browser has no bitmap renderer, the canvas stays itself. */
const twins = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
const sources = new WeakMap<Element, HTMLCanvasElement>();
const shots = new WeakMap<HTMLCanvasElement, number>();
const due = new Set<HTMLCanvasElement>();
let flushing = false;
const stills =
  typeof window !== "undefined" && typeof createImageBitmap === "function" && "ImageBitmapRenderingContext" in window;

export function still(canvas: HTMLCanvasElement) {
  if (!stills) return;
  due.add(canvas);
  if (flushing) return;
  flushing = true;
  queueMicrotask(() => {
    flushing = false;
    const list = [...due];
    due.clear();
    for (const source of list) {
      const shown = twins.get(source) ?? source;
      if (!shown.isConnected || !source.width || !source.height) continue;
      const shot = (shots.get(source) ?? 0) + 1;
      shots.set(source, shot);
      createImageBitmap(source).then(
        (bitmap) => {
          let twin = twins.get(source);
          // Gone, or a later picture is on its way.
          if (shots.get(source) !== shot || !(twin ?? source).isConnected) {
            bitmap.close();
            return;
          }
          if (!twin) {
            twin = document.createElement("canvas");
            twins.set(source, twin);
            sources.set(twin, source);
            source.replaceWith(twin);
          }
          // Only when changed: setting these invalidates style, and a pane
          // drawn on often would dirty layout for every frame's reads.
          if (twin.className !== source.className) twin.className = source.className;
          if (twin.style.cssText !== source.style.cssText) twin.style.cssText = source.style.cssText;
          if (source.hasAttribute("aria-hidden") && !twin.hasAttribute("aria-hidden")) twin.setAttribute("aria-hidden", "true");
          twin.getContext("bitmaprenderer")?.transferFromImageBitmap(bitmap);
        },
        () => {},
      );
    }
  });
}

/** The canvas drawn on behind what is shown (itself, if not a still). */
export const drawnOn = <T extends Element | null>(el: T): T => ((el && sources.get(el)) ?? el) as T;

/** Take a canvas off the page, whether it is shown as itself or a still. */
export function unshow(canvas: HTMLCanvasElement) {
  shots.set(canvas, (shots.get(canvas) ?? 0) + 1);
  (twins.get(canvas) ?? canvas).remove();
}
