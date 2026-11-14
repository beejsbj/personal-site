/** A brief's report: an experiment's page told with its blocks, as this
 * game files a case.
 *
 * The page is laid out as spreads and plates (`arrangeBlocks`). A spread is
 * the words of the report, with the small blocks after them clipped in its
 * margin: a quote is a line of dialogue (whoever said it on the box's tab),
 * code is a terminal printout, files are an item list and a sound is a
 * voice message. A plate is laid across the report: a gallery is evidence
 * photos pinned in a row, the first largest; a compare is two photos with
 * a red slash between them; steps are the plan, a run of numbered panels;
 * something live, a model and a film are a screen, which plays only when
 * its prompt is pressed (src/lib/block-stage.ts, shared with Daylight). A
 * kind of block this lens has not heard of is passed over. */
import "../../../lib/block-stage";
import type { Block, Picture, SiteContent, TreeNode } from "../types";
import { arrangeBlocks, quoteDateLabel } from "../../../lib/blocks";
import { type Part, blockRef, markPart } from "../../parts";
import { inline, plain } from "../rich";
import { h, prose } from "./dom";

type Told = Exclude<Block, { type: "text" }>;
type Copy = SiteContent["site"]["blocks"];

const TILTS = [-2.2, 1.6, -0.9, 2.4, -1.5];

/** A caption's inline markdown, its links plain. */
const words = (source: string) => inline(source);
/** What a piece of media is, in plain words. */
const named = (media: { alt?: string; caption?: string }) => media.alt ?? plain(media.caption ?? "");

/** A photo pinned to the report: its print, and its caption on a strip of
 * black tape. A label (a compare's side) is a sticker on its corner. */
function photo(picture: Picture, i: number, label?: string) {
  return h(
    "figure",
    { class: "cc-photo", style: `--tilt:${TILTS[i % TILTS.length]}deg` },
    h(
      "div",
      { class: "cc-photo__print" },
      h("img", {
        src: picture.src,
        alt: picture.alt ?? "",
        loading: "lazy",
        decoding: "async",
        width: picture.width,
        height: picture.height,
      }),
      label ? h("span", { class: "cc-photo__label" }, label) : null,
    ),
    picture.caption ? h("figcaption", { class: "cc-photo__caption" }, words(picture.caption)) : null,
  );
}

/** A screen something live plays on: its poster, or its words, until its
 * prompt is pressed; the prompt, what the screen promises, and (for an
 * embed) the way to where it lives on the strip under it. */
export function screen(
  id: string,
  options: {
    title: string;
    poster?: string;
    ratio?: string;
    load: string;
    close: string;
    note: string;
    subject?: string;
    out?: { href: string; label: string };
    data: Record<string, string | undefined>;
    loading?: string;
  },
) {
  const { title, poster, ratio, load, close, note, subject, out, data, loading } = options;
  return h(
    "div",
    { class: "cc-tv", "data-stage-room": "" },
    h(
      "div",
      {
        class: "cc-tv__screen",
        id,
        style: ratio ? `aspect-ratio:${ratio.replace("/", " / ")}` : undefined,
        "data-block-stage": "",
        "data-title": title,
        "data-loading": loading,
        ...data,
      },
      poster
        ? h("img", { class: "cc-tv__poster", src: poster, alt: title, loading: "lazy", decoding: "async" })
        : h("p", { class: "cc-tv__label" }, title),
    ),
    h(
      "p",
      { class: "cc-tv__bar" },
      h(
        "button",
        {
          type: "button",
          class: "cc-tv__toggle",
          "aria-pressed": "false",
          "aria-controls": id,
          "aria-label": subject ? `${load}: ${subject}` : undefined,
          "data-block-toggle": "",
          "data-load": load,
          "data-close": close,
          "data-subject": subject,
        },
        load,
      ),
      h("span", { class: "cc-tv__note" }, note),
      out
        ? h(
            "a",
            { class: "cc-tv__out", href: out.href, rel: "noreferrer" },
            out.label,
            h("span", { "aria-hidden": "true" }, " ↗"),
          )
        : null,
    ),
    h("p", { class: "cc-tv__status block-stage__status", role: "status" }),
  );
}

/** A film starts silent. The `muted` attribute only says so to a film the
 * page's own markup made; one made here is told directly. */
function silent(film: HTMLVideoElement) {
  film.muted = true;
  return film;
}

function caption(text?: string) {
  return text ? h("figcaption", { class: "cc-block__caption" }, words(text)) : null;
}

/** The files of a tree, as the game lists items: a folder opens onto the
 * ones inside it. */
function files(nodes: TreeNode[]): HTMLElement {
  return h(
    "ul",
    { class: "cc-files__list" },
    nodes.map((node) =>
      h(
        "li",
        { "data-folder": node.name.endsWith("/") ? "" : null },
        h("span", { class: "cc-files__name" }, node.name),
        node.note ? h("span", { class: "cc-files__note" }, node.note) : null,
        node.children?.length ? files(node.children) : null,
      ),
    ),
  );
}

