/** Homepage motion runtime: scroll reveals and a soft pointer scene.
 * Reveals: elements are hidden only after this script marks them, then shown
 * once as they enter the viewport; anything already on screen stays put.
 * Scene: a nearby fine pointer tilts the portrait. One animation frame per
 * batch of pointer events, no idle loop, CSS transitions do the smoothing.
 * Reduced motion and touch stay static.
 */
const REVEAL_TARGETS = [
  ".selected-work > .section-heading",
  ".selected-work .project-row",
  ".current-note",
  ".updates .section-heading",
  ".updates .stream-intro",
  ".updates .stream-events > li",
  ".updates .stream-caption",
  ".elsewhere > div",
  ".signoff",
].join(",");
const TILT_DEGREES = 6;
const TILT_REACH = 2.2;

export function installHomeMotion() {
  const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
  const pointer = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  );
  let cleanup: (() => void) | undefined;

  function mount() {
    cleanup?.();
    const controller = new AbortController();
    const { signal } = controller;
    const resetters: (() => void)[] = [];
    const refreshers: (() => void)[] = [];

    for (const root of document.querySelectorAll<HTMLElement>(
      "[data-home-motion]",
    )) {
      installReveals(root, motion, resetters);
      installScene(root, pointer, signal, resetters, refreshers);
    }

    const refreshAll = () => refreshers.forEach((refresh) => refresh());
    pointer.addEventListener("change", refreshAll, { signal });
    document.addEventListener("visibilitychange", refreshAll, { signal });
    cleanup = () => {
      controller.abort();
      resetters.forEach((reset) => reset());
    };
  }

  mount();
  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", mount);
}

function installReveals(
  root: HTMLElement,
  motion: MediaQueryList,
  resetters: (() => void)[],
) {
  if (!motion.matches || typeof IntersectionObserver === "undefined") return;
  const targets = [...root.querySelectorAll<HTMLElement>(REVEAL_TARGETS)];
  if (!targets.length) return;
  const show = (element: HTMLElement, index: number) => {
    element.style.setProperty("--i", String(index));
    element.setAttribute("data-in", "");
    observer.unobserve(element);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      let index = 0;
      for (const entry of entries) {
        if (entry.isIntersecting) show(entry.target as HTMLElement, index++);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  // Measure first, then mark: anything already visible is shown in the same
  // pass, so it never paints hidden and never blinks.
  const fold = window.innerHeight;
  const onScreen = targets.map(
    (element) => element.getBoundingClientRect().top < fold,
  );
  targets.forEach((element, i) => {
    element.setAttribute("data-reveal", "");
    if (onScreen[i]) show(element, 0);
    else observer.observe(element);
  });
  resetters.push(() => {
    observer.disconnect();
    for (const element of targets) {
      element.removeAttribute("data-reveal");
      element.removeAttribute("data-in");
      element.style.removeProperty("--i");
    }
  });
}

function installScene(
  root: HTMLElement,
  pointer: MediaQueryList,
  signal: AbortSignal,
  resetters: (() => void)[],
  refreshers: (() => void)[],
) {
  const scene = root.querySelector<HTMLElement>("[data-motion-scene]");
  if (!scene) return;
  const portrait = scene.querySelector<HTMLElement>("figure img");
  let frame = 0;
  let last: { clientX: number; clientY: number } | undefined;

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = undefined;
    portrait?.style.removeProperty("--tilt-x");
    portrait?.style.removeProperty("--tilt-y");
  };
  resetters.push(reset);
  const refresh = () => {
    const running = pointer.matches && !document.hidden;
    scene.dataset.motion = running ? "running" : "paused";
    if (!running) reset();
  };
  refreshers.push(refresh);

  const apply = () => {
    frame = 0;
    if (!last) return;
    const { clientX, clientY } = last;
    if (portrait) {
      const rect = portrait.getBoundingClientRect();
      if (rect.width) {
        const nx = (clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const ny = (clientY - rect.top - rect.height / 2) / (rect.height / 2);
        const near = Math.hypot(nx, ny) < TILT_REACH;
        const x = near ? Math.max(-1, Math.min(1, nx)) : 0;
        const y = near ? Math.max(-1, Math.min(1, ny)) : 0;
        portrait.style.setProperty(
          "--tilt-x",
          `${(-y * TILT_DEGREES).toFixed(2)}deg`,
        );
        portrait.style.setProperty(
          "--tilt-y",
          `${(x * TILT_DEGREES).toFixed(2)}deg`,
        );
      }
    }
  };

  scene.addEventListener(
    "pointermove",
    (event) => {
      if (
        !pointer.matches ||
        document.hidden ||
        event.pointerType === "touch"
      ) {
        reset();
        return;
      }
      last = { clientX: event.clientX, clientY: event.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    },
    { signal, passive: true },
  );
  scene.addEventListener("pointerleave", reset, { signal });
  refresh();
}
