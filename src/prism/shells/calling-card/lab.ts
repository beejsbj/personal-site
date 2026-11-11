/** The lab as a request board. On the Bench the requests still open are
 * pinned at angles, the featured one across the top of the board like the
 * big target; on the Shelf the ones gone quiet stand in rows, each on its
 * plank. Under them the Labbook turns the calendar back (labbook.ts). A
 * lab entry is the request's full brief: what it became, its pictures, its
 * notes and its own days. */
import type { Route, SiteContent } from "../types";
import { markPart, part } from "../../parts";
import { experimentUpdates, newestFirst } from "../../../lib/labbook";
import { graduatedProject, labPlaces } from "../../../lib/rules";
import { fill } from "../rich";
import {
  type Copy,
  type Env,
  type Screen,
  backLink,
  copyOf,
  frame,
  linkVerb,
  prompts,
  roving,
  screenTitle,
  tapCue,
  tabs,
} from "./chrome";
import { concentricStar, h, prose, ransom } from "./dom";
import { record, tendRecord } from "./labbook";
import { other } from "./other";

type Experiment = SiteContent["lab"][number];

let rememberedLab = 0;
/** A brief was the last thing open: going back, the board is turned to
 * the request it was opened from. */
let fromBrief = false;

/** Where a request card goes: the entry's own page when it has one, else
 * the live experiment. */
const primaryHref = (entry: Experiment) => entry.detail;
const isExternal = (href: string) => /^https?:\/\//.test(href);

/** The requests in the board's order: the Bench, then the Shelf, the
 * featured one first. A request keeps its number on its own page. */
const board = (content: SiteContent) => labPlaces(content.lab);

function requestNo(copy: Copy, i: number) {
  return fill(copy.lab.number, { n: String(i + 1).padStart(2, "0") });
}

/** How far each card is turned on its pin, in degrees. */
const TILTS = [-1.8, 1.2, -0.7, 2, -1.3, 0.8];
/** The cards arrive one after another, the first few: the rest are below
 * the board's edge and come together. */
const STAGGER = 8;

/** A request, pinned to the board: its number, whether it is still open,
 * its name, what it is and where Accept takes you. */
function request(copy: Copy, entry: Experiment, n: number) {
  const href = primaryHref(entry);
  const external = isExternal(href);
  const pinned = entry.place === "bench";
  return h(
    "a",
    {
      class: "cc-request",
      href,
      style: `--i:${Math.min(n, STAGGER)};--tilt:${TILTS[n % TILTS.length]}deg`,
      "data-place": entry.place,
      "data-cc-title": entry.title,
      ...(external ? { rel: "noreferrer" } : {}),
    },
    h("span", { class: "cc-request__no", "aria-hidden": "true" }, requestNo(copy, n)),
    h("span", { class: "cc-request__status", "aria-hidden": "true" }, copy.lab.status[entry.place]),
    h(
      "span",
      { class: "cc-request__title", ...part("lab.title", entry.slug) },
      pinned ? ransom(entry.title, { boxes: 0.14, salt: n }) : entry.title,
    ),
    h("span", { class: "cc-request__summary", ...part("lab.summary", entry.slug) }, entry.summary),
    h(
      "span",
      { class: "cc-request__accept" },
      h("kbd", { "aria-hidden": "true" }, "⏎"),
      " ",
      h(
        "span",
        {},
        external ? copy.lab.accept.external : copy.lab.accept.page,
        external ? h("span", { "aria-hidden": "true" }, " ↗") : null,
      ),
    ),
    tapCue(copy.lab.accept.tap),
  );
}

