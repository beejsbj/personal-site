/** The Labbook: the Markers track, written out. An experiment carries no
 * date, but an update does, so the Labbook is on the timeline: a lane with
 * a flag at each update's date, and under it the log itself, a sheet of
 * bone paper with a line for every update, newest first. A line's date is
 * a locator: press it and the playhead moves there and its bell rings; the
 * line lights while the playhead is on it.
 *
 * - An artifact is pasted beside its words. A picture, a film and a sound
 *   are shown where they are. A Pen or a demo is a dark stage cut into the
 *   paper, with a play button: its frame is made only when that is pressed,
 *   in the stage's own room, so until then nothing is asked of another site.
 * - A redacted update is a rest: no bell, no link, and where its title
 *   would be, its line: a word it shows set as a title's words are, and a
 *   strip of black paper pasted over each word it does not, one for each
 *   number in its shape, a longer number a longer strip. The line wraps as
 *   a title does. Only its shape and its date are read; aloud, its words
 *   are read and each strip is said once.
 * - An update with nowhere to go is its title, not a link: nothing here
 *   links to an update's own line. A flag on the lane is a pin that goes
 *   to its line when pressed.
 * - The whole Labbook is kept by month. A month opens on its locator, its
 *   name, and its days as a step row, Monday first, a step lit for each
 *   day written in (for the eye alone: it goes nowhere); its lines are its
 *   own torn sheet beside it.
 * - Above the months, the things it is about are a row of track heads,
 *   each with its solo: soloing one narrows the Labbook to it
 *   (`?experiment=` / `?project=`), and a line says so with the way back.
 *   Everything not about it goes quiet: its lines and its months are put
 *   away, its steps go dark and its flags on the lane dim.
 * - A link to an update (`/lab#u-…`), should one be written, lands on its
 *   line: it is brought to the top of the view and marked, and the playhead
 *   goes to its date. The page under the shell holds the same ids, hidden,
 *   and the view is printed after the browser has looked for the fragment,
 *   so the landing is done here. */
import { part } from "../../parts";
import {
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
  type Artifact,
  type Update,
} from "../../../lib/labbook";
import { fill } from "../rich";
import { overlay, ruler } from "./arrangement";
import { auditionClip, noteVar, playButton, type Env } from "./bits";
import { h, link, markup } from "./dom";
import { MONTH, parseDay } from "./score";
import { place } from "./transport";

/** What an update is about, as soloing names it: "experiment:lotus
 * project:dayshaper". */
const aboutOf = (env: Env, update: Update) =>
  subjectsOf(update, env.content).map((s) => `${s.kind}:${s.slug}`).join(" ") || null;

/** The lane: the years the Labbook covers, a flag per update at its date. */
function lane(env: Env, updates: Update[], range: { from: number; to: number }) {
  const { transport, signal, copy } = env;
  const flags = h("div", { class: "cp-lane cp-lane--markers" });
  let previous = -Infinity;
  let row = 0;
  [...updates]
    .map((update) => ({ update, t: parseDay(update.date) }))
    .filter(({ t }) => t >= range.from && t < range.to)
    .sort((a, b) => a.t - b.t)
    .forEach(({ update, t }) => {
      // close dates stagger into rows so each flag stays a target
      row = t - previous < (range.to - range.from) / 40 ? (row + 1) % 3 : 0;
      previous = t;
      const open = update.visibility === "open";
      const when = updateDateLabel(update.date);
      // a pin, not a link: pressed, it goes to its update's line (tendLog)
      const flag = h(
        "span",
        { class: open ? "cp-flag" : "cp-flag cp-flag--rest", style: `--at:${place(t, range).toFixed(5)}; --row:${row}`, "data-flag": labbookAnchor(update.id), "data-about": aboutOf(env, update), title: open ? `${when} · ${update.title}` : when },
        h("span", { class: "cp-flag__pin" }),
      );
      transport.watch(flag, t, t + MONTH, signal, "markers");
      flags.append(flag);
    });
  const corner = h("span", null, copy.home.locators, h("small", null, String(updates.length)));
  return h(
    "section",
    { class: "cp-arr cp-arr--log", "aria-hidden": "true" },
    ruler(env, range, corner, range.to - range.from <= 2),
    h("div", { class: "cp-arr__row cp-arr__row--log" }, h("div", { class: "cp-arr__head" }, h("span", { class: "cp-arr__name" }, copy.tracks.markers, h("small", null, copy.tracks.markersVoice))), flags),
    overlay(env, range),
  );
}

