/** The page you were on, held as its own face of the prism (issue #28).
 *
 * The prism used to show a fresh copy of the page in a frame on the face you
 * came from, so pulling out replayed the page's arrival and stepping back in
 * swapped that copy for the real page. Now the face you came from is the
 * real page: its DOM, its scroll, whatever it was doing. Nothing reloads.
 *
 * Holding the page: `body` becomes a viewport-sized sheet (fixed, scrolled
 * inside to where the window was) that the camera can carry in 3D. The
 * window keeps its scroll range, so nothing on the page sees a scroll.
 * Releasing puts every style back and the page is exactly where it was. */

const VOID = "#07070b";

/** Inline style properties this module sets, so each can be put back. */
type Saved = Map<string, [value: string, priority: string]>;

function save(el: HTMLElement, names: string[]): Saved {
  return new Map(
    names.map((name) => [
      name,
      [el.style.getPropertyValue(name), el.style.getPropertyPriority(name)],
    ]),
  );
}
function restore(el: HTMLElement, saved: Saved) {
  for (const [name, [value, priority]] of saved) {
    if (value) el.style.setProperty(name, value, priority);
    else el.style.removeProperty(name);
  }
  if (!el.getAttribute("style")) el.removeAttribute("style");
}

const painted = (style: CSSStyleDeclaration) =>
  style.backgroundImage !== "none" ||
  !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(style.backgroundColor);

const PAPER = [
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
];

/** Fixed elements on the page, outermost only (a fixed element inside one
 * moves with it). */
function fixedElements(root: HTMLElement) {
  const found: HTMLElement[] = [];
  const walk = (el: Element) => {
    for (const child of el.children) {
      if (!(child instanceof HTMLElement)) {
        walk(child);
        continue;
      }
      if (child.id === "prism-lure") continue;
      if (getComputedStyle(child).position === "fixed") found.push(child);
      else walk(child);
    }
  };
  walk(root);
  return found;
}

export interface LivePage {
  /** Where the window was scrolled when the page was taken up. */
  readonly scroll: number;
  /** The sheet the camera carries (the body), for the prism to shade like
   * any other face. */
  readonly sheet: HTMLElement;
  /** Pose the page: a transform about its top-left corner. */
  set(transform: string): void;
  /** Move the page with the camera, frame for frame. */
  animate(
    from: string,
    to: string,
    timing: KeyframeAnimationOptions,
  ): Animation;
  /** Let go: the page is an ordinary page again, scrolled where it was. */
  release(): void;
}

export function holdPage(): LivePage {
  const html = document.documentElement;
  const body = document.body;
  const scroll = scrollY;
  const range = Math.max(html.scrollHeight, scroll + innerHeight);
  const htmlStyle = getComputedStyle(html);
  const bodyStyle = getComputedStyle(body);
  const savedHtml = save(html, ["height", ...PAPER]);
  const savedBody = save(body, [
    "position",
    "inset",
    "overflow",
    "transform",
    "transform-origin",
    "backface-visibility",
    "will-change",
    "opacity",
    ...PAPER,
  ]);
  const inert = body.inert;

  // The face carries its own paper: a body's background only paints its own
  // box once the root has one, so give the root the dark of the room and the
  // body whatever the page was showing.
  if (!painted(bodyStyle)) {
    if (painted(htmlStyle)) {
      for (const name of PAPER)
        body.style.setProperty(name, htmlStyle.getPropertyValue(name));
    } else body.style.setProperty("background-color", "Canvas");
  }
  html.style.setProperty("background-color", VOID);
  html.style.setProperty("background-image", "none");
  // Keep the window's scroll range, so the window stays where it was.
  html.style.setProperty("height", `${range}px`);
  body.style.setProperty("position", "fixed");
  body.style.setProperty("inset", "0");
  body.style.setProperty("overflow", "hidden");
  body.style.setProperty("transform-origin", "0 0");
  // Like the stage's faces, its back is drawn (the prism shades it out while
  // it faces away), so the compositor keeps it rasterised for its return.
  body.style.setProperty("backface-visibility", "visible");
  body.style.setProperty("will-change", "transform");
  body.scrollTo({ top: scroll, behavior: "instant" });
  if (scrollY !== scroll) scrollTo({ top: scroll, behavior: "instant" });
  body.inert = true;

  // Once the body carries a transform, fixed elements are placed in it and
  // ride its scroll: hold them where they were on screen.
  const pinned = scroll
    ? fixedElements(body).map((el) => {
        const saved = save(el, ["translate", "transition"]);
        const [x = "0px", y = "0px", z = ""] =
          getComputedStyle(el).translate === "none"
            ? []
            : getComputedStyle(el).translate.split(" ");
        el.style.setProperty("transition", "none");
        el.style.setProperty(
          "translate",
          `${x} calc(${y} + ${scroll}px)${z ? ` ${z}` : ""}`,
        );
        return { el, saved };
      })
    : [];

  let released = false;
  return {
    scroll,
    sheet: body,
    set(transform) {
      body.style.setProperty("transform", transform);
    },
    animate(from, to, timing) {
      return body.animate([{ transform: from }, { transform: to }], timing);
    },
    release() {
      if (released) return;
      released = true;
      for (const animation of body.getAnimations()) animation.cancel();
      for (const { el, saved } of pinned) {
        restore(
          el,
          new Map([...saved].filter(([name]) => name !== "transition")),
        );
        void el.offsetWidth;
        restore(
          el,
          new Map([...saved].filter(([name]) => name === "transition")),
        );
      }
      restore(body, savedBody);
      restore(html, savedHtml);
      body.inert = inert;
      scrollTo({ top: scroll, behavior: "instant" });
    },
  };
}
