/** Projects as the arrangement: the career on a year/month ruler, a marker
 * for each update, the resume's spans, and a track per project with its
 * clip at its real date. The clip draws its motif's actual notes. One
 * playhead over all of it: play sweeps the career, the ruler scrubs it,
 * hovering a track (or tapping a clip) auditions it.
 *
 * Wide screens get the full arrangement: track heads on the left, lanes on
 * the right. Phones get the tape: every clip on one strip that scrolls
 * under a fixed playhead, snapping to clips, above the list of tracks. */
import { part } from "../../parts";
import { fill } from "../rich";
import type { SiteContent } from "../types";
import { h, link, markup } from "./dom";
import { hear, listen } from "./listen";
import { MOTIF_EIGHTHS } from "./music";
import { noteVar } from "./notes";
import { soundOn } from "./sound";
import {
  clipAt,
  clipPhrase,
  markerPhrase,
  modelFor,
  monthLabel,
  position,
  spanPhrase,
  type Clip,
  type Model,
} from "./timeline";
import { Transport } from "./transport";

type Copy = SiteContent["lenses"]["cut-paper"];

export interface Arrangement {
  el: HTMLElement;
  destroy(): void;
  idle(idle: boolean): void;
}

const MONTH = 1 / 12;
/** The tape's scale on a phone: a year this many pixels wide. */
const TAPE_YEAR = 264;

const icon = (path: string) => markup(`<svg viewBox="0 0 16 16" aria-hidden="true">${path}</svg>`);
const PLAY = '<path class="cp-tp__i-play" d="M4 2.5v11L13.5 8z"/><path class="cp-tp__i-pause" d="M4 3h3v10H4zM9 3h3v10H9z"/>';
const STOP = '<path d="M3.5 3.5h9v9h-9z"/>';
const CUE = '<path d="M5 3v10l8-5z"/>';

/** The notes of a clip's motif, drawn: what you see is what plays. */
function motifRoll(clip: Clip) {
  // fit the tune's own range, a step of air above and below
  const degrees = clip.notes.map((note) => note.degree);
  const top = Math.max(...degrees) + 1;
  const rows = top - Math.min(...degrees) + 2;
  const rects = clip.notes
    .map(
      (note) =>
        `<rect x="${note.at + 0.08}" y="${top - note.degree}" width="${Math.max(note.len - 0.28, 0.5)}" height="0.8" rx="0.18"/>`,
    )
    .join("");
  return markup(
    `<svg class="cp-roll" viewBox="0 0 ${MOTIF_EIGHTHS} ${rows}" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>`,
  );
}

/** Year lines and the unwritten future, behind a lane's contents. */
function grid(model: Model) {
  return [
    model.years.map((year) => h("i", { class: "cp-lane__year", style: `--at:${model.place(year)}` })),
    h("span", { class: "cp-lane__future", style: `--at:${model.place(model.now)}` }),
  ];
}

