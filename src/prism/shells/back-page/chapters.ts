/** Every route is a chapter in one of the exercise books on the desk: a run
 * of pages written in that book's pens. There's a book for each section,
 * each on its own paper (themes.ts): hello in the squared maths copy, study
 * notes in the quiet notebook with the resume stapled in after them, slip by
 * slip, doodles in the graph book, and the war on blueprint, its map first
 * and a page for each project after.
 *
 * Every word comes from content: the portfolio and Daylight's copy from
 * `content`, the books' own handwriting from `content.lenses["back-page"]`. */
import { markPart, part, type Part } from "../../parts";
import { blocks, fallbackBody, featured, fill, inline } from "../rich";
import type { Route, SiteContent } from "../types";
import { h, handDate, link, shortDate, svg } from "./dom";
import {
  BLUE,
  RED,
  camp,
  doodle,
  flick,
  miniWar,
  seed,
  tally,
  tapeClip,
  underline,
} from "./ink";
import { paginate, type Blank } from "./paginate";
import { studyNotes } from "./studynotes";
import { BOOKS, type BookKey } from "./themes";

type Project = SiteContent["projects"][number];
type LabItem = SiteContent["lab"][number];
/** The book's own handwriting. */
export type Copy = SiteContent["lenses"]["back-page"];

export interface Chapter {
  key: string;
  /** Which book it's in. */
  book: BookKey;
  rank: number;
  label: string;
  pages: HTMLElement[];
  /** A loose sheet tucked into the book instead of pages of its own. */
  loose?: HTMLElement;
}

export interface Stop {
  key: string;
  href: string;
  label: string;
  /** Which book it's in. */
  book: BookKey;
  /** The number of its first page, counted in its own book. */
  page: number;
}

// ---- the books' order ------------------------------------------------------

/** How many pages each stop is given, filled or not, so where a stop starts
 * never depends on how far the ones before it run today. Every book counts
 * its own pages from 1: the lab opens with its own pages and gives each
 * entry that has one a pair of its own after; the war is its map and roll
 * call first, then a few pages for each project. */
const ALLOWANCE = {
  /** The lab's own opening pages, before its entries'. */
  labHead: 2,
  labEntry: 2,
  /** The war map's pages, before the projects'. */
  war: 2,
  project: 3,
};

/** Every stop in every book, book by book, in the order the books lie. */
export function bookOrder(content: SiteContent, copy: Copy): Stop[] {
  const names = copy.chapters;
  const stops: Stop[] = [];
  let page = 1;
  const add = (book: BookKey, href: string, label: string, pages: number) => {
    stops.push({ key: href, href, label, book, page });
    page += pages;
  };
  add("home", "/", names.home, 1);
  page = 1;
  add("about", "/about", names.about, 1);
  // the resume is stapled into the about book, after the notes (its first
  // page is counted from the notes when it's written: see `resume`)
  add("about", "/resume", names.resume, 1);
  page = 1;
  add("lab", "/lab", names.lab, ALLOWANCE.labHead);
  content.lab
    .filter((item) => item.hasPage)
    .forEach((item) => add("lab", item.detail, item.title, ALLOWANCE.labEntry));
  page = 1;
  add("projects", "/projects", names.projects, ALLOWANCE.war);
  content.projects.forEach((project) =>
    add("projects", project.href, project.title, ALLOWANCE.project),
  );
  return stops;
}

/** Which book a route is in; null for the loose sheets tucked into any. */
export function bookOf(route: Route): BookKey | null {
  switch (route.kind) {
    case "home":
      return "home";
    case "about":
      return "about";
    case "resume":
      return "about";
    case "lab":
    case "lab-entry":
      return "lab";
    case "projects":
    case "project":
      return "projects";
    case "writing":
    case "writing-entry":
      return "writing";
    default:
      return null;
  }
}

export function rankOf(route: Route, order: Stop[]) {
  const at = order.findIndex((stop) => stop.key === route.path);
  if (at >= 0) return at;
  const lab = order.findIndex((stop) => stop.key === "/lab");
  if (route.kind === "lab-entry") return lab + 0.5;
  if (route.kind === "writing-entry")
    return order.findIndex((stop) => stop.key === "/writing") + 0.5;
  if (route.kind === "project")
    return order.findIndex((stop) => stop.key === "/projects") + 0.5;
  return 0.5;
}

// ---- pages ------------------------------------------------------------------

export interface Build {
  route: Route;
  content: SiteContent;
  copy: Copy;
  order: Stop[];
  spread: boolean;
  stage: HTMLElement;
  today: string;
}

type Paper = "squared" | "kraft" | "kraft-in" | "notes";

/** The number of the route's first page, from the book's order. */
const firstPage = (b: Build) =>
  b.order.find((stop) => stop.key === b.route.path)?.page ?? null;

/** A fresh page: its number and date pencilled in at the top. */
export function blankPage(
  copy: Copy,
  kind: string,
  paper: Paper,
  no?: string | null,
  date?: string | null,
): Blank {
  const page = h("div", { class: "bp-page", "data-kind": kind, "data-paper": paper });
  if (paper !== "kraft" && paper !== "kraft-in") {
    page.append(
      h(
        "div",
        { class: "bp-page__head", "aria-hidden": "true" },
        h("span", null, `${copy.page.number} `, h("b", null, no ?? "")),
        h("span", null, `${copy.page.date} `, h("b", null, date ?? "")),
      ),
    );
  }
  const flow = h("div", { class: "bp-flow" });
  page.append(flow);
  return { page, flow };
}

