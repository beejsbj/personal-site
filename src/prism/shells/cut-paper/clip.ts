/** A project: the clip view. The clip box (art, name, launch links), the
 * piano roll, where the story is the melody (every sentence a note, every
 * heading a held high note), the story itself to read under it, and a mixer
 * channel strip holding the credits. Reading moves the roll's read head;
 * clicking a note jumps to its sentence; "play clip" auditions the roll. */
import type { Route } from "../types";
import { h, seeded, text } from "./dom";
import { noteAt, NOTES, noteVar } from "./notes";
import { bar, buttons, credits, kicker, knob, prose, screen, type Env, type Project, type Screen } from "./parts";
import { play } from "./sound";
import { monthLabel, parseMonth } from "./timeline";

interface RollNote {
  block: HTMLElement;
  label: string;
  start: number;
  length: number;
  degree: number;
}

const SIXTEENTH = 125;

/** The story as a melody: sentences walk the scale, headings hold the top,
 * list items arpeggiate. Deterministic per project. */
function melody(story: HTMLElement, seed: string) {
  const random = seeded(seed);
  const notes: RollNote[] = [];
  let step = 0;
  let degree = 2;
  let arp = 0;
  const blocks = story.querySelectorAll<HTMLElement>(
    ":scope > h2, :scope > h3, :scope > p, :scope > ul > li, :scope > ol > li, :scope > blockquote, :scope > figure",
  );
  blocks.forEach((block, index) => {
    block.dataset.n = String(index);
    const tag = block.tagName;
    const words = text(block);
    if (tag === "H2" || tag === "H3") {
      if (notes.length) step += 1;
      notes.push({ block, label: words, start: step, length: 3, degree: tag === "H2" ? 6 : 5 });
      step += 3;
      arp = 0;
      return;
    }
    if (tag === "LI") {
      const length = Math.min(4, Math.max(1, Math.round(words.split(/\s+/).length / 8)));
      notes.push({ block, label: words, start: step, length, degree: [0, 2, 4, 3][arp % 4] });
      arp += 1;
      step += length;
      return;
    }
    const sentences = words.match(/[^.!?]+[.!?]*/g) ?? [words];
    for (const sentence of sentences) {
      const count = sentence.trim().split(/\s+/).length;
      if (count < 2 && sentences.length > 1) continue;
      const length = Math.min(4, Math.max(1, Math.round(count / 7)));
      degree = Math.min(5, Math.max(0, degree + (random() < 0.5 ? -1 : 1) * (1 + Math.floor(random() * 2))));
      notes.push({ block, label: sentence.trim(), start: step, length, degree });
      step += length;
    }
  });
  return { notes, total: Math.max(step, 16) };
}

