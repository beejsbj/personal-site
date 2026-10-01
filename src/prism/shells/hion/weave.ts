/** The weave: how a screen's layout becomes thread.
 *
 * Screens say what is what with data attributes; this reads the layout and
 * composes the marks the loom lays down, and tells every hung thing how
 * long its thread must be to reach what it hangs from.
 *
 * - `[data-spine]` are stations on the hions' way down, in document order:
 *   `loop` (a section: the two part to run down either side of it, and
 *   meet again beneath, one tying a loose loop round the other), `via` (they
 *   pass through here) and `end` (they let go of each other in two curls).
 *   They set out from the knot of the destination you are on, in the line
 *   at the top. Between stations they dance (dance.ts).
 * - `[data-orbit="c|m"]` is something that hion circles on its way past.
 * - `[data-weft]` headings are strung on a weft: a thread through the waist
 *   of their first line, woven over one side of the loop and under the
 *   other.
 * - `[data-cord]` holds `[data-hang]` things. Each row of them hangs from a
 *   cord across its top: `branch` cords are tied to the nearest hion and run
 *   out to one side (the heads of screens hang from these), `heading` rows
 *   hang from the weft of the heading just before them, and the rest get a
 *   cord of their own (woven into the loop when inside one). Things with
 *   `data-hang-from="prev"` hang from the thing above them instead.
 *   Spacing is layout (`--hion-drop`); the thread length (`--hion-hang`) is
 *   measured here, so every thread reaches its cord exactly. */
import { curl, dancer, journeyKeys, orbit, TEMPER } from "./dance";
import {
  cubic,
  hang,
  type Hue,
  Kind,
  knot,
  mark,
  type Mark,
  Path,
  type Pt,
  rng,
  thread,
} from "./pastel";
import type { Composition } from "./loom";
import { textExtent } from "./dom";

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

interface Loop extends Box {
  el: HTMLElement;
  entry: Pt;
  exit: Pt;
  flare: number;
}

const visible = (el: HTMLElement) => el.offsetParent !== null || el.getClientRects().length > 0;

