/**
 * Which drawing sits in the margin beside an experiment. A drawing there is
 * a note about the work, so it is chosen from the work and from nothing else:
 * what it says it is about, then what its page holds, then what kind of card
 * it is. The same entry is the same drawing on every visit and beside any
 * neighbour; there is no chance in it, and no count of what other entries
 * have already been given.
 *
 * Pure: no DOM, so the rule can be read, and tested, as it stands. How each
 * is drawn is in ink.ts, in the order of `DRAWINGS`.
 */

import { labPrints } from "../../../lib/rules.ts";

/** Every drawing there is, in the order ink.ts draws them. The first three
 * keep their places: micro.css moves them (the beat, the spiral). */
export const DRAWINGS = [
  "lotus",
  "beats",
  "spiral",
  "flask",
  "box",
  "bulb",
  "plane",
  "planet",
  "noughts",
  "star",
  "bolt",
  "rocket",
  "hills",
  "note",
  "bird",
  "clapper",
  "house",
  "book",
  "pot",
] as const;
export type Drawing = (typeof DRAWINGS)[number];

/** What an experiment is about, and what a drawing says of it. The first
 * line that names it wins, so the order is the rule: the narrower the
 * subject, the nearer the top (a house before a 3D model; music before a
 * game that is also about music). */
const SUBJECTS: [Drawing, RegExp][] = [
  ["bolt", /\bstrain|\bstress\b/],
  ["bird", /\b(?:birds?|crows?|cockatoos?)\b/],
  ["pot", /\b(?:recipes?|cook\w*|kitchen|meals?)\b/],
  ["house", /\b(?:house\w*|floor plans?|rooms?)\b/],
  ["note", /\b(?:music\w*|midi|songs?|sing|sings|singing|hum|pitch\w*|strudel|orchestra|melod\w*|sound\w*)\b/],
  ["star", /\bstars?\b/],
  ["beats", /\b(?:beat\w*|tempo|pulses?|rhythm\w*)\b/],
  ["lotus", /\b(?:lotus|meditat\w*|petals?)\b/],
  ["planet", /\b(?:orrery|observatory|telescope|planets?|space|orbits?)\b/],
  ["box", /\b(?:3d|three\.js|blender|models?|splat\w*|cubes?)\b/],
  ["clapper", /\b(?:films?|lyric|animat\w+|cinema|movies?)\b/],
  ["spiral", /\b(?:layers?|spirals?|swirl\w*|recursi\w+)\b/],
  ["book", /\b(?:journal\w*|notebooks?|diary|essays?|writing|reading)\b/],
  ["noughts", /\b(?:games?|gambl\w*|roulette|chess|puzzles?)\b/],
  ["hills", /\b(?:hills?|mountains?|landscapes?|terrain|walk\w*)\b/],
  ["plane", /\b(?:send\w*|publish\w*|ship\w*|deploy\w*)\b/],
  ["rocket", /\b(?:rockets?|launch\w*|first ever)\b/],
  ["bulb", /\b(?:ideas?|unfinished|hunch|sketch\w*)\b/],
];

/** The block types and kinds of picture that say what a page holds, when
 * its words do not say what it is about. */
const HOLDS: Record<string, Drawing> = {
  model: "box",
  film: "clapper",
  video: "clapper",
  audio: "note",
};

/** What a card is, when nothing else says: something to play where it
 * lies, several pictures, one, or only words. */
const KINDS = {
  play: "bolt",
  prints: "hills",
  print: "flask",
  words: "bulb",
} as const satisfies Record<string, Drawing>;

type Entry = {
  title: string;
  summary: string;
  preview?: unknown;
  cover?: string;
  media?: { type: string; src: string }[];
  blocks?: { type: string }[];
};

/** The drawing an experiment is given. */
export function drawingFor(entry: Entry): Drawing {
  const said = `${entry.title} ${entry.summary}`.toLowerCase();
  for (const [drawing, subject] of SUBJECTS) if (subject.test(said)) return drawing;
  for (const kind of [
    ...(entry.blocks ?? []).map((block) => block.type),
    ...(entry.media ?? []).map((one) => one.type),
  ])
    if (HOLDS[kind]) return HOLDS[kind];
  if (entry.preview) return KINDS.play;
  if (!entry.cover) return KINDS.words;
  return labPrints({ cover: entry.cover, media: entry.media }).length > 1
    ? KINDS.prints
    : KINDS.print;
}
