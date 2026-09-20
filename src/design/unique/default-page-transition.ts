const INSTALL_KEY = "__buroojDefaultPageTransitionCleanup__";
// A stalled fetch may keep routing pending, but must not hide the current page.
const MAX_COVER_TIME_MS = 5000;

type TransitionEvent = Event & {
  loader?: () => Promise<void>;
  signal?: AbortSignal;
  sourceElement?: Element;
};

type TransitionOverlay = HTMLElement & {
  dataset: DOMStringMap & { state?: "idle" | "covering" | "revealing" };
};

function milliseconds(value: string) {
  const match = value.trim().match(/^(\d*\.?\d+)(ms|s)$/);
  if (!match) return 0;
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}

function duration(overlay: TransitionOverlay, name: string) {
  return milliseconds(getComputedStyle(overlay).getPropertyValue(name));
}

function clamp(value: number, max: number) {
  return Math.min(Math.max(value, 0), max);
}

function originFor(sourceElement?: Element) {
  if (!sourceElement) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  const rect = sourceElement.getBoundingClientRect();
  return {
    x: clamp(rect.left + rect.width / 2, window.innerWidth),
    y: clamp(rect.top + rect.height / 2, window.innerHeight),
  };
}

function setGeometry(overlay: TransitionOverlay, sourceElement?: Element) {
  const { x, y } = originFor(sourceElement);
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const orbSize = overlay
    .querySelector<HTMLElement>(".page-transition__orb")
    ?.getBoundingClientRect().width;
  const safeOrbSize =
    typeof orbSize === "number" && Number.isFinite(orbSize) && orbSize > 0
      ? orbSize
      : 50;
  const coverDiameter = Math.hypot(window.innerWidth, window.innerHeight);

  overlay.style.setProperty("--page-transition-origin-x", `${x}px`);
  overlay.style.setProperty("--page-transition-origin-y", `${y}px`);
  overlay.style.setProperty("--page-transition-travel-x", `${centerX - x}px`);
  overlay.style.setProperty("--page-transition-travel-y", `${centerY - y}px`);
  overlay.style.setProperty(
    "--page-transition-cover-scale",
    `${coverDiameter / safeOrbSize}`,
  );
}

/**
 * The PHP default's traveling circle, adapted to Astro's persistent router
 * lifecycle. Links provide the start point; history navigation begins at the
 * viewport center, and Astro retains ownership of focus and scroll restoration.
 */
export function installDefaultPageTransition() {
  const host = window as typeof window &
    Record<string, (() => void) | undefined>;
  host[INSTALL_KEY]?.();

  const overlay = document.querySelector<TransitionOverlay>(
    '[data-page-transition="default"]',
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  const { signal } = controller;
  let activeRun = 0;
  let pendingCover:
    { resolve: () => void; timer: ReturnType<typeof setTimeout> } | undefined;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  let coverWatchdog: ReturnType<typeof setTimeout> | undefined;

  const clearWatchdog = () => {
    if (coverWatchdog !== undefined) clearTimeout(coverWatchdog);
    coverWatchdog = undefined;
  };

  const clearResetTimer = () => {
    if (resetTimer !== undefined) clearTimeout(resetTimer);
    resetTimer = undefined;
  };

  const completePendingCover = () => {
    if (!pendingCover) return;
    clearTimeout(pendingCover.timer);
    const { resolve } = pendingCover;
    pendingCover = undefined;
    resolve();
  };

  const reset = () => {
    completePendingCover();
    clearResetTimer();
    clearWatchdog();
    if (overlay) overlay.dataset.state = "idle";
  };

  const runCover = (sourceElement?: Element) => {
    if (!overlay || reducedMotion.matches) return Promise.resolve();
    completePendingCover();
    clearResetTimer();
    clearWatchdog();
    overlay.dataset.state = "idle";
    setGeometry(overlay, sourceElement);
    // Commit the small trigger-sized circle before transitioning it outward.
    void overlay.offsetWidth;
    overlay.dataset.state = "covering";
    coverWatchdog = setTimeout(reset, MAX_COVER_TIME_MS);
    const coverDuration =
      duration(overlay, "--page-transition-travel") +
      duration(overlay, "--page-transition-grow");
    return new Promise<void>((resolve) => {
      pendingCover = {
        resolve,
        timer: setTimeout(() => {
          pendingCover = undefined;
          resolve();
        }, coverDuration),
      };
    });
  };

  const reveal = () => {
    if (
      !overlay ||
      overlay.dataset.state !== "covering" ||
      reducedMotion.matches ||
      document.documentElement.dataset.theme !== "default"
    ) {
      reset();
      return;
    }
    completePendingCover();
    clearResetTimer();
    clearWatchdog();
    overlay.dataset.state = "revealing";
    resetTimer = setTimeout(
      reset,
      duration(overlay, "--page-transition-reveal"),
    );
  };

  const beforePreparation = (event: TransitionEvent) => {
    if (!overlay || document.documentElement.dataset.theme !== "default") {
      reset();
      return;
    }
    const run = ++activeRun;
    const cover = runCover(event.sourceElement);
    const originalLoader = event.loader;

    if (originalLoader) {
      // Fetch while the outgoing page is covered; do not add the sweep to load time.
      event.loader = async () => {
        try {
          await Promise.all([originalLoader(), cover]);
        } catch (error) {
          if (run === activeRun) reset();
          throw error;
        }
      };
    }
    event.signal?.addEventListener(
      "abort",
      () => {
        if (run === activeRun) reset();
      },
      { once: true },
    );
  };

  const refreshMotion = () => {
    if (reducedMotion.matches) reset();
  };
  const cleanup = () => {
    controller.abort();
    reset();
    if (host[INSTALL_KEY] === cleanup) delete host[INSTALL_KEY];
  };

  document.addEventListener("astro:before-preparation", beforePreparation, {
    signal,
  });
  document.addEventListener("astro:after-swap", reveal, { signal });
  window.addEventListener("pagehide", reset, { signal });
  reducedMotion.addEventListener("change", refreshMotion, { signal });
  host[INSTALL_KEY] = cleanup;

  return cleanup;
}
