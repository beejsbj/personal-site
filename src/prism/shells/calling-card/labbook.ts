/** The Lab's dated record, as this game tells it.
 *
 * The Labbook is the calendar turned back a day at a time: every update is
 * a day plate (month/day, weekday, as the pause menu's calendar writes
 * them) with a dialogue box beside it, whoever sent it named on the box's
 * tab. What an update shows for itself is pinned under its words. A
 * redacted update is a slip of paper with words cut out of its line: a
 * word it shows set as a title's words are, a black cut-out for each bar
 * of its shape, then a stamp and its kind of work.
 *
 * The whole Labbook is kept by month, each month opening on its page of
 * the game's calendar: the month's number large, its name, and its days
 * with the ones written in struck red (for the eye alone: it links
 * nowhere). Above the months, its targets: each experiment and project
 * the Labbook is about, a link that narrows it to that one
 * (`?experiment=` / `?project=`), and back. */
import type { SiteContent } from "../types";
import { part } from "../../parts";
import {
  type Artifact,
  type Narrowing,
  type Update,
  embedSrc,
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
  updateDateLabel,
} from "../../../lib/labbook";
import "../../../lib/block-stage";
import { fill } from "../rich";
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

/* ---------- The Labbook ---------- */

/** What an update shows for itself. A picture, a film and a sound are
 * pinned where they stand. A Pen or a demo is a dark screen with a prompt
 * on it: nothing is asked of another site until the prompt is pressed,
 * when its frame takes the screen whole. That press is answered by the
 * site's one click-to-load stage (src/lib/block-stage.ts), so a Pen or a
 * demo here is put away by another starting, anywhere on the page, and by
 * Escape. The `data-cc-` names stay for this lens's own styling. Its
 * poster is shown only if it is the site's own: one kept elsewhere would
 * be asked for before the press. */
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
    { class: "cc-artifact cc-artifact--stage", "data-stage-room": "" },
    h(
      "div",
      {
        class: "cc-stagebox",
        "data-cc-frame": "",
        "data-block-stage": "",
        "data-artifact-frame": frame,
        "data-artifact-title": alt,
      },
      poster ? h("img", { class: "cc-stagebox__poster", src: poster, alt, loading: "lazy", decoding: "async" }) : null,
      h(
        "div",
        { class: "cc-stagebox__ask", "data-stage-ask": "" },
        poster ? null : h("p", { class: "cc-stagebox__label" }, alt),
        h(
          "button",
          { class: "cc-stagebox__load", type: "button", "data-cc-load": "", "data-artifact-load": "" },
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

/** A redacted update: its day, a slip with its line on it (a word it
 * shows as written, a black cut-out for each bar, a longer number a longer
 * cut-out, flowing and wrapping as a title does), the stamp that says what
 * it is, and its kind of work. The site is given the words it shows and
 * the lengths of the rest, and nothing else of the update is read here.
 * Aloud, the words are read and each cut-out is said once. */
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
        { class: "cc-entry__bars", "data-redaction-line": "" },
        shape.parts.flatMap((shown, i) => [
          typeof shown === "string"
            ? h("span", { class: "cc-entry__word", "data-redaction-word": "" }, shown)
            : h(
                "span",
                { "data-redaction-bar": "", style: `--bar:${Number(shown) || 1};--n:${i}` },
                h("span", { class: "cc-sr" }, copy.bar),
              ),
          " ",
        ]),
      ),
      h("p", { class: "cc-entry__work" }, copy.works[shape.work]),
    ),
  );
}

/** One update on its day: who sent it on the box's tab, its title (a link
 * when it has somewhere to go, text when it has not), its summary and, in
 * the Labbook (`whole`), what it shows for itself and what it is about. */
