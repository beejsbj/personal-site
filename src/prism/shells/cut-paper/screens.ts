/** Screens: what sits on the stage for each route. Home is the play screen,
 * projects the arrangement (the career on a timeline, played through), a
 * project its album sleeve and liner notes, the lab a drawer of presets, about a torn jazz poster, the resume
 * the credits, and anything else a sheet of music clipped to the stand. */
import { part } from "../../parts";
import { blocks, fallbackBody, featured, fill, inline, rich, type LinkMaker } from "../rich";
import type { ResumeEntry, Route, SiteContent } from "../types";
import { arrangement } from "./arrange";
import { h, link, markup, seeded, type Child } from "./dom";
import { listen } from "./listen";
import { noteAt, noteVar } from "./notes";
import { clipPhrase, modelFor, spanPhrase } from "./timeline";

export interface Screen {
  el: HTMLElement;
  heading: HTMLElement;
  /** The screen leaves the stage: stop what it runs. */
  destroy?(): void;
  /** The prism idles the page (or wakes it). */
  idle?(idle: boolean): void;
}

export interface ScreenOptions {
  reducedMotion: boolean;
  face: boolean;
}

const EASE_SWING = "cubic-bezier(0.7, -0.2, 0.3, 1.2)";

type Copy = SiteContent["lenses"]["cut-paper"];
type Project = SiteContent["projects"][number];
type LabItem = SiteContent["lab"][number];

const BRAND = ["tomato", "plum", "mustard", "pine"] as const;

/* ── shared bits ─────────────────────────────────────────── */

function screen(kind: string, ...children: Child[]) {
  return h("div", { class: `cp-screen cp-screen--${kind}`, "data-screen": kind }, ...children);
}

function heading(textContent: string, className: string) {
  return h("h1", { class: className, tabindex: "-1" }, textContent);
}

/** A torn / cut scrap of brand paper, decoration only. */
const scrap = (colour: string, shape: string, extra = "") =>
  h("span", {
    class: `cp-scrap cp-scrap--${shape} ${extra}`.trim(),
    style: `--paper:var(--cp-${colour})`,
    "aria-hidden": "true",
  });

const kicker = (...children: Child[]) => h("p", { class: "cp-kicker" }, ...children);

/** Number a container's children so they enter on successive sixteenths
 * (`step` 2 = eighths), starting `from` sixteenths in. Scraps are skipped:
 * decoration is already on the stage. */
function bar(container: HTMLElement, step = 1, from = 0) {
  let i = from;
  for (const child of container.children) {
    if (!(child instanceof HTMLElement) || child.classList.contains("cp-scrap")) continue;
    child.dataset.beat = "";
    child.style.setProperty("--i", String(i));
    i += step;
  }
  return container;
}

/** Scrub cloned server markup of things that would dangle in a new home. */
function adopt(fragment: DocumentFragment | Element) {
  fragment.querySelectorAll("[aria-labelledby]").forEach((node) => node.removeAttribute("aria-labelledby"));
  fragment.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  return fragment;
}

/** Make `el` sound like a project's clip when hovered, tapped or focused:
 * the same motif the arrangement plays at its date. */
function sounds(el: HTMLElement, content: SiteContent, item: Project) {
  const clip = modelFor(content).clips.find((entry) => entry.project.slug === item.slug);
  if (clip) listen(el, `clip:${item.slug}`, () => clipPhrase(clip));
}

/** Links inside content copy, made the shell's way. */
const makeLink: LinkMaker = (href, children) => link(href, {}, ...children);

/** A link carrying the drawn arrow the sheet's notes use (the arrow of
 * Daylight's links: out for other sites, along for this one). */
function arrowed(href: string, label: string) {
  const out = /^(https?:|mailto:)/.test(href);
  const a = h("a", { href }, h("span", null, label, " ", markup(
    `<svg class="cp-arrow" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${out ? "M4 12 12 4M4 4h8v8" : "M2 8h11M8 3l5 5-5 5"}"/></svg>`,
  )));
  return a;
}

