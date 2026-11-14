/** What gets stuck into an exercise book besides the writing: photos taped
 * in, a few of them fanned where there are several, something live taped in
 * as a picture of itself with a sticky note on it saying how to start it,
 * and each block an experiment's (or a project's) page is told with, in the
 * shape a hand would give it on squared paper: photos taped in two by two,
 * a before and an after with an arrow between them, code copied out in a
 * ruled box, his own words boxed twice in red, the method numbered in the
 * margin, the files drawn as a bracket tree, a sound and a film taped in.
 *
 * Something live (a Pen, a demo, a deck, a model, or an experiment played
 * where it lies on the Bench) makes no request until it is asked: its
 * stage is a poster, and the press is handled by the site's one
 * click-to-load stage (src/lib/block-stage.ts), which makes the frame or
 * the viewer in the stage's own room and puts it away on a second press or
 * Escape. A film that loops plays, silent, only while it is in view and
 * only for a visitor who has not asked for less motion.
 *
 * Every word comes from content: the blocks' own, and what the site says
 * for them (`site.blocks`). */
import "../../../lib/block-stage";
import { quoteDateLabel, type Block, type BlockOf, type TreeNode } from "../../../lib/blocks";
import { blockRef, markPart, part, type Part } from "../../parts";
import { blocks as bodyBlocks, inline } from "../rich";
import type { SiteContent } from "../types";
import { h, link, svg } from "./dom";
import { arrow, RED, seed, tapeClip } from "./ink";

type Kid = Node | string | null | undefined | false;

/** A picture taped in by two strips at its top corners, a little askew. */
export function taped(
  src: string,
  alt: string,
  key: string,
  opts: {
    caption?: Kid;
    ratio?: number | string;
    video?: boolean;
    cls?: string;
    framed?: HTMLElement;
  } = {},
) {
  const rng = seed(key);
  const tilt = ((rng() - 0.5) * 3).toFixed(2);
  // `framed`: something else taped in, in the picture's place
  const media = opts.framed
    ? opts.framed
    : opts.video
    ? h("video", {
        src,
        muted: true,
        playsinline: true,
        controls: true,
        preload: "metadata",
        "aria-label": alt || null,
      })
    : h("img", { src, alt, loading: "lazy", decoding: "async" });
  if (opts.ratio && !opts.framed) media.style.aspectRatio = String(opts.ratio);
  const fig = h(
    "figure",
    { class: `bp-taped ${opts.cls ?? ""}`.trim(), style: `--tilt:${tilt}deg` },
    h("span", { class: "bp-tape bp-tape--a", style: `clip-path:${tapeClip(rng)}`, "aria-hidden": "true" }),
    h("span", { class: "bp-tape bp-tape--b", style: `clip-path:${tapeClip(rng)}`, "aria-hidden": "true" }),
    h("span", { class: "bp-taped__frame" }, media),
  );
  if (opts.caption) fig.append(h("figcaption", null, opts.caption));
  return fig;
}

/** An experiment's pictures as they lie: one photo taped in, or two or
 * three fanned, the first on top. Shown for the eye: the name beside them
 * says what they are. */
export function snaps(prints: string[], key: string) {
  const fan = h("span", {
    class: "bp-snaps-fan",
    "data-count": prints.length,
    "aria-hidden": "true",
  });
  // the first lies on top: drawn last
  [...prints].reverse().forEach((src, i) =>
    fan.append(taped(src, "", `${key}-${prints.length - 1 - i}`, { ratio: "4/3", cls: "bp-snap" })),
  );
  return fan;
}

// ---- something live -------------------------------------------------------------

let stages = 0;

export interface Live {
  /** What the stage loads, as data attributes for the click-to-load stage:
   * `frame` for a frame, or `model` (with `format`, `rotation`, `hint`,
   * `failed`) for a viewer. */
  data: Record<string, string | undefined>;
  /** What it is, for the frame's title and the button's name. */
  title: string;
  /** "16/10". */
  ratio: string;
  /** One of the site's own pictures, standing in its place until asked. */
  poster?: string;
  /** Words: to ask for it, to put it away, while it loads, and the small
   * print that nothing loads until asked. */
  load: string;
  close: string;
  loading?: string;
  note?: string;
  /** The way to it where it lives, always there, and how the book says
   * that opens in a new tab. */
  out?: { href: string; label: string; newTab: string };
  /** The button's part, when it is one (the Bench's `lab.preview`). */
  mark?: ReturnType<typeof part>;
}

/** The stage, its status line and the button that starts it: the pieces,
 * for a caller that lays them out itself (a stamp on the Shelf). */
