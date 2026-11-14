/** A fixture experiment written as a real one is (src/content/fixtures),
 * as /prism/content.json would carry it. The harness hands it to the
 * shells (`lab-blocks` in src/prism/fixtures.ts); Daylight's page on it is
 * beside this, at /prism/fixtures/lab/<slug>. */
import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { labPayload } from "../../../../lib/body";

export async function getStaticPaths() {
  return (await getCollection("fixtures")).map(
    (entry: CollectionEntry<"fixtures">) => ({
      params: { slug: entry.slug },
      props: { entry },
    }),
  );
}

export const GET: APIRoute = async ({ props }) =>
  Response.json(await labPayload(props.entry));
