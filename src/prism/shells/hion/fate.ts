/** Fate: the rule the cloth lives by (cloth.ts). Every thread grows only
 * from its front.
 *
 * Two layers, warp (vertical) and weft (horizontal), on a grid of cells;
 * every live cell is a piece of one fibre with a colour and a heading;
 * births happen only at a fibre's front, deaths only at its tail.
 *
 *  - A weft floats across the warp. Where there is no more warp ahead
 *    within a float (`run`), it turns up or down round the selvedge,
 *    toward the side with more free warp; on a tie it takes its UP bit and
 *    flips it, so ties alternate. Warps let off up to `warpRun` past their
 *    last crossing.
 *  - A stalled front throws a fibre of the other layer, in the other
 *    colour, if the ground round it is lonely enough. Warps are thrown in
 *    pairs, and a warp may be drawn through three stacked wefts beside one
 *    other warp, never a third.
 *  - Nothing lasts. A swatch that has been still for `quiet` generations
 *    (activity spreads through occupied 8x8 blocks, fading per block, so
 *    "still" means the whole connected piece) unpicks from its oldest held
 *    tail: that tail dies and lights a fuse in the next cell of its fibre,
 *    which burns one cell every `fuse` generations, to the threads woven
 *    with it. Freed warps fray, lonely tips sprout, and the cloth is
 *    rewoven somewhere else. There is no randomness in the rule.
 *  - Held cells (words) are walls: wefts stop and turn at their last warp,
 *    warps that run into one turn round beside themselves.
 *  - A tap on bare ground throws a shuttle (a short weft and two pairs of
 *    warp ahead of it); on cloth it lights the fuse there.
 *
 * Sleep is exact: a generation reads the old state, queues births and
 * deaths, and applies them; only fibre ends are looked at (interior cells
 * cannot change), and an end in a 4x4 block with no change within reach
 * for 8 generations is skipped, which never changes the outcome. State is
 * one byte per layer cell (colour, heading, turn, fuse, spent), with yarn,
 * tail age and birth generation alongside.
 *
 * Ported from the round 3/4 "fate" prototype; its health harness (20 seeds,
 * 3000 generations, 80x400: about 41% cover, no drift) and the exact-sleep
 * check were run against this tuning there. */

export type Layer = 0 | 1;

const SP = 3;
const NEG = 4;
const TURNED = 8; // grew round a turn from a side neighbour
const TPLUS = 16; // ... that side neighbour is at +perp (else -perp)
const UP = 32; // turn preference on a tie (weft: up, warp: left); flips on each tie
const UNPICK = 64; // the fuse is lit here
const SPENT = 128; // has thrown its last sprout
const WALL = 255; // border and held cells (SP is never 3, so never a live state)
const B = 8; // activity block size (quiet, unpick)
const SB = 4; // sleep block size: no decision reads further than this

/** The tuning: long floats and let-off, so threads run long and taut;
 * short weft yarn and lonely sprouts, so the cloth stays open. */
const P = {
  /** longest weft float past the last crossing */
  run: 6,
  /** warp let-off past its last crossing */
  warpRun: 5,
  /** generations an uncrossed tail lasts before it frays (warp, weft) */
  warpAge: 6,
  weftAge: 0,
  /** generations a tail held only by a loose crossing lasts */
  fray: 3,
  warpYarn: 20,
  weftYarn: 35,
  /** yarn a sprout costs its parent */
  cost: 3,
  /** a sprout needs at most this many live cells in the 5x5 around */
  lonely: 4,
  /** generations a swatch must be still before it unpicks */
  quiet: 60,
  /** activity lost per block of distance */
  fade: 30,
  /** a lit fuse burns one cell every `fuse` generations */
  fuse: 2,
  /** the fire spreads only to cells born within this many generations of the burning one */
  kin: 8,
  /** a burned cell stays empty this many generations */
  ash: 40,
  /** how far a turning shuttle looks along each side for free warp */
  look: 4,
};

/** One fibre, traced tail to tip, for the painter. */
export interface Fibre {
  L: Layer;
  /** 1 cyan, 2 magenta */
  sp: number;
  /** cells tail to tip, as x + y * w */
  cells: number[];
  /** turn[k]: cells[k] -> cells[k + 1] goes round a turn */
  turn: boolean[];
  /** neg[k]: cells[k] heads toward -axis (up for a warp, left for a weft) */
  neg: boolean[];
  /** the tip can still grow (has yarn) */
  live: boolean;
}

