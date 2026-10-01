/** Every screen, as thread.
 *
 * No boxes, cards or panels: each screen is laid out as stations along one
 * cord. Titles hang from the line at the top. Sections are loops, where
 * the cord parts into its two strands to run down either side of the words
 * and twists back together beneath them. Headings are strung on wefts woven
 * across a loop; lists hang from wefts like charms; pictures hang on two
 * threads, wound round their corners; links are pull-cords and knots. The
 * markup only says what is what (see weave.ts for the attributes); the
 * loom and the ink draw it. */
import type { Route, SiteContent } from "../types";
import { h, link, take, text } from "./dom";

type Project = SiteContent["projects"][number];
type Child = Node | string | null | false | undefined;

let seed = 100;
const nextSeed = () => String((seed = (seed * 31 + 7) % 9973));

/** Something that hangs on its own thread(s), revealed as the drawing
 * reaches it. */
function hung<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  type: "drop" | "pair" | "pull" | "tassel" | "sign",
  attrs: Record<string, string | undefined>,
  ...children: (Child | Child[])[]
) {
  return h(
    tag,
    {
      ...attrs,
      "data-ink": type,
      "data-seed": nextSeed(),
      "data-reveal": "",
    },
    ...children,
  );
}

/** A pull-cord link: a thread with a knot you can tug. */
function pullLink(href: string, label: string, hue: "c" | "m" = "c") {
  return hung(
    "p",
    "pull",
    { class: "hion-pullcord", "data-hue": hue },
    link(href, { class: "hion-pullcord__link" }, label),
  );
}

function loop(
  attrs: Record<string, string | undefined>,
  ...children: (Child | Child[])[]
) {
  return h(
    "section",
    {
      ...attrs,
      class: `hion-loop ${attrs.class ?? ""}`.trim(),
      "data-spine": "loop",
    },
    ...children,
  );
}

function strung(
  level: "h2" | "h3",
  id: string | undefined,
  ...children: (Child | Child[])[]
) {
  return h(
    level,
    { class: "hion-strung", id, "data-weft": "", "data-reveal": "" },
    h(
      "span",
      { class: "hion-strung__box" },
      h("span", { class: "hion-strung__chalk" }, ...children),
    ),
  );
}

/** String an existing heading on a weft. */
function stringHeading(heading: Element) {
  heading.classList.add("hion-strung");
  heading.setAttribute("data-weft", "");
  const chalk = h("span", { class: "hion-strung__chalk" });
  chalk.append(...heading.childNodes);
  heading.append(h("span", { class: "hion-strung__box" }, chalk));
}

function screen(kind: string, labelledBy: string, ...children: Child[]) {
  return h(
    "main",
    {
      class: `hion-screen hion-screen--${kind}`,
      id: "hion-main",
      tabindex: "-1",
      "aria-labelledby": labelledBy,
      "data-kind": kind,
    },
    ...children,
  );
}

/** A title hung like a sign on two threads, from a branch tied to the main
 * cord; the eyebrow sits on the branch above it. */
function hungTitle(id: string, title: string, eyebrow?: string, intro?: string) {
  return h(
    "header",
    { class: "hion-head", "data-cord": "branch" },
    eyebrow ? h("p", { class: "hion-eyebrow", "data-reveal": "" }, eyebrow) : null,
    hung(
      "h1",
      "sign",
      { class: "hion-title", id, "data-hang": "" },
      h("span", { class: "hion-title__text" }, title),
    ),
    intro ? h("p", { class: "hion-intro", "data-reveal": "" }, intro) : null,
  );
}

function pageHead(
  route: Route,
  fallback: { eyebrow: string; title: string; intro?: string },
) {
  const main = route.main;
  return {
    eyebrow:
      text(
        main.querySelector(".page-header__eyebrow, .section-intro__eyebrow"),
      ) || fallback.eyebrow,
    title: text(main.querySelector("h1")) || fallback.title,
    intro:
      text(main.querySelector(".page-header__intro, .section-intro__intro")) ||
      fallback.intro ||
      "",
  };
}

/** A picture hung on two threads, its corners wound. Duotone in the hion
 * colours; its own colours come back when you reach for it. */