/** Flow blocks onto numbered pages, from `first` (a number counts on; a
 * word, like the back page's, is written on every page). */
function written(
  b: Build,
  kind: string,
  paper: Paper,
  blocks: HTMLElement[],
  first: number | string | null,
  date: string | null,
  offset = 0,
) {
  let n = typeof first === "number" ? first : 0;
  const pages = paginate(
    blocks,
    () =>
      blankPage(
        b.copy,
        kind,
        paper,
        typeof first === "number" ? String(n++) : first,
        date,
      ),
    b.stage,
    { spread: b.spread, offset },
  );
  decorateSpares(b.copy, pages, kind);
  return pages;
}

/** Pages left empty get the war that was fought on them in a boring lesson. */
function decorateSpares(copy: Copy, pages: HTMLElement[], key: string) {
  pages.forEach((page, i) => {
    if (!page.hasAttribute("data-spare")) return;
    const flow = page.querySelector(".bp-flow")!;
    flow.replaceChildren(spare(copy, `${key}-${i}`));
  });
}

function spare(copy: Copy, key: string) {
  const rng = seed(key);
  return h(
    "div",
    { class: "bp-spare", "aria-hidden": "true" },
    svg(miniWar(300, 380, rng)),
    h("p", { class: "bp-spare__note" }, copy.page.spare),
  );
}

/** A spread always ends on a right-hand page. */
export function evenUp(copy: Copy, pages: HTMLElement[], spread: boolean, key: string) {
  if (!spread || pages.length % 2 === 0) return pages;
  const last = pages[pages.length - 1];
  const no = Number(last.querySelector(".bp-page__head b")?.textContent);
  const { page, flow } = blankPage(copy, "spare", "squared", Number.isFinite(no) && no > 0 ? String(no + 1) : "", null);
  page.dataset.spare = "";
  flow.append(spare(copy, `${key}-end`));
  return [...pages, page];
}

// ---- small pieces of handwriting -----------------------------------------------

const h1 = (title: string, mark?: ReturnType<typeof part>) =>
  h("h1", { class: "bp-h1", tabindex: "-1", ...mark }, title);

/** Copy as the hand jots it: a lower-case start, no full stop. */
const jotted = (words: string) => {
  const s = words.trim().replace(/\.$/, "");
  return s.charAt(0).toLowerCase() + s.slice(1);
};

/** A rendered markdown body as blocks to flow onto pages, each marked as
 * part of the body. */
const prose = (html: string, name: Part, ref: string) =>
  blocks(html).map((el) => markPart(el, name, ref));

function withUnderline(el: HTMLElement, ink: string, key: string, twice = false) {
  el.append(svg(underline(ink, seed(key), twice)));
  return el;
}

function taped(
  src: string,
  alt: string,
  key: string,
  opts: { caption?: string; ratio?: number; video?: boolean; cls?: string } = {},
) {
  const rng = seed(key);
  const tilt = ((rng() - 0.5) * 3).toFixed(2);
  const media = opts.video
    ? h("video", {
        src,
        muted: true,
        playsinline: true,
        controls: true,
        preload: "metadata",
        "aria-label": alt || null,
      })
    : h("img", { src, alt, loading: "lazy", decoding: "async" });
  if (opts.ratio) media.style.aspectRatio = String(opts.ratio);
  const fig = h(
    "figure",
    { class: `bp-taped ${opts.cls ?? ""}`.trim(), style: `--tilt:${tilt}deg` },
    h("span", { class: "bp-tape bp-tape--a", style: `clip-path:${tapeClip(rng)}`, "aria-hidden": "true" }),
    h("span", { class: "bp-tape bp-tape--b", style: `clip-path:${tapeClip(rng)}`, "aria-hidden": "true" }),
    h("span", { class: "bp-taped__frame" }, media),
  );
  if (opts.caption) fig.append(h("figcaption", null, opts.caption));
  return fig;
}

// ---- the cover --------------------------------------------------------------------

/** The name label on a book's cover: which book in the pile it is, its title,
 * and the name, subject and class written in. */
function label(content: SiteContent, copy: Copy, key: BookKey) {
  const words = copy.cover;
  const book = copy.books[key];
  const [first, second] = book.title;
  return h(
    "div",
    { class: "bp-label" },
    h("p", { class: "bp-label__school" }, fill(words.series, { n: BOOKS.findIndex((b) => b.key === key) + 1 })),
    h(
      "p",
      { class: "bp-label__title", "aria-hidden": "true" },
      h("span", { class: "bp-blue" }, first),
      h("span", { class: "bp-red" }, second),
    ),
    h(
      "p",
      { class: "bp-label__field" },
      h("span", null, words.name),
      h("b", null, content.site.name),
    ),
    h(
      "p",
      { class: "bp-label__field" },
      h("span", null, words.subject),
      h("b", null, key === "home" ? content.pages.home.hero.occupation : book.aside),
    ),
    h(
      "p",
      { class: "bp-label__field" },
      h("span", null, words.class),
      h("b", null, book.klass),
    ),
  );
}

function returnTo(content: SiteContent, copy: Copy) {
  const socials = content.site.social.filter((s) => !s.href.startsWith("mailto:"));
  return h(
    "div",
    { class: "bp-return" },
    h(
      "p",
      null,
      `${copy.cover.returnTo} `,
      h("a", { href: `mailto:${content.site.email}` }, content.site.email),
    ),
    h(
      "p",
      { class: "bp-return__socials" },
      ...socials.flatMap((s, i) => [
        i ? " · " : "",
        link(s.href, copy.newTab, s.label),
      ]),
    ),
  );
}

