/** Screens: what sits on the stage for each route. Home is the play screen,
 * projects a sequencer arrangement, a project its album sleeve and liner
 * notes, the lab a drawer of presets, about a torn jazz poster, the resume
 * the credits, and anything else a sheet of music clipped to the stand. */
import type { Route, SiteContent } from "../types";
import { h, link, markup, seeded, take, text, type Child } from "./dom";
import { noteAt, NOTES, noteVar, yearPosition } from "./notes";

export interface Screen {
  el: HTMLElement;
  heading: HTMLElement;
}

/** Things worth remembering between routes (home's "currently" note). */
export interface Memory {
  current?: Element;
}

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

/** Scrub cloned server markup of things that would dangle in a new home. */
function adopt(fragment: DocumentFragment | Element) {
  fragment.querySelectorAll("[aria-labelledby]").forEach((node) => node.removeAttribute("aria-labelledby"));
  fragment.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  return fragment;
}

function prose(from: Element | null | undefined, extra = "") {
  if (!from) return null;
  return h("div", { class: `cp-prose ${extra}`.trim() }, adopt(take(from)));
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

function credits(rows: [string, string | undefined][]) {
  return h(
    "dl",
    { class: "cp-credits" },
    rows
      .filter(([, value]) => value)
      .map(([term, value]) =>
        h("div", { class: "cp-credits__row" }, h("dt", null, term), h("dd", null, value ?? "")),
      ),
  );
}

const buttons = (items: { label: string; url: string }[], extra = "") =>
  items.length
    ? h(
        "ul",
        { class: `cp-buttons ${extra}`.trim() },
        items.map((item, index) =>
          h("li", null, link(item.url, { class: index === 0 ? "cp-btn cp-btn--lit" : "cp-btn" }, item.label)),
        ),
      )
    : null;

/* ── home: the play screen ───────────────────────────────── */

function home(route: Route, content: SiteContent, memory: Memory): Screen {
  const { main } = route;
  const page = content.pages.home;
  const greeting = text(main.querySelector(".greeting")) || "Hey there!";
  const title = text(main.querySelector("h1")) || page.headline || "Burooj here!";
  const role = text(main.querySelector(".occupation")) || page.eyebrow || "Frontend developer";
  const intro = text(main.querySelector(".welcome")) || page.intro || "";
  const portrait = main.querySelector<HTMLImageElement>(".hello img");
  const current = main.querySelector(".current-copy");
  if (current) memory.current = current.cloneNode(true) as Element;

  const h1 = heading(title, "cp-home__title");
  const socials = [
    ...content.site.social.map((item) => ({ label: item.label, url: item.href })),
    { label: "Resume", url: "/resume" },
  ];

  const hero = h(
    "section",
    { class: "cp-home__hero", "aria-labelledby": "cp-home-title" },
    scrap("tomato", "torn", "cp-home__scrap-a"),
    scrap("plum", "stairs", "cp-home__scrap-b"),
    scrap("mustard", "tri", "cp-home__scrap-c"),
    h(
      "figure",
      { class: "cp-portrait" },
      h("img", {
        src: portrait?.getAttribute("src") ?? "/images/burooj4.jpg",
        alt: portrait?.getAttribute("alt") ?? "Burooj Rashid",
        width: 1080,
        height: 1920,
        decoding: "async",
      }),
    ),
    kicker(greeting),
    h1,
    h("p", { class: "cp-home__role" }, role),
    h("p", { class: "cp-home__intro" }, intro),
    h(
      "ul",
      { class: "cp-chips", "aria-label": "Elsewhere" },
      socials.map((item) => h("li", null, link(item.url, { class: "cp-chipbtn" }, item.label))),
    ),
  );
  h1.id = "cp-home-title";

  // the deck: the featured record on the platter, the rest in the crate
  const featured = content.projects.filter((project) => project.featured);
  const records = featured.length ? featured : content.projects.slice(0, 4);
  const first = records[0];
  const record = h("div", { class: "cp-record" }, h("span", { class: "cp-record__label" }));
  const deckWhen = h("p", { class: "cp-deck__when" });
  const deckLink = h("a", { class: "cp-deck__link" });
  const deckSum = h("p", { class: "cp-deck__sum" });
  const deckButton = h("a", { class: "cp-btn cp-btn--lit" }, "Liner notes");
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
    h("span", { class: "cp-turntable__speed" }, "33⅓"),
  );

  const sleeves: HTMLAnchorElement[] = [];
  const cue = (project: Project) => {
    record.style.setProperty("--cover", `url("${project.cover}")`);
    record.style.setProperty(
      "--note",
      noteVar(noteAt(content.projects.indexOf(project)).id),
    );
    deckWhen.textContent = `${project.dateLabel} · ${project.role}`;
    deckLink.textContent = project.title;
    deckLink.href = project.href;
    deckSum.textContent = project.summary;
    deckButton.href = project.href;
    deckButton.setAttribute("aria-label", `Liner notes: ${project.title}`);
    sleeves.forEach((sleeve) => {
      sleeve.dataset.state = sleeve.dataset.slug === project.slug ? "playing" : "rest";
    });
    turntable.dataset.cue = project.slug;
  };

  const deck = h(
    "section",
    { class: "cp-deck", "aria-labelledby": "cp-deck-title" },
    h("h2", { class: "cp-label", id: "cp-deck-title" }, "Now spinning"),
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
        h("img", { class: "cp-sleeve__art", src: project.cover, alt: "", loading: "lazy", decoding: "async" }),
        h(
          "span",
          { class: "cp-sleeve__copy" },
          h("span", { class: "cp-sleeve__title" }, project.title),
          h("span", { class: "cp-sleeve__meta" }, `${project.dateLabel} · ${project.tags[0]?.replace(/-/g, " ") ?? project.kind}`),
        ),
        h("span", { class: "cp-sleeve__side", "aria-hidden": "true" }, `A${index + 1}`),
      );
      sleeves.push(sleeve);
      sleeve.addEventListener("pointerenter", () => cue(project));
      sleeve.addEventListener("focus", () => cue(project));
      return h("li", null, sleeve);
    }),
  );

  const noteCopy = memory.current?.cloneNode(true) as Element | undefined;
  const crate = h(
    "section",
    { class: "cp-crate", "aria-labelledby": "cp-crate-title" },
    h("h2", { class: "cp-label", id: "cp-crate-title" }, "In the crate"),
    crateList,
    h(
      "a",
      { class: "cp-crate__all", href: "/projects" },
      "Full setlist",
      h("span", { class: "cp-crate__count" }, String(content.projects.length)),
    ),
    noteCopy
      ? h(
          "aside",
          { class: "cp-note", "aria-label": "Currently" },
          h("span", { class: "cp-note__tape", "aria-hidden": "true" }),
          h("div", { class: "cp-note__copy" }, adopt(noteCopy)),
        )
      : null,
  );

  cue(first);
  return {
    el: screen("home", h("div", { class: "cp-home" }, hero, deck, crate)),
    heading: h1,
  };
}

