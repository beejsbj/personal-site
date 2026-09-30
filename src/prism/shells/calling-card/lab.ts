/** The lab as a request board: each experiment is a request card pinned at
 * an angle, with a client, a type and an Accept button that opens the live
 * experiment. A lab entry is the request's full brief. */
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

type Experiment = SiteContent["lab"][number];

let rememberedLab = 0;

const primaryHref = (entry: Experiment) => entry.href ?? entry.detail;
const isExternal = (href: string) => /^https?:\/\//.test(href);

function requestNo(i: number) {
  return `No.${String(i + 1).padStart(2, "0")}`;
}

export function lab(route: Route, env: Env): Screen {
  const { el, main } = frame(route.kind, "cc-requests");
  const entries = env.content.lab;
  const tagline = text(route.main.querySelector("h1"));
  const intro = text(route.main.querySelector(".page-header__intro"));
  const { wrap, heading } = screenTitle("Lab", tagline || undefined, "Requests");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-requests__curtain" }),
    h("span", { class: "cc-requests__star" }, concentricStar(["#8c8c8c", "#e5191c", "#0a0a0a", "#e5191c"])),
  );

  const cards = entries.map((entry, i) => {
    const href = primaryHref(entry);
    const external = isExternal(href);
    return h(
      "a",
      {
        class: "cc-request",
        href,
        style: `--i:${i}`,
        "data-cc-title": entry.title,
        ...(external ? { rel: "noreferrer" } : {}),
      },
      h("span", { class: "cc-request__no", "aria-hidden": "true" }, requestNo(i)),
      h("span", { class: "cc-request__status", "aria-hidden": "true" }, "Open"),
      h("span", { class: "cc-request__title" }, ransom(entry.title, { boxes: 0.14, salt: i })),
      h(
        "span",
        { class: "cc-request__meta" },
        h("span", {}, h("b", {}, "Client "), entry.sourceEra),
        h("span", {}, h("b", {}, "Type "), entry.type),
      ),
      h("span", { class: "cc-request__summary" }, entry.summary),
      h(
        "span",
        { class: "cc-request__accept" },
        h("kbd", { "aria-hidden": "true" }, "⏎"),
        external ? " Accept · open experiment" : " Accept · read the brief",
        external ? h("span", { "aria-hidden": "true" }, " ↗") : null,
      ),
    );
  });

  main.append(
    h("div", { class: "cc-requests__head" }, backLink("/", "Command"), wrap),
    intro
      ? h(
          "div",
          { class: "cc-say cc-requests__intro" },
          h("span", { class: "cc-say__name", "aria-hidden": "true" }, "The Lab"),
          h("p", {}, intro),
        )
      : "",
    h(
      "ol",
      { class: "cc-requests__board", "aria-label": "Experiments" },
      cards.map((card) => h("li", {}, card)),
    ),
    prompts([["↑↓", "Select"], ["⏎", "Accept"], ["Q/E", "Section"], ["Esc", "Back"]]),
  );
  el.prepend(tabs(route.kind));

  const menu = roving(cards, env.signal, (i) => (rememberedLab = i), Math.min(rememberedLab, cards.length - 1));
  return {
    el,
    heading,
    back: el.querySelector<HTMLAnchorElement>(".cc-back")!,
    onKey: (event) => menu.key(event, "both"),
  };
}

/** A lab entry: the full request brief. Built from the lab data, so it
 * reads even for experiments that only live off-site. */
export function labEntry(route: Route, env: Env): Screen {
  const entries = env.content.lab;
  const index = entries.findIndex((entry) => entry.slug === route.slug);
  if (index < 0) return other(route, env);
  const entry = entries[index];
  const { el, main } = frame(route.kind, "cc-brief");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-requests__curtain" }),
    h("span", { class: "cc-requests__star" }, concentricStar(["#8c8c8c", "#e5191c", "#0a0a0a", "#e5191c"])),
  );
  const heading = h("h1", { class: "cc-brief__title", tabindex: "-1" }, ransom(entry.title, { boxes: 0.16, salt: 2 }));
  const back = backLink("/lab", "Lab");
  const prose = cleanProse(route.main.querySelector(".prose"));
  const links = [
    ...(entry.href ? [{ label: "Open the experiment", url: entry.href }] : []),
    ...entry.links,
  ];
  main.append(
    h(
      "article",
      { class: "cc-brief__paper" },
      back,
      h("p", { class: "cc-brief__no" }, `Request ${requestNo(index)}`, h("span", {}, "Open")),
      heading,
      h("p", { class: "cc-brief__summary" }, entry.summary),
      h(
        "dl",
        { class: "cc-brief__meta" },
        h("div", {}, h("dt", {}, "Client"), h("dd", {}, entry.sourceEra)),
        h("div", {}, h("dt", {}, "Type"), h("dd", {}, entry.type)),
      ),
      entry.cover ? h("img", { class: "cc-brief__cover", src: entry.cover, alt: "" }) : null,
      prose.childElementCount ? prose : null,
      links.length
        ? h(
            "ul",
            { class: "cc-shop", "aria-label": "Links" },
            links.map((link, i) =>
              h("li", { style: `--i:${i}` },
                h("a", { class: "cc-shop__card", href: link.url, rel: "noreferrer", "data-primary": i === 0 ? "" : null },
                  h("span", { class: "cc-shop__verb", "aria-hidden": "true" }, i === 0 ? "Accept" : "Get"),
                  h("span", { class: "cc-shop__label" }, link.label, h("span", { "aria-hidden": "true" }, " ↗")),
                ),
              ),
            ),
          )
        : null,
    ),
    prompts([["Q/E", "Section"], ["Esc", "Back"]]),
  );
  el.prepend(tabs(route.kind));
  return { el, heading, back };
}
