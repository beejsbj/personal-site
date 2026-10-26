/** The weave: how a screen's layout becomes thread.
 *
 * Screens say what is what with data attributes; this reads the layout and
 * composes the marks the loom lays down, and tells every hung thing how
 * long its thread must be to reach what it hangs from.
 *
 * - `[data-spine]` are stations on the hions' way down, in document order:
 *   `loop` (a section: the two part to run down either side of it, and
 *   meet again beneath, one tying a loose loop round the other), `knot`
 *   (they are tied together here: they meet at it and part again after,
 *   keeping close company either side of it), `via` (they pass through
 *   here) and `end` (they let go of each other in two curls). They set out
 *   from the knot of the destination you are on, in the line at the top.
 *   Between stations they dance (dance.ts).
 * - `[data-orbit="c|m"]` is something that hion circles on its way past.
 * - `[data-weft]` headings are strung on a weft: a thread through the waist
 *   of their first line, woven over one side of the loop and under the
 *   other (and out past the loop, if the heading hangs out of it). Off the
 *   loops, a heading beside the hions has its weft thrown out from them.
 * - `[data-tie]` things are tied on by a short thread to the hions beside
 *   them, level with their first line (inside a loop, to its left strand).
 * - `[data-cord]` holds `[data-hang]` things. Each row of them hangs from a
 *   cord across its top: `branch` cords are tied to the nearest hion and run
 *   out to one side (the heads of screens hang from these), `heading` rows
 *   hang from the weft of the heading just before them, and the rest get a
 *   cord of their own (woven into the loop when inside one). Things with
 *   `data-hang-from="prev"` hang from the thing above them instead.
 *   Spacing is layout (`--hion-drop`); the thread length (`--hion-hang`) is
 *   measured here, so every thread reaches its cord exactly.
 * - `gap` is a stretch the hions leave the page for: a track inside it
 *   that draws its own (track.ts). They go in at its top and come out at
 *   its foot; nothing of theirs is drawn between.
 *
 * With `heads` (a page), the hions themselves are the skein's (skein.ts):
 * their bodies and heads are strands there, so no marks are composed for
 * them here, only their ways down (`tips`) for the skein to grow along;
 * and everything that hangs from them (wefts, cords, ties, the knots
 * where they are tied) is a limb, the way a branch of a hion should go,
 * which the skein grows off the hion as the drawing reaches it. Every
 * thread on a page is one of the two hions or a branch of one. Without it
 * (a track), they and what hangs from them are laid here in pastel.
 *
 * Only what belongs to the host is read: the nearest `[data-loom]` round
 * it is the host (a track inside the page is not the page's).
 *
 * A drawing that reads across (`axis: "x"`, the wide resume's timeline) is
 * composed turned: its stations are read with x and y swapped, so the same
 * dance, loops and orbits run left to right, and the marks are turned back
 * (pastel.ts `turned`), their keys running along x. Its headings are strung
 * on wefts laid as they are, level with their words. Cords and ties are not
 * read across (a track has none). */
import { curl, dancer, journeyKeys, orbit } from "./dance";
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
  THREAD,
  turned,
  acrossX,
} from "./pastel";
import type { Composition, Limb } from "./loom";
import { textExtent } from "./dom";
import { WEFT_GAP } from "./spun";

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

/** Consecutive points further apart than this are a gap in a thread. */
const GAP = 400;

