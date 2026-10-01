/** Home: the session view. The set's info on the left (who, what, where
 * else), and the clip launcher: every page and link in the portfolio is a
 * clip in a track. Launching a clip opens it; a scene button plays its row. */
import type { Route } from "../types";
import { h, link, text } from "./dom";
import { noteAt, noteForUpdate, NOTES, noteVar } from "./notes";
import { adopt, bar, chips, heading, kicker, scrap, screen, type Env, type Screen } from "./parts";
import { play } from "./sound";
import { onNext } from "./beat";
import { parseDate, parseMonth, PROJECT_LENGTH, UPDATE_LENGTH } from "./timeline";

interface Slot {
  title: string;
  meta: string;
  href: string;
  info: string;
  /** Note colour; none means a chrome (return) clip. */
  note?: string;
  frequency: number;
  span?: [number, number];
}

interface Track {
  name: string;
  sub: string;
  slots: Slot[];
}

export function session(route: Route, env: Env): Screen {
  const { content, transport, memory, signal } = env;
  const { main } = route;
  const page = content.pages.home;
  const greeting = text(main.querySelector(".greeting")) || "Hey there!";
  const title = text(main.querySelector("h1")) || page.headline || "Burooj here!";
  const role = text(main.querySelector(".occupation")) || page.eyebrow || "Frontend developer";
  const intro = text(main.querySelector(".welcome")) || page.intro || "";
  const portrait = main.querySelector<HTMLImageElement>(".hello img");
  const current = main.querySelector(".current-copy");
  if (current) memory.current = current.cloneNode(true) as Element;

  /* ── the set's info ─────────────────────────────────────── */
  const h1 = heading(title, "cp-set-info__title", "cp-home-title");
  const socials = [
    ...content.site.social.map((item) => ({ label: item.label, url: item.href })),
    { label: "Resume", url: "/resume" },
  ];
  const noteCopy = memory.current?.cloneNode(true) as Element | undefined;
  const info = h(
    "section",
    { class: "cp-set-info", "aria-labelledby": "cp-home-title" },
    scrap("tomato", "torn", "cp-set-info__scrap-a"),
    scrap("plum", "stairs", "cp-set-info__scrap-b"),
    scrap("mustard", "tri", "cp-set-info__scrap-c"),
    h(
      "figure",
      { class: "cp-art" },
      h("img", {
        src: portrait?.getAttribute("src") ?? "/images/burooj4.jpg",
        alt: portrait?.getAttribute("alt") ?? "Burooj Rashid",
        width: 1080,
        height: 1920,
        decoding: "async",
      }),
      h("figcaption", { class: "cp-art__file", "aria-hidden": "true" }, "burooj.als"),
    ),
    kicker(greeting),
    h1,
    h("p", { class: "cp-set-info__role" }, role),
    h("p", { class: "cp-set-info__intro" }, intro),
    chips(socials, "Elsewhere"),
    noteCopy
      ? h(
          "aside",
          { class: "cp-note", "aria-label": "Currently" },
          h("span", { class: "cp-note__tape", "aria-hidden": "true" }),
          h("div", { class: "cp-note__copy" }, adopt(noteCopy)),
        )
      : null,
  );
  bar(info, 1);

  /* ── the clip launcher ──────────────────────────────────── */
  const project = (kind: "Project" | "Arcade") =>
    content.projects
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.kind === kind)
      .map(({ item, index }): Slot => {
        const start = parseMonth(item.dateLabel, item.year);
        const note = noteAt(index);
        return {
          title: item.title,
          meta: item.dateLabel,
          href: item.href,
          info: `${item.title} · ${item.dateLabel} · ${item.summary}`,
          note: noteVar(note.id),
          frequency: note.frequency,
          span: [start, start + PROJECT_LENGTH],
        };
      });
  const tracks: Track[] = [
    { name: "Work", sub: "projects", slots: project("Project") },
    { name: "Arcade", sub: "learning", slots: project("Arcade") },
    {
      name: "Lab",
      sub: "sketches",
      slots: content.lab.map((item, index) => {
        const note = noteAt(index + 2);
        return {
          title: item.title,
          meta: item.type,
          href: item.href ?? item.detail,
          info: `${item.title} · ${item.type} · ${item.summary}`,
          note: noteVar(note.id),
          frequency: note.frequency,
        };
      }),
    },
    {
      name: "Log",
      sub: "updates",
      slots: content.updates.map((update) => {
        const note = noteForUpdate(update.kind);
        const start = parseDate(update.date);
        return {
          title: update.title,
          meta: update.dateLabel,
          href: update.href,
          info: `${update.dateLabel} · ${update.source} · ${update.title}`,
          note: noteVar(note.id),
          frequency: note.frequency * 2,
          span: [start, start + UPDATE_LENGTH],
        };
      }),
    },
    {
      name: "Sends",
      sub: "elsewhere",
      slots: [
        { label: "Writing", href: content.site.writingUrl },
        ...content.site.social.map((item) => ({ label: item.label, href: item.href })),
      ].map((item, index) => ({
        title: item.label,
        meta: item.href.startsWith("mailto:") ? "say hello" : new URL(item.href).hostname.replace(/^www\./, ""),
        href: item.href,
        info: `Send · ${item.label} · ${item.href.replace(/^mailto:/, "")}`,
        frequency: NOTES[(index + 5) % 7].frequency / 2,
      })),
    },
  ];
  const rows = Math.max(...tracks.map((track) => track.slots.length));
  const clips: (HTMLAnchorElement | undefined)[][] = [];

  const launch = (anchor: HTMLAnchorElement, slot: Slot) => {
    play(slot.frequency, 0.8);
    anchor.dataset.state = "queued";
    setTimeout(() => {
      if (anchor.dataset.state === "queued") anchor.dataset.state = "rest";
    }, 1500);
  };

  const columns = tracks.map((track, col) => {
    const id = `cp-track-${col}`;
    const column: (HTMLAnchorElement | undefined)[] = [];
    clips.push(column);
    const slots = h(
      "ol",
      { class: "cp-col__slots" },
      Array.from({ length: rows }, (_, row) => {
        const slot = track.slots[row];
        if (!slot) {
          column.push(undefined);
          return h("li", { class: "cp-slot cp-slot--empty", "aria-hidden": "true" }, h("i"));
        }
        const anchor = link(
          slot.href,
          {
            class: `cp-launch${slot.note ? "" : " cp-launch--send"}`,
            "data-state": "rest",
            "data-info": slot.info,
            style: slot.note ? `--note:${slot.note}` : null,
          },
          h("span", { class: "cp-launch__btn", "aria-hidden": "true" }),
          h(
            "span",
            { class: "cp-launch__copy" },
            h("span", { class: "cp-launch__title" }, slot.title),
            h("span", { class: "cp-launch__meta" }, slot.meta),
          ),
        );
        anchor.addEventListener("click", () => launch(anchor, slot), { signal });
        anchor.addEventListener(
          "pointerenter",
          () => {
            if (env.reducedMotion) return;
            onNext(4, () => {
              if (anchor.matches(":hover")) play(slot.frequency, 0.4);
            });
          },
          { signal },
        );
        if (slot.span) transport.watch(anchor, slot.span[0], slot.span[1], signal);
        column.push(anchor);
        return h("li", { class: "cp-slot", style: `--row:${row}` }, anchor);
      }),
    );
    return h(
      "section",
      { class: "cp-col", "aria-labelledby": id, style: `--col:${col}` },
      h(
        "h3",
        { class: "cp-col__name", id },
        h("span", null, track.name),
        h("small", null, `${track.sub} · ${track.slots.length}`),
      ),
      slots,
      h(
        "p",
        { class: "cp-col__foot", "aria-hidden": "true" },
        h("i", { class: "cp-col__stop" }),
        h("span", { class: "cp-col__meter" }, h("i"), h("i"), h("i"), h("i")),
      ),
    );
  });

  // a scene plays its row: each clip lights on its own sixteenth
  const scenes = h(
    "div",
    { class: "cp-scenes", role: "group", "aria-labelledby": "cp-scenes-title" },
    h("h3", { class: "cp-col__name", id: "cp-scenes-title" }, h("span", null, "Scenes"), h("small", null, `${rows} rows`)),
    h(
      "ol",
      { class: "cp-col__slots" },
      Array.from({ length: rows }, (_, row) => {
        const button = h(
          "button",
          {
            type: "button",
            class: "cp-scene",
            "aria-label": `Play scene ${row + 1}`,
            "data-info": `Scene ${row + 1} · plays every clip in this row`,
          },
          h("span", { class: "cp-scene__btn", "aria-hidden": "true" }),
          h("span", { class: "cp-scene__no", "aria-hidden": "true" }, String(row + 1)),
        );
        button.addEventListener(
          "click",
          () => {
            button.dataset.state = "playing";
            let step = 0;
            tracks.forEach((track, col) => {
              const anchor = clips[col][row];
              const slot = track.slots[row];
              if (!anchor || !slot) return;
              const at = step++;
              setTimeout(() => {
                if (signal.aborted) return;
                play(slot.frequency, 0.7);
                anchor.dataset.hit = "";
                anchor.getBoundingClientRect();
                setTimeout(() => delete anchor.dataset.hit, 400);
              }, at * 125);
            });
            setTimeout(() => delete button.dataset.state, step * 125 + 400);
          },
          { signal },
        );
        return h("li", { class: "cp-slot" }, button);
      }),
    ),
    h("p", { class: "cp-col__foot", "aria-hidden": "true" }, h("span", { class: "cp-scenes__master" }, "master")),
  );

  const grid = h("div", { class: "cp-grid", style: `--rows:${rows}; --cols:${tracks.length}` }, columns, scenes);
  bar(grid, 1, 3);
  const launcher = h(
    "section",
    { class: "cp-session", "aria-labelledby": "cp-session-title" },
    h(
      "div",
      { class: "cp-session__head" },
      h("h2", { class: "cp-label", id: "cp-session-title" }, "Session"),
      h("p", { class: "cp-session__hint" }, "Every clip opens a page. The lit ones are playing now."),
    ),
    grid,
  );

  return {
    el: screen("home", h("div", { class: "cp-home" }, info, launcher)),
    heading: h1,
  };
}
