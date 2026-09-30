/** Every route is a chapter of the exercise book: a run of pages written in
 * biro. The book's order is fixed, like a real book's: the cover and hello,
 * a letter, the typed resume stapled in, doodles from the lab, a page for
 * each project, and the war map on the back page. */
import type { Route, SiteContent } from "../types";
import { h, handDate, link, md, shortDate, svg, text } from "./dom";
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

type Project = SiteContent["projects"][number];
type LabItem = SiteContent["lab"][number];

export interface Chapter {
  key: string;
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
  /** What's written for it in the contents. */
  no: string;
}

// ---- the book's order ------------------------------------------------------

export function bookOrder(content: SiteContent): Stop[] {
  const stops: Stop[] = [
    { key: "/", href: "/", label: "Hello", no: "1" },
    { key: "/about", href: "/about", label: "About me", no: "5" },
    { key: "/resume", href: "/resume", label: "Resume", no: "9" },
    { key: "/lab", href: "/lab", label: "The lab", no: "13" },
  ];
  content.lab
    .filter((item) => !item.href)
    .forEach((item, i) =>
      stops.push({
        key: item.detail,
        href: item.detail,
        label: item.title,
        no: String(15 + i),
      }),
    );
  content.projects.forEach((project, i) =>
    stops.push({
      key: project.href,
      href: project.href,
      label: project.title,
      no: String(19 + i * 3),
    }),
  );
  stops.push({
    key: "/projects",
    href: "/projects",
    label: "The back page",
    no: "back",
  });
  return stops;
}

export function rankOf(route: Route, order: Stop[]) {
  const at = order.findIndex((stop) => stop.key === route.path);
  if (at >= 0) return at;
  const lab = order.findIndex((stop) => stop.key === "/lab");
  if (route.kind === "lab-entry") return lab + 0.5;
  if (route.kind === "project")
    return order.findIndex((stop) => stop.key === "/projects") - 0.5;
  return 0.5;
}

// ---- pages ------------------------------------------------------------------

export interface Build {
  route: Route;
  content: SiteContent;
  order: Stop[];
  spread: boolean;
  stage: HTMLElement;
  today: string;
}

type Paper = "squared" | "kraft" | "kraft-in" | "typed" | "letter";

/** A fresh page: its number and date pencilled in at the top. */
export function blankPage(
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
        h("span", null, "Page No. ", h("b", null, no ?? "")),
        h("span", null, "Date ", h("b", null, date ?? "")),
      ),
    );
  }
  const flow = h("div", { class: "bp-flow" });
  if (paper === "typed") {
    const sheet = h(
      "div",
      { class: "bp-sheet" },
      h("i", { class: "bp-staple", "aria-hidden": "true" }),
      flow,
    );
    page.append(sheet);
  } else page.append(flow);
  return { page, flow };
}

/** Flow blocks onto numbered pages. */
function written(
  b: Build,
  kind: string,
  paper: Paper,
  blocks: HTMLElement[],
  first: number | string,
  date: string | null,
  offset = 0,
) {
  let n = typeof first === "number" ? first : 0;
  const pages = paginate(
    blocks,
    () =>
      blankPage(
        kind,
        paper,
        typeof first === "number" ? String(n++) : first,
        date,
      ),
    b.stage,
    { spread: b.spread, offset },
  );
  decorateSpares(pages, kind);
  return pages;
}

/** Pages left empty get the war that was fought on them in a boring lesson. */
function decorateSpares(pages: HTMLElement[], key: string) {
  pages.forEach((page, i) => {
    if (!page.hasAttribute("data-spare")) return;
    const flow = page.querySelector(".bp-flow")!;
    flow.replaceChildren(spare(`${key}-${i}`));
  });
}

function spare(key: string) {
  const rng = seed(key);
  return h(
    "div",
    { class: "bp-spare", "aria-hidden": "true" },
    svg(miniWar(300, 380, rng)),
    h("p", { class: "bp-spare__note" }, "(a quick war, during maths)"),
  );
}

/** A spread always ends on a right-hand page. */
export function evenUp(pages: HTMLElement[], spread: boolean, key: string) {
  if (!spread || pages.length % 2 === 0) return pages;
  const last = pages[pages.length - 1];
  const no = Number(last.querySelector(".bp-page__head b")?.textContent);
  const { page, flow } = blankPage("spare", "squared", Number.isFinite(no) && no > 0 ? String(no + 1) : "", null);
  page.dataset.spare = "";
  flow.append(spare(`${key}-end`));
  return [...pages, page];
}

