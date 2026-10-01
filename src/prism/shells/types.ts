/** The contract every lens shell implements.
 *
 * A shell is a lens's own interface: its own layout, navigation and feel over
 * the same portfolio. It renders into a persistent full-viewport root that
 * survives client-side navigation, so it can animate between routes. Links
 * are ordinary `<a href>` to real site URLs; the client router navigates and
 * the shell receives `update(route)`. Daylight has no shell: it is the
 * server-rendered page underneath.
 *
 * Every word a shell shows comes from `SiteContent` (/prism/content.json):
 * the portfolio's content, the copy Daylight shows, and the lens's own
 * flavour copy in `content.lenses[id]`. A shell never reads Daylight's page
 * except as the fallback for `other` routes (`fallbackBody` in ./rich). */
import type CallingCardCopy from "../../content/lenses/calling-card.json";
import type CutPaperCopy from "../../content/lenses/cut-paper.json";
import type BackPageCopy from "../../content/lenses/back-page.json";
import type HionCopy from "../../content/lenses/hion.json";

export interface Link {
  label: string;
  href: string;
}

/** A page's opening. Strings are plain unless noted. */
export interface Header {
  eyebrow?: string;
  title: string;
  intro?: string;
  actions: Link[];
}

export interface Media {
  type: "image" | "video";
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

/** A role or a course on the resume. */
export interface ResumeEntry {
  /** Stable id, the `data-ref` of its `resume.role`/`resume.education` part. */
  id: string;
  /** "Frontend Developer · API3": title and org, whichever exist. */
  heading: string;
  title?: string;
  org?: string;
  kind?: string;
  start?: string;
  end?: string;
  /** No end date: an ongoing role. */
  current: boolean;
  /** The italic line: "January 2022 - November 2024". May be empty. */
  dateLine: string;
  location?: string;
  url?: string;
  /** Inline markdown. */
  summary?: string;
  /** Inline markdown, one per bullet. May be empty. */
  bullets: string[];
}

export interface Project {
  slug: string;
  href: string;
  title: string;
  summary: string;
  kind: "Project" | "Arcade";
  year: number;
  dateLabel: string;
  role: string;
  location: string;
  /** May be empty. */
  tools: string[];
  featured: boolean;
  status: string;
  /** May be empty: a project need not have a cover. */
  cover: string;
  links: { label: string; url: string }[];
  media: Media[];
  tags: string[];
  order: number;
  /** The rendered markdown body. May be empty. */
  html: string;
}

export interface LabEntry {
  slug: string;
  /** Where the entry lives: its own page, or the live experiment when it
   * has no page here (then `detail === href`). */
  detail: string;
  /** The live experiment, when it lives elsewhere. */
  href?: string;
  hasPage: boolean;
  title: string;
  summary: string;
  type: string;
  sourceEra: string;
  cover?: string;
  links: { label: string; url: string }[];
  media: Media[];
  order: number;
  html: string;
}

export interface Update {
  /** The file name, the `data-ref` of its `update.item` part. */
  id: string;
  kind: string;
  source: string;
  /** How Daylight names the kind and source ("Pull request", "This site"). */
  kindLabel: string;
  sourceLabel: string;
  title: string;
  date: string;
  dateLabel: string;
  summary: string;
  href: string;
  linkLabel: string;
  relatedProject?: string;
}

export interface Lenses {
  "calling-card": typeof CallingCardCopy;
  "cut-paper": typeof CutPaperCopy;
  "back-page": typeof BackPageCopy;
  hion: typeof HionCopy;
}

export interface SiteContent {
  site: {
    name: string;
    siteTitle: string;
    siteDescription: string;
    email: string;
    writingUrl: string;
    mark: { text: string; label: string };
    skipLink: string;
    nav: { label: string; href: string; external?: boolean }[];
    header: { label: string; home: string; hello: string; items: string[] };
    footer: { links: Link[]; signoff: string };
    social: { label: string; href: string }[];
  };
  pages: {
    home: {
      title: string;
      description: string;
      hero: {
        greeting: string;
        headline: string;
        occupation: string;
        welcome: string;
        portrait: { src: string; alt: string; caption: string; href: string };
        links: Link[];
      };
      /** Earlier home copy kept for Burooj to choose from. Render nothing
       * from here. */
      alternatives: Record<string, string | undefined>;
      sidebarLabel: string;
      /** `limit`: how many featured projects Daylight's home shows. */
      work: { title: string; link: Link; limit: number };
      /** `body` is inline markdown. */
      currently: { title: string; body: string; link: Link };
      /** `limit`: how many updates Daylight's home shows. */
      updates: {
        title: string;
        intro: string;
        listLabel: string;
        empty: string;
        caption: string;
        limit: number;
      };
      elsewhere: {
        label: string;
        items: { title: string; href: string; blurb: string }[];
      };
    };
    about: { title: string; description: string; header: Header; html: string };
    /** The resume page's header and its free markdown body ("See the
     * work"); the structure is in `content.resume`. */
    resume: { title: string; description: string; header: Header; html: string };
    projects: {
      title: string;
      description: string;
      header: Header;
      listLabel: string;
      /** Copy for each project's own page. */
      detail: {
        back: Link;
        labels: { role: string; location: string; date: string };
      };
    };
    lab: {
      title: string;
      description: string;
      header: Header;
      listLabel: string;
      more: Link;
      /** Inline markdown. */
      aside: string;
      detail: { eyebrow: string; labels: { type: string; era: string } };
    };
    notFound: { title: string; description: string; header: Header };
  };
  resume: {
    experience: { title: string; roles: ResumeEntry[] };
    education: { title: string; entries: ResumeEntry[] };
    tools: { title: string; items: string[]; sentence: string };
    /** Ends the date line of a role with no end date ("Present"). */
    ongoing: string;
    /** The whole resume as Daylight renders it (structure and body), for a
     * lens that reads it as rich text. */
    html: string;
  };
  /** Every visible project, in the one project order (newest year first,
   * then `order`). */
  projects: Project[];
  /** Every visible lab entry, by `order`. */
  lab: LabEntry[];
  /** Every due, unexpired update, newest first. */
  updates: Update[];
  /** Slugs of the featured projects, in project order (shared rule; never
   * empty while there are projects). */
  featured: string[];
  /** Values computed from the data, so no lens hard-codes them. */
  derived: {
    years: number[];
    firstYear: number;
    lastYear: number;
    latestUpdate: string | null;
    latestProject: string | null;
    counts: { projects: number; lab: number; updates: number; featured: number };
  };
  lenses: Lenses;
}

export type RouteKind =
  | "home"
  | "projects"
  | "project"
  | "lab"
  | "lab-entry"
  | "about"
  | "resume"
  | "other";

export interface Route {
  kind: RouteKind;
  path: string;
  slug?: string;
  /** Document title of the page. */
  title: string;
  /** Daylight rendered its 404 here. */
  notFound?: boolean;
  /** A detached clone of Daylight's `<main>`. Only for `other` routes, and
   * only through `fallbackBody(route)`: every other screen renders from
   * `content`. The drift test enforces this. */
  main: HTMLElement;
}

export interface ShellContext {
  /** Empty, persistent, full-viewport container. Render everything in here. */
  root: HTMLElement;
  content: SiteContent;
  route: Route;
  /** Rendering as a prism face: a live but non-interactive preview. */
  face: boolean;
  reducedMotion: boolean;
  /** Aborted when the shell unmounts. Tie listeners and loops to it. */
  signal: AbortSignal;
  /** True while this page is an off-axis prism face or the camera is moving.
   * CSS animations pause automatically; pause JS/canvas loops yourself. */
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

export interface LensShell {
  /** Build the interface. Resolve once the first screen is painted. */
  mount(context: ShellContext): void | Promise<void>;
  /** The URL changed (client navigation). Transition to the new route. */
  update(route: Route): void | Promise<void>;
  /** Optional cleanup beyond `signal`; the runtime empties `root` after. */
  unmount?(): void;
}
