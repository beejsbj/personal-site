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

const SVG_NS = "http://www.w3.org/2000/svg";

export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
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

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

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
    external ? h("span", { class: "hion-sr" }, " (opens in a new tab)") : null,
  );
}

/** Pull a node out of the server-rendered main, cleaned of Astro dev noise. */
export function take<T extends Element = HTMLElement>(
  main: HTMLElement,
  selector: string,
): T | null {
  const found = main.querySelector<T>(selector);
  if (!found) return null;
  const clone = found.cloneNode(true) as T;
  scrub(clone);
  return clone;
}

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

export const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
