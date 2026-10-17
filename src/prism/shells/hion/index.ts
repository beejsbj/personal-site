/** Hion: the portfolio drawn by two threads of light, one cyan and one
 * magenta, in chalk pastel on black paper.
 *
 * The threads are the interface, and they are two creatures, not one cord.
 * They are slung across the top, with the destinations hanging between
 * them. From the place you are, they come down into the page together and
 * dance down it, each at its own pace: cyan quick and curly, magenta slow
 * and wide, crossing and parting as they please. They part to run down
 * either side of each section and meet again beneath it, one tying a loose
 * loop round the other. They go out of their way to circle the things they
 * love (a name, a portrait, a year), and at the bottom they let go of each
 * other in two curls. Headings are strung on woven wefts, lists dangle like
 * charms, pictures hang wound at their corners, links are pull-cords.
 *
 * As you scroll, the two draw themselves just ahead of you, each tip hot
 * with its own light: reading is following them. Leaving a screen reels
 * the drawing back up toward the line it came from, and the next screen's
 * threads grow down from the new place. Every thread on the screen is
 * the one thread, of the one width (pastel.ts THREAD). */
import { kindOf } from "../../routes";
import type { LensShell, Route, ShellContext } from "../types";
import { h, setNewTabNote, still as showStill, wait } from "./dom";
import { ink } from "./ink";
import { fabricOf } from "./fabric";
import { createLife } from "./life";
import { createLoom } from "./loom";
import { createNav, type Nav } from "./nav";
import { tooth } from "./pastel";
import { createPulse } from "./pulse";
import { createSkein, seedOf } from "./skein";
import { spinType } from "./spun";
import { weaveCovers } from "./woven";
import { buildScreen, footer } from "./screens";
import { ACROSS, createTrack } from "./track";
import { compose } from "./weave";
import "./shell.css";

interface Live {
  path: string;
  page: HTMLElement;
  loom: ReturnType<typeof createLoom>;
  skein: ReturnType<typeof createSkein>;
  life: ReturnType<typeof createLife> | undefined;
  /** The resume's timeline, when it runs across. */
  track: ReturnType<typeof createTrack> | undefined;
  controller: AbortController;
  /** When it began to leave (performance.now()), once it has. */
  left?: number;
}

let ctx: ShellContext;
let world: HTMLElement;
let stage: HTMLElement;
let nav: Nav;
let live: Live | undefined;

/** How long after a travelled-to screen arrives its woven things are
 * made (the threads are growing; the main thread should have room). */
const WOVEN = 270;

const still = () => ctx.reducedMotion || ctx.face;

/** The paper's tooth, for CSS: chalky text and thread underlines. */
let textures: Promise<Record<string, string>> | undefined;
function cssTextures() {
  return (textures ??= Promise.all(
    Object.entries(tooth()).map(
      ([key, canvas]) =>
        new Promise<[string, string]>((resolve) =>
          canvas.toBlob((blob) =>
            resolve([key, blob ? URL.createObjectURL(blob) : ""]),
          ),
        ),
    ),
  ).then((entries) => Object.fromEntries(entries)));
}

/** Run when the main thread has room (soon regardless), unless aborted. */
function later(signal: AbortSignal, delay: number, run: () => void) {
  const go = () => {
    if (!signal.aborted) run();
  };
  const timer = window.setTimeout(() => {
    if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 500 });
    else go();
  }, delay);
  signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
}

