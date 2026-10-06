/** Writing is a document pinned to the board. Its index and article are
 * built from the shared writing payload, never from the Daylight page. */
import type { Route, SiteContent } from "../types";
import { markPart, part } from "../../parts";
import {
  type Env,
  type Screen,
  backLink,
  copyOf,
  frame,
  prompts,
  scrollKeys,
  tabs,
} from "./chrome";
import { concentricStar, h, prose, ransom } from "./dom";

type Post = SiteContent["writing"]["posts"][number];

function externalLink(href: string, label: string) {
  return h(
    "a",
    { href, target: "_blank", rel: "noopener noreferrer" },
    label,
    h("span", { "aria-hidden": "true" }, " ↗"),
  );
}

/** Reuse the document screen's furniture and entrance/scroll behavior. */
function documentScreen(
  route: Route,
  env: Env,
  heading: HTMLElement,
  page: HTMLElement,
): Screen {
  const copy = copyOf(env.content);
  const entry = route.kind === "writing-entry";
  const { el, main } = frame(route.kind, "cc-doc cc-writing");
  el.querySelector(".cc-screen__bg")!.append(
    h("span", { class: "cc-doc__red" }),
    h(
      "span",
      { class: "cc-doc__star" },
      concentricStar(["#1b1b1b", "#141414", "#1c1c1c", "#131313"]),
    ),
  );
  const back = backLink(
    copy,
    entry ? "/writing" : "/",
    entry ? copy.sections.writing : copy.sections.home,
  );
  const sheet = h("div", { class: "cc-doc__sheet cc-writing__sheet" }, page);
  main.append(
    h(
      "div",
      { class: "cc-doc__head" },
      back,
      h(
        "p",
        { class: "cc-doc__stamp", "aria-hidden": "true" },
        ransom(copy.sections.writing, { boxes: 0.25, salt: 3 }),
      ),
    ),
    sheet,
    prompts([
      ["↑↓", copy.chrome.prompts.browse],
      ["Q/E", copy.chrome.prompts.section],
      ["Esc", copy.chrome.prompts.back],
    ]),
  );
  el.prepend(tabs(route.kind, copy));
  // Small screens scroll the full screen rather than the paper column.
  const scroll = () => (sheet.scrollHeight > sheet.clientHeight ? sheet : main);
  return { el, heading, back, onKey: (event) => scrollKeys(scroll())(event) };
}

function postSummary(post: Post) {
  return h(
    "li",
    { class: "cc-writing__post" },
    h(
      "article",
      {},
      h(
        "time",
        {
          class: "cc-writing__date",
          datetime: post.date,
          ...part("writing.meta", post.slug),
        },
        post.dateLabel,
      ),
      h(
        "h2",
        {
          class: "cc-writing__post-title",
          ...part("writing.title", post.slug),
        },
        h("a", { href: post.href, "data-cc-title": post.title }, post.title),
      ),
      h(
        "p",
        { class: "cc-writing__summary", ...part("writing.summary", post.slug) },
        post.subtitle || post.description,
      ),
    ),
  );
}

/** All public posts, with shared empty and upstream-unavailable states. */
export function writing(route: Route, env: Env): Screen {
  const { content } = env;
  const { header, copy } = content.pages.writing;
  const heading = h(
    "h1",
    {
      class: "cc-writing__title",
      tabindex: "-1",
      ...part("page.title", "writing"),
    },
    header.title,
  );
  const opening = h(
    "header",
    { class: "cc-writing__opening" },
    header.eyebrow
      ? h(
          "p",
          { class: "cc-writing__eyebrow", ...part("page.eyebrow", "writing") },
          header.eyebrow,
        )
      : null,
    heading,
    header.intro
      ? h(
          "p",
          { class: "cc-writing__intro", ...part("page.intro", "writing") },
          header.intro,
        )
      : null,
    header.actions.length
      ? h(
          "div",
          { class: "cc-writing__actions", ...part("page.actions", "writing") },
          header.actions.map((link) => externalLink(link.href, link.label)),
        )
      : null,
  );
  const list =
    content.writing.status === "unavailable"
      ? h(
          "p",
          { class: "cc-writing__notice" },
          copy.unavailableMessage,
          " ",
          externalLink(content.site.writingUrl, copy.sourceLabel),
        )
      : content.writing.posts.length
        ? h(
            "ol",
            { class: "cc-writing__posts", "aria-label": copy.listLabel },
            content.writing.posts.map(postSummary),
          )
        : h("p", { class: "cc-writing__notice" }, copy.emptyMessage);
  const page = h("div", { class: "cc-writing__page" }, opening, list);
  return documentScreen(route, env, heading, page);
}

/** Only the requested article's HTML is present in the route payload. */
export function writingEntry(route: Route, env: Env): Screen {
  const { content } = env;
  const { header, copy } = content.pages.writing;
  const requested = content.writing.entry;
  const entry =
    content.writing.entryStatus === "available" &&
    requested?.slug === route.slug
      ? requested
      : undefined;
  const heading = h(
    "h1",
    {
      class: "cc-writing__title",
      tabindex: "-1",
      ...(entry
        ? part("writing.title", entry.slug)
        : part("page.title", "writing")),
    },
    entry?.title ?? header.title,
  );
  const opening = h(
    "header",
    { class: "cc-writing__opening" },
    header.eyebrow
      ? h(
          "p",
          { class: "cc-writing__eyebrow", ...part("page.eyebrow", "writing") },
          header.eyebrow,
        )
      : null,
    heading,
    entry?.subtitle
      ? h(
          "p",
          {
            class: "cc-writing__intro",
            ...part("writing.subtitle", entry.slug),
          },
          entry.subtitle,
        )
      : null,
  );
  const page = h("article", { class: "cc-writing__page" }, opening);
  if (entry) {
    const origin = markPart(
      externalLink(entry.canonical, copy.originLabel),
      "writing.links",
      entry.slug,
    );
    const body = markPart(prose(entry.html), "writing.body", entry.slug);
    page.append(
      h(
        "p",
        { class: "cc-writing__origin" },
        h(
          "time",
          { datetime: entry.date, ...part("writing.meta", entry.slug) },
          entry.dateLabel,
        ),
        h("span", { "aria-hidden": "true" }, " / "),
        origin,
      ),
      body,
      h(
        "aside",
        {
          class: "cc-writing__end",
          "aria-labelledby": "cc-writing-end",
          ...part("writing.end", entry.slug),
        },
        h("h2", { id: "cc-writing-end" }, copy.endHeading),
        h("p", {}, copy.endBody),
        h(
          "div",
          {
            class: "cc-writing__actions",
            ...part("writing.links", entry.slug),
          },
          externalLink(
            `${content.site.writingUrl.replace(/\/$/, "")}/subscribe`,
            copy.subscribeLabel,
          ),
          externalLink(entry.canonical, copy.originLabel),
        ),
      ),
    );
  } else {
    page.append(
      h(
        "p",
        { class: "cc-writing__notice" },
        content.writing.entryStatus === "missing"
          ? copy.entryMissingMessage
          : copy.entryUnavailableMessage,
      ),
      h(
        "div",
        { class: "cc-writing__actions" },
        externalLink(content.site.writingUrl, copy.sourceLabel),
      ),
    );
  }
  page.append(
    h(
      "p",
      {
        class: "cc-writing__return",
        ...(entry ? part("writing.links", entry.slug) : {}),
      },
      h(
        "a",
        { href: "/writing", "data-cc-title": copyOf(content).sections.writing },
        copy.backLabel,
      ),
    ),
  );
  return documentScreen(route, env, heading, page);
}