export function compose(host: HTMLElement, origin: () => Pt | null): Composition {
  const hostBox = host.getBoundingClientRect();
  const narrow = host.clientWidth < 720;
  // Layout boxes, not painted ones: things still swinging into place (or
  // waiting to) must not move the threads they hang from.
  const box = (el: Element): Box => {
    let x = 0;
    let y = 0;
    let node = el as HTMLElement | null;
    while (node && node !== host) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    if (node === host && el instanceof HTMLElement) {
      return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight };
    }
    const r = el.getBoundingClientRect();
    return {
      l: r.left - hostBox.left,
      t: r.top - hostBox.top,
      r: r.right - hostBox.left,
      b: r.bottom - hostBox.top,
    };
  };
  /** The box a hung thing's threads attach to: for a sign, the words
   * themselves (a wrapped heading's box is wider than its lines). */
  const inkBox = (el: HTMLElement): Box => {
    const b = box(el);
    if (el.dataset.ink !== "sign") return b;
    const extent = textExtent(el);
    return extent ? { ...b, l: b.l + extent[0], r: b.l + extent[1] } : b;
  };
  const firstLineMiddle = (el: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.height > 4);
    range.detach();
    const own = el.getBoundingClientRect();
    // The line that reads first, which is the one highest on the page.
    const first = rects.reduce<DOMRect | null>((a, r) => (!a || r.top < a.top ? r : a), null) ?? own;
    // Through the waist of the letters, not the baseline.
    return box(el).t + (first.top - own.top) + first.height * 0.56;
  };
  const marks: Mark[] = [];
  let seed = 1;

  /* ---- Stations along the main cord ---- */
  const stations = [...host.querySelectorAll<HTMLElement>("[data-spine]")].filter(visible);
  const loops = new Map<HTMLElement, Loop>();
  const route: Pt[][] = [];
  let run: Pt[] = [];
  const start = origin();
  if (start) {
    run.push(start);
    // A cord hangs straight down from where it is tied, clear of the head
    // of the screen, before it swings across to its first station.
    const first = stations[0];
    if (first) {
      const top = box(first).t;
      if (top - start[1] > 320) run.push([start[0], top - 150]);
    }
  }
  let endAt: Pt | null = null;

  for (const el of stations) {
    const kind = el.dataset.spine;
    const b = box(el);
    if (kind === "loop") {
      const entryX = b.l + (b.r - b.l) * parseFloat(el.dataset.entry ?? "0.5");
      const exitX = b.l + (b.r - b.l) * parseFloat(el.dataset.exit ?? "0.5");
      const flare = Math.min(narrow ? 60 : 104, (b.b - b.t) * 0.3, (b.r - b.l) * 0.3);
      const loop: Loop = { el, ...b, entry: [entryX, b.t], exit: [exitX, b.b], flare };
      loops.set(el, loop);
      if (!run.length) run.push([entryX, Math.max(0, b.t - 160)]);
      run.push(loop.entry);
      route.push(run);
      run = [loop.exit];
    } else if (kind === "end") {
      const p: Pt = [(b.l + b.r) / 2, b.t + (b.b - b.t) * 0.2];
      if (!run.length) run.push([p[0], p[1] - 120]);
      run.push(p);
      endAt = p;
      route.push(run);
      run = [];
      break;
    } else {
      const p: Pt = [(b.l + b.r) / 2, (b.t + b.b) / 2];
      if (!run.length) run.push([p[0], Math.max(0, p[1] - 160)]);
      run.push(p);
      if (kind === "knot") marks.push(...knot(p[0], p[1], narrow ? 7 : 9, seed++));
    }
  }
  if (run.length > 1) route.push(run);

  // The two hions dance down each run between stations, part to go round
  // each loop (cyan down its left, magenta down its right), and come back
  // together beneath it. Each hue's whole journey is one continuous thread.
  const loopList = [...loops.values()];
  const journey: Record<Hue, Pt[]> = { c: [], m: [] };
  const detours: Record<Hue, { from: number; to: number }[]> = { c: [], m: [] };
  const runs: { top: number; bottom: number }[] = [];
  const orbiting = [...host.querySelectorAll<HTMLElement>("[data-orbit]")].filter(
    (el) => visible(el) && !(narrow && el.hasAttribute("data-orbit-wide")),
  );
  route.forEach((points, i) => {
    const centre = new Path(hang(points, 0.55), 3);
    if (centre.length < 6) return;
    runs.push({ top: Math.min(...centre.ys), bottom: Math.max(...centre.ys) });
    // Under the head of a screen there's less room to dance.
    const room = (narrow ? 0.42 : 1) * (i === 0 && start ? 0.6 : 1);
    for (const hue of ["c", "m"] as Hue[]) {
      let pts = dancer(centre, hue, { scale: room, seed: i * 13 + seed });
      for (const el of orbiting) {
        if (el.dataset.orbit !== hue) continue;
        const b = box(el);
        const cy = (b.t + b.b) / 2;
        if (cy < centre.ys[0] || cy > centre.ys[centre.ys.length - 1]) continue;
        const pad = (el.dataset.orbitPad ?? "34,30").split(",").map(Number) as [number, number];
        const found = orbit(pts, b, hue === "c" ? -1 : 1, seed++, pad);
        if (!found) continue;
        detours[hue].push({ from: journey[hue].length + found.from, to: journey[hue].length + found.to });
        pts = found.points;
      }
      journey[hue].push(...pts);
      const loop = loopList[i];
      if (loop) {
        // Where they meet, one ties a loose loop round the other before
        // they part: cyan going in, magenta coming out.
        if (hue === "c") journey.c.push(...looseLoop(loop.entry, -1, narrow ? 11 : 15, seed + 1));
        journey[hue].push(...strandPoints(loop, hue, seed));
        if (hue === "m") journey.m.push(...looseLoop(loop.exit, 1, narrow ? 12 : 17, seed + 2));
      }
    }
  });
  for (const loop of loopList) {
    marks.push(...looseFibres(loop, seed));
    seed += 10;
  }
  // At the end they let go of each other: each curls away on its own.
  if (endAt) {
    journey.c.push(...curl(endAt[0], endAt[1], -1, narrow ? 90 : 130, seed++));
    journey.m.push(...curl(endAt[0], endAt[1], 1, narrow ? 110 : 160, seed++, 1.7));
  }
  const tips: Composition["tips"] = [];
  const orbits: Composition["orbits"] = [];
  for (const hue of ["c", "m"] as Hue[]) {
    const pts = journey[hue];
    if (pts.length < 2) continue;
    const keys = journeyKeys(pts, detours[hue]);
    for (const { from, to } of detours[hue]) {
      orbits.push({ hue, points: pts.slice(from, to), key: keys.keys[to - 1] });
    }
    marks.push(
      ...thread(new Path(pts, 3), {
        hue,
        w: TEMPER[hue].weight * (narrow ? 0.85 : 1),
        seed: seed++,
        key: (s) => keys.keyAt(s),
        glow: 0.22,
      }),
    );
    tips.push({ hue, points: pts, keys: keys.keys });
  }
  /** Where a hion crosses height y nearest to x (for things to tie on). */
  const threadAt = (y: number, x: number) => {
    if (!runs.some((run) => y >= run.top && y <= run.bottom)) return null;
    let best: number | null = null;
    for (const hue of ["c", "m"] as Hue[]) {
      const pts = journey[hue];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        if ((ay - y) * (by - y) > 0 || ay === by) continue;
        const cx = ax + ((y - ay) / (by - ay)) * (bx - ax);
        if (best === null || Math.abs(cx - x) < Math.abs(best - x)) best = cx;
      }
    }
    return best;
  };

  const loopOf = (el: Element) => {
    const owner = el.closest<HTMLElement>("[data-spine='loop']");
    return owner ? loops.get(owner) : undefined;
  };
  let wi = 0;
  const weftY = new Map<HTMLElement, number>();

  /* ---- Headings strung on wefts ---- */
  for (const el of host.querySelectorAll<HTMLElement>("[data-weft]")) {
    if (!visible(el)) continue;
    const y = firstLineMiddle(el);
    weftY.set(el, y);
    const loop = loopOf(el);
    const b = box(el);
    const from = loop ? loop.l - 22 : b.l - 36;
    const to = loop ? loop.r + 22 : b.r + 36;
    marks.push(...weft(from, to, y, wi++ % 2 ? "c" : "m", seed++, loop));
  }

  /* ---- Things that hang ---- */
  const setHang = (el: HTMLElement, length: number) =>
    el.style.setProperty("--hion-hang", `${Math.max(0, length).toFixed(1)}px`);

  for (const holder of host.querySelectorAll<HTMLElement>("[data-cord]")) {
    if (!visible(holder)) continue;
    const items = [...holder.querySelectorAll<HTMLElement>("[data-hang]")].filter(
      (item) =>
        item.closest("[data-cord]") === holder &&
        item.dataset.hangFrom !== "prev" &&
        visible(item),
    );
    if (!items.length) continue;
    const kind = holder.dataset.cord;
    const loop = loopOf(holder);
    // Rows: things whose tops (less their drop) sit together.
    const rows: { items: HTMLElement[]; y: number }[] = [];
    for (const item of items) {
      const b = box(item);
      const drop = parseFloat(getComputedStyle(item).getPropertyValue("--hion-drop")) || 40;
      const row = rows.find((r) => Math.abs(box(r.items[0]).t - b.t) < 90);
      if (row) {
        row.items.push(item);
        row.y = Math.min(row.y, b.t - drop);
      } else rows.push({ items: [item], y: b.t - drop });
    }
    rows.forEach((row, index) => {
      let y = row.y;
      let drawn = true;
      if (kind === "heading" && index === 0) {
        // Hang from the weft of the heading just before.
        let prev = holder.previousElementSibling as HTMLElement | null;
        while (prev && !prev.hasAttribute("data-weft")) prev = prev.previousElementSibling as HTMLElement | null;
        const w = prev ? weftY.get(prev) : undefined;
        if (w !== undefined) {
          y = w;
          drawn = false;
        }
      }
      for (const item of row.items) setHang(item, box(item).t - y);
      if (!drawn) return;
      const lefts = row.items.map((item) => inkBox(item).l);
      const rights = row.items.map((item) => inkBox(item).r);
      const spanL = Math.min(...lefts);
      const spanR = Math.max(...rights);
      const hue: Hue = wi++ % 2 ? "c" : "m";
      if (kind === "branch") {
        const x = threadAt(y, (spanL + spanR) / 2);
        if (x !== null) {
          if (spanR < x || spanL > x) {
            // Out to one side of the main cord.
            const toLeft = spanR < x;
            const end = toLeft ? spanL - 34 : spanR + 34;
            const [a, b] = toLeft ? [end, x] : [x, end];
            marks.push(...weft(a, b, y, hue, seed++, undefined, { knotL: true, knotR: true, from: x }));
          } else {
            // Across it, tied on where they cross.
            marks.push(...weft(spanL - 34, spanR + 34, y, hue, seed++, undefined, { knotL: true, knotR: true }));
            marks.push(...knot(x, y, 7, seed++, y - 40));
          }
          return;
        }
      }
      if (loop && kind !== "free") {
        marks.push(...weft(loop.l - 22, loop.r + 22, y, hue, seed++, loop));
      } else {
        marks.push(...weft(spanL - 30, spanR + 30, y, hue, seed++, undefined, { knotL: true, knotR: true }));
      }
    });
  }

  // Chains: things hung from the thing above them.
  for (const item of host.querySelectorAll<HTMLElement>("[data-hang-from='prev']")) {
    let prev = item.previousElementSibling as HTMLElement | null;
    while (prev && !prev.hasAttribute("data-ink")) prev = prev.previousElementSibling as HTMLElement | null;
    if (prev) setHang(item, box(item).t - box(prev).b);
  }

  /* ---- Ties: items knotted to their loop's left strand ---- */
  for (const el of host.querySelectorAll<HTMLElement>("[data-tie]")) {
    if (!visible(el)) continue;
    const loop = loopOf(el);
    if (!loop) continue;
    const y = firstLineMiddle(el);
    const b = box(el);
    const hue: Hue = el.dataset.hue === "m" ? "m" : "c";
    const pts: Pt[] = [
      [loop.l, y - 4],
      [(loop.l + b.l) / 2, y + 3],
      [b.l - 12, y],
    ];
    marks.push(
      ...thread(new Path(pts, 3), { hue, w: 2.2, seed: seed++, key: [y - 50, y - 20], glow: 0.16 }),
      ...knot(loop.l, y - 4, 5, seed++, y - 50),
      ...knot(b.l - 12, y, 3.5, seed++, y - 20),
    );
  }

  return { marks, tips, orbits, end: endAt ? endAt[1] + 120 : null };
}