function picture(
  src: string,
  alt: string,
  hue: "c" | "m",
  attrs: Record<string, string | undefined> = {},
  caption?: Child,
  hangs = true,
) {
  const children = [
    h(
      "span",
      { class: "hion-picture__frame" },
      h("img", { src, alt, loading: "lazy", decoding: "async" }),
    ),
    caption ? h("figcaption", { class: "hion-picture__caption" }, caption) : null,
  ];
  const cls = `hion-picture ${attrs.class ?? ""}`.trim();
  return hangs
    ? hung("figure", "pair", { ...attrs, class: cls, "data-hue": hue }, children)
    : h("figure", { ...attrs, class: cls, "data-hue": hue }, children);
}

/** Words on beads: a short list strung on a thread. */
function beads(items: string[], label: string) {
  if (!items.length) return null;
  return h(
    "ul",
    { class: "hion-beads", "aria-label": label },
    items.map((item) => h("li", {}, item)),
  );
}

/* ---------- Home ---------- */

function workCharm(project: Project, level: "h2" | "h3", i: number) {
  const id = `hion-p-${project.slug}`;
  return hung(
    "li",
    "pair",
    { class: "hion-work", "data-hang": "", "data-hue": i % 2 ? "m" : "c" },
    h(
      "article",
      { "aria-labelledby": id },
      h(
        "a",
        {
          class: "hion-work__picture",
          href: project.href,
          tabindex: "-1",
          "aria-hidden": "true",
        },
        picture(project.cover, "", i % 2 ? "m" : "c", {}, null, false),
      ),
      h("p", { class: "hion-meta" }, `${project.dateLabel} · ${project.kind}`),
      h(level, { class: "hion-work__title", id }, link(project.href, {}, project.title)),
      h("p", { class: "hion-work__summary" }, project.summary),
      beads(project.tools, `${project.title} tools`),
    ),
  );
}

