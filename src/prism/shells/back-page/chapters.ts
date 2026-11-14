/** Every route is a chapter in one of the exercise books on the desk: a run
 * of pages written in that book's pens. There's a book for each section,
 * each on its own paper (themes.ts): hello in the squared maths copy, study
 * notes in the quiet notebook with the resume stapled in after them, slip by
 * slip, the lab in the graph book (a bench of doodles, a shelf, and the
 * Labbook kept as dated lines), the war on blueprint, its map first
 * and a page for each project after, and the essays written out in a marbled
 * composition book, its contents first and each essay after.
 *
 * Every word comes from content: the portfolio and Daylight's copy from
 * `content`, the books' own handwriting from `content.lenses["back-page"]`. */
import {
  embedSrc,
  experimentUpdates,
  labbookAnchor,
  labbookMonths,
  labbookSubjects,
  monthCalendar,
  monthLabel,
  narrowedTo,
  narrowHref,
  penUser,
  relatedLinks,
  subjectsOf,
  type Artifact,
  type Narrowing,
  type Update as LabbookUpdate,
} from "../../../lib/labbook";
import { graduatedProject, labPlaces, labPrints } from "../../../lib/rules";
import { markPart, part, type Part } from "../../parts";
import { blocks, fallbackBody, featured, fill, inline } from "../rich";
import type { Route, SiteContent, WritingPost } from "../types";
import { h, handDate, link, shortDate, svg } from "./dom";
import {
  BLUE,
  DOODLES,
  RED,
  arrow,
  camp,
  doodle,
  face,
  fallen,
  flick,
  miniWar,
  ring,
  scribbledOut,
  seed,
  shading,
  strike,
  tally,
  tick,
  underline,
} from "./ink";
import { paginate, type Blank } from "./paginate";
import { studyNotes } from "./studynotes";
import { liveCard, snaps, stage, taped, told } from "./stuck";
import { BOOKS, type BookKey } from "./themes";
import { RESUME_PATH } from "../../routes";

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
  /** The composition book's contents, before the essays'. Essays are
   * given a fixed run each: their bodies load only when one is opened. */
  contents: 4,
  essay: 6,
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
  add("about", RESUME_PATH, names.resume, 1);
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
  page = 1;
  add("writing", "/writing", names.writing, ALLOWANCE.contents);
  content.writing.posts.forEach((post) => add("writing", post.href, post.title, ALLOWANCE.essay));
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
  /** Where the visitor is, path and query: the Labbook is narrowed by the
   * query, and its links to narrow it keep the rest. */
  at: string;
}

type Paper = "squared" | "kraft" | "kraft-in" | "notes" | "ruled";

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

// ---- the cover --------------------------------------------------------------------

/** The name label on a book's cover: which book in the pile it is (or what
 * kind, printed, for a book that says so), its title, and the name, subject
 * and class written in. */