// ---- small pieces of handwriting -----------------------------------------------

const h1 = (title: string, cls = "") =>
  h("h1", { class: `bp-h1 ${cls}`.trim(), tabindex: "-1" }, title);

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


/** Moves the children of a rendered prose article into blocks. */
function proseBlocks(main: HTMLElement) {
  const prose = main.querySelector(".prose");
  if (!prose) return [];
  return [...prose.children].map((el) => {
    el.removeAttribute("class");
    return el as HTMLElement;
  });
}

// ---- the cover, and the contents -------------------------------------------------

function label(content: SiteContent, eyebrow: string) {
  return h(
    "div",
    { class: "bp-label" },
    h("p", { class: "bp-label__school" }, "Exercise book · squared"),
    h(
      "p",
      { class: "bp-label__title", "aria-hidden": "true" },
      h("span", { class: "bp-blue" }, "Port"),
      h("span", { class: "bp-red" }, "folio"),
    ),
    h(
      "p",
      { class: "bp-label__field" },
      h("span", null, "Name"),
      h("b", null, content.site.name),
    ),
    h(
      "p",
      { class: "bp-label__field" },
      h("span", null, "Subject"),
      h("b", null, eyebrow),
    ),
    h(
      "p",
      { class: "bp-label__field" },
      h("span", null, "Class"),
      h("b", null, "places on the web"),
    ),
  );
}

function contents(b: Build) {
  const { order, content, route } = b;
  const entries: [string, string, string, string?][] = [
    ["/", "Hello", "1"],
    ["/about", "About me", "5", "a letter"],
    ["/resume", "Resume", "9", "stapled in"],
    ["/lab", "The lab", "13", "doodles"],
    ["/projects", "Projects", "back", "the war"],
  ];
  const list = h("ol", { class: "bp-contents__list" });
  for (const [href, name, no, aside] of entries) {
    const stop = order.find((s) => s.key === href);
    const here = route.path === href;
    list.append(
      h(
        "li",
        { "data-ink": href === "/projects" ? "red" : "blue" },
        h(
          "a",
          { href, "aria-current": here ? "page" : null },
          h("span", { class: "bp-contents__name" }, name),
          aside ? h("small", null, ` (${aside})`) : null,
          h("span", { class: "bp-contents__dots", "aria-hidden": "true" }),
          h("span", { class: "bp-contents__no" }, h("span", { class: "bp-sr" }, ", page "), stop?.no ?? no),
        ),
      ),
    );
  }
  list.append(
    h(
      "li",
      { "data-ink": "blue" },
      h(
        "a",
        { href: content.site.writingUrl, target: "_blank", rel: "noreferrer" },
        h("span", { class: "bp-contents__name" }, "Writing"),
        h("small", null, " (Substack)"),
        h("span", { class: "bp-contents__dots", "aria-hidden": "true" }),
        h("span", { class: "bp-contents__no" }, "↗", h("span", { class: "bp-sr" }, " opens in a new tab")),
      ),
    ),
  );
  return h(
    "nav",
    { class: "bp-contents", "aria-label": "Contents" },
    h("p", { class: "bp-contents__title", "aria-hidden": "true" }, "Contents"),
    list,
  );
}

function returnTo(content: SiteContent) {
  const socials = content.site.social.filter((s) => !s.href.startsWith("mailto:"));
  return h(
    "div",
    { class: "bp-return" },
    h(
      "p",
      null,
      "If found, please return to ",
      h("a", { href: `mailto:${content.site.email}` }, content.site.email),
    ),
    h(
      "p",
      { class: "bp-return__socials" },
      ...socials.flatMap((s, i) => [
        i ? " · " : "",
        link(s.href, s.label),
      ]),
    ),
  );
}

/** The outside of the book: the name label on brown paper. On a phone the
 * cover is also where the contents slip is tucked. */
export function coverPage(b: Build, withContents: boolean) {
  const { page, flow } = blankPage("cover", "kraft");
  const eyebrow = b.content.pages.home.eyebrow ?? "Frontend development";
  flow.append(label(b.content, eyebrow));
  if (withContents) flow.append(contents(b), returnTo(b.content));
  else flow.append(svg(coverDoodle()));
  return page;
}