/** The outside of the book: the name label on brown paper. On a phone the
 * first book's cover is also where the return address is written, since it
 * has no inside cover to show. */
export function coverPage(b: Build, withReturn: boolean, key: BookKey = "home") {
  const { page, flow } = blankPage(b.copy, "cover", "kraft");
  page.dataset.book = key;
  flow.append(label(b.content, b.copy, key));
  if (withReturn) flow.append(returnTo(b.content, b.copy));
  flow.append(svg(coverDoodle(key)));
  return page;
}

function coverDoodle(key: string) {
  const rng = seed(`cover-${key}`);
  return `<svg class="bp-cover-doodle" viewBox="0 0 200 120" aria-hidden="true">${flick(40, 90, 150, 30, BLUE, rng, 0.2)}${flick(150, 30, 60, 100, RED, rng, 0.3)}${camp({ cx: 40, cy: 90, r: 16, ink: BLUE, enemy: RED, dots: 5, hits: 1, rng })}${camp({ cx: 150, cy: 30, r: 16, ink: RED, enemy: BLUE, dots: 6, hits: 2, rng })}</svg>`;
}

/** The inside of the front cover: whose book it is, a war fought there when
 * it was new, and who to return it to. The books themselves are the way
 * round: each lies on the pile with its own label. */
function insideCover(b: Build) {
  const { page, flow } = blankPage(b.copy, "inside-cover", "kraft-in");
  flow.append(
    h(
      "p",
      { class: "bp-belongs" },
      `${b.copy.cover.belongs} `,
      h("b", null, b.content.site.name),
    ),
    svg(coverDoodle("inside")),
    returnTo(b.content, b.copy),
  );
  return page;
}

// ---- home: hello, the diary, the camps worth a look -------------------------------

function home(b: Build): HTMLElement[] {
  const { content, copy } = b;
  const page = content.pages.home;
  const { hero, currently, updates, work } = page;
  const [first, ...rest] = hero.headline.split(" ");

  const title = h(
    "h1",
    { class: "bp-h1 bp-hello__title", tabindex: "-1", ...part("page.title", "home") },
    first + " ",
    h("span", { class: "bp-red" }, rest.join(" ")),
  );
  const photo = taped(hero.portrait.src, hero.portrait.alt, "portrait", { cls: "bp-portrait" });
  markPart(photo, "home.portrait");
  photo.append(
    h("figcaption", null, h("a", { href: hero.portrait.href }, `${jotted(hero.portrait.caption)} →`)),
  );

  const hello: HTMLElement[] = [
    h(
      "div",
      { class: "bp-hello__top" },
      photo,
      h("p", { class: "bp-greeting", ...part("home.greeting") }, hero.greeting),
      title,
    ),
    h("p", { class: "bp-typed-line", ...part("home.occupation") }, hero.occupation),
    h("p", { class: "bp-lead", ...part("home.welcome") }, hero.welcome),
    h(
      "aside",
      { class: "bp-note", "aria-label": currently.title, ...part("home.currently") },
      h("b", null, `${currently.title}: `),
      inline(currently.body),
    ),
  ];

  // the diary: dated lines, newest first
  const diary = h("ol", { class: "bp-diary", "aria-label": updates.listLabel });
  for (const u of content.updates) {
    diary.append(
      h(
        "li",
        { "data-kind": u.kind, ...part("update.item", u.id) },
        h("time", { class: "bp-mnote", datetime: u.date }, shortDate(u.date, copy.months)),
        h("p", { class: "bp-diary__title" }, link(u.href, copy.newTab, u.title)),
        h("p", { class: "bp-diary__summary" }, u.summary),
        h("p", { class: "bp-diary__src" }, `${u.sourceLabel} · ${u.kindLabel}`),
      ),
    );
  }
  const diaryHead = h(
    "div",
    { class: "bp-sechead", "data-bp-keep": "" },
    withUnderline(h("h2", { class: "bp-h2" }, updates.title), RED, "diary"),
    h("p", { class: "bp-sub" }, jotted(updates.intro)),
    svg(tally(content.updates.length, RED, seed("tally"))),
  );

  // selected work, taped in
  const snaps = h("ul", { class: "bp-snaps" });
  featured(content).forEach((p) => {
    const size: { width?: number; height?: number } =
      p.media.find((m) => m.src === p.cover) ?? {};
    const ratio = size.width && size.height ? size.width / size.height : 4 / 3;
    snaps.append(
      h(
        "li",
        null,
        p.cover ? taped(p.cover, "", `snap-${p.slug}`, { ratio }) : null,
        h("a", { href: p.href, class: "bp-snaps__title", ...part("project.title", p.slug) }, p.title),
        h("span", { class: "bp-snaps__meta" }, p.dateLabel),
      ),
    );
  });
  const workHead = h(
    "div",
    { class: "bp-sechead", "data-bp-keep": "" },
    withUnderline(h("h2", { class: "bp-h2" }, work.title), BLUE, "work"),
  );
  const toWar = h(
    "p",
    { class: "bp-arrowlink" },
    h("a", { href: work.link.href }, `${copy.home.toProjects} →`),
  );

  const cover = b.spread ? insideCover(b) : coverPage(b, true);
  const pages = written(
    b,
    "home",
    "squared",
    [...hello, diaryHead, diary, workHead, snaps, toWar],
    firstPage(b),
    b.today,
    1,
  );
  return [cover, ...pages];
}

