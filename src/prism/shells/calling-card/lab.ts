/** The lab as the Phantom Thieves' request board, and each experiment a
 * case.
 *
 * On the Bench the requests still open are pinned at angles, the featured
 * one across the top of the board like the big target. Each says what it
 * holds: a picture is an evidence photo clipped to its corner, several are
 * a fan of them, something to play is a screen pinned over it (it plays
 * there when its prompt is pressed, and nothing is asked of another site
 * before), and only words is the request alone, its name cut out large.
 * The Shelf is a different thing: the game's list of cases gone quiet,
 * one row each, a photo cut into its end, the selected row turned white.
 * Under them the Labbook turns the calendar back (labbook.ts).
 *
 * A request's brief is its case file: the request card on the left (its
 * number and stamp, its name, what it asks, when it was last seen, how
 * many reports the Labbook holds, what it became and where to go), its
 * evidence pinned under it, and the report beside it, told with the page's
 * blocks (blocks.ts), then its own days. */
import type { Route, SiteContent } from "../types";
import { markPart, part } from "../../parts";
import { experimentUpdates, newestFirst } from "../../../lib/labbook";
import { graduatedProject, labPlaces, labPrints } from "../../../lib/rules";
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
import { concentricStar, h, parseDay, ransom } from "./dom";
import { holdEscape, report, screen as playScreen, watchFilms } from "./blocks";
import { narrow, record, tendRecord } from "./labbook";
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

/** What a request holds, which decides how it is pinned. */
const holding = (entry: Experiment, prints: string[]) =>
  entry.preview ? "play" : prints.length > 1 ? "prints" : prints.length ? "print" : "words";

/** When a case was last seen: the day of the newest report about it, as
 * the calendar writes it (9/26), said in full aloud. */
function sighting(content: SiteContent, slug: string) {
  const last = experimentUpdates(content.labbook, slug)[0];
  if (!last) return null;
  const day = parseDay(last.date);
  const copy = copyOf(content);
  return h(
    "span",
    { class: "cc-sighting" },
    h("span", { class: "cc-sighting__label" }, copy.lab.lastSeen),
    " ",
    h(
      "time",
      { class: "cc-sighting__day", datetime: last.date },
      h("span", { "aria-hidden": "true" }, `${day.getUTCMonth() + 1}/${day.getUTCDate()} ${copy.weekdays[day.getUTCDay()]}`),
      h("span", { class: "cc-sr" }, `${day.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][day.getUTCMonth()]} ${day.getUTCFullYear()}`),
    ),
  );
}

/** Evidence photos: the first on top, the others fanned out under it. For
 * the eye: the request says it all in words. */
function evidence(prints: string[]) {
  if (!prints.length) return null;
  return h(
    "div",
    { class: "cc-request__evidence", "data-count": prints.length, "aria-hidden": "true" },
    [...prints].reverse().map((src, i, all) =>
      h(
        "div",
        { class: "cc-request__photo", style: `--depth:${all.length - 1 - i}` },
        h("img", { src, alt: "", loading: "lazy", decoding: "async" }),
      ),
    ),
  );
}

/** The screen an experiment plays on where its request is pinned: pressed,
 * it is thrown up big over the board (`data-stage-window`, lab.css). */
function playable(content: SiteContent, entry: Experiment, cover?: string) {
  const play = entry.preview!;
  const copy = content.pages.lab.preview;
  const room = playScreen(`cc-play-${entry.slug}`, {
    title: entry.title,
    poster: cover,
    load: copy.load[play.kind],
    close: copy.close,
    note: copy.note,
    subject: entry.title,
    loading: copy.loading,
    data: { "data-frame": play.frame, "data-stage-window": "" },
  });
  room.classList.add("cc-request__tv");
  markPart(room.querySelector(".cc-tv__bar")!, "lab.preview", entry.slug);
  return room;
}

