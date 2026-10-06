/** Shared furniture for every Calling Card screen: the screen contract, the
 * L1/R1 section tabs, the Back prompt and the controller-button hints. */
import type { Route, SiteContent } from "../types";
import { part } from "../../parts";
import { fill } from "../rich";
import { h, ransom } from "./dom";

/** The lens's own words, from src/content/lenses/calling-card.json. */
export type Copy = SiteContent["lenses"]["calling-card"];
export const copyOf = (content: SiteContent): Copy => content.lenses["calling-card"];

export interface Env {
  content: SiteContent;
  face: boolean;
  reducedMotion: boolean;
  signal: AbortSignal;
  /** True while this page is an off-axis prism face; JS loops should rest. */
  isIdle(): boolean;
  /** Open an in-shell panel (the phone, the calling card). */
  open(panel: "phone" | "card", opener?: HTMLElement): void;
}

export interface Screen {
  /** The screen's root; a `<main>` lives inside. */
  el: HTMLElement;
  /** Receives focus after a route change. */
  heading: HTMLElement;
  /** The Back prompt, clicked by Esc / Backspace. */
  back?: HTMLAnchorElement;
  /** Screen-specific keys. Return true when handled. */
  onKey?(event: KeyboardEvent): boolean;
  destroy?(): void;
}

export type ScreenFactory = (route: Route, env: Env) => Screen;

/** The sections the L1/R1 tabs cycle through, in order. */
export const TABS = [
  { id: "projects", kind: "projects", href: "/projects" },
  { id: "lab", kind: "lab", href: "/lab" },
  { id: "about", kind: "about", href: "/about" },
  { id: "resume", kind: "resume", href: "/resume" },
  { id: "writing", kind: "writing", href: "/writing" },
] as const;

export function tabFor(kind: Route["kind"]) {
  if (kind === "project" || kind === "projects") return "projects";
  if (kind === "lab" || kind === "lab-entry") return "lab";
  if (kind === "writing" || kind === "writing-entry") return "writing";
  if (kind === "about" || kind === "resume") return kind;
  return undefined;
}

/** The L1 / R1 tab strip across the top of every inner screen. */
export function tabs(kind: Route["kind"], copy: Copy) {
  const current = tabFor(kind);
  const index = TABS.findIndex((tab) => tab.id === current);
  const label = (tab: (typeof TABS)[number]) => copy.sections[tab.kind];
  const prev = index < 0 ? TABS[TABS.length - 1] : TABS[(index - 1 + TABS.length) % TABS.length];
  const next = index < 0 ? TABS[0] : TABS[(index + 1) % TABS.length];
  return h(
    "nav",
    { class: "cc-tabs", "aria-label": copy.chrome.tabs },
    h(
      "a",
      {
        class: "cc-tabs__shoulder",
        href: prev.href,
        "data-cc-title": label(prev),
        "aria-label": fill(copy.chrome.previous, { label: label(prev) }),
      },
      h("kbd", {}, "Q"),
    ),
    h(
      "ul",
      {},
      TABS.map((tab) =>
        h(
          "li",
          {},
          h(
            "a",
            {
              class: "cc-tabs__tab",
              href: tab.href,
              "data-cc-title": label(tab),
              "aria-current": tab.id === current ? "page" : null,
              "data-state": tab.id === current ? "current" : "idle",
            },
            label(tab),
          ),
        ),
      ),
    ),
    h(
      "a",
      {
        class: "cc-tabs__shoulder",
        href: next.href,
        "data-cc-title": label(next),
        "aria-label": fill(copy.chrome.next, { label: label(next) }),
      },
      h("kbd", {}, "E"),
    ),
  );
}

/** The Back prompt: a real link to the parent screen. */
export function backLink(copy: Copy, href: string, label: string) {
  return h(
    "a",
    { class: "cc-back", href, "data-cc-title": label },
    h("span", { class: "cc-back__key", "aria-hidden": "true" }, "Esc"),
    h("span", { class: "cc-back__label" }, copy.chrome.back),
    h("span", { class: "cc-sr" }, " ", fill(copy.chrome.backTo, { label })),
  );
}

/** Controller hints, bottom right, like "✕ Back  ○ Confirm". */
export function prompts(items: [key: string, label: string][]) {
  return h(
    "p",
    { class: "cc-prompts", "aria-hidden": "true" },
    items.map(([key, label]) =>
      h(
        "span",
        { class: "cc-prompts__item" },
        h("kbd", {}, key),
        h("span", {}, label),
      ),
    ),
  );
}

/** A big ransom-note screen title with a subtitle plate. */
export function screenTitle(text: string, sub?: string, eyebrow?: string, page?: string) {
  const heading = h(
    "h1",
    { class: "cc-title", tabindex: "-1" },
    ransom(text, { boxes: 0.22 }),
  );
  const wrap = h(
    "header",
    { class: "cc-titleblock" },
    eyebrow ? h("p", { class: "cc-titleblock__eyebrow" }, eyebrow) : null,
    heading,
    sub ? h("p", { class: "cc-titleblock__sub", ...(page ? part("page.title", page) : {}) }, sub) : null,
  );
  return { wrap, heading };
}