export function compose(
  host: HTMLElement,
  origin: () => Pt | null,
  { axis = "y", heads = false }: { axis?: "x" | "y"; heads?: boolean } = {},
): Composition {
  const hostBox = host.getBoundingClientRect();
  const across = axis === "x";
  const narrow = !across && host.clientWidth < 720;
  /** The host's own things (not those of a track inside it), on show. */
  const mine = (el: HTMLElement) => el.parentElement?.closest("[data-loom]") === host;
  const own = (selector: string, shown = true) =>
    [...host.querySelectorAll<HTMLElement>(selector)].filter((el) => mine(el) && (!shown || visible(el)));
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
  /** A box as the spine reads it: turned, for a drawing that reads across. */
  const sbox = (el: Element): Box => {
    const b = box(el);
    return across ? { l: b.t, t: b.l, r: b.b, b: b.r } : b;
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
  const limbs: Limb[] = [];
  let seed = 1;

  /* ---- Stations along the main cord ---- */
  const stations = own("[data-spine]");
  const loops = new Map<HTMLElement, Loop>();
  /** Runs of the route between stations: the loop each one arrives at,
   * and whether it leaves from or arrives at a knot (where the two are
   * tied together, so they keep close company either side of it). */
  const route: { points: Pt[]; loop?: Loop; from?: string; to?: string }[] = [];
  let run: Pt[] = [];
  let runFrom: string | undefined;
  const close = (to: string, loop?: Loop) => {
    route.push({ points: run, loop, from: runFrom, to });
    runFrom = to;
  };
  const given = origin();
  const start: Pt | null = given && across ? [given[1], given[0]] : given;
  if (start && across) {
    // Into a track from above: down to the height of its first station
    // (and away along it, if that is further on).
    run.push(start);
    const first = stations[0];
    if (first) {
      const b = sbox(first);
      if (b.t - start[1] > 200) run.push([(b.l + b.r) / 2, start[1] + 90]);
    }
  } else if (start) {
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
    const b = sbox(el);
    if (kind === "loop") {
      const entryX = b.l + (b.r - b.l) * parseFloat(el.dataset.entry ?? "0.5");
      const exitX = b.l + (b.r - b.l) * parseFloat(el.dataset.exit ?? "0.5");
      const flare = Math.min(narrow ? 60 : 104, (b.b - b.t) * 0.3, (b.r - b.l) * 0.3);
      const loop: Loop = { el, ...b, entry: [entryX, b.t], exit: [exitX, b.b], flare };
      loops.set(el, loop);
      if (!run.length) run.push([entryX, Math.max(0, b.t - 160)]);
      run.push(loop.entry);
      close("loop", loop);
      run = [loop.exit];
    } else if (kind === "end") {
      const p: Pt = [(b.l + b.r) / 2, b.t + (b.b - b.t) * 0.2];
      if (!run.length) run.push([p[0], p[1] - 120]);
      run.push(p);
      endAt = p;
      close("end");
      run = [];
      break;
    } else if (kind === "gap" && !across) {
      // Left for a track that draws its own: in at its top, out at its foot.
      const at = (f: string | undefined) => b.l + (b.r - b.l) * parseFloat(f ?? "0.5");
      const into: Pt = [at(el.dataset.entry), b.t];
      if (!run.length) run.push([into[0], Math.max(0, b.t - 160)]);
      run.push(into);
      close("gap");
      run = [[at(el.dataset.exit), b.b]];
    } else if (kind === "knot") {
      // The two are tied together here: they meet at the knot, and part
      // again after it. Things on the page are tied on beside it.
      const p: Pt = [(b.l + b.r) / 2, (b.t + b.b) / 2];
      if (!run.length) run.push([p[0], Math.max(0, p[1] - 160)]);
      run.push(p);
      if (heads) limbs.push({ hue: "c", way: tie(p, narrow ? 7 : 9, seed++), key: p[1] - 30, tied: true, knot: false });
      else marks.push(...knot(p[0], p[1], narrow ? 7 : 9, seed++, p[1] - 30));
      close("knot");
      run = [p];
    } else {
      const p: Pt = [(b.l + b.r) / 2, (b.t + b.b) / 2];
      if (!run.length) run.push([p[0], Math.max(0, p[1] - 160)]);
      run.push(p);
    }
  }
  if (run.length > 1) route.push({ points: run, from: runFrom });

  // The two hions dance down each run between stations, part to go round
  // each loop (cyan down its left, magenta down its right), and come back
  // together beneath it. Each hue's whole journey is one continuous thread.
  const loopList = [...loops.values()];
  const journey: Record<Hue, Pt[]> = { c: [], m: [] };
  const detours: Record<Hue, { from: number; to: number }[]> = { c: [], m: [] };
  const runs: { top: number; bottom: number }[] = [];
  const orbiting = own("[data-orbit]").filter((el) => !(narrow && el.hasAttribute("data-orbit-wide")));
  route.forEach(({ points, loop, from, to }, i) => {
    const centre = new Path(hang(points, 0.55), 3);
    if (centre.length < 6) return;
    runs.push({ top: Math.min(...centre.ys), bottom: Math.max(...centre.ys) });
    // Under the head of a screen there's less room to dance; tied
    // together, they keep close (closest between two knots).
    const knots = (from === "knot" ? 1 : 0) + (to === "knot" ? 1 : 0);
    const room =
      (narrow ? 0.42 : 1) * (i === 0 && start ? 0.6 : 1) * (knots === 2 ? 0.32 : knots ? 0.5 : 1);
    for (const hue of ["c", "m"] as Hue[]) {
      let pts = dancer(centre, hue, { scale: room, seed: i * 13 + seed });
      for (const el of orbiting) {
        if (el.dataset.orbit !== hue) continue;
        const b = sbox(el);
        const cy = (b.t + b.b) / 2;
        if (cy < centre.ys[0] || cy > centre.ys[centre.ys.length - 1]) continue;
        const pad = (el.dataset.orbitPad ?? "34,30").split(",").map(Number) as [number, number];
        const found = orbit(pts, b, hue === "c" ? -1 : 1, seed++, pad);
        if (!found) continue;
        detours[hue].push({ from: journey[hue].length + found.from, to: journey[hue].length + found.to });
        pts = found.points;
      }
      journey[hue].push(...pts);
      if (loop) {
        // Where they meet, one ties a loose loop round the other before
        // they part: cyan going in, magenta coming out.
        if (hue === "c") journey.c.push(...looseLoop(loop.entry, -1, narrow ? 11 : 15, seed + 1));
        journey[hue].push(...strandPoints(loop, hue, seed));
        if (hue === "m") journey.m.push(...looseLoop(loop.exit, 1, narrow ? 12 : 17, seed + 2));
      }
    }
  });
  // The finer fibre beside each side of a loop is its own line, not a
  // branch: on a page, where every thread is one of the two, it goes.
  for (const loop of loopList) {
    if (!heads) marks.push(...looseFibres(loop, seed));
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
    // One thread, unless it leaves the page for a track (a gap): then one
    // for each stretch drawn, keyed by where it is along the whole.
    let from = 0;
    for (let i = 1; i <= pts.length && !heads; i++) {
      if (i < pts.length && Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) < GAP) continue;
      const offset = keys.lens[from];
      marks.push(
        ...thread(new Path(pts.slice(from, i), 3), {
          hue,
          seed: seed++,
          key: (s) => keys.keyAt(s + offset),
        }),
      );
      from = i;
    }
    tips.push({ hue, points: pts, keys: keys.keys });
  }
  if (across) {
    // Turned back: the spine was composed as if the track read down.
    const turn = (pts: Pt[]) => pts.map(([x, y]) => [y, x] as Pt);
    marks.splice(0, marks.length, ...marks.map(turned));
    for (const tip of tips) tip.points = turn(tip.points);
    for (const o of orbits) o.points = turn(o.points);
    // Headings across a track: strung on a weft level with their words,
    // thrown as the reach (along x) gets to them.
    let wi = 0;
    for (const el of own("[data-weft]")) {
      const y = firstLineMiddle(el);
      const b = box(el.querySelector(".hion-strung__box") ?? el);
      const hue: Hue = wi++ % 2 ? "c" : "m";
      marks.push(
        ...weft(b.l - 36, b.r + 36, y, hue, seed++, undefined, { knotL: true, knotR: true, key: b.l - 60 }).map(acrossX),
      );
    }
    return { marks, tips, orbits, end: endAt ? endAt[1] + 120 : null };
  }
  /** Where a hion crosses height y nearest to x (for things to tie on),
   * and which hion it is. */
  const crossing = (y: number, x: number) => {
    if (!runs.some((run) => y >= run.top && y <= run.bottom)) return null;
    let best: { x: number; hue: Hue } | null = null;
    for (const hue of ["c", "m"] as Hue[]) {
      const pts = journey[hue];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1];
        const [bx, by] = pts[i];
        if ((ay - y) * (by - y) > 0 || ay === by) continue;
        const cx = ax + ((y - ay) / (by - ay)) * (bx - ax);
        if (best === null || Math.abs(cx - x) < Math.abs(best.x - x)) best = { x: cx, hue };
      }
    }
    return best;
  };
  /** A weft, a cord: marks on a track; on a page, the limbs the skein
   * grows. `thrownHue` is the hue of the hion it is thrown from. Returns
   * the hue it is (on a page, the hion's it grows from), for what hangs
   * from it and the words written on it to take. */
  const string = (
    from: number,
    to: number,
    y: number,
    hue: Hue,
    loop: Loop | undefined,
    ends: Parameters<typeof weft>[6] = {},
    thrownHue?: Hue,
  ) => {
    const s = seed++;
    if (!heads) {
      marks.push(...weft(from, to, y, hue, s, loop, ends));
      return hue;
    }
    const grown = weftLimbs(from, to, y, hue, s, loop, ends, thrownHue);
    limbs.push(...grown);
    return grown[0]?.hue ?? hue;
  };

  const loopOf = (el: Element) => {
    const owner = el.closest<HTMLElement>("[data-spine='loop']");
    return owner ? loops.get(owner) : undefined;
  };
  let wi = 0;
  const weftY = new Map<HTMLElement, number>();

  /* ---- Headings strung on wefts ---- */
  for (const el of own("[data-weft]")) {
    const y = firstLineMiddle(el);
    weftY.set(el, y);
    const loop = loopOf(el);
    // The words, not the heading's whole line.
    const b = box(el.querySelector(".hion-strung__box") ?? el);
    let hue: Hue = wi++ % 2 ? "c" : "m";
    // Its words are written by thread, the weft's own (spun.ts): the weft
    // stops short of them either side in a knot, and the thread that
    // writes them sets out from the knot before and ends in the knot after.
    const gap: [number, number] = [b.l - WEFT_GAP, b.r + WEFT_GAP];
    if (loop) {
      // Across the loop, and out past it where the heading hangs out.
      hue = string(Math.min(loop.l - 22, b.l - 30), Math.max(loop.r + 22, b.r + 30), y, hue, loop, { gap });
    } else {
      // Off the loops, a heading beside the hions is strung from them:
      // the weft is thrown out from where they pass, to the words.
      const at = crossing(y, (b.l + b.r) / 2);
      if (at && (at.x < b.l - 20 || at.x > b.r + 20)) {
        const toLeft = at.x > b.r;
        const [a, c] = toLeft ? [b.l - 36, at.x] : [at.x, b.r + 36];
        hue = string(a, c, y, hue, undefined, { knotL: true, knotR: true, from: at.x, gap }, at.hue);
      } else {
        hue = string(b.l - 36, b.r + 36, y, hue, undefined, { gap });
      }
    }
    if (el.dataset.weftHue !== hue) el.dataset.weftHue = hue;
    // On a page the limbs tie themselves off at the words.
    if (!heads) marks.push(...knot(gap[0], y, 3.5, seed++, y + 20), ...knot(gap[1], y, 3.5, seed++, y + 20));
  }

  /* ---- Things that hang ---- */
  const setHang = (el: HTMLElement, length: number) =>
    el.style.setProperty("--hion-hang", `${Math.max(0, length).toFixed(1)}px`);

  for (const holder of own("[data-cord]")) {
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
      // On a page, what hangs from a cord hangs in its hue: one thread.
      const hang = (h: Hue) => {
        if (!heads) return;
        for (const item of row.items) if (item.dataset.hue !== h) item.dataset.hue = h;
      };
      if (kind === "branch") {
        const at = crossing(y, (spanL + spanR) / 2);
        if (at) {
          const x = at.x;
          if (spanR < x || spanL > x) {
            // Out to one side of the main cord.
            const toLeft = spanR < x;
            const end = toLeft ? spanL - 34 : spanR + 34;
            const [a, b] = toLeft ? [end, x] : [x, end];
            hang(string(a, b, y, hue, undefined, { knotL: true, knotR: true, from: x }, at.hue));
          } else if (heads) {
            // Across it: out from where they cross, either way.
            string(spanL - 34, x, y, hue, undefined, { knotL: true, from: x }, at.hue);
            hang(string(x, spanR + 34, y, hue, undefined, { knotR: true, from: x }, at.hue));
          } else {
            // Across it, tied on where they cross.
            marks.push(...weft(spanL - 34, spanR + 34, y, hue, seed++, undefined, { knotL: true, knotR: true }));
            marks.push(...knot(x, y, 7, seed++, y - 40));
          }
          return;
        }
      }
      if (loop && kind !== "free") {
        hang(string(loop.l - 22, loop.r + 22, y, hue, loop));
      } else {
        hang(string(spanL - 30, spanR + 30, y, hue, undefined, { knotL: true, knotR: true }));
      }
    });
  }

  // Chains: things hung from the thing above them.
  for (const item of own("[data-hang-from='prev']", false)) {
    let prev = item.previousElementSibling as HTMLElement | null;
    while (prev && !prev.hasAttribute("data-ink")) prev = prev.previousElementSibling as HTMLElement | null;
    if (prev) setHang(item, box(item).t - box(prev).b);
  }

  /* ---- Ties: things tied on to the hions beside them (or, inside a
     loop, to its left strand) ---- */
  for (const el of own("[data-tie]")) {
    const loop = loopOf(el);
    const y = firstLineMiddle(el);
    const b = box(el);
    const hue: Hue = (el.closest<HTMLElement>("[data-hue]")?.dataset.hue ?? "c") === "m" ? "m" : "c";
    if (!loop) {
      const at = crossing(y, (b.l + b.r) / 2);
      if (!at) continue;
      const x = at.x;
      if (x > b.l - 8 && x < b.r + 8) continue;
      const right = x < b.l;
      const end = right ? b.l - 10 : b.r + 10;
      if (Math.abs(end - x) > 260) continue;
      const pts: Pt[] = [
        [x, y],
        [(x + end) / 2, y + 4],
        [end, y],
      ];
      if (heads) {
        limbs.push({ hue: at.hue, way: new Path(pts, 3).points(), key: y - 40, tied: true, knot: true });
        continue;
      }
      marks.push(
        ...thread(new Path(pts, 3), { hue, seed: seed++, key: [y - 40, y - 10] }),
        ...knot(end, y, 3.5, seed++, y - 10),
      );
      continue;
    }
    const pts: Pt[] = [
      [loop.l, y - 4],
      [(loop.l + b.l) / 2, y + 3],
      [b.l - 12, y],
    ];
    if (heads) {
      limbs.push({ hue: "c", way: new Path(pts, 3).points(), key: y - 50, tied: true, knot: true });
      continue;
    }
    marks.push(
      ...thread(new Path(pts, 3), { hue, seed: seed++, key: [y - 50, y - 20] }),
      ...knot(loop.l, y - 4, 5, seed++, y - 50),
      ...knot(b.l - 12, y, 3.5, seed++, y - 20),
    );
  }

  return { marks, tips, orbits, end: endAt ? endAt[1] + 120 : null, limbs };
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
      ...thread(loose, { hue, alpha: 0.65, seed: seed * 7 + (dir > 0 ? 3 : 4), core: false }),
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
  ends: { knotL?: boolean; knotR?: boolean; from?: number; key?: number; gap?: [number, number] } = {},
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
  // Not across a heading written by thread: the weft stops short of its
  // words either side (`gap`).
  const at = (x: number): Pt => {
    const i = Math.max(1, pts.findIndex((p) => p[0] >= x));
    const [a, b] = [pts[i - 1], pts[i] ?? pts[i - 1]];
    const u = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
    return [x, a[1] + (b[1] - a[1]) * u];
  };
  const { gap } = ends;
  const parts = gap
    ? [
        [...pts.filter((p) => p[0] < gap[0]), at(gap[0])],
        [at(gap[1]), ...pts.filter((p) => p[0] > gap[1])],
      ].filter((part) => part.length >= 2 && part[part.length - 1][0] - part[0][0] > 4)
    : [pts];
  const threads = (opts: Parameters<typeof thread>[1]) =>
    parts.flatMap((part) => thread(new Path(reversed ? part.slice().reverse() : part, 3), opts));
  const key = ends.key ?? y - 40;
  // Thrown across as the reach passes them.
  const keys: [number, number] = [key, key + 60];
  if (loop) {
    const flip = seed % 2 === 1;
    const over = flip ? loop.l : loop.r;
    const under = flip ? loop.r : loop.l;
    // Where the weft passes over a strand, part the strand first.
    out.push(mark(Kind.Erase, hue, 8, 1, [over, y - 8, over, y + 8], 0, key - 1));
    out.push(...threads({ hue, seed: seed * 11, key: keys }));
    // Where it passes under, cut the weft and lay the strand back over it.
    out.push(mark(Kind.Erase, hue, 9, 1, [under - 6, y, under + 6, y], 0, keys[1] + 1));
    const strandHue: Hue = under === loop.l ? "c" : "m";
    out.push(
      mark(Kind.Stroke, strandHue, THREAD, 1, [under, y - 13, under + 0.6, y, under, y + 13], seed * 13, keys[1] + 2),
    );
  } else {
    out.push(...threads({ hue, seed: seed * 11, key: keys }));
  }
  if (ends.knotL) out.push(...knot(pts[0][0], pts[0][1], 5, seed + 3, reversed ? keys[1] : keys[0]));
  if (ends.knotR) {
    const last = pts[pts.length - 1];
    out.push(...knot(last[0], last[1], 5, seed + 4, reversed ? keys[0] : keys[1]));
  }
  return out;
}

