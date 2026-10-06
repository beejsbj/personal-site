/** Page transition, rebuilt from v1's Barba circle (commit 2d8ddf8): the
 * clicked link swells over the page from where it is, with the link's name
 * in booming type, then shrinks back into the same spot to reveal the next
 * page. The swell grows from the shape the visitor actually clicked:
 * - a ball link: that very ball swells, in its own colour;
 * - a pill: its own stretched pill (same place, radius, paint and label)
 *   swells into the cover;
 * - a text link: the peach pill behind its words (the line clicked) does;
 * - anything else: a small ball pops at the click point and swells.
 *
 * On Astro's ClientRouter: the cover plays in the outgoing page while the
 * next one loads (wrapped loader), so the view transition's old snapshot is
 * the cover; CSS in PageTransition.astro shrinks that snapshot into the
 * origin. Keyboard activation starts from the link's centre. Back/forward
 * keeps the browser's quick cross-fade. Reduced motion: no cover, no
 * transition. No JS: plain navigation.
 */
const MOTION = "(prefers-reduced-motion: no-preference)";
const SAFETY_MS = 2000; // never hold a navigation hostage to an animation
const CLICK_MEMORY_MS = 1000; // how long a click point stays the origin

type Origin = { x: number; y: number };
type Box = { left: number; top: number; width: number; height: number };
type From = "ball" | "pill" | "text";

/** Which member of the link family was clicked. */
export function linkKind(link: Element): From | undefined {
  if (link.matches("[data-ball]")) return "ball";
  if (link.classList.contains("ds-link--pill")) return "pill";
  if (link.classList.contains("ds-link--text")) return "text";
  return undefined;
}

/** The painted shape a pill or text link shows under the pointer: a pill's
 * stretched paint (full width, its own height, centred), or the line of a
 * text link's words that holds the click (else its first line). */
export function seedBox(
  link: Element,
  kind: "pill" | "text",
  point?: Origin,
): Box | undefined {
  if (kind === "pill") {
    const rect = link.getBoundingClientRect();
    const paint = parseFloat(getComputedStyle(link, "::before").height);
    const height = paint > 0 ? Math.min(paint, rect.height) : rect.height;
    return {
      left: rect.left,
      top: rect.top + (rect.height - height) / 2,
      width: rect.width,
      height,
    };
  }
  const words = link.querySelector(".ds-link__body") ?? link;
  const lines = [...words.getClientRects()].filter((line) => line.width);
  const hit = point
    ? lines.find(
        (line) =>
          point.x >= line.left &&
          point.x <= line.right &&
          point.y >= line.top &&
          point.y <= line.bottom,
      )
    : undefined;
  const line = hit ?? lines[0];
  return line
    ? { left: line.left, top: line.top, width: line.width, height: line.height }
    : undefined;
}

