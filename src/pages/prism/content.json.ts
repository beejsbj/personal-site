import type { APIRoute } from "astro";
import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { selectActivitySnapshot } from "../../lib/activity.mjs";

/** The whole portfolio as data, for lens shells. Every lens renders this same
 * content; a shell may present it however it likes but never adds to it. */
export const prerender = true;

type Project = CollectionEntry<"projects">;
type LabEntry = CollectionEntry<"lab">;
type Update = CollectionEntry<"updates">;
type Page = CollectionEntry<"pages">;

export const GET: APIRoute = async () => {
  const site = (await getEntry("site", "config"))!.data;
  const pages = Object.fromEntries(
    (await getCollection("pages")).map((page: Page) => [
      page.slug,
      { ...page.data, body: page.body.trim() },
    ]),
  );
  const projects = (await getCollection("projects"))
    .filter((entry: Project) => !entry.data.hidden)
    .sort(
      (a: Project, b: Project) =>
        b.data.year - a.data.year || a.data.order - b.data.order,
    )
    .map((entry: Project) => ({
      ...entry.data,
      slug: entry.slug,
      href: `/projects/${entry.slug}`,
    }));
  // Lab entries with a live link have no local page (see lab/[slug].astro).
  const lab = (await getCollection("lab"))
    .filter((entry: LabEntry) => !entry.data.hidden)
    .sort((a: LabEntry, b: LabEntry) => a.data.order - b.data.order)
    .map((entry: LabEntry) => ({
      ...entry.data,
      slug: entry.slug,
      detail: entry.data.href ?? `/lab/${entry.slug}`,
    }));
  const updates = selectActivitySnapshot(
    (await getCollection("updates")).map((entry: Update) => entry.data),
  );
  return new Response(
    JSON.stringify({ site, pages, projects, lab, updates }),
    { headers: { "Content-Type": "application/json" } },
  );
};
