import { selectActivitySnapshot } from "./activity.mjs";

const SOURCES = new Set([
  "site",
  "github",
  "substack",
  "bjslab",
  "agent-session",
  "manual",
  "generic",
]);
const KINDS = new Set([
  "project",
  "pull-request",
  "repository",
  "writing",
  "lab",
  "milestone",
]);
const text = (value, label, max = 280) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`Invalid activity ${label}`);
  return value.trim();
};
const date = (value, label) => {
  const result = text(value, label, 50);
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    throw new Error(`Invalid activity ${label}`);
  return result;
};
const href = (value) => {
  const result = text(value, "link", 2048);
  const url = new URL(result, "https://burooj.dev");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    /[\u0000-\u001F\u007F]/.test(result) ||
    result.startsWith("//") ||
    result.includes("\\")
  )
    throw new Error("Invalid activity link");
  if (!result.startsWith("/") && !/^https?:\/\//.test(result))
    throw new Error("Invalid activity link");
  return result;
};

/** Public presentation fields only; shared by the homepage and the house. */
export function selectFeedEvents(values, now = Date.now()) {
  if (!Array.isArray(values) || values.length > 1000)
    throw new Error("Invalid public activity list");
  const normalized = values.map((value) => {
    if (!value || typeof value !== "object")
      throw new Error("Invalid public activity");
    const kind = value.kind ?? "project";
    const source = value.source ?? "site";
    if (!KINDS.has(kind) || !SOURCES.has(source))
      throw new Error("Invalid durable activity kind or source");
    const occurredAt = new Date(date(value.occurredAt ?? value.date, "date")).toISOString();
    return {
      ...(value.id ? { id: text(value.id, "id", 100) } : {}),
      title: text(value.title, "title"),
      summary: text(value.summary, "summary"),
      href: href(value.href),
      linkLabel: text(value.linkLabel, "link label", 80),
      kind,
      source,
      occurredAt,
      date: occurredAt.slice(0, 10),
      dateLabel: value.dateLabel
        ? text(value.dateLabel, "date label", 80)
        : occurredAt.slice(0, 10),
      ...(value.relatedProject
        ? { relatedProject: text(value.relatedProject, "project", 120) }
        : {}),
      ...(value.expiresAt
        ? { expiresAt: date(value.expiresAt, "expiry") }
        : {}),
      ...(value.actor
        ? {
            actor: {
              id: text(value.actor.id, "actor id", 80),
              name: text(value.actor.name, "actor name", 120),
              role: text(value.actor.role, "actor role", 120),
            },
          }
        : {}),
    };
  });
  const seen = new Set();
  return selectActivitySnapshot(normalized, new Date(now)).filter((event) => {
    const key =
      event.id ?? `${event.href}\u0000${event.occurredAt}\u0000${event.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