export function clipView(route: Route, env: Env, item: Project): Screen {
  const { content, signal, reducedMotion } = env;
  const index = content.projects.indexOf(item);
  const note = noteAt(index);
  const colour = noteVar(note.id);
  const prev = content.projects[index - 1];
  const next = content.projects[index + 1];
  const trackNo = `${String(index + 1).padStart(2, "0")} / ${String(content.projects.length).padStart(2, "0")}`;
  const start = parseMonth(item.dateLabel, item.year);
  const media = item.media.filter((entry, i) => !(i === 0 && entry.src === item.cover));
  const story = prose(route.main.querySelector(".prose"), "cp-story");

  /* ── the clip box ───────────────────────────────────────── */
  const h1 = h("h1", { class: "cp-clipbox__title", tabindex: "-1", id: "cp-clip-title" }, item.title);
  const audition = h(
    "button",
    { type: "button", class: "cp-btn cp-btn--audition", "aria-pressed": "false", "data-info": "Play clip · audition the story as a melody" },
    h("span", { class: "cp-btn__icon", "aria-hidden": "true" }),
    h("span", { class: "cp-btn__label" }, "Play clip"),
  );
  const clipbox = h(
    "section",
    { class: "cp-clipbox", "aria-labelledby": "cp-clip-title" },
    h("p", { class: "cp-panel-tab" }, "Clip"),
    h(
      "figure",
      { class: "cp-clipbox__art" },
      h("img", { src: item.cover, alt: item.media[0]?.alt ?? `${item.title} cover`, decoding: "async" }),
    ),
    kicker(h("a", { href: "/projects" }, "Projects"), ` · track ${trackNo}`),
    h1,
    h("p", { class: "cp-clipbox__lede" }, item.summary),
    buttons(item.links),
    audition,
  );
  bar(clipbox, 1);

  /* ── the piano roll ─────────────────────────────────────── */
  const { notes, total } = story ? melody(story, item.slug) : { notes: [], total: 16 };
  const noteButtons = notes.map((entry, i) =>
    h(
      "button",
      {
        type: "button",
        class: "cp-pr__note",
        tabindex: i === 0 ? "0" : "-1",
        style: `--x:${entry.start / total}; --w:${entry.length / total}; --y:${6 - entry.degree}; --note:${noteVar(NOTES[entry.degree].id)}`,
        "aria-label": `${NOTES[entry.degree].sol}: ${entry.label.slice(0, 80)}`,
        "data-info": `${NOTES[entry.degree].sol} · ${entry.label.slice(0, 90)}${entry.label.length > 90 ? "…" : ""}`,
      },
    ),
  );
  const readHead = h("span", { class: "cp-pr__read", "aria-hidden": "true" });
  const playRun = h("span", { class: "cp-run cp-pr__run", "aria-hidden": "true" }, h("span", { class: "cp-run__head" }));
  const beats = Array.from({ length: Math.floor(total / 4) + 1 }, (_, i) =>
    h("i", { class: `cp-pr__beat${i % 4 === 0 ? " cp-pr__beat--bar" : ""}`, style: `--x:${(i * 4) / total}` }),
  );
  const pianoRoll = h(
    "section",
    { class: "cp-pr", "aria-label": "Piano roll: the story as notes", style: `--steps:${total}` },
    h("p", { class: "cp-panel-tab" }, "Notes", h("small", null, `${notes.length} · ${monthLabel(start)}`)),
    h(
      "div",
      { class: "cp-pr__body" },
      h(
        "ol",
        { class: "cp-pr__keys", "aria-hidden": "true" },
        [...NOTES].reverse().map((n) => h("li", { style: `--note:${noteVar(n.id)}` }, n.sol)),
      ),
      h(
        "div",
        { class: "cp-pr__grid", role: "group", "aria-label": "Notes; arrow keys move, Enter jumps to the sentence" },
        beats,
        noteButtons,
        readHead,
        playRun,
      ),
    ),
  );

  // roving focus across the notes
  noteButtons.forEach((button, i) => {
    button.addEventListener("keydown", (event) => {
      const moves: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: noteButtons.length - 1 };
      if (!(event.key in moves)) return;
      event.preventDefault();
      const target = noteButtons[Math.min(Math.max(moves[event.key], 0), noteButtons.length - 1)];
      noteButtons.forEach((b) => b.setAttribute("tabindex", b === target ? "0" : "-1"));
      target.focus();
    }, { signal });
    button.addEventListener("click", () => {
      const entry = notes[i];
      play(NOTES[entry.degree].frequency, 0.8);
      entry.block.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
      entry.block.dataset.flash = "";
      setTimeout(() => delete entry.block.dataset.flash, 900);
    }, { signal });
  });

  // reading moves the read head: the topmost sentence block in view
  const reading = (n: number | undefined) => {
    notes.forEach((entry, i) => {
      const on = n !== undefined && entry.block.dataset.n === String(n);
      if (on) noteButtons[i].dataset.reading = "";
      else delete noteButtons[i].dataset.reading;
    });
    const first = notes.find((entry) => entry.block.dataset.n === String(n));
    readHead.style.setProperty("--x", String(first ? first.start / total : 0));
    readHead.dataset.state = first ? "on" : "off";
  };
  const visible = new Set<HTMLElement>();
  const blocks = story ? [...new Set(notes.map((entry) => entry.block))] : [];

  // audition: the roll plays itself, a sixteenth per step
  let timers: number[] = [];
  let sweep: Animation | undefined;
  const stopAudition = () => {
    timers.forEach(clearTimeout);
    timers = [];
    sweep?.cancel();
    pianoRoll.dataset.state = "rest";
    audition.setAttribute("aria-pressed", "false");
    audition.querySelector(".cp-btn__label")!.textContent = "Play clip";
    noteButtons.forEach((b) => delete b.dataset.hit);
  };
  audition.addEventListener("click", () => {
    if (pianoRoll.dataset.state === "playing") return stopAudition();
    pianoRoll.dataset.state = "playing";
    audition.setAttribute("aria-pressed", "true");
    audition.querySelector(".cp-btn__label")!.textContent = "Stop clip";
    const duration = total * SIXTEENTH;
    sweep = playRun.animate(
      [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
      { duration, easing: "linear" },
    );
    notes.forEach((entry, i) => {
      timers.push(window.setTimeout(() => {
        play(NOTES[entry.degree].frequency, 0.75);
        noteButtons[i].dataset.hit = "";
        timers.push(window.setTimeout(() => delete noteButtons[i].dataset.hit, entry.length * SIXTEENTH));
      }, entry.start * SIXTEENTH));
    });
    timers.push(window.setTimeout(stopAudition, duration + 60));
  }, { signal });
  signal.addEventListener("abort", stopAudition);

  /* ── the channel strip: credits ─────────────────────────── */
  const strip = h(
    "aside",
    { class: "cp-strip", "aria-labelledby": "cp-strip-title" },
    h("p", { class: "cp-panel-tab" }, "Mixer"),
    h("span", { class: "cp-strip__cap", "aria-hidden": "true" }),
    h("h2", { class: "cp-strip__title", id: "cp-strip-title" }, "Credits", h("small", null, `track ${trackNo}`)),
    credits(
      [
        ["Role", item.role, "in"],
        ["Where", item.location, "out"],
        ["When", item.dateLabel, "start"],
        ["Kind", item.kind, "group"],
        ["Status", item.status, "state"],
        ["Tools", item.tools.join(", ") || undefined, "devices"],
        ["Filed", item.tags.map((tag) => tag.replace(/-/g, " ")).join(", ") || undefined, "tags"],
      ],
      "cp-credits--strip",
    ),
    h(
      "div",
      { class: "cp-strip__hw", "aria-hidden": "true" },
      knob(item.kind === "Arcade" ? 0.8 : 0.2, "pan", item.kind === "Arcade" ? "R" : "L"),
      knob(Math.min(1, item.tools.length / 6), "devices", String(item.tools.length)),
      h(
        "span",
        { class: "cp-fader" },
        h("span", { class: "cp-fader__meter" }, Array.from({ length: 12 }, () => h("i"))),
        h("span", { class: "cp-fader__track" }, h("span", { class: "cp-fader__cap", style: `--level:${0.3 + (index % 4) * 0.12}` })),
      ),
    ),
    h("p", { class: "cp-strip__name", "aria-hidden": "true" }, item.title),
  );

  /* ── neighbours ─────────────────────────────────────────── */
  const neighbours = h(
    "nav",
    { class: "cp-nb", "aria-label": "Neighbouring tracks" },
    prev
      ? h("a", { class: "cp-nb__btn", href: prev.href, rel: "prev", "data-info": `Previous track · ${prev.title}` }, h("span", { class: "cp-nb__icon cp-nb__icon--prev", "aria-hidden": "true" }), h("span", null, h("small", null, "prev track"), prev.title))
      : h("span", { class: "cp-nb__btn", "data-state": "off" }, h("span", { class: "cp-nb__icon cp-nb__icon--prev", "aria-hidden": "true" }), h("span", null, h("small", null, "first track"))),
    h("a", { class: "cp-nb__all", href: "/projects" }, "All tracks"),
    next
      ? h("a", { class: "cp-nb__btn cp-nb__btn--next", href: next.href, rel: "next", "data-info": `Next track · ${next.title}` }, h("span", null, h("small", null, "next track"), next.title), h("span", { class: "cp-nb__icon", "aria-hidden": "true" }))
      : h("span", { class: "cp-nb__btn cp-nb__btn--next", "data-state": "off" }, h("span", null, h("small", null, "last track")), h("span", { class: "cp-nb__icon", "aria-hidden": "true" })),
  );

  const samples = media.length
    ? h(
        "section",
        { class: "cp-samples", "aria-label": "Samples" },
        h("p", { class: "cp-panel-tab" }, "Samples"),
        media.map((entry) =>
          h(
            "figure",
            { class: "cp-sample" },
            entry.type === "video"
              ? h("video", { src: entry.src, controls: true, muted: true, playsinline: true, preload: "metadata", "aria-label": entry.alt ?? item.title })
              : h("img", { src: entry.src, alt: entry.alt ?? "", loading: "lazy", decoding: "async" }),
            entry.caption ? h("figcaption", null, entry.caption) : null,
          ),
        ),
      )
    : null;

  const editor = h(
    "div",
    { class: "cp-editor" },
    pianoRoll,
    h(
      "article",
      { class: "cp-notes", "aria-label": `${item.title}: the story` },
      h("p", { class: "cp-panel-tab" }, "Story"),
      story,
      samples,
    ),
  );
  bar(editor, 2, 2);

  const el = screen(
    "project",
    h(
      "div",
      { class: "cp-page cp-page--clip", style: `--note:${colour}` },
      neighbours,
      h("div", { class: "cp-clipview" }, clipbox, editor, strip),
    ),
  );

  if (blocks.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
          else visible.delete(entry.target as HTMLElement);
        }
        const top = blocks.find((block) => visible.has(block));
        reading(top ? Number(top.dataset.n) : undefined);
      },
      { root: el, rootMargin: "-20% 0px -45% 0px" },
    );
    blocks.forEach((block) => observer.observe(block));
    signal.addEventListener("abort", () => observer.disconnect());
  }
  reading(undefined);

  return { el, heading: h1 };
}