function home(content: SiteContent, route: Route) {
  const page = content.pages.home;
  const socials = [
    ...content.site.social.filter((item) => item.label !== "CodePen"),
    { label: "Resume", href: "/resume" },
  ];
  const featured = content.projects.filter((p) => p.featured).slice(0, 4);
  const currently = take(route.main, ".current-copy p");
  const updates = content.updates.slice(0, 6);
  const words = (page.headline ?? "Burooj here!").split(/\s+/);

  const hero = h(
    "section",
    { class: "hion-hero", "aria-labelledby": "hion-home-title" },
    h(
      "div",
      { class: "hion-hero__words", "data-cord": "branch" },
      h("p", { class: "hion-hello", "data-reveal": "" }, "Hey there!"),
      h(
        "h1",
        { class: "hion-display", id: "hion-home-title" },
        words.flatMap((word, i) => [
          hung(
            "span",
            "sign",
            {
              class: "hion-display__word",
              "data-hang": i === 0 ? "" : undefined,
              "data-hang-from": i === 0 ? undefined : "prev",
              "data-hue": i % 2 ? "c" : "m",
            },
            word,
          ),
          i < words.length - 1 ? " " : null,
        ]),
      ),
      h("p", { class: "hion-role", "data-reveal": "" }, "Frontend developer & designer"),
      h(
        "p",
        { class: "hion-welcome", "data-reveal": "" },
        "I make places on the web. Feel free to look around!",
      ),
      h(
        "ul",
        { class: "hion-row hion-row--tags", "data-cord": "free", "aria-label": "Elsewhere" },
        socials.map((item, i) =>
          hung(
            "li",
            "drop",
            { class: "hion-tag", "data-hang": "", "data-hue": i % 2 ? "m" : "c" },
            link(item.href, {}, item.label),
          ),
        ),
      ),
    ),
    h("span", { class: "hion-lane", "data-spine": "via", "aria-hidden": "true" }),
    h(
      "div",
      { class: "hion-hero__art", "data-cord": "branch" },
      picture(
        "/images/burooj4.jpg",
        "Burooj Rashid wearing round sunglasses",
        "c",
        { class: "hion-portrait", "data-hang": "" },
        link("/about", { class: "hion-portrait__link" }, "That’s me"),
      ),
    ),
  );

  const work = loop(
    { class: "hion-loop--work", "aria-labelledby": "hion-home-work" },
    strung("h2", "hion-home-work", "Some things I’ve built"),
    h(
      "ol",
      { class: "hion-row hion-row--works", "data-cord": "heading" },
      featured.map((project, i) => workCharm(project, "h3", i)),
    ),
    pullLink("/projects", "Follow the line to every project"),
  );

  const now = loop(
    { class: "hion-loop--note", "aria-labelledby": "hion-home-now" },
    strung("h2", "hion-home-now", "Currently"),
    h(
      "div",
      { class: "hion-note", "data-reveal": "" },
      currently ?? h("p", {}, page.intro ?? ""),
    ),
    pullLink("/about", "More about me", "m"),
  );

  const signals = loop(
    { class: "hion-loop--updates", "aria-labelledby": "hion-home-updates" },
    strung("h2", "hion-home-updates", "Recent updates"),
    h("p", { class: "hion-aside", "data-reveal": "" }, "Little signals from around my internet."),
    h(
      "ol",
      { class: "hion-ties", "aria-label": "Recent activity, newest first" },
      updates.map((update, i) =>
        h(
          "li",
          { class: "hion-tie", "data-tie": "", "data-reveal": "", "data-hue": i % 2 ? "m" : "c" },
          h("p", { class: "hion-meta" }, `${update.source} · ${update.kind.replace("-", " ")} · `, h("time", { datetime: update.date }, update.dateLabel)),
          h("p", { class: "hion-tie__title" }, link(update.href, {}, update.title)),
        ),
      ),
    ),
  );

  const elsewhere = loop(
    { class: "hion-loop--forks", "aria-label": "Elsewhere on the site" },
    h(
      "div",
      { class: "hion-row hion-row--forks", "data-cord": "" },
      hung(
        "div",
        "drop",
        { class: "hion-fork", "data-hang": "", "data-hue": "c" },
        h("h2", { class: "hion-fork__title" }, link("/lab", {}, "In the lab")),
        h("p", {}, "Experiments, prototypes, and smaller things."),
      ),
      hung(
        "div",
        "drop",
        { class: "hion-fork", "data-hang": "", "data-hue": "m" },
        h("h2", { class: "hion-fork__title" }, link(content.site.writingUrl, {}, "Writing")),
        h("p", {}, "My notes and writing on Substack."),
      ),
    ),
  );

  return screen("home", "hion-home-title", hero, work, now, signals, elsewhere);
}

/* ---------- Projects ---------- */

function projects(content: SiteContent, route: Route) {
  const copy = pageHead(route, {
    eyebrow: "Projects",
    title: "Things I’ve made, along the way.",
  });
  const years = new Map<number, Project[]>();
  for (const project of content.projects) {
    years.set(project.year, [...(years.get(project.year) ?? []), project]);
  }
  let i = 0;
  const timeline = [...years.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list], y) =>
      loop(
        {
          class: `hion-loop--year ${y % 2 ? "hion-loop--right" : "hion-loop--left"}`,
          "aria-labelledby": `hion-year-${year}`,
          "data-count": String(list.length),
        },
        h("h2", { class: "hion-year", id: `hion-year-${year}`, "data-reveal": "" }, String(year)),
        h(
          "ol",
          { class: "hion-row hion-row--works", "data-cord": "" },
          list.map((project) => workCharm(project, "h3", i++)),
        ),
      ),
    );
  return screen(
    "projects",
    "hion-page-title",
    hungTitle("hion-page-title", copy.title, copy.eyebrow, copy.intro),
    h("div", { class: "hion-timeline", role: "region", "aria-label": "Project history, newest first" }, timeline),
  );
}

/* ---------- Entry pages ---------- */

/** The rendered article, laid inside a loop: h2s strung on wefts, the rest
 * revealed as the drawing reaches it. */