/** The points of a weft across [from, to] at y: a slight sag and tilt, as
 * a thread pulled across by hand lies. */
function weftPoints(from: number, to: number, y: number, seed: number): Pt[] {
  const rand = rng(seed);
  const pts: Pt[] = [];
  const steps = Math.max(2, Math.round((to - from) / 40));
  const tilt = (rand() - 0.5) * 5;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    pts.push([from + (to - from) * u, y + Math.sin(u * Math.PI) * 2.5 + tilt * (u - 0.5) + Math.sin(u * 9 + seed) * 0.8]);
  }
  return pts;
}

/** A weft on a page, as the limbs that grow it (skein.ts grows each off a
 * hion). Across a loop: off its left strand (cyan) across, over or under
 * the right; with words strung on it, a limb in from each strand to the
 * words, each tied off in a knot beside them (the words are written
 * between, spun.ts). Thrown from a hion (`ends.from`): out from it to the
 * words or to its end, knotted there; past the words it does not go on.
 * Anywhere else: grown from the nearest thread to its start, across to the
 * words or to its end. */
function weftLimbs(
  from: number,
  to: number,
  y: number,
  hue: Hue,
  seed: number,
  loop: Loop | undefined,
  ends: { knotL?: boolean; knotR?: boolean; from?: number; key?: number; gap?: [number, number] },
  thrownHue?: Hue,
): Limb[] {
  const key = ends.key ?? y - 40;
  const pts = weftPoints(from, to, y, seed);
  const at = (x: number): Pt => {
    const i = Math.max(1, pts.findIndex((p) => p[0] >= x));
    const [a, b] = [pts[i - 1], pts[i] ?? pts[i - 1]];
    const u = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
    return [x, a[1] + (b[1] - a[1]) * u];
  };
  /** From x0 to x1 along it, whichever way that runs. */
  const span = (x0: number, x1: number): Pt[] => {
    const lo = Math.min(x0, x1);
    const hi = Math.max(x0, x1);
    const part = [at(lo), ...pts.filter((p) => p[0] > lo && p[0] < hi), at(hi)];
    return new Path(x0 <= x1 ? part : part.reverse(), 3).points();
  };
  const { gap } = ends;
  if (loop) {
    const over = seed % 2 === 1;
    const out: Limb[] = [
      {
        hue: "c",
        way: span(loop.l, gap ? gap[0] : to),
        key,
        tied: true,
        knot: !!gap,
        // Across the far strand, under it or over by turns.
        under: !gap && !over ? [loop.r] : undefined,
      },
    ];
    if (gap) out.push({ hue: "m", way: span(loop.r, gap[1]), key: key + 30, tied: true, knot: true });
    return out;
  }
  if (ends.from !== undefined) {
    const x = ends.from;
    const far = Math.abs(x - from) > Math.abs(x - to) ? from : to;
    const end = gap ? (Math.abs(gap[0] - x) < Math.abs(gap[1] - x) ? gap[0] : gap[1]) : far;
    return [{ hue: thrownHue ?? hue, way: span(x, end), key, tied: true, knot: true }];
  }
  return [{ hue, way: span(from, gap ? gap[0] : to), key, tied: false, knot: true }];
}

/** A knot where the two are tied together: a small loop out of the cyan
 * and back through itself. */
function tie(p: Pt, r: number, seed: number): Pt[] {
  const rand = rng(seed);
  const out: Pt[] = [p];
  const a0 = -Math.PI / 2 + (rand() - 0.5) * 0.6;
  const cx = p[0] + Math.cos(a0 + Math.PI) * r * -0.9;
  const cy = p[1] + Math.sin(a0 + Math.PI) * r * -0.9;
  for (let k = 0; k <= 30; k++) {
    const a = a0 + Math.PI + (k / 30) * Math.PI * 2.1;
    out.push([cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.75]);
  }
  return new Path(out, 3).points();
}
