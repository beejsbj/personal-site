/** Projects as the EQUIP screen: a tilted slot list on one side, a big
 * item file with the cover on the other. A project page is the item's full
 * file: cover pinned left, stats, links as shop cards, notes as dialogue. */
import type { Route, SiteContent } from "../types";
import {
  type Env,
  type Screen,
  backLink,
  frame,
  prompts,
  roving,
  screenTitle,
  tabs,
  text,
} from "./chrome";
import { cleanProse, concentricStar, h, ransom } from "./dom";
import { other } from "./other";

type Project = SiteContent["projects"][number];

let rememberedSlug: string | undefined;

const kindLabel = (project: Project) =>
  project.kind === "Arcade" ? "Arcade" : project.featured ? "Selected" : "Project";

function stat(label: string, value: string) {
  return h(
    "div",
    { class: "cc-stat" },
    h("dt", { class: "cc-stat__label" }, label),
    h("dd", { class: "cc-stat__value" }, value),
  );
}

function detailPanel(project: Project) {
  return h(
    "div",
    { class: "cc-file", "data-slug": project.slug },
    h(
      "figure",
      { class: "cc-file__cover" },
      h("img", { src: project.cover, alt: "", decoding: "async" }),
    ),
    h(
      "p",
      { class: "cc-file__cat" },
      h("span", {}, kindLabel(project)),
      " ★ ",
      h("span", {}, project.dateLabel),
    ),
    h("p", { class: "cc-file__name" }, ransom(project.title, { boxes: 0.16, salt: 4 })),
    h("p", { class: "cc-file__summary" }, project.summary),
    h(
      "dl",
      { class: "cc-file__stats" },
      stat("Role", project.role),
      stat("Where", project.location),
    ),
    project.tools.length
      ? h("ul", { class: "cc-chips" }, project.tools.map((tool) => h("li", {}, tool)))
      : null,
    h("p", { class: "cc-file__open" }, h("kbd", {}, "⏎"), " Open file"),
  );
}

export function projects(route: Route, env: Env): Screen {
  const { el, main } = frame(route.kind, "cc-equip");
  const list = env.content.projects;
  const intro = text(route.main.querySelector(".page-header__intro"));
  const tagline = text(route.main.querySelector("h1"));
  const { wrap, heading } = screenTitle("Projects", tagline || undefined, "Equip");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-equip__rays" }),
    h("span", { class: "cc-equip__red" }),
    h("span", { class: "cc-equip__star" }, concentricStar(["#1b1b1b", "#141414", "#1c1c1c", "#131313"])),
  );

  const slots = list.map((project, i) =>
    h(
      "a",
      {
        class: "cc-slot",
        href: project.href,
        style: `--i:${i}`,
        "data-slug": project.slug,
        "data-cc-title": project.title,
      },
      h("span", { class: "cc-slot__shard", "aria-hidden": "true" }),
      h(
        "span",
        { class: "cc-slot__cat" },
        h("span", { class: "cc-slot__year" }, String(project.year)),
        h("span", { "aria-hidden": "true" }, " ★ "),
        h("span", { class: "cc-sr" }, ", "),
        kindLabel(project),
      ),
      h("span", { class: "cc-slot__name" }, project.title),
      h("img", { class: "cc-slot__thumb", src: project.cover, alt: "", loading: "lazy", decoding: "async" }),
      h("span", { class: "cc-slot__sum" }, project.summary),
    ),
  );

  const detail = h("div", { class: "cc-equip__detail", "aria-hidden": "true" });
  detail.addEventListener(
    "click",
    () => slots[menu.index]?.click(),
    { signal: env.signal },
  );

  main.append(
    h(
      "div",
      { class: "cc-equip__col" },
      h("div", { class: "cc-equip__head" }, backLink("/", "Command"), wrap),
      intro ? h("p", { class: "cc-equip__intro" }, intro) : "",
      h(
        "nav",
        { class: "cc-equip__list", "aria-label": "Projects, newest first" },
        h("ol", {}, slots.map((slot) => h("li", {}, slot))),
      ),
    ),
    detail,
    prompts([["↑↓", "Browse"], ["⏎", "Open"], ["Q/E", "Section"], ["Esc", "Back"]]),
  );
  el.prepend(tabs(route.kind));

  const start = Math.max(0, list.findIndex((p) => p.slug === rememberedSlug));
  const menu = roving(slots, env.signal, (i) => {
    rememberedSlug = list[i].slug;
    const next = detailPanel(list[i]);
    detail.replaceChildren(next);
    detail.dataset.flip = detail.dataset.flip === "a" ? "b" : "a";
  }, start);

  return {
    el,
    heading,
    back: el.querySelector<HTMLAnchorElement>(".cc-back")!,
    onKey: (event) => menu.key(event),
  };
}

