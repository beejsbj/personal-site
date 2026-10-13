import type { RouteKind } from "./shells/types";

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
  const kinds: Record<string, RouteKind> = {
    projects: slug ? "project" : "projects",
    lab: slug ? "lab-entry" : "lab",
    about: "about",
    resume: "resume",
  };
  return { kind: path === "/" ? "home" : (kinds[first] ?? "other"), slug };
}
