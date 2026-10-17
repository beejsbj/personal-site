import type { RouteKind } from "./shells/types";

/** Where the resume lives: a page of About's. Lenses link to it through
 * this, so the address is decided once (the old /resume redirects here). */
export const RESUME_PATH = "/about/resume";

/** Classify real site routes. Writing must be an exact index/detail path:
 * an extra segment cannot put a real article over the native 404 page. */
export function kindOf(path: string): { kind: RouteKind; slug?: string } {
  const [first, slug] = path.split("/").filter(Boolean);
  if (first === "writing") {
    const match = path.match(
      /^\/writing(?:\/([A-Za-z0-9][A-Za-z0-9_-]{0,199}))?\/?$/,
    );
    return match
      ? { kind: match[1] ? "writing-entry" : "writing", slug: match[1] }
      : { kind: "other" };
  }
  if (first === "about") {
    // the resume is a page of About's; nothing else is, and no surplus segments
    if (/^\/about\/?$/.test(path)) return { kind: "about", slug };
    return {
      kind: /^\/about\/resume\/?$/.test(path) ? "resume" : "other",
      slug,
    };
  }
  const kinds: Record<string, RouteKind> = {
    projects: slug ? "project" : "projects",
    lab: slug ? "lab-entry" : "lab",
  };
  return { kind: path === "/" ? "home" : (kinds[first] ?? "other"), slug };
}
