/** Pictures of the prism's faces for the WebGL renderer (experiment).
 *
 * Each face other than the live page is a same-origin frame of the current
 * page in another lens, held idle (paused) while it isn't looked at. A held
 * face doesn't change, so one picture of it, taken while the visitor is
 * still deciding to catch the lure, is what the CSS stage would show: it
 * only goes stale if the frame is scrolled (the stage scrolls every face to
 * the page's place in the story when it opens) or resized. Those retake it.
 *
 * The picture is the frame's DOM serialised into an SVG foreignObject and
 * drawn to a canvas (modern-screenshot, loaded only on this path). It is
 * close to the real thing but not the browser's own paint: fonts are
 * inlined, canvases copied, cross-origin images need CORS.
 *
 * HTML-in-Canvas (WICG; Chrome origin trial, API still changing) would give
 * the browser's own paint of a frame drawn inside a canvas, live. Not used
 * yet: the frame would have to be a child of the WebGL canvas, and the
 * method names changed in Chrome 150 and again in 155. See the experiment
 * notes in docs/prism/lens-map.md §8. */

type Shot = { scroll: number; w: number; h: number };

const taken = new WeakMap<HTMLIFrameElement, Shot>();

let library: Promise<typeof import("modern-screenshot")> | undefined;
const load = () => (library ??= import("modern-screenshot"));

/** Has this face's picture gone stale (scrolled or resized since)? */
export function stale(frame: HTMLIFrameElement) {
  const shot = taken.get(frame);
  const win = frame.contentWindow;
  if (!shot || !win) return true;
  return (
    Math.abs(shot.scroll - win.scrollY) > 1 ||
    shot.w !== win.innerWidth ||
    shot.h !== win.innerHeight
  );
}

/** A picture of what this face shows: its viewport, where it is scrolled,
 * at up to 1.5× device pixels (the prism never shows a face larger than the
 * screen, and only for the last frames of a step-in). */
export async function snapshot(
  frame: HTMLIFrameElement,
): Promise<HTMLCanvasElement | null> {
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) return null;
  const { domToCanvas } = await load();
  const w = win.innerWidth;
  const h = win.innerHeight;
  const scroll = win.scrollY;
  const scale = Math.min(devicePixelRatio || 1, 1.5);
  try {
    const canvas = await domToCanvas(doc.documentElement, {
      width: w,
      height: h,
      scale,
      // The picture is the viewport: shift the document up by its scroll.
      // Fixed elements are laid out against the picture's own viewport, so
      // they stay where they are on screen.
      style: scroll ? { marginTop: `${-scroll}px` } : undefined,
      backgroundColor: getComputedStyle(doc.documentElement).backgroundColor,
    });
    taken.set(frame, { scroll, w, h });
    return canvas;
  } catch (error) {
    console.warn("[prism:webgl] snapshot failed", error);
    return null;
  }
}
