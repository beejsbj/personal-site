/** The books on the desk, and the paper each one is. The papers are Dotfight's
 * themes (PR #16, `src/theme.ts`): a squared maths copy under the lamp, the
 * quiet feint-ruled notebook, a canary legal pad, a graph book fought in
 * pencil, and blueprint in white and yellow chalk. Each section of the
 * portfolio is its own exercise book on one of them. The colours live in
 * themes.css (as `[data-theme]` variables); this is what the script needs:
 * the names written on the covers, and what the soldiers call their pens. */

export type ThemeId = "lamplight" | "notebook" | "legal" | "graph" | "blueprint";
export type BookKey = "home" | "about" | "resume" | "lab" | "projects";

export interface Theme {
  id: ThemeId;
  /** Dotfight's name for the paper. */
  name: string;
  /** What the contents slip calls it. */
  short: string;
  /** Printed across the top of the cover label. */
  school: string;
  /** The Class field on the label. */
  klass: string;
  /** What the soldiers call the two pens: [the visitor's side, Dawood's]. */
  pens: [string, string];
  /** A pencil (or chalk) rather than a biro. */
  pencil: boolean;
}

export const THEMES: Record<ThemeId, Theme> = {
  lamplight: { id: "lamplight", name: "Maths copy", short: "squared", school: "Exercise book · squared", klass: "after lights out", pens: ["Blue", "Red"], pencil: false },
  notebook: { id: "notebook", name: "The quiet notebook", short: "feint ruled", school: "Notebook · feint ruled", klass: "the quiet one", pens: ["Blue", "Red"], pencil: false },
  legal: { id: "legal", name: "Legal pad", short: "legal pad", school: "Legal pad · 50 sheets", klass: "after hours", pens: ["Black", "Red"], pencil: false },
  graph: { id: "graph", name: "Graph book", short: "graph, 2 mm", school: "Graph book · 2 mm", klass: "pencil fight", pens: ["Lead", "Red"], pencil: true },
  blueprint: { id: "blueprint", name: "Blueprint", short: "blueprint", school: "Drawing sheets · A2", klass: "drawing office", pens: ["White", "Yellow"], pencil: true },
};

export interface Shelf {
  key: BookKey;
  href: string;
  /** The name on the label, in two inks. */
  title: [string, string];
  /** What it's called on the shelf and in the contents. */
  name: string;
  /** The Subject field, and the aside on the shelf. */
  aside: string;
  theme: ThemeId;
}

/** The books, in the order they lie on the desk. */
export const BOOKS: Shelf[] = [
  { key: "home", href: "/", title: ["Port", "folio"], name: "Hello", aside: "start here", theme: "lamplight" },
  { key: "about", href: "/about", title: ["About ", "me"], name: "About me", aside: "a letter", theme: "notebook" },
  { key: "resume", href: "/resume", title: ["Res", "ume"], name: "Resume", aside: "stapled in", theme: "legal" },
  { key: "lab", href: "/lab", title: ["The ", "lab"], name: "The lab", aside: "doodles", theme: "graph" },
  { key: "projects", href: "/projects", title: ["The ", "war"], name: "Projects", aside: "the war", theme: "blueprint" },
];

export const shelfOf = (key: BookKey) => BOOKS.find((b) => b.key === key)!;

/** The pens on a page, by side, for the soldiers' lines. */
export function penNames(el: Element | null): [string, string] {
  const id = el?.closest<HTMLElement>("[data-theme]")?.dataset.theme as ThemeId | undefined;
  return (id && THEMES[id]?.pens) || THEMES.lamplight.pens;
}