function story(article: Element | null, label: string, cls = "") {
  if (!article) return null;
  const body = h("div", { class: "hion-prose" });
  body.append(...article.childNodes);
  body.querySelectorAll("h2").forEach(stringHeading);
  for (const a of body.querySelectorAll<HTMLAnchorElement>("a[href^='http']")) {
    a.target = "_blank";
    a.rel = "noreferrer";
  }
  for (const child of body.children) child.setAttribute("data-reveal", "");
  return loop({ class: `hion-loop--story ${cls}`.trim(), "aria-label": label }, body);
}

function tagsRow(pairs: [string, string][]) {
  if (!pairs.length) return null;
  return h(
    "dl",
    { class: "hion-row hion-row--meta", "data-cord": "branch" },
    pairs.map(([term, value], i) =>
      hung(
        "div",
        "drop",
        { class: "hion-tag hion-tag--meta", "data-hang": "", "data-hue": i % 2 ? "m" : "c" },
        h("dt", {}, term),
        h("dd", {}, value),
      ),
    ),
  );
}

function pulls(links: { label: string; url: string }[], label = "Links") {
  if (!links.length) return null;
  return h(
    "ul",
    { class: "hion-row hion-row--pulls", "data-cord": "branch", "aria-label": label },
    links.map((item, i) =>
      hung(
        "li",
        "pull",
        { class: "hion-pullcord", "data-hang": "", "data-hue": i % 2 ? "m" : "c" },
        link(item.url, { class: "hion-pullcord__link" }, item.label),
      ),
    ),
  );
}

function gallery(main: HTMLElement, project?: Project) {
  const figures = [...main.querySelectorAll(".media-rail figure")];
  const items = figures.length
    ? figures.map((figure, i) => {
        const img = figure.querySelector("img");
        const caption = text(figure.querySelector("figcaption"));
        return picture(
          img?.getAttribute("src") ?? "",
          img?.getAttribute("alt") ?? "",
          i % 2 ? "m" : "c",
          { "data-hang": "" },
          caption || null,
        );
      })
    : project?.cover
      ? [picture(project.cover, "", "c", { "data-hang": "" })]
      : [];
  if (!items.length) return null;
  return loop(
    { class: "hion-loop--gallery", "aria-label": "Pictures", "data-count": String(items.length) },
    h("div", { class: "hion-row hion-row--gallery", "data-cord": "" }, items),
  );
}

function onward(content: SiteContent, slug?: string) {
  const list = content.projects;
  const at = list.findIndex((project) => project.slug === slug);
  const newer = at > 0 ? list[at - 1] : null;
  const older = at >= 0 && at < list.length - 1 ? list[at + 1] : null;
  const end = (cls: string, note: string, href: string, label: string, hue: "c" | "m") =>
    hung(
      "li",
      "tassel",
      { class: `hion-end ${cls}`, "data-hang": "", "data-hue": hue },
      h("span", { class: "hion-meta" }, note),
      link(href, { class: "hion-end__link" }, label),
    );
  return h(
    "nav",
    { class: "hion-onward", "aria-label": "More projects" },
    h(
      "ul",
      { class: "hion-row hion-row--ends", "data-cord": "branch" },
      newer ? end("hion-end--newer", "Newer along the line", newer.href, newer.title, "c") : null,
      end("hion-end--all", "Back to", "/projects", "Every project", "m"),
      older ? end("hion-end--older", "Older along the line", older.href, older.title, "c") : null,
    ),
  );
}

function project(content: SiteContent, route: Route) {
  const data = content.projects.find((item) => item.slug === route.slug);
  const main = route.main;
  const title = text(main.querySelector("h1")) || data?.title || route.title;
  const intro = text(main.querySelector(".page-header__intro")) || data?.summary || "";
  const pairs = [...main.querySelectorAll(".entry-page__meta > div")].map(
    (row) =>
      [text(row.querySelector(".entry-page__label")), text(row.querySelector("p"))] as [
        string,
        string,
      ],
  );
  const links =
    data?.links ??
    [...main.querySelectorAll<HTMLAnchorElement>(".entry-page__links a[target]")].map((a) => ({
      label: text(a),
      url: a.href,
    }));
  return screen(
    "project",
    "hion-page-title",
    h(
      "div",
      { class: "hion-entry-head" },
      hungTitle("hion-page-title", title, data ? `${data.kind} · ${data.year}` : "Project", intro),
      tagsRow(pairs),
      pulls(links),
      data ? beads(data.tools, "Tools") : null,
    ),
    gallery(main, data),
    story(take(main, "article.prose"), `${title}, the story`),
    onward(content, route.slug),
  );
}

