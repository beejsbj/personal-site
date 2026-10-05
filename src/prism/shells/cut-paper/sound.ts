/** The lens's voice. Silent unless the visitor opts in; the context is only
 * created from that opt-in gesture, and never in a prism face.
 *
 * Everything runs through one quiet master (a gentle low-pass, then a
 * compressor that holds peaks down), so nothing ever blasts. Three kinds of
 * sound share it:
 * - a key: one note, struck from the keyboard;
 * - an audition: a short phrase (a project's motif, a credit's chords).
 *   Only one plays at a time; a new one fades the last out, and none play
 *   while the song does;
 * - the song: the career played through, scheduled a little ahead of the
 *   audio clock while the transport runs. */
import { EIGHTH_MS, hz, type MusicEvent } from "./music";

const EIGHTH = EIGHTH_MS / 1000;

let context: AudioContext | undefined;
let master: GainNode | undefined;
let enabled = false;
const lastPlayed = new Map<number, number>();
const listeners = new Set<(on: boolean) => void>();

export const soundOn = () => enabled;

/** Hear about the visitor turning sound on or off. Returns an unsubscribe. */
export function onSound(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setSound(on: boolean) {
  enabled = on;
  if (!on) {
    stopAudition(0.03);
    void context?.suspend();
    listeners.forEach((fn) => fn(false));
    return;
  }
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.2;
    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3200;
    const limit = context.createDynamicsCompressor();
    limit.threshold.value = -20;
    limit.knee.value = 12;
    limit.ratio.value = 8;
    limit.attack.value = 0.004;
    limit.release.value = 0.25;
    master.connect(tone).connect(limit).connect(context.destination);
  }
  void context.resume();
  listeners.forEach((fn) => fn(true));
}

/* ── voices ─────────────────────────────────────────────────── */

type Partial = [OscillatorType, number, number];

function tone(
  out: AudioNode,
  frequency: number,
  when: number,
  {
    partials,
    attack,
    hold,
    release,
    level,
  }: { partials: Partial[]; attack: number; hold: number; release: number; level: number },
) {
  const ctx = context!;
  const voice = ctx.createGain();
  voice.gain.setValueAtTime(0.0001, when);
  voice.gain.exponentialRampToValueAtTime(Math.max(level, 0.0002), when + attack);
  voice.gain.setValueAtTime(Math.max(level, 0.0002), when + attack + hold);
  voice.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
  voice.connect(out);
  const end = when + attack + hold + release + 0.05;
  for (const [type, ratio, gain] of partials) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency * ratio;
    g.gain.value = gain;
    osc.connect(g).connect(voice);
    osc.start(when);
    osc.stop(end);
  }
  setTimeout(() => voice.disconnect(), (end - ctx.currentTime) * 1000 + 100);
}

/** A felt-piano pluck: triangle body, a sine an octave up. */
const pluck = (out: AudioNode, f: number, when: number, vel: number, len = 0.9) =>
  tone(out, f, when, {
    partials: [
      ["triangle", 1, 1],
      ["sine", 2, 0.28],
      ["sine", 3, 0.06],
    ],
    attack: 0.008,
    hold: 0,
    release: Math.min(Math.max(len, 0.5), 1.4),
    level: 0.85 * vel,
  });

/** A soft held chord: sine and a quiet triangle, slow in and out. */
const pad = (out: AudioNode, f: number, when: number, vel: number, dur: number) =>
  tone(out, f, when, {
    partials: [
      ["sine", 1, 1],
      ["triangle", 1.002, 0.25],
    ],
    attack: Math.min(0.25, dur / 3),
    hold: Math.max(dur - 0.35, 0.05),
    release: 0.45,
    level: 0.32 * vel,
  });

/** A round bass: sine with a little of its octave so laptops can hear it. */
const bass = (out: AudioNode, f: number, when: number, vel: number, dur: number) =>
  tone(out, f, when, {
    partials: [
      ["sine", 1, 1],
      ["sine", 2, 0.35],
    ],
    attack: 0.012,
    hold: Math.max(dur * 0.4, 0.05),
    release: Math.max(dur * 0.6, 0.2),
    level: 0.7 * vel,
  });

/** A small bell: a sine and an inharmonic shimmer, quick to fade. */
const bell = (out: AudioNode, f: number, when: number, vel: number) =>
  tone(out, f, when, {
    partials: [
      ["sine", 1, 1],
      ["sine", 2.76, 0.18],
    ],
    attack: 0.004,
    hold: 0,
    release: 1.1,
    level: 0.5 * vel,
  });

