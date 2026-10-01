/** Cut Paper (EmotiTone): the portfolio as a DAW session, cut from paper
 * and lit by a synth. The transport plays the career; the browser's seven
 * solfège keys are the navigation; each route opens a view of the session
 * (clip launcher, arrangement, clip, devices, liner notes, roles). Route
 * changes land on the beat: a note-coloured playhead punches the new view
 * in over the old. Sound is opt-in and never plays in a prism face. */
// Carried inside the persistent root rather than <head>: the client router
// swaps <head> on navigation and would drop a lazily injected stylesheet.
import css from "./shell.css?inline";
import micro from "./micro.css?inline";
import type { LensShell, Route, ShellContext } from "../types";
import { onNext } from "./beat";
import { h } from "./dom";
import { buildFrame, type Frame } from "./frame";
import { buildScreen, type Memory, type Screen } from "./screens";
import { closeSound } from "./sound";

const EASE_STAB = "cubic-bezier(.2, .9, .3, 1)";
const EASE_PAPER = "cubic-bezier(.7, 0, .2, 1)";
const PUNCH = 500; // two eighths

interface Live extends Screen {
  controller: AbortController;
}

let ctx: ShellContext | undefined;
let frame: Frame | undefined;
let current: Live | undefined;
let currentPath = "";
let memory: Memory = {};
let generation = 0;
const live = new Set<Live>();

/** Resolve on the next eighth note of the metronome. */
const nextEighth = () => new Promise<void>((resolve) => onNext(2, resolve));

function show(route: Route): Live {
  const controller = new AbortController();
  ctx!.signal.addEventListener("abort", () => controller.abort());
  const built = buildScreen(route, {
    content: ctx!.content,
    transport: frame!.transport,
    memory,
    reducedMotion: ctx!.reducedMotion,
    face: ctx!.face,
    signal: controller.signal,
  });
  built.el.dataset.state = "entering";
  const screen = { ...built, controller };
  live.add(screen);
  return screen;
}

function drop(screen: Live | undefined) {
  if (!screen) return;
  screen.controller.abort();
  screen.el.remove();
  live.delete(screen);
}

const land = (el: HTMLElement) => {
  el.dataset.state = "live";
};

/** Paper scraps shaken off the playhead as it punches in. */
function confetti(view: HTMLElement, before: HTMLElement, note: string) {
  const shapes = ["tri", "dot", "bar", "tab"];
  const papers = [note, "var(--cp-tomato)", "var(--cp-plum)", "var(--cp-mustard)", "var(--cp-bone)"];
  const box = h("span", { class: "cp-confetti", "aria-hidden": "true" });
  for (let i = 0; i < 12; i += 1) {
    const x = 4 + Math.random() * 92;
    const bit = h("i", {
      class: `cp-confetti__bit cp-confetti__bit--${shapes[i % shapes.length]}`,
      style: `--paper:${papers[i % papers.length]}; left:${x.toFixed(1)}%; top:${(10 + Math.random() * 50).toFixed(1)}%`,
    });
    box.append(bit);
    const drift = 30 + Math.random() * 90;
    const fall = 80 + Math.random() * 160;
    const spin = (Math.random() - 0.5) * 540;
    bit.animate(
      [
        { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
        { transform: `translate(${drift * 0.6}px, ${fall * 0.3}px) rotate(${spin * 0.5}deg) scale(1)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${drift}px, ${fall}px) rotate(${spin}deg) scale(0.6)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 500, delay: (x / 100) * PUNCH, easing: EASE_PAPER, fill: "both" },
    );
  }
  view.insertBefore(box, before);
  setTimeout(() => box.remove(), PUNCH + 1400);
}

async function transition(route: Route) {
  if (!ctx || !frame) return;
  // the runtime also syncs on the first page-load; same page, nothing to do
  if (route.path === currentPath) return;
  currentPath = route.path;
  const id = ++generation;
  const { view, wipe } = frame;
  // a navigation that overtook another leaves no strays behind
  for (const screen of [...live]) if (screen !== current) drop(screen);
  frame.light(route);
  const next = show(route);
  const previous = current;
  if (previous) {
    previous.el.setAttribute("aria-hidden", "true");
    previous.el.inert = true;
  }
  const swapIn = () => {
    frame!.settle(route);
    view.insertBefore(next.el, wipe);
    current = next;
  };

  if (ctx.face) {
    swapIn();
    drop(previous);
    land(next.el);
    return;
  }

  if (ctx.reducedMotion) {
    swapIn();
    drop(previous);
    next.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
    land(next.el);
  } else {
    await nextEighth();
    if (id !== generation) return;
    swapIn();
    land(next.el);
    wipe.dataset.state = "cutting";
    const note = wipe.style.getPropertyValue("--note") || "var(--cp-ivory)";
    confetti(view, wipe, note);
    // the playhead punches in: the new view is printed behind it
    const reveal = next.el.animate(
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
      { duration: PUNCH, easing: EASE_PAPER },
    );
    const sweep = wipe.animate(
      [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
      { duration: PUNCH, easing: EASE_PAPER, fill: "forwards" },
    );
    previous?.el.animate(
      [{ filter: "brightness(1)" }, { filter: "brightness(.45)" }],
      { duration: PUNCH, easing: EASE_PAPER, fill: "forwards" },
    );
    await Promise.all([reveal.finished, sweep.finished]).catch(() => {});
    if (id === generation) drop(previous);
    await wipe
      .animate(
        [
          { transform: "translateX(0)", opacity: 1 },
          { transform: "translateX(3%)", opacity: 0 },
        ],
        { duration: 220, easing: EASE_STAB, fill: "forwards" },
      )
      .finished.catch(() => {});
    if (id === generation) wipe.dataset.state = "idle";
  }
  if (id === generation) next.heading.focus({ preventScroll: true });
}

const shell: LensShell = {
  mount(context) {
    ctx = context;
    memory = {};
    generation = 0;
    live.clear();
    frame = buildFrame(context);
    const first = show(context.route);
    frame.view.insertBefore(first.el, frame.wipe);
    current = first;
    currentPath = context.route.path;
    const style = document.createElement("style");
    style.dataset.shellStyle = "cut-paper";
    style.textContent = `${css}\n${micro}`;
    context.root.replaceChildren(style, frame.app);
    // settle the entrance after first paint
    requestAnimationFrame(() => land(first.el));
    context.signal.addEventListener("abort", () => closeSound());
    // The router copies <html> attributes from the incoming page, which says
    // data-lens="daylight" until LensBoot re-applies the lens after the swap.
    // In between, every lens-scoped rule un-matches and CSS transitions
    // replay. Stamp the incoming root first.
    document.addEventListener(
      "astro:before-swap",
      (event) => {
        const incoming = (event as Event & { newDocument?: Document }).newDocument?.documentElement;
        const root = document.documentElement;
        if (!incoming || root.dataset.lens !== "cut-paper") return;
        for (const name of ["data-lens", "data-lens-shell", "data-shell-ready"]) {
          const value = root.getAttribute(name);
          if (value !== null) incoming.setAttribute(name, value);
        }
      },
      { signal: context.signal },
    );
  },
  update(route) {
    return transition(route);
  },
  unmount() {
    generation += 1;
    for (const screen of [...live]) drop(screen);
    closeSound();
    ctx = undefined;
    frame = undefined;
    current = undefined;
  },
};

export default shell;
