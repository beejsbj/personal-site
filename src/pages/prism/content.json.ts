import type { APIRoute } from "astro";
import { getCollection, getEntry } from "astro:content";
import { selectActivitySnapshot } from "../../lib/activity.mjs";

/** The whole portfolio as data, for lens shells. Every lens renders this same
 * content; a shell may present it however it likes but never adds to it. */
export const prerender = true;

export const GET: APIRoute = async () => {
  const site = (await getEntry("site", "config"))!.data;
  const pages = Object.fromEntries(
    (await getCollection("pages")).map((page) => [
      page.slug,
      { ...page.data, body: page.body.trim() },
    ]),
  );
  const projects = (await getCollection("projects"))
    .filter((entry) => !entry.data.hidden)
    .sort((a, b) => b.data.year - a.data.year || a.data.order - b.data.order)
    .map((entry) => ({
      ...entry.data,
      slug: entry.slug,
      href: `/projects/${entry.slug}`,
    }));
  const lab = (await getCollection("lab"))
    .filter((entry) => !entry.data.hidden)
    .sort((a, b) => a.data.order - b.data.order)
    .map((entry) => ({
      ...entry.data,
      slug: entry.slug,
      detail: `/lab/${entry.slug}`,
    }));
  const updates = selectActivitySnapshot(
    (await getCollection("updates")).map((entry) => entry.data),
  );
  return new Response(
    JSON.stringify({ site, pages, projects, lab, updates }),
    { headers: { "Content-Type": "application/json" } },
  );
};