function show(route: Route, first: boolean) {
  const controller = new AbortController();
  ctx.signal.addEventListener("abort", () => controller.abort(), { once: true });
  const main = buildScreen(ctx.content, route);
  const fabric = fabricOf(route.kind);
  const page = h(
    "div",
    {
      class: "hion-page",
      "data-kind": route.kind,
      "data-fabric": fabric,
      "data-state": first ? "arriving" : "entering",
    },
    main,
    footer(ctx.content),
  );
  // The screen you left reeled up while the router fetched this one; now
  // this one's threads grow from the line.
  stage.replaceChildren(page);
  nav.setCurrent(route.path);
  // Which side the threads drop on, so the screen's head keeps clear of them.
  const drop = nav.origin();
  if (drop) {
    const width = page.clientWidth || innerWidth;
    page.style.setProperty("--hion-drop-x", `${drop[0].toFixed(0)}px`);
    page.dataset.drop =
      drop[0] < width * 0.4 ? "left" : drop[0] > width * 0.6 ? "right" : "center";
  }
  // The resume's timeline runs across, on a track that draws its own
  // threads; laid again if the window crosses over (too short for it).
  const timeline = page.querySelector<HTMLElement>("[data-timeline]");
  const across = timeline ? matchMedia(ACROSS) : undefined;
  const track =
    timeline && across?.matches
      ? createTrack({
          section: timeline,
          signal: controller.signal,
          instant: still(),
          face: ctx.face,
          isIdle: ctx.isIdle,
          onIdleChange: ctx.onIdleChange,
        })
      : undefined;
  across?.addEventListener(
    "change",
    () => {
      if (live?.page !== page || live.left !== undefined) return;
      controller.abort();
      show(route, true);
    },
    { signal: controller.signal },
  );
  // One frame loop for everything that moves on this screen.
  const pulse = createPulse({ signal: controller.signal, isIdle: ctx.isIdle, onIdleChange: ctx.onIdleChange });
  let drew = () => {};
  const loom = createLoom({
    host: page,
    signal: controller.signal,
    instant: still(),
    lookahead: ctx.face ? 0 : 0.6,
    brisk: !first,
    isIdle: ctx.isIdle,
    onIdleChange: ctx.onIdleChange,
    pulse,
    // The hions are the skein's: bodies and heads.
    beads: false,
    onDraw: () => drew(),
    compose: () => {
      const composition = compose(page, () => nav.origin(), { heads: true });
      ink(page);
      return composition;
    },
  });
  // Every thread as one system (skein.ts): the hions, the ground under
  // them, threads from a click or a touched thread, loops round what you
  // hover. A single thing is seen close up; home is the busiest.
  const skein = createSkein({
    page,
    loom,
    pulse,
    signal: controller.signal,
    instant: still(),
    scale: close(route.path) ? 2 : 1,
    lively: route.kind === "home",
    travelled: !first,
    origin: () => nav.origin(),
    seed: seedOf(route.path),
    isIdle: ctx.isIdle,
  });

  // What moves over the drawing, for a visitor who can see it move.
  const life = still()
    ? undefined
    : createLife({
        world,
        page,
        loom,
        skein,
        pulse,
        signal: controller.signal,
        isIdle: ctx.isIdle,
        onIdleChange: ctx.onIdleChange,
      });
  drew = () => (life ? life.wake() : skein.wake());
  live = { path: route.path, page, loom, skein, life, track, controller };
  // For a look from the console while developing.
  if (import.meta.env.DEV) Object.assign(window, { __hion: live });
  requestAnimationFrame(() => {
    if (controller.signal.aborted) return;
    // The threads first: they are what you follow onto the screen.
    loom.start();
    track?.start();
    life?.start();
    page.dataset.state = "here";
    // Then every thread (the skein), at once: on a screen travelled to the
    // hions are seen setting out from the line. The spun words and the
    // woven covers come a moment later, once the main thread has room:
    // none of it is needed to read the screen.
    const gone = () => live?.page !== page || live.left !== undefined;
    const ground = () => {
      if (!gone()) skein.start();
    };
    const woven = () => {
      if (gone()) return;
      spinType(page, { skein, pulse, instant: still(), signal: controller.signal });
      weaveCovers(page, { signal: controller.signal, fabric });
    };
    if (still()) {
      ground();
      woven();
    } else {
      ground();
      later(controller.signal, first ? 0 : WOVEN, woven);
    }
  });
  // Keyboard travel ahead of the drawing brings the drawing with it.
  page.addEventListener(
    "focusin",
    (event) => {
      const target = event.target as HTMLElement;
      const y = target.getBoundingClientRect().bottom - page.getBoundingClientRect().top;
      loom.catchUp(y + innerHeight * 0.3);
    },
    { signal: controller.signal },
  );
  if (!first && !ctx.face) main.focus({ preventScroll: true });
}

/** The screen you are on lets go: its drawing reels back up toward the
 * line and its threads go. Begun at the click; the next screen need not
 * be here yet, and it replaces this one whole when it comes. */
