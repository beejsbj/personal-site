/** The cloth: a living weave under the two hions.
 *
 * Behind every screen lies a cloth of taut thread, and it is alive
 * (fate.ts): every thread grows only from its front. A weft shuttle floats
 * across the warp, turns at the selvedge and packs the next row; a stalled
 * front throws a thread of the other colour; finished pieces sit still a
 * while, then unpick from their oldest corner, and the thread is rewoven
 * somewhere else. So the page is mostly still, quiet ground, with a few
 * bright heads moving across it, each trailing a wake that fades back into
 * the cloth (strand.ts).
 *
 * The cloth is not laid square. It is seen through a flow map (flow.ts)
 * that gathers it where the two hions meet: beneath each section, where
 * they come together, the warps are drawn in to a waist, as if through a
 * hand, and between those meetings the wefts are drawn out toward the side
 * a hion runs down. At the top, the warps gather toward the place the
 * hions come down from. So long runs become long converging curves, and
 * the cloth leans toward the drawing.
 *
 * Content shapes it: words, pictures and anything you can press hold the
 * cells the map carries under them, so text always sits on black paper and
 * the cloth turns at it like a selvedge. The page's fabric (fabric.ts)
 * decides which thread lies on top where two cross. The cloth is sown band
 * by band just ahead of the hand drawing the hions (the loom's reach), and
 * a newly sown band is woven quickly for a moment, so the cloth grows in
 * after the drawing; scrolling moves it along faster. A tap on the paper
 * throws a shuttle there (on cloth, it plucks the thread, and the threads
 * woven with it unravel), and passing over a link throws one off it. A
 * screen seen close (`scale` 2) is the same weave magnified.
 *
 * Cheap on purpose: the rule only looks at thread ends, and skips any end
 * with nothing changed near it; painting, not weaving, is what costs, so
 * the heads are painted a couple of times a second however fast the cloth
 * is woven (and not while the page scrolls), on strips of the tiles in
 * view, and the ground is repainted every few generations only round what
 * changed, on page-space tiles that exist only near the viewport; all of
 * it slows once the reader has been still a while. The loop sleeps while
 * the prism holds the page still and while the tab is hidden; for a
 * reduced-motion visitor (or a still prism face) the cloth is woven out of
 * sight before it is shown, and never moves. */
import type { Fabric } from "./fabric";
import { Fate } from "./fate";
import { FlowMap, type FlowSpec, type Gather } from "./flow";
import type { createLoom } from "./loom";
import { patterns, type Patterns, type Pt, rng } from "./pastel";
import { LOOK, type Patch, Strands } from "./strand";

type Loom = ReturnType<typeof createLoom>;