export function lab(route: Route, env: Env): Screen {
  const { content } = env;
  const copy = copyOf(content);
  const { header, places, labbook } = content.pages.lab;
  const { el, main } = frame(route.kind, "cc-requests");
  const { wrap, heading } = screenTitle(copy.sections.lab, header.title, copy.lab.eyebrow, "lab");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-requests__curtain" }),
    h("span", { class: "cc-requests__star" }, concentricStar(["#8c8c8c", "#e5191c", "#0a0a0a", "#e5191c"])),
  );

  const cards: HTMLAnchorElement[] = [];
  const rooms = board(content).map(({ place, entries }) => {
    const id = `cc-place-${place}`;
    return h(
      "section",
      { class: "cc-place", "data-lab-place": place, "aria-labelledby": id },
      h(
        "header",
        { class: "cc-place__head" },
        h("h2", { class: "cc-place__title", id }, places[place].title),
        h("p", { class: "cc-place__note" }, places[place].note),
      ),
      h(
        "ol",
        { class: "cc-place__list", "aria-labelledby": id },
        entries.map((entry, i) => {
          const card = request(copy, entry, cards.length);
          cards.push(card);
          return h("li", { "data-lab-featured": i === 0 && entry.featured ? "" : null }, card);
        }),
      ),
    );
  });

  // The board turns; the sheet on it is cut at its own edges, so a card
  // swelling or a stamp landing never gives the board somewhere to slide.
  const scroller = h(
    "div",
    { class: "cc-requests__board" },
    h(
      "div",
      { class: "cc-requests__sheet" },
      rooms,
      record(content, newestFirst(content.labbook), "cc-labbook-title", labbook.title, labbook.note),
    ),
  );

  main.append(
    h("div", { class: "cc-requests__head" }, backLink(copy, "/", copy.sections.home), wrap),
    header.intro
      ? h(
          "div",
          { class: "cc-say cc-requests__intro" },
          h("span", { class: "cc-say__name", "aria-hidden": "true" }, copy.lab.speaker),
          h("p", part("page.intro", "lab"), header.intro),
        )
      : "",
    h("div", { class: "cc-requests__col" }, scroller),
    prompts([
      ["↑↓", copy.chrome.prompts.select],
      ["⏎", copy.chrome.prompts.accept],
      ["Q/E", copy.chrome.prompts.section],
      ["Esc", copy.chrome.prompts.back],
    ]),
  );
  el.prepend(tabs(route.kind, copy));

  const menu = cards.length
    ? roving(cards, env.signal, (i) => (rememberedLab = i), Math.min(rememberedLab, cards.length - 1))
    : undefined;
  const { find, land } = tendRecord(el, { signal: env.signal, instant: env.reducedMotion });
  // Arriving by a link to an update: the board is already turned to it
  // when the screen is seen, and it takes the focus the title would.
  const landed = find();
  if (landed) {
    requestAnimationFrame(() => land(undefined, false));
    // The pointer is still where the link was pressed. Until it moves, a
    // card that turns up under it has not been reached for, and does not
    // take the cursor or the focus from the update.
    let resting = true;
    el.addEventListener("pointermove", () => (resting = false), { signal: env.signal, once: true });
    scroller.addEventListener(
      "pointerenter",
      (event) => {
        if (resting) event.stopPropagation();
      },
      { signal: env.signal, capture: true },
    );
  } else if (fromBrief && menu) {
    const card = cards[menu.index];
    requestAnimationFrame(() => card.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }));
  }
  fromBrief = false;

  /** Page keys turn the board when focus sits outside it. */
  const page = (event: KeyboardEvent) => {
    if (event.key !== "PageDown" && event.key !== "PageUp") return false;
    if (scroller.contains(document.activeElement) || scroller.scrollHeight <= scroller.clientHeight) return false;
    scroller.scrollBy({
      top: (event.key === "PageDown" ? 0.85 : -0.85) * scroller.clientHeight,
      behavior: env.reducedMotion ? "auto" : "smooth",
    });
    return true;
  };
  return {
    el,
    heading: landed ?? heading,
    back: el.querySelector<HTMLAnchorElement>(".cc-back")!,
    onKey(event) {
      // The Labbook keeps its own keys: a film's arrows, a prompt's Enter.
      if ((event.target as Element | null)?.closest?.(".cc-log")) return false;
      return menu?.key(event, "both") || page(event);
    },
  };
}

