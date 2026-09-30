/** Cut Paper (EmotiTone): the portfolio as an instrument. Seven solfège keys
 * are the navigation; each route is a screen on the stage above them, and
 * route changes land on the beat behind a torn sheet of the pressed key's
 * colour. Sound is opt-in and never plays in a prism face. */
// Carried inside the persistent root rather than <head>: the client router
// swaps <head> on navigation and would drop a lazily injected stylesheet.
import css from "./shell.css?inline";
import micro from "./micro.css?inline";
import type { LensShell, Route, ShellContext } from "../types";
import { onNext } from "./beat";
import { h } from "./dom";
import { buildFrame, type Frame } from "./frame";
import { buildScreen, type Memory } from "./screens";
import { closeSound } from "./sound";

const EIGHTH = 250; // ms at 120 bpm
const EASE_STAB = "cubic-bezier(.2, .9, .3, 1)";
const EASE_PAPER = "cubic-bezier(.7, 0, .2, 1)";
const EASE_SWING = "cubic-bezier(.7, -0.2, .3, 1.2)";

let ctx: ShellContext | undefined;
let frame: Frame | undefined;
let current: HTMLElement | undefined;
let currentPath = "";
let memory: Memory = {};
let generation = 0;

/** Resolve on the next eighth note of the status-bar metronome. */
const nextEighth = () => new Promise<void>((resolve) => onNext(2, resolve));

/** A handful of cut shapes falls across the stage as the sheet pulls away:
 * the pressed key's colour plus brand paper, fluttering with the paper
 * ease, each starting as the tear's edge passes it. Fourteen elements,
 * transform and opacity only, gone after a bar. */
function confetti(stage: HTMLElement, before: HTMLElement, note: string) {
  const shapes = ["tri", "dot", "bar", "tab"];
  const papers = [note, "var(--cp-tomato)", "var(--cp-plum)", "var(--cp-mustard)", "var(--cp-bone)"];
  const box = h("span", { class: "cp-confetti", "aria-hidden": "true" });
  for (let i = 0; i < 14; i += 1) {
    const x = Math.random() * 100;
    const bit = h("i", {
      class: `cp-confetti__bit cp-confetti__bit--${shapes[i % shapes.length]}`,
      style: `--paper:${papers[i % papers.length]}; left:${x.toFixed(1)}%`,
    });
    box.append(bit);
    const drift = (Math.random() - 0.5) * 140;
    const spin = (Math.random() - 0.5) * 720;
    const flip = 0.5 + Math.random();
    bit.animate(
      [
        { transform: "translate(0, -24px) rotate(0deg) scaleX(1)", opacity: 1 },
        { transform: `translate(${drift * 0.4}px, 22vh) rotate(${spin * 0.4}deg) scaleX(${flip * 0.3})`, opacity: 1, offset: 0.35 },
        { transform: `translate(${drift * 0.8}px, 48vh) rotate(${spin * 0.75}deg) scaleX(1)`, opacity: 0.85, offset: 0.7 },
        { transform: `translate(${drift}px, 70vh) rotate(${spin}deg) scaleX(${flip * 0.25})`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 700, delay: x * 3.4, easing: EASE_PAPER, fill: "forwards" },
    );
  }
  stage.insertBefore(box, before);
  setTimeout(() => box.remove(), EIGHTH * 10);
}

function show(route: Route) {
  const built = buildScreen(route, ctx!.content, memory, {
    reducedMotion: ctx!.reducedMotion,
    face: ctx!.face,
  });
  built.el.dataset.state = "entering";
  return built;
}

const land = (el: HTMLElement) => {
  el.dataset.state = "live";
};

async function transition(route: Route) {
  if (!ctx || !frame) return;
  // the runtime also syncs on the first page-load; same page, nothing to do
  if (route.path === currentPath) return;
  currentPath = route.path;
  const id = ++generation;
  const { stage, tear } = frame;
  frame.light(route);
  const next = show(route);
  const previous = current;
  previous?.setAttribute("aria-hidden", "true");
  if (previous) previous.inert = true;

  const swap = () => {
    frame!.settle(route);
    previous?.remove();
    stage.insertBefore(next.el, tear);
    current = next.el;
  };

  if (ctx.face) {
    swap();
    land(next.el);
    return;
  }

  if (ctx.reducedMotion) {
    swap();
    next.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
    land(next.el);
  } else {
    await nextEighth();
    if (id !== generation) return;
    tear.dataset.state = "cutting";
    // the label lags the sheet a touch, like print on a page being pulled
    frame.tearLabel.animate(
      [{ transform: "translateX(-9%) rotate(-5deg)" }, { transform: "translateX(0) rotate(-5deg)" }],
      { duration: EIGHTH + 120, easing: EASE_STAB },
    );
    await tear
      .animate(
        [
          { transform: "translateX(-112%) skewX(-6deg)" },
          { transform: "translateX(0) skewX(0deg)" },
        ],
        { duration: EIGHTH, easing: EASE_STAB, fill: "forwards" },
      )
      .finished.catch(() => {});
    swap();
    next.el.animate(
      [
        { transform: "translateY(14px)", opacity: 0.4 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: 360, easing: EASE_SWING },
    );
    land(next.el);
    confetti(stage, tear, tear.style.getPropertyValue("--note") || "var(--cp-ivory)");
    await tear
      .animate(
        [
          { transform: "translateX(0) skewX(0deg)" },
          { transform: "translateX(112%) skewX(6deg)" },
        ],
        { duration: 360, easing: EASE_PAPER, fill: "forwards" },
      )
      .finished.catch(() => {});
    tear.dataset.state = "idle";
  }
  if (id === generation) next.heading.focus({ preventScroll: true });
}

const shell: LensShell = {
  mount(context) {
    ctx = context;
    memory = {};
    generation = 0;
    frame = buildFrame(context);
    const first = show(context.route);
    frame.stage.insertBefore(first.el, frame.tear);
    current = first.el;
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
    // replay (the log drawer flashed open). Stamp the incoming root first.
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
    closeSound();
    ctx = undefined;
    frame = undefined;
    current = undefined;
  },
};

export default shell;
