/** The transport: one playhead over the session. It rests at today. Play
 * runs the career from the first clip to the final chord, a month per
 * eighth note; a clip can also be played as a region. Mute and solo decide
 * which tracks get scheduled, so they change what you hear (and what
 * lights). Views hand it the elements that follow the playhead or light
 * while it is inside them, and it touches only those. The loop runs only
 * while playing, and stops when the page goes idle. */
import { EIGHTH_SECONDS, BAR_EIGHTHS } from "./music";
import { audition, now as audioNow, schedule, setTrackLevel, soundLive, stopPlayback, type Play } from "./audio";
import type { Clip, Session, TrackId } from "./score";

const YEAR_SECONDS = EIGHTH_SECONDS * BAR_EIGHTHS;
/** Schedule this far ahead (in years: 150ms). */
const AHEAD = 0.15 / YEAR_SECONDS;

export interface Range {
  from: number;
  to: number;
}

type Tick = (t: number, playing: boolean) => void;

interface Head {
  el: HTMLElement;
  range: Range;
}

interface Watched {
  el: HTMLElement;
  start: number;
  end: number;
  track?: TrackId;
  live?: boolean;
}

export const place = (t: number, range: Range) =>
  Math.min(Math.max((t - range.from) / (range.to - range.from), 0), 1);

export class Transport {
  t: number;
  playing = false;
  readonly muted = new Set<TrackId>();
  readonly soloed = new Set<TrackId>();
  /** The region being played. */
  region: Range;

  private idle = false;
  private frame = 0;
  private anchorTime = 0;
  private anchorT = 0;
  private cursor = 0;
  private lastFrame = 0;
  private returnTo: number | undefined;
  /** Paused or scrubbed: play carries on from here rather than the top. */
  private resumable = false;
  private heads = new Set<Head>();
  private watched = new Set<Watched>();
  private ticks = new Set<Tick>();
  private mixes = new Set<() => void>();

  constructor(readonly session: Session) {
    this.t = session.now;
    this.region = { from: session.from, to: session.end };
  }

  audible(track: TrackId) {
    if (this.muted.has(track)) return false;
    return this.soloed.size === 0 || this.soloed.has(track);
  }

  toggleMute(track: TrackId) {
    if (!this.muted.delete(track)) this.muted.add(track);
    this.mixChanged();
  }

  toggleSolo(track: TrackId) {
    if (!this.soloed.delete(track)) this.soloed.add(track);
    this.mixChanged();
  }

  onMix(fn: () => void, signal: AbortSignal) {
    this.mixes.add(fn);
    fn();
    signal.addEventListener("abort", () => this.mixes.delete(fn));
  }

  /** The element follows the playhead: it gets `--at` (0..1 of `range`). */
  playhead(el: HTMLElement, range: Range, signal: AbortSignal) {
    const head = { el, range };
    this.heads.add(head);
    this.paint(head);
    signal.addEventListener("abort", () => this.heads.delete(head));
  }

  /** The element is `data-live` while the playhead is inside it (and, if it
   * belongs to a track, while that track is audible). */
  watch(el: HTMLElement, start: number, end: number, signal: AbortSignal, track?: TrackId) {
    const entry: Watched = { el, start, end, track };
    this.watched.add(entry);
    this.light(entry);
    signal.addEventListener("abort", () => this.watched.delete(entry));
  }

  onTick(fn: Tick, signal: AbortSignal) {
    this.ticks.add(fn);
    fn(this.t, this.playing);
    signal.addEventListener("abort", () => this.ticks.delete(fn));
  }

