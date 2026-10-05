/** Hover to hear: a pointer resting on something (or a tap, or a keyboard
 * focus) auditions its phrase. A passing pointer does not: it must rest a
 * moment first. The element carries `data-heard` while its phrase sounds. */
import { EIGHTH_MS, type MusicEvent } from "./music";
import { audition } from "./sound";

const DWELL = 140;

let marked: { el: HTMLElement; timer: ReturnType<typeof setTimeout> } | undefined;

const unmark = () => {
  if (!marked) return;
  clearTimeout(marked.timer);
  delete marked.el.dataset.heard;
  marked = undefined;
};

/** Play `phrase` for `el` now, if sound is on; marks it while it sounds
 * (one element at a time, like the sound itself). */
export function hear(el: HTMLElement, key: string, phrase: () => MusicEvent[]) {
  const events = phrase();
  const already = marked?.el === el;
  if (!audition(key, events)) return false;
  if (already) return true;
  unmark();
  const length = Math.max(...events.map((event) => event.at + event.len)) * EIGHTH_MS;
  el.dataset.heard = "";
  marked = { el, timer: setTimeout(unmark, Math.min(length, 3000)) };
  return true;
}

export function listen(el: HTMLElement, key: string, phrase: () => MusicEvent[]) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  el.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    clearTimeout(timer);
    timer = setTimeout(() => hear(el, key, phrase), DWELL);
  });
  el.addEventListener("pointerleave", () => clearTimeout(timer));
  // a tap is the phone's hover: it plays at once (and may also navigate,
  // the phrase carrying on under the tear)
  el.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") hear(el, key, phrase);
  });
  el.addEventListener("focusin", (event) => {
    if ((event.target as Element).matches(":focus-visible")) hear(el, key, phrase);
  });
}
