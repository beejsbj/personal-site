/** Fixture content for the fuzz harness (/prism/harness): the real
 * content.json, bent into the shapes a content update could take. Each
 * fixture returns a whole, consistent SiteContent (order, featured set and
 * derived values recomputed) and the routes worth looking at. */
import { inlineHtml } from "../lib/inline";
import {
  derive,
  entryHeading,
  entryId,
  featuredProjects,
  orderProjects,
  dateLine,
} from "../lib/rules";
import type { RouteRef } from "./parity";
import type { Project, ResumeEntry, SiteContent, Update } from "./shells/types";

export interface Fixture {
  name: string;
  about: string;
  apply(content: SiteContent): SiteContent;
  routes(content: SiteContent): RouteRef[];
}

const projectRoute = (p: Project): RouteRef => ({
  kind: "project",
  path: p.href,
  slug: p.slug,
});

/** Re-run the shared rules after a fixture moves things around. */
function settle(content: SiteContent): SiteContent {
  const projects = orderProjects(content.projects);
  const featured = featuredProjects(projects, content.pages.home.work.limit);
  return {
    ...content,
    projects,
    featured: featured.map((p) => p.slug),
    derived: derive({
      projects,
      lab: content.lab,
      updates: content.updates,
      featured,
    }),
  };
}

function project(base: SiteContent, over: Partial<Project>): Project {
  const slug = over.slug ?? "fixture-project";
  return {
    slug,
    href: `/projects/${slug}`,
    title: "Fixture project",
    summary: "A project that exists only in the fuzz harness.",
    kind: "Project",
    year: base.derived.lastYear,
    dateLabel: `Jan ${base.derived.lastYear}`,
    role: "Design & development",
    location: "Somewhere",
    tools: [],
    featured: false,
    status: "selected",
    cover: "",
    links: [],
    media: [],
    tags: [],
    order: 0,
    html: "<p>Only the harness has seen this one.</p>",
    ...over,
  };
}

function entry(
  content: SiteContent,
  over: Partial<ResumeEntry> & { title: string },
): ResumeEntry {
  const withDates = { bullets: [], ...over };
  return {
    ...withDates,
    id: entryId(withDates),
    heading: entryHeading(withDates),
    current: !!withDates.start && !withDates.end,
    dateLine: dateLine(withDates, content.resume.ongoing),
  };
}

/** The resume as Daylight's ResumeProse renders it. */
function resumeHtml(content: SiteContent): string {
  const { resume } = content;
  const group = (title: string, part: string, entries: ResumeEntry[]) =>
    `<h2>${title}</h2>` +
    entries
      .map(
        (e) =>
          `<div class="resume-entry" data-part="${part}" data-ref="${e.id}"><h3>${e.heading}</h3>` +
          (e.dateLine ? `<p><em>${e.dateLine}</em></p>` : "") +
          (e.summary ? `<p>${inlineHtml(e.summary)}</p>` : "") +
          (e.bullets.length
            ? `<ul>${e.bullets.map((b) => `<li>${inlineHtml(b)}</li>`).join("")}</ul>`
            : "") +
          `</div>`,
      )
      .join("");
  return (
    group(resume.experience.title, "resume.role", resume.experience.roles) +
    group(resume.education.title, "resume.education", resume.education.entries) +
    `<h2>${resume.tools.title}</h2><p data-part="resume.tools">${resume.tools.sentence}</p>` +
    `<div class="resume-body" data-part="page.body" data-ref="resume">${content.pages.resume.html}</div>`
  );
}

const KINDS = ["project", "pull-request", "repository", "writing", "lab", "milestone"];
const SOURCES = ["site", "github", "substack", "bjslab", "manual"];

function updates(count: number): Update[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(Date.UTC(2026, 8, 25 - i));
    const date = day.toISOString().slice(0, 10);
    const kind = KINDS[i % KINDS.length];
    const source = SOURCES[i % SOURCES.length];
    return {
      id: `fixture-update-${String(i + 1).padStart(2, "0")}`,
      kind,
      source,
      kindLabel: kind,
      sourceLabel: source,
      title: `Fixture update number ${i + 1}, a line of news`,
      date,
      dateLabel: date,
      summary: `Something small happened, worth a note (number ${i + 1}).`,
      href: "/projects",
      linkLabel: "Read more",
    };
  });
}

const LONG_TITLE =
  "A project whose title runs on and on, far past where any layout expects a title to stop";

