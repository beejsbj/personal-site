/** Tiny DOM helpers for the Back Page shell. */

type Kid = Node | string | number | null | undefined | false;
type Props = Record<string, string | number | boolean | null | undefined>;

/** `h("a", { class: "x", href: "/" }, "text", child)`. `false`/`null`
 * props are skipped, `true` sets an empty attribute. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...kids: (Kid | Kid[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === false || value === null || value === undefined) continue;
      el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  append(el, kids);
  return el;
}

export function append(el: Element, kids: (Kid | Kid[])[]) {
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(typeof kid === "number" ? String(kid) : kid);
  }
}

/** Parse our own generated SVG markup (never visitor input). */
export function svg(markup: string): SVGSVGElement {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  const root = t.content.firstElementChild as SVGSVGElement;
  paint(root);
  for (const el of root.querySelectorAll("[fill^='var('], [stroke^='var(']")) paint(el);
  return root;
}

/** Ink that names a theme variable can't be an SVG attribute: make it a style. */
export function paint(el: Element) {
  for (const key of ["fill", "stroke"]) {
    const v = el.getAttribute(key);
    if (v?.startsWith("var(")) {
      (el as SVGElement).style.setProperty(key, v);
      el.removeAttribute(key);
    }
  }
}

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

/** An ordinary link; external ones open in a new tab and say so, in
 * `newTab`'s words. */
export function link(href: string, newTab: string, ...kids: Kid[]) {
  const external = /^https?:/.test(href);
  const a = h(
    "a",
    {
      href,
      target: external ? "_blank" : null,
      rel: external ? "noreferrer" : null,
    },
    ...kids,
  );
  if (external) a.append(h("span", { class: "bp-sr" }, ` (${newTab})`));
  return a;
}

/** "25 Sept 2026", the way the date is written in the corner of the page,
 * with the month names in the hand's own spelling (`months`, Jan to Dec). */
export function handDate(date: Date | string, months: string[]) {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
export function shortDate(date: string, months: string[]) {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
