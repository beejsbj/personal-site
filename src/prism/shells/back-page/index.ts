/** Back Page: the portfolio is an exercise book lying open on a desk under a
 * lamp, written in blue and red biro. The book has one order, like any book;
 * every URL is a place in it. Following a link turns the pages there (a
 * flurry of leaves when it's far), the sticky tabs on the edge jump between
 * sections, and the corners, the arrow keys or a swipe turn one page. */
import { navigate } from "astro:transitions/client";
import type { LensShell, Route, ShellContext } from "../types";
import { Book, measure, sameShape, type Geometry } from "./book";
import {
  bookOrder,
  chapter,
  coverPage,
  today,
  type Build,
  type Chapter,
  type Stop,
} from "./chapters";
import { h } from "./dom";
import "./shell.css";

const TABS: [string, string][] = [
  ["/", "Hello"],
  ["/about", "About"],
  ["/resume", "Resume"],
  ["/lab", "Lab"],
  ["/projects", "Projects"],
];

async function fontsReady() {
  const wanted = [
    '400 20px "Patrick Hand"',
    '700 20px "Caveat"',
    '400 20px "Caveat"',
    '400 16px "Special Elite"',
  ];
  await Promise.race([
    Promise.all(wanted.map((f) => document.fonts.load(f))).catch(() => {}),
    new Promise((r) => setTimeout(r, 1800)),
  ]);
}

class App {
  root: HTMLElement;
  desk: HTMLElement;
  book: Book;
  live: HTMLElement;
  order: Stop[];
  route: Route;
  /** The chapter the book lies open at. */
  paged!: Chapter;
  pagedRoute!: Route;
  view = 0;
  /** A loose sheet lying on top, for pages that aren't in the book. */
  sheet: Chapter | null = null;
  queue: Promise<unknown> = Promise.resolve();
  landAtEnd = false;
  busy = false;

  constructor(private ctx: ShellContext) {
    this.root = ctx.root;
    this.route = ctx.route;
    this.order = bookOrder(ctx.content);
    this.desk = h("div", { class: "bp-desk" });
    const skip = h("a", { class: "bp-skip", href: "#bp-main" }, "Skip to the page");
    skip.addEventListener("click", (event) => {
      event.preventDefault();
      this.focusPage();
    });
    this.live = h("p", { class: "bp-sr", "aria-live": "polite" });
    this.desk.append(
      skip,
      h("div", { class: "bp-lamp", "aria-hidden": "true" }),
      h("div", { class: "bp-pen bp-pen--blue", "aria-hidden": "true" }),
      h("div", { class: "bp-pen bp-pen--red", "aria-hidden": "true" }),
    );
    this.root.replaceChildren(this.desk);
    this.book = new Book(this.desk, ctx.reducedMotion);
    this.desk.append(this.live);
  }

  build(route: Route): Chapter {
    const b: Build = {
      route: { ...route, main: route.main.cloneNode(true) as HTMLElement },
      content: this.ctx.content,
      order: this.order,
      spread: this.book.geo.spread,
      stage: this.book.stage,
      today: today(),
    };
    return chapter(b);
  }

  views(ch: Chapter) {
    return this.book.geo.spread
      ? Math.ceil(ch.pages.length / 2)
      : ch.pages.length;
  }
  pagesAt(ch: Chapter, view: number) {
    return this.book.geo.spread
      ? ch.pages.slice(view * 2, view * 2 + 2)
      : ch.pages.slice(view, view + 1);
  }

  async start() {
    await fontsReady();
    this.book.layout(measure());
    const { ctx } = this;
    const first = this.build(this.route);
    if (first.loose) {
      this.pagedRoute = {
        kind: "home",
        path: "/",
        title: "",
        main: document.createElement("main"),
      };
      this.paged = this.build(this.pagedRoute);
      this.sheet = first;
    } else {
      this.paged = first;
      this.pagedRoute = this.route;
    }
    this.view = 0;
    this.renderTabs();
    const pages = this.pagesAt(this.paged, 0);
    if (this.sheet) this.book.setLoose(this.sheet.loose!, false);
    this.book.setDepth(this.depth());
    this.book.main.setAttribute("aria-label", this.current().label);
    this.renderCorners();

    if (ctx.face) {
      this.book.place(pages);
    } else {
      const cover =
        this.route.kind === "home" && this.book.geo.spread
          ? coverPage(this.buildCtx(), false)
          : null;
      this.busy = true;
      this.queue = this.book.open(pages, cover).finally(() => {
        this.busy = false;
      });
      this.listen();
    }
  }

  buildCtx(): Build {
    return {
      route: this.route,
      content: this.ctx.content,
      order: this.order,
      spread: this.book.geo.spread,
      stage: this.book.stage,
      today: today(),
    };
  }

  current() {
    return this.sheet ?? this.paged;
  }

  depth() {
    return Math.max(0, Math.min(1, this.current().rank / (this.order.length - 1)));
  }

