/** The portfolio, loaded once per render with the shared rules applied.
 * Daylight's pages and /prism/content.json both read it from here, so the
 * order, the featured set, the resolved links and every derived value are
 * the same in every lens. */
import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry } from "astro:content";
import type { PageData, ResumeEntryData, SiteData } from "../content.config";
import { selectActivitySnapshot } from "./activity.mjs";
import {
  dateLine,
  derive,
  entryHeading,
  entryId,
  featuredProjects,
  listSentence,
  orderLab,
  orderProjects,
  resolveLink,
  smartQuotes,
  type LinkRef,
  type ResolvedLink,
} from "./rules";

export type PageId =
  "home" | "about" | "resume" | "projects" | "lab" | "not-found" | "writing";
export type ProjectEntry = CollectionEntry<"projects">;
export type LabEntry = CollectionEntry<"lab">;
export type UpdateEntry = CollectionEntry<"updates">;

export interface Header {
  eyebrow?: string;
  title: string;
  intro?: string;
  actions: ResolvedLink[];
}

export interface ResumeEntry {
  id: string;
  heading: string;
  title?: string;
  org?: string;
  kind?: string;
  start?: string;
  end?: string;
  /** No end date: the role is ongoing. */
  current: boolean;
  dateLine: string;
  location?: string;
  url?: string;
  summary?: string;
  /** Inline markdown. */
  bullets: string[];
}

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined || value === null)
    throw new Error(`Missing content: ${what}.`);
  return value;
}

export async function getSite(): Promise<SiteData> {
  return need(await getEntry("site", "config"), "site/config.json").data;
}

async function getPageEntry(id: PageId) {
  return need(await getEntry("pages", id), `pages/${id}.md`);
}

const headerOf = (site: SiteData, data: PageData, id: string): Header => {
  const header = need(data.header, `the header of pages/${id}.md`);
  return {
    ...header,
    actions: header.actions.map((link) => resolveLink(site, link)),
  };
};

function resumeEntry(entry: ResumeEntryData, ongoing: string): ResumeEntry {
  return {
    ...entry,
    summary: entry.summary && smartQuotes(entry.summary),
    bullets: entry.bullets.map(smartQuotes),
    id: entryId(entry),
    heading: entryHeading(entry),
    current: !!entry.start && !entry.end,
    dateLine: dateLine(entry, ongoing),
  };
}

type Sortable = {
  year: number;
  order: number;
  featured: boolean;
  title: string;
  entry: ProjectEntry;
};
const sortable = (entry: ProjectEntry): Sortable => ({ ...entry.data, entry });

/** Projects that are not hidden, in the one project order. */
export async function getProjects(): Promise<ProjectEntry[]> {
  const visible: ProjectEntry[] = (await getCollection("projects")).filter(
    (entry: ProjectEntry) => !entry.data.hidden,
  );
  return orderProjects(visible.map(sortable)).map((item) => item.entry);
}

/** Lab entries that are not hidden, by `order`. */
export async function getLab(): Promise<LabEntry[]> {
  const visible: LabEntry[] = (await getCollection("lab")).filter(
    (entry: LabEntry) => !entry.data.hidden,
  );
  return orderLab(
    visible.map((entry: LabEntry) => ({
      order: entry.data.order as number,
      title: entry.data.title as string,
      entry,
    })),
  ).map((item) => item.entry);
}

/** A lab entry has its own page unless it lives elsewhere (`href`). */
export const labHasPage = (entry: LabEntry) => !entry.data.href;
export const labDetail = (entry: LabEntry) =>
  entry.data.href ?? `/lab/${entry.slug}`;

/** An update's id: its file name. */
export const updateId = (entry: UpdateEntry) => entry.id.replace(/\.md$/, "");

/** Updates that are due and not expired, newest first (all of them). */
export async function getUpdates(): Promise<UpdateEntry[]> {
  const entries: UpdateEntry[] = await getCollection("updates");
  const byId = new Map(entries.map((entry) => [updateId(entry), entry]));
  return selectActivitySnapshot(
    entries.map((entry) => ({ ...entry.data, id: updateId(entry) })),
    new Date(__PORTFOLIO_BUILD_TIME__),
  ).map((data: { id: string }) => byId.get(data.id)!);
}

