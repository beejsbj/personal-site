/** Back Page: the portfolio is a pile of exercise books on a desk under a
 * lamp, one for each section, each on its own paper from Dotfight (a squared
 * maths copy, a feint-ruled notebook, a legal pad, a graph book, blueprint)
 * and written in that paper's pens. Every URL is a place in one of them.
 * Within a book, following a link turns the pages there (a flurry of leaves
 * when it's far), and the corners, the arrow keys or a swipe turn one page.
 * Going to another section shuts the open book, puts it back on the pile,
 * takes the other one off and opens it. */
import { navigate } from "astro:transitions/client";
import { fill } from "../rich";
import type { LensShell, Route, ShellContext } from "../types";
import { Book, measure, sameShape, type Geometry } from "./book";
import {
  bookOrder,
  chapter,
  coverPage,
  rankOf,
  today,
  writingChapter,
  type Build,
  type Chapter,
  type Copy,
  type Stop,
} from "./chapters";
import { h } from "./dom";
import { mountMicro } from "./micro";
import { mountSoldiers } from "./soldiers";
import { BOOKS, shelfOf, type BookKey } from "./themes";
import "./shell.css";
import "./themes.css";
import "./books.css";
import "./micro.css";
import "./soldiers.css";

async function fontsReady() {
  const wanted = [
    '400 20px "Patrick Hand"',
    '700 20px "Caveat"',
    '400 20px "Caveat"',
    '400 16px "Special Elite"',
    '400 20px "Caveat Brush"',
  ];
  await Promise.race([
    Promise.all(wanted.map((f) => document.fonts.load(f))).catch(() => {}),
    new Promise((r) => setTimeout(r, 1800)),
  ]);
}

class App {
  root: HTMLElement;
  copy: Copy;
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
  /** The book lying open. */
  bookKey: BookKey = "home";

  constructor(private ctx: ShellContext) {
    this.root = ctx.root;
    this.route = ctx.route;
    this.copy = ctx.content.lenses["back-page"];
    this.order = bookOrder(ctx.content, this.copy);
    this.desk = h("div", { class: "bp-desk" });
    const skip = h("a", { class: "bp-skip", href: "#bp-main" }, this.copy.skip);
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
    this.book = new Book(this.desk, ctx.reducedMotion, this.copy.books.label);
    this.desk.append(this.live);
    mountMicro(ctx, this.book, this.desk);
    mountSoldiers(ctx, this.book, this.desk);
  }

