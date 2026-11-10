/** The Lab's dated record and its news, as this game tells them.
 *
 * The Labbook is the calendar turned back a day at a time: every update is
 * a day plate (month/day, weekday, as the pause menu's calendar writes
 * them) with a dialogue box beside it, whoever sent it named on the box's
 * tab. What an update shows for itself is pinned under its words. A
 * redacted update is a slip of paper with its words cut out: one blank
 * cut-out for each bar of its shape, a stamp, and its kind of work.
 *
 * The wire is the news crawl: the headlines run right to left along a
 * black band, a star between each, under a red tab that says whose news it
 * is. It holds under a pointer, rests for the keyboard, and stands as a
 * list where nothing moves. */
import type { SiteContent } from "../types";
import { part } from "../../parts";
import {
  type Artifact,
  type Update,
  embedSrc,
  labbookAnchor,
  labbookHref,
  penUser,
  relatedLinks,
  updateDateLabel,
} from "../../../lib/labbook";
import { copyOf } from "./chrome";
import { h, parseDay } from "./dom";

type Hidden = Extract<Update, { visibility: "redacted" }>;

/** A path on this site, and nothing that only looks like one. */
const isLocal = (url: string) => /^\/(?!\/)/.test(url);
const isExternal = (href: string) => /^https?:\/\//.test(href);

/** A day as the calendar writes it: the year, 9/26, SAT. Assistive
 * technology is told the date in full. */
function dayPlate(content: SiteContent, date: string) {
  const day = parseDay(date);
  return h(
    "time",
    { class: "cc-day", datetime: date },
    h("span", { class: "cc-sr" }, updateDateLabel(date)),
    h("span", { class: "cc-day__year", "aria-hidden": "true" }, String(day.getUTCFullYear())),
    h(
      "span",
      { class: "cc-day__md", "aria-hidden": "true" },
      String(day.getUTCMonth() + 1),
      h("i", {}, "/"),
      String(day.getUTCDate()),
    ),
    h("span", { class: "cc-day__wd", "aria-hidden": "true" }, copyOf(content).weekdays[day.getUTCDay()]),
  );
}

/* ---------- The wire ---------- */

/** The ticker: every headline, each a link to the first update it is about
 * in the Labbook. The run is laid twice so the crawl has no end; the second
 * is for the eye only. With no headlines there is no wire. */
export function wire(content: SiteContent) {
  const { headlines } = content;
  if (!headlines.length) return null;
  const letters = headlines.reduce((sum, { text }) => sum + text.length, 0);
  // "26 Sep" aloud, 9/26 on the band: the year is the Labbook's to say.
  const when = (date: string) => {
    const day = parseDay(date);
    return h(
      "time",
      { class: "cc-wire__day", datetime: date },
      h("span", { class: "cc-sr" }, updateDateLabel(date).slice(0, 6)),
      h("span", { "aria-hidden": "true" }, `${day.getUTCMonth() + 1}/${day.getUTCDate()}`),
    );
  };
  const item = (headline: (typeof headlines)[number], again: boolean) => [
    when(headline.date),
    h(
      "a",
      {
        class: "cc-wire__link",
        href: labbookHref(headline.updates[0]),
        "data-cc-title": copyOf(content).sections.lab,
        ...(again ? { tabindex: -1 } : {}),
      },
      headline.text,
    ),
  ];
  return h(
    "aside",
    {
      class: "cc-wire",
      "aria-labelledby": "cc-wire-label",
      "data-cc-wire": "",
      style: `--cc-wire-letters:${letters};--cc-wire-items:${headlines.length}`,
    },
    // The band is tilted and runs off the screen's edge; the wire's own
    // box is the window it is seen through, so it widens nothing it sits in.
    h(
      "div",
      { class: "cc-wire__band" },
      h("p", { class: "cc-wire__label", id: "cc-wire-label" }, content.site.ticker.label),
      h(
        "div",
        { class: "cc-wire__strip", "data-cc-wire-strip": "" },
        h(
          "ul",
          { class: "cc-wire__run", "data-cc-wire-run": "" },
          headlines.map((headline) =>
            h("li", { class: "cc-wire__item", ...part("ticker.headline", headline.id) }, item(headline, false)),
          ),
        ),
        h(
          "div",
          { class: "cc-wire__run cc-wire__run--again", "data-cc-wire-run": "", "aria-hidden": "true" },
          headlines.map((headline) => h("span", { class: "cc-wire__item" }, item(headline, true))),
        ),
      ),
    ),
  );
}

/** The wire rests for the keyboard. Its crawl stops at its start in CSS;
 * resting, the strip may scroll, so the headline in focus is brought to
 * the strip's start wherever on the band it lies, and when focus leaves
 * the strip goes back to its own start before the crawl runs on. The strip
 * is moved by hand: asking the browser to bring the headline into view
 * would let it slide the screen under the wire as well. */