interface ClothOptions {
  page: HTMLElement;
  loom: Loom;
  signal: AbortSignal;
  /** Weave out of sight at once and never move (reduced motion, a still face). */
  instant: boolean;
  /** How close the cloth is seen: 2 doubles the weave. */
  scale?: number;
  /** The page's weave: which thread lies on top where two cross. */
  fabric: Fabric;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

interface Tile {
  index: number;
  el: HTMLElement;
  /** The ground, repainted round what changes. */
  ctx: CanvasRenderingContext2D;
  /** The moving heads, redrawn each generation, in strips across the tile
   * (a generation re-sends only the strips a head is in, or was). */
  heads: Strip[];
  pats: Patterns;
  /** Its ground is still to be laid (new), or out of date (changed while
   * out of view). */
  stale: boolean;
}

interface Strip {
  /** made the first time a head is in it */
  ctx: CanvasRenderingContext2D | null;
  /** page px */
  top: number;
  bottom: number;
  /** has something on it */
  lit: boolean;
}

/** Generations woven a second, and how many times a second the heads are
 * painted (every painting costs; a generation alone hardly does); both
 * slow to RESTING of that once the reader has been still for STILL ms. */
const PACE = 4;
const PAINTS = 2.5;
const RESTING = 0.4;
const STILL = 4000;
/** How long after the last scroll the page counts as scrolling, ms. */
const SETTLED = 200;
/** Generations a newly sown band is woven quickly. */
const BURST = 24;
/** Generations between mendings of the ground. */
const MEND = 6;
/** Generations woven out of sight before the cloth is first shown (for a
 * still visitor: before it is shown at all). */
const WARM = 300;
const SETTLE = 320;
/** Rows sown together, just ahead of the hand. */
const BAND = 12;
/** Tile height, px (rounded to whole rows of the weave), and how many
 * strips of heads a tile has. */
const TILE = 512;
const STRIPS = 4;

export function createCloth(options: ClothOptions) {
  const { page, loom, signal, instant } = options;
  const scale = options.scale ?? 1;
  const layer = document.createElement("div");
  layer.className = "hion-cloth";
  layer.setAttribute("aria-hidden", "true");
  page.prepend(layer);

  let life = new Fate(1, 1);
  let map: FlowMap;
  let strands: Strands;
  let S = 16;
  let width = 0;
  let height = 0;
  let rowsPerTile = 32;
  let tileH = TILE;
  let stripH = TILE / STRIPS;
  let tileCount = 1;
  const tiles = new Map<number, Tile>();
  /** Cells changed since the ground was last mended (x + y * w). */
  let changed = new Int32Array(0);
  let changedMark = new Uint8Array(0);
  let changes = 0;
  /** Bands still to sow: the next one, and how many there are. */
  let sown = 0;
  let bands = 0;
  let frame = 0;
  let timer = 0;
  let last = 0;
  /** Generations owed: time passing, a band sown, a scroll. */
  let owed = 0;
  /** When the heads were last painted (frame time), and at which generation. */
  let painted = 0;
  let shown = -1;
  /** When the reader last moved (scrolled, pointed), frame time. */
  let stirred = performance.now();
  /** When the page last scrolled. */
  let scrolledAt = 0;
  /** The window's scroll, as of the last scroll event (reading it in a
   * frame would force a layout mid-scroll). */
  let scrolled = scrollY;
  let built = false;
  /** Where the screen starts on the page, measured when the cloth is built
   * (reading it every frame would force a layout mid-scroll). */
  let pageTop = 0;

  const narrow = () => width < 720;

  /* ---------- Reading the screen onto the cloth ---------- */

  /** Where the two hions cross, in page px, in order down the page. */
  function crossings(): Pt[] {
    const journeys = loom.journeys();
    const c = journeys.find((j) => j.hue === "c")?.points;
    const m = journeys.find((j) => j.hue === "m")?.points;
    if (!c || !m) return [];
    const G = 48;
    const grid = new Map<number, number[]>();
    for (let j = 1; j < m.length; j++) {
      const key = Math.floor(m[j][0] / G) * 100000 + Math.floor(m[j][1] / G);
      const bucket = grid.get(key);
      if (bucket) bucket.push(j);
      else grid.set(key, [j]);
    }
    const out: Pt[] = [];
    for (let i = 1; i < c.length; i++) {
      const [ax, ay] = c[i - 1];
      const [bx, by] = c[i];
      const key = Math.floor(bx / G) * 100000 + Math.floor(by / G);
      for (const k of [key, key - 1, key + 1, key - 100000, key + 100000]) {
        for (const j of grid.get(k) ?? []) {
          const [cx, cy] = m[j - 1];
          const [dx, dy] = m[j];
          const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
          if (!den) continue;
          const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
          const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const p: Pt = [ax + (bx - ax) * t, ay + (by - ay) * t];
          // One per meeting: crossings close together are the same knot.
          if (out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > S * 6)) out.push(p);
        }
      }
    }
    return out.sort((a, b) => a[1] - b[1]);
  }

  /** Where a hion is at a page height, and how far out to the side. */
  function sideAt(y: number): Pt | null {
    let best: Pt | null = null;
    for (const journey of loom.journeys()) {
      let near: Pt | null = null;
      for (const p of journey.points) if (!near || Math.abs(p[1] - y) < Math.abs(near[1] - y)) near = p;
      if (near && (!best || Math.abs(near[0] - width / 2) > Math.abs(best[0] - width / 2))) best = near;
    }
    return best;
  }