export async function getHome() {
  const site = await getSite();
  const entry = await getPageEntry("home");
  const data = entry.data;
  const hero = need(data.hero, "hero in pages/home.md");
  const work = need(data.work, "work in pages/home.md");
  const currently = need(data.currently, "currently in pages/home.md");
  const updates = need(data.updates, "updates in pages/home.md");
  const elsewhere = need(data.elsewhere, "elsewhere in pages/home.md");
  const resolve = (link: LinkRef) => resolveLink(site, link);
  return {
    entry,
    title: data.title,
    description: data.description,
    hero: { ...hero, links: hero.links.map(resolve) },
    sidebarLabel: need(data.sidebarLabel, "sidebarLabel in pages/home.md"),
    work: { ...work, link: resolve(work.link) },
    currently: { ...currently, link: resolve(currently.link) },
    updates,
    elsewhere: {
      label: elsewhere.label,
      items: elsewhere.items.map(
        (item: { title: string; href: string; blurb: string }) => ({
          ...item,
          href: resolve({ label: item.title, href: item.href }).href,
        }),
      ),
    },
  };
}

export async function getProjectsPage() {
  const site = await getSite();
  const entry = await getPageEntry("projects");
  const data = entry.data;
  const detail = need(data.entry, "entry in pages/projects.md");
  return {
    entry,
    title: data.title,
    description: data.description,
    header: headerOf(site, data, "projects"),
    listLabel: need(data.listLabel, "listLabel in pages/projects.md"),
    detail: {
      back: resolveLink(
        site,
        need(detail.back, "entry.back in pages/projects.md"),
      ),
      labels: {
        role: need(detail.labels.role, "entry.labels.role"),
        location: need(detail.labels.location, "entry.labels.location"),
        date: need(detail.labels.date, "entry.labels.date"),
      },
    },
  };
}

export async function getLabPage() {
  const site = await getSite();
  const entry = await getPageEntry("lab");
  const data = entry.data;
  const detail = need(data.entry, "entry in pages/lab.md");
  return {
    entry,
    title: data.title,
    description: data.description,
    header: headerOf(site, data, "lab"),
    listLabel: need(data.listLabel, "listLabel in pages/lab.md"),
    more: resolveLink(site, need(data.more, "more in pages/lab.md")),
    aside: need(data.aside, "aside in pages/lab.md"),
    detail: {
      eyebrow: need(detail.eyebrow, "entry.eyebrow in pages/lab.md"),
      labels: {
        type: need(detail.labels.type, "entry.labels.type"),
        era: need(detail.labels.era, "entry.labels.era"),
      },
    },
  };
}

/** About, the 404 and any other page that is a header and a body. */
export async function getTextPage(id: "about" | "not-found") {
  const site = await getSite();
  const entry = await getPageEntry(id);
  return {
    entry,
    title: entry.data.title,
    description: entry.data.description,
    header: headerOf(site, entry.data, id),
  };
}

export async function getResume() {
  const site = await getSite();
  const entry = await getPageEntry("resume");
  const data = entry.data;
  const experience = need(data.experience, "experience in pages/resume.md");
  const education = need(data.education, "education in pages/resume.md");
  const tools = need(data.tools, "tools in pages/resume.md");
  const ongoing = need(data.ongoing, "ongoing in pages/resume.md");
  return {
    entry,
    title: data.title,
    description: data.description,
    header: headerOf(site, data, "resume"),
    ongoing,
    experience: {
      title: experience.title,
      roles: experience.roles.map((role: ResumeEntryData) =>
        resumeEntry(role, ongoing),
      ),
    },
    education: {
      title: education.title,
      entries: education.entries.map((entry: ResumeEntryData) =>
        resumeEntry(entry, ongoing),
      ),
    },
    tools: { ...tools, sentence: `${listSentence(tools.items)}.` },
  };
}

/** The featured projects, by the shared rule. */
export async function getFeatured(): Promise<ProjectEntry[]> {
  const projects = await getProjects();
  const home = await getHome();
  return featuredProjects(projects.map(sortable), home.work.limit).map(
    (item) => item.entry,
  );
}

export async function getDerived() {
  const [projects, lab, updates, featured] = await Promise.all([
    getProjects(),
    getLab(),
    getUpdates(),
    getFeatured(),
  ]);
  return derive({
    projects: projects.map((entry) => ({
      year: entry.data.year,
      slug: entry.slug,
    })),
    lab,
    updates: updates.map((entry) => entry.data),
    featured,
  });
}

// Runtime writing enters through the same portfolio access boundary as the
// authored collections. Source/cache mechanics remain inside the adapter.
export { getPosts, getPost } from "./writing";
export async function getWritingPage() {
  const site = await getSite();
  const entry = await getPageEntry("writing");
  const data = entry.data;
  const copy = need(data.writing, "writing copy in pages/writing.md");
  const header = headerOf(site, data, "writing");
  return {
    entry,
    title: data.title,
    description: data.description,
    header: {
      ...header,
      actions: header.actions.length
        ? header.actions
        : [
            {
              label: copy.subscribeLabel,
              href: `${site.writingUrl}/subscribe`,
            },
            { label: copy.sourceLabel, href: site.writingUrl },
          ],
    },
    copy,
  };
}
