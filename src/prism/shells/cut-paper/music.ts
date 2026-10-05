/** The piece the portfolio plays. One key (C major, the keyboard's Do to
 * Ti), one tempo (120 bpm, the status bar's metronome) and one progression,
 * so every sound in the lens belongs to the same song.
 *
 * Time: a bar of 12/8 is a year and an eighth note is a month, so at 120
 * bpm a year of the career lasts three seconds. Harmony: I–vi–ii–V
 * (Cmaj7, Am7, Dm7, G7), one chord per half year, pinned to the calendar,
 * so a moment in the career always sounds the same chord.
 *
 * A project's motif is written from its slug and its date: a rhythm from a
 * small book of 12/8 figures, a contour that moves by step, and strong
 * beats that land on the chord sounding at that moment. Same project, same
 * tune, always in key. The clip on the timeline draws exactly these notes.
 *
 * Pure data, no imports at runtime: the shell and the Node tests load it. */

/** One eighth note at 120 bpm, in milliseconds. */
export const EIGHTH_MS = 250;
/** Eighths in a year: one per month. */
export const YEAR_EIGHTHS = 12;
/** How long a project's motif runs, in eighths (months): three beats of 12/8. */
export const MOTIF_EIGHTHS = 9;

/** C major, as semitones above C. */
export const SCALE = [0, 2, 4, 5, 7, 9, 11] as const;
/** Middle C, the keyboard's Do (C4). */
export const TONIC = 60;

/** I–vi–ii–V: chord roots as scale degrees (0 = Do). */
export const PROGRESSION = [0, 5, 1, 4] as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** A scale degree (0 = C4, 7 = C5, -7 = C3) as a MIDI note. */
export const midiOf = (degree: number) =>
  TONIC + 12 * Math.floor(degree / 7) + SCALE[mod(degree, 7)];

export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** True when a MIDI note is in C major. */
export const inKey = (midi: number) => (SCALE as readonly number[]).includes(mod(midi, 12));

/** The chord sounding at a moment of the career (years, e.g. 2024.5):
 * its root as a scale degree. */
export function chordAt(t: number): number {
  return PROGRESSION[mod(Math.floor(t * 2 + 1e-9), PROGRESSION.length)];
}

/** Pitch classes (degrees 0..6) of the triad on a root. */
export const triad = (root: number) => [root, root + 2, root + 4].map((d) => mod(d, 7));
/** The four notes of the seventh chord on a root. */
export const seventh = (root: number) => [...triad(root), mod(root + 6, 7)];

/** Lift or drop a MIDI note by octaves into [low, low + 12). */
const into = (midi: number, low: number) => low + mod(midi - low, 12);

/** A close voicing of the seventh chord, around the octave below middle C. */
export const padVoicing = (root: number) =>
  seventh(root)
    .map((d) => into(midiOf(d), 52))
    .sort((a, b) => a - b);

/** The chord's root, low. */
export const bassNote = (root: number) => into(midiOf(root), 40);

/** Deterministic small PRNG (FNV-1a seed, xorshift-multiply). */
export function seeded(seed: string) {
  let n = 2166136261;
  for (const char of seed) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return () => {
    n = Math.imul(n ^ (n >>> 15), 2246822507);
    n = Math.imul(n ^ (n >>> 13), 3266489909);
    return ((n ^= n >>> 16) >>> 0) / 4294967296;
  };
}

/** Rhythms for a motif, in eighths. Each fills three dotted-quarter beats
 * and ends on a held note, so a phrase always lands. */
const RHYTHMS: readonly number[][] = [
  [3, 3, 3],
  [2, 1, 3, 3],
  [1, 1, 1, 3, 3],
  [3, 2, 1, 3],
  [2, 1, 2, 1, 3],
  [3, 1, 1, 1, 3],
  [1, 2, 3, 3],
  [2, 1, 1, 2, 3],
];

/** Where a melody may sit: A4 to C6. */
const LOW = 5;
const HIGH = 14;

/** The chord tone nearest a degree, inside the melody's range. */
function nearestTone(degree: number, tones: number[], prefer = 0): number {
  for (let distance = 0; distance < 7; distance += 1) {
    const order = prefer < 0 ? [-distance, distance] : [distance, -distance];
    for (const offset of order) {
      const candidate = degree + offset;
      if (candidate < LOW || candidate > HIGH) continue;
      if (tones.includes(mod(candidate, 7))) return candidate;
    }
  }
  return degree;
}

export interface MotifNote {
  /** Eighths from the start of the motif. */
  at: number;
  len: number;
  /** Scale degree (0 = C4). */
  degree: number;
}

/** A project's tune. `start` is its date in years; `anchor` the scale
 * degree of its colour (the note the lens gives it), where the tune begins. */
