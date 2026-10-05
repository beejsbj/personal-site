/** Page transition, rebuilt from v1's Barba circle (commit 2d8ddf8): a ball
 * appears where you clicked, swells over the page from that spot with the
 * link's name in booming type, then shrinks back into the same spot to
 * reveal the next page. Click a ball link and that very ball is the one
 * that swells, in its own colour.
 *
 * On Astro's ClientRouter: the cover plays in the outgoing page while the
 * next one loads (wrapped loader), so the view transition's old snapshot is
 * the cover; CSS in PageTransition.astro shrinks that snapshot into the
 * origin. Keyboard activation starts from the link's centre. Back/forward
 * keeps the browser's quick cross-fade. Reduced motion: no ball, no
 * transition. No JS: plain navigation.
 */
const MOTION = "(prefers-reduced-motion: no-preference)";
const SAFETY_MS = 2000; // never hold a navigation hostage to an animation
const CLICK_MEMORY_MS = 1000; // how long a click point stays the origin

type Origin = { x: number; y: number };

export function installPageTransition() {
  const motion = window.matchMedia(MOTION);
  const root = document.documentElement;
  let cover: HTMLElement | undefined;
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
    const rect = link.getBoundingClientRect();
    if (!rect.width) return;
    const clamp = (value: number, max: number) =>
      Math.round(Math.min(Math.max(value, 0), max));
    const ball = link.matches("[data-ball]");
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
    element.dataset.tone = ball ? (link.dataset.tone ?? "peach") : "wine";
    if (ball) {
      // That very ball becomes the transition: same place, size and colour.
      element.dataset.from = "ball";
      element.style.setProperty("--page-ball-size", `${rect.width}px`);
      element.style.setProperty(
        "--page-ball-font",
        getComputedStyle(link).fontSize,
      );
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
    cover = undefined;
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
