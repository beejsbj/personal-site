/** The arrangement: the career laid out left to right. Years are bars on the
 * ruler with a tick per month; under it the Changes (the chord loop), the
 * Roles (the bass), one track per project with its clip at its date, and
 * the Markers (updates). The playhead crosses all of them. Mute, solo and
 * hear are real; hovering a clip auditions it; clicking the ruler moves the
 * playhead. `full` adds each project's summary and tools to its track head. */
import { part } from "../../parts";
import { h, link } from "./dom";
import { hoverAudition, noteVar, roll, spell, trackControls, type Env } from "./bits";
import { place, type Range } from "./transport";
import { MONTH, type Clip } from "./score";

/** Where something sits on a lane: left and width as shares of the range. */
export const span = (start: number, end: number, range: Range) =>
  `--at:${place(start, range).toFixed(5)}; --len:${Math.max((Math.min(end, range.to) - Math.max(start, range.from)) / (range.to - range.from), 0).toFixed(5)}`;

/** The ruler: a bar per year (labelled), a tick per month. Click or drag to
 * move the playhead. */
export function ruler(env: Env, range: Range, corner: Node | string, monthLabels = false) {
  const { transport, signal, copy } = env;
  const years: number[] = [];
  for (let y = Math.floor(range.from); y < range.to; y += 1) years.push(y);
  const lane = h(
    "div",
    { class: "cp-ruler__lane", role: "presentation", title: copy.tracks.ruler },
    years.map((y) =>
      h(
        "span",
        { class: "cp-ruler__year", style: span(Math.max(y, range.from), y + 1, range) + `; --months:${Math.round((Math.min(y + 1, range.to) - Math.max(y, range.from)) * 12)}` },
        y >= range.from ? h("b", null, String(y)) : null,
        monthLabels
          ? Array.from({ length: 12 }, (_, m) =>
              y + m / 12 >= range.from - 1e-6 && y + m / 12 < range.to
                ? h("i", { class: "cp-ruler__month", style: `--at:${place(y + m / 12, range)}` }, ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][m])
                : null,
            )
          : null,
      ),
    ),
  );
  if (!env.face) {
    const seekAt = (event: PointerEvent) => {
      const box = lane.getBoundingClientRect();
      const share = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
      transport.seek(range.from + share * (range.to - range.from));
    };
    lane.addEventListener("pointerdown", (event) => {
      lane.setPointerCapture(event.pointerId);
      seekAt(event);
    }, { signal });
    lane.addEventListener("pointermove", (event) => lane.hasPointerCapture(event.pointerId) && seekAt(event), { signal });
  }
  return h("div", { class: "cp-arr__row cp-arr__row--ruler" }, h("div", { class: "cp-arr__head cp-ruler__corner" }, corner), lane);
}

/** Lines, the future and the playhead, laid over every lane. */
export function overlay(env: Env, range: Range) {
  const { session, transport, signal, copy } = env;
  const run = h("span", { class: "cp-run" }, h("span", { class: "cp-run__head" }));
  transport.playhead(run, range, signal);
  const lines: HTMLElement[] = [];
  for (let y = Math.ceil(range.from); y < range.to; y += 1)
    lines.push(h("span", { class: "cp-arr__line", style: `--at:${place(y, range)}` }));
  const showNow = session.now > range.from && session.now < range.to;
  return h(
    "div",
    { class: "cp-arr__over", "aria-hidden": "true" },
    lines,
    showNow
      ? h("span", { class: "cp-future", style: `--at:${place(session.now, range)}` }, h("span", { class: "cp-future__label" }, copy.tracks.today))
      : null,
    run,
  );
}

/** The chord loop as blocks, one per half bar. */
export function changesLane(env: Env, range: Range) {
  const { session, transport, signal } = env;
  return h(
    "div",
    { class: "cp-lane cp-lane--changes" },
    session.changes
      .filter((c) => c.t + 0.5 > range.from && c.t < range.to)
      .map((c, i) => {
        const block = h("span", { class: "cp-chord", style: `${span(c.t, c.t + 0.5, range)}; --tint:${i % 2}` }, c.chord.name);
        transport.watch(block, c.t, c.t + 0.5, signal, "changes");
        return block;
      }),
  );
}

/** Role clips on the bass lane. */
export function rolesLane(env: Env, range: Range) {
  const { content, session, transport, signal } = env;
  const entries = [...content.resume.experience.roles, ...content.resume.education.entries];
  return h(
    "div",
    { class: "cp-lane cp-lane--roles" },
    session.clips
      .filter((c) => c.kind === "role" && c.end > range.from && c.start < range.to)
      .map((clip, i) => {
        const entry = entries.find((e) => e.id === clip.ref);
        const name = entry?.org ?? entry?.title ?? "";
        const el = link("/resume", { class: "cp-rclip", style: `${span(clip.start, clip.end, range)}; --row:${i % 2}`, tabindex: "-1", title: entry?.heading }, h("span", null, name));
        transport.watch(el, clip.start, clip.end, signal, "roles");
        hoverAudition(env, el, clip);
        return el;
      }),
  );
}

