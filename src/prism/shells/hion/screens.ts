/** Every screen, as thread.
 *
 * No boxes, cards or panels: each screen is laid out as stations along the
 * two hions' way down the page. A screen's opening hangs across their way
 * as they come down from the line: the title from a branch thrown out from
 * them, the intro tied on at a knot on their other side. Sections are
 * loops, where the two part to run down either side of the words and meet
 * again beneath them. Lists of dated things are strands: the two run down
 * together, knotted at each entry, and the entries are tied on by turns
 * either side. Headings are strung on wefts woven across a loop (or thrown
 * out from the hions beside them); charms hang from wefts; pictures hang on two
 * threads, wound round their corners; links are pull-cords and knots;
 * `data-orbit` marks something one hion goes out of its way to circle. The
 * markup only says what is what (see weave.ts for the attributes); the
 * loom and the ink draw it.
 *
 * The Lab is three of these. The Bench is a loop its experiments hang in,
 * still in play, the featured one hung like a sign; the Shelf is a loop of
 * wefts, an experiment laid on each, gone quiet; the Labbook is a strand,
 * a knot for every update, and a redacted update is its words bound up in
 * thread. */
import {
  embedSrc,
  experimentUpdates,
  labbookAnchor,
  labbookMonths,
  labbookSubjects,
  monthCalendar,
  monthLabel,
  narrowHref,
  penUser,
  relatedLinks,
  subjectsOf,
  updateDateLabel,
  type Artifact,
  type Update as LabbookUpdate,
} from "../../../lib/labbook";
import { graduatedProject, labPlaces, labPrints } from "../../../lib/rules";
import { markPart, part, type PartAttrs } from "../../parts";
import { fallbackBody, featured, fill, inline, rich, type LinkMaker } from "../rich";
import type { Header, Media, ResumeEntry, Route, SiteContent } from "../types";
import { draft } from "./blocks";
import { h, link, scrub, text } from "./dom";
import {
  type Attrs,
  type Child,
  hung,
  image,
  kept,
  knotPoint,
  knotted,
  loop,
  nextSeed,
  picture,
  pullLink,
  resetSeeds,
  side,
  stringHeading,
  strung,
} from "./hang";

type Project = SiteContent["projects"][number];
type Experiment = SiteContent["lab"][number];
type Copy = SiteContent["lenses"]["hion"];

/** Inline markdown, its links made the shell's way. */
const hionLink: LinkMaker = (href, children) => link(href, {}, children);

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

type Marks = { title?: PartAttrs; eyebrow?: PartAttrs; intro?: PartAttrs };

/** A screen's opening, hung on the hions where they come down from the
 * line: the title hung like a sign from a branch thrown out from them where
 * they arrive (the eyebrow on the branch above it), the intro tied on
 * further down, at a knot, on their other side, and whatever else the head
 * has (actions as pull-cords, tags, tools) hanging below the title. Wide
 * screens lay it across the hions' way down (shell.css); phones read it down
 * one column. `marks` says which parts the title, eyebrow and intro are. */
function opening(
  id: string,
  title: string,
  eyebrow: string | undefined,
  intro: string | undefined,
  marks: Marks = {},
  attrs: Attrs = {},
  ...more: Child[]
) {
  const rest = more.filter(Boolean);
  return h(
    "header",
    { ...attrs, class: `hion-head ${attrs.class ?? ""}`.trim() },
    h(
      "div",
      { class: "hion-head__sign", "data-cord": "branch" },
      eyebrow
        ? h("p", { ...marks.eyebrow, class: "hion-eyebrow", "data-reveal": "" }, eyebrow)
        : null,
      hung(
        "h1",
        "sign",
        { ...marks.title, class: "hion-title", id, "data-hang": "" },
        h("span", { class: "hion-title__text", "data-spun": "m" }, title),
      ),
    ),
    intro ? knotPoint("hion-head__knot") : null,
    intro
      ? h("p", { ...marks.intro, class: "hion-intro", "data-tie": "", "data-reveal": "" }, intro)
      : null,
    rest.length ? h("div", { class: "hion-head__more" }, rest) : null,
    // They keep to their way down past the rest of the head, clear of it.
    h("span", { class: "hion-head__via", "data-spine": "via", "aria-hidden": "true" }),
  );
}

