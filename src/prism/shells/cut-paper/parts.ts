/** Pieces every view is built from: the screen shell, the view header (a
 * DAW panel tab over a poster headline), lanes with year lines and a
 * playhead, clips, prose adopted from the server page, credits. */
import type { Route, SiteContent } from "../types";
import { h, link, markup, seeded, take, text, type Child } from "./dom";
import { FROM, NOW, place, share, YEARS } from "./timeline";
import type { Transport } from "./transport";

export interface Screen {
  el: HTMLElement;
  heading: HTMLElement;
}

/** Things worth remembering between routes (home's "currently" note). */
export interface Memory {
  current?: Element;
}

export interface Env {
  content: SiteContent;
  transport: Transport;
  memory: Memory;
  reducedMotion: boolean;
  face: boolean;
  /** Aborted when this screen leaves the view. */
  signal: AbortSignal;
}

export type Project = SiteContent["projects"][number];
export type LabItem = SiteContent["lab"][number];

export const BRAND = ["tomato", "plum", "mustard", "pine"] as const;

export function screen(kind: string, ...children: Child[]) {
  return h("div", { class: `cp-screen cp-screen--${kind}`, "data-screen": kind }, ...children);
}

export function heading(textContent: string, className: string, id?: string) {
  return h("h1", { class: className, tabindex: "-1", id }, textContent);
}

export const kicker = (...children: Child[]) => h("p", { class: "cp-kicker" }, ...children);

/** A torn / cut scrap of brand paper, decoration only. */
export const scrap = (colour: string, shape: string, extra = "") =>
  h("span", {
    class: `cp-scrap cp-scrap--${shape} ${extra}`.trim(),
    style: `--paper:var(--cp-${colour})`,
    "aria-hidden": "true",
  });

/** Number a container's children so they enter on successive sixteenths
 * (`step` 2 = eighths), starting `from` sixteenths in. */
export function bar(container: HTMLElement, step = 1, from = 0) {
  let i = from;
  for (const child of container.children) {
    if (!(child instanceof HTMLElement) || child.classList.contains("cp-scrap")) continue;
    child.dataset.beat = "";
    child.style.setProperty("--i", String(i));
    i += step;
  }
  return container;
}

/** Scrub cloned server markup of things that would dangle in a new home. */
export function adopt<T extends DocumentFragment | Element>(fragment: T) {
  fragment.querySelectorAll("[aria-labelledby]").forEach((node) => node.removeAttribute("aria-labelledby"));
  fragment.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  return fragment;
}

export function prose(from: Element | null | undefined, extra = "") {
  if (!from) return null;
  return h("div", { class: `cp-prose ${extra}`.trim() }, adopt(take(from)));
}

/** The DAW panel header: a tab naming the view, then the page's own
 * eyebrow, headline and intro from the server page. */
export function viewHead(
  route: Route,
  view: string,
  fallback: { eyebrow: string; title: string },
  ...extra: Child[]
) {
  const main = route.main;
  const title = text(main.querySelector("h1")) || fallback.title;
  const intro = text(main.querySelector(".page-header__intro"));
  const h1 = heading(title, "cp-vh__title");
  const head = h(
    "header",
    { class: "cp-vh" },
    h(
      "p",
      { class: "cp-vh__tab" },
      h("span", { class: "cp-vh__view" }, view),
      h("span", { class: "cp-vh__eyebrow" }, text(main.querySelector(".page-header__eyebrow")) || fallback.eyebrow),
    ),
    h1,
    intro ? h("p", { class: "cp-vh__intro" }, intro) : null,
    ...extra,
  );
  return { h1, head: bar(head, 1) };
}

/** A little piano roll, seeded by name, drawn in ink on a clip. */
export function roll(seed: string, steps = 32) {
  const random = seeded(seed);
  let rects = "";
  for (let step = 0; step < steps; ) {
    const length = 1 + Math.floor(random() * 3);
    if (random() > 0.28) {
      const degree = Math.floor(random() * 7);
      rects += `<rect x="${step}" y="${6 - degree}" width="${Math.max(length - 0.25, 0.6)}" height="0.8"/>`;
    }
    step += length;
  }
  return markup(
    `<svg class="cp-roll" viewBox="0 0 ${steps} 7" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>`,
  );
}