/** A request, pinned to the board (or listed on the Shelf): its number,
 * whether it is still open, its name, what it is, when it was last seen
 * and where Accept takes you, with what it holds. */
function request(content: SiteContent, entry: Experiment, n: number) {
  const copy = copyOf(content);
  const href = primaryHref(entry);
  const external = isExternal(href);
  const pinned = entry.place === "bench";
  const prints = labPrints(entry);
  const holds = holding(entry, prints);
  const card = h(
    "a",
    {
      class: "cc-request",
      href,
      style: `--i:${Math.min(n, STAGGER)};--tilt:${TILTS[n % TILTS.length]}deg`,
      "data-place": entry.place,
      "data-holds": holds,
      "data-cc-title": entry.title,
      ...(external ? { rel: "noreferrer" } : {}),
    },
    holds === "play" ? null : evidence(pinned ? prints : prints.slice(0, 1)),
    h("span", { class: "cc-request__no", "aria-hidden": "true" }, requestNo(copy, n)),
    h("span", { class: "cc-request__status", "aria-hidden": "true" }, copy.lab.status[entry.place]),
    h(
      "span",
      {
        class: "cc-request__title",
        // Its longest word, so a cut-out word too long for a narrow card
        // is set smaller rather than run off its edge.
        style: `--chars:${Math.max(...entry.title.split(/\s+/).map((word) => word.length))}`,
        ...part("lab.title", entry.slug),
      },
      pinned ? ransom(entry.title, { boxes: holds === "words" ? 0.2 : 0.14, salt: n }) : entry.title,
    ),
    h("span", { class: "cc-request__summary", ...part("lab.summary", entry.slug) }, entry.summary),
    sighting(content, entry.slug),
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
  return { card, holds, tv: holds === "play" ? playable(content, entry, prints[0]) : null };
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
          const { card, holds, tv } = request(content, entry, cards.length);
          cards.push(card);
          return h(
            "li",
            {
              class: "cc-pin",
              "data-holds": holds,
              "data-lab-featured": i === 0 && entry.featured ? "" : null,
              style: `--tilt:${TILTS[(cards.length - 1) % TILTS.length]}deg`,
            },
            card,
            tv,
          );
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
  const held = holdEscape(el, env.signal);
  const { find, land } = tendRecord(el, { signal: env.signal, instant: env.reducedMotion });
  // Narrowed by the address: the board is turned to the Labbook, and the
  // line saying what it shows takes the focus the title would.
  const narrowed = narrow(el);
  const toLabbook = (target: HTMLElement) =>
    requestAnimationFrame(() =>
      target.scrollIntoView({ block: "start", inline: "nearest", behavior: env.reducedMotion ? "instant" : "smooth" }),
    );
  if (narrowed) toLabbook(narrowed);
  // Arriving by a link to an update: the board is already turned to it
  // when the screen is seen, and it takes the focus the title would.
  const landed = narrowed ? null : find();
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
  } else if (fromBrief && menu && !narrowed) {
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
    heading: landed ?? narrowed ?? heading,
    back: el.querySelector<HTMLAnchorElement>(".cc-back")!,
    onKey(event) {
      // A playing screen is put away by Escape, and the board stays.
      if (held(event)) return true;
      // The Labbook keeps its own keys: a film's arrows, a prompt's Enter.
      if ((event.target as Element | null)?.closest?.(".cc-log")) return false;
      return menu?.key(event, "both") || page(event);
    },
    // Narrowed (or shown whole again) by a link on this same screen.
    renew() {
      // Shown whole again, the keyboard goes back to the target it was
      // narrowed by; narrowed, to the line saying what it shows.
      const was = el.querySelector<HTMLElement>("[data-cc-labbook]")?.dataset.narrowed;
      const status = narrow(el);
      const target =
        status ?? (was ? el.querySelector<HTMLElement>(`[data-cc-subject][data-ref="${CSS.escape(was)}"]`) : null);
      if (!target) return;
      toLabbook(target);
      target.focus({ preventScroll: true });
    },
  };
}

