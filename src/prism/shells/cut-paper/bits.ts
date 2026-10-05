/** Pieces every view shares: headings, page openings, prose, the drawn
 * motif of a clip, and a track's mute / solo / hear controls. */
import { part } from "../../parts";
import { fill, inline, rich, type LinkMaker } from "../rich";
import type { Header, SiteContent } from "../types";
import { h, link, markup, type Child } from "./dom";
import { noteName, type Note } from "./music";
import type { Clip, Session, TrackId } from "./score";
import type { Transport } from "./transport";

export type Copy = SiteContent["lenses"]["cut-paper"];

export interface Env {
  content: SiteContent;
  copy: Copy;
  session: Session;
  transport: Transport;
  signal: AbortSignal;
  face: boolean;
  reducedMotion: boolean;
  /** The view's scroller and the layer over it (for the phone playhead). */
  scroller: HTMLElement;
  overlay: HTMLElement;
}

export interface Screen {
  el: HTMLElement;
  heading: HTMLElement;
}

/** Solfège colours, one per scale degree, used for whatever is musical. */
const NOTE_IDS = ["do", "re", "mi", "fa", "sol", "la", "ti"] as const;
export const noteVar = (index: number) => `var(--cp-${NOTE_IDS[((index % 7) + 7) % 7]})`;

export function screen(kind: string, ...children: Child[]) {
  return h("div", { class: `cp-screen cp-screen--${kind}`, "data-screen": kind }, ...children);
}

export function heading(text: string, className: string, partName?: Parameters<typeof part>[0], ref?: string) {
  return h("h1", { class: className, tabindex: "-1", ...(partName ? part(partName, ref) : {}) }, text);
}

/** A page's opening, from its header in content. */
export function pageHead(header: Header, id: string, label: string) {
  const h1 = heading(header.title, "cp-head__title", "page.title", id);
  return {
    h1,
    head: h(
      "header",
      { class: "cp-head" },
      h(
        "p",
        { class: "cp-head__kicker" },
        h("span", { class: "cp-tag" }, label),
        header.eyebrow ? h("span", part("page.eyebrow", id), header.eyebrow) : null,
      ),
      h1,
      header.intro ? h("p", { class: "cp-head__intro", ...part("page.intro", id) }, header.intro) : null,
    ),
  };
}

/** Strip ids and label references from cloned markup. */
export function adopt<T extends DocumentFragment | Element>(fragment: T) {
  fragment.querySelectorAll("[aria-labelledby]").forEach((node) => node.removeAttribute("aria-labelledby"));
  fragment.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  return fragment;
}

export const makeLink: LinkMaker = (href, children) => link(href, {}, ...children);

export function prose(html: string, attrs: Record<string, string | undefined> = {}) {
  if (!html.trim()) return null;
  return h("div", { class: "cp-prose", ...attrs }, adopt(rich(html)));
}

export const inlineCopy = (source: string) => inline(source, makeLink);

export function buttons(items: { label: string; url: string }[], attrs: Record<string, string | undefined> = {}) {
  return items.length
    ? h(
        "ul",
        { class: "cp-buttons", ...attrs },
        items.map((item, index) =>
          h("li", null, link(item.url, { class: index === 0 ? "cp-btn cp-btn--lit" : "cp-btn" }, item.label)),
        ),
      )
    : null;
}

/** The notes of a clip, drawn: x is eighths, y is pitch. Exactly what the
 * clip plays. */
export function roll(notes: Note[], eighths = 6, className = "cp-roll") {
  if (!notes.length) return null;
  const degrees = notes.map((n) => n.degree);
  const low = Math.min(...degrees) - 1;
  const high = Math.max(...degrees) + 1;
  const rows = high - low + 1;
  const rects = notes
    .map(
      (n) =>
        `<rect x="${n.at + 0.06}" y="${high - n.degree}" width="${Math.max(n.length - 0.12, 0.4)}" height="0.86" rx="0.12"/>`,
    )
    .join("");
  return markup(
    `<svg class="${className}" viewBox="0 0 ${eighths} ${rows}" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>`,
  );
}

