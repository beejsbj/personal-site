/** About: the set's liner notes. The sleeve (a cut-paper jazz poster with
 * the portrait), the set info a DAW keeps about a song, and the story as
 * the notes inside the sleeve, its sections numbered like tracks. */
import type { Route } from "../types";
import { h, link, text } from "./dom";
import { noteAt, noteVar } from "./notes";
import { bar, buttons, credits, heading, kicker, prose, scrap, screen, type Env, type Screen } from "./parts";
import { clipsFor, monthLabel } from "./timeline";

export function liner(route: Route, env: Env): Screen {
  const { content } = env;
  const { main } = route;
  const title = text(main.querySelector("h1")) || content.pages.about.title;
  const h1 = heading(title, "cp-liner__title", "cp-liner-title");
  const actions = [...main.querySelectorAll<HTMLAnchorElement>(".page-header__actions a")].map((anchor) => ({
    label: text(anchor),
    url: anchor.getAttribute("href") ?? "/",
  }));
  const first = clipsFor(content)[0];

  const tag = h(
    "p",
    { class: "cp-sleeve__tag", "aria-hidden": "true" },
    ["Play.", "Build.", "Repeat."].map((word) => h("span", null, word)),
  );
  bar(tag, 4, 6);
  const sleeve = h(
    "div",
    { class: "cp-sleeve", "aria-hidden": "true" },
    scrap("tomato", "torn", "cp-sleeve__a"),
    scrap("plum", "stairs", "cp-sleeve__b"),
    scrap("mustard", "tri", "cp-sleeve__c"),
    scrap("bone", "strip", "cp-sleeve__d"),
    scrap("pine", "dot", "cp-sleeve__e"),
    h("span", { class: "cp-sleeve__disc" }),
    h("figure", { class: "cp-sleeve__portrait" }, h("img", { src: "/images/burooj4.jpg", alt: "", decoding: "async" })),
    h("span", { class: "cp-sleeve__stamp" }, "Burooj."),
    tag,
  );

  const story = prose(main.querySelector(".prose"), "cp-story");
  // number the sections like tracks on a sleeve
  let track = 1;
  story?.querySelectorAll("h2").forEach((h2, i) => {
    track += 1;
    h2.style.setProperty("--note", noteVar(noteAt(i + 3).id));
    h2.prepend(h("span", { class: "cp-story__track", "aria-hidden": "true" }, String(track).padStart(2, "0")));
  });

  const notes = h(
    "article",
    { class: "cp-liner", "aria-labelledby": "cp-liner-title" },
    kicker(text(main.querySelector(".page-header__eyebrow")) || "About", " · liner notes"),
    h1,
    h("p", { class: "cp-liner__intro" }, text(main.querySelector(".page-header__intro")) || content.pages.about.description),
    h(
      "section",
      { class: "cp-setinfo", "aria-label": "Set info" },
      h("p", { class: "cp-panel-tab" }, "Set info"),
      credits([
        ["Artist", content.site.name, "by"],
        ["Set", "burooj.als", "file"],
        ["Since", first ? monthLabel(first.start) : undefined, "bar 1"],
        ["Tracks", `${content.projects.length} projects · ${content.lab.length} devices · ${content.updates.length} markers`, "count"],
        ["Tempo", "120 bpm · 12/8 · C major", "feel"],
      ]),
      h(
        "p",
        { class: "cp-setinfo__contact" },
        link(`mailto:${content.site.email}`, { class: "cp-chipbtn" }, content.site.email),
      ),
    ),
    h("p", { class: "cp-label cp-story__lead", "aria-hidden": "true" }, h("span", null, "01"), " Side A"),
    story,
    buttons(actions),
  );
  bar(notes, 1, 2);

  return {
    el: screen("about", h("div", { class: "cp-page cp-page--liner" }, sleeve, notes)),
    heading: h1,
  };
}
