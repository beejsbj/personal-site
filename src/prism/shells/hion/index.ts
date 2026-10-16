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
 * As you scroll, the two draw themselves just ahead of you, a bead of light
 * at each tip: reading is following them. Leaving a screen reels the
 * drawing back up toward the line it came from, and the next screen's
 * threads come down from the new place. */
import { kindOf } from "../../routes";
import type { LensShell, Route, ShellContext } from "../types";
import { h, setNewTabNote, still as showStill, wait } from "./dom";
import { ink } from "./ink";
import { type Fabric, fabricAt, fabricOf } from "./fabric";
import { createLife } from "./life";
import { createLoom } from "./loom";
import { createNav, type Nav } from "./nav";
import { tooth } from "./pastel";
import { clothCanvas } from "./stitch";
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

/** The ribbon the next screen comes down as: begun the moment you pull a
 * destination, before the screen itself has arrived, so the page answers
 * in the frame you clicked. The screen is clipped to it when it comes. */
interface Ribbon {
  path: string;
  /** The swatch it falls from, on screen. */
  from: { left: number; right: number; top: number };
  /** When it began, on the document timeline. */
  start: number;
}

let ctx: ShellContext;
let world: HTMLElement;
let stage: HTMLElement;
let nav: Nav;
let live: Live | undefined;
let ribbon: Ribbon | undefined;

/** How long a ribbon takes to unfurl, and how far through it has fallen
 * to the foot of the screen (then it spreads to the whole page). */
const PULL = 640;
const DROP = 0.42;
/** How long a leaving screen takes to reel up (loom.ts, threads.ts). */
const LEAVE = 440;

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
  // A screen still reeling up stays under the new one until it has gone.
  for (const child of [...stage.children]) if (!child.hasAttribute("data-lingering")) child.remove();
  stage.append(page);
  // Its fabric pulled down from the line like a blind (not on arrival: the
  // line and the page come together then).
  nav.setCurrent(route.path);
  if (!first && !still()) pullDown(page, route.path);
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
    // Then the ground, the spun words and the woven covers, once the
    // ribbon has fallen and the main thread has room: none of it is needed
    // to read the screen.
    const ground = () => {
      // Not for a screen already let go (pulled away before it settled).
      if (live?.page !== page || live.left !== undefined) return;
      skein.start();
      spinType(page, { skein, instant: still(), signal: controller.signal });
      weaveCovers(page, { signal: controller.signal, fabric });
    };
    if (still()) ground();
    else later(controller.signal, first ? 0 : PULL * DROP, ground);
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
 * line, its threads go, and the place you pulled drops and starts its
 * ribbon down. Begun at the click; the next screen need not be here yet. */
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
  ribbon = unfurl(path);
  leaving.page.dataset.state = "leaving";
  leaving.page.setAttribute("inert", "");
}

/** Keep a leaving screen where it was, under the new one, until it has
 * reeled up (the window scrolls to the top for the new one). */
function linger(leaving: Live, scrolled: number) {
  const { page } = leaving;
  page.setAttribute("data-lingering", "");
  page.setAttribute("aria-hidden", "true");
  Object.assign(page.style, {
    position: "fixed",
    top: `${-scrolled}px`,
    left: "0",
    width: "100%",
    pointerEvents: "none",
  });
  const gone = Math.max(0, (leaving.left ?? 0) + LEAVE - performance.now());
  window.setTimeout(() => page.remove(), gone + 40);
}

/** The hem cloth, drawn once per fabric and width and copied after. */
const hems = new Map<string, HTMLCanvasElement>();
function hemCloth(fabric: Fabric, width: number) {
  const key = `${fabric}:${width}`;
  let source = hems.get(key);
  if (!source) {
    source = clothCanvas(fabric, Math.ceil(width / 5), 4, 5, 41);
    hems.set(key, source);
  }
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  copy.getContext("2d")!.drawImage(source, 0, 0);
  return copy;
}

/** Start the ribbon of a place down from its swatch on the line: a woven
 * hem drops from the swatch to the foot of the screen, then spreads
 * sideways until it is the whole width. Nothing slides under the line; it
 * all comes out of the thing you pulled. */
