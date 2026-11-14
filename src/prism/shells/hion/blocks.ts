/** An entry's draft: how a thing was made, told with its blocks, as a
 * weaver's draft tells how a cloth was woven.
 *
 * The page is one loop the two hions run down either side of, laid out
 * as spreads and plates (`arrangeBlocks`). A spread is words at a reading
 * measure, their headings strung on wefts, with the small blocks after
 * them tied on in the margin to the magenta hion running down beside it
 * (weave.ts `data-tie="r"`): a quote is said in the hand, code is written
 * in chalk on a slip of the black paper, files dangle from their folders
 * as charms do, and a sound is a sound. A plate hangs across the loop from
 * a cord woven through it: a gallery is a string of pictures, the first
 * largest; a compare is two hung side by side, each with its side named;
 * steps are knots tied along one thread, each step hanging from its knot;
 * something live and a model hang as a place stitched out in the cloth,
 * empty until its cord is pulled (src/lib/block-stage.ts, shared with
 * every lens); a film hangs as a picture does, and one that loops plays by
 * itself, silently, while in sight, unless less motion is asked for. A
 * kind of block this lens has not heard of is passed over. */
import "../../../lib/block-stage";
import { arrangeBlocks, quoteDateLabel } from "../../../lib/blocks";
import { type Part, blockRef, markPart } from "../../parts";
import { inline, plain, rich } from "../rich";
import type { Block, Picture, SiteContent, TreeNode } from "../types";
import { h, link } from "./dom";
import { hung, image, kept, loop, picture, stringHeading } from "./hang";

type Told = Exclude<Block, { type: "text" }>;
type Copy = SiteContent["site"]["blocks"];
type Hue = "c" | "m";

/** A caption's inline markdown. */
const words = (source: string) => inline(source);
/** What a piece of media is, in plain words. */
const named = (media: { alt?: string; caption?: string }) => media.alt ?? plain(media.caption ?? "");

function caption(text?: string, cls = "hion-block__caption") {
  return text ? h("figcaption", { class: cls }, words(text)) : null;
}

/** A picture of the page, hung from the plate's cord by its corners; its
 * caption under it in the hand. */
function hungPicture(item: Picture, hue: Hue, label?: string) {
  const figure = picture(
    { type: "image", src: item.src, alt: item.alt },
    hue,
    { "data-hang": "" },
    item.caption ? words(item.caption) : null,
  );
  // Its side named on a tag under it, clear of the threads it hangs by.
  if (label) figure.querySelector(".hion-picture__frame")!.after(h("p", { class: "hion-block__side" }, label));
  return figure;
}

/** A film starts silent. The `muted` attribute only says so to a film the
 * page's own markup made; one made here is told directly. */
function silent(film: HTMLVideoElement) {
  film.muted = true;
  return film;
}

/** The files of a tree, each folder's dangling from it on a thread. */
function files(nodes: TreeNode[]): HTMLElement {
  return h(
    "ul",
    { class: "hion-files__list" },
    nodes.map((node) =>
      h(
        "li",
        { "data-folder": node.name.endsWith("/") ? "" : undefined },
        h("span", { class: "hion-files__name" }, node.name),
        node.note ? h("span", { class: "hion-files__note" }, node.note) : null,
        node.children?.length ? files(node.children) : null,
      ),
    ),
  );
}