/** The year grid and the "unwritten" future, behind a lane's clips. */
export const laneGrid = () => [
  YEARS.map((year) => h("i", { class: "cp-lane__year", style: `--at:${place(year)}` })),
  h("span", { class: "cp-future", style: `--at:${place(NOW)}` }),
];

/** A playhead riding a lane: a lane-wide run whose right edge is the line,
 * moved with one transform per frame. */
export function run(transport: Transport, signal: AbortSignal) {
  const el = h("span", { class: "cp-run", "aria-hidden": "true" }, h("span", { class: "cp-run__head" }));
  transport.playhead(el, signal);
  return el;
}

/** The ruler: years as bars, months as beats, and "now". */
export function ruler(transport: Transport, signal: AbortSignal, corner: Child) {
  const months: HTMLElement[] = [];
  for (let m = Math.ceil(FROM * 12); m < YEARS[YEARS.length - 1] * 12 + 12; m += 1) {
    if (m % 12 === 0) continue;
    months.push(h("i", { class: "cp-ruler__month", style: `--at:${place(m / 12)}` }));
  }
  return h(
    "div",
    { class: "cp-ruler", "aria-hidden": "true" },
    h("span", { class: "cp-ruler__corner" }, corner),
    h(
      "span",
      { class: "cp-lane cp-lane--ruler" },
      months,
      YEARS.map((year) =>
        h("span", { class: "cp-ruler__year", style: `--at:${place(year)}` }, h("b", null, String(year))),
      ),
      h("span", { class: "cp-future", style: `--at:${place(NOW)}` }),
      h("span", { class: "cp-ruler__now", style: `--at:${place(NOW)}` }, "now"),
      run(transport, signal),
    ),
  );
}

/** A clip placed in time on a lane. */
export function clipStyle(start: number, end: number, note: string) {
  return `--at:${place(start)}; --len:${Math.max(share(end - start), 0.008)}; --note:${note}`;
}

export function credits(rows: [string, string | undefined, string?][], extra = "") {
  return h(
    "dl",
    { class: `cp-credits ${extra}`.trim() },
    rows
      .filter(([, value]) => value)
      .map(([term, value, daw]) =>
        h(
          "div",
          { class: "cp-credits__row" },
          h("dt", null, term, daw ? h("small", { "aria-hidden": "true" }, daw) : null),
          h("dd", null, value ?? ""),
        ),
      ),
  );
}

export const buttons = (items: { label: string; url: string }[], extra = "") =>
  items.length
    ? h(
        "ul",
        { class: `cp-buttons ${extra}`.trim() },
        items.map((item, index) =>
          h("li", null, link(item.url, { class: index === 0 ? "cp-btn cp-btn--lit" : "cp-btn" }, item.label)),
        ),
      )
    : null;

export const chips = (items: { label: string; url: string }[], label?: string) =>
  h(
    "ul",
    { class: "cp-chips", "aria-label": label },
    items.map((item) => h("li", null, link(item.url, { class: "cp-chipbtn" }, item.label))),
  );

/** A knob with a ring arc (EmotiTone's hardware knob), decoration. */
export function knob(value: number, label: string, readout = "") {
  const sweep = 270;
  const angle = -135 + value * sweep;
  const arc = (from: number, to: number) => {
    const r = 15;
    const p = (a: number) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return `${(20 + r * Math.cos(rad)).toFixed(2)} ${(20 + r * Math.sin(rad)).toFixed(2)}`;
    };
    return `M${p(from)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${p(to)}`;
  };
  return h(
    "span",
    { class: "cp-knob", style: `--turn:${angle}deg`, "aria-hidden": "true" },
    markup(
      `<svg viewBox="0 0 40 40"><path class="cp-knob__track" d="${arc(-135, 135)}"/><path class="cp-knob__value" d="${arc(-135, Math.max(angle, -134))}"/><g class="cp-knob__cap"><circle cx="20" cy="20" r="10"/><path d="M20 20 V11"/></g></svg>`,
    ),
    h("span", { class: "cp-knob__readout" }, readout),
    h("span", { class: "cp-knob__label" }, label),
  );
}
