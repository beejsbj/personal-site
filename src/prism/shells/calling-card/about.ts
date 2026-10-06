/** About as a confidant screen: the arcana card, the cut-out portrait, a
 * pentagon of social stats, and the page itself as dialogue boxes with
 * rank-up headings. */
import type { Route } from "../types";
import { part } from "../../parts";
import { blocks, fill } from "../rich";
import { type Copy, type Env, type Screen, backLink, copyOf, frame, prompts, tabs } from "./chrome";
import { concentricStar, h, ransom, starPoints, svg } from "./dom";
import { portrait } from "./portrait";

type Social = Copy["about"]["social"];

/** Burooj's social stats (lens copy: about.social), as the game's pentagon. */
function pentagon({ stats, maxRank }: Social) {
  const point = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)].map((n) => n.toFixed(1)).join(",");
  };
  const ring = (r: number) => stats.map((_, i) => point(i, r)).join(" ");
  const ranked = stats.map(({ rank }, i) => point(i, (76 * Math.max(0.5, rank)) / maxRank)).join(" ");
  const labels = stats.map(({ stat }, i) => {
    const [x, y] = point(i, 94).split(",").map(Number);
    const anchor = Math.abs(x - 100) < 4 ? "middle" : x > 100 ? "start" : "end";
    const label = stat.toUpperCase().replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<text x="${x}" y="${y + (y < 100 ? -2 : 12)}" text-anchor="${anchor}">${label}</text>`;
  }).join("");
  return svg(
    `<polygon class="cc-social__ring" points="${ring(76)}"/>
     <polygon class="cc-social__ring cc-social__ring--in" points="${ring(50)}"/>
     <polygon class="cc-social__ring cc-social__ring--in" points="${ring(25)}"/>
     <polygon class="cc-social__fill" points="${ranked}"/>
     <polygon class="cc-social__star" points="${starPoints(22, 9, 100, 100)}"/>
     ${labels}`,
    { viewBox: "-40 -10 280 220", class: "cc-social__chart" },
  );
}

function arcana(copy: Copy) {
  return h(
    "div",
    { class: "cc-arcana", "aria-hidden": "true" },
    h("span", { class: "cc-arcana__num" }, copy.about.arcana.number),
    h("span", { class: "cc-arcana__art" }, concentricStar(["#0a0a0a", "#fff", "#e5191c", "#0a0a0a", "#fff"])),
    h("span", { class: "cc-arcana__name" }, copy.about.arcana.name),
  );
}

export function about(route: Route, env: Env): Screen {
  const { content } = env;
  const copy = copyOf(content);
  const { header, html } = content.pages.about;
  const { hero } = content.pages.home;
  const social = copy.about.social;
  const { el, main } = frame(route.kind, "cc-confidant");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-confidant__rays" }),
    h("span", { class: "cc-confidant__red" }),
  );

  const heading = h(
    "h1",
    { class: "cc-confidant__title", tabindex: "-1", ...part("page.title", "about") },
    ransom(header.title, { boxes: 0.2, salt: 6 }),
  );
  const back = backLink(copy, "/", copy.sections.home);

  // The article becomes a conversation: every heading is a rank-up plate,
  // every other block (paragraph, list, table, code, quote, picture) a
  // dialogue box.
  const talk = h("div", { class: "cc-talk", ...part("page.body", "about") });
  let rank = 1;
  for (const node of blocks(html)) {
    const style = `--i:${talk.childElementCount}`;
    if (/^H[2-6]$/.test(node.tagName)) {
      rank++;
      talk.append(
        h(
          "h2",
          { class: "cc-rankup", style },
          h("span", { class: "cc-rankup__tag", "aria-hidden": "true" }, fill(copy.about.rankUp, { n: rank })),
          h("span", {}, node.textContent ?? ""),
        ),
      );
    } else {
      const box = h("div", { class: "cc-say", style }, h("span", { class: "cc-say__name", "aria-hidden": "true" }, copy.speaker));
      box.append(node);
      talk.append(box);
    }
  }

  main.append(
    h(
      "div",
      { class: "cc-confidant__side" },
      h(
        "div",
        { class: "cc-confidant__portrait" },
        portrait(hero.portrait.src, fill(copy.home.portrait, { alt: hero.portrait.alt }), "bust"),
      ),
      arcana(copy),
      h(
        "p",
        { class: "cc-confidant__rank" },
        h("span", { class: "cc-confidant__rank-label" }, copy.about.rank.label),
        h("span", { class: "cc-confidant__rank-value" }, copy.about.rank.value),
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
      h(
        "p",
        { class: "cc-confidant__eyebrow" },
        h("span", {}, copy.about.eyebrow.label),
        " ",
        h("span", {}, copy.about.eyebrow.arcana),
      ),
      heading,
      header.intro
        ? h("p", { class: "cc-confidant__intro", ...part("page.intro", "about") }, header.intro)
        : null,
      h(
        "figure",
        { class: "cc-social" },
        pentagon(social),
        h(
          "figcaption",
          {},
          h("b", {}, social.title),
          h("span", { class: "cc-social__wink" }, social.caption),
          h(
            "ul",
            { class: "cc-social__list" },
            social.stats.map(({ stat, rank, rankName, note }, i) =>
              h(
                "li",
                { class: "cc-social__stat", style: `--i:${i};--rank:${rank}` },
                h("span", { class: "cc-social__name" }, stat),
                h(
                  "span",
                  { class: "cc-social__rank" },
                  h("span", { class: "cc-sr" }, fill(social.rank, { rank, max: social.maxRank }), " "),
                  h(
                    "span",
                    { class: "cc-social__pips", "aria-hidden": "true" },
                    Array.from({ length: social.maxRank }, (_, p) =>
                      h("i", { "data-on": p < rank ? "" : null }),
                    ),
                  ),
                  rankName,
                ),
                h("span", { class: "cc-social__note" }, note),
              ),
            ),
          ),
        ),
      ),
      talk,
      header.actions.length
        ? h(
            "ul",
            { class: "cc-shop", "aria-label": copy.about.next, ...part("page.actions", "about") },
            header.actions.map((action, i) =>
              h("li", { style: `--i:${i}` },
                h("a", { class: "cc-shop__card", href: action.href, "data-primary": i === 0 ? "" : null, "data-cc-title": action.label },
                  h("span", { class: "cc-shop__verb", "aria-hidden": "true" }, copy.about.next),
                  h("span", { class: "cc-shop__label" }, action.label),
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
