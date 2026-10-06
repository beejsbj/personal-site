/** The DAW window, which persists across routes: the transport bar, the
 * overview (the whole career, scrubbable), the browser (seven keys in F
 * major that are the site's navigation) and the view where each route's
 * screen sits. Every readout on it reports the real playhead. */
import { fill } from "../rich";
import type { RouteKind, ShellContext } from "../types";
import { armUnlock, forbidSound, onSound, setSound, soundWanted, tap, wokeJustNow } from "./audio";
import { noteVar, type Copy } from "./bits";
import { h, link, markup } from "./dom";
import { noteName } from "./music";
import { sessionFor, type Session } from "./score";
import { monthLabel, place, position, Transport } from "./transport";

export interface Frame {
  app: HTMLElement;
  scroller: HTMLElement;
  overlay: HTMLElement;
  wipe: HTMLElement;
  session: Session;
  transport: Transport;
  /** Light the key for this route. */
  light(kind: RouteKind): void;
}

interface Key {
  degree: number;
  label: string;
  view: string;
  href: string;
  kinds: RouteKind[];
}

function keysFor(ctx: ShellContext, copy: Copy): Key[] {
  const { site } = ctx.content;
  const k = copy.keys;
  return [
    { degree: 0, ...k.home, href: "/", kinds: ["home"] },
    { degree: 1, ...k.projects, href: "/projects", kinds: ["projects", "project"] },
    { degree: 2, ...k.lab, href: "/lab", kinds: ["lab", "lab-entry"] },
    { degree: 3, ...k.about, href: "/about", kinds: ["about"] },
    { degree: 4, ...k.resume, href: "/resume", kinds: ["resume"] },
    { degree: 5, ...k.writing, href: "/writing", kinds: ["writing", "writing-entry"] },
    { degree: 6, ...k.hello, href: `mailto:${site.email}`, kinds: [] },
  ];
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && !!target.closest("a, button, summary, input, textarea, select, [role='slider'], [role='button'], video, [contenteditable]");

export function buildFrame(ctx: ShellContext): Frame {
  const { content, signal, face } = ctx;
  const copy = content.lenses["cut-paper"];
  const words = copy.frame;
  const session = sessionFor(content);
  const transport = new Transport(session);
  signal.addEventListener("abort", () => transport.destroy());
  if (face) forbidSound();
  else armUnlock(signal);
  const on = (target: EventTarget, type: string, fn: (event: Event) => void) =>
    target.addEventListener(type, fn, { signal });

  const app = h("div", { class: "cp-app", "data-face": face ? "" : null });

  /* ── transport bar ─────────────────────────────────────── */
  const playButton = h(
    "button",
    { type: "button", class: "cp-tp cp-tp--play", "aria-pressed": "false", "aria-label": words.play, title: words.play },
    markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path class="cp-tp__play" d="M4 2.5v11L13.5 8z"/><path class="cp-tp__pause" d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>'),
  );
  const stopButton = h(
    "button",
    { type: "button", class: "cp-tp cp-tp--stop", "aria-label": words.stopHint, title: words.stopHint },
    markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5h9v9h-9z"/></svg>'),
  );
  const posNum = h("span", { class: "cp-pos__num" });
  const posMonth = h("span", { class: "cp-pos__month" });
  const pos = h("p", { class: "cp-pos" }, posNum, posMonth);
  const chordName = h("b", { class: "cp-meter__chord" });
  const meter = h(
    "p",
    { class: "cp-meter" },
    h("span", null, h("b", null, `${noteName(0)} ${words.major}`), h("small", null, `${words.meter} · ${words.tempo}`)),
    h("span", { class: "cp-meter__now" }, chordName, h("small", null, words.chord)),
  );
  const npTitle = h("span", { class: "cp-np__title" });
  const nowPlaying = h("p", { class: "cp-np" }, h("span", { class: "cp-np__label" }, words.nowPlaying), npTitle);
  const soundState = h("span", { class: "cp-sound__state", "aria-hidden": "true" });
  const soundButton = h(
    "button",
    { type: "button", class: "cp-sound", "aria-pressed": "false", title: words.soundHint },
    markup('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="cp-sound__wave" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/><path class="cp-sound__mute" d="M16 9l6 6M22 9l-6 6"/></svg>'),
    h("span", { class: "cp-sound__label" }, words.sound),
    soundState,
  );
  const paintSound = (onNow: boolean) => {
    soundButton.setAttribute("aria-pressed", String(onNow));
    soundButton.dataset.state = onNow ? "on" : "off";
    soundState.textContent = onNow ? words.soundOn : words.soundOff;
  };
  paintSound(soundWanted());
  onSound(paintSound, signal);
  on(soundButton, "click", () => setSound(wokeJustNow() ? true : !soundWanted()));

  const bar = h(
    "header",
    { class: "cp-bar" },
    link("/", { class: "cp-logo", "aria-label": content.site.name }, h("span", { class: "cp-logo__paper", "aria-hidden": "true" }, words.logo)),
    h("p", { class: "cp-file" }, words.file),
    h("div", { class: "cp-deck", role: "group", "aria-label": words.transport }, playButton, stopButton, pos),
    meter,
    nowPlaying,
    face ? null : soundButton,
  );

  on(playButton, "click", () => {
    transport.toggle();
    // playing with sound off: point at the switch once, never turn it on
    if (transport.playing && !soundWanted()) {
      soundButton.removeAttribute("data-nudge");
      void soundButton.offsetWidth;
      soundButton.setAttribute("data-nudge", "");
    }
  });
  on(stopButton, "click", () => transport.stop());

  const names = new Map<string, string>([
    ...content.projects.map((p) => [`project:${p.slug}`, p.title] as [string, string]),
    ...[...content.resume.experience.roles, ...content.resume.education.entries].map((e) => [`role:${e.id}`, e.org ?? e.title ?? e.heading] as [string, string]),
  ]);
  transport.onTick((t, playing) => {
    // one signal for assistive tech: pressed while playing (the name stays)
    playButton.setAttribute("aria-pressed", String(playing));
    playButton.title = playing ? words.pause : words.play;
    const p = position(t);
    posNum.textContent = `${p.bar}.${p.beat}.${p.eighth}`;
    posMonth.textContent = monthLabel(t);
    pos.setAttribute("aria-label", fill(words.position, { when: monthLabel(t) }));
    chordName.textContent = session.chordAt(Math.min(t, session.end - 1e-6)).name;
    const here = (kind: string) =>
      session.clips.filter((c) => c.kind === kind && t >= c.start && t < c.end && transport.audible(c.track)).at(-1);
    const clip = here("project") ?? here("role");
    npTitle.textContent = clip ? (names.get(clip.id) ?? words.rest) : words.rest;
    app.toggleAttribute("data-playing", playing);
  }, signal);

  /* ── overview: the whole career, scrubbable ─────────────── */
  const range = { from: session.from, to: session.end };
  const years: number[] = [];
  for (let y = Math.ceil(range.from); y <= Math.floor(range.to); y += 1) years.push(y);
  const ovHead = h("span", { class: "cp-run" }, h("span", { class: "cp-run__head" }));
  transport.playhead(ovHead, range, signal);
  const ovTrack = h(
    "span",
    { class: "cp-ov__track", "aria-hidden": "true" },
    years.map((y) => h("span", { class: "cp-ov__year", style: `--at:${place(y, range)}` }, h("b", null, `'${String(y).slice(2)}`))),
    session.clips.map((clip) => {
      const index = content.projects.findIndex((p) => `project:${p.slug}` === clip.id);
      const mark = h("span", {
        class: `cp-ov__clip cp-ov__clip--${clip.kind}`,
        style: `--at:${place(clip.start, range)}; --len:${(clip.end - clip.start) / (range.to - range.from)}; --note:${index >= 0 ? noteVar(index) : "var(--cp-ivory-3)"}`,
      });
      transport.watch(mark, clip.start, clip.end, signal, clip.track);
      return mark;
    }),
    h("span", { class: "cp-future", style: `--at:${place(session.now, range)}` }),
    ovHead,
  );
  const overview = h(
    "div",
    {
      class: "cp-ov",
      role: "slider",
      tabindex: face ? null : "0",
      "aria-label": words.overview,
      "aria-valuemin": range.from.toFixed(2),
      "aria-valuemax": range.to.toFixed(2),
    },
    ovTrack,
  );
  transport.onTick((t) => {
    overview.setAttribute("aria-valuenow", t.toFixed(2));
    overview.setAttribute("aria-valuetext", monthLabel(t));
  }, signal);
  const scrubTo = (event: PointerEvent) => {
    const box = ovTrack.getBoundingClientRect();
    const share = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
    transport.seek(range.from + share * (range.to - range.from));
  };
  on(overview, "pointerdown", (event) => {
    const e = event as PointerEvent;
    overview.setPointerCapture(e.pointerId);
    scrubTo(e);
  });
  on(overview, "pointermove", (event) => {
    const e = event as PointerEvent;
    if (overview.hasPointerCapture(e.pointerId)) scrubTo(e);
  });
  on(overview, "keydown", (event) => {
    const e = event as KeyboardEvent;
    const month = 1 / 12;
    const step: Record<string, number> = { ArrowRight: month, ArrowUp: month, ArrowLeft: -month, ArrowDown: -month, PageUp: 1, PageDown: -1 };
    if (e.key in step) transport.seek(transport.t + step[e.key]);
    else if (e.key === "Home") transport.seek(range.from);
    else if (e.key === "End") transport.seek(range.to);
    else return;
    e.preventDefault();
  });

  /* ── browser: the navigation, a keyboard in F major ─────── */
  const keys = keysFor(ctx, copy);
  const keyLinks = keys.map((key) => {
    const a = link(
      key.href,
      { class: "cp-key", style: `--note:${noteVar(key.degree)}`, "data-kinds": key.kinds.join(" ") },
      h("span", { class: "cp-key__note", "aria-hidden": "true" }, noteName(key.degree)),
      h("span", { class: "cp-key__label" }, key.label),
      h("span", { class: "cp-key__view", "aria-hidden": "true" }, key.view),
    );
    if (!face) {
      on(a, "pointerenter", (event) => (event as PointerEvent).pointerType === "mouse" && tap(key.degree + 7, "lead", 0.45));
      on(a, "focus", () => tap(key.degree + 7, "lead", 0.45));
    }
    return a;
  });
  const browser = h("nav", { class: "cp-browser", "aria-label": words.browser }, h("ul", null, keyLinks.map((a) => h("li", null, a))));

  /* ── the view ──────────────────────────────────────────── */
  const wipe = h("div", { class: "cp-wipe", "aria-hidden": "true", "data-state": "idle" });
  const scroller = h("main", { class: "cp-scroll", id: "cp-main", tabindex: "-1" });
  const overlay = h("div", { class: "cp-overlay", "aria-hidden": "true" }, wipe);
  const view = h("div", { class: "cp-view" }, scroller, overlay);
  // Skip link for keyboard users: bypass transport, overview, and browser keys
  const skipLink = link("#cp-main", { class: "skip-link" }, "Skip to main");

  app.append(skipLink, bar, overview, browser, view);

  // space plays, unless a control has focus
  if (!face)
    on(document, "keydown", (event) => {
      const e = event as KeyboardEvent;
      // inside the view Space scrolls the page, as it should; outside it
      // (the bar, the keys, nothing focused) it plays
      if (e.code !== "Space" || e.repeat || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target) || (e.target instanceof Node && scroller.contains(e.target))) return;
      e.preventDefault();
      transport.toggle();
    });

  return {
    app,
    scroller,
    overlay,
    wipe,
    session,
    transport,
    light(kind) {
      keyLinks.forEach((a) => {
        const lit = (a.dataset.kinds ?? "").split(" ").includes(kind);
        if (lit) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    },
  };
}
