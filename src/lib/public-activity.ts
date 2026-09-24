import { getCollection, type CollectionEntry } from "astro:content";
import { generatedActivity } from "./generated-activity";
import { selectFeedEvents } from "./activity-feed.mjs";
import { updateSchema } from "../content.config";

/** Authored public updates and reviewed engine exports share one presentation feed. */
export async function getPublicActivity() {
  const authored = await getCollection("updates");
  return selectFeedEvents([
    ...authored.map((entry: CollectionEntry<"updates">) => ({ ...entry.data, id: `site:${entry.id}` })),
    ...generatedActivity,
  ]).map((event) => updateSchema.parse(event));
}