  // ---- routes -------------------------------------------------------------------

  go(route: Route) {
    this.queue = this.queue
      .then(() => this.goNow(route))
      .catch((error) => console.error(error));
    return this.queue;
  }

  async goNow(route: Route) {
    const was = this.current();
    // the runtime may hand us the page we're already on: nothing to turn
    if (route.path === this.route.path) {
      this.route = route;
      return;
    }
    this.route = route;
    const ch = this.build(route);
    const land = this.landAtEnd;
    this.landAtEnd = false;
    this.renderTabs();

    if (ch.loose) {
      this.sheet = ch;
      this.book.setLoose(ch.loose, true);
      this.settle();
      return;
    }
    const leaving = this.sheet;
    if (leaving) {
      this.sheet = null;
      this.book.setLoose(null, true);
    }
    const view = land ? this.views(ch) - 1 : 0;
    if (ch.key === this.paged.key) {
      this.paged = ch;
      this.pagedRoute = route;
      this.view = Math.min(this.view, this.views(ch) - 1);
      this.book.place(this.pagesAt(ch, this.view));
      this.settle();
      return;
    }
    const from = leaving ? leaving.rank : was.rank;
    const dir: 1 | -1 = ch.rank >= this.paged.rank ? 1 : -1;
    const distance = Math.abs(ch.rank - (leaving ? this.paged.rank : from));
    const flurry = Math.max(0, Math.min(4, Math.round(distance) - 1));
    this.busy = true;
    this.book.corners.replaceChildren();
    try {
      await this.book.turn(this.pagesAt(ch, view), dir, flurry).done;
    } finally {
      this.busy = false;
    }
    this.paged = ch;
    this.pagedRoute = route;
    this.view = view;
    this.settle();
  }

  /** After a route change: corners, depth, focus, and say where we are. */
  settle(focus = true) {
    this.book.main.setAttribute("aria-label", this.current().label);
    this.book.setDepth(this.depth());
    this.renderCorners();
    this.announce();
    if (focus && !this.ctx.face) this.focusPage();
  }

  focusPage() {
    const scope = this.sheet?.loose ?? this.book.main;
    const heading = scope.querySelector<HTMLElement>("h1");
    const target = heading && heading.getClientRects().length ? heading : this.book.main;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }

  announce() {
    const ch = this.current();
    if (this.sheet) {
      this.live.textContent = `${ch.label}: a loose sheet, tucked into the book.`;
      return;
    }
    const total = this.views(ch);
    this.live.textContent =
      total > 1
        ? `${ch.label}, ${this.book.geo.spread ? "pages" : "page"} ${this.view + 1} of ${total}.`
        : `${ch.label}.`;
  }

  // ---- turning one page ---------------------------------------------------------

  neighbour(step: 1 | -1): Stop | null {
    const rank = this.current().rank;
    if (step > 0) {
      const next = this.order.find((_, i) => i > rank);
      return next ?? { key: "/", href: "/", label: "Close the book", no: "" };
    }
    for (let i = this.order.length - 1; i >= 0; i--)
      if (i < rank) return this.order[i];
    return null;
  }

  canTurn(step: 1 | -1) {
    if (this.sheet) return false;
    const target = this.view + step;
    return target >= 0 && target < this.views(this.paged);
  }

  turn(step: 1 | -1) {
    if (this.busy) return;
    if (this.canTurn(step)) {
      this.queue = this.queue.then(() => this.turnNow(step));
      return;
    }
    const stop = this.neighbour(step);
    if (!stop) return;
    this.landAtEnd = step < 0;
    void navigate(stop.href);
  }

  async turnNow(step: 1 | -1) {
    const target = this.view + step;
    this.busy = true;
    try {
      await this.book.turn(this.pagesAt(this.paged, target), step).done;
    } finally {
      this.busy = false;
    }
    this.view = target;
    this.renderCorners();
    this.announce();
  }

  // ---- chrome: tabs and corners ------------------------------------------------

  renderTabs() {
    const path = this.route.path;
    const near =
      this.route.kind === "project"
        ? "/projects"
        : this.route.kind === "lab-entry"
          ? "/lab"
          : null;
    const list = h("ul");
    TABS.forEach(([href, name], i) => {
      list.append(
        h(
          "li",
          { style: `--i:${i}`, "data-tab": String(i) },
          h(
            "a",
            {
              href,
              "aria-current": path === href ? "page" : null,
              "data-state": path === href ? "current" : near === href ? "near" : null,
            },
            name,
          ),
        ),
      );
    });
    this.book.tabs.replaceChildren(list);
  }

