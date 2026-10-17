/** Life: how the two hions answer the visitor.
 *
 * (Every thread, the loops tied round what you hover included, is one of
 * the two hions or a branch of one: skein.ts.)
 *
 * The loom lays the drawing down once and leaves it. What moves here runs
 * on the screen's one frame loop (pulse.ts), which sleeps the moment
 * nothing moves and never runs while the page is idle.
 * The glints riding the hions' circles are the compositor's (CSS
 * offset-path), not a frame loop's.
 *
 *   glints    a glint rides slowly round each circle the hions drew.
 *             (Plucks and light along the threads are the skein's: they
 *             run through every branch of the tree.)
 *   sway      scrolling swings everything that hangs, through one custom
 *             property on the world; brushing the cord a row hangs from
 *             sends a ripple down it; the destinations chime on hover.
 *   eggs      left alone, the threads now and then tie a small knot of
 *             their own (a loop on the skein), or light chases light down
 *             the two of them. */
import { type Hue, Path, type Pt, rng } from "./pastel";
import type { createLoom } from "./loom";
import type { Pulse } from "./pulse";
import type { createSkein } from "./skein";

type Loom = ReturnType<typeof createLoom>;

interface LifeOptions {
  /** Where the overlay lives (fixed, over the page, under the line). */
  world: HTMLElement;
  /** The screen: the loom's host, whose space the drawing is in. */
  page: HTMLElement;
  loom: Loom;
  /** Every other thread: a knot of their own is a loop on it. */
  skein: ReturnType<typeof createSkein>;
  pulse: Pulse;
  signal: AbortSignal;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

/** What hangs and swings with a scroll (shell.css reads --hion-sway). */
const SWINGS =
  ".hion-charm, .hion-tag, .hion-pullcord[data-hang], .hion-work--lab, .hion-end, .hion-title, .hion-display__word, .hion-pull";

/* ---------- A drawn thread ---------- */

/** Points further apart than this are either side of a gap in a thread. */
const GAP = 400;

class Strand {
  xs: Float64Array;
  ys: Float64Array;
  ls: Float64Array;
  keys: Float64Array;
  total: number;

  constructor(points: Pt[], keys: Float64Array) {
    const n = points.length;
    this.xs = new Float64Array(n);
    this.ys = new Float64Array(n);
    this.ls = new Float64Array(n);
    this.keys = keys;
    for (let i = 0; i < n; i++) {
      this.xs[i] = points[i][0];
      this.ys[i] = points[i][1];
      // A thread that leaves the page for a track (weave.ts `gap`) comes
      // back further down: nothing runs across the stretch between.
      const step = i ? Math.hypot(this.xs[i] - this.xs[i - 1], this.ys[i] - this.ys[i - 1]) : 0;
      this.ls[i] = i ? this.ls[i - 1] + (step > GAP ? 0 : step) : 0;
    }
    this.total = n ? this.ls[n - 1] : 0;
  }
  index(s: number) {
    let lo = 0;
    let hi = this.ls.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.ls[mid] <= s) lo = mid;
      else hi = mid;
    }
    return lo;
  }
  /** Point and unit normal at arc length s. */
  at(s: number): [number, number, number, number] {
    const n = this.xs.length;
    s = Math.max(0, Math.min(this.total, s));
    const lo = this.index(s);
    const hi = Math.min(n - 1, lo + 1);
    const span = this.ls[hi] - this.ls[lo] || 1;
    const t = Math.min(1, (s - this.ls[lo]) / span);
    const a = Math.max(0, lo - 2);
    const b = Math.min(n - 1, hi + 2);
    const dx = this.xs[b] - this.xs[a];
    const dy = this.ys[b] - this.ys[a];
    const len = Math.hypot(dx, dy) || 1;
    return [
      this.xs[lo] + (this.xs[hi] - this.xs[lo]) * t,
      this.ys[lo] + (this.ys[hi] - this.ys[lo]) * t,
      -dy / len,
      dx / len,
    ];
  }
}

