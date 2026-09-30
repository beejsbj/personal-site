/** Shared furniture for every Calling Card screen: the screen contract, the
 * L1/R1 section tabs, the Back prompt and the controller-button hints. */
import type { Route, SiteContent } from "../types";
import { h, ransom } from "./dom";

export interface Env {
  content: SiteContent;
  face: boolean;
  reducedMotion: boolean;
  signal: AbortSignal;
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

export const TABS = [
  { id: "projects", label: "Projects", href: "/projects" },
  { id: "lab", label: "Lab", href: "/lab" },
  { id: "about", label: "About", href: "/about" },
  { id: "resume", label: "Status", href: "/resume" },
] as const;

export function tabFor(kind: Route["kind"]) {
  if (kind === "project" || kind === "projects") return "projects";
  if (kind === "lab" || kind === "lab-entry") return "lab";
  if (kind === "about" || kind === "resume") return kind;
  return undefined;
}

/** The L1 / R1 tab strip across the top of every inner screen. */
export function tabs(kind: Route["kind"]) {
  const current = tabFor(kind);
  const index = TABS.findIndex((tab) => tab.id === current);
  const prev = TABS[(index - 1 + TABS.length) % TABS.length];
  const next = TABS[(index + 1) % TABS.length];
  return h(
    "nav",
    { class: "cc-tabs", "aria-label": "Sections" },
    h(
      "a",
      {
        class: "cc-tabs__shoulder",
        href: index < 0 ? TABS[TABS.length - 1].href : prev.href,
        "data-cc-title": index < 0 ? TABS[TABS.length - 1].label : prev.label,
        "aria-label": `Previous section: ${index < 0 ? TABS[TABS.length - 1].label : prev.label}`,
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
              "data-cc-title": tab.label,
              "aria-current": tab.id === current ? "page" : null,
              "data-state": tab.id === current ? "current" : "idle",
            },
            tab.label,
          ),
        ),
      ),
    ),
    h(
      "a",
      {
        class: "cc-tabs__shoulder",
        href: index < 0 ? TABS[0].href : next.href,
        "data-cc-title": index < 0 ? TABS[0].label : next.label,
        "aria-label": `Next section: ${index < 0 ? TABS[0].label : next.label}`,
      },
      h("kbd", {}, "E"),
    ),
  );
}

/** The Back prompt: a real link to the parent screen. */
export function backLink(href: string, label: string) {
  return h(
    "a",
    { class: "cc-back", href, "data-cc-title": label },
    h("span", { class: "cc-back__key", "aria-hidden": "true" }, "Esc"),
    h("span", { class: "cc-back__label" }, "Back"),
    h("span", { class: "cc-sr" }, ` to ${label}`),
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
export function screenTitle(text: string, sub?: string, eyebrow?: string) {
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
    sub ? h("p", { class: "cc-titleblock__sub" }, sub) : null,
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

/** Read the text of a Daylight element, trimmed. */
export const text = (node: Element | null | undefined) =>
  node?.textContent?.replace(/\s+/g, " ").trim() ?? "";

export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** Arrow-key roving over a list of links, with hover selecting too. */
export function roving(
  items: HTMLElement[],
  signal: AbortSignal,
  onSelect: (index: number) => void,
  initial = 0,
) {
  let current = -1;
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
    const step = { ArrowDown: 80, ArrowUp: -80, PageDown: 0.85, PageUp: -0.85 }[event.key];
    if (step === undefined) return false;
    const top = Math.abs(step) < 1 ? step * column.clientHeight : step;
    column.scrollBy({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    return true;
  };
}
