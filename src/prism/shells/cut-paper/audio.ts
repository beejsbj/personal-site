/** The session's instruments. Silent unless the visitor turns sound on; the
 * AudioContext is only made from a gesture (the sound button, or the first
 * tap or key after a reload once sound was on), and never in a prism face.
 *
 * Two buses: playback (the play-through) and audition (hovering a clip).
 * Each can be faded out at once, which also silences notes already
 * scheduled. Everything runs through a soft limiter, and an audition
 * replaces the one before it, so hovering across clips never piles up. */
import { frequency } from "./music";
import type { Voice } from "./score";

const KEY = "cp-sound";
const LEVEL = 0.2;

let context: AudioContext | undefined;
let master: GainNode | undefined;
let noise: AudioBuffer | undefined;
let playBus: GainNode | undefined;
let auditionBus: GainNode | undefined;
let wanted = false;
let allowed = true;
const listeners = new Set<(on: boolean) => void>();

try {
  wanted = sessionStorage.getItem(KEY) === "on";
} catch {
  wanted = false;
}

export const soundWanted = () => wanted && allowed;
/** Sound is on and the context is running: notes will be heard. */
export const soundLive = () => soundWanted() && context?.state === "running";
export const now = () => context?.currentTime ?? 0;

export function onSound(fn: (on: boolean) => void, signal: AbortSignal) {
  listeners.add(fn);
  signal.addEventListener("abort", () => listeners.delete(fn));
}

/** A prism face never makes a sound. */
export function forbidSound() {
  allowed = false;
}

function build() {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  context = new Ctor();
  master = context.createGain();
  master.gain.value = 0;
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 7000;
  const limit = context.createDynamicsCompressor();
  limit.threshold.value = -20;
  limit.knee.value = 12;
  limit.ratio.value = 6;
  limit.attack.value = 0.003;
  limit.release.value = 0.25;
  master.connect(tone).connect(limit).connect(context.destination);
  noise = context.createBuffer(1, context.sampleRate * 0.25, context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
}

/** Wake the context. Call only from inside a user gesture. */
function wake() {
  if (!allowed) return;
  if (!context) build();
  if (!context || !master) return;
  void context.resume();
  const t = context.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(LEVEL, t + 0.3);
}

export function setSound(on: boolean) {
  wanted = on && allowed;
  try {
    sessionStorage.setItem(KEY, wanted ? "on" : "off");
  } catch {
    /* private mode: remember for this page only */
  }
  if (wanted) wake();
  else if (context && master) {
    const t = context.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.12);
    setTimeout(() => void context?.suspend(), 160);
  }
  listeners.forEach((fn) => fn(wanted));
}

/** Sound was on before a reload: the first tap or key wakes it. */
export function armUnlock(signal: AbortSignal) {
  const unlock = () => {
    if (soundWanted() && context?.state !== "running") wake();
  };
  for (const type of ["pointerdown", "keydown"])
    window.addEventListener(type, unlock, { signal, capture: true });
}

function bus(): GainNode | undefined {
  if (!context || !master) return undefined;
  const gain = context.createGain();
  gain.connect(master);
  return gain;
}

function fade(gain: GainNode | undefined, seconds = 0.08) {
  if (!gain || !context) return;
  const t = context.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(0, t + seconds);
  setTimeout(() => gain.disconnect(), seconds * 1000 + 60);
}

/** One note on a bus. `when` is context time. */
function voice(out: GainNode, kind: Voice, degree: number, when: number, seconds: number, velocity: number) {
  if (!context) return;
  const ctx = context;
  const f = frequency(degree);
  const env = ctx.createGain();
  env.connect(out);
  const osc = (type: OscillatorType, freq: number, level: number, stopAt: number, detune = 0) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    g.gain.value = level;
    o.connect(g).connect(env);
    o.start(when);
    o.stop(stopAt);
  };
  const shape = (peak: number, attack: number, decay: number, release = decay) => {
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(peak * velocity, when + attack);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * velocity * 0.35), when + attack + decay);
    env.gain.exponentialRampToValueAtTime(0.0001, when + seconds + release);
    return when + seconds + release + 0.05;
  };
  switch (kind) {
    case "keys": {
      // electric piano: a round body and a quick bell-like tine
      const end = shape(0.08, 0.02, 0.6, 0.5);
      osc("sine", f, 1, end);
      osc("sine", f, 0.4, end, 6);
      osc("sine", f * 4, 0.08, when + 0.25);
      break;
    }
    case "bass": {
      const end = shape(0.3, 0.008, 0.25, 0.12);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 520;
      env.disconnect();
      env.connect(filter).connect(out);
      osc("triangle", f, 1, end);
      osc("sine", f, 0.8, end);
      break;
    }
    case "lead": {
      // a felt piano pluck
      const end = shape(0.22, 0.006, 0.35, 0.25);
      osc("triangle", f, 1, end);
      osc("sine", f * 2, 0.28, end);
      osc("sine", f * 3, 0.07, end);
      break;
    }
    case "chip": {
      // the arcade projects play on an 8-bit voice
      const end = shape(0.07, 0.004, 0.18, 0.08);
      osc("square", f, 1, end);
      osc("square", f * 2, 0.15, end, 4);
      break;
    }
    case "bell": {
      const end = shape(0.11, 0.003, 0.5, 0.9);
      osc("sine", f, 1, end);
      osc("sine", f * 2.76, 0.25, when + 0.6);
      osc("sine", f * 5.4, 0.06, when + 0.25);
      break;
    }
    case "sketch": {
      // kalimba-ish: quick, woody
      const end = shape(0.2, 0.004, 0.22, 0.3);
      osc("sine", f, 1, end);
      osc("sine", f * 3.01, 0.12, when + 0.12);
      break;
    }
    case "brush": {
      if (!noise) return;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 5200;
      band.Q.value = 0.8;
      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(0.035 * velocity, when + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
      src.connect(band).connect(env);
      src.start(when);
      src.stop(when + 0.15);
      break;
    }
  }
}

export interface Play {
  /** Seconds from now. */
  offset: number;
  seconds: number;
  degree: number;
  voice: Voice;
  velocity: number;
}

/** Schedule play-through notes. `when` is context time. */
export function schedule(notes: { when: number; seconds: number; degree: number; voice: Voice; velocity: number }[]) {
  if (!soundLive() || !context) return;
  playBus ??= bus();
  if (!playBus) return;
  for (const n of notes) voice(playBus, n.voice, n.degree, Math.max(n.when, context.currentTime), n.seconds, n.velocity);
}

/** Silence the play-through, including notes already scheduled. */
export function stopPlayback() {
  fade(playBus);
  playBus = undefined;
}

/** Hear a few notes now, replacing whatever was auditioning. Quieter than
 * the play-through. */
export function audition(notes: Play[]) {
  stopAudition();
  if (!soundLive() || !context) return;
  auditionBus = bus();
  if (!auditionBus) return;
  auditionBus.gain.value = 0.75;
  const t = context.currentTime + 0.02;
  for (const n of notes) voice(auditionBus, n.voice, n.degree, t + n.offset, n.seconds, n.velocity);
}

export function stopAudition() {
  fade(auditionBus, 0.06);
  auditionBus = undefined;
}

/** One note, for the keyboard. */
export function tap(degree: number, kind: Voice = "lead", velocity = 0.6) {
  audition([{ offset: 0, seconds: 0.3, degree, voice: kind, velocity }]);
}

export function closeSound() {
  playBus = undefined;
  auditionBus = undefined;
  void context?.close();
  context = undefined;
  master = undefined;
}
