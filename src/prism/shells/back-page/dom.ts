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
  return t.content.firstElementChild as SVGSVGElement;
}

/** Inline markdown used by the site copy: paragraphs, **bold**, [links](/x). */
export function md(source: string): HTMLParagraphElement[] {
  return source
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const p = h("p");
      const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
      let last = 0;
      for (const match of block.matchAll(pattern)) {
        p.append(block.slice(last, match.index));
        if (match[1]) p.append(h("strong", null, match[1]));
        else p.append(link(match[3], match[2]));
        last = (match.index ?? 0) + match[0].length;
      }
      p.append(block.slice(last));
      return p;
    });
}

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

/** An ordinary link; external ones open in a new tab and say so. */
export function link(href: string, ...kids: Kid[]) {
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
  if (external) a.append(h("span", { class: "bp-sr" }, " (opens in a new tab)"));
  return a;
}

export const text = (el: Element | null | undefined) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

const MONTHS = [
  "Jan",
  "Feb",
  "March",
  "April",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];
/** "25 Sept 2026", the way the date is written in the corner of the page. */
export function handDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function shortDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
