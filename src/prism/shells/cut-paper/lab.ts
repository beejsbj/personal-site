/** The Lab is the rack: every experiment a pad with a motif of its own, off
 * the timeline because an experiment carries no date.
 *
 * The Bench is a pad rack, armed: pads you hit, in full colour, the
 * featured one two wide at its head. Each pad is loaded with what its
 * experiment holds, and says so on its corner:
 * - one picture is a sample: the picture on the pad, its motif along the
 *   bottom like the sample's waveform;
 * - several are a chop: the pictures as the slices of one sample, side by
 *   side and numbered, the first the widest;
 * - something to play is a plug-in: the pad is the bar it is named on,
 *   over a screen with its power. Pressed, it plays on that screen and
 *   asks nothing of another site before (src/lib/block-stage.ts);
 * - only words is MIDI: its motif alone, on the key lanes of a piano roll.
 *
 * The Shelf is the browser, muted: a file to a row, each with a small pad
 * to preview it, its name and what it is, its motif drawn out, and a
 * plug-in its screen at the row's end. The two differ in kind: you play
 * the Bench, you browse the Shelf.
 *
 * What does carry a date is the Labbook (./labbook), the Markers track
 * written out below the rack. An experiment opens as its clip box (its
 * pad, its name and its properties) over its story (./blocks), then its
 * part of the Labbook and, when it graduated, the clip it became. */
import { part, markPart } from "../../parts";
import { experimentUpdates } from "../../../lib/labbook";
import { graduatedProject, labPlaces, labPrints } from "../../../lib/rules";
import { fill } from "../rich";
import type { LabEntry } from "../types";
import { audition, soundLive } from "./audio";
import { bar, buttons, heading, inlineCopy, noteVar, pageHead, roll, screen, spell, type Env, type Screen } from "./bits";
import { chop, device, story, tendStory } from "./blocks";
import { h, link } from "./dom";
import { labbook, narrow, tendLog } from "./labbook";
import { chord, voicing } from "./music";
import { sketchNotes } from "./score";

type Holds = "print" | "prints" | "play" | "words";

/** What an experiment holds, which decides how its pad is loaded. */
const holding = (item: LabEntry, prints: string[]): Holds =>
  item.preview ? "play" : prints.length > 1 ? "prints" : prints.length ? "print" : "words";

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

/** The motif along a pad's foot, with the run that crosses it as it is
 * heard. */
const band = (slug: string) =>
  h("span", { class: "cp-pad__band" }, roll(sketchNotes(slug)), h("span", { class: "cp-clip__run", "aria-hidden": "true" }));

/** An experiment's pad, loaded with what it holds. `size`: `wide` is the
 * featured one, `small` a file's preview on the Shelf, `big` the one in an
 * experiment's clip box, `strip` the bar a plug-in is named on. */
function pad(env: Env, item: LabEntry, index: number, holds: Holds, prints: string[], size?: "big" | "wide" | "small" | "strip") {
  const label = fill(env.copy.lab.hear, { name: item.title });
  const shown = size === "small" || size === "big" ? prints.slice(0, 1) : prints;
  const loaded =
    size === "strip" || (size === "small" && !shown.length)
      ? [roll(sketchNotes(item.slug)), h("span", { class: "cp-clip__run", "aria-hidden": "true" })]
      : holds === "prints" && shown.length > 1
        ? [
            h(
              "span",
              { class: "cp-pad__chop" },
              shown.map((src, i) => h("span", { class: "cp-chop__slice" }, h("img", { src, alt: "", loading: "lazy", decoding: "async" }), h("span", { class: "cp-chop__no" }, String(i + 1)))),
            ),
            band(item.slug),
          ]
        : shown.length
          ? [h("img", { class: "cp-pad__art", src: shown[0], alt: "", loading: "lazy", decoding: "async" }), band(item.slug)]
          : // only words: the motif on the key lanes of a piano roll
            [h("span", { class: "cp-pad__keys" }), roll(sketchNotes(item.slug)), h("span", { class: "cp-clip__run", "aria-hidden": "true" })];
  const hit = h(
    "button",
    { type: "button", class: size ? `cp-pad__hit cp-pad__hit--${size}` : "cp-pad__hit", "aria-label": label, title: label, disabled: env.face, "data-art": shown.length && size !== "strip" ? "" : null },
    loaded,
  );
  hit.addEventListener("click", () => hearSketch(env, item.slug, hit), { signal: env.signal });
  let timer = 0;
  hit.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse") return;
    timer = window.setTimeout(() => hearSketch(env, item.slug, hit), 110);
  }, { signal: env.signal });
  hit.addEventListener("pointerleave", () => window.clearTimeout(timer), { signal: env.signal });
  env.signal.addEventListener("abort", () => window.clearTimeout(timer), { once: true });
  const kind = fill(env.copy.lab.holds[holds], { n: String(prints.length) });
  return h(
    "div",
    { class: "cp-pad", style: `--note:${noteVar(index + 2)}`, "data-holds": holds },
    hit,
    size === "small" ? null : h("span", { class: "cp-holds", "aria-hidden": "true" }, kind),
  );
}