const isLive = (v: number) => v !== 0 && v !== WALL;

export class Fate {
  readonly w: number;
  readonly h: number;
  readonly s: number;
  readonly c: [Uint8Array, Uint8Array];
  private yarn: [Uint8Array, Uint8Array];
  private ta: [Uint8Array, Uint8Array];
  readonly born: [Int32Array, Int32Array];
  private held: Uint8Array;
  private gone: Int32Array;
  generation = 0;
  readonly changed: Int32Array;
  changes = 0;
  // fibre ends, per layer
  private endMark: [Uint8Array, Uint8Array];
  private ends: [Int32Array, Int32Array];
  private nends = [0, 0];
  // activity blocks
  private bw: number;
  private bh: number;
  private blk: Int32Array;
  private stamp: Int32Array;
  private act: Int32Array;
  private act2: Int32Array;
  /** per sleep block: latest change or pending birth in it, and in it and its 8 neighbours */
  private sbw: number;
  private sbh: number;
  private sblk: Int32Array;
  private swake: Int32Array;
  private snear: Int32Array;
  /** sleep blocks a change wakes on each side: covers the furthest any decision reads */
  private wr: number;
  private cnt: Int32Array;
  private bestBorn: Int32Array;
  private bestCell: Int32Array;
  private bestList: Int32Array;
  private nbest = 0;
  private fire: Int32Array;
  private ash: Int32Array;
  private nfire = 0;
  // queued work
  private kills: Int32Array;
  private nkills = 0;
  private births: Int32Array[]; // [extend, turn, sprout]: (L | i << 1, state, yarn) triples
  private nbirths = [0, 0, 0];
  private cand: Int32Array;
  private candMark: Uint8Array;
  private ncand = 0;
  private dirty = true;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    const s = (this.s = w + 2);
    const n = (w + 2) * (h + 2);
    const u8 = () => [new Uint8Array(n), new Uint8Array(n)] as [Uint8Array, Uint8Array];
    const i32 = () => [new Int32Array(n), new Int32Array(n)] as [Int32Array, Int32Array];
    this.c = u8();
    this.yarn = u8();
    this.ta = u8();
    this.born = i32();
    this.endMark = u8();
    this.ends = i32();
    this.held = new Uint8Array(n);
    this.gone = new Int32Array(n).fill(-1);
    this.changed = new Int32Array(n * 4);
    this.kills = new Int32Array(n * 2);
    this.births = [0, 1, 2].map(() => new Int32Array(n * 6));
    this.cand = new Int32Array(n * 4);
    this.candMark = new Uint8Array(n);
    this.fire = new Int32Array(n * 2);
    this.ash = new Int32Array(n);
    for (const g of this.c) {
      for (let x = 0; x < s; x++) g[x] = g[(h + 1) * s + x] = WALL;
      for (let y = 0; y < h + 2; y++) g[y * s] = g[y * s + w + 1] = WALL;
    }
    this.bw = Math.ceil(w / B);
    this.bh = Math.ceil(h / B);
    const nb = this.bw * this.bh;
    this.blk = new Int32Array(n).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.blk[(y + 1) * s + x + 1] = ((y / B) | 0) * this.bw + ((x / B) | 0);
    this.stamp = new Int32Array(nb);
    this.act = new Int32Array(nb);
    this.act2 = new Int32Array(nb);
    this.sbw = Math.ceil(w / SB);
    this.sbh = Math.ceil(h / SB);
    const ns = this.sbw * this.sbh;
    this.sblk = new Int32Array(n).fill(0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.sblk[(y + 1) * s + x + 1] = ((y / SB) | 0) * this.sbw + ((x / SB) | 0);
    this.swake = new Int32Array(ns);
    // the furthest a decision reads: 4 (turn look, sprout, b3), a weft's run
    // ahead and behind (run + 1), a warp's run back along itself
    this.wr = Math.ceil(Math.max(4, P.run + 1, P.warpRun) / SB);
    this.snear = new Int32Array(ns);
    this.cnt = new Int32Array(nb);
    this.bestBorn = new Int32Array(nb).fill(0x7fffffff);
    this.bestCell = new Int32Array(nb).fill(-1);
    this.bestList = new Int32Array(nb);
  }

