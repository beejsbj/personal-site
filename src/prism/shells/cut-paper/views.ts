/** A view of the session for each route. Home is the session: set info
 * beside the whole arrangement and its locators. Projects is the
 * arrangement in full. A project opens as its clip, zoomed into the
 * arrangement, with its story as clip notes. The lab is a rack of undated
 * sketches; about is the set notes; the resume is the Roles track drawn
 * out; anything else is a text view. Phones get the tape (./tape) wherever
 * the arrangement runs left to right. */
import { part } from "../../parts";
import { fallbackBody, fill } from "../rich";
import type { LabEntry, Project, ResumeEntry, Route } from "../types";
import { audition, soundLive } from "./audio";
import {
  adopt,
  auditionClip,
  bar,
  buttons,
  heading,
  hoverAudition,
  inlineCopy,
  noteVar,
  pageHead,
  prose,
  roll,
  scrap,
  screen,
  trackControls,
  type Env,
  type Screen,
} from "./bits";
import { arrangement, changesLane, markersLane, overlay, rolesLane, ruler, span } from "./arrangement";
import { h, link, markup } from "./dom";
import { chord, noteName, voicing } from "./music";
import { MONTH, sketchNotes, type Clip } from "./score";
import { tape } from "./tape";
import { monthLabel } from "./transport";

const playIcon = () =>
  markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path class="cp-tp__play" d="M4 2.5v11L13.5 8z"/><path class="cp-tp__pause" d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>');

/** A big play button bound to the transport (the whole career, or a
 * region). It shows the transport's real state. */
function playButton(env: Env, label: string, region?: { from: number; to: number }) {
  const { transport, signal, face } = env;
  const button = h("button", { type: "button", class: "cp-play", "aria-pressed": "false", disabled: face }, playIcon(), h("span", null, label));
  const mine = () =>
    region
      ? transport.region.from === region.from && transport.region.to === region.to
      : transport.region.from === env.session.from && transport.region.to === env.session.end;
  button.addEventListener("click", () => {
    if (transport.playing && mine()) transport.pause();
    else transport.play(region);
  }, { signal });
  transport.onTick((_, playing) => button.setAttribute("aria-pressed", String(playing && mine())), signal);
  return button;
}

/* ── home: the session ───────────────────────────────────── */

