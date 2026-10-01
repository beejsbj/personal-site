/** The DAW window: transport bar, song overview, the browser (a vertical
 * solfège keyboard that is the site's navigation), the view, a status bar
 * and the markers drawer. It persists across routes; only the view's
 * screen changes. */
import type { Route, ShellContext } from "../types";
import { h, link, markup } from "./dom";
import { keysFor, noteForKind, noteForUpdate, NOTES, noteVar, type Key } from "./notes";
import { play, setSound, soundOn, strum } from "./sound";
import { onNext, setClock } from "./beat";
import { FROM, monthLabel, NOW, place, position, share, TO, YEARS, type Clip } from "./timeline";
import { Transport } from "./transport";

export interface Frame {
  app: HTMLElement;
  view: HTMLElement;
  wipe: HTMLElement;
  wipeLabel: HTMLElement;
  keys: Key[];
  transport: Transport;
  /** Light the key for this route immediately (before the screen swaps). */
  light(route: Route): void;
  /** Settle chrome for this route (called while the wipe covers). */
  settle(route: Route): void;
}

const DEFAULT_INFO: Record<string, string> = {
  home: "Session view · every clip opens a page · scenes play a row",
  projects: "Arrangement view · one track per project · press play to sweep the career",
  project: "Clip view · the story as a piano roll · click a note to jump to it",
  lab: "Device chain · small experiments, each one opens on CodePen",
  "lab-entry": "Device view · one experiment, opened up",
  about: "Liner notes · the set's info and the story behind it",
  resume: "Roles as tracks · each clip spans the time in the role",
  other: "Text view",
};

/** A chord on a scale degree of C major: root, third and fifth. */
export function voice(clip: Clip) {
  const root = NOTES.findIndex((note) => note.id === clip.note);
  const at = (step: number) => {
    const index = root + step;
    return NOTES[index % 7].frequency * (index >= 7 ? 2 : 1);
  };
  if (clip.kind === "project") strum([at(0), at(2), at(4)], 0.8);
  else if (clip.kind === "role") play(at(0) / 2, 0.6);
  else play(at(0) * 2, 0.32);
}