  // ---------- structure ----------

  /** the cell this one grew from, or -1 */
  private parentOf(L: number, i: number, v: number) {
    const me = this.c[L];
    let j: number;
    let u: number;
    if (v & TURNED) {
      j = v & TPLUS ? i + (L === 0 ? 1 : this.s) : i - (L === 0 ? 1 : this.s);
      u = me[j];
      if (u === 0 || u === WALL || (u & SP) !== (v & SP) || (u & NEG) === (v & NEG)) return -1;
      return j;
    }
    const a = L === 0 ? this.s : 1;
    j = v & NEG ? i + a : i - a;
    u = me[j];
    if (u === 0 || u === WALL || (u & (SP | NEG)) !== (v & (SP | NEG))) return -1;
    return j;
  }

  /** a cell grown from this one, or -1 */
  private childOf(L: number, i: number, v: number) {
    const me = this.c[L];
    const a = L === 0 ? this.s : 1;
    const q = L === 0 ? 1 : this.s;
    let k = v & NEG ? i - a : i + a;
    let u = me[k];
    if (u !== 0 && u !== WALL && !(u & TURNED) && (u & (SP | NEG)) === (v & (SP | NEG))) return k;
    k = i + q;
    u = me[k];
    if (u !== 0 && u !== WALL && (u & (TURNED | TPLUS)) === TURNED && (u & SP) === (v & SP) && (u & NEG) !== (v & NEG)) return k;
    k = i - q;
    u = me[k];
    if (u !== 0 && u !== WALL && (u & (TURNED | TPLUS)) === (TURNED | TPLUS) && (u & SP) === (v & SP) && (u & NEG) !== (v & NEG)) return k;
    return -1;
  }

  /** the other layer's cell at i is held on both sides */
  private heldAt(L: number, i: number) {
    const O = 1 - L;
    const o = this.c[O][i];
    return o !== 0 && o !== WALL && this.parentOf(O, i, o) >= 0 && this.childOf(O, i, o) >= 0;
  }

  private addEnd(L: number, i: number) {
    const em = this.endMark[L];
    if (em[i]) return;
    em[i] = 1;
    this.ends[L][this.nends[L]++] = i;
  }

  private touch(i: number) {
    if (this.candMark[i]) return;
    this.candMark[i] = 1;
    this.cand[this.ncand++] = i;
  }

  private rescan() {
    const n = this.c[0].length;
    this.nends = [0, 0];
    this.endMark[0].fill(0);
    this.endMark[1].fill(0);
    this.cnt.fill(0);
    for (let L = 0; L < 2; L++) {
      const me = this.c[L];
      for (let i = 0; i < n; i++) {
        if (!isLive(me[i])) continue;
        this.cnt[this.blk[i]]++;
        this.addEnd(L, i);
        if (L === 1) this.touch(i);
      }
    }
    this.stamp.fill(this.generation);
    this.act.fill(this.generation);
    this.swake.fill(this.generation);
    this.snear.fill(this.generation);
    this.dirty = false;
  }

  // ---------- one generation ----------

