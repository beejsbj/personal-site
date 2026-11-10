/** The Lab is the rack: every experiment a pad with a motif of its own, off
 * the timeline because an experiment carries no date. The Bench is the pads
 * that are armed, in full colour, the featured one a pad two wide at the
 * head of the rack. The Shelf is the pads that are muted: gone quiet, ink
 * with their colour at the edge, lying in rows, and still lighting up when
 * pressed. What does carry a date is the Labbook (./labbook), the Markers
 * track written out below the rack, and the ribbon of headlines (./ribbon)
 * across the top. An experiment opens as its pad, with its part of the
 * Labbook and, when it graduated, the clip it became on the arrangement. */
import { part } from "../../parts";
import { experimentUpdates } from "../../../lib/labbook";
import { graduatedProject, labPlaces } from "../../../lib/rules";
import { fill } from "../rich";
import type { LabEntry } from "../types";
import { audition, soundLive } from "./audio";
import { bar, buttons, heading, inlineCopy, noteVar, pageHead, prose, roll, screen, spell, type Env, type Screen } from "./bits";
import { h, link } from "./dom";
import { labbook, tendLog } from "./labbook";
import { chord, voicing } from "./music";
import { ribbon } from "./ribbon";
import { sketchNotes } from "./score";

/** Hear a sketch: its motif on the kalimba over the home chord. */
function hearSketch(env: Env, slug: string, el: HTMLElement) {
  if (env.face || env.signal.aborted) return;
  const notes = sketchNotes(slug);
  if (soundLive())
    audition([
      ...voicing(chord(0)).map((degree) => ({ offset: 0, seconds: 1.4, degree, voice: "keys" as const, velocity: 0.35 })),
      ...notes.map((n) => ({ offset: n.at * 0.25, seconds: n.length * 0.25, degree: n.degree, voice: "sketch" as const, velocity: n.at % 3 === 0 ? 0.85 : 0.65 })),
    ]);
  el.style.setProperty("--hear", "1.5s");
  el.removeAttribute("data-hearing");
  void el.offsetWidth;
  el.setAttribute("data-hearing", "");
  window.setTimeout(() => el.removeAttribute("data-hearing"), 1580);
}

/** An experiment's pad. `wide` is the featured one, `small` a muted one on
 * the Shelf, `big` the one on its own page. */
function pad(env: Env, item: LabEntry, index: number, size?: "big" | "wide" | "small") {
  const label = fill(env.copy.lab.hear, { name: item.title });
  const hit = h(
    "button",
    { type: "button", class: size ? `cp-pad__hit cp-pad__hit--${size}` : "cp-pad__hit", "aria-label": label, title: label, disabled: env.face, "data-art": item.cover ? "" : null },
    // with a thumbnail, the sketch fills the pad and its motif rides a band
    // along the bottom; without one, the motif fills the pad
    item.cover
      ? [
          h("img", { class: "cp-pad__art", src: item.cover, alt: "", loading: "lazy", decoding: "async" }),
          h("span", { class: "cp-pad__band" }, roll(sketchNotes(item.slug)), h("span", { class: "cp-clip__run", "aria-hidden": "true" })),
        ]
      : [roll(sketchNotes(item.slug)), h("span", { class: "cp-clip__run", "aria-hidden": "true" })],
  );
  hit.addEventListener("click", () => hearSketch(env, item.slug, hit), { signal: env.signal });
  let timer = 0;
  hit.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse") return;
    timer = window.setTimeout(() => hearSketch(env, item.slug, hit), 110);
  }, { signal: env.signal });
  hit.addEventListener("pointerleave", () => window.clearTimeout(timer), { signal: env.signal });
  env.signal.addEventListener("abort", () => window.clearTimeout(timer), { once: true });
  return h("div", { class: "cp-pad", style: `--note:${noteVar(index + 2)}` }, hit);
}