/** A lab entry: the request's case file. Built from the lab data, so it
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
    { class: "cc-brief__title", id: "cc-brief-title", tabindex: "-1", ...part("lab.title", entry.slug) },
    ransom(entry.title, { boxes: 0.16, salt: 2 }),
  );
  const back = backLink(copy, "/lab", copy.sections.lab);
  // The report: the page told with its blocks, or its prose alone.
  const page = entry.blocks.length ? entry.blocks : entry.html ? [{ type: "text" as const, html: entry.html }] : [];
  const told = report(content, entry.slug, page);
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
  const pictures = media.filter((item) => item.type === "image").length;
  const holds = media.some((item) => item.type === "video") || pictures > 1 ? "prints" : pictures ? "print" : "words";
  const became = graduatedProject(entry, content.projects);
  const days = experimentUpdates(content.labbook, entry.slug);
  // What the file says of the case, each only when there is something to say.
  const seen = sighting(content, entry.slug);
  const facts: [string, Node | string][] = [
    [copy.lab.file.status, copy.lab.status[entry.place]],
    ...(seen ? [[copy.lab.lastSeen, seen.querySelector("time")!] as [string, Node]] : []),
    ...(days.length ? [[copy.lab.file.intel, fill(copy.lab.file.reports, { n: days.length })] as [string, string]] : []),
  ];
  main.append(
    h(
      "div",
      { class: "cc-brief__file", "data-holds": holds },
      h(
        "article",
        { class: "cc-brief__paper", "aria-labelledby": "cc-brief-title" },
        back,
        h(
          "p",
          { class: "cc-brief__no" },
          fill(copy.lab.brief, { number: requestNo(copy, index) }),
          h("span", {}, copy.lab.status[entry.place]),
        ),
        heading,
        h("p", { class: "cc-brief__summary", ...part("lab.summary", entry.slug) }, entry.summary),
        h(
          "dl",
          { class: "cc-brief__facts" },
          facts.map(([term, value]) => h("div", {}, h("dt", {}, term), h("dd", {}, value))),
        ),
        became
          ? h(
              "p",
              { class: "cc-brief__became", ...part("lab.graduation", entry.slug) },
              h("span", { class: "cc-brief__became-label" }, labels.graduated),
              " ",
              h("a", { class: "cc-brief__became-link", href: became.href, "data-cc-title": became.title }, became.title),
            )
          : null,
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
      ),
      media.length
        ? h(
            "div",
            { class: "cc-brief__media", "data-count": Math.min(media.length, 4), ...part("lab.media", entry.slug) },
            media.map((item, i) =>
              h(
                "figure",
                { class: "cc-photo", style: `--tilt:${TILTS[(i + 1) % TILTS.length]}deg` },
                h(
                  "div",
                  { class: "cc-photo__print" },
                  item.type === "video"
                    ? h("video", { src: item.src, controls: true, muted: true, playsinline: true, preload: "metadata", "aria-label": item.alt ?? entry.title })
                    : h("img", { src: item.src, alt: item.alt ?? "", decoding: "async" }),
                ),
                item.caption ? h("figcaption", { class: "cc-photo__caption" }, item.caption) : null,
              ),
            ),
          )
        : null,
      told || days.length
        ? h(
            "div",
            { class: "cc-brief__report" },
            told,
            record(content, days, "cc-brief-updates", labels.updates),
          )
        : null,
    ),
    prompts([["Q/E", copy.chrome.prompts.section], ["Esc", copy.chrome.prompts.back]]),
  );
  el.prepend(tabs(route.kind, copy));
  watchFilms(el, env.signal, env.reducedMotion);
  const held = holdEscape(el, env.signal);
  return {
    el,
    heading,
    back,
    // A playing screen is put away by Escape, and the brief stays open.
    onKey: (event) => held(event),
  };
}
