/** Projects: the arrangement view. Years are bars and months beats along
 * the ruler; updates sit on the marker lane as locators; each project is a
 * track with its clip placed in time. Mute and solo are real: they decide
 * what sounds when the playhead sweeps the career. */
import type { Route } from "../types";
import { h, link, text } from "./dom";
import { noteAt, noteForUpdate, noteVar } from "./notes";
import {
  bar,
  clipStyle,
  laneGrid,
  roll,
  ruler,
  run,
  screen,
  viewHead,
  type Env,
  type Screen,
} from "./parts";
import { parseDate, parseMonth, place, PROJECT_LENGTH } from "./timeline";
import type { Transport } from "./transport";

/** Mute / solo buttons for a track, writing to the transport. */
export function mixButtons(
  transport: Transport,
  id: string,
  name: string,
  row: HTMLElement,
  signal: AbortSignal,
  refreshAll: () => void,
) {
  const mute = h(
    "button",
    { type: "button", class: "cp-ms cp-ms--mute", "aria-pressed": "false", "aria-label": `Mute ${name}`, "data-info": `Mute ${name} · it stays silent when the career plays` },
    "M",
  );
  const solo = h(
    "button",
    { type: "button", class: "cp-ms cp-ms--solo", "aria-pressed": "false", "aria-label": `Solo ${name}`, "data-info": `Solo ${name} · only soloed tracks sound` },
    "S",
  );
  const refresh = () => {
    mute.setAttribute("aria-pressed", String(transport.muted.has(id)));
    solo.setAttribute("aria-pressed", String(transport.soloed.has(id)));
    const silent = !transport.audible({ id });
    if (silent) row.dataset.silent = "";
    else delete row.dataset.silent;
  };
  const toggle = (set: Set<string>) => {
    if (set.has(id)) set.delete(id);
    else set.add(id);
    refreshAll();
  };
  mute.addEventListener("click", () => toggle(transport.muted), { signal });
  solo.addEventListener("click", () => toggle(transport.soloed), { signal });
  return { el: h("span", { class: "cp-ms-pair" }, mute, solo), refresh };
}

export function arrangement(route: Route, env: Env): Screen {
  const { content, transport, signal } = env;
  const { h1, head } = viewHead(route, "Arrangement", { eyebrow: "Projects", title: "Projects" });

  // updates as locators, staggered in three rows so close dates stay legible
  const markers = h(
    "div",
    { class: "cp-arr__markers" },
    h("span", { class: "cp-ruler__corner" }, "Markers", h("small", null, String(content.updates.length))),
    h(
      "ul",
      { class: "cp-lane cp-lane--markers", "aria-label": "Markers: recent updates" },
      laneGrid(),
      content.updates.map((update, index) => {
        const start = parseDate(update.date);
        const note = noteForUpdate(update.kind);
        const flag = link(
          update.href,
          {
            class: "cp-marker",
            "data-info": `${update.dateLabel} · ${update.title}`,
          },
          h("span", { class: "cp-marker__flag", "aria-hidden": "true" }),
          h("span", { class: "cp-marker__tip" }, h("time", { datetime: update.date }, update.dateLabel), " ", update.title),
        );
        const item = h(
          "li",
          { class: "cp-marker-slot", style: `--at:${place(start)}; --note:${noteVar(note.id)}; --row:${index % 3}` },
          flag,
        );
        transport.watch(item, start, start + 1 / 24, signal);
        return item;
      }),
      run(transport, signal),
    ),
  );

  const refreshers: (() => void)[] = [];
  const refreshAll = () => refreshers.forEach((fn) => fn());
  const tracks = h(
    "ol",
    { class: "cp-arr__tracks" },
    content.projects.map((project, index) => {
      const note = noteAt(index);
      const start = parseMonth(project.dateLabel, project.year);
      const end = start + PROJECT_LENGTH;
      const id = `project:${project.slug}`;
      const row = h("li", { class: "cp-tr", style: `--note:${noteVar(note.id)}` });
      const mix = mixButtons(transport, id, project.title, row, signal, refreshAll);
      refreshers.push(mix.refresh);
      row.append(
        h(
          "div",
          { class: "cp-tr__head" },
          h("span", { class: "cp-tr__no", "aria-hidden": "true" }, String(index + 1).padStart(2, "0")),
          h("img", { class: "cp-tr__art", src: project.cover, alt: "", loading: "lazy", decoding: "async" }),
          h(
            "div",
            { class: "cp-tr__copy" },
            h("h2", { class: "cp-tr__title" }, h("a", { href: project.href, "data-info": `Open ${project.title} in the clip view` }, project.title)),
            h("p", { class: "cp-tr__meta" }, `${project.dateLabel} · ${project.kind} · ${project.role}`),
            h("p", { class: "cp-tr__sum" }, project.summary),
            project.tools.length ? h("p", { class: "cp-tr__tools" }, project.tools.join(" · ")) : null,
          ),
          h(
            "div",
            { class: "cp-tr__mix" },
            mix.el,
            h("span", { class: "cp-vu", "aria-hidden": "true" }, h("i"), h("i"), h("i"), h("i"), h("i")),
          ),
        ),
        h(
          "div",
          { class: "cp-lane", "aria-hidden": "true" },
          laneGrid(),
          h(
            "a",
            {
              class: "cp-clip",
              href: project.href,
              tabindex: "-1",
              style: clipStyle(start, end, noteVar(note.id)),
              "data-info": `${project.title} · clip starts ${project.dateLabel}`,
            },
            h("span", { class: "cp-clip__name" }, project.title),
            roll(project.slug),
          ),
          run(transport, signal),
        ),
      );
      transport.watch(row, start, end, signal);
      return row;
    }),
  );
  refreshAll();

  const trail = text(route.main.querySelector(".timeline")?.previousElementSibling);
  const body = h(
    "section",
    { class: "cp-arr", "aria-label": "Arrangement: one track per project, newest first" },
    ruler(transport, signal, h("span", null, "Tracks", h("small", null, String(content.projects.length)))),
    markers,
    bar(tracks, 1, 3),
  );
  return {
    el: screen(
      "projects",
      h(
        "div",
        { class: "cp-page cp-page--arr" },
        head,
        trail ? h("p", { class: "cp-trail" }, trail) : null,
        body,
      ),
    ),
    heading: h1,
  };
}
