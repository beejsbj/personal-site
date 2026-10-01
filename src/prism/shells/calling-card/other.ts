/** Anything without its own screen (404, the style guide, legacy pages) is
 * a document pinned to the board: Daylight's own page on paper, framed in
 * red and black, readable as it is. */
import type { Route } from "../types";
import { fallbackBody } from "../rich";
import { type Env, type Screen, backLink, copyOf, frame, prompts, scrollKeys, tabs, text } from "./chrome";
import { concentricStar, h, ransom } from "./dom";

export function other(route: Route, env: Env): Screen {
  const copy = copyOf(env.content);
  const { el, main } = frame(route.kind, "cc-doc");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-doc__red" }),
    h("span", { class: "cc-doc__star" }, concentricStar(["#1b1b1b", "#141414", "#1c1c1c", "#131313"])),
  );
  // Daylight's <main> becomes a plain sheet: one <main> per screen.
  const page = h("div", { class: "cc-doc__page" });
  page.append(fallbackBody(route));
  const h1 = page.querySelector<HTMLElement>("h1");
  h1?.setAttribute("tabindex", "-1");
  const heading = h1 ?? h("h1", { class: "cc-sr", tabindex: "-1" }, route.title);
  const label = text(h1) || route.title;
  const back = backLink(copy, "/", copy.sections.home);
  const sheet = h("div", { class: "cc-doc__sheet" }, h1 ? "" : heading, page);
  main.append(
    h(
      "div",
      { class: "cc-doc__head" },
      back,
      h("p", { class: "cc-doc__stamp", "aria-hidden": "true" }, ransom(copy.sections.other, { boxes: 0.25, salt: 3 })),
      h("p", { class: "cc-doc__label" }, h("span", {}, copy.other.document), " ", label),
    ),
    sheet,
    prompts([["Q/E", copy.chrome.prompts.section], ["Esc", copy.chrome.prompts.back]]),
  );
  el.prepend(tabs(route.kind, copy));
  return { el, heading, back, onKey: scrollKeys(sheet) };
}
