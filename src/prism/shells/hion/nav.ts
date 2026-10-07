/** The line everything hangs from.
 *
 * The two hions slung across the top of the page, each sagging its own
 * way, with the site's destinations hanging between them on threads, each
 * tied off with a knot. The place you are hangs lowest, and the page's
 * threads come down from its knot. Read down the page and the line stays
 * behind at the top; a pendant hangs at the corner instead (the two hions
 * falling from a knot and parting in two curls). Pull it and the line drops
 * back down to you.
 *
 * On a phone the line holds only your name and the pendant; pulling it lets
 * the destinations fall in a cascade, each on a longer thread than the
 * last, like a wind chime. */
import type { SiteContent } from "../types";
import { h, newTab } from "./dom";
import { ink } from "./ink";
import { type Fabric, fabricAt } from "./fabric";
import { Kind, Path, paint, paintGlows, patterns, thread, type Pt } from "./pastel";
import { clothCanvas } from "./stitch";

/** A swatch of a page's cloth, hanging under its name. Drawn long; CSS
 * shows as much of it as is pulled down. */
function swatch(fabric: Fabric) {
  const canvas = clothCanvas(fabric, 11, 26, 4);
  canvas.classList.add("hion-swatch__cloth");
  return h("span", { class: "hion-swatch", "aria-hidden": "true", "data-fabric": fabric }, canvas);
}

export interface Nav {
  el: HTMLElement;
  /** Where the page's threads begin (the current knot), in page coordinates
   * with the line at rest. */
  origin(): Pt | null;
  /** The line's height at page x, at rest. */
  cordY(x: number): number;
  setCurrent(path: string): void;
  /** The swatch of cloth under the current destination's name, on screen
   * (null when it is not shown, as on a phone). */
  swatch(): DOMRect | null;
  close(): void;
}

const narrowQuery = "(max-width: 719px)";

