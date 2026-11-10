/** The Lab, answering the visitor: what the Labbook and the reel
 * (screens.ts) do when they are reached for.
 *
 * - A Pen or a demo is asked of its own site only when its cord is pulled:
 *   the frame is made then, in the place kept for it, and takes the focus.
 *   Until then the page has asked nothing of anyone else.
 * - The reel rests for the keyboard. Its thread stops at its start in CSS;
 *   resting, the strip may scroll, so the headline in focus is brought into
 *   view wherever on the thread it lies, and when focus leaves the strip
 *   goes back to its start before the thread runs on.
 * - A link to an update (`/lab#u-…`, from a headline, the home stream or an
 *   experiment's page) lands on its knot in the Labbook: the drawing
 *   catches up to it and a bead of light rests on the knot (shell.css
 *   `data-landed`). The page under the shell holds the same ids, hidden,
 *   so the browser's own landing cannot be relied on. */
import { h } from "./dom";

interface Options {
  signal: AbortSignal;
  /** Light the page down to this far (px from its top). */
  catchUp(to: number): void;
  /** Nothing moves: arrive at once. */
  instant: boolean;
}

export function tendLab(page: HTMLElement, { signal, catchUp, instant }: Options) {
  page.addEventListener(
    "click",
    (event) => {
      const cord = (event.target as Element | null)?.closest?.("[data-kept-pull]");
      const kept = cord?.closest<HTMLElement>("[data-kept-frame]");
      if (!kept?.dataset.keptFrame) return;
      const frame = h("iframe", {
        src: kept.dataset.keptFrame,
        title: kept.dataset.keptTitle ?? "",
        allow: "fullscreen",
      });
      kept.replaceChildren(frame);
      frame.focus();
    },
    { signal },
  );

  page.addEventListener(
    "focusin",
    (event) => {
      const link = event.target as Element | null;
      const strip = link?.closest?.<HTMLElement>("[data-reel-strip]");
      if (!link || !strip || !link.matches(":focus-visible")) return;
      strip.dataset.reelRest = "";
      // The whole headline, from its beginning.
      (link.parentElement ?? link).scrollIntoView({ block: "nearest", inline: "start" });
    },
    { signal },
  );
  page.addEventListener(
    "focusout",
    (event) => {
      const strip = (event.target as Element | null)?.closest?.<HTMLElement>("[data-reel-rest]");
      if (!strip || strip.contains(event.relatedTarget as Node | null)) return;
      strip.scrollLeft = 0;
      delete strip.dataset.reelRest;
    },
    { signal },
  );

  const land = (hash = location.hash) => {
    for (const el of page.querySelectorAll("[data-landed]")) el.removeAttribute("data-landed");
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {}
    const target = id ? page.querySelector<HTMLElement>(`[data-labbook] [id="${CSS.escape(id)}"]`) : null;
    if (!target) return;
    target.setAttribute("data-landed", "");
    const top = target.getBoundingClientRect().top - page.getBoundingClientRect().top;
    catchUp(top + target.offsetHeight + innerHeight * 0.3);
    target.scrollIntoView({ block: "center", behavior: instant ? "instant" : "smooth" });
  };
  // Back and forward, and an address typed in.
  addEventListener("hashchange", () => land(), { signal });
  addEventListener("popstate", () => land(), { signal });
  // A link on this page to an update on this page (a headline in the Lab's
  // own reel): the router moves the address without a word to anyone.
  page.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href*='#']");
      if (!link || link.target || link.pathname !== location.pathname) return;
      const { hash } = link;
      requestAnimationFrame(() => {
        if (!signal.aborted && location.hash === hash) land(hash);
      });
    },
    { signal },
  );
  return { land };
}
