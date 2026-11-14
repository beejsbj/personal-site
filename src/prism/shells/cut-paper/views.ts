/** A view of the session for each route. Home is the set info beside a
 * turntable and the crate (./home), with the locators underneath. Projects is the
 * arrangement in full. A project opens as its clip, zoomed into the
 * arrangement, with its story as clip notes. The lab is the rack, its pads
 * armed or muted, over the Labbook (./lab); about is the set notes; the resume is the Roles track drawn
 * out; writing is the Send, its posts bounced out of the session
 * (./writing); anything else is a text view. Phones get the tape (./tape)
 * wherever the arrangement runs left to right. */
import { part } from "../../parts";
import { fallbackBody, fill } from "../rich";
import type { Project, ResumeEntry, Route } from "../types";
import {
  adopt,
  bar,
  buttons,
  heading,
  hoverAudition,
  inlineCopy,
  noteVar,
  pageHead,
  playButton,
  prose,
  scrap,
  screen,
  trackControls,
  type Env,
  type Screen,
} from "./bits";
import { story, tendStory } from "./blocks";
import { arrangement, changesLane, markersLane, overlay, rolesLane, ruler, span } from "./arrangement";
import { h, link } from "./dom";
import { noteName } from "./music";
import { MONTH, type Clip } from "./score";
import { home } from "./home";
import { lab, labEntry } from "./lab";
import { tape } from "./tape";
import { writing, writingEntry } from "./writing";

/* ── projects: the arrangement ───────────────────────────── */

function projects(env: Env): Screen {
  const { content, copy } = env;
  const { h1, head } = pageHead(content.pages.projects.header, "projects", copy.projects.arrangement);
  return {
    el: screen(
      "projects",
      h(
        "div",
        { class: "cp-page" },
        bar(head, 2),
        h("div", { class: "cp-session__bar" }, playButton(env, copy.home.play), h("p", { class: "cp-session__legend" }, copy.home.legend)),
        h("div", { class: "cp-wide", "aria-label": content.pages.projects.listLabel, role: "group" }, arrangement(env, true)),
        h("div", { class: "cp-narrow" }, tape(env, true)),
      ),
    ),
    heading: h1,
  };
}

/* ── a project: its clip, zoomed in ──────────────────────── */

/** The arrangement zoomed to a year around one clip: chords, bass, the
 * clip's notes as a piano roll with pitch names, and nearby markers. */
function editor(env: Env, clip: Clip, title: string, index: number) {
  const { copy } = env;
  const words = copy.project;
  const range = { from: clip.start - 0.25, to: clip.end + 0.25 };
  const degrees = clip.notes.map((n) => n.degree);
  const high = Math.max(...degrees, 4) + 1;
  const low = Math.min(...degrees, 0) - 1;
  const pitches: number[] = [];
  for (let d = high; d >= low; d -= 1) pitches.push(d);

  const head = (name: string, voice: string, row: HTMLElement, track: string) =>
    h("div", { class: "cp-arr__head" }, h("span", { class: "cp-arr__name" }, name, h("small", null, voice)), trackControls(env, track, name, row));
  const changes = h("div", { class: "cp-arr__row cp-arr__row--changes" });
  changes.append(head(copy.tracks.changes, copy.tracks.changesVoice, changes, "changes"), changesLane(env, range));
  const roles = h("div", { class: "cp-arr__row cp-arr__row--roles" });
  roles.append(head(copy.tracks.roles, copy.tracks.rolesVoice, roles, "roles"), rolesLane(env, range));
  const markers = h("div", { class: "cp-arr__row cp-arr__row--markers" });
  markers.append(head(copy.tracks.markers, copy.tracks.markersVoice, markers, "markers"), markersLane(env, range));

  const notes = h(
    "div",
    { class: "cp-lane cp-lane--piano", style: `--rows:${pitches.length}; --note:${noteVar(index)}` },
    h("span", { class: "cp-piano__clip", style: span(clip.start, clip.end, range) }),
    clip.notes.map((n) => {
      const start = clip.start + n.at * MONTH;
      const el = h("span", {
        class: "cp-piano__note",
        style: `${span(start, start + n.length * MONTH, range)}; --row:${high - n.degree}`,
        title: noteName(n.degree),
      });
      env.transport.watch(el, start, start + n.length * MONTH, env.signal, clip.track);
      return el;
    }),
  );
  const track = h("div", { class: "cp-arr__row cp-arr__row--piano", style: `--note:${noteVar(index)}` });
  track.append(
    h(
      "div",
      { class: "cp-arr__head cp-piano__keys" },
      h("span", { class: "cp-arr__name" }, title, h("small", null, copy.tracks.voices[clip.voice as "lead" | "chip"] ?? "")),
      trackControls(env, clip.track, title, track),
      h("ol", { class: "cp-piano__names", style: `--rows:${pitches.length}`, "aria-hidden": "true" }, pitches.map((d) => h("li", { "data-root": d % 7 === 0 ? "" : null }, noteName(d)))),
    ),
    notes,
  );

  return h(
    "section",
    { class: "cp-editor", "aria-labelledby": "cp-editor-title" },
    h(
      "header",
      { class: "cp-editor__head" },
      h("h2", { class: "cp-tag", id: "cp-editor-title" }, words.editor),
      playButton(env, words.play, { from: clip.start, to: clip.end }),
    ),
    h(
      "div",
      { class: "cp-arr cp-arr--zoom" },
      ruler(env, range, h("span", null, words.clip), true),
      changes,
      roles,
      track,
      markers,
      overlay(env, range),
    ),
    h("p", { class: "cp-editor__hint" }, words.editorHint),
  );
}

