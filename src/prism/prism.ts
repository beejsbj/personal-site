/** Curiosity Reveal → Prism Lure → Prism. The Normal Portfolio stays normal
 * until the visitor lingers, reads to the end, or wanders a second page; then
 * light catches on something and the lure arrives. Once caught, the lure is
 * tame on every later visit: a small prism in the corner for revisiting.
 *
 * `?prism=lure` reveals the lure at once; `?prism=open` opens the prism. */
import { isFace } from "./lens-state";
import { mountLure } from "./lure";
import { createPrism } from "./stage";

const FOUND_KEY = "prism:found";
const VIEWS_KEY = "prism:views";
const DWELL_MS = 20000;

const stored = (storage: Storage, key: string) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};
const store = (storage: Storage, key: string, value: string) => {
  try {
    storage.setItem(key, value);
  } catch {}
};

export function installPrism() {
  if (isFace()) return;
  let teardown: (() => void) | undefined;
  let mounted: HTMLElement | undefined;
  // Pages without the client router never fire astro:page-load.
  const mount = () => {
    if (mounted === document.body) return;
    mounted = document.body;
    teardown?.();
    teardown = mountPage();
  };
  mount();
  document.addEventListener("astro:page-load", mount);
  document.addEventListener("astro:before-swap", () => teardown?.());
}

function mountPage() {
  const controller = new AbortController();
  const { signal } = controller;
  const prism = createPrism();
  const params = new URLSearchParams(location.search);
  const views = Number(stored(sessionStorage, VIEWS_KEY) ?? 0) + 1;
  store(sessionStorage, VIEWS_KEY, String(views));
  let lure: ReturnType<typeof mountLure> | undefined;
  let timer = 0;

  const summon = (tamed: boolean) => {
    if (lure || signal.aborted) return;
    clearTimeout(timer);
    if (!tamed) glint();
    prism.preload();
    lure = mountLure({
      tamed,
      onCatch: async () => {
        store(localStorage, FOUND_KEY, "1");
        await prism.open({
          onClose: () => {
            lure?.tame();
            lure?.release();
            lure?.element.focus({ preventScroll: true });
          },
        });
      },
    });
  };

  if (stored(localStorage, FOUND_KEY)) summon(true);
  else if (params.get("prism") === "lure" || views >= 2) {
    timer = window.setTimeout(() => summon(false), 1600);
  } else {
    // Curiosity: lingering, or reading all the way down.
    let dwell = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (document.visibilityState === "visible") dwell += now - last;
      last = now;
      if (dwell >= DWELL_MS) summon(false);
      else timer = window.setTimeout(tick, 1000);
    };
    timer = window.setTimeout(tick, 1000);
    addEventListener(
      "scroll",
      () => {
        const end = document.documentElement.scrollHeight - innerHeight;
        if (end > 0 && scrollY / end > 0.85) summon(false);
      },
      { signal, passive: true },
    );
  }

  if (params.get("prism") === "open") {
    summon(true);
    setTimeout(() => lure?.element.click(), 300);
  }

  return () => {
    controller.abort();
    clearTimeout(timer);
    lure?.destroy();
    prism.destroy();
  };
}

/** The first hint: light catching on glass that was always there. */
function glint() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const light = document.createElement("div");
  light.className = "prism-glint";
  light.setAttribute("aria-hidden", "true");
  document.body.append(light);
  light.addEventListener("animationend", () => light.remove(), { once: true });
}