/* ── projects: the arrangement ───────────────────────────── */

const FROM = 2021;
const TO = 2027.5;
const place = (year: number) => Math.min(Math.max((year - FROM) / (TO - FROM), 0), 1);
const NOW = (() => {
  const date = new Date();
  return date.getFullYear() + date.getMonth() / 12 + date.getDate() / 365;
})();

function pageHead(route: Route, fallback: { eyebrow: string; title: string }, className: string) {
  const main = route.main;
  const title = text(main.querySelector("h1")) || fallback.title;
  const intro = text(main.querySelector(".page-header__intro"));
  const h1 = heading(title, `${className}__title`);
  return {
    h1,
    head: h(
      "header",
      { class: `${className}__head` },
      kicker(text(main.querySelector(".page-header__eyebrow")) || fallback.eyebrow),
      h1,
      intro ? h("p", { class: `${className}__intro` }, intro) : null,
    ),
  };
}

function projects(route: Route, content: SiteContent): Screen {
  const { h1, head } = pageHead(route, { eyebrow: "Projects", title: "Projects" }, "cp-seq");
  const years: number[] = [];
  for (let year = FROM; year <= Math.floor(TO); year += 1) years.push(year);

  const ruler = h(
    "div",
    { class: "cp-seq__ruler", "aria-hidden": "true" },
    h("span", { class: "cp-seq__ruler-head" }, "track"),
    h(
      "span",
      { class: "cp-seq__ruler-lane" },
      years.map((year) =>
        h(
          "span",
          { class: "cp-seq__bar", style: `--at:${place(year)}` },
          h("b", null, String(year)),
          h("small", null, `'${String(year).slice(2)}`),
        ),
      ),
    ),
  );

  const tracks = h(
    "ol",
    { class: "cp-seq__tracks" },
    content.projects.map((project, index) => {
      const note = noteAt(index);
      const at = yearPosition(project.dateLabel, project.year);
      return h(
        "li",
        { class: "cp-track", style: `--note:${noteVar(note.id)}; --at:${place(at)}; --len:${0.85 / (TO - FROM)}` },
        h(
          "a",
          { class: "cp-track__link", href: project.href, "data-state": "rest" },
          h(
            "span",
            { class: "cp-track__head" },
            h("span", { class: "cp-track__no", "aria-hidden": "true" }, String(index + 1).padStart(2, "0")),
            h("img", { class: "cp-track__art", src: project.cover, alt: "", loading: "lazy", decoding: "async" }),
            h(
              "span",
              { class: "cp-track__copy" },
              h("span", { class: "cp-track__title" }, project.title),
              h("span", { class: "cp-track__meta" }, `${project.dateLabel} · ${project.kind}`),
              h("span", { class: "cp-track__sum" }, project.summary),
              project.tools.length
                ? h("span", { class: "cp-track__tools" }, project.tools.join(" · "))
                : null,
            ),
          ),
          h(
            "span",
            { class: "cp-track__lane", "aria-hidden": "true" },
            h(
              "span",
              { class: "cp-clip" },
              h("span", { class: "cp-clip__name" }, project.title),
              roll(project.slug),
            ),
          ),
        ),
      );
    }),
  );

  const arrangement = h(
    "div",
    { class: "cp-seq__arrangement", style: `--now:${place(NOW)}` },
    ruler,
    tracks,
    h(
      "span",
      { class: "cp-seq__playhead", "aria-hidden": "true" },
      h("span", { class: "cp-seq__now" }, "now"),
    ),
  );
  const trail = text(route.main.querySelector(".timeline")?.previousElementSibling);
  return {
    el: screen(
      "projects",
      h(
        "div",
        { class: "cp-seq" },
        head,
        h(
          "section",
          { class: "cp-seq__body", "aria-label": "Setlist, newest first" },
          h(
            "div",
            { class: "cp-seq__bar-tape", "aria-hidden": "true" },
            NOTES.map((n) => h("i", { style: `--note:${noteVar(n.id)}` })),
          ),
          trail ? h("p", { class: "cp-seq__trail" }, trail) : null,
          arrangement,
        ),
      ),
    ),
    heading: h1,
  };
}

