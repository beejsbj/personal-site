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
import { h, newTab, still } from "./dom";
import { ink } from "./ink";
import { Kind, Path, paint, paintGlows, patterns, thread, type Pt } from "./pastel";
import { measure } from "./spun";
import { smooth } from "./wind";

/** A loose end of thread let down under a name: short, let down a
 * little when you reach for it, all the way for the page you are on. The
 * same thread as everything else (CSS: the one width, its hue, a knot at
 * the end). */
function tail(hue: "c" | "m") {
  return h("span", { class: "hion-tail", "aria-hidden": "true", "data-hue": hue });
}

export interface Nav {
  el: HTMLElement;
  /** Where the page's threads begin (the current knot), in page coordinates
   * with the line at rest. */
  origin(): Pt | null;
  /** The line's height at page x, at rest. */
  cordY(x: number): number;
  setCurrent(path: string): void;
  close(): void;
  /** Write the names on the line (once the face is in). */
  write(): void;
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
    face ? null : tail("m"),
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
          item.external || face ? null : tail(i % 2 ? "m" : "c"),
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
    // Where each hangs along the line, read all at once before anything
    // moves (a read between writes lays the page out again each time).
    const navLeft = nav.getBoundingClientRect().left;
    const xs = charms.map((charm) => {
      const box = charm.getBoundingClientRect();
      return box.left - navLeft + box.width / 2;
    });
    charms.forEach((charm, i) => {
      const isCurrent = charm.hasAttribute("data-current");
      let hang: number;
      if (narrow() && dropped && charm !== home) {
        // A cascade: each further destination hangs lower.
        hang = 96 + (i - 1) * 64;
      } else if (charm === home) {
        // Written by thread, the names are large enough that on a narrower
        // screen the line cannot hold them all in one row: the name in the
        // middle hangs below the rest, on a longer thread.
        hang = (isCurrent ? 34 : 18) + (!narrow() && innerWidth < 1240 ? 48 : 0);
      } else {
        hang = (isCurrent ? 58 : 20) + ((i * 7) % 3) * 6;
      }
      charm.style.setProperty("--hion-hang", `${hang}px`);
      // Positioned from the top of the line, so the thread meets the line.
      charm.style.setProperty("--hion-top", `${(cordY(xs[i]) + hang).toFixed(1)}px`);
    });
    drawCord();
    if (writing) settleNames();
    ink(el);
  }

  /** The line as last drawn (it changes with the width, and with where
   * the names hang). */
  let drawn = "";
  /** Whether the names are written on the line (once the face is in). */
  let writing = false;
  let grown = false;

  /** Where each name is written, by hue, left to right: its way along
   * the line under its letters' feet (nav px). */
  function namesOf(hue: "c" | "m") {
    if (!writing) return [];
    const box = nav.getBoundingClientRect();
    const out: { way: Pt[]; key: string }[] = [];
    for (const charm of [home, ...list.querySelectorAll<HTMLElement>(".hion-charm")]) {
      if ((charm.dataset.hue === "m" ? "m" : "c") !== hue) continue;
      const label = charm.querySelector<HTMLElement>(".hion-charm__label");
      if (!label || !label.getClientRects().length) continue;
      const spun = measure(label, box);
      if (!spun) {
        label.dataset.spunState = "chalk";
        continue;
      }
      label.dataset.spunState = "spun";
      out.push({ way: spun.way, key: `${spun.way[0][0].toFixed(0)},${spun.way[0][1].toFixed(0)}` });
    }
    return out.sort((a, b) => a.way[0][0] - b.way[0][0]);
  }

  function drawCord() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = nav.clientWidth;
    const names = { c: namesOf("c"), m: namesOf("m") };
    let low = cordTop() + sagOf() + 40;
    for (const list of [names.c, names.m]) for (const n of list) for (const [, y] of n.way) low = Math.max(low, y + 24);
    const hgt = Math.ceil(low);
    const key = `${w}:${hgt}:${dpr}:${[...names.c, ...names.m].map((n) => n.key).join(";")}`;
    if (key === drawn) return;
    drawn = key;
    cord.width = Math.ceil(w * dpr);
    cord.height = Math.ceil(hgt * dpr);
    cord.style.width = `${w}px`;
    cord.style.height = `${hgt}px`;
    const ctx = cord.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    // Two hions slung across the top, each sagging its own way, crossing
    // where they please; the destinations hang from between them.
    // Each dips down from the line to write the names of its hue, along
    // the line under their letters' feet, and rises back into it: the
    // names hang from nothing else.
    const marks = (["c", "m"] as const).flatMap((hue, i) => {
      const at = (x: number): Pt => {
        const sway = i
          ? Math.sin(x / 230 + 2.1) * 6 + Math.sin(x / 71) * 1.5
          : Math.sin(x / 140 + 0.3) * 4.5 + Math.sin(x / 47 + 1) * 1.2;
        return [x, cordY(x) + sway];
      };
      const pts: Pt[] = [];
      let x = -10;
      for (const { way } of names[hue]) {
        const [x0, y0] = way[0];
        const [x1, y1] = way[way.length - 1];
        // Down in a long easy curve, as a slack line sags to what it
        // holds, and up again the same way: no corners.
        const reach = Math.max(36, Math.min(70, (y0 - at(x0)[1]) * 0.9));
        for (; x < x0 - reach - 6; x += 10) pts.push(at(x));
        const a = at(x0 - reach);
        const b = at(x1 + reach);
        const down: Pt[] = [];
        const up: Pt[] = [];
        for (let k = 0; k <= 12; k++) {
          const u = k / 12;
          const e = u * u * (3 - 2 * u);
          down.push([a[0] + (x0 - a[0]) * u, a[1] + (y0 - a[1]) * e]);
          up.push([x1 + (b[0] - x1) * u, y1 + (b[1] - y1) * e]);
        }
        pts.push(...down, ...way.slice(1, -1), ...up);
        x = x1 + reach + 10;
      }
      for (; x <= w + 10; x += 10) pts.push(at(x));
      return thread(new Path(pts, 3), { hue, seed: 5 + i * 9, glow: 0.24 });
    });
    const pats = patterns(ctx, dpr);
    paintGlows(ctx, marks, w, hgt, 0.7);
    for (const m of marks) if (m.kind !== Kind.Glow) paint(ctx, m, pats);
    still(cord);
    // The first time the names are written, the line is seen growing
    // across, writing them as it goes.
    if (writing && !grown && !face) {
      grown = true;
      cord.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 1600, easing: "cubic-bezier(0.3, 0.1, 0.4, 1)" });
    }
  }

  /** Write the names on the line once the face is in (a trace of a
   * fallback would not be the name), and again whenever they hang
   * differently, once they have swung into place. */
  const settleNames = () => window.setTimeout(drawCord, 650);

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

  /** Write the names on the line, once the face is in (a trace of a
   * fallback would not be the name); each keeps its chalk otherwise. */
  function write() {
    const chalk = () => {
      for (const label of el.querySelectorAll<HTMLElement>(".hion-charm__label")) label.dataset.spunState = "chalk";
    };
    const late = window.setTimeout(chalk, 2500);
    document.fonts.load(`40px ${getComputedStyle(home).fontFamily}`, "A").then(
      (faces) => {
        clearTimeout(late);
        if (signal.aborted) return;
        if (!faces.length) return chalk();
        writing = true;
        drawCord();
        settleNames();
      },
      () => {
        clearTimeout(late);
        chalk();
      },
    );
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
    write,
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
    close() {
      if (el.dataset.state === "dropped") setState("rest");
    },
  };
}