  /** The gathers: the warps drawn in to a waist where the hions come down
   * and wherever they meet again (beneath each section), and the wefts
   * drawn out, between meetings, toward the side a hion runs down. */
  function gathers(): Gather[] {
    const D = Math.PI / 180;
    const k = Math.min(1, life.w / 80);
    const waists: Pt[] = [];
    const top = 150;
    // Where they come down from: the first points of their journeys.
    const firsts = loom.journeys().map((j) => j.points[0]).filter(Boolean);
    if (firsts.length) {
      const x = firsts.reduce((a, p) => a + p[0], 0) / firsts.length;
      waists.push([x, top + S * 4]);
    }
    const apart = S * 34 * k + S * 6;
    for (const p of crossings()) {
      if (p[1] < top) continue;
      if (waists.every((q) => Math.abs(q[1] - p[1]) > apart)) waists.push(p);
    }
    waists.sort((a, b) => a[1] - b[1]);
    const out: Gather[] = waists.map(([x, y]) => ({
      x: x / S,
      y: y / S,
      ang: 90 * D,
      s: 0.8,
      la: 14 * k + 2,
      lc: 22 * k,
    }));
    // Between meetings (and on past the last), the wefts drawn out to a side.
    const marks = [...waists.map((p) => p[1]), height];
    for (let i = 0; i < marks.length - 1; i++) {
      const gap = marks[i + 1] - marks[i];
      if (gap < S * 24) continue;
      const y = (marks[i] + marks[i + 1]) / 2;
      const at = sideAt(y);
      const x = at ? Math.min(width * 0.92, Math.max(width * 0.08, at[0])) : i % 2 ? width * 0.08 : width * 0.92;
      out.push({ x: x / S, y: y / S, ang: 0, s: 0.75, la: 14 * k + 2, lc: 10 * k + 2 });
    }
    return out;
  }

  /** A flow map that does not fold: gathers too close together are eased
   * off until it holds. */
  function flow(): FlowMap {
    const spec: FlowSpec = { gathers: gathers(), sweep: 1.2 * Math.min(1, life.w / 80), wave: 80, seed: 3 };
    let fm = new FlowMap(life.w, life.h, S, spec);
    for (let tries = 0; fm.minDet < 0.12 && tries < 3; tries++) {
      for (const g of spec.gathers) g.s *= 0.75;
      fm = new FlowMap(life.w, life.h, S, spec);
    }
    fm.measure();
    return fm;
  }

