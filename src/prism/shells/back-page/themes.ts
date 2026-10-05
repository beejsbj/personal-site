/** The books on the desk, and the paper each one is. The papers are Dotfight's
 * themes (PR #16, `src/theme.ts`): a squared maths copy under the lamp, the
 * quiet feint-ruled notebook, a canary legal pad, a graph book fought in
 * pencil, and blueprint in white and yellow chalk. Each section of the
 * portfolio is its own exercise book on one of them. The colours live in
 * themes.css (as `[data-theme]` variables); the words (what each book and
 * paper is called, and what the soldiers call their pens) live in the lens
 * copy, `content.lenses["back-page"]`; this is only which is which. */
import type { Copy } from "./chapters";

export type ThemeId = keyof Copy["papers"];
export type BookKey = Exclude<keyof Copy["books"], "label" | "open" | "openOnDesk">;

export interface Shelf {
  key: BookKey;
  href: string;
  theme: ThemeId;
}

/** The books, in the order they lie on the desk. */
export const BOOKS: Shelf[] = [
  { key: "home", href: "/", theme: "lamplight" },
  { key: "about", href: "/about", theme: "notebook" },
  { key: "lab", href: "/lab", theme: "graph" },
  { key: "projects", href: "/projects", theme: "blueprint" },
];

export const shelfOf = (key: BookKey) => BOOKS.find((b) => b.key === key)!;

/** The pens on a page, by side, for the soldiers' lines: [the visitor's
 * side, Dawood's]. */
export function penNames(el: Element | null, papers: Copy["papers"]): [string, string] {
  const id = el?.closest<HTMLElement>("[data-theme]")?.dataset.theme as ThemeId | undefined;
  const pens = (id && papers[id]?.pens) || papers.lamplight.pens;
  return [pens[0], pens[1]];
}