export function stage(live: Live, cls: string, poster: Kid) {
  const id = `bp-stage-${++stages}`;
  const room = h(
    "span",
    {
      id,
      class: cls,
      style: `aspect-ratio:${live.ratio}`,
      "data-block-stage": "",
      "data-title": live.title,
      "data-loading": live.loading ?? null,
      ...Object.fromEntries(Object.entries(live.data).map(([key, value]) => [`data-${key}`, value ?? null])),
    },
    poster,
  );
  const status = h("span", { class: "block-stage__status bp-sr", role: "status" });
  const button = h(
    "button",
    {
      type: "button",
      class: "bp-live__load",
      "data-block-toggle": "",
      "aria-controls": id,
      "aria-pressed": "false",
      "data-load": live.load,
      "data-close": live.close,
      "data-subject": live.title,
      ...live.mark,
    },
    live.load,
  );
  return { room, status, button };
}

/** Something live taped in as a picture of itself (its poster, or a blank
 * card with what it is written on), and under it a sticky note to start
 * it, the small print, and the way out to where it lives. */
export function liveCard(live: Live, key: string, caption?: Kid) {
  const poster = live.poster
    ? h("img", { src: live.poster, alt: "", loading: "lazy", decoding: "async" })
    : h("span", { class: "bp-ask__what" }, live.title);
  const { room, status, button } = stage(live, "bp-ask bp-live__stage", poster);
  const fig = taped("", live.title, key, { cls: "bp-live__card", framed: room });
  fig.querySelector(".bp-taped__frame")!.append(status);
  return h(
    "div",
    { class: "bp-live", "data-stage-room": "" },
    fig,
    h(
      "p",
      { class: "bp-live__ask" },
      button,
      live.note ? h("span", { class: "bp-ask__small" }, live.note) : null,
      live.out ? link(live.out.href, live.out.newTab, `${live.out.label} ↗`) : null,
    ),
    caption ? h("p", { class: "bp-live__caption" }, caption) : null,
  );
}

// ---- a page told with blocks ----------------------------------------------------

export interface Told {
  content: SiteContent;
  /** `content.lenses["back-page"].newTab`. */
  newTab: string;
}

/** A number ringed in the margin, the way an exercise or a step is. */
const number = (n: number) => h("span", { class: "bp-num", "aria-hidden": "true" }, String(n));

/** Inline markdown, as nodes, or nothing. */
const words = (source?: string) => (source ? inline(source) : null);

/** A page's words as blocks to flow onto pages, each marked as part of the
 * body; its headings numbered, from `n`, the way exercises are. */
function prose(html: string, name: Part, ref: string, n: { at: number }) {
  return bodyBlocks(html).map((el) => {
    if (el.tagName === "H2") el.prepend(number(++n.at));
    return markPart(el, name, ref);
  });
}

/** An entry's page, in the order it is read: its words (`text`) and each
 * block stuck in where the body placed it. A kind of block this book has
 * not heard of is passed over. With no blocks, its prose alone. */
export function told(
  t: Told,
  page: { html: string; blocks: Block[] },
  body: Part,
  slug: string,
): HTMLElement[] {
  const n = { at: 0 };
  if (!page.blocks.length) return prose(page.html, body, slug, n);
  return page.blocks.flatMap((block) => {
    if (block.type === "text") return prose(block.html, body, slug, n);
    const el = stuckIn(t, block, slug);
    return el ? [el] : [];
  });
}

function stuckIn(t: Told, block: Exclude<Block, { type: "text" }>, slug: string): HTMLElement | null {
  const ref = blockRef(slug, block.name);
  const key = `block-${ref}`;
  const said = t.content.site.blocks;
  const mark = (el: HTMLElement) => markPart(el, `block.${block.type}` as Part, ref);
  switch (block.type) {
    case "gallery":
      return mark(gallery(block, key));
    case "compare":
      return mark(compare(block, key, said.compare));
    case "embed":
      return mark(
        liveCard(
          {
            data: { frame: block.frame },
            title: block.alt ?? block.caption ?? block.src,
            ratio: block.ratio ?? "16/10",
            poster: block.poster,
            load: said.embed.load[block.kind],
            close: said.embed.close,
            note: said.embed.note,
            out: { href: block.src, label: said.embed.open[block.kind], newTab: t.newTab },
          },
          key,
          words(block.caption),
        ),
      );
    case "model":
      return mark(
        liveCard(
          {
            data: {
              model: block.src,
              format: block.format,
              rotation: block.rotation?.join(","),
              hint: said.model.hint,
              failed: said.model.failed,
            },
            title: block.alt ?? block.caption ?? block.src,
            ratio: block.ratio ?? "4/3",
            poster: block.poster,
            load: said.model.load,
            close: said.model.close,
            note: said.model.note,
          },
          key,
          words(block.caption),
        ),
      );
    case "code":
      return mark(code(block));
    case "quote":
      return mark(quote(block));
    case "steps":
      return mark(steps(block, key));
    case "tree":
      return mark(tree(block));
    case "audio":
      return mark(
        taped("", block.alt ?? block.caption ?? "", key, {
          cls: "bp-sound",
          framed: h("audio", {
            src: block.src,
            controls: true,
            preload: "none",
            "aria-label": block.alt ?? block.caption ?? null,
          }),
          caption: words(block.caption),
        }),
      );
    case "film":
      return mark(film(block, key));
    default:
      return null;
  }
}