  step() {
    if (this.dirty) this.rescan();
    const { s } = this;
    const p = P;
    const gen = this.generation;
    const T = p.quiet;
    const R = p.run;
    this.nkills = 0;
    this.nbirths[0] = this.nbirths[1] = this.nbirths[2] = 0;
    const kills = this.kills;
    const [bx, bt, bs] = this.births;
    let nb0 = 0, nb1 = 0, nb2 = 0, nk = 0;
    const c0 = this.c[0];
    const c1 = this.c[1];

    for (let L = 0; L < 2; L++) {
      const me = this.c[L];
      const ot = this.c[1 - L];
      const yarn = this.yarn[L];
      const ta = this.ta[L];
      const born = this.born[L];
      const em = this.endMark[L];
      const list = this.ends[L];
      const a = L === 0 ? s : 1;
      const freeAge = L === 0 ? p.warpAge : p.weftAge;
      const newYarn = L === 1 ? p.warpYarn : p.weftYarn;
      let kept = 0;
      for (let k0 = 0, n0 = this.nends[L]; k0 < n0; k0++) {
        const i = list[k0];
        const v = me[i];
        if (v === 0 || v === WALL) {
          em[i] = 0;
          continue;
        }
        const b = this.blk[i];
        // a still swatch's oldest held tail may start to unpick it (looked
        // for whether or not this end is asleep, so sleep stays exact)
        const quiet = gen - this.act[b];
        if (quiet >= T && ((quiet - T) & 15) === 0 && !(v & UNPICK) && isLive(ot[i]) && this.parentOf(L, i, v) < 0 && this.heldAt(L, i)) {
          const bb = born[i];
          if (this.bestCell[b] < 0) {
            this.bestList[this.nbest++] = b;
            this.bestBorn[b] = bb;
            this.bestCell[b] = (i << 1) | L;
          } else if (bb < this.bestBorn[b]) {
            this.bestBorn[b] = bb;
            this.bestCell[b] = (i << 1) | L;
          }
        }
        if (gen - this.snear[this.sblk[i]] > 8) {
          // asleep: nothing within reach has changed, so nothing here can
          list[kept++] = i;
          continue;
        }
        const par = this.parentOf(L, i, v);
        const ch = this.childOf(L, i, v);
        if (par >= 0 && ch >= 0) {
          em[i] = 0;
          continue;
        }
        list[kept++] = i;

        // ---- the front ----
        let res = 0; // 1 extend, 2 turn, 3 stalled
        let side = 0;
        let tie = false;
        if (ch < 0) {
          res = 3;
          const hd = v & NEG ? -a : a;
          const f = i + hd;
          const mf = me[f];
          const ys = yarn[i] > 0;
          let headOn = false;
          if (mf === 0) {
            const g = me[f + hd];
            headOn = g !== 0 && g !== WALL && (g & NEG) !== (v & NEG);
          }
          const free = mf === 0 && !headOn && ys;
          if (L === 1) {
            const oi = ot[i];
            let turnable = ys && oi !== 0 && (free || mf !== 0);
            if (turnable) {
              // a warp behind in this row: there is something to weave back across
              turnable = false;
              for (let t = 1; t <= R + 1; t++) {
                const o = ot[i - hd * t];
                if (o === WALL) break;
                if (o !== 0) {
                  turnable = true;
                  break;
                }
              }
            }
            let ahead = false;
            if (free) {
              for (let t = 1; t <= R; t++) {
                const o = ot[i + hd * t];
                if (o === WALL) break;
                if (o !== 0) {
                  ahead = true;
                  break;
                }
              }
            }
            if (ahead) res = 1;
            else {
              if (turnable) {
                // round the selvedge, toward the side with more free warp
                const dn = me[i + s] === 0 && isLive(ot[i + s]);
                const upk = me[i - s] === 0 && isLive(ot[i - s]);
                if (dn || upk) {
                  if (dn && upk) {
                    let cd = 0;
                    let cu = 0;
                    for (let t = 0; t < p.look; t++) {
                      const jd = i + s - hd * t;
                      const od = ot[jd];
                      if (od === WALL) break;
                      if (od !== 0 && me[jd] === 0) cd++;
                    }
                    for (let t = 0; t < p.look; t++) {
                      const ju = i - s - hd * t;
                      const ou = ot[ju];
                      if (ou === WALL) break;
                      if (ou !== 0 && me[ju] === 0) cu++;
                    }
                    if (cd === cu) {
                      tie = true;
                      side = v & UP ? -s : s;
                    } else side = cd > cu ? s : -s;
                  } else side = dn ? s : -s;
                  res = 2;
                }
              }
              if (res === 3 && free && oi === 0) {
                // a free shuttle glides while its float is short
                let run = -1;
                for (let k = i; k >= 0 && run < R && ot[k] === 0; k = this.parentOf(L, k, me[k])) run++;
                if (run + 1 <= R) res = 1;
              }
            }
          } else if (free) {
            let run = -1;
            for (let k = i; k >= 0 && run < p.warpRun && ot[k] === 0; k = this.parentOf(L, k, me[k])) run++;
            if (run + 1 <= p.warpRun) res = 1;
          } else if (mf === WALL && ys) {
            // a warp run into a hold (or the edge) turns back beside itself
            const lf = me[i - 1] === 0;
            const rt = me[i + 1] === 0;
            if (lf || rt) {
              side = lf && rt ? (v & UP ? -1 : 1) : lf ? -1 : 1;
              tie = true;
              res = 2;
            }
          }
          if (res === 1) {
            bx[nb0++] = (f << 1) | L;
            bx[nb0++] = v & (SP | NEG | UP);
            bx[nb0++] = yarn[i] - 1;
          } else if (res === 2) {
            const t = i + side;
            bt[nb1++] = (t << 1) | L;
            bt[nb1++] = (v & (SP | UP)) ^ (tie ? UP : 0) | ((v & NEG) ^ NEG) | TURNED | (side < 0 ? TPLUS : 0);
            bt[nb1++] = yarn[i] - 1;
          }
        }

        // ---- the tail ----
        let dies = false;
        if (par < 0) {
          let t = ta[i] + 1;
          if (t > 7) t = 7;
          ta[i] = t;
          if (v & UNPICK) {
            // burning: the fire takes it
          } else if (ch < 0 && res === 3 && t > 1) dies = true;
          else {
            const o = ot[i];
            if (o !== 0) {
              if (t > p.fray && !this.heldAt(L, i)) dies = true;
            } else if (t > freeAge) dies = true;
          }
          if (dies) kills[nk++] = (i << 1) | L;
        }

        // ---- a stalled front throws a fibre of the other layer ----
        if (res === 3 && !dies) {
          const yl = yarn[i];
          const last = yl === 0 && !(v & SPENT);
          if ((yl >= p.cost || last) && ot[i] === 0) {
            let cnt = 0;
            const lim = p.lonely + 1;
            for (let dy = -2 * s; dy <= 2 * s && cnt <= lim; dy += s)
              for (let dx = -2; dx <= 2; dx++) {
                const k = i + dy + dx;
                const A = c0[k];
                const Bv = c1[k];
                if (A !== undefined && A !== 0 && A !== WALL) cnt++;
                if (Bv !== undefined && Bv !== 0 && Bv !== WALL) cnt++;
              }
            if (cnt <= lim) {
              const x = (i % s) - 1;
              const y = ((i / s) | 0) - 1;
              const st = ((v & SP) === 1 ? 2 : 1) | ((x + y + gen) & 1 ? NEG : 0) | (((x * 3 + y + gen) >> 1) & 1 ? UP : 0);
              bs[nb2++] = (i << 1) | (1 - L);
              bs[nb2++] = st;
              bs[nb2++] = newYarn;
              if (L === 1) {
                const hd = v & NEG ? -a : a;
                const j = i - hd;
                if (ot[j] === 0 && isLive(me[j])) {
                  bs[nb2++] = (j << 1) | 0;
                  bs[nb2++] = st;
                  bs[nb2++] = newYarn;
                }
              }
              if (last) me[i] = v | SPENT;
              else yarn[i] = yl - p.cost;
            }
          }
        }
      }
      this.nends[L] = kept;
    }
    this.nkills = nk;
    this.nbirths[0] = nb0;
    this.nbirths[1] = nb1;
    this.nbirths[2] = nb2;
    this.apply(gen);
    this.propagate();
    this.generation++;
    return this.changes;
  }