function coverDoodle() {
  const rng = seed("cover");
  return `<svg class="bp-cover-doodle" viewBox="0 0 200 120" aria-hidden="true">${flick(40, 90, 150, 30, BLUE, rng, 0.2)}${flick(150, 30, 60, 100, RED, rng, 0.3)}${camp({ cx: 40, cy: 90, r: 16, ink: BLUE, enemy: RED, dots: 5, hits: 1, rng })}${camp({ cx: 150, cy: 30, r: 16, ink: RED, enemy: BLUE, dots: 6, hits: 2, rng })}</svg>`;
}

/** The inside of the front cover: the contents slip, and who to return it to. */
function insideCover(b: Build) {
  const { page, flow } = blankPage("inside-cover", "kraft-in");
  flow.append(
    h(
      "p",
      { class: "bp-belongs" },
      "This book belongs to ",
      h("b", null, b.content.site.name),
    ),
    contents(b),
    returnTo(b.content),
  );
  return page;
}

// ---- home: hello, the diary, the camps worth a look -------------------------------

function home(b: Build): HTMLElement[] {
  const { content, route } = b;
  const page = content.pages.home;
  const main = route.main;
  const greeting = text(main.querySelector(".greeting")) || "Hey there!";
  const occupation =
    text(main.querySelector(".occupation")) || page.eyebrow || "";
  const portrait = main.querySelector<HTMLImageElement>(".hello img");
  const current = main.querySelector('[aria-labelledby="home-currently"]');
  const headline = page.headline ?? "Burooj here!";
  const [first, ...rest] = headline.split(" ");

  const title = h("h1", { class: "bp-h1 bp-hello__title", tabindex: "-1" }, first + " ", h("span", { class: "bp-red" }, rest.join(" ")));
  const photo = taped(
    portrait?.getAttribute("src") ?? "/images/burooj4.jpg",
    portrait?.getAttribute("alt") ?? `${content.site.name}`,
    "portrait",
    { cls: "bp-portrait" },
  );
  photo.append(
    h("figcaption", null, h("a", { href: "/about" }, "that's me →")),
  );

  const hello: HTMLElement[] = [
    h("div", { class: "bp-hello__top" }, photo, h("p", { class: "bp-greeting" }, greeting), title),
    h("p", { class: "bp-typed-line" }, occupation),
    h("p", { class: "bp-lead" }, page.intro ?? ""),
    ...md(page.body),
  ];
  if (current) {
    const words = current.querySelector("p");
    hello.push(
      h(
        "aside",
        { class: "bp-note", "aria-label": "Currently" },
        h("b", null, "Currently: "),
        ...(words ? [...words.childNodes] : []),
      ),
    );
  }

  // the diary: dated lines, newest first
  const diary = h("ol", { class: "bp-diary", "aria-label": "Recent updates, newest first" });
  for (const u of content.updates) {
    diary.append(
      h(
        "li",
        { "data-kind": u.kind },
        h("time", { class: "bp-mnote", datetime: u.date }, shortDate(u.date)),
        h("p", { class: "bp-diary__title" }, link(u.href, u.title)),
        h("p", { class: "bp-diary__summary" }, u.summary),
        h("p", { class: "bp-diary__src" }, `${u.source === "site" ? "this site" : u.source} · ${u.kind.replace("-", " ")}`),
      ),
    );
  }
  const diaryHead = h(
    "div",
    { class: "bp-sechead", "data-bp-keep": "" },
    withUnderline(h("h2", { class: "bp-h2" }, "Recent updates"), RED, "diary"),
    h("p", { class: "bp-sub" }, "little signals from around my internet"),
    svg(tally(content.updates.length, RED, seed("tally"))),
  );

  // selected work, taped in
  const featured = content.projects.filter((p) => p.featured);
  const snaps = h("ul", { class: "bp-snaps" });
  featured.forEach((p) => {
    const size = (p.media.find((m) => m.src === p.cover) ?? {}) as { width?: number; height?: number };
    const ratio = size.width && size.height ? size.width / size.height : 4 / 3;
    const fig = taped(p.cover, "", `snap-${p.slug}`, { ratio });
    snaps.append(
      h(
        "li",
        null,
        fig,
        h("a", { href: p.href, class: "bp-snaps__title" }, p.title),
        h("span", { class: "bp-snaps__meta" }, p.dateLabel),
      ),
    );
  });
  const workHead = h(
    "div",
    { class: "bp-sechead", "data-bp-keep": "" },
    withUnderline(h("h2", { class: "bp-h2" }, "Some things I've built"), BLUE, "work"),
  );
  const toWar = h(
    "p",
    { class: "bp-arrowlink" },
    h("a", { href: "/projects" }, "all of them, on the back page →"),
  );

  const cover = b.spread ? insideCover(b) : coverPage(b, true);
  const pages = written(
    b,
    "home",
    "squared",
    [...hello, diaryHead, diary, workHead, snaps, toWar],
    1,
    b.today,
    1,
  );
  return [cover, ...pages];
}

