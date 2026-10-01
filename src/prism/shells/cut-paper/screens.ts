/** Which view a route opens in the session: home is the clip launcher,
 * projects the arrangement, a project its clip view, the lab a device
 * chain, about the liner notes, the resume roles as tracks, and anything
 * else the text view. */
import type { Route } from "../types";
import { h, take } from "./dom";
import { arrangement } from "./arrange";
import { clipView } from "./clip";
import { deviceView, devices } from "./devices";
import { liner } from "./liner";
import { bar, screen, type Env, type Screen } from "./parts";
import { roles } from "./roles";
import { session } from "./session";

export type { Env, Memory, Screen } from "./parts";

/** Anything else: the page, opened in the text view. */
function textView(route: Route): Screen {
  const paper = h("div", { class: "cp-textview__page" }, take(route.main));
  let h1 = paper.querySelector<HTMLElement>("h1");
  if (!h1) {
    h1 = h("h1", { class: "cp-textview__title" }, route.title.split("|")[0].trim() || "Text");
    paper.prepend(h1);
  }
  h1.setAttribute("tabindex", "-1");
  return {
    el: screen(
      "other",
      bar(
        h(
          "div",
          { class: "cp-page cp-page--text" },
          h(
            "p",
            { class: "cp-panel-tab cp-textview__tab" },
            "Text",
            h("small", null, route.path),
          ),
          paper,
        ),
        1,
      ),
    ),
    heading: h1,
  };
}

export function buildScreen(route: Route, env: Env): Screen {
  switch (route.kind) {
    case "home":
      return session(route, env);
    case "projects":
      return arrangement(route, env);
    case "project": {
      const item = env.content.projects.find((entry) => entry.slug === route.slug);
      return item ? clipView(route, env, item) : textView(route);
    }
    case "lab":
      return devices(route, env);
    case "lab-entry": {
      const item = env.content.lab.find((entry) => entry.slug === route.slug);
      return item ? deviceView(route, env, item) : textView(route);
    }
    case "about":
      return liner(route, env);
    case "resume":
      return roles(route, env);
    default:
      return textView(route);
  }
}