function leave(path: string) {
  const leaving = live;
  if (!leaving || leaving.left !== undefined) return;
  leaving.left = performance.now();
  nav.close();
  if (still()) return;
  // What has to be measured first, then what moves: one layout, not one
  // per step, in the frame you clicked.
  leaving.loom.release();
  leaving.track?.release();
  leaving.skein.release(closer(leaving.page, path));
  leaving.life?.release();
  nav.setCurrent(path);
  leaving.page.dataset.state = "leaving";
  leaving.page.setAttribute("inert", "");
}

/** A single thing seen close: a project, a lab entry, a post. */
const close = (path: string) => {
  const { kind } = kindOf(path);
  return kind === "project" || kind === "lab-entry" || kind === "writing-entry";
};

/** The link you followed, when it opens one thing out of a cloth of many
 * (a project or a post from a list): the threads magnify round it on the way. */
let followed: { el: HTMLAnchorElement; at: number } | undefined;

function closer(page: HTMLElement, path: string): [number, number] | undefined {
  if (!close(path)) return undefined;
  if (!followed || performance.now() - followed.at > 2000 || !page.contains(followed.el)) return undefined;
  if (new URL(followed.el.href, location.href).pathname.replace(/\/$/, "") !== path.replace(/\/$/, "")) {
    return undefined;
  }
  const p = page.getBoundingClientRect();
  const r = followed.el.getBoundingClientRect();
  return [(r.left + r.right) / 2 - p.left, (r.top + r.bottom) / 2 - p.top];
}

const shell: LensShell = {
  async mount(context) {
    ctx = context;
    const { root, content, signal } = context;
    setNewTabNote(content.lenses.hion.newTab);
    nav = createNav(content, signal, context.face);
    stage = h("div", { class: "hion-stage" });
    const skip = h("a", { class: "hion-skip", href: "#hion-main" }, content.site.skipLink);
    skip.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        live?.page.querySelector<HTMLElement>("main")?.focus();
      },
      { signal },
    );
    world = h(
      "div",
      {
        class: "hion",
        "data-face": context.face ? "" : undefined,
        "data-still": still() ? "" : undefined,
      },
      skip,
      nav.el,
      stage,
    );
    const urls = await cssTextures();
    for (const [key, url] of Object.entries(urls)) {
      world.style.setProperty(`--hion-tooth-${key}`, `url("${url}")`);
    }
    world.addEventListener(
      "click",
      (event) => {
        const el = (event.target as Element).closest?.("a");
        if (el) followed = { el, at: performance.now() };
      },
      { capture: true, signal },
    );
    // A destination pulled: the screen lets go at once, while the router
    // fetches the page (update() follows).
    document.addEventListener(
      "astro:before-preparation",
      (event) => {
        const to = (event as Event & { to?: URL }).to;
        if (!to || to.origin !== location.origin) return;
        const path = to.pathname.replace(/\/+$/, "") || "/";
        if (live && path !== live.path) leave(path);
      },
      { signal },
    );
    // Hion moves between screens its own way. The router's view transition
    // would first hold the page still to photograph it (hundreds of
    // milliseconds on a page of canvases), for a crossfade prism.css turns
    // off anyway: skip it while Hion is here.
    const native = document.startViewTransition;
    if (native) {
      document.startViewTransition = function (this: Document, ...args: Parameters<typeof native>) {
        const transition = native.apply(this, args);
        // A skipped transition rejects `ready`, which nobody else awaits:
        // left alone it is an uncaught "Transition was skipped" every time.
        transition.ready.catch(() => {});
        transition.skipTransition();
        return transition;
      } as typeof native;
      signal.addEventListener("abort", () => Reflect.deleteProperty(document, "startViewTransition"), { once: true });
    }
    root.replaceChildren(world);
    // The line is drawn once: shown as a still (dom.ts).
    for (const canvas of world.querySelectorAll<HTMLCanvasElement>(".hion-nav canvas")) showStill(canvas);
    // Let the faces arrive before measuring words to hang them.
    await Promise.race([document.fonts?.ready, wait(600)]);
    show(context.route, true);
    signal.addEventListener("abort", () => live?.controller.abort());
  },

  async update(route) {
    if (live && route.path === live.path && !route.refresh) return;
    const leaving = live;
    // Usually already begun, at the click.
    leave(route.path);
    leaving?.controller.abort();
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    show(route, false);
  },

  unmount() {
    live?.controller.abort();
    live = undefined;
  },
};

export default shell;