// ---- about: a letter -----------------------------------------------------------------

function about(b: Build) {
  const main = b.route.main;
  const title = text(main.querySelector("h1")) || "About";
  const intro = text(main.querySelector(".page-header__intro"));
  const action = main.querySelector<HTMLAnchorElement>(".page-header__actions a");
  const blocks: HTMLElement[] = [
    h(
      "header",
      { class: "bp-letterhead" },
      withUnderline(h1(title), BLUE, "about-title"),
      intro ? h("p", { class: "bp-lead" }, intro) : null,
    ),
    h("p", { class: "bp-salute" }, "Dear reader,"),
    ...proseBlocks(main),
    h("p", { class: "bp-signoff" }, "Yours,", h("br"), h("span", null, "Burooj")),
  ];
  if (action)
    blocks.push(
      h(
        "p",
        { class: "bp-ps" },
        "P.S. ",
        h("a", { href: action.getAttribute("href") ?? "/resume" }, text(action).toLowerCase() || "my resume"),
        " is stapled in, a few pages on.",
      ),
    );
  return written(b, "about", "letter", blocks, 5, b.today);
}

// ---- resume: typed, and stapled in -------------------------------------------------

function resume(b: Build) {
  const main = b.route.main;
  const title = text(main.querySelector("h1")) || "Resume";
  const intro = text(main.querySelector(".page-header__intro"));
  const actions = [...main.querySelectorAll<HTMLAnchorElement>(".page-header__actions a")];
  const blocks: HTMLElement[] = [
    h(
      "header",
      { class: "bp-typedhead" },
      h1(title),
      intro ? h("p", { class: "bp-typedhead__intro" }, intro) : null,
      actions.length
        ? h(
            "p",
            { class: "bp-typedhead__contact" },
            ...actions.flatMap((a, i) => [i ? "  ·  " : "", link(a.getAttribute("href") ?? "#", text(a))]),
          )
        : null,
    ),
    ...proseBlocks(main),
  ];
  return written(b, "resume", "typed", blocks, 9, b.today);
}

// ---- the lab: doodles in the margin ----------------------------------------------------

function labCard(item: LabItem, i: number) {
  const rng = seed(item.slug);
  const target = item.href ?? item.detail;
  return h(
    "article",
    { class: "bp-labitem", "data-side": i % 2 ? "right" : "left" },
    svg(doodle(i, rng)),
    h("h2", { class: "bp-h2" }, link(target, item.title)),
    h("p", null, item.summary),
    h("p", { class: "bp-labitem__meta" }, `${item.type} · ${item.sourceEra}`),
  );
}

function lab(b: Build) {
  const main = b.route.main;
  const title = text(main.querySelector("h1")) || "Lab";
  const intro = text(main.querySelector(".page-header__intro"));
  const blocks: HTMLElement[] = [
    h(
      "header",
      { class: "bp-entryhead" },
      h("p", { class: "bp-eyebrow" }, "Lab · in the margins"),
      withUnderline(h1(title), RED, "lab-title"),
      intro ? h("p", { class: "bp-lead" }, intro) : null,
    ),
    ...b.content.lab.map(labCard),
  ];
  return written(b, "lab", "squared", blocks, 13, null);
}