// ---- about: a note-taker's notebook ------------------------------------------------

/** The about page as study notes: a subject tab, the title in brush pen over
 * a highlighter swipe, the intro boxed as the key fact, a small taped photo,
 * a sticky note pointing to the resume stapled in at the back, then the body
 * as numbered headings, bullets and boxed callouts (studynotes.ts). */
function aboutPages(b: Build) {
  const { header, html } = b.content.pages.about;
  const { portrait } = b.content.pages.home.hero;
  const words = b.copy.about;
  const [action] = header.actions;

  const photo = taped(portrait.src, portrait.alt, "about-photo", { cls: "bp-notephoto", caption: jotted(portrait.caption) });
  const title = h1("", part("page.title", "about"));
  title.classList.add("bp-brush");
  title.append(h("span", { class: "bp-hl" }, header.title));
  const head = h(
    "header",
    { class: "bp-noteshead" },
    photo,
    header.eyebrow ? h("p", { class: "bp-ntab", ...part("page.eyebrow", "about") }, header.eyebrow) : null,
    title,
  );
  const blocks: HTMLElement[] = [head];
  if (header.intro)
    blocks.push(
      h(
        "div",
        { class: "bp-keybox" },
        h("span", { class: "bp-keybox__tag" }, words.inShort),
        h("p", part("page.intro", "about"), header.intro),
      ),
    );
  const sticky = action
    ? h(
        "a",
        { class: "bp-sticky", href: action.href, ...part("page.actions", "about") },
        h("span", { class: "bp-sticky__label" }, `${action.label} →`),
        h("small", { class: "bp-sticky__where" }),
      )
    : null;
  if (sticky) blocks.push(sticky);
  blocks.push(...studyNotes(html, "page.body", "about"));
  const notes = written(b, "about", "notes", blocks, firstPage(b), b.today);
  // a doodle in the margin where the notes stop, the kind drawn while thinking
  notes[notes.length - 1]?.append(h("div", { class: "bp-notedoodle", "aria-hidden": "true" }, svg(doodle(2, seed("about-end")))));
  return { pages: evenUp(b.copy, notes, b.spread, "/about"), sticky };
}

function about(b: Build) {
  const { pages, sticky } = aboutPages(b);
  const first = firstPage(b);
  // the sticky says where the resume starts: right after these pages
  const where = sticky && pages.flatMap((p) => [...p.querySelectorAll<HTMLElement>(".bp-sticky__where")]);
  if (where && first !== null) for (const el of where) el.textContent = fill(b.copy.about.stapled, { n: first + pages.length });
  return pages;
}

// ---- resume: slips stapled into the about book ---------------------------------------

/** The paper each slip is cut from, in turn: a ruled index card written by
 * hand, a typed half-sheet, a till receipt. */
const STOCKS = ["index", "typed", "receipt"] as const;
type Stock = (typeof STOCKS)[number] | "letterhead" | "manila" | "scrap";

/** A slip of paper stapled onto the page: its own stock, a slight turn, and
 * one or two staples through its top. */
function slip(stock: Stock, key: string, mark: ReturnType<typeof part> | null, ...kids: (Node | null)[]) {
  const rng = seed(key);
  const tilt = ((rng() - 0.5) * 2.6).toFixed(2);
  const staples = stock === "typed" || stock === "letterhead" ? 2 : 1;
  const at = staples === 2 ? [22 + rng() * 6, 72 + rng() * 6] : [38 + rng() * 24];
  return h(
    "div",
    {
      class: "bp-slip",
      "data-stock": stock,
      style: `--tilt:${tilt}deg;--ox:${at[0].toFixed(0)}%`,
      ...mark,
    },
    ...at.map((x) =>
      h("i", {
        class: "bp-staple",
        "aria-hidden": "true",
        style: `left:${x.toFixed(0)}%;--st:${((rng() - 0.5) * 14).toFixed(1)}deg`,
      }),
    ),
    ...kids,
  );
}

/** One role or course, on its slip. */
function entrySlip(entry: SiteContent["resume"]["experience"]["roles"][number], stock: Stock, name: "resume.role" | "resume.education") {
  return slip(
    stock,
    entry.id,
    part(name, entry.id),
    h("h3", { class: "bp-slip__title" }, entry.heading),
    entry.dateLine ? h("p", { class: "bp-slip__date" }, entry.dateLine) : null,
    entry.summary ? h("p", null, inline(entry.summary)) : null,
    entry.bullets.length ? h("ul", null, ...entry.bullets.map((bullet) => h("li", null, inline(bullet)))) : null,
  );
}

/** A heading written on the notebook page, above a run of slips. */
const stapledHead = (title: string) => h("h2", { class: "bp-stapledhead" }, title);