export function buildFrame(ctx: ShellContext): Frame {
  const { content, signal, face } = ctx;
  const keys = keysFor(content);
  const transport = new Transport(content);
  const on = (target: EventTarget, type: string, fn: (event: Event) => void) =>
    target.addEventListener(type, fn, { signal });

  /* ── transport bar ──────────────────────────────────────── */
  const beat = h(
    "div",
    { class: "cp-beat", "aria-hidden": "true" },
    h("i", { "data-cell": "1" }),
    h("i", { "data-cell": "2" }),
    h("i", { "data-cell": "3" }),
    h("i", { "data-cell": "4" }),
  );
  const playButton = h(
    "button",
    {
      type: "button",
      class: "cp-tp cp-tp--play",
      "aria-pressed": "false",
      "aria-label": "Play the career",
      "data-info": "Play · sweep the playhead from the first role to today (space)",
    },
    markup(
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="cp-tp__play" d="M4 2.5v11L13.5 8z"/><path class="cp-tp__pause" d="M4 3h3v10H4zM9 3h3v10H9z"/></svg>',
    ),
  );
  const stopButton = h(
    "button",
    {
      type: "button",
      class: "cp-tp cp-tp--stop",
      "aria-label": "Return the playhead to now",
      "data-info": "Stop · press again to return the playhead to now",
    },
    markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5h9v9h-9z"/></svg>'),
  );
  const posBar = h("span", { class: "cp-pos__bar" });
  const posBeat = h("span", { class: "cp-pos__beat" });
  const posLabel = h("span", { class: "cp-pos__label" });
  const pos = h(
    "p",
    { class: "cp-pos", "aria-hidden": "true" },
    h("span", { class: "cp-pos__num" }, posBar, h("i", null, "."), posBeat),
    posLabel,
  );
  const npTitle = h("span", { class: "cp-np__title" });
  const nowPlaying = h(
    "a",
    { class: "cp-np", href: "/projects" },
    h("span", { class: "cp-np__label" }, "Now playing"),
    npTitle,
  );
  const soundButton = h(
    "button",
    {
      type: "button",
      class: "cp-sound",
      "aria-pressed": "false",
      "data-state": "off",
      "data-info": "Sound · off until you ask; clips, keys and markers play notes",
    },
    markup(
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="cp-sound__wave" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/><path class="cp-sound__mute" d="M16 9l6 6M22 9l-6 6"/></svg>',
    ),
    h("span", { class: "cp-sound__label" }, "Sound"),
    h("span", { class: "cp-sound__state" }, "off"),
  );
  const logButton = h(
    "button",
    {
      type: "button",
      class: "cp-logbtn",
      "aria-expanded": "false",
      "aria-controls": "cp-log",
      "data-info": "Markers · recent updates from around the web",
    },
    h("span", { class: "cp-logbtn__label" }, "Markers"),
    h("span", { class: "cp-logbtn__count" }, String(content.updates.length)),
  );

  const bar = h(
    "header",
    { class: "cp-bar" },
    h(
      "a",
      { class: "cp-logo", href: "/", "aria-label": `${content.site.name}, home` },
      h("span", { class: "cp-logo__paper", "aria-hidden": "true" }, "Burooj."),
    ),
    h(
      "p",
      { class: "cp-set" },
      h("span", { class: "cp-set__file" }, "burooj.als"),
      h("span", { class: "cp-set__who" }, "frontend developer"),
    ),
    h(
      "div",
      { class: "cp-deck", role: "group", "aria-label": "Transport" },
      playButton,
      stopButton,
      pos,
      h(
        "p",
        { class: "cp-meter", "aria-hidden": "true" },
        h("span", null, h("b", null, "120"), h("small", null, "bpm")),
        h("span", null, h("b", null, "12/8"), h("small", null, "c maj")),
      ),
      beat,
    ),
    nowPlaying,
    logButton,
    face ? null : soundButton,
  );

  /* ── overview: the whole song, scrubbable ───────────────── */
  const ovRun = h("span", { class: "cp-run" }, h("span", { class: "cp-run__head" }));
  const ovTrack = h(
    "span",
    { class: "cp-ov__track", "aria-hidden": "true" },
    YEARS.map((year) =>
      h("span", { class: "cp-ov__year", style: `--at:${place(year)}` }, h("b", null, `'${String(year).slice(2)}`)),
    ),
    transport.clips.map((clip) => {
      const mark = h("span", {
        class: `cp-ov__clip cp-ov__clip--${clip.kind}`,
        style: `--at:${place(clip.start)}; --len:${share(clip.end - clip.start)}; --note:${noteVar(clip.note)}`,
      });
      transport.watch(mark, clip.start, clip.end, signal);
      return mark;
    }),
    h("span", { class: "cp-future", style: `--at:${place(NOW)}` }),
    ovRun,
  );
  transport.playhead(ovRun, signal);
  const overview = h(
    "div",
    {
      class: "cp-ov",
      role: "slider",
      tabindex: face ? null : "0",
      "aria-label": "Playhead on the career timeline",
      "aria-valuemin": FROM.toFixed(2),
      "aria-valuemax": NOW.toFixed(2),
      "data-info": "Overview · drag to scrub · arrows move a month, page keys a year",
    },
    ovTrack,
  );

  /* ── browser: the navigation, a vertical keyboard ───────── */
  const keyLinks = keys.map((key, index) =>
    link(
      key.href,
      {
        class: "cp-key",
        "data-note": key.note.id,
        "data-state": "rest",
        style: `--note:${noteVar(key.note.id)}; --i:${index}`,
        "data-info": `${key.note.sol} · ${key.label} · ${key.view}, ${key.hint}`,
      },
      h(
        "span",
        { class: "cp-key__pad", "aria-hidden": "true" },
        h("span", { class: "cp-key__sol" }, key.note.sol),
        h("small", null, key.note.pitch),
      ),
      h(
        "span",
        { class: "cp-key__copy" },
        h("span", { class: "cp-key__name" }, key.label),
        h("span", { class: "cp-key__view", "aria-hidden": "true" }, key.view),
      ),
      h("span", { class: "cp-key__led", "aria-hidden": "true" }),
    ),
  );
  const nav = h(
    "nav",
    { class: "cp-browser", "aria-label": "Sections" },
    h("p", { class: "cp-browser__title", "aria-hidden": "true" }, "Browser"),
    h(
      "ul",
      { class: "cp-keys" },
      keyLinks.map((anchor) => h("li", { class: "cp-keys__slot" }, anchor)),
    ),
    h(
      "p",
      { class: "cp-browser__foot", "aria-hidden": "true" },
      h("span", null, "c major"),
      h("span", null, `${keys.length} places`),
    ),
  );

  /* ── view ───────────────────────────────────────────────── */
  const wipeLabel = h("span", { class: "cp-wipe__label" });
  const wipe = h(
    "div",
    { class: "cp-wipe", "aria-hidden": "true" },
    h("span", { class: "cp-wipe__bar" }, wipeLabel),
  );
  const view = h("main", { class: "cp-view", id: "cp-view", tabindex: "-1" }, wipe);

  /* ── status bar ─────────────────────────────────────────── */
  const info = h("p", { class: "cp-status__info" });
  const status = h(
    "footer",
    { class: "cp-status", "aria-hidden": "true" },
    info,
    h("p", { class: "cp-status__keys" }, "space play · ← → scrub"),
  );

  /* ── markers drawer (all updates) ───────────────────────── */
  const logClose = h(
    "button",
    { type: "button", class: "cp-log__close", "aria-label": "Close the markers" },
    markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13"/></svg>'),
  );
  const log = h(
    "section",
    {
      class: "cp-log",
      id: "cp-log",
      "aria-labelledby": "cp-log-title",
      "data-state": "closed",
      inert: true,
    },
    h(
      "div",
      { class: "cp-log__head" },
      h("h2", { class: "cp-log__title", id: "cp-log-title" }, "Markers"),
      h("p", { class: "cp-log__meta" }, `recent updates · ${content.updates.length} locators`),
      logClose,
    ),
    h(
      "ol",
      { class: "cp-log__list" },
      content.updates.map((update, index) => {
        const note = noteForUpdate(update.kind);
        return h(
          "li",
          { class: "cp-log__event", style: `--note:${noteVar(note.id)}; --i:${index}` },
          h("time", { class: "cp-log__date", datetime: update.date }, update.dateLabel),
          h(
            "p",
            { class: "cp-log__kind" },
            h("span", { class: "cp-log__sol", "aria-hidden": "true" }, note.sol),
            `${update.source} · ${update.kind.replace(/-/g, " ")}`,
          ),
          h("h3", { class: "cp-log__name" }, link(update.href, { class: "cp-log__link" }, update.title)),
          update.summary ? h("p", { class: "cp-log__sum" }, update.summary) : null,
        );
      }),
    ),
  );

  const skip = h("a", { class: "cp-skip", href: "#cp-view" }, "Skip to content");
  const app = h(
    "div",
    {
      class: "cp-app",
      "data-route": ctx.route.kind,
      "data-playing": "false",
      ...(face ? { "data-face": "" } : {}),
    },
    skip,
    bar,
    overview,
    nav,
    view,
    status,
    log,
  );

  /* ── behaviour ──────────────────────────────────────────── */
  setClock(beat);
  on(skip, "click", (event) => {
    event.preventDefault();
    const heading = view.querySelector<HTMLElement>(".cp-screen:not([inert]) h1");
    (heading ?? view).focus();
  });

  // transport readouts follow the playhead; text only changes per month
  let lastMonth = "";
  let lastPlaying: boolean | undefined;
  let lastNp = "";
  const nowClip = (t: number) => {
    const inside = (clip: Clip) => clip.start <= t && t < clip.end;
    return (
      [...transport.clips].reverse().find((clip) => clip.kind === "project" && inside(clip)) ??
      [...transport.clips].reverse().find((clip) => clip.kind === "role" && inside(clip))
    );
  };
  transport.onTick((t, playing) => {
    const label = monthLabel(t);
    if (label !== lastMonth) {
      lastMonth = label;
      const { bar: year, beat: month } = position(t);
      posBar.textContent = year;
      posBeat.textContent = month;
      posLabel.textContent = label;
      overview.setAttribute("aria-valuenow", t.toFixed(2));
      overview.setAttribute("aria-valuetext", t >= NOW - 1 / 48 ? `${label}, now` : label);
      const clip = nowClip(t);
      const id = clip?.id ?? "";
      if (id !== lastNp) {
        lastNp = id;
        npTitle.textContent = clip?.title.split(" · ")[0] ?? "Silence";
        nowPlaying.href = clip?.href ?? "/projects";
        nowPlaying.style.setProperty("--note", clip ? noteVar(clip.note) : "var(--cp-ivory-3)");
        if (!face && !ctx.reducedMotion)
          npTitle.animate(
            [
              { transform: "translateY(8px)", opacity: 0 },
              { transform: "none", opacity: 1 },
            ],
            { duration: 220, easing: "cubic-bezier(.2,.9,.3,1)" },
          );
      }
    }
    if (playing !== lastPlaying) {
      lastPlaying = playing;
      app.dataset.playing = String(playing);
      playButton.setAttribute("aria-pressed", String(playing));
      playButton.setAttribute("aria-label", playing ? "Pause the career" : "Play the career");
    }
  }, signal);
  transport.onHit((clip) => {
    if (transport.audible(clip)) voice(clip);
  }, signal);
  ctx.onIdleChange((idle) => transport.setIdle(idle));
  transport.setIdle(ctx.isIdle());
  signal.addEventListener("abort", () => transport.destroy());

  on(playButton, "click", () => transport.toggle());
  on(stopButton, "click", () => transport.stop());
  on(document, "keydown", (event) => {
    const { key, target } = event as KeyboardEvent;
    if (key === " " && (target === document.body || target === document.documentElement)) {
      event.preventDefault();
      transport.toggle();
    }
  });

  // overview: scrub with the pointer or the keys
  const seekTo = (clientX: number) => {
    const rect = ovTrack.getBoundingClientRect();
    const f = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    transport.seek(FROM + f * (TO - FROM));
  };
  on(overview, "pointerdown", (event) => {
    const pointer = event as PointerEvent;
    overview.setPointerCapture(pointer.pointerId);
    overview.dataset.scrub = "";
    seekTo(pointer.clientX);
  });
  on(overview, "pointermove", (event) => {
    if (overview.dataset.scrub !== undefined) seekTo((event as PointerEvent).clientX);
  });
  const endScrub = () => delete overview.dataset.scrub;
  on(overview, "pointerup", endScrub);
  on(overview, "pointercancel", endScrub);
  on(overview, "keydown", (event) => {
    const { key } = event as KeyboardEvent;
    const steps: Record<string, number> = {
      ArrowRight: 1 / 12,
      ArrowUp: 1 / 12,
      ArrowLeft: -1 / 12,
      ArrowDown: -1 / 12,
      PageUp: 1,
      PageDown: -1,
    };
    if (key in steps) transport.seek(transport.t + steps[key]);
    else if (key === "Home") transport.seek(FROM);
    else if (key === "End") transport.seek(NOW);
    else if (key === " " || key === "Enter") transport.toggle();
    else return;
    event.preventDefault();
  });

  // the status bar says what is under the pointer or the focus
  let routeInfo = DEFAULT_INFO[ctx.route.kind] ?? DEFAULT_INFO.other;
  const say = (textContent: string) => {
    if (info.textContent !== textContent) info.textContent = textContent;
  };
  const describe = (event: Event) => {
    const source = (event.target as Element | null)?.closest?.("[data-info]");
    say(source?.getAttribute("data-info") ?? routeInfo);
  };
  on(app, "pointerover", describe);
  on(app, "focusin", describe);
  on(app, "pointerleave", () => say(routeInfo));

  // keys: hover blooms on the next sixteenth, press stabs, sound when opted in
  keyLinks.forEach((anchor, index) => {
    const key = keys[index];
    let cancelHover = () => {};
    const release = () => {
      anchor.dataset.state = anchor.getAttribute("aria-current") ? "held" : "rest";
    };
    on(anchor, "pointerenter", (event) => {
      const mouse = (event as PointerEvent).pointerType === "mouse";
      cancelHover();
      const bloom = () => {
        if (anchor.dataset.state === "rest") anchor.dataset.state = "hover";
        if (mouse) play(key.note.frequency, 0.5);
      };
      if (ctx.reducedMotion) bloom();
      else cancelHover = onNext(4, bloom);
    });
    on(anchor, "pointerleave", () => {
      cancelHover();
      release();
    });
    on(anchor, "pointerdown", () => {
      anchor.dataset.state = "pressed";
      play(key.note.frequency, 1);
    });
    on(anchor, "pointerup", release);
    on(anchor, "pointercancel", release);
    on(anchor, "focus", () => {
      if (anchor.matches(":focus-visible")) play(key.note.frequency, 0.5);
    });
    on(anchor, "keydown", (event) => {
      const { key: pressed } = event as KeyboardEvent;
      const moves: Record<string, number> = {
        ArrowDown: index + 1,
        ArrowRight: index + 1,
        ArrowUp: index - 1,
        ArrowLeft: index - 1,
        Home: 0,
        End: keyLinks.length - 1,
      };
      if (!(pressed in moves)) return;
      event.preventDefault();
      keyLinks[(moves[pressed] + keyLinks.length) % keyLinks.length].focus();
    });
  });

  // sound: off until asked
  on(soundButton, "click", () => {
    const next = !soundOn();
    setSound(next);
    soundButton.setAttribute("aria-pressed", String(next));
    soundButton.dataset.state = next ? "on" : "off";
    soundButton.querySelector(".cp-sound__state")!.textContent = next ? "on" : "off";
    if (next) strum([NOTES[0].frequency, NOTES[2].frequency, NOTES[4].frequency], 0.7);
  });

  // markers drawer: slides down under the transport, never fades
  let returnFocus: HTMLElement | null = null;
  const setLog = (open: boolean) => {
    log.dataset.state = open ? "open" : "closed";
    log.inert = !open;
    logButton.setAttribute("aria-expanded", String(open));
    if (open) {
      returnFocus = logButton;
      logClose.focus({ preventScroll: true });
    } else if (returnFocus) {
      returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
  };
  on(logButton, "click", () => setLog(log.dataset.state !== "open"));
  on(logClose, "click", () => setLog(false));
  on(document, "keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape" && log.dataset.state === "open") setLog(false);
  });
  on(document, "pointerdown", (event) => {
    if (log.dataset.state !== "open") return;
    const target = event.target as Node;
    if (!log.contains(target) && !logButton.contains(target)) setLog(false);
  });
  on(log, "click", (event) => {
    if ((event.target as Element).closest("a")) {
      returnFocus = null;
      setLog(false);
    }
  });

  /* ── route reactions ────────────────────────────────────── */
  const light = (route: Route) => {
    const note = noteForKind(keys, route.kind);
    keyLinks.forEach((anchor, index) => {
      const held = keys[index].note === note;
      if (held) anchor.setAttribute("aria-current", "page");
      else anchor.removeAttribute("aria-current");
      anchor.dataset.state = held ? "held" : "rest";
    });
    app.dataset.note = note?.id ?? "none";
    const key = keys.find((entry) => entry.note === note);
    wipeLabel.textContent = key ? `${key.view}.` : "text.";
    wipe.style.setProperty("--note", note ? noteVar(note.id) : "var(--cp-ivory)");
  };

  const settle = (route: Route) => {
    app.dataset.route = route.kind;
    routeInfo = DEFAULT_INFO[route.kind] ?? DEFAULT_INFO.other;
    say(routeInfo);
    if (log.dataset.state === "open") {
      returnFocus = null;
      setLog(false);
    }
  };

  light(ctx.route);
  settle(ctx.route);

  return { app, view, wipe, wipeLabel, keys, transport, light, settle };
}
