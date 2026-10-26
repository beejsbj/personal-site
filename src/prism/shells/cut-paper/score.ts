/** The career as a session: every dated thing in content.json becomes a clip
 * on a track at its real date, and the whole session becomes a score.
 *
 *   Changes  the chord loop (keys and brushes), always there
 *   Roles    the bass: it walks while any role or course on the resume runs
 *   Projects one track each; the clip sings the project's motif
 *   Markers  each update rings a bell on a tone of the chord it lands on
 *
 * Time is in years (2024.5 is the start of July 2024). One month is one
 * eighth note, so a year is a bar of 12/8 and the career plays in about
 * twenty seconds. Lab sketches carry no date, so they have motifs but no
 * place on the timeline. Pure: no DOM, no audio. */
import type { Project, ResumeEntry, SiteContent } from "../types";
import {
  bassLine,
  BAR_EIGHTHS,
  chord,
  chordAtHalfBar,
  motif,
  realize,
  voicing,
  type Chord,
  type Note,
} from "./music.ts";

export type Voice = "keys" | "brush" | "bass" | "lead" | "chip" | "bell" | "sketch";

/** "changes", "roles", "markers" or "project:<slug>". */
export type TrackId = string;

export interface Clip {
  id: string;
  track: TrackId;
  kind: "project" | "role" | "update";
  /** The slug, resume entry id or update id the clip stands for. */
  ref: string;
  start: number;
  end: number;
  voice: Voice;
  /** Its own notes, in eighths from `start` (projects only). */
  notes: Note[];
}

export interface NoteEvent {
  t: number;
  /** In years. */
  length: number;
  degree: number;
  voice: Voice;
  track: TrackId;
  velocity: number;
}

export interface Session {
  /** Where the music starts (a half-bar line before the first clip). */
  from: number;
  /** Where it ends: the last clip's end or today, on a half-bar line. The
   * final chord sounds here. */
  end: number;
  /** Today. The playhead rests here. */
  now: number;
  tracks: TrackId[];
  clips: Clip[];
  /** Every note of the play-through, in time order. */
  events: NoteEvent[];
  chordAt(t: number): Chord;
  /** The half-bar lines from `from` to `end`, each with its chord. */
  changes: { t: number; chord: Chord }[];
}

export const MONTH = 1 / BAR_EIGHTHS;
/** How long a project clip runs: half a bar, six months. */
export const PROJECT_LENGTH = 0.5;
const HALF = 0.5;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Sep 2026" or "September 2026" -> 2026.667. */
export function parseMonth(label: string, fallbackYear: number): number {
  const match = label.toLowerCase().match(/(?:([a-z]{3})[a-z]*\.?\s+)?((?:19|20)\d{2})/);
  if (!match) return fallbackYear;
  const index = match[1] ? MONTHS.indexOf(match[1]) : -1;
  return Number(match[2]) + (index >= 0 ? index / 12 : 0);
}

/** "2022-01" -> 2022.0; "2024" -> 2024.0. `end` gives the end of the
 * month (or year) instead. */
export function parsePartial(value: string | undefined, end = false): number | undefined {
  const match = value?.match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!match) return undefined;
  const year = Number(match[1]);
  if (!match[2]) return end ? year + 1 : year;
  const month = Number(match[2]) - 1;
  return year + (month + (end ? 1 : 0)) / 12;
}

/** "2026-09-26" -> the half of the month it falls in (a sixteenth). */
export function parseDay(iso: string): number {
  const [year, month = "1", day = "1"] = iso.split("-");
  return Number(year) + (Number(month) - 1) / 12 + (Number(day) >= 16 ? MONTH / 2 : 0);
}

/** Today as a session time. */
export function today(date = new Date()): number {
  return date.getFullYear() + date.getMonth() / 12 + (date.getDate() - 1) / 365;
}

export const projectTrack = (slug: string): TrackId => `project:${slug}`;

/** The span a resume entry covers, or nothing if it has no dates. */
export function entrySpan(entry: ResumeEntry, now: number): [number, number] | undefined {
  const start = parsePartial(entry.start);
  if (start === undefined) return undefined;
  const end = parsePartial(entry.end, true) ?? (entry.current ? now : start + 1);
  return [start, Math.max(end, start + MONTH)];
}

const projectStart = (p: Project) => parseMonth(p.dateLabel, p.year);

/** Which chord tone an update's bell takes, by kind. */
const BELL: Record<string, number> = { project: 0, milestone: 2, "pull-request": 1, writing: 3 };

const cache = new WeakMap<SiteContent, Session>();