function block(told: Told, slug: string, copy: Copy, i: number): HTMLElement | null {
  const hue: Hue = i % 2 ? "m" : "c";
  const mark = (el: HTMLElement) => {
    markPart(el, `block.${told.type}` as Part, blockRef(slug, told.name));
    el.classList.add("hion-block", `hion-block--${told.type}`);
    return el;
  };
  const stageId = `hion-block-${slug}-${told.name}`;
  /** Something live hangs as the place stitched out for it, with its cord. */
  const live = (stage: ReturnType<typeof kept>, out?: HTMLElement | null, said?: string) =>
    mark(
      h(
        "figure",
        { "data-stage-room": "", "data-cord": "" },
        hung("div", "pair", { class: "hion-block__hung", "data-hang": "", "data-hue": hue }, stage.place, stage.status),
        h("div", { class: "hion-block__pull" }, stage.cord, stage.note, out),
        caption(said),
      ),
    );
  switch (told.type) {
    case "gallery":
      return mark(
        h(
          "div",
          { class: "hion-garland", "data-cord": "", "data-count": String(Math.min(told.items.length, 4)) },
          told.items.map((item, n) => hungPicture(item, n % 2 ? "m" : "c")),
        ),
      );
    case "compare":
      return mark(
        h(
          "figure",
          {},
          h(
            "div",
            { class: "hion-compare", "data-cord": "" },
            hungPicture(told.before, "c", told.before.label ?? copy.compare.before),
            hungPicture(told.after, "m", told.after.label ?? copy.compare.after),
          ),
          caption(told.caption),
        ),
      );
    case "embed":
      return live(
        kept(stageId, {
          title: named(told),
          hue,
          poster: told.poster,
          ratio: told.ratio,
          load: copy.embed.load[told.kind],
          close: copy.embed.close,
          note: copy.embed.note,
          data: { "data-frame": told.frame },
        }),
        h("p", { class: "hion-block__out" }, link(told.src, {}, copy.embed.open[told.kind])),
        told.caption,
      );
    case "model":
      return live(
        kept(stageId, {
          title: named(told),
          hue,
          poster: told.poster,
          ratio: told.ratio,
          load: copy.model.load,
          close: copy.model.close,
          note: copy.model.note,
          data: {
            "data-model": told.src,
            "data-format": told.format,
            "data-rotation": told.rotation?.join(","),
            "data-hint": copy.model.hint,
            "data-failed": copy.model.failed,
          },
        }),
        null,
        told.caption,
      );
    case "film": {
      const film = silent(
        h(
          "video",
          {
            controls: true,
            muted: true,
            playsinline: true,
            loop: told.loop,
            preload: "metadata",
            poster: told.poster,
            "aria-label": named(told),
            "data-hion-loop": told.loop ? "" : undefined,
          },
          h("source", { src: told.src }),
        ),
      );
      return mark(
        h(
          "figure",
          { "data-cord": "" },
          hung(
            "div",
            "pair",
            { class: "hion-picture hion-block__hung", "data-hang": "", "data-hue": hue },
            h("span", { class: "hion-picture__frame" }, film),
          ),
          caption(told.caption),
        ),
      );
    }
    case "steps":
      return mark(
        h(
          "div",
          { class: "hion-steps" },
          hung(
            "ol",
            "tally",
            { class: "hion-steps__thread", "data-hue": hue, style: `--hion-count:${told.items.length}` },
            told.items.map((step, n) =>
              h(
                "li",
                { class: "hion-step" },
                h("span", { class: "hion-step__knot", "data-step": String(n + 1), "aria-hidden": "true" }),
                h("span", { class: "hion-step__no", "aria-hidden": "true" }, String(n + 1)),
                step.title ? h("p", { class: "hion-step__title" }, step.title) : null,
                h("p", { class: "hion-step__text" }, words(step.text)),
                step.image
                  ? picture(
                      image(step.image.src, step.image.alt),
                      n % 2 ? "m" : "c",
                      { class: "hion-step__picture" },
                      step.image.caption ? words(step.image.caption) : null,
                      false,
                    )
                  : null,
              ),
            ),
          ),
        ),
      );
    case "code":
      return mark(
        h(
          "figure",
          { "data-tie": "r", "data-hue": hue },
          h("p", { class: "hion-code__language" }, told.language),
          h("pre", { tabindex: "0", "data-language": told.language }, h("code", {}, told.code.trimEnd())),
          caption(told.caption),
        ),
      );
    case "quote":
      return mark(
        h(
          "figure",
          { "data-tie": "r", "data-hue": hue },
          h(
            "blockquote",
            {},
            told.text.split(/\n\s*\n/).map((paragraph) => h("p", {}, words(paragraph.trim()))),
          ),
          h(
            "figcaption",
            { class: "hion-quote__who" },
            h("cite", {}, told.source),
            told.date ? [", ", h("time", { datetime: told.date }, quoteDateLabel(told.date))] : null,
          ),
        ),
      );
    case "tree":
      return mark(
        h("figure", { "data-tie": "r", "data-hue": hue }, h("div", { class: "hion-files" }, files(told.tree)), caption(told.caption)),
      );
    case "audio":
      return mark(
        h(
          "figure",
          { "data-tie": "r", "data-hue": hue },
          h("audio", { controls: true, preload: "none", src: told.src, "aria-label": named(told) }),
          caption(told.caption ?? told.alt ?? ""),
        ),
      );
    default:
      return null;
  }
}

/** Words of the draft: its headings strung on wefts, revealed as the
 * drawing reaches them, links out opening on their own. */
function prose(html: string) {
  const body = h("div", { class: "hion-prose" });
  body.append(rich(html));
  body.querySelectorAll("h2").forEach(stringHeading);
  for (const a of body.querySelectorAll<HTMLAnchorElement>("a[href^='http']")) {
    a.target = "_blank";
    a.rel = "noreferrer";
  }
  for (const child of body.children) child.setAttribute("data-reveal", "");
  return body;
}

/** The draft: the page's blocks as spreads and plates in one loop, its
 * words marked as the entry's body (an experiment's, or a project's).
 * Nothing when the page has neither. */
export function draft(
  content: SiteContent,
  slug: string,
  page: Block[],
  label: string,
  body: Extract<Part, "lab.body" | "project.body"> = "lab.body",
) {
  const copy = content.site.blocks;
  let n = 0;
  const out = arrangeBlocks(page).flatMap((piece) => {
    if (piece.kind === "plate") {
      const drawn = block(piece.block, slug, copy, n++);
      return drawn ? [h("div", { class: "hion-plate", "data-reveal": "" }, drawn)] : [];
    }
    const text = piece.text?.html.trim() ? prose(piece.text.html) : null;
    if (text) markPart(text, body, slug);
    const asides = piece.asides.flatMap((told) => block(told, slug, copy, n++) ?? []);
    if (!text && !asides.length) return [];
    return [
      h(
        "div",
        { class: "hion-spread", "data-asides": asides.length ? "" : undefined },
        text,
        asides.length ? h("div", { class: "hion-spread__margin", "data-reveal": "" }, asides) : null,
      ),
    ];
  });
  return out.length ? loop({ class: "hion-loop--draft", "aria-label": label }, out) : null;
}

/** A film that loops plays by itself, silently, while it is in sight,
 * unless the visitor asked for less motion. (The shared stage watches the
 * films of a page the router brings in; this shell builds its own.) */
export function watchFilms(root: HTMLElement, signal: AbortSignal, reduced: boolean) {
  const films = root.querySelectorAll<HTMLVideoElement>("video[data-hion-loop]");
  if (!films.length || reduced) return;
  const seen = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const film = target as HTMLVideoElement;
      if (isIntersecting) film.play().catch(() => {});
      else film.pause();
    }
  });
  for (const film of films) seen.observe(film);
  signal.addEventListener("abort", () => seen.disconnect(), { once: true });
}