/** Photos taped in two by two, each with its caption written under it. */
function gallery(block: BlockOf<"gallery">, key: string) {
  return h(
    "div",
    { class: "bp-gallery", "data-count": Math.min(block.items.length, 3) },
    ...block.items.map((item, i) =>
      taped(item.src, item.alt ?? "", `${key}-${i}`, { ratio: "4/3", caption: words(item.caption) }),
    ),
  );
}

/** A before and an after taped side by side, a label pencilled on each
 * and an arrow drawn from one to the other. */
function compare(
  block: BlockOf<"compare">,
  key: string,
  said: SiteContent["site"]["blocks"]["compare"],
) {
  const side = (pic: BlockOf<"compare">["before"], label: string, at: string) => {
    const fig = taped(pic.src, pic.alt ?? "", `${key}-${at}`, { ratio: "4/3", caption: words(pic.caption) });
    fig.querySelector(".bp-taped__frame")!.append(h("span", { class: "bp-compare__label" }, label));
    return fig;
  };
  return h(
    "figure",
    { class: "bp-compare" },
    h(
      "div",
      { class: "bp-compare__pair" },
      side(block.before, block.before.label ?? said.before, "before"),
      svg(arrow(RED, seed(`${key}-arrow`))),
      side(block.after, block.after.label ?? said.after, "after"),
    ),
    block.caption ? h("figcaption", { class: "bp-jot" }, inline(block.caption)) : null,
  );
}

/** Code copied out neatly in a box ruled in pencil, what it is written in
 * at its corner. */
function code(block: BlockOf<"code">) {
  return h(
    "figure",
    { class: "bp-code" },
    h(
      "pre",
      { tabindex: "0", "data-language": block.language },
      h("code", null, block.code.replace(/\n$/, "")),
    ),
    block.caption ? h("figcaption", { class: "bp-jot" }, inline(block.caption)) : null,
  );
}

/** His own words, boxed twice in red pen, who said them and when under. */
function quote(block: BlockOf<"quote">) {
  return h(
    "figure",
    { class: "bp-callout bp-quote" },
    h("blockquote", null, h("p", null, inline(block.text))),
    h(
      "figcaption",
      null,
      `— ${block.source}`,
      block.date ? h("time", { datetime: block.date }, `, ${quoteDateLabel(block.date)}`) : null,
    ),
  );
}

/** The method: each step numbered in a ring in the margin, its picture
 * taped beside it. A long one runs on overleaf, each step keeping its
 * number. */
function steps(block: BlockOf<"steps">, key: string) {
  return h(
    "ol",
    { class: "bp-steps" },
    ...block.items.map((step, i) =>
      h(
        "li",
        null,
        number(i + 1),
        step.image
          ? taped(step.image.src, step.image.alt ?? "", `${key}-${i}`, {
              ratio: "4/3",
              cls: "bp-steps__pic",
              caption: words(step.image.caption),
            })
          : null,
        step.title ? h("p", { class: "bp-steps__title" }, step.title) : null,
        h("p", null, inline(step.text)),
      ),
    ),
  );
}

/** Files drawn as a bracket tree in pencil, a folder's name in pen, a
 * note pointed at what it is about. */
function tree(block: BlockOf<"tree">) {
  const branch = (nodes: TreeNode[]): HTMLElement =>
    h(
      "ul",
      null,
      ...nodes.map((node) =>
        h(
          "li",
          { "data-folder": node.name.endsWith("/") || !!node.children?.length },
          h("span", { class: "bp-tree__name" }, node.name),
          node.note ? h("span", { class: "bp-tree__note" }, ` ← ${node.note}`) : null,
          node.children?.length ? branch(node.children) : null,
        ),
      ),
    );
  return h(
    "figure",
    { class: "bp-tree" },
    branch(block.tree),
    block.caption ? h("figcaption", { class: "bp-jot" }, inline(block.caption)) : null,
  );
}

/** A film taped in, with its controls. One that loops plays by itself,
 * silent, while it is in view, unless the visitor asked for less motion. */
function film(block: BlockOf<"film">, key: string) {
  const fig = taped(block.src, block.alt ?? block.caption ?? "", key, {
    video: true,
    ratio: "16/10",
    cls: "bp-film",
    caption: words(block.caption),
  });
  const video = fig.querySelector("video")!;
  if (block.poster) video.setAttribute("poster", block.poster);
  if (block.loop) {
    video.loop = true;
    video.dataset.bpLoop = "";
    loops?.observe(video);
  }
  return fig;
}

const calm = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
const loops =
  typeof IntersectionObserver === "function"
    ? new IntersectionObserver((entries) => {
        for (const { target, isIntersecting } of entries) {
          const video = target as HTMLVideoElement;
          if (isIntersecting && !calm?.matches) video.play().catch(() => {});
          else video.pause();
        }
      })
    : null;
