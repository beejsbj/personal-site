/** Writing is what leaves the session: the Send. Each public post is a
 * bounce, a flag on the send lane at the date it went out and a motif sung
 * over the chord it was written in. The index is the send lane and a wall
 * of bounced sheets; a post is its sheet blown up into liner notes, with
 * Substack as the send's destination. Everything reads `content.writing`
 * and the writing page's copy; only the requested post carries its HTML. */
import { part } from "../../parts";
import { fill } from "../rich";
import type { Route, SiteContent } from "../types";
import { audition, soundLive } from "./audio";
import { overlay, ruler } from "./arrangement";
import { bar, heading, pageHead, playButton, prose, roll, scrap, screen, spell, type Env, type Screen } from "./bits";
import { h, link } from "./dom";
import { motif, realize, voicing, type Note } from "./music";
import { MONTH, parseDay } from "./score";
import { place } from "./transport";

type Post = SiteContent["writing"]["posts"][number];

/** The writing key's colour (D, la). */
const NOTE = "var(--cp-la)";

/** When a post went out, as session time; undefined if its date is unreadable. */
function when(post: Post) {
  const t = parseDay(post.date.slice(0, 10));
  return Number.isFinite(t) ? t : undefined;
}

/** A post's motif, sung over the chord under its date. */
function notesFor(env: Env, post: Post): Note[] {
  const t = when(post) ?? env.session.now;
  return realize(motif(`writing:${post.slug}`), (eighth) => env.session.chordAt(t + eighth * MONTH));
}

/** Hear a bounce: its motif on bells over the chord it was written in. The
 * strip's own playhead runs either way, so it reads with sound off. */
function hear(env: Env, post: Post, notes: Note[], el: HTMLElement) {
  if (env.face || env.signal.aborted) return;
  if (soundLive()) {
    const c = env.session.chordAt(when(post) ?? env.session.now);
    audition([
      ...voicing(c).map((degree) => ({ offset: 0, seconds: 1.4, degree, voice: "keys" as const, velocity: 0.3 })),
      ...notes.map((n) => ({ offset: n.at * 0.25, seconds: n.length * 0.25 + 0.3, degree: n.degree, voice: "bell" as const, velocity: n.at % 3 === 0 ? 0.8 : 0.6 })),
    ]);
  }
  el.style.setProperty("--hear", "1.5s");
  el.removeAttribute("data-hearing");
  void el.offsetWidth;
  el.setAttribute("data-hearing", "");
  const timer = window.setTimeout(() => el.removeAttribute("data-hearing"), 1580);
  env.signal.addEventListener("abort", () => window.clearTimeout(timer), { once: true });
}

/** The bounce's motif strip, a button that plays it. */
function strip(env: Env, post: Post, notes: Note[], big = false) {
  const label = fill(env.copy.writing.hear, { name: post.title });
  const button = h(
    "button",
    { type: "button", class: big ? "cp-bounce__hit cp-bounce__hit--big" : "cp-bounce__hit", "aria-label": label, title: label, disabled: env.face, "data-notes": spell(notes) },
    roll(notes),
    h("span", { class: "cp-clip__run", "aria-hidden": "true" }),
  );
  button.addEventListener("click", () => hear(env, post, notes, button), { signal: env.signal });
  return button;
}

/** "Writing unavailable", "nothing here": a slip of bone with a tag. */
function notice(tag: string, message: string, ...after: (Node | null)[]) {
  return h(
    "div",
    { class: "cp-slip", role: "status" },
    h("span", { class: "cp-slip__tape", "aria-hidden": "true" }),
    h("p", { class: "cp-tag cp-slip__tag" }, tag),
    h("p", { class: "cp-slip__msg" }, message),
    ...after,
  );
}

const subscribeUrl = (content: SiteContent) => `${content.site.writingUrl.replace(/\/$/, "")}/subscribe`;

/* ── the index: the send lane and the bounces ────────────── */

/** The send: the session's ruler, one lane with a flag per post at its date,
 * and the playhead. Flags light as the playhead passes. */