export const FIXTURES: Record<string, Fixture> = {
  "long-title": {
    name: "long-title",
    about: "A newest, featured project with a 90-character title and no cover, tools or links.",
    apply(content) {
      const p = project(content, {
        slug: "a-very-long-title",
        title: `${LONG_TITLE}.`.slice(0, 90),
        featured: true,
        order: -1,
      });
      return settle({ ...content, projects: [p, ...content.projects] });
    },
    routes: (c) => [
      { kind: "home", path: "/" },
      { kind: "projects", path: "/projects" },
      projectRoute(c.projects.find((p) => p.slug === "a-very-long-title")!),
    ],
  },
  "new-year": {
    name: "new-year",
    about: "A project from a year the portfolio has never had (the year after the newest).",
    apply(content) {
      const year = content.derived.lastYear + 1;
      const p = project(content, {
        slug: "from-next-year",
        title: `Something from ${year}`,
        year,
        dateLabel: `Mar ${year}`,
        tools: ["Astro", "TypeScript"],
        cover: content.projects[0]?.cover ?? "",
        links: [{ label: "Visit", url: "https://example.com" }],
      });
      return settle({ ...content, projects: [p, ...content.projects] });
    },
    routes: (c) => [
      { kind: "home", path: "/" },
      { kind: "projects", path: "/projects" },
      projectRoute(c.projects.find((p) => p.slug === "from-next-year")!),
    ],
  },
  "no-updates": {
    name: "no-updates",
    about: "Not a single update.",
    apply: (content) => settle({ ...content, updates: [] }),
    routes: () => [{ kind: "home", path: "/" }],
  },
  "many-updates": {
    name: "many-updates",
    about: "Forty updates.",
    apply: (content) => settle({ ...content, updates: updates(40) }),
    routes: () => [{ kind: "home", path: "/" }],
  },
  "odd-about": {
    name: "odd-about",
    about: "An about page whose markdown has an h4, nested lists, a table, code and an image.",
    apply(content) {
      const html = [
        "<p>An opening paragraph, then everything markdown can do.</p>",
        "<h2>A second-level heading</h2>",
        "<h4>A fourth-level heading, skipping a level</h4>",
        "<ul><li>A list item<ul><li>A nested item</li><li>Another nested item<ol><li>Deeper still</li></ol></li></ul></li><li>Back out again</li></ul>",
        "<table><thead><tr><th>Tool</th><th>Years</th></tr></thead><tbody><tr><td>Vue</td><td>Four</td></tr><tr><td>Astro</td><td>Two</td></tr></tbody></table>",
        "<pre><code>const place = makeOnTheWeb();\nplace.feel();</code></pre>",
        "<p>Inline <code>code</code>, <strong>bold</strong>, <em>emphasis</em> and <a href=\"/projects\">a link</a>.</p>",
        `<p><img src="${content.pages.home.hero.portrait.src}" alt="A picture in the middle of the prose"></p>`,
        "<blockquote><p>A quotation, set apart from the rest.</p></blockquote>",
        "<h3>A closing heading</h3>",
        "<p>And a last paragraph to end on.</p>",
      ].join("\n");
      return settle({
        ...content,
        pages: { ...content.pages, about: { ...content.pages.about, html } },
      });
    },
    routes: () => [{ kind: "about", path: "/about" }],
  },
  "resume-shapes": {
    name: "resume-shapes",
    about: "Eight roles: a current one with no end date, and one with no bullets.",
    apply(content) {
      const roles = [
        entry(content, {
          title: "Staff Frontend Engineer",
          org: "Somewhere New",
          start: "2026-03",
          bullets: ["Leading the [design system](/projects) work, still going."],
        }),
        entry(content, { title: "Consultant", org: "Quiet Client", start: "2025-10", end: "2026-02" }),
        ...content.resume.experience.roles,
        entry(content, { title: "Volunteer Web Helper", org: "Local Library", start: "2019", end: "2020", bullets: ["Kept the events page current."] }),
        entry(content, { title: "Student Developer", kind: "Coursework", start: "2018-09", end: "2019-04", bullets: ["Built small things to learn."] }),
      ].slice(0, 8);
      const next: SiteContent = {
        ...content,
        resume: {
          ...content.resume,
          experience: { ...content.resume.experience, roles },
        },
      };
      next.resume.html = resumeHtml(next);
      return settle(next);
    },
    routes: () => [{ kind: "resume", path: "/resume" }],
  },
  "lab-no-cover": {
    name: "lab-no-cover",
    about: "A lab entry with its own page and no cover.",
    apply(content) {
      const lab = [
        ...content.lab,
        {
          slug: "fixture-sketch",
          detail: "/lab/fixture-sketch",
          hasPage: true,
          title: "A sketch with no cover",
          summary: "An experiment that lives here, with words but no picture.",
          type: "Canvas + sound",
          sourceEra: "This site",
          links: [{ label: "Source", url: "https://example.com/source" }],
          media: [],
          order: 99,
          html: "<h2>How it works</h2><p>A paragraph about the sketch.</p><ul><li>One thing</li><li>Another thing</li></ul>",
        },
      ];
      return settle({ ...content, lab });
    },
    routes: () => [
      { kind: "lab", path: "/lab" },
      { kind: "lab-entry", path: "/lab/fixture-sketch", slug: "fixture-sketch" },
    ],
  },
};
