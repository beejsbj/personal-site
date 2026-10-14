/** Fabric: every page is its own cloth.
 *
 * The cloth under a page is woven to that page's structure: where both
 * colours have crossed, the structure says which lies on top, and only
 * that one shows, as in a real weave. Home is a plain weave (the simplest
 * cloth, a checkerboard), the projects a twill (diagonal ribs), the lab a
 * basket weave, About a satin (smooth, mostly one colour with points of
 * the other), the resume a broken twill, writing a herringbone, and a
 * page that does not exist a loose, unstructured weave. A single thing
 * seen close (a project, a post) is cut from its list's cloth.
 *
 * The line at the top carries a swatch of each page's cloth under its
 * name; the page you are on is pulled down further than the rest. */
import type { RouteKind } from "../types";

export type Fabric = "plain" | "twill" | "basket" | "satin" | "broken" | "herringbone" | "loose";

const FABRICS: Record<RouteKind, Fabric> = {
  home: "plain",
  projects: "twill",
  project: "twill",
  lab: "basket",
  "lab-entry": "basket",
  about: "satin",
  resume: "broken",
  writing: "herringbone",
  "writing-entry": "herringbone",
  other: "loose",
};

export const fabricOf = (kind: string): Fabric => FABRICS[kind as RouteKind] ?? "loose";

/** The fabric of a place on the site, by its path. */
export function fabricAt(path: string): Fabric {
  const first = path.split("/").filter(Boolean)[0] ?? "";
  return fabricOf(first === "" ? "home" : first);
}

/** Which colour lies on top at crossing (x, y) where both have been:
 * 1 cyan (the warp), 2 magenta (the weft). */
export function topAt(fabric: Fabric, x: number, y: number): 1 | 2 {
  switch (fabric) {
    case "plain":
      return (x + y) & 1 ? 2 : 1;
    case "twill":
      return ((x + y) & 3) < 2 ? 1 : 2;
    case "basket":
      return ((x >> 1) + (y >> 1)) & 1 ? 1 : 2;
    case "satin":
      // A five-end satin: magenta's face, with cyan at scattered points.
      return (((x * 2 + y) % 5) + 5) % 5 === 0 ? 1 : 2;
    case "broken":
      return ((x + y + ((x >> 2) & 1) * 2) & 3) < 2 ? 1 : 2;
    case "herringbone": {
      // A twill whose diagonal turns back every four ends.
      const d = x & 4 ? 3 - (x & 3) : x & 3;
      return ((d + y) & 3) < 2 ? 1 : 2;
    }
    case "loose": {
      let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
      h ^= h >>> 15;
      return h & 1 ? 1 : 2;
    }
  }
}
