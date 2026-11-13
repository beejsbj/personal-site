/** The blocks a page is told with: an experiment's page, or a project's.
 *
 * A page is written as a markdown body, and named blocks in its front
 * matter (`blocks` in src/content.config.ts). A line of the body that is
 * `::name` and nothing else is where that block goes; a block the body
 * does not place follows the prose, in the order written. `placeBlocks`
 * turns the two into one ordered list, the prose between blocks as `text`
 * blocks, and /prism/content.json hands that list to every lens: a lens
 * walks it by `type` and never reads the HTML to find a block.
 *
 * Pure functions over plain data, with no Astro imports, so the lenses and
 * the tests can import this file directly. */
import type { BlockData } from "../content.config";
import { penEmbedSrc } from "./labbook.ts";

/** A picture and its words. It has alt text, a caption, or both; a lens
 * names it by `alt ?? caption`. `caption` is inline markdown. */
export type Picture = {
  /** A site path (/images/…) or an https:// address. */
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};

/** A file or a folder in a tree. A folder's name ends in "/". */
export type TreeNode = { name: string; note?: string; children?: TreeNode[] };

/** What a model's file is, read from its name. */
export type ModelFormat = "glb" | "spz" | "sog" | "splat";

/** The words every piece of media carries: alt text, a caption (inline
 * markdown), or both. */
type Words = { alt?: string; caption?: string };

/** One block of a page, in the order the page is read. Every block but
 * `text` has the `name` its page gave it, unique on that page. */
export type Block =
  /** The prose between blocks: rendered markdown. */
  | { type: "text"; html: string }
  | ({ name: string } & (
      | { type: "gallery"; items: Picture[] }
      | {
          type: "compare";
          before: Picture & { label?: string };
          after: Picture & { label?: string };
          /** Inline markdown. */
          caption?: string;
        }
      /** Something live that loads only when asked for. `src` is where it
       * lives, `frame` what a frame loads: a Pen's embed, else `src`. */
      | ({
          type: "embed";
          kind: "pen" | "demo" | "deck";
          src: string;
          frame: string;
          /** One of the site's own files. */
          poster?: string;
          /** "16/9". */
          ratio?: string;
        } & Words)
      /** A 3D model or a Gaussian splat, shown by a viewer that loads only
       * when asked for. */
      | ({
          type: "model";
          src: string;
          format: ModelFormat;
          poster?: string;
          ratio?: string;
          /** Degrees about x, y and z, to stand the model upright. */
          rotation?: [number, number, number];
        } & Words)
      | { type: "code"; code: string; language: string; caption?: string }
      /** Burooj's own words. `text` is inline markdown; `date` is "2024",
       * "2024-03" or "2024-03-09". */
      | { type: "quote"; text: string; source: string; date?: string }
      /** Numbered by their order. `text` is inline markdown. */
      | {
          type: "steps";
          items: { title?: string; text: string; image?: Picture }[];
        }
      | { type: "tree"; tree: TreeNode[]; caption?: string }
      | ({ type: "audio"; src: string } & Words)
      | ({ type: "film"; src: string; poster?: string; loop: boolean } & Words)
    ));

export type BlockType = Block["type"];
/** A block of one type: `BlockOf<"gallery">`. */
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

/** Every type a page's front matter may name (`text` is the body). */
export const BLOCK_TYPES = [
  "gallery",
  "compare",
  "embed",
  "model",
  "code",
  "quote",
  "steps",
  "tree",
  "audio",
  "film",
] as const satisfies readonly Exclude<BlockType, "text">[];

/** How a block is named, and so how the body places it: `::first-drawings`. */
export const BLOCK_NAME = /^[a-z][a-z0-9-]*$/;

/** What a model's file is, by its name; nothing for a file no viewer here
 * shows. */
