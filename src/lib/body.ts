/** An entry's markdown body, rendered: as HTML, and as the blocks its page
 * is told with (./blocks). Daylight's pages and /prism/content.json both
 * read a page from here, so every lens is handed the page Daylight shows. */
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { CollectionEntry } from "astro:content";
import type { BlockData } from "../content.config";
import type { LabEntry } from "../prism/shells/types";
import { placeBlocks, proseHtml, type Block } from "./blocks";
import { labDetail, labHasPage } from "./portfolio";

type Renderable = { render(): Promise<{ Content: unknown }> };
type Component = Parameters<AstroContainer["renderToString"]>[0];

/** Dev builds annotate markup with source locations; lenses don't need them. */
const clean = (markup: string) =>
  markup.replace(/\s+data-astro-[\w-]+="[^"]*"/g, "").trim();

let container: Promise<AstroContainer> | undefined;

/** A component as the HTML it renders. */
export async function renderHtml(
  component: unknown,
  props?: Record<string, unknown>,
): Promise<string> {
  container ??= AstroContainer.create();
  return clean(
    await (
      await container
    ).renderToString(component as Component, props && { props }),
  );
}

/** An entry's markdown body as HTML. */
export const bodyHtml = async (entry: Renderable) =>
  renderHtml((await entry.render()).Content);

/** A project's or an experiment's page: its blocks in reading order, the
 * prose between them as `text` blocks, and that prose alone as `html`. A
 * body that places a block the entry does not have stops the build. */
export async function pageBody(
  entry: Renderable & {
    collection: string;
    id: string;
    data: { blocks: Record<string, BlockData> };
  },
): Promise<{ html: string; blocks: Block[] }> {
  const blocks = placeBlocks(
    await bodyHtml(entry),
    entry.data.blocks,
    `${entry.collection}/${entry.id}`,
  );
  return { html: proseHtml(blocks), blocks };
}

/** An experiment as /prism/content.json carries it. A fixture experiment
 * (src/content/fixtures) is written as one and carried the same way. */
export async function labPayload(
  entry: CollectionEntry<"lab"> | CollectionEntry<"fixtures">,
): Promise<LabEntry> {
  const { hidden, ...data } = entry.data;
  void hidden;
  const experiment = entry as CollectionEntry<"lab">;
  return {
    ...data,
    slug: entry.slug,
    detail: labDetail(experiment),
    hasPage: labHasPage(experiment),
    ...(await pageBody(entry)),
  };
}
