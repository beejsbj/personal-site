/** Every screen of the portfolio, as a street in Kilahito. Each builder
 * returns a `<main>` laid out with `.hion-knot`s where the braid should tie
 * through it; the weave (weave.ts) threads them afterwards. */
import type { Route, SiteContent } from "../types";
import { h, link, s, scrub, take, text } from "./dom";

type Project = SiteContent["projects"][number];
type Lab = SiteContent["lab"][number];

const knot = (hue: "cyan" | "magenta" | "both" = "both") =>
  h("span", { class: "hion-knot", "data-hue": hue, "aria-hidden": "true" });

function screen(
  kind: string,
  labelledBy: string,
  ...children: (Node | null | false)[]
) {
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

/** Header copy for a listing page, read from the server-rendered page. */
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

function head(
  id: string,
  copy: { eyebrow: string; title: string; intro?: string },
  ...extra: (Node | null | false)[]
) {
  return h(
    "header",
    { class: "hion-head", "data-weave-item": "" },
    h("p", { class: "hion-eyebrow" }, copy.eyebrow),
    h("h1", { class: "hion-title", id }, copy.title),
    copy.intro ? h("p", { class: "hion-intro" }, copy.intro) : null,
    ...extra,
    knot(),
  );
}

/* ---------- Home ---------- */

function portrait(caption: Node | null) {
  const loop = (layer: "back" | "front") =>
    s(
      "svg",
      {
        class: `hion-portrait__loop hion-portrait__loop--${layer}`,
        viewBox: "-200 -200 400 400",
        "aria-hidden": "true",
      },
      s(
        "defs",
        {},
        s(
          "clipPath",
          { id: `hion-portrait-${layer}` },
          layer === "back"
            ? s("rect", { x: -220, y: -220, width: 440, height: 220 })
            : s("rect", { x: -220, y: 0, width: 440, height: 220 }),
        ),
      ),
      s(
        "g",
        { transform: "rotate(-18)" },
        s(
          "g",
          { "clip-path": `url(#hion-portrait-${layer})` },
          s("ellipse", {
            class: "hion-portrait__orbit hion-portrait__orbit--magenta",
            cx: 0,
            cy: 0,
            rx: 188,
            ry: 58,
          }),
          s("ellipse", {
            class: "hion-portrait__bead hion-portrait__bead--magenta",
            cx: 0,
            cy: 0,
            rx: 188,
            ry: 58,
            pathLength: "1",
          }),
        ),
      ),
      s(
        "g",
        { transform: "rotate(62)" },
        s(
          "g",
          { "clip-path": `url(#hion-portrait-${layer})` },
          s("ellipse", {
            class: "hion-portrait__orbit hion-portrait__orbit--cyan",
            cx: 0,
            cy: 0,
            rx: 176,
            ry: 40,
          }),
          s("ellipse", {
            class: "hion-portrait__bead hion-portrait__bead--cyan",
            cx: 0,
            cy: 0,
            rx: 176,
            ry: 40,
            pathLength: "1",
          }),
        ),
      ),
    );
  return h(
    "figure",
    { class: "hion-portrait" },
    loop("back"),
    h(
      "div",
      { class: "hion-portrait__moon" },
      h("img", {
        src: "/images/burooj4.jpg",
        alt: "Burooj Rashid wearing round sunglasses",
        width: 1080,
        height: 1920,
        decoding: "async",
      }),
    ),
    loop("front"),
    caption
      ? h("figcaption", { class: "hion-portrait__caption" }, caption)
      : null,
  );
}

/** Kilahito's rooftops: dark wooden houses, windows lit by hion. */
function town() {
  const svg = s("svg", {
    class: "hion-town",
    viewBox: "0 0 1440 220",
    preserveAspectRatio: "xMidYMax slice",
    "aria-hidden": "true",
  });
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const houses = s("g", { class: "hion-town__houses" });
  const windows = s("g", { class: "hion-town__windows" });
  let x = -20;
  while (x < 1460) {
    const w = 110 + rand() * 120;
    const wall = 60 + rand() * 70;
    const roof = 26 + rand() * 18;
    const top = 220 - wall;
    const eave = 14;
    houses.append(
      s("path", {
        class: "hion-town__house",
        d: `M${x} 220V${top}H${x + w}V220Z`,
      }),
      s("path", {
        class: "hion-town__roof",
        d: `M${x - eave} ${top + 4}Q${x + w * 0.1} ${top - 2} ${x + w * 0.22} ${top - roof}H${x + w * 0.78}Q${x + w * 0.9} ${top - 2} ${x + w + eave} ${top + 4}Z`,
      }),
    );
    const panes = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < panes; i++) {
      const pw = 16 + rand() * 18;
      const ph = 22 + rand() * 20;
      const px = x + 14 + rand() * (w - pw - 28);
      const py = top + 16 + rand() * Math.max(4, wall - ph - 30);
      windows.append(
        s("rect", {
          class: `hion-town__window hion-town__window--${rand() < 0.62 ? "magenta" : "cyan"}`,
          x: px.toFixed(1),
          y: py.toFixed(1),
          width: pw.toFixed(1),
          height: ph.toFixed(1),
          // Each lamp on its own bad line: flickers at its own pace.
          style: `--hion-lamp:${(6 + rand() * 9).toFixed(1)}s;--hion-lamp-delay:${(-rand() * 12).toFixed(1)}s`,
        }),
      );
    }
    x += w + 6 + rand() * 30;
  }
  // A strand of hion slung along the eaves, as in the poster.
  let festoon = "M0 146";
  for (let fx = 0; fx < 1440; fx += 72)
    festoon += `Q${fx + 36} 162 ${fx + 72} 146`;
  const eaves = s("path", { class: "hion-town__eave-line", d: festoon });
  svg.append(houses, windows, eaves);
  return svg;
}

