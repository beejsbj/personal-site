/** Life: how the two hions answer the visitor.
 *
 * The loom lays the drawing down once and leaves it. This layer is what
 * moves on top of it: one viewport-sized canvas (cleared and redrawn only
 * while something is alive) and a few light spans, driven by one frame
 * loop that sleeps the moment nothing moves and never runs while the page
 * is idle.
 *
 *   tendrils  near the pointer each hion lifts a little of itself off the
 *             page toward it: cyan darts, throws a curl at its tip and
 *             fidgets; magenta drifts over slowly and sags. Both shy away
 *             from a cursor that moves too fast.
 *   loops     hover something hung, strung or linked and cyan runs over and
 *             ties a loop round it; leave and it unties, from the end back.
 *             Magenta drifts under it to look.
 *   runners   touch a thread and a bead of light runs away along it both
 *             ways; a glint rides slowly round each circle the hions drew.
 *   plucks    a click or tap plucks the nearest thread like a string, and
 *             shakes pastel dust off it.
 *   dust      pigment drifts off the threads near a moving pointer and
 *             falls, slowly, onto the paper.
 *   sway      scrolling swings everything that hangs, through one custom
 *             property on the world; brushing the cord a row hangs from
 *             sends a ripple down it; the destinations chime on hover.
 *   eggs      left alone, the threads now and then tie a small knot of
 *             their own, or chase each other down the page. */
import { cubic, type Hue, Kind, type Mark, paint, patterns, type Patterns, Path, type Pt, RGB, rng, thread } from "./pastel";
import type { createLoom } from "./loom";

type Loom = ReturnType<typeof createLoom>;

interface LifeOptions {
  /** Where the overlay lives (fixed, over the page, under the line). */
  world: HTMLElement;
  /** The screen: the loom's host, whose space the drawing is in. */
  page: HTMLElement;
  loom: Loom;
  signal: AbortSignal;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

/* ---------- A drawn thread, searchable ---------- */

const CELL = 64;

class Strand {
  xs: Float64Array;
  ys: Float64Array;
  ls: Float64Array;
  keys: Float64Array;
  total: number;
  private grid = new Map<number, number[]>();

