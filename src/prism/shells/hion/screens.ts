/** Every screen, as thread.
 *
 * No boxes, cards or panels: each screen is laid out as stations along the
 * two hions' way down the page. Titles hang from branches tied to them.
 * Sections are loops, where the two part to run down either side of the
 * words and meet again beneath them. Headings are strung on wefts woven
 * across a loop; lists hang from wefts like charms; pictures hang on two
 * threads, wound round their corners; links are pull-cords and knots;
 * `data-orbit` marks something one hion goes out of its way to circle. The
 * markup only says what is what (see weave.ts for the attributes); the
 * loom and the ink draw it. */
import { part, type PartAttrs } from "../../parts";
import { fallbackBody, featured, fill, inline, rich, type LinkMaker } from "../rich";
import type { Header, Media, Route, SiteContent } from "../types";
import { h, link, scrub, text } from "./dom";

type Project = SiteContent["projects"][number];
type Child = Node | string | null | false | undefined;
type Attrs = Record<string, string | undefined>;
type Copy = SiteContent["lenses"]["hion"];

let seed = 100;
const nextSeed = () => String((seed = (seed * 31 + 7) % 9973));

/** Inline markdown, its links made the shell's way. */
const hionLink: LinkMaker = (href, children) => link(href, {}, children);

/** Something that hangs on its own thread(s), revealed as the drawing
 * reaches it. */
