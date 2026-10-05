/** The transport: one playhead over the whole career. It rests at "now";
 * play sweeps it from the first dated thing to now (and on to the end of
 * the last motif), a month per eighth note, landing its first month on the
 * metronome. With sound on, the song plays in step with it.
 *
 * Views hand it elements to follow the playhead (`--at`, 0..1) or to light
 * while it is inside them (`data-live`), and it touches only those. The
 * loop runs only while playing, and the prism idling the page pauses it. */
import { onNext } from "./beat";
import { EIGHTH_MS, YEAR_EIGHTHS, type MusicEvent } from "./music";
import { onSound, playSong, soundOn, stopSong } from "./sound";
import { songFor, type Model } from "./timeline";

const YEAR_MS = EIGHTH_MS * YEAR_EIGHTHS;

type Tick = (t: number, playing: boolean) => void;

interface Watched {
  el: HTMLElement;
  start: number;
  end: number;
  live?: boolean;
}

export class Transport {
  t: number;
  playing = false;
  /** Parked at now: play starts from the top. */
  resting = true;

  private frame = 0;
  private anchorTime = 0;
  private anchorT = 0;
  private cancelStart = () => {};
  private returnTimer: ReturnType<typeof setTimeout> | undefined;
  private heads = new Set<HTMLElement>();
  private watched = new Set<Watched>();
  private ticks = new Set<Tick>();
  private song: MusicEvent[] | undefined;
  private unsound: () => void;

  constructor(
    readonly model: Model,
    private options: { reducedMotion: boolean },
  ) {
    this.t = model.now;
    // sound turned on mid-play joins the song where the playhead is
    this.unsound = onSound((on) => {
      if (on && this.playing && this.anchorTime) this.startSong();
      if (!on) stopSong();
    });
  }

  /** Follow the playhead: the element gets `--at` (0..1 along the ruler). */
  playhead(el: HTMLElement) {
    this.heads.add(el);
    el.style.setProperty("--at", this.model.place(this.shown()).toFixed(5));
  }

  /** Light the element (`data-live`) while the playhead is inside it. */
  watch(el: HTMLElement, start: number, end: number) {
    const entry: Watched = { el, start, end };
    this.watched.add(entry);
    this.light(entry);
  }

  onTick(fn: Tick) {
    this.ticks.add(fn);
    fn(this.t, this.playing);
  }

  play() {
    if (this.playing) return;
    clearTimeout(this.returnTimer);
    if (this.resting || this.t >= this.model.end - 1 / 48) this.t = this.model.from;
    this.resting = false;
    this.playing = true;
    this.anchorTime = 0;
    this.render();
    // the first month lands on the next eighth of the metronome
    this.cancelStart();
    this.cancelStart = onNext(2, () => {
      if (!this.playing) return;
      this.anchor();
      this.startSong();
      this.loop();
    });
  }

  pause() {
    if (!this.playing) return;
    this.cancelStart();
    cancelAnimationFrame(this.frame);
    stopSong();
    this.playing = false;
    this.render();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Stop where we are; stop again to return to now. */
  stop() {
    if (this.playing) this.pause();
    else this.rest();
  }

  /** Park the playhead at now. */
  rest() {
    clearTimeout(this.returnTimer);
    this.seek(this.model.now);
    this.resting = true;
    this.render();
  }

  /** Move the playhead. Playing carries on from there. */
  seek(t: number) {
    const { from, to } = this.model;
    this.t = Math.min(Math.max(t, from), to);
    this.resting = false;
    if (this.playing) {
      this.anchor();
      this.startSong();
    }
    this.render();
  }

  /** The prism idles the page: hold still, silently. */
  setIdle(idle: boolean) {
    if (idle) this.pause();
  }

  destroy() {
    this.pause();
    clearTimeout(this.returnTimer);
    this.unsound();
    this.heads.clear();
    this.watched.clear();
    this.ticks.clear();
  }

  private startSong() {
    if (!soundOn()) return;
    this.song ??= songFor(this.model);
    playSong(this.song, (this.t - this.model.from) * YEAR_EIGHTHS);
  }

  private anchor() {
    this.anchorTime = performance.now();
    this.anchorT = this.t;
  }

  private loop() {
    cancelAnimationFrame(this.frame);
    if (!this.playing) return;
    this.frame = requestAnimationFrame((time) => {
      const { end } = this.model;
      this.t = Math.min(this.anchorT + (time - this.anchorTime) / YEAR_MS, end);
      if (this.t >= end) {
        // the song rings out its last chord on its own; the playhead then
        // goes home to now
        this.playing = false;
        this.render();
        this.returnTimer = setTimeout(() => this.rest(), EIGHTH_MS * 8);
        return;
      }
      this.render();
      this.loop();
    });
  }

  /** What to draw: under reduced motion the playhead steps a chord (half a
   * year) at a time instead of gliding. */
  private shown() {
    if (!this.options.reducedMotion || !this.playing) return this.t;
    return Math.max(Math.floor(this.t * 2) / 2, this.model.from);
  }

  private light(entry: Watched) {
    const t = this.shown();
    const live = t >= entry.start - 1e-6 && t < entry.end;
    if (live === entry.live) return;
    entry.live = live;
    if (live) entry.el.dataset.live = "";
    else delete entry.el.dataset.live;
  }

  private render() {
    const t = this.shown();
    const at = this.model.place(t).toFixed(5);
    for (const el of this.heads) el.style.setProperty("--at", at);
    for (const entry of this.watched) this.light(entry);
    for (const fn of this.ticks) fn(t, this.playing);
  }
}