  /** a change at i: every sleep block within one block of it wakes */
  private wakeAt(i: number, gen: number) {
    const b = this.sblk[i];
    if (this.swake[b] === gen) return;
    this.swake[b] = gen;
    const { sbw, sbh, snear, wr } = this;
    const bx = b % sbw;
    const by = (b / sbw) | 0;
    for (let yy = by > wr ? by - wr : 0; yy <= by + wr && yy < sbh; yy++)
      for (let xx = bx > wr ? bx - wr : 0; xx <= bx + wr && xx < sbw; xx++) snear[yy * sbw + xx] = gen;
  }

  private light(L: number, i: number) {
    const me = this.c[L];
    const v = me[i];
    if (!isLive(v) || v & UNPICK) return;
    me[i] = v | UNPICK;
    this.fire[this.nfire++] = (i << 1) | L;
  }

  private die(L: number, i: number, gen: number) {
    const me = this.c[L];
    if (me[i] === 0 || me[i] === WALL) return false;
    me[i] = 0;
    const b = this.blk[i];
    this.cnt[b]--;
    this.stamp[b] = gen;
    this.wakeAt(i, gen);
    this.changed[this.changes++] = i;
    const a = L === 0 ? this.s : 1;
    const q = L === 0 ? 1 : this.s;
    for (const j of [i - a, i + a, i - q, i + q]) if (isLive(me[j])) this.addEnd(L, j);
    if (L === 0) {
      this.gone[i] = gen;
      this.touch(i);
      this.touch(i - 1);
      this.touch(i + 1);
      this.touch(i - 2);
      this.touch(i + 2);
    }
    return true;
  }

