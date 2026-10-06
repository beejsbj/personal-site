/** The cloth: a living weave under the two hions.
 *
 * Behind every screen lies a cloth of thread crossings, and it is alive
 * (immigration.ts): cyan and magenta threads are born, live and die by the
 * Game of Life, and the cloth keeps reweaving itself into still knots,
 * breathing blinkers and gliders that tumble away across it. Every crossing
 * life passes through keeps a faint float of its colour (stitch.ts), so the
 * cloth records where life has been: busy places become woven ground, and
 * a glider leaves a woven trail. The two hions are its shuttles: where they
 * cross on their way down the page they sow it.
 *
 * Content shapes the cloth rather than sitting in boxes on it:
 *   - words, pictures and links hold their crossings empty, so text always
 *     sits on black paper;
 *   - the page's edges are selvages, living strips cyan-leaning on the left
 *     and magenta-leaning on the right, and the gaps between sections are
 *     sown too, each when the hions reach it;
 *   - a framed thing (`data-frame`) gets woven tape at two corners, like a
 *     mount, its pattern drawn from a signature (a project's slug), so each
 *     project has its own tape and its page shows the same tape magnified;
 *   - headings (`data-weft`) get tape along their weft, tied off in a knot:
 *     the cloth is densest where a section begins;
 *   - a click or tap on the paper sows a glider or a burst there, and
 *     passing over a link flings a glider off it.
 * Generations pass slowly with time, faster as you scroll: reading moves the
 * cloth along. A screen seen close (`scale` 2: a project, a lab entry) is
 * the same weave magnified, each thread showing its two plies, and following
 * a project out of a list magnifies the cloth round the link on the way.
 *
 * Cheap on purpose: the life is a coarse grid in typed arrays; only the
 * chunks that changed, near the viewport, are repainted, onto page-space
 * tiles that exist only near the viewport; the woven ground has a canvas of
 * its own that is only ever added to. The loop sleeps while the prism holds
 * the page still, while the tab is hidden, and once nothing is moving; for a
 * reduced-motion visitor (or a still prism face) the cloth is settled out of
 * sight before it is shown, and never moves. */
import { Immigration, orient, PATTERNS, type Pattern, type PatternName, size as sizeOf, type Species, stamp } from "./immigration";
import type { createLoom } from "./loom";
import { rng, type Pt } from "./pastel";
import { drape, type Drape, GLOW, paintGround, paintRegion, stitches, type Stitches } from "./stitch";

type Loom = ReturnType<typeof createLoom>;

interface ClothOptions {
  page: HTMLElement;
  loom: Loom;
  signal: AbortSignal;
  /** Settle at once and never move (reduced motion, a still face). */
  instant: boolean;
  /** How close the cloth is seen: 2 doubles the weave. */
  scale?: number;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

interface Tile {
  index: number;
  el: HTMLElement;
  /** The live threads, repainted in chunks as they change. */
  ctx: CanvasRenderingContext2D;
  /** Their light, at quarter resolution. */
  gctx: CanvasRenderingContext2D;
  /** The woven ground, only ever added to. */
  wctx: CanvasRenderingContext2D;
  /** The next row of crossings whose ground is still to be laid on this
   * tile (a new tile lays it a few rows a frame). */
  groundRow: number;
}

interface Sow {
  /** Reveal key (page y): sown when the hand drawing the hions gets here. */
  key: number;
  run(): void;
}

/** Chunks of crossings repainted together. */
const CHUNK = 8;
/** Generations a second while you read, and once only blinkers are left. */
const PACE = 4;
const RESTING = 1.4;
/** Still knots a frame is made of. */
const KNOTS: PatternName[] = ["beehive", "block", "loaf", "boat", "tub", "ship", "pond"];

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function createCloth(options: ClothOptions) {
  const { page, loom, signal, instant } = options;
  const layer = document.createElement("div");
  layer.className = "hion-cloth";
  layer.setAttribute("aria-hidden", "true");
  page.prepend(layer);

  let life = new Immigration(1, 1);
  let st: Stitches;
  let hang: Drape;
  let S = 16;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let tileRows = 1;
  let tileH = 1024;
  const tiles = new Map<number, Tile>();
  /** Dirty chunks, as cx + cy * chunksAcross. */
  const dirty = new Set<number>();
  let across = 1;
  let sows: Sow[] = [];
  let sown = 0;
  let frame = 0;
  let timer = 0;
  let last = 0;
  let budget = 0;
  let lastScroll = scrollY;
  let built = false;
  let hue: Species = 1;

  /** Where the screen starts on the page, measured when the cloth is built
   * (reading it every frame would force a layout mid-scroll). */
  let pageTop = 0;

  /* ---------- Reading the screen onto the cloth ---------- */

  function box(el: Element) {
    const p = page.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top };
  }