function labEntry(b: Build): HTMLElement[] | null {
  const { route, content } = b;
  const item = content.lab.find((l) => l.slug === route.slug);
  const main = route.main;
  const real = main.querySelector(".entry-page");
  if (!item && !real) return null;
  const title = text(main.querySelector(".entry-page h1")) || item?.title || "";
  const summary = text(main.querySelector(".entry-page .page-header__intro")) || item?.summary || "";
  const i = Math.max(0, content.lab.findIndex((l) => l.slug === route.slug));
  const links = item?.href
    ? [{ label: `Try it on ${item.sourceEra}`, url: item.href }, ...item.links]
    : (item?.links ?? []);
  const blocks: HTMLElement[] = [
    h(
      "header",
      { class: "bp-entryhead" },
      h("p", { class: "bp-eyebrow" }, "Lab"),
      withUnderline(h1(title), RED, `lab-${route.slug}`),
      h("p", { class: "bp-lead" }, summary),
    ),
    h("div", { class: "bp-bigdoodle" }, svg(doodle(i, seed(route.slug ?? "lab")))),
    fields([
      ["Type", item?.type ?? ""],
      ["Era", item?.sourceEra ?? ""],
    ]),
    arrows(links),
    ...proseBlocks(main),
  ];
  return written(b, "lab-entry", "squared", blocks, 15 + i, null);
}

// ---- a project: its own page, the screenshot taped in -------------------------------

function fields(rows: [string, string][]) {
  return h(
    "dl",
    { class: "bp-fields" },
    ...rows
      .filter(([, v]) => v)
      .map(([k, v]) => h("div", null, h("dt", null, k), h("dd", null, v))),
  );
}

function arrows(links: { label: string; url: string }[]) {
  if (!links.length) return h("span", { hidden: true });
  return h(
    "ul",
    { class: "bp-arrows" },
    ...links.map((l) => h("li", null, link(l.url, l.label))),
  );
}

function project(b: Build): HTMLElement[] {
  const { route, content } = b;
  const main = route.main;
  const p = content.projects.find((x) => x.slug === route.slug);
  const i = Math.max(0, content.projects.findIndex((x) => x.slug === route.slug));
  const title = p?.title ?? text(main.querySelector("h1"));
  const summary = p?.summary ?? text(main.querySelector(".page-header__intro"));
  const metaRows: [string, string][] = p
    ? [
        ["Role", p.role],
        ["Where", p.location],
        ["When", p.dateLabel],
      ]
    : [...main.querySelectorAll(".entry-page__meta > div")].map((d) => [
        text(d.querySelector(".entry-page__label")),
        text(d.querySelector("p")),
      ]);
  const links =
    p?.links ??
    [...main.querySelectorAll<HTMLAnchorElement>(".entry-page__links:first-of-type a")].map((a) => ({
      label: text(a),
      url: a.getAttribute("href") ?? "#",
    }));
  const tools = p?.tools ?? [...main.querySelectorAll(".ds-tags li")].map((li) => text(li));
  const media: { src: string; alt: string; video: boolean; ratio?: number; caption?: string }[] = p
    ? p.media.map((m) => {
        const size = m as { width?: number; height?: number };
        return {
          src: m.src,
          alt: m.alt ?? "",
          caption: m.caption ?? m.alt,
          video: m.type === "video",
          ratio: size.width && size.height ? size.width / size.height : 16 / 10,
        };
      })
    : [...main.querySelectorAll<HTMLImageElement>(".media-rail img")].map((img) => ({
        src: img.getAttribute("src") ?? "",
        alt: img.alt,
        caption: img.alt,
        video: false,
        ratio: img.width && img.height ? img.width / img.height : undefined,
      }));
  const archive = p?.status === "archive";
  const ink = archive ? RED : BLUE;

  const head = h(
    "header",
    { class: "bp-entryhead", "data-ink": archive ? "red" : "blue" },
    h("p", { class: "bp-eyebrow" }, `${p?.kind ?? "Project"} · ${archive ? "from the archive" : "selected work"}`),
    withUnderline(h1(title), archive ? BLUE : RED, `title-${route.slug}`, true),
    h("p", { class: "bp-lead" }, summary),
  );
  const blocks: HTMLElement[] = [
    head,
    fields(metaRows),
    tools.length
      ? h("ul", { class: "bp-circled", "aria-label": `${title} tools` }, ...tools.map((t) => h("li", null, t)))
      : h("span", { hidden: true }),
    arrows(links),
  ];
  media.forEach((m, n) => {
    const fig = taped(m.src, m.alt, `${route.slug}-${n}`, {
      caption: m.caption,
      ratio: m.ratio,
      video: m.video,
    });
    if (n === 0) fig.dataset.bpBreak = "right";
    blocks.push(fig);
  });
  blocks.push(...proseBlocks(main));
  blocks.push(
    h("p", { class: "bp-arrowlink" }, h("a", { href: "/projects" }, "← back to the war (all projects)")),
  );
  const pages = written(b, "project", "squared", blocks, 19 + i * 3, p?.dateLabel ?? null);
  // this project's camp, from the map, drawn in the corner of its first page
  const first = pages[0];
  if (first && p) {
    const rng = seed(p.slug);
    const art = svg(
      `<svg class="bp-owncamp" viewBox="0 0 120 120" aria-hidden="true">${camp({ cx: 60, cy: 60, r: 44, ink, enemy: archive ? BLUE : RED, dots: campDots(p), hits: campHits(p), rng })}</svg>`,
    );
    first.append(art);
  }
  return pages;
}