function resume(b: Build) {
  const { content, copy } = b;
  const { header, html } = content.pages.resume;
  const { resume } = content;
  const head = slip(
    "letterhead",
    "letterhead",
    null,
    h1(header.title, part("page.title", "resume")),
    header.intro ? h("p", { class: "bp-slip__intro", ...part("page.intro", "resume") }, header.intro) : null,
    header.actions.length
      ? h(
          "p",
          { class: "bp-slip__contact", ...part("page.actions", "resume") },
          ...header.actions.flatMap((a, i) => [i ? " · " : "", link(a.href, copy.newTab, a.label)]),
        )
      : null,
  );
  const blocks: HTMLElement[] = [head];
  if (resume.experience.roles.length) {
    blocks.push(stapledHead(resume.experience.title));
    resume.experience.roles.forEach((role, i) => blocks.push(entrySlip(role, STOCKS[i % STOCKS.length], "resume.role")));
  }
  if (resume.education.entries.length) {
    blocks.push(stapledHead(resume.education.title));
    resume.education.entries.forEach((entry) => blocks.push(entrySlip(entry, "manila", "resume.education")));
  }
  if (resume.tools.items.length) {
    blocks.push(
      stapledHead(resume.tools.title),
      slip(
        "scrap",
        "tools",
        part("resume.tools"),
        h("ul", { class: "bp-circled", "aria-label": resume.tools.title }, ...resume.tools.items.map((t) => h("li", null, t))),
      ),
    );
  }
  blocks.push(...studyNotes(html, "page.body", "resume"));
  return written(b, "resume", "notes", blocks, resumeStart(b), b.today);
}

/** The resume's first page: the next after the notes, however many pages
 * the notes run to at this size. */
function resumeStart(b: Build) {
  const notes = b.order.find((stop) => stop.key === "/about");
  if (!notes) return firstPage(b);
  const route: Route = { ...b.route, kind: "about", path: notes.href };
  return notes.page + aboutPages({ ...b, route }).pages.length;
}

// ---- the lab: doodles in the margin ----------------------------------------------------

function labCard(b: Build, item: LabItem, i: number) {
  const rng = seed(item.slug);
  return h(
    "article",
    { class: "bp-labitem", "data-side": i % 2 ? "right" : "left" },
    svg(doodle(i, rng)),
    h("h2", { class: "bp-h2", ...part("lab.title", item.slug) }, link(item.detail, b.copy.newTab, item.title)),
    h("p", { ...part("lab.summary", item.slug) }, item.summary),
    h("p", { class: "bp-labitem__meta", ...part("lab.meta", item.slug) }, `${item.type} · ${item.sourceEra}`),
  );
}

function lab(b: Build) {
  const page = b.content.pages.lab;
  const { header } = page;
  const blocks: HTMLElement[] = [
    h(
      "header",
      { class: "bp-entryhead" },
      h(
        "p",
        { class: "bp-eyebrow", ...part("page.eyebrow", "lab") },
        fill(b.copy.lab.eyebrow, { eyebrow: header.eyebrow ?? page.title }),
      ),
      withUnderline(h1(header.title, part("page.title", "lab")), RED, "lab-title"),
      header.intro ? h("p", { class: "bp-lead", ...part("page.intro", "lab") }, header.intro) : null,
    ),
    ...b.content.lab.map((item, i) => labCard(b, item, i)),
  ];
  return written(b, "lab", "squared", blocks, firstPage(b), null);
}

function labEntry(b: Build): HTMLElement[] | null {
  const { route, content, copy } = b;
  const item = content.lab.find((l) => l.slug === route.slug && l.hasPage);
  if (!item) return null;
  const { detail } = content.pages.lab;
  const i = content.lab.indexOf(item);
  const links = item.href
    ? [{ label: fill(copy.lab.tryIt, { era: item.sourceEra }), url: item.href }, ...item.links]
    : item.links;
  const blocks: HTMLElement[] = [
    h(
      "header",
      { class: "bp-entryhead" },
      h("p", { class: "bp-eyebrow" }, detail.eyebrow),
      withUnderline(h1(item.title, part("lab.title", item.slug)), RED, `lab-${item.slug}`),
      h("p", { class: "bp-lead", ...part("lab.summary", item.slug) }, item.summary),
    ),
    h("div", { class: "bp-bigdoodle" }, svg(doodle(i, seed(item.slug)))),
    fields(
      [
        [detail.labels.type, item.type],
        [detail.labels.era, item.sourceEra],
      ],
      part("lab.meta", item.slug),
    ),
    arrows(b, links, part("lab.links", item.slug)),
    ...prose(item.html, "lab.body", item.slug),
  ];
  return written(b, "lab-entry", "squared", blocks, firstPage(b), null);
}

// ---- writing: essays in the same hand, fetched only when opened ---------------------

function writing(b: Build) {
  const { content } = b;
  const { header, copy: words } = content.pages.writing;
  const opening = h(
    "header",
    { class: "bp-entryhead" },
    header.eyebrow
      ? h(
          "p",
          { class: "bp-eyebrow", ...part("page.eyebrow", "writing") },
          header.eyebrow,
        )
      : null,
    withUnderline(
      h1(header.title, part("page.title", "writing")),
      RED,
      "writing-title",
    ),
    header.intro
      ? h(
          "p",
          { class: "bp-lead", ...part("page.intro", "writing") },
          header.intro,
        )
      : null,
    arrows(
      b,
      header.actions.map((action) => ({
        label: action.label,
        url: action.href,
      })),
      part("page.actions", "writing"),
    ),
  );
  const list = h("ol", {
    class: "bp-writing-list",
    "aria-label": words.listLabel,
  });
  for (const post of content.writing.posts) {
    list.append(
      h(
        "li",
        null,
        h(
          "time",
          {
            class: "bp-writing-date",
            datetime: post.date,
            ...part("writing.meta", post.slug),
          },
          post.dateLabel,
        ),
        h(
          "h2",
          { class: "bp-h2", ...part("writing.title", post.slug) },
          h("a", { href: post.href }, post.title),
        ),
        h(
          "p",
          {
            class: "bp-writing-summary",
            ...part("writing.summary", post.slug),
          },
          post.subtitle || post.description,
        ),
      ),
    );
  }
  const status =
    content.writing.status === "unavailable"
      ? words.unavailableMessage
      : content.writing.posts.length === 0
        ? words.emptyMessage
        : null;
  const body = status
    ? h("p", { class: "bp-note", role: "status" }, status)
    : list;
  return written(b, "writing", "squared", [opening, body], firstPage(b), null);
}