function project(env: Env, item: Project): Screen {
  const { content, copy, session } = env;
  const words = copy.project;
  const labels = content.pages.projects.detail.labels;
  const index = content.projects.indexOf(item);
  const clip = session.clips.find((c) => c.id === `project:${item.slug}`)!;
  const h1 = heading(item.title, "cp-clipview__title", "project.title", item.slug);
  const prev = content.projects[index - 1];
  const next = content.projects[index + 1];
  const media = item.media.filter((entry, i) => !(i === 0 && entry.src === item.cover));
  const chords = [...new Set(session.changes.filter((c) => c.t < clip.end && c.t + 0.5 > clip.start).map((c) => c.chord.name))];
  const n = content.projects.length;

  const side = h(
    "div",
    { class: "cp-clipview__side" },
    item.cover
      ? h("figure", { class: "cp-cover", style: `--note:${noteVar(index)}` }, h("img", { src: item.cover, alt: item.media[0]?.src === item.cover ? (item.media[0].alt ?? "") : "", decoding: "async" }))
      : null,
    h("p", { class: "cp-head__kicker" }, h("span", { class: "cp-tag" }, words.clip), h("span", null, `${fill(words.trackOf, { no: String(index + 1).padStart(2, "0"), n: String(n).padStart(2, "0") })} · ${item.kind}`)),
    h1,
    h("p", { class: "cp-clipview__lede", ...part("project.summary", item.slug) }, item.summary),
    h(
      "dl",
      { class: "cp-props", ...part("project.meta", item.slug) },
      [
        [labels.role, item.role],
        [labels.location, item.location],
        [labels.date, item.dateLabel],
        [words.voice, copy.tracks.voices[clip.voice as "lead" | "chip"]],
        [words.chords, chords.join(" → ")],
      ]
        .filter(([, value]) => value)
        .map(([term, value]) => h("div", null, h("dt", null, term), h("dd", null, value))),
    ),
    item.tools.length
      ? h("div", { class: "cp-props cp-props--tools" }, h("p", { class: "cp-label" }, words.tools), h("ul", { class: "cp-chips", ...part("project.tools", item.slug) }, item.tools.map((tool) => h("li", { class: "cp-chip cp-chip--flat" }, tool))))
      : null,
    buttons(item.links, part("project.links", item.slug)),
    h(
      "nav",
      { class: "cp-pager", "aria-label": content.pages.projects.listLabel },
      prev
        ? link(prev.href, { class: "cp-pager__link", rel: "prev" }, h("small", null, words.prev), prev.title)
        : h("span", { class: "cp-pager__link", "data-off": "" }, h("small", null, words.first)),
      next
        ? link(next.href, { class: "cp-pager__link cp-pager__link--next", rel: "next" }, h("small", null, words.next), next.title)
        : h("span", { class: "cp-pager__link cp-pager__link--next", "data-off": "" }, h("small", null, words.last)),
    ),
    link(content.pages.projects.detail.back.href, { class: "cp-back" }, h("span", { "aria-hidden": "true" }, "← "), content.pages.projects.detail.back.label),
  );

  const main = h(
    "div",
    { class: "cp-clipview__main" },
    editor(env, clip, item.title, index),
    item.html.trim() || item.blocks.length ? h("h2", { class: "cp-label" }, words.notes) : null,
    // told with blocks, its notes are a story (./blocks); else its prose
    item.blocks.some((told) => told.type !== "text") ? story(env, item.slug, item.blocks, item.html, "project.body") : prose(item.html, part("project.body", item.slug)),
    media.length
      ? h(
          "div",
          { class: "cp-inserts", ...part("project.media", item.slug) },
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
  );
  bar(side, 1);
  const el = screen("project", h("div", { class: "cp-clipview", style: `--note:${noteVar(index)}` }, side, main));
  return { el, heading: h1, arrive: tendStory(env, el) };
}

/* ── about: the set notes, pasted up as a torn jazz poster ── */

function about(env: Env): Screen {
  const { content, copy } = env;
  const page = content.pages.about;
  const { header } = page;
  const portrait = content.pages.home.hero.portrait;
  const h1 = heading(header.title, "cp-poster__title", "page.title", "about");
  const tag = h("p", { class: "cp-poster__tag", "aria-hidden": "true" }, copy.about.tag.map((word) => h("span", null, word)));
  bar(tag, 4, 8);
  const poster = bar(
    h(
      "section",
      { class: "cp-poster", "aria-label": copy.about.notes },
      scrap("tomato", "torn", "cp-poster__a"),
      scrap("plum", "stairs", "cp-poster__b"),
      scrap("mustard", "tri", "cp-poster__c"),
      scrap("bone", "strip", "cp-poster__d"),
      scrap("pine", "dot", "cp-poster__e"),
      h("figure", { class: "cp-poster__portrait" }, h("img", { src: portrait.src, alt: portrait.alt, decoding: "async" })),
      h("p", { class: "cp-head__kicker cp-poster__kicker" }, h("span", { class: "cp-tag" }, copy.about.notes), header.eyebrow ? h("span", part("page.eyebrow", "about"), header.eyebrow) : null),
      h1,
      header.intro ? h("p", { class: "cp-poster__intro", ...part("page.intro", "about") }, header.intro) : null,
      tag,
    ),
    2,
  );
  tag.removeAttribute("data-beat");
  return {
    el: screen(
      "about",
      h(
        "div",
        { class: "cp-about" },
        poster,
        bar(
          h(
            "article",
            { class: "cp-about__body", "aria-label": copy.about.body },
            prose(page.html, part("page.body", "about")),
            buttons(header.actions.map((a) => ({ label: a.label, url: a.href })), part("page.actions", "about")),
          ),
          2,
          2,
        ),
      ),
    ),
    heading: h1,
  };
}

/* ── the resume: the Roles track, drawn out ──────────────── */

function resume(env: Env): Screen {
  const { content, copy, session, transport, signal } = env;
  const page = content.pages.resume;
  const { h1, head } = pageHead(page.header, "resume", copy.resume.roles);
  head.append(h("ul", { class: "cp-chips", ...part("page.actions", "resume") }, page.header.actions.map((a) => h("li", null, link(a.href, { class: "cp-chip" }, a.label)))));
  const range = { from: session.from, to: session.end };
  let count = 0;

  const row = (entry: ResumeEntry, kind: "resume.role" | "resume.education") => {
    count += 1;
    const clip = session.clips.find((c) => c.id === `role:${entry.id}`);
    const lane = h("div", { class: "cp-lane cp-lane--role" });
    const li = h(
      "li",
      { class: "cp-arr__row cp-role", ...part(kind, entry.id), style: `--note:${noteVar(count + 3)}` },
      h(
        "div",
        { class: "cp-arr__head cp-role__copy" },
        h("span", { class: "cp-track__no", "aria-hidden": "true" }, String(count).padStart(2, "0")),
        h(
          "div",
          null,
          h("h3", { class: "cp-role__title" }, entry.title ?? entry.org ?? "", entry.title && entry.org ? h("span", { class: "cp-role__org" }, ` · ${entry.org}`) : null),
          entry.dateLine ? h("p", { class: "cp-role__when" }, entry.dateLine) : null,
          entry.summary ? h("p", { class: "cp-role__sum" }, inlineCopy(entry.summary)) : null,
          entry.bullets.length ? h("ul", { class: "cp-role__bullets" }, entry.bullets.map((b) => h("li", null, inlineCopy(b)))) : null,
        ),
      ),
      lane,
    );
    if (clip) {
      const el = h("span", { class: "cp-rclip cp-rclip--solo", style: span(clip.start, clip.end, range), title: entry.dateLine }, h("span", null, entry.org ?? entry.title ?? ""));
      lane.append(el);
      transport.watch(el, clip.start, clip.end, signal, "roles");
      hoverAudition(env, li, clip, el);
    } else lane.append(h("span", { class: "cp-rclip cp-rclip--undated" }, copy.resume.undated));
    return li;
  };

  const { experience, education, tools } = content.resume;
  const rolesHead = h("div", { class: "cp-roles__head" }, h("p", { class: "cp-session__legend" }, copy.resume.legend));
  const corner = h("span", { class: "cp-arr__name" }, copy.tracks.roles, h("small", null, copy.tracks.rolesVoice));
  const roles = h(
    "section",
    { class: "cp-arr cp-arr--roles", "aria-label": copy.resume.roles },
    ruler(env, range, corner),
    h("h2", { class: "cp-roles__group" }, experience.title),
    h("ol", { class: "cp-roles__list" }, experience.roles.map((e) => row(e, "resume.role"))),
    h("h2", { class: "cp-roles__group" }, education.title),
    h("ol", { class: "cp-roles__list" }, education.entries.map((e) => row(e, "resume.education"))),
    overlay(env, range),
  );
  corner.after(trackControls(env, "roles", copy.tracks.roles, roles));
  return {
    el: screen(
      "resume",
      h(
        "div",
        { class: "cp-page cp-cv" },
        bar(head, 2),
        rolesHead,
        roles,
        h("section", { class: "cp-cv__tools" }, h("h2", { class: "cp-label" }, tools.title), h("ul", { class: "cp-chips", ...part("resume.tools") }, tools.items.map((t) => h("li", { class: "cp-chip cp-chip--flat" }, t)))),
        prose(page.html, part("page.body", "resume")),
      ),
    ),
    heading: h1,
  };
}

/* ── anything else: the text view ────────────────────────── */

function other(env: Env, route: Route): Screen {
  const paper = h("div", { class: "cp-sheet__paper" }, adopt(fallbackBody(route)));
  let h1 = paper.querySelector<HTMLElement>("h1");
  if (!h1) {
    h1 = heading(route.title.split("|")[0].trim(), "cp-head__title");
    paper.prepend(h1);
  }
  h1.setAttribute("tabindex", "-1");
  return {
    el: screen("other", h("div", { class: "cp-page cp-sheet" }, h("p", { class: "cp-head__kicker" }, h("span", { class: "cp-tag" }, env.copy.other.label), h("span", null, route.path)), paper)),
    heading: h1,
  };
}

export function buildScreen(route: Route, env: Env): Screen {
  const { content } = env;
  switch (route.kind) {
    case "home":
      return home(env);
    case "projects":
      return projects(env);
    case "project": {
      const item = content.projects.find((p) => p.slug === route.slug);
      return item ? project(env, item) : other(env, route);
    }
    case "lab":
      return lab(env);
    case "lab-entry": {
      const item = content.lab.find((entry) => entry.slug === route.slug && entry.hasPage);
      return item ? labEntry(env, item) : other(env, route);
    }
    case "about":
      return about(env);
    case "resume":
      return resume(env);
    case "writing":
      return writing(env);
    case "writing-entry":
      return writingEntry(env, route);
    default:
      return other(env, route);
  }
}

