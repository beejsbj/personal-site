/** The parts vocabulary: one name for each piece of content, so every lens
 * can say "this element is the about page's body" or "this is Dayshaper's
 * title" in the same words. Daylight and every shell mark the element they
 * render a part into with `data-part` (and `data-ref` for which one), the
 * parity test checks every lens shows every part, and the atlas highlights
 * a part across all five lenses.
 *
 * Refs: `page.*` take the page id (home, about, resume, projects, lab,
 * not-found); `project.*` and `lab.*` the entry slug; `update.item` the
 * update id; `resume.*` the entry id from content.json; `home.elsewhere`
 * the item's index.
 *
 * Plain data, no imports: Astro, the shells and the Node tests all load it. */

export const PARTS = [
  // any page's opening, and its rendered markdown body
  "page.eyebrow",
  "page.title",
  "page.intro",
  "page.actions",
  "page.body",
  // home
  "home.greeting",
  "home.occupation",
  "home.welcome",
  "home.portrait",
  "home.links",
  "home.currently",
  "home.elsewhere",
  // a project, wherever it appears
  "project.title",
  "project.summary",
  "project.meta",
  "project.tools",
  "project.links",
  "project.media",
  "project.body",
  // a lab entry, and the lab page's extras
  "lab.title",
  "lab.summary",
  "lab.meta",
  "lab.links",
  "lab.media",
  "lab.body",
  "lab.more",
  "lab.aside",
  // one update in a list of them
  "update.item",
  // the structured resume
  "resume.role",
  "resume.education",
  "resume.tools",
] as const;

export type Part = (typeof PARTS)[number];

/** A type, not an interface, so it spreads into any attribute record. */
export type PartAttrs = {
  "data-part": Part;
  "data-ref"?: string;
};

/** Attributes marking an element as a part: `h("p", part("page.intro",
 * "about"), …)` or `<p {...part("page.intro", "about")}>`. */
export function part(name: Part, ref?: string | number): PartAttrs {
  return ref === undefined
    ? { "data-part": name }
    : { "data-part": name, "data-ref": String(ref) };
}

/** Mark an element already built. */
export function markPart<T extends Element>(
  element: T,
  name: Part,
  ref?: string | number,
): T {
  element.setAttribute("data-part", name);
  if (ref !== undefined) element.setAttribute("data-ref", String(ref));
  return element;
}
