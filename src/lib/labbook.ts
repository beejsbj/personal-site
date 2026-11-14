/** The Lab's data contract, and the rules that turn src/content into it.
 *
 * Two documents: the Labbook (every update) and who is in the room now. In
 * v1 the first is built from src/content; later the same shape arrives
 * from storage.
 *
 * Pure functions over plain data, with no Astro imports, so the lenses and
 * the tests can import this file directly. */
import type { UpdateData, UpdateKind, UpdateSource } from "../content.config";

/** One dated entry in the Labbook. A redacted update happened and is not
 * shown: the site is given its shape, which may show a few of its words,
 * and never the rest. */
export type Update = {
  /** Stable and opaque. In v1, the file name. */
  id: string;
  /** YYYY-MM-DD. The site writes the label (`updateDateLabel`). */
  date: string;
  kind: UpdateKind;
  source: UpdateSource;
  relatedProject?: string;
  /** A lab slug. */
  relatedExperiment?: string;
} & (
  | {
      visibility: "open";
      title: string;
      summary: string;
      href?: string;
      linkLabel?: string;
      artifact?: Artifact;
    }
  | {
      visibility: "redacted";
      shape: {
        work: "code" | "design" | "writing" | "research" | "other";
        /** Its line, in order: a string is a word shown as written, a
         * number the length of a black bar (not derived from the hidden
         * text). At least one part is a bar. */
        parts: (string | number)[];
      };
    }
);

export type Artifact = {
  kind: "image" | "video" | "pen" | "demo" | "sound";
  src: string;
  alt: string;
  poster?: string;
};

/** Who is in the room. Missing or expired, the live parts say "in repair";
 * fresh with no agents, the room is quiet. */