/** Build the common skeleton: `<div screen><nav tabs/><main/>…</div>`. */
export function frame(kind: Route["kind"], className: string) {
  const main = h("main", { class: "cc-main", id: "cc-main", tabindex: "-1" });
  const el = h(
    "div",
    { class: `cc-screen ${className}`, "data-screen": kind },
    h("div", { class: "cc-screen__bg", "aria-hidden": "true" }),
    main,
  );
  return { el, main };
}

/** The verb on a link card, read from where the link goes (never from
 * where it sits in the list). */
export function linkVerb(copy: Copy, url: string) {
  const { verbs } = copy.chrome;
  if (/github\.com|gitlab\.com/i.test(url)) return verbs.code;
  if (/codepen\.io/i.test(url)) return verbs.pen;
  if (/substack\.com|medium\.com|dev\.to/i.test(url)) return verbs.read;
  if (/(youtube\.com|youtu\.be|vimeo\.com)/i.test(url)) return verbs.watch;
  if (/^mailto:/i.test(url)) return verbs.write;
  return verbs.visit;
}

/** The text of an element, whitespace collapsed. */
export const text = (node: Element | null | undefined) =>
  node?.textContent?.replace(/\s+/g, " ").trim() ?? "";

export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** The touch confirm cue: on a touch screen the first tap only selects, so
 * the selected item says plainly that a second tap opens it. Hidden unless
 * the last input was a touch (see `.cc-root[data-input]`). */
export function tapCue(label: string) {
  return h(
    "span",
    { class: "cc-tapcue", "aria-hidden": "true" },
    h("span", { class: "cc-tapcue__key" }, "▶"),
    h("span", { class: "cc-tapcue__label" }, label),
  );
}

/** Arrow-key roving over a list of links, with hover selecting too.
 *
 * Touch has no hover to aim with, so a tap plays the game's two beats: the
 * first tap on an item selects it (the full selection, the detail updates)
 * and a second tap on the selected item confirms it. Mouse clicks, keyboard
 * Enter and assistive-tech activation (no touch pointerdown) open at once. */
export function roving(
  items: HTMLElement[],
  signal: AbortSignal,
  onSelect: (index: number) => void,
  initial = 0,
) {
  let current = -1;
  // The item a touch went down on, and whether it was already selected then
  // (before any focus the tap causes has moved the selection).
  let armed: { index: number; wasSelected: boolean } | undefined;
  const select = (index: number, focus = false) => {
    const next = (index + items.length) % items.length;
    if (next !== current) {
      current = next;
      items.forEach((item, i) =>
        item.setAttribute("data-state", i === next ? "selected" : "idle"),
      );
      onSelect(next);
    }
    if (focus) items[next].focus({ preventScroll: false });
  };
  items.forEach((item, i) => {
    item.addEventListener(
      "pointerenter",
      (event) => {
        if (event.pointerType !== "mouse") return;
        select(i);
        if (item.closest("[inert]")) return;
        item.focus({ preventScroll: true });
      },
      { signal },
    );
    item.addEventListener("focus", () => select(i), { signal });
    item.addEventListener(
      "pointerdown",
      (event) => {
        armed =
          event.pointerType === "mouse"
            ? undefined
            : { index: i, wasSelected: current === i };
      },
      { signal },
    );
    item.addEventListener(
      "click",
      (event) => {
        const tap = armed?.index === i ? armed : undefined;
        armed = undefined;
        if (!tap || tap.wasSelected) return;
        // First tap: select only. Listeners that open things check
        // defaultPrevented; links and the router see nothing.
        event.preventDefault();
        event.stopPropagation();
        select(i);
      },
      { signal },
    );
  });
  select(initial);
  return {
    get index() {
      return current;
    },
    select,
    key(event: KeyboardEvent, axis: "y" | "both" = "y") {
      const prev =
        event.key === "ArrowUp" || (axis === "both" && event.key === "ArrowLeft");
      const next =
        event.key === "ArrowDown" ||
        (axis === "both" && event.key === "ArrowRight");
      if (prev || next) {
        select(current + (prev ? -1 : 1), true);
        return true;
      }
      if (event.key === "Home" || event.key === "End") {
        select(event.key === "Home" ? 0 : items.length - 1, true);
        return true;
      }
      if (
        (event.key === "Enter" || event.key === " ") &&
        !(document.activeElement instanceof HTMLAnchorElement) &&
        !(document.activeElement instanceof HTMLButtonElement)
      ) {
        items[current].click();
        return true;
      }
      return false;
    },
  };
}

/** Arrow / Page keys scroll a column when focus sits outside it, so the
 * heading can hold focus while the body scrolls like a game log. */
export function scrollKeys(column: HTMLElement) {
  return (event: KeyboardEvent) => {
    if (column.contains(document.activeElement)) return false;
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (event.key === "Home" || event.key === "End") {
      column.scrollTo({ top: event.key === "Home" ? 0 : column.scrollHeight, behavior });
      return true;
    }
    const step = { ArrowDown: 80, ArrowUp: -80, PageDown: 0.85, PageUp: -0.85 }[event.key];
    if (step === undefined) return false;
    const top = Math.abs(step) < 1 ? step * column.clientHeight : step;
    column.scrollBy({ top, behavior });
    return true;
  };
}
