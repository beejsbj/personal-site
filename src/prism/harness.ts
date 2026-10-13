/** Mounts a lens shell on fixture content for /prism/harness, and exposes
 * what the parity test needs on `window.prismHarness`. */
import { FIXTURES } from "./fixtures";
import { expectedParts, type RouteRef } from "./parity";
import { kindOf, syncShell, useSource } from "./shell-runtime";
import type { SiteContent } from "./shells/types";

declare global {
  interface Window {
    prismHarness?: {
      ready: boolean;
      error?: string;
      fixtures: string[];
      content?: SiteContent;
      route?: RouteRef;
      expected?: ReturnType<typeof expectedParts>;
      routes?: RouteRef[];
    };
  }
}

const params = new URLSearchParams(location.search);
const lens = params.get("lens") ?? "cut-paper";
const name = params.get("fixture") ?? "";
const path = params.get("route") ?? "/";
const state: NonNullable<Window["prismHarness"]> = {
  ready: false,
  fixtures: Object.keys(FIXTURES),
};
window.prismHarness = state;

async function run() {
  const base: SiteContent = await (await fetch("/prism/content.json")).json();
  const fixture = FIXTURES[name];
  const content = fixture ? fixture.apply(structuredClone(base)) : base;
  const { kind, slug } = kindOf(path);
  const route: RouteRef = { kind, path, slug };
  useSource({
    content,
    route: () => ({
      ...route,
      title: "Prism harness",
      main: document.createElement("main"),
    }),
  });
  Object.assign(state, {
    content,
    route,
    expected: expectedParts(route, content),
    routes: fixture?.routes(content),
  });
  const root = document.documentElement;
  root.dataset.lens = lens;
  root.toggleAttribute("data-lens-shell", lens !== "daylight");
  await syncShell();
  state.ready = true;
}

run().catch((error) => {
  state.error = String(error?.stack ?? error);
  state.ready = true;
  console.error(error);
});
