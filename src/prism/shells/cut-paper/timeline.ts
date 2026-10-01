/** The career as a song. Time is measured in years; one bar of 12/8 is a
 * year and each eighth note a month, so at 120 bpm the whole career plays
 * in under twenty seconds. Everything that happened is a clip on it:
 * projects, roles (parsed from the resume) and updates (markers). */
import type { SiteContent } from "../types";
import { noteAt, noteForUpdate, type NoteId } from "./notes";

/** First and last edge of the arrangement, in years. */
export const FROM = 2020.5;
export const TO = 2027.5;
/** One month is one eighth note at 120 bpm. */
export const MONTH_MS = 250;

export const NOW = (() => {
  const date = new Date();
  return date.getFullYear() + date.getMonth() / 12 + (date.getDate() - 1) / 365;
})();

/** Where a moment sits along the arrangement, 0..1. */
export const place = (t: number) => Math.min(Math.max((t - FROM) / (TO - FROM), 0), 1);
/** A duration as a share of the arrangement. */
export const share = (years: number) => years / (TO - FROM);

export const YEARS: number[] = [];
for (let year = Math.ceil(FROM); year <= Math.floor(TO); year += 1) YEARS.push(year);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_LABELS = MONTHS.map((month) => month[0].toUpperCase() + month.slice(1));

/** 2024.5 -> "Jul 2024" */
export function monthLabel(t: number) {
  const year = Math.floor(t + 1e-6);
  const month = Math.min(11, Math.floor((t - year) * 12 + 1e-6));
  return `${MONTH_LABELS[month]} ${year}`;
}

/** 2024.5 -> { bar: "2024", beat: "07" } (bar = year, beat = month) */
export function position(t: number) {
  const year = Math.floor(t + 1e-6);
  const month = Math.min(11, Math.floor((t - year) * 12 + 1e-6));
  return { bar: String(year), beat: String(month + 1).padStart(2, "0") };
}

/** "Sep 2026" or "September 2026" -> 2026.67 */
export function parseMonth(label: string, fallbackYear?: number) {
  const match = label.toLowerCase().match(/(?:([a-z]{3})[a-z]*\s+)?(\d{4})/);
  if (!match) return fallbackYear ?? NOW;
  const index = match[1] ? MONTHS.indexOf(match[1]) : -1;
  return Number(match[2]) + (index >= 0 ? index / 12 : 0);
}

/** "2026-09-26" -> 2026.73 */
export const parseDate = (iso: string) => {
  const [year, month = "1", day = "1"] = iso.split("-");
  return Number(year) + (Number(month) - 1) / 12 + (Number(day) - 1) / 365;
};

/** A span from free text: "January 2022 - November 2024", "2025 project
 * work", "Selected client work · 2024". Undated text returns undefined. */
export function parseSpan(textContent: string): [number, number] | undefined {
  const found = [...textContent.matchAll(/(?:\b([A-Za-z]{3,9})\s+)?\b((?:19|20)\d{2})\b/g)].map((match) => {
    const index = match[1] ? MONTHS.indexOf(match[1].slice(0, 3).toLowerCase()) : -1;
    return { year: Number(match[2]), month: index };
  });
  if (!found.length) return undefined;
  const first = found[0];
  const last = found[found.length - 1];
  const start = first.year + Math.max(first.month, 0) / 12;
  const end = last.month >= 0 ? last.year + (last.month + 1) / 12 : last.year + 1;
  return [start, Math.max(end, start + 1 / 12)];
}

export interface Role {
  title: string;
  where?: string;
  when?: string;
  span?: [number, number];
  group: string;
}

/** Roles from the resume's markdown: `## Group`, `### Title · Where`, and an
 * `_italic_` line for when. */
export function rolesFrom(markdown: string): Role[] {
  const roles: Role[] = [];
  let group = "";
  let current: Role | undefined;
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      group = line.slice(3).trim();
      current = undefined;
    } else if (line.startsWith("### ")) {
      const [title, where] = line.slice(4).split(" · ");
      current = { title: title.trim(), where: where?.trim(), group };
      roles.push(current);
    } else if (current && !current.when && /^_.+_$/.test(line)) {
      current.when = line.slice(1, -1);
      current.span = parseSpan(current.when);
    }
  }
  return roles;
}

export interface Clip {
  id: string;
  kind: "project" | "role" | "update";
  start: number;
  end: number;
  title: string;
  href?: string;
  note: NoteId;
  /** Index in its own list (projects or updates or roles). */
  index: number;
}

/** How long a project clip runs on the arrangement (nine months). */
export const PROJECT_LENGTH = 0.75;
/** How long an update stays lit (half a month). */
export const UPDATE_LENGTH = 1 / 24;

let cache: { content: SiteContent; clips: Clip[] } | undefined;

/** Every dated thing in the portfolio, in time order. */
export function clipsFor(content: SiteContent): Clip[] {
  if (cache?.content === content) return cache.clips;
  const clips: Clip[] = [];
  content.projects.forEach((project, index) => {
    const start = parseMonth(project.dateLabel, project.year);
    clips.push({
      id: `project:${project.slug}`,
      kind: "project",
      start,
      end: start + PROJECT_LENGTH,
      title: project.title,
      href: project.href,
      note: noteAt(index).id,
      index,
    });
  });
  rolesFrom(content.pages.resume.body).forEach((role, index) => {
    if (!role.span) return;
    clips.push({
      id: `role:${index}`,
      kind: "role",
      start: role.span[0],
      end: role.span[1],
      title: role.where ? `${role.title} · ${role.where}` : role.title,
      href: "/resume",
      note: noteAt(index * 2).id,
      index,
    });
  });
  content.updates.forEach((update, index) => {
    const start = parseDate(update.date);
    clips.push({
      id: `update:${index}`,
      kind: "update",
      start,
      end: start + UPDATE_LENGTH,
      title: update.title,
      href: update.href,
      note: noteForUpdate(update.kind).id,
      index,
    });
  });
  clips.sort((a, b) => a.start - b.start);
  cache = { content, clips };
  return clips;
}
