/** The timeline across: the resume's roles lie along a track, and the two
 * hions run across it, left to right, on a phone as on a wide screen.
 *
 * The page's height becomes the track's travel. The section is as tall as
 * the track is long (less one screen's width, plus one screen's height);
 * its pin sticks to the top of the window while you pass through it, and
 * the track slides left by exactly as far as you have scrolled into the
 * section. So everything that scrolls the page moves the timeline: the
 * wheel, a trackpad, the scrollbar, the keyboard (arrows, Page Down,
 * Space), find-in-page, a finger panning the page. Nothing is taken from
 * the wheel; a sideways swipe over the track is passed on as scrolling
 * down it, and the left and right arrows step along it while it is
 * pinned. Focus moving to something still off to the side brings the page
 * to where it is in sight.
 *
 * The track draws its own threads (a loom that reads across, keyed to how
 * far along it you are); the page's own threads go into the section at
 * its top and come out at its foot (weave.ts `gap`), exactly where the
 * track's threads come in from above and leave below, so the two read as
 * one pair of threads turning to run along time and turning back down.
 *
 * Reading order is the content's: newest first, so time runs right to
 * left, from now back. Only a window too short to hold a role keeps the
 * timeline running down the page (screens.ts lays out both; this only runs
 * when `ACROSS` matches, and the screen is laid again when that changes). */
import { createLoom, type View } from "./loom";
import { compose } from "./weave";

/** When the timeline runs across: any window tall enough to hold a role
 * (a phone on its side, with its bars showing, is about 320px). */
export const ACROSS = "(min-height: 280px)";

