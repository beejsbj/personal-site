/** Tiny DOM helpers for the Cut Paper shell. */

type Attr = string | number | boolean | null | undefined;
export type Child = Node | string | number | null | undefined | false | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, Attr> | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    el.setAttribute(name, value === true ? "" : String(value));
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
}

/** Parse a static, trusted SVG/HTML string (decoration only). */
export function markup(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content;
}

export const text = (node: Element | null | undefined) =>
  node?.textContent?.replace(/\s+/g, " ").trim() ?? "";

/** What a screen reader hears after an external link (lens copy). */
let newTabNote = "";
export const setNewTabNote = (note: string) => {
  newTabNote = note;
};

export const isExternal = (href: string) =>
  /^(https?:)?\/\//.test(href) && !href.startsWith(location.origin);

/** A link; external ones open in a new tab and say so. */
export function link(
  href: string,
  attrs: Record<string, Attr>,
  ...children: Child[]
) {
  const external = isExternal(href);
  return h(
    "a",
    {
      href,
      ...(external ? { target: "_blank", rel: "noreferrer" } : {}),
      ...attrs,
    },
    ...children,
    external
      ? [
          h("span", { class: "cp-out", "aria-hidden": "true" }, "↗"),
          h("span", { class: "cp-sr" }, newTabNote),
        ]
      : null,
  );
}