  build(route: Route): Chapter {
    return chapter(this.buildFor(route));
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
    this.setBook(this.paged.book);
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
          ? coverPage(this.buildFor(this.route), false)
          : null;
      this.busy = true;
      this.queue = this.book.open(pages, cover).finally(() => {
        this.busy = false;
      });
      this.listen();
    }
  }

  buildFor(route: Route): Build {
    return {
      route,
      content: this.ctx.content,
      copy: this.copy,
      order: this.order,
      spread: this.book.geo.spread,
      stage: this.book.stage,
      today: today(this.copy),
    };
  }

  current() {
    return this.sheet ?? this.paged;
  }

  /** The writings book is open: it has no route, so the URL is still the
   * page it was opened from. */
  writing() {
    return !this.sheet && this.paged?.book === "writing";
  }

  /** Take the writings book off the pile and open it. */
  openWriting() {
    this.queue = this.queue
      .then(async () => {
        if (this.writing()) return;
        if (this.sheet) {
          this.sheet = null;
          this.book.setLoose(null, true);
        }
        const ch = writingChapter(this.buildFor(this.route));
        await this.swap(ch, 0);
        this.paged = ch;
        this.view = 0;
        this.settle();
      })
      .catch((error) => console.error(error));
  }

  /** Put the writings book back and open the page the URL is on. */
  reopen() {
    this.landAtEnd = false;
    this.queue = this.queue
      .then(() => this.goNow(this.route, true))
      .catch((error) => console.error(error));
  }

  /** The open chapter, written again (a new window size). */
  rebuild() {
    return this.writing() ? writingChapter(this.buildFor(this.route)) : this.build(this.pagedRoute);
  }

  /** How far through the open book: the stops before this one, and the view. */
  depth() {
    // the writings book: hardly a page written in it yet
    if (this.writing()) return 0.03;
    const stops = this.order.filter((s) => s.book === this.bookKey);
    const at = Math.max(0, stops.findIndex((s) => s.key === this.paged.key));
    const views = this.views(this.paged) || 1;
    return Math.max(0, Math.min(1, (at + this.view / views + 0.5) / Math.max(1, stops.length)));
  }

  setBook(key: BookKey) {
    this.bookKey = key;
    this.desk.dataset.theme = shelfOf(key).theme;
    this.renderShelf();
  }

  // ---- routes -------------------------------------------------------------------

  go(route: Route) {
    this.queue = this.queue
      .then(() => this.goNow(route))
      .catch((error) => console.error(error));
    return this.queue;
  }

  async goNow(route: Route, force = false) {
    // A writing refresh may add metadata stops while the book stays mounted.
    this.order = bookOrder(this.ctx.content, this.copy);
    this.paged.rank = rankOf(this.pagedRoute, this.order);
    if (this.sheet) this.sheet.rank = rankOf(this.route, this.order);
    const was = this.current();
    // the runtime may hand us the page we're already on: nothing to turn
    if (route.path === this.route.path && !force && !route.refresh) {
      this.route = route;
      return;
    }
    this.route = route;
    const ch = this.build(route);
    const land = this.landAtEnd && !force;
    this.landAtEnd = false;

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
    if (ch.book !== this.bookKey) {
      await this.swap(ch, view);
      this.paged = ch;
      this.pagedRoute = route;
      this.view = view;
      this.settle();
      return;
    }
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

  /** To another book: shut this one, put it back on the pile, take the other
   * off it, and open it at `view`. */
  async swap(ch: Chapter, view: number) {
    const spot = (key: BookKey) =>
      this.book.shelf.querySelector(`[data-book="${key}"] .bp-shelf__book`)?.getBoundingClientRect() ??
      new DOMRect(innerWidth - 60, 40, 40, 56);
    this.busy = true;
    this.showOnShelf(ch.book);
    try {
      const leaving = this.bookKey;
      await this.book.close(coverPage(this.buildFor(this.route), false, leaving));
      await this.book.stow(spot(leaving));
      this.setBook(ch.book);
      this.book.setDepth(0);
      const cover = coverPage(this.buildFor(this.route), false, ch.book);
      await this.book.open(this.pagesAt(ch, view), cover, spot(ch.book));
    } finally {
      this.busy = false;
      this.book.el.style.opacity = "";
    }
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
    const live = this.copy.live;
    if (this.sheet) {
      this.live.textContent = fill(live.loose, { label: ch.label });
      return;
    }
    const total = this.views(ch);
    this.live.textContent = fill(
      total > 1 ? (this.book.geo.spread ? live.spread : live.single) : live.one,
      { label: ch.label, n: this.view + 1, total },
    );
  }

  // ---- turning one page ---------------------------------------------------------

  neighbour(step: 1 | -1): Stop | null {
    if (this.writing()) {
      // out of the writings book, only back to the page it was opened from
      if (step > 0) return null;
      const here = this.order.find((s) => s.key === this.route.path);
      return here ?? { key: this.route.path, href: this.route.path, label: this.copy.chapters.home, book: "home", page: 1 };
    }
    const rank = this.current().rank;
    if (step > 0) {
      const next = this.order.find((_, i) => i > rank);
      return next ?? { key: "/", href: "/", label: this.copy.chapters.close, book: "home", page: 1 };
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
    if (this.writing()) return this.reopen();
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

  /** On a phone the row of books scrolls: bring a book into view. */
  showOnShelf(key: BookKey) {
    const shelf = this.book.shelf;
    const li = shelf.querySelector<HTMLElement>(`[data-book="${key}"]`);
    if (!li || shelf.scrollWidth <= shelf.clientWidth + 1) return;
    shelf.scrollLeft = Math.max(0, li.offsetLeft - (shelf.clientWidth - li.offsetWidth) / 2);
  }

  /** The books lying on the desk: the open one's place is empty. */
  renderShelf() {
    const list = h("ul");
    const words = this.copy.books;
    BOOKS.forEach((b, i) => {
      const open = b.key === this.bookKey;
      const book = words[b.key];
      const href = b.key === "writing" ? this.ctx.content.site.writingUrl : b.href;
      list.append(
        h(
          "li",
          { style: `--i:${i}`, "data-book": b.key, "data-theme": b.theme },
          h(
            "a",
            {
              href,
              class: "bp-shelf__book",
              "aria-current": open ? "true" : null,
              "data-state": open ? "open" : null,
              "data-open": words.open,
            },
            h("span", { class: "bp-shelf__paper", "aria-hidden": "true" }),
            h(
              "span",
              { class: "bp-shelf__label" },
              h("b", null, book.name),
              h("small", null, book.aside),
              open ? h("span", { class: "bp-sr" }, words.openOnDesk) : null,
            ),
          ),
        ),
      );
    });
    this.book.shelf.replaceChildren(list);
  }

  renderCorners() {
    const corners = this.book.corners;
    corners.replaceChildren();
    const words = this.copy.turner;
    const make = (step: 1 | -1) => {
      const cls = `bp-corner bp-corner--${step > 0 ? "next" : "prev"}`;
      if (this.canTurn(step)) {
        // the next page of this chapter: what a reader (or the parity test)
        // clicks to read on
        const btn = h(
          "button",
          { class: cls, type: "button", "data-prism-turn": step > 0 ? "next" : null },
          h("span", { class: "bp-corner__ear", "aria-hidden": "true" }),
          h("span", { class: "bp-corner__label" }, step > 0 ? `${words.next} →` : `← ${words.prev}`),
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
    const nav = h("nav", { class: "bp-turner", "aria-label": words.label }, prev, next);
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
        const menu = target?.closest<HTMLElement>(".bp-shelf");
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

    // the writings book opens from the pile, and while it's open a link back
    // to the page the URL is on puts it away again
    this.desk.addEventListener(
      "click",
      (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const a = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
        if (!a) return;
        if (a.closest('.bp-shelf [data-book="writing"]')) {
          event.preventDefault();
          if (!this.busy) this.openWriting();
          return;
        }
        if (this.writing() && a.origin === location.origin && a.pathname === this.route.path) {
          event.preventDefault();
          this.reopen();
        }
      },
      { signal, capture: true },
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
    this.paged = this.rebuild();
    const page = Math.min(firstPage, this.paged.pages.length - 1);
    this.view = geo.spread ? Math.floor(page / 2) : page;
    this.book.place(this.pagesAt(this.paged, this.view));
    this.renderShelf();
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