/** A page's own opening, from its header copy, marked as that page's. */
function pageTitle(header: Header, ref: string, attrs: Attrs = {}, ...more: Child[]) {
  return opening(
    "hion-page-title",
    header.title,
    header.eyebrow,
    header.intro,
    {
      title: part("page.title", ref),
      eyebrow: part("page.eyebrow", ref),
      intro: part("page.intro", ref),
    },
    attrs,
    ...more,
  );
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
        // Written by thread, where it is set large enough to read so.
        link(project.href, { "data-spun": "" }, project.title),
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
              "data-spun": "",
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

  // Off the loops: the hions run down together here, knotted at each
  // update, and the updates are tied on either side of them. An update
  // with nowhere to go is its title, not a link.
  const signals = h(
    "section",
    { class: "hion-strand hion-strand--updates", "aria-labelledby": "hion-home-updates" },
    h(
      "div",
      { class: "hion-strand__head" },
      strung("h2", "hion-home-updates", page.updates.title),
      knotPoint("hion-strand__knot"),
      h("p", { class: "hion-aside", "data-tie": "", "data-reveal": "" }, page.updates.intro),
    ),
    h(
      "ol",
      { class: "hion-knots hion-knots--updates", "aria-label": page.updates.listLabel },
      updates.map((update, i) =>
        h(
          "li",
          { ...part("update.item", update.id), class: "hion-tied", "data-reveal": "", ...side(i) },
          knotted(
            h("time", { datetime: update.date }, update.dateLabel),
            {},
            h("p", { class: "hion-tied__title" }, update.href ? link(update.href, {}, update.title) : update.title),
            h("p", { class: "hion-meta" }, `${update.sourceLabel} · ${update.kindLabel}`),
          ),
        ),
      ),
    ),
  );

  // The last two things tied on before the hions let go.
  const elsewhere = h(
    "section",
    { class: "hion-strand hion-strand--forks", "aria-label": page.elsewhere.label },
    h(
      "div",
      { class: "hion-knots hion-knots--forks" },
      page.elsewhere.items.map((item, i) =>
        h(
          "div",
          { ...part("home.elsewhere", i), class: "hion-tied hion-fork", "data-reveal": "", ...side(i) },
          knotted(
            null,
            {},
            h("h2", { class: "hion-fork__title" }, link(item.href, {}, item.title)),
            h("p", {}, item.blurb),
          ),
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

/** Whether a page is told with blocks, not only words. */
const told = (blocks: SiteContent["lab"][number]["blocks"]) => blocks.some((block) => block.type !== "text");

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

function tagsRow(pairs: [string, Child][], attrs: Attrs = {}) {
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
    opening(
      "hion-page-title",
      data.title,
      `${data.kind} · ${data.year}`,
      data.summary,
      { title: part("project.title", ref), intro: part("project.summary", ref) },
      // The same lace as its charm on the list, seen close.
      { class: "hion-entry-head", "data-frame": data.slug },
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
    told(data.blocks)
      ? draft(content, ref, data.blocks, fill(copy.entry.story, { title: data.title }), "project.body")
      : story(
          data.html,
          fill(copy.entry.story, { title: data.title }),
          "",
          part("project.body", ref),
        ),
    onward(content, data.slug),
  );
}

/* ---------- The Labbook ---------- */

/** What an update shows for itself. A picture, a film and a sound are
 * shown where they are tied on. A Pen or a demo is a place kept for it,
 * tacked out in stitches, with a pull-cord hanging in it: nothing is asked
 * of another site until the cord is pulled (lab.ts), when its frame takes
 * the place whole. Its poster is shown only if it is the site's own: one
 * kept elsewhere would be asked for before the pull. */
function artifact(content: SiteContent, shown: Artifact, hue: "c" | "m") {
  const copy = content.pages.lab.labbook.artifact;
  const { kind, src, alt } = shown;
  const poster = shown.poster && /^\/(?!\/)/.test(shown.poster) ? shown.poster : undefined;
  if (kind === "image") return picture(image(src, alt), hue, { class: "hion-artifact" }, null, false);
  if (kind === "video") {
    return h(
      "figure",
      { class: "hion-picture hion-artifact", "data-hue": hue },
      h(
        "span",
        { class: "hion-picture__frame" },
        h(
          "video",
          { controls: true, muted: true, playsinline: true, preload: "metadata", poster, "aria-label": alt },
          h("source", { src }),
        ),
      ),
    );
  }
  if (kind === "sound") {
    return h(
      "figure",
      { class: "hion-artifact hion-artifact--sound", "data-hue": hue },
      h("audio", { controls: true, preload: "none", src, "aria-label": alt }),
      h("figcaption", { class: "hion-picture__caption" }, alt),
    );
  }
  // A frame is another site's page, or one of this site's own: nothing else.
  const frame = embedSrc(shown, penUser(content.site));
  if (!frame || !/^(https:\/\/|\/(?!\/))/.test(frame)) return null;
  // Where it lives: the Pen's own page, or the demo itself.
  const home = kind === "pen" ? frame.replace("/embed/", "/pen/").split("?")[0] : src;
  return h(
    "figure",
    { class: "hion-artifact hion-artifact--kept", "data-hue": hue, "data-stage-room": "" },
    h(
      "div",
      {
        class: "hion-kept hion-stage",
        "data-kept-frame": "",
        "data-block-stage": "",
        "data-artifact-frame": frame,
        "data-artifact-title": alt,
      },
      poster ? picture(image(poster, alt), hue, { class: "hion-kept__poster" }, null, false) : null,
      h(
        "div",
        { class: "hion-kept__ask", "data-stage-ask": "" },
        poster ? null : h("p", { class: "hion-kept__label" }, alt),
        hung(
          "p",
          "pull",
          { class: "hion-pullcord", "data-hue": hue },
          h("button", { class: "hion-pullcord__link", type: "button", "data-kept-pull": "", "data-artifact-load": "" }, copy.load[kind]),
        ),
        h("p", { class: "hion-kept__note" }, copy.note),
      ),
    ),
    h("figcaption", { class: "hion-artifact__home" }, link(home, {}, copy.open[kind])),
  );
}

/** A redacted update's line: a word it shows written by the thread as a
 * title's words are, and each word it does not, bound: thread wound tight
 * round it, a longer number a longer binding (ink.ts `bound`). The line
 * runs on and wraps as a title does. The site is given the words it shows
 * and the lengths of the rest; aloud, the words are read and each binding
 * is said once, as `said`. */
function bound(parts: (string | number)[], said: string, hue: "c" | "m") {
  return h(
    "p",
    { class: "hion-bound", "data-redaction-line": "", "data-ink": "bound", "data-seed": nextSeed(), "data-hue": hue },
    parts.flatMap((shown) => [
      typeof shown === "string"
        ? h("span", { class: "hion-tied__title hion-bound__word", "data-redaction-word": "" }, shown)
        : h(
            "span",
            { "data-redaction-bar": "", style: `--hion-bar:${Number(shown) || 1}` },
            h("span", { class: "hion-sr" }, said),
          ),
      " ",
    ]),
  );
}

/** One update, knotted on the strand: its date level with the knot, then
 * its title (a link when it has somewhere to go, text when it has not),
 * where it came from and its summary, and in the Labbook (`whole`) what it
 * shows for itself and what it is about. A redacted one is its date, its
 * line (the words it shows, and its bindings) and its kind of work:
 * nothing else of it is read. */
function logged(content: SiteContent, update: LabbookUpdate, i: number, whole: boolean) {
  const copy = content.pages.lab.labbook;
  const hue = i % 2 ? "m" : "c";
  const attrs = {
    id: whole ? labbookAnchor(update.id) : undefined,
    "data-reveal": "",
    "data-about": whole ? aboutOf(content, update) : undefined,
    ...side(i),
  };
  const when = h("time", { datetime: update.date }, updateDateLabel(update.date));
  if (update.visibility !== "open") {
    const { shape } = update;
    return h(
      "li",
      { ...part("update.redacted", update.id), ...attrs, class: "hion-tied hion-logged hion-logged--bound" },
      knotted(
        when,
        {},
        h("p", { class: "hion-sr" }, copy.redacted.label),
        bound(shape.parts, copy.redacted.bar, hue),
        h("p", { class: "hion-meta" }, copy.redacted.works[shape.work]),
      ),
    );
  }
  const { updateKinds, updateSources } = content.site;
  const { href } = update;
  return h(
    "li",
    { ...part("update.item", update.id), ...attrs, class: "hion-tied hion-logged" },
    knotted(
      when,
      {},
      h("h3", { class: "hion-tied__title" }, href ? link(href, {}, update.title) : update.title),
      h(
        "p",
        { class: "hion-meta" },
        `${updateSources[update.source] ?? update.source} · ${updateKinds[update.kind] ?? update.kind}`,
      ),
      h("p", { class: "hion-tied__summary" }, update.summary),
      whole && update.artifact ? artifact(content, update.artifact, hue) : null,
      ...(whole ? relatedLinks(update, content) : []).map((about) =>
        h(
          "p",
          { class: "hion-logged__about", "data-related": about.kind },
          h("span", {}, copy.related[about.kind]),
          " ",
          link(about.href, {}, about.title),
        ),
      ),
    ),
  );
}

/** What an update is about, as the narrowing names it: "experiment:lotus
 * project:dayshaper". */
const aboutOf = (content: SiteContent, update: LabbookUpdate) =>
  subjectsOf(update, content).map((s) => `${s.kind}:${s.slug}`).join(" ") || undefined;

/** A month as a cord: as long as the month, with a knot tied on it for
 * each day written in (ink.ts `tally`), as a record is kept in knots. For
 * the eye alone: the entries under it say the same in words, and it links
 * nowhere. */
function tally(content: SiteContent, month: string, updates: LabbookUpdate[], hue: "c" | "m") {
  const { days } = monthCalendar(month, updates);
  return hung(
    "div",
    "tally",
    {
      class: "hion-tally",
      "data-hue": hue,
      "data-length": String(days.length),
      style: `--hion-days:${days.length}`,
      "aria-hidden": "true",
    },
    days
      .filter((day) => day.updates.length)
      .map(({ day, updates: ids }) =>
        h("span", {
          class: "hion-tally__knot",
          "data-day": String(day),
          "data-about":
            [
              ...new Set(
                updates.filter((u) => ids.includes(u.id)).flatMap((u) => aboutOf(content, u)?.split(" ") ?? []),
              ),
            ].join(" ") || undefined,
          style: `--hion-at:${((day - 0.5) / days.length).toFixed(4)};--hion-n:${ids.length}`,
        }),
      ),
  );
}

/** The threads the Labbook can be followed by: a pull-cord for each
 * experiment and project it is about, with how many entries each has,
 * hung from one cord; pulled, the Labbook keeps only that one
 * (`?experiment=` / `?project=`), and a line says so, with the way back
 * to all of it (lab.ts `narrow`). */
function threads(content: SiteContent, updates: LabbookUpdate[]) {
  const copy = content.pages.lab.labbook.narrow;
  const subjects = labbookSubjects(updates, content);
  if (!subjects.length) return [];
  const at = `${location.pathname}${location.search}`;
  const count = (n: number) => (n === 1 ? copy.count.one : fill(copy.count.other, { count: n }));
  return [
    h(
      "div",
      { class: "hion-threads", role: "group", "aria-labelledby": "hion-threads-label" },
      h("p", { class: "hion-aside hion-threads__label", id: "hion-threads-label", "data-reveal": "" }, copy.label),
      h(
        "ul",
        { class: "hion-row hion-row--threads", "data-cord": "branch" },
        subjects.map((subject, i) =>
          hung(
            "li",
            "pull",
            { class: "hion-thread", "data-hang": "", "data-hue": i % 2 ? "m" : "c" },
            h(
              "span",
              { class: "hion-pullcord" },
              link(
                narrowHref(subject, at),
                {
                  class: "hion-pullcord__link",
                  "data-hion-subject": "",
                  "data-title": subject.title,
                  ...part("labbook.subject", `${subject.kind}:${subject.slug}`),
                },
                subject.title,
                h("span", { class: "hion-sr" }, `, ${count(subject.count)}`),
              ),
            ),
            // How many entries, in knots on the cord.
            h("span", {
              class: "hion-thread__count",
              "aria-hidden": "true",
              style: `--hion-n:${Math.min(subject.count, 12)}`,
            }),
          ),
        ),
      ),
    ),
    h(
      "p",
      { class: "hion-narrowed", tabindex: "-1", hidden: true, "data-hion-narrowed": "" },
      `${copy.showing} `,
      h("strong", { "data-hion-narrowed-to": "" }),
      ". ",
      link(narrowHref(undefined, at), { class: "hion-narrowed__all", "data-hion-all": "" }, copy.all),
    ),
  ];
}

/** A stretch of the Labbook, newest first: a strand, its heading strung out
 * to one side of the hions and a knot for every update. With a `note` it
 * is the Labbook itself (`whole`): the note is tied on at a knot on the
 * hions' other side, the threads it can be followed by hang under it, and
 * it is kept by month, each month knotted on the hions with its name on
 * one side and its cord of days on the other; each update is where a link
 * to it would land. No updates, no strand. */
function logbook(
  content: SiteContent,
  updates: LabbookUpdate[],
  id: string,
  title: string,
  note?: string,
) {
  if (!updates.length) return null;
  const whole = note !== undefined;
  const listLabel = content.pages.lab.labbook.listLabel;
  let n = 0;
  return h(
    "section",
    { class: "hion-strand hion-strand--labbook", "aria-labelledby": id, "data-labbook": whole ? "" : undefined },
    h(
      "div",
      { class: "hion-strand__head" },
      strung("h2", id, title),
      knotPoint("hion-strand__knot"),
      note ? h("p", { class: "hion-aside", "data-tie": "", "data-reveal": "" }, note) : null,
    ),
    whole ? threads(content, updates) : null,
    whole
      ? h(
          "div",
          { class: "hion-months", role: "list", "aria-label": listLabel },
          labbookMonths(updates).map(({ month, updates: days }, m) => {
            const hue = m % 2 ? "m" : "c";
            const heading = `hion-month-${month}`;
            return h(
              "section",
              { class: "hion-month", role: "listitem", "data-month": month, "aria-labelledby": heading },
              h(
                "div",
                { class: "hion-month__head", "data-hue": hue },
                markPart(strung("h3", heading, monthLabel(month)), "labbook.month", month),
                knotPoint("hion-month__knot"),
                tally(content, month, days, hue),
              ),
              h(
                "ol",
                { class: "hion-knots hion-knots--labbook", "aria-labelledby": heading },
                days.map((update) => logged(content, update, n++, true)),
              ),
            );
          }),
        )
      : h(
          "ol",
          { class: "hion-knots hion-knots--labbook", "aria-label": listLabel },
          updates.map((update, i) => logged(content, update, i, false)),
        ),
  );
}

function labEntry(content: SiteContent, data: Experiment) {
  const copy = content.lenses.hion;
  const { detail } = content.pages.lab;
  const ref = data.slug;
  const links = [
    ...(data.href ? [{ label: copy.labEntry.live, url: data.href }] : []),
    ...data.links,
  ];
  const media: Media[] = data.media.length
    ? data.media
    : data.cover
      ? [{ type: "image", src: data.cover, alt: "" }]
      : [];
  // The project it became: a tag in its head, and the way on at its end.
  const became = graduatedProject(data, content.projects);
  // What it holds says how its head hangs: one picture hangs beside it,
  // several are strung under it, and only words leave the title alone.
  const holds = media.length > 1 ? "prints" : media.length ? "print" : "words";
  const head = opening(
    "hion-page-title",
    data.title,
    detail.eyebrow,
    data.summary,
    { title: part("lab.title", ref), intro: part("lab.summary", ref) },
    { class: "hion-entry-head", "data-frame": data.slug, "data-holds": holds },
    became
      ? tagsRow(
          [[detail.labels.graduated, link(became.href, {}, became.title)]],
          part("lab.graduation", ref),
        )
      : null,
    pulls(links, copy.entry.links, part("lab.links", ref)),
  );
  if (holds === "print")
    head.append(
      h(
        "div",
        { ...part("lab.media", ref), class: "hion-head__art", "data-cord": "branch" },
        picture(media[0], "c", { "data-hang": "" }, media[0].caption || null),
      ),
    );
  return screen(
    "lab-entry",
    "hion-page-title",
    head,
    holds === "prints" ? gallery(media, copy.entry.pictures, part("lab.media", ref)) : null,
    // Told with blocks, it is a draft; words alone keep the reading loop.
    told(data.blocks)
      ? draft(content, ref, data.blocks, data.title)
      : story(data.html, data.title, "", part("lab.body", ref)),
    logbook(content, experimentUpdates(content.labbook, data.slug), "hion-lab-record", detail.labels.updates),
    h(
      "nav",
      { class: "hion-onward", "aria-label": copy.labEntry.onward },
      h(
        "ul",
        { class: "hion-row hion-row--ends", "data-cord": "branch" },
        became ? end("hion-end--newer", detail.labels.graduated, became.href, became.title, "c") : null,
        end("hion-end--all", copy.entry.backTo, "/lab", copy.labEntry.all, "m"),
      ),
    ),
  );
}

/* ---------- Lab ---------- */

/** What an experiment holds, which is how it hangs on the Bench and lies
 * on the Shelf: something to play where it is, several pictures, one, or
 * only its words. */
type Holds = "play" | "prints" | "print" | "words";
const holding = (entry: Experiment, prints: string[]): Holds =>
  entry.preview ? "play" : prints.length > 1 ? "prints" : prints.length ? "print" : "words";

/** The pictures an experiment shows for itself on the Bench: the first
 * hung by its corners, the others hanging from its foot on threads of
 * their own, as charms hang from a charm. For the eye: its words say
 * what it is. */
function charmPictures(prints: string[], hue: "c" | "m") {
  const [first, ...rest] = prints;
  return h(
    "div",
    { class: "hion-charm-art", "data-count": String(prints.length), "aria-hidden": "true" },
    picture(image(first), hue, { class: "hion-charm-art__first", "data-woven-cover": "" }, null, false),
    rest.length
      ? h(
          "div",
          { class: "hion-charm-art__rest" },
          rest.map((src, i) =>
            hung(
              "div",
              "drop",
              { class: "hion-charm-art__more", "data-hue": i % 2 ? hue : hue === "c" ? "m" : "c" },
              picture(image(src), i % 2 ? hue : hue === "c" ? "m" : "c", {}, null, false),
            ),
          ),
        )
      : null,
  );
}

/** An experiment on the Bench, still on the loom: it hangs in the loop as
 * what it holds. A picture hangs by its corners, woven into the cloth
 * until you reach for it; several hang one from another; something to
 * play hangs as the place stitched out for it, with its cord to pull;
 * only words, and its name is what hangs, written large like a sign. The
 * featured one hangs across the row, its name a sign, what it holds
 * beside its words. */
function benched(content: SiteContent, entry: Experiment, i: number) {
  const id = `hion-lab-${entry.slug}`;
  const hue = i % 2 ? "m" : "c";
  const prints = labPrints(entry);
  const holds = holding(entry, prints);
  const signed = entry.featured || holds === "words";
  const play = entry.preview;
  const stage = play
    ? kept(`hion-play-${entry.slug}`, {
        title: entry.title,
        hue,
        poster: prints[0],
        load: content.pages.lab.preview.load[play.kind],
        close: content.pages.lab.preview.close,
        note: content.pages.lab.preview.note,
        subject: entry.title,
        loading: content.pages.lab.preview.loading,
        data: { "data-frame": play.frame },
      })
    : undefined;
  if (stage) markPart(stage.cord, "lab.preview", entry.slug);
  const art = stage
    ? h("div", { class: "hion-charm-art", "data-count": "1" }, stage.place, stage.status)
    : prints.length
      ? charmPictures(prints, hue)
      : null;
  return hung(
    "li",
    signed ? "sign" : "pair",
    {
      class: `hion-work hion-work--lab ${entry.featured ? "hion-work--featured" : ""}`.trim(),
      "data-hang": "",
      "data-hue": hue,
      "data-frame": entry.slug,
      "data-holds": holds,
      "data-lab-featured": entry.featured ? "" : undefined,
      "data-stage-room": stage ? "" : undefined,
    },
    h(
      "article",
      { "aria-labelledby": id },
      h(
        "h3",
        {
          ...part("lab.title", entry.slug),
          class: "hion-work__title",
          id,
          "data-sign": signed ? "" : undefined,
        },
        link(entry.detail, {}, entry.title),
      ),
      art,
      h("p", { ...part("lab.summary", entry.slug), class: "hion-work__summary" }, entry.summary),
      stage ? h("div", { class: "hion-charm-play" }, stage.cord, stage.note) : null,
    ),
  );
}

/** A swatch of what it was woven into: its first picture woven in the
 * cloth, or, with none, the plain cloth of its hue. For the eye. */
function swatch(src: string | undefined, hue: "c" | "m") {
  return h(
    "span",
    { class: "hion-swatch", "data-hue": hue, "aria-hidden": "true" },
    src ? picture(image(src), hue, { class: "hion-swatch__cloth", "data-woven-cover": "" }, null, false) : null,
  );
}

/** An experiment on the Shelf, taken off the loom and put by: a swatch of
 * it laid flat on a weft of its own across the loop, its name strung on
 * the weft beside it, what it was beneath; by turns to the left and the
 * right. Nothing on the Shelf hangs. A Pen gone quiet still plays, in a
 * place stitched out at the end of its weft. */
function shelved(content: SiteContent, entry: Experiment, i: number) {
  const id = `hion-lab-${entry.slug}`;
  const hue = i % 2 ? "m" : "c";
  const prints = labPrints(entry);
  const play = entry.preview;
  const stage = play
    ? kept(`hion-play-${entry.slug}`, {
        title: entry.title,
        hue,
        load: content.pages.lab.preview.load[play.kind],
        close: content.pages.lab.preview.close,
        subject: entry.title,
        loading: content.pages.lab.preview.loading,
        data: { "data-frame": play.frame },
      })
    : undefined;
  if (stage) markPart(stage.cord, "lab.preview", entry.slug);
  return h(
    "li",
    {
      class: "hion-shelved",
      "data-frame": entry.slug,
      "data-hue": hue,
      "data-holds": holding(entry, prints),
      "data-stage-room": stage ? "" : undefined,
    },
    swatch(prints[0], hue),
    h(
      "article",
      { "aria-labelledby": id },
      markPart(strung("h3", id, link(entry.detail, {}, entry.title)), "lab.title", entry.slug),
      h(
        "p",
        { ...part("lab.summary", entry.slug), class: "hion-shelved__summary", "data-reveal": "" },
        entry.summary,
      ),
    ),
    stage ? h("div", { class: "hion-shelved__play" }, stage.place, stage.cord, stage.status) : null,
  );
}

function lab(content: SiteContent) {
  const page = content.pages.lab;
  const places = labPlaces(content.lab).map(({ place, entries }, i) => {
    const copy = page.places[place];
    const id = `hion-place-${place}`;
    return loop(
      {
        class: `hion-loop--lab hion-loop--${place} ${i % 2 ? "hion-loop--right" : "hion-loop--left"}`,
        "aria-labelledby": id,
        "data-lab-place": place,
      },
      strung("h2", id, copy.title),
      h("p", { class: "hion-aside hion-place__note", "data-reveal": "" }, copy.note),
      place === "bench"
        ? h(
            "ol",
            { class: "hion-row hion-row--lab", "data-cord": "" },
            entries.map((entry, n) => benched(content, entry, n)),
          )
        : h("ol", { class: "hion-shelf" }, entries.map((entry, n) => shelved(content, entry, n))),
    );
  });
  return screen(
    "lab",
    "hion-page-title",
    pageTitle(page.header, "lab"),
    ...places,
    logbook(content, content.labbook, "hion-labbook-title", page.labbook.title, page.labbook.note),
    loop(
      { class: "hion-loop--note hion-loop--more" },
      h(
        "p",
        { ...part("lab.aside"), class: "hion-aside", "data-reveal": "" },
        inline(page.aside, hionLink),
      ),
      pullLink(page.more.href, page.more.label, "m", part("lab.more")),
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
    // The words hang either side of the portrait's cloth, not in a column.
    pageTitle(
      page.header,
      "about",
      { class: "hion-about-head" },
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

/* The resume is a timeline the hions draw: built from the structured
 * resume (content.resume), never from its rendered prose. A group's
 * heading is thrown out from a knot on their way down; each role is a loop
 * of its own, its years written on the thread where the two part (and
 * circled by one of them), its title strung across the loop's head, its
 * record inside. Wherever there is height for it (phones too) the roles
 * run across instead, on a pinned track the page's scrolling slides
 * (track.ts), in the same order: newest first. Courses are knotted on the strand; tools hang as charms
 * from the weft of their heading; the page's own words close it. */

/** The years a role spans, as they are written on the thread: "2024",
 * "2022–2024", "2026–Present". Empty when it has no dates. */
function span(entry: ResumeEntry, ongoing: string) {
  const year = (date?: string) => date?.slice(0, 4) ?? "";
  const from = year(entry.start);
  const to = entry.current ? ongoing : year(entry.end);
  if (!from) return to;
  return !to || to === from ? from : `${from}–${to}`;
}

/** An entry's name and the line under it: the title with the organisation
 * beneath; an entry with no title is named by its organisation. */
function named(entry: ResumeEntry): { name: string; org?: string } {
  const name = entry.title ?? entry.org ?? entry.heading;
  return { name, org: entry.title ? entry.org : undefined };
}

/** What an entry says: where, its date line, its summary and bullets. */
function record(entry: ResumeEntry, org: string | undefined, hue: "c" | "m") {
  const where = [org, entry.location].filter(Boolean).join(" · ");
  return [
    where
      ? h(
          "p",
          { class: "hion-resume__org", "data-hue": hue, "data-reveal": "" },
          entry.url ? link(entry.url, {}, where) : where,
        )
      : null,
    entry.dateLine
      ? h("p", { class: "hion-resume__date hion-meta", "data-reveal": "" }, entry.dateLine)
      : null,
    entry.summary || entry.bullets.length
      ? h(
          "div",
          { class: "hion-prose hion-resume__record", "data-reveal": "" },
          entry.summary ? h("p", {}, inline(entry.summary, hionLink)) : null,
          entry.bullets.length
            ? h("ul", {}, entry.bullets.map((bullet) => h("li", {}, inline(bullet, hionLink))))
            : null,
        )
      : null,
  ];
}

/** A group's heading, thrown out from a knot the hions are tied at. */
function groupHead(id: string, title: string) {
  return h(
    "div",
    { class: "hion-resume__group" },
    strung("h2", id, title),
    knotPoint("hion-resume__group-knot"),
  );
}

function resume(content: SiteContent) {
  const page = content.pages.resume;
  const copy = content.lenses.hion;
  const { experience, education, tools, ongoing } = content.resume;

  const roles = experience.roles.map((entry, i) => {
    const hue = i % 2 ? "m" : "c";
    const { name, org } = named(entry);
    const years = span(entry, ongoing);
    return loop(
      {
        ...part("resume.role", entry.id),
        class: `hion-loop--role ${i % 2 ? "hion-loop--right" : "hion-loop--left"}`,
        "aria-labelledby": `hion-role-${entry.id}`,
        "data-hue": hue,
      },
      years
        ? h(
            "p",
            { class: "hion-resume__when", "aria-hidden": "true", "data-reveal": "", "data-orbit": hue },
            years,
          )
        : null,
      strung("h3", `hion-role-${entry.id}`, name),
      record(entry, org, hue),
    );
  });

  const courses = education.entries.map((entry, i) => {
    const { name, org } = named(entry);
    const years = span(entry, ongoing);
    return h(
      "li",
      { ...part("resume.education", entry.id), class: "hion-tied", "data-reveal": "", ...side(i) },
      knotted(
        years ? h("span", { "aria-hidden": "true" }, years) : null,
        {},
        h("h3", { class: "hion-tied__title" }, name),
        ...record(entry, org, i % 2 ? "m" : "c"),
      ),
    );
  });

  return screen(
    "resume",
    "hion-page-title",
    pageTitle(
      page.header,
      "resume",
      { class: "hion-entry-head" },
      actions(content.lenses.hion, page.header, "resume"),
    ),
    // Across, or (a window too short for it) down the page: the pin and
    // the track are boxes only when it runs across (track.ts).
    roles.length
      ? h(
          "section",
          {
            class: "hion-resume hion-resume--roles hion-timeline",
            "aria-labelledby": "hion-resume-roles",
            "data-timeline": "",
          },
          h(
            "div",
            { class: "hion-timeline__pin" },
            h(
              "div",
              { class: "hion-timeline__track" },
              groupHead("hion-resume-roles", experience.title),
              roles,
              h("span", { class: "hion-timeline__out", "data-spine": "via", "aria-hidden": "true" }),
            ),
          ),
        )
      : null,
    courses.length
      ? h(
          "section",
          { class: "hion-strand hion-resume--courses", "aria-labelledby": "hion-resume-courses" },
          groupHead("hion-resume-courses", education.title),
          h("ol", { class: "hion-knots hion-knots--courses" }, courses),
        )
      : null,
    tools.items.length
      ? loop(
          { class: "hion-loop--note hion-loop--tools", "aria-labelledby": "hion-resume-tools" },
          strung("h2", "hion-resume-tools", tools.title),
          h(
            "ul",
            { ...part("resume.tools"), class: "hion-row hion-row--tags hion-row--charms", "data-cord": "" },
            tools.items.map((item, i) =>
              hung("li", "drop", { class: "hion-tag", "data-hang": "", "data-hue": i % 2 ? "m" : "c" }, item),
            ),
          ),
        )
      : null,
    story(page.html, page.title, "hion-loop--resume", part("page.body", "resume")),
    // the resume hangs from About's knot: its thread leads back up there
    h(
      "nav",
      { class: "hion-onward", "aria-label": copy.resume.onward },
      h(
        "ul",
        { class: "hion-row hion-row--ends", "data-cord": "branch" },
        end("hion-end--all", copy.entry.backTo, "/about", copy.about.story, "m"),
      ),
    ),
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
          { class: "hion-knots hion-knots--writing" },
          posts.map((post, i) => {
            const id = `hion-writing-${post.slug}`;
            return h(
              "li",
              { "data-reveal": "" },
              h(
                "article",
                { class: "hion-tied", "aria-labelledby": id, ...side(i) },
                knotted(
                  h("time", { datetime: post.date, ...part("writing.meta", post.slug) }, post.dateLabel),
                  { "data-frame": post.slug },
                  h(
                    "h2",
                    { class: "hion-tied__title", id, ...part("writing.title", post.slug) },
                    link(post.href, {}, post.title),
                  ),
                  h(
                    "p",
                    { class: "hion-tied__summary", ...part("writing.summary", post.slug) },
                    post.subtitle || post.description,
                  ),
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
    pageTitle(
      page.header,
      "writing",
      { class: "hion-entry-head" },
      actions(content.lenses.hion, page.header, "writing"),
    ),
    h("section", { class: "hion-strand hion-strand--writing", "aria-label": copy.listLabel }, list),
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
      pageTitle(page.header, "writing", { class: "hion-entry-head" }),
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
    opening(
      "hion-page-title",
      post.title,
      page.header.eyebrow,
      post.subtitle,
      {
        title: part("writing.title", post.slug),
        intro: part("writing.subtitle", post.slug),
      },
      // The same tape as its charm on the list, seen close.
      { class: "hion-entry-head", "data-frame": post.slug },
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
    opening(
      "hion-page-title",
      content.pages.notFound.header.title,
      copy.eyebrow,
      copy.intro,
      { title: part("page.title", "not-found") },
      { class: "hion-head--lost" },
      pullLink("/", copy.home, "m"),
    ),
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
    opening("hion-page-title", title, eyebrow || undefined, intro || undefined),
    hasContent ? loop({ class: "hion-loop--other", "aria-label": title }, rest) : null,
  );
}

export function buildScreen(content: SiteContent, route: Route): HTMLElement {
  resetSeeds();
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