function writingEntry(b: Build) {
  const { content, route } = b;
  const { header, copy: words } = content.pages.writing;
  // The runtime replaces this one entry for the requested route. Never use a
  // previous essay's body, and never read the server page to fill in a gap.
  const entry =
    content.writing.entry?.slug === route.slug
      ? content.writing.entry
      : undefined;
  const post =
    entry ?? content.writing.posts.find((item) => item.slug === route.slug);
  const ref = route.slug ?? "";
  const available = !!entry && content.writing.entryStatus === "available";
  const opening = h(
    "header",
    { class: "bp-entryhead bp-writing-head" },
    header.eyebrow ? h("p", { class: "bp-eyebrow" }, header.eyebrow) : null,
    withUnderline(
      h1(
        available ? entry!.title : header.title,
        available ? part("writing.title", ref) : part("page.title", "writing"),
      ),
      RED,
      `writing-${ref}`,
      true,
    ),
    !available && post
      ? h("h2", { class: "bp-h2", ...part("writing.title", ref) }, post.title)
      : null,
    post?.subtitle
      ? h(
          "p",
          { class: "bp-lead", ...part("writing.subtitle", ref) },
          post.subtitle,
        )
      : null,
    post
      ? h(
          "p",
          { class: "bp-writing-origin" },
          h(
            "time",
            { datetime: post.date, ...part("writing.meta", ref) },
            post.dateLabel,
          ),
          " · ",
          markPart(
            link(post.canonical, b.copy.newTab, words.originLabel),
            "writing.links",
            ref,
          ),
        )
      : null,
  );
  const body = available
    ? prose(entry!.html, "writing.body", ref)
    : [
        h(
          "p",
          { class: "bp-note", role: "status" },
          content.writing.entryStatus === "missing"
            ? words.entryMissingMessage
            : words.entryUnavailableMessage,
        ),
      ];
  const ending = h(
    "aside",
    { class: "bp-note bp-writing-end", ...part("writing.end", ref) },
    h("h2", { class: "bp-h2" }, words.endHeading),
    h("p", null, words.endBody),
    arrows(
      b,
      [
        {
          label: words.subscribeLabel,
          url: `${content.site.writingUrl}/subscribe`,
        },
        {
          label: post ? words.originLabel : words.sourceLabel,
          url: post?.canonical ?? content.site.writingUrl,
        },
      ],
      part("writing.links", ref),
    ),
  );
  const back = h(
    "p",
    { class: "bp-arrowlink", ...part("writing.links", ref) },
    h("a", { href: "/writing" }, `← ${words.backLabel}`),
  );
  return written(
    b,
    "writing-entry",
    "squared",
    [opening, ...body, ending, back],
    firstPage(b),
    post?.dateLabel ?? null,
  );
}

// ---- a project: its own page, the screenshot taped in -------------------------------

function fields(rows: [string, string][], mark: ReturnType<typeof part>) {
  return h(
    "dl",
    { class: "bp-fields", ...mark },
    ...rows
      .filter(([, v]) => v)
      .map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v))),
  );
}

function arrows(b: Build, links: { label: string; url: string }[], mark: ReturnType<typeof part>) {
  if (!links.length) return h("span", { hidden: true });
  return h(
    "ul",
    { class: "bp-arrows", ...mark },
    ...links.map((l) => h("li", null, link(l.url, b.copy.newTab, l.label))),
  );
}

function project(b: Build): HTMLElement[] | null {
  const { route, content, copy } = b;
  const p = content.projects.find((x) => x.slug === route.slug);
  if (!p) return null;
  const { detail } = content.pages.projects;
  const archive = p.status === "archive";
  const ink = archive ? RED : BLUE;

  const head = h(
    "header",
    { class: "bp-entryhead", "data-ink": archive ? "red" : "blue" },
    h("p", { class: "bp-eyebrow" }, `${p.kind} · ${archive ? copy.project.archive : copy.project.selected}`),
    withUnderline(h1(p.title, part("project.title", p.slug)), archive ? BLUE : RED, `title-${p.slug}`, true),
    h("p", { class: "bp-lead", ...part("project.summary", p.slug) }, p.summary),
  );
  const blocks: HTMLElement[] = [
    head,
    fields(
      [
        [detail.labels.role, p.role],
        [detail.labels.location, p.location],
        [detail.labels.date, p.dateLabel],
      ],
      part("project.meta", p.slug),
    ),
    p.tools.length
      ? h(
          "ul",
          { class: "bp-circled", "aria-label": fill(copy.project.tools, { title: p.title }), ...part("project.tools", p.slug) },
          ...p.tools.map((t) => h("li", null, t)),
        )
      : h("span", { hidden: true }),
    arrows(b, p.links, part("project.links", p.slug)),
  ];
  p.media.forEach((m, n) => {
    const fig = taped(m.src, m.alt ?? "", `${p.slug}-${n}`, {
      caption: m.caption ?? m.alt,
      ratio: m.width && m.height ? m.width / m.height : 16 / 10,
      video: m.type === "video",
    });
    markPart(fig, "project.media", p.slug);
    if (n === 0) fig.dataset.bpBreak = "right";
    blocks.push(fig);
  });
  blocks.push(...prose(p.html, "project.body", p.slug));
  blocks.push(
    h("p", { class: "bp-arrowlink" }, h("a", { href: detail.back.href }, `← ${copy.project.back}`)),
  );
  const pages = written(b, "project", "squared", blocks, firstPage(b), p.dateLabel);
  // this project's camp, from the map, drawn in the corner of its first page
  const first = pages[0];
  if (first) {
    const rng = seed(p.slug);
    const art = svg(
      `<svg class="bp-owncamp" viewBox="0 0 120 120" aria-hidden="true">${camp({ cx: 60, cy: 60, r: 44, ink, enemy: archive ? BLUE : RED, dots: campDots(p), hits: campHits(content, p), rng })}</svg>`,
    );
    first.append(art);
  }
  return pages;
}