/** A rendered markdown body as liner-note prose. */
function prose(html: string, extra = "", attrs: Record<string, string | undefined> = {}) {
  if (!html.trim()) return null;
  return h("div", { class: `cp-prose ${extra}`.trim(), ...attrs }, adopt(rich(html)));
}

/** A little piano roll, seeded by name, drawn in the current note colour. */
function roll(seed: string, steps = 32) {
  const random = seeded(seed);
  let rects = "";
  for (let step = 0; step < steps; ) {
    const length = 1 + Math.floor(random() * 3);
    if (random() > 0.28) {
      const degree = Math.floor(random() * 7);
      rects += `<rect x="${step}" y="${6 - degree}" width="${Math.max(length - 0.25, 0.6)}" height="0.8"/>`;
    }
    step += length;
  }
  return markup(
    `<svg class="cp-roll" viewBox="0 0 ${steps} 7" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>`,
  );
}

type Row = [string, string | undefined, Record<string, string | undefined>?];

function credits(rows: Row[]) {
  return h(
    "dl",
    { class: "cp-credits" },
    rows
      .filter(([, value]) => value)
      .map(([term, value, attrs]) =>
        h("div", { class: "cp-credits__row" }, h("dt", null, term), h("dd", attrs ?? null, value ?? "")),
      ),
  );
}

const buttons = (
  items: { label: string; url: string }[],
  extra = "",
  attrs: Record<string, string | undefined> = {},
) =>
  items.length
    ? h(
        "ul",
        { class: `cp-buttons ${extra}`.trim(), ...attrs },
        items.map((item, index) =>
          h("li", null, link(item.url, { class: index === 0 ? "cp-btn cp-btn--lit" : "cp-btn" }, item.label)),
        ),
      )
    : null;

/* ── home: the play screen ───────────────────────────────── */