function unfurl(path: string): Ribbon {
  const width = world.clientWidth || innerWidth;
  // Where it comes from: the swatch, or (no swatch shown) where the
  // threads drop from.
  const drop = nav.origin();
  const box = nav.swatch();
  const x = drop?.[0] ?? width / 2;
  const from = box
    ? { left: box.left, right: box.right, top: Math.max(0, box.top) }
    : { left: x - 22, right: x + 22, top: 60 };
  const band = hemCloth(fabricAt(path), width);
  band.className = "hion-hem__cloth";
  const hem = h("div", { class: "hion-hem", "aria-hidden": "true", style: "position: fixed" }, band);
  world.append(hem);
  const at = (top: number, left: number, w: number) => ({
    top: `${top}px`,
    left: `${left}px`,
    width: `${w}px`,
  });
  const w0 = from.right - from.left;
  const fold = innerHeight - 20;
  const start = Number(document.timeline.currentTime ?? performance.now());
  const fall = hem.animate(
    [
      { ...at(from.top, from.left, w0), easing: "cubic-bezier(0.55, 0, 0.75, 0.35)" },
      { ...at(fold, from.left, w0), offset: DROP, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" },
      at(fold, 0, width),
    ],
    { duration: PULL, fill: "forwards" },
  );
  fall.startTime = start;
  fall.finished
    .then(() => hem.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }).finished)
    .then(() => hem.remove(), () => hem.remove());
  return { path, from, start };
}

/** Pull a new screen down as the ribbon of its own cloth: the screen is
 * shown only through the ribbon (begun at the click, or now), so it is
 * there as far as the ribbon has come. */
function pullDown(page: HTMLElement, path: string) {
  const pulled = ribbon?.path === path ? ribbon : unfurl(path);
  ribbon = undefined;
  const pageBox = page.getBoundingClientRect();
  const width = page.clientWidth || innerWidth;
  const height = page.scrollHeight;
  const fold = innerHeight - pageBox.top;
  const l = pulled.from.left - pageBox.left;
  const r = width - (pulled.from.right - pageBox.left);
  const t = pulled.from.top - pageBox.top;
  const below = (y: number) => Math.max(0, height - y);
  const clip = (top: number, right: number, bottom: number, left: number) =>
    `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  // Its own paper inside the ribbon, over the screen still reeling up.
  page.style.background = "var(--hion-black)";
  const pull = page.animate(
    [
      { clipPath: clip(t, r, below(t + 20), l), easing: "cubic-bezier(0.55, 0, 0.75, 0.35)" },
      { clipPath: clip(t, r, below(fold), l), offset: DROP, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" },
      { clipPath: clip(0, 0, below(fold), 0) },
    ],
    { duration: PULL },
  );
  pull.startTime = pulled.start;
  pull.finished.then(
    () => page.style.removeProperty("background"),
    () => {},
  );
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
    // A destination pulled: the screen lets go and its ribbon starts down
    // at once, while the router fetches the page (update() follows).
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
    // milliseconds on a page of canvases, freezing the ribbon), for a
    // crossfade prism.css turns off anyway: skip it while Hion is here.
    const native = document.startViewTransition;
    if (native) {
      document.startViewTransition = function (this: Document, ...args: Parameters<typeof native>) {
        const transition = native.apply(this, args);
        transition.skipTransition();
        return transition;
      } as typeof native;
      signal.addEventListener("abort", () => Reflect.deleteProperty(document, "startViewTransition"), { once: true });
    }
    root.replaceChildren(world);
    // The line and its swatches are drawn once: shown as stills (dom.ts).
    for (const canvas of world.querySelectorAll<HTMLCanvasElement>(".hion-nav canvas")) showStill(canvas);
    // Let the faces arrive before measuring words to hang them.
    await Promise.race([document.fonts?.ready, wait(600)]);
    show(context.route, true);
    signal.addEventListener("abort", () => live?.controller.abort());
    // Thread for the first ribbon, so the first click draws none.
    later(signal, 1500, () => hemCloth(fabricOf(context.route.kind), world.clientWidth || innerWidth));
  },

  async update(route) {
    if (live && route.path === live.path && !route.refresh) return;
    const leaving = live;
    // Usually already begun, at the click.
    leave(route.path);
    leaving?.controller.abort();
    const scrolled = scrollY;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    // The new screen comes down over the old one as it reels up, rather
    // than after it.
    if (leaving && !still()) linger(leaving, scrolled);
    show(route, false);
  },

  unmount() {
    live?.controller.abort();
    live = undefined;
  },
};

export default shell;