  renderCorners() {
    const corners = this.book.corners;
    corners.replaceChildren();
    const make = (step: 1 | -1) => {
      const cls = `bp-corner bp-corner--${step > 0 ? "next" : "prev"}`;
      if (this.canTurn(step)) {
        const btn = h(
          "button",
          { class: cls, type: "button" },
          h("span", { class: "bp-corner__ear", "aria-hidden": "true" }),
          h("span", { class: "bp-corner__label" }, step > 0 ? "turn over →" : "← back"),
        );
        btn.addEventListener("click", () => this.turn(step));
        return btn;
      }
      const stop = this.neighbour(step);
      if (!stop) return null;
      const a = h(
        "a",
        { class: cls, href: stop.href, rel: step > 0 ? "next" : "prev" },
        h("span", { class: "bp-corner__ear", "aria-hidden": "true" }),
        h(
          "span",
          { class: "bp-corner__label" },
          step > 0 ? `${stop.label} →` : `← ${stop.label}`,
        ),
      );
      if (step < 0) a.addEventListener("click", () => (this.landAtEnd = true));
      return a;
    };
    const prev = make(-1);
    const next = make(1);
    const nav = h("nav", { class: "bp-turner", "aria-label": "Turn the page" }, prev, next);
    corners.append(nav);
  }

  // ---- hands on the book ---------------------------------------------------------

  listen() {
    const { signal } = this.ctx;
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("input, textarea, select, [contenteditable], video")) return;
        const menu = target?.closest<HTMLElement>(".bp-tabs, .bp-contents");
        const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        if (menu && arrows.includes(event.key)) {
          const links = [...menu.querySelectorAll<HTMLElement>("a")];
          const at = links.indexOf(target as HTMLElement);
          const step = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
          links[(at + step + links.length) % links.length]?.focus();
          event.preventDefault();
          return;
        }
        if (event.key === "ArrowRight" || event.key === "PageDown") {
          this.turn(1);
          event.preventDefault();
        } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
          this.turn(-1);
          event.preventDefault();
        }
      },
      { signal },
    );

    // a finger drags the page over, and the leaf follows it
    const main = this.book.main;
    let start: { x: number; y: number; t: number; id: number } | null = null;
    let drag: { turn: ReturnType<Book["turn"]>; step: 1 | -1 } | null = null;
    let crossing: 1 | -1 | 0 = 0;
    let dx = 0;
    main.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "mouse" || this.busy || this.sheet) return;
        start = { x: event.clientX, y: event.clientY, t: performance.now(), id: event.pointerId };
        crossing = 0;
        dx = 0;
      },
      { signal },
    );
    main.addEventListener(
      "pointermove",
      (event) => {
        if (!start || event.pointerId !== start.id) return;
        dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!drag && !crossing) {
          if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
          const step: 1 | -1 = dx < 0 ? 1 : -1;
          if (this.canTurn(step)) {
            this.busy = true;
            drag = { turn: this.book.turn(this.pagesAt(this.paged, this.view + step), step, 0, true), step };
          } else crossing = step;
        }
        if (drag) {
          const width = this.book.geo.pw * (this.book.geo.spread ? 1.3 : 0.95);
          const p = (drag.step > 0 ? -dx : dx) / width;
          drag.turn.seek(p);
        }
      },
      { signal },
    );
    const end = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      const elapsed = performance.now() - start.t;
      start = null;
      if (drag) {
        const { turn, step } = drag;
        drag = null;
        const width = this.book.geo.pw * (this.book.geo.spread ? 1.3 : 0.95);
        const progress = (step > 0 ? -dx : dx) / width;
        const fast = Math.abs(dx) / Math.max(1, elapsed) > 0.45;
        const commit = progress > 0.3 || (fast && progress > 0.05);
        void turn.release(commit).then(() => {
          this.busy = false;
          if (commit) {
            this.view += step;
            this.renderCorners();
            this.announce();
          }
        });
      } else if (crossing && Math.abs(dx) > 60) {
        const step = crossing;
        crossing = 0;
        this.turn(step);
      }
    };
    main.addEventListener("pointerup", end, { signal });
    main.addEventListener("pointercancel", end, { signal });

    // a new window size re-writes the pages to fit
    let timer = 0;
    addEventListener(
      "resize",
      () => {
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          this.queue = this.queue.then(() => this.relayout());
        }, 180);
      },
      { signal },
    );
  }

  relayout() {
    const geo: Geometry = measure();
    const before = this.book.geo;
    const firstPage = before.spread ? this.view * 2 : this.view;
    this.book.layout(geo);
    if (sameShape(before, geo)) return;
    this.paged = this.build(this.pagedRoute);
    const page = Math.min(firstPage, this.paged.pages.length - 1);
    this.view = geo.spread ? Math.floor(page / 2) : page;
    this.book.place(this.pagesAt(this.paged, this.view));
    this.renderTabs();
    this.settle(false);
  }
}

let app: App | null = null;

const shell: LensShell = {
  async mount(ctx) {
    app = new App(ctx);
    await app.start();
  },
  async update(route) {
    await app?.go(route);
  },
  unmount() {
    app = null;
  },
};

export default shell;