function home(content: SiteContent, copy: Copy, options: ScreenOptions): Screen {
  const page = content.pages.home;
  const { hero } = page;
  const words = copy.home;

  const h1 = heading(hero.headline, "cp-home__title");
  Object.assign(h1.dataset, { part: "page.title", ref: "home" });
  // every social link, then the hero's own links that aren't one of them
  const socials = [
    ...content.site.social.map((item) => ({ label: item.label, url: item.href })),
    ...hero.links
      .filter((item) => !content.site.social.some((social) => social.href === item.href))
      .map((item) => ({ label: item.label, url: item.href })),
  ];

  const hero_ = h(
    "section",
    { class: "cp-home__hero", "aria-labelledby": "cp-home-title" },
    scrap("tomato", "torn", "cp-home__scrap-a"),
    scrap("plum", "stairs", "cp-home__scrap-b"),
    scrap("mustard", "tri", "cp-home__scrap-c"),
    h(
      "figure",
      { class: "cp-portrait", ...part("home.portrait") },
      h("img", {
        src: hero.portrait.src,
        alt: hero.portrait.alt,
        width: 1080,
        height: 1920,
        decoding: "async",
      }),
    ),
    h("p", { class: "cp-kicker", ...part("home.greeting") }, hero.greeting),
    h1,
    h("p", { class: "cp-home__role", ...part("home.occupation") }, hero.occupation),
    h("p", { class: "cp-home__intro", ...part("home.welcome") }, hero.welcome),
    h(
      "ul",
      { class: "cp-chips", "aria-label": words.links, ...part("home.links") },
      socials.map((item) => h("li", null, link(item.url, { class: "cp-chipbtn" }, item.label))),
    ),
  );
  h1.id = "cp-home-title";

  // the deck: the featured record on the platter, the rest in the crate
  const records = featured(content);
  const first = records[0];
  const record = h("div", { class: "cp-record" }, h("span", { class: "cp-record__label" }));
  const deckWhen = h("p", { class: "cp-deck__when" });
  const deckLink = h("a", { class: "cp-deck__link" });
  const deckSum = h("p", { class: "cp-deck__sum" });
  const deckButton = h("a", { class: "cp-btn cp-btn--lit" }, words.linerNotes);
  const turntable = h(
    "div",
    { class: "cp-turntable", "data-state": "spinning", "aria-hidden": "true" },
    h(
      "div",
      { class: "cp-platter" },
      record,
      h("span", { class: "cp-record__sheen" }),
      h("span", { class: "cp-record__spindle" }),
    ),
    markup(
      '<svg class="cp-arm" viewBox="0 0 100 100"><circle class="cp-arm__pivot" cx="86" cy="14" r="6"/><path class="cp-arm__rod" d="M86 14 L84 58 L66 76"/><path class="cp-arm__head" d="M62 72 l8 8 l-5 5 l-8 -8z"/></svg>',
    ),
    h("span", { class: "cp-turntable__speed" }, words.speed),
  );

  const sleeves: HTMLAnchorElement[] = [];
  const arm = turntable.querySelector<SVGElement>(".cp-arm");
  const drop = (project: Project) => {
    record.style.setProperty("--cover", project.cover ? `url("${project.cover}")` : "none");
    record.style.setProperty(
      "--note",
      noteVar(noteAt(content.projects.indexOf(project)).id),
    );
    deckWhen.textContent = `${project.dateLabel} · ${project.role}`;
    deckLink.textContent = project.title;
    deckLink.href = project.href;
    deckSum.textContent = project.summary;
    deckButton.href = project.href;
    deckButton.setAttribute("aria-label", fill(words.linerNotesFor, { title: project.title }));
  };
  const cue = (project: Project) => {
    const changing = !!turntable.dataset.cue && turntable.dataset.cue !== project.slug;
    turntable.dataset.cue = project.slug;
    sleeves.forEach((sleeve) => {
      sleeve.dataset.state = sleeve.dataset.slug === project.slug ? "playing" : "rest";
    });
    if (!changing || options.reducedMotion || options.face || !arm?.animate) {
      drop(project);
      return;
    }
    // the tonearm lifts, the record swaps under it, the arm drops back
    arm.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(13deg)", offset: 0.38 },
        { transform: "rotate(13deg)", offset: 0.55 },
        { transform: "rotate(0deg)" },
      ],
      { duration: 500, easing: EASE_SWING },
    );
    record.animate(
      [{ opacity: 1 }, { opacity: 0.35, offset: 0.4 }, { opacity: 1 }],
      { duration: 500, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
    );
    setTimeout(() => drop(project), 200);
  };

  const deck = h(
    "section",
    { class: "cp-deck", "aria-labelledby": "cp-deck-title" },
    h("h2", { class: "cp-label", id: "cp-deck-title" }, words.nowSpinning),
    turntable,
    h(
      "div",
      { class: "cp-deck__meta" },
      deckWhen,
      h("h3", { class: "cp-deck__title" }, deckLink),
      deckSum,
      deckButton,
    ),
  );

  const crateList = h(
    "ul",
    { class: "cp-crate__list" },
    records.map((project, index) => {
      const sleeve = h(
        "a",
        {
          class: "cp-sleeve",
          href: project.href,
          "data-slug": project.slug,
          "data-state": "rest",
          style: `--spine:var(--cp-${BRAND[index % BRAND.length]})`,
        },
        project.cover
          ? h("img", { class: "cp-sleeve__art", src: project.cover, alt: "", loading: "lazy", decoding: "async" })
          : h("span", { class: "cp-sleeve__art", "aria-hidden": "true" }),
        h(
          "span",
          { class: "cp-sleeve__copy" },
          h("span", { class: "cp-sleeve__title", ...part("project.title", project.slug) }, project.title),
          h("span", { class: "cp-sleeve__meta" }, `${project.dateLabel} · ${project.tags[0]?.replace(/-/g, " ") ?? project.kind}`),
        ),
        h("span", { class: "cp-sleeve__side", "aria-hidden": "true" }, `A${index + 1}`),
      );
      sleeves.push(sleeve);
      if (!options.face) sounds(sleeve, content, project);
      sleeve.addEventListener("pointerenter", () => cue(project));
      sleeve.addEventListener("focus", () => cue(project));
      return h("li", null, sleeve);
    }),
  );

  const { currently } = page;
  const crate = h(
    "section",
    { class: "cp-crate", "aria-labelledby": "cp-crate-title" },
    h("h2", { class: "cp-label", id: "cp-crate-title" }, words.crate),
    crateList,
    h(
      "a",
      { class: "cp-crate__all", href: page.work.link.href },
      words.setlist,
      h("span", { class: "cp-crate__count" }, String(content.derived.counts.projects)),
    ),
    h(
      "aside",
      { class: "cp-note", "aria-label": words.currently },
      h("span", { class: "cp-note__tape", "aria-hidden": "true" }),
      h(
        "div",
        { class: "cp-note__copy", ...part("home.currently") },
        h("h2", null, currently.title),
        h("p", null, inline(currently.body, makeLink)),
        h("div", { class: "more" }, arrowed(currently.link.href, currently.link.label)),
      ),
    ),
  );

  if (first) cue(first);
  bar(hero_, 1);
  bar(deck, 2, 2);
  bar(crateList, 1, 4);
  crateList.removeAttribute("data-beat");
  return {
    el: screen("home", h("div", { class: "cp-home" }, hero_, deck, crate)),
    heading: h1,
  };
}