export function modelFormat(src: string): ModelFormat | undefined {
  const [, format] =
    src.match(/\.(glb|spz|sog|splat)(?:[?#].*)?$/i) ?? ([] as string[]);
  return format?.toLowerCase() as ModelFormat | undefined;
}

/** A tree as it is written, an indented outline with two spaces to a
 * level and an optional `# note` after a name, as nodes:
 *
 *     src/
 *       content/   # every word a visitor reads
 *     package.json
 *
 * Throws, naming the line, when the outline cannot be read. */
export function parseTree(source: string): TreeNode[] {
  const roots: TreeNode[] = [];
  // The last node seen at each depth: where the next child goes.
  const open: TreeNode[] = [];
  source.split("\n").forEach((line, index) => {
    if (!line.trim()) return;
    const indent = line.match(/^ */)![0].length;
    const at = `Line ${index + 1}`;
    if (/^\s*\t/.test(line))
      throw new Error(`${at} is indented with a tab: two spaces to a level.`);
    if (indent % 2)
      throw new Error(
        `${at} is indented by ${indent} spaces: two spaces to a level.`,
      );
    const depth = indent / 2;
    if (depth > open.length)
      throw new Error(
        `${at} is indented further than a child of the line above: two spaces to a level.`,
      );
    const [, name, note] = line.trim().match(/^(.*?)(?:\s+#\s*(.*))?$/)!;
    const node: TreeNode = { name, ...(note ? { note } : {}) };
    if (depth === 0) roots.push(node);
    else (open[depth - 1].children ??= []).push(node);
    open.length = depth;
    open.push(node);
  });
  if (!roots.length)
    throw new Error("A tree names at least one file or folder.");
  return roots;
}

/** A line of a rendered body that places a block: `::name`, alone in its
 * paragraph. */
const PLACED = /<p(?:\s[^>]*)?>::([a-z][a-z0-9-]*)<\/p>/g;

/** A block as a lens is handed it: as written, with its name and what the
 * site works out for it (a Pen's frame, a model's format). */
function named(name: string, block: BlockData): Exclude<Block, { type: "text" }> {
  switch (block.type) {
    case "embed":
      return {
        ...block,
        name,
        frame:
          block.kind === "pen"
            ? (penEmbedSrc(block.src) ?? block.src)
            : block.src,
      };
    case "model":
      return { ...block, name, format: modelFormat(block.src)! };
    default:
      return { ...block, name };
  }
}

/** A page as one ordered list: its rendered body cut where it places a
 * block (`::name`), the prose between as `text` blocks, and any block the
 * body does not place after the prose, in the order written. `where` names
 * the file, for the error a body gets by placing a block that is not
 * there, or one block twice. */
export function placeBlocks(
  html: string,
  blocks: Record<string, BlockData>,
  where: string,
): Block[] {
  const page: Block[] = [];
  const placed = new Set<string>();
  const prose = (piece: string) => {
    if (piece.trim()) page.push({ type: "text", html: piece.trim() });
  };
  let last = 0;
  for (const match of html.matchAll(PLACED)) {
    const [line, name] = match;
    if (!Object.hasOwn(blocks, name))
      throw new Error(
        `No block is named "${name}" (placed by ::${name} in ${where}).`,
      );
    if (placed.has(name))
      throw new Error(`The block "${name}" is placed twice in ${where}.`);
    placed.add(name);
    prose(html.slice(last, match.index));
    page.push(named(name, blocks[name]));
    last = match.index + line.length;
  }
  prose(html.slice(last));
  for (const [name, block] of Object.entries(blocks))
    if (!placed.has(name)) page.push(named(name, block));
  return page;
}

/** A page's prose alone, as one rendered body: what a lens that reads
 * `html` shows, and what every lens showed before there were blocks. */
export const proseHtml = (page: Block[]): string =>
  page.flatMap((block) => (block.type === "text" ? [block.html] : [])).join("\n");

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** A quote's date as words, as far as it was given: "2024", "Mar 2024" or
 * "09 Mar 2024". */
export function quoteDateLabel(date: string): string {
  const [year, month, day] = date.split("-");
  return [day, month && MONTHS[Number(month) - 1], year]
    .filter(Boolean)
    .join(" ");
}
