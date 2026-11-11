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
 * - A redacted update is a rest: no bell, no link, and where its words
 *   would be, strips of black paper pasted over them, one for each number
 *   in its shape, a longer number a longer strip. Only its shape and its
 *   date are read.
 * - An update with nowhere to go is its title, not a link: nothing here
 *   links to an update's own line. A flag on the lane is a pin that goes
 *   to its line when pressed.
 * - A link to an update (`/lab#u-…`), should one be written, lands on its
 *   line: it is brought to the top of the view and marked, and the playhead
 *   goes to its date. The page under the shell holds the same ids, hidden,
 *   and the view is printed after the browser has looked for the fragment,
 *   so the landing is done here. */
import { part } from "../../parts";
import { embedSrc, labbookAnchor, penUser, relatedLinks, updateDateLabel, type Artifact, type Update } from "../../../lib/labbook";
import { fill } from "../rich";
import { overlay, ruler } from "./arrangement";
import { auditionClip, noteVar, playButton, type Env } from "./bits";
import { h, link, markup } from "./dom";
import { MONTH, parseDay } from "./score";
import { place } from "./transport";

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
        { class: open ? "cp-flag" : "cp-flag cp-flag--rest", style: `--at:${place(t, range).toFixed(5)}; --row:${row}`, "data-flag": labbookAnchor(update.id), title: open ? `${when} · ${update.title}` : when },
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
      { class: "cp-log__line cp-log__line--rest", id, "data-t": t, ...part("update.redacted", update.id) },
      h("p", { class: "cp-log__when" }, h("time", { class: "cp-log__date", datetime: update.date }, when)),
      h(
        "div",
        { class: "cp-log__words" },
        h("span", { class: "cp-sr" }, words.redacted.label),
        h("p", { class: "cp-log__origin" }, words.redacted.works[update.shape.work]),
        h(
          "div",
          { class: "cp-strike", "aria-hidden": "true" },
          update.shape.bars.map((length, i) => h("i", { "data-strip": "", style: `--len:${Number(length) || 1}; --tilt:${[-0.7, 0.5, -0.3, 0.8][i % 4]}deg` })),
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
    { class: "cp-log__line", id, "data-t": t, "data-art": shown ? "" : null, style: `--note:${noteVar(index)}`, ...part("update.item", update.id) },
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

/** The Labbook (`whole`), or an experiment's part of it. Nothing, with no
 * updates. */
export function labbook(env: Env, updates: Update[], { whole }: { whole: boolean }): HTMLElement | null {
  if (!updates.length) return null;
  const { content, copy, session } = env;
  const page = content.pages.lab;
  const times = updates.map((update) => parseDay(update.date));
  // the lane: from the year of the first update, inside the session
  const range = { from: Math.max(session.from, Math.min(Math.floor(Math.min(...times)), session.end - 1)), to: session.end };
  return h(
    "section",
    { class: "cp-log", "data-log": whole ? "labbook" : "experiment", "aria-labelledby": "cp-log-title" },
    h(
      "header",
      { class: "cp-place__head" },
      h("span", { class: "cp-tag", "aria-hidden": "true" }, copy.tracks.markers),
      h("h2", { class: "cp-place__title", id: "cp-log-title" }, whole ? page.labbook.title : page.detail.labels.updates),
      whole ? h("p", { class: "cp-place__note" }, page.labbook.note) : null,
    ),
    whole ? h("div", { class: "cp-session__bar" }, playButton(env, copy.lab.play, range), h("p", { class: "cp-session__legend" }, copy.lab.log)) : null,
    whole ? lane(env, updates, range) : null,
    h(
      "ol",
      { class: "cp-log__sheet", "aria-label": whole ? page.labbook.listLabel : null },
      updates.map((update, index) => line(env, update, index, whole)),
    ),
  );
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
