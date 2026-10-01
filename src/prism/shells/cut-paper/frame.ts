/** The instrument itself: status bar, log drawer, stage, the score of
 * updates and the seven-key keyboard that is the site's navigation. It
 * persists across routes; only the screen on the stage changes. */
import type { Route, ShellContext } from "../types";
import { fill } from "../rich";
import { part } from "../../parts";
import { h, link, markup } from "./dom";
import { keysFor, noteForKind, noteForUpdate, NOTES, noteVar, type Key } from "./notes";
import { play, setSound, soundOn } from "./sound";
import { onNext, setClock } from "./beat";

export interface Frame {
  app: HTMLElement;
  stage: HTMLElement;
  tear: HTMLElement;
  tearLabel: HTMLElement;
  beat: HTMLElement;
  keys: Key[];
  /** Light the key for this route immediately (before the screen swaps). */
  light(route: Route): void;
  /** Settle chrome layout for this route (called while the tear covers). */
  settle(route: Route): void;
}

const shortDate = (iso: string) => {
  const [, month, day] = iso.split("-");
  return day && month ? `${day}.${month}` : iso;
};

export function buildFrame(ctx: ShellContext): Frame {
  const { content, signal, face } = ctx;
  const copy = content.lenses["cut-paper"].frame;
  const updatesCount = content.updates.length;
  const keys = keysFor(content);
  const on = (target: EventTarget, type: string, fn: (event: Event) => void) =>
    target.addEventListener(type, fn, { signal });

  /* ── status bar ─────────────────────────────────────────── */
  const beat = h(
    "div",
    { class: "cp-beat", "aria-hidden": "true" },
    h("i", { "data-cell": "1" }),
    h("i", { "data-cell": "2" }),
    h("i", { "data-cell": "3" }),
    h("i", { "data-cell": "4" }),
  );
  const readoutNote = h("span", { class: "cp-readout__note" }, NOTES[0].sol);
  const readoutWhere = h("span", { class: "cp-readout__where" }, copy.home);
  const soundButton = h(
    "button",
    {
      type: "button",
      class: "cp-sound",
      "aria-pressed": "false",
      "data-state": "off",
    },
    markup(
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="cp-sound__wave" pathLength="1" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/><path class="cp-sound__mute" d="M16 9l6 6M22 9l-6 6"/></svg>',
    ),
    h("span", { class: "cp-sound__label" }, copy.sound),
    h("span", { class: "cp-sound__state" }, copy.soundOff),
  );
  const logButton = h(
    "button",
    {
      type: "button",
      class: "cp-logbtn",
      "aria-expanded": "false",
      "aria-controls": "cp-log",
    },
    h("span", { class: "cp-logbtn__label" }, copy.log),
    h("span", { class: "cp-logbtn__count" }, String(updatesCount)),
    markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h8"/></svg>'),
  );

  const top = h(
    "header",
    { class: "cp-top" },
    h(
      "a",
      { class: "cp-logo", href: "/", "aria-label": `${content.site.name}, home` },
      h("span", { class: "cp-logo__paper", "aria-hidden": "true" }, copy.logo),
    ),
    h(
      "p",
      { class: "cp-chip" },
      h("span", { class: "cp-chip__swatch", "aria-hidden": "true" }),
      h("span", { class: "cp-chip__name" }, copy.chipName),
      h("span", { class: "cp-chip__sep", "aria-hidden": "true" }, " · "),
      h("span", { class: "cp-chip__role" }, content.pages.home.hero.occupation.toLowerCase()),
    ),
    h(
      "p",
      { class: "cp-readout" },
      readoutNote,
      h("span", { class: "cp-readout__sep", "aria-hidden": "true" }, "·"),
      readoutWhere,
      h("span", { class: "cp-readout__sep", "aria-hidden": "true" }, "·"),
      h("span", null, copy.key),
      h("span", { class: "cp-readout__sep", "aria-hidden": "true" }, "·"),
      h("span", { class: "cp-readout__bpm" }, copy.tempo),
    ),
    beat,
    logButton,
    face ? null : soundButton,
  );

  /* ── log drawer (all updates) ───────────────────────────── */
  const logClose = h(
    "button",
    { type: "button", class: "cp-log__close", "aria-label": copy.closeLog },
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
      h("h2", { class: "cp-log__title", id: "cp-log-title" }, copy.log),
      h("p", { class: "cp-log__meta" }, fill(copy.logMeta, { n: updatesCount })),
      logClose,
    ),
    h(
      "ol",
      { class: "cp-log__list" },
      content.updates.map((update, index) => {
        const note = noteForUpdate(update.kind);
        return h(
          "li",
          {
            class: "cp-log__event",
            style: `--note:${noteVar(note.id)}; --i:${index}`,
            ...part("update.item", update.id),
          },
          h("time", { class: "cp-log__date", datetime: update.date }, update.dateLabel),
          h(
            "p",
            { class: "cp-log__kind" },
            h("span", { class: "cp-log__sol", "aria-hidden": "true" }, note.sol),
            `${update.source} · ${update.kind.replace(/-/g, " ")}`,
          ),
          h(
            "h3",
            { class: "cp-log__name" },
            link(update.href, { class: "cp-log__link" }, update.title),
          ),
          update.summary ? h("p", { class: "cp-log__sum" }, update.summary) : null,
        );
      }),
    ),
  );

  /* ── stage ──────────────────────────────────────────────── */
  const strings = h(
    "div",
    { class: "cp-strings", "aria-hidden": "true" },
    NOTES.map((note) => h("i", { class: "cp-string", "data-note": note.id })),
  );
  const tearLabel = h("span", { class: "cp-tear__label" });
  const tear = h(
    "div",
    { class: "cp-tear", "aria-hidden": "true" },
    h("span", { class: "cp-tear__confetti" }),
    tearLabel,
  );
  const stage = h(
    "main",
    { class: "cp-stage", id: "cp-stage", tabindex: "-1" },
    strings,
    tear,
  );

  /* ── score: the updates as a strip of pattern tokens ─────── */
  const tokens = (hidden: boolean) =>
    h(
      "ul",
      { class: "cp-score__run", ...(hidden ? { "aria-hidden": "true" } : {}) },
      h("li", { class: "cp-score__tick" }, copy.scoreOpen),
      content.updates.map((update) => {
        const note = noteForUpdate(update.kind);
        const anchor = link(update.href, { class: "cp-tok__link" }, update.title);
        if (hidden) anchor.setAttribute("tabindex", "-1");
        return h(
          "li",
          { class: "cp-tok", style: `--note:${noteVar(note.id)}` },
          h("span", { class: "cp-tok__brace", "aria-hidden": "true" }, "{"),
          anchor,
          h("span", { class: "cp-tok__at" }, `@${shortDate(update.date)}`),
          h("span", { class: "cp-tok__brace", "aria-hidden": "true" }, "}"),
          h("span", { class: "cp-tok__rest", "aria-hidden": "true" }, "~"),
        );
      }),
      h("li", { class: "cp-score__tick" }, copy.scoreClose),
    );
  const tape = h("div", { class: "cp-score__tape" }, tokens(false), tokens(true));
  const pauseButton = h(
    "button",
    {
      type: "button",
      class: "cp-score__play",
      "aria-pressed": "false",
      "aria-label": copy.pauseTape,
    },
    markup(
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="cp-score__icon-pause" d="M5 3v10M11 3v10"/><path class="cp-score__icon-play" d="M4 2.5v11L13.5 8z"/></svg>',
    ),
  );
  const scoreCount = h(
    "button",
    {
      type: "button",
      class: "cp-score__count",
      "aria-controls": "cp-log",
      "aria-expanded": "false",
      "aria-label": fill(copy.openLog, { n: updatesCount }),
    },
    h("span", null, String(updatesCount)),
    markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h8"/></svg>'),
  );
  const score = h(
    "section",
    {
      class: "cp-score",
      "aria-label": content.pages.home.updates.title,
      "data-state": "playing",
    },
    pauseButton,
    h(
      "div",
      { class: "cp-score__window" },
      h("p", { class: "cp-score__label" }, copy.score),
      h("div", { class: "cp-score__viewport" }, tape),
    ),
    scoreCount,
  );

  /* ── keyboard: the navigation ───────────────────────────── */
  const keyLinks = keys.map((key, index) => {
    const anchor = link(
      key.href,
      {
        class: "cp-key",
        "data-note": key.note.id,
        "data-state": "rest",
        style: `--note:${noteVar(key.note.id)}; --i:${index}`,
      },
      h(
        "span",
        { class: "cp-key__sol", "aria-hidden": "true" },
        key.note.sol,
        h("small", null, key.note.pitch),
      ),
      h("span", { class: "cp-key__name" }, key.label),
      h("span", { class: "cp-key__hint", "aria-hidden": "true" }, key.hint),
      h("span", { class: "cp-key__led", "aria-hidden": "true" }),
    );
    return anchor;
  });
  const fold = h(
    "button",
    {
      type: "button",
      class: "cp-keys__fold",
      "aria-expanded": "true",
      "aria-label": copy.foldKeys,
    },
    markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5"/></svg>'),
  );
  const nav = h(
    "nav",
    { class: "cp-keys", "aria-label": copy.keys },
    fold,
    h(
      "ul",
      { class: "cp-keys__row" },
      keyLinks.map((anchor) => h("li", { class: "cp-keys__slot" }, anchor)),
    ),
  );

  const skip = h("a", { class: "cp-skip", href: "#cp-stage" }, content.site.skipLink);
  const app = h(
    "div",
    {
      class: "cp-app",
      "data-route": ctx.route.kind,
      "data-keys": "open",
      ...(face ? { "data-face": "" } : {}),
    },
    skip,
    top,
    log,
    stage,
    score,
    nav,
  );

  /* ── behaviour ──────────────────────────────────────────── */
  setClock(beat);
  on(skip, "click", (event) => {
    event.preventDefault();
    const heading = stage.querySelector<HTMLElement>(".cp-screen:not([inert]) h1");
    (heading ?? stage).focus();
  });

  // keys: hover blooms the string, press stabs, sound when opted in
  const hover = (note: string | null) => {
    if (note) app.dataset.hover = note;
    else delete app.dataset.hover;
  };
  keyLinks.forEach((anchor, index) => {
    const key = keys[index];
    let cancelHover = () => {};
    const release = () => {
      anchor.dataset.state = anchor.getAttribute("aria-current") ? "held" : "rest";
    };
    // the string blooms on the next sixteenth, not the instant the pointer lands
    on(anchor, "pointerenter", (event) => {
      const mouse = (event as PointerEvent).pointerType === "mouse";
      cancelHover();
      const bloom = () => {
        hover(key.note.id);
        if (mouse) play(key.note.frequency, 0.55);
      };
      if (ctx.reducedMotion) bloom();
      else cancelHover = onNext(4, bloom);
    });
    on(anchor, "pointerleave", () => {
      cancelHover();
      hover(null);
      release();
    });
    on(anchor, "pointerdown", () => {
      anchor.dataset.state = "pressed";
      play(key.note.frequency, 1);
    });
    on(anchor, "pointerup", release);
    on(anchor, "pointercancel", release);
    on(anchor, "focus", () => {
      hover(key.note.id);
      if (anchor.matches(":focus-visible")) play(key.note.frequency, 0.55);
    });
    on(anchor, "blur", () => hover(null));
    on(anchor, "keydown", (event) => {
      const { key: pressed } = event as KeyboardEvent;
      const moves: Record<string, number> = {
        ArrowRight: index + 1,
        ArrowDown: index + 1,
        ArrowLeft: index - 1,
        ArrowUp: index - 1,
        Home: 0,
        End: keyLinks.length - 1,
      };
      if (!(pressed in moves)) return;
      event.preventDefault();
      const next = (moves[pressed] + keyLinks.length) % keyLinks.length;
      keyLinks[next].focus();
    });
  });

  // fold / unfold the keyboard (inner routes start folded)
  const setKeys = (open: boolean) => {
    app.dataset.keys = open ? "open" : "closed";
    fold.setAttribute("aria-expanded", String(open));
    fold.setAttribute("aria-label", open ? copy.foldKeys : copy.unfoldKeys);
  };
  on(fold, "click", () => setKeys(app.dataset.keys !== "open"));

  // sound: off until asked
  on(soundButton, "click", () => {
    const next = !soundOn();
    setSound(next);
    soundButton.setAttribute("aria-pressed", String(next));
    soundButton.dataset.state = next ? "on" : "off";
    soundButton.querySelector(".cp-sound__state")!.textContent = next ? copy.soundOn : copy.soundOff;
    if (next) play(NOTES[0].frequency, 0.8);
  });

  // score: pause / play the moving tape
  const setTape = (playing: boolean) => {
    score.dataset.state = playing ? "playing" : "paused";
    pauseButton.setAttribute("aria-pressed", String(!playing));
    pauseButton.setAttribute("aria-label", playing ? copy.pauseTape : copy.playTape);
  };
  on(pauseButton, "click", () => setTape(score.dataset.state !== "playing"));
  if (ctx.reducedMotion) setTape(false);

  // log drawer: slides down from the status bar, never fades
  let returnFocus: HTMLElement | null = null;
  const setLog = (open: boolean, from?: HTMLElement) => {
    log.dataset.state = open ? "open" : "closed";
    log.inert = !open;
    for (const button of [logButton, scoreCount])
      button.setAttribute("aria-expanded", String(open));
    if (open) {
      returnFocus = from ?? null;
      logClose.focus({ preventScroll: true });
    } else if (returnFocus) {
      returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
  };
  on(logButton, "click", () => setLog(log.dataset.state !== "open", logButton));
  on(scoreCount, "click", () => setLog(log.dataset.state !== "open", scoreCount));
  on(logClose, "click", () => setLog(false));
  on(document, "keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape" && log.dataset.state === "open")
      setLog(false);
  });
  on(document, "pointerdown", (event) => {
    if (log.dataset.state !== "open") return;
    const target = event.target as Node;
    if (!log.contains(target) && !logButton.contains(target) && !scoreCount.contains(target))
      setLog(false);
  });
  on(log, "click", (event) => {
    if ((event.target as Element).closest("a")) setLog(false);
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
    const sol = note?.sol ?? "—";
    const where = keys.find((key) => key.note === note)?.label.toLowerCase() ?? copy.sheet;
    if (face || ctx.reducedMotion || readoutNote.textContent === sol) {
      readoutNote.textContent = sol;
      readoutWhere.textContent = where;
    } else {
      // the old note tears off, the new one slides up under it
      const rip: Keyframe[] = [
        { transform: "translateY(0) skewX(0)", opacity: 1 },
        { transform: "translateY(-10px) skewX(-10deg)", opacity: 0, offset: 0.42 },
        { transform: "translateY(10px) skewX(8deg)", opacity: 0, offset: 0.5 },
        { transform: "translateY(0) skewX(0)", opacity: 1 },
      ];
      for (const el of [readoutNote, readoutWhere])
        el.animate(rip, { duration: 360, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" });
      setTimeout(() => {
        readoutNote.textContent = sol;
        readoutWhere.textContent = where;
      }, 160);
    }
    tearLabel.textContent = `${keys.find((key) => key.note === note)?.label ?? copy.sheetTear}.`;
    tear.style.setProperty("--note", note ? noteVar(note.id) : "var(--cp-ivory)");
  };

  const settle = (route: Route) => {
    app.dataset.route = route.kind;
    setKeys(route.kind === "home");
    if (log.dataset.state === "open") setLog(false);
  };

  light(ctx.route);
  settle(ctx.route);

  return { app, stage, tear, tearLabel, beat, keys, light, settle };
}