/* ── projects: the arrangement ───────────────────────────── */

/** A page's opening, from its header in content. */
function pageHead(
  header: SiteContent["pages"]["projects"]["header"],
  id: string,
  className: string,
) {
  const h1 = heading(header.title, `${className}__title`);
  Object.assign(h1.dataset, { part: "page.title", ref: id });
  return {
    h1,
    head: h(
      "header",
      { class: `${className}__head` },
      header.eyebrow ? h("p", { class: "cp-kicker", ...part("page.eyebrow", id) }, header.eyebrow) : null,
      h1,
      header.intro ? h("p", { class: `${className}__intro`, ...part("page.intro", id) }, header.intro) : null,
    ),
  };
}

function projects(content: SiteContent, copy: Copy, options: ScreenOptions): Screen {
  const { h1, head } = pageHead(content.pages.projects.header, "projects", "cp-seq");
  const arranged = arrangement(content, copy, options);
  return {
    el: screen("projects", h("div", { class: "cp-seq" }, bar(head, 2), arranged.el)),
    heading: h1,
    destroy: arranged.destroy,
    idle: arranged.idle,
  };
}

/* ── a project: the sleeve and its liner notes ───────────── */

function project(content: SiteContent, copy: Copy, item: Project): Screen {
  const words = copy.project;
  const labels = content.pages.projects.detail.labels;
  const index = content.projects.indexOf(item);
  const note = noteAt(index);
  const h1 = heading(item.title, "cp-liner__title");
  Object.assign(h1.dataset, { part: "project.title", ref: item.slug });
  const prev = content.projects[index - 1];
  const next = content.projects[index + 1];
  const media = item.media.filter((entry, i) => !(i === 0 && entry.src === item.cover));
  const trackNo = `${String(index + 1).padStart(2, "0")} / ${String(content.projects.length).padStart(2, "0")}`;

  const sleeve = h(
    "div",
    { class: "cp-sleeve-art", style: `--note:${noteVar(note.id)}` },
    h(
      "span",
      { class: "cp-sleeve-art__disc", "aria-hidden": "true" },
      h("span", { class: "cp-sleeve-art__label", style: item.cover ? `background-image:url("${item.cover}")` : null }),
    ),
    h(
      "figure",
      { class: "cp-sleeve-art__cover" },
      item.cover
        ? h("img", {
            src: item.cover,
            alt: item.media[0]?.alt ?? fill(words.coverAlt, { title: item.title }),
            decoding: "async",
          })
        : null,
      h("figcaption", { class: "cp-sleeve-art__stamp" }, h("span", null, words.stamp), h("b", null, item.title)),
    ),
    scrap(BRAND[index % 4], "tri", "cp-sleeve-art__scrap-a"),
    scrap(BRAND[(index + 1) % 4], "torn", "cp-sleeve-art__scrap-b"),
  );
  // pulling the record out plays it
  sounds(sleeve, content, item);

  const transport = h(
    "nav",
    { class: "cp-transport", "aria-label": words.neighbours },
    prev
      ? h("a", { class: "cp-transport__btn", href: prev.href, rel: "prev" },
          h("span", { "aria-hidden": "true" }, "⏮"), h("span", { class: "cp-transport__txt" }, h("small", null, words.prev), prev.title))
      : h("span", { class: "cp-transport__btn", "data-state": "off" }, h("span", { "aria-hidden": "true" }, "⏮"), h("span", { class: "cp-transport__txt" }, h("small", null, words.first))),
    h("span", { class: "cp-transport__no" }, fill(words.trackNo, { no: trackNo })),
    next
      ? h("a", { class: "cp-transport__btn cp-transport__btn--next", href: next.href, rel: "next" },
          h("span", { class: "cp-transport__txt" }, h("small", null, words.next), next.title), h("span", { "aria-hidden": "true" }, "⏭"))
      : h("span", { class: "cp-transport__btn cp-transport__btn--next", "data-state": "off" }, h("span", { class: "cp-transport__txt" }, h("small", null, words.last)), h("span", { "aria-hidden": "true" }, "⏭")),
  );

  const notes = h(
    "article",
    { class: "cp-liner__notes", "aria-labelledby": "cp-liner-title" },
    kicker(
      h("a", { href: content.pages.projects.detail.back.href }, words.setlist),
      fill(words.kicker, { no: trackNo, kind: item.kind }),
    ),
    h1,
    h("p", { class: "cp-liner__lede", ...part("project.summary", item.slug) }, item.summary),
    h("h2", { class: "cp-label" }, words.credits),
    credits([
      [labels.role, item.role],
      [labels.location, item.location],
      [labels.date, item.dateLabel],
      [words.tools, item.tools.join(", ") || undefined, part("project.tools", item.slug)],
      [words.filed, item.tags.map((tag) => tag.replace(/-/g, " ")).join(", ") || undefined],
    ]),
    buttons(item.links, "", part("project.links", item.slug)),
    item.html.trim() ? h("h2", { class: "cp-label" }, words.linerNotes) : null,
    prose(item.html, "", part("project.body", item.slug)),
    media.length
      ? h(
          "div",
          { class: "cp-liner__inserts", ...part("project.media", item.slug) },
          media.map((entry) =>
            h(
              "figure",
              { class: "cp-insert" },
              entry.type === "video"
                ? h("video", { src: entry.src, controls: true, muted: true, playsinline: true, preload: "metadata", "aria-label": entry.alt ?? item.title })
                : h("img", { src: entry.src, alt: entry.alt ?? "", loading: "lazy", decoding: "async" }),
              entry.caption ? h("figcaption", null, entry.caption) : null,
            ),
          ),
        )
      : null,
    h("a", { class: "cp-back", href: content.pages.projects.detail.back.href }, h("span", { "aria-hidden": "true" }, "←"), ` ${words.back}`),
  );
  h1.id = "cp-liner-title";
  bar(notes, 2);

  return {
    el: screen(
      "project",
      h("div", { class: "cp-liner", style: `--note:${noteVar(note.id)}` }, h("div", { class: "cp-liner__side" }, sleeve, transport), notes),
    ),
    heading: h1,
  };
}

