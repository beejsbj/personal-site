/** What "every lens shows every part" means, as data.
 *
 * `routesFor(content)` lists the routes the content generates, and
 * `expectedParts(route, content)` lists the parts each must show, each
 * with the words it must contain. The parity test checks every lens on
 * every route against this; the atlas shows it. `GAPS` records what a lens
 * knowingly leaves out, so a gap is a decision written down rather than a
 * drift nobody saw.
 *
 * No runtime imports: Node (the tests), Astro (the atlas) and the browser
 * (the harness) all load it. */
import type { Part } from "./parts";
import type { RouteKind, SiteContent } from "./shells/types";

export type LensId =
  | "daylight"
  | "calling-card"
  | "cut-paper"
  | "back-page"
  | "hion";

export interface RouteRef {
  kind: RouteKind;
  path: string;
  slug?: string;
}

export interface Expectation {
  part: Part;
  ref?: string;
  /** Each must appear in the part's text (see `normalize`). */
  texts: string[];
}

/** Every route the content generates, in reading order. */
export function routesFor(content: SiteContent): RouteRef[] {
  return [
    { kind: "home", path: "/" },
    { kind: "projects", path: "/projects" },
    ...content.projects.map((p) => ({
      kind: "project" as const,
      path: p.href,
      slug: p.slug,
    })),
    { kind: "lab", path: "/lab" },
    ...content.lab
      .filter((entry) => entry.hasPage)
      .map((entry) => ({
        kind: "lab-entry" as const,
        path: entry.detail,
        slug: entry.slug,
      })),
    { kind: "about", path: "/about" },
    { kind: "resume", path: "/resume" },
  ];
}

/** Compare words, not typography: case, spacing, quote style and the
 * Unicode form never decide whether a part is "there". */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "");
}