  private bear(L: number, i: number, st: number, yarn: number, gen: number) {
    const me = this.c[L];
    if (me[i] !== 0) return false;
    if (this.ash[i] > gen) {
      // still ash: try again later (and keep the neighbourhood awake till then)
      this.wakeAt(i, gen);
      if (L === 0) this.touch(i);
      return false;
    }
    me[i] = st;
    this.yarn[L][i] = yarn < 0 ? 0 : yarn;
    this.ta[L][i] = 0;
    this.born[L][i] = gen;
    const b = this.blk[i];
    this.cnt[b]++;
    this.stamp[b] = gen;
    this.wakeAt(i, gen);
    this.changed[this.changes++] = i;
    this.addEnd(L, i);
    if (L === 1) {
      this.touch(i);
      this.touch(i - this.s);
      this.touch(i + this.s);
    }
    return true;
  }

  private apply(gen: number) {
    const { s } = this;
    const p = P;
    this.changes = 0;
    const kills = this.kills;
    for (let k = 0; k < this.nkills; k++) {
      const e = kills[k];
      this.die(e & 1, e >> 1, gen);
    }
    for (let pr = 0; pr < 3; pr++) {
      const list = this.births[pr];
      for (let k = 0, n = this.nbirths[pr]; k < n; k += 3) {
        const e = list[k];
        this.bear(e & 1, e >> 1, list[k + 1], list[k + 2], gen);
      }
    }
    // the oldest held tail of each still block starts to unpick
    for (let k = 0; k < this.nbest; k++) {
      const b = this.bestList[k];
      const e = this.bestCell[b];
      this.bestCell[b] = -1;
      this.bestBorn[b] = 0x7fffffff;
      const L = e & 1;
      const i = e >> 1;
      const v = this.c[L][i];
      if (!isLive(v)) continue;
      this.light(L, i);
    }
    this.nbest = 0;
    // the fire: every `fuse` generations each burning cell goes, lighting its
    // own fibre both ways and the thread crossing it, if they were woven at
    // about the same time (born within `kin` generations of it)
    if (this.nfire && gen % p.fuse === 0) {
      const list = this.fire.slice(0, this.nfire);
      this.nfire = 0;
      for (const e of list) {
        const L = e & 1;
        const i = e >> 1;
        const me = this.c[L];
        const v = me[i];
        if (!isLive(v) || !(v & UNPICK)) continue;
        const b = this.born[L][i];
        const pa = this.parentOf(L, i, v);
        const ch = this.childOf(L, i, v);
        this.die(L, i, gen);
        this.ash[i] = gen + p.ash;
        const kin = p.kin;
        if (pa >= 0 && Math.abs(this.born[L][pa] - b) <= kin) this.light(L, pa);
        if (ch >= 0 && Math.abs(this.born[L][ch] - b) <= kin) this.light(L, ch);
        const O = 1 - L;
        if (isLive(this.c[O][i]) && Math.abs(this.born[O][i] - b) <= kin) this.light(O, i);
      }
    }
    // warps drawn through stacked wefts, where there is room
    // (beside one other warp at most: a pair, never a third)
    const c0 = this.c[0];
    const c1 = this.c[1];
    const cand = this.cand;
    const n = this.ncand;
    this.ncand = 0;
    for (let k = 0; k < n; k++) {
      const i = cand[k];
      this.candMark[i] = 0;
      if (c0[i] !== 0) continue;
      const A = c1[i - s];
      const Bv = c1[i];
      const C = c1[i + s];
      if (!isLive(A) || !isLive(Bv) || !isLive(C)) continue;
      const l = c0[i - 1];
      const r = c0[i + 1];
      if (l === WALL || r === WALL) continue;
      if (l && r) continue;
      if (l && c0[i - 2] !== 0) continue;
      if (r && c0[i + 2] !== 0) continue;
      if (this.gone[i] === gen) continue;
      // it must have somewhere to grow: head into the open side
      const above = c0[i - s] === 0;
      const below = c0[i + s] === 0;
      if (!above && !below) continue;
      const cy = (A & SP) + (Bv & SP) + (C & SP) <= 4 ? 2 : 1; // mostly cyan wefts -> magenta warp
      const x = (i % s) - 1;
      const y = ((i / s) | 0) - 1;
      const neg = above && below ? (x + y) & 1 : above ? 1 : 0;
      this.bear(0, i, cy | (neg ? NEG : 0) | ((x >> 1) & 1 ? UP : 0), p.warpYarn, gen);
    }
    // padded indices to x + y * w
    const { w } = this;
    for (let k = 0; k < this.changes; k++) {
      const i = this.changed[k];
      this.changed[k] = (((i / s) | 0) - 1) * w + (i % s) - 1;
    }
  }

