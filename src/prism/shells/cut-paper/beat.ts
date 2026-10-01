/** The metronome as a clock. The status-bar beat cells run a CSS animation
 * from the moment the frame mounts; everything else that wants to land on
 * the grid (route changes, hovers, clip launches) reads its phase from them. */

export const BEAT = 500; // ms at 120 bpm

let cell: HTMLElement | undefined;

export function setClock(beat: HTMLElement) {
  cell = (beat.firstElementChild as HTMLElement | null) ?? undefined;
}

/** Milliseconds until the next subdivision of the beat (2 = eighth,
 * 4 = sixteenth). Anything closer than 30ms counts as "now". */
export function untilNext(division = 2): number {
  const animation = cell?.getAnimations?.()[0];
  const start = typeof animation?.startTime === "number" ? animation.startTime : 0;
  const now = Number(document.timeline.currentTime ?? performance.now());
  const step = BEAT / division;
  const wait = step - ((((now - start) % step) + step) % step);
  return wait > step - 30 ? 0 : wait;
}

/** Run `fn` on the next subdivision. Returns a cancel. */
export function onNext(division: number, fn: () => void): () => void {
  const id = setTimeout(fn, untilNext(division));
  return () => clearTimeout(id);
}
