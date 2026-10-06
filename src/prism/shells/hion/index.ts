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
import type { LensShell, Route, ShellContext } from "../types";
import { h, setNewTabNote, wait } from "./dom";
import { ink } from "./ink";
import { createCloth } from "./cloth";
import { createLife } from "./life";
import { createLoom } from "./loom";
import { createNav, type Nav } from "./nav";
import { tooth } from "./pastel";
import { weaveType } from "./woven";
import { buildScreen, footer } from "./screens";
import { compose } from "./weave";
import "./shell.css";

interface Live {
  path: string;
  page: HTMLElement;
  loom: ReturnType<typeof createLoom>;
  cloth: ReturnType<typeof createCloth>;
  life: ReturnType<typeof createLife> | undefined;
  controller: AbortController;
}

let ctx: ShellContext;
let world: HTMLElement;
let stage: HTMLElement;
let nav: Nav;
let live: Live | undefined;
let token = 0;

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

function show(route: Route, first: boolean) {
  const controller = new AbortController();
  ctx.signal.addEventListener("abort", () => controller.abort(), { once: true });
  const main = buildScreen(ctx.content, route);
  const page = h(
    "div",
    { class: "hion-page", "data-kind": route.kind, "data-state": first ? "arriving" : "entering" },
    main,
    footer(ctx.content),
  );
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
  const loom = createLoom({
    host: page,
    signal: controller.signal,
    instant: still(),
    lookahead: ctx.face ? 0 : 0.6,
    isIdle: ctx.isIdle,
    onIdleChange: ctx.onIdleChange,
    compose: () => {
      const composition = compose(page, () => nav.origin());
      ink(page);
      return composition;
    },
  });
  // The living cloth under it all; a single thing is seen close up.
  const cloth = createCloth({
    page,
    loom,
    signal: controller.signal,
    instant: still(),
    scale: close(route) ? 2 : 1,
    isIdle: ctx.isIdle,
    onIdleChange: ctx.onIdleChange,
  });
  // What moves over the drawing, for a visitor who can see it move.
  const life = still()
    ? undefined
    : createLife({
        world,
        page,
        loom,
        signal: controller.signal,
        isIdle: ctx.isIdle,
        onIdleChange: ctx.onIdleChange,
      });
  live = { path: route.path, page, loom, cloth, life, controller };
  requestAnimationFrame(() => {
    loom.start();
    cloth.start();
    life?.start();
    weaveType(page, { instant: still(), signal: controller.signal, isIdle: ctx.isIdle });
    page.dataset.state = "here";
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

/** A single thing seen close: a project, a lab entry, a post. */
const close = (route: Route) =>
  route.kind === "project" || route.kind === "lab-entry" || route.kind === "writing-entry";

/** The link you followed, when it opens one thing out of a cloth of many
 * (a project or a post from a list): the cloth magnifies round it on the way. */
let followed: { el: HTMLAnchorElement; at: number } | undefined;

function closer(page: HTMLElement, route: Route): [number, number] | undefined {
  if (!close(route)) return undefined;
  if (!followed || performance.now() - followed.at > 2000 || !page.contains(followed.el)) return undefined;
  if (new URL(followed.el.href, location.href).pathname.replace(/\/$/, "") !== route.path.replace(/\/$/, "")) {
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
    root.replaceChildren(world);
    // Let the faces arrive before measuring words to hang them.
    await Promise.race([document.fonts?.ready, wait(600)]);
    show(context.route, true);
    signal.addEventListener("abort", () => live?.controller.abort());
  },

  async update(route) {
    if (live && route.path === live.path && !route.refresh) return;
    const mine = ++token;
    const leaving = live;
    nav.close();
    if (leaving && !still()) {
      leaving.page.dataset.state = "leaving";
      leaving.page.setAttribute("inert", "");
      leaving.loom.release();
      leaving.cloth.release(closer(leaving.page, route));
      leaving.life?.release();
      await wait(430);
      if (mine !== token) return;
    }
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