function sendLane(env: Env, posts: Post[]) {
  const { session, transport, signal, copy } = env;
  const times = posts.map(when).filter((t): t is number => t !== undefined);
  const range = { from: Math.min(session.from, Math.floor(Math.min(...times) * 2) / 2), to: session.end };
  const words = copy.writing;
  const corner = h("span", null, words.sends, h("small", null, String(posts.length)));
  const lane = h("div", { class: "cp-lane cp-lane--sends" });
  let previous = -Infinity;
  let row = 0;
  [...posts]
    .map((post) => ({ post, t: when(post) }))
    .filter((p): p is { post: Post; t: number } => p.t !== undefined)
    .sort((a, b) => a.t - b.t)
    .forEach(({ post, t }) => {
      row = t - previous < (range.to - range.from) / 40 ? (row + 1) % 3 : 0;
      previous = t;
      const flag = link(post.href, { class: "cp-send", style: `--at:${place(t, range).toFixed(5)}; --row:${row}`, tabindex: "-1", title: `${post.dateLabel} · ${post.title}` }, h("span", { class: "cp-send__pin" }));
      transport.watch(flag, t, t + MONTH, signal);
      lane.append(flag);
    });
  return h(
    "section",
    { class: "cp-arr cp-arr--sends", "aria-hidden": "true" },
    ruler(env, range, corner),
    h("div", { class: "cp-arr__row cp-arr__row--sends" }, h("div", { class: "cp-arr__head" }, h("span", { class: "cp-arr__name" }, words.bus, h("small", null, words.busVoice))), lane),
    overlay(env, range),
  );
}

/** One post on the wall: its strip, its number and date, title and summary.
 * It lifts while the playhead is on its date. */
function bounce(env: Env, post: Post, index: number, count: number) {
  const notes = notesFor(env, post);
  const t = when(post);
  const c = env.session.chordAt(t ?? env.session.now);
  const card = h(
    "li",
    { class: "cp-bounce", style: `--tilt:${[-1.2, 0.8, -0.4, 1.1, -0.9][index % 5]}deg` },
    h("span", { class: "cp-bounce__tape", "aria-hidden": "true" }),
    h(
      "p",
      { class: "cp-bounce__meta" },
      h("span", { class: "cp-bounce__no" }, fill(env.copy.writing.bounce, { no: String(count - index).padStart(2, "0") })),
      h("time", { datetime: post.date, ...part("writing.meta", post.slug) }, post.dateLabel),
      h("span", { class: "cp-bounce__chord" }, c.name),
    ),
    strip(env, post, notes),
    h("h2", { class: "cp-bounce__title", ...part("writing.title", post.slug) }, link(post.href, {}, post.title)),
    h("p", { class: "cp-bounce__sum", ...part("writing.summary", post.slug) }, post.subtitle || post.description),
  );
  if (t !== undefined) env.transport.watch(card, t, t + MONTH, env.signal);
  return card;
}

export function writing(env: Env): Screen {
  const { content, copy } = env;
  const page = content.pages.writing;
  const words = page.copy;
  const { h1, head } = pageHead(page.header, "writing", copy.writing.send);
  const { posts, status } = content.writing;
  let body: (HTMLElement | null)[];
  if (status === "unavailable")
    body = [notice(copy.writing.noSignal, words.unavailableMessage, h("p", { class: "cp-slip__go" }, link(content.site.writingUrl, { class: "cp-btn cp-btn--ink" }, words.sourceLabel)))];
  else if (!posts.length) body = [notice(copy.writing.silence, words.emptyMessage)];
  else
    body = [
      h("div", { class: "cp-session__bar" }, playButton(env, copy.home.play), h("p", { class: "cp-session__legend" }, copy.writing.legend)),
      sendLane(env, posts),
      h("h2", { class: "cp-label cp-bounces__label" }, copy.writing.bounces, h("small", null, ` · ${words.listLabel}`)),
      // the wall enters as one: a beat per sheet would delay every hover
      bar(h("div", null, h("ol", { class: "cp-bounces", "aria-label": words.listLabel }, posts.map((post, i) => bounce(env, post, i, posts.length)))), 1, 3),
    ];
  const actions = page.header.actions.length
    ? h("ul", { class: "cp-buttons", ...part("page.actions", "writing") }, page.header.actions.map((a) => h("li", null, link(a.href, { class: "cp-btn" }, a.label))))
    : null;
  return {
    el: screen("writing", h("div", { class: "cp-page cp-sends", style: `--note:${NOTE}` }, bar(head, 2), actions, ...body)),
    heading: h1,
  };
}

/* ── a post: the bounce's liner notes ─────────────────────── */