/** A project page: the full item file. */
export function projectEntry(route: Route, env: Env): Screen {
  const list = env.content.projects;
  const index = list.findIndex((p) => p.slug === route.slug);
  if (index < 0) return other(route, env);
  const project = list[index];
  rememberedSlug = project.slug;
  const prev = list[(index - 1 + list.length) % list.length];
  const next = list[(index + 1) % list.length];
  const { el, main } = frame(route.kind, "cc-item");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-item__red" }),
    h("span", { class: "cc-item__star" }, concentricStar(["#8c8c8c", "#e5191c", "#0a0a0a", "#e5191c"])),
  );

  const heading = h(
    "h1",
    { class: "cc-item__title", tabindex: "-1" },
    ransom(project.title, { boxes: 0.18, salt: 1 }),
  );
  const media = project.media.length
    ? project.media
    : [{ type: "image" as const, src: project.cover, alt: project.title }];
  const [lead, ...rest] = media;
  const figure = (m: (typeof media)[number], cls: string) =>
    h(
      "figure",
      { class: cls },
      m.type === "video"
        ? h("video", { src: m.src, controls: true, muted: true, playsinline: true, preload: "metadata", "aria-label": m.alt ?? project.title })
        : h("img", { src: m.src, alt: m.alt ?? "", decoding: "async" }),
      m.caption ? h("figcaption", {}, m.caption) : null,
    );

  const prose = cleanProse(route.main.querySelector(".prose"));
  const back = backLink("/projects", "Projects");

  main.append(
    h(
      "div",
      { class: "cc-item__visual" },
      figure(lead, "cc-item__cover"),
      rest.length
        ? h("div", { class: "cc-item__rail" }, rest.map((m) => figure(m, "cc-item__media")))
        : null,
    ),
    h(
      "div",
      { class: "cc-item__file" },
      back,
      h(
        "p",
        { class: "cc-item__cat" },
        h("span", {}, kindLabel(project)),
        " ★ ",
        h("span", {}, project.dateLabel),
      ),
      heading,
      h("p", { class: "cc-item__summary" }, project.summary),
      h(
        "dl",
        { class: "cc-item__stats" },
        stat("Role", project.role),
        stat("Where", project.location),
        stat("When", project.dateLabel),
      ),
      project.tools.length
        ? h("ul", { class: "cc-chips", "aria-label": `${project.title} tools` }, project.tools.map((tool) => h("li", {}, tool)))
        : null,
      project.links.length
        ? h(
            "ul",
            { class: "cc-shop", "aria-label": "Links" },
            project.links.map((link, i) =>
              h(
                "li",
                { style: `--i:${i}` },
                h(
                  "a",
                  { class: "cc-shop__card", href: link.url, rel: "noreferrer", "data-primary": i === 0 ? "" : null },
                  h("span", { class: "cc-shop__verb", "aria-hidden": "true" }, i === 0 ? "Open" : "Get"),
                  h("span", { class: "cc-shop__label" }, link.label, h("span", { "aria-hidden": "true" }, " ↗")),
                ),
              ),
            ),
          )
        : null,
      prose.childElementCount ? h("div", { class: "cc-item__notes" }, prose) : null,
      h(
        "nav",
        { class: "cc-item__pager", "aria-label": "More projects" },
        h("a", { href: prev.href, rel: "prev", "data-cc-title": prev.title, class: "cc-pager cc-pager--prev" },
          h("kbd", { "aria-hidden": "true" }, "←"), h("span", { class: "cc-pager__dir" }, "Prev"), h("span", { class: "cc-pager__name" }, prev.title)),
        h("a", { href: next.href, rel: "next", "data-cc-title": next.title, class: "cc-pager cc-pager--next" },
          h("span", { class: "cc-pager__dir" }, "Next"), h("span", { class: "cc-pager__name" }, next.title), h("kbd", { "aria-hidden": "true" }, "→")),
      ),
    ),
    prompts([["←→", "Item"], ["Q/E", "Section"], ["Esc", "Back"]]),
  );
  el.prepend(tabs(route.kind));

  const pager = el.querySelectorAll<HTMLAnchorElement>(".cc-pager");
  return {
    el,
    heading,
    back,
    onKey(event) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        pager[event.key === "ArrowLeft" ? 0 : 1].click();
        return true;
      }
      return false;
    },
  };
}
