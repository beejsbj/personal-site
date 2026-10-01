/** The exercise book on the desk: where it lies, how big its pages are, and
 * how a leaf turns. A turn moves the real page elements onto a leaf that
 * swings about the spine in perspective, shading as it lifts away from the
 * lamp and casting its shadow on the page it uncovers. */
import { h } from "./dom";

export interface Geometry {
  spread: boolean;
  pw: number;
  ph: number;
  x: number;
  y: number;
  fs: number;
  lh: number;
}

export function measure(): Geometry {
  const vw = document.documentElement.clientWidth || innerWidth;
  const vh = innerHeight;
  const spread = vw >= 880 && vw >= vh * 1.12;
  let pw: number;
  let ph: number;
  let x: number;
  let y: number;
  if (spread) {
    const top = 26;
    const bottom = 34;
    const room = vh - top - bottom;
    ph = Math.min(room, (vw - 200) / 2 / 0.72, 1080);
    pw = Math.round(ph * 0.72);
    ph = Math.round(ph);
    x = Math.round((vw - 2 * pw) / 2 - 28);
    y = Math.round(top + (room - ph) / 2);
  } else {
    const top = 50;
    const bottom = 10;
    ph = vh - top - bottom;
    pw = Math.min(vw - 22, 640, Math.round(ph * 0.82));
    x = Math.round((vw - pw) / 2 + 5);
    y = top;
  }
  const fs = spread
    ? Math.max(16.5, Math.min(21, ph / 37))
    : Math.max(17.5, Math.min(20.5, pw / 19.5));
  const lh = Math.round((fs * 1.5) / 2) * 2;
  return { spread, pw, ph, x, y, fs: Math.round(fs * 10) / 10, lh };
}

export const sameShape = (a: Geometry, b: Geometry) =>
  a.spread === b.spread && a.pw === b.pw && a.ph === b.ph;

export interface Turn {
  done: Promise<void>;
  /** Scrub a turn that follows a finger, 0..1. */
  seek(progress: number): void;
  /** Let go: finish the turn, or fall back to where it was. */
  release(commit: boolean): Promise<void>;
}

const EASE = "cubic-bezier(.42,.02,.24,1)";

export class Book {
  el: HTMLElement;
  main: HTMLElement;
  slots: HTMLElement[] = [];
  leaves: HTMLElement;
  corners: HTMLElement;
  tabs: HTMLElement;
  stage: HTMLElement;
  loose: HTMLElement | null = null;
  geo!: Geometry;
  /** The pages lying open right now, left to right. */
  showing: HTMLElement[] = [];
  /** Told when a page lands open for the first time (after a turn, or as the
   * book arrives), so the hand can write its heading in. */
  land?: (page: HTMLElement, delay: number) => void;
  /** Told whenever pages lie open (the soldiers camp on them once they're still). */
  placed?: (pages: HTMLElement[]) => void;
  private landDelay = 0;

  constructor(
    private host: HTMLElement,
    private still: boolean,
  ) {
    this.el = h("div", { class: "bp-book" });
    this.tabs = h("nav", { class: "bp-tabs", "aria-label": "Book tabs" });
    this.main = h("main", { class: "bp-spread", id: "bp-main", tabindex: "-1" });
    this.leaves = h("div", { class: "bp-leaves", "aria-hidden": "true" });
    this.corners = h("div", { class: "bp-corners" });
    this.stage = h("div", { class: "bp-stage", "aria-hidden": "true" });
    this.el.append(
      h("div", { class: "bp-board", "aria-hidden": "true" }),
      h("div", { class: "bp-edges", "aria-hidden": "true" }),
      this.tabs,
      this.main,
      this.leaves,
      this.corners,
    );
    host.append(this.el, this.stage);
  }

  /** Size the book for the window. */
  layout(geo: Geometry) {
    this.geo = geo;
    const s = this.el.style;
    s.setProperty("--pw", `${geo.pw}px`);
    s.setProperty("--ph", `${geo.ph}px`);
    s.setProperty("--fs", `${geo.fs}px`);
    s.setProperty("--lh", `${geo.lh}px`);
    s.left = `${geo.x}px`;
    s.top = `${geo.y}px`;
    this.el.dataset.mode = geo.spread ? "spread" : "single";
    // the desk knows where the book lies, so the pens can lie beside it
    const d = this.host.style;
    d.setProperty("--bx", `${geo.x}px`);
    d.setProperty("--by", `${geo.y}px`);
    d.setProperty("--bw", `${geo.spread ? geo.pw * 2 : geo.pw}px`);
    d.setProperty("--bh", `${geo.ph}px`);
    // the staging area measures pages at the size they'll be shown
    const st = this.stage.style;
    for (const prop of ["--pw", "--ph", "--fs", "--lh"])
      st.setProperty(prop, s.getPropertyValue(prop));
    this.stage.dataset.mode = this.el.dataset.mode;
    const want = geo.spread ? 2 : 1;
    if (this.slots.length !== want) {
      this.slots = Array.from({ length: want }, (_, i) =>
        h("div", {
          class: "bp-slot",
          "data-side": geo.spread ? (i ? "right" : "left") : "single",
        }),
      );
      this.main.replaceChildren(...this.slots);
      if (this.loose) this.main.append(this.loose);
    }
  }