  constructor(points: Pt[], keys: Float64Array) {
    const n = points.length;
    this.xs = new Float64Array(n);
    this.ys = new Float64Array(n);
    this.ls = new Float64Array(n);
    this.keys = keys;
    for (let i = 0; i < n; i++) {
      this.xs[i] = points[i][0];
      this.ys[i] = points[i][1];
      this.ls[i] = i ? this.ls[i - 1] + Math.hypot(this.xs[i] - this.xs[i - 1], this.ys[i] - this.ys[i - 1]) : 0;
      const cell = this.cell(this.xs[i], this.ys[i]);
      const bucket = this.grid.get(cell);
      if (bucket) bucket.push(i);
      else this.grid.set(cell, [i]);
    }
    this.total = n ? this.ls[n - 1] : 0;
  }
  private cell(x: number, y: number) {
    return Math.floor(x / CELL) * 65536 + Math.floor(y / CELL);
  }
  /** Nearest drawn point within r of (x, y). */
  nearest(x: number, y: number, r: number, reach: number) {
    let best = -1;
    let bd = r * r;
    const cx0 = Math.floor((x - r) / CELL);
    const cx1 = Math.floor((x + r) / CELL);
    const cy0 = Math.floor((y - r) / CELL);
    const cy1 = Math.floor((y + r) / CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const bucket = this.grid.get(cx * 65536 + cy);
        if (!bucket) continue;
        for (const i of bucket) {
          if (this.keys[i] > reach) continue;
          const dx = this.xs[i] - x;
          const dy = this.ys[i] - y;
          const d = dx * dx + dy * dy;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
      }
    }
    return best < 0 ? null : { i: best, d: Math.sqrt(bd), s: this.ls[best] };
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
  drawnAt(s: number, reach: number) {
    return this.keys[this.index(s)] <= reach;
  }
}

/* ---------- Things alive on the page ---------- */

interface Tendril {
  hue: Hue;
  /** Where it lifts off the thread (arc length), and where it wants to. */
  s: number;
  want: number;
  tip: Pt;
  aim: Pt;
  strength: number;
  phase: number;
  /** Whether it has somewhere to be (the pointer, or a thing to look at). */
  busy: boolean;
}

interface Loop {
  el: Element | null;
  path: Path;
  marks: Mark[];
  total: number;
  progress: number;
  state: "tying" | "held" | "untying";
  holdUntil: number;
  head: Pt;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  hue: Hue;
  pale: boolean;
  size: number;
}

interface Pluck {
  hue: Hue;
  s: number;
  age: number;
  amp: number;
}

interface Runner {
  hue: Hue;
  s: number;
  v: number;
  /** Stop here (arc length). */
  to: number;
  age: number;
}

interface OrbitGlint {
  hue: Hue;
  path: Path;
  key: number;
  top: number;
  bottom: number;
  el: HTMLElement;
  s: number;
  v: number;
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

const TEND = {
  c: { reach: 130, rate: 0.016, slide: 0.012, w: 2.8, seed: 71 },
  m: { reach: 170, rate: 0.0045, slide: 0.004, w: 3.6, seed: 72 },
};

const HOVER = "[data-ink]:not(.hion-pull), .hion-strung, .hion-tie, .hion-prose a, .hion-foot__mail a";

export function createLife(options: LifeOptions) {
  const { world, page, loom, signal } = options;
  const fine = matchMedia("(pointer: fine)").matches;
  const layer = document.createElement("div");
  layer.className = "hion-life";
  layer.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  layer.append(canvas);
  world.append(layer);
  const ctx = canvas.getContext("2d")!;
  let pats: Patterns | undefined;
  let dpr = 1;
  let cw = 0;
  let ch = 0;

  let strands: Partial<Record<Hue, Strand>> = {};
  let version = -1;
  let glints: OrbitGlint[] = [];
  let rows: Row[] = [];
  const tendrils: Record<Hue, Tendril> = {
    c: { hue: "c", s: 0, want: 0, tip: [0, 0], aim: [0, 0], strength: 0, phase: 0, busy: false },
    m: { hue: "m", s: 0, want: 0, tip: [0, 0], aim: [0, 0], strength: 0, phase: 2, busy: false },
  };
  let loops: Loop[] = [];
  let motes: Mote[] = [];
  let plucks: Pluck[] = [];
  let runners: Runner[] = [];
  let hovered: Element | null = null;
  let hoverBox: { l: number; t: number; r: number; b: number } | null = null;
  const touched: Record<Hue, number> = { c: 0, m: 0 };

  // The pointer, in page space.
  const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, speed: 0, at: 0, here: false, shy: 0 };
  let pageTop = 0;
  let pageLeft = 0;
  let sway = 0;
  let swayV = 0;
  let lastScroll = scrollY;
  let lastInput = performance.now();
  let lastEgg = performance.now();
  let frame = 0;
  let last = 0;
  let canvasDirty = false;
  const rand = rng(Date.now() % 10007);

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

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    cw = innerWidth;
    ch = innerHeight;
    canvas.width = Math.ceil(cw * dpr);
    canvas.height = Math.ceil(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    pats = patterns(ctx, dpr);
  }