export function tendWire(screen: HTMLElement, signal: AbortSignal) {
  screen.addEventListener(
    "focusin",
    (event) => {
      const link = event.target as Element | null;
      const strip = link?.closest?.<HTMLElement>("[data-cc-wire-strip]");
      if (!link || !strip || !link.matches(":focus-visible")) return;
      strip.dataset.ccWireRest = "";
      // The whole headline, its star and its day included, from its
      // beginning; the list that stands still has nowhere to go.
      const item = link.closest<HTMLElement>(".cc-wire__item");
      if (item && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = item.offsetLeft;
    },
    { signal },
  );
  screen.addEventListener(
    "focusout",
    (event) => {
      const strip = (event.target as Element | null)?.closest?.<HTMLElement>("[data-cc-wire-rest]");
      if (!strip || strip.contains(event.relatedTarget as Node | null)) return;
      strip.scrollLeft = 0;
      delete strip.dataset.ccWireRest;
    },
    { signal },
  );
}

/* ---------- The Labbook ---------- */

/** What an update shows for itself. A picture, a film and a sound are
 * pinned where they stand. A Pen or a demo is a dark screen with a prompt
 * on it: nothing is asked of another site until the prompt is pressed
 * (`tendRecord`), when its frame takes the screen whole. Its poster is
 * shown only if it is the site's own: one kept elsewhere would be asked
 * for before the press. */
function artifact(content: SiteContent, shown: Artifact) {
  const copy = content.pages.lab.labbook.artifact;
  const { kind, src, alt } = shown;
  const poster = shown.poster && isLocal(shown.poster) ? shown.poster : undefined;
  if (kind === "image")
    return h("figure", { class: "cc-artifact" }, h("img", { src, alt, loading: "lazy", decoding: "async" }));
  if (kind === "video")
    return h(
      "figure",
      { class: "cc-artifact" },
      h(
        "video",
        { controls: true, muted: true, playsinline: true, preload: "metadata", poster, "aria-label": alt },
        h("source", { src }),
      ),
    );
  if (kind === "sound")
    return h(
      "figure",
      { class: "cc-artifact cc-artifact--sound" },
      h("audio", { controls: true, preload: "none", src, "aria-label": alt }),
      h("figcaption", {}, alt),
    );
  // A frame is another site's page, or one of this site's own: nothing else.
  const frame = embedSrc(shown, penUser(content.site));
  if (!frame || !(frame.startsWith("https://") || isLocal(frame))) return null;
  // Where it lives: the Pen's own page, or the demo itself.
  const home = kind === "pen" ? frame.replace("/embed/", "/pen/").split("?")[0] : src;
  return h(
    "figure",
    { class: "cc-artifact cc-artifact--stage" },
    h(
      "div",
      { class: "cc-stagebox", "data-cc-frame": frame, "data-cc-frame-title": alt },
      poster ? h("img", { class: "cc-stagebox__poster", src: poster, alt, loading: "lazy", decoding: "async" }) : null,
      h(
        "div",
        { class: "cc-stagebox__ask" },
        poster ? null : h("p", { class: "cc-stagebox__label" }, alt),
        h(
          "button",
          { class: "cc-stagebox__load", type: "button", "data-cc-load": "" },
          h("kbd", { "aria-hidden": "true" }, "▶"),
          h("span", {}, copy.load[kind]),
        ),
        h("p", { class: "cc-stagebox__note" }, copy.note),
      ),
    ),
    h(
      "figcaption",
      { class: "cc-artifact__home" },
      h("a", { href: home, rel: "noreferrer" }, copy.open[kind], h("span", { "aria-hidden": "true" }, " ↗")),
    ),
  );
}

/** A redacted update: its day, a slip with one blank cut-out for each bar
 * (a longer number a longer cut-out), the stamp that says what it is, and
 * its kind of work. The site is given the lengths and never the words, and
 * nothing else of the update is read here. */
function censored(content: SiteContent, update: Hidden, attrs: Record<string, string | undefined>) {
  const copy = content.pages.lab.labbook.redacted;
  const { shape } = update;
  return h(
    "li",
    { ...part("update.redacted", update.id), ...attrs, class: "cc-entry cc-entry--censored" },
    dayPlate(content, update.date),
    h(
      "div",
      { class: "cc-entry__slip" },
      h("p", { class: "cc-entry__stamp" }, copy.label),
      h(
        "p",
        { class: "cc-entry__bars", "aria-hidden": "true" },
        shape.bars.map((bar, i) =>
          h("span", { "data-redaction-bar": "", style: `--bar:${Number(bar) || 1};--n:${i}` }),
        ),
      ),
      h("p", { class: "cc-entry__work" }, copy.works[shape.work]),
    ),
  );
}

/** One update on its day: who sent it on the box's tab, its title (a link
 * when it has somewhere to go), its summary and, in the Labbook (`whole`),
 * what it shows for itself and what it is about. On an experiment's own
 * page a title with nowhere else to go leads to the update's place in the
 * Labbook. */
function logged(content: SiteContent, update: Update, i: number, whole: boolean) {
  const copy = content.pages.lab.labbook;
  const attrs = {
    id: whole ? labbookAnchor(update.id) : undefined,
    tabindex: whole ? "-1" : undefined,
    style: `--i:${i}`,
  };
  if (update.visibility !== "open") return censored(content, update, attrs);
  const { updateKinds, updateSources } = content.site;
  const href = update.href ?? (whole ? undefined : labbookHref(update.id));
  const external = !!href && isExternal(href);
  return h(
    "li",
    { ...part("update.item", update.id), ...attrs, class: "cc-entry" },
    dayPlate(content, update.date),
    h(
      "div",
      { class: "cc-entry__box" },
      h(
        "p",
        { class: "cc-entry__origin" },
        `${updateSources[update.source] ?? update.source} · ${updateKinds[update.kind] ?? update.kind}`,
      ),
      h(
        "h3",
        { class: "cc-entry__title" },
        href
          ? h(
              "a",
              { href, "data-cc-title": copyOf(content).sections.lab, ...(external ? { rel: "noreferrer" } : {}) },
              update.title,
              external ? h("span", { "aria-hidden": "true" }, " ↗") : null,
            )
          : update.title,
      ),
      h("p", { class: "cc-entry__summary" }, update.summary),
      whole && update.artifact ? artifact(content, update.artifact) : null,
      ...(whole ? relatedLinks(update, content) : []).map((about) =>
        h(
          "p",
          { class: "cc-entry__about", "data-related": about.kind },
          h("span", {}, copy.related[about.kind]),
          " ",
          h(
            "a",
            { href: about.href, "data-cc-title": about.title, ...(isExternal(about.href) ? { rel: "noreferrer" } : {}) },
            about.title,
            isExternal(about.href) ? h("span", { "aria-hidden": "true" }, " ↗") : null,
          ),
        ),
      ),
    ),
  );
}

/** A stretch of the Labbook, newest first as it is handed over. With a
 * `note` it is the Labbook itself: each update is where its links land.
 * No updates, no record. */
export function record(content: SiteContent, updates: Update[], id: string, title: string, note?: string) {
  if (!updates.length) return null;
  const whole = note !== undefined;
  return h(
    "section",
    { class: "cc-log", "aria-labelledby": id, "data-cc-labbook": whole ? "" : undefined },
    h(
      "header",
      { class: "cc-place__head" },
      h("h2", { class: "cc-place__title", id }, title),
      note ? h("p", { class: "cc-place__note" }, note) : null,
    ),
    h(
      "ol",
      { class: "cc-log__list", "aria-label": content.pages.lab.labbook.listLabel },
      updates.map((update, i) => logged(content, update, i, whole)),
    ),
  );
}

/** The Labbook, answering the visitor.
 *
 * - A Pen or a demo is asked of its own site only when its prompt is
 *   pressed: the frame is made then, in the screen kept for it, and takes
 *   the focus.
 * - A link to an update (`/lab#u-…`, from a headline, the phone or an
 *   experiment's page) lands on its day: the board turns to it and the
 *   menu's cursor points at it (`data-cc-landed`). The page under the shell
 *   holds the same ids, hidden, so the browser's own landing cannot be
 *   relied on. `find` is the update the address names now. */
export function tendRecord(screen: HTMLElement, { signal, instant }: { signal: AbortSignal; instant: boolean }) {
  screen.addEventListener(
    "click",
    (event) => {
      const ask = (event.target as Element | null)?.closest?.("[data-cc-load]");
      const stage = ask?.closest<HTMLElement>("[data-cc-frame]");
      if (!stage?.dataset.ccFrame) return;
      const frame = h("iframe", {
        src: stage.dataset.ccFrame,
        title: stage.dataset.ccFrameTitle ?? "",
        allow: "fullscreen",
      });
      stage.replaceChildren(frame);
      frame.focus();
    },
    { signal },
  );

  const find = (hash = location.hash) => {
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {}
    return id ? screen.querySelector<HTMLElement>(`[data-cc-labbook] [id="${CSS.escape(id)}"]`) : null;
  };
  const land = (hash = location.hash, smooth = !instant) => {
    for (const el of screen.querySelectorAll("[data-cc-landed]")) el.removeAttribute("data-cc-landed");
    const target = find(hash);
    if (!target) return;
    target.setAttribute("data-cc-landed", "");
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: smooth ? "smooth" : "instant" });
  };
  // Back and forward, and an address typed in.
  addEventListener("hashchange", () => land(), { signal });
  addEventListener("popstate", () => land(), { signal });
  // A link on this screen to an update on this screen (a headline on the
  // Lab's own wire): the router moves the address without a word to anyone.
  screen.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href*='#']");
      if (!link || link.target || link.pathname !== location.pathname) return;
      const { hash } = link;
      requestAnimationFrame(() => {
        if (signal.aborted || location.hash !== hash) return;
        land(hash);
        find(hash)?.focus({ preventScroll: true });
      });
    },
    { signal },
  );
  return { find, land };
}