  /** Where the book is in its life: how thick the stacks of pages are. */
  setDepth(fraction: number) {
    this.el.style.setProperty("--read", fraction.toFixed(3));
  }

  /** Lay pages open, no turning. */
  place(pages: HTMLElement[]) {
    this.slots.forEach((slot, i) => {
      const page = pages[i];
      if (page) slot.replaceChildren(page);
      else slot.replaceChildren();
    });
    this.showing = pages;
    this.markSides();
    for (const page of pages) {
      if (!("fresh" in page.dataset)) continue;
      delete page.dataset.fresh;
      this.land?.(page, this.landDelay);
    }
    this.placed?.(pages);
  }

  /** Pages about to be turned to: their ink stays off the paper until they
   * land, when it is written in. */
  private fresh(pages: (HTMLElement | null)[]) {
    if (this.still || !this.land) return;
    for (const page of pages) if (page) page.dataset.fresh = "";
  }

  private markSides() {
    this.slots.forEach((slot) => {
      const page = slot.firstElementChild as HTMLElement | null;
      if (page) page.dataset.side = slot.dataset.side;
    });
  }

  /** A loose sheet lying over the open book (null takes it away). */
  setLoose(sheet: HTMLElement | null, animate: boolean) {
    const old = this.loose;
    this.loose = sheet;
    this.slots.forEach((slot) => slot.toggleAttribute("inert", !!sheet));
    if (sheet) {
      sheet.classList.add("bp-loose");
      this.main.append(sheet);
      if (animate && !this.still)
        sheet.animate(
          [
            { transform: "translate(4%, -18%) rotate(-7deg)", opacity: 0 },
            { transform: "translate(0, 0) rotate(-1deg)", opacity: 1 },
          ],
          { duration: 520, easing: "cubic-bezier(.2,.8,.25,1)" },
        );
    }
    if (old && old !== sheet) {
      if (animate && !this.still) {
        old.setAttribute("inert", "");
        old
          .animate(
            [
              { transform: "translate(0,0) rotate(-1deg)", opacity: 1 },
              { transform: "translate(-6%, -30%) rotate(-10deg)", opacity: 0 },
            ],
            { duration: 420, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" },
          )
          .finished.then(() => old.remove(), () => old.remove());
      } else old.remove();
    }
  }

  private face(page: HTMLElement | null, side: "front" | "back") {
    const face = h("div", { class: `bp-leaf__face bp-leaf__face--${side}` });
    face.append(page ?? backOfPage());
    face.append(h("i", { class: "bp-leaf__shade" }));
    return face;
  }

  private leaf(front: HTMLElement | null, back: HTMLElement | null) {
    const leaf = h(
      "div",
      { class: "bp-leaf", inert: true },
      this.face(front, "front"),
      this.face(back, "back"),
    );
    this.leaves.append(leaf);
    return leaf;
  }

  /** Turn from what's open to `next`, forward (1) or back (-1). `flurry`
   * blank leaves go over first when the jump is far. */
  turn(next: HTMLElement[], dir: 1 | -1, flurry = 0, manual = false): Turn {
    const before = this.showing;
    const spread = this.geo.spread;
    this.corners.dataset.state = "turning";

    if (this.still) {
      this.place(next);
      for (const page of next)
        page.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 180 });
      this.corners.dataset.state = "";
      const done = Promise.resolve();
      return { done, seek() {}, release: () => done };
    }

    this.fresh(next);
    let front: HTMLElement | null;
    let back: HTMLElement | null;
    const [L0, R0] = before;
    const [L1, R1] = next;
    if (spread) {
      if (dir > 0) {
        this.slots[1].replaceChildren(R1 ?? "");
        front = R0 ?? null;
        back = L1 ?? null;
      } else {
        this.slots[0].replaceChildren(L1 ?? "");
        front = R1 ?? null;
        back = L0 ?? null;
      }
    } else if (dir > 0) {
      this.slots[0].replaceChildren(L1 ?? "");
      front = L0 ?? null;
      back = null;
    } else {
      front = L1 ?? null;
      back = null;
    }
    this.markSides();
    for (const page of [front, back]) if (page) page.dataset.side = "leaf";

    const duration = spread ? 820 : 620;
    const open = spread ? -180 : -178;
    const from = dir > 0 ? 0 : open;
    const to = dir > 0 ? open : 0;
    const animations: Animation[] = [];
    const extras: HTMLElement[] = [];
    const timing = (delay: number, dur = duration): KeyframeAnimationOptions => ({
      duration: dur,
      delay,
      easing: EASE,
      fill: "both",
    });

