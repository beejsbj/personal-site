/** The Lab's data contract, and the rules that turn src/content into it.
 *
 * Three documents: the Labbook (every update), the headlines written about
 * those updates, and who is in the room now. In v1 the first two are built
 * from src/content; later the same shapes arrive from storage.
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

/** A line written about one or more updates, for the ticker. It links to
 * the first of them in the Labbook (`labbookHref`). */
export type Headline = {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  text: string;
  /** Update ids. */
  updates: string[];
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

/** Where an update sits in the Labbook. A headline links to the first of
 * its updates this way. */
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

type Open<T> = Extract<T, { visibility: "open" }>;
/** An update the home stream can show: its words, a label for its date and
 * somewhere to go. */
export type InStream<T> = Open<T> & {
  dateLabel: string;
  href: string;
  linkLabel: string;
};

/** An update as the home stream, and each lens's `updates`, show it; or
 * nothing, for a redacted one. What an open update left unsaid is filled
 * in: the date label is written from the date, and an update with nowhere
 * else to go links to itself in the Labbook, by its title. */
export function streamUpdate<T extends UpdateData>(
  id: string,
  update: T,
): InStream<T> | undefined {
  if (update.visibility !== "open") return undefined;
  return {
    ...update,
    dateLabel: update.dateLabel ?? updateDateLabel(update.date),
    href: update.href ?? labbookHref(id),
    linkLabel: update.linkLabel ?? update.title,
  } as InStream<T>;
}

/** The headlines the ticker may show, newest first. A headline goes with
 * its updates: when one it names is not in the Labbook (withdrawn, expired
 * or not yet due), the headline is not published either. */
export function publishedHeadlines(
  headlines: Headline[],
  labbook: Update[],
): Headline[] {
  const published = new Set(labbook.map((update) => update.id));
  return newestFirst(
    headlines.filter((headline) =>
      headline.updates.every((id) => published.has(id)),
    ),
  );
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
