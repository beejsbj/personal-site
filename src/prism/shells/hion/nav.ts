/** The sky rail: a hion cable strung across the top of the night, with the
 * site's destinations hanging from it on wires like paper tags. Home is the
 * moon. The wire of the screen you are on drops lower and burns brighter:
 * it is the line the whole screen's braid grows out of. */
import type { SiteContent } from "../types";
import { h, s } from "./dom";

export interface Rail {
  el: HTMLElement;
  /** Bottom of the current destination's tag (or the moon), in the viewport,
   * with the rail at rest. */
  origin(): { x: number; y: number } | null;
  setCurrent(path: string): void;
}

export function createRail(
  content: SiteContent,
  signal: AbortSignal,
  face: boolean,
): Rail {
  const items = content.site.nav;
  const moonArt = s(
    "svg",
    { class: "hion-moon__disc", viewBox: "0 0 40 40", "aria-hidden": "true" },
    s("circle", { cx: 20, cy: 20, r: 15, class: "hion-moon__body" }),
    s("path", {
      class: "hion-moon__loop",
      d: "M3 27C9 36 34 33 37 20C39 9 26 4 20 9",
    }),
  );
  const moon = h(
    "a",
    { class: "hion-moon", href: "/", "data-nav": "/" },
    moonArt,
    h(
      "span",
      { class: "hion-moon__name" },
      h("span", {}, content.site.name),
      h(
        "span",
        { class: "hion-moon__sub", "aria-hidden": "true" },
        "Kilahito, after dark",
      ),
    ),
  );

  const cable = s(
    "svg",
    {
      class: "hion-rail__cable",
      viewBox: "0 0 100 20",
      preserveAspectRatio: "none",
      "aria-hidden": "true",
    },
    s("path", { class: "hion-rail__cable-glow", d: "M-2 2Q50 22 102 2" }),
    s("path", { class: "hion-rail__cable-core", d: "M-2 2Q50 22 102 2" }),
  );

  const list = h("ul", { class: "hion-rail__lines" });
  items.forEach((item, index) => {
    const u = (index + 0.5) / items.length;
    const sag = 4 * u * (1 - u);
    const tag = h(
      "span",
      { class: "hion-line__tag" },
      item.label,
      item.external
        ? h("span", { class: "hion-line__out", "aria-hidden": "true" }, "↗")
        : null,
    );
    const anchor = h(
      "a",
      {
        class: "hion-line__link",
        href: item.href,
        "data-nav": item.external ? undefined : item.href,
        ...(item.external ? { target: "_blank", rel: "noreferrer" } : {}),
      },
      h("span", { class: "hion-line__wire", "aria-hidden": "true" }),
      tag,
      item.external
        ? h("span", { class: "hion-sr" }, " (opens in a new tab)")
        : null,
    );
    list.append(
      h(
        "li",
        {
          class: "hion-line",
          style: `--hion-sag:${sag.toFixed(3)};--hion-sway:${(3.2 + ((index * 1.7) % 2.3)).toFixed(2)}s;--hion-sway-delay:${(-index * 0.9).toFixed(2)}s`,
          "data-hue": index % 2 ? "magenta" : "cyan",
        },
        anchor,
      ),
    );
  });

  const nav = h(
    "nav",
    { class: "hion-rail__nav", "aria-label": "Site" },
    cable,
    list,
  );
  const el = h(
    "header",
    { class: "hion-rail", "data-state": "shown" },
    moon,
    nav,
  );

  // Arrow keys walk along the line, as the metaphor promises.
  el.addEventListener(
    "keydown",
    (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      const links = [...el.querySelectorAll<HTMLAnchorElement>("a")];
      const at = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (at < 0) return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? links.length - 1
            : (at + (event.key === "ArrowRight" ? 1 : -1) + links.length) %
              links.length;
      links[next].focus();
    },
    { signal },
  );

  // The rail rises out of the way while you read down, and returns when you
  // head back up.
  if (!face) {
    let lastY = scrollY;
    let ticking = false;
    addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const y = scrollY;
          el.toggleAttribute("data-scrolled", y > 24);
          if (el.contains(document.activeElement)) el.dataset.state = "shown";
          else if (y > lastY + 6 && y > 160) el.dataset.state = "hidden";
          else if (y < lastY - 6 || y < 160) el.dataset.state = "shown";
          lastY = y;
        });
      },
      { passive: true, signal },
    );
    el.addEventListener("focusin", () => (el.dataset.state = "shown"), {
      signal,
    });
  }

  return {
    el,
    origin() {
      const tag =
        el.querySelector<HTMLElement>(
          ".hion-line[data-current] .hion-line__tag",
        ) ?? el.querySelector<HTMLElement>(".hion-moon__disc");
      if (!tag) return null;
      const r = tag.getBoundingClientRect();
      const lift =
        el.dataset.state === "hidden" ? el.getBoundingClientRect().top : 0;
      return { x: r.left + r.width / 2, y: r.bottom - lift - 2 };
    },
    setCurrent(path: string) {
      const top = "/" + (path.split("/").filter(Boolean)[0] ?? "");
      for (const a of el.querySelectorAll<HTMLAnchorElement>("a[data-nav]")) {
        const target = a.dataset.nav!;
        const exact = target === path;
        const within = target !== "/" && target === top;
        if (exact) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
        a.closest(".hion-line")?.toggleAttribute(
          "data-current",
          exact || within,
        );
        if (target === "/") a.toggleAttribute("data-current", exact);
      }
      el.dataset.state = "shown";
    },
  };
}