    // the blur of pages when the book is flicked through
    for (let i = 0; i < flurry; i++) {
      const blur = this.leaf(null, null);
      blur.classList.add("bp-leaf--blur");
      extras.push(blur);
      animations.push(
        blur.animate(
          [{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }],
          timing(i * 70, 520),
        ),
      );
    }
    const delay = flurry * 70;
    const leaf = this.leaf(front, back);
    const bend = spread ? 14 : 10;
    animations.push(
      leaf.animate(
        [
          { transform: `rotateY(${from}deg)` },
          { transform: `rotateY(${(from + to) / 2}deg) skewY(${dir > 0 ? -bend / 10 : bend / 10}deg)`, offset: 0.5 },
          { transform: `rotateY(${to}deg)` },
        ],
        timing(delay),
      ),
    );
    const [shadeF, shadeB] = leaf.querySelectorAll<HTMLElement>(".bp-leaf__shade");
    // a face darkens as it tilts away from the lamp, and lightens as it lands
    const lifting = [{ opacity: 0 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0.55 }];
    const landing = [{ opacity: 0.55 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0 }];
    animations.push(shadeF.animate(dir > 0 ? lifting : landing, timing(delay)));
    animations.push(shadeB.animate(dir > 0 ? landing : lifting, timing(delay)));

    // the leaf's shadow on the page it uncovers, darkest at the spine
    const castOn = spread ? this.slots[dir > 0 ? 1 : 0] : this.slots[0];
    const cast = h("i", { class: "bp-cast", "data-from": spread ? (dir > 0 ? "left" : "right") : "left" });
    castOn.append(cast);
    extras.push(cast);
    animations.push(
      cast.animate(
        dir > 0
          ? [{ opacity: 0.7 }, { opacity: 0, offset: 0.55 }, { opacity: 0 }]
          : [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 0.7 }],
        timing(delay),
      ),
    );

    let settled = false;
    const finish = (commit: boolean) => {
      if (settled) return;
      settled = true;
      for (const a of animations) a.cancel();
      extras.forEach((el) => el.remove());
      leaf.remove();
      this.place(commit ? next : before);
      this.corners.dataset.state = "";
    };

    if (manual) animations.forEach((a) => a.pause());
    const all = () => Promise.all(animations.map((a) => a.finished)).then(() => undefined);
    const done = manual ? new Promise<void>(() => {}) : all().then(() => finish(true), () => finish(true));
    const total = delay + duration;
    return {
      done,
      seek(progress: number) {
        const t = Math.max(0, Math.min(1, progress)) * total;
        animations.forEach((a) => (a.currentTime = t));
      },
      release: async (commit: boolean) => {
        animations.forEach((a) => {
          if (!commit) a.playbackRate = -1.4;
          a.play();
        });
        await all().catch(() => {});
        finish(commit);
      },
    };
  }

  /** The book arrives on the desk; on a wide desk, closed, then opened. */
  async open(pages: HTMLElement[], cover: HTMLElement | null) {
    if (this.still) {
      this.place(pages);
      return;
    }
    if (!cover || !this.geo.spread) {
      this.fresh(pages);
      this.landDelay = 420;
      this.place(pages);
      this.landDelay = 0;
      await this.el.animate(
        [
          { transform: "translateY(30px) rotate(-2.5deg)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" },
      ).finished.catch(() => {});
      return;
    }
    const [left, right] = pages;
    this.fresh(pages);
    this.corners.dataset.state = "turning";
    this.slots[0].replaceChildren();
    this.slots[1].replaceChildren(right ?? "");
    this.markSides();
    this.el.dataset.closed = "";
    const leaf = this.leaf(cover, left ?? null);
    leaf.classList.add("bp-leaf--cover");
    const shift = `translateX(${-this.geo.pw / 2}px)`;
    const arrive = this.el.animate(
      [
        { transform: `${shift} translateY(40px) rotate(-3deg)`, opacity: 0 },
        { transform: `${shift}`, opacity: 1 },
      ],
      { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" },
    );
    await arrive.finished.catch(() => {});
    await new Promise((r) => setTimeout(r, 380));
    delete this.el.dataset.closed;
    const slide = this.el.animate([{ transform: shift }, { transform: "none" }], {
      duration: 1000,
      easing: EASE,
      fill: "both",
    });
    const swing = leaf.animate(
      [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }],
      { duration: 1000, easing: EASE, fill: "both" },
    );
    const shades = leaf.querySelectorAll<HTMLElement>(".bp-leaf__shade");
    shades[0].animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0.55 }], { duration: 1000, easing: EASE, fill: "both" });
    shades[1].animate([{ opacity: 0.6 }, { opacity: 0.6, offset: 0.5 }, { opacity: 0 }], { duration: 1000, easing: EASE, fill: "both" });
    await Promise.all([slide.finished, swing.finished]).catch(() => {});
    leaf.remove();
    arrive.cancel();
    slide.cancel();
    this.place(pages);
    this.corners.dataset.state = "";
  }
}

/** The back of a leaf on a phone: squares, and the ink of the other side
 * showing through. */
function backOfPage() {
  return h("div", { class: "bp-page", "data-paper": "squared", "data-kind": "back" });
}
