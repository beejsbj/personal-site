/** The timeline as a free thread (an experiment): the resume's roles are
 * not stacked down the page nor strung along a track, but laid where a
 * thread dropped across a table would carry them, and the window follows
 * the thread as you scroll.
 *
 * The table. The roles keep their reading order (newest first) and their
 * place in the DOM; only where they lie changes. From the group's knot
 * the way sets off east; at each role it turns by an amount read from the
 * content (the longer a role's record, the wider the turn), two turns one
 * way and two the other, so it meanders rather than spirals. Each role is
 * travelled straight through along one of the four ways the page has
 * (east, south, west, north: the one nearest the way it was reached, but
 * never straight back), so its text stays upright and the two hions part
 * round it as they do round any loop. A role is put as near as it can be
 * along its heading without touching what is already down; the legs
 * between are curves that leave and arrive square to the roles.
 *
 * The camera. The page's height is the length of the way: scrolling one
 * pixel moves the camera one pixel along it (the way smoothed a little, so
 * the window glides round a turn rather than snapping), and the camera
 * keeps the point it has reached in the middle of the window. Nothing is
 * eased in time: what you see is always exactly where you have scrolled,
 * so reduced motion needs nothing more than a settled drawing.
 *
 * The drawing. The way is composed here (weave.ts's pieces, turned to
 * each role's way of travel), keyed by distance along the way, and laid
 * on a sheet of square tiles kept only round the camera (a page's loom
 * reads one way only; this one reads along a path in two).
 *
 * Phones keep the timeline across (track.ts): a window a role fills has
 * no room to show the way turning, only to swing about. */
import { dancer, orbit, TEMPER } from "./dance";
import {
  cubic,
  type Hue,
  Kind,
  knot,
  type Mark,
  paint,
  paintGlow,
  Path,
  patterns,
  type Patterns,
  type Pt,
  thread,
} from "./pastel";
import { type Box, type Loop, looseFibres, looseLoop, strandPoints, weft } from "./weave";

/** When the timeline is laid free (otherwise it runs across). */
export const FREE = "(min-width: 720px) and (min-height: 520px)";

interface FreeOptions {
  section: HTMLElement;
  signal: AbortSignal;
  instant: boolean;
  face: boolean;
  isIdle(): boolean;
  onIdleChange(listener: (idle: boolean) => void): void;
}

/** The four ways a role can be travelled: east, south, west, north. */
type Way = 0 | 1 | 2 | 3;
const UNIT: Pt[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const WAY_NAME = ["e", "s", "w", "n"];
const DEG = Math.PI / 180;

/** Clear space kept round each role, and the shortest leg between two. */
const MARGIN = 80;
const LEG = 250;

interface Station {
  el: HTMLElement;
  box: Box;
  way: Way;
  entry: Pt;
  exit: Pt;
  /** Along the way: where the hions reach it, and leave it. */
  s0: number;
  s1: number;
}

const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const overlaps = (a: Box, b: Box, pad: number) =>
  a.l < b.r + pad && b.l < a.r + pad && a.t < b.b + pad && b.t < a.b + pad;

/** Where something lies on the table (laid out, not moved by the camera). */
function within(el: HTMLElement, table: HTMLElement): Box {
  let x = 0;
  let y = 0;
  for (let node: HTMLElement | null = el; node && node !== table; node = node.offsetParent as HTMLElement | null) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight };
}

/** A role's own frame: along (the way it is travelled, from its entry)
 * and across (cyan's side negative). Composed in it as if it read down. */
function frame(station: Station) {
  const u = UNIT[station.way];
  const across: Pt = station.way % 2 === 0 ? [0, 1] : [1, 0];
  const [ex, ey] = station.entry;
  return {
    toWorld: ([x, y]: Pt): Pt => [ex + u[0] * y + across[0] * x, ey + u[1] * y + across[1] * x],
    toLocal: ([x, y]: Pt): Pt => {
      const dx = x - ex;
      const dy = y - ey;
      return [dx * across[0] + dy * across[1], dx * u[0] + dy * u[1]];
    },
  };
}