export function writingEntry(env: Env, route: Route): Screen {
  const { content, copy } = env;
  const page = content.pages.writing;
  const words = page.copy;
  const requested = content.writing.entry;
  const entry = content.writing.entryStatus === "available" && requested?.slug === route.slug ? requested : undefined;
  const kicker = h("p", { class: "cp-head__kicker" }, h("span", { class: "cp-tag" }, copy.writing.send), link("/writing", part("page.eyebrow", "writing"), page.header.eyebrow ?? page.header.title));
  const back = (attrs = {}) => link("/writing", { class: "cp-back", ...attrs }, h("span", { "aria-hidden": "true" }, "← "), words.backLabel);

  if (!entry) {
    const h1 = heading(page.header.title, "cp-head__title", "page.title", "writing");
    const message = content.writing.entryStatus === "missing" ? words.entryMissingMessage : words.entryUnavailableMessage;
    const tag = content.writing.entryStatus === "missing" ? copy.writing.silence : copy.writing.noSignal;
    return {
      el: screen(
        "writing-entry",
        h(
          "div",
          { class: "cp-page cp-sends", style: `--note:${NOTE}` },
          bar(h("header", { class: "cp-head" }, kicker, h1), 2),
          bar(h("div", { class: "cp-sends__missing" }, notice(tag, message, h("p", { class: "cp-slip__go" }, link(content.site.writingUrl, { class: "cp-btn cp-btn--ink" }, words.sourceLabel))), back()), 2, 2),
        ),
      ),
      heading: h1,
    };
  }

  const notes = notesFor(env, entry);
  const t = when(entry);
  const c = env.session.chordAt(t ?? env.session.now);
  const index = content.writing.posts.findIndex((p) => p.slug === entry.slug);
  const count = content.writing.posts.length;
  const h1 = heading(entry.title, "cp-clipview__title", "writing.title", entry.slug);
  const sendTo = h(
    "ul",
    { class: "cp-buttons", ...part("writing.links", entry.slug) },
    h("li", null, link(entry.canonical, { class: "cp-btn cp-btn--lit" }, words.originLabel)),
    h("li", null, link(subscribeUrl(content), { class: "cp-btn" }, words.subscribeLabel)),
  );
  const side = h(
    "div",
    { class: "cp-clipview__side cp-liner__side" },
    h(
      "div",
      { class: "cp-liner__bounce" },
      h("p", { class: "cp-bounce__meta" }, index >= 0 ? h("span", { class: "cp-bounce__no" }, fill(copy.writing.bounce, { no: String(count - index).padStart(2, "0") })) : null, h("span", null, copy.writing.bus), h("span", { class: "cp-bounce__chord" }, c.name)),
      strip(env, entry, notes, true),
    ),
    kicker,
    h1,
    entry.subtitle ? h("p", { class: "cp-clipview__lede", ...part("writing.subtitle", entry.slug) }, entry.subtitle) : null,
    h(
      "dl",
      { class: "cp-props" },
      h("div", null, h("dt", null, copy.writing.bounced), h("dd", null, h("time", { datetime: entry.date, ...part("writing.meta", entry.slug) }, entry.dateLabel))),
      h("div", null, h("dt", null, copy.writing.over), h("dd", null, c.name)),
      h("div", null, h("dt", null, copy.writing.motif), h("dd", null, spell(notes))),
    ),
    sendTo,
    h("p", { class: "cp-liner__back", ...part("writing.links", entry.slug) }, back()),
  );
  if (t !== undefined) env.transport.watch(side.querySelector<HTMLElement>(".cp-liner__bounce")!, t, t + MONTH, env.signal);

  const body = prose(entry.html, part("writing.body", entry.slug));
  // the page has one h1, the post's title; a heading inside the body steps down
  body?.querySelectorAll("h1").forEach((old) => {
    const h2 = h("h2", null);
    h2.append(...old.childNodes);
    old.replaceWith(h2);
  });
  const sheet = h(
    "article",
    { class: "cp-liner", "aria-labelledby": "cp-liner-title" },
    h("span", { class: "cp-liner__tape", "aria-hidden": "true" }),
    scrap("tomato", "tri", "cp-liner__scrap"),
    h("p", { class: "cp-liner__head" }, h("span", { id: "cp-liner-title" }, copy.writing.liner), h("span", null, entry.dateLabel)),
    body,
    h(
      "aside",
      { class: "cp-return", "aria-labelledby": "cp-return-title", ...part("writing.end", entry.slug) },
      h("p", { class: "cp-tag cp-return__tag" }, copy.writing.return),
      h("h2", { class: "cp-return__title", id: "cp-return-title" }, words.endHeading),
      h("p", { class: "cp-return__body" }, words.endBody),
      h(
        "ul",
        { class: "cp-buttons", ...part("writing.links", entry.slug) },
        h("li", null, link(subscribeUrl(content), { class: "cp-btn cp-btn--lit" }, words.subscribeLabel)),
        h("li", null, link(entry.canonical, { class: "cp-btn" }, words.originLabel)),
      ),
    ),
  );
  return {
    el: screen("writing-entry", h("div", { class: "cp-clipview cp-liner__view", style: `--note:${NOTE}` }, bar(side, 1), bar(h("div", { class: "cp-clipview__main" }, sheet), 1, 3))),
    heading: h1,
  };
}