/* ── lab: a drawer of presets ────────────────────────────── */

function labVisual(item: LabItem) {
  if (/motion|path|line|draw/i.test(`${item.slug} ${item.type}`)) {
    const petals = [0, 40, -40, 80, -80]
      .map(
        (angle, i) =>
          `<path class="cp-viz__petal" style="--d:${i}" pathLength="1" transform="rotate(${angle} 60 78)" d="M60 78 C44 58 46 30 60 14 C74 30 76 58 60 78Z"/>`,
      )
      .join("");
    return markup(
      `<svg class="cp-viz cp-viz--lotus" viewBox="0 0 120 96" aria-hidden="true">${petals}<path class="cp-viz__water" pathLength="1" d="M8 84 Q34 76 60 84 T112 84"/></svg>`,
    );
  }
  if (/beat|rhythm|audio|shape/i.test(`${item.slug} ${item.type}`)) {
    return markup(
      '<svg class="cp-viz cp-viz--beats" viewBox="0 0 120 96" aria-hidden="true"><circle style="--d:0" cx="22" cy="48" r="13"/><rect style="--d:1" x="42" y="35" width="26" height="26"/><path style="--d:2" d="M86 34 L100 62 H72Z"/><rect style="--d:3" x="104" y="30" width="7" height="36"/></svg>',
    );
  }
  return roll(item.slug, 24);
}

