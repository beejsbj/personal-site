/** The session's music, as pure data: one key, one chord progression, and a
 * way to turn any name into a short motif that sits in that key.
 *
 * Time here is in eighth notes. The arrangement maps one month to one eighth
 * and one year to a bar of 12/8 (four dotted-quarter beats), so a project's
 * date is also its place in the music.
 *
 * Degrees are steps of the major scale counted from the tonic (0 = F4,
 * 7 = F5, -7 = F3), so every pitch this module makes is in key by
 * construction. No DOM, no audio: Node tests load this file directly. */

/** F major. MIDI 65 is F4. */
export const TONIC_MIDI = 65;
export const MAJOR = [0, 2, 4, 5, 7, 9, 11] as const;
const NAMES = ["F", "G", "A", "B♭", "C", "D", "E"] as const;

/** One month is one eighth: 250ms, so a bar (a year) is three seconds. */
export const EIGHTH_SECONDS = 0.25;
export const BAR_EIGHTHS = 12;
/** Chords change every half bar: two per year. */
export const CHORD_EIGHTHS = 6;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** MIDI note number of a scale degree. */
export function midi(degree: number): number {
  return TONIC_MIDI + 12 * Math.floor(degree / 7) + MAJOR[mod(degree, 7)];
}

export const frequency = (degree: number) => 440 * 2 ** ((midi(degree) - 69) / 12);

/** "B♭", without octave. */
export const noteName = (degree: number) => NAMES[mod(degree, 7)];

/** Degrees within one octave of the key, as pitch classes 0..6. */
export const pitchClass = (degree: number) => mod(degree, 7);

/** I – vi – ii – V, with sevenths: Fmaj7, Dm7, Gm7, C7. The oldest loop in
 * jazz, and it never stops resolving. Values are chord roots as degrees. */
export const PROGRESSION = [0, 5, 1, 4] as const;
const QUALITY = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7♭5"] as const;

export interface Chord {
  root: number;
  /** "Gm7" */
  name: string;
  /** Pitch classes of root, third, fifth and seventh. */
  tones: number[];
}

export function chord(root: number): Chord {
  const r = pitchClass(root);
  return {
    root: r,
    name: `${noteName(r)}${QUALITY[r]}`,
    tones: [0, 2, 4, 6].map((step) => pitchClass(r + step)),
  };
}

/** The chord on half-bar `index` of a session that is `length` half-bars
 * long. The loop runs I–vi–ii–V; the last half-bar is always V, so every
 * play-through lands home on the final I. */
export function chordAtHalfBar(index: number, length: number): Chord {
  if (length > 1 && index === length - 1) return chord(4);
  if (index >= length) return chord(0);
  return chord(PROGRESSION[mod(index, PROGRESSION.length)]);
}

/** Is this degree one of the chord's tones? */
export const inChord = (degree: number, c: Chord) => c.tones.includes(pitchClass(degree));

/** Deterministic small PRNG (FNV-1a seeded xorshift-ish), so a name always
 * makes the same motif. */
export function seeded(seed: string) {
  let n = 2166136261;
  for (const char of seed) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return () => {
    n = Math.imul(n ^ (n >>> 15), 2246822507);
    n = Math.imul(n ^ (n >>> 13), 3266489909);
    return ((n ^= n >>> 16) >>> 0) / 4294967296;
  };
}

/** Rhythm cells for half a bar of 12/8: [start, length] in eighths. Every
 * cell starts on the downbeat and respects the two dotted-quarter beats
 * (eighths 0 and 3), so motifs swing the same way the bass walks. */
export const RHYTHMS: readonly (readonly [number, number][])[] = [
  [[0, 2], [2, 1], [3, 2], [5, 1]],
  [[0, 3], [3, 1], [4, 1], [5, 1]],
  [[0, 1], [1, 1], [2, 1], [3, 3]],
  [[0, 2], [2, 1], [3, 3]],
  [[0, 1], [2, 1], [3, 2], [5, 1]],
  [[0, 1], [1, 1], [2, 1], [3, 2], [5, 1]],
  [[0, 2], [2, 1], [3, 1], [4, 2]],
];

/** A motif before it meets the harmony: a rhythm and a contour. */
export interface Motif {
  seed: string;
  rhythm: readonly (readonly [number, number])[];
  /** Which chord tone the first note takes: 0 root, 1 third, 2 fifth. */
  opening: number;
  /** +1 up, -1 down, per note after the first. */
  contour: number[];
  /** Lift the whole line by this many degrees (0 or 2). */
  lift: number;
}

export function motif(seed: string): Motif {
  const random = seeded(seed);
  const rhythm = RHYTHMS[Math.floor(random() * RHYTHMS.length)];
  const opening = Math.floor(random() * 3);
  const lift = random() < 0.5 ? 0 : 2;
  // a shape, not noise: mostly one direction, turning back once at most
  const first = random() < 0.5 ? 1 : -1;
  const turn = 1 + Math.floor(random() * Math.max(1, rhythm.length - 1));
  const contour = rhythm.slice(1).map((_, i) => (i + 1 < turn ? first : -first));
  return { seed, rhythm, opening, contour, lift };
}

export interface Note {
  /** Eighths from the motif's start. */
  at: number;
  length: number;
  degree: number;
}

/** The nearest degree in a direction that is a tone of the chord. */
function nextChordTone(from: number, direction: number, c: Chord) {
  let degree = from + direction;
  while (!inChord(degree, c)) degree += direction;
  return degree;
}

/** Sing a motif over the harmony it lands on. `chordAt(eighth)` names the
 * chord under each note. Strong beats (eighths 0 and 3) take chord tones;
 * the notes between move by step, so they pass through the scale; the last
 * note settles on a chord tone. The line stays within F4..C6 (degrees
 * 0..11), turning back when it reaches an edge. */
export function realize(
  m: Motif,
  chordAt: (eighth: number) => Chord,
  low = 0,
  high = 11,
): Note[] {
  const notes: Note[] = [];
  const first = chordAt(0);
  let degree = first.root + [0, 2, 4][m.opening] + m.lift;
  while (degree < low) degree += 7;
  while (degree > high) degree -= 7;
  if (!inChord(degree, first)) degree = nextChordTone(degree, 1, first);
  notes.push({ at: m.rhythm[0][0], length: m.rhythm[0][1], degree });
  m.rhythm.slice(1).forEach(([at, length], i) => {
    const c = chordAt(at);
    let direction = m.contour[i];
    if (degree + direction * 2 > high) direction = -1;
    if (degree + direction * 2 < low) direction = 1;
    const strong = at % 3 === 0;
    const last = i === m.rhythm.length - 2;
    degree = strong || last ? nextChordTone(degree, direction, c) : degree + direction;
    notes.push({ at, length, degree });
  });
  return notes;
}

/** A chord voiced for the keys: its four tones packed into the octave
 * under the melody (degrees -5..1), so changes move by step. */
export function voicing(c: Chord): number[] {
  return c.tones
    .map((tone) => {
      let degree = tone;
      while (degree > 1) degree -= 7;
      while (degree < -5) degree += 7;
      return degree;
    })
    .sort((a, b) => a - b);
}

/** The bass for half a bar: root on the first beat, fifth on the second,
 * and an approach note into the next chord's root on the last eighth. */
export function bassLine(c: Chord, next: Chord): Note[] {
  const root = c.root - 14;
  const target = next.root - 14;
  const approach = target + (target > root ? -1 : 1);
  return [
    { at: 0, length: 2, degree: root },
    { at: 3, length: 2, degree: root + 4 },
    { at: 5, length: 1, degree: approach },
  ];
}