/* ---------- Things alive on the page ---------- */

interface OrbitGlint {
  key: number;
  el: HTMLElement;
  ride: Animation;
  shown: boolean;
}

interface Row {
  holder: HTMLElement;
  items: HTMLElement[];
  y: number;
  l: number;
  r: number;
  last: number;
}

export function createLife(options: LifeOptions) {
  const { world, page, loom, skein, signal } = options;
  const fine = matchMedia("(pointer: fine)").matches;
  // The glints, on the page (they ride with it).
  const layer = document.createElement("div");
  layer.className = "hion-glints";
  layer.setAttribute("aria-hidden", "true");

  let strands: Partial<Record<Hue, Strand>> = {};
  let version = -1;
  let glints: OrbitGlint[] = [];
  let rows: Row[] = [];

  // The pointer, in page space.
  const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, speed: 0, at: 0, here: false };
  let pageTop = 0;
  let pageLeft = 0;
  let sway = 0;
  let swayV = 0;
  let lastScroll = scrollY;
  let lastInput = performance.now();
  let lastEgg = performance.now();
  const rand = rng(Date.now() % 10007);

  /** The things that swing, given the angle each frame. Set on each of them
   * rather than once on the world: a custom property changed on the world
   * restyles the whole page every frame of a scroll. */
  let swung: HTMLElement[] = [];
  let swungAt = 0;
  let swungAngle = "";
  function swing(angle: string) {
    if (angle === swungAngle) return;
    const now = performance.now();
    // Only what is on screen (looked for again as you scroll on).
    if (angle && (!swung.length || now - swungAt > 400)) {
      for (const el of swung) el.style.removeProperty("--hion-sway");
      swungAt = now;
      swung = [...world.querySelectorAll<HTMLElement>(SWINGS)].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > -80 && r.top < innerHeight + 80 && r.width > 0;
      });
    }
    swungAngle = angle;
    for (const el of swung) {
      if (angle) el.style.setProperty("--hion-sway", angle);
      else el.style.removeProperty("--hion-sway");
    }
    if (!angle) swung = [];
  }

  function measure() {
    const box = page.getBoundingClientRect();
    pageTop = box.top;
    pageLeft = box.left;
  }

  /** Layout position in page space (unmoved by any swing in progress). */
  function offset(el: HTMLElement): Pt {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== page) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return [x, y];
  }

  /** Pick up the drawing again whenever the loom recomposed it. */
  function sync() {
    if (loom.version() === version) return;
    version = loom.version();
    strands = {};
    for (const tip of loom.journeys()) strands[tip.hue] = new Strand(tip.points, tip.keys);
    for (const g of glints) g.el.remove();
    glints = loom.orbits().map((orbit) => {
      // Round the circle on the compositor: a transform through points
      // along it (an offset-path would be animated on the main thread).
      const el = document.createElement("span");
      el.className = "hion-glint";
      el.dataset.hue = orbit.hue;
      layer.append(el);
      const path = new Path(orbit.points, 4);
      const step = Math.max(6, path.length / 90);
      const frames: Keyframe[] = [];
      for (let s = 0; s <= path.length; s += step) {
        const [x, y] = path.at(s);
        frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` });
      }
      const ride = el.animate(frames, {
        duration: path.length / (orbit.hue === "c" ? 0.075 : 0.05),
        iterations: Infinity,
        easing: "linear",
      });
      ride.pause();
      return { key: orbit.key, el, ride, shown: false };
    });
    rows = [];
    for (const holder of page.querySelectorAll<HTMLElement>("[data-cord]")) {
      const items = [...holder.querySelectorAll<HTMLElement>("[data-hang]")].filter(
        (item) => item.closest("[data-cord]") === holder && item.offsetParent !== null,
      );
      if (!items.length) continue;
      const hl = offset(holder)[0];
      const ys = items.map((item) => {
        const hang = parseFloat(item.style.getPropertyValue("--hion-hang")) || 0;
        return offset(item)[1] - hang;
      });
      rows.push({
        holder,
        items,
        y: Math.min(...ys),
        l: hl,
        r: hl + holder.offsetWidth,
        last: 0,
      });
    }
  }

  /* ---------- Rows: brushing a cord ---------- */

  function ripple(row: Row, x: number, dir: number, now: number) {
    if (now - row.last < 900) return;
    row.last = now;
    for (const item of row.items) {
      const b = item.getBoundingClientRect();
      const cx = b.left - pageLeft + b.width / 2;
      const delay = Math.abs(cx - x) / 1.3;
      const a = (2.6 + rand() * 1.2) * dir;
      item.animate(
        [
          { rotate: "0deg" },
          { rotate: `${a}deg`, offset: 0.2 },
          { rotate: `${-a * 0.55}deg`, offset: 0.48 },
          { rotate: `${a * 0.25}deg`, offset: 0.74 },
          { rotate: "0deg" },
        ],
        { duration: 1300, delay, easing: "ease-in-out", composite: "add" },
      );
    }
  }

  function chime(charm: Element) {
    const list = charm.closest(".hion-nav__list");
    if (!list) return;
    const all = [...list.querySelectorAll<HTMLElement>(".hion-charm")];
    const at = all.indexOf(charm as HTMLElement);
    all.forEach((other, i) => {
      if (i === at) return;
      const d = Math.abs(i - at);
      const a = 1.6 / d;
      other.animate(
        [
          { rotate: "0deg" },
          { rotate: `${a}deg`, offset: 0.25 },
          { rotate: `${-a * 0.6}deg`, offset: 0.55 },
          { rotate: "0deg" },
        ],
        { duration: 900, delay: 70 * d, easing: "ease-in-out", composite: "add" },
      );
    });
  }

  /* ---------- Easter eggs ---------- */

  function visibleSpan(strand: Strand, reach: number): [number, number] | null {
    const top = -pageTop;
    const bottom = top + innerHeight;
    let s0 = Infinity;
    let s1 = -Infinity;
    for (let i = 0; i < strand.ys.length; i += 4) {
      if (strand.keys[i] > reach) break;
      if (strand.ys[i] >= top && strand.ys[i] <= bottom) {
        s0 = Math.min(s0, strand.ls[i]);
        s1 = Math.max(s1, strand.ls[i]);
      }
    }
    return s1 - s0 > 200 ? [s0, s1] : null;
  }

  function egg(now: number) {
    const reach = loom.reach();
    if (rand() < 0.5) {
      // A chase: light sets off down magenta, and light tears after it
      // down cyan; both run out into every branch they pass.
      const m = strands.m && visibleSpan(strands.m, reach);
      const c = strands.c && visibleSpan(strands.c, reach);
      if (!m || !c) return false;
      skein.chase("m", m[0], 0.42, 0);
      skein.chase("c", c[0], 0.95, 500);
    } else {
      // Each ties a small knot of its own, holds it, and lets it go.
      let any = false;
      (["c", "m"] as Hue[]).forEach((hue, i) => {
        const strand = strands[hue];
        const span = strand && visibleSpan(strand, reach);
        if (!strand || !span) return;
        const s = span[0] + (0.2 + rand() * 0.6) * (span[1] - span[0]);
        if (skein.knot(hue, s, 9 + i * 3, 1500 + i * 500)) any = true;
      });
      if (!any) return false;
    }
    lastEgg = now;
    return true;
  }

  /* ---------- The loop ---------- */

  function alive() {
    return Math.abs(sway) > 0.02 || Math.abs(swayV) > 0.002;
  }

  const task = options.pulse.add(tick);

  function wake() {
    task.wake();
    skein.wake();
  }

  /** The glints show once their circle is drawn. */
  function lightGlints() {
    const reach = loom.reach();
    for (const g of glints) {
      const show = g.key <= reach;
      if (show === g.shown) continue;
      g.shown = show;
      g.el.dataset.state = show ? "on" : "";
      if (show && !options.isIdle()) g.ride.play();
      else g.ride.pause();
    }
  }

  function tick(_now: number, dt: number) {
    if (options.isIdle()) return false;
    dt = Math.min(48, dt);
    measure();
    sync();
    lightGlints();

    /* Sway: everything hung swings with the scroll, and settles. */
    if (Math.abs(sway) > 0.001 || Math.abs(swayV) > 0.0005) {
      swayV += (-sway * 0.00028 - swayV * 0.0036) * dt;
      sway += swayV * dt;
      if (Math.abs(sway) < 0.02 && Math.abs(swayV) < 0.0005) {
        sway = 0;
        swayV = 0;
      }
      // In tenths of a degree: finer is not seen, and each change restyles.
      swing(sway ? `${Math.max(-5, Math.min(5, sway)).toFixed(1)}deg` : "");
    }
    return alive();
  }

  /* ---------- Input ---------- */

  function onMove(event: PointerEvent) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const now = performance.now();
    lastInput = now;
    measure();
    const x = event.clientX - pageLeft;
    const y = event.clientY - pageTop;
    const dt = Math.max(8, now - pointer.at);
    if (pointer.here) {
      pointer.vx = (x - pointer.x) / dt;
      pointer.vy = (y - pointer.y) / dt;
      pointer.speed = Math.hypot(pointer.vx, pointer.vy);
    }
    pointer.x = x;
    pointer.y = y;
    pointer.at = now;
    pointer.here = true;
    sync();
    // Brushing the cord a row hangs from.
    for (const row of rows) {
      if (Math.abs(y - row.y) < 9 && x > row.l - 24 && x < row.r + 24 && pointer.speed > 0.05) {
        ripple(row, x, pointer.vx >= 0 ? 1 : -1, now);
      }
    }
    wake();
  }

  function onScroll() {
    const now = performance.now();
    lastInput = now;
    const dy = scrollY - lastScroll;
    lastScroll = scrollY;
    swayV += Math.max(-0.22, Math.min(0.22, dy * 0.0007));
    wake();
  }

  function onLeave() {
    pointer.here = false;
    wake();
  }

  // The glints hold still while the prism holds the page (prism.css stops
  // CSS animations; these are the shell's own).
  options.onIdleChange((idle) => {
    for (const g of glints) {
      if (idle || !g.shown) g.ride.pause();
      else g.ride.play();
    }
    if (!idle) wake();
  });

  // Left alone, the threads amuse themselves. Rarely.
  const eggs = window.setInterval(() => {
    const now = performance.now();
    if (options.isIdle() || document.hidden || !strands.c) return;
    if (now - lastInput < 14000 || now - lastEgg < 30000 || rand() > 0.3) return;
    if (egg(now)) wake();
  }, 4000);

  return {
    start() {
      page.insertBefore(layer, page.querySelector(":scope > main"));
      measure();
      sync();
      addEventListener("pointermove", onMove, { passive: true, signal });
      document.addEventListener("pointerleave", onLeave, { signal });
      addEventListener("scroll", onScroll, { passive: true, signal });
      addEventListener("resize", () => wake(), { signal });
      if (fine) {
        world.addEventListener(
          "pointerenter",
          (event) => {
            const charm = event.target as Element;
            if (charm.matches?.(".hion-nav__list .hion-charm")) chime(charm);
          },
          { capture: true, signal },
        );
      }
      signal.addEventListener("abort", () => {
        clearInterval(eggs);
        layer.remove();
        swing("");
      });
      wake();
    },
    /** The loom drew on: a circle may be drawn now. */
    wake,
    /** The page is leaving: everything alive lets go. */
    release() {
      layer.dataset.state = "leaving";
    },
  };
}