/** The way one hion goes round a loop: from where they meet at its top,
 * out to its side, down, and back in to meet beneath it. */
function strandPoints(loop: Loop, hue: Hue, seed: number): Pt[] {
  const { l, t, r, b, entry, exit, flare } = loop;
  const x = hue === "c" ? l : r;
  const pts: Pt[] = [
    ...cubic(entry, [entry[0], t + flare * 0.55], [x, t + flare * 0.3], [x, t + flare], 28),
  ];
  // Down the side, with the slow drift of a hand-drawn line.
  const rand = rng(seed + (hue === "m" ? 3 : 7));
  const span = b - t - flare * 2;
  const steps = Math.max(2, Math.round(span / 70));
  const phase = rand() * 6;
  for (let i = 1; i < steps; i++) {
    pts.push([x + Math.sin(i * 0.9 + phase) * 2.4, t + flare + (span * i) / steps]);
  }
  pts.push(...cubic([x, b - flare], [x, b - flare * 0.3], [exit[0], b - flare * 0.55], exit, 28));
  return pts;
}

/** A single loose loop hung from a point, coming back through it. */
function looseLoop(p: Pt, dir: 1 | -1, r: number, seed: number): Pt[] {
  const rand = rng(seed);
  const c: Pt = [p[0] + dir * r * 0.75, p[1] + r * 0.7];
  const start = Math.atan2(p[1] - c[1], p[0] - c[0]);
  const out: Pt[] = [];
  const steps = 36;
  for (let k = 0; k <= steps; k++) {
    const a = start - dir * (k / steps) * Math.PI * 2.05;
    const rr = r * (1 + Math.sin((k / steps) * Math.PI) * 0.12 + (rand() - 0.5) * 0.04);
    out.push([c[0] + Math.cos(a) * rr * 1.15, c[1] + Math.sin(a) * rr]);
  }
  return out;
}