/* ── a project: the sleeve and its liner notes ───────────── */

function project(route: Route, content: SiteContent, item: Project): Screen {
  const index = content.projects.indexOf(item);
  const note = noteAt(index);
  const h1 = heading(item.title, "cp-liner__title");
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
      h("span", { class: "cp-sleeve-art__label", style: `background-image:url("${item.cover}")` }),
    ),
    h(
      "figure",
      { class: "cp-sleeve-art__cover" },
      h("img", {
        src: item.cover,
        alt: item.media[0]?.alt ?? `${item.title} cover`,
        decoding: "async",
      }),
      h("figcaption", { class: "cp-sleeve-art__stamp" }, h("span", null, "Burooj"), h("b", null, item.title)),
    ),
    scrap(BRAND[index % 4], "tri", "cp-sleeve-art__scrap-a"),
    scrap(BRAND[(index + 1) % 4], "torn", "cp-sleeve-art__scrap-b"),
  );

  const transport = h(
    "nav",
    { class: "cp-transport", "aria-label": "Neighbouring tracks" },
    prev
      ? h("a", { class: "cp-transport__btn", href: prev.href, rel: "prev" },
          h("span", { "aria-hidden": "true" }, "⏮"), h("span", { class: "cp-transport__txt" }, h("small", null, "prev"), prev.title))
      : h("span", { class: "cp-transport__btn", "data-state": "off" }, h("span", { "aria-hidden": "true" }, "⏮"), h("span", { class: "cp-transport__txt" }, h("small", null, "first track"))),
    h("span", { class: "cp-transport__no" }, `track ${trackNo}`),
    next
      ? h("a", { class: "cp-transport__btn cp-transport__btn--next", href: next.href, rel: "next" },
          h("span", { class: "cp-transport__txt" }, h("small", null, "next"), next.title), h("span", { "aria-hidden": "true" }, "⏭"))
      : h("span", { class: "cp-transport__btn cp-transport__btn--next", "data-state": "off" }, h("span", { class: "cp-transport__txt" }, h("small", null, "last track")), h("span", { "aria-hidden": "true" }, "⏭")),
  );

  const notes = h(
    "article",
    { class: "cp-liner__notes", "aria-labelledby": "cp-liner-title" },
    kicker(h("a", { href: "/projects" }, "Setlist"), ` · track ${trackNo} · ${item.kind}`),
    h1,
    h("p", { class: "cp-liner__lede" }, item.summary),
    h("h2", { class: "cp-label" }, "Credits"),
    credits([
      ["Role", item.role],
      ["Where", item.location],
      ["When", item.dateLabel],
      ["Tools", item.tools.join(", ") || undefined],
      ["Filed", item.tags.map((tag) => tag.replace(/-/g, " ")).join(", ") || undefined],
    ]),
    buttons(item.links),
    h("h2", { class: "cp-label" }, "Liner notes"),
    prose(route.main.querySelector(".prose")),
    media.length
      ? h(
          "div",
          { class: "cp-liner__inserts" },
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
    h("a", { class: "cp-back", href: "/projects" }, h("span", { "aria-hidden": "true" }, "←"), " Back to the setlist"),
  );
  h1.id = "cp-liner-title";

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

function lab(route: Route, content: SiteContent): Screen {
  const { h1, head } = pageHead(route, { eyebrow: "Lab", title: "Lab" }, "cp-lab");
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
          h("p", { class: "cp-preset__meta" }, `${item.type} · ${item.sourceEra}`),
          h("h2", { class: "cp-preset__title" }, link(target, { class: "cp-preset__link" }, item.title)),
          h("p", { class: "cp-preset__sum" }, item.summary),
        ),
        h("span", { class: "cp-preset__apply", "aria-hidden": "true" }, item.href ? "open" : "apply"),
      );
    }),
  );
  const more = route.main.querySelector(".lab-more");
  const aside = route.main.querySelector(".lab-aside");
  return {
    el: screen(
      "lab",
      h(
        "div",
        { class: "cp-lab" },
        head,
        h(
          "section",
          { class: "cp-drawer", "aria-label": "Presets" },
          h(
            "div",
            { class: "cp-drawer__tabs", "aria-hidden": "true" },
            ["anim", "freq", "color", "popup", "scope"].map((tab, i) =>
              h("span", { class: "cp-drawer__tab", "data-state": i === 0 ? "on" : "off" }, tab),
            ),
            h("span", { class: "cp-drawer__count" }, String(content.lab.length).padStart(2, "0")),
          ),
          presets,
        ),
        more || aside
          ? h(
              "div",
              { class: "cp-lab__more" },
              more ? prose(more, "cp-lab__more-link") : null,
              aside ? prose(aside) : null,
            )
          : null,
      ),
    ),
    heading: h1,
  };
}