  /** Hold the crossings under a page rectangle (px), with a margin. */
  function holdPx(l: number, t: number, r: number, b: number, mx: number, my: number) {
    life.hold(
      Math.floor((l - mx) / S),
      Math.floor((t - my) / S),
      Math.floor((r + mx) / S),
      Math.floor((b + my) / S),
    );
  }

  /** Words, pictures and anything you can press keep the paper clear. */
  function holdContent() {
    const p = page.getBoundingClientRect();
    const range = document.createRange();
    for (const root of page.querySelectorAll(":scope > main, :scope > footer")) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.nodeValue?.trim()) continue;
        const el = node.parentElement;
        if (!el || el.closest(".hion-sr, [hidden]")) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width < 1 || r.height < 1) continue;
          holdPx(r.left - p.left, r.top - p.top, r.right - p.left, r.bottom - p.top, S * 0.7, S * 0.4);
        }
      }
      for (const el of root.querySelectorAll("img, video, picture, svg, a, button, input")) {
        const b = box(el);
        if (b.r - b.l < 1) continue;
        holdPx(b.l, b.t, b.r, b.b, S * 0.5, S * 0.5);
      }
    }
    range.detach();
    // The line at the top, and what hangs from it.
    holdPx(0, 0, width, 150, 0, 0);
  }

  /** Is a pattern free to lay here: none of it held, nothing alive within
   * two crossings of it (so still knots stay still). */
  function free(pattern: Pattern, x: number, y: number) {
    const { w, h } = sizeOf(pattern);
    if (x < 0 || y < 0 || x + w > life.w || y + h > life.h) return false;
    for (let yy = y - 2; yy < y + h + 2; yy++) {
      for (let xx = x - 2; xx < x + w + 2; xx++) {
        if (life.at(xx, yy)) return false;
      }
    }
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (pattern[dy][dx] !== "." && life.isHeld(x + dx, y + dy)) return false;
      }
    }
    return true;
  }

  /** Crossings still to be woven by hand, a few each frame: the shuttle
   * at work. Each is x, y, bits. */
  let shuttle: number[] = [];
  let shuttleAt = 0;

  /** Woven tape at two corners of a box, like the corners of a mount: its
   * pattern of cyan, magenta and both drawn from a signature (a project's
   * slug), so each thing has its own tape, and a still knot tied where
   * each tape turns. */
  function frameOf(el: HTMLElement): Sow {
    const b = box(el);
    const signature = hash(el.dataset.frame || el.textContent || "");
    const rand = rng(signature);
    // The tape's repeat: 4 to 7 crossings of 1 (cyan), 2 (magenta), 3 (both).
    const repeat = Array.from({ length: 4 + Math.floor(rand() * 4) }, () => 1 + Math.floor(rand() * 3));
    const knot = KNOTS[Math.floor(rand() * KNOTS.length)];
    const x0 = Math.floor(b.l / S) - 2;
    const x1 = Math.ceil(b.r / S) + 1;
    const y0 = Math.floor(b.t / S) - 2;
    const y1 = Math.ceil(b.b / S) + 1;
    const arm = Math.max(3, Math.min(9, Math.round(Math.min(x1 - x0, y1 - y0) * 0.35)));
    // Which pair of corners: also the signature's.
    const flip = rand() < 0.5;
    return {
      key: b.t - 40,
      run() {
        const corners: [Pt, number, number][] = flip
          ? [
              [[x1, y0], -1, 1],
              [[x0, y1], 1, -1],
            ]
          : [
              [[x0, y0], 1, 1],
              [[x1, y1], -1, -1],
            ];
        for (const [[cx, cy], dx, dy] of corners) {
          // Out along the row, then the column: the order it is woven.
          const path: Pt[] = [];
          for (let k = arm; k > 0; k--) path.push([cx + dx * k, cy]);
          path.push([cx, cy]);
          for (let k = 1; k <= arm; k++) path.push([cx, cy + dy * k]);
          path.forEach(([x, y], i) => {
            const bits = repeat[i % repeat.length];
            // Two picks: the second, just outside, the first's mirror.
            const ox = i >= arm ? -dx : 0;
            const oy = i <= arm ? -dy : 0;
            shuttle.push(x, y, bits, x + ox, y + oy, bits === 3 ? 3 : 3 - bits);
          });
          const pattern = PATTERNS[knot];
          const { w, h } = sizeOf(pattern);
          const kx = dx > 0 ? cx - w - 2 : cx + 3;
          const ky = dy > 0 ? cy - h - 2 : cy + 3;
          if (free(pattern, kx, ky)) stamp(life, pattern, kx, ky, dx > 0 ? 1 : 2);
        }
      },
    };
  }

  /** The selvages: the cloth's own edges, either side of the words, where
   * life runs free. Cyan leans in from the left and magenta from the right,
   * as they run down either side of a section; they meet in the middle. */
  function selvages(): Sow[] {
    const out: Sow[] = [];
    const top = Math.ceil(170 / S);
    const soup = (x0: number, x1: number, y0: number, y1: number, lean: Species, seed: number): Sow => {
      const rand = rng(seed);
      return {
        key: y0 * S,
        run() {
          for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
              if (rand() < 0.28) life.set(x, y, rand() < 0.72 ? lean : lean === 1 ? 2 : 1);
            }
          }
        },
      };
    };
    // Down the edges, a band at a time (wide pages only).
    const BAND = Math.ceil(420 / S);
    let left = new Int32Array(0);
    let right = new Int32Array(0);
    if (!narrow()) {
      left = new Int32Array(life.h);
      right = new Int32Array(life.h);
      for (let y0 = top, band = 0; y0 < life.h - 4; y0 += BAND, band++) {
        const y1 = Math.min(life.h, y0 + BAND - 2);
        // Columns in from each edge with nothing held in this band.
        const clear = (x: number) => {
          for (let y = y0; y < y1; y++) if (life.isHeld(x, y)) return false;
          return true;
        };
        let l = 0;
        while (l < life.w / 3 && clear(l)) l++;
        let r = 0;
        while (r < life.w / 3 && clear(life.w - 1 - r)) r++;
        // Keep a crossing of black paper between a strip and the words.
        if (l >= 7) out.push(soup(Math.max(0, l - 19), l - 2, y0, y1 - 1, 1, band * 131 + 1));
        if (r >= 7) out.push(soup(life.w - r + 1, Math.min(life.w - 1, life.w - r + 18), y0, y1 - 1, 2, band * 131 + 7908));
        for (let y = y0; y < y0 + BAND && y < life.h; y++) {
          left[y] = l >= 7 ? l : 0;
          right[y] = r >= 7 ? r : 0;
        }
      }
    }
    // Across the gaps between sections: rows with nothing held between the
    // strips, six or more of them together. The cloth runs through.
    const rowClear = (y: number) => {
      const x0 = (left[y] ?? 0) + 1;
      const x1 = life.w - (right[y] ?? 0) - 2;
      for (let x = x0; x <= x1; x++) if (life.isHeld(x, y)) return false;
      return true;
    };
    let run = 0;
    for (let y = top; y <= life.h; y++) {
      if (y < life.h && rowClear(y)) {
        run++;
        continue;
      }
      if (run >= 6) {
        const y0 = y - run + 1;
        const y1 = y - 2;
        const x0 = (left[y0] ?? 0) + 2;
        const x1 = life.w - (right[y0] ?? 0) - 3;
        out.push(soup(x0, x1, y0, y1, y0 % 2 ? 1 : 2, y0 * 977 + 3));
      }
      run = 0;
    }
    return out;
  }

  /** A tape along a heading's weft, out from its words both ways, ending in
   * a knot: the cloth is densest where a section begins. */
  function bandOf(el: HTMLElement): Sow {
    const b = box(el);
    const rand = rng(hash(el.textContent || "") + 5);
    const y = Math.round((b.t + Math.min(b.b, b.t + 60)) / 2 / S) - 1;
    const reach = Math.round((narrow() ? 3 : 8) + rand() * 5);
    const repeat = Array.from({ length: 4 + Math.floor(rand() * 3) }, () => 1 + Math.floor(rand() * 3));
    return {
      key: b.t - 20,
      run() {
        for (const dir of [-1, 1]) {
          const from = Math.floor((dir < 0 ? b.l : b.r) / S) + dir * 2;
          let x = from;
          for (let k = 0; k < reach && x > 0 && x < life.w - 1; k++, x += dir) {
            const bits = repeat[k % repeat.length];
            shuttle.push(x, y, bits, x, y + 1, 3 - (bits === 3 ? 0 : bits));
          }
          const pattern = orient(PATTERNS[KNOTS[Math.floor(rand() * KNOTS.length)]], Math.floor(rand() * 4));
          const { w, h } = sizeOf(pattern);
          const at = dir < 0 ? x - w - 1 : x + 2;
          if (free(pattern, at, y - Math.floor(h / 2))) stamp(life, pattern, at, y - Math.floor(h / 2), rand() < 0.5 ? 1 : 2);
        }
      },
    };
  }

  /** Weave up to n crossings from the shuttle's queue. */
  function weaveSome(n: number) {
    let woven = 0;
    while (shuttleAt < shuttle.length && woven < n) {
      const x = shuttle[shuttleAt++];
      const y = shuttle[shuttleAt++];
      const bits = shuttle[shuttleAt++];
      if (life.weave(x, y, bits)) {
        groundAt(x, y);
        woven++;
      }
    }
    if (shuttleAt >= shuttle.length) shuttle = [];
    if (!shuttle.length) shuttleAt = 0;
  }

  const narrow = () => width < 720;

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

  /** What the hions sow where they cross. */
  function sowAt([px, py]: Pt, i: number): Sow {
    const rand = rng(i * 7919 + 13);
    const x = Math.round(px / S);
    const y = Math.round(py / S);
    const roll = rand();
    return {
      key: py,
      run() {
        // Mixed colours: whichever hion lies on top at each crossing.
        const mixed = (dx: number, dy: number): Species => (((dx + dy + i) & 1) ? 1 : 2);
        if (roll < 0.45) {
          // Gliders flung outward, away from the middle of the page.
          const right = px > width / 2;
          const pattern = orient(PATTERNS.glider, right ? 0 : 1);
          for (let k = 0; k < 2; k++) {
            const gx = x + (right ? 2 : -4) + (right ? k * 5 : -k * 5);
            const gy = y - 1 + k * 4;
            if (free(pattern, gx, gy)) stamp(life, pattern, gx, gy, k % 2 ? 1 : 2);
          }
        } else if (roll < 0.75) {
          const pattern = orient(PATTERNS[rand() < 0.5 ? "rPentomino" : "pi"], Math.floor(rand() * 4));
          if (free(pattern, x - 1, y - 1)) stamp(life, pattern, x - 1, y - 1, mixed);
        } else {
          const pattern = orient(PATTERNS[rand() < 0.5 ? "toad" : "blinker"], Math.floor(rand() * 2));
          if (free(pattern, x - 1, y)) stamp(life, pattern, x - 1, y, mixed);
        }
      },
    };
  }

  function build() {
    width = page.clientWidth;
    height = page.scrollHeight;
    pageTop = page.getBoundingClientRect().top + scrollY;
    S = Math.round((width < 720 ? 13 : 16) * (options.scale ?? 1));
    // Soft pastel needs no more than this, and phones pay for every pixel.
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    st = stitches(S, dpr);
    life = new Immigration(Math.ceil(width / S), Math.ceil(height / S));
    hang = drape(life.w, life.h, S, 11);
    across = Math.ceil(life.w / CHUNK);
    const chunkPx = CHUNK * S;
    tileH = chunkPx * Math.max(1, Math.round(1024 / chunkPx));
    tileRows = Math.ceil(height / tileH);
    layer.style.height = `${height}px`;
    for (const tile of tiles.values()) tile.el.remove();
    tiles.clear();
    dirty.clear();
    // Measure where things will rest, not where they are swinging in from.
    page.classList.add("hion-measuring");
    holdContent();
    const plan: Sow[] = [];
    for (const el of page.querySelectorAll<HTMLElement>("[data-frame]")) {
      if (el.getClientRects().length) plan.push(frameOf(el));
    }
    for (const el of page.querySelectorAll<HTMLElement>("[data-weft]")) {
      if (el.getClientRects().length) plan.push(bandOf(el));
    }
    page.classList.remove("hion-measuring");
    plan.push(...selvages());
    crossings().forEach((p, i) => plan.push(sowAt(p, i)));
    // Frames and bands before what is sown near them, so knots get their
    // places first.
    sows = plan.sort((a, b) => a.key - b.key);
    sown = 0;
    shuttle = [];
    shuttleAt = 0;
    built = true;
  }

  /* ---------- Painting ---------- */

  function makeTile(index: number): Tile {
    const el = document.createElement("div");
    el.className = "hion-cloth__tile";
    const h = Math.min(tileH, height - index * tileH);
    el.style.top = `${index * tileH}px`;
    el.style.height = `${h}px`;
    const canvas = (scale: number) => {
      const c = document.createElement("canvas");
      c.width = Math.ceil(width * scale);
      c.height = Math.ceil(h * scale);
      const ctx = c.getContext("2d")!;
      ctx.setTransform(scale, 0, 0, scale, 0, -index * tileH * scale);
      return { c, ctx };
    };
    const glow = canvas(GLOW);
    // The ground is faint texture: it needs less resolution than thread.
    const ground = canvas(Math.min(dpr, 1.25));
    const live = canvas(dpr);
    el.append(glow.c, ground.c, live.c);
    layer.append(el);
    // Its threads are laid a chunk at a time, nearest the reader first.
    const rows = tileH / S / CHUNK;
    for (let cy = index * rows; cy < (index + 1) * rows; cy++) {
      for (let cx = 0; cx < across; cx++) dirty.add(cx + cy * across);
    }
    const first = Math.max(0, (index * tileH) / S - 2);
    return { index, el, ctx: live.ctx, gctx: glow.ctx, wctx: ground.ctx, groundRow: first };
  }

  /** Lay the ground of a newly woven crossing on the tiles it shows on. */
  function groundAt(x: number, y: number) {
    const rowsPerTile = tileH / S;
    const t0 = Math.max(0, Math.floor((y - 2) / rowsPerTile));
    const t1 = Math.floor((y + 2) / rowsPerTile);
    for (let t = t0; t <= t1; t++) {
      const tile = tiles.get(t);
      // A tile still laying its ground will reach this row itself.
      if (tile && tile.groundRow > y) paintGround(tile.wctx, life, st, x, y, hang);
    }
  }

  /** Keep tiles near the viewport; drop far ones. */
  function cull() {
    const top = scrollY - pageTop;
    const from = Math.max(0, Math.floor((top - innerHeight * 0.5) / tileH));
    const to = Math.min(tileRows - 1, Math.floor((top + innerHeight * 1.6) / tileH));
    for (const [index, tile] of tiles) {
      if (index < from - 1 || index > to + 1) {
        tile.el.remove();
        tiles.delete(index);
      }
    }
    for (let i = from; i <= to; i++) if (!tiles.has(i)) tiles.set(i, makeTile(i));
  }

  /** Mark the chunks a changed crossing can show in. */
  function touch(x: number, y: number) {
    const cx0 = Math.max(0, Math.floor((x - 2) / CHUNK));
    const cx1 = Math.min(across - 1, Math.floor((x + 2) / CHUNK));
    const cy0 = Math.max(0, Math.floor((y - 2) / CHUNK));
    const cy1 = Math.floor((y + 2) / CHUNK);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) dirty.add(cx + cy * across);
  }

  function touchChanged() {
    const { changed, changes, w } = life;
    for (let k = 0; k < changes; k++) touch(changed[k] % w, Math.floor(changed[k] / w));
  }

  /** Mark every chunk (after sowing, which changes cells outside a step). */
  function touchAll(y0 = 0, y1 = life.h) {
    for (let cy = Math.floor(y0 / CHUNK); cy <= Math.floor(y1 / CHUNK); cy++) {
      for (let cx = 0; cx < across; cx++) dirty.add(cx + cy * across);
    }
  }

  /** Repaint what changed on the tiles that exist, nearest first. */
  function paint(deadline: number) {
    const rowsPerTile = tileH / S;
    for (const tile of tiles.values()) {
      const last = Math.min(life.h, (tile.index + 1) * rowsPerTile + 2);
      while (tile.groundRow < last) {
        const y = tile.groundRow++;
        for (let x = 0; x < life.w; x++) paintGround(tile.wctx, life, st, x, y, hang);
        if (performance.now() > deadline) return true;
      }
    }
    if (!dirty.size) return false;
    const chunksPerTile = rowsPerTile / CHUNK;
    // Only what is on screen, or about to be: the rest stays dirty until
    // you scroll to it. Nearest the middle of the screen first.
    const top = scrollY - pageTop;
    const px = CHUNK * S;
    const from = Math.floor((top - innerHeight * 0.3) / px);
    const to = Math.floor((top + innerHeight * 1.3) / px);
    const middle = Math.floor((top + innerHeight / 2) / px);
    const order = [...dirty]
      .filter((id) => {
        const cy = Math.floor(id / across);
        return cy >= from && cy <= to;
      })
      .sort((a, b) => Math.abs(Math.floor(a / across) - middle) - Math.abs(Math.floor(b / across) - middle));
    for (const id of order) {
      const cx = id % across;
      const cy = Math.floor(id / across);
      const tile = tiles.get(Math.floor(cy / chunksPerTile));
      dirty.delete(id);
      if (!tile) continue;
      paintRegion(
        tile.ctx,
        tile.gctx,
        life,
        st,
        cx * CHUNK,
        cy * CHUNK,
        Math.min(life.w, cx * CHUNK + CHUNK),
        Math.min(life.h, cy * CHUNK + CHUNK),
        hang,
      );
      if (performance.now() > deadline) return true;
    }
    return false;
  }

  /* ---------- Time ---------- */

  function sowDue(reach: number) {
    let any = false;
    while (sown < sows.length && sows[sown].key <= reach) {
      sows[sown++].run();
      any = true;
    }
    return any;
  }

  /** Sowing changes cells between steps: repaint near what was sown. */
  let sowTop = Infinity;
  let sowBottom = -Infinity;
  function sowAndTouch(reach: number) {
    const before = sown;
    if (!sowDue(reach)) return;
    for (let i = before; i < sown; i++) {
      sowTop = Math.min(sowTop, sows[i].key);
      sowBottom = Math.max(sowBottom, sows[i].key);
    }
    // Frames reach a box's height below its key; be generous.
    touchAll(Math.max(0, Math.floor(sowTop / S) - 4), Math.min(life.h, Math.ceil((sowBottom + innerHeight) / S)));
    sowTop = Infinity;
    sowBottom = -Infinity;
  }

  const asleep = () => options.isIdle() || document.hidden;

  function tick(now: number) {
    frame = 0;
    if (asleep()) return;
    const dt = Math.min(100, now - (last || now));
    last = now;
    sowAndTouch(loom.reach());
    weaveSome(8);
    budget = Math.min(4, budget + (dt / 1000) * (life.settled ? RESTING : PACE));
    let steps = 0;
    while (budget >= 1 && steps < 2) {
      life.step();
      touchChanged();
      for (let k = 0; k < life.freshes; k++) {
        const at = life.fresh[k];
        groundAt(at % life.w, Math.floor(at / life.w));
      }
      budget -= 1;
      steps++;
    }
    const behind = paint(performance.now() + 6);
    const waiting =
      shuttleAt < shuttle.length || (sown < sows.length && sows[sown].key <= loom.reach() + innerHeight);
    if (behind || budget >= 1 || shuttleAt < shuttle.length) frame = requestAnimationFrame(tick);
    else if (life.changes || waiting || !life.settled) {
      // Nothing to paint until the next generation is due.
      const wait = (1 - budget) / (life.settled ? RESTING : PACE);
      timer = window.setTimeout(() => {
        timer = 0;
        frame = requestAnimationFrame(tick);
      }, Math.max(16, wait * 1000 - 8));
    } else last = 0;
  }

  function wake() {
    if (instant || frame || timer || asleep() || !built || layer.dataset.state === "settling") return;
    frame = requestAnimationFrame(tick);
  }

  function onScroll() {
    if (!built || layer.dataset.state === "settling") return;
    cull();
    if (instant) {
      paint(Infinity);
      return;
    }
    // Reading moves the cloth along.
    const dy = Math.abs(scrollY - lastScroll);
    lastScroll = scrollY;
    budget = Math.min(4, budget + dy / (S * 5));
    wake();
  }

  /** Sow a glider at a page point, flying away from where it was sent. */
  function launch(px: number, py: number, toward: Pt, species?: Species) {
    const turn = toward[0] >= 0 ? (toward[1] >= 0 ? 0 : 3) : toward[1] >= 0 ? 1 : 2;
    const pattern = orient(PATTERNS.glider, turn);
    const x = Math.round(px / S) - 1;
    const y = Math.round(py / S) - 1;
    if (!free(pattern, x, y)) return false;
    stamp(life, pattern, x, y, species ?? (hue = hue === 1 ? 2 : 1));
    touch(x + 1, y + 1);
    budget = Math.max(budget, 1);
    wake();
    return true;
  }

  function onDown(event: PointerEvent) {
    if (!built || event.button > 0) return;
    const target = event.target as Element;
    if (target.closest("a, button, input, .hion-top")) return;
    const top = pageTop;
    const px = event.clientX;
    const py = event.clientY + scrollY - top;
    if (py < 0 || py > height) return;
    const rand = Math.random();
    if (rand < 0.3) {
      // Now and then a burst instead: it burns a while, then settles.
      const pattern = orient(PATTERNS.rPentomino, Math.floor(Math.random() * 4));
      const x = Math.round(px / S) - 1;
      const y = Math.round(py / S) - 1;
      if (free(pattern, x, y)) {
        stamp(life, pattern, x, y, (dx, dy) => ((dx + dy) & 1 ? 1 : 2));
        touch(x + 1, y + 1);
        budget = Math.max(budget, 1);
        wake();
        return;
      }
    }
    launch(px, py, [px > width / 2 ? 1 : -1, Math.random() < 0.5 ? 1 : -1]);
  }

  /** Passing over a link sends a glider off it, outward. */
  let lastLaunch = 0;
  function onOver(event: PointerEvent) {
    if (!built || event.pointerType !== "mouse") return;
    const link = (event.target as Element).closest?.("a");
    if (!link || !page.contains(link) || performance.now() - lastLaunch < 900) return;
    const b = box(link);
    const right = (b.l + b.r) / 2 > width / 2;
    const huey = link.closest<HTMLElement>("[data-hue]")?.dataset.hue;
    if (launch(right ? b.r + S * 2 : b.l - S * 2, (b.t + b.b) / 2, [right ? 1 : -1, -1], huey === "m" ? 2 : huey === "c" ? 1 : undefined)) {
      lastLaunch = performance.now();
    }
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

  /** Let the cloth live out of sight for up to n generations (until only
   * still and blinking things are left), a few milliseconds at a time and
   * never while the prism holds the page still; then show it. */
  let settling = 0;
  function settle(n: number) {
    const mine = ++settling;
    layer.dataset.state = "settling";
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
        n = life.settled || !life.changes ? 0 : n - 1;
      }
      if (n > 0) {
        timer = window.setTimeout(slice, 16);
        return;
      }
      timer = 0;
      settling++;
      delete layer.dataset.state;
      dirty.clear();
      for (const tile of tiles.values()) tile.el.remove();
      tiles.clear();
      cull();
      paint(Infinity);
      wake();
    };
    slice();
  }

  /** Start over on the new layout: sow what the hions have already reached,
   * and let it settle a little out of sight. */
  function rebuild() {
    build();
    sowDue(instant ? Infinity : loom.reach());
    weaveSome(Infinity);
    settle(instant ? 400 : 60);
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
        clearTimeout(resizeTimer);
      });
      if (instant) {
        sowDue(Infinity);
        weaveSome(Infinity);
        settle(400);
      } else {
        cull();
        paint(Infinity);
        wake();
      }
    },
    /** Let the cloth go. Toward a point (page px): it magnifies round it,
     * as if you leant in to look at one thread. */
    release(toward?: Pt) {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      frame = timer = 0;
      built = false;
      const keyframes: Keyframe[] = toward
        ? [
            { transformOrigin: `${toward[0]}px ${toward[1]}px`, transform: "scale(1)", opacity: 1 },
            { transformOrigin: `${toward[0]}px ${toward[1]}px`, transform: "scale(2.4)", opacity: 0 },
          ]
        : [{ opacity: 1 }, { opacity: 0 }];
      layer.animate(keyframes, { duration: 420, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" });
    },
    /** For a check: the life itself. */
    life: () => life,
  };
}
