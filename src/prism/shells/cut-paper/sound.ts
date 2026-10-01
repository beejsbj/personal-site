/** The keyboard's voice. Silent unless the visitor opts in; the context is
 * only created from that opt-in gesture, and never in a prism face. */

let context: AudioContext | undefined;
let master: GainNode | undefined;
let enabled = false;
const lastPlayed = new Map<number, number>();

export const soundOn = () => enabled;

export function setSound(on: boolean) {
  enabled = on;
  if (!on) {
    void context?.suspend();
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
    master.gain.value = 0.16;
    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2600;
    master.connect(tone).connect(context.destination);
  }
  void context.resume();
}

/** A short felt-piano-ish pluck: triangle body, a sine an octave up. */
export function play(frequency: number, velocity = 1) {
  if (!enabled || !context || !master) return;
  const now = context.currentTime;
  if (now - (lastPlayed.get(frequency) ?? -1) < 0.08) return;
  lastPlayed.set(frequency, now);
  const voice = context.createGain();
  voice.gain.setValueAtTime(0.0001, now);
  voice.gain.exponentialRampToValueAtTime(0.9 * velocity, now + 0.008);
  voice.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  voice.connect(master);
  const partials: [OscillatorType, number, number][] = [
    ["triangle", 1, 1],
    ["sine", 2, 0.28],
    ["sine", 3, 0.08],
  ];
  for (const [type, ratio, level] of partials) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency * ratio;
    gain.gain.value = level;
    osc.connect(gain).connect(voice);
    osc.start(now);
    osc.stop(now + 1);
  }
}

export function closeSound() {
  enabled = false;
  void context?.close();
  context = undefined;
  master = undefined;
}

/** Play a few frequencies together, a hair apart, like a strummed chord. */
export function strum(frequencies: number[], velocity = 0.7, spread = 18) {
  if (!enabled) return;
  frequencies.forEach((frequency, index) =>
    setTimeout(() => play(frequency, velocity / Math.sqrt(frequencies.length)), index * spread),
  );
}