/** Update flags on the marker lane. */
export function markersLane(env: Env, range: Range) {
  const { content, session, transport, signal } = env;
  let previous = -Infinity;
  let row = 0;
  return h(
    "div",
    { class: "cp-lane cp-lane--markers" },
    session.clips
      .filter((c) => c.kind === "update" && c.start >= range.from && c.start < range.to)
      .map((clip) => {
        const update = content.updates.find((u) => u.id === clip.ref);
        if (!update) return null;
        // close dates stagger into rows so each flag stays a target
        row = clip.start - previous < (range.to - range.from) / 60 ? (row + 1) % 3 : 0;
        previous = clip.start;
        const el = link(update.href, { class: "cp-flag", style: `--at:${place(clip.start, range)}; --row:${row}`, tabindex: "-1", title: `${update.dateLabel} · ${update.title}` }, h("span", { class: "cp-flag__pin" }));
        transport.watch(el, clip.start, clip.start + MONTH, signal, "markers");
        hoverAudition(env, el, clip);
        return el;
      }),
  );
}

/** A project's clip: its name and its notes, at its date. */
export function projectClip(env: Env, clip: Clip, index: number, title: string, href: string, range: Range, big = false) {
  const el = link(
    href,
    {
      class: big ? "cp-clip cp-clip--big" : "cp-clip",
      style: `${span(clip.start, clip.end, range)}; --note:${noteVar(index)}`,
      tabindex: big ? null : "-1",
      "aria-label": big ? null : title,
      "data-notes": spell(clip.notes),
    },
    h("span", { class: "cp-clip__name" }, title),
    roll(clip.notes),
    h("span", { class: "cp-clip__run", "aria-hidden": "true" }),
  );
  env.transport.watch(el, clip.start, clip.end, env.signal, clip.track);
  hoverAudition(env, el, clip);
  return el;
}

export function arrangement(env: Env, full: boolean) {
  const { content, session, copy } = env;
  const words = copy.tracks;
  const range = { from: session.from, to: session.end };
  const lane = (cls: string, ...children: (Node | null)[]) => h("div", { class: `cp-lane ${cls}` }, ...children);

  const head = (name: string, voice: string, row: HTMLElement, track: string) =>
    h(
      "div",
      { class: "cp-arr__head" },
      h("span", { class: "cp-arr__name" }, name, h("small", null, voice)),
      trackControls(env, track, name, row),
    );

  const changes = h("div", { class: "cp-arr__row cp-arr__row--changes" });
  changes.append(head(words.changes, words.changesVoice, changes, "changes"), changesLane(env, range));
  const roles = h("div", { class: "cp-arr__row cp-arr__row--roles" });
  roles.append(head(words.roles, words.rolesVoice, roles, "roles"), rolesLane(env, range));
  const markers = h("div", { class: "cp-arr__row cp-arr__row--markers" });
  markers.append(head(`${words.markers} ${content.updates.length}`, words.markersVoice, markers, "markers"), markersLane(env, range));

  const tracks = h(
    "ol",
    { class: "cp-arr__tracks" },
    content.projects.map((project, index) => {
      const clip = session.clips.find((c) => c.id === `project:${project.slug}`)!;
      const row = h("li", { class: "cp-arr__row cp-track", style: `--note:${noteVar(index)}` });
      const voice = words.voices[clip.voice as "lead" | "chip"] ?? "";
      const clipEl = projectClip(env, clip, index, project.title, project.href, range);
      row.append(
        h(
          "div",
          { class: "cp-arr__head cp-track__head" },
          h("span", { class: "cp-track__no", "aria-hidden": "true" }, String(index + 1).padStart(2, "0")),
          h(
            "div",
            { class: "cp-track__copy" },
            h("h3", { class: "cp-track__title" }, link(project.href, part("project.title", project.slug), project.title)),
            h("p", { class: "cp-track__meta", ...part("project.meta", project.slug) }, `${project.dateLabel} · ${project.kind}`, h("span", { class: "cp-track__voice" }, ` · ${voice}`)),
            full ? h("p", { class: "cp-track__sum", ...part("project.summary", project.slug) }, project.summary) : null,
            full && project.tools.length ? h("p", { class: "cp-track__tools", ...part("project.tools", project.slug) }, project.tools.slice(0, 3).join(" · ")) : null,
          ),
          trackControls(env, clip.track, project.title, row, clip, clipEl),
        ),
        lane("cp-lane--track", clipEl),
      );
      return row;
    }),
  );

  const corner = h("span", null, words.tracks, h("small", null, String(content.projects.length)));
  return h(
    "section",
    { class: `cp-arr ${full ? "cp-arr--full" : "cp-arr--session"}` },
    ruler(env, range, corner),
    changes,
    roles,
    tracks,
    markers,
    overlay(env, range),
  );
}