  /** activity spreads through occupied blocks, fading with distance */
  private propagate() {
    const { bw, bh, stamp, cnt } = this;
    const act = this.act;
    const nx = this.act2;
    const D = P.fade;
    for (let b = 0; b < act.length; b++) if (stamp[b] > act[b]) act[b] = stamp[b];
    for (let by = 0; by < bh; by++)
      for (let bx = 0; bx < bw; bx++) {
        const b = by * bw + bx;
        let m = stamp[b];
        for (let dy = -1; dy <= 1; dy++) {
          const yy = by + dy;
          if (yy < 0 || yy >= bh) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = bx + dx;
            if ((dx === 0 && dy === 0) || xx < 0 || xx >= bw) continue;
            const n = yy * bw + xx;
            if (cnt[n] > 0 && act[n] - D > m) m = act[n] - D;
          }
        }
        nx[b] = m;
      }
    this.act = nx;
    this.act2 = act;
  }

  // ---------- hands ----------

  private idx(x: number, y: number) {
    return (y + 1) * this.s + x + 1;
  }
  /** 0 none, 1 cyan, 2 magenta */
  sp(L: Layer, x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    const v = this.c[L][this.idx(x, y)];
    return v === WALL ? 0 : v & SP;
  }
  /** generation the cell at (x, y) in layer L was born (fibre-cell index c = x + y * w) */
  bornAt(L: Layer, c: number) {
    const i = ((c / this.w) | 0) * this.s + this.s + (c % this.w) + 1;
    return this.born[L][i];
  }
  /** the unpick fire is in this cell */
  burning(L: Layer, c: number) {
    const i = ((c / this.w) | 0) * this.s + this.s + (c % this.w) + 1;
    const v = this.c[L][i];
    return isLive(v) && (v & UNPICK) !== 0;
  }
  isHeld(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.held[this.idx(x, y)] === 1;
  }

  private set(L: Layer, x: number, y: number, sp: number, neg = false, up = false) {
    const i = this.idx(x, y);
    if (this.c[L][i] === WALL) return;
    this.c[L][i] = sp | (neg ? NEG : 0) | (up ? UP : 0);
    this.yarn[L][i] = L === 0 ? P.warpYarn : P.weftYarn;
    this.ta[L][i] = 0;
    this.born[L][i] = this.generation;
    this.dirty = true;
  }

  /** Wall off one cell: nothing lives there; fibres turn at it. */
  hold(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = this.idx(x, y);
    this.held[i] = 1;
    this.c[0][i] = this.c[1][i] = WALL;
    this.dirty = true;
  }

  /** A tap: on bare ground, throw a shuttle; on cloth, pluck it (light the
   * unpick fire there, so the threads woven with it unravel). */
  tap(x: number, y: number, sp = 2) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || this.isHeld(x, y)) return;
    const i = this.idx(x, y);
    if (isLive(this.c[0][i]) || isLive(this.c[1][i])) {
      if (this.dirty) this.rescan();
      if (isLive(this.c[0][i])) this.light(0, i);
      if (isLive(this.c[1][i])) this.light(1, i);
      this.wakeAt(i, this.generation);
    } else this.throwShuttle(x, y, sp);
  }

  /** Throw a shuttle at (x, y): a short weft of colour `sp`, heading toward
   * the roomier side, with a little loom ahead of it to weave into (two pairs
   * of warps of the other colour, across its path). */
  throwShuttle(x: number, y: number, sp = 2) {
    const { w, h } = this;
    if (x < 0 || y < 0 || x >= w || y >= h || this.isHeld(x, y)) return;
    const neg = x > w / 2;
    const d = neg ? -1 : 1;
    const other = sp === 1 ? 2 : 1;
    const up = (x + y) % 2 === 1;
    for (let t = 2; t >= 0; t--) {
      const xx = x - d * t;
      if (xx >= 0 && xx < w && !this.sp(1, xx, y) && !this.isHeld(xx, y)) this.set(1, xx, y, sp, neg, up);
    }
    for (const dx of [2, 3, 5, 6]) {
      const xx = x + d * dx;
      for (let t = -3; t <= 3; t++) {
        const yy = y + t;
        if (xx >= 0 && xx < w && yy >= 0 && yy < h && !this.sp(0, xx, yy) && !this.isHeld(xx, yy)) this.set(0, xx, yy, other, ((dx >> 1) & 1) === 1);
      }
    }
  }

  /** Scatter short lengths of thread over rows y0..y1, mostly cyan warp
   * and magenta weft: what the cloth grows from. */
  seed(rand: () => number, y0 = 0, y1 = this.h - 1) {
    const { w } = this;
    y0 = Math.max(0, y0);
    y1 = Math.min(this.h - 1, y1);
    const rows = y1 - y0 + 1;
    for (let k = 0; k < (w * rows) / 60; k++) {
      const L = (rand() < 0.5 ? 0 : 1) as Layer;
      const x = Math.floor(rand() * w);
      const y = y0 + Math.floor(rand() * rows);
      const len = 2 + Math.floor(rand() * 5);
      const neg = rand() < 0.5;
      const sp = rand() < 0.8 ? (L === 0 ? 1 : 2) : L === 0 ? 2 : 1;
      const up = rand() < 0.5;
      for (let t = 0; t < len; t++) {
        const xx = L === 0 ? x : x + t;
        const yy = L === 0 ? y + t : y;
        if (xx < w && yy <= y1 && this.sp(L, xx, yy) === 0 && !this.isHeld(xx, yy)) this.set(L, xx, yy, sp, neg, up);
      }
    }
  }

  // ---------- for the painter ----------

  /** Every fibre with a cell in rows r0..r1 (default all), traced tail to tip. */
  fibres(r0 = 0, r1 = this.h - 1): Fibre[] {
    const { s, w } = this;
    const out: Fibre[] = [];
    const n = this.c[0].length;
    if (!this.seen || this.seen.length !== n) this.seen = new Int32Array(n);
    const seen = this.seen;
    const mark = ++this.seenGen;
    r0 = Math.max(0, r0);
    r1 = Math.min(this.h - 1, r1);
    for (let L = 0; L < 2; L++) {
      const me = this.c[L];
      const stamp = mark * 2 + L;
      for (let y = r0; y <= r1; y++)
        for (let x = 0; x < w; x++) {
          const i0 = (y + 1) * s + x + 1;
          if (!isLive(me[i0]) || seen[i0] === stamp) continue;
          // back to the tail (a loop ends where it started)
          let i = i0;
          for (let g = 0; g < 4096; g++) {
            const pj = this.parentOf(L, i, me[i]);
            if (pj < 0 || pj === i0 || seen[pj] === stamp) break;
            i = pj;
          }
          const start = i;
          const cells: number[] = [];
          const turn: boolean[] = [];
          const neg: boolean[] = [];
          let v = me[i];
          while (seen[i] !== stamp) {
            seen[i] = stamp;
            cells.push(((i / s) | 0) * w - w + (i % s) - 1);
            neg.push((v & NEG) !== 0);
            const c = this.childOf(L, i, v);
            if (c < 0 || seen[c] === stamp) break;
            const cv = me[c];
            turn.push((cv & TURNED) !== 0);
            i = c;
            v = cv;
          }
          out.push({ L: L as Layer, sp: me[start] & SP, cells, turn, neg, live: this.yarn[L][i] > 0 });
        }
    }
    return out;
  }
  private seen?: Int32Array;
  private seenGen = 0;
}
