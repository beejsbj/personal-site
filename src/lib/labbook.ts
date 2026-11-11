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
 * shown: the site is given its shape and never its words. */
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
        /** The lengths of the black bars, not derived from the hidden text. */
        bars: number[];
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
      shape: { work: update.shape.work, bars: [...update.shape.bars] },
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
  const { href, linkLabel, ...said } = update;
  return {
    ...said,
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

/** Something an update is about, as a link to it. */
export type RelatedLink = {
  kind: "experiment" | "project";
  title: string;
  href: string;
};

/** The experiment and the project an update is about, each where it lives.
 * A project may be named by its slug or, as the older updates do, by its
 * title. One that is not shown (hidden, or never written) links nowhere. */
export function relatedLinks(
  update: Pick<Update, "relatedExperiment" | "relatedProject">,
  shown: {
    lab: { slug: string; title: string; detail: string }[];
    projects: { slug: string; title: string; href: string }[];
  },
): RelatedLink[] {
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
            title: experiment.title,
            href: experiment.detail,
          },
        ]
      : []),
    ...(project
      ? [{ kind: "project" as const, title: project.title, href: project.href }]
      : []),
  ];
}
