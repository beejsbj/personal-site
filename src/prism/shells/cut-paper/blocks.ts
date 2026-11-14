/** A page told with its blocks, as this session tells it: the story of how
 * something was made is an arrangement read down the page.
 *
 * Down its left runs a ruler, and each chapter (an `h2` of its prose) is a
 * locator on it, numbered in order. A playhead rides the ruler as the page
 * is read, and the chapter it is in lights, as a clip does under the
 * playhead; it is for the eye alone. The page is laid out as spreads and
 * plates (`arrangeBlocks`). A spread is words, with the small blocks after
 * them in its margin when the story is wide enough, under them when not:
 * a quote is a scrap of paper torn out and pasted down, code is the
 * console, files are the browser's places and a sound is an audio clip.
 * A plate runs across the story: a gallery is a chop, its pictures the
 * slices of one sample; a compare is the A/B of a plug-in, both states
 * side by side; steps are a step sequencer; something live and a model
 * are a plug-in's window, which plays only when its power is pressed
 * (src/lib/block-stage.ts, shared with the other lenses), and a film is
 * the video window. A kind of block this lens has not heard of is passed
 * over. */
import "../../../lib/block-stage";
import { arrangeBlocks, quoteDateLabel } from "../../../lib/blocks";
import { type Part, blockRef, markPart } from "../../parts";
import { inline, plain } from "../rich";
import type { Block, Picture, SiteContent, TreeNode } from "../types";
import { noteVar, prose, type Env } from "./bits";
import { h } from "./dom";

type Told = Exclude<Block, { type: "text" }>;
type Copy = SiteContent["site"]["blocks"];

/** A caption's inline markdown. Its links are plain: a block's words are
 * read as they are written. */
const words = (source: string) => inline(source);
/** What a piece of media is, in plain words. */
const named = (media: { alt?: string; caption?: string }) => media.alt ?? plain(media.caption ?? "");

function caption(text?: string) {
  return text ? h("figcaption", { class: "cp-block__caption" }, words(text)) : null;
}

/** A film starts silent. The `muted` attribute only says so to a film the
 * page's own markup made; one made here is told directly. */
function silent(film: HTMLVideoElement) {
  film.muted = true;
  return film;
}

const picture = (shown: Picture, cls: string) =>
  h("img", { class: cls, src: shown.src, alt: shown.alt ?? "", loading: "lazy", decoding: "async", width: shown.width, height: shown.height });

/** A plug-in's window: a bar with its light and its name, the screen it
 * plays on (its poster, or its name, until its power is pressed), and a
 * foot with the power, what pressing it promises and, for an embed, the
 * way to where it lives. Used on the list too, for an experiment that
 * plays where it is racked. */
export function device(
  id: string,
  options: {
    title: string;
    name?: string;
    poster?: string;
    ratio?: string;
    load: string;
    close: string;
    note: string;
    subject?: string;
    loading?: string;
    out?: { href: string; label: string };
    data: Record<string, string | undefined>;
    disabled?: boolean;
  },
) {
  const { title, name, poster, ratio, load, close, note, subject, loading, out, data, disabled } = options;
  return h(
    "div",
    { class: "cp-device", "data-stage-room": "" },
    name ? h("div", { class: "cp-device__bar" }, h("span", { class: "cp-device__led", "aria-hidden": "true" }), h("span", { class: "cp-device__name" }, name)) : null,
    h(
      "div",
      {
        class: "cp-device__screen",
        id,
        style: ratio ? `aspect-ratio:${ratio.replace("/", " / ")}` : undefined,
        "data-block-stage": "",
        "data-title": title,
        "data-loading": loading,
        ...data,
      },
      poster ? h("img", { class: "cp-device__poster", src: poster, alt: "", loading: "lazy", decoding: "async" }) : h("span", { class: "cp-device__label", "aria-hidden": "true" }, title),
    ),
    h(
      "div",
      { class: "cp-device__foot" },
      h(
        "button",
        {
          type: "button",
          class: "cp-power",
          "aria-pressed": "false",
          "aria-controls": id,
          "aria-label": subject ? `${load}: ${subject}` : undefined,
          "data-block-toggle": "",
          "data-load": load,
          "data-close": close,
          "data-subject": subject,
          disabled,
        },
        load,
      ),
      h("span", { class: "cp-device__note" }, note),
      out ? h("a", { class: "cp-device__out", href: out.href, target: "_blank", rel: "noreferrer" }, out.label, h("span", { "aria-hidden": "true" }, " ↗")) : null,
    ),
    h("span", { class: "cp-device__status block-stage__status", role: "status" }),
  );
}

/** The files of a tree, as the browser lists its places: a folder opens
 * onto the ones inside it. */