function labEntry(content: SiteContent, route: Route) {
  const data = content.lab.find((item) => item.slug === route.slug);
  const main = route.main;
  // Experiments that live elsewhere have no page here; show what the server
  // shows for them rather than inventing one.
  if (!main.querySelector(".entry-page")) return other(route);
  const title = text(main.querySelector("h1")) || data?.title || route.title;
  const intro = text(main.querySelector(".page-header__intro")) || data?.summary || "";
  const links = [
    ...(data?.href ? [{ label: "Open the live experiment", url: data.href }] : []),
    ...(data?.links ?? []),
  ];
  return screen(
    "lab-entry",
    "hion-page-title",
    h(
      "div",
      { class: "hion-entry-head" },
      hungTitle("hion-page-title", title, "Lab", intro),
      tagsRow(data ? [["Type", data.type], ["Era", data.sourceEra]] : []),
      pulls(links),
    ),
    gallery(main),
    story(take(main, "article.prose"), title),
    h(
      "nav",
      { class: "hion-onward", "aria-label": "More from the lab" },
      h(
        "ul",
        { class: "hion-row hion-row--ends", "data-cord": "branch" },
        hung(
          "li",
          "tassel",
          { class: "hion-end hion-end--all", "data-hang": "", "data-hue": "m" },
          h("span", { class: "hion-meta" }, "Back to"),
          link("/lab", { class: "hion-end__link" }, "The whole lab"),
        ),
      ),
    ),
  );
}

/* ---------- Lab ---------- */

function lab(content: SiteContent, route: Route) {
  const copy = pageHead(route, { eyebrow: "Lab", title: "Small things. Room to play." });
  const aside = take(route.main, ".lab-aside");
  if (aside) {
    aside.className = "hion-aside";
    aside.setAttribute("data-reveal", "");
  }
  return screen(
    "lab",
    "hion-page-title",
    hungTitle("hion-page-title", copy.title, copy.eyebrow, copy.intro),
    loop(
      { class: "hion-loop--lab", "aria-label": "Selected experiments" },
      h(
        "ol",
        { class: "hion-row hion-row--lab", "data-cord": "" },
        content.lab.map((entry, i) => {
          const href = entry.href ?? entry.detail;
          const id = `hion-lab-${entry.slug}`;
          return hung(
            "li",
            "drop",
            { class: "hion-work hion-work--lab", "data-hang": "", "data-hue": i % 2 ? "m" : "c" },
            h(
              "article",
              { "aria-labelledby": id },
              h("p", { class: "hion-meta" }, `${entry.type} · ${entry.sourceEra}`),
              h("h2", { class: "hion-work__title", id }, link(href, {}, entry.title)),
              h("p", { class: "hion-work__summary" }, entry.summary),
            ),
          );
        }),
      ),
      pullLink("https://codepen.io/beejsbj", "More sketches on CodePen", "m"),
      aside,
    ),
  );
}

/* ---------- About, resume ---------- */

function about(content: SiteContent, route: Route) {
  const copy = pageHead(route, {
    eyebrow: "About",
    title: content.pages.about.title,
    intro: content.pages.about.description,
  });
  const action = route.main.querySelector(".page-header__actions a");
  return screen(
    "about",
    "hion-page-title",
    h(
      "div",
      { class: "hion-about-head" },
      hungTitle("hion-page-title", copy.title, copy.eyebrow, copy.intro),
      action ? pullLink(action.getAttribute("href") ?? "/resume", text(action), "m") : null,
      h(
        "div",
        { class: "hion-hero__art", "data-cord": "branch" },
        picture("/images/burooj4.jpg", "Burooj Rashid wearing round sunglasses", "m", {
          class: "hion-portrait",
          "data-hang": "",
        }),
      ),
    ),
    story(take(route.main, "article.prose"), "About Burooj"),
  );
}