/** What an update shows for itself. A poster is shown only if it is the
 * site's own: one kept elsewhere would be asked for before the press. */
function artifact(env: Env, shown: Artifact) {
  const { content, face } = env;
  const copy = content.pages.lab.labbook.artifact;
  const { kind, src, alt } = shown;
  const poster = shown.poster && /^\/(?!\/)/.test(shown.poster) ? shown.poster : undefined;
  if (kind === "image")
    return h("figure", { class: "cp-art cp-art--image" }, h("span", { class: "cp-art__tape", "aria-hidden": "true" }), h("img", { src, alt, loading: "lazy", decoding: "async" }));
  if (kind === "video")
    return h("figure", { class: "cp-art cp-art--video" }, h("video", { controls: true, muted: true, playsinline: true, preload: "metadata", poster, "aria-label": alt }, h("source", { src })));
  if (kind === "sound")
    return h("figure", { class: "cp-art cp-art--sound" }, h("audio", { controls: true, preload: "none", src, "aria-label": alt }), h("figcaption", null, alt));
  // a frame is another site's page, or one of this site's own: nothing else
  const frame = embedSrc(shown, penUser(content.site));
  if (!frame || !/^(https:\/\/|\/(?!\/))/.test(frame)) return null;
  // where it lives: the Pen's own page, or the demo itself
  const home = kind === "pen" ? frame.replace("/embed/", "/pen/").split("?")[0] : src;
  return h(
    "figure",
    { class: "cp-art cp-art--embed" },
    h(
      "div",
      { class: "cp-stage", "data-embed": frame, "data-embed-title": alt },
      poster ? h("img", { class: "cp-stage__poster", src: poster, alt, loading: "lazy", decoding: "async" }) : null,
      h(
        "div",
        { class: "cp-stage__ask" },
        poster ? null : h("p", { class: "cp-stage__label" }, alt),
        h("button", { type: "button", class: "cp-play", "data-embed-load": "", disabled: face }, markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11L13.5 8z"/></svg>'), h("span", null, copy.load[kind])),
        h("p", { class: "cp-stage__note" }, copy.note),
      ),
    ),
    h("figcaption", { class: "cp-art__home" }, link(home, {}, copy.open[kind])),
  );
}

/** One line of the log. `whole` is the Labbook itself: the line is where
 * a link to the update would land, and it shows its artifact. */
function line(env: Env, update: Update, index: number, whole: boolean) {
  const { content, copy, session, transport, signal, face } = env;
  const words = content.pages.lab.labbook;
  const when = updateDateLabel(update.date);
  const t = parseDay(update.date);
  const id = whole ? labbookAnchor(update.id) : null;

  // a redacted update: its shape and its date, and nothing else of it
  if (update.visibility !== "open") {
    const rest = h(
      "li",
      { class: "cp-log__line cp-log__line--rest", id, "data-t": t, "data-about": aboutOf(env, update), ...part("update.redacted", update.id) },
      h("p", { class: "cp-log__when" }, h("time", { class: "cp-log__date", datetime: update.date }, when)),
      h(
        "div",
        { class: "cp-log__words" },
        h("span", { class: "cp-sr" }, words.redacted.label),
        h("p", { class: "cp-log__origin" }, words.redacted.works[update.shape.work]),
        h(
          "p",
          { class: "cp-strike", "data-redaction-line": "" },
          update.shape.parts.flatMap((shown, i) => [
            typeof shown === "string"
              ? h("span", { class: "cp-strike__word", "data-redaction-word": "" }, shown)
              : h("span", { class: "cp-strike__strip", "data-strip": "", "data-redaction-bar": "", style: `--len:${Number(shown) || 1}; --tilt:${[-0.7, 0.5, -0.3, 0.8][i % 4]}deg` }, h("span", { class: "cp-sr" }, words.redacted.bar)),
            " ",
          ]),
        ),
      ),
    );
    transport.watch(rest, t, t + MONTH, signal, "markers");
    return rest;
  }

  const { updateKinds, updateSources } = content.site;
  const clip = session.clips.find((c) => c.id === `update:${update.id}`);
  const date = h("button", { type: "button", class: "cp-log__date", "aria-label": fill(copy.home.jump, { when }), disabled: face }, h("time", { datetime: update.date }, when));
  // on an experiment's page its own name goes without saying
  const about = relatedLinks(update, content).filter((related) => whole || related.kind !== "experiment");
  const shown = whole && update.artifact ? artifact(env, update.artifact) : null;
  const li = h(
    "li",
    { class: "cp-log__line", id, "data-t": t, "data-art": shown ? "" : null, "data-about": aboutOf(env, update), style: `--note:${noteVar(index)}`, ...part("update.item", update.id) },
    h("p", { class: "cp-log__when" }, date),
    h(
      "div",
      { class: "cp-log__words" },
      h("p", { class: "cp-log__origin" }, `${updateSources[update.source] ?? update.source} · ${updateKinds[update.kind] ?? update.kind}`),
      // an update with nowhere to go is a title, not a link
      h("h3", { class: "cp-log__title" }, update.href ? link(update.href, {}, update.title) : update.title),
      h("p", { class: "cp-log__sum" }, update.summary),
      about.length
        ? h(
            "p",
            { class: "cp-log__about" },
            about.map((related) => h("span", { "data-about": related.kind }, h("span", null, words.related[related.kind]), link(related.href, {}, related.title))),
          )
        : null,
    ),
    shown,
  );
  date.addEventListener("click", () => {
    transport.seek(t);
    if (clip) auditionClip(env, clip, li);
  }, { signal });
  transport.watch(li, t, t + MONTH, signal, "markers");
  return li;
}

/** A month's days as a step row: the week's days across its head, Monday
 * first, then a step for each day, lit for each day written in. For the
 * eye alone: the lines beside it say the same in words. */
function steps(env: Env, month: string, updates: Update[]) {
  const { lead, days } = monthCalendar(month, updates);
  const about = (ids: string[]) =>
    [...new Set(updates.filter((u) => ids.includes(u.id)).flatMap((u) => aboutOf(env, u)?.split(" ") ?? []))].join(" ") || null;
  return h(
    "div",
    { class: "cp-steps", "aria-hidden": "true", style: `--lead:${lead}` },
    env.copy.lab.week.map((day) => h("span", { class: "cp-steps__wd" }, day)),
    days.map(({ day, updates: ids }) =>
      h("span", { class: "cp-steps__day", "data-written": ids.length ? "" : null, "data-about": ids.length ? about(ids) : null }, String(day)),
    ),
  );
}

/** The track heads: a link soloing the Labbook to each thing it is about,
 * with how many entries each has, and the line saying what it is soloed
 * to with the way back to all of it. */
function solos(env: Env, updates: Update[]) {
  const { content, copy } = env;
  const words = content.pages.lab.labbook.narrow;
  const subjects = labbookSubjects(updates, content);
  if (!subjects.length) return [];
  const at = `${location.pathname}${location.search}`;
  const count = (n: number) => (n === 1 ? words.count.one : fill(words.count.other, { count: n }));
  return [
    h(
      "div",
      { class: "cp-solo", role: "group", "aria-labelledby": "cp-solo-label" },
      h("p", { class: "cp-solo__label", id: "cp-solo-label" }, h("span", { class: "cp-tag", "aria-hidden": "true" }, copy.lab.solo), " ", words.label),
      h(
        "ul",
        { class: "cp-solo__list" },
        subjects.map((subject, i) =>
          h(
            "li",
            { style: `--note:${noteVar(i)}` },
            link(
              narrowHref(subject, at),
              {
                class: "cp-solo__track",
                "data-cp-subject": "",
                "data-title": subject.title,
                "data-kind": subject.kind,
                ...part("labbook.subject", `${subject.kind}:${subject.slug}`),
              },
              h("span", { class: "cp-solo__s", "aria-hidden": "true" }, copy.lab.solo.charAt(0)),
              h("span", { class: "cp-solo__name" }, subject.title),
              h("span", { class: "cp-solo__count" }, h("span", { "aria-hidden": "true" }, String(subject.count)), h("span", { class: "cp-sr" }, `, ${count(subject.count)}`)),
            ),
          ),
        ),
      ),
    ),
    h(
      "p",
      { class: "cp-narrowed", tabindex: "-1", hidden: true, "data-cp-narrowed": "" },
      `${words.showing} `,
      h("strong", { "data-cp-narrowed-to": "" }),
      ". ",
      link(narrowHref(undefined, at), { class: "cp-narrowed__all", "data-cp-all": "" }, words.all),
    ),
  ];
}

/** The Labbook (`whole`), or an experiment's part of it. Nothing, with no
 * updates. */
export function labbook(env: Env, updates: Update[], { whole }: { whole: boolean }): HTMLElement | null {
  if (!updates.length) return null;
  const { content, copy, session } = env;
  const page = content.pages.lab;
  const times = updates.map((update) => parseDay(update.date));
  // the lane: from the year of the first update, inside the session
  const range = { from: Math.max(session.from, Math.min(Math.floor(Math.min(...times)), session.end - 1)), to: session.end };
  const head = h(
    "header",
    { class: "cp-place__head" },
    h("span", { class: "cp-tag", "aria-hidden": "true" }, copy.tracks.markers),
    h("h2", { class: "cp-place__title", id: "cp-log-title" }, whole ? page.labbook.title : page.detail.labels.updates),
    whole ? h("p", { class: "cp-place__note" }, page.labbook.note) : null,
  );
  if (!whole)
    return h(
      "section",
      { class: "cp-log", "data-log": "experiment", "aria-labelledby": "cp-log-title" },
      head,
      h("ol", { class: "cp-log__sheet" }, updates.map((update, index) => line(env, update, index, false))),
    );
  let n = 0;
  return h(
    "section",
    { class: "cp-log", id: "labbook", "data-log": "labbook", "aria-labelledby": "cp-log-title" },
    head,
    solos(env, updates),
    h("div", { class: "cp-session__bar" }, playButton(env, copy.lab.play, range), h("p", { class: "cp-session__legend" }, copy.lab.log)),
    lane(env, updates, range),
    h(
      "div",
      { class: "cp-months", role: "list", "aria-label": page.labbook.listLabel },
      labbookMonths(updates).map(({ month, updates: days }, m) => {
        const [name, year] = monthLabel(month).split(" ");
        const id = `cp-month-${month}`;
        return h(
          "section",
          { class: "cp-month", role: "listitem", "data-cp-month": month, "aria-labelledby": id, style: `--note:${noteVar(m)}` },
          h(
            "div",
            { class: "cp-month__head" },
            h(
              "h3",
              { class: "cp-month__name", id, ...part("labbook.month", month) },
              h("span", { class: "cp-month__word" }, name),
              " ",
              h("span", { class: "cp-month__year" }, year),
            ),
            steps(env, month, days),
          ),
          h("ol", { class: "cp-log__sheet", "aria-labelledby": id }, days.map((update) => line(env, update, n++, true))),
        );
      }),
    ),
  );
}

/** Solo the Labbook to what the address names, or show all of it: a line
 * about something else is put away, a month left empty with it, a step
 * about something else goes dark and its flag dims. Returns where the
 * keyboard goes: the line saying what it is soloed to, or, shown whole,
 * nothing. */
export function narrow(view: HTMLElement, search = location.search) {
  const section = view.querySelector<HTMLElement>("[data-log='labbook']");
  if (!section) return null;
  const wanted = narrowedTo(search);
  const key = wanted && `${wanted.kind}:${wanted.slug}`;
  const links = [...section.querySelectorAll<HTMLAnchorElement>("[data-cp-subject]")];
  const chosen = links.find((one) => one.dataset.ref === key);
  for (const one of links) {
    if (one === chosen) one.setAttribute("aria-current", "true");
    else one.removeAttribute("aria-current");
  }
  const about = (el: HTMLElement) => !chosen || (el.dataset.about ?? "").split(" ").includes(key!);
  for (const one of section.querySelectorAll<HTMLElement>(".cp-months .cp-log__line")) one.hidden = !about(one);
  for (const month of section.querySelectorAll<HTMLElement>("[data-cp-month]"))
    month.hidden = ![...month.querySelectorAll<HTMLElement>(".cp-log__line")].some((one) => !one.hidden);
  for (const el of section.querySelectorAll<HTMLElement>(".cp-steps__day[data-written], .cp-flag"))
    el.toggleAttribute("data-elsewhere", !about(el));
  if (chosen) section.dataset.narrowed = key;
  else delete section.dataset.narrowed;
  const status = section.querySelector<HTMLElement>("[data-cp-narrowed]");
  if (!status) return null;
  status.hidden = !chosen;
  status.querySelector("[data-cp-narrowed-to]")!.textContent = chosen?.dataset.title ?? "";
  return chosen ? status : null;
}

/** The Labbook answering the visitor: a Pen or a demo is loaded when its
 * button is pressed, a flag on the lane goes to its update's line, and a
 * link to an update lands on its line. Returns the landing, for when the
 * view arrives. */
export function tendLog(env: Env, view: HTMLElement) {
  const { signal, transport, face, reducedMotion, scroller } = env;
  view.addEventListener(
    "click",
    (event) => {
      const ask = (event.target as Element | null)?.closest?.("[data-embed-load]");
      const stage = ask?.closest<HTMLElement>("[data-embed]");
      if (!stage?.dataset.embed) return;
      const frame = h("iframe", { src: stage.dataset.embed, title: stage.dataset.embedTitle ?? "", allow: "fullscreen" });
      stage.replaceChildren(frame);
      frame.focus();
    },
    { signal },
  );

  const land = (hash = location.hash, glide = false) => {
    if (face || signal.aborted) return;
    for (const el of view.querySelectorAll("[data-landed]")) el.removeAttribute("data-landed");
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {}
    const target = id ? view.querySelector<HTMLElement>(`[data-log="labbook"] [id="${CSS.escape(id)}"]`) : null;
    if (!target) return;
    target.setAttribute("data-landed", "");
    // to the top of the view, under a margin (shell.css): where the
    // browser's own jump to a fragment puts it, when the router asks for one
    target.scrollIntoView({ block: "start", behavior: glide && !reducedMotion ? "smooth" : "instant" });
    // the playhead goes where the update is
    const t = Number(target.dataset.t);
    if (Number.isFinite(t)) transport.seek(t);
  };
  // back and forward, and an address typed in
  addEventListener("hashchange", () => land(), { signal });
  addEventListener("popstate", () => land(), { signal });
  // a flag on the lane: to its update's line, the address left as it is
  view.addEventListener(
    "click",
    (event) => {
      const flag = (event.target as Element | null)?.closest?.<HTMLElement>("[data-flag]");
      if (flag?.dataset.flag) land(`#${flag.dataset.flag}`, true);
    },
    { signal },
  );
  return () => {
    land();
    // the display face arriving late moves every line above it: land again,
    // unless the visitor has moved on meanwhile
    const at = scroller.scrollTop;
    void document.fonts?.ready.then(() => {
      if (!signal.aborted && Math.abs(scroller.scrollTop - at) < 2) view.querySelector("[data-landed]")?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  };
}
