/** Where on a page there's paper with nothing on it. A page is measured once,
 * when it first lies open and still: every line of words, picture and drawing
 * goes onto a coarse grid, and the soldiers camp, talk and shoot only where
 * the grid is empty. Two grids: `room` is padded (a camp or a note needs
 * elbow room), `lane` is tight to the words (a shot may pass between two lines
 * of writing, but never through one). Geometry only, no pixel reads. */

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const CELL = 4;

/** Things on a page that are drawn, stuck or typed, besides the words. */
const SOLID = [
  "img",
  "video",
  "iframe",
  "svg:not(.bp-life svg, .bp-life, .bp-life-ink, .bp-underline, .bp-scribble)",
  ".bp-taped",
  ".bp-note",
  ".bp-slip",
  ".bp-sticky",
  ".bp-keybox",
  ".bp-callout",
  // on the war map, its camps (the old flicks between them are open paper)
  ".bp-camp",
  ".bp-map__legend",
  ".bp-fields",
  ".bp-circled li",
  "pre",
  "table",
  "hr",
  ".bp-return",
  ".bp-label",
  ".bp-belongs",
  "button",
  "input",
].join(",");

export class Space {
  readonly cols: number;
  readonly rows: number;
  private room: Uint8Array;
  private lane: Uint8Array;
  private sat: Int32Array;
  /** Rectangles taken since the measure: camps, notes. */
  taken: Box[] = [];

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.cols = Math.ceil(w / CELL);
    this.rows = Math.ceil(h / CELL);
    this.room = new Uint8Array(this.cols * this.rows);
    this.lane = new Uint8Array(this.cols * this.rows);
    this.sat = new Int32Array((this.cols + 1) * (this.rows + 1));
  }

  private fill(grid: Uint8Array, b: Box) {
    const c0 = Math.max(0, Math.floor(b.x0 / CELL));
    const c1 = Math.min(this.cols - 1, Math.floor(b.x1 / CELL));
    const r0 = Math.max(0, Math.floor(b.y0 / CELL));
    const r1 = Math.min(this.rows - 1, Math.floor(b.y1 / CELL));
    for (let r = r0; r <= r1; r++) grid.fill(1, r * this.cols + c0, r * this.cols + c1 + 1);
  }

  block(b: Box, pad: number, lane: Box | null) {
    this.fill(this.room, { x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad });
    if (lane) this.fill(this.lane, lane);
  }

  /** Done measuring: the summed-area table makes "is this box empty" cheap. */
  seal() {
    const { cols, rows, room, sat } = this;
    const W = cols + 1;
    for (let r = 0; r < rows; r++) {
      let run = 0;
      for (let c = 0; c < cols; c++) {
        run += room[r * cols + c];
        sat[(r + 1) * W + c + 1] = sat[r * W + c + 1] + run;
      }
    }
  }

  /** Is the box on clear paper (and inside the page)? */
  clear(b: Box) {
    if (b.x0 < 0 || b.y0 < 0 || b.x1 > this.w || b.y1 > this.h) return false;
    const W = this.cols + 1;
    const c0 = Math.floor(b.x0 / CELL);
    const r0 = Math.floor(b.y0 / CELL);
    const c1 = Math.min(this.cols, Math.ceil(b.x1 / CELL));
    const r1 = Math.min(this.rows, Math.ceil(b.y1 / CELL));
    const sum = this.sat[r1 * W + c1] - this.sat[r0 * W + c1] - this.sat[r1 * W + c0] + this.sat[r0 * W + c0];
    if (sum > 0) return false;
    return !this.taken.some((t) => t.x0 < b.x1 && t.x1 > b.x0 && t.y0 < b.y1 && t.y1 > b.y0);
  }

  /** Can a line run from a to b without crossing any writing? Points off
   * the page are fine (the page is not this one's to judge). */
  passes(ax: number, ay: number, bx: number, by: number) {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(2, Math.ceil(len / 2));
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const y = ay + ((by - ay) * i) / n;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
      if (this.lane[Math.floor(y / CELL) * this.cols + Math.floor(x / CELL)]) return false;
    }
    return true;
  }
}

/** Measure an open page: its words line by line, and everything solid on it.
 * `others` are things lying over the page that aren't part of it (the turning
 * corners, the sticky tabs). */
export function measurePage(page: HTMLElement, others: Element[], skip: Element[] = []): Space {
  const P = page.getBoundingClientRect();
  const space = new Space(P.width, P.height);
  const local = (r: DOMRect): Box => ({
    x0: r.left - P.left,
    y0: r.top - P.top,
    x1: r.right - P.left,
    y1: r.bottom - P.top,
  });
  const skipped = (n: Node) => {
    const el = n instanceof Element ? n : n.parentElement;
    return !el || skip.some((s) => s.contains(el)) || !!el.closest(".bp-sr, .bp-life, [hidden]");
  };

  // the words, one line box at a time
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim() || skipped(n)) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      const b = local(r);
      // the ink of a handwritten line sits in the middle of its box
      const trim = (b.y1 - b.y0) * 0.14;
      space.block(b, 5, { x0: b.x0 - 2, y0: b.y0 + trim, x1: b.x1 + 2, y1: b.y1 - trim * 0.7 });
    }
  }
  for (const el of page.querySelectorAll(SOLID)) {
    if (skipped(el)) continue;
    for (const r of el.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      const b = local(r);
      space.block(b, 6, b);
    }
  }
  for (const el of others) {
    for (const r of el.getClientRects()) {
      const b = local(r);
      if (b.x1 < 0 || b.y1 < 0 || b.x0 > P.width || b.y0 > P.height) continue;
      space.block(b, 6, null);
    }
  }
  space.seal();
  return space;
}