  /** Pick up the drawing again whenever the loom recomposed it. */
  function sync() {
    if (loom.version() === version) return;
    version = loom.version();
    strands = {};
    for (const tip of loom.journeys()) strands[tip.hue] = new Strand(tip.points, tip.keys);
    for (const g of glints) g.el.remove();
    glints = loom.orbits().map((orbit) => {
      const el = document.createElement("span");
      el.className = "hion-glint";
      el.dataset.hue = orbit.hue;
      layer.append(el);
      const ys = orbit.points.map((p) => p[1]);
      return {
        hue: orbit.hue,
        path: new Path(orbit.points, 4),
        key: orbit.key,
        top: Math.min(...ys),
        bottom: Math.max(...ys),
        el,
        s: 0,
        v: orbit.hue === "c" ? 0.075 : 0.05,
        shown: false,
      };
    });
    for (const hue of ["c", "m"] as Hue[]) {
      tendrils[hue].strength = 0;
      tendrils[hue].busy = false;
    }
    loops = [];
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

  /* ---------- Dust ---------- */

  function dust(x: number, y: number, hue: Hue, count: number, spread = 1) {
    for (let k = 0; k < count; k++) {
      if (motes.length >= 160) motes.shift();
      const a = rand() * Math.PI * 2;
      const sp = (0.02 + rand() * 0.07) * spread;
      motes.push({
        x: x + (rand() - 0.5) * 6,
        y: y + (rand() - 0.5) * 6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.02,
        age: 0,
        life: 900 + rand() * 1100,
        hue,
        pale: rand() < 0.25,
        size: 1 + rand() * 1.3,
      });
    }
  }

  /* ---------- Loops: cyan ties a loop round something ---------- */

  function loopPath(box: { l: number; t: number; r: number; b: number }, from: Pt, pad: number, seed: number): Pt[] {
    const cx = (box.l + box.r) / 2;
    const cy = (box.t + box.b) / 2;
    const rx = (box.r - box.l) / 2 + pad;
    const ry = (box.b - box.t) / 2 + pad;
    // Long low things get a rounded-oblong loop rather than a vast ellipse.
    const n = rx / ry > 2.2 || ry / rx > 2.2 ? 3.2 : 2;
    const r = rng(seed);
    const start = Math.atan2((from[1] - cy) / ry, (from[0] - cx) / rx);
    const turns = 1.05 + r() * 0.08;
    const out: Pt[] = [];
    const steps = Math.max(40, Math.round((rx + ry) / 4));
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const a = start + u * turns * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const wob = 1 + Math.sin(u * Math.PI * 4 + seed) * 0.03 + (u - 0.5) * 0.05;
      out.push([
        cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx * wob,
        cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry * wob,
      ]);
    }
    return out;
  }

  function tie(el: Element | null, box: { l: number; t: number; r: number; b: number }, from: Pt, pad: number) {
    const pts = loopPath(box, from, pad, Math.floor(rand() * 1000));
    const path = new Path(pts, 3);
    const total = path.length;
    const marks = thread(path, {
      hue: "c",
      w: 2.3,
      seed: 300 + Math.floor(rand() * 500),
      glow: 0,
      wobble: 0.5,
      key: [0, total],
    });
    const loop: Loop = { el, path, marks, total, progress: 0, state: "tying", holdUntil: Infinity, head: pts[0] };
    loops.push(loop);
    return loop;
  }

  function untie(el: Element | null) {
    for (const loop of loops) if (loop.el === el && loop.state !== "untying") loop.state = "untying";
  }

  function hoverPad(el: Element) {
    if (el.matches(".hion-prose a, .hion-foot__mail a")) return 7;
    if (el.matches(".hion-strung, .hion-tie")) return 12;
    if (el.matches(".hion-picture, .hion-work")) return 20;
    return 14;
  }

  function enter(el: Element) {
    if (hovered === el) return;
    if (hovered) untie(hovered);
    hovered = el;
    const r = el.getBoundingClientRect();
    hoverBox = { l: r.left - pageLeft, t: r.top - pageTop, r: r.right - pageLeft, b: r.bottom - pageTop };
    const c = tendrils.c;
    const from: Pt = c.strength > 0.2 ? c.tip : [pointer.x, pointer.y];
    tie(el, hoverBox, from, hoverPad(el));
    wake();
  }

  function leave() {
    if (!hovered) return;
    untie(hovered);
    hovered = null;
    hoverBox = null;
    wake();
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

  /* ---------- Plucks and runners ---------- */

  function pluckAt(x: number, y: number) {
    const reach = loom.reach();
    let best: { hue: Hue; s: number; d: number; x: number; y: number } | null = null;
    for (const hue of ["c", "m"] as Hue[]) {
      const strand = strands[hue];
      const hit = strand?.nearest(x, y, 80, reach);
      if (hit && (!best || hit.d < best.d)) best = { hue, s: hit.s, d: hit.d, x: strand!.xs[hit.i], y: strand!.ys[hit.i] };
    }
    if (!best) return false;
    plucks.push({ hue: best.hue, s: best.s, age: 0, amp: best.hue === "c" ? 10 : 13 });
    dust(best.x, best.y, best.hue, 12, 1.4);
    return true;
  }

  function run(hue: Hue, s: number, both: boolean, v = 0.9, span = 340) {
    const strand = strands[hue];
    if (!strand) return;
    runners.push({ hue, s, v, to: Math.min(strand.total, s + span), age: 0 });
    if (both) runners.push({ hue, s, v: -v, to: Math.max(0, s - span), age: 0 });
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
      // A chase: magenta sets off down the page, cyan tears after it.
      const m = strands.m && visibleSpan(strands.m, reach);
      const c = strands.c && visibleSpan(strands.c, reach);
      if (!m || !c) return false;
      runners.push({ hue: "m", s: m[0], v: 0.42, to: m[1], age: 0 });
      runners.push({ hue: "c", s: c[0], v: 0.95, to: c[1], age: -500 });
    } else {
      // Each ties a small knot of its own, holds it, and lets it go.
      let any = false;
      (["c", "m"] as Hue[]).forEach((hue, i) => {
        const strand = strands[hue];
        const span = strand && visibleSpan(strand, reach);
        if (!strand || !span) return;
        const s = span[0] + (0.2 + rand() * 0.6) * (span[1] - span[0]);
        const [x, y] = strand.at(s);
        const loop = tie(null, { l: x - 9, t: y - 9, r: x + 9, b: y + 9 }, [x, y], 6 + i * 3);
        loop.holdUntil = now + 1500 + i * 500;
        for (const mark of loop.marks) mark.hue = hue;
        any = true;
      });
      if (!any) return false;
    }
    lastEgg = now;
    return true;
  }