/** A lab entry: the full request brief. Built from the lab data, so it
 * reads even for experiments that only live off-site. */
export function labEntry(route: Route, env: Env): Screen {
  const { content } = env;
  const copy = copyOf(content);
  const { labels } = content.pages.lab.detail;
  const entries = board(content).flatMap((group) => group.entries);
  // Only an entry with its own page has a route here.
  const index = entries.findIndex((entry) => entry.slug === route.slug && entry.hasPage);
  if (index < 0) return other(route, env);
  const entry = entries[index];
  fromBrief = true;
  const { el, main } = frame(route.kind, "cc-brief");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-requests__curtain" }),
    h("span", { class: "cc-requests__star" }, concentricStar(["#8c8c8c", "#e5191c", "#0a0a0a", "#e5191c"])),
  );
  const heading = h(
    "h1",
    { class: "cc-brief__title", tabindex: "-1", ...part("lab.title", entry.slug) },
    ransom(entry.title, { boxes: 0.16, salt: 2 }),
  );
  const back = backLink(copy, "/lab", copy.sections.lab);
  const notes = entry.html ? prose(entry.html) : null;
  if (notes) markPart(notes, "lab.body", entry.slug);
  const links = [
    ...(entry.href ? [{ label: copy.lab.experiment, url: entry.href }] : []),
    ...entry.links,
  ];
  // Its own pictures, or its cover standing in for them.
  const media = entry.media.length
    ? entry.media
    : entry.cover
      ? [{ type: "image" as const, src: entry.cover, alt: "", caption: undefined }]
      : [];
  const became = graduatedProject(entry, content.projects);
  main.append(
    h(
      "article",
      { class: "cc-brief__paper" },
      back,
      h(
        "p",
        { class: "cc-brief__no" },
        fill(copy.lab.brief, { number: requestNo(copy, index) }),
        h("span", {}, copy.lab.status[entry.place]),
      ),
      heading,
      h("p", { class: "cc-brief__summary", ...part("lab.summary", entry.slug) }, entry.summary),
      became
        ? h(
            "p",
            { class: "cc-brief__became", ...part("lab.graduation", entry.slug) },
            h("span", { class: "cc-brief__became-label" }, labels.graduated),
            " ",
            h("a", { class: "cc-brief__became-link", href: became.href, "data-cc-title": became.title }, became.title),
          )
        : null,
      media.length
        ? h(
            "div",
            { class: "cc-brief__media", ...part("lab.media", entry.slug) },
            media.map((item, i) =>
              h(
                "figure",
                { style: `--tilt:${TILTS[i % TILTS.length]}deg` },
                item.type === "video"
                  ? h("video", { src: item.src, controls: true, muted: true, playsinline: true, preload: "metadata", "aria-label": item.alt ?? entry.title })
                  : h("img", { src: item.src, alt: item.alt ?? "", decoding: "async" }),
                item.caption ? h("figcaption", {}, item.caption) : null,
              ),
            ),
          )
        : null,
      notes?.childElementCount ? notes : null,
      links.length
        ? h(
            "ul",
            { class: "cc-shop", "aria-label": copy.lab.links, ...part("lab.links", entry.slug) },
            links.map((link, i) =>
              h("li", { style: `--i:${i}` },
                h("a", { class: "cc-shop__card", href: link.url, rel: "noreferrer", "data-primary": i === 0 ? "" : null },
                  h("span", { class: "cc-shop__verb", "aria-hidden": "true" }, link.url === entry.href ? copy.lab.accept.verb : linkVerb(copy, link.url)),
                  h("span", { class: "cc-shop__label" }, link.label, h("span", { "aria-hidden": "true" }, " ↗")),
                ),
              ),
            ),
          )
        : null,
      record(content, experimentUpdates(content.labbook, entry.slug), "cc-brief-updates", labels.updates),
    ),
    prompts([["Q/E", copy.chrome.prompts.section], ["Esc", copy.chrome.prompts.back]]),
  );
  el.prepend(tabs(route.kind, copy));
  return { el, heading, back };
}
