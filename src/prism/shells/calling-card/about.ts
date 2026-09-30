/** About as a confidant screen: the arcana card at rank MAX, the cut-out
 * portrait, a pentagon of social stats drawn from the page's own themes,
 * and the page itself as dialogue boxes with rank-up headings. */
import type { Route } from "../types";
import { type Env, type Screen, backLink, frame, prompts, tabs, text } from "./chrome";
import { concentricStar, h, ransom, starPoints, svg } from "./dom";
import { portrait } from "./portrait";

const STATS = ["People", "Stories", "Interfaces", "Games", "Curiosity"];

function pentagon() {
  const point = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)].map((n) => n.toFixed(1)).join(",");
  };
  const ring = (r: number) => STATS.map((_, i) => point(i, r)).join(" ");
  const labels = STATS.map((label, i) => {
    const [x, y] = point(i, 94).split(",").map(Number);
    const anchor = Math.abs(x - 100) < 4 ? "middle" : x > 100 ? "start" : "end";
    return `<text x="${x}" y="${y + (y < 100 ? -2 : 12)}" text-anchor="${anchor}">${label.toUpperCase()}</text>`;
  }).join("");
  return svg(
    `<polygon class="cc-social__ring" points="${ring(76)}"/>
     <polygon class="cc-social__ring cc-social__ring--in" points="${ring(50)}"/>
     <polygon class="cc-social__ring cc-social__ring--in" points="${ring(25)}"/>
     <polygon class="cc-social__fill" points="${ring(76)}"/>
     <polygon class="cc-social__star" points="${starPoints(22, 9, 100, 100)}"/>
     ${labels}`,
    { viewBox: "-40 -10 280 220", class: "cc-social__chart" },
  );
}

function arcana() {
  return h(
    "div",
    { class: "cc-arcana", "aria-hidden": "true" },
    h("span", { class: "cc-arcana__num" }, "0"),
    h("span", { class: "cc-arcana__art" }, concentricStar(["#0a0a0a", "#fff", "#e5191c", "#0a0a0a", "#fff"])),
    h("span", { class: "cc-arcana__name" }, "The Fool"),
  );
}

export function about(route: Route, env: Env): Screen {
  void env;
  const { el, main } = frame(route.kind, "cc-confidant");
  const title = text(route.main.querySelector("h1")) || "About";
  const intro = text(route.main.querySelector(".page-header__intro"));
  const actions = Array.from(route.main.querySelectorAll<HTMLAnchorElement>(".page-header__actions a"));
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-confidant__rays" }),
    h("span", { class: "cc-confidant__red" }),
  );

  const heading = h("h1", { class: "cc-confidant__title", tabindex: "-1" }, ransom(title, { boxes: 0.2, salt: 6 }));
  const back = backLink("/", "Command");

  // The article becomes a conversation: paragraphs are dialogue boxes,
  // headings are rank-up plates.
  const talk = h("div", { class: "cc-talk" });
  let rank = 1;
  const source = route.main.querySelector(".prose");
  for (const node of Array.from(source?.children ?? [])) {
    const style = `--i:${talk.childElementCount}`;
    if (/^H[2-6]$/.test(node.tagName)) {
      rank++;
      talk.append(
        h(
          "h2",
          { class: "cc-rankup", style },
          h("span", { class: "cc-rankup__tag", "aria-hidden": "true" }, `Rank ${rank}`),
          h("span", {}, node.textContent ?? ""),
        ),
      );
    } else {
      const box = h("div", { class: "cc-say", style }, h("span", { class: "cc-say__name", "aria-hidden": "true" }, "Burooj"));
      box.append(node.cloneNode(true));
      talk.append(box);
    }
  }

  main.append(
    h(
      "div",
      { class: "cc-confidant__side" },
      h("div", { class: "cc-confidant__portrait" }, portrait("Burooj Rashid wearing round sunglasses, as a red and black cut-out", "bust")),
      arcana(),
      h(
        "p",
        { class: "cc-confidant__rank" },
        h("span", { class: "cc-confidant__rank-label" }, "Confidant rank"),
        h("span", { class: "cc-confidant__rank-value" }, "MAX"),
        h(
          "span",
          { class: "cc-confidant__pips", "aria-hidden": "true" },
          Array.from({ length: 10 }, (_, i) => h("span", { style: `--i:${i}` })),
        ),
      ),
    ),
    h(
      "div",
      { class: "cc-confidant__file" },
      back,
      h("p", { class: "cc-confidant__eyebrow" }, h("span", {}, "Confidant"), " ", h("span", {}, "The Fool · Arcana 0")),
      heading,
      intro ? h("p", { class: "cc-confidant__intro" }, intro) : null,
      h(
        "figure",
        { class: "cc-social" },
        pentagon(),
        h("figcaption", {}, h("b", {}, "Social stats"), " ", STATS.join(" · "), " — all maxed out."),
      ),
      talk,
      actions.length
        ? h(
            "ul",
            { class: "cc-shop", "aria-label": "Next" },
            actions.map((a, i) =>
              h("li", { style: `--i:${i}` },
                h("a", { class: "cc-shop__card", href: a.getAttribute("href") ?? "/", "data-primary": i === 0 ? "" : null, "data-cc-title": text(a) },
                  h("span", { class: "cc-shop__verb", "aria-hidden": "true" }, "Next"),
                  h("span", { class: "cc-shop__label" }, text(a)),
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