  /** Play the whole session, or a region from its start. The session
   * resumes where it was paused or scrubbed, and starts from the top when
   * resting at today or finished. */
  play(region?: Range) {
    if (this.idle) return;
    // replaying a region keeps the spot to return to from the first time
    const back = this.returnTo ?? this.t;
    if (this.playing) this.halt();
    const { session } = this;
    if (region) {
      this.returnTo = back;
      this.region = region;
      this.t = region.from;
    } else {
      this.returnTo = undefined;
      this.region = { from: session.from, to: session.end };
      if (!this.resumable || this.t >= session.end - 1e-6 || this.t < session.from) this.t = session.from;
    }
    this.resumable = false;
    this.start();
  }

  pause() {
    if (!this.playing) return;
    this.halt();
    this.resumable = true;
    this.render();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Stop where we are; stop again to return to today. */
  stop() {
    if (this.playing) this.pause();
    else this.seek(this.session.now);
  }

  seek(t: number) {
    const { session } = this;
    this.t = Math.min(Math.max(t, session.from), session.end);
    // back at rest at today, play starts from the top again
    this.resumable = Math.abs(this.t - session.now) > 1e-6;
    if (this.playing) {
      // leaving a playing region turns it into the whole session from here
      if (this.t < this.region.from || this.t >= this.region.to) {
        this.region = { from: session.from, to: session.end };
        this.returnTo = undefined;
      }
      stopPlayback();
      this.start();
    } else this.render();
  }

  setIdle(idle: boolean) {
    this.idle = idle;
    if (idle) this.pause();
  }

  /** Hear one clip in place: its own notes over the chords at its date. */
  audition(clip: Clip) {
    if (!soundLive()) return;
    const { session } = this;
    const span = clip.kind === "project" ? clip.end - clip.start : 0.5;
    const from = clip.kind === "role" ? Math.floor(clip.start * 2) / 2 : clip.start;
    const notes: Play[] = session.events
      .filter(
        (e) =>
          e.t >= from - 1e-9 &&
          e.t < from + span &&
          ((e.voice === "keys" && e.t > from - 1e-9) ||
            (clip.kind === "role" ? e.track === "roles" : clip.kind === "update" ? e.voice === "bell" && e.t - clip.start < 1 / 24 : e.track === clip.track)),
      )
      .map((e) => ({
        offset: (e.t - from) * YEAR_SECONDS,
        seconds: e.length * YEAR_SECONDS,
        degree: e.degree,
        voice: e.voice,
        velocity: e.voice === "keys" ? e.velocity * 0.7 : e.velocity,
      }));
    // the chord under the clip's first note, if it started between changes
    if (!notes.some((n) => n.voice === "keys" && n.offset < 0.01)) {
      const c = [...session.changes].reverse().find((change) => change.t <= from + 1e-9) ?? session.changes[0];
      const head = session.events.filter((e) => e.voice === "keys" && Math.abs(e.t - (c?.t ?? 0)) < 1e-9);
      notes.push(...head.map((e) => ({ offset: 0, seconds: span * YEAR_SECONDS * 0.8, degree: e.degree, voice: e.voice, velocity: e.velocity * 0.6 })));
    }
    audition(notes);
  }

  destroy() {
    this.halt();
    this.heads.clear();
    this.watched.clear();
    this.ticks.clear();
    this.mixes.clear();
  }

  private halt() {
    cancelAnimationFrame(this.frame);
    this.playing = false;
    stopPlayback();
  }

  /** Every track's level follows mute and solo; held notes go quiet or
   * come back without being struck again. */
  private applyMix() {
    for (const track of this.session.tracks) setTrackLevel(track, this.audible(track));
  }

  private mixChanged() {
    this.mixes.forEach((fn) => fn());
    for (const entry of this.watched) this.light(entry, true);
    this.applyMix();
  }

  /** Start the clock at `t`, re-striking whatever should already be
   * sounding there (a held chord, a bass note) for the time it has left. */
  private start() {
    this.playing = true;
    this.anchor();
    this.cursor = this.t;
    this.applyMix();
    if (soundLive()) {
      const base = audioNow();
      const t = this.t;
      schedule(
        this.session.events
          .filter((e) => e.t < t - 1e-9 && e.t + e.length > t + 0.01 && e.voice !== "brush")
          .map((e) => ({ when: base, seconds: (e.t + e.length - t) * YEAR_SECONDS, degree: e.degree, voice: e.voice, velocity: e.velocity * 0.8, track: e.track })),
      );
    }
    this.render();
    this.loop();
  }

  private anchor() {
    this.anchorTime = performance.now();
    this.lastFrame = this.anchorTime;
    this.anchorT = this.t;
  }

  private loop() {
    cancelAnimationFrame(this.frame);
    if (!this.playing || this.idle) return;
    this.frame = requestAnimationFrame(() => {
      if (!this.playing) return;
      // one clock: the anchor is performance.now(), so time is read from it
      // too (a frame's own timestamp can run on a different base)
      const time = performance.now();
      // after a stall (a hidden tab) carry on from where the playhead was,
      // dropping what was scheduled, rather than catching up in a burst
      if (time - this.lastFrame > 400) {
        stopPlayback();
        this.anchorT = this.t;
        this.anchorTime = time;
        this.cursor = this.t;
      }
      this.lastFrame = time;
      const { to } = this.region;
      const t = Math.min(this.anchorT + (time - this.anchorTime) / 1000 / YEAR_SECONDS, to);
      this.t = t;
      const final = to >= this.session.end - 1e-9;
      const until = Math.min(t + AHEAD, to + (final ? 1e-6 : 0));
      if (soundLive() && until > this.cursor) {
        const base = audioNow();
        schedule(
          this.session.events
            .filter((e) => e.t >= this.cursor && e.t < until)
            .map((e) => ({
              when: base + (e.t - t) * YEAR_SECONDS,
              seconds: e.length * YEAR_SECONDS,
              degree: e.degree,
              voice: e.voice,
              velocity: e.velocity,
              track: e.track,
            })),
        );
      }
      this.cursor = Math.max(this.cursor, until);
      if (t >= to) {
        this.playing = false;
        cancelAnimationFrame(this.frame);
        // the last chord rings on; the playhead goes back where it rested
        this.t = this.returnTo ?? this.session.now;
        this.returnTo = undefined;
        this.resumable = Math.abs(this.t - this.session.now) > 1e-6;
        this.region = { from: this.session.from, to: this.session.end };
        this.render();
        return;
      }
      this.render();
      this.loop();
    });
  }

  private paint(head: Head) {
    head.el.style.setProperty("--at", place(this.t, head.range).toFixed(5));
    // outside a zoomed range the playhead is elsewhere, not pinned to an edge
    head.el.toggleAttribute("data-out", this.t < head.range.from || this.t > head.range.to);
  }

  private light(entry: Watched, force = false) {
    const inside = this.t >= entry.start && this.t < entry.end;
    const live = inside && (!entry.track || this.audible(entry.track));
    if (live === entry.live && !force) return;
    entry.live = live;
    entry.el.toggleAttribute("data-live", live);
  }

  private render() {
    for (const head of this.heads) this.paint(head);
    for (const entry of this.watched) this.light(entry);
    for (const fn of this.ticks) fn(this.t, this.playing);
  }
}

/** Where in the career a time is: "Sep 2026". */
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthLabel(t: number) {
  const year = Math.floor(t + 1e-6);
  const month = Math.min(11, Math.floor((t - year) * 12 + 1e-6));
  return `${MONTH_NAMES[month]} ${year}`;
}

/** Bar, beat and eighth of a time: a year is a bar, its four dotted-quarter
 * beats are three months each. */
export function position(t: number) {
  const year = Math.floor(t + 1e-6);
  const month = Math.min(11, Math.floor((t - year) * 12 + 1e-6));
  return { bar: String(year), beat: String(Math.floor(month / 3) + 1), eighth: String((month % 3) + 1) };
}

export const MONTH_ABBR = MONTH_NAMES;