function boxToLocal(box: Box, toLocal: (p: Pt) => Pt): Box {
  const a = toLocal([box.l, box.t]);
  const b = toLocal([box.r, box.b]);
  return { l: Math.min(a[0], b[0]), r: Math.max(a[0], b[0]), t: Math.min(a[1], b[1]), b: Math.max(a[1], b[1]) };
}

/* ---------- The sheet: square tiles round the camera ---------- */

const TILE = 512;
const GLOW = 0.25;

interface Tile {
  el: HTMLElement;
  ctx: CanvasRenderingContext2D;
  gctx: CanvasRenderingContext2D;
  pats: Patterns;
  /** Next of this tile's marks still to lay. */
  cursor: number;
  i: number;
  j: number;
}

interface Drawing {
  marks: Mark[];
  tips: { hue: Hue; points: Pt[]; keys: Float64Array }[];
  /** How long the drawing is, in keys. */
  total: number;
  width: number;
  height: number;
}

export function createFree(options: FreeOptions) {
  const { section, signal, instant } = options;
  const pin = section.querySelector<HTMLElement>(".hion-timeline__pin")!;
  const table = section.querySelector<HTMLElement>(".hion-timeline__track")!;
  const group = table.querySelector<HTMLElement>(".hion-resume__group")!;
  const groupKnot = group.querySelector<HTMLElement>("[data-spine='knot']");
  const roles = [...table.querySelectorAll<HTMLElement>(".hion-loop--role")];
  section.dataset.timeline = "free";
  section.dataset.spine = "gap";
  section.setAttribute("data-cloth-hold", "");
  // Its own drawing: the page's loom and weave leave what is on it alone.
  table.dataset.loom = "free";

  /* ---- Laying the table ---- */

  let stations: Station[] = [];
  /** The way, as the camera follows it, and its length. */
  let way = new Path([[0, 0]]);
  let camera: Float32Array = new Float32Array(2);
  const CAM_STEP = 4;
  let length = 0;
  let top = 0;
  let drawing: Drawing = { marks: [], tips: [], total: 0, width: 0, height: 0 };
  let start: Pt = [0, 0];
  let finish: Pt = [0, 0];

  /** How wide each turn is: read from how much a role holds. */
  function headings() {
    const sizes = roles.map((role) => role.textContent?.length ?? 0);
    const most = Math.max(1, ...sizes);
    const out: number[] = [0];
    for (let i = 1; i <= roles.length; i++) {
      const sign = Math.floor((i - 1) / 2) % 2 ? -1 : 1;
      const size = sizes[i - 1] / most;
      out.push(out[i - 1] + sign * (52 + 30 * size) * DEG);
    }
    return out;
  }

  /** The nearest of the four ways to a heading, never straight back. */
  function wayOf(heading: number, from: Way): Way {
    const ranked = ([0, 1, 2, 3] as Way[])
      .filter((w) => w !== (from + 2) % 4)
      .sort((a, b) => angleBetween(heading, a * 90 * DEG) - angleBetween(heading, b * 90 * DEG));
    return ranked[0];
  }
  const angleBetween = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

  /** A heading held within 60 degrees of the way it leaves along. */
  function steer(heading: number, from: Way) {
    const base = from * 90 * DEG;
    const off = Math.atan2(Math.sin(heading - base), Math.cos(heading - base));
    return base + Math.max(-60 * DEG, Math.min(60 * DEG, off));
  }

  /** A role as narrow as it can be while it stands in the window, the
   * way it is travelled: across, it must fit the height; down, the width. */
  function fit(role: HTMLElement, way: Way) {
    role.style.removeProperty("width");
    const tall = pin.clientHeight * 0.78;
    const wide = pin.clientWidth * 0.86;
    let width = role.offsetWidth;
    if (width > wide) role.style.width = `${(width = Math.round(wide))}px`;
    if (way % 2 === 0) {
      while (role.offsetHeight > tall && width < wide) {
        width = Math.min(wide, width + 60);
        role.style.width = `${width}px`;
      }
    }
  }

  function layOut() {
    const H = pin.clientHeight;
    for (const el of [group, ...roles]) {
      el.style.left = "0px";
      el.style.top = "0px";
    }
    const groupBox: Box = { l: 0, t: 0, r: group.offsetWidth, b: group.offsetHeight };
    const k = groupKnot ? within(groupKnot, table) : { l: groupBox.r, t: groupBox.b / 2, r: groupBox.r, b: groupBox.b / 2 };
    const knotAt: Pt = [(k.l + k.r) / 2, (k.t + k.b) / 2];
    const placed: Box[] = [groupBox];
    const heads = headings();
    const spine: Pt[] = [knotAt];
    const legs: Pt[][] = [];
    stations = [];
    let from: Pt = knotAt;
    let fromWay: Way = 0;
    roles.forEach((role, i) => {
      const heading = steer(heads[i], fromWay);
      const w = wayOf(heading, fromWay);
      role.dataset.travel = WAY_NAME[w];
      fit(role, w);
      const rw = role.offsetWidth;
      const rh = role.offsetHeight;
      const u = UNIT[w];
      const dir: Pt = [Math.cos(heading), Math.sin(heading)];
      let entry: Pt = from;
      let box: Box = groupBox;
      for (let d = LEG, tries = 0; tries < 60; d += 40, tries++) {
        entry = add(from, dir, d);
        // The box behind its entry: entered at the middle of one side.
        const along = w % 2 === 0 ? rw : rh;
        const exit = add(entry, u, along);
        const cx = (entry[0] + exit[0]) / 2;
        const cy = (entry[1] + exit[1]) / 2;
        box = { l: cx - rw / 2, t: cy - rh / 2, r: cx + rw / 2, b: cy + rh / 2 };
        if (!placed.some((p) => overlaps(p, box, MARGIN))) break;
      }
      placed.push(box);
      const along = w % 2 === 0 ? rw : rh;
      const exit = add(entry, u, along);
      const fromU = UNIT[fromWay];
      const chord = Math.hypot(entry[0] - from[0], entry[1] - from[1]);
      const leg = cubic(from, add(from, fromU, chord * 0.45), add(entry, u, -chord * 0.45), entry, 40);
      legs.push(leg);
      spine.push(...leg.slice(1), exit);
      stations.push({ el: role, box, way: w, entry, exit, s0: 0, s1: 0 });
      from = exit;
      fromWay = w;
    });
    // Out: on a little, then down off the foot of the window.
    const outHeading = steer(heads[roles.length] ?? 0, fromWay);
    const outDir: Pt = [Math.cos(outHeading), Math.sin(outHeading)];
    const end = add(from, outDir, 260);
    const lastLeg = cubic(from, add(from, UNIT[fromWay], 110), add(end, outDir, -110), end, 30);
    spine.push(...lastLeg.slice(1));
    start = [knotAt[0], knotAt[1] - H / 2 - 40];
    finish = [end[0], end[1] + H / 2 + 40];

    // Move it all clear of the table's edges.
    const xs = [...placed.flatMap((b) => [b.l, b.r]), ...spine.map((p) => p[0])];
    const ys = [...placed.flatMap((b) => [b.t, b.b]), ...spine.map((p) => p[1]), start[1], finish[1]];
    const pad = 200;
    const dx = pad - Math.min(...xs);
    const dy = pad - Math.min(...ys);
    const shift = (p: Pt): Pt => [p[0] + dx, p[1] + dy];
    const shiftBox = (b: Box): Box => ({ l: b.l + dx, r: b.r + dx, t: b.t + dy, b: b.b + dy });
    group.style.left = `${dx}px`;
    group.style.top = `${dy}px`;
    for (const st of stations) {
      st.box = shiftBox(st.box);
      st.entry = shift(st.entry);
      st.exit = shift(st.exit);
      st.el.style.left = `${st.box.l}px`;
      st.el.style.top = `${st.box.t}px`;
    }
    start = shift(start);
    finish = shift(finish);
    const width = Math.max(...xs) + dx + pad;
    const height = Math.max(...ys) + dy + pad;
    table.style.width = `${Math.ceil(width)}px`;
    table.style.height = `${Math.ceil(height)}px`;

    way = new Path(spine.map(shift), 3);
    length = way.length;
    // Where along the way each role is reached and left.
    for (const st of stations) {
      st.s0 = nearest(way, st.entry);
      st.s1 = nearest(way, st.exit);
    }
    // The camera: the way, smoothed over a short reach either side (less
    // near its ends, so it starts and stops exactly on the way).
    const count = Math.ceil(length / CAM_STEP) + 1;
    camera = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const s = Math.min(length, i * CAM_STEP);
      const reach = Math.min(220, s, length - s);
      let x = 0;
      let y = 0;
      for (let k = -4; k <= 4; k++) {
        const [px, py] = way.at(s + (reach * k) / 4);
        x += px;
        y += py;
      }
      camera[i * 2] = x / 9;
      camera[i * 2 + 1] = y / 9;
    }
    return {
      legs: legs.map((leg) => leg.map(shift)),
      knot: shift(knotAt),
      last: { from: shift(from), fromWay, end: shift(end), outDir },
      width,
      height,
    };
  }

  /* ---- Composing the drawing ---- */

  function composeFree(laid: ReturnType<typeof layOut>): Drawing {
    const marks: Mark[] = [];
    const H = pin.clientHeight;
    let seed = 3;
    const journey: Record<Hue, Pt[]> = { c: [], m: [] };
    const keys: Record<Hue, number[]> = { c: [], m: [] };
    const push = (hue: Hue, pts: Pt[], key: (k: number, p: Pt) => number) => {
      pts.forEach((p, k) => {
        journey[hue].push(p);
        keys[hue].push(key(k, p));
      });
    };

    // In from above, down to the knot.
    const into = new Path(cubic(start, add(start, [0, 1], 160), add(laid.knot, [0, -1], 90), laid.knot, 30), 3);
    // Each run of the way between stations, with where it is along the way.
    const runs: { centre: Path; s0: number; to?: Station; knots: number }[] = [
      { centre: into, s0: -into.length, knots: 1 },
    ];
    laid.legs.forEach((leg, i) => {
      const from = i === 0 ? 0 : stations[i - 1].s1;
      runs.push({ centre: new Path(leg, 3), s0: from, to: stations[i], knots: i === 0 ? 1 : 0 });
    });
    const { from, fromWay, end, outDir } = laid.last;
    const outPts = [
      ...cubic(from, add(from, UNIT[fromWay], 110), add(end, outDir, -110), end, 30),
      ...cubic(end, add(end, outDir, 90), add(finish, [0, -1], 160), finish, 30).slice(1),
    ];
    runs.push({ centre: new Path(outPts, 3), s0: stations.at(-1)?.s1 ?? 0, knots: 0 });

    runs.forEach(({ centre, s0, to, knots }, i) => {
      if (centre.length < 6) return;
      const room = knots ? 0.5 : 1;
      for (const hue of ["c", "m"] as Hue[]) {
        let pts = dancer(centre, hue, { scale: room, seed: i * 13 + 5 });
        let ks = pts.map((_, k) => s0 + Math.min(k * 3, centre.length));
        // The years before a role: one of the two circles them on its way in.
        const years = to?.el.querySelector<HTMLElement>(`[data-orbit="${hue}"]`);
        if (to && years) {
          const { toLocal, toWorld } = frame(to);
          const local = pts.map(toLocal);
          const box = boxToLocal(within(years, table), toLocal);
          const found = orbit(local, box, hue === "c" ? -1 : 1, seed++, [34, 30]);
          if (found) {
            const at = ks[found.from] ?? s0;
            const span = found.to - found.from;
            pts = found.points.map(toWorld);
            ks = [
              ...ks.slice(0, found.from),
              ...Array.from({ length: span }, (_, j) => at + (80 * j) / span),
              ...ks.slice(found.from).map((k) => Math.max(k, at + 80)),
            ];
          }
        }
        push(hue, pts, (k) => ks[k]);
        if (to) {
          const { toWorld } = frame(to);
          const loop = localLoop(to);
          const keyOf = ([, y]: Pt) => to.s0 + Math.max(0, Math.min(to.s1 - to.s0, y));
          if (hue === "c") push(hue, looseLoop(loop.entry, -1, 15, seed + 1).map(toWorld), () => to.s0);
          const strand = strandPoints(loop, hue, seed);
          push(hue, strand.map(toWorld), (k) => keyOf(strand[k]));
          if (hue === "m") push(hue, looseLoop(loop.exit, 1, 17, seed + 2).map(toWorld), () => to.s1);
        }
      }
      seed += 7;
    });

    // Each hue's whole journey, one thread, drawn as the camera reaches it.
    const tips: Drawing["tips"] = [];
    for (const hue of ["c", "m"] as Hue[]) {
      const pts = journey[hue];
      if (pts.length < 2) continue;
      const lens = [0];
      for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const ks = new Float64Array(pts.length);
      let high = -Infinity;
      keys[hue].forEach((k, i) => (ks[i] = high = Math.max(high, k)));
      const keyAt = (s: number) => {
        let lo = 0;
        let hi = lens.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (lens[mid] <= s) lo = mid;
          else hi = mid;
        }
        return ks[lo];
      };
      marks.push(...thread(new Path(pts, 3), { hue, w: TEMPER[hue].weight, seed: seed++, key: keyAt, glow: 0.22 }));
      tips.push({ hue, points: pts, keys: ks });
    }
    // The loosened fibres beside each role's strands, turned to its way.
    for (const st of stations) {
      const { toWorld } = frame(st);
      for (const m of looseFibres(localLoop(st), seed)) marks.push(turnMark(m, toWorld, st.s0));
      seed += 10;
    }
    // The knot the two are tied at, under the group's heading.
    marks.push(...knot(laid.knot[0], laid.knot[1], 9, seed++, -30));
    // Headings strung on wefts level with their words.
    let wi = 0;
    for (const el of table.querySelectorAll<HTMLElement>("[data-weft]")) {
      const b = within(el.querySelector<HTMLElement>(".hion-strung__box") ?? el, table);
      const y = firstLineMiddle(el, b);
      const st = stations.find((s) => s.el.contains(el));
      const key = st ? st.s0 + 20 : -20;
      marks.push(...weft(b.l - 36, b.r + 36, y, wi++ % 2 ? "c" : "m", seed++, undefined, { knotL: true, knotR: true, key }));
    }
    return { marks, tips, total: length + H / 2 + 60, width: laid.width, height: laid.height };
  }

  function localLoop(st: Station): Loop {
    const { toLocal } = frame(st);
    const b = boxToLocal(st.box, toLocal);
    const flare = Math.min(104, (b.b - b.t) * 0.3, (b.r - b.l) * 0.3);
    return { el: st.el, l: b.l, r: b.r, t: 0, b: b.b, entry: [0, 0], exit: [0, b.b], flare };
  }

  /** Through the waist of a heading's first line. */
  function firstLineMiddle(el: HTMLElement, b: Box) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.height > 4);
    range.detach();
    const box = (el.querySelector(".hion-strung__box") ?? el).getBoundingClientRect();
    const first = rects.reduce<DOMRect | null>((a, r) => (!a || r.top < a.top ? r : a), null);
    if (!first) return (b.t + b.b) / 2;
    return b.t + (first.top - box.top) + first.height * 0.56;
  }

  /* ---- The sheet ---- */

  const layer = document.createElement("div");
  layer.className = "hion-loom hion-loom--free";
  layer.setAttribute("aria-hidden", "true");
  const beads = (["c", "m"] as Hue[]).map((hue) => {
    const el = document.createElement("span");
    el.className = "hion-bead";
    el.dataset.hue = hue;
    layer.append(el);
    return el;
  });
  table.prepend(layer);

  const tiles = new Map<string, Tile>();
  let buckets = new Map<string, number[]>();
  let upto = 0;
  let reach = -Infinity;
  let target = -Infinity;
  let dpr = 1;
  let frameId = 0;
  let last = 0;
  let reveals: { el: HTMLElement; at: number }[] = [];

  function build() {
    const laid = layOut();
    drawing = composeFree(laid);
    drawing.marks.sort((a, b) => a.key - b.key);
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    layer.style.width = `${drawing.width}px`;
    layer.style.height = `${drawing.height}px`;
    buckets = new Map();
    drawing.marks.forEach((m, index) => {
      const pad = m.kind === Kind.Glow ? m.w * 2 + 24 : m.w + 18;
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < m.pts.length; i += 2) {
        x0 = Math.min(x0, m.pts[i]);
        x1 = Math.max(x1, m.pts[i]);
        y0 = Math.min(y0, m.pts[i + 1]);
        y1 = Math.max(y1, m.pts[i + 1]);
      }
      for (let i = Math.floor((x0 - pad) / TILE); i <= Math.floor((x1 + pad) / TILE); i++) {
        for (let j = Math.floor((y0 - pad) / TILE); j <= Math.floor((y1 + pad) / TILE); j++) {
          const key = `${i},${j}`;
          const bucket = buckets.get(key);
          if (bucket) bucket.push(index);
          else buckets.set(key, [index]);
        }
      }
    });
    for (const tile of tiles.values()) tile.el.remove();
    tiles.clear();
    upto = 0;
    reveals = [...table.querySelectorAll<HTMLElement>("[data-reveal]")]
      .map((el) => {
        const st = stations.find((s) => s.el.contains(el));
        return { el, at: st ? st.s0 + 10 : -10 };
      })
      .sort((a, b) => a.at - b.at);
    for (const { el } of reveals) el.removeAttribute("data-lit");
  }

  function makeTile(i: number, j: number): Tile {
    const el = document.createElement("div");
    el.className = "hion-loom__tile";
    const w = Math.min(TILE, drawing.width - i * TILE);
    const h = Math.min(TILE, drawing.height - j * TILE);
    Object.assign(el.style, { left: `${i * TILE}px`, top: `${j * TILE}px`, width: `${w}px`, height: `${h}px` });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    const glow = document.createElement("canvas");
    glow.className = "hion-loom__glow";
    glow.width = Math.ceil(w * GLOW);
    glow.height = Math.ceil(h * GLOW);
    el.append(glow, canvas);
    layer.append(el);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, -i * TILE * dpr, -j * TILE * dpr);
    const gctx = glow.getContext("2d")!;
    gctx.setTransform(GLOW, 0, 0, GLOW, -i * TILE * GLOW, -j * TILE * GLOW);
    return { el, ctx, gctx, pats: patterns(ctx, dpr), cursor: 0, i, j };
  }

  /** Where along the way you are, and where the camera is looking. */
  const along = () => Math.min(length, Math.max(0, scrollY - top));
  function cameraAt(s: number): Pt {
    const f = s / CAM_STEP;
    const i = Math.min(camera.length / 2 - 2, Math.floor(f));
    const t = Math.min(1, f - i);
    return [
      camera[i * 2] + (camera[i * 2 + 2] - camera[i * 2]) * t,
      camera[i * 2 + 1] + (camera[i * 2 + 3] - camera[i * 2 + 1]) * t,
    ];
  }

  /** Keep tiles round what the window shows; drop the rest. */
  function cull() {
    const [cx, cy] = cameraAt(along());
    const W = pin.clientWidth;
    const H = pin.clientHeight;
    const margin = options.face ? 0 : 0.35;
    const i0 = Math.max(0, Math.floor((cx - W * (0.5 + margin)) / TILE));
    const i1 = Math.min(Math.ceil(drawing.width / TILE) - 1, Math.floor((cx + W * (0.5 + margin)) / TILE));
    const j0 = Math.max(0, Math.floor((cy - H * (0.5 + margin)) / TILE));
    const j1 = Math.min(Math.ceil(drawing.height / TILE) - 1, Math.floor((cy + H * (0.5 + margin)) / TILE));
    for (const [key, tile] of tiles) {
      if (tile.i < i0 - 1 || tile.i > i1 + 1 || tile.j < j0 - 1 || tile.j > j1 + 1) {
        tile.el.remove();
        tiles.delete(key);
      }
    }
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const key = `${i},${j}`;
        if (!tiles.has(key)) tiles.set(key, makeTile(i, j));
      }
    }
  }

  /** Lay what is due on each tile, nearest the camera first. */
  function fill(deadline: number) {
    const [cx, cy] = cameraAt(along());
    const order = [...tiles.entries()].sort(
      ([, a], [, b]) =>
        Math.hypot((a.i + 0.5) * TILE - cx, (a.j + 0.5) * TILE - cy) -
        Math.hypot((b.i + 0.5) * TILE - cx, (b.j + 0.5) * TILE - cy),
    );
    let behind = false;
    for (const [key, tile] of order) {
      const bucket = buckets.get(key) ?? [];
      while (tile.cursor < bucket.length && bucket[tile.cursor] < upto) {
        if (performance.now() > deadline) return true;
        const m = drawing.marks[bucket[tile.cursor++]];
        if (m.kind === Kind.Glow) paintGlow(tile.gctx, m);
        else paint(tile.ctx, m, tile.pats);
      }
      if (tile.cursor < bucket.length && bucket[tile.cursor] < upto) behind = true;
    }
    return behind;
  }

  function advance(to: number) {
    reach = to;
    const { marks } = drawing;
    while (upto < marks.length && marks[upto].key <= reach) upto++;
    while (reveals.length && reveals[0].at <= reach) reveals.shift()!.el.setAttribute("data-lit", "");
    beads.forEach((bead, i) => {
      const tip = drawing.tips.find((t) => t.hue === (i ? "m" : "c"));
      if (!tip || instant || reach >= drawing.total - 1) {
        bead.dataset.state = "gone";
        return;
      }
      let lo = 0;
      let hi = tip.keys.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (tip.keys[mid] <= reach) lo = mid;
        else hi = mid;
      }
      const [x, y] = tip.points[lo];
      bead.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      bead.dataset.state = reach >= target - 1 ? "resting" : "drawing";
    });
  }

  function aim() {
    const rect = pin.getBoundingClientRect();
    if (!instant && !(rect.top < innerHeight && rect.bottom > 0)) return;
    const ahead = (pin.clientWidth + pin.clientHeight) * 0.5;
    target = instant ? drawing.total + 1 : Math.max(target, Math.min(drawing.total + 1, along() + ahead));
  }

  function tick(now: number) {
    frameId = 0;
    if (options.isIdle()) return;
    const deadline = performance.now() + 7;
    const dt = Math.min(64, now - (last || now));
    last = now;
    if (reach === -Infinity) reach = -pin.clientHeight / 2 - 80;
    let gap = target - reach;
    const size = pin.clientWidth + pin.clientHeight;
    if (gap > size * 1.2) {
      advance(target - size * 0.8);
      gap = target - reach;
    }
    if (gap > 0.5) advance(Math.min(target, reach + (0.45 + gap / 450) * dt));
    else {
      last = 0;
      advance(target);
    }
    const behind = fill(deadline);
    if (gap > 0.5 || behind) frameId = requestAnimationFrame(tick);
    else last = 0;
  }

  function wake() {
    if (!frameId && !options.isIdle()) frameId = requestAnimationFrame(tick);
  }

  /** Point the camera at where you have scrolled to. */
  function look() {
    const [cx, cy] = cameraAt(along());
    table.style.transform = `translate3d(${(pin.clientWidth / 2 - cx).toFixed(1)}px, ${(pin.clientHeight / 2 - cy).toFixed(1)}px, 0)`;
  }

  function measure() {
    build();
    section.style.height = `${Math.round(length + pin.clientHeight)}px`;
    top = section.getBoundingClientRect().top + scrollY;
    // The page's threads go in at the top of the window, over the knot,
    // and come out at its foot under where these leave.
    const pinLeft = pin.getBoundingClientRect().left - section.getBoundingClientRect().left;
    const sectionWidth = section.offsetWidth || pin.clientWidth;
    const atStart = cameraAt(0);
    const atEnd = cameraAt(length);
    section.dataset.entry = ((pinLeft + start[0] - atStart[0] + pin.clientWidth / 2) / sectionWidth).toFixed(4);
    section.dataset.exit = ((pinLeft + finish[0] - atEnd[0] + pin.clientWidth / 2) / sectionWidth).toFixed(4);
    look();
    cull();
    aim();
    if (instant) {
      advance(target);
      fill(Infinity);
    }
  }

  function onScroll() {
    look();
    cull();
    aim();
    if (instant) {
      advance(target);
      fill(Infinity);
    } else wake();
  }

  /** Step along the way (a scroll of the page), stopping at its ends. */
  function step(by: number) {
    const to = Math.min(length, Math.max(0, along() + by));
    scrollTo({ top: Math.round(top + to), behavior: instant ? "instant" : "smooth" });
  }

  const pinned = () => scrollY >= top - 1 && scrollY <= top + length + 1;

  /** Where along the way the camera looks most squarely at a point. */
  function sFor([x, y]: Pt) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < camera.length / 2; i++) {
      const d = Math.hypot(camera[i * 2] - x, camera[i * 2 + 1] - y);
      if (d < bestD) {
        bestD = d;
        best = i * CAM_STEP;
      }
    }
    return Math.min(length, best);
  }

  options.onIdleChange((idle) => {
    if (!idle) wake();
  });

  return {
    start() {
      measure();
      wake();
      addEventListener("scroll", onScroll, { passive: true, signal });
      let resizing = 0;
      let seen = `${pin.clientWidth}x${pin.clientHeight}`;
      const again = () => {
        cancelAnimationFrame(resizing);
        resizing = requestAnimationFrame(() => {
          const size = `${pin.clientWidth}x${pin.clientHeight}`;
          if (size !== seen) {
            seen = size;
            const kept = reach;
            measure();
            advance(Math.min(kept, target));
            fill(Infinity);
            wake();
          } else top = section.getBoundingClientRect().top + scrollY;
        });
      };
      addEventListener("resize", again, { passive: true, signal });
      // Things above it settling (woven words, fonts) move where it starts.
      const watch = new ResizeObserver(again);
      watch.observe(section.parentElement ?? section);
      signal.addEventListener("abort", () => {
        watch.disconnect();
        cancelAnimationFrame(resizing);
        cancelAnimationFrame(frameId);
      });
      // A sideways swipe on a trackpad reads along the way, as on the track.
      pin.addEventListener(
        "wheel",
        (event) => {
          if (!pinned() || event.ctrlKey) return;
          if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
          const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? innerHeight : 1;
          scrollBy({ top: event.deltaX * unit, behavior: "instant" });
        },
        { passive: true, signal },
      );
      // Left and right step along the way while it is pinned.
      addEventListener(
        "keydown",
        (event) => {
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          const el = event.target as HTMLElement | null;
          if (el?.closest("input, textarea, select, [contenteditable]")) return;
          if (!pinned()) return;
          const forward = event.key === "ArrowRight";
          const now = along();
          if (forward ? now >= length - 1 : now <= 1) return;
          event.preventDefault();
          step((forward ? 1 : -1) * pin.clientWidth * 0.45);
        },
        { signal },
      );
      // Focus on something out of the window: scroll to where the camera
      // looks at it (the pin clips, so the browser cannot bring it in).
      table.addEventListener(
        "focusin",
        (event) => {
          const el = event.target as HTMLElement;
          requestAnimationFrame(() => {
            const box = el.getBoundingClientRect();
            const view = pin.getBoundingClientRect();
            const inSight =
              pinned() &&
              box.left >= view.left + 24 &&
              box.right <= view.right - 24 &&
              box.top >= view.top + 24 &&
              box.bottom <= view.bottom - 24;
            if (inSight) return;
            const b = within(el, table);
            const to = sFor([(b.l + b.r) / 2, (b.t + b.b) / 2]);
            scrollTo({ top: Math.round(top + to), behavior: "instant" });
            target = Math.max(target, to + pin.clientWidth);
            wake();
          });
        },
        { signal },
      );
    },
    /** Leaving: hold the pin where it is while the page reels up. */
    release() {
      pin.style.position = "relative";
      pin.style.top = `${along()}px`;
      layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: "ease-in", fill: "forwards" });
      cancelAnimationFrame(frameId);
      frameId = 0;
    },
  };
}

/** Where along a path a point lies (the nearest sample). */
function nearest(path: Path, [x, y]: Pt) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < path.count; i++) {
    const d = (path.xs[i] - x) ** 2 + (path.ys[i] - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = path.ls[i];
    }
  }
  return best;
}

/** A mark composed in a role's own frame, laid on the table: its points
 * turned to the role's way, its key (a distance into the role) moved on to
 * where the role is along the way. */
function turnMark(m: Mark, toWorld: (p: Pt) => Pt, s0: number): Mark {
  const pts = new Array<number>(m.pts.length);
  for (let i = 0; i < m.pts.length; i += 2) {
    const [x, y] = toWorld([m.pts[i], m.pts[i + 1]]);
    pts[i] = x;
    pts[i + 1] = y;
  }
  return { ...m, pts, key: s0 + Math.max(0, m.key) };
}