const campDots = (p: Project) => Math.min(11, 5 + p.links.length + p.media.length);
/** Older camps have taken more hits: a year each since, up to five. */
const campHits = (content: SiteContent, p: Project) =>
  Math.max(0, Math.min(5, content.derived.lastYear - p.year));

// ---- projects: the war on the back page ------------------------------------------------

function warMap(b: Build, w: number, hgt: number, wide: boolean) {
  const { content, copy } = b;
  const projects = content.projects;
  const years = [...new Set(projects.map((p) => p.year))].sort((a, b) => b - a);
  const r = Math.max(20, Math.min(40, Math.min(w, hgt) * 0.074));
  const top = r + 40;
  const bottom = hgt - r - 64;
  const rowY = (i: number) => (years.length < 2 ? top : top + ((bottom - top) * i) / (years.length - 1));
  const rng = seed("war");
  const spots = new Map<string, { x: number; y: number }>();
  years.forEach((year, row) => {
    const here = projects.filter((p) => p.year === year);
    here.forEach((p, k) => {
      const lanes =
        here.length === 1
          ? [row % 2 ? 0.66 : 0.34]
          : here.length === 2
            ? wide ? [0.25, 0.75] : [0.29, 0.71]
            : here.map((_, n) => 0.18 + (0.64 * n) / (here.length - 1));
      const x = w * lanes[k] + (rng() - 0.5) * w * 0.06;
      const y = rowY(row) + (rng() - 0.5) * r * 0.5;
      spots.set(p.slug, { x, y });
    });
  });

  const ink = (p: Project) => (p.status === "archive" ? RED : BLUE);
  const foe = (p: Project) => (p.status === "archive" ? BLUE : RED);
  // flicks: each camp fires at the next one made after it, and the pen runs
  // on; then the war proper, blue at red and red at blue, a few gone wild
  const chrono = [...projects].reverse();
  let lines = "";
  chrono.forEach((p, n) => {
    const from = spots.get(p.slug)!;
    const next = chrono[n + 1];
    if (next) {
      const to = spots.get(next.slug)!;
      lines += flick(from.x, from.y, to.x, to.y, ink(p), rng, 0.3);
    }
    const foes = projects.filter((q) => ink(q) !== ink(p));
    const targets = foes.length ? foes : projects.filter((q) => q !== p);
    for (let k = 0; k < 2; k++) {
      const t = spots.get(targets[Math.floor(rng() * targets.length)].slug)!;
      const miss = r * (0.2 + rng() * 1.4);
      const a = rng() * Math.PI * 2;
      lines += flick(from.x, from.y, t.x + Math.cos(a) * miss, t.y + Math.sin(a) * miss, ink(p), rng, 0.15 + rng() * 0.9);
    }
    const stray = rng() * Math.PI * 2;
    lines += flick(from.x, from.y, from.x + Math.cos(stray) * w * 0.5, from.y + Math.sin(stray) * hgt * 0.4, ink(p), rng, 0.6);
  });
  let rings = "";
  for (const p of projects) {
    const { x, y } = spots.get(p.slug)!;
    rings += camp({ cx: x, cy: y, r, ink: ink(p), enemy: foe(p), dots: campDots(p), hits: campHits(content, p), rng: seed(p.slug), id: p.slug });
  }
  const box = h("div", {
    class: "bp-map",
    style: `height:${Math.floor(hgt)}px;--r:${r.toFixed(1)}px;--lw:${(w * 0.44).toFixed(0)}px`,
  });
  box.append(
    svg(
      `<svg class="bp-map__ink" viewBox="0 0 ${w.toFixed(0)} ${hgt.toFixed(0)}" width="${w.toFixed(0)}" height="${hgt.toFixed(0)}" aria-hidden="true">${lines}${rings}</svg>`,
    ),
  );
  const list = h("ul", { class: "bp-map__camps", "aria-label": copy.projects.map });
  for (const p of projects) {
    const { x, y } = spots.get(p.slug)!;
    list.append(
      h(
        "li",
        { style: `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px`, "data-ink": p.status === "archive" ? "red" : "blue" },
        h(
          "a",
          { href: p.href, class: "bp-camp", "data-slug": p.slug },
          h("span", { class: "bp-camp__name" }, p.title),
          h("span", { class: "bp-sr" }, `, ${p.year}`),
        ),
      ),
    );
  }
  box.append(list);
  years.forEach((year, row) =>
    box.append(
      h(
        "span",
        { class: "bp-mnote bp-map__year", style: `top:${rowY(row).toFixed(1)}px`, "aria-hidden": "true" },
        `'${String(year).slice(2)}`,
      ),
    ),
  );
  box.append(
    h(
      "p",
      { class: "bp-map__legend" },
      h("span", { class: "bp-blue" }, `● ${copy.projects.selected}`),
      h("span", { class: "bp-red" }, `● ${copy.projects.archive}`),
    ),
  );
  return box;
}