const campDots = (p: Project) => Math.min(11, 5 + p.links.length + p.media.length);
const campHits = (p: Project) => Math.max(0, Math.min(5, 2026 - p.year));

// ---- projects: the war on the back page ------------------------------------------------

function warMap(projects: Project[], w: number, hgt: number, wide: boolean) {
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
    rings += camp({ cx: x, cy: y, r, ink: ink(p), enemy: foe(p), dots: campDots(p), hits: campHits(p), rng: seed(p.slug), id: p.slug });
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
  const list = h("ul", { class: "bp-map__camps", "aria-label": "Projects on the map" });
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
      h("span", { class: "bp-blue" }, "● selected work"),
      h("span", { class: "bp-red" }, "● the archive"),
    ),
  );
  return box;
}

function projects(b: Build) {
  const { content, route, stage } = b;
  const main = route.main;
  const title = text(main.querySelector("h1")) || "Projects";
  const intro = text(main.querySelector(".page-header__intro"));
  const head = h(
    "header",
    { class: "bp-entryhead" },
    h("p", { class: "bp-eyebrow" }, "Projects · the back page"),
    withUnderline(h1(title), RED, "projects-title"),
    intro ? h("p", { class: "bp-lead" }, intro) : null,
  );
  const roster = h("ol", { class: "bp-roster", "aria-label": "Every project, newest first" });
  for (const p of content.projects) {
    roster.append(
      h(
        "li",
        { "data-ink": p.status === "archive" ? "red" : "blue" },
        h("span", { class: "bp-mnote", "aria-hidden": "true" }, `'${String(p.year).slice(2)}`),
        h("a", { href: p.href }, p.title),
        h("span", { class: "bp-roster__meta" }, ` ${p.dateLabel}${p.kind === "Arcade" ? " · arcade" : ""}`),
      ),
    );
  }
  const rosterHead = withUnderline(h("h2", { class: "bp-h2" }, "Roll call"), BLUE, "roll");

  // measure the page the map goes on: all of it
  const probe = blankPage("projects", "squared", "back", null);
  stage.append(probe.page);
  const w = probe.flow.clientWidth - parseFloat(getComputedStyle(probe.flow).paddingLeft);
  const room = probe.flow.clientHeight;
  probe.page.remove();
  const map = warMap(content.projects, w, Math.max(320, room - 4), b.spread);
  map.dataset.bpBreak = "right";
  const blocks = [head, rosterHead, roster, map];
  const pages = written(b, "projects", "squared", blocks, "back", "the whole war");
  return pages;
}

// ---- anything else: a loose sheet, tucked in ------------------------------------------

function loose(b: Build) {
  const sheet = h("article", { class: "bp-loose" });
  sheet.append(
    h("p", { class: "bp-loose__tag", "aria-hidden": "true" }, "tucked in"),
    ...b.route.main.childNodes,
  );
  const heading = sheet.querySelector("h1");
  heading?.setAttribute("tabindex", "-1");
  return sheet;
}

// ---- assembling a chapter --------------------------------------------------------------

export function chapter(b: Build): Chapter {
  const { route, order } = b;
  const rank = rankOf(route, order);
  const label = order.find((s) => s.key === route.path)?.label ?? route.title.split("|")[0].trim();
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
    case "project":
      pages = route.main.querySelector(".entry-page") || b.content.projects.some((p) => p.slug === route.slug) ? project(b) : null;
      break;
    case "projects":
      pages = projects(b);
      break;
  }
  if (!pages) return { key: route.path, rank, label, pages: [], loose: loose(b) };
  return { key: route.path, rank, label, pages: evenUp(pages, b.spread, route.path) };
}

export const today = () => handDate(new Date());