function labEntry(route: Route, content: SiteContent, item: LabItem): Screen {
  const index = content.lab.indexOf(item);
  const h1 = heading(item.title, "cp-liner__title");
  h1.id = "cp-liner-title";
  const hasPage = !!route.main.querySelector(".entry-page");
  const links = [...(item.href ? [{ label: "Open the sketch", url: item.href }] : []), ...item.links];
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
        h(
          "article",
          { class: "cp-liner__notes", "aria-labelledby": "cp-liner-title" },
          kicker(h("a", { href: "/lab" }, "Lab"), ` · preset ${String(index + 1).padStart(2, "0")}`),
          h1,
          h("p", { class: "cp-liner__lede" }, item.summary),
          credits([
            ["Type", item.type],
            ["Era", item.sourceEra],
          ]),
          buttons(links),
          hasPage ? prose(route.main.querySelector(".prose")) : null,
          h("a", { class: "cp-back", href: "/lab" }, h("span", { "aria-hidden": "true" }, "←"), " Back to the presets"),
        ),
      ),
    ),
    heading: h1,
  };
}

/* ── about: a torn jazz poster ───────────────────────────── */

function about(route: Route, content: SiteContent): Screen {
  const { main } = route;
  const title = text(main.querySelector("h1")) || content.pages.about.title;
  const h1 = heading(title, "cp-poster__title");
  h1.id = "cp-poster-title";
  const actions = [...main.querySelectorAll<HTMLAnchorElement>(".page-header__actions a")].map((anchor) => ({
    label: text(anchor),
    url: anchor.getAttribute("href") ?? "/",
  }));
  return {
    el: screen(
      "about",
      h(
        "div",
        { class: "cp-about" },
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
            h("img", { src: "/images/burooj4.jpg", alt: "Burooj Rashid wearing round sunglasses", decoding: "async" }),
          ),
          kicker(text(main.querySelector(".page-header__eyebrow")) || "About"),
          h1,
          h("p", { class: "cp-poster__intro" }, text(main.querySelector(".page-header__intro")) || content.pages.about.description),
          h("p", { class: "cp-poster__tag", "aria-hidden": "true" }, "Play. Build. Repeat."),
        ),
        h(
          "article",
          { class: "cp-about__body", "aria-label": "About Burooj" },
          prose(main.querySelector(".prose")),
          buttons(actions),
        ),
      ),
    ),
    heading: h1,
  };
}