  /* ---------- The loop ---------- */

  function alive() {
    return (
      motes.length > 0 ||
      plucks.length > 0 ||
      runners.length > 0 ||
      loops.length > 0 ||
      tendrils.c.strength > 0.01 ||
      tendrils.m.strength > 0.01 ||
      tendrils.c.busy ||
      tendrils.m.busy ||
      Math.abs(sway) > 0.02 ||
      Math.abs(swayV) > 0.002 ||
      glints.some((g) => g.shown)
    );
  }

  function wake() {
    if (!frame && !options.isIdle()) frame = requestAnimationFrame(tick);
  }

  function tick(now: number) {
    frame = 0;
    if (options.isIdle()) return;
    const dt = Math.min(48, now - (last || now));
    last = now;
    measure();
    sync();
    const reach = loom.reach();
    let draw = false;

    /* Sway: everything hung swings with the scroll, and settles. */
    if (Math.abs(sway) > 0.001 || Math.abs(swayV) > 0.0005) {
      swayV += (-sway * 0.00028 - swayV * 0.0036) * dt;
      sway += swayV * dt;
      if (Math.abs(sway) < 0.02 && Math.abs(swayV) < 0.0005) {
        sway = 0;
        swayV = 0;
      }
      world.style.setProperty("--hion-sway", `${Math.max(-5, Math.min(5, sway)).toFixed(2)}deg`);
    }

    /* Glints ride the circles. */
    const viewTop = -pageTop;
    const viewBottom = viewTop + innerHeight;
    for (const g of glints) {
      const show = g.key <= reach && g.bottom > viewTop && g.top < viewBottom && !document.hidden;
      if (show !== g.shown) {
        g.shown = show;
        g.el.dataset.state = show ? "on" : "";
      }
      if (!show) continue;
      g.s = (g.s + g.v * dt) % g.path.length;
      const [x, y] = g.path.at(g.s);
      g.el.style.transform = `translate(${(x + pageLeft).toFixed(1)}px, ${(y + pageTop).toFixed(1)}px)`;
    }

    /* Tendrils. */
    if (fine) {
      const idle = now - pointer.at > 90;
      if (idle) pointer.speed *= Math.pow(0.9, dt / 16);
      const shy = now < pointer.shy;
      for (const hue of ["c", "m"] as Hue[]) {
        const t = tendrils[hue];
        const strand = strands[hue];
        const cfg = TEND[hue];
        let want = false;
        if (strand && pointer.here && !shy) {
          const hit = strand.nearest(pointer.x, pointer.y, hue === "c" ? 200 : 260, reach);
          if (hit) {
            want = true;
            if (t.strength < 0.02) {
              t.s = hit.s;
              const [x, y] = strand.at(hit.s);
              t.tip = [x, y];
            }
            t.want = hit.s;
            // Where it reaches for: the pointer, unless cyan has a loop to
            // tie or magenta something to go and look at.
            let aim: Pt = [pointer.x, pointer.y];
            const tying = hue === "c" && loops.find((l) => l.el === hovered && l.state !== "untying");
            if (tying) aim = tying.head;
            else if (hue === "m" && hoverBox) aim = [(hoverBox.l + hoverBox.r) / 2, hoverBox.b + 16];
            const [ax, ay] = strand.at(t.s);
            const dx = aim[0] - ax;
            const dy = aim[1] - ay;
            const d = Math.hypot(dx, dy) || 1;
            const far = Math.min(1, cfg.reach / d);
            t.aim = [ax + dx * far, ay + dy * far];
          }
        }
        t.busy = want;
        const target = want ? 1 : 0;
        t.strength += (target - t.strength) * (1 - Math.pow(1 - (want ? 0.08 : 0.05), dt / 16));
        if (t.strength < 0.01) {
          t.strength = 0;
          continue;
        }
        // Slides along the thread toward the pointer, each at its own pace.
        t.s += (t.want - t.s) * (1 - Math.pow(1 - cfg.slide * 16, dt / 16));
        const k = 1 - Math.pow(1 - cfg.rate * 16, dt / 16);
        t.tip[0] += (t.aim[0] - t.tip[0]) * k;
        t.tip[1] += (t.aim[1] - t.tip[1]) * k;
        t.phase += dt * (hue === "c" ? 0.009 : 0.0025);
        draw = true;
        // Dust comes off where the pointer moves along it.
        if (pointer.speed > 0.25 && !idle && rand() < 0.35 * t.strength) {
          const [x, y] = strand!.at(t.s);
          dust(x, y, hue, 1, 0.7);
        }
      }
    }

    /* Loops tie and untie. */
    for (const loop of loops) {
      if (loop.state === "tying") {
        loop.progress = Math.min(loop.total, loop.progress + 2.2 * dt);
        if (loop.progress >= loop.total) loop.state = "held";
      } else if (loop.state === "held") {
        if (now >= loop.holdUntil) loop.state = "untying";
      } else {
        loop.progress -= 3.2 * dt;
      }
    }
    loops = loops.filter((loop) => loop.progress > 0);
    if (loops.length) draw = true;

    /* Motes fall. */
    if (motes.length) {
      draw = true;
      for (const m of motes) {
        m.age += dt;
        m.vy += 0.00011 * dt;
        m.vx *= Math.pow(0.996, dt);
        m.x += m.vx * dt + Math.sin((m.age + m.size * 100) / 180) * 0.05;
        m.y += m.vy * dt;
      }
      motes = motes.filter((m) => m.age < m.life);
    }

    /* Plucks ring down. */
    if (plucks.length) {
      draw = true;
      for (const p of plucks) p.age += dt;
      plucks = plucks.filter((p) => p.age < 950);
    }

    /* Runners run. */
    if (runners.length) {
      draw = true;
      for (const r of runners) {
        r.age += dt;
        if (r.age < 0) continue;
        r.s += r.v * dt;
      }
      runners = runners.filter((r) => (r.v > 0 ? r.s < r.to : r.s > r.to));
    }

    /* Draw. */
    if (draw) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, pageLeft * dpr, pageTop * dpr);
      paintAll();
      canvasDirty = true;
    } else if (canvasDirty) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvasDirty = false;
    }