function home(env: Env): Screen {
  const { content, copy, session, transport, signal } = env;
  const page = content.pages.home;
  const { hero, currently } = page;
  const words = copy.home;
  const h1 = heading(hero.headline, "cp-info__title", "page.title", "home");
  const links = [
    ...content.site.social.map((item) => ({ label: item.label, url: item.href })),
    ...hero.links.filter((item) => !content.site.social.some((s) => s.href === item.href)).map((item) => ({ label: item.label, url: item.href })),
  ];

  const info = h(
    "section",
    { class: "cp-info", "aria-label": words.info },
    scrap("tomato", "torn", "cp-info__scrap-a"),
    scrap("mustard", "tri", "cp-info__scrap-b"),
    h(
      "figure",
      { class: "cp-portrait", ...part("home.portrait") },
      h("img", { src: hero.portrait.src, alt: hero.portrait.alt, width: 1080, height: 1920, decoding: "async" }),
      h("figcaption", null, link(hero.portrait.href, {}, hero.portrait.caption)),
    ),
    h("p", { class: "cp-tag cp-info__greeting", ...part("home.greeting") }, hero.greeting),
    h1,
    h("p", { class: "cp-info__role", ...part("home.occupation") }, hero.occupation),
    h("p", { class: "cp-info__welcome", ...part("home.welcome") }, hero.welcome),
    h("ul", { class: "cp-chips", ...part("home.links") }, links.map((item) => h("li", null, link(item.url, { class: "cp-chip" }, item.label)))),
    h(
      "aside",
      { class: "cp-note", ...part("home.currently") },
      h("span", { class: "cp-note__tape", "aria-hidden": "true" }),
      h("h2", null, currently.title),
      h("p", null, inlineCopy(currently.body)),
      link(currently.link.href, { class: "cp-note__more" }, currently.link.label, h("span", { "aria-hidden": "true" }, " →")),
    ),
  );

  const seconds = Math.round((session.end - session.from) * 3);
  const locators = page.updates;
  const shown = content.updates.slice(0, locators.limit);
  const sessionPanel = h(
    "section",
    { class: "cp-session", "aria-labelledby": "cp-session-title" },
    h(
      "header",
      { class: "cp-session__head" },
      h("h2", { class: "cp-tag", id: "cp-session-title" }, words.session),
      playButton(env, words.play),
      h("p", { class: "cp-session__length" }, fill(words.length, { n: seconds, from: monthLabel(session.from) })),
      h("p", { class: "cp-session__legend" }, words.legend),
    ),
    h("div", { class: "cp-wide" }, arrangement(env, false)),
    h("div", { class: "cp-narrow" }, tape(env, false)),
    h(
      "section",
      { class: "cp-locators cp-wide", "aria-labelledby": "cp-locators-title" },
      h("h2", { class: "cp-label", id: "cp-locators-title" }, words.locators, h("small", null, ` · ${locators.title}`)),
      h("p", { class: "cp-locators__intro" }, locators.intro),
      shown.length
        ? h(
            "ol",
            { class: "cp-locators__list", "aria-label": locators.listLabel },
            shown.map((update) => {
              const clip = session.clips.find((c) => c.id === `update:${update.id}`);
              const when = h("button", { type: "button", class: "cp-loc__when", "aria-label": fill(words.jump, { when: update.dateLabel }), disabled: env.face }, update.dateLabel);
              const li = h(
                "li",
                { class: "cp-loc", ...part("update.item", update.id) },
                when,
                link(update.href, { class: "cp-loc__title" }, update.title),
                h("small", null, `${update.kindLabel} · ${update.sourceLabel}`),
              );
              if (clip) {
                when.addEventListener("click", () => {
                  transport.seek(clip.start);
                  auditionClip(env, clip, li);
                }, { signal });
                transport.watch(li, clip.start, clip.start + MONTH, signal, "markers");
              }
              return li;
            }),
          )
        : h("p", { class: "cp-locators__empty" }, locators.empty),
      h("p", { class: "cp-locators__caption" }, locators.caption),
    ),
    link(page.work.link.href, { class: "cp-btn cp-btn--lit cp-session__all" }, page.work.link.label, h("small", null, ` ${content.derived.counts.projects}`)),
  );
  bar(info, 1);
  return { el: screen("home", h("div", { class: "cp-home" }, info, sessionPanel)), heading: h1 };
}

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
    item.html.trim() ? h("h2", { class: "cp-label" }, words.notes) : null,
    prose(item.html, part("project.body", item.slug)),
    media.length
      ? h(
          "div",
          { class: "cp-inserts", ...part("project.media", item.slug) },
          media.map((entry) =>
            h(
              "figure",
              { class: "cp-insert" },
              entry.type === "video"
                ? h("video", { src: entry.src, controls: true, muted: true, playsinline: true, preload: "metadata", "aria-label": entry.alt ?? item.title })
                : h("img", { src: entry.src, alt: entry.alt ?? "", loading: "lazy", decoding: "async" }),
              entry.caption ? h("figcaption", null, entry.caption) : null,
            ),
          ),
        )
      : null,
  );
  bar(side, 1);
  return { el: screen("project", h("div", { class: "cp-clipview", style: `--note:${noteVar(index)}` }, side, main)), heading: h1 };
}

/* ── the lab: a rack of sketches ─────────────────────────── */

/** Hear a sketch: its motif on the kalimba over the home chord. */
function hearSketch(env: Env, slug: string, el: HTMLElement) {
  if (env.face) return;
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

function pad(env: Env, item: LabEntry, index: number, big = false) {
  const label = fill(env.copy.lab.hear, { name: item.title });
  const hit = h(
    "button",
    { type: "button", class: big ? "cp-pad__hit cp-pad__hit--big" : "cp-pad__hit", "aria-label": label, title: label, disabled: env.face },
    roll(sketchNotes(item.slug)),
    h("span", { class: "cp-clip__run", "aria-hidden": "true" }),
  );
  hit.addEventListener("click", () => hearSketch(env, item.slug, hit), { signal: env.signal });
  let timer = 0;
  hit.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse") return;
    timer = window.setTimeout(() => hearSketch(env, item.slug, hit), 110);
  }, { signal: env.signal });
  hit.addEventListener("pointerleave", () => window.clearTimeout(timer), { signal: env.signal });
  return h("div", { class: "cp-pad", style: `--note:${noteVar(index + 2)}` }, hit);
}

