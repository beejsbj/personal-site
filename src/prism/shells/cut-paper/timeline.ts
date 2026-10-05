/** The career as an arrangement. Everything dated in content.json gets a
 * place in time: each project is a clip as long as its motif, each update a
 * marker, each resume entry a span. The song is built from the same model,
 * so what is drawn is what plays. Nothing here is hard-coded to the
 * content: the range grows to fit whatever the dates are. */
import type { Project, ResumeEntry, SiteContent, Update } from "../types";
import {
  bed,
  bellAt,
  cadence,
  creditPhrase,
  motif,
  motifEvents,
  MOTIF_EIGHTHS,
  YEAR_EIGHTHS,
  type MotifNote,
  type MusicEvent,
} from "./music";
import { noteAt, noteForUpdate, type NoteId } from "./notes";

const MONTH = 1 / YEAR_EIGHTHS;

/** Today, in years (2026.75 is the start of October 2026). */
export function today(date = new Date()) {
  return date.getFullYear() + date.getMonth() / 12 + (date.getDate() - 1) / 365;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Sep 2026" or "September 2026" -> 2026.67; a bare year -> its January. */
export function parseLabel(label: string, fallbackYear: number) {
  const match = label.toLowerCase().match(/(?:([a-z]{3})[a-z]*\.?\s+)?(\d{4})/);
  if (!match) return fallbackYear;
  const index = match[1] ? MONTHS.indexOf(match[1]) : -1;
  return Number(match[2]) + (index >= 0 ? index / 12 : 0);
}

/** "2026-09-26" -> 2026.73; "2022-01" -> 2022.0; "2025" -> 2025.0 */
export function parseDate(iso: string) {
  const [year, month = "1", day = "1"] = iso.split("-");
  return Number(year) + (Number(month) - 1) / 12 + (Number(day) - 1) / 365;
}

/** The end of a resume date: a month means the end of that month, a bare
 * year the end of that year. */
function parseEnd(iso: string) {
  const [year, month] = iso.split("-");
  return month ? Number(year) + Number(month) / 12 : Number(year) + 1;
}

export interface Clip {
  project: Project;
  /** Position in content.projects (track number - 1). */
  index: number;
  note: NoteId;
  start: number;
  end: number;
  notes: MotifNote[];
  /** Row on a single shared lane (the phone tape), so clips never overlap. */
  row: number;
}

export interface Span {
  entry: ResumeEntry;
  part: "resume.role" | "resume.education";
  start: number;
  end: number;
  row: number;
}

export interface Marker {
  update: Update;
  t: number;
  note: NoteId;
  /** Stagger row (0..2), so markers days apart stay legible. */
  row: number;
}

export interface Model {
  from: number;
  /** Right edge of the ruler. */
  to: number;
  now: number;
  /** Where playback ends: now, or later if a clip's music runs on. */
  end: number;
  clips: Clip[];
  spans: Span[];
  markers: Marker[];
  years: number[];
  clipRows: number;
  spanRows: number;
  /** 0..1 along the ruler. */
  place(t: number): number;
}

/** Give each item the first row where it does not overlap the last one. */
function rows<T extends { start: number; end: number; row: number }>(items: T[]) {
  const ends: number[] = [];
  for (const item of [...items].sort((a, b) => a.start - b.start)) {
    let row = ends.findIndex((end) => end <= item.start + 1e-6);
    if (row < 0) row = ends.length;
    ends[row] = item.end;
    item.row = row;
  }
  return Math.max(ends.length, 1);
}

const cache = new WeakMap<SiteContent, Model>();

export function modelFor(content: SiteContent, now = today()): Model {
  const hit = cache.get(content);
  if (hit) return hit;

  const clips: Clip[] = content.projects.map((project, index) => {
    const start = parseLabel(project.dateLabel, project.year);
    const note = noteAt(index);
    return {
      project,
      index,
      note: note.id,
      start,
      end: start + MOTIF_EIGHTHS * MONTH,
      notes: motif(project.slug, start, index),
      row: 0,
    };
  });

  const spans: Span[] = [];
  const dated = (entry: ResumeEntry, part: Span["part"]) => {
    if (!entry.start) return;
    const start = parseDate(entry.start);
    const end = entry.current || !entry.end ? (entry.current ? now : start + 1) : parseEnd(entry.end);
    spans.push({ entry, part, start, end: Math.max(end, start + MONTH), row: 0 });
  };
  content.resume.experience.roles.forEach((entry) => dated(entry, "resume.role"));
  content.resume.education.entries.forEach((entry) => dated(entry, "resume.education"));

  const markers: Marker[] = content.updates
    .map((update) => ({ update, t: parseDate(update.date), note: noteForUpdate(update.kind).id, row: 0 }))
    .sort((a, b) => a.t - b.t);
  markers.forEach((marker, index) => (marker.row = index % 3));

  const starts = [...clips.map((c) => c.start), ...spans.map((s) => s.start), ...markers.map((m) => m.t)];
  const ends = [...clips.map((c) => c.end), ...spans.map((s) => s.end), ...markers.map((m) => m.t), now];
  const first = starts.length ? Math.min(...starts) : now - 1;
  const from = Math.floor((first - MONTH) * 2) / 2;
  const end = Math.max(now, ...clips.map((c) => c.end));
  const to = Math.ceil((Math.max(...ends) + MONTH) * 2) / 2;

  const years: number[] = [];
  for (let year = Math.ceil(from); year < to; year += 1) years.push(year);

  const model: Model = {
    from,
    to,
    now,
    end,
    clips,
    spans,
    markers,
    years,
    clipRows: rows(clips),
    spanRows: rows(spans),
    place: (t) => Math.min(Math.max((t - from) / (to - from), 0), 1),
  };
  cache.set(content, model);
  return model;
}

/* ── what it sounds like ─────────────────────────────────────── */

/** True while any resume entry is under way: the bass plays then. */
const working = (model: Model) => (t: number) =>
  model.spans.some((span) => span.start <= t + 0.25 && span.end > t);

/** The whole career as one piece, in eighths from `model.from`: the bed,
 * every project's motif at its date, a bell for each update, and I at the
 * end. Sorted by time. */
export function songFor(model: Model): MusicEvent[] {
  const eighth = (t: number) => (t - model.from) * YEAR_EIGHTHS;
  const events: MusicEvent[] = [
    ...bed(model.from, model.end, model.from, working(model)),
    ...model.clips.flatMap((clip) => motifEvents(clip.notes, eighth(clip.start))),
    ...model.markers
      .filter((marker) => marker.t >= model.from && marker.t <= model.end)
      .map((marker) => bellAt(marker.t, eighth(marker.t))),
    ...cadence(eighth(model.end)),
  ];
  return events.sort((a, b) => a.at - b.at);
}

/** A clip auditioned: its motif over the chords under it, as the song
 * plays it there. */
export function clipPhrase(clip: Clip): MusicEvent[] {
  return [
    ...bed(clip.start, clip.end, clip.start).map((event) => ({ ...event, vel: event.vel * 0.8 })),
    ...motifEvents(clip.notes, 0, 0.7),
  ];
}

/** A resume entry auditioned: the chord it starts on, then where it ends. */
export function spanPhrase(span: Pick<Span, "start" | "end">): MusicEvent[] {
  return creditPhrase(span.start, span.end);
}

/** The bell for one update. */
export const markerPhrase = (marker: Marker): MusicEvent[] => [{ ...bellAt(marker.t, 0), vel: 0.42 }];

/** Which clip the playhead is in (the latest to start, if two overlap). */
export function clipAt(model: Model, t: number): Clip | undefined {
  let found: Clip | undefined;
  for (const clip of model.clips)
    if (clip.start <= t + 1e-6 && t < clip.end && (!found || clip.start > found.start)) found = clip;
  return found;
}

/** Month and year of a moment, in the visitor's locale ("Jul 2024"). */
export function monthLabel(t: number) {
  const year = Math.floor(t + 1e-6);
  const month = Math.min(11, Math.floor((t - year) * 12 + 1e-6));
  return new Date(year, month, 1).toLocaleDateString("en", { month: "short", year: "numeric" });
}

/** Bar and beat on the ruler: the year, then the month as 01..12. */
export function position(t: number) {
  const year = Math.floor(t + 1e-6);
  const month = Math.min(11, Math.floor((t - year) * 12 + 1e-6));
  return { bar: String(year), beat: String(month + 1).padStart(2, "0") };
}
