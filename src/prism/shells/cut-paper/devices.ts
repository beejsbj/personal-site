/** The lab: a device chain. Each experiment is a device on the rack, with
 * its display, a few knobs, its notes and a way out to the live sketch;
 * the signal flows from one to the next and on to "more on CodePen". */
import type { Route } from "../types";
import { h, link, markup } from "./dom";
import { noteAt, noteVar } from "./notes";
import { bar, buttons, credits, kicker, knob, prose, roll, screen, viewHead, type Env, type LabItem, type Screen } from "./parts";

function display(item: LabItem) {
  const key = `${item.slug} ${item.type}`;
  if (/motion|path|line|draw/i.test(key)) {
    const petals = [0, 40, -40, 80, -80]
      .map(
        (angle, i) =>
          `<path class="cp-viz__petal" style="--d:${i}" pathLength="1" transform="rotate(${angle} 60 78)" d="M60 78 C44 58 46 30 60 14 C74 30 76 58 60 78Z"/>`,
      )
      .join("");
    return markup(
      `<svg class="cp-viz cp-viz--lotus" viewBox="0 0 120 96" aria-hidden="true">${petals}<path class="cp-viz__water" pathLength="1" d="M8 84 Q34 76 60 84 T112 84"/></svg>`,
    );
  }
  if (/beat|rhythm|audio|shape/i.test(key)) {
    return markup(
      '<svg class="cp-viz cp-viz--beats" viewBox="0 0 120 96" aria-hidden="true"><circle style="--d:0" cx="22" cy="48" r="13"/><rect style="--d:1" x="42" y="35" width="26" height="26"/><path style="--d:2" d="M86 34 L100 62 H72Z"/><rect style="--d:3" x="104" y="30" width="7" height="36"/></svg>',
    );
  }
  return roll(item.slug, 24);
}

function device(item: LabItem, index: number, headingLevel: "h1" | "h2") {
  const target = item.href ?? item.detail;
  const words = item.type.split(/[^A-Za-z]+/).filter(Boolean);
  const title =
    headingLevel === "h1"
      ? h("h1", { class: "cp-device__name", tabindex: "-1", id: "cp-device-title" }, item.title)
      : h("h2", { class: "cp-device__name" }, link(target, { class: "cp-device__link", "data-info": `${item.title} · opens the live sketch` }, item.title));
  return h(
    "article",
    { class: "cp-device", style: `--note:${noteVar(noteAt(index + 2).id)}`, "data-state": "on" },
    h(
      "header",
      { class: "cp-device__bar" },
      h("span", { class: "cp-device__power", "aria-hidden": "true" }),
      title,
      h("span", { class: "cp-device__type" }, item.type),
    ),
    h(
      "div",
      { class: "cp-device__body" },
      h("div", { class: "cp-device__screen" }, display(item), h("span", { class: "cp-device__era", "aria-hidden": "true" }, item.sourceEra)),
      h(
        "div",
        { class: "cp-device__knobs", "aria-hidden": "true" },
        knob(0.62, words[0]?.toLowerCase() ?? "amt", "62"),
        knob(0.35, words[1]?.toLowerCase() ?? "mix", "35"),
        knob(0.8, "dry/wet", "80"),
      ),
      h("p", { class: "cp-device__sum" }, item.summary),
      h(
        "p",
        { class: "cp-device__out" },
        link(target, { class: "cp-btn cp-btn--lit", "aria-label": `Open ${item.title}` }, "Open sketch"),
      ),
    ),
  );
}

export function devices(route: Route, env: Env): Screen {
  const { content } = env;
  const { h1, head } = viewHead(route, "Devices", { eyebrow: "Lab", title: "Lab" });
  const more = route.main.querySelector(".lab-more a");
  const aside = route.main.querySelector(".lab-aside");
  const chain = h(
    "ol",
    { class: "cp-chain" },
    content.lab.map((item, index) => h("li", { class: "cp-chain__slot" }, device(item, index, "h2"))),
    more
      ? h(
          "li",
          { class: "cp-chain__slot cp-chain__slot--drop" },
          h(
            "a",
            { class: "cp-drop", href: more.getAttribute("href") ?? "https://codepen.io/beejsbj", target: "_blank", rel: "noreferrer", "data-info": "More sketches · the rest of the rack lives on CodePen" },
            h("span", { class: "cp-drop__plus", "aria-hidden": "true" }),
            h("span", { class: "cp-drop__label" }, more.textContent?.trim() || "More sketches on CodePen"),
            h("span", { class: "cp-sr" }, " (opens in a new tab)"),
          ),
        )
      : null,
  );
  bar(chain, 2, 3);
  return {
    el: screen(
      "lab",
      h(
        "div",
        { class: "cp-page cp-page--lab" },
        head,
        h(
          "section",
          { class: "cp-rack", "aria-label": "Device chain" },
          h("p", { class: "cp-panel-tab" }, "Chain", h("small", null, `${content.lab.length} devices`)),
          chain,
        ),
        aside ? h("aside", { class: "cp-hint", "aria-label": "Elsewhere" }, h("p", { class: "cp-panel-tab" }, "Info"), prose(aside)) : null,
      ),
    ),
    heading: h1,
  };
}

export function deviceView(route: Route, env: Env, item: LabItem): Screen {
  const index = env.content.lab.indexOf(item);
  const unit = device(item, index, "h1");
  const hasPage = !!route.main.querySelector(".entry-page");
  const links = [...(item.href ? [{ label: "Open the sketch", url: item.href }] : []), ...item.links];
  const article = h(
    "article",
    { class: "cp-device-notes", "aria-labelledby": "cp-device-title" },
    kicker(h("a", { href: "/lab" }, "Lab"), ` · device ${String(index + 1).padStart(2, "0")}`),
    credits([
      ["Type", item.type, "class"],
      ["Era", item.sourceEra, "source"],
    ]),
    buttons(links),
    hasPage ? prose(route.main.querySelector(".prose")) : null,
    h("a", { class: "cp-back", href: "/lab" }, h("span", { "aria-hidden": "true" }, "←"), " Back to the chain"),
  );
  return {
    el: screen(
      "lab-entry",
      h("div", { class: "cp-page cp-page--device" }, h("div", { class: "cp-device-solo" }, bar(unit, 1), bar(article, 2, 2))),
    ),
    heading: unit.querySelector("h1") as HTMLElement,
  };
}