function lab(env: Env): Screen {
  const { content, copy } = env;
  const page = content.pages.lab;
  const { h1, head } = pageHead(page.header, "lab", copy.lab.rack);
  const rack = h(
    "ul",
    { class: "cp-rack", "aria-label": page.listLabel },
    content.lab.map((item, index) =>
      h(
        "li",
        { class: "cp-rack__slot" },
        pad(env, item, index),
        h("p", { class: "cp-rack__meta", ...part("lab.meta", item.slug) }, `${item.type} · ${item.sourceEra}`),
        h("h2", { class: "cp-rack__title" }, link(item.detail, part("lab.title", item.slug), item.title)),
        h("p", { class: "cp-rack__sum", ...part("lab.summary", item.slug) }, item.summary),
      ),
    ),
  );
  return {
    el: screen(
      "lab",
      h(
        "div",
        { class: "cp-page" },
        bar(head, 2),
        h("p", { class: "cp-session__legend" }, copy.lab.undated),
        bar(rack, 2, 3),
        h(
          "div",
          { class: "cp-lab__more" },
          h("p", { class: "cp-lab__link", ...part("lab.more") }, link(page.more.href, { class: "cp-btn" }, page.more.label)),
          h("p", { class: "cp-lab__aside", ...part("lab.aside") }, inlineCopy(page.aside)),
        ),
      ),
    ),
    heading: h1,
  };
}

function labEntry(env: Env, item: LabEntry): Screen {
  const { content, copy } = env;
  const labels = content.pages.lab.detail.labels;
  const index = content.lab.indexOf(item);
  const h1 = heading(item.title, "cp-clipview__title", "lab.title", item.slug);
  const links = [...(item.href ? [{ label: copy.lab.open, url: item.href }] : []), ...item.links];
  const side = h(
    "div",
    { class: "cp-clipview__side" },
    pad(env, item, index, true),
    h("p", { class: "cp-head__kicker" }, h("span", { class: "cp-tag" }, copy.lab.rack), link("/lab", {}, content.pages.lab.detail.eyebrow)),
    h1,
    h("p", { class: "cp-clipview__lede", ...part("lab.summary", item.slug) }, item.summary),
    h("dl", { class: "cp-props", ...part("lab.meta", item.slug) }, h("div", null, h("dt", null, labels.type), h("dd", null, item.type)), h("div", null, h("dt", null, labels.era), h("dd", null, item.sourceEra))),
    buttons(links, part("lab.links", item.slug)),
    link("/lab", { class: "cp-back" }, h("span", { "aria-hidden": "true" }, "← "), copy.lab.back),
  );
  return {
    el: screen(
      "lab-entry",
      h("div", { class: "cp-clipview", style: `--note:${noteVar(index + 2)}` }, bar(side, 1), h("div", { class: "cp-clipview__main" }, prose(item.html, part("lab.body", item.slug)))),
    ),
    heading: h1,
  };
}

/* ── about: the set notes ────────────────────────────────── */

function about(env: Env): Screen {
  const { content, copy } = env;
  const page = content.pages.about;
  const { header } = page;
  const portrait = content.pages.home.hero.portrait;
  const h1 = heading(header.title, "cp-head__title", "page.title", "about");
  return {
    el: screen(
      "about",
      h(
        "div",
        { class: "cp-about" },
        h(
          "div",
          { class: "cp-about__side" },
          scrap("plum", "stairs", "cp-about__scrap-a"),
          scrap("tomato", "torn", "cp-about__scrap-b"),
          h("figure", { class: "cp-portrait cp-portrait--big" }, h("img", { src: portrait.src, alt: portrait.alt, decoding: "async" })),
        ),
        bar(
          h(
            "article",
            { class: "cp-about__notes" },
            h("p", { class: "cp-head__kicker" }, h("span", { class: "cp-tag" }, copy.about.notes), header.eyebrow ? h("span", part("page.eyebrow", "about"), header.eyebrow) : null),
            h1,
            header.intro ? h("p", { class: "cp-head__intro", ...part("page.intro", "about") }, header.intro) : null,
            prose(page.html, part("page.body", "about")),
            buttons(header.actions.map((a) => ({ label: a.label, url: a.href })), part("page.actions", "about")),
          ),
          1,
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
    default:
      return other(env, route);
  }
}