/* ── resume: the credits ─────────────────────────────────── */

function resume(route: Route, content: SiteContent): Screen {
  const { h1, head } = pageHead(route, { eyebrow: "Resume", title: content.site.name }, "cp-cv");
  const contacts = [...route.main.querySelectorAll<HTMLAnchorElement>(".page-header__actions a")].map((anchor) => ({
    label: text(anchor),
    url: anchor.getAttribute("href") ?? "/",
  }));
  head.append(
    h(
      "ul",
      { class: "cp-chips" },
      contacts.map((item) => h("li", null, link(item.url, { class: "cp-chipbtn" }, item.label))),
    ),
  );

  const source = route.main.querySelector(".prose");
  const sides = h("div", { class: "cp-cv__sides" });
  let side: HTMLElement | undefined;
  let body: HTMLElement | undefined;
  let cut: HTMLElement | undefined;
  let sideIndex = 0;
  let cutIndex = 0;
  const children = source ? [...source.children] : [];
  for (const child of children) {
    adopt(child);
    if (child.tagName === "H2") {
      body = h("div", { class: "cp-side__body" });
      side = h(
        "section",
        { class: "cp-side", style: `--note:${noteVar(noteAt(sideIndex * 2).id)}` },
        h(
          "h2",
          { class: "cp-side__title" },
          h("span", { class: "cp-side__letter" }, `Side ${String.fromCharCode(65 + sideIndex)}`),
          h("span", { class: "cp-side__name" }, text(child)),
        ),
        body,
      );
      sideIndex += 1;
      cut = undefined;
      sides.append(side);
      continue;
    }
    if (!body) {
      body = h("div", { class: "cp-side__body" });
      sides.append(h("section", { class: "cp-side" }, body));
    }
    if (child.tagName === "H3") {
      cutIndex += 1;
      const [role, place] = text(child).split(" · ");
      cut = h(
        "article",
        { class: "cp-cut" },
        h("span", { class: "cp-cut__no", "aria-hidden": "true" }, String(cutIndex).padStart(2, "0")),
        h("h3", { class: "cp-cut__title" }, role, place ? h("span", { class: "cp-cut__where" }, ` · ${place}`) : null),
      );
      body.append(cut);
      continue;
    }
    const em = child.tagName === "P" && child.children.length === 1 && child.firstElementChild?.tagName === "EM" && text(child) === text(child.firstElementChild);
    if (cut && em && !cut.querySelector(".cp-cut__when")) {
      cut.append(h("p", { class: "cp-cut__when" }, text(child)));
      continue;
    }
    const target = cut ?? body;
    let proseBox = target.querySelector<HTMLElement>(":scope > .cp-prose");
    if (!proseBox) {
      proseBox = h("div", { class: "cp-prose" });
      target.append(proseBox);
    }
    proseBox.append(child);
  }

  return {
    el: screen("resume", h("div", { class: "cp-cv" }, head, h("section", { class: "cp-cv__setlist", "aria-label": "Credits" }, sides))),
    heading: h1,
  };
}

/* ── anything else: a sheet on the music stand ───────────── */

function sheet(route: Route): Screen {
  const paper = h("div", { class: "cp-sheet__paper" }, take(route.main));
  let h1 = paper.querySelector<HTMLElement>("h1");
  if (!h1) {
    h1 = heading(route.title.split("|")[0].trim() || "Sheet", "cp-sheet__title");
    paper.prepend(h1);
  }
  h1.setAttribute("tabindex", "-1");
  return {
    el: screen(
      "other",
      h(
        "div",
        { class: "cp-sheet" },
        h(
          "div",
          { class: "cp-sheet__stand", "aria-hidden": "true" },
          h("span", null, "sheet"),
          h("b", null, route.path),
          h("span", null, "clipped to the stand"),
        ),
        paper,
      ),
    ),
    heading: h1,
  };
}

export function buildScreen(route: Route, content: SiteContent, memory: Memory): Screen {
  switch (route.kind) {
    case "home":
      return home(route, content, memory);
    case "projects":
      return projects(route, content);
    case "project": {
      const item = content.projects.find((entry) => entry.slug === route.slug);
      return item ? project(route, content, item) : sheet(route);
    }
    case "lab":
      return lab(route, content);
    case "lab-entry": {
      const item = content.lab.find((entry) => entry.slug === route.slug);
      return item ? labEntry(route, content, item) : sheet(route);
    }
    case "about":
      return about(route, content);
    case "resume":
      return resume(route, content);
    default:
      return sheet(route);
  }
}
