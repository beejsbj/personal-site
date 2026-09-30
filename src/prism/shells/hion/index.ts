/** Hion: the portfolio as Kilahito, the city under a sky that never
 * lightens, lit and powered by living lines of cyan and magenta light.
 *
 * The lines are the interface. Destinations hang from a hion cable across
 * the sky; the one you are on drops lowest, and a braid of cyan and magenta
 * grows out of it down through the screen, tying a knot at every piece of
 * content and lighting it as it arrives. Headings are written by the light.
 * Changing screens unravels the braid back into the sky, the ribbons overhead
 * re-weave into a new pose, and the next braid grows down again. */
import type { LensShell, Route, ShellContext, SiteContent } from "../types";
import { h, link, wait } from "./dom";
import { createRail, type Rail } from "./nav";
import { buildScreen } from "./screens";
import { createSky } from "./sky";
import { createWeave } from "./weave";
import { writeHeading } from "./write";
import { mountMicro, screenMicro } from "./micro";
import "./shell.css";
import "./micro.css";

interface Live {
  path: string;
  screen: HTMLElement;
  weave: ReturnType<typeof createWeave>;
  controller: AbortController;
}

let ctx: ShellContext;
let stage: HTMLElement;
let rail: Rail;
let sky: ReturnType<typeof createSky>;
let live: Live | undefined;
let token = 0;

const still = () => ctx.reducedMotion || ctx.face;

function footer(content: SiteContent) {
  return h(
    "footer",
    { class: "hion-foot" },
    h("p", { class: "hion-hello hion-foot__call" }, "Send a line my way"),
    h(
      "p",
      { class: "hion-foot__mail" },
      link(`mailto:${content.site.email}`, {}, content.site.email),
    ),
    h(
      "ul",
      { class: "hion-foot__social", "aria-label": "Elsewhere" },
      content.site.social
        .filter((item) => !item.href.startsWith("mailto:"))
        .map((item) => h("li", {}, link(item.href, {}, item.label))),
      h("li", {}, link(content.site.writingUrl, {}, "Writing")),
    ),
    h(
      "p",
      { class: "hion-foot__note" },
      "Kilahito never sleeps. Lit by hion, after Brandon Sanderson’s ",
      h("cite", {}, "Yumi and the Nightmare Painter"),
      ".",
    ),
  );
}

function show(route: Route, first: boolean) {
  const controller = new AbortController();
  ctx.signal.addEventListener("abort", () => controller.abort(), {
    once: true,
  });
  const screen = buildScreen(ctx.content, route);
  screen.dataset.state = first ? "arriving" : "entering";
  stage.replaceChildren(screen);
  const weave = createWeave({
    screen,
    signal: controller.signal,
    instant: still(),
    origin: () => rail.origin(),
  });
  live = { path: route.path, screen, weave, controller };
  screenMicro(screen, controller.signal);
  rail.setCurrent(route.path);
  sky.setPose(route.kind);
  const title = screen.querySelector<HTMLElement>("h1");
  if (title)
    writeHeading(title, { instant: still(), delay: first ? 250 : 120 });
  // Lay the braid once the screen has its layout.
  requestAnimationFrame(() => {
    weave.start();
    screen.dataset.state = "here";
  });
  // Images settle late; the weave's resize observer re-threads for them.
  if (!first && !ctx.face) {
    screen.focus({ preventScroll: true });
  }
}

const shell: LensShell = {
  async mount(context) {
    ctx = context;
    const { root, content, signal } = context;
    const skyHost = h("div", { class: "hion-sky", "aria-hidden": "true" });
    rail = createRail(content, signal, context.face);
    stage = h("div", { class: "hion-stage" });
    const skip = h(
      "a",
      { class: "hion-skip", href: "#hion-main" },
      "Skip to content",
    );
    skip.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        live?.screen.focus();
      },
      { signal },
    );
    const world = h(
      "div",
      {
        class: "hion",
        "data-face": context.face ? "" : undefined,
        "data-still": still() ? "" : undefined,
      },
      skip,
      skyHost,
      rail.el,
      stage,
      footer(content),
    );
    root.replaceChildren(world);
    sky = createSky({
      host: skyHost,
      signal,
      reducedMotion: context.reducedMotion,
      isIdle: context.isIdle,
      onIdleChange: context.onIdleChange,
    });
    mountMicro(context, rail.el);
    show(context.route, true);
    signal.addEventListener("abort", () => live?.controller.abort());
  },

  async update(route) {
    // The runtime also syncs on the first page load; nothing has moved.
    if (live && route.path === live.path) return;
    const mine = ++token;
    const leaving = live;
    if (leaving && !still()) {
      leaving.screen.dataset.state = "leaving";
      leaving.screen.setAttribute("inert", "");
      leaving.weave.unravel();
      await wait(420);
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
