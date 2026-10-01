/** The transport: one playhead over the whole career. It rests at "now";
 * play sweeps it from the first role to today, a month per eighth note.
 * Views hand it the elements that should follow it (playheads) or light
 * while it is inside them (clips), and it touches only those. The loop runs
 * only while playing and never while the page is an idle prism face. */
import { onNext } from "./beat";
import { clipsFor, FROM, MONTH_MS, NOW, place, type Clip } from "./timeline";
import type { SiteContent } from "../types";

type TickListener = (t: number, playing: boolean) => void;
type HitListener = (clip: Clip) => void;

interface Watched {
  el: HTMLElement;
  start: number;
  end: number;
  live?: boolean;
}

const YEAR_MS = MONTH_MS * 12;

export class Transport {
  t = NOW;
  playing = false;
  readonly clips: Clip[];
  /** Clip ids that are muted (by mute, or by someone else's solo). */
  readonly muted = new Set<string>();
  readonly soloed = new Set<string>();

  private idle = false;
  private frame = 0;
  private anchorTime = 0;
  private anchorT = NOW;
  private cancelStart = () => {};
  private heads = new Set<HTMLElement>();
  private watched = new Set<Watched>();
  private ticks = new Set<TickListener>();
  private hits = new Set<HitListener>();

  constructor(content: SiteContent) {
    this.clips = clipsFor(content);
  }

  audible(clip: Pick<Clip, "id">) {
    if (this.muted.has(clip.id)) return false;
    return this.soloed.size === 0 || this.soloed.has(clip.id);
  }

  /** Follow the playhead: the element gets `--at` (0..1). */
  playhead(el: HTMLElement, signal?: AbortSignal) {
    this.heads.add(el);
    el.style.setProperty("--at", place(this.t).toFixed(5));
    signal?.addEventListener("abort", () => this.heads.delete(el));
  }

  /** Light the element (`data-live`) while the playhead is inside it. */
  watch(el: HTMLElement, start: number, end: number, signal?: AbortSignal) {
    const entry: Watched = { el, start, end };
    this.watched.add(entry);
    this.light(entry);
    signal?.addEventListener("abort", () => this.watched.delete(entry));
  }

  onTick(fn: TickListener, signal?: AbortSignal) {
    this.ticks.add(fn);
    fn(this.t, this.playing);
    signal?.addEventListener("abort", () => this.ticks.delete(fn));
  }

  onHit(fn: HitListener, signal?: AbortSignal) {
    this.hits.add(fn);
    signal?.addEventListener("abort", () => this.hits.delete(fn));
  }

  play() {
    if (this.playing) return;
    if (this.t >= NOW - 1 / 48) this.t = FROM;
    this.playing = true;
    this.render();
    // the first month lands on the next eighth of the metronome
    this.cancelStart();
    this.cancelStart = onNext(2, () => {
      if (!this.playing) return;
      this.anchor();
      this.loop();
    });
  }

  pause() {
    if (!this.playing) return;
    this.cancelStart();
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.render();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Stop where we are; stop again to return to now. */
  stop() {
    if (this.playing) this.pause();
    else this.seek(NOW);
  }

  seek(t: number) {
    this.t = Math.min(Math.max(t, FROM), NOW);
    this.anchor();
    this.render();
  }

  setIdle(idle: boolean) {
    this.idle = idle;
    if (idle) cancelAnimationFrame(this.frame);
    else if (this.playing) {
      this.anchor();
      this.loop();
    }
  }

  destroy() {
    this.cancelStart();
    cancelAnimationFrame(this.frame);
    this.playing = false;
    this.heads.clear();
    this.watched.clear();
    this.ticks.clear();
    this.hits.clear();
  }

  private anchor() {
    this.anchorTime = performance.now();
    this.anchorT = this.t;
  }

  private loop() {
    cancelAnimationFrame(this.frame);
    if (!this.playing || this.idle) return;
    this.frame = requestAnimationFrame((time) => {
      const previous = this.t;
      const next = Math.min(this.anchorT + (time - this.anchorTime) / YEAR_MS, NOW);
      this.t = next;
      for (const clip of this.clips) {
        if (clip.start > previous && clip.start <= next) this.hits.forEach((fn) => fn(clip));
      }
      if (next >= NOW) {
        this.playing = false;
        this.render();
        return;
      }
      this.render();
      this.loop();
    });
  }

  private light(entry: Watched) {
    const live = this.t >= entry.start && this.t < entry.end;
    if (live === entry.live) return;
    entry.live = live;
    if (live) entry.el.dataset.live = "";
    else delete entry.el.dataset.live;
  }

  private render() {
    const at = place(this.t).toFixed(5);
    for (const el of this.heads) el.style.setProperty("--at", at);
    for (const entry of this.watched) this.light(entry);
    for (const fn of this.ticks) fn(this.t, this.playing);
  }
}
