/** Immigration: a two-species Game of Life, on the crossings of a cloth.
 *
 * A weave is already a binary grid: at every crossing of warp and weft one
 * thread lies on top. Here each crossing is a cell, and a live cell is a
 * hion thread showing there, cyan or magenta. The rules are Conway's (born
 * on three neighbours, surviving on two or three); a newborn takes the
 * colour most of its three parents have, and a survivor keeps its own.
 *
 * Pure data, no DOM: two typed arrays, swapped each generation. Inside,
 * the grid has a border of empty cells all round (so no bounds checks), and
 * cyan is stored as 1 and magenta as 16, so one sum of the eight neighbours
 * counts both species at once. */

export type Species = 1 | 2;

const C = 1;
const M = 16;
const STORE = [0, C, M] as const;

export class Immigration {
  readonly w: number;
  readonly h: number;
  /** Row stride of the padded grid. */
  private readonly s: number;
  private cells: Uint8Array;
  /** Two generations ago until a step writes into it. */
  private back: Uint8Array;
  /** Which species have ever lived at each crossing (bit 1 cyan, bit 2
   * magenta): the cloth they have woven. Unpadded, x + y * w. */
  readonly woven: Uint8Array;
  generation = 0;
  /** Cells that changed in the last step (as x + y * w), and how many. */
  readonly changed: Int32Array;
  changes = 0;
  /** The last step only repeated the generation before last: everything
   * left is still or blinking. */
  settled = false;
  /** Live cells, after the last step. */
  population = 0;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.s = w + 2;
    const n = (w + 2) * (h + 2);
    this.cells = new Uint8Array(n);
    this.back = new Uint8Array(n);
    this.woven = new Uint8Array(w * h);
    this.fresh = new Int32Array(w * h);
    this.changed = new Int32Array(w * h);
  }

  /** The live generation as stored, for a fast reader: padded by one
   * empty crossing all round (x, y is at (y + 1) * stride + x + 1), cyan as
   * 1 and magenta as 16. Swapped each step: ask again after one. */
  grid() {
    return { cells: this.cells, stride: this.s };
  }

  /** 0 empty, 1 cyan, 2 magenta. */
  at(x: number, y: number): 0 | Species {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    const v = this.cells[(y + 1) * this.s + x + 1];
    return v === C ? 1 : v === M ? 2 : 0;
  }

  /** Bring a cell to life (or clear it). */
  set(x: number, y: number, value: 0 | Species) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const i = (y + 1) * this.s + x + 1;
    this.cells[i] = STORE[value];
    return true;
  }

  /** Crossings whose ground gained a colour in the last step (x + y * w),
   * and how many. */
  readonly fresh: Int32Array;
  freshes = 0;

  /** Weave a crossing of the ground by hand (bits as in `woven`). True if
   * it gained a colour. */
  weave(x: number, y: number, bits: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const i = y * this.w + x;
    const was = this.woven[i];
    this.woven[i] |= bits;
    return this.woven[i] !== was;
  }

  /** One generation. Returns how many cells changed. */
  step() {
    const { w, h, s, cells, woven, fresh } = this;
    const next = this.back;
    const changed = this.changed;
    let changes = 0;
    let freshes = 0;
    let repeat = true;
    let population = 0;
    for (let y = 1; y <= h; y++) {
      let i = y * s + 1;
      // A running window: the column sums left of, at, and right of x.
      let left = cells[i - s - 1] + cells[i - 1] + cells[i + s - 1];
      let mid = cells[i - s] + cells[i] + cells[i + s];
      for (let x = 0; x < w; x++, i++) {
        const right = cells[i - s + 1] + cells[i + 1] + cells[i + s + 1];
        const was = cells[i];
        const sum = left + mid + right - was;
        left = mid;
        mid = right;
        const c = sum & 15;
        const m = sum >> 4;
        const n = c + m;
        let now = 0;
        if (was) now = n === 2 || n === 3 ? was : 0;
        else if (n === 3) now = c > m ? C : M;
        if (now !== next[i]) repeat = false;
        next[i] = now;
        if (now !== was) {
          const at = (y - 1) * w + x;
          changed[changes++] = at;
          if (now) {
            const bit = now === C ? 1 : 2;
            if (!(woven[at] & bit)) {
              woven[at] |= bit;
              fresh[freshes++] = at;
            }
          }
        }
        if (now) population++;
      }
    }
    this.back = cells;
    this.cells = next;
    this.changes = changes;
    this.freshes = freshes;
    this.settled = repeat;
    this.population = population;
    this.generation++;
    return changes;
  }
}