    if (alive()) frame = requestAnimationFrame(tick);
    else last = 0;
  }

  function paintAll() {
    if (!pats) return;
    const reach = loom.reach();

    for (const hue of ["c", "m"] as Hue[]) {
      const t = tendrils[hue];
      const strand = strands[hue];
      if (!strand || t.strength <= 0) continue;
      const [ax, ay, nx, ny] = strand.at(t.s);
      const tx = -ny;
      const ty = nx;
      const dx = t.tip[0] - ax;
      const dy = t.tip[1] - ay;
      const len = Math.hypot(dx, dy);
      if (len < 6) continue;
      const sign = dx * tx + dy * ty >= 0 ? 1 : -1;
      const lift = Math.min(46, len * 0.45) * sign;
      const c1: Pt = [ax + tx * lift, ay + ty * lift];
      const sag = hue === "m" ? Math.min(30, len * 0.25) : 0;
      const c2: Pt = [t.tip[0] - dx * 0.3, t.tip[1] - dy * 0.3 + sag];
      const pts = cubic([ax, ay], c1, c2, t.tip, 22);
      if (hue === "c") {
        // The curl at its tip, flung and re-flung while it waits.
        const r = 4 + 3 * Math.sin(t.phase * 0.7);
        for (let k = 1; k <= 14; k++) {
          const a = t.phase + (k / 14) * Math.PI * 2;
          pts.push([t.tip[0] + Math.cos(a) * r - r, t.tip[1] + Math.sin(a) * r * 0.8]);
        }
      }
      const path = new Path(pts, 3);
      halo(path, 0, path.length, hue, t.strength);
      const marks = thread(path, {
        hue,
        w: TEND[hue].w,
        seed: TEND[hue].seed,
        glow: 0,
        wobble: 0.6,
        alpha: 0.95 * t.strength,
      });
      for (const m of marks) if (m.kind !== Kind.Glow) paint(ctx, m, pats);
      spark(t.tip[0], t.tip[1], hue, 0.9 * t.strength, 8);
    }

    for (const loop of loops) {
      const hue = loop.marks[0]?.hue ?? "c";
      halo(loop.path, 0, Math.min(loop.progress, loop.total), hue, 0.8);
      for (const m of loop.marks) {
        if (m.key > loop.progress) break;
        paint(ctx, m, pats);
      }
      // The hand, where the loop is being tied or untied.
      if (loop.state !== "held") {
        let head: Pt | null = null;
        for (const m of loop.marks) {
          if (m.key > loop.progress) break;
          if (m.kind === Kind.Stroke) head = [m.pts[m.pts.length - 2], m.pts[m.pts.length - 1]];
        }
        if (head) {
          loop.head = head;
          spark(head[0], head[1], loop.marks[0]?.hue ?? "c", 0.8, 6);
        }
      }
    }

    for (const p of plucks) {
      const strand = strands[p.hue];
      if (!strand) continue;
      const half = 84;
      const decay = Math.exp(-p.age / 300);
      const swing = Math.sin(p.age / 52) * p.amp * decay;
      ctx.beginPath();
      for (let u = -1; u <= 1.0001; u += 0.08) {
        const [x, y, nx, ny] = strand.at(p.s + u * half);
        const d = swing * Math.cos((u * Math.PI) / 2);
        const px = x + nx * d;
        const py = y + ny * d;
        if (u === -1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.22 * decay;
      ctx.lineWidth = 14;
      ctx.strokeStyle = `rgb(${RGB[p.hue].join(" ")})`;
      ctx.stroke();
      ctx.globalAlpha = 0.7 * decay;
      ctx.lineWidth = 5;
      ctx.strokeStyle = pats[p.hue];
      ctx.stroke();
      ctx.globalAlpha = 0.95 * decay;
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = `rgb(${RGB[p.hue === "c" ? "cl" : "ml"].join(" ")})`;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const r of runners) {
      if (r.age < 0) continue;
      const strand = strands[r.hue];
      if (!strand) continue;
      const trail = 64 * Math.sign(r.v);
      const rgb = RGB[r.hue === "c" ? "cl" : "ml"].join(" ");
      ctx.lineCap = "round";
      ctx.lineWidth = 2.6;
      for (let k = 0; k < 6; k++) {
        const s0 = r.s - (trail * k) / 6;
        const s1 = r.s - (trail * (k + 1)) / 6;
        if (!strand.drawnAt(s0, reach)) continue;
        const [x0, y0] = strand.at(s0);
        const [x1, y1] = strand.at(s1);
        ctx.globalAlpha = 0.85 * (1 - k / 6);
        ctx.strokeStyle = `rgb(${rgb})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      const [x, y] = strand.at(r.s);
      spark(x, y, r.hue, 1, 11);
      ctx.globalAlpha = 1;
    }

    for (const m of motes) {
      const life = 1 - m.age / m.life;
      ctx.globalAlpha = Math.min(1, life * 1.6) * 0.85;
      ctx.fillStyle = `rgb(${RGB[m.pale ? (m.hue === "c" ? "cl" : "ml") : m.hue].join(" ")})`;
      ctx.fillRect(m.x, m.y, m.size, m.size);
    }
    ctx.globalAlpha = 1;
  }

  /** The soft light a thread gives off: two wide faint passes under it. */
  function halo(path: Path, from: number, to: number, hue: Hue, alpha: number) {
    if (to - from < 4) return;
    ctx.beginPath();
    for (let s = from; s <= to; s += 6) {
      const [x, y] = path.at(s);
      if (s === from) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const [ex, ey] = path.at(to);
    ctx.lineTo(ex, ey);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgb(${RGB[hue].join(" ")})`;
    ctx.globalAlpha = 0.11 * alpha;
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.globalAlpha = 0.18 * alpha;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** A point of light: the bright heart of a thread. */
  function spark(x: number, y: number, hue: Hue, alpha: number, r: number) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r);
    const [cr, cg, cb] = RGB[hue];
    const [lr, lg, lb] = RGB[hue === "c" ? "cl" : "ml"];
    halo.addColorStop(0, `rgba(${lr},${lg},${lb},${alpha})`);
    halo.addColorStop(0.35, `rgba(${cr},${cg},${cb},${alpha * 0.55})`);
    halo.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
      // Too quick: both shy off the page for a moment.
      if (pointer.speed > 2.4) pointer.shy = now + 420;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.at = now;
    pointer.here = true;
    sync();
    const reach = loom.reach();
    // A finger along the thread sends light running down it.
    for (const hue of ["c", "m"] as Hue[]) {
      const strand = strands[hue];
      if (!strand || now - touched[hue] < 1100) continue;
      const hit = strand.nearest(x, y, 11, reach);
      if (hit) {
        touched[hue] = now;
        run(hue, hit.s, true);
      }
    }
    // Brushing the cord a row hangs from.
    for (const row of rows) {
      if (Math.abs(y - row.y) < 9 && x > row.l - 24 && x < row.r + 24 && pointer.speed > 0.05) {
        ripple(row, x, pointer.vx >= 0 ? 1 : -1, now);
      }
    }
    wake();
  }

  function onOver(event: PointerEvent) {
    if (!fine) return;
    const target = (event.target as Element).closest(HOVER);
    if (!target || !page.contains(target)) return;
    if (target.hasAttribute("data-reveal") && !target.hasAttribute("data-lit")) return;
    enter(target);
  }

  function onOut(event: PointerEvent) {
    if (!hovered) return;
    const to = event.relatedTarget as Node | null;
    if (to && hovered.contains(to)) return;
    if ((event.target as Element).closest(HOVER) !== hovered) return;
    leave();
  }

  function onDown(event: PointerEvent) {
    lastInput = performance.now();
    measure();
    const x = event.clientX - pageLeft;
    const y = event.clientY - pageTop;
    sync();
    const target = event.target as Element;
    const cord = target.closest<HTMLElement>(".hion-pullcord, .hion-charm, .hion-pull, .hion-tag, .hion-end");
    if (cord) {
      // Tugging a cord shakes dust off its knot.
      const b = cord.getBoundingClientRect();
      const hue: Hue = cord.dataset.hue === "m" ? "m" : "c";
      const kx = cord.matches(".hion-pullcord") ? b.left - pageLeft + 6 : b.left - pageLeft + b.width / 2;
      const ky = cord.matches(".hion-pullcord") ? b.top - pageTop + b.height / 2 : b.top - pageTop;
      dust(kx, ky, hue, 9, 1.2);
      dust(kx, ky, hue === "c" ? "m" : "c", 4, 1.2);
      wake();
      return;
    }
    if (target.closest("a, button, input, textarea, select")) return;
    if (pluckAt(x, y)) wake();
  }

  function onScroll() {
    const now = performance.now();
    lastInput = now;
    const dy = scrollY - lastScroll;
    lastScroll = scrollY;
    swayV += Math.max(-0.22, Math.min(0.22, dy * 0.0007));
    if (hovered) leave();
    wake();
  }

  function onLeave() {
    pointer.here = false;
    leave();
    wake();
  }

  options.onIdleChange((idle) => {
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
      size();
      measure();
      sync();
      addEventListener("pointermove", onMove, { passive: true, signal });
      addEventListener("pointerdown", onDown, { passive: true, signal });
      world.addEventListener("pointerover", onOver, { signal });
      world.addEventListener("pointerout", onOut, { signal });
      document.addEventListener("pointerleave", onLeave, { signal });
      addEventListener("scroll", onScroll, { passive: true, signal });
      addEventListener("resize", () => { size(); wake(); }, { signal });
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
        cancelAnimationFrame(frame);
        frame = 0;
        layer.remove();
        world.style.removeProperty("--hion-sway");
      });
      wake();
    },
    /** The page is leaving: everything alive lets go. */
    release() {
      layer.dataset.state = "leaving";
      leave();
    },
  };
}