/** Thin hion wires dropping from the sky into the town. */
function skyWires() {
  const svg = s("svg", {
    class: "hion-drops",
    viewBox: "0 0 1000 600",
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
  const wires = [
    [120, "cyan"],
    [300, "magenta"],
    [610, "cyan"],
    [880, "magenta"],
  ] as const;
  wires.forEach(([x, hue], i) => {
    const d = `M${x} -10C${x + 40} 120 ${x - 50} 240 ${x + 10} 360S${x - 20} 520 ${x + 6} 610`;
    svg.append(
      s("path", {
        class: `hion-drops__wire hion-drops__wire--${hue}`,
        d,
        pathLength: "1",
        style: `--hion-i:${i}`,
      }),
    );
  });
  return svg;
}

function clothesline(links: { label: string; href: string }[], label: string) {
  return h(
    "div",
    { class: "hion-clothesline" },
    s(
      "svg",
      {
        class: "hion-clothesline__wire",
        viewBox: "0 0 100 10",
        preserveAspectRatio: "none",
        "aria-hidden": "true",
      },
      s("path", { d: "M0 1Q50 12 100 1", pathLength: "1" }),
    ),
    h(
      "ul",
      { "aria-label": label },
      links.map((item, i) =>
        h(
          "li",
          { style: `--hion-i:${i}` },
          link(item.href, { class: "hion-tag" }, item.label),
        ),
      ),
    ),
  );
}

function projectWindow(
  project: Project,
  level: "h2" | "h3",
  side: "left" | "right",
) {
  const titleId = `hion-p-${project.slug}`;
  const heading = h(
    level,
    { class: "hion-window__title", id: titleId },
    link(project.href, {}, project.title),
  );
  return h(
    "li",
    { class: "hion-hung__item", "data-side": side, "data-weave-item": "" },
    knot(side === "left" ? "magenta" : "cyan"),
    h(
      "article",
      { class: "hion-window", "aria-labelledby": titleId },
      h(
        "a",
        {
          class: "hion-window__frame",
          href: project.href,
          tabindex: "-1",
          "aria-hidden": "true",
        },
        h("img", {
          src: project.cover,
          alt: "",
          loading: "lazy",
          decoding: "async",
        }),
      ),
      h(
        "div",
        { class: "hion-window__copy" },
        h(
          "p",
          { class: "hion-meta-line" },
          `${project.dateLabel} · ${project.kind}`,
        ),
        heading,
        h("p", { class: "hion-window__summary" }, project.summary),
        project.tools.length
          ? h(
              "ul",
              { class: "hion-tools", "aria-label": `${project.title} tools` },
              project.tools.map((tool) => h("li", {}, tool)),
            )
          : null,
      ),
    ),
  );
}

function home(content: SiteContent, route: Route) {
  const page = content.pages.home;
  const socials = [
    ...content.site.social.filter((item) => item.label !== "CodePen"),
    { label: "Resume", href: "/resume" },
  ];
  const featured = content.projects
    .filter((project) => project.featured)
    .slice(0, 4);
  const currently = take(route.main, ".current-copy p");
  const updates = content.updates.slice(0, 6);

  const hero = h(
    "section",
    {
      class: "hion-hero",
      "aria-labelledby": "hion-home-title",
      "data-weave-item": "",
    },
    skyWires(),
    h(
      "div",
      { class: "hion-hero__copy" },
      h("p", { class: "hion-hello" }, "Hey there!"),
      h(
        "h1",
        { class: "hion-title hion-title--display", id: "hion-home-title" },
        page.headline ?? "Burooj here!",
      ),
      h("p", { class: "hion-occupation" }, "Frontend developer & designer"),
      h(
        "p",
        { class: "hion-welcome" },
        "I make places on the web. Feel free to look around!",
      ),
      clothesline(socials, "Elsewhere"),
    ),
    portrait(link("/about", { class: "hion-script-link" }, "That’s me")),
    town(),
    h("span", { class: "hion-hero__knot" }, knot()),
  );

  const work = h(
    "section",
    { class: "hion-strand", "aria-labelledby": "hion-home-work" },
    h(
      "header",
      { class: "hion-strand__head", "data-weave-item": "" },
      knot(),
      h(
        "h2",
        { class: "hion-section-title", id: "hion-home-work" },
        "Some things I’ve built",
      ),
      link(
        "/projects",
        { class: "hion-lead" },
        "Follow the line to all projects",
      ),
    ),
    h(
      "ol",
      { class: "hion-hung" },
      featured.map((project, i) =>
        projectWindow(project, "h3", i % 2 ? "right" : "left"),
      ),
    ),
  );

  const now = h(
    "section",
    {
      class: "hion-strand hion-strand--now",
      "aria-labelledby": "hion-home-now",
    },
    h(
      "div",
      { class: "hion-lantern", "data-weave-item": "" },
      knot("magenta"),
      h(
        "div",
        { class: "hion-paper hion-paper--tag" },
        h(
          "h2",
          { class: "hion-paper__title", id: "hion-home-now" },
          "Currently",
        ),
        currently ?? h("p", {}, page.intro ?? ""),
        link("/about", { class: "hion-ink-link" }, "More about me"),
      ),
    ),
  );

  const signals = h(
    "section",
    {
      class: "hion-strand hion-strand--signals",
      "aria-labelledby": "hion-home-updates",
    },
    h(
      "header",
      { class: "hion-strand__head", "data-weave-item": "" },
      knot(),
      h(
        "h2",
        { class: "hion-section-title", id: "hion-home-updates" },
        "Recent updates",
      ),
      h(
        "p",
        { class: "hion-lead-note" },
        "Little signals from around my internet.",
      ),
    ),
    h(
      "ol",
      { class: "hion-signals", "aria-label": "Recent activity, newest first" },
      updates.map((update, i) =>
        h(
          "li",
          {
            class: "hion-signal",
            style: `--hion-i:${i}`,
            "data-kind": update.kind,
          },
          h("span", { class: "hion-signal__bead", "aria-hidden": "true" }),
          h(
            "p",
            { class: "hion-meta-line" },
            `${update.source} · ${update.kind.replace("-", " ")}`,
          ),
          h(
            "p",
            { class: "hion-signal__title" },
            link(update.href, {}, update.title),
          ),
          h("time", { datetime: update.date }, update.dateLabel),
        ),
      ),
    ),
  );

  const elsewhere = h(
    "section",
    { class: "hion-strand hion-forks", "aria-label": "Elsewhere on the site" },
    h("span", { class: "hion-forks__knot", "data-weave-item": "" }, knot()),
    h(
      "div",
      { class: "hion-forks__ends" },
      h(
        "div",
        { class: "hion-fork" },
        h(
          "h2",
          { class: "hion-section-title" },
          link("/lab", {}, "In the lab"),
        ),
        h("p", {}, "Experiments, prototypes, and smaller things."),
      ),
      h(
        "div",
        { class: "hion-fork" },
        h(
          "h2",
          { class: "hion-section-title" },
          link(content.site.writingUrl, {}, "Writing"),
        ),
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
  let side = 0;
  const timeline = [...years.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) =>
      h(
        "section",
        { class: "hion-year", "aria-labelledby": `hion-year-${year}` },
        h(
          "div",
          { class: "hion-year__mark", "data-weave-item": "" },
          knot(),
          h(
            "h2",
            { class: "hion-year__label", id: `hion-year-${year}` },
            String(year),
          ),
        ),
        h(
          "ol",
          { class: "hion-hung" },
          list.map((project) =>
            projectWindow(project, "h3", side++ % 2 ? "right" : "left"),
          ),
        ),
      ),
    );
  return screen(
    "projects",
    "hion-page-title",
    head("hion-page-title", copy),
    h(
      "div",
      {
        class: "hion-timeline",
        "aria-label": "Project history, newest first",
        role: "region",
      },
      timeline,
    ),
  );
}

/* ---------- Entry pages (project, lab entry) ---------- */

function metaWire(pairs: [string, string][]) {
  if (!pairs.length) return null;
  return h(
    "div",
    { class: "hion-meta-wire", "data-weave-item": "" },
    s(
      "svg",
      {
        class: "hion-meta-wire__line",
        viewBox: "0 0 100 10",
        preserveAspectRatio: "none",
        "aria-hidden": "true",
      },
      s("path", { d: "M0 2Q50 12 100 2", pathLength: "1" }),
    ),
    h(
      "dl",
      {},
      pairs.map(([term, value], i) =>
        h(
          "div",
          { class: "hion-meta-wire__tag", style: `--hion-i:${i}` },
          h("dt", {}, term),
          h("dd", {}, value),
        ),
      ),
    ),
  );
}

function actions(links: { label: string; url: string }[]) {
  if (!links.length) return null;
  return h(
    "ul",
    { class: "hion-actions", "aria-label": "Links" },
    links.map((item) =>
      h(
        "li",
        {},
        link(
          item.url,
          { class: "hion-action" },
          item.label,
          h(
            "span",
            { class: "hion-action__arrow", "aria-hidden": "true" },
            "↗",
          ),
        ),
      ),
    ),
  );
}

/** Lift the rendered article into a painter's sheet, with a knot beside each
 * section heading so the braid dips under the paper and back out. */
function paper(article: Element | null, label?: string) {
  if (!article) return null;
  const sheet = h("article", {
    class: "hion-paper hion-paper--sheet",
    "aria-label": label,
  });
  sheet.append(...article.childNodes);
  for (const heading of sheet.querySelectorAll("h2")) {
    heading.classList.add("hion-paper__knotted");
    heading.prepend(knot());
  }
  for (const a of sheet.querySelectorAll<HTMLAnchorElement>(
    "a[href^='http']",
  )) {
    a.target = "_blank";
    a.rel = "noreferrer";
  }
  return h(
    "div",
    { class: "hion-paper-wrap", "data-weave-item": "" },
    knot(),
    sheet,
  );
}

function gallery(main: HTMLElement, project?: Project) {
  const figures = [...main.querySelectorAll(".media-rail figure")];
  if (!figures.length && !project?.cover) return null;
  const items = figures.length
    ? figures.map((figure) => {
        const clone = figure.cloneNode(true) as HTMLElement;
        scrub(clone);
        clone.className = "hion-gallery__item";
        return clone;
      })
    : [
        h(
          "figure",
          { class: "hion-gallery__item" },
          h("img", { src: project!.cover, alt: "" }),
        ),
      ];
  return h(
    "div",
    {
      class: "hion-gallery",
      "data-weave-item": "",
      "data-count": String(items.length),
    },
    knot(),
    ...items,
  );
}

function neighbours(content: SiteContent, slug?: string) {
  const list = content.projects;
  const at = list.findIndex((project) => project.slug === slug);
  const newer = at > 0 ? list[at - 1] : null;
  const older = at >= 0 && at < list.length - 1 ? list[at + 1] : null;
  return h(
    "nav",
    {
      class: "hion-onward",
      "aria-label": "More projects",
      "data-weave-item": "",
    },
    knot(),
    h(
      "ul",
      {},
      newer
        ? h(
            "li",
            { class: "hion-onward__item hion-onward__item--newer" },
            h("span", { class: "hion-meta-line" }, "Newer along the line"),
            link(newer.href, {}, newer.title),
          )
        : null,
      h(
        "li",
        { class: "hion-onward__item hion-onward__item--all" },
        h("span", { class: "hion-meta-line" }, "Back to"),
        link("/projects", {}, "Every project"),
      ),
      older
        ? h(
            "li",
            { class: "hion-onward__item hion-onward__item--older" },
            h("span", { class: "hion-meta-line" }, "Older along the line"),
            link(older.href, {}, older.title),
          )
        : null,
    ),
  );
}

function project(content: SiteContent, route: Route) {
  const data = content.projects.find((item) => item.slug === route.slug);
  const main = route.main;
  const title = text(main.querySelector("h1")) || data?.title || route.title;
  const intro =
    text(main.querySelector(".page-header__intro")) || data?.summary || "";
  const pairs = [...main.querySelectorAll(".entry-page__meta > div")].map(
    (row) =>
      [
        text(row.querySelector(".entry-page__label")),
        text(row.querySelector("p")),
      ] as [string, string],
  );
  const links =
    data?.links ??
    [...main.querySelectorAll<HTMLAnchorElement>(".entry-page__links a")].map(
      (a) => ({ label: text(a), url: a.href }),
    );
  const tools = data?.tools.length
    ? h(
        "ul",
        { class: "hion-tools", "aria-label": "Tools" },
        data.tools.map((tool) => h("li", {}, tool)),
      )
    : null;
  return screen(
    "project",
    "hion-page-title",
    head(
      "hion-page-title",
      {
        eyebrow: data ? `${data.kind} · ${data.year}` : "Project",
        title,
        intro,
      },
      tools,
      actions(links),
    ),
    metaWire(pairs),
    gallery(main, data),
    paper(take(main, "article.prose"), `${title}, the story`),
    neighbours(content, route.slug),
  );
}

function labEntry(content: SiteContent, route: Route) {
  const data = content.lab.find((item) => item.slug === route.slug);
  const main = route.main;
  // Experiments that live elsewhere have no page here; show what the server
  // shows for them (its not-found page), rather than inventing one.
  if (!main.querySelector(".entry-page")) return other(route);
  const title = text(main.querySelector("h1")) || data?.title || route.title;
  const intro =
    text(main.querySelector(".page-header__intro")) || data?.summary || "";
  const links = [
    ...(data?.href
      ? [{ label: "Open the live experiment", url: data.href }]
      : []),
    ...(data?.links ?? []),
  ];
  return screen(
    "lab-entry",
    "hion-page-title",
    head("hion-page-title", { eyebrow: "Lab", title, intro }, actions(links)),
    metaWire(
      data
        ? [
            ["Type", data.type],
            ["Era", data.sourceEra],
          ]
        : [],
    ),
    gallery(main),
    paper(take(main, "article.prose"), title),
    h(
      "nav",
      {
        class: "hion-onward",
        "aria-label": "More from the lab",
        "data-weave-item": "",
      },
      knot(),
      h(
        "ul",
        {},
        h(
          "li",
          { class: "hion-onward__item hion-onward__item--all" },
          h("span", { class: "hion-meta-line" }, "Back to"),
          link("/lab", {}, "The whole lab"),
        ),
      ),
    ),
  );
}

/* ---------- Lab ---------- */

function lab(content: SiteContent, route: Route) {
  const copy = pageHead(route, {
    eyebrow: "Lab",
    title: "Small things. Room to play.",
  });
  const lanterns = content.lab.map((entry: Lab, i) => {
    const href = entry.href ?? entry.detail;
    const id = `hion-lab-${entry.slug}`;
    return h(
      "li",
      {
        class: "hion-lab__item",
        "data-weave-item": "",
        style: `--hion-i:${i}`,
      },
      knot(i % 2 ? "magenta" : "cyan"),
      h(
        "article",
        { class: "hion-lantern-card", "aria-labelledby": id },
        h(
          "p",
          { class: "hion-meta-line" },
          `${entry.type} · ${entry.sourceEra}`,
        ),
        h(
          "h2",
          { class: "hion-lantern-card__title", id },
          link(href, {}, entry.title),
        ),
        h("p", {}, entry.summary),
        h(
          "p",
          { class: "hion-lantern-card__more" },
          link(
            href,
            { class: "hion-ink-link" },
            entry.href ? "Open the experiment" : "Read the notes",
          ),
        ),
      ),
    );
  });
  const aside = take(route.main, ".lab-aside");
  if (aside) aside.className = "hion-lab__aside";
  return screen(
    "lab",
    "hion-page-title",
    head("hion-page-title", copy),
    h(
      "section",
      { class: "hion-lab", "aria-label": "Selected experiments" },
      h("ol", { class: "hion-lab__list" }, lanterns),
      h(
        "div",
        { class: "hion-lab__after", "data-weave-item": "" },
        knot(),
        h(
          "p",
          { class: "hion-lab__more" },
          link(
            "https://codepen.io/beejsbj",
            { class: "hion-lead" },
            "More sketches on CodePen",
          ),
        ),
        aside,
      ),
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
  const actionsEl = take(route.main, ".page-header__actions a");
  return screen(
    "about",
    "hion-page-title",
    h(
      "div",
      { class: "hion-about-head" },
      head(
        "hion-page-title",
        copy,
        actionsEl
          ? h(
              "p",
              { class: "hion-head__action" },
              link(
                actionsEl.getAttribute("href") ?? "/resume",
                { class: "hion-lead" },
                text(actionsEl),
              ),
            )
          : null,
      ),
      portrait(null),
    ),
    paper(take(route.main, "article.prose"), "About Burooj"),
  );
}

function resume(content: SiteContent, route: Route) {
  const copy = pageHead(route, {
    eyebrow: "Resume",
    title: content.pages.resume.title,
    intro: content.pages.resume.description,
  });
  const actionsEl = take(route.main, ".page-header__actions a");
  const sheet = paper(take(route.main, "article.prose"), "Resume");
  sheet
    ?.querySelectorAll("h3")
    .forEach((h3) => h3.classList.add("hion-paper__role"));
  return screen(
    "resume",
    "hion-page-title",
    head(
      "hion-page-title",
      copy,
      h(
        "p",
        { class: "hion-head__action" },
        actionsEl
          ? link(
              actionsEl.getAttribute("href") ?? "/",
              { class: "hion-lead" },
              text(actionsEl),
            )
          : link(
              `mailto:${content.site.email}`,
              { class: "hion-lead" },
              content.site.email,
            ),
      ),
    ),
    sheet,
  );
}

/* ---------- Anything else ---------- */

function other(route: Route) {
  const body = route.main.cloneNode(true) as HTMLElement;
  scrub(body);
  const heading = body.querySelector("h1");
  const id = "hion-page-title";
  if (heading) heading.id = id;
  const missing = /404/.test(
    text(body.querySelector(".section-intro__eyebrow")),
  );
  const sheet = h("div", {
    class: "hion-paper hion-paper--frame",
    "data-missing": missing ? "" : undefined,
  });
  sheet.append(...body.childNodes);
  return screen(
    "other",
    id,
    h(
      "div",
      { class: "hion-painting", "data-weave-item": "" },
      knot(),
      missing
        ? h(
            "p",
            { class: "hion-hello hion-painting__note" },
            "A nightmare got here first.",
          )
        : null,
      sheet,
    ),
  );
}

export function buildScreen(content: SiteContent, route: Route): HTMLElement {
  switch (route.kind) {
    case "home":
      return home(content, route);
    case "projects":
      return projects(content, route);
    case "project":
      return route.main.querySelector(".entry-page")
        ? project(content, route)
        : other(route);
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