export function arrangement(content: SiteContent, copy: Copy, options: { reducedMotion: boolean; face: boolean }): Arrangement {
  const words = copy.projects;
  const model = modelFor(content);
  const transport = new Transport(model, options);
  const span = model.to - model.from;
  const clipStyle = (start: number, end: number) =>
    `--at:${model.place(start)}; --len:${(end - start) / span}`;

  /** A lane's own playhead: a run whose right edge is the line. */
  const run = (extra = "") => {
    const el = h("span", { class: `cp-run ${extra}`.trim(), "aria-hidden": "true" }, h("span", { class: "cp-run__line" }));
    transport.playhead(el);
    return el;
  };

  /* ── transport bar ──────────────────────────────────────── */
  const playLabel = fill(words.playLabel, { from: monthLabel(model.from) });
  const playButton = h(
    "button",
    { type: "button", class: "cp-tp__btn cp-tp__btn--play", "aria-pressed": "false", "aria-label": playLabel },
    icon(PLAY),
    h("span", { class: "cp-tp__word" }, words.play),
  );
  const stopButton = h(
    "button",
    { type: "button", class: "cp-tp__btn cp-tp__btn--stop", "aria-label": words.stopLabel },
    icon(STOP),
  );
  const posBar = h("b", null);
  const posBeat = h("b", null);
  const posLabel = h("small", null);
  const npTitle = h("a", { class: "cp-tp__title" });
  const npBetween = h("span", { class: "cp-tp__between" }, words.between);
  const announce = h("p", { class: "cp-sr", "aria-live": "polite" });
  const deckBar = h(
    "div",
    { class: "cp-tp" },
    playButton,
    stopButton,
    h("p", { class: "cp-tp__pos", "aria-hidden": "true" }, h("span", { class: "cp-tp__num" }, posBar, h("i", null, "."), posBeat), posLabel),
    h("p", { class: "cp-tp__np" }, h("span", { class: "cp-tp__label" }, words.nowPlaying), npTitle, npBetween),
    announce,
  );

  /* ── the ruler: a slider over the career ────────────────── */
  const months: HTMLElement[] = [];
  for (let m = Math.ceil(model.from * 12); m < model.to * 12; m += 1) {
    if (m % 12 === 0) continue;
    months.push(h("i", { class: "cp-ruler__month", style: `--at:${model.place(m / 12)}` }));
  }
  const totalMonths = Math.round(span * 12);
  const scrubber = h(
    "div",
    {
      class: "cp-ruler__lane",
      role: "slider",
      tabindex: options.face ? null : "0",
      "aria-label": words.position,
      "aria-valuemin": "0",
      "aria-valuemax": String(totalMonths),
    },
    months,
    model.years.map((year) =>
      h("span", { class: "cp-ruler__year", style: `--at:${model.place(year)}`, "aria-hidden": "true" }, h("b", null, String(year)), h("small", null, `'${String(year).slice(2)}`)),
    ),
    h("span", { class: "cp-lane__future", style: `--at:${model.place(model.now)}` }),
    h("span", { class: "cp-ruler__now", style: `--at:${model.place(model.now)}`, "aria-hidden": "true" }, words.now),
    run("cp-run--ruler"),
  );
  const ruler = h(
    "div",
    { class: "cp-arr__row cp-arr__row--ruler" },
    h("span", { class: "cp-arr__corner" }, words.tracks, h("small", null, String(model.clips.length))),
    scrubber,
  );

  /* ── the tape: the phone's arrangement ──────────────────── */
  const tapeStrip = h("div", { class: "cp-tape__strip", style: `--span:${span}; --year:${TAPE_YEAR}px; --clip-rows:${model.clipRows}; --span-rows:${model.spanRows}` });
  const tapeScroller = h(
    "div",
    {
      class: "cp-tape__scroller",
      role: "slider",
      tabindex: options.face ? null : "0",
      "aria-label": words.position,
      "aria-valuemin": "0",
      "aria-valuemax": String(totalMonths),
    },
    tapeStrip,
  );
  const tape = h(
    "div",
    { class: "cp-tape" },
    tapeScroller,
    h("span", { class: "cp-tape__head", "aria-hidden": "true" }),
    h("p", { class: "cp-tape__hint", "aria-hidden": "true" }, words.tapeHint),
  );
  const at = (t: number) => `--x:${t - model.from}`;
  const tapeMonths: HTMLElement[] = [];
  for (let m = Math.ceil(model.from * 12); m < model.to * 12; m += 1)
    if (m % 12 !== 0) tapeMonths.push(h("i", { class: "cp-tape__month", style: at(m / 12) }));
  tapeStrip.append(
    h(
      "div",
      { class: "cp-tape__ruler", "aria-hidden": "true" },
      tapeMonths,
      model.years.map((year) => h("span", { class: "cp-tape__year", style: at(year) }, h("b", null, String(year)))),
      h("span", { class: "cp-tape__now", style: at(model.now) }, words.now),
    ),
    h(
      "div",
      { class: "cp-tape__markers", "aria-hidden": "true" },
      model.markers.map((marker) => {
        const flag = h("i", { class: "cp-tape__marker", style: `${at(marker.t)}; --row:${marker.row}; --note:${noteVar(marker.note)}` });
        transport.watch(flag, marker.t, marker.t + MONTH / 2);
        return flag;
      }),
    ),
    h(
      "div",
      { class: "cp-tape__spans", "aria-hidden": "true" },
      model.spans.map((item) => {
        const bar = h(
          "span",
          { class: "cp-tape__span", style: `${at(item.start)}; --w:${item.end - item.start}; --row:${item.row}` },
          h("span", null, item.entry.org ?? item.entry.title ?? ""),
        );
        transport.watch(bar, item.start, item.end);
        return bar;
      }),
    ),
  );
  const tapeClips = h("div", { class: "cp-tape__clips" });
  tapeStrip.append(tapeClips, h("span", { class: "cp-tape__future", style: at(model.now) }));

  /* ── markers and spans lanes (wide screens) ─────────────── */
  const markerLane = h(
    "div",
    { class: "cp-arr__row cp-arr__row--markers" },
    h("span", { class: "cp-arr__corner" }, words.markers, h("small", null, String(model.markers.length))),
    h(
      "div",
      { class: "cp-lane" },
      grid(model),
      h(
        "ul",
        { class: "cp-lane__items", "aria-label": content.pages.home.updates.title },
        model.markers.map((marker) => {
          const flag = link(
            marker.update.href,
            { class: "cp-marker", "aria-label": `${marker.update.dateLabel}: ${marker.update.title}` },
            h("span", { class: "cp-marker__flag", "aria-hidden": "true" }),
            h(
              "span",
              { class: "cp-marker__tip", "aria-hidden": "true" },
              h("time", { datetime: marker.update.date }, marker.update.dateLabel),
              " ",
              marker.update.title,
            ),
          );
          const item = h("li", { class: "cp-marker-slot", style: `--at:${model.place(marker.t)}; --row:${marker.row}; --note:${noteVar(marker.note)}` }, flag);
          transport.watch(item, marker.t, marker.t + MONTH / 2);
          listen(flag, `marker:${marker.update.id}`, () => markerPhrase(marker));
          return item;
        }),
      ),
      run(),
    ),
  );

  const spanLane = model.spans.length
    ? h(
        "div",
        { class: "cp-arr__row cp-arr__row--spans", style: `--rows:${model.spanRows}` },
        h("span", { class: "cp-arr__corner" }, copy.resume.credits, h("small", null, String(model.spans.length))),
        h(
          "div",
          { class: "cp-lane" },
          grid(model),
          h(
            "ul",
            { class: "cp-lane__items", "aria-label": copy.resume.credits },
            model.spans.map((item) => {
              const label = [item.entry.title, item.entry.org].filter(Boolean).join(" · ");
              const bar = h(
                "a",
                { class: "cp-span", href: "/resume", "aria-label": `${label}, ${item.entry.dateLine}` },
                h("span", { class: "cp-span__name", "aria-hidden": "true" }, item.entry.org ?? item.entry.title ?? ""),
              );
              const slot = h("li", { class: "cp-span-slot", style: `${clipStyle(item.start, item.end)}; --row:${item.row}` }, bar);
              transport.watch(slot, item.start, item.end);
              listen(bar, `span:${item.entry.id}`, () => spanPhrase(item));
              return slot;
            }),
          ),
          run(),
        ),
      )
    : null;

  /* ── tracks ─────────────────────────────────────────────── */
  const tapeVisible = () => tape.offsetParent !== null;
  let glideTo: (t: number) => void = (t) => transport.seek(t);

  /** Put the playhead on a clip and hear it. */
  const cue = (clip: Clip, from: HTMLElement) => {
    if (transport.playing) transport.pause();
    if (tapeVisible()) glideTo(clip.start);
    else transport.seek(clip.start);
    if (!hear(from, `clip:${clip.project.slug}`, () => clipPhrase(clip))) nudge();
  };

  const tracks = h(
    "ol",
    { class: "cp-arr__tracks" },
    model.clips.map((clip) => {
      const { project } = clip;
      const note = noteVar(clip.note);
      const cueButton = h(
        "button",
        { type: "button", class: "cp-tr__cue", "aria-label": fill(words.cue, { title: project.title }) },
        icon(CUE),
      );
      const clipEl = h(
        "a",
        { class: "cp-clip", href: project.href, tabindex: "-1", style: `${clipStyle(clip.start, clip.end)}; --note:${note}` },
        h("span", { class: "cp-clip__name" }, project.title),
        motifRoll(clip),
      );
      const row = h(
        "li",
        { class: "cp-tr", style: `--note:${note}` },
        h(
          "div",
          { class: "cp-tr__head" },
          h("span", { class: "cp-tr__no", "aria-hidden": "true" }, String(clip.index + 1).padStart(2, "0")),
          project.cover
            ? h("img", { class: "cp-tr__art", src: project.cover, alt: "", loading: "lazy", decoding: "async" })
            : h("span", { class: "cp-tr__art", "aria-hidden": "true" }),
          h(
            "div",
            { class: "cp-tr__copy" },
            h(
              "h2",
              { class: "cp-tr__title" },
              h("a", { class: "cp-tr__link", href: project.href, ...part("project.title", project.slug) }, project.title),
            ),
            h("p", { class: "cp-tr__meta", ...part("project.meta", project.slug) }, `${project.dateLabel} · ${project.kind}`),
            h("p", { class: "cp-tr__sum", ...part("project.summary", project.slug) }, project.summary),
            project.tools.length
              ? h("p", { class: "cp-tr__tools", ...part("project.tools", project.slug) }, project.tools.join(" · "))
              : null,
          ),
          cueButton,
        ),
        h("div", { class: "cp-lane cp-tr__lane", "aria-hidden": "true" }, grid(model), clipEl, run()),
      );
      transport.watch(row, clip.start, clip.end);
      if (!options.face) {
        listen(row, `clip:${project.slug}`, () => clipPhrase(clip));
        cueButton.addEventListener("click", () => cue(clip, row));
      }

      // its copy on the tape
      const tapeClip = h(
        "button",
        {
          type: "button",
          class: "cp-tape__clip",
          tabindex: "-1",
          "aria-hidden": "true",
          style: `${at(clip.start)}; --w:${clip.end - clip.start}; --row:${clip.row}; --note:${note}`,
        },
        h("span", { class: "cp-clip__name" }, project.title),
        motifRoll(clip),
      );
      transport.watch(tapeClip, clip.start, clip.end);
      tapeClip.addEventListener("click", () => cue(clip, tapeClip));
      tapeClips.append(tapeClip);
      return row;
    }),
  );

  const body = h(
    "section",
    { class: "cp-arr", "aria-label": words.list },
    h("div", { class: "cp-arr__deck" }, deckBar, ruler, tape),
    markerLane,
    spanLane,
    tracks,
  );

  /* ── behaviour ──────────────────────────────────────────── */
  const app = () => body.closest(".cp-app");
  /** Sound is off: point at the switch rather than play into silence. */
  function nudge() {
    if (soundOn()) return;
    const button = app()?.querySelector<HTMLElement>(".cp-sound");
    if (button) {
      button.dataset.nudge = "";
      setTimeout(() => delete button.dataset.nudge, 1400);
    }
    announce.textContent = words.soundOff;
  }

  let lastClip: Clip | undefined;
  let lastWhen = "";
  transport.onTick((t, playing) => {
    const where = position(t);
    const when = monthLabel(t);
    posBar.textContent = where.bar;
    posBeat.textContent = where.beat;
    posLabel.textContent = when;
    body.dataset.playing = playing ? "true" : "false";
    playButton.setAttribute("aria-pressed", String(playing));
    playButton.setAttribute("aria-label", playing ? words.pauseLabel : playLabel);
    playButton.querySelector(".cp-tp__word")!.textContent = playing ? words.pause : words.play;
    if (when !== lastWhen) {
      lastWhen = when;
      const months = String(Math.round((t - model.from) * 12));
      for (const slider of [scrubber, tapeScroller]) {
        slider.setAttribute("aria-valuenow", months);
        slider.setAttribute("aria-valuetext", when);
      }
    }
    const clip = clipAt(model, t);
    if (clip !== lastClip) {
      lastClip = clip;
      if (clip) {
        npTitle.textContent = clip.project.title;
        npTitle.href = clip.project.href;
        npTitle.style.setProperty("--note", noteVar(clip.note));
        npTitle.hidden = false;
        npBetween.hidden = true;
      } else {
        npTitle.hidden = true;
        npBetween.hidden = false;
      }
    }
  });

  if (!options.face) {
    playButton.addEventListener("click", () => {
      const was = transport.playing;
      transport.toggle();
      if (!was) {
        announce.textContent = fill(words.playing, { when: monthLabel(transport.t) });
        if (!soundOn()) nudge();
      } else announce.textContent = fill(words.paused, { when: monthLabel(transport.t) });
    });
    stopButton.addEventListener("click", () => transport.stop());

    // the ruler: drag or click to scrub; arrows a month, pages a year
    const fromPointer = (event: PointerEvent) => {
      const box = scrubber.getBoundingClientRect();
      const share = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
      transport.seek(model.from + share * span);
    };
    scrubber.addEventListener("pointerdown", (event) => {
      scrubber.setPointerCapture(event.pointerId);
      fromPointer(event);
    });
    scrubber.addEventListener("pointermove", (event) => {
      if (scrubber.hasPointerCapture(event.pointerId)) fromPointer(event);
    });
    const keys = (event: KeyboardEvent) => {
      const step: Record<string, number> = {
        ArrowLeft: -MONTH,
        ArrowDown: -MONTH,
        ArrowRight: MONTH,
        ArrowUp: MONTH,
        PageDown: -1,
        PageUp: 1,
      };
      if (event.key === " ") {
        event.preventDefault();
        playButton.click();
      } else if (event.key in step) {
        event.preventDefault();
        const t = Math.round((transport.t + step[event.key]) * 12) / 12;
        if (tapeVisible()) glideTo(t);
        else transport.seek(t);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        if (event.key === "End") transport.rest();
        else if (tapeVisible()) glideTo(model.from);
        else transport.seek(model.from);
      }
    };
    scrubber.addEventListener("keydown", keys);
    tapeScroller.addEventListener("keydown", keys);
  }

  /* ── the tape follows the playhead; swiping it moves the playhead ── */
  const unwatch = tapeBehaviour();
  function tapeBehaviour() {
    const scrollFor = (t: number) => (t - model.from) * TAPE_YEAR;
    const timeFor = (left: number) => model.from + left / TAPE_YEAR;
    let touching = false;
    let gliding = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let landed: Clip | undefined = clipAt(model, model.now);

    const sizes = new ResizeObserver(() => {
      tapeStrip.style.setProperty("--pad", `${tapeScroller.clientWidth / 2}px`);
      tapeScroller.scrollLeft = scrollFor(transport.t);
    });
    sizes.observe(tapeScroller);

    transport.onTick((t) => {
      if (touching || gliding || !tapeVisible()) return;
      tapeScroller.scrollLeft = scrollFor(t);
    });

    glideTo = (t: number) => {
      gliding = true;
      transport.seek(t);
      tapeScroller.scrollTo({ left: scrollFor(t), behavior: options.reducedMotion ? "auto" : "smooth" });
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 700);
    };

    /** The swipe has come to rest: snap to a clip that starts close by,
     * then hear the clip under the playhead if it is a new one. */
    function settle() {
      const wasTouching = touching;
      touching = false;
      gliding = false;
      if (!wasTouching) return;
      const t = timeFor(tapeScroller.scrollLeft);
      const near = model.clips.find((clip) => Math.abs(clip.start - t) * TAPE_YEAR < 28);
      if (near && Math.abs(near.start - t) > 1e-3) {
        glideTo(near.start);
        return finish(near.start);
      }
      finish(t);
    }
    function finish(t: number) {
      const clip = clipAt(model, t);
      if (clip && clip !== landed) {
        const el = tapeClips.children[clip.index] as HTMLElement | undefined;
        if (el) hear(el, `clip:${clip.project.slug}`, () => clipPhrase(clip));
      }
      landed = clip;
    }

    const grab = () => {
      touching = true;
      if (transport.playing) transport.pause();
    };
    for (const type of ["pointerdown", "touchstart", "wheel"] as const)
      tapeScroller.addEventListener(type, grab, { passive: true });
    tapeScroller.addEventListener(
      "scroll",
      () => {
        if (!touching && !gliding) return;
        transport.seek(timeFor(tapeScroller.scrollLeft));
        clearTimeout(settleTimer);
        settleTimer = setTimeout(settle, 160);
      },
      { passive: true },
    );
    return () => {
      sizes.disconnect();
      clearTimeout(settleTimer);
    };
  }

  return {
    el: body,
    destroy() {
      unwatch();
      transport.destroy();
    },
    idle(idle) {
      transport.setIdle(idle);
    },
  };
}
