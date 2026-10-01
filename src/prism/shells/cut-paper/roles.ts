/** Resume: the roles as an arrangement. Each section of the resume is a
 * group track; each role a track whose clip spans the time spent in it,
 * with its notes (what was done) readable under the lane. Sections without
 * roles (tools, see the work) are the master track's notes. */
import type { Route } from "../types";
import { h, text } from "./dom";
import { noteAt, noteVar } from "./notes";
import { adopt, bar, chips, clipStyle, laneGrid, ruler, run, screen, viewHead, type Env, type Screen } from "./parts";
import { parseSpan } from "./timeline";
import { mixButtons } from "./arrange";

export function roles(route: Route, env: Env): Screen {
  const { content, transport, signal } = env;
  const contacts = [...route.main.querySelectorAll<HTMLAnchorElement>(".page-header__actions a")].map((anchor) => ({
    label: text(anchor),
    url: anchor.getAttribute("href") ?? "/",
  }));
  const { h1, head } = viewHead(
    route,
    "Roles",
    { eyebrow: "Resume", title: content.site.name },
    contacts.length ? chips(contacts, "Contact") : null,
  );

  const source = route.main.querySelector(".prose");
  const groups = h("div", { class: "cp-groups" });
  let group: HTMLElement | undefined;
  let master: HTMLElement | undefined;
  let role: HTMLElement | undefined;
  let notes: HTMLElement | undefined;
  let roleIndex = 0;
  const refreshers: (() => void)[] = [];
  const refreshAll = () => refreshers.forEach((fn) => fn());

  const notesFor = (target: HTMLElement) => {
    let box = target.querySelector<HTMLElement>(":scope > .cp-prose");
    if (!box) {
      box = h("div", { class: "cp-prose" });
      target.append(box);
    }
    return box;
  };

  for (const child of source ? [...source.children] : []) {
    adopt(child);
    if (child.tagName === "H2") {
      group = h(
        "section",
        { class: "cp-group" },
        h(
          "h2",
          { class: "cp-group__title" },
          h("span", { class: "cp-group__fold", "aria-hidden": "true" }),
          h("span", { class: "cp-group__name" }, text(child)),
        ),
      );
      master = undefined;
      role = undefined;
      notes = undefined;
      groups.append(group);
      continue;
    }
    if (!group) {
      group = h("section", { class: "cp-group" });
      groups.append(group);
    }
    if (child.tagName === "H3") {
      const [name, where] = text(child).split(" · ");
      const index = roleIndex++;
      const id = `role:${index}`;
      const note = noteVar(noteAt(index * 2).id);
      notes = h("div", { class: "cp-role__notes" });
      role = h("article", { class: "cp-role", style: `--note:${note}` });
      const lane = h("div", { class: "cp-lane", "aria-hidden": "true" }, laneGrid());
      const when = h("p", { class: "cp-role__when" });
      const mix = mixButtons(transport, id, name, role, signal, refreshAll);
      refreshers.push(mix.refresh);
      role.append(
        h(
          "div",
          { class: "cp-role__head" },
          h("span", { class: "cp-tr__no", "aria-hidden": "true" }, String(index + 1).padStart(2, "0")),
          h(
            "div",
            { class: "cp-role__copy" },
            h("h3", { class: "cp-role__title" }, name, where ? h("span", { class: "cp-role__where" }, ` · ${where}`) : null),
            when,
          ),
          mix.el,
        ),
        lane,
        notes,
      );
      group.append(role);
      master = undefined;
      continue;
    }
    const em =
      child.tagName === "P" &&
      child.children.length === 1 &&
      child.firstElementChild?.tagName === "EM" &&
      text(child) === text(child.firstElementChild);
    if (role && em && !role.dataset.dated) {
      const whenText = text(child);
      role.dataset.dated = "";
      role.querySelector(".cp-role__when")!.textContent = whenText;
      const span = parseSpan(whenText);
      const lane = role.querySelector<HTMLElement>(".cp-lane")!;
      if (span) {
        const name = text(role.querySelector(".cp-role__title"));
        lane.append(
          h(
            "span",
            { class: "cp-clip", style: clipStyle(span[0], span[1], role.style.getPropertyValue("--note")) },
            h("span", { class: "cp-clip__name" }, name.split(" · ")[1] ?? name),
          ),
        );
        transport.watch(role, span[0], span[1], signal);
      }
      continue;
    }
    if (notes && role) {
      notesFor(notes).append(child);
      continue;
    }
    if (!master) {
      master = h("div", { class: "cp-master" }, h("span", { class: "cp-master__tag", "aria-hidden": "true" }, "master"));
      group.append(master);
    }
    notesFor(master).append(child);
  }

  // undated roles keep an honest empty lane
  groups.querySelectorAll<HTMLElement>(".cp-role:not([data-dated])").forEach((el) => {
    el.querySelector(".cp-role__when")!.textContent = "Undated";
    el.querySelector(".cp-lane")!.classList.add("cp-lane--undated");
  });
  groups.querySelectorAll(".cp-lane").forEach((lane) => lane.append(run(transport, signal)));
  groups.querySelectorAll<HTMLElement>(".cp-group").forEach((section) => {
    const count = section.querySelectorAll(".cp-role").length;
    const title = section.querySelector(".cp-group__title");
    if (title && count) title.append(h("small", null, `${count} track${count === 1 ? "" : "s"}`));
  });
  refreshAll();
  bar(groups, 2, 3);

  return {
    el: screen(
      "resume",
      h(
        "div",
        { class: "cp-page cp-page--roles" },
        head,
        h(
          "section",
          { class: "cp-arr cp-arr--roles", "aria-label": "Roles as tracks" },
          ruler(transport, signal, h("span", null, "Roles", h("small", null, String(roleIndex)))),
          groups,
        ),
      ),
    ),
    heading: h1,
  };
}
