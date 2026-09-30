/** The contract every lens shell implements.
 *
 * A shell is a lens's own interface: its own layout, navigation and feel over
 * the same portfolio. It renders into a persistent full-viewport root that
 * survives client-side navigation, so it can animate between routes. Links
 * are ordinary `<a href>` to real site URLs; the client router navigates and
 * the shell receives `update(route)`. Daylight has no shell: it is the
 * server-rendered page underneath, which stays the source of truth. */

export interface SiteContent {
  site: {
    name: string;
    email: string;
    writingUrl: string;
    nav: { label: string; href: string; external?: boolean }[];
    social: { label: string; href: string }[];
  };
  pages: Record<
    "home" | "about" | "resume",
    {
      title: string;
      description: string;
      eyebrow?: string;
      headline?: string;
      intro?: string;
      availability?: string;
      /** Raw markdown; the rendered version is in `route.main` on its page. */
      body: string;
    }
  >;
  projects: {
    slug: string;
    href: string;
    title: string;
    summary: string;
    kind: "Project" | "Arcade";
    year: number;
    dateLabel: string;
    role: string;
    location: string;
    tools: string[];
    featured: boolean;
    status: string;
    cover: string;
    links: { label: string; url: string }[];
    media: {
      type: "image" | "video";
      src: string;
      alt?: string;
      caption?: string;
    }[];
    tags: string[];
  }[];
  lab: {
    slug: string;
    /** Where the entry lives: its local page, or the live experiment when it
     * has no local page (then `detail === href`). */
    detail: string;
    href?: string;
    title: string;
    summary: string;
    type: string;
    sourceEra: string;
    cover?: string;
    links: { label: string; url: string }[];
  }[];
  /** Newest first, already filtered for expiry. */
  updates: {
    kind: string;
    source: string;
    title: string;
    date: string;
    dateLabel: string;
    summary: string;
    href: string;
    linkLabel: string;
    relatedProject?: string;
  }[];
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
  /** A detached clone of the server-rendered `<main>` for this URL: the
   * rendered article body for projects, lab entries, about and resume, and a
   * universal fallback for any page a shell does not specially design. */
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
