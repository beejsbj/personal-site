/** What every shell needs to turn content into DOM: rendered markdown
 * bodies, inline-markdown copy, templated lens copy, the shared featured
 * set, and the one sanctioned way to read Daylight's page (the fallback for
 * routes no shell designs). */
import { parseInline, plainInline, type InlineToken } from "../../lib/inline";
import type { Project, Route, SiteContent } from "./types";

export { plainInline as plain };

/** A rendered markdown body (content.json `html`) as nodes to place, style
 * and rearrange. Authored markdown is rendered by the server; runtime Substack HTML must pass
 * the source adapter's allowlist sanitizer before reaching this function. */
export function rich(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

/** The top-level blocks of a rendered body: paragraphs, headings, lists,
 * figures, tables, whatever the markdown made. */
export const blocks = (html: string): HTMLElement[] =>
  [...rich(html).children] as HTMLElement[];

/** Build a link the shell's way; it receives the anchor's content. */
export type LinkMaker = (href: string, children: Node[]) => Node;

const plainLink: LinkMaker = (href, children) => {
  const a = document.createElement("a");
  a.href = href;
  a.append(...children);
  return a;
};

/** Inline-markdown copy (**strong**, _em_, `code`, [links](/x)) as nodes. */
export function inline(
  source: string,
  link: LinkMaker = plainLink,
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const build = (tokens: InlineToken[]): Node[] =>
    tokens.map((token) => {
      switch (token.type) {
        case "text":
          return document.createTextNode(token.text);
        case "code": {
          const code = document.createElement("code");
          code.textContent = token.text;
          return code;
        }
        case "strong":
        case "em": {
          const el = document.createElement(token.type);
          el.append(...build(token.children));
          return el;
        }
        case "link":
          return link(token.href, build(token.children));
      }
    });
  fragment.append(...build(parseInline(source)));
  return fragment;
}

/** Fill a lens-copy template: fill("{n} tracks", { n: 7 }). `{s}` is
 * filled with "s" unless `n` is 1, for simple plurals. */
export function fill(
  template: string,
  values: Record<string, string | number> = {},
): string {
  const all: Record<string, string | number> = {
    s: values.n === 1 ? "" : "s",
    ...values,
  };
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in all ? String(all[key]) : match,
  );
}

/** The featured projects, by the shared rule, in project order. */
export function featured(content: SiteContent): Project[] {
  const bySlug = new Map(content.projects.map((p) => [p.slug, p]));
  return content.featured
    .map((slug) => bySlug.get(slug))
    .filter((p): p is Project => !!p);
}

/** Daylight's own page, for a route no shell designs (`other`): a fresh copy
 * of its children each call. The only sanctioned read of `route.main`. */
export function fallbackBody(route: Route): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const copy = route.main.cloneNode(true) as HTMLElement;
  fragment.append(...copy.childNodes);
  return fragment;
}
