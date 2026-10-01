/** The scale the portfolio is played in: C major, one octave, seven keys.
 * Each section of the site is a scale degree and a view of the session;
 * colour belongs to the note. */
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
  /** The DAW view this section is, in the session's own words. */
  view: string;
  hint: string;
}

export function keysFor(content: SiteContent): Key[] {
  const [home, projects, lab, about, resume, writing, hello] = NOTES;
  return [
    { note: home, label: "Home", href: "/", kinds: ["home"], view: "session", hint: "clip launcher" },
    {
      note: projects,
      label: "Projects",
      href: "/projects",
      kinds: ["projects", "project"],
      view: "arrangement",
      hint: `${content.projects.length} tracks`,
    },
    {
      note: lab,
      label: "Lab",
      href: "/lab",
      kinds: ["lab", "lab-entry"],
      view: "devices",
      hint: `${content.lab.length} devices`,
    },
    { note: about, label: "About", href: "/about", kinds: ["about"], view: "liner notes", hint: "set info" },
    { note: resume, label: "Resume", href: "/resume", kinds: ["resume"], view: "roles", hint: "as tracks" },
    {
      note: writing,
      label: "Writing",
      href: content.site.writingUrl,
      kinds: [],
      view: "send a",
      hint: "substack",
    },
    {
      note: hello,
      label: "Hello",
      href: `mailto:${content.site.email}`,
      kinds: [],
      view: "send b",
      hint: "email",
    },
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