interface TrackOptions {
  /** The timeline section ([data-timeline]): its pin and track inside. */
  section: HTMLElement;
  signal: AbortSignal;
  /** Draw everything at once and never glide (reduced motion, a face). */
  instant: boolean;
  face: boolean;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

/** How tall a role may stand in the pin, as a share of its height. */
const STAND = 0.8;

export function createTrack(options: TrackOptions) {
  const { section, signal, instant } = options;
  const pin = section.querySelector<HTMLElement>(".hion-timeline__pin")!;
  const track = section.querySelector<HTMLElement>(".hion-timeline__track")!;
  const knot = track.querySelector<HTMLElement>("[data-spine='knot']");
  const out = track.querySelector<HTMLElement>(".hion-timeline__out");
  section.dataset.timeline = "across";
  // The page's threads leave it here for the track's (weave.ts), and the
  // living cloth leaves the stretch to it (cloth.ts).
  section.dataset.spine = "gap";
  section.setAttribute("data-cloth-hold", "");

  /** Where the section starts on the page, and how far the track travels. */
  let top = 0;
  let travel = 0;
  /** How far along the track is slid. */
  let along = -1;

  /** Where something lies along the track (laid out, not slid). */
  function lies(el: HTMLElement) {
    let x = 0;
    for (let node: HTMLElement | null = el; node && node !== track; node = node.offsetParent as HTMLElement | null) {
      x += node.offsetLeft;
    }
    return x;
  }
  const middle = (el: HTMLElement) => lies(el) + el.offsetWidth / 2;

  /** Each role as narrow as it can be while standing in the pin (and in
   * the room the track leaves it: a short window has little). Widened, its
   * record runs on in columns (shell.css). */
  function fit() {
    const style = getComputedStyle(track);
    const room = pin.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const tall = Math.min(pin.clientHeight * STAND, room);
    const widest = Math.max(1100, pin.clientWidth * 1.6);
    for (const role of track.querySelectorAll<HTMLElement>(".hion-loop--role")) {
      role.style.removeProperty("width");
      let width = role.offsetWidth;
      while (role.offsetHeight > tall && width < widest) {
        width += 60;
        role.style.width = `${width}px`;
      }
    }
  }

  function measure() {
    fit();
    const width = pin.clientWidth;
    travel = Math.max(0, track.scrollWidth - width);
    section.style.height = `${travel + pin.clientHeight}px`;
    top = section.getBoundingClientRect().top + scrollY;
    // Where the page's threads go in and come out: over the knot the
    // track's come down to, and under where they leave it.
    const pinLeft = pin.getBoundingClientRect().left - section.getBoundingClientRect().left;
    const sectionWidth = section.offsetWidth || width;
    if (knot) section.dataset.entry = ((pinLeft + middle(knot)) / sectionWidth).toFixed(4);
    if (out) section.dataset.exit = ((pinLeft + middle(out) - travel) / sectionWidth).toFixed(4);
    along = -1;
    slide();
  }

  const position = () => Math.min(travel, Math.max(0, scrollY - top));

  function slide() {
    const next = position();
    if (next === along) return;
    along = next;
    track.style.transform = `translate3d(${(-along).toFixed(1)}px, 0, 0)`;
  }

  const pinned = () => scrollY >= top - 1 && scrollY <= top + travel + 1;

  const view = (): View => {
    const rect = pin.getBoundingClientRect();
    return { start: position(), size: pin.clientWidth, shown: rect.top < innerHeight && rect.bottom > 0 };
  };

  const loom = createLoom({
    host: track,
    signal,
    instant,
    axis: "x",
    view,
    lookahead: options.face ? 0 : 0.6,
    isIdle: options.isIdle,
    onIdleChange: options.onIdleChange,
    // They come into the track from above, over its knot.
    compose: () => compose(track, () => (knot ? [middle(knot), 0] : null), { axis: "x" }),
  });

  /** Step along the track (a scroll of the page, by the user's hand),
   * stopping at its ends. */
  function step(by: number) {
    const to = Math.min(travel, Math.max(0, position() + by));
    scrollTo({ top: Math.round(top + to), behavior: instant ? "instant" : "smooth" });
  }

  measure();

  return {
    loom,
    start() {
      measure();
      loom.start();
      addEventListener("scroll", slide, { passive: true, signal });
      let resizing = 0;
      const again = () => {
        cancelAnimationFrame(resizing);
        resizing = requestAnimationFrame(measure);
      };
      addEventListener("resize", again, { passive: true, signal });
      // Things above it settling (woven words, fonts) move where it starts.
      const watch = new ResizeObserver(again);
      watch.observe(section.parentElement ?? section);
      watch.observe(track);
      signal.addEventListener("abort", () => {
        watch.disconnect();
        cancelAnimationFrame(resizing);
      });
      // A sideways swipe over the track reads along it. Passive: the page
      // scrolls on as it would, and an upright scroll is never touched.
      pin.addEventListener(
        "wheel",
        (event) => {
          if (!pinned() || event.ctrlKey) return;
          if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
          const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? innerHeight : 1;
          scrollBy({ top: event.deltaX * unit, behavior: "instant" });
        },
        { passive: true, signal },
      );
      // Left and right step along it while it is pinned.
      addEventListener(
        "keydown",
        (event) => {
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          const target = event.target as HTMLElement | null;
          if (target?.closest("input, textarea, select, [contenteditable]")) return;
          if (!pinned()) return;
          const forward = event.key === "ArrowRight";
          if (forward ? along >= travel - 1 : along <= 1) return;
          event.preventDefault();
          step((forward ? 1 : -1) * pin.clientWidth * 0.45);
        },
        { signal },
      );
      // Focus on something still off to the side: bring it into sight. (The
      // pin clips rather than scrolls, so the browser cannot slide it.)
      track.addEventListener(
        "focusin",
        (event) => {
          const el = event.target as HTMLElement;
          requestAnimationFrame(() => {
            // All of it: a link wrapped onto a second line starts further
            // left on that line than on its first.
            const box = el.getBoundingClientRect();
            const x = box.left - track.getBoundingClientRect().left;
            const width = pin.clientWidth;
            const inSight = pinned() && x >= along + 24 && x + box.width <= along + width - 24;
            if (inSight) return;
            // A little of what comes before it in sight too, if there is room.
            const lead = Math.min(width * 0.3, Math.max(24, (width - box.width) / 2));
            const to = Math.min(travel, Math.max(0, x - lead));
            scrollTo({ top: Math.round(top + to), behavior: "instant" });
            loom.catchUp(to + width * 1.05);
          });
        },
        { signal },
      );
    },
    /** Leaving: hold the pin where it is while the page reels up (the page
     * is fixed in place then, and would let it go). */
    release() {
      pin.style.position = "relative";
      pin.style.top = `${position()}px`;
      loom.release();
    },
  };
}