function files(nodes: TreeNode[]): HTMLElement {
  return h(
    "ul",
    { class: "cp-places__list" },
    nodes.map((node) =>
      h(
        "li",
        { "data-folder": node.name.endsWith("/") ? "" : null },
        h("span", { class: "cp-places__name" }, node.name),
        node.note ? h("span", { class: "cp-places__note" }, node.note) : null,
        node.children?.length ? files(node.children) : null,
      ),
    ),
  );
}

function block(env: Env, told: Told, slug: string, copy: Copy): HTMLElement | null {
  const mark = (el: HTMLElement) => {
    markPart(el, `block.${told.type}` as Part, blockRef(slug, told.name));
    el.classList.add("cp-block", `cp-block--${told.type}`);
    return el;
  };
  const stageId = `cp-block-${slug}-${told.name}`;
  const ab = env.copy.lab.ab;
  switch (told.type) {
    case "gallery":
      return mark(chop(told.items));
    case "compare":
      return mark(
        h(
          "figure",
          {},
          h(
            "div",
            { class: "cp-ab" },
            [told.before, told.after].map((side, i) =>
              h(
                "div",
                { class: "cp-ab__side", style: `--note:${noteVar(i ? 3 : 0)}` },
                h("span", { class: "cp-ab__key", "aria-hidden": "true" }, ab[i]),
                h("span", { class: "cp-ab__label" }, side.label ?? (i ? copy.compare.after : copy.compare.before)),
                picture(side, "cp-ab__img"),
              ),
            ),
          ),
          caption(told.caption),
        ),
      );
    case "embed":
      return mark(
        h(
          "figure",
          {},
          device(stageId, {
            title: named(told),
            name: named(told),
            poster: told.poster,
            ratio: told.ratio,
            load: copy.embed.load[told.kind],
            close: copy.embed.close,
            note: copy.embed.note,
            out: { href: told.src, label: copy.embed.open[told.kind] },
            data: { "data-frame": told.frame },
            disabled: env.face,
          }),
          caption(told.caption),
        ),
      );
    case "model":
      return mark(
        h(
          "figure",
          {},
          device(stageId, {
            title: named(told),
            name: named(told),
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
            disabled: env.face,
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
            { class: "cp-device cp-device--film" },
            h("div", { class: "cp-device__bar" }, h("span", { class: "cp-device__led", "aria-hidden": "true" }), h("span", { class: "cp-device__name" }, named(told))),
            h(
              "div",
              { class: "cp-device__screen" },
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
                    "data-cp-loop": told.loop ? "" : null,
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
          h(
            "div",
            { class: "cp-console" },
            h("div", { class: "cp-console__bar" }, h("span", { class: "cp-console__lang" }, told.language)),
            h(
              "pre",
              { tabindex: "0", "data-language": told.language },
              h("code", {}, told.code.trimEnd().split("\n").map((line) => h("span", { class: "cp-console__line" }, line, "\n"))),
            ),
          ),
          caption(told.caption),
        ),
      );
    case "quote":
      return mark(
        h(
          "figure",
          { class: "cp-torn" },
          h("blockquote", {}, told.text.split(/\n\s*\n/).map((paragraph) => h("p", {}, words(paragraph.trim())))),
          h(
            "figcaption",
            { class: "cp-torn__who" },
            h("cite", {}, told.source),
            told.date ? [", ", h("time", { datetime: told.date }, quoteDateLabel(told.date))] : null,
          ),
        ),
      );
    case "steps":
      return mark(
        h(
          "ol",
          { class: "cp-seq", "data-count": told.items.length },
          told.items.map((step, i) =>
            h(
              "li",
              { class: "cp-seq__step", style: `--note:${noteVar(i)}` },
              h("span", { class: "cp-seq__pad", "aria-hidden": "true" }, String(i + 1)),
              step.title ? h("p", { class: "cp-seq__title" }, step.title) : null,
              h("p", { class: "cp-seq__text" }, words(step.text)),
              step.image
                ? h("figure", { class: "cp-seq__image" }, picture(step.image, ""), step.image.caption ? h("figcaption", null, words(step.image.caption)) : null)
                : null,
            ),
          ),
        ),
      );
    case "tree":
      return mark(h("figure", {}, h("div", { class: "cp-places" }, files(told.tree)), caption(told.caption)));
    case "audio":
      return mark(
        h(
          "figure",
          { class: "cp-aclip" },
          told.caption || told.alt ? h("p", { class: "cp-aclip__name" }, words(told.caption ?? told.alt ?? "")) : null,
          h("audio", { controls: true, preload: "none", src: told.src, "aria-label": named(told) }),
        ),
      );
    default:
      return null;
  }
}

/** A chop: pictures as the slices of one sample, numbered along the top as
 * a sampler numbers its slices, the first the widest. A film among them
 * (an entry's own media) plays in its slice. */
export function chop(items: (Picture & { type?: "image" | "video" })[], attrs: Record<string, string | undefined> = {}) {
  return h(
    "div",
    { class: "cp-chop", "data-count": Math.min(items.length, 4), ...attrs },
    items.map((shown, i) =>
      h(
        "figure",
        { class: "cp-chop__slice", style: `--note:${noteVar(i + 1)}` },
        h("span", { class: "cp-chop__no", "aria-hidden": "true" }, String(i + 1)),
        shown.type === "video"
          ? silent(h("video", { src: shown.src, controls: true, muted: true, playsinline: true, preload: "metadata", "aria-label": shown.alt ?? "" }))
          : picture(shown, "cp-chop__img"),
        shown.caption ? h("figcaption", null, words(shown.caption)) : null,
      ),
    ),
  );
}

/** The story: the page's blocks as spreads and plates down a ruler, its
 * prose marked as the entry's body (an experiment's, or a project's).
 * With no blocks, its prose as one spread. `after` goes at its end (an
 * entry's own pictures). Nothing when there is nothing to tell. */
export function story(
  env: Env,
  slug: string,
  page: Block[],
  html: string,
  body: Extract<Part, "lab.body" | "project.body">,
  after?: HTMLElement | null,
) {
  const copy = env.content.site.blocks;
  const arranged = page.length ? arrangeBlocks(page) : html.trim() ? [{ kind: "spread" as const, text: { type: "text" as const, html }, asides: [] }] : [];
  const out = arranged.flatMap((piece) => {
    if (piece.kind === "plate") {
      const drawn = block(env, piece.block, slug, copy);
      return drawn ? [h("div", { class: "cp-plate" }, drawn)] : [];
    }
    const text = piece.text ? prose(piece.text.html) : null;
    if (text) markPart(text, body, slug);
    const asides = piece.asides.flatMap((told) => block(env, told, slug, copy) ?? []);
    if (!text && !asides.length) return [];
    return [
      h(
        "div",
        { class: "cp-spread", "data-asides": asides.length ? "" : null },
        text,
        asides.length ? h("div", { class: "cp-spread__margin" }, asides) : null,
      ),
    ];
  });
  if (after) out.push(h("div", { class: "cp-plate" }, after));
  if (!out.length) return null;
  const el = h(
    "section",
    { class: "cp-story" },
    h("div", { class: "cp-story__ruler", "aria-hidden": "true" }, h("span", { class: "cp-story__head" })),
    h("div", { class: "cp-story__body" }, out),
  );
  // each chapter a locator on the ruler, numbered in order
  el.querySelectorAll<HTMLElement>(".cp-prose h2").forEach((chapter, i) => {
    chapter.dataset.locator = String(i + 1);
    chapter.style.setProperty("--note", noteVar(i));
  });
  return el;
}

/** The story answering the reader: the playhead rides the ruler with the
 * page, and the chapter it is in lights; a film that loops plays by
 * itself, silently, while it is in view, unless the visitor asked for
 * less motion. Returns a fresh read of where the playhead is, for when
 * the view has arrived. */
export function tendStory(env: Env, root: HTMLElement) {
  const { scroller, signal, reducedMotion, face } = env;
  const el = root.querySelector<HTMLElement>(".cp-story");
  let reread = () => {};
  if (el && !face) {
    const chapters = [...el.querySelectorAll<HTMLElement>("h2[data-locator]")];
    let frame = 0;
    const read = () => {
      frame = 0;
      if (!el.isConnected) return;
      const view = scroller.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      // the reading line: a third of the way down the view
      const line = view.top + scroller.clientHeight / 3;
      const share = Math.min(Math.max((line - box.top) / Math.max(box.height, 1), 0), 1);
      el.style.setProperty("--read", share.toFixed(4));
      el.toggleAttribute("data-reading", line > box.top && line < box.bottom);
      const live = chapters.filter((chapter) => chapter.getBoundingClientRect().top <= line).at(-1);
      for (const chapter of chapters) chapter.toggleAttribute("data-live", chapter === live);
    };
    const ask = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    scroller.addEventListener("scroll", ask, { passive: true, signal });
    addEventListener("resize", ask, { passive: true, signal });
    signal.addEventListener("abort", () => cancelAnimationFrame(frame), { once: true });
    reread = ask;
  }
  const films = root.querySelectorAll<HTMLVideoElement>("video[data-cp-loop]");
  if (!films.length || reducedMotion || face) return reread;
  const seen = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const film = target as HTMLVideoElement;
      if (isIntersecting) film.play().catch(() => {});
      else film.pause();
    }
  });
  for (const film of films) seen.observe(film);
  signal.addEventListener("abort", () => seen.disconnect(), { once: true });
  return reread;
}