function sound(out: AudioNode, event: MusicEvent, when: number, len = event.len) {
  const dur = len * EIGHTH;
  for (const midi of event.midi) {
    const f = hz(midi);
    if (event.voice === "pluck") pluck(out, f, when, event.vel, dur);
    else if (event.voice === "pad") pad(out, f, when, event.vel, dur);
    else if (event.voice === "bass") bass(out, f, when, event.vel, dur);
    else bell(out, f, when, event.vel);
  }
}

/** A bus with its own level, so a phrase can be faded out as one. */
function bus(level: number) {
  const g = context!.createGain();
  g.gain.value = level;
  g.connect(master!);
  return g;
}

function fadeOut(g: GainNode, seconds: number) {
  if (!context) return;
  const now = context.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.linearRampToValueAtTime(0, now + seconds);
  setTimeout(() => g.disconnect(), seconds * 1000 + 60);
}

/* ── a key ──────────────────────────────────────────────────── */

/** One note from the keyboard. */
export function play(frequency: number, velocity = 1) {
  if (!enabled || !context || !master) return;
  const now = context.currentTime;
  if (now - (lastPlayed.get(frequency) ?? -1) < 0.08) return;
  lastPlayed.set(frequency, now);
  pluck(master, frequency, now, velocity * 0.9, 0.9);
}

/* ── auditions ──────────────────────────────────────────────── */

let heard: { key: string; bus: GainNode; until: number } | undefined;

function stopAudition(seconds = 0.12) {
  if (!heard) return;
  fadeOut(heard.bus, seconds);
  heard = undefined;
}

/** Play a short phrase once. The same phrase already playing is left alone;
 * any other is faded out first. Silent while the song plays. Returns
 * whether it sounds. */
export function audition(key: string, events: MusicEvent[]): boolean {
  if (!enabled || !context || !master || song) return false;
  const now = context.currentTime;
  if (heard && heard.key === key && now < heard.until) return true;
  stopAudition();
  const out = bus(0.8);
  const start = now + 0.03;
  let end = start;
  for (const event of events) {
    const when = start + event.at * EIGHTH;
    sound(out, event, when);
    end = Math.max(end, when + event.len * EIGHTH);
  }
  heard = { key, bus: out, until: end };
  return true;
}

/* ── the song ───────────────────────────────────────────────── */

let song: { stop(): void } | undefined;

export const songPlaying = () => !!song;

/** Play `events` (sorted by `at`) from `from` eighths on, now. Events that
 * began before `from` but still ring are cut in. Returns a stop. Scheduling
 * runs a few hundred milliseconds ahead of the audio clock, so a pause is
 * heard at once. */
export function playSong(events: MusicEvent[], from: number): () => void {
  stopSong();
  if (!enabled || !context || !master) return () => {};
  stopAudition(0.08);
  const ctx = context;
  const out = bus(0.85);
  const origin = ctx.currentTime + 0.04 - from * EIGHTH;
  let index = 0;
  for (; index < events.length && events[index].at < from; index += 1) {
    const event = events[index];
    const left = event.at + event.len - from;
    if (event.voice !== "bell" && left > 1) sound(out, event, origin + from * EIGHTH, left);
  }
  let ringsUntil = ctx.currentTime;
  let timer: ReturnType<typeof setInterval> | undefined;
  let done: ReturnType<typeof setTimeout> | undefined;
  const pump = () => {
    const horizon = ctx.currentTime + 0.3;
    while (index < events.length && origin + events[index].at * EIGHTH < horizon) {
      const event = events[index];
      const when = Math.max(origin + event.at * EIGHTH, ctx.currentTime);
      sound(out, event, when);
      ringsUntil = Math.max(ringsUntil, when + event.len * EIGHTH + 0.5);
      index += 1;
    }
    if (index >= events.length && timer !== undefined) {
      // all scheduled: the song is over once the last note rings out
      clearInterval(timer);
      timer = undefined;
      done = setTimeout(() => {
        if (song === handle) song = undefined;
      }, (ringsUntil - ctx.currentTime) * 1000);
    }
  };
  const handle = {
    stop() {
      if (timer !== undefined) clearInterval(timer);
      clearTimeout(done);
      fadeOut(out, 0.15);
      if (song === handle) song = undefined;
    },
  };
  timer = setInterval(pump, 60);
  pump();
  song = handle;
  return () => handle.stop();
}

export function stopSong() {
  song?.stop();
}

export function closeSound() {
  stopSong();
  heard = undefined;
  enabled = false;
  void context?.close();
  context = undefined;
  master = undefined;
}
