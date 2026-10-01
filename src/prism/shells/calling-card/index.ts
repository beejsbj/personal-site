/** Calling Card: the portfolio as a Persona 5 game UI.
 *
 * Home is the pause menu (COMMAND). Every section is a game screen you
 * back out of with Esc: projects are the equipment screen, a project is an
 * item file, the lab is a request board, about is a confidant card, the
 * resume is the STATUS screen, updates arrive as phone messages and contact
 * is a literal calling card. Screens change behind a red-and-black slash. */
import "./shell.css";
import type { LensShell, Route, ShellContext } from "../types";
import type { Env, Screen, ScreenFactory } from "./chrome";
import { copyOf, isTyping } from "./chrome";
import { h } from "./dom";
import { home, rememberCommand } from "./home";
import { cardPanel, phonePanel, type Panel } from "./panels";
import { projectEntry, projects } from "./projects";
import { lab, labEntry } from "./lab";
import { about } from "./about";
import { resume } from "./resume";
import { other } from "./other";
import { createWipe, type Wipe } from "./wipe";
import { pressPrompt, setMotion, shake, wireClicks } from "./micro";

const FACTORIES: Record<Route["kind"], ScreenFactory> = {
  home,
  projects,
  project: projectEntry,
  lab,
  "lab-entry": labEntry,
  about,
  resume,
  other,
};

let ctx: ShellContext | undefined;
let env: Env | undefined;
let stage: HTMLElement;
let panelHost: HTMLElement;
let wipe: Wipe;
let screen: Screen | undefined;
let screenController: AbortController | undefined;
let panel: { panel: Panel; opener?: HTMLElement } | undefined;
let queue: Promise<void> = Promise.resolve();
let pendingTitle: string | undefined;
let currentPath: string | undefined;

function build(route: Route) {
  screenController?.abort();
  screen?.destroy?.();
  screenController = new AbortController();
  const signal = AbortSignal.any
    ? AbortSignal.any([ctx!.signal, screenController.signal])
    : ctx!.signal;
  const next = FACTORIES[route.kind](route, { ...env!, signal });
  currentPath = route.path;
  rememberCommand(route.kind);
  stage.replaceChildren(next.el);
  next.el.dataset.enter = ctx!.reducedMotion ? "calm" : "in";
  screen = next;
  return next;
}

function openPanel(kind: "phone" | "card", opener?: HTMLElement) {
  if (!ctx || !env) return;
  closePanel(false);
  const built = kind === "phone" ? phonePanel(ctx.content) : cardPanel(ctx.content);
  panel = { panel: built, opener };
  panelHost.replaceChildren(built.el);
  stage.inert = true;
  built.el.dataset.state = "open";
  built.opened?.();
  shake(stage, 0.8);
  built.el.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-cc-close]")) closePanel();
  });
  if (!ctx.face) built.focus.focus({ preventScroll: true });
}

function closePanel(restore = true) {
  if (!panel) return;
  const { opener, panel: open } = panel;
  panel = undefined;
  stage.inert = false;
  open.el.dataset.state = "closing";
  const done = () => open.el.remove();
  if (ctx?.reducedMotion) done();
  else setTimeout(done, 220);
  if (restore) opener?.focus({ preventScroll: true });
}

function isInternal(link: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target && link.target !== "_self") return false;
  if (link.hasAttribute("download")) return false;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return false;
  if (url.pathname === location.pathname) return false;
  return true;
}

function onClick(event: MouseEvent) {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
  if (!link || !isInternal(link, event)) return;
  const title = link.dataset.ccTitle ?? link.textContent?.trim() ?? "";
  pendingTitle = title.slice(0, 28);
  if (!ctx?.face) {
    shake(stage);
    void wipe.cover(pendingTitle);
  }
}

function onKey(event: KeyboardEvent) {
  if (!screen || event.metaKey || event.ctrlKey || event.altKey) return;
  if (isTyping(event.target)) return;
  if (!event.repeat) pressPrompt(screen.el, event.key);
  if (panel) {
    if (event.key === "Escape" || event.key === "Backspace") {
      event.preventDefault();
      closePanel();
    }
    return;
  }
  if (screen.onKey?.(event)) {
    event.preventDefault();
    return;
  }
  if ((event.key === "Escape" || event.key === "Backspace") && screen.back) {
    event.preventDefault();
    screen.back.click();
    return;
  }
  const key = event.key.toLowerCase();
  if ((key === "q" || key === "e") && ctx) {
    const shoulders = screen.el.querySelectorAll<HTMLAnchorElement>(".cc-tabs__shoulder");
    const target = shoulders[key === "q" ? 0 : 1];
    if (target) {
      event.preventDefault();
      target.click();
    }
  }
}

async function go(route: Route) {
  if (!ctx) return;
  // The runtime also calls update() for the page it just mounted.
  if (route.path === currentPath && !pendingTitle) return;
  closePanel(false);
  // The wipe's title card: the link's own name, else the screen's.
  const title = pendingTitle ?? copyOf(ctx.content).sections[route.kind];
  pendingTitle = undefined;
  if (ctx.face) {
    build(route);
    return;
  }
  await wipe.cover(title);
  const next = build(route);
  next.heading.focus({ preventScroll: true });
  await wipe.reveal();
}

function onIdle(idle: boolean) {
  const animations = ctx?.root.getAnimations({ subtree: true }) ?? [];
  for (const animation of animations) {
    if (animation instanceof CSSAnimation || animation instanceof CSSTransition) continue;
    if (idle) animation.pause();
    else animation.play();
  }
}

const shell: LensShell = {
  mount(context) {
    ctx = context;
    const { root, signal } = context;
    env = {
      content: context.content,
      face: context.face,
      reducedMotion: context.reducedMotion,
      signal,
      isIdle: () => context.isIdle(),
      open: openPanel,
    };
    root.classList.add("cc-root");
    if (context.face) root.dataset.face = "";
    setMotion({ reduced: context.reducedMotion, isIdle: () => context.isIdle(), signal });
    if (!context.face) wireClicks(root, signal);
    stage = h("div", { class: "cc-stage" });
    panelHost = h("div", { class: "cc-panels" });
    const skip = h("a", { class: "cc-skip", href: "#cc-main" }, context.content.site.skipLink);
    skip.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        stage.querySelector<HTMLElement>("#cc-main")?.focus();
      },
      { signal },
    );
    root.replaceChildren(skip, stage, panelHost);
    wipe = createWipe(root, context.reducedMotion);
    build(context.route);
    root.addEventListener("click", onClick, { signal });
    // Which hand is on the controller: touch screens get the tap-again cue.
    root.dataset.input = matchMedia("(hover: none)").matches ? "touch" : "mouse";
    root.addEventListener(
      "pointerdown",
      (event) => {
        root.dataset.input = event.pointerType === "mouse" ? "mouse" : "touch";
      },
      { signal, capture: true },
    );
    document.addEventListener("keydown", onKey, { signal });
    context.onIdleChange(onIdle);
  },
  update(route) {
    queue = queue.then(() => go(route)).catch((error) => console.error(error));
    return queue;
  },
  unmount() {
    screenController?.abort();
    screen?.destroy?.();
    ctx?.root.classList.remove("cc-root");
    if (ctx) {
      delete ctx.root.dataset.face;
      delete ctx.root.dataset.input;
    }
    ctx = undefined;
    env = undefined;
    screen = undefined;
    panel = undefined;
  },
};

export default shell;