export function lab(env: Env): Screen {
  const { content, copy } = env;
  const page = content.pages.lab;
  const { h1, head } = pageHead(page.header, "lab", copy.lab.rack);
  const index = (item: LabEntry) => content.lab.indexOf(item);
  const title = (item: LabEntry) => h("h3", { class: "cp-rack__title" }, link(item.detail, part("lab.title", item.slug), item.title));

  const places = labPlaces(content.lab).map(({ place, entries }) => {
    const armed = place === "bench";
    const id = `cp-place-${place}`;
    return h(
      "section",
      { class: `cp-place cp-place--${place}`, "data-lab-place": place, "aria-labelledby": id },
      h(
        "header",
        { class: "cp-place__head" },
        h("span", { class: `cp-tag cp-place__tag cp-place__tag--${armed ? "armed" : "muted"}`, "aria-hidden": "true" }, armed ? copy.lab.armed : copy.lab.muted),
        h("h2", { class: "cp-place__title", id }, page.places[place].title),
        h("p", { class: "cp-place__note" }, page.places[place].note),
      ),
      armed
        ? bar(
            h(
              "ul",
              { class: "cp-rack" },
              entries.map((item) =>
                h(
                  "li",
                  { class: "cp-rack__slot", "data-lab-featured": item.featured ? "" : null },
                  pad(env, item, index(item), item.featured ? "wide" : undefined),
                  title(item),
                  h("p", { class: "cp-rack__sum", ...part("lab.summary", item.slug) }, item.summary),
                ),
              ),
            ),
            1,
            3,
          )
        : h(
            "ul",
            { class: "cp-shelf" },
            entries.map((item) =>
              h(
                "li",
                { class: "cp-shelf__item", style: `--note:${noteVar(index(item) + 2)}` },
                pad(env, item, index(item), "small"),
                h("div", { class: "cp-shelf__copy" }, title(item), h("p", { class: "cp-rack__sum", ...part("lab.summary", item.slug) }, item.summary)),
              ),
            ),
          ),
    );
  });

  const log = labbook(env, content.labbook, { whole: true });
  const el = screen(
    "lab",
    h(
      "div",
      { class: "cp-page cp-lab" },
      ribbon(env),
      bar(head, 2),
      h("p", { class: "cp-session__legend" }, copy.lab.undated),
      places,
      log,
      h(
        "div",
        { class: "cp-lab__more" },
        h("p", { class: "cp-lab__link", ...part("lab.more") }, link(page.more.href, { class: "cp-btn" }, page.more.label)),
        h("p", { class: "cp-lab__aside", ...part("lab.aside") }, inlineCopy(page.aside)),
      ),
    ),
  );
  return { el, heading: h1, arrive: tendLog(env, el) };
}

export function labEntry(env: Env, item: LabEntry): Screen {
  const { content, copy, session } = env;
  const page = content.pages.lab;
  const index = content.lab.indexOf(item);
  const notes = sketchNotes(item.slug);
  const h1 = heading(item.title, "cp-clipview__title", "lab.title", item.slug);
  const links = [...(item.href ? [{ label: copy.lab.open, url: item.href }] : []), ...item.links];
  // the clip it became: the project's own, in its colour, singing its motif
  const project = graduatedProject(item, content.projects);
  const clip = project && session.clips.find((c) => c.id === `project:${project.slug}`);
  const graduation = project
    ? h(
        "p",
        { class: "cp-grad", ...part("lab.graduation", item.slug) },
        h("span", { class: "cp-grad__label" }, page.detail.labels.graduated),
        link(
          project.href,
          { class: "cp-grad__clip", style: `--note:${noteVar(content.projects.indexOf(project))}` },
          h("span", { class: "cp-grad__name" }, project.title),
          clip ? h("span", { class: "cp-grad__roll", "aria-hidden": "true" }, roll(clip.notes)) : null,
        ),
      )
    : null;
  // its cover is on its pad; the pictures that are its own follow its story
  const media = item.media.filter((shown) => shown.src !== item.cover);
  const updates = experimentUpdates(content.labbook, item.slug);
  const side = h(
    "div",
    { class: "cp-clipview__side" },
    pad(env, item, index, "big"),
    h("p", { class: "cp-head__kicker" }, h("span", { class: "cp-tag" }, copy.lab.rack), link("/lab", {}, page.detail.eyebrow)),
    h1,
    h("p", { class: "cp-clipview__lede", ...part("lab.summary", item.slug) }, item.summary),
    graduation,
    h(
      "dl",
      { class: "cp-props" },
      h("div", null, h("dt", null, copy.project.voice), h("dd", null, copy.tracks.voices.sketch)),
      h("div", null, h("dt", null, copy.writing.motif), h("dd", null, spell(notes))),
    ),
    buttons(links, part("lab.links", item.slug)),
    link("/lab", { class: "cp-back" }, h("span", { "aria-hidden": "true" }, "← "), copy.lab.back),
  );
  const main = h(
    "div",
    { class: "cp-clipview__main" },
    prose(item.html, part("lab.body", item.slug)),
    media.length
      ? h(
          "div",
          { class: "cp-inserts", ...part("lab.media", item.slug) },
          media.map((shown) =>
            h(
              "figure",
              { class: "cp-insert" },
              shown.type === "video"
                ? h("video", { src: shown.src, controls: true, muted: true, playsinline: true, preload: "metadata", "aria-label": shown.alt ?? item.title })
                : h("img", { src: shown.src, alt: shown.alt ?? "", loading: "lazy", decoding: "async" }),
              shown.caption ? h("figcaption", null, shown.caption) : null,
            ),
          ),
        )
      : null,
    labbook(env, updates, { whole: false }),
  );
  const el = screen("lab-entry", h("div", { class: "cp-clipview", style: `--note:${noteVar(index + 2)}` }, bar(side, 1), main));
  tendLog(env, el);
  return { el, heading: h1 };
}