  /** Words, pictures and anything you can press keep the paper clear: a
   * mask of the page (4px squares) with every one of them on it, and the
   * line at the top; then every cell the map carries onto it is held. */
  function holdContent() {
    const px = 4;
    const mw = Math.ceil(width / px);
    const mh = Math.ceil(height / px);
    const mask = new Uint8Array(mw * mh);
    const mark = (l: number, t: number, r: number, b: number, m: number) => {
      const x0 = Math.max(0, Math.floor((l - m) / px));
      const x1 = Math.min(mw - 1, Math.floor((r + m) / px));
      const y0 = Math.max(0, Math.floor((t - m) / px));
      const y1 = Math.min(mh - 1, Math.floor((b + m) / px));
      for (let y = y0; y <= y1; y++) mask.fill(1, y * mw + x0, y * mw + x1 + 1);
    };
    const p = page.getBoundingClientRect();
    const range = document.createRange();
    const margin = S * 0.4;
    for (const root of page.querySelectorAll(":scope > main, :scope > footer")) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.nodeValue?.trim()) continue;
        const el = node.parentElement;
        if (!el || el.closest(".hion-sr, [hidden]")) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width < 1 || r.height < 1) continue;
          mark(r.left - p.left, r.top - p.top, r.right - p.left, r.bottom - p.top, margin);
        }
      }
      for (const el of root.querySelectorAll("img, video, picture, svg, a, button, input")) {
        const r = el.getBoundingClientRect();
        if (r.width < 1) continue;
        mark(r.left - p.left, r.top - p.top, r.right - p.left, r.bottom - p.top, margin);
      }
    }
    range.detach();
    // The line at the top, and what hangs from it.
    mark(0, 0, width, 150, 0);
    map.cellsOn(mask, mw, mh, px, (x, y) => life.hold(x, y));
  }

  function build() {
    width = page.clientWidth;
    height = page.scrollHeight;
    scrolled = scrollY;
    pageTop = page.getBoundingClientRect().top + scrolled;
    S = Math.round((narrow() ? 13 : 16) * scale);
    life = new Fate(Math.ceil(width / S), Math.ceil(height / S));
    rowsPerTile = Math.max(1, Math.round(TILE / S));
    tileH = rowsPerTile * S;
    stripH = Math.ceil(tileH / STRIPS);
    tileCount = Math.ceil(life.h / rowsPerTile);
    layer.style.height = `${height}px`;
    changed = new Int32Array(life.w * life.h);
    changedMark = new Uint8Array(life.w * life.h);
    changes = 0;
    map = flow();
    // Measure where things will rest, not where they are swinging in from.
    page.classList.add("hion-measuring");
    holdContent();
    page.classList.remove("hion-measuring");
    // Fine thread, a little heavier seen close.
    strands = new Strands(life, map, options.fabric, { ...LOOK, weight: LOOK.weight * Math.sqrt(scale) });
    sown = 0;
    bands = Math.ceil(life.h / BAND);
    built = true;
  }

  /* ---------- Sowing ---------- */

  /** A cell changed outside a step (sown, thrown): mend round it. */
  function note(x: number, y: number) {
    if (x < 0 || y < 0 || x >= life.w || y >= life.h) return;
    const i = x + y * life.w;
    if (changedMark[i]) return;
    changedMark[i] = 1;
    changed[changes++] = i;
  }

  function noteBox(x0: number, y0: number, x1: number, y1: number) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) note(x, y);
  }

  /** Sow every band the hand is near (half a screen ahead of its reach).
   * True if any was sown. */
  function sowDue(reach: number) {
    const before = sown;
    while (sown < bands && sown * BAND * S <= reach + innerHeight * 0.5) {
      const y0 = sown * BAND;
      const y1 = Math.min(life.h - 1, y0 + BAND - 1);
      life.seed(rng(sown * 7919 + 4), y0, y1);
      noteBox(0, y0, life.w - 1, y1);
      sown++;
    }
    return sown > before;
  }

  /* ---------- Painting ---------- */

  /** Rows of squares from the top of the screen to its foot. */
  function view(): [number, number] {
    const top = scrolled - pageTop;
    return [Math.max(0, Math.floor(top / S) - 1), Math.min(life.h - 1, Math.ceil((top + innerHeight) / S) + 1)];
  }

  function makeTile(index: number): Tile {
    const el = document.createElement("div");
    el.className = "hion-cloth__tile";
    const h = Math.min(tileH, height - index * tileH);
    el.style.top = `${index * tileH}px`;
    el.style.height = `${h}px`;
    // Fine thread needs no more than one pixel per px, and phones pay for
    // every pixel (each generation re-sends the canvases it touched).
    const ctx = canvas(el, 0, h, index * tileH);
    const heads: Strip[] = [];
    for (let top = 0; top < h; top += stripH) {
      const sh = Math.min(stripH, h - top);
      heads.push({ ctx: null, top: index * tileH + top, bottom: index * tileH + top + sh, lit: false });
    }
    layer.append(el);
    return { index, el, ctx, heads, pats: patterns(ctx, 1), stale: true };
  }

  /** A canvas on a tile, `top` px down it, drawn on in page px. */
  function canvas(el: HTMLElement, top: number, height: number, tileTop: number) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(width);
    c.height = Math.ceil(height);
    c.style.top = `${top}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, -(tileTop + top));
    el.append(c);
    return ctx;
  }

  /** Keep tiles near the viewport; drop far ones. */
  function cull() {
    const top = scrolled - pageTop;
    const from = Math.max(0, Math.floor((top - innerHeight * 0.3) / tileH));
    const to = Math.min(tileCount - 1, Math.floor((top + innerHeight * 1.3) / tileH));
    for (const [index, tile] of tiles) {
      if (index < from - 1 || index > to + 1) {
        tile.el.remove();
        tiles.delete(index);
      }
    }
    for (let i = from; i <= to; i++) if (!tiles.has(i)) tiles.set(i, makeTile(i));
  }

  const rowsOf = (tile: Tile): [number, number] => [
    tile.index * rowsPerTile,
    Math.min(life.h - 1, (tile.index + 1) * rowsPerTile - 1),
  ];
  const meets = (tile: Tile, r0: number, r1: number) => {
    const [a, b] = rowsOf(tile);
    return a <= r1 && b >= r0;
  };

  /** Bring the ground up to date: mend what changed on the tiles in view
   * (a tile out of view that it touches is laid afresh when it comes into
   * view), and lay any new or stale tile in view. What changed is mended
   * only when `due`: while the cloth lives, every few generations (the
   * newest thread is drawn bright on the heads meanwhile, so the lag does
   * not show). */
  let mended = 0;
  function mend(due = true) {
    const [v0, v1] = view();
    if (changes && due) {
      mended = life.generation;
      let r0 = Infinity;
      let r1 = -Infinity;
      for (const tile of tiles.values()) {
        if (tile.stale || !meets(tile, v0, v1)) continue;
        const [a, b] = rowsOf(tile);
        r0 = Math.min(r0, a);
        r1 = Math.max(r1, b);
      }
      const patch: Patch | null = r1 >= r0 ? strands.patch(changed, changes, r0, r1) : null;
      if (patch) for (const tile of tiles.values()) if (!tile.stale && meets(tile, patch.r0, patch.r1)) strands.mend(tile.ctx, tile.pats, patch);
      // Tiles out of view that the changes reach go stale.
      for (const tile of tiles.values()) {
        if (tile.stale || meets(tile, v0, v1)) continue;
        const [a, b] = rowsOf(tile);
        for (let k = 0; k < changes; k++) {
          const y = (changed[k] / life.w) | 0;
          if (y >= a - 8 - map.maxDy && y <= b + 8 + map.maxDy) {
            tile.stale = true;
            break;
          }
        }
      }
      for (let k = 0; k < changes; k++) changedMark[changed[k]] = 0;
      changes = 0;
    }
    for (const tile of tiles.values()) {
      if (!tile.stale || !meets(tile, v0, v1)) continue;
      strands.full(tile.ctx, tile.pats, ...rowsOf(tile));
      tile.stale = false;
    }
  }

  /** Redraw the heads on the tiles in view, strip by strip. */
  function light() {
    const [v0, v1] = view();
    let r0 = Infinity;
    let r1 = -Infinity;
    for (const tile of tiles.values()) {
      if (!meets(tile, v0, v1)) continue;
      const [a, b] = rowsOf(tile);
      r0 = Math.min(r0, a);
      r1 = Math.max(r1, b);
    }
    const lit = r1 >= r0 ? strands.heads(r0, r1, stripOf) : null;
    for (const tile of tiles.values()) {
      const shown = meets(tile, v0, v1);
      tile.heads.forEach((strip, k) => {
        const on = shown ? lit?.get(tile.index * STRIPS + k) : undefined;
        if (!on && !strip.lit) return;
        const tileTop = tile.index * tileH;
        strip.ctx ??= canvas(tile.el, strip.top - tileTop, strip.bottom - strip.top, tileTop);
        strip.ctx.clearRect(0, strip.top, width, strip.bottom - strip.top);
        if (on) strands.light(strip.ctx, on);
        strip.lit = !!on;
      });
    }
  }

  /** Which strip of heads a page y is in: tile by tile, STRIPS a tile. */
  function stripOf(y: number) {
    const index = Math.floor(y / tileH);
    const k = Math.min(STRIPS - 1, Math.max(0, Math.floor((y - index * tileH) / stripH)));
    return index * STRIPS + k;
  }

  /* ---------- Time ---------- */

  const asleep = () => options.isIdle() || document.hidden;

  function step() {
    life.step();
    for (let k = 0; k < life.changes; k++) {
      const c = life.changed[k];
      if (changedMark[c]) continue;
      changedMark[c] = 1;
      changed[changes++] = c;
    }
  }

  function tick(now: number) {
    frame = 0;
    if (asleep() || busy || !built) return;
    const dt = Math.min(100, now - (last || now));
    last = now;
    if (sowDue(loom.reach())) owed += BURST;
    const rest = now - stirred > STILL ? RESTING : 1;
    const pace = PACE * rest;
    owed = Math.min(BURST * 2, owed + (dt / 1000) * pace);
    // Weave what is owed, a few milliseconds of it a frame.
    const end = performance.now() + 4;
    while (owed >= 1 && performance.now() < end) {
      step();
      owed -= 1;
    }
    // Paint at most PAINTS times a second, however many were woven: a burst
    // shows as heads running, not as more painting. Not while the page is
    // scrolling (only tiles coming into view are laid then).
    const every = 1000 / (PAINTS * rest) - 20;
    const scrolling = now - scrolledAt < SETTLED;
    const due = life.generation !== shown && now - painted >= every && !scrolling;
    mend(due && life.generation - mended >= MEND);
    if (due) {
      light();
      painted = now;
      shown = life.generation;
    }
    const wait =
      owed >= 1
        ? 0
        : life.generation !== shown
          ? Math.max(painted + every, scrolledAt + SETTLED) - now
          : ((1 - owed) / pace) * 1000;
    if (wait < 24) frame = requestAnimationFrame(tick);
    else
      timer = window.setTimeout(() => {
        timer = 0;
        frame = requestAnimationFrame(tick);
      }, wait - 8);
  }

  /** Run the loop now (something to lay, or a generation owed). */
  function wake() {
    if (instant || frame || asleep() || !built || busy) return;
    clearTimeout(timer);
    timer = 0;
    frame = requestAnimationFrame(tick);
  }

  function onScroll() {
    const dy = Math.abs(scrollY - scrolled);
    scrolled = scrollY;
    if (!built || busy) return;
    cull();
    if (instant) {
      mend();
      return;
    }
    // Reading moves the cloth along.
    stirred = scrolledAt = performance.now();
    owed = Math.min(BURST * 2, owed + dy / (S * 30));
    wake();
  }

  /** The colour you throw: the hion you tap nearest; away from both, the
   * side of the page (cyan left, magenta right). */
  function hueNear(px: number, py: number): 1 | 2 {
    let best = 160 * 160;
    let found: 1 | 2 | undefined;
    for (const journey of loom.journeys()) {
      const pts = journey.points;
      for (let i = 0; i < pts.length; i += 3) {
        const dx = pts[i][0] - px;
        const dy = pts[i][1] - py;
        const d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          found = journey.hue === "c" ? 1 : 2;
        }
      }
    }
    return found ?? (px < width / 2 ? 1 : 2);
  }

  /** Throw a shuttle at a page point (or, on cloth, pluck it). */
  function throwAt(px: number, py: number, hue: 1 | 2) {
    const [x, y] = map.nearest(px, py);
    life.tap(x, y, hue);
    noteBox(Math.max(0, x - 8), Math.max(0, y - 4), Math.min(life.w - 1, x + 8), Math.min(life.h - 1, y + 4));
    owed = Math.max(owed, 1);
    stirred = performance.now();
    wake();
  }

  function onDown(event: PointerEvent) {
    if (!built || busy || event.button > 0) return;
    const target = event.target as Element;
    if (target.closest("a, button, input, .hion-top")) return;
    const px = event.clientX;
    const py = event.clientY + scrollY - pageTop;
    if (py < 0 || py > height) return;
    throwAt(px, py, hueNear(px, py));
  }

  /** Passing over a link throws a shuttle off it, outward. */
  let lastThrow = 0;
  function onOver(event: PointerEvent) {
    if (!built || busy || event.pointerType !== "mouse") return;
    const link = (event.target as Element).closest?.("a");
    if (!link || !page.contains(link) || performance.now() - lastThrow < 900) return;
    const p = page.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    const right = (r.left + r.right) / 2 - p.left > width / 2;
    const huey = link.closest<HTMLElement>("[data-hue]")?.dataset.hue;
    const hue = huey === "m" ? 2 : huey === "c" ? 1 : right ? 2 : 1;
    throwAt(right ? r.right - p.left + S * 2 : r.left - p.left - S * 2, (r.top + r.bottom) / 2 - p.top, hue);
    lastThrow = performance.now();
  }

  let resizeTimer = 0;
  let seenWidth = 0;
  let seenHeight = 0;
  const observer = new ResizeObserver(() => {
    if (page.clientWidth === seenWidth && page.scrollHeight === seenHeight) return;
    clearTimeout(resizeTimer);
    // After the loom has re-composed the hions (it waits 140ms).
    resizeTimer = window.setTimeout(() => {
      seenWidth = page.clientWidth;
      seenHeight = page.scrollHeight;
      rebuild();
    }, 220);
  });

  /** Weave n generations out of sight, a few milliseconds at a time and
   * never while the prism holds the page still; then show it. A cloth
   * already showing stays until the new one is ready (a picture loading
   * changes the page's height, and the cloth must not blink). */
  let settling = 0;
  let busy = false;
  let settleTimer = 0;
  function settle(n: number, fade: boolean) {
    const mine = ++settling;
    busy = true;
    if (!tiles.size) layer.dataset.state = "settling";
    let waiting = false;
    const slice = () => {
      if (mine !== settling || signal.aborted) return;
      if (options.isIdle()) {
        if (!waiting) {
          waiting = true;
          options.onIdleChange((idle) => {
            if (idle || !waiting) return;
            waiting = false;
            slice();
          });
        }
        return;
      }
      const end = performance.now() + 6;
      while (n > 0 && performance.now() < end) {
        life.step();
        n--;
      }
      if (n > 0) {
        settleTimer = window.setTimeout(slice, 16);
        return;
      }
      settling++;
      busy = false;
      delete layer.dataset.state;
      // The old cloth goes as the new one is laid, in the same frame.
      for (let k = 0; k < changes; k++) changedMark[changed[k]] = 0;
      changes = 0;
      for (const tile of tiles.values()) tile.el.remove();
      tiles.clear();
      cull();
      mend();
      if (instant) return;
      light();
      if (fade) layer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease" });
      wake();
    };
    slice();
  }

  /** Start over on the new layout: sow what the hand has reached, and
   * weave it a while out of sight. */
  function rebuild() {
    build();
    sowDue(instant ? Infinity : loom.reach());
    settle(instant ? SETTLE : WARM, false);
  }

  return {
    start() {
      seenWidth = page.clientWidth;
      seenHeight = page.scrollHeight;
      build();
      observer.observe(page);
      addEventListener("scroll", onScroll, { passive: true, signal });
      addEventListener("resize", onScroll, { passive: true, signal });
      if (!instant) {
        page.addEventListener("pointerdown", onDown, { passive: true, signal });
        page.addEventListener("pointerover", onOver, { passive: true, signal });
        document.addEventListener("visibilitychange", wake, { signal });
        options.onIdleChange((idle) => {
          if (!idle) wake();
        });
      }
      signal.addEventListener("abort", () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        clearTimeout(settleTimer);
        clearTimeout(resizeTimer);
      });
      sowDue(instant ? Infinity : loom.reach());
      // Woven a while out of sight, a few milliseconds a frame, then faded
      // up with its heads already moving.
      settle(instant ? SETTLE : WARM, !instant);
    },
    /** Let the cloth go. Toward a point (page px): it magnifies round it,
     * as if you leant in to look at one thread. */
    release(toward?: Pt) {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      frame = timer = 0;
      built = false;
      settling++;
      const keyframes: Keyframe[] = toward
        ? [
            { transformOrigin: `${toward[0]}px ${toward[1]}px`, transform: "scale(1)", opacity: 1 },
            { transformOrigin: `${toward[0]}px ${toward[1]}px`, transform: "scale(2.4)", opacity: 0 },
          ]
        : [{ opacity: 1 }, { opacity: 0 }];
      layer.animate(keyframes, { duration: 420, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" });
    },
  };
}