export function sessionFor(content: SiteContent, now = today()): Session {
  const hit = cache.get(content);
  if (hit && hit.now === now) return hit;

  const roles = [...content.resume.experience.roles, ...content.resume.education.entries]
    .map((entry) => ({ entry, span: entrySpan(entry, now) }))
    .filter((r): r is { entry: ResumeEntry; span: [number, number] } => !!r.span);
  const starts = [
    ...content.projects.map(projectStart),
    ...roles.map((r) => r.span[0]),
    ...content.updates.map((u) => parseDay(u.date)),
  ];
  const ends = [
    ...content.projects.map((p) => projectStart(p) + PROJECT_LENGTH),
    ...roles.map((r) => Math.min(r.span[1], Math.max(now, r.span[0]))),
    ...content.updates.map((u) => parseDay(u.date) + MONTH),
    now,
  ];
  const from = Math.floor(Math.min(now - 1, ...starts) * 2) / 2;
  const end = Math.max(Math.ceil(Math.max(...ends) * 2) / 2, from + 1);
  const halfBars = Math.round((end - from) / HALF);
  const halfBarAt = (t: number) => Math.floor((t - from) / HALF + 1e-9);
  const chordAt = (t: number) => chordAtHalfBar(halfBarAt(t), halfBars);

  const clips: Clip[] = [];
  const events: NoteEvent[] = [];
  const add = (e: NoteEvent) => events.push(e);

  // Changes: the keys strike each chord, brushes keep the 12/8 swing
  const changes: Session["changes"] = [];
  for (let i = 0; i < halfBars; i += 1) {
    const t = from + i * HALF;
    const c = chordAtHalfBar(i, halfBars);
    changes.push({ t, chord: c });
    for (const degree of voicing(c))
      add({ t, length: HALF - MONTH / 2, degree, voice: "keys", track: "changes", velocity: 0.5 });
    for (let e = 0; e < 6; e += 1)
      add({ t: t + e * MONTH, length: MONTH / 2, degree: 0, voice: "brush", track: "changes", velocity: e % 3 === 0 ? 0.6 : 0.3 });
  }
  // the final chord: home, held
  for (const degree of [...voicing(chord(0)), 7])
    add({ t: end, length: 1, degree, voice: "keys", track: "changes", velocity: 0.55 });

  // Roles: one clip each; the bass walks wherever at least one is running
  roles.forEach(({ entry, span }) =>
    clips.push({
      id: `role:${entry.id}`,
      track: "roles",
      kind: "role",
      ref: entry.id,
      start: span[0],
      end: span[1],
      voice: "bass",
      notes: [],
    }),
  );
  const working = (t: number) => roles.some(({ span }) => t >= span[0] && t < Math.min(span[1], end));
  for (let i = 0; i < halfBars; i += 1) {
    const t = from + i * HALF;
    const next = i + 1 < halfBars ? chordAtHalfBar(i + 1, halfBars) : chord(0);
    for (const note of bassLine(chordAtHalfBar(i, halfBars), next)) {
      const at = t + note.at * MONTH;
      if (working(at))
        add({ t: at, length: note.length * MONTH, degree: note.degree, voice: "bass", track: "roles", velocity: note.at === 0 ? 0.8 : 0.6 });
    }
  }

  // Projects: each sings its motif over the changes at its date
  for (const project of content.projects) {
    const start = projectStart(project);
    const voice: Voice = project.kind === "Arcade" ? "chip" : "lead";
    const notes = realize(motif(project.slug), (eighth) => chordAt(start + eighth * MONTH));
    const track = projectTrack(project.slug);
    clips.push({ id: track, track, kind: "project", ref: project.slug, start, end: start + PROJECT_LENGTH, voice, notes });
    for (const note of notes)
      add({ t: start + note.at * MONTH, length: note.length * MONTH, degree: note.degree, voice, track, velocity: note.at % 3 === 0 ? 0.85 : 0.65 });
  }

  // Markers: a bell per update; updates in the same half-month strum
  const byTime = [...content.updates].sort((a, b) => a.date.localeCompare(b.date));
  let previous = -Infinity;
  let stack = 0;
  for (const update of byTime) {
    const at = parseDay(update.date);
    stack = Math.abs(at - previous) < 1e-6 ? stack + 1 : 0;
    previous = at;
    const t = at + stack * (MONTH / 6);
    const c = chordAt(at);
    const tone = c.tones[BELL[update.kind] ?? 2];
    clips.push({ id: `update:${update.id}`, track: "markers", kind: "update", ref: update.id, start: at, end: at + MONTH / 2, voice: "bell", notes: [] });
    add({ t, length: MONTH * 2, degree: tone + 7, voice: "bell", track: "markers", velocity: 0.55 });
  }
  add({ t: end, length: 1.5, degree: 14, voice: "bell", track: "markers", velocity: 0.35 });

  events.sort((a, b) => a.t - b.t);
  clips.sort((a, b) => a.start - b.start);
  const session: Session = {
    from,
    end,
    now,
    tracks: ["changes", "roles", ...content.projects.map((p) => projectTrack(p.slug)), "markers"],
    clips,
    events,
    chordAt,
    changes,
  };
  cache.set(content, session);
  return session;
}

/** A lab sketch's motif: undated, so it is sung over the home chord. */
export function sketchNotes(slug: string): Note[] {
  const home = chord(0);
  return realize(motif(slug), () => home);
}

export const clipFor = (session: Session, id: string) => session.clips.find((clip) => clip.id === id);
