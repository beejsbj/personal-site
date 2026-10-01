/** Page transition, rebuilt from v1's Barba circle (commit 2d8ddf8): the
 * clicked link becomes a ball, the ball arcs to the middle of the screen and
 * swells over the page with the link's name in booming type, then the cover
 * shrinks back into the link to reveal the next page.
 *
 * On Astro's ClientRouter: the cover plays in the outgoing page while the
 * next one loads (wrapped loader), so the view transition's old snapshot is
 * the cover; CSS in PageTransition.astro shrinks that snapshot into the link.
 * Back/forward and non-link navigations keep the browser's quick cross-fade.
 * Reduced motion: no ball, no transition. No JS: plain navigation.
 */
const MOTION = "(prefers-reduced-motion: no-preference)";
const SAFETY_MS = 2000; // never hold a navigation hostage to an animation

export function installPageTransition() {
  const motion = window.matchMedia(MOTION);
  const root = document.documentElement;
  let cover: HTMLElement | undefined;
  let origin: { x: string; y: string } | undefined;

  // Root attributes are replaced by the new document's at swap, so whatever
  // the uncover needs is written to both documents.
  const mark = (target: HTMLElement) => {
    if (!origin) return;
    target.dataset.pageCover = "";
    target.style.setProperty("--page-x", origin.x);
    target.style.setProperty("--page-y", origin.y);
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
    const x = clamp(rect.left + rect.width / 2, window.innerWidth);
    const y = clamp(rect.top + rect.height / 2, window.innerHeight);
    origin = { x: `${x}px`, y: `${y}px` };

    const label = (
      link.querySelector(".link-label")?.textContent ??
      link.textContent ??
      ""
    )
      .replace(/\s+/g, " ")
      .trim();
    const element = buildCover(label);
    cover = element;
    element.style.setProperty("--page-x", origin.x);
    element.style.setProperty("--page-y", origin.y);
    element.style.setProperty(
      "--page-travel-x",
      `${Math.round(window.innerWidth / 2 - x)}px`,
    );
    element.style.setProperty(
      "--page-travel-y",
      `${Math.round(window.innerHeight / 2 - y)}px`,
    );
    document.body.append(element);
    // The ball hugs its label: measure once, then let CSS do the rest.
    const ball = element.querySelector<HTMLElement>(".page-cover__ball");
    const width = ball?.getBoundingClientRect().width ?? 0;
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
    // keeps it on screen and shrinks it back into the link (CSS).
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
  // Nested so x and y can ease differently: the ball arcs, it does not slide.
  const travel = document.createElement("span");
  travel.className = "page-cover__travel";
  const lift = document.createElement("span");
  lift.className = "page-cover__lift";
  const ball = document.createElement("span");
  ball.className = "page-cover__ball";
  ball.textContent = label;
  lift.append(ball);
  travel.append(lift);
  // The sheet is clipped to a growing circle; the ball rides outside it.
  const sheet = document.createElement("span");
  sheet.className = "page-cover__sheet";
  const title = document.createElement("span");
  title.className = "page-cover__title";
  title.textContent = label;
  sheet.append(title);
  cover.append(travel, sheet);
  return cover;
}