function projects(b: Build) {
  const { content, stage, copy } = b;
  const page = content.pages.projects;
  const { header } = page;
  const words = copy.projects;
  const head = h(
    "header",
    { class: "bp-entryhead" },
    h(
      "p",
      { class: "bp-eyebrow", ...part("page.eyebrow", "projects") },
      fill(words.eyebrow, { eyebrow: header.eyebrow ?? page.title }),
    ),
    withUnderline(h1(header.title, part("page.title", "projects")), RED, "projects-title"),
    header.intro ? h("p", { class: "bp-lead", ...part("page.intro", "projects") }, header.intro) : null,
  );
  const roster = h("ol", { class: "bp-roster", "aria-label": page.listLabel });
  for (const p of content.projects) {
    roster.append(
      h(
        "li",
        { "data-ink": p.status === "archive" ? "red" : "blue" },
        h("span", { class: "bp-mnote", "aria-hidden": "true" }, `'${String(p.year).slice(2)}`),
        h("a", { href: p.href, ...part("project.title", p.slug) }, p.title),
        h("span", { class: "bp-roster__meta" }, ` ${p.dateLabel}${p.kind === "Arcade" ? ` · ${p.kind.toLowerCase()}` : ""}`),
      ),
    );
  }
  const rosterHead = withUnderline(h("h2", { class: "bp-h2" }, words.roll), BLUE, "roll");

  // measure the page the map goes on: all of it
  const probe = blankPage(copy, "projects", "squared", String(firstPage(b)), null);
  stage.append(probe.page);
  const w = probe.flow.clientWidth - parseFloat(getComputedStyle(probe.flow).paddingLeft);
  const room = probe.flow.clientHeight;
  probe.page.remove();
  const map = warMap(b, w, Math.max(320, room - 4), b.spread);
  map.dataset.bpBreak = "right";
  const blocks = [head, rosterHead, roster, map];
  const pages = written(b, "projects", "squared", blocks, firstPage(b), words.date);
  return pages;
}

// ---- writings: a fresh book, barely used ----------------------------------------------

/** The fifth book, kept for Burooj's writing. Writing isn't in the content
 * yet (it arrives with /writing), so the book has no route of its own: it
 * opens from the pile on a first page with its name, the writing's own
 * blurb from the home page's Elsewhere list, and the way out to it; the rest
 * of the book is blank. */
export function writingChapter(b: Build): Chapter {
  const { content, copy } = b;
  const url = content.site.writingUrl;
  const blurb = content.pages.home.elsewhere.items.find((item) => item.href === url)?.blurb;
  const { page, flow } = blankPage(copy, "writing", "notes", "1", b.today);
  const title = h1("");
  title.classList.add("bp-brush");
  title.append(h("span", { class: "bp-hl" }, copy.books.writing.name));
  flow.append(
    title,
    blurb ? h("p", { class: "bp-lead" }, blurb) : h("span", { hidden: true }),
    h("p", { class: "bp-arrowlink bp-writing__out" }, link(url, copy.newTab, `${copy.writing.link} ↗`)),
    h("p", { class: "bp-writing__blank" }, copy.writing.blank),
  );
  const pages = [page];
  if (b.spread) pages.push(blankPage(copy, "writing", "notes", "2", null).page);
  return { key: "writing", book: "writing", rank: b.order.length + 1, label: copy.books.writing.name, pages };
}

// ---- anything else: a loose sheet, tucked in ------------------------------------------

function loose(b: Build) {
  const sheet = h("article", { class: "bp-loose" });
  sheet.append(
    h("p", { class: "bp-loose__tag", "aria-hidden": "true" }, b.copy.loose.tag),
    fallbackBody(b.route),
  );
  const heading = sheet.querySelector("h1");
  heading?.setAttribute("tabindex", "-1");
  return sheet;
}

// ---- assembling a chapter --------------------------------------------------------------

export function chapter(b: Build): Chapter {
  const { route, order } = b;
  const rank = rankOf(route, order);
  const label = order.find((s) => s.key === route.path)?.label
    ?? (route.kind === "writing-entry"
      ? b.content.pages.writing.header.title
      : route.title.split("|")[0].trim());
  let pages: HTMLElement[] | null = null;
  switch (route.kind) {
    case "home":
      pages = home(b);
      break;
    case "about":
      pages = about(b);
      break;
    case "resume":
      pages = resume(b);
      break;
    case "lab":
      pages = lab(b);
      break;
    case "lab-entry":
      pages = labEntry(b);
      break;
    case "writing":
      pages = writing(b);
      break;
    case "writing-entry":
      pages = writingEntry(b);
      break;
    case "project":
      pages = project(b);
      break;
    case "projects":
      pages = projects(b);
      break;
  }
  const book = bookOf(route) ?? "home";
  if (!pages) return { key: route.path, book, rank, label, pages: [], loose: loose(b) };
  return { key: route.path, book, rank, label, pages: evenUp(b.copy, pages, b.spread, route.path) };
}

export const today = (copy: Copy) => handDate(new Date(), copy.months);
