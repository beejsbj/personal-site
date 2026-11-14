/** What every screen is hung with: the few ways a thing is put on thread,
 * shared by the screens (screens.ts), an entry's draft (blocks.ts) and the
 * Labbook (labbook.ts). The markup only says what is what (weave.ts reads
 * the attributes); the loom and the ink draw it. */
import type { Media } from "../types";
import { h, link } from "./dom";

export type Child = Node | string | null | false | undefined;
export type Attrs = Record<string, string | undefined>;

let seed = 100;
export const nextSeed = () => String((seed = (seed * 31 + 7) % 9973));
/** Every screen is hung with the same seeds, so it is drawn the same each
 * time it is built. */
export const resetSeeds = () => {
  seed = 100;
};

/** Something that hangs on its own thread(s), revealed as the drawing
 * reaches it. */
export function hung<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  type: "drop" | "pair" | "pull" | "tassel" | "sign" | "tally",
  attrs: Attrs,
  ...children: (Child | Child[])[]
) {
  return h(
    tag,
    {
      ...attrs,
      "data-ink": type,
      "data-seed": nextSeed(),
      "data-reveal": "",
    },
    ...children,
  );
}

/** A pull-cord link: a thread with a knot you can tug. */
export function pullLink(
  href: string,
  label: string,
  hue: "c" | "m" = "c",
  attrs: Attrs = {},
) {
  return hung(
    "p",
    "pull",
    { ...attrs, class: "hion-pullcord", "data-hue": hue },
    link(href, { class: "hion-pullcord__link" }, label),
  );
}

export function loop(
  attrs: Record<string, string | undefined>,
  ...children: (Child | Child[])[]
) {
  return h(
    "section",
    {
      ...attrs,
      class: `hion-loop ${attrs.class ?? ""}`.trim(),
      "data-spine": "loop",
    },
    ...children,
  );
}

export function strung(
  level: "h2" | "h3",
  id: string | undefined,
  ...children: (Child | Child[])[]
) {
  return h(
    level,
    { class: "hion-strung", id, "data-weft": "", "data-reveal": "" },
    h(
      "span",
      { class: "hion-strung__box" },
      h("span", { class: "hion-strung__chalk" }, ...children),
    ),
  );
}

/** String an existing heading on a weft. */
export function stringHeading(heading: Element) {
  heading.classList.add("hion-strung");
  heading.setAttribute("data-weft", "");
  const chalk = h("span", { class: "hion-strung__chalk" });
  chalk.append(...heading.childNodes);
  heading.append(h("span", { class: "hion-strung__box" }, chalk));
}

/** Where the two hions are tied together on their way down: a station
 * (weave.ts) they meet at and part from again. Something tied on beside it
 * (`data-tie`) is tied to the knot by a short thread. */
export const knotPoint = (cls = "") =>
  h("span", { class: `hion-knot ${cls}`.trim(), "data-spine": "knot", "aria-hidden": "true" });

/** Which side of the hions an entry on them is tied on, by turns. */
export const side = (i: number): Attrs => ({ "data-side": i % 2 ? "l" : "r", "data-hue": i % 2 ? "m" : "c" });

/** An entry knotted on the hions' way down (laid out by `.hion-tied`,
 * on its `side`): the knot, and the entry tied on beside it, its date (if
 * it has one) written level with the knot, the title under it. */
export function knotted(date: Child, attrs: Attrs, ...tied: Child[]): Child[] {
  return [
    knotPoint(),
    h(
      "div",
      { ...attrs, class: "hion-tie hion-tied__block", "data-tie": "" },
      date ? h("p", { class: "hion-tied__date hion-meta" }, date) : null,
      tied,
    ),
  ];
}

/** A picture (or a film) hung on two threads, its corners wound. Duotone in
 * the hion colours; its own colours come back when you reach for it. */
export function picture(
  media: Pick<Media, "type" | "src" | "alt">,
  hue: "c" | "m",
  attrs: Attrs = {},
  caption?: Child,
  hangs = true,
) {
  const shown =
    media.type === "video"
      ? h(
          "video",
          { controls: true, muted: true, playsinline: true, preload: "metadata" },
          h("source", { src: media.src }),
        )
      : h("img", { src: media.src, alt: media.alt ?? "", loading: "lazy", decoding: "async" });
  const children = [
    h("span", { class: "hion-picture__frame" }, shown),
    caption ? h("figcaption", { class: "hion-picture__caption" }, caption) : null,
  ];
  const cls = `hion-picture ${attrs.class ?? ""}`.trim();
  return hangs
    ? hung("figure", "pair", { ...attrs, class: cls, "data-hue": hue }, children)
    : h("figure", { ...attrs, class: cls, "data-hue": hue }, children);
}

export const image = (src: string, alt = ""): Pick<Media, "type" | "src" | "alt"> => ({
  type: "image",
  src,
  alt,
});

/** The place stitched out in the cloth for something to play, and the
 * cord that plays it there (src/lib/block-stage.ts): nothing is asked of
 * its site until the cord is pulled, when its frame takes the place whole.
 * The cord's words change as it is pulled, so they are chalk, not written
 * by thread (the thread writes a label once). The place and its cord go
 * in one `[data-stage-room]`, which Escape puts it away from. */
export function kept(
  id: string,
  options: {
    title: string;
    hue: "c" | "m";
    poster?: string;
    ratio?: string;
    load: string;
    close: string;
    note?: string;
    subject?: string;
    loading?: string;
    data: Record<string, string | undefined>;
  },
) {
  const { title, hue, poster, ratio, load, close, note, subject, loading, data } = options;
  const place = h(
    "div",
    {
      class: "hion-kept hion-stage",
      id,
      style: ratio ? `aspect-ratio:${ratio.replace("/", " / ")}` : undefined,
      "data-block-stage": "",
      "data-title": title,
      "data-loading": loading,
      ...data,
    },
    poster
      ? picture(image(poster), hue, { class: "hion-kept__poster" }, null, false)
      : h("p", { class: "hion-kept__label" }, title),
  );
  const cord = hung(
    "p",
    "pull",
    { class: "hion-cord", "data-hue": hue },
    h(
      "button",
      {
        type: "button",
        class: "hion-cord__pull",
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
  );
  return {
    place,
    cord,
    note: note ? h("p", { class: "hion-kept__note" }, note) : null,
    // Where the stage says it is loading: beside the place (block-stage
    // looks for it in the place's parent), heard, not seen.
    status: h("span", { class: "hion-sr block-stage__status", role: "status" }),
  };
}
