/** Hion: the portfolio drawn in two threads of light, cyan and magenta, in
 * chalk pastel on black paper.
 *
 * The threads are the interface. A cord strung across the top holds the
 * destinations, hanging on threads; from the place you are, a braided cord
 * drops into the page and runs all the way down it. Every screen is laid
 * out along that cord: titles hang from the line, sections are loops where
 * the cord parts into its two strands around the words, headings are strung
 * on woven wefts, lists dangle like charms, pictures hang wound at their
 * corners, links are pull-cords. As you scroll, the cord draws itself just
 * ahead of you and a bead of light rides its tip: reading is following the
 * thread. Changing screens lets the drawing go and draws the next one down
 * from its new knot on the line. */
import type { LensShell, Route, ShellContext } from "../types";
import { h, wait } from "./dom";
import { ink } from "./ink";
import { createLoom } from "./loom";
import { createNav, type Nav } from "./nav";
import { tooth } from "./pastel";
import { buildScreen, footer } from "./screens";
import { compose } from "./weave";
import "./shell.css";

interface Live {
  path: string;
  page: HTMLElement;
  loom: ReturnType<typeof createLoom>;
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
  // Which side the cord drops on, so the screen's head keeps clear of it.
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
  live = { path: route.path, page, loom, controller };
  requestAnimationFrame(() => {
    loom.start();
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

const shell: LensShell = {
  async mount(context) {
    ctx = context;
    const { root, content, signal } = context;
    nav = createNav(content, signal, context.face);
    stage = h("div", { class: "hion-stage" });
    const skip = h("a", { class: "hion-skip", href: "#hion-main" }, "Skip to content");
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
    root.replaceChildren(world);
    // Let the faces arrive before measuring words to hang them.
    await Promise.race([document.fonts?.ready, wait(600)]);
    show(context.route, true);
    signal.addEventListener("abort", () => live?.controller.abort());
  },

  async update(route) {
    if (live && route.path === live.path) return;
    const mine = ++token;
    const leaving = live;
    nav.close();
    if (leaving && !still()) {
      leaving.page.dataset.state = "leaving";
      leaving.page.setAttribute("inert", "");
      leaving.loom.release();
      await wait(380);
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
