const INSTALL_KEY = "__buroojDefaultPageTransitionCleanup__";
// A stalled fetch may keep routing pending, but must not hide the current page.
const MAX_COVER_TIME_MS = 5000;

type TransitionEvent = Event & {
  loader?: () => Promise<void>;
  signal?: AbortSignal;
};

type TransitionOverlay = HTMLElement & {
  dataset: DOMStringMap & { state?: "idle" | "covering" | "revealing" };
};

function milliseconds(value: string) {
  const match = value.trim().match(/^(\d*\.?\d+)(ms|s)$/);
  if (!match) return 0;
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}

function sweepDuration(overlay: TransitionOverlay) {
  const style = getComputedStyle(overlay);
  const sweep = milliseconds(style.getPropertyValue("--page-transition-sweep"));
  const stagger = milliseconds(
    style.getPropertyValue("--page-transition-stagger"),
  );
  return sweep + Math.max(overlay.children.length - 1, 0) * stagger;
}

/**
 * The default face's recovered PE strip sweep. This listens to Astro's router
 * lifecycle once, keeps its overlay persistent, and leaves navigation itself to
 * ClientRouter so keyboard and history navigation follow the same path.
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
  let pendingSweep:
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

  const completePendingSweep = () => {
    if (!pendingSweep) return;
    clearTimeout(pendingSweep.timer);
    const { resolve } = pendingSweep;
    pendingSweep = undefined;
    resolve();
  };

  const reset = () => {
    completePendingSweep();
    clearResetTimer();
    clearWatchdog();
    if (overlay) overlay.dataset.state = "idle";
  };

  const runCover = () => {
    if (!overlay || reducedMotion.matches) return Promise.resolve();
    completePendingSweep();
    clearResetTimer();
    clearWatchdog();
    overlay.dataset.state = "covering";
    coverWatchdog = setTimeout(reset, MAX_COVER_TIME_MS);
    const duration = sweepDuration(overlay);
    return new Promise<void>((resolve) => {
      pendingSweep = {
        resolve,
        timer: setTimeout(() => {
          pendingSweep = undefined;
          resolve();
        }, duration),
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
    completePendingSweep();
    clearResetTimer();
    clearWatchdog();
    overlay.dataset.state = "revealing";
    resetTimer = setTimeout(reset, sweepDuration(overlay));
  };

  const beforePreparation = (event: TransitionEvent) => {
    if (!overlay || document.documentElement.dataset.theme !== "default") {
      reset();
      return;
    }
    const run = ++activeRun;
    const cover = runCover();
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
