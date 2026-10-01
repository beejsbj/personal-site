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