function logged(content: SiteContent, update: Update, i: number, whole: boolean) {
  const copy = content.pages.lab.labbook;
  const attrs = {
    id: whole ? labbookAnchor(update.id) : undefined,
    tabindex: whole ? "-1" : undefined,
    style: `--i:${i}`,
    "data-about": whole ? aboutOf(content, update) : undefined,
  };
  if (update.visibility !== "open") return censored(content, update, attrs);
  const { updateKinds, updateSources } = content.site;
  const { href } = update;
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

/** What an update is about, as the narrowing names it: "experiment:lotus
 * project:dayshaper". */
const aboutOf = (content: SiteContent, update: Update) =>
  subjectsOf(update, content).map((s) => `${s.kind}:${s.slug}`).join(" ") || undefined;

/** A month's page of the calendar: the week's days across its head, Monday
 * first, then each day, the ones written in struck through in red. For the
 * eye alone: the entries under it say the same in words. */
function calendarPage(content: SiteContent, month: string, updates: Update[]) {
  const { lead, days } = monthCalendar(month, updates);
  const week = copyOf(content).weekdays;
  const monday = [...week.slice(1), week[0]];
  const about = (ids: string[]) =>
    [...new Set(updates.filter((u) => ids.includes(u.id)).flatMap((u) => aboutOf(content, u)?.split(" ") ?? []))].join(" ");
  return h(
    "div",
    { class: "cc-cal", "aria-hidden": "true", style: `--lead:${lead}` },
    monday.map((day) => h("span", { class: "cc-cal__wd" }, day.charAt(0))),
    days.map(({ day, updates: ids }) =>
      h(
        "span",
        {
          class: "cc-cal__day",
          "data-written": ids.length ? "" : null,
          "data-about": ids.length ? about(ids) || null : null,
        },
        String(day),
      ),
    ),
  );
}

/** The targets: a link narrowing the Labbook to each thing it is about,
 * with how many entries each has, and a line saying what it is narrowed
 * to with the way back to all of it. */
function targets(content: SiteContent, updates: Update[], at: string) {
  const copy = content.pages.lab.labbook.narrow;
  const subjects = labbookSubjects(updates, content);
  if (!subjects.length) return [];
  const count = (n: number) => (n === 1 ? copy.count.one : fill(copy.count.other, { count: n }));
  return [
    h(
      "div",
      { class: "cc-targets", role: "group", "aria-labelledby": "cc-targets-label" },
      h(
        "p",
        { class: "cc-targets__label", id: "cc-targets-label" },
        h("span", { class: "cc-targets__eyebrow", "aria-hidden": "true" }, copyOf(content).lab.targets),
        " ",
        copy.label,
      ),
      h(
        "ul",
        { class: "cc-targets__list" },
        subjects.map((subject) =>
          h(
            "li",
            {},
            h(
              "a",
              {
                class: "cc-target",
                href: narrowHref(subject, at),
                "data-cc-subject": "",
                "data-title": subject.title,
                ...part("labbook.subject", `${subject.kind}:${subject.slug}`),
              },
              h("span", { class: "cc-target__name" }, subject.title),
              h(
                "span",
                { class: "cc-target__count" },
                h("span", { "aria-hidden": "true" }, String(subject.count)),
                h("span", { class: "cc-sr" }, `, ${count(subject.count)}`),
              ),
            ),
          ),
        ),
      ),
    ),
    h(
      "p",
      { class: "cc-narrowed", tabindex: "-1", hidden: true, "data-cc-narrowed": "" },
      `${copy.showing} `,
      h("strong", { "data-cc-narrowed-to": "" }),
      ". ",
      h("a", { class: "cc-narrowed__all", href: narrowHref(undefined, at), "data-cc-all": "" }, copy.all),
    ),
  ];
}

/** A stretch of the Labbook, newest first as it is handed over. With a
 * `note` it is the Labbook itself: kept by month under its targets, each
 * update where its links land. No updates, no record. */
export function record(content: SiteContent, updates: Update[], id: string, title: string, note?: string) {
  if (!updates.length) return null;
  const whole = note !== undefined;
  const head = h(
    "header",
    { class: "cc-place__head" },
    h("h2", { class: "cc-place__title", id }, title),
    note ? h("p", { class: "cc-place__note" }, note) : null,
  );
  if (!whole)
    return h(
      "section",
      { class: "cc-log", "aria-labelledby": id },
      head,
      h(
        "ol",
        { class: "cc-log__list", "aria-label": content.pages.lab.labbook.listLabel },
        updates.map((update, i) => logged(content, update, i, false)),
      ),
    );
  const at = `${location.pathname}${location.search}`;
  let n = 0;
  return h(
    "section",
    { class: "cc-log", "aria-labelledby": id, "data-cc-labbook": "" },
    head,
    targets(content, updates, at),
    h(
      "div",
      { class: "cc-months", role: "list", "aria-label": content.pages.lab.labbook.listLabel },
      labbookMonths(updates).map(({ month, updates: days }) => {
        const [name, year] = monthLabel(month).split(" ");
        return h(
          "section",
          { class: "cc-month", role: "listitem", "data-cc-month": month, "aria-labelledby": `cc-month-${month}` },
          h(
            "div",
            { class: "cc-month__page" },
            h(
              "h3",
              { class: "cc-month__name", id: `cc-month-${month}`, ...part("labbook.month", month) },
              h("span", { class: "cc-month__no", "aria-hidden": "true" }, String(Number(month.slice(5)))),
              h("span", { class: "cc-month__word" }, name),
              " ",
              h("span", { class: "cc-month__year" }, year),
            ),
            calendarPage(content, month, days),
          ),
          h(
            "ol",
            { class: "cc-log__list", "aria-labelledby": `cc-month-${month}` },
            days.map((update) => logged(content, update, n++, true)),
          ),
        );
      }),
    ),
  );
}

/** Narrow the Labbook to what the address names, or show all of it: an
 * entry about something else is put away, a month left empty with it, and
 * a written day on the calendar about something else is struck no longer.
 * Returns where the keyboard goes: the line saying what it is narrowed to,
 * or, shown whole, nothing. */
export function narrow(screen: HTMLElement, search = location.search) {
  const section = screen.querySelector<HTMLElement>("[data-cc-labbook]");
  if (!section) return null;
  const wanted: Narrowing | undefined = narrowedTo(search);
  const key = wanted && `${wanted.kind}:${wanted.slug}`;
  const links = [...section.querySelectorAll<HTMLAnchorElement>("[data-cc-subject]")];
  const chosen = links.find((link) => link.dataset.ref === key);
  for (const link of links) {
    if (link === chosen) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
  const about = (el: HTMLElement) => !chosen || (el.dataset.about ?? "").split(" ").includes(key!);
  for (const entry of section.querySelectorAll<HTMLElement>(".cc-entry")) entry.hidden = !about(entry);
  for (const month of section.querySelectorAll<HTMLElement>("[data-cc-month]"))
    month.hidden = ![...month.querySelectorAll<HTMLElement>(".cc-entry")].some((entry) => !entry.hidden);
  for (const day of section.querySelectorAll<HTMLElement>(".cc-cal__day[data-written]"))
    day.toggleAttribute("data-elsewhere", !about(day));
  const status = section.querySelector<HTMLElement>("[data-cc-narrowed]");
  if (chosen) section.dataset.narrowed = key;
  else delete section.dataset.narrowed;
  if (!status) return null;
  status.hidden = !chosen;
  status.querySelector("[data-cc-narrowed-to]")!.textContent = chosen?.dataset.title ?? "";
  return chosen ? status : null;
}

/** The Labbook, answering the visitor.
 *
 * - A Pen or a demo is asked of its own site only when its prompt is
 *   pressed: the frame is made then (by the shared stage, see `artifact`),
 *   in the screen kept for it, and takes the focus.
 * - A link to an update (`/lab#u-…`), should one be written, lands on its
 *   day: the board turns to it and the menu's cursor points at it
 *   (`data-cc-landed`). The page under the shell holds the same ids,
 *   hidden, so the browser's own landing cannot be relied on. `find` is
 *   the update the address names now. */
export function tendRecord(screen: HTMLElement, { signal, instant }: { signal: AbortSignal; instant: boolean }) {
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
  return { find, land };
}
