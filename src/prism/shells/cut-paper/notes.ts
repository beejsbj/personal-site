/** The scale the portfolio is played in: C major, one octave, seven keys.
 * Each section of the site is a scale degree; colour belongs to the note. */
import { fill } from "../rich";
import type { RouteKind, SiteContent } from "../types";

export type NoteId = "do" | "re" | "mi" | "fa" | "sol" | "la" | "ti";

export interface Note {
  id: NoteId;
  sol: string;
  pitch: string;
  frequency: number;
}

export const NOTES: readonly Note[] = [
  { id: "do", sol: "Do", pitch: "C4", frequency: 261.63 },
  { id: "re", sol: "Re", pitch: "D4", frequency: 293.66 },
  { id: "mi", sol: "Mi", pitch: "E4", frequency: 329.63 },
  { id: "fa", sol: "Fa", pitch: "F4", frequency: 349.23 },
  { id: "sol", sol: "Sol", pitch: "G4", frequency: 392.0 },
  { id: "la", sol: "La", pitch: "A4", frequency: 440.0 },
  { id: "ti", sol: "Ti", pitch: "B4", frequency: 493.88 },
];

export const noteAt = (index: number) =>
  NOTES[((index % NOTES.length) + NOTES.length) % NOTES.length];

export const noteVar = (id: NoteId) => `var(--cp-${id})`;

export interface Key {
  note: Note;
  label: string;
  href: string;
  /** Route kinds this key lights up for. */
  kinds: RouteKind[];
  hint: string;
}

export function keysFor(content: SiteContent): Key[] {
  const [home, projects, lab, about, resume, writing, hello] = NOTES;
  const copy = content.lenses["cut-paper"].keys;
  const { counts } = content.derived;
  const key = (
    note: Note,
    words: { label: string; hint: string },
    href: string,
    kinds: RouteKind[],
    n?: number,
  ): Key => ({ note, label: words.label, href, kinds, hint: fill(words.hint, { n: n ?? 0 }) });
  return [
    key(home, copy.home, "/", ["home"]),
    key(projects, copy.projects, "/projects", ["projects", "project"], counts.projects),
    key(lab, copy.lab, "/lab", ["lab", "lab-entry"], counts.lab),
    key(about, copy.about, "/about", ["about"]),
    key(resume, copy.resume, "/resume", ["resume"]),
    key(writing, copy.writing, "/writing", ["writing", "writing-entry"]),
    key(hello, copy.hello, `mailto:${content.site.email}`, []),
  ];
}

export const noteForKind = (keys: Key[], kind: RouteKind): Note | undefined =>
  keys.find((key) => key.kinds.includes(kind))?.note;

/** Update kinds, voiced as scale degrees in the score. */
export function noteForUpdate(kind: string): Note {
  const map: Record<string, NoteId> = {
    project: "do",
    milestone: "mi",
    "pull-request": "fa",
    writing: "la",
  };
  return NOTES.find((note) => note.id === (map[kind] ?? "sol")) ?? NOTES[0];
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Sep 2026" -> 2026.67 */
export function yearPosition(label: string, fallbackYear: number) {
  const [month, year] = label.toLowerCase().split(/\s+/);
  const index = MONTHS.indexOf(month?.slice(0, 3) ?? "");
  const y = Number(year) || fallbackYear;
  return y + (index >= 0 ? index / 12 : 0);
}
