import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import ResumeProse from "../../components/ResumeProse.astro";
import {
  getDerived,
  getFeatured,
  getHome,
  getLab,
  getLabPage,
  getProjects,
  getProjectsPage,
  getResume,
  getSite,
  getTextPage,
  getUpdates,
  labDetail,
  labHasPage,
  updateId,
} from "../../lib/portfolio";
import { resolveLink } from "../../lib/rules";
import type { SiteContent } from "../../prism/shells/types";

/** The whole portfolio as data, for lens shells: every entry with its
 * markdown rendered to HTML, every line of copy Daylight shows, the resume
 * as structure, the shared order and featured set, values derived from the
 * data, and each lens's own flavour copy. A shell renders this and nothing
 * else (see src/prism/shells/types.ts). */
export const prerender = true;

type Renderable = { render(): Promise<{ Content: unknown }> };

/** Dev builds annotate markup with source locations; lenses don't need them. */
const clean = (markup: string) =>
  markup.replace(/\s+data-astro-[\w-]+="[^"]*"/g, "").trim();

export const GET: APIRoute = async () => {
  const container = await AstroContainer.create();
  const html = async (entry: Renderable) => {
    const { Content } = await entry.render();
    return clean(
      await container.renderToString(
        Content as Parameters<typeof container.renderToString>[0],
      ),
    );
  };

  const site = await getSite();
  const [home, about, notFound, resume, projectsPage, labPage] =
    await Promise.all([
      getHome(),
      getTextPage("about"),
      getTextPage("not-found"),
      getResume(),
      getProjectsPage(),
      getLabPage(),
    ]);
  const [projects, lab, updates, featured, derived] = await Promise.all([
    getProjects(),
    getLab(),
    getUpdates(),
    getFeatured(),
    getDerived(),
  ]);
  const resumeBody = await html(resume.entry);
  const resumeStructure = await container.renderToString(ResumeProse, {
    props: { resume },
  });
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
  const content: SiteContent = {
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
      html: `${clean(resumeStructure)}\n<div class="resume-body" data-part="page.body" data-ref="resume">${resumeBody}</div>`,
    },
    projects: await Promise.all(
      projects.map(async (entry) => {
        const { hidden, ...data } = entry.data;
        void hidden;
        return {
          ...data,
          slug: entry.slug,
          href: `/projects/${entry.slug}`,
          html: await html(entry),
        };
      }),
    ),
    lab: await Promise.all(
      lab.map(async (entry) => {
        const { hidden, ...data } = entry.data;
        void hidden;
        return {
          ...data,
          slug: entry.slug,
          detail: labDetail(entry),
          hasPage: labHasPage(entry),
          html: await html(entry),
        };
      }),
    ),
    updates: updates.map((entry) => {
      const { evidence, expiresAt, ...data } = entry.data;
      void evidence;
      void expiresAt;
      return {
        ...data,
        id: updateId(entry),
        kindLabel: updateKinds[data.kind as keyof typeof updateKinds] ?? data.kind,
        sourceLabel: updateSources[data.source as keyof typeof updateSources] ?? data.source,
      };
    }),
    featured: featured.map((entry) => entry.slug),
    derived,
    lenses,
  };
  return new Response(JSON.stringify(content), {
    headers: { "Content-Type": "application/json" },
  });
};
