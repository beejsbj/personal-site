/** Life: how the two hions answer the visitor.
 *
 * (Threads from the pointer, and the loops tied round what you hover, are
 * strands like any other: skein.ts.)
 *
 * The loom lays the drawing down once and leaves it. What moves on it is
 * painted on the skein's live canvas (the one layer every moving thread
 * is on: plucks, runners and dust are an effect there, repainted only
 * where they are), and on the screen's one frame loop (pulse.ts), which
 * sleeps the moment nothing moves and never runs while the page is idle.
 * The glints riding the hions' circles are the compositor's (CSS
 * offset-path), not a frame loop's.
 *
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
 *             their own (a loop on the skein), or chase each other down
 *             the page. */
import { type Hue, Path, type Pt, RGB, rng } from "./pastel";
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

/* ---------- A drawn thread, searchable ---------- */

const CELL = 64;
/** Points further apart than this are either side of a gap in a thread. */
const GAP = 400;

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
      // A thread that leaves the page for a track (weave.ts `gap`) comes
      // back further down: nothing runs across the stretch between.
      const step = i ? Math.hypot(this.xs[i] - this.xs[i - 1], this.ys[i] - this.ys[i - 1]) : 0;
      this.ls[i] = i ? this.ls[i - 1] + (step > GAP ? 0 : step) : 0;
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
  let motes: Mote[] = [];
  let plucks: Pluck[] = [];
  let runners: Runner[] = [];
  const touched: Record<Hue, number> = { c: 0, m: 0 };

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
    plucks.push({ hue: best.hue, s: best.s, age: 0 });
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
        if (skein.knot(hue, x, y, 9 + i * 3, 1500 + i * 500)) any = true;
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

  /* ---------- On the live canvas: plucks, runners, dust ---------- */

  skein.effect({
    step(_now, dt) {
      dt = Math.min(48, dt);
      for (const m of motes) {
        m.age += dt;
        m.vy += 0.00011 * dt;
        m.vx *= Math.pow(0.996, dt);
        m.x += m.vx * dt + Math.sin((m.age + m.size * 100) / 180) * 0.05;
        m.y += m.vy * dt;
      }
      motes = motes.filter((m) => m.age < m.life);
      for (const p of plucks) p.age += dt;
      plucks = plucks.filter((p) => p.age < 950);
      for (const r of runners) {
        r.age += dt;
        if (r.age >= 0) r.s += r.v * dt;
      }
      runners = runners.filter((r) => (r.v > 0 ? r.s < r.to : r.s > r.to));
      return motes.length + plucks.length + runners.length > 0;
    },
    boxes() {
      const out: { l: number; t: number; r: number; b: number }[] = [];
      const along = (hue: Hue, s0: number, s1: number, pad: number) => {
        const strand = strands[hue];
        if (!strand) return;
        let l = Infinity;
        let t = Infinity;
        let r = -Infinity;
        let b = -Infinity;
        for (let s = Math.min(s0, s1); s <= Math.max(s0, s1) + 6; s += 6) {
          const [x, y] = strand.at(s);
          l = Math.min(l, x);
          r = Math.max(r, x);
          t = Math.min(t, y);
          b = Math.max(b, y);
        }
        if (l < Infinity) out.push({ l: l - pad, t: t - pad, r: r + pad, b: b + pad });
      };
      for (const p of plucks) along(p.hue, p.s - 90, p.s + 90, 10);
      for (const r of runners) if (r.age >= 0) along(r.hue, r.s - 64 * Math.sign(r.v), r.s, 13);
      if (motes.length) {
        let l = Infinity;
        let t = Infinity;
        let r = -Infinity;
        let b = -Infinity;
        for (const m of motes) {
          l = Math.min(l, m.x);
          r = Math.max(r, m.x + m.size);
          t = Math.min(t, m.y);
          b = Math.max(b, m.y + m.size);
        }
        out.push({ l: l - 2, t: t - 2, r: r + 2, b: b + 2 });
      }
      return out;
    },
    paint(ctx) {
      paintAll(ctx);
    },
  });

  function paintAll(ctx: CanvasRenderingContext2D) {
    const reach = loom.reach();
    for (const p of plucks) {
      const strand = strands[p.hue];
      if (!strand) continue;
      const half = 84;
      const decay = Math.exp(-p.age / 300);
      // It rings where it lies: a standing wave of light along the string
      // itself, its bright bellies breathing in and out. Nothing moves off
      // the thread, so no second copy of it shows.
      const breath = Math.abs(Math.sin(p.age / 52)) * decay;
      const core = `rgb(${RGB[p.hue === "c" ? "cl" : "ml"].join(" ")})`;
      const light = `rgb(${RGB[p.hue].join(" ")})`;
      ctx.lineCap = "round";
      const step = 0.05;
      for (let u = -1; u < 1; u += step) {
        // Two bellies either side of the pluck, fading toward the ends.
        const belly = Math.abs(Math.sin((u + 1) * Math.PI)) * Math.cos((u * Math.PI) / 2);
        const a = breath * belly;
        if (a < 0.03) continue;
        const [x0, y0] = strand.at(p.s + u * half);
        const [x1, y1] = strand.at(p.s + (u + step) * half);
        if (Math.abs(y1 - y0) + Math.abs(x1 - x0) > 60) continue;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.globalAlpha = 0.2 * a;
        ctx.lineWidth = 12;
        ctx.strokeStyle = light;
        ctx.stroke();
        ctx.globalAlpha = 0.85 * a;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = core;
        ctx.stroke();
      }
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
        if (Math.abs(y1 - y0) + Math.abs(x1 - x0) > 60) continue;
        ctx.globalAlpha = 0.85 * (1 - k / 6);
        ctx.strokeStyle = `rgb(${rgb})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      const [x, y] = strand.at(r.s);
      spark(ctx, x, y, r.hue, 1, 11);
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

  /** A point of light: the bright heart of a thread. */
  function spark(ctx: CanvasRenderingContext2D, x: number, y: number, hue: Hue, alpha: number, r: number) {
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
      addEventListener("pointerdown", onDown, { passive: true, signal });
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