function label(content: SiteContent, copy: Copy, key: BookKey) {
  const words = copy.cover;
  const book = copy.books[key];
  const [first, second] = book.title;
  const series = "series" in book ? book.series : fill(words.series, { n: BOOKS.findIndex((b) => b.key === key) + 1 });
  return h(
    "div",
    { class: "bp-label" },
    h("p", { class: "bp-label__school" }, series),
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
  // the maker's small print, at the foot of a bought book's cover
  const book = b.copy.books[key];
  if ("print" in book) flow.append(h("p", { class: "bp-cover-print", "aria-hidden": "true" }, book.print));
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

/** What a bored hand did to the printed times table, by [row, column]: the
 * sevens half shaded in while he learnt them, and marked hard; seven eights
 * guessed wrong, crossed out and put right in the margin, the printed answer
 * ringed in red; nine nines ringed;
 * ticks by the tables he knew; a hundred's noughts made eyes; and one
 * of Dawood's men crossed out by the 144 corner, from a war fought here
 * before. The two camps' places are where the war is now: Blue by the last
 * row, Red dug in behind 144, so their shots rule along its lines. */
const USED = {
  shade: { row: 7, cells: 6.5 },
  guess: { row: 7, col: 8, wrote: 54 },
  ringed: [9, 9],
  known: [1, 2, 5, 10],
  face: [10, 10],
  fallen: [12, 11],
  camps: { blue: 12, red: [12, 12] },
} as const;

/** The composition book's inside cover, printed as the bought ones are: a
 * times table and a few conversions in black on the grey board, and the
 * owner's name written in above them. It's been used: there are scribbles
 * on the table (`USED`) and the war in the margins is camped round it. The
 * printed matter and the scribbles are furniture, so they're kept from
 * screen readers; the name isn't. */
function compositionInsideCover(b: Build) {
  const { page, flow } = blankPage(b.copy, "inside-cover", "kraft-in");
  // the soldiers live on this inside cover (soldiers.ts reads its own lines for it)
  page.dataset.life = "times";
  const { insideCover: ic } = b.copy.writing;
  const rng = seed("composition-times");
  const n = Array.from({ length: 12 }, (_, i) => i + 1);
  const at = (cell: readonly number[], i: number, j: number) => cell[0] === i && cell[1] === j;
  const ink = (markup: string) => svg(markup);

  const rowHead = (i: number) => {
    const kids: Node[] = [document.createTextNode(String(i))];
    if ((USED.known as readonly number[]).includes(i)) kids.push(ink(tick(RED, rng)));
    if (i === USED.shade.row)
      kids.push(h("span", { class: "bp-times__note" }, ic.hard, ink(arrow(BLUE, rng))));
    if (i === USED.camps.blue) kids.push(h("i", { class: "bp-dugin", "data-dug-in": "blue" }));
    return h("th", { class: kids.length > 1 ? "bp-inked" : null }, kids);
  };

  const cell = (i: number, j: number) => {
    const printed = String(i * j);
    // the face's eyes are the hundred's noughts, so each gets its own pupil
    const kids: (Node | string)[] = at(USED.face, i, j)
      ? [printed.replace(/0/g, ""), ...[...printed.matchAll(/0/g)].map(() => h("span", { class: "bp-eye" }, "0"))]
      : [printed];
    const { shade, guess } = USED;
    if (i === shade.row && j === 1) {
      const s = ink(shading(shade.cells, rng));
      s.style.setProperty("--cells", String(shade.cells));
      kids.push(s);
    }
    // the slip: ringed in red where it's printed, put right in the margin
    if (i === guess.row && j === guess.col) kids.push(ink(ring(RED, rng)));
    if (i === guess.row && j === n.length)
      kids.push(
        h(
          "span",
          { class: "bp-times__guess" },
          h("span", { class: "bp-times__wrong" }, String(guess.wrote), ink(strike(BLUE, rng))),
          ` ${guess.row * guess.col}`,
        ),
      );
    if (at(USED.ringed, i, j)) kids.push(ink(ring(BLUE, rng)));
    if (at(USED.face, i, j)) kids.push(ink(face(BLUE, rng)));
    if (at(USED.fallen, i, j)) kids.push(ink(fallen(RED, BLUE, rng)));
    if (at(USED.camps.red, i, j)) kids.push(h("i", { class: "bp-dugin", "data-dug-in": "red" }));
    const cls = [i === j ? "bp-times__sq" : "", kids.length > 1 ? "bp-inked" : ""].join(" ").trim();
    return h("td", { class: cls || null }, kids);
  };

  const table = h(
    "table",
    { class: "bp-times", "data-rules": "" },
    h("caption", null, ic.tables),
    h("thead", null, h("tr", null, h("th", null, "×"), ...n.map((j) => h("th", null, String(j))))),
    h("tbody", null, ...n.map((i) => h("tr", null, rowHead(i), ...n.map((j) => cell(i, j))))),
  );
  const conversions: [string, string[]][] = [
    [ic.length, ["1 in = 2.54 cm", "1 ft = 0.305 m", "1 mi = 1.61 km"]],
    [ic.weight, ["1 oz = 28.35 g", "1 lb = 0.454 kg"]],
    [ic.volume, ["1 fl oz = 29.6 mL", "1 cup = 236.6 mL"]],
  ];
  const convs = h(
    "div",
    { class: "bp-convs" },
    h("p", { class: "bp-convs__title" }, ic.conversionHeader),
    ...conversions.map(([name, rows]) => h("dl", null, h("dt", null, name), ...rows.map((r) => h("dd", null, r)))),
    // and Dawood signed it, in his red
    h("span", { class: "bp-times__was" }, ic.was),
  );
  flow.append(
    h("p", { class: "bp-belongs" }, `${b.copy.cover.belongs} `, h("b", null, b.content.site.name)),
    h("div", { class: "bp-printed", "aria-hidden": "true" }, table, convs),
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

  // the diary: dated lines, newest first; an update with nowhere to go is
  // its title, not a link
  const diary = h("ol", { class: "bp-diary", "aria-label": updates.listLabel });
  for (const u of content.updates) {
    diary.append(
      h(
        "li",
        { "data-kind": u.kind, ...part("update.item", u.id) },
        h("time", { class: "bp-mnote", datetime: u.date }, shortDate(u.date, copy.months)),
        h("p", { class: "bp-diary__title" }, u.href ? link(u.href, copy.newTab, u.title) : u.title),
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

// ---- the lab: a bench, a shelf and a labbook ------------------------------------------

/** An experiment's name, linked to where it lives: its own page in this
 * book or, marked with an arrow out, somewhere else. */
const experimentLink = (b: Build, item: LabItem) =>
  link(
    item.detail,
    b.copy.newTab,
    item.title,
    item.hasPage ? null : h("span", { class: "bp-out", "aria-hidden": "true" }, " ↗"),
  );

/** The doodle each experiment is given: one picked by its name, and while
 * there are doodles to spare, one no other experiment has. */
function doodleKinds(lab: LabItem[]) {
  const kinds = new Map<string, number>();
  const used = new Set<number>();
  for (const { entries } of labPlaces(lab))
    for (const item of entries) {
      let kind = Math.floor(seed(`doodle-${item.slug}`)() * DOODLES);
      if (used.size < DOODLES) while (used.has(kind)) kind = (kind + 1) % DOODLES;
      used.add(kind);
      kinds.set(item.slug, kind);
    }
  return kinds;
}

/** A place in the lab, written across the page: what it's called, ruled
 * under, and a line about it. It stays with whatever comes under it, and
 * is where the contents' line for it turns to (`id`). */
function placeHead(
  words: { title: string; note?: string },
  key: string,
  place?: string,
  id?: string,
) {
  return h(
    "div",
    { class: "bp-sechead", id: id ?? null, "data-bp-keep": "", "data-lab-place": place ?? null },
    withUnderline(h("h2", { class: "bp-h2" }, words.title), RED, key),
    words.note ? h("p", { class: "bp-sub" }, jotted(words.note)) : null,
  );
}

/** What an experiment holds, and so how it lies on the Bench: something to
 * play where it lies, several pictures, one, or only words. */
type Holds = "play" | "prints" | "print" | "words";
function holds(item: LabItem): Holds {
  if (item.preview) return "play";
  const n = labPrints(item).length;
  return n > 1 ? "prints" : n ? "print" : "words";
}

/** The words for playing an experiment where it lies, by what it is. */
function playWords(b: Build, item: LabItem & { preview: NonNullable<LabItem["preview"]> }) {
  const words = b.content.pages.lab.preview;
  return {
    data: { frame: item.preview.frame },
    title: item.title,
    load: words.load[item.preview.kind],
    close: words.close,
    loading: words.loading,
    note: words.note,
    mark: part("lab.preview", item.slug),
  };
}

/** An experiment on the bench, as rough work lies: its name and what it
 * is, beside what it holds. Only words: a doodle in the margin. A
 * picture: the photo taped in; several: two or three of them fanned.
 * Something to play: its picture taped in across the page, with a sticky
 * note on it that starts it there. The one given pride of place is drawn
 * larger, starred, and ruled under twice. */
function benchEntry(b: Build, item: LabItem, i: number, kind: number) {
  const title = h("h3", { class: "bp-labitem__title", ...part("lab.title", item.slug) }, experimentLink(b, item));
  const holding = holds(item);
  return h(
    "article",
    {
      class: "bp-labitem",
      "data-side": i % 2 ? "right" : "left",
      "data-featured": !!item.featured,
      "data-holds": holding,
    },
    holding === "words"
      ? svg(doodle(kind, seed(item.slug)))
      : holding === "play"
      ? null
      : snaps(labPrints(item), `bench-${item.slug}`),
    item.featured ? withUnderline(title, RED, `lab-${item.slug}`, true) : title,
    h("p", { ...part("lab.summary", item.slug) }, item.summary),
    item.preview
      ? liveCard(
          { ...playWords(b, { ...item, preview: item.preview }), ratio: "16/10", poster: item.cover },
          `play-${item.slug}`,
        )
      : null,
  );
}

/** The shelf: a library card stapled in, a line for each experiment put
 * away, and beside a line whose experiment has a picture, the picture as
 * the library stamps it, in ink. A stamp that can be played is played in
 * its own square, pressed from the line under it. A long card runs on to
 * a second overleaf. */
function shelfCard(b: Build, entries: LabItem[], label: string) {
  return h(
    "ol",
    { class: "bp-shelfcard", "aria-label": label },
    ...entries.map((item) => {
      const cover = item.cover
        ? h("img", { src: item.cover, alt: "", loading: "lazy", decoding: "async" })
        : null;
      const play = item.preview
        ? stage(
            { ...playWords(b, { ...item, preview: item.preview }), ratio: "4/3" },
            "bp-stamp",
            cover,
          )
        : null;
      return h(
        "li",
        { "data-holds": play ? "play" : cover ? "stamp" : "words", "data-stage-room": play ? "" : null },
        play
          ? h("span", { class: "bp-stamp__room" }, play.room, play.status)
          : cover
          ? h("span", { class: "bp-stamp__room", "aria-hidden": "true" }, h("span", { class: "bp-stamp" }, cover))
          : null,
        h("h3", { class: "bp-shelfcard__title", ...part("lab.title", item.slug) }, experimentLink(b, item)),
        h("p", { ...part("lab.summary", item.slug) }, item.summary),
        play ? h("p", { class: "bp-shelfcard__play" }, play.button) : null,
      );
    }),
  );
}

/** What an update shows for itself, taped in. A picture, a film and a
 * sound are there to look at or play. A Pen or a demo is a blank card, or
 * its poster when this site keeps one, with the way to start it written
 * on: nothing is asked of another site until that is pressed (index.ts
 * makes the frame then), and the link under it always opens it where it
 * lives. */
function artifactFigure(b: Build, artifact: Artifact, key: string): HTMLElement | null {
  const { kind, src, alt } = artifact;
  const words = b.content.pages.lab.labbook.artifact;
  const poster = artifact.poster?.startsWith("/") ? artifact.poster : undefined;
  const ratio = 16 / 10;
  if (kind === "image" || kind === "video") {
    const fig = taped(src, alt, key, { ratio, video: kind === "video", cls: "bp-artifact" });
    fig.dataset.artifact = kind;
    if (poster) fig.querySelector("video")?.setAttribute("poster", poster);
    return fig;
  }
  if (kind === "sound") {
    const fig = taped(src, alt, key, {
      caption: alt,
      cls: "bp-artifact",
      framed: h("audio", { src, controls: true, preload: "none", "aria-label": alt }),
    });
    fig.dataset.artifact = kind;
    return fig;
  }
  const frame = embedSrc(artifact, penUser(b.content.site));
  if (!frame) return null;
  // where it lives: the Pen's own page, or the demo itself
  const home = kind === "pen" ? frame.replace("/embed/", "/pen/").split("?")[0] : src;
  const stage = h(
    "span",
    {
      class: "bp-ask",
      style: `aspect-ratio:${ratio}`,
      "data-block-stage": "",
      "data-artifact-frame": frame,
      "data-artifact-title": alt,
    },
    poster ? h("img", { src: poster, alt, loading: "lazy", decoding: "async" }) : null,
    h(
      "span",
      { class: "bp-ask__note", "data-stage-ask": "" },
      poster ? null : h("span", { class: "bp-ask__what" }, alt),
      h("a", { class: "bp-ask__load", href: home, "data-artifact-load": "" }, words.load[kind]),
      h("span", { class: "bp-ask__small" }, words.note),
    ),
  );
  const fig = taped(src, alt, key, { cls: "bp-artifact", framed: stage });
  fig.dataset.artifact = kind;
  fig.dataset.stageRoom = "";
  fig.append(h("figcaption", null, link(home, b.copy.newTab, `${words.open[kind]} ↗`)));
  return fig;
}

/** A run of updates as dated lines, the way the diary on the first page is
 * kept. An open update has its day in the margin, what happened (a link
 * when it has somewhere to go, text when it has not) and where it came
 * from; in the Labbook itself (`full`) it is also where a link to it would
 * land (its `id`), and it says what it is about and shows its artifact. A
 * redacted update is its day, the kind of work, and its line: a word it
 * shows written as a title is, and a scribble over each word it does not,
 * one for each bar of its shape, as long as the bar says, running on and
 * wrapping as a title does. Aloud, its words are read and each scribble
 * is said once. Only its shape and date are read, whatever else arrives
 * with it. */
function updateLines(b: Build, updates: LabbookUpdate[], label: string, full: boolean) {
  const { content, copy } = b;
  const words = content.pages.lab.labbook;
  const { updateKinds, updateSources } = content.site;
  const list = h("ol", { class: "bp-diary bp-log", "aria-label": label });
  for (const u of updates) {
    const when = h("time", { class: "bp-mnote", datetime: u.date }, shortDate(u.date, copy.months));
    const id = full ? labbookAnchor(u.id) : null;
    if (u.visibility !== "open") {
      const { work, parts } = u.shape;
      const rng = seed(`struck-${u.id}`);
      list.append(
        h(
          "li",
          { id, "data-redacted": "", ...part("update.redacted", u.id) },
          when,
          h(
            "p",
            { class: "bp-log__struck" },
            h("span", { class: "bp-sr" }, words.redacted.label),
            h(
              "span",
              { class: "bp-log__line", "data-redaction-line": "" },
              ...parts.flatMap((shown) => {
                if (typeof shown === "string")
                  return [h("span", { class: "bp-log__word", "data-redaction-word": "" }, shown), " "];
                const bar = Number(shown) || 1;
                const mark = h(
                  "span",
                  { "data-redaction-bar": "", style: `--len:${bar}` },
                  h("span", { class: "bp-sr" }, words.redacted.bar),
                );
                mark.append(svg(scribbledOut(bar, BLUE, rng)));
                return [mark, " "];
              }),
            ),
          ),
          h("p", { class: "bp-diary__src" }, words.redacted.works[work]),
        ),
      );
      continue;
    }
    const about = full ? relatedLinks(u, content) : [];
    list.append(
      h(
        "li",
        { id, "data-kind": u.kind, ...part("update.item", u.id) },
        when,
        h(
          "p",
          { class: "bp-diary__title" },
          u.href ? link(u.href, copy.newTab, u.title) : u.title,
        ),
        h("p", { class: "bp-diary__summary" }, u.summary),
        h(
          "p",
          { class: "bp-diary__src" },
          `${updateSources[u.source] ?? u.source} · ${updateKinds[u.kind] ?? u.kind}`,
        ),
        about.length
          ? h(
              "p",
              { class: "bp-log__about" },
              ...about.flatMap((to, i) => [
                i ? " · " : "",
                `${words.related[to.kind]}: `,
                link(to.href, copy.newTab, to.title),
              ]),
            )
          : null,
        full && u.artifact ? artifactFigure(b, u.artifact, `artifact-${u.id}`) : null,
      ),
    );
  }
  return list;
}

/** What the Labbook can be narrowed to, and what the address narrows it
 * to: one experiment or project it is about, or nothing. */
function narrowing(b: Build) {
  const { content } = b;
  const shown = { lab: content.lab, projects: content.projects };
  const subjects = labbookSubjects(content.labbook, shown);
  const asked = narrowedTo(new URL(b.at, "https://book.invalid").search);
  const subject = asked && subjects.find((s) => s.kind === asked.kind && s.slug === asked.slug);
  const updates = subject
    ? content.labbook.filter((u) =>
        subjectsOf(u, shown).some((s) => s.kind === subject.kind && s.slug === subject.slug),
      )
    : content.labbook;
  return { subjects, subject, updates };
}

/** Who the Labbook is about, as a tally chart ruled on the squares: a row
 * for each experiment and project, its name (the way to follow only it),
 * a stroke for each entry about it, and what it is. The one followed now
 * is ringed. */
function tallyChart(b: Build, subjects: ReturnType<typeof narrowing>["subjects"], on?: Narrowing) {
  const words = b.content.pages.lab.labbook;
  const said = (n: number) =>
    n === 1 ? words.narrow.count.one : words.narrow.count.other.replace("{count}", String(n));
  return [
    h("p", { class: "bp-tallies__label", "data-bp-keep": "" }, jotted(words.narrow.label)),
    h(
      "ul",
      { class: "bp-tallies", "aria-label": words.narrow.label },
      ...subjects.map((subject) => {
        const here = on?.kind === subject.kind && on.slug === subject.slug;
        return h(
          "li",
          { "data-here-subject": here },
          h(
            "a",
            {
              href: narrowHref(subject, b.at),
              "aria-current": here ? "true" : null,
              ...part("labbook.subject", `${subject.kind}:${subject.slug}`),
            },
            subject.title,
            h("span", { class: "bp-sr" }, `, ${said(subject.count)}`),
          ),
          svg(tally(subject.count, here ? RED : BLUE, seed(`tally-${subject.kind}-${subject.slug}`))),
          h("span", { class: "bp-tallies__kind" }, words.related[subject.kind]),
        );
      }),
    ),
  ];
}

/** A month of the Labbook headed the way a lesson is dated: its name,
 * ruled under twice, and beside it the month drawn as a calendar on the
 * squares, Monday first, a ring round each day written in. The calendar is
 * for the eye alone (the entries say it all) and links nowhere. */
function monthHead(month: string, updates: LabbookUpdate[]) {
  const { lead, days } = monthCalendar(month, updates);
  const rng = seed(`month-${month}`);
  return h(
    "div",
    { class: "bp-month", id: `labbook-${month}`, "data-bp-keep": "" },
    h(
      "span",
      { class: "bp-cal", "aria-hidden": "true", style: `--lead:${lead}` },
      ...days.map(({ day, updates: on }) =>
        h(
          "span",
          { "data-on": on.length > 0, style: on.length ? `--turn:${((rng() - 0.5) * 40).toFixed(0)}deg` : null },
          String(day),
        ),
      ),
    ),
    withUnderline(
      h("h3", { class: "bp-month__name", ...part("labbook.month", month) }, monthLabel(month)),
      RED,
      `month-${month}`,
      true,
    ),
  );
}

/** The contents, at the front of the book as an exercise book keeps them:
 * each place and each of the Labbook's latest months, with the page it
 * starts on, the numbers filled in once the pages are written. Following a
 * line turns to it. */
const CONTENTS_MONTHS = 6;
function contents(b: Build, rows: { id: string; label: string; sub?: boolean }[]) {
  return h(
    "nav",
    { class: "bp-contents", "aria-label": b.copy.lab.contents },
    h("p", { class: "bp-contents__title", "aria-hidden": "true" }, b.copy.lab.contents),
    h(
      "ol",
      null,
      ...rows.map((row) =>
        h(
          "li",
          { "data-sub": !!row.sub },
          h("a", { href: `#${row.id}`, "data-contents": row.id }, row.label),
          h("span", { class: "bp-contents__dots", "aria-hidden": "true" }),
          h("span", { class: "bp-contents__page" }),
        ),
      ),
    ),
  );
}

/** Write each contents line's page number, from the pages as written. */
function numberContents(b: Build, pages: HTMLElement[], first: number) {
  for (const a of pages.flatMap((page) => [...page.querySelectorAll<HTMLAnchorElement>("[data-contents]")])) {
    const at = pages.findIndex((page) => page.querySelector(`[id="${CSS.escape(a.dataset.contents!)}"]`));
    const cell = a.parentElement!.querySelector(".bp-contents__page")!;
    if (at < 0) {
      a.parentElement!.remove();
      continue;
    }
    cell.textContent = fill(b.copy.lab.page, { n: first + at });
  }
}

function lab(b: Build) {
  const { content } = b;
  const page = content.pages.lab;
  const { header, places, labbook } = page;
  const kept = narrowing(b);
  const months = labbookMonths(kept.updates);
  const groups = labPlaces(content.lab);
  const blocks: (HTMLElement | null)[] = [
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
    contents(b, [
      ...groups.map(({ place }) => ({ id: `lab-${place}`, label: places[place].title })),
      ...(content.labbook.length
        ? [
            { id: "labbook", label: labbook.title },
            ...months
              .slice(0, CONTENTS_MONTHS)
              .map(({ month }) => ({ id: `labbook-${month}`, label: monthLabel(month), sub: true })),
          ]
        : []),
    ]),
  ];
  const kinds = doodleKinds(content.lab);
  let n = 0;
  for (const { place, entries } of groups) {
    blocks.push(placeHead(places[place], `lab-${place}`, place, `lab-${place}`));
    if (place === "bench")
      for (const item of entries) blocks.push(benchEntry(b, item, n++, kinds.get(item.slug) ?? n));
    else blocks.push(shelfCard(b, entries, places[place].title));
  }
  if (content.labbook.length) {
    blocks.push(placeHead(labbook, "labbook", undefined, "labbook"));
    // narrowed, it says so first, where a link to narrow it lands
    if (kept.subject)
      blocks.push(
        h(
          "p",
          { class: "bp-narrowed" },
          `${labbook.narrow.showing} `,
          h("b", null, kept.subject.title),
          ". ",
          h("a", { href: narrowHref(undefined, b.at) }, labbook.narrow.all),
        ),
      );
    if (kept.subjects.length) blocks.push(...tallyChart(b, kept.subjects, kept.subject));
    for (const { month, updates } of months)
      blocks.push(monthHead(month, updates), updateLines(b, updates, monthLabel(month), true));
  }
  const first = firstPage(b) ?? 1;
  const pages = written(b, "lab", "squared", blocks.filter((el) => !!el), first, null);
  numberContents(b, pages, first);
  return pages;
}

/** An experiment's own pages, written up the way an exercise is: what it
 * is, the project it became (a sticky note pointing to it, ticked), what
 * it holds (its photos taped in, fanned when there are several; with none,
 * its doodle drawn large; its films taped in under them), where to try
 * it, how it was made (its words with each heading numbered in the margin,
 * and each of its blocks stuck in where the words place it), and its part
 * of the Labbook. */
function labEntry(b: Build): HTMLElement[] | null {
  const { route, content, copy } = b;
  const item = content.lab.find((l) => l.slug === route.slug && l.hasPage);
  if (!item) return null;
  const { detail } = content.pages.lab;
  const kind = doodleKinds(content.lab).get(item.slug) ?? 0;
  const links = item.href ? [{ label: copy.lab.tryIt, url: item.href }, ...item.links] : item.links;
  const became = graduatedProject(item, content.projects);
  const updates = experimentUpdates(content.labbook, item.slug);
  const prints = labPrints(item);
  const blocks: (HTMLElement | null)[] = [
    h(
      "header",
      { class: "bp-entryhead" },
      h("p", { class: "bp-eyebrow" }, detail.eyebrow),
      withUnderline(h1(item.title, part("lab.title", item.slug)), RED, `lab-${item.slug}`),
      h("p", { class: "bp-lead", ...part("lab.summary", item.slug) }, item.summary),
    ),
    became
      ? h(
          "a",
          { class: "bp-sticky bp-grad", href: became.href, ...part("lab.graduation", item.slug) },
          svg(tick(RED, seed(`grad-${item.slug}`))),
          h("small", { class: "bp-sticky__where" }, detail.labels.graduated),
          h("span", { class: "bp-sticky__label" }, `${became.title} →`),
        )
      : null,
    prints.length
      ? h("div", { class: "bp-labhead", "data-count": prints.length }, snaps(prints, `head-${item.slug}`))
      : h("div", { class: "bp-bigdoodle" }, svg(doodle(kind, seed(item.slug)))),
    ...item.media
      .filter((m) => m.type === "video")
      .map((m, n) => {
        const film = taped(m.src, m.alt ?? "", `film-${item.slug}-${n}`, {
          caption: m.caption ?? m.alt,
          ratio: m.width && m.height ? m.width / m.height : 16 / 10,
          video: true,
        });
        markPart(film, "lab.media", item.slug);
        return film;
      }),
    arrows(b, links, part("lab.links", item.slug)),
    ...told({ content, newTab: copy.newTab }, item, "lab.body", item.slug),
  ];
  if (updates.length)
    blocks.push(
      placeHead({ title: detail.labels.updates }, `log-${item.slug}`),
      updateLines(b, updates, detail.labels.updates, false),
    );
  return written(b, "lab-entry", "squared", blocks.filter((el) => !!el), firstPage(b), null);
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
  blocks.push(...told({ content, newTab: copy.newTab }, p, "project.body", p.slug));
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

// ---- writings: the marbled composition book ---------------------------------------------

/** The day a post went out, as the hand writes it ("24 Nov 2024"). */
const postDay = (post: WritingPost) => post.date.slice(0, 10);

/** The composition book's first pages: the essays written in it so far,
 * each an entry as if in its contents. The year is written across the line
 * where it turns; each essay's date is in the margin, its title in the hand
 * with the page it starts on, its opening lines after, and the way out to
 * where it was first published. Bodies load only when an essay is opened. */
function writing(b: Build) {
  const { content, copy } = b;
  const { header, copy: words } = content.pages.writing;
  const { posts, status } = content.writing;
  const title = h1("", part("page.title", "writing"));
  title.classList.add("bp-essaytitle");
  title.append(header.title);
  const blocks: HTMLElement[] = [
    h(
      "header",
      { class: "bp-essayhead" },
      header.eyebrow ? h("p", { class: "bp-ntab", ...part("page.eyebrow", "writing") }, header.eyebrow) : null,
      withUnderline(title, RED, "writing-title", true),
      header.intro ? h("p", { class: "bp-lead", ...part("page.intro", "writing") }, header.intro) : null,
    ),
  ];
  const note = status === "unavailable" ? words.unavailableMessage : posts.length ? null : words.emptyMessage;
  if (note) {
    blocks.push(h("p", { class: "bp-pencilled", role: "status" }, note));
    return written(b, "writing", "ruled", blocks, firstPage(b), b.today, 1);
  }
  const list = h("ol", { class: "bp-essays", "aria-label": words.listLabel });
  let year = "";
  for (const post of posts) {
    const day = postDay(post);
    const turn = day.slice(0, 4) !== year;
    year = day.slice(0, 4);
    const starts = b.order.find((stop) => stop.key === post.href)?.page;
    list.append(
      h(
        "li",
        { class: "bp-essay", "data-year": turn ? year : null },
        turn ? h("p", { class: "bp-essay__year" }, year) : null,
        h(
          "time",
          { class: "bp-mnote", datetime: post.date, ...part("writing.meta", post.slug) },
          shortDate(day, copy.months),
        ),
        h(
          "h2",
          { class: "bp-essay__title", ...part("writing.title", post.slug) },
          h(
            "a",
            { href: post.href },
            h("span", { class: "bp-essay__name" }, post.title),
            starts ? h("span", { class: "bp-essay__no" }, h("span", { class: "bp-sr" }, `, ${copy.page.number} `), String(starts)) : null,
          ),
        ),
        h(
          "p",
          { class: "bp-essay__opening" },
          h("span", part("writing.summary", post.slug), post.subtitle || post.description),
          link(post.canonical, copy.newTab, `${copy.writing.substack} ↗`),
        ),
      ),
    );
  }
  blocks.push(list);
  return written(b, "writing", "ruled", blocks, firstPage(b), b.today, b.spread ? 1 : 0);
}

/** The composition book's opening, on a wide desk: the inside of the cover,
 * then the contents. */
function writingBook(b: Build) {
  const pages = writing(b);
  return b.spread ? [compositionInsideCover(b), ...pages] : pages;
}

/** One essay, written out in the composition book: the date in the margin,
 * the title as the essay's heading, ruled under twice, and where it was
 * first published; then the essay, and a P.S. at its end. Only this route's
 * own body is ever used, never another's, and never the server's page. */
function essay(b: Build) {
  const { content, route, copy } = b;
  const { header, copy: words } = content.pages.writing;
  const entry = content.writing.entry?.slug === route.slug ? content.writing.entry : undefined;
  const post = entry ?? content.writing.posts.find((item) => item.slug === route.slug);
  const ref = route.slug ?? "";
  const available = !!entry && content.writing.entryStatus === "available";
  const title = h1("", available ? part("writing.title", ref) : part("page.title", "writing"));
  title.classList.add("bp-essaytitle");
  title.append(available ? entry!.title : header.title);
  const head = h(
    "header",
    { class: "bp-essayhead" },
    post ? h("time", { class: "bp-mnote", datetime: post.date, "aria-hidden": "true" }, shortDate(postDay(post), copy.months)) : null,
    withUnderline(title, RED, `essay-${ref}`, true),
    !available && post ? h("h2", { class: "bp-essay__title", ...part("writing.title", ref) }, post.title) : null,
    post?.subtitle ? h("p", { class: "bp-essay__sub", ...part("writing.subtitle", ref) }, post.subtitle) : null,
    post
      ? h(
          "p",
          { class: "bp-essay__origin" },
          h("time", { datetime: post.date, ...part("writing.meta", ref) }, post.dateLabel),
          " · ",
          markPart(link(post.canonical, copy.newTab, `${words.originLabel} ↗`), "writing.links", ref),
        )
      : null,
  );
  const body = available
    ? prose(entry!.html, "writing.body", ref)
    : [
        h(
          "p",
          { class: "bp-pencilled", role: "status" },
          content.writing.entryStatus === "missing" ? words.entryMissingMessage : words.entryUnavailableMessage,
        ),
      ];
  const ps = h(
    "aside",
    { class: "bp-ps", ...part("writing.end", ref) },
    h("p", { class: "bp-ps__head" }, h("b", null, `${copy.writing.ps} `), words.endHeading),
    h("p", null, words.endBody),
    arrows(
      b,
      [
        { label: `${words.subscribeLabel} ↗`, url: `${content.site.writingUrl}/subscribe` },
        { label: `${post ? words.originLabel : words.sourceLabel} ↗`, url: post?.canonical ?? content.site.writingUrl },
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
    "essay",
    "ruled",
    [head, ...body, ps, back],
    firstPage(b),
    post ? handDate(postDay(post), copy.months) : null,
  );
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
      pages = writingBook(b);
      break;
    case "writing-entry":
      pages = essay(b);
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