export function installPageTransition() {
  const motion = window.matchMedia(MOTION);
  const root = document.documentElement;
  let cover: HTMLElement | undefined;
  // A pill or text link stands in for itself while its seed is up: the
  // cover takes the pointer, so the link loses its hover underneath.
  let stand: HTMLElement | undefined;
  let origin: Origin | undefined;
  let lastClick:
    (Origin & { target: EventTarget | null; time: number }) | undefined;

  // Where the pointer actually clicked; keyboard clicks (detail 0) have none.
  document.addEventListener(
    "click",
    (event) => {
      lastClick =
        event.detail > 0
          ? {
              x: event.clientX,
              y: event.clientY,
              target: event.target,
              time: event.timeStamp,
            }
          : undefined;
    },
    { capture: true },
  );

  // Root attributes are replaced by the new document's at swap, so whatever
  // the uncover needs is written to both documents.
  const mark = (target: HTMLElement) => {
    if (!origin) return;
    target.dataset.pageCover = "";
    target.style.setProperty("--page-x", `${origin.x}px`);
    target.style.setProperty("--page-y", `${origin.y}px`);
  };
  const unmark = () => {
    delete root.dataset.pageCover;
    root.style.removeProperty("--page-x");
    root.style.removeProperty("--page-y");
    if (!root.getAttribute("style")) root.removeAttribute("style");
  };
  const drop = () => {
    stand?.style.removeProperty("visibility");
    stand = undefined;
    cover?.remove();
    cover = undefined;
    origin = undefined;
    unmark();
  };

  document.addEventListener("astro:before-preparation", (event) => {
    drop();
    const source = event.sourceElement;
    const link =
      source instanceof Element
        ? source.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (!motion.matches || !link || event.navigationType === "traverse") return;
    // Daylight's cover only: another lens's shell animates its own route
    // changes, and prism faces and the open prism hold still.
    if (offstage(root)) return;
    const rect = link.getBoundingClientRect();
    if (!rect.width) return;
    const clamp = (value: number, max: number) =>
      Math.round(Math.min(Math.max(value, 0), max));
    const kind = linkKind(link);
    const ball = kind === "ball";
    const clicked =
      lastClick &&
      lastClick.target instanceof Node &&
      link.contains(lastClick.target) &&
      performance.now() - lastClick.time < CLICK_MEMORY_MS
        ? lastClick
        : undefined;
    // A ball link swells from its own centre; any other link from the
    // click point, or its centre when it was activated from the keyboard.
    const point =
      clicked && !ball
        ? clicked
        : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    origin = {
      x: clamp(point.x, window.innerWidth),
      y: clamp(point.y, window.innerHeight),
    };

    const label = (
      link.querySelector(".link-label")?.textContent ??
      link.textContent ??
      ""
    )
      .replace(/\s+/g, " ")
      .trim();
    const element = buildCover(label);
    cover = element;
    element.dataset.tone = ball
      ? (link.dataset.tone ?? "peach")
      : link.classList.contains("ds-link--wine")
        ? "wine"
        : kind
          ? "peach"
          : "wine";
    if (ball) {
      // That very ball becomes the transition: same place, size and colour.
      element.dataset.from = "ball";
      element.style.setProperty("--page-ball-size", `${rect.width}px`);
      element.style.setProperty(
        "--page-ball-font",
        getComputedStyle(link).fontSize,
      );
    }
    const box =
      kind && kind !== "ball" ? seedBox(link, kind, clicked) : undefined;
    if (kind && kind !== "ball" && box) {
      // A pill or text link: its own painted pill, in place, is the seed,
      // and the cover swells out of that shape.
      element.dataset.from = kind;
      const seed = element.querySelector<HTMLElement>(".page-cover__ball");
      if (seed) dressSeed(seed, link, kind);
      const px = (value: number) => `${Math.round(value)}px`;
      element.style.setProperty("--seed-t", px(box.top));
      element.style.setProperty("--seed-l", px(box.left));
      element.style.setProperty(
        "--seed-r",
        px(window.innerWidth - box.left - box.width),
      );
      element.style.setProperty(
        "--seed-b",
        px(window.innerHeight - box.top - box.height),
      );
      element.style.setProperty("--seed-radius", px(box.height / 2));
      stand = link;
      link.style.setProperty("visibility", "hidden");
    }
    element.style.setProperty("--page-x", `${origin.x}px`);
    element.style.setProperty("--page-y", `${origin.y}px`);
    document.body.append(element);
    const face = element.querySelector<HTMLElement>(".page-cover__ball");
    const width = face?.getBoundingClientRect().width ?? 0;
    if (width) element.style.setProperty("--page-ball-r", `${width / 2}px`);
    mark(root);

    const title = element.querySelector(".page-cover__title");
    const played = new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, SAFETY_MS);
      const done = () => {
        window.clearTimeout(timer);
        resolve();
      };
      element.addEventListener("animationend", (end) => {
        if (end.target === title) done();
      });
      event.signal.addEventListener("abort", () => {
        if (cover === element) drop();
        done();
      });
    });
    const load = event.loader;
    event.loader = async () => {
      await Promise.all([load(), played]);
    };
  });

  document.addEventListener("astro:before-swap", (event) => {
    // The cover leaves with the old body; the view transition's old snapshot
    // keeps it on screen and shrinks it back into the origin (CSS).
    // The old snapshot is already taken, so the link can come back (it may
    // be persisted into the next page).
    cover = undefined;
    stand?.style.removeProperty("visibility");
    stand = undefined;
    if (!origin) return;
    mark(event.newDocument.documentElement);
    origin = undefined;
    const finished = event.viewTransition?.finished;
    if (finished) finished.finally(unmark);
    else unmark();
  });

  // A failed swap falls back to a full load; a page restored from the
  // back/forward cache must not come back covered.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) drop();
  });
}

/** The seed wears the clicked link's type, words and arrow (a text link's
 * arrow rides just outside its pill), so the moment the cover takes the
 * pointer nothing appears to change. */
function dressSeed(seed: HTMLElement, link: Element, kind: "pill" | "text") {
  const style = getComputedStyle(link);
  for (const property of [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "letter-spacing",
    "line-height",
    "color",
  ])
    seed.style.setProperty(property, style.getPropertyValue(property));
  if (kind === "pill") {
    seed.style.setProperty(
      "padding-inline",
      style.getPropertyValue("padding-inline"),
    );
  }
  seed.textContent = "";
  const words = link.querySelector(".link-label");
  if (words) seed.append(words.cloneNode(true));
  else seed.textContent = link.textContent?.trim() ?? "";
  const satellite = link.querySelector(".link-sat");
  if (satellite) {
    // Its paint depends on the pill's tone, and hover has kicked it: keep
    // both as they are on screen.
    const copy = satellite.cloneNode(true) as HTMLElement;
    const look = getComputedStyle(satellite);
    for (const property of ["background-color", "color", "translate"])
      copy.style.setProperty(property, look.getPropertyValue(property));
    seed.append(copy);
  }
}

function buildCover(label: string) {
  const cover = document.createElement("div");
  cover.className = "page-cover";
  cover.setAttribute("aria-hidden", "true");
  const ball = document.createElement("span");
  ball.className = "page-cover__ball";
  ball.textContent = label;
  // The sheet is clipped to a circle growing from the ball; the ball sits
  // outside it so it is visible before the swell begins.
  const sheet = document.createElement("span");
  sheet.className = "page-cover__sheet";
  const title = document.createElement("span");
  title.className = "page-cover__title";
  title.textContent = label;
  sheet.append(title);
  cover.append(ball, sheet);
  return cover;
}

/** Daylight is not the page on show: another lens's shell has replaced it,
 * it is a prism face, or the prism is open over it. */
function offstage(root: HTMLElement) {
  return (
    root.hasAttribute("data-lens-shell") ||
    root.hasAttribute("data-prism-face") ||
    root.hasAttribute("data-prism-idle")
  );
}