export function motif(seed: string, start: number, anchor: number): MotifNote[] {
  const random = seeded(`motif:${seed}`);
  const rhythm = RHYTHMS[Math.floor(random() * RHYTHMS.length)];
  const notes: MotifNote[] = [];
  let degree = 7 + mod(anchor, 7);
  let at = 0;
  rhythm.forEach((len, index) => {
    const tones = triad(chordAt(start + at / YEAR_EIGHTHS));
    const last = index === rhythm.length - 1;
    let step = 0;
    if (index > 0) {
      const steps = [-2, -1, -1, 1, 1, 2];
      step = steps[Math.floor(random() * steps.length)];
      degree += step;
      // turn back at the edges instead of leaving the range
      if (degree < LOW + 1) degree += 3;
      if (degree > HIGH - 1) degree -= 3;
    }
    if (last) {
      // end on the chord's root or third, whichever is nearer
      const home = [tones[0], tones[1]];
      degree = nearestTone(degree, home, step);
    } else if (at % 3 === 0) {
      degree = nearestTone(degree, tones, step);
    }
    notes.push({ at, len, degree });
    at += len;
  });
  return notes;
}

/** A sound to make. `at` and `len` in eighths from the start of the phrase. */
export interface MusicEvent {
  at: number;
  len: number;
  voice: "pluck" | "pad" | "bass" | "bell";
  midi: number[];
  /** 0..1 */
  vel: number;
}

/** The bed under a stretch of time: a pad chord per half year and a bass
 * on each dotted-quarter beat (root, then fifth). `from` and `to` are years;
 * `origin` the year the phrase's `at` counts from. `bass` decides, per
 * chord, whether the bass plays (the career is "in work" then). */
export function bed(
  from: number,
  to: number,
  origin: number,
  bass: (t: number) => boolean = () => true,
): MusicEvent[] {
  const events: MusicEvent[] = [];
  const eighth = (t: number) => (t - origin) * YEAR_EIGHTHS;
  let t = Math.floor(from * 2 + 1e-9) / 2;
  while (t < to - 1e-9) {
    const next = t + 0.5;
    const start = Math.max(t, from);
    const end = Math.min(next, to);
    const root = chordAt(t);
    events.push({
      at: eighth(start),
      len: eighth(end) - eighth(start),
      voice: "pad",
      midi: padVoicing(root),
      vel: 0.32,
    });
    if (bass(t)) {
      const low = bassNote(root);
      // beats of the half bar: eighths 0 and 3 of the chord
      for (const [offset, midi] of [
        [0, low],
        [3, low + 7],
      ] as const) {
        const beat = t + offset / YEAR_EIGHTHS;
        if (beat < from - 1e-9 || beat >= to - 1e-9) continue;
        events.push({ at: eighth(beat), len: 2.6, voice: "bass", midi: [midi], vel: 0.5 });
      }
    }
    t = next;
  }
  return events;
}

/** A motif's notes as events, `offset` eighths into the phrase. */
export const motifEvents = (notes: MotifNote[], offset = 0, vel = 0.62): MusicEvent[] =>
  notes.map((note) => ({
    at: offset + note.at,
    len: note.len,
    voice: "pluck",
    midi: [midiOf(note.degree)],
    vel,
  }));

/** A small bell on the chord's third, two octaves up: an update. */
export const bellAt = (t: number, offset: number): MusicEvent => ({
  at: offset,
  len: 3,
  voice: "bell",
  midi: [into(midiOf(triad(chordAt(t))[1]), 79)],
  vel: 0.34,
});

/** A chord rolled upward, harp-like, from `at`: the pad voicing plus its
 * root an octave above. */
export function roll(root: number, at: number, vel = 0.5): MusicEvent[] {
  const notes = [...padVoicing(root), into(midiOf(root), 64)];
  return notes.map((midi, index) => ({
    at: at + index * 0.25,
    len: 5 - index * 0.25,
    voice: "pluck",
    midi: [midi],
    vel: vel * (1 - index * 0.06),
  }));
}

/** A credit on the resume, heard: the chord where it starts, rolled, then
 * the chord where it ends (home to I when the two are the same). */
export function creditPhrase(start: number, end: number): MusicEvent[] {
  const first = chordAt(start);
  let last = chordAt(end);
  if (last === first) last = first === 0 ? 4 : 0;
  return [
    ...roll(first, 0, 0.5),
    { at: 0, len: 3, voice: "bass", midi: [bassNote(first)], vel: 0.42 },
    ...roll(last, 3, 0.44),
    { at: 3, len: 3, voice: "bass", midi: [bassNote(last)], vel: 0.38 },
  ];
}

/** The last chord of the song: I, rolled and held. */
export const cadence = (at: number): MusicEvent[] => [
  ...roll(0, at, 0.55),
  { at, len: 9, voice: "pad", midi: padVoicing(0), vel: 0.3 },
  { at, len: 6, voice: "bass", midi: [bassNote(0)], vel: 0.5 },
];

/** Every MIDI note an event list will sound. */
export const notesOf = (events: MusicEvent[]) => events.flatMap((event) => event.midi);