export function createNav(
  content: SiteContent,
  signal: AbortSignal,
  face: boolean,
): Nav {
  const copy = content.lenses.hion.nav;
  const cord = h("canvas", { class: "hion-nav__cord", "aria-hidden": "true" });
  const home = h(
    "a",
    {
      class: "hion-charm hion-charm--home",
      href: "/",
      "data-nav": "/",
      "data-ink": "charm",
      "data-seed": "3",
      "data-hue": "m",
    },
    h("span", { class: "hion-charm__label" }, content.site.name),
    face ? null : swatch(fabricAt("/")),
  );
  const list = h("ul", { class: "hion-nav__list", id: "hion-nav-list" });
  content.site.nav.forEach((item, i) => {
    list.append(
      h(
        "li",
        { class: "hion-nav__item", style: `--hion-i:${i}` },
        h(
          "a",
          {
            class: "hion-charm",
            href: item.href,
            "data-nav": item.external ? undefined : item.href,
            "data-ink": "charm",
            "data-seed": String(11 + i * 7),
            "data-hue": i % 2 ? "m" : "c",
            ...(item.external ? { target: "_blank", rel: "noreferrer" } : {}),
          },
          h("span", { class: "hion-charm__label" }, item.label),
          item.external || face ? null : swatch(fabricAt(item.href)),
          item.external ? newTab() : null,
        ),
      ),
    );
  });
  const pull = h(
    "button",
    {
      class: "hion-pull",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": "hion-nav-list",
      "data-ink": "tassel",
      "data-seed": "41",
    },
    h("span", { class: "hion-pull__label" }, copy.menu),
  );
  const nav = h(
    "nav",
    { class: "hion-nav", "aria-label": copy.label },
    cord,
    home,
    list,
  );
  const el = h("header", { class: "hion-top", "data-state": "rest" }, nav, pull);

  let width = 0;
  const narrow = () => matchMedia(narrowQuery).matches;
  const sagOf = () => (narrow() ? 6 : 22);
  const cordTop = () => (narrow() ? 20 : 24);
  const cordY = (x: number) => {
    const u = width ? Math.max(0, Math.min(1, x / width)) : 0.5;
    return cordTop() + sagOf() * 4 * u * (1 - u);
  };

  /** Hang every charm at its length below the sagging line. */
  function hangCharms() {
    width = nav.clientWidth;
    const dropped = el.dataset.state === "dropped";
    const charms = [home, ...list.querySelectorAll<HTMLElement>(".hion-charm")];
    charms.forEach((charm, i) => {
      const isCurrent = charm.hasAttribute("data-current");
      let hang: number;
      if (narrow() && dropped && charm !== home) {
        // A cascade: each further destination hangs lower.
        hang = 96 + (i - 1) * 64;
      } else if (charm === home) {
        hang = isCurrent ? 34 : 18;
      } else {
        hang = (isCurrent ? 58 : 20) + ((i * 7) % 3) * 6;
      }
      charm.style.setProperty("--hion-hang", `${hang}px`);
      // Positioned from the top of the line, so the thread meets the line.
      const box = charm.getBoundingClientRect();
      const navBox = nav.getBoundingClientRect();
      const x = box.left - navBox.left + box.width / 2;
      charm.style.setProperty("--hion-top", `${(cordY(x) + hang).toFixed(1)}px`);
    });
    drawCord();
    ink(el);
  }

  function drawCord() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = nav.clientWidth;
    const hgt = cordTop() + sagOf() + 40;
    cord.width = Math.ceil(w * dpr);
    cord.height = Math.ceil(hgt * dpr);
    cord.style.width = `${w}px`;
    cord.style.height = `${hgt}px`;
    const ctx = cord.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    // Two hions slung across the top, each sagging its own way, crossing
    // where they please; the destinations hang from between them.
    const marks = (["c", "m"] as const).flatMap((hue, i) => {
      const pts: Pt[] = [];
      for (let x = -10; x <= w + 10; x += 10) {
        const sway = i
          ? Math.sin(x / 230 + 2.1) * 6 + Math.sin(x / 71) * 1.5
          : Math.sin(x / 140 + 0.3) * 4.5 + Math.sin(x / 47 + 1) * 1.2;
        pts.push([x, cordY(x) + sway]);
      }
      return thread(new Path(pts, 3), { hue, w: i ? 3.4 : 2.8, seed: 5 + i * 9, glow: 0.24 });
    });
    const pats = patterns(ctx, dpr);
    paintGlows(ctx, marks, w, hgt, 0.7);
    for (const m of marks) if (m.kind !== Kind.Glow) paint(ctx, m, pats);
  }

  function setState(state: "rest" | "stowed" | "dropped") {
    if (el.dataset.state === state) return;
    const wasDropped = el.dataset.state === "dropped";
    el.dataset.state = state;
    pull.setAttribute("aria-expanded", String(state === "dropped"));
    if (state === "dropped" || wasDropped || state === "rest") hangCharms();
  }

  function onScroll() {
    const state = el.dataset.state;
    const past = scrollY > (narrow() ? 70 : 150);
    if (state === "dropped") {
      if (narrow()) return;
      if (!past) setState("rest");
      return;
    }
    setState(past ? "stowed" : "rest");
  }

  if (!face) {
    addEventListener("scroll", onScroll, { passive: true, signal });
    pull.addEventListener(
      "click",
      () => {
        if (el.dataset.state === "dropped") {
          setState(narrow() || scrollY < 150 ? "rest" : "stowed");
        } else {
          setState("dropped");
          requestAnimationFrame(() =>
            (list.querySelector<HTMLElement>("a") ?? home).focus({ preventScroll: true }),
          );
        }
      },
      { signal },
    );
    el.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && el.dataset.state === "dropped") {
          setState(narrow() || scrollY < 150 ? "rest" : "stowed");
          pull.focus();
          return;
        }
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key))
          return;
        const links = [...nav.querySelectorAll<HTMLAnchorElement>("a")].filter(
          (a) => a.offsetParent !== null,
        );
        const at = links.indexOf(document.activeElement as HTMLAnchorElement);
        if (at < 0) return;
        event.preventDefault();
        const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? links.length - 1
              : (at + (forward ? 1 : -1) + links.length) % links.length;
        links[next].focus();
      },
      { signal },
    );
    // Reaching into the line with the keyboard brings it down to you.
    nav.addEventListener(
      "focusin",
      () => {
        if (el.dataset.state === "stowed") setState("dropped");
      },
      { signal },
    );
    // Clicking away from a dropped line lets it go.
    addEventListener(
      "pointerdown",
      (event) => {
        if (el.dataset.state !== "dropped") return;
        if (el.contains(event.target as Node)) return;
        setState(narrow() || scrollY < 150 ? "rest" : "stowed");
      },
      { signal },
    );
    let resizeTimer = 0;
    addEventListener(
      "resize",
      () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(hangCharms, 120);
      },
      { signal },
    );
  }

  return {
    el,
    origin() {
      const navBox = nav.getBoundingClientRect();
      if (narrow()) {
        // On a phone the page's cord comes down from the pull tassel.
        const top = el.getBoundingClientRect();
        const box = pull.getBoundingClientRect();
        return [box.left - top.left + box.width / 2, box.bottom - top.top - 4];
      }
      const target =
        list.querySelector<HTMLElement>(".hion-charm[data-current]") ?? home;
      const box = target.getBoundingClientRect();
      const hang = parseFloat(target.style.getPropertyValue("--hion-hang")) || 0;
      const x = box.left - navBox.left + box.width / 2;
      // The cord leaves from under the charm's label.
      return [x, cordY(x) + hang + box.height];
    },
    cordY,
    setCurrent(path: string) {
      const top = "/" + (path.split("/").filter(Boolean)[0] ?? "");
      for (const a of nav.querySelectorAll<HTMLAnchorElement>("a[data-nav]")) {
        const target = a.dataset.nav!;
        const exact = target === path;
        const within = target !== "/" && target === top;
        if (exact) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
        a.toggleAttribute("data-current", exact || within);
      }
      if (el.dataset.state === "dropped") setState(scrollY < 150 ? "rest" : "stowed");
      hangCharms();
    },
    swatch() {
      const current = nav.querySelector<HTMLElement>(".hion-charm[data-current] .hion-swatch");
      const box = current?.getBoundingClientRect();
      return box && box.width > 0 && box.height > 0 ? box : null;
    },
    close() {
      if (el.dataset.state === "dropped") setState("rest");
    },
  };
}
