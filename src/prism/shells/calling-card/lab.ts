/** The lab as a request board: each experiment is a request card pinned at
 * an angle, with a client, a type and an Accept button that opens the live
 * experiment. A lab entry is the request's full brief. */
import type { Route, SiteContent } from "../types";
import { markPart, part } from "../../parts";
import { fill } from "../rich";
import {
  type Copy,
  type Env,
  type Screen,
  backLink,
  copyOf,
  frame,
  linkVerb,
  prompts,
  roving,
  screenTitle,
  tapCue,
  tabs,
} from "./chrome";
import { concentricStar, h, prose, ransom } from "./dom";
import { other } from "./other";

type Experiment = SiteContent["lab"][number];

let rememberedLab = 0;

/** Where a request card goes: the entry's own page when it has one, else
 * the live experiment. */
const primaryHref = (entry: Experiment) => entry.detail;
const isExternal = (href: string) => /^https?:\/\//.test(href);

function requestNo(copy: Copy, i: number) {
  return fill(copy.lab.number, { n: String(i + 1).padStart(2, "0") });
}

export function lab(route: Route, env: Env): Screen {
  const { content } = env;
  const copy = copyOf(content);
  const { header, detail } = content.pages.lab;
  const { el, main } = frame(route.kind, "cc-requests");
  const entries = content.lab;
  const { wrap, heading } = screenTitle(copy.sections.lab, header.title, copy.lab.eyebrow, "lab");
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
      h("span", { class: "cc-request__no", "aria-hidden": "true" }, requestNo(copy, i)),
      h("span", { class: "cc-request__status", "aria-hidden": "true" }, copy.lab.status),
      h("span", { class: "cc-request__title", ...part("lab.title", entry.slug) }, ransom(entry.title, { boxes: 0.14, salt: i })),
      h(
        "span",
        { class: "cc-request__meta", ...part("lab.meta", entry.slug) },
        h("span", {}, h("b", {}, copy.lab.client, " "), entry.sourceEra),
        h("span", {}, h("b", {}, detail.labels.type, " "), entry.type),
      ),
      h("span", { class: "cc-request__summary", ...part("lab.summary", entry.slug) }, entry.summary),
      h(
        "span",
        { class: "cc-request__accept" },
        h("kbd", { "aria-hidden": "true" }, "⏎"),
        " ",
        external ? copy.lab.accept.external : copy.lab.accept.page,
        external ? h("span", { "aria-hidden": "true" }, " ↗") : null,
      ),
      tapCue(copy.lab.accept.tap),
    );
  });

  main.append(
    h("div", { class: "cc-requests__head" }, backLink(copy, "/", copy.sections.home), wrap),
    header.intro
      ? h(
          "div",
          { class: "cc-say cc-requests__intro" },
          h("span", { class: "cc-say__name", "aria-hidden": "true" }, copy.lab.speaker),
          h("p", part("page.intro", "lab"), header.intro),
        )
      : "",
    h(
      "ol",
      { class: "cc-requests__board", "aria-label": copy.lab.board },
      cards.map((card) => h("li", {}, card)),
    ),
    prompts([
      ["↑↓", copy.chrome.prompts.select],
      ["⏎", copy.chrome.prompts.accept],
      ["Q/E", copy.chrome.prompts.section],
      ["Esc", copy.chrome.prompts.back],
    ]),
  );
  el.prepend(tabs(route.kind, copy));

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
  const { content } = env;
  const copy = copyOf(content);
  const { labels } = content.pages.lab.detail;
  const entries = content.lab;
  // Only an entry with its own page has a route here.
  const index = entries.findIndex((entry) => entry.slug === route.slug && entry.hasPage);
  if (index < 0) return other(route, env);
  const entry = entries[index];
  const { el, main } = frame(route.kind, "cc-brief");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-requests__curtain" }),
    h("span", { class: "cc-requests__star" }, concentricStar(["#8c8c8c", "#e5191c", "#0a0a0a", "#e5191c"])),
  );
  const heading = h(
    "h1",
    { class: "cc-brief__title", tabindex: "-1", ...part("lab.title", entry.slug) },
    ransom(entry.title, { boxes: 0.16, salt: 2 }),
  );
  const back = backLink(copy, "/lab", copy.sections.lab);
  const notes = entry.html ? prose(entry.html) : null;
  if (notes) markPart(notes, "lab.body", entry.slug);
  const links = [
    ...(entry.href ? [{ label: copy.lab.experiment, url: entry.href }] : []),
    ...entry.links,
  ];
  main.append(
    h(
      "article",
      { class: "cc-brief__paper" },
      back,
      h(
        "p",
        { class: "cc-brief__no" },
        fill(copy.lab.brief, { number: requestNo(copy, index) }),
        h("span", {}, copy.lab.status),
      ),
      heading,
      h("p", { class: "cc-brief__summary", ...part("lab.summary", entry.slug) }, entry.summary),
      h(
        "dl",
        { class: "cc-brief__meta", ...part("lab.meta", entry.slug) },
        h("div", {}, h("dt", {}, copy.lab.client), h("dd", {}, entry.sourceEra)),
        h("div", {}, h("dt", {}, labels.type), h("dd", {}, entry.type)),
      ),
      entry.cover ? h("img", { class: "cc-brief__cover", src: entry.cover, alt: "" }) : null,
      notes?.childElementCount ? notes : null,
      links.length
        ? h(
            "ul",
            { class: "cc-shop", "aria-label": copy.lab.links, ...part("lab.links", entry.slug) },
            links.map((link, i) =>
              h("li", { style: `--i:${i}` },
                h("a", { class: "cc-shop__card", href: link.url, rel: "noreferrer", "data-primary": i === 0 ? "" : null },
                  h("span", { class: "cc-shop__verb", "aria-hidden": "true" }, link.url === entry.href ? copy.lab.accept.verb : linkVerb(copy, link.url)),
                  h("span", { class: "cc-shop__label" }, link.label, h("span", { "aria-hidden": "true" }, " ↗")),
                ),
              ),
            ),
          )
        : null,
    ),
    prompts([["Q/E", copy.chrome.prompts.section], ["Esc", copy.chrome.prompts.back]]),
  );
  el.prepend(tabs(route.kind, copy));
  return { el, heading, back };
}
