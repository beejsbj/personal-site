/** The Lab, answering the visitor: what the Labbook (screens.ts) does when
 * it is reached for.
 *
 * - A Pen or a demo is asked of its own site only when its cord is pulled:
 *   the frame is made then, in the place kept for it, and takes the focus.
 *   Until then the page has asked nothing of anyone else.
 * - A link to an update (`/lab#u-…`), should one be written, lands on its
 *   knot in the Labbook: the drawing catches up to it and a bead of light
 *   rests on the knot (shell.css `data-landed`). The page under the shell
 *   holds the same ids, hidden, so the browser's own landing cannot be
 *   relied on.
 * - Pulled by one of its threads (`?experiment=` / `?project=`), the
 *   Labbook keeps only the entries about that one: the rest are put away,
 *   a month left empty with them, and a knot on a month's cord for a day
 *   about something else is untied. A line says what it shows, with the
 *   way back to all of it. The same screen answers, in place: the address
 *   changes, not the page. */
import { narrowedTo } from "../../../lib/labbook";
import { h } from "./dom";
import { ink } from "./ink";

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

  /** Narrow the Labbook to what the address names, or show all of it.
   * Asked by the visitor (`answer`), the keyboard goes to the line saying
   * what it shows, or, shown whole again, back to the thread it was
   * narrowed by. Arrived at narrowed, the line is brought into sight. */
  const narrow = (answer: boolean) => {
    const was = page.querySelector<HTMLElement>("[data-hion-subject][aria-current='true']");
    const status = narrowLabbook(page);
    // The cords' knots are drawn again for what they now say.
    ink(page);
    if (!answer) {
      if (status) {
        const top = status.getBoundingClientRect().top - page.getBoundingClientRect().top;
        catchUp(top + innerHeight);
        status.scrollIntoView({ block: "center", behavior: "instant" });
      }
      return;
    }
    const to = status ?? was;
    if (!to) return;
    const top = to.getBoundingClientRect().top - page.getBoundingClientRect().top;
    catchUp(top + innerHeight);
    to.focus({ preventScroll: true });
    to.scrollIntoView({ block: "center", behavior: instant ? "instant" : "smooth" });
  };
  return { land, narrow };
}

/** Narrow the Labbook to what `search` names, or show all of it. Returns
 * the line saying what it shows, when it is narrowed. */
export function narrowLabbook(page: HTMLElement, search = location.search) {
  const book = page.querySelector<HTMLElement>("[data-labbook]");
  if (!book) return null;
  const wanted = narrowedTo(search);
  const key = wanted && `${wanted.kind}:${wanted.slug}`;
  const threads = [...book.querySelectorAll<HTMLAnchorElement>("[data-hion-subject]")];
  const chosen = threads.find((thread) => thread.dataset.ref === key);
  for (const thread of threads) {
    if (thread === chosen) thread.setAttribute("aria-current", "true");
    else thread.removeAttribute("aria-current");
  }
  const about = (el: HTMLElement) => !chosen || (el.dataset.about ?? "").split(" ").includes(key!);
  for (const entry of book.querySelectorAll<HTMLElement>("li[id^='u-']")) entry.hidden = !about(entry);
  for (const month of book.querySelectorAll<HTMLElement>("[data-month]"))
    month.hidden = ![...month.querySelectorAll<HTMLElement>("li[id^='u-']")].some((entry) => !entry.hidden);
  for (const day of book.querySelectorAll<HTMLElement>(".hion-tally [data-day]"))
    day.toggleAttribute("data-elsewhere", !about(day));
  if (chosen) book.dataset.narrowed = key;
  else delete book.dataset.narrowed;
  const status = book.querySelector<HTMLElement>("[data-hion-narrowed]");
  if (!status) return null;
  status.hidden = !chosen;
  status.querySelector("[data-hion-narrowed-to]")!.textContent = chosen?.dataset.title ?? "";
  return chosen ? status : null;
}