function lab(content: SiteContent, copy: Copy): Screen {
  const page = content.pages.lab;
  const { h1, head } = pageHead(page.header, "lab", "cp-lab");
  const presets = h(
    "ul",
    { class: "cp-presets" },
    content.lab.map((item, index) => {
      const target = item.href ?? item.detail;
      return h(
        "li",
        { class: "cp-preset", style: `--note:${noteVar(noteAt(index + 2).id)}`, "data-state": "rest" },
        h("div", { class: "cp-preset__viz" }, labVisual(item)),
        h(
          "div",
          { class: "cp-preset__copy" },
          h("p", { class: "cp-preset__meta", ...part("lab.meta", item.slug) }, `${item.type} · ${item.sourceEra}`),
          h("h2", { class: "cp-preset__title", ...part("lab.title", item.slug) }, link(target, { class: "cp-preset__link" }, item.title)),
          h("p", { class: "cp-preset__sum", ...part("lab.summary", item.slug) }, item.summary),
        ),
        h("span", { class: "cp-preset__apply", "aria-hidden": "true" }, item.href ? copy.lab.open : copy.lab.apply),
      );
    }),
  );
  return {
    el: screen(
      "lab",
      h(
        "div",
        { class: "cp-lab" },
        bar(head, 2),
        h(
          "section",
          { class: "cp-drawer", "aria-label": copy.lab.presets },
          h(
            "div",
            { class: "cp-drawer__tabs", "aria-hidden": "true" },
            copy.lab.tabs.map((tab, i) =>
              h("span", { class: "cp-drawer__tab", "data-state": i === 0 ? "on" : "off" }, tab),
            ),
            h("span", { class: "cp-drawer__count" }, String(content.derived.counts.lab).padStart(2, "0")),
          ),
          bar(presets, 2, 4),
        ),
        h(
          "div",
          { class: "cp-lab__more" },
          h(
            "div",
            { class: "cp-prose cp-lab__more-link", ...part("lab.more") },
            h("p", null, arrowed(page.more.href, page.more.label)),
          ),
          h("div", { class: "cp-prose", ...part("lab.aside") }, h("p", null, inline(page.aside, makeLink))),
        ),
      ),
    ),
    heading: h1,
  };
}

function labEntry(content: SiteContent, copy: Copy, item: LabItem): Screen {
  const labels = content.pages.lab.detail.labels;
  const index = content.lab.indexOf(item);
  const h1 = heading(item.title, "cp-liner__title");
  Object.assign(h1.dataset, { part: "lab.title", ref: item.slug });
  h1.id = "cp-liner-title";
  const links = [...(item.href ? [{ label: copy.lab.openSketch, url: item.href }] : []), ...item.links];
  return {
    el: screen(
      "lab-entry",
      h(
        "div",
        { class: "cp-liner cp-liner--preset", style: `--note:${noteVar(noteAt(index + 2).id)}` },
        h(
          "div",
          { class: "cp-liner__side" },
          h("div", { class: "cp-preset-plate" }, labVisual(item), h("span", { class: "cp-preset-plate__name", "aria-hidden": "true" }, item.title)),
        ),
        bar(h(
          "article",
          { class: "cp-liner__notes", "aria-labelledby": "cp-liner-title" },
          kicker(
            h("a", { href: "/lab" }, content.pages.lab.detail.eyebrow),
            fill(copy.lab.entryKicker, { no: String(index + 1).padStart(2, "0") }),
          ),
          h1,
          h("p", { class: "cp-liner__lede", ...part("lab.summary", item.slug) }, item.summary),
          credits([
            [labels.type, item.type],
            [labels.era, item.sourceEra],
          ]),
          buttons(links, "", part("lab.links", item.slug)),
          prose(item.html, "", part("lab.body", item.slug)),
          h("a", { class: "cp-back", href: "/lab" }, h("span", { "aria-hidden": "true" }, "←"), ` ${copy.lab.back}`),
        ), 2),
      ),
    ),
    heading: h1,
  };
}