function resume(content: SiteContent, route: Route) {
  const copy = pageHead(route, {
    eyebrow: "Resume",
    title: content.pages.resume.title,
    intro: content.pages.resume.description,
  });
  const action = route.main.querySelector(".page-header__actions a");
  const body = story(take(route.main, "article.prose"), "Resume", "hion-loop--resume");
  body?.querySelectorAll("h3").forEach((h3) => h3.classList.add("hion-knotted"));
  return screen(
    "resume",
    "hion-page-title",
    h(
      "div",
      { class: "hion-entry-head" },
      hungTitle("hion-page-title", copy.title, copy.eyebrow, copy.intro),
      action
        ? pullLink(action.getAttribute("href") ?? "/", text(action), "m")
        : pullLink(`mailto:${content.site.email}`, content.site.email, "m"),
    ),
    body,
  );
}

/* ---------- Anything else ---------- */

function other(route: Route) {
  // Daylight's own markup, scoped styles and all: its components keep their
  // shapes, and the loop only recolours them.
  const body = route.main.cloneNode(true) as HTMLElement;
  const heading = body.querySelector("h1");
  const title = text(heading) || route.title;
  const eyebrow = text(body.querySelector(".page-header__eyebrow, .section-intro__eyebrow"));
  const intro = text(body.querySelector(".page-header__intro, .section-intro__intro"));
  body.querySelector(".page-header, header.page-header")?.remove();
  heading?.remove();
  body.querySelector(".section-intro__eyebrow")?.remove();
  body.querySelector(".section-intro__intro")?.remove();
  const missing = /404/.test(eyebrow);
  const rest = h("div", { class: "hion-prose hion-prose--other" });
  rest.append(...body.childNodes);
  for (const child of rest.querySelectorAll(":scope > * > *")) child.setAttribute("data-reveal", "");
  const hasContent = text(rest).length > 0 || rest.querySelector("img, svg, a");
  return screen(
    "other",
    "hion-page-title",
    hungTitle(
      "hion-page-title",
      title,
      missing ? "A loose end" : eyebrow || undefined,
      missing ? "This thread doesn’t lead anywhere. Try the homepage, or follow one of the lines above." : intro || undefined,
    ),
    missing
      ? h("div", { class: "hion-lost" }, pullLink("/", "Follow the cord home", "m"))
      : hasContent
        ? loop({ class: "hion-loop--other", "aria-label": title }, rest)
        : null,
  );
}

export function buildScreen(content: SiteContent, route: Route): HTMLElement {
  seed = 100;
  switch (route.kind) {
    case "home":
      return home(content, route);
    case "projects":
      return projects(content, route);
    case "project":
      return route.main.querySelector(".entry-page") ? project(content, route) : other(route);
    case "lab":
      return lab(content, route);
    case "lab-entry":
      return labEntry(content, route);
    case "about":
      return about(content, route);
    case "resume":
      return resume(content, route);
    default:
      return other(route);
  }
}

/** The end of every screen: the cord frays into a tassel, and the ways to
 * reach me hang beneath it. */
export function footer(content: SiteContent) {
  return h(
    "footer",
    { class: "hion-foot" },
    h("span", { class: "hion-foot__tassel", "data-spine": "end", "aria-hidden": "true" }),
    h("p", { class: "hion-foot__call", "data-reveal": "" }, "Send a line my way"),
    h(
      "p",
      { class: "hion-foot__mail", "data-reveal": "" },
      link(`mailto:${content.site.email}`, {}, content.site.email),
    ),
    h(
      "ul",
      { class: "hion-row hion-row--tags hion-foot__social", "data-cord": "", "aria-label": "Elsewhere" },
      content.site.social
        .filter((item) => !item.href.startsWith("mailto:"))
        .concat([{ label: "Writing", href: content.site.writingUrl }])
        .map((item, i) =>
          hung(
            "li",
            "drop",
            { class: "hion-tag", "data-hang": "", "data-hue": i % 2 ? "m" : "c" },
            link(item.href, {}, item.label),
          ),
        ),
    ),
  );
}
