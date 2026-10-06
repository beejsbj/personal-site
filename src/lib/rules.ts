/** The portfolio's shared rules: which projects are featured and in what
 * order, how links to the site's own identity resolve, how a resume date
 * line is written, and the values derived from the data. Daylight and
 * /prism/content.json both use these, so no lens decides them for itself.
 *
 * Pure functions over plain data, with no Astro imports, so the tests can
 * import this file directly. */

export interface LinkRef {
  label?: string;
  href: string;
}
export interface ResolvedLink {
  label: string;
  href: string;
}
interface Identity {
  email: string;
  writingUrl: string;
  social: { label: string; href: string }[];
}

/** Resolve "social:<Label>", "site:email" and "site:writing" hrefs. */
export function resolveLink(site: Identity, link: LinkRef): ResolvedLink {
  const { href, label } = link;
  if (href.startsWith("social:")) {
    const name = href.slice("social:".length);
    const social = site.social.find((item) => item.label === name);
    if (!social) throw new Error(`No social link labelled "${name}".`);
    return { label: label ?? social.label, href: social.href };
  }
  if (href === "site:email")
    return { label: label ?? site.email, href: `mailto:${site.email}` };
  if (href === "site:writing") {
    if (!label) throw new Error(`"site:writing" needs a label.`);
    return { label, href: site.writingUrl };
  }
  if (href.startsWith("site:")) throw new Error(`Unknown link "${href}".`);
  if (!label) throw new Error(`The link to "${href}" needs a label.`);
  return { label, href };
}

// ---- projects ----------------------------------------------------------------

interface Ordered {
  year: number;
  order: number;
  featured: boolean;
  title: string;
}

/** The one order projects appear in: newest year first, then `order`. */
export function orderProjects<T extends Ordered>(projects: T[]): T[] {
  return [...projects].sort(
    (a, b) =>
      b.year - a.year || a.order - b.order || a.title.localeCompare(b.title),
  );
}

/** Featured projects, in project order. With none featured, the newest
 * `fallback` projects stand in, so no lens ever has an empty showcase. */
export function featuredProjects<T extends Ordered>(
  ordered: T[],
  fallback: number,
): T[] {
  const featured = ordered.filter((project) => project.featured);
  return featured.length ? featured : ordered.slice(0, fallback);
}

/** Lab entries by `order`, then title. */
export function orderLab<T extends { order: number; title: string }>(
  entries: T[],
): T[] {
  return [...entries].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title),
  );
}

// ---- resume -------------------------------------------------------------------

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2022-01" -> "January 2022"; "2022" -> "2022". */
export function formatPartialDate(value: string): string {
  const [year, month] = value.split("-");
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

export interface Dated {
  kind?: string;
  start?: string;
  end?: string;
  dateLabel?: string;
}

/** "January 2022 - November 2024", "2024", "March 2025 - Present" (the
 * last word is `ongoing`, from content). */
export function period(entry: Dated, ongoing = ""): string {
  if (!entry.start) return "";
  const start = formatPartialDate(entry.start);
  if (!entry.end) return ongoing ? `${start} - ${ongoing}` : start;
  const end = formatPartialDate(entry.end);
  return start === end ? start : `${start} - ${end}`;
}

/** The italic line under a resume heading. */
export function dateLine(entry: Dated, ongoing = ""): string {
  return (
    entry.dateLabel ??
    [entry.kind, period(entry, ongoing)].filter(Boolean).join(" · ")
  );
}

/** "Frontend Developer · API3". */
export function entryHeading(entry: { title?: string; org?: string }) {
  return [entry.title, entry.org].filter(Boolean).join(" · ");
}

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

/** A stable id for a resume entry: org (or title) and start. */
export function entryId(entry: { title?: string; org?: string; start?: string }) {
  return [slugify(entry.org ?? entry.title ?? "entry"), entry.start]
    .filter(Boolean)
    .join("-");
}

/** "Vue, Nuxt, and React". */
export function listSentence(items: string[]): string {
  if (items.length < 3) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Typographic quotes, as the markdown pipeline writes them in bodies:
 * it's -> it’s, "x" -> “x”. Link targets are left alone. Applied to resume
 * lines, which used to be markdown and should read the same. */
export function smartQuotes(source: string): string {
  return source
    .split(/(\]\([^)]*\))/)
    .map((piece, i) =>
      i % 2
        ? piece
        : piece
            .replace(/(^|[\s([{“])'/g, "$1‘")
            .replace(/'/g, "’")
            .replace(/(^|[\s([{‘])"/g, "$1“")
            .replace(/"/g, "”"),
    )
    .join("");
}

// ---- derived values -----------------------------------------------------------

export interface Derived {
  /** Every project year, newest first. */
  years: number[];
  firstYear: number;
  lastYear: number;
  /** ISO date of the newest update, if any. */
  latestUpdate: string | null;
  /** Slug of the newest project, if any. */
  latestProject: string | null;
  counts: { projects: number; lab: number; updates: number; featured: number };
}

export function derive(input: {
  projects: { year: number; slug: string }[];
  lab: unknown[];
  updates: { date: string }[];
  featured: unknown[];
}): Derived {
  const years = [...new Set(input.projects.map((p) => p.year))].sort(
    (a, b) => b - a,
  );
  const thisYear = new Date().getFullYear();
  return {
    years,
    firstYear: years[years.length - 1] ?? thisYear,
    lastYear: years[0] ?? thisYear,
    latestUpdate: input.updates[0]?.date ?? null,
    latestProject: input.projects[0]?.slug ?? null,
    counts: {
      projects: input.projects.length,
      lab: input.lab.length,
      updates: input.updates.length,
      featured: input.featured.length,
    },
  };
}