/** The screen an experiment plays on where it is racked, with its power:
 * powered, the slot opens into a plug-in window over the page
 * (`data-stage-window`, lab.css). */
function playable(env: Env, item: LabEntry, poster?: string) {
  const play = item.preview!;
  const copy = env.content.pages.lab.preview;
  const room = device(`cp-play-${item.slug}`, {
    title: item.title,
    poster,
    load: copy.load[play.kind],
    close: copy.close,
    note: copy.note,
    subject: item.title,
    loading: copy.loading,
    data: { "data-frame": play.frame, "data-stage-window": "" },
    disabled: env.face,
  });
  markPart(room.querySelector(".cp-device__foot")!, "lab.preview", item.slug);
  return room;
}

export function lab(env: Env): Screen {
  const { content, copy } = env;
  const page = content.pages.lab;
  const { h1, head } = pageHead(page.header, "lab", copy.lab.rack);
  const index = (item: LabEntry) => content.lab.indexOf(item);
  const title = (item: LabEntry) => h("h3", { class: "cp-rack__title" }, link(item.detail, part("lab.title", item.slug), item.title));
  const summary = (item: LabEntry) => h("p", { class: "cp-rack__sum", ...part("lab.summary", item.slug) }, item.summary);

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
        ? h(
            "div",
            { class: "cp-rackcase" },
            bar(
              h(
                "ul",
                { class: "cp-rack" },
                entries.map((item) => {
                  const prints = labPrints(item);
                  const holds = holding(item, prints);
                  const play = holds === "play";
                  return h(
                    "li",
                    { class: "cp-rack__slot", "data-holds": holds, "data-lab-featured": item.featured ? "" : null, style: `--note:${noteVar(index(item) + 2)}` },
                    pad(env, item, index(item), holds, prints, play ? "strip" : item.featured ? "wide" : undefined),
                    play ? playable(env, item, prints[0]) : null,
                    title(item),
                    summary(item),
                  );
                }),
              ),
              1,
              3,
            ),
          )
        : h(
            "ul",
            { class: "cp-shelf" },
            entries.map((item) => {
              const prints = labPrints(item);
              const holds = holding(item, prints);
              const kind = fill(copy.lab.holds[holds], { n: String(prints.length) });
              return h(
                "li",
                { class: "cp-shelf__item", "data-holds": holds, style: `--note:${noteVar(index(item) + 2)}` },
                pad(env, item, index(item), holds, holds === "play" ? [] : prints, "small"),
                h("div", { class: "cp-shelf__copy" }, title(item), summary(item)),
                h("span", { class: "cp-holds cp-shelf__kind", "aria-hidden": "true" }, kind),
                holds === "play" ? playable(env, item, prints[0]) : h("span", { class: "cp-shelf__wave", "aria-hidden": "true" }, roll(sketchNotes(item.slug))),
              );
            }),
          ),
    );
  });

  const log = labbook(env, content.labbook, { whole: true });
  const el = screen(
    "lab",
    h(
      "div",
      { class: "cp-page cp-lab" },
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
  const land = tendLog(env, el);
  // arriving soloed, the Labbook is turned to it already
  const status = narrow(el);
  return {
    el,
    heading: h1,
    arrive() {
      if (!status) return land();
      status.scrollIntoView({ block: "center", behavior: "instant" });
      status.focus({ preventScroll: true });
    },
    renew() {
      // Shown whole again, the keyboard goes back to what it was soloed
      // by; soloed, to the line saying what it shows.
      const was = el.querySelector<HTMLElement>("[data-log='labbook']")?.dataset.narrowed;
      const said = narrow(el);
      const target = said ?? (was ? el.querySelector<HTMLElement>(`[data-cp-subject][data-ref="${CSS.escape(was)}"]`) : null);
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: env.reducedMotion ? "instant" : "smooth" });
      target.focus({ preventScroll: true });
    },
  };
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
          clip ? h("span", { class: "cp-grad__roll" }, roll(clip.notes)) : null,
        ),
      )
    : null;
  // its cover is on its pad; the pictures that are its own are a chop at
  // the end of its story
  const media = item.media.filter((shown, i) => !(i === 0 && shown.src === item.cover));
  const prints = item.cover ? [item.cover] : [];
  const updates = experimentUpdates(content.labbook, item.slug);
  const box = h(
    "div",
    { class: "cp-clipview__side cp-clipbox" },
    pad(env, item, index, item.cover ? "print" : "words", prints, "big"),
    h(
      "div",
      { class: "cp-clipbox__words" },
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
    ),
  );
  const told = story(
    env,
    item.slug,
    item.blocks,
    item.html,
    "lab.body",
    media.length ? chop(media, { ...part("lab.media", item.slug) }) : null,
  );
  const main = h("div", { class: "cp-clipview__main" }, told, labbook(env, updates, { whole: false }));
  const el = screen("lab-entry", h("div", { class: "cp-clipview cp-clipview--lab", style: `--note:${noteVar(index + 2)}` }, bar(box, 1), main));
  return { el, heading: h1, arrive: tendStory(env, el) };
}
