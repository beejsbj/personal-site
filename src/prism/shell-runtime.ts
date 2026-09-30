/** Mounts, updates and unmounts lens shells. A shell module and its CSS load
 * only when its lens is active. If a shell fails, the server-rendered
 * Daylight page is revealed rather than leaving the visitor with nothing. */
import type { LensShell, Route, RouteKind, SiteContent } from "./shells/types";

const SHELLS: Record<string, () => Promise<{ default: LensShell }>> = {
  "calling-card": () => import("./shells/calling-card/index"),
  "cut-paper": () => import("./shells/cut-paper/index"),
  "back-page": () => import("./shells/back-page/index"),
  hion: () => import("./shells/hion/index"),
};

export const hasShell = (lens: string) => lens in SHELLS;

let content: Promise<SiteContent> | undefined;
const loadContent = () =>
  (content ??= fetch("/prism/content.json").then((response) =>
    response.json(),
  ));

export function currentRoute(): Route {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const [first, slug] = path.split("/").filter(Boolean);
  const kinds: Record<string, RouteKind> = {
    projects: slug ? "project" : "projects",
    lab: slug ? "lab-entry" : "lab",
    about: "about",
    resume: "resume",
  };
  const kind: RouteKind = path === "/" ? "home" : (kinds[first] ?? "other");
  const main = (document.getElementById("main-content")?.cloneNode(true) ??
    document.createElement("main")) as HTMLElement;
  main.removeAttribute("id");
  return { kind, path, slug, title: document.title, main };
}

const idleListeners = new Set<(idle: boolean) => void>();
new MutationObserver(() => {
  const idle = document.documentElement.hasAttribute("data-prism-idle");
  idleListeners.forEach((listener) => listener(idle));
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-prism-idle"],
});

let active:
  | { lens: string; shell: LensShell; controller: AbortController }
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
  if (active?.lens === lens) return active.shell.update(currentRoute());
  unmount();
  if (!hasShell(lens)) return;
  const controller = new AbortController();
  try {
    const [module, data] = await Promise.all([SHELLS[lens](), loadContent()]);
    if (document.documentElement.dataset.lens !== lens) return;
    const shell = module.default;
    active = { lens, shell, controller };
    root.dataset.shell = lens;
    const listeners = new Set<(idle: boolean) => void>();
    controller.signal.addEventListener("abort", () =>
      listeners.forEach((listener) => idleListeners.delete(listener)),
    );
    await shell.mount({
      root,
      content: data,
      route: currentRoute(),
      face: document.documentElement.hasAttribute("data-prism-face"),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      signal: controller.signal,
      isIdle: () =>
        document.documentElement.hasAttribute("data-prism-idle"),
      onIdleChange(listener) {
        listeners.add(listener);
        idleListeners.add(listener);
      },
    });
    document.documentElement.setAttribute("data-shell-ready", "");
  } catch (error) {
    console.error(`Lens shell "${lens}" failed; showing Daylight.`, error);
    controller.abort();
    active = undefined;
    root.replaceChildren();
    document.documentElement.removeAttribute("data-lens-shell");
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
