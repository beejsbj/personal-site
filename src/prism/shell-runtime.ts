/** Mounts, updates and unmounts lens shells. A shell module and its CSS load
 * only when its lens is active. If a shell fails, the server-rendered
 * Daylight page is revealed rather than leaving the visitor with nothing. */
import { kindOf } from "./routes";
export { kindOf } from "./routes";
import { createContentLoader, writingChanged } from "./content-client";
import type { LensShell, Route, SiteContent } from "./shells/types";

const SHELLS: Record<string, () => Promise<{ default: LensShell }>> = {
  "calling-card": () => import("./shells/calling-card/index"),
  "cut-paper": () => import("./shells/cut-paper/index"),
  "back-page": () => import("./shells/back-page/index"),
  hion: () => import("./shells/hion/index"),
};

export const hasShell = (lens: string) => lens in SHELLS;

/** Fetch and evaluate a shell without mounting it. */
export function prewarmShell(lens: string) {
  if (!hasShell(lens)) return;
  SHELLS[lens]().catch(() => {});
  loadContent().catch(() => {});
}

const contentLoader = createContentLoader();
let fixtureContent: SiteContent | undefined;
const loadContent = (route?: Route) =>
  fixtureContent
    ? Promise.resolve(fixtureContent)
    : contentLoader.load(
        route?.kind === "writing-entry" ? route.slug : undefined,
        route?.kind === "writing" || route?.kind === "writing-entry",
      );

/** The test harness mounts shells on fixture content at a pretend route. */
let pretend: (() => Route) | undefined;
export function useSource(source: {
  content: SiteContent;
  route: () => Route;
}) {
  fixtureContent = source.content;
  pretend = source.route;
}

export function currentRoute(): Route {
  if (pretend) return pretend();
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const { kind, slug } = kindOf(location.pathname);
  const main = (document.getElementById("main-content")?.cloneNode(true) ??
    document.createElement("main")) as HTMLElement;
  main.removeAttribute("id");
  const notFound = !!main.querySelector(
    '[data-part="page.title"][data-ref="not-found"]',
  );
  const safeKind =
    notFound && (kind === "writing" || kind === "writing-entry")
      ? "other"
      : kind;
  return {
    kind: safeKind,
    path,
    slug: safeKind === "other" ? undefined : slug,
    title: document.title,
    notFound,
    main,
  };
}

// A prism face is a preview inside someone else's page: it must never take
// focus from the host, whatever a shell does on route change.
if (document.documentElement.hasAttribute("data-prism-face")) {
  HTMLElement.prototype.focus = () => {};
}

const idleListeners = new Set<(idle: boolean) => void>();
const prismListeners = new Set<(open: boolean) => void>();
/** The page is on its face of the open prism (Prism Exit to stepping in). */
const inPrism = () =>
  document.documentElement.classList.contains("prism-is-open");
let wasInPrism = inPrism();
new MutationObserver((records) => {
  if (records.some((record) => record.attributeName === "data-prism-idle")) {
    const idle = document.documentElement.hasAttribute("data-prism-idle");
    idleListeners.forEach((listener) => listener(idle));
  }
  const open = inPrism();
  if (open !== wasInPrism) {
    wasInPrism = open;
    prismListeners.forEach((listener) => listener(open));
  }
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-prism-idle", "class"],
});

let active:
  | {
      lens: string;
      shell: LensShell;
      controller: AbortController;
      content: SiteContent;
    }
  | undefined;
let pending: Promise<void> = Promise.resolve();

function shellRoot() {
  let root = document.getElementById("lens-shell");
  if (!root) {
    root = document.createElement("div");
    root.id = "lens-shell";
    document.body.prepend(root);
  }
  return root;
}

async function mount(lens: string) {
  const root = shellRoot();
  const route = currentRoute();
  if (active?.lens === lens) {
    try {
      const data = await loadContent(route);
      if (
        currentRoute().path !== route.path ||
        document.documentElement.dataset.lens !== lens
      )
        return;
      const refresh =
        (route.kind === "writing" || route.kind === "writing-entry") &&
        writingChanged(active.content, data);
      Object.assign(active.content, data);
      return await active.shell.update({ ...route, refresh });
    } catch (error) {
      console.error(`Lens shell "${lens}" failed; showing Daylight.`, error);
      unmount();
      document.documentElement.removeAttribute("data-lens-shell");
      return;
    }
  }
  unmount();
  if (!hasShell(lens)) return;
  const controller = new AbortController();
  try {
    const [module, data] = await Promise.all([
      SHELLS[lens](),
      loadContent(route),
    ]);
    if (
      document.documentElement.dataset.lens !== lens ||
      currentRoute().path !== route.path
    )
      return;
    const shell = module.default;
    const settled = document.documentElement.hasAttribute("data-prism-settled");
    active = { lens, shell, controller, content: data };
    root.dataset.shell = lens;
    const listeners = new Set<(idle: boolean) => void>();
    const prismWatchers = new Set<(open: boolean) => void>();
    controller.signal.addEventListener("abort", () => {
      listeners.forEach((listener) => idleListeners.delete(listener));
      prismWatchers.forEach((listener) => prismListeners.delete(listener));
    });
    await shell.mount({
      root,
      content: data,
      route,
      face: document.documentElement.hasAttribute("data-prism-face"),
      settled,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      signal: controller.signal,
      isIdle: () => document.documentElement.hasAttribute("data-prism-idle"),
      onIdleChange(listener) {
        listeners.add(listener);
        idleListeners.add(listener);
      },
      inPrism,
      onPrismChange(listener) {
        prismWatchers.add(listener);
        prismListeners.add(listener);
      },
    });
    if (
      document.documentElement.dataset.lens !== lens ||
      currentRoute().path !== route.path
    ) {
      unmount();
      return;
    }
    if (settled) settle(root);
    document.documentElement.setAttribute("data-lens-shell", "");
    document.documentElement.setAttribute("data-shell-ready", "");
  } catch (error) {
    console.error(`Lens shell "${lens}" failed; showing Daylight.`, error);
    controller.abort();
    active = undefined;
    root.replaceChildren();
    document.documentElement.removeAttribute("data-lens-shell");
  }
}

/** A settled arrival lands at rest: whatever entrance the first screen
 * started on its own (any finite CSS or Web animation, or transition, in the
 * shell) jumps to its end before it is painted. Loops keep running. Shells
 * skip the entrances they drive from script themselves (ShellContext.settled). */
export function settle(root: Element) {
  for (const animation of root.getAnimations({ subtree: true })) {
    if (animation.effect?.getComputedTiming().iterations === Infinity) continue;
    try {
      animation.finish();
    } catch {}
  }
}

function unmount() {
  if (!active) return;
  active.controller.abort();
  active.shell.unmount?.();
  active = undefined;
  const root = shellRoot();
  root.replaceChildren();
  delete root.dataset.shell;
  document.documentElement.removeAttribute("data-shell-ready");
}

/** Bring the shell in line with the current lens and URL. Serialised, so
 * rapid lens changes and navigations settle in order. */
export function syncShell(): Promise<void> {
  const lens = document.documentElement.dataset.lens ?? "daylight";
  pending = pending.then(() => mount(lens)).catch(() => {});
  return pending;
}