/** A finer fibre beside each side of a loop: the hion loosened where it
 * holds a section open. */
function looseFibres(loop: Loop, seed: number): Mark[] {
  const out: Mark[] = [];
  for (const hue of ["c", "m"] as Hue[]) {
    const dir = hue === "c" ? -1 : 1;
    const pts = strandPoints(loop, hue, seed);
    const loose = new Path(
      pts.slice(20, -20).map(([px, py], i) => [px - dir * (3.2 + Math.sin(i * 0.3) * 1.6), py] as Pt),
      3,
    );
    out.push(
      ...thread(loose, { hue, w: 1.5, alpha: 0.65, seed: seed * 7 + (dir > 0 ? 3 : 4), glow: 0, core: false }),
    );
  }
  return out;
}

/** A weft thread across [from, to] at y. Inside a loop it is woven: over
 * one strand and under the other, alternating. Elsewhere its ends are
 * knotted. `from` (when given) is where it is thrown from, so it draws
 * outward from the main cord. */
function weft(
  from: number,
  to: number,
  y: number,
  hue: Hue,
  seed: number,
  loop: Loop | undefined,
  ends: { knotL?: boolean; knotR?: boolean; from?: number } = {},
): Mark[] {
  const out: Mark[] = [];
  const rand = rng(seed);
  const pts: Pt[] = [];
  const steps = Math.max(2, Math.round((to - from) / 40));
  const tilt = (rand() - 0.5) * 5;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push([
      from + (to - from) * u,
      y + Math.sin(u * Math.PI) * 2.5 + tilt * (u - 0.5) + Math.sin(u * 9 + seed) * 0.8,
    ]);
  }
  const reversed = ends.from !== undefined && Math.abs(ends.from - to) < Math.abs(ends.from - from);
  const path = new Path(reversed ? pts.slice().reverse() : pts, 3);
  const key = y - 40;
  // Thrown across as the reach passes them.
  const keys: [number, number] = [key, key + 60];
  if (loop) {
    const flip = seed % 2 === 1;
    const over = flip ? loop.l : loop.r;
    const under = flip ? loop.r : loop.l;
    // Where the weft passes over a strand, part the strand first.
    out.push(mark(Kind.Erase, hue, 8, 1, [over, y - 8, over, y + 8], 0, key - 1));
    out.push(...thread(path, { hue, w: 3.2, seed: seed * 11, key: keys, glow: 0.18 }));
    // Where it passes under, cut the weft and lay the strand back over it.
    out.push(mark(Kind.Erase, hue, 9, 1, [under - 6, y, under + 6, y], 0, keys[1] + 1));
    const strandHue: Hue = under === loop.l ? "c" : "m";
    out.push(
      mark(Kind.Stroke, strandHue, 3.8, 1, [under, y - 13, under + 0.6, y, under, y + 13], seed * 13, keys[1] + 2),
    );
  } else {
    out.push(...thread(path, { hue, w: 2.8, seed: seed * 11, key: keys, glow: 0.16 }));
  }
  if (ends.knotL) out.push(...knot(pts[0][0], pts[0][1], 5, seed + 3, reversed ? keys[1] : keys[0]));
  if (ends.knotR) {
    const last = pts[pts.length - 1];
    out.push(...knot(last[0], last[1], 5, seed + 4, reversed ? keys[0] : keys[1]));
  }
  return out;
}
