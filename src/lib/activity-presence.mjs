/**
 * Browser-safe validation and selection for the optional runtime presence feed.
 * This module deliberately has no Node imports and never reads the private store.
 */

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const SOURCE_VALUES = new Set([
  "github",
  "bjslab",
  "agent-session",
  "manual",
  "generic",
]);
const PRESENCE_KINDS = new Set(["status", "agents"]);
const MAX_TTL_MS = 5 * 60 * 1000;

export class PresenceValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PresenceValidationError";
  }
}

/**
 * @typedef {Object} PresenceSignal
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {string} href
 * @property {string} linkLabel
 * @property {string} source
 * @property {"status"|"agents"} kind
 * @property {string} observedAt
 * @property {string} expiresAt
 * @property {string=} relatedProject
 */

const fail = (message) => {
  throw new PresenceValidationError(message);
};

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${name} must be an object.`);
  return value;
}

function string(value, name, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    fail(`${name} must be a non-empty string of at most ${max} characters.`);
  }
  return value.trim();
}

function iso(value, name) {
  if (
    typeof value !== "string" ||
    !ISO_TIMESTAMP.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    fail(`${name} must be an ISO-8601 timestamp with an explicit timezone.`);
  }
  return value;
}

function publicUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${name} must be an absolute http(s) URL.`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    fail(`${name} must be an http(s) URL without credentials.`);
  }
  return url.toString();
}

function normalizeNow(now) {
  if (typeof now !== "number" || !Number.isFinite(now))
    fail("now must be a finite epoch timestamp.");
  return now;
}

function normalizeSignal(value) {
  object(value, "presence signal");
  const id = string(value.id, "presence signal id", 80);
  if (!/^activity_[a-f0-9]{16}$/.test(id))
    fail("presence signal id must be an opaque activity ID.");
  const source = string(value.source, "presence signal source", 40);
  if (!SOURCE_VALUES.has(source)) fail("presence signal source is unknown.");
  const kind = string(value.kind, "presence signal kind", 40);
  if (!PRESENCE_KINDS.has(kind))
    fail("presence signal kind must be status or agents.");
  const observedAt = iso(value.observedAt, "presence signal observedAt");
  const expiresAt = iso(value.expiresAt, "presence signal expiresAt");
  const observedMs = Date.parse(observedAt);
  const expiresMs = Date.parse(expiresAt);
  if (expiresMs <= observedMs || expiresMs - observedMs > MAX_TTL_MS) {
    fail(
      "presence signal expiry must be after observation and no more than five minutes later.",
    );
  }
  return {
    id,
    title: string(value.title, "presence signal title", 280),
    summary: string(value.summary, "presence signal summary", 280),
    href: publicUrl(value.href, "presence signal href"),
    linkLabel: string(value.linkLabel, "presence signal linkLabel", 80),
    source,
    kind,
    observedAt,
    expiresAt,
    ...(value.relatedProject
      ? {
          relatedProject: string(
            value.relatedProject,
            "presence signal relatedProject",
            120,
          ),
        }
      : {}),
  };
}

/**
 * Validates a document and returns its public shape with unknown fields removed.
 * Stale and future signals are omitted rather than represented as current.
 */
export function validatePresenceSnapshot(value, { now = Date.now() } = {}) {
  object(value, "presence snapshot");
  if (value.version !== 1) fail("presence snapshot version must be 1.");
  const generatedAt = iso(value.generatedAt, "presence snapshot generatedAt");
  if (!Array.isArray(value.signals))
    fail("presence snapshot signals must be an array.");
  if (value.signals.length > 1000)
    fail("presence snapshot may contain at most 1000 signals.");
  const nowMs = normalizeNow(now);
  const ids = new Set();
  const signals = value.signals
    .map(normalizeSignal)
    .filter((signal) => {
      if (ids.has(signal.id))
        fail(`presence snapshot has duplicate signal id ${signal.id}.`);
      ids.add(signal.id);
      return (
        Date.parse(signal.observedAt) <= nowMs &&
        Date.parse(signal.expiresAt) > nowMs
      );
    })
    .sort(
      (left, right) =>
        Date.parse(right.observedAt) - Date.parse(left.observedAt) ||
        left.id.localeCompare(right.id),
    );
  return { version: 1, generatedAt, signals };
}

/**
 * @param {unknown} document
 * @param {number} [now]
 * @returns {PresenceSignal[]}
 */
export function selectPresenceSignals(document, now = Date.now()) {
  return validatePresenceSnapshot(document, { now }).signals;
}

export const MAX_PRESENCE_TTL_MS = MAX_TTL_MS;
