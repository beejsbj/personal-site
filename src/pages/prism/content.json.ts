import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import ResumeProse from "../../components/ResumeProse.astro";
import {
  getDerived,
  getFeatured,
  getHome,
  getLab,
  getLabbook,
  getLabPage,
  getProjects,
  getProjectsPage,
  getResume,
  getSite,
  getTextPage,
  getUpdates,
  getWritingPage,
  getPosts,
  getPost,
} from "../../lib/portfolio";
import {
  bodyHtml as html,
  labPayload,
  pageBody,
  renderHtml,
} from "../../lib/body";
import { resolveLink } from "../../lib/rules";
import { formatDate, writingHeaders } from "../../lib/writing";
import type { WritingEntry } from "../../lib/writing";
import type {
  SiteContent,
  WritingPost,
  WritingContent,
} from "../../prism/shells/types";

/** The whole portfolio as data, for lens shells: every entry with its
 * markdown rendered to HTML, every line of copy Daylight shows, the resume
 * as structure, the shared order and featured set, values derived from the
 * data, and each lens's own flavour copy. A shell renders this and nothing
 * else (see src/prism/shells/types.ts). */
export const prerender = false;

// The authored portfolio is immutable within a deployment. Render its
// Markdown once per warm function; writing is attached on every request.
let authored: Promise<Omit<SiteContent, "writing">> | undefined;
async function authoredPortfolio(): Promise<Omit<SiteContent, "writing">> {
  const site = await getSite();
  const [home, about, notFound, resume, projectsPage, labPage, writingPage] =
    await Promise.all([
      getHome(),
      getTextPage("about"),
      getTextPage("not-found"),
      getResume(),
      getProjectsPage(),
      getLabPage(),
      getWritingPage(),
    ]);
  const [projects, lab, updates, labbook, featured, derived] =
    await Promise.all([
      getProjects(),
      getLab(),
      getUpdates(),
      getLabbook(),
      getFeatured(),
      getDerived(),
    ]);
  const resumeBody = await html(resume.entry);
  const resumeStructure = await renderHtml(ResumeProse, { resume });
  const lenses = Object.fromEntries(
    (await getCollection("lenses")).map(
      (entry: { id: string; data: unknown }) => [entry.id, entry.data],
    ),
  ) as SiteContent["lenses"];

  const strip = <T extends { entry: unknown }>({ entry, ...rest }: T) => {
    void entry;
    return rest;
  };

  const { updateKinds, updateSources } = site;
  const content: Omit<SiteContent, "writing"> = {
    site: {
      ...site,
      footer: {
        ...site.footer,
        links: site.footer.links.map((link) => resolveLink(site, link)),
      },
    },
    pages: {
      home: strip(home),
      about: { ...strip(about), html: await html(about.entry) },
      writing: strip(writingPage),
      resume: {
        title: resume.title,
        description: resume.description,
        header: resume.header,
        html: resumeBody,
      },
      projects: strip(projectsPage),
      lab: strip(labPage),
      notFound: strip(notFound),
    },
    resume: {
      experience: resume.experience,
      education: resume.education,
      tools: resume.tools,
      ongoing: resume.ongoing,
      html: `${resumeStructure}\n<div class="resume-body" data-part="page.body" data-ref="resume">${resumeBody}</div>`,
    },
    projects: await Promise.all(
      projects.map(async (entry) => {
        const { hidden, ...data } = entry.data;
        void hidden;
        return {
          ...data,
          slug: entry.slug,
          href: `/projects/${entry.slug}`,
          ...(await pageBody(entry)),
        };
      }),
    ),
    lab: await Promise.all(lab.map(labPayload)),
    updates: updates.map(({ evidence, expiresAt, ...data }) => {
      void evidence;
      void expiresAt;
      return {
        ...data,
        kindLabel:
          updateKinds[data.kind as keyof typeof updateKinds] ?? data.kind,
        sourceLabel:
          updateSources[data.source as keyof typeof updateSources] ??
          data.source,
      };
    }),
    labbook,
    featured: featured.map((entry) => entry.slug),
    derived,
    lenses,
  };
  return content;
}
const summary = (entry: WritingEntry): WritingPost => ({
  ...entry.data,
  slug: entry.slug,
  href: `/writing/${entry.slug}`,
  date: entry.data.date.toISOString(),
  dateLabel: formatDate(entry.data.date),
});
export const GET: APIRoute = async ({ url }) => {
  authored ??= authoredPortfolio().catch((error) => {
    authored = undefined;
    throw error;
  });
  const base = await authored;
  const writing: WritingContent = { posts: [], status: "unavailable" };
  try {
    writing.posts = (await getPosts()).map(summary);
    writing.status = "available";
  } catch {
    /* Other portfolio routes remain usable during source outages. */
  }
  const slug = url.searchParams.get("writing");
  if (slug !== null) {
    try {
      const entry = await getPost(slug);
      writing.entryStatus = entry ? "available" : "missing";
      if (entry) writing.entry = { ...summary(entry), html: entry.body ?? "" };
    } catch {
      writing.entryStatus = "unavailable";
    }
  }
  return new Response(JSON.stringify({ ...base, writing }), {
    headers: {
      ...writingHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...(writing.status === "unavailable" ||
      writing.entryStatus === "unavailable"
        ? {
            "Cache-Control": "no-store",
            "Vercel-CDN-Cache-Control": "no-store",
          }
        : {}),
    },
  });
};