export type Now = {
  /** ISO. */
  generatedAt: string;
  /** ISO, at most five minutes after `generatedAt`. */
  expiresAt: string;
  agents: {
    sprite: string;
    /** A lab slug. */
    experiment?: string;
    line?: string;
    redacted: boolean;
  }[];
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-07-01" -> "01 Jul 2026". */
export function updateDateLabel(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** Leave out what was never said, so a document has no empty keys. */
const said = <T extends object>(fields: T): T =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as T;

/** An update as the Labbook carries it. This is the gate everything about
 * an update leaves through: it copies the fields the contract names and no
 * others, so what the site keeps to itself (its evidence, its expiry) stays
 * behind, and a redacted update leaves as its shape alone. */
export function labbookUpdate(id: string, update: UpdateData): Update {
  const common = {
    id,
    date: update.date,
    kind: update.kind,
    source: update.source,
    relatedProject: update.relatedProject,
    relatedExperiment: update.relatedExperiment,
  };
  if (update.visibility === "redacted")
    return said({
      ...common,
      visibility: update.visibility,
      shape: { work: update.shape.work, parts: [...update.shape.parts] },
    });
  return said({
    ...common,
    visibility: update.visibility,
    title: update.title,
    summary: update.summary,
    href: update.href,
    linkLabel: update.linkLabel,
    artifact: update.artifact,
  });
}

/** The id of the element that holds an update in the Labbook. */
export const labbookAnchor = (id: string) => `u-${id}`;

/** Where an update sits in the Labbook. Nothing links there unless it is
 * written to. */
export const labbookHref = (id: string) => `/lab#${labbookAnchor(id)}`;

/** The Labbook's one order: newest first and, on one day, by id. */
export const newestFirst = <T extends { id: string; date: string }>(
  list: T[],
): T[] =>
  [...list].sort(
    (left, right) =>
      right.date.localeCompare(left.date) || left.id.localeCompare(right.id),
  );

/** An experiment's part of the Labbook: the updates about it, newest
 * first, the redacted ones among them. Its page and every lens list these. */
export function experimentUpdates(labbook: Update[], slug: string): Update[] {
  return newestFirst(
    labbook.filter((update) => update.relatedExperiment === slug),
  );
}

/** Where an update goes, with the words for the way there; or nowhere,
 * and then it is shown as text. */
export type UpdateLink =
  | { href: string; linkLabel: string }
  | { href?: undefined; linkLabel?: undefined };

type Open<T> = Extract<T, { visibility: "open" }>;
/** An update the home stream can show: its words, a label for its date
 * and, if it goes anywhere, its link. */
export type InStream<T> = Open<T> & { dateLabel: string } & UpdateLink;

/** An update as the home stream, and each lens's `updates`, show it; or
 * nothing, for a redacted one. The date label an open update left unsaid
 * is written from its date. An update need not open anywhere: one with no
 * `href` has no link, and one with an `href` and no words for it is linked
 * by its title. */
export function streamUpdate<T extends UpdateData>(
  update: T,
): InStream<T> | undefined {
  if (update.visibility !== "open") return undefined;
  const { href, linkLabel, ...words } = update;
  return {
    ...words,
    dateLabel: update.dateLabel ?? updateDateLabel(update.date),
    ...(href ? { href, linkLabel: linkLabel ?? update.title } : {}),
  } as InStream<T>;
}

const PEN =
  /^https:\/\/(?:codepen|cdpn)\.io\/([\w-]+)\/\w+\/(\w+)\/?(?:[?#].*)?$/;

/** The address a Pen's frame loads: built from its id, which is read out
 * of a normal Pen URL (`https://codepen.io/<user>/pen/<id>`), or taken as
 * written when `src` is the id alone and the Pen is `user`'s. Nothing,
 * when `src` is not a Pen. */
export function penEmbedSrc(src: string, user?: string): string | undefined {
  const [, owner = user, id = /^\w+$/.test(src) ? src : undefined] =
    src.match(PEN) ?? [];
  return owner && id
    ? `https://codepen.io/${owner}/embed/${id}?default-tab=result`
    : undefined;
}

/** Whose the site's Pens are: the name in its CodePen address. */
export const penUser = (site: { social: { href: string }[] }) =>
  site.social
    .map((entry) => entry.href.match(/^https:\/\/codepen\.io\/([\w-]+)/)?.[1])
    .find(Boolean);

/** What an artifact's frame loads, once the visitor asks for it: a Pen's
 * embed or a demo's own address. Nothing for an artifact shown in place
 * (a picture, a film, a sound). `penUser` owns a Pen named by id alone. */
export function embedSrc(
  artifact: Artifact,
  penUser?: string,
): string | undefined {
  if (artifact.kind === "pen") return penEmbedSrc(artifact.src, penUser);
  return artifact.kind === "demo" ? artifact.src : undefined;
}

/** The kinds of Pen address that are one Pen. A page of Pens, a collection
 * and a profile are not. */
const A_PEN =
  /^https:\/\/codepen\.io\/[\w-]+\/(?:pen|full|fullpage|details|embed)\/\w+/;

/** Whether an address is one Pen's. */
export const isPen = (href: string) => A_PEN.test(href);

/** What a Lab entry's card loads in place of its still, once the visitor
 * asks for it; nothing for an entry that is not played in place. A Pen is
 * told by its `href` (its embed address); any other page only when the
 * entry says `embeddable`, so nothing is framed by accident. */
export function labPreview(entry: {
  href?: string;
  embeddable?: boolean;
}): string | undefined {
  const { href, embeddable } = entry;
  if (!href?.startsWith("https://")) return undefined;
  if (A_PEN.test(href))
    return embeddable === false ? undefined : penEmbedSrc(href);
  return embeddable ? href : undefined;
}

/** What a Lab entry's card plays in place, and what it is (a Pen or a demo,
 * which the card's words follow); nothing when it is not played in place. */
export function labPlay(entry: {
  href?: string;
  embeddable?: boolean;
}): { kind: "pen" | "demo"; frame: string } | undefined {
  const frame = labPreview(entry);
  return frame
    ? { kind: isPen(entry.href ?? "") ? "pen" : "demo", frame }
    : undefined;
}

/** Something an update is about, as a link to it. */
export type RelatedLink = {
  kind: "experiment" | "project";
  title: string;
  href: string;
};

/** Something an update is about: an experiment or a project that is shown,
 * by its slug, with its title and where it lives. */
export type Subject = RelatedLink & { slug: string };

type Shown = {
  lab: { slug: string; title: string; detail: string }[];
  projects: { slug: string; title: string; href: string }[];
};

/** The experiment and the project an update is about, each where it lives.
 * A project may be named by its slug or, as the older updates do, by its
 * title. One that is not shown (hidden, or never written) is nothing. A
 * redacted update keeps what it is about, so it has subjects too. */
export function subjectsOf(
  update: Pick<Update, "relatedExperiment" | "relatedProject">,
  shown: Shown,
): Subject[] {
  const experiment = shown.lab.find(
    (entry) => entry.slug === update.relatedExperiment,
  );
  const project = shown.projects.find(
    (entry) =>
      entry.slug === update.relatedProject ||
      entry.title === update.relatedProject,
  );
  return [
    ...(experiment
      ? [
          {
            kind: "experiment" as const,
            slug: experiment.slug,
            title: experiment.title,
            href: experiment.detail,
          },
        ]
      : []),
    ...(project
      ? [
          {
            kind: "project" as const,
            slug: project.slug,
            title: project.title,
            href: project.href,
          },
        ]
      : []),
  ];
}

/** The experiment and the project an update is about, as links to each. */
export function relatedLinks(
  update: Pick<Update, "relatedExperiment" | "relatedProject">,
  shown: Shown,
): RelatedLink[] {
  return subjectsOf(update, shown).map(({ kind, title, href }) => ({
    kind,
    title,
    href,
  }));
}

const MONTH_NAMES = [
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

/** "2026-09" -> "September 2026". */
export function monthLabel(month: string): string {
  const [year, number] = month.split("-");
  return `${MONTH_NAMES[Number(number) - 1]} ${year}`;
}

/** The Labbook kept by month, as a notebook is: the newest month first,
 * each holding its updates newest first. A month with nothing in it has no
 * place. `month` is "YYYY-MM" (`monthLabel` names it). */
export function labbookMonths<T extends { id: string; date: string }>(
  list: T[],
): { month: string; updates: T[] }[] {
  const months: { month: string; updates: T[] }[] = [];
  for (const update of newestFirst(list)) {
    const month = update.date.slice(0, 7);
    if (months.at(-1)?.month !== month) months.push({ month, updates: [] });
    months.at(-1)!.updates.push(update);
  }
  return months;
}

/** A month of the Labbook as a page of a calendar: how many days of its
 * first week fall before it (the week begins on a Monday), and each of
 * its days with the updates written on it, by id. */
export function monthCalendar<T extends { id: string; date: string }>(
  month: string,
  list: T[],
): { lead: number; days: { day: number; updates: string[] }[] } {
  const [year, number] = month.split("-").map(Number);
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const days = Array.from({ length }, (_, index) => ({
    day: index + 1,
    updates: [] as string[],
  }));
  for (const update of list)
    if (update.date.startsWith(`${month}-`))
      days[Number(update.date.slice(8, 10)) - 1]?.updates.push(update.id);
  return { lead, days };
}

/** What the Labbook can be narrowed to: every experiment and project its
 * updates are about (a redacted update among them), each with how many
 * entries it has, the one written in most recently first. */
export function labbookSubjects(
  labbook: Update[],
  shown: Shown,
): (Subject & { count: number })[] {
  const subjects = new Map<string, Subject & { count: number }>();
  for (const update of newestFirst(labbook))
    for (const subject of subjectsOf(update, shown)) {
      const key = `${subject.kind}:${subject.slug}`;
      const known = subjects.get(key);
      if (known) known.count += 1;
      else subjects.set(key, { ...subject, count: 1 });
    }
  return [...subjects.values()];
}

/** What a narrowing names: one experiment or one project, by slug. */
export type Narrowing = Pick<Subject, "kind" | "slug">;

/** The Labbook is narrowed in the address's query, `?experiment=<slug>` or
 * `?project=<slug>`: a different query is a different page to the client
 * router, so every lens is handed it as it mounts, Back and reload keep it,
 * and the fragment stays free to land on an update. */
const NARROW_KINDS = ["experiment", "project"] as const;

/** What an address's query narrows the Labbook to, if anything. With both
 * named, the experiment. */
export function narrowedTo(search: string): Narrowing | undefined {
  const query = new URLSearchParams(search);
  for (const kind of NARROW_KINDS) {
    const slug = query.get(kind);
    if (slug) return { kind, slug };
  }
  return undefined;
}

/** The address of the Labbook narrowed to `subject`, or of all of it, from
 * the page it is on (`from`: a path and its query). Whatever else the
 * query says stays; it lands on the Labbook's head. */
export function narrowHref(
  subject: Narrowing | undefined,
  from = "/lab",
): string {
  const url = new URL(from, "https://labbook.invalid");
  for (const kind of NARROW_KINDS) url.searchParams.delete(kind);
  if (subject) url.searchParams.set(subject.kind, subject.slug);
  return `${url.pathname}${url.search}#labbook`;
}