function hung<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  type: "drop" | "pair" | "pull" | "tassel" | "sign",
  attrs: Attrs,
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
function pullLink(
  href: string,
  label: string,
  hue: "c" | "m" = "c",
  attrs: Attrs = {},
) {
  return hung(
    "p",
    "pull",
    { ...attrs, class: "hion-pullcord", "data-hue": hue },
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
 * cord; the eyebrow sits on the branch above it. `marks` says which parts
 * the title, eyebrow and intro are. */
function hungTitle(
  id: string,
  title: string,
  eyebrow?: string,
  intro?: string,
  marks: { title?: PartAttrs; eyebrow?: PartAttrs; intro?: PartAttrs } = {},
) {
  return h(
    "header",
    { class: "hion-head", "data-cord": "branch" },
    eyebrow
      ? h("p", { ...marks.eyebrow, class: "hion-eyebrow", "data-reveal": "" }, eyebrow)
      : null,
    hung(
      "h1",
      "sign",
      { ...marks.title, class: "hion-title", id, "data-hang": "" },
      h("span", { class: "hion-title__text", "data-woven": "m" }, title),
    ),
    intro
      ? h("p", { ...marks.intro, class: "hion-intro", "data-reveal": "" }, intro)
      : null,
  );
}

/** A page's own opening, from its header copy, marked as that page's. */
function pageTitle(header: Header, ref: string) {
  return hungTitle("hion-page-title", header.title, header.eyebrow, header.intro, {
    title: part("page.title", ref),
    eyebrow: part("page.eyebrow", ref),
    intro: part("page.intro", ref),
  });
}

/** A page header's actions: one pull-cord, or a row of them. */
function actions(copy: Copy, header: Header, ref: string) {
  if (!header.actions.length) return null;
  if (header.actions.length === 1) {
    const [action] = header.actions;
    return pullLink(action.href, action.label, "m", part("page.actions", ref));
  }
  return pulls(
    header.actions.map((action) => ({ label: action.label, url: action.href })),
    copy.entry.links,
    part("page.actions", ref),
  );
}

/** A picture (or a film) hung on two threads, its corners wound. Duotone in
 * the hion colours; its own colours come back when you reach for it. */
function picture(
  media: Pick<Media, "type" | "src" | "alt">,
  hue: "c" | "m",
  attrs: Attrs = {},
  caption?: Child,
  hangs = true,
) {
  const shown =
    media.type === "video"
      ? h(
          "video",
          { controls: true, muted: true, playsinline: true, preload: "metadata" },
          h("source", { src: media.src }),
        )
      : h("img", { src: media.src, alt: media.alt ?? "", loading: "lazy", decoding: "async" });
  const children = [
    h("span", { class: "hion-picture__frame" }, shown),
    caption ? h("figcaption", { class: "hion-picture__caption" }, caption) : null,
  ];
  const cls = `hion-picture ${attrs.class ?? ""}`.trim();
  return hangs
    ? hung("figure", "pair", { ...attrs, class: cls, "data-hue": hue }, children)
    : h("figure", { ...attrs, class: cls, "data-hue": hue }, children);
}

const image = (src: string, alt = ""): Pick<Media, "type" | "src" | "alt"> => ({
  type: "image",
  src,
  alt,
});

/** Words on beads: a short list strung on a thread. */
function beads(items: string[], label: string, attrs: Attrs = {}) {
  if (!items.length) return null;
  return h(
    "ul",
    { ...attrs, class: "hion-beads", "aria-label": label },
    items.map((item, i) => h("li", { style: `--hion-j:${i}` }, item)),
  );
}

/* ---------- Home ---------- */

function workCharm(copy: Copy, project: Project, level: "h2" | "h3", i: number) {
  const id = `hion-p-${project.slug}`;
  return hung(
    "li",
    "pair",
    { class: "hion-work", "data-hang": "", "data-hue": i % 2 ? "m" : "c", "data-frame": project.slug },
    h(
      "article",
      { "aria-labelledby": id },
      project.cover
        ? h(
            "a",
            {
              class: "hion-work__picture",
              href: project.href,
              tabindex: "-1",
              "aria-hidden": "true",
            },
            picture(image(project.cover), i % 2 ? "m" : "c", { "data-woven-cover": "" }, null, false),
          )
        : null,
      h(
        "p",
        { ...part("project.meta", project.slug), class: "hion-meta" },
        `${project.dateLabel} · ${project.kind}`,
      ),
      h(
        level,
        { ...part("project.title", project.slug), class: "hion-work__title", id },
        // Woven by life, where it is set large enough to read so.
        link(project.href, { "data-woven": "" }, project.title),
      ),
      h(
        "p",
        { ...part("project.summary", project.slug), class: "hion-work__summary" },
        project.summary,
      ),
      beads(
        project.tools,
        fill(copy.work.tools, { title: project.title }),
        part("project.tools", project.slug),
      ),
    ),
  );
}

/** Hion's home loop is laid out for this many featured projects (more, if
 * Daylight's home shows more). */
const WORK_CAPACITY = 4;

function home(content: SiteContent) {
  const page = content.pages.home;
  const { hero } = page;
  const copy = content.lenses.hion;
  const work = featured(content).slice(0, Math.max(WORK_CAPACITY, page.work.limit));
  const updates = content.updates.slice(0, page.updates.limit);
  const words = hero.headline.split(/\s+/);

  const heroSection = h(
    "section",
    { class: "hion-hero", "aria-labelledby": "hion-home-title" },
    h(
      "div",
      { class: "hion-hero__words", "data-cord": "branch" },
      h("p", { ...part("home.greeting"), class: "hion-hello", "data-reveal": "" }, hero.greeting),
      h(
        "h1",
        {
          ...part("page.title", "home"),
          class: "hion-display",
          id: "hion-home-title",
          "data-orbit": "c",
          "data-orbit-wide": "",
          "data-orbit-pad": "26,-14",
        },
        words.flatMap((word, i) => [
          hung(
            "span",
            "sign",
            {
              class: "hion-display__word",
              "data-hang": i === 0 ? "" : undefined,
              "data-hang-from": i === 0 ? undefined : "prev",
              "data-hue": i % 2 ? "c" : "m",
              "data-woven": "",
            },
            word,
          ),
          i < words.length - 1 ? " " : null,
        ]),
      ),
      h("p", { ...part("home.occupation"), class: "hion-role", "data-reveal": "" }, hero.occupation),
      h("p", { ...part("home.welcome"), class: "hion-welcome", "data-reveal": "" }, hero.welcome),
      h(
        "ul",
        {
          ...part("home.links"),
          class: "hion-row hion-row--tags",
          "data-cord": "free",
          "aria-label": copy.home.links,
        },
        hero.links.map((item, i) =>
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
      { class: "hion-hero__art", "data-cord": "branch", "data-orbit": "m", "data-orbit-pad": "62,24" },
      picture(
        image(hero.portrait.src, hero.portrait.alt),
        "c",
        { ...part("home.portrait"), class: "hion-portrait", "data-hang": "", "data-frame": "portrait" },
        link(hero.portrait.href, { class: "hion-portrait__link" }, hero.portrait.caption),
      ),
    ),
  );

  const workLoop = loop(
    { class: "hion-loop--work", "aria-labelledby": "hion-home-work" },
    strung("h2", "hion-home-work", page.work.title),
    h(
      "ol",
      { class: "hion-row hion-row--works", "data-cord": "heading" },
      work.map((project, i) => workCharm(copy, project, "h3", i)),
    ),
    pullLink(page.work.link.href, copy.home.work),
  );

  const now = loop(
    { class: "hion-loop--note", "aria-labelledby": "hion-home-now" },
    strung("h2", "hion-home-now", page.currently.title),
    h(
      "div",
      { ...part("home.currently"), class: "hion-note", "data-reveal": "" },
      h("p", {}, inline(page.currently.body, hionLink)),
    ),
    pullLink(page.currently.link.href, page.currently.link.label, "m"),
  );

  const signals = loop(
    { class: "hion-loop--updates", "aria-labelledby": "hion-home-updates" },
    strung("h2", "hion-home-updates", page.updates.title),
    h("p", { class: "hion-aside", "data-reveal": "" }, page.updates.intro),
    h(
      "ol",
      { class: "hion-ties", "aria-label": page.updates.listLabel },
      updates.map((update, i) =>
        h(
          "li",
          {
            ...part("update.item", update.id),
            class: "hion-tie",
            "data-tie": "",
            "data-reveal": "",
            "data-hue": i % 2 ? "m" : "c",
          },
          h(
            "p",
            { class: "hion-meta" },
            `${update.sourceLabel} · ${update.kindLabel} · `,
            h("time", { datetime: update.date }, update.dateLabel),
          ),
          h("p", { class: "hion-tie__title" }, link(update.href, {}, update.title)),
        ),
      ),
    ),
  );

  const elsewhere = loop(
    { class: "hion-loop--forks", "aria-label": page.elsewhere.label },
    h(
      "div",
      { class: "hion-row hion-row--forks", "data-cord": "" },
      page.elsewhere.items.map((item, i) =>
        hung(
          "div",
          "drop",
          {
            ...part("home.elsewhere", i),
            class: "hion-fork",
            "data-hang": "",
            "data-hue": i % 2 ? "m" : "c",
          },
          h("h2", { class: "hion-fork__title" }, link(item.href, {}, item.title)),
          h("p", {}, item.blurb),
        ),
      ),
    ),
  );

  return screen("home", "hion-home-title", heroSection, workLoop, now, signals, elsewhere);
}

/* ---------- Projects ---------- */

function projects(content: SiteContent) {
  const page = content.pages.projects;
  const copy = content.lenses.hion;
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
        h(
          "h2",
          { class: "hion-year", id: `hion-year-${year}`, "data-reveal": "", "data-orbit": y % 2 ? "m" : "c" },
          String(year),
        ),
        h(
          "ol",
          { class: "hion-row hion-row--works", "data-cord": "" },
          list.map((project) => workCharm(copy, project, "h3", i++)),
        ),
      ),
    );
  return screen(
    "projects",
    "hion-page-title",
    pageTitle(page.header, "projects"),
    h("div", { class: "hion-timeline", role: "region", "aria-label": page.listLabel }, timeline),
  );
}

/* ---------- Entry pages ---------- */

/** A rendered body, laid inside a loop: h2s strung on wefts, the rest
 * revealed as the drawing reaches it. */
function story(html: string, label: string, cls = "", attrs: Attrs = {}) {
  if (!html.trim()) return null;
  const body = h("div", { ...attrs, class: "hion-prose" });
  body.append(rich(html));
  body.querySelectorAll("h2").forEach(stringHeading);
  for (const a of body.querySelectorAll<HTMLAnchorElement>("a[href^='http']")) {
    a.target = "_blank";
    a.rel = "noreferrer";
  }
  for (const child of body.children) child.setAttribute("data-reveal", "");
  return loop({ class: `hion-loop--story ${cls}`.trim(), "aria-label": label }, body);
}

function tagsRow(pairs: [string, string][], attrs: Attrs = {}) {
  if (!pairs.length) return null;
  return h(
    "dl",
    { ...attrs, class: "hion-row hion-row--meta", "data-cord": "branch" },
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

function pulls(
  links: { label: string; url: string }[],
  label: string,
  attrs: Attrs = {},
) {
  if (!links.length) return null;
  return h(
    "ul",
    { ...attrs, class: "hion-row hion-row--pulls", "data-cord": "branch", "aria-label": label },
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

function gallery(media: Media[], label: string, attrs: Attrs = {}) {
  if (!media.length) return null;
  const items = media.map((item, i) =>
    picture(item, i % 2 ? "m" : "c", { "data-hang": "" }, item.caption || null),
  );
  return loop(
    { ...attrs, class: "hion-loop--gallery", "aria-label": label, "data-count": String(items.length) },
    h("div", { class: "hion-row hion-row--gallery", "data-cord": "" }, items),
  );
}

/** A tassel at the end of an entry: where to go next along the line. */
function end(cls: string, note: string, href: string, label: string, hue: "c" | "m") {
  return hung(
    "li",
    "tassel",
    { class: `hion-end ${cls}`, "data-hang": "", "data-hue": hue },
    h("span", { class: "hion-meta" }, note),
    link(href, { class: "hion-end__link" }, label),
  );
}

function onward(content: SiteContent, slug: string) {
  const copy = content.lenses.hion;
  const list = content.projects;
  const at = list.findIndex((project) => project.slug === slug);
  const newer = at > 0 ? list[at - 1] : null;
  const older = at >= 0 && at < list.length - 1 ? list[at + 1] : null;
  return h(
    "nav",
    { class: "hion-onward", "aria-label": copy.project.onward },
    h(
      "ul",
      { class: "hion-row hion-row--ends", "data-cord": "branch" },
      newer ? end("hion-end--newer", copy.project.newer, newer.href, newer.title, "c") : null,
      end(
        "hion-end--all",
        copy.entry.backTo,
        content.pages.projects.detail.back.href,
        copy.project.all,
        "m",
      ),
      older ? end("hion-end--older", copy.project.older, older.href, older.title, "c") : null,
    ),
  );
}

function project(content: SiteContent, data: Project) {
  const copy = content.lenses.hion;
  const { labels } = content.pages.projects.detail;
  const ref = data.slug;
  const media: Media[] = data.media.length
    ? data.media
    : data.cover
      ? [{ type: "image", src: data.cover, alt: "" }]
      : [];
  return screen(
    "project",
    "hion-page-title",
    h(
      "div",
      // The same lace as its charm on the list, seen close.
      { class: "hion-entry-head", "data-frame": data.slug },
      hungTitle("hion-page-title", data.title, `${data.kind} · ${data.year}`, data.summary, {
        title: part("project.title", ref),
        intro: part("project.summary", ref),
      }),
      tagsRow(
        [
          [labels.role, data.role],
          [labels.location, data.location],
          [labels.date, data.dateLabel],
        ],
        part("project.meta", ref),
      ),
      pulls(data.links, copy.entry.links, part("project.links", ref)),
      beads(data.tools, copy.entry.tools, part("project.tools", ref)),
    ),
    gallery(media, copy.entry.pictures, part("project.media", ref)),
    story(
      data.html,
      fill(copy.entry.story, { title: data.title }),
      "",
      part("project.body", ref),
    ),
    onward(content, data.slug),
  );
}

function labEntry(content: SiteContent, data: SiteContent["lab"][number]) {
  const copy = content.lenses.hion;
  const { detail } = content.pages.lab;
  const ref = data.slug;
  const links = [
    ...(data.href ? [{ label: copy.labEntry.live, url: data.href }] : []),
    ...data.links,
  ];
  return screen(
    "lab-entry",
    "hion-page-title",
    h(
      "div",
      { class: "hion-entry-head", "data-frame": data.slug },
      hungTitle("hion-page-title", data.title, detail.eyebrow, data.summary, {
        title: part("lab.title", ref),
        intro: part("lab.summary", ref),
      }),
      tagsRow(
        [
          [detail.labels.type, data.type],
          [detail.labels.era, data.sourceEra],
        ],
        part("lab.meta", ref),
      ),
      pulls(links, copy.entry.links, part("lab.links", ref)),
    ),
    gallery(data.media, copy.entry.pictures, part("lab.media", ref)),
    story(data.html, data.title, "", part("lab.body", ref)),
    h(
      "nav",
      { class: "hion-onward", "aria-label": copy.labEntry.onward },
      h(
        "ul",
        { class: "hion-row hion-row--ends", "data-cord": "branch" },
        end("hion-end--all", copy.entry.backTo, "/lab", copy.labEntry.all, "m"),
      ),
    ),
  );
}

/* ---------- Lab ---------- */

function lab(content: SiteContent) {
  const page = content.pages.lab;
  return screen(
    "lab",
    "hion-page-title",
    pageTitle(page.header, "lab"),
    loop(
      { class: "hion-loop--lab", "aria-label": page.listLabel },
      h(
        "ol",
        { class: "hion-row hion-row--lab", "data-cord": "" },
        content.lab.map((entry, i) => {
          const id = `hion-lab-${entry.slug}`;
          return hung(
            "li",
            "drop",
            {
              class: "hion-work hion-work--lab",
              "data-hang": "",
              "data-hue": i % 2 ? "m" : "c",
              "data-frame": entry.slug,
            },
            h(
              "article",
              { "aria-labelledby": id },
              h(
                "p",
                { ...part("lab.meta", entry.slug), class: "hion-meta" },
                `${entry.type} · ${entry.sourceEra}`,
              ),
              h(
                "h2",
                { ...part("lab.title", entry.slug), class: "hion-work__title", id },
                link(entry.detail, {}, entry.title),
              ),
              h(
                "p",
                { ...part("lab.summary", entry.slug), class: "hion-work__summary" },
                entry.summary,
              ),
            ),
          );
        }),
      ),
      pullLink(page.more.href, page.more.label, "m", part("lab.more")),
      h(
        "p",
        { ...part("lab.aside"), class: "hion-aside", "data-reveal": "" },
        inline(page.aside, hionLink),
      ),
    ),
  );
}

/* ---------- About, resume ---------- */

function about(content: SiteContent) {
  const page = content.pages.about;
  const { portrait } = content.pages.home.hero;
  return screen(
    "about",
    "hion-page-title",
    h(
      "div",
      { class: "hion-about-head" },
      pageTitle(page.header, "about"),
      actions(content.lenses.hion, page.header, "about"),
      h(
        "div",
        { class: "hion-hero__art", "data-cord": "branch", "data-orbit": "c" },
        picture(image(portrait.src, portrait.alt), "m", {
          class: "hion-portrait",
          "data-hang": "",
          "data-frame": "portrait",
        }),
      ),
    ),
    story(page.html, content.lenses.hion.about.story, "", part("page.body", "about")),
  );
}

function resume(content: SiteContent) {
  const page = content.pages.resume;
  // The structured resume and its free body, as Daylight renders them; the
  // parts are marked in the markup.
  const body = story(content.resume.html, page.title, "hion-loop--resume");
  body?.querySelectorAll("h3").forEach((h3) => h3.classList.add("hion-knotted"));
  return screen(
    "resume",
    "hion-page-title",
    h(
      "div",
      { class: "hion-entry-head" },
      pageTitle(page.header, "resume"),
      actions(content.lenses.hion, page.header, "resume"),
    ),
    body,
  );
}

/* ---------- Writing ---------- */

/** Posts hang along a single reading thread, rather than borrowing the
 * server page. Metadata and prose arrive through the same content contract
 * as every other screen. */
function writing(content: SiteContent) {
  const page = content.pages.writing;
  const { copy } = page;
  const { posts, status } = content.writing;
  const list =
    posts.length && status === "available"
      ? h(
          "ol",
          { class: "hion-row hion-row--writing", "data-cord": "" },
          posts.map((post, i) => {
            const id = `hion-writing-${post.slug}`;
            return hung(
              "li",
              "pair",
              {
                class: "hion-work hion-work--writing",
                "data-hang": "",
                "data-hue": i % 2 ? "m" : "c",
                "data-frame": post.slug,
              },
              h(
                "article",
                { "aria-labelledby": id },
                h(
                  "time",
                  {
                    class: "hion-meta",
                    datetime: post.date,
                    ...part("writing.meta", post.slug),
                  },
                  post.dateLabel,
                ),
                h(
                  "h2",
                  {
                    class: "hion-work__title",
                    id,
                    ...part("writing.title", post.slug),
                  },
                  link(post.href, {}, post.title),
                ),
                h(
                  "p",
                  {
                    class: "hion-work__summary",
                    ...part("writing.summary", post.slug),
                  },
                  post.subtitle || post.description,
                ),
              ),
            );
          }),
        )
      : h(
          "p",
          {
            class: "hion-prose",
            "data-reveal": "",
            role: status === "unavailable" ? "status" : undefined,
            ...part("page.body", "writing"),
          },
          status === "unavailable"
            ? copy.unavailableMessage
            : copy.emptyMessage,
        );
  return screen(
    "writing",
    "hion-page-title",
    h(
      "div",
      { class: "hion-entry-head" },
      pageTitle(page.header, "writing"),
      actions(content.lenses.hion, page.header, "writing"),
    ),
    loop({ class: "hion-loop--writing", "aria-label": copy.listLabel }, list),
  );
}

function writingEntry(content: SiteContent, route: Route) {
  const page = content.pages.writing;
  const { copy } = page;
  const entry = content.writing.entry;
  const post =
    entry?.slug === route.slug && content.writing.entryStatus === "available"
      ? entry
      : undefined;
  if (!post) {
    const message =
      content.writing.entryStatus === "missing"
        ? copy.entryMissingMessage
        : copy.entryUnavailableMessage;
    return screen(
      "writing-entry",
      "hion-page-title",
      h("div", { class: "hion-entry-head" }, pageTitle(page.header, "writing")),
      loop(
        { class: "hion-loop--story", "aria-label": page.title },
        h(
          "p",
          {
            class: "hion-prose",
            "data-reveal": "",
            role: "status",
            ...part("writing.body", route.slug),
          },
          message,
        ),
        pulls(
          [
            { label: copy.backLabel, url: "/writing" },
            { label: copy.sourceLabel, url: content.site.writingUrl },
            {
              label: copy.subscribeLabel,
              url: `${content.site.writingUrl}/subscribe`,
            },
          ],
          content.lenses.hion.entry.links,
          part("writing.links", route.slug),
        ),
      ),
    );
  }
  return screen(
    "writing-entry",
    "hion-page-title",
    h(
      "div",
      // The same tape as its charm on the list, seen close.
      { class: "hion-entry-head", "data-frame": post.slug },
      hungTitle(
        "hion-page-title",
        post.title,
        page.header.eyebrow,
        post.subtitle,
        {
          title: part("writing.title", post.slug),
          intro: part("writing.subtitle", post.slug),
        },
      ),
      hung(
        "p",
        "drop",
        { class: "hion-writing__origin", "data-hue": "m" },
        h(
          "time",
          {
            class: "hion-meta",
            datetime: post.date,
            ...part("writing.meta", post.slug),
          },
          post.dateLabel,
        ),
        link(post.canonical, {}, copy.originLabel),
      ),
    ),
    story(
      post.html,
      post.title,
      "hion-loop--writing-story",
      part("writing.body", post.slug),
    ),
    loop(
      {
        class: "hion-loop--note hion-loop--writing-end",
        "aria-labelledby": "hion-writing-end",
        ...part("writing.end", post.slug),
      },
      strung("h2", "hion-writing-end", copy.endHeading),
      h("p", { class: "hion-prose", "data-reveal": "" }, copy.endBody),
      pulls(
        [
          {
            label: copy.subscribeLabel,
            url: `${content.site.writingUrl}/subscribe`,
          },
          { label: copy.originLabel, url: post.canonical },
          { label: copy.backLabel, url: "/writing" },
        ],
        content.lenses.hion.entry.links,
        part("writing.links", post.slug),
      ),
    ),
  );
}

/* ---------- Anything else ---------- */

/** The 404: Hion's own loose end, under Daylight's title. */
function lost(content: SiteContent) {
  const copy = content.lenses.hion.notFound;
  return screen(
    "other",
    "hion-page-title",
    hungTitle(
      "hion-page-title",
      content.pages.notFound.header.title,
      copy.eyebrow,
      copy.intro,
      { title: part("page.title", "not-found") },
    ),
    h("div", { class: "hion-lost" }, pullLink("/", copy.home, "m")),
  );
}

function other(content: SiteContent, route: Route) {
  if (route.notFound) return lost(content);
  // Daylight's own markup, scoped styles and all: its components keep their
  // shapes, and the loop only recolours them.
  const body = h("div");
  body.append(fallbackBody(route));
  scrub(body);
  const heading = body.querySelector("h1");
  const title = text(heading) || route.title;
  const eyebrow = text(body.querySelector(".page-header__eyebrow, .section-intro__eyebrow"));
  const intro = text(body.querySelector(".page-header__intro, .section-intro__intro"));
  body.querySelector(".page-header, header.page-header")?.remove();
  heading?.remove();
  body.querySelector(".section-intro__eyebrow")?.remove();
  body.querySelector(".section-intro__intro")?.remove();
  const rest = h("div", { class: "hion-prose hion-prose--other" });
  rest.append(...body.childNodes);
  for (const child of rest.querySelectorAll(":scope > * > *")) child.setAttribute("data-reveal", "");
  const hasContent = text(rest).length > 0 || rest.querySelector("img, svg, a");
  return screen(
    "other",
    "hion-page-title",
    hungTitle("hion-page-title", title, eyebrow || undefined, intro || undefined),
    hasContent ? loop({ class: "hion-loop--other", "aria-label": title }, rest) : null,
  );
}

export function buildScreen(content: SiteContent, route: Route): HTMLElement {
  seed = 100;
  switch (route.kind) {
    case "home":
      return home(content);
    case "projects":
      return projects(content);
    case "project": {
      const data = content.projects.find((item) => item.slug === route.slug);
      return data && !route.notFound ? project(content, data) : other(content, route);
    }
    case "lab":
      return lab(content);
    case "lab-entry": {
      // Experiments that live elsewhere have no page here; show what the
      // server shows for them rather than inventing one.
      const data = content.lab.find((item) => item.slug === route.slug);
      return data?.hasPage && !route.notFound ? labEntry(content, data) : other(content, route);
    }
    case "about":
      return about(content);
    case "resume":
      return resume(content);
    case "writing":
      return writing(content);
    case "writing-entry":
      return writingEntry(content, route);
    default:
      return other(content, route);
  }
}

/** The end of every screen: the two hions let go of each other, and the ways to
 * reach me hang beneath it. */
export function footer(content: SiteContent) {
  const { site } = content;
  const copy = content.lenses.hion.footer;
  const writing = site.nav.filter((item) => item.href === "/writing");
  return h(
    "footer",
    { class: "hion-foot" },
    h("span", { class: "hion-foot__tassel", "data-spine": "end", "aria-hidden": "true" }),
    h("p", { class: "hion-foot__call", "data-reveal": "" }, copy.call),
    h(
      "p",
      { class: "hion-foot__mail", "data-reveal": "" },
      link(`mailto:${site.email}`, {}, site.email),
    ),
    h(
      "ul",
      { class: "hion-row hion-row--tags hion-foot__social", "data-cord": "", "aria-label": copy.links },
      site.social
        .filter((item) => !item.href.startsWith("mailto:"))
        .concat(writing.map((item) => ({ label: item.label, href: item.href })))
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