function block(told: Told, slug: string, copy: Copy): HTMLElement | null {
  const mark = (el: HTMLElement) => {
    markPart(el, `block.${told.type}` as Part, blockRef(slug, told.name));
    el.classList.add("cc-block", `cc-block--${told.type}`);
    return el;
  };
  const stageId = `cc-block-${slug}-${told.name}`;
  switch (told.type) {
    case "gallery":
      return mark(
        h(
          "div",
          { "data-count": Math.min(told.items.length, 4) },
          told.items.map((picture, i) => photo(picture, i)),
        ),
      );
    case "compare":
      return mark(
        h(
          "figure",
          {},
          h(
            "div",
            { class: "cc-compare" },
            photo(told.before, 0, told.before.label ?? copy.compare.before),
            h("span", { class: "cc-compare__slash", "aria-hidden": "true" }),
            photo(told.after, 1, told.after.label ?? copy.compare.after),
          ),
          caption(told.caption),
        ),
      );
    case "embed":
      return mark(
        h(
          "figure",
          {},
          screen(stageId, {
            title: named(told),
            poster: told.poster,
            ratio: told.ratio,
            load: copy.embed.load[told.kind],
            close: copy.embed.close,
            note: copy.embed.note,
            out: { href: told.src, label: copy.embed.open[told.kind] },
            data: { "data-frame": told.frame },
          }),
          caption(told.caption),
        ),
      );
    case "model":
      return mark(
        h(
          "figure",
          {},
          screen(stageId, {
            title: named(told),
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
          caption(told.caption),
        ),
      );
    case "film":
      return mark(
        h(
          "figure",
          {},
          h(
            "div",
            { class: "cc-tv" },
            h(
              "div",
              { class: "cc-tv__screen" },
              silent(
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
                    "data-cc-loop": told.loop ? "" : null,
                  },
                  h("source", { src: told.src }),
                ),
              ),
            ),
          ),
          caption(told.caption),
        ),
      );
    case "code":
      return mark(
        h(
          "figure",
          {},
          h("p", { class: "cc-code__tab", "aria-hidden": "true" }, told.language),
          h("pre", { tabindex: "0", "data-language": told.language }, h("code", {}, told.code.trimEnd())),
          caption(told.caption),
        ),
      );
    case "quote":
      return mark(
        h(
          "figure",
          { class: "cc-say" },
          h(
            "figcaption",
            { class: "cc-say__name" },
            h("cite", {}, told.source),
            told.date ? [", ", h("time", { datetime: told.date }, quoteDateLabel(told.date))] : null,
          ),
          h(
            "blockquote",
            {},
            told.text.split(/\n\s*\n/).map((paragraph) => h("p", {}, words(paragraph.trim()))),
          ),
        ),
      );
    case "steps":
      return mark(
        h(
          "ol",
          { "data-count": told.items.length },
          told.items.map((step, i) =>
            h(
              "li",
              { class: "cc-step", style: `--n:${i}` },
              h("span", { class: "cc-step__no", "aria-hidden": "true" }, String(i + 1).padStart(2, "0")),
              step.title ? h("p", { class: "cc-step__title" }, step.title) : null,
              h("p", { class: "cc-step__text" }, words(step.text)),
              step.image ? photo(step.image, i + 1) : null,
            ),
          ),
        ),
      );
    case "tree":
      return mark(h("figure", {}, h("div", { class: "cc-files" }, files(told.tree)), caption(told.caption)));
    case "audio":
      return mark(
        h(
          "figure",
          {},
          h("audio", { controls: true, preload: "none", src: told.src, "aria-label": named(told) }),
          h("figcaption", { class: "cc-block__caption" }, words(told.caption ?? told.alt ?? "")),
        ),
      );
    default:
      return null;
  }
}

/** The report: the page's blocks as spreads and plates, its prose marked
 * as the entry's body (an experiment's, or a project's). Nothing when the
 * page has neither. */
export function report(
  content: SiteContent,
  slug: string,
  page: Block[],
  body: Extract<Part, "lab.body" | "project.body"> = "lab.body",
) {
  const copy = content.site.blocks;
  const out = arrangeBlocks(page).flatMap((piece) => {
    if (piece.kind === "plate") {
      const drawn = block(piece.block, slug, copy);
      return drawn ? [h("div", { class: "cc-report__plate" }, drawn)] : [];
    }
    const text = piece.text ? prose(piece.text.html) : null;
    if (text) markPart(text, body, slug);
    const asides = piece.asides.flatMap((told) => block(told, slug, copy) ?? []);
    if (!text && !asides.length) return [];
    return [
      h(
        "div",
        { class: "cc-spread", "data-asides": asides.length ? "" : null },
        text,
        asides.length ? h("div", { class: "cc-spread__margin" }, asides) : null,
      ),
    ];
  });
  return out.length ? h("div", { class: "cc-report" }, out) : null;
}

/** A film that loops plays by itself, silently, while it is in view,
 * unless the visitor asked for less motion. */
export function watchFilms(root: HTMLElement, signal: AbortSignal, reduced: boolean) {
  const films = root.querySelectorAll<HTMLVideoElement>("video[data-cc-loop]");
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

/** Escape in a room whose screen is playing puts it away (block-stage
 * does that); it must not also take the visitor off the screen. A room is
 * playing when its toggle is pressed, or, for a Labbook piece (which has no
 * toggle), when its stage is showing a frame. Read in the capture phase,
 * before either listener on the document has run. */
export function holdEscape(el: HTMLElement, signal: AbortSignal) {
  let held: Event | undefined;
  el.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      const room = (event.target as Element | null)?.closest?.("[data-stage-room]");
      if (room?.querySelector("[data-block-toggle][aria-pressed='true'], [data-artifact-frame][data-live]")) held = event;
    },
    { signal, capture: true },
  );
  return (event: Event) => event === held;
}