/** Inline markdown reduced to its words. */
export const words = (source: string) =>
  source
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|`/g, "")
    .replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, "$1$2");

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
const decode = (text: string) =>
  text.replace(/&(#x?[\da-f]+|\w+);/gi, (match, code: string) => {
    if (code[0] === "#")
      return String.fromCodePoint(
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : Number(code.slice(1)),
      );
    return ENTITIES[code] ?? match;
  });

const VOID = new Set(["img", "br", "hr", "input", "source", "meta", "link", "col", "wbr", "area", "embed", "track"]);

/** The words of each top-level block of rendered HTML. Each block is cut to
 * its first `max` characters: enough to prove the block is there, short
 * enough to survive a lens splitting it across pages. */
export function blockTexts(html: string, max = 60): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const [, close, tag, selfClose, text] of html.matchAll(
    /<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>|([^<]+)/g,
  )) {
    if (text !== undefined) {
      if (depth > 0) current += decode(text);
      continue;
    }
    const name = tag.toLowerCase();
    if (close) {
      depth -= 1;
      if (depth === 0) {
        const words = current.replace(/\s+/g, " ").trim();
        if (words) out.push(words.slice(0, max));
        current = "";
      }
    } else if (!selfClose && !VOID.has(name)) depth += 1;
  }
  return out;
}

export function expectedParts(
  route: RouteRef,
  content: SiteContent,
): Expectation[] {
  const { pages } = content;
  const page = (part: Part, ref: string, ...texts: (string | undefined)[]) => ({
    part,
    ref,
    texts: texts.filter((t): t is string => !!t),
  });
  switch (route.kind) {
    case "home": {
      const home = pages.home;
      const bySlug = new Map(content.projects.map((p) => [p.slug, p]));
      return [
        page("page.title", "home", home.hero.headline),
        { part: "home.greeting", texts: [home.hero.greeting] },
        { part: "home.occupation", texts: [home.hero.occupation] },
        { part: "home.welcome", texts: [home.hero.welcome] },
        ...content.featured.slice(0, home.work.limit).map((slug) =>
          page("project.title", slug, bySlug.get(slug)?.title),
        ),
        ...content.updates
          .slice(0, home.updates.limit)
          .map((u) => page("update.item", u.id, u.title)),
        { part: "home.currently", texts: [words(home.currently.body)] },
        ...home.elsewhere.items.map((item, i) =>
          page("home.elsewhere", String(i), item.title),
        ),
      ];
    }
    case "projects":
      return [
        page("page.title", "projects", pages.projects.header.title),
        page("page.intro", "projects", pages.projects.header.intro),
        ...content.projects.flatMap((p) => [
          page("project.title", p.slug, p.title),
          page("project.summary", p.slug, p.summary),
        ]),
      ];
    case "project": {
      const p = content.projects.find((item) => item.slug === route.slug);
      if (!p) return [];
      return [
        page("project.title", p.slug, p.title),
        page("project.summary", p.slug, p.summary),
        ...(p.html ? [page("project.body", p.slug, ...blockTexts(p.html))] : []),
        ...(p.links.length
          ? [page("project.links", p.slug, ...p.links.map((l) => l.label))]
          : []),
        ...(p.tools.length ? [page("project.tools", p.slug, ...p.tools)] : []),
      ];
    }
    case "lab":
      return [
        page("page.title", "lab", pages.lab.header.title),
        page("page.intro", "lab", pages.lab.header.intro),
        ...content.lab.flatMap((entry) => [
          page("lab.title", entry.slug, entry.title),
          page("lab.summary", entry.slug, entry.summary),
        ]),
        { part: "lab.more", texts: [pages.lab.more.label] },
        { part: "lab.aside", texts: [words(pages.lab.aside)] },
      ];
    case "lab-entry": {
      const entry = content.lab.find((item) => item.slug === route.slug);
      if (!entry) return [];
      return [
        page("lab.title", entry.slug, entry.title),
        page("lab.summary", entry.slug, entry.summary),
        ...(entry.html
          ? [page("lab.body", entry.slug, ...blockTexts(entry.html))]
          : []),
        ...(entry.links.length
          ? [page("lab.links", entry.slug, ...entry.links.map((l) => l.label))]
          : []),
      ];
    }
    case "about":
      return [
        page("page.title", "about", pages.about.header.title),
        page("page.intro", "about", pages.about.header.intro),
        page("page.body", "about", ...blockTexts(pages.about.html)),
      ];
    case "resume": {
      const { resume } = content;
      return [
        page("page.title", "resume", pages.resume.header.title),
        ...resume.experience.roles.map((role) =>
          page("resume.role", role.id, role.title, role.org),
        ),
        ...resume.education.entries.map((entry) =>
          page("resume.education", entry.id, entry.title, entry.org),
        ),
        { part: "resume.tools", texts: resume.tools.items },
        ...(pages.resume.html
          ? [page("page.body", "resume", ...blockTexts(pages.resume.html))]
          : []),
      ];
    }
    default:
      return [];
  }
}

/** Parts a lens knowingly does not show on a kind of route, and why. The
 * parity test skips exactly these; everything else must be there. Close a
 * gap by rendering the part and deleting its line. */
export const GAPS: Partial<
  Record<LensId, Partial<Record<RouteKind, Partial<Record<Part, string>>>>>
> = {
  "calling-card": {
    home: {
      "project.title":
        "The pause menu has no featured shelf: the Projects command opens the Equip list, where the featured projects carry the Selected tag.",
      "update.item":
        "Only the latest update shows, on the phone chip (marked); the rest are messages in the Phone dialog, built when it opens.",
      "home.currently":
        "No Currently note on the pause menu: its corner is the calendar, which names the latest update instead.",
      "home.elsewhere":
        "No Elsewhere list on the pause menu: Writing is a command and the socials are on the Calling Card dialog, without blurbs.",
    },
    lab: {
      "lab.more":
        "The request board shows only the experiments; it has no link out to more sketches on CodePen.",
      "lab.aside":
        "The request board has no aside pointing to Projects and the Style Guide; Projects is a tab.",
    },
  },
  "cut-paper": {
    home: {
      "home.elsewhere":
        "No Elsewhere section: Lab and Writing are keys on the keyboard, without their blurbs.",
    },
  },
  "back-page": {
    home: {
      "home.elsewhere":
        "The books have no Elsewhere page: the lab is a book of its own, and Writing is a line in the contents slip (the inside cover, or the cover on a phone).",
    },
    projects: {
      "project.summary":
        "The war book's first pages are a roll call of names and dates and the war map; each project's summary is on its own page.",
    },
    lab: {
      "lab.more":
        "The lab chapter is the doodles only; CodePen is among the places on the cover's return-to label.",
      "lab.aside":
        "The lab chapter is the doodles only; Projects is in the contents and the style guide is not in the book.",
    },
  },
  hion: {},
};

export const isGap = (lens: LensId, kind: RouteKind, part: Part) =>
  !!GAPS[lens]?.[kind]?.[part];