/* ── about: a torn jazz poster ───────────────────────────── */

function about(content: SiteContent, copy: Copy): Screen {
  const page = content.pages.about;
  const { header } = page;
  const portrait = content.pages.home.hero.portrait;
  const h1 = heading(header.title, "cp-poster__title");
  Object.assign(h1.dataset, { part: "page.title", ref: "about" });
  h1.id = "cp-poster-title";
  const actions = header.actions.map((action) => ({ label: action.label, url: action.href }));
  const tag = h(
    "p",
    { class: "cp-poster__tag", "aria-hidden": "true" },
    copy.about.tag.map((word) => h("span", null, word)),
  );
  bar(tag, 4, 8);
  const poster = bar(
    h(
      "section",
      { class: "cp-poster", "aria-labelledby": "cp-poster-title" },
          scrap("tomato", "torn", "cp-poster__a"),
          scrap("plum", "stairs", "cp-poster__b"),
          scrap("mustard", "tri", "cp-poster__c"),
          scrap("bone", "strip", "cp-poster__d"),
          scrap("pine", "dot", "cp-poster__e"),
          h(
            "figure",
            { class: "cp-poster__portrait" },
            h("img", { src: portrait.src, alt: portrait.alt, decoding: "async" }),
          ),
          header.eyebrow ? h("p", { class: "cp-kicker", ...part("page.eyebrow", "about") }, header.eyebrow) : null,
          h1,
          header.intro ? h("p", { class: "cp-poster__intro", ...part("page.intro", "about") }, header.intro) : null,
          tag,
        ),
    2,
  );
  tag.removeAttribute("data-beat");
  return {
    el: screen(
      "about",
      h(
        "div",
        { class: "cp-about" },
        poster,
        bar(
          h(
            "article",
            { class: "cp-about__body", "aria-label": copy.about.body },
            prose(page.html, "", part("page.body", "about")),
            buttons(actions, "", part("page.actions", "about")),
          ),
          2,
          2,
        ),
      ),
    ),
    heading: h1,
  };
}

/* ── resume: the credits ─────────────────────────────────── */

