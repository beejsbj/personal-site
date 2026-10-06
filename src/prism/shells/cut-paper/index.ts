/** Cut Paper (EmotiTone): the portfolio as a DAW session, cut from paper and
 * lit by a synth. The career is the arrangement: every project a clip at
 * its real date singing its own motif, the roles a walking bass, updates
 * ringing as markers, all over one chord loop in F major. Play runs it
 * from the first clip to today; mute and solo change what you hear;
 * hovering a clip auditions it. Every route is a view of the session, and
 * route changes land on the next eighth note behind a sweep of the
 * playhead. Sound is opt-in and never plays in a prism face. */
// Carried inside the persistent root rather than <head>: the client router
// swaps <head> on navigation and would drop a lazily injected stylesheet.
import css from "./shell.css?inline";
import type { LensShell, Route, RouteKind, ShellContext } from "../types";
import { closeSound, stopAudition } from "./audio";
import { noteVar, type Env, type Screen } from "./bits";
import { h, setNewTabNote } from "./dom";
import { EIGHTH_SECONDS } from "./music";
import { buildFrame, type Frame } from "./frame";
import { buildScreen } from "./views";

const EIGHTH = EIGHTH_SECONDS * 1000;
const SWEEP = EIGHTH * 2;
const EASE_STAB = "cubic-bezier(.2, .9, .3, 1)";
const EASE_PAPER = "cubic-bezier(.7, 0, .2, 1)";

interface Live extends Screen {
  controller: AbortController;
}

let ctx: ShellContext | undefined;
let frame: Frame | undefined;
let current: Live | undefined;
let currentPath = "";
let generation = 0;
const live = new Set<Live>();

/** The key (scale degree) each kind of route lives on. */
const DEGREE: Partial<Record<RouteKind, number>> = { home: 0, projects: 1, project: 1, lab: 2, "lab-entry": 2, about: 3, resume: 4, writing: 5, "writing-entry": 5 };

/** Wait for the next eighth note of the session's tempo. */
const nextEighth = () => new Promise<void>((resolve) => setTimeout(resolve, EIGHTH - (performance.now() % EIGHTH)));

function show(route: Route): Live {
  const controller = new AbortController();
  ctx!.signal.addEventListener("abort", () => controller.abort(), { once: true, signal: controller.signal });
  const env: Env = {
    content: ctx!.content,
    copy: ctx!.content.lenses["cut-paper"],
    session: frame!.session,
    transport: frame!.transport,
    signal: controller.signal,
    face: ctx!.face,
    reducedMotion: ctx!.reducedMotion,
    scroller: frame!.scroller,
    overlay: frame!.overlay,
  };
  const built = buildScreen(route, env);
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

/** Paper scraps shaken off the playhead as it sweeps. */
function confetti(host: HTMLElement, note: string) {
  const shapes = ["tri", "dot", "bar", "tab"];
  const papers = [note, "var(--cp-tomato)", "var(--cp-plum)", "var(--cp-mustard)", "var(--cp-bone)"];
  const box = h("span", { class: "cp-confetti", "aria-hidden": "true" });
  for (let i = 0; i < 10; i += 1) {
    const x = 4 + Math.random() * 92;
    const bit = h("i", {
      class: `cp-confetti__bit cp-confetti__bit--${shapes[i % shapes.length]}`,
      style: `--paper:${papers[i % papers.length]}; left:${x.toFixed(1)}%; top:${(8 + Math.random() * 40).toFixed(1)}%`,
    });
    box.append(bit);
    const drift = 30 + Math.random() * 90;
    const fall = 80 + Math.random() * 160;
    const spin = (Math.random() - 0.5) * 540;
    bit.animate(
      [
        { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
        { transform: `translate(${drift * 0.6}px, ${fall * 0.3}px) rotate(${spin * 0.5}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${drift}px, ${fall}px) rotate(${spin}deg) scale(0.6)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 500, delay: (x / 100) * SWEEP, easing: EASE_PAPER, fill: "both" },
    );
  }
  host.append(box);
  setTimeout(() => box.remove(), SWEEP + 1400);
}

async function transition(route: Route) {
  if (!ctx || !frame) return;
  // the runtime also syncs on the first page load; same page, nothing to do
  if (route.path === currentPath) return;
  currentPath = route.path;
  const id = ++generation;
  const { scroller, wipe } = frame;
  stopAudition();
  for (const screen of [...live]) if (screen !== current) drop(screen);
  frame.light(route.kind);
  const note = noteVar(DEGREE[route.kind] ?? 6);
  wipe.style.setProperty("--note", note);
  const next = show(route);
  const previous = current;
  if (previous) {
    previous.el.setAttribute("aria-hidden", "true");
    previous.el.inert = true;
  }
  const swapIn = () => {
    // the old view stays on screen under the sweep, but stops listening now,
    // so two views never act on the same scroller
    previous?.controller.abort();
    scroller.append(next.el);
    scroller.scrollTop = 0;
    current = next;
  };

  if (ctx.face || ctx.reducedMotion) {
    drop(previous);
    swapIn();
    if (!ctx.face) next.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    land(next.el);
  } else {
    await nextEighth();
    if (id !== generation) return;
    swapIn();
    land(next.el);
    void sweepIn(id, next, previous, note);
    return;
  }
  if (id === generation) next.heading.focus({ preventScroll: true });
}

/** The playhead sweeps across and the new view is printed behind it. Runs
 * after `update()` has resolved, so quick clicks never queue behind it. */
async function sweepIn(id: number, next: Live, previous: Live | undefined, note: string) {
  if (!frame) return;
  const { wipe } = frame;
  wipe.dataset.state = "cutting";
  confetti(frame.overlay, note);
  // the playhead sweeps across; the new view is printed behind it
  const reveal = next.el.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], { duration: SWEEP, easing: EASE_PAPER });
  const sweep = wipe.animate([{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }], { duration: SWEEP, easing: EASE_PAPER, fill: "forwards" });
  await Promise.all([reveal.finished, sweep.finished]).catch(() => {});
  if (id === generation) drop(previous);
  await wipe
    .animate([{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(3%)", opacity: 0 }], { duration: 200, easing: EASE_STAB, fill: "forwards" })
    .finished.catch(() => {});
  if (id === generation) wipe.dataset.state = "idle";
  if (id === generation) next.heading.focus({ preventScroll: true });
}

const shell: LensShell = {
  mount(context) {
    ctx = context;
    generation = 0;
    live.clear();
    setNewTabNote(context.content.lenses["cut-paper"].opensInNewTab);
    frame = buildFrame(context);
    const style = document.createElement("style");
    style.dataset.shellStyle = "cut-paper";
    style.textContent = css;
    context.root.replaceChildren(style, frame.app);
    frame.light(context.route.kind);
    frame.wipe.style.setProperty("--note", noteVar(DEGREE[context.route.kind] ?? 6));
    const first = show(context.route);
    frame.scroller.append(first.el);
    current = first;
    currentPath = context.route.path;
    requestAnimationFrame(() => land(first.el));
    // a face, or a page turned away in the prism, never plays
    const transport = frame.transport;
    transport.setIdle(context.isIdle());
    context.onIdleChange((idle) => transport.setIdle(idle));
    context.signal.addEventListener("abort", () => closeSound());
    // The router copies <html> attributes from the incoming page, which says
    // data-lens="daylight" until LensBoot re-applies the lens after the
    // swap. In between, lens-scoped rules un-match and transitions replay.
    // Stamp the incoming root first.
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