/** "A C D B♭": a motif in words, for screen readers and labels. */
export const spell = (notes: Note[]) => notes.map((n) => noteName(n.degree)).join(" ");

/** Mute and solo for a track, written to the transport, and (when a clip is
 * given) a button that auditions it. */
export function trackControls(
  env: Env,
  track: TrackId,
  name: string,
  row: HTMLElement,
  clip?: Clip,
  target: HTMLElement = row,
) {
  const { transport, copy, signal } = env;
  const words = copy.tracks;
  const mute = h("button", { type: "button", class: "cp-ms cp-ms--mute", "aria-pressed": "false", "aria-label": fill(words.mute, { name }), title: fill(words.mute, { name }) }, "M");
  const solo = h("button", { type: "button", class: "cp-ms cp-ms--solo", "aria-pressed": "false", "aria-label": fill(words.solo, { name }), title: fill(words.solo, { name }) }, "S");
  mute.addEventListener("click", () => transport.toggleMute(track), { signal });
  solo.addEventListener("click", () => transport.toggleSolo(track), { signal });
  transport.onMix(() => {
    mute.setAttribute("aria-pressed", String(transport.muted.has(track)));
    solo.setAttribute("aria-pressed", String(transport.soloed.has(track)));
    row.toggleAttribute("data-silent", !transport.audible(track));
  }, signal);
  const hear = clip ? hearButton(env, clip, name, target) : null;
  return h("span", { class: "cp-ms-group" }, hear, mute, solo);
}

/** Auditioning a clip: the sound (if on) and the clip's own little
 * playhead running across its notes, so it reads even with sound off. */
export function auditionClip(env: Env, clip: Clip, el: HTMLElement) {
  if (env.face) return;
  env.transport.audition(clip);
  const seconds = clip.kind === "project" ? (clip.end - clip.start) * 3 : 1.5;
  el.style.setProperty("--hear", `${seconds}s`);
  el.removeAttribute("data-hearing");
  void el.offsetWidth;
  el.setAttribute("data-hearing", "");
  window.setTimeout(() => el.removeAttribute("data-hearing"), seconds * 1000 + 80);
}

export function hearButton(env: Env, clip: Clip, name: string, target: HTMLElement) {
  const label = fill(env.copy.tracks.hear, { name });
  const button = h(
    "button",
    { type: "button", class: "cp-hear", "aria-label": label, title: label },
    markup('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.5v11L13 8z"/></svg>'),
  );
  button.addEventListener("click", () => auditionClip(env, clip, target), { signal: env.signal });
  return button;
}

/** Hovering (a mouse, not a finger) or focusing an element auditions the
 * clip, after a beat's hesitation so sweeping across clips stays quiet. */
export function hoverAudition(env: Env, el: HTMLElement, clip: Clip, target = el) {
  if (env.face) return;
  let timer = 0;
  const start = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => auditionClip(env, clip, target), 110);
  };
  const cancel = () => window.clearTimeout(timer);
  el.addEventListener("pointerenter", (event) => event.pointerType === "mouse" && start(), { signal: env.signal });
  el.addEventListener("pointerleave", cancel, { signal: env.signal });
  el.addEventListener("focus", start, { signal: env.signal });
  el.addEventListener("blur", cancel, { signal: env.signal });
}

/** Number children so they enter on successive sixteenths. */
export function bar(container: HTMLElement, step = 1, from = 0) {
  let i = from;
  for (const child of container.children) {
    if (!(child instanceof HTMLElement)) continue;
    child.dataset.beat = "";
    child.style.setProperty("--i", String(i));
    i += step;
  }
  return container;
}

/** A torn scrap of brand paper, decoration only. */
export const scrap = (colour: string, shape: string, extra = "") =>
  h("span", { class: `cp-scrap cp-scrap--${shape} ${extra}`.trim(), style: `--paper:var(--cp-${colour})`, "aria-hidden": "true" });