function resume(content: SiteContent, copy: Copy): Screen {
  const page = content.pages.resume;
  const { h1, head } = pageHead(page.header, "resume", "cp-cv");
  head.append(
    h(
      "ul",
      { class: "cp-chips", ...part("page.actions", "resume") },
      page.header.actions.map((item) => h("li", null, link(item.href, { class: "cp-chipbtn" }, item.label))),
    ),
  );

  const { spans, now } = modelFor(content);
  const sides = h("div", { class: "cp-cv__sides" });
  let sideIndex = 0;
  let cutIndex = 0;
  const side = (name: string | null, attrs: Record<string, string | undefined> = {}) => {
    const body = h("div", { class: "cp-side__body" });
    const el = name === null
      ? h("section", { class: "cp-side", ...attrs }, body)
      : h(
          "section",
          { class: "cp-side", style: `--note:${noteVar(noteAt(sideIndex * 2).id)}`, ...attrs },
          h(
            "h2",
            { class: "cp-side__title" },
            h("span", { class: "cp-side__letter" }, fill(copy.resume.side, { letter: String.fromCharCode(65 + sideIndex) })),
            h("span", { class: "cp-side__name" }, name),
          ),
          body,
        );
    if (name !== null) sideIndex += 1;
    sides.append(el);
    return body;
  };
  const proseOf = (...nodes: Child[]) => h("div", { class: "cp-prose" }, ...nodes);
  // a role or a course is a numbered cut: what, where, when, then its lines
  const cut = (entry: ResumeEntry, kind: "resume.role" | "resume.education") => {
    cutIndex += 1;
    const role = entry.title ?? entry.org ?? "";
    const where = entry.title ? entry.org : undefined;
    const lines: Child[] = [
      entry.summary ? h("p", null, inline(entry.summary, makeLink)) : null,
      entry.bullets.length
        ? h("ul", null, entry.bullets.map((bullet) => h("li", null, inline(bullet, makeLink))))
        : null,
    ];
    const el = h(
      "article",
      { class: "cp-cut", ...part(kind, entry.id) },
      h("span", { class: "cp-cut__no", "aria-hidden": "true" }, String(cutIndex).padStart(2, "0")),
      h("h3", { class: "cp-cut__title" }, role, where ? h("span", { class: "cp-cut__where" }, ` · ${where}`) : null),
      entry.dateLine ? h("p", { class: "cp-cut__when" }, entry.dateLine) : null,
      lines.some(Boolean) ? proseOf(lines) : null,
    );
    // a credit sounds the chords where it starts and ends
    const dated = spans.find((span) => span.entry.id === entry.id);
    listen(el, `span:${entry.id}`, () => spanPhrase(dated ?? { start: now, end: now }));
    return el;
  };

  const { experience, education, tools } = content.resume;
  side(experience.title).append(...experience.roles.map((role) => cut(role, "resume.role")));
  side(education.title).append(...education.entries.map((entry) => cut(entry, "resume.education")));
  side(tools.title).append(proseOf(h("p", { ...part("resume.tools") }, tools.sentence)));
  // the free body: each h2 starts a side of its own
  let body: HTMLElement | undefined;
  for (const block of blocks(page.html)) {
    adopt(block);
    if (block.tagName === "H2") {
      body = side(block.textContent ?? "", part("page.body", "resume"));
      continue;
    }
    body ??= side(null, part("page.body", "resume"));
    let box = body.querySelector<HTMLElement>(":scope > .cp-prose");
    if (!box) body.append((box = proseOf()));
    box.append(block);
  }

  bar(head, 2);
  bar(sides, 2, 4);
  return {
    el: screen("resume", h("div", { class: "cp-cv" }, head, h("section", { class: "cp-cv__setlist", "aria-label": copy.resume.credits }, sides))),
    heading: h1,
  };
}

/* ── anything else: a sheet on the music stand ───────────── */

function sheet(route: Route, copy: Copy): Screen {
  const paper = h("div", { class: "cp-sheet__paper" }, fallbackBody(route));
  let h1 = paper.querySelector<HTMLElement>("h1");
  if (!h1) {
    h1 = heading(route.title.split("|")[0].trim(), "cp-sheet__title");
    paper.prepend(h1);
  }
  h1.setAttribute("tabindex", "-1");
  return {
    el: screen(
      "other",
      bar(
        h(
          "div",
          { class: "cp-sheet" },
          h(
            "div",
            { class: "cp-sheet__stand", "aria-hidden": "true" },
            h("span", null, copy.sheet.label),
            h("b", null, route.path),
            h("span", null, copy.sheet.stand),
          ),
          paper,
        ),
        2,
      ),
    ),
    heading: h1,
  };
}

export function buildScreen(
  route: Route,
  content: SiteContent,
  options: ScreenOptions,
): Screen {
  const copy = content.lenses["cut-paper"];
  switch (route.kind) {
    case "home":
      return home(content, copy, options);
    case "projects":
      return projects(content, copy, options);
    case "project": {
      const item = content.projects.find((entry) => entry.slug === route.slug);
      return item ? project(content, copy, item) : sheet(route, copy);
    }
    case "lab":
      return lab(content, copy);
    case "lab-entry": {
      const item = content.lab.find((entry) => entry.slug === route.slug && entry.hasPage);
      return item ? labEntry(content, copy, item) : sheet(route, copy);
    }
    case "about":
      return about(content, copy);
    case "resume":
      return resume(content, copy);
    default:
      return sheet(route, copy);
  }
}
