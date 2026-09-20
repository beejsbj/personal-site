import {
  EVENT_KINDS,
  MAX_INPUT_BYTES,
  MAX_PAYLOAD_BYTES,
  MAX_PUBLIC_TEXT_LENGTH,
  PRESENCE_KINDS,
  SOURCES,
} from "./constants.mjs";
import { ValidationError } from "./errors.mjs";

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const SENSITIVE_KEYS =
  /(?:prompt|transcript|history|log(?:s)?|secret|token|password|cookie|authorization|private[_-]?key|file[_-]?path|path)$/i;
const EVENT_TYPE = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;

export function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function assertObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${name} must be an object.`);
  }
  return value;
}

export function assertShortString(value, name, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new ValidationError(
      `${name} must be a non-empty string of at most ${max} characters.`,
    );
  }
  return value.trim();
}

export function assertIso(value, name) {
  if (
    typeof value !== "string" ||
    !ISO_TIMESTAMP.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new ValidationError(
      `${name} must be an ISO-8601 timestamp with an explicit timezone.`,
    );
  }
  return value;
}

export function assertEventType(value, name = "eventType") {
  if (typeof value !== "string" || !EVENT_TYPE.test(value)) {
    throw new ValidationError(
      `${name} must be lower-case dot-separated text such as work.milestone.`,
    );
  }
  return value;
}

export function assertHttpUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ValidationError(`${name} must be an absolute http(s) URL.`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ValidationError(`${name} must be an absolute http(s) URL.`);
  }
  if (url.username || url.password) {
    throw new ValidationError(`${name} must not contain URL credentials.`);
  }
  return url.toString();
}

export function assertSafePayload(payload) {
  if (payload === undefined) return undefined;
  assertObject(payload, "payload");
  if (byteLength(payload) > MAX_PAYLOAD_BYTES) {
    throw new ValidationError(
      `payload exceeds the ${MAX_PAYLOAD_BYTES}-byte limit.`,
    );
  }
  const visit = (value, path = "payload") => {
    if (Array.isArray(value))
      return value.forEach((item, index) => visit(item, `${path}[${index}]`));
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_KEYS.test(key)) {
        throw new ValidationError(
          `${path}.${key} is not accepted; prompts, logs, histories, paths, and credentials are never ingested.`,
        );
      }
      visit(child, `${path}.${key}`);
    }
  };
  visit(payload);
  return payload;
}

/** Validate an untrusted proposal. Its candidate is deliberately not public. */
export function validateEnvelope(value) {
  assertObject(value, "event");
  if (byteLength(value) > MAX_INPUT_BYTES) {
    throw new ValidationError(
      `event exceeds the ${MAX_INPUT_BYTES}-byte limit.`,
    );
  }
  const source = assertShortString(value.source, "source", 40);
  if (!SOURCES.includes(source))
    throw new ValidationError(`source must be one of: ${SOURCES.join(", ")}.`);
  const producer = assertShortString(value.producer, "producer", 160);
  const providerEventId = assertShortString(
    value.providerEventId,
    "providerEventId",
    200,
  );
  const eventKind = assertShortString(value.eventKind, "eventKind", 40);
  if (!EVENT_KINDS.includes(eventKind))
    throw new ValidationError(
      `eventKind must be one of: ${EVENT_KINDS.join(", ")}.`,
    );
  const mode = value.mode === undefined ? "event" : value.mode;
  const eventType =
    value.eventType === undefined
      ? undefined
      : assertEventType(value.eventType, "eventType");
  if (!["event", "presence"].includes(mode))
    throw new ValidationError("mode must be event or presence.");
  if (mode === "presence" && !PRESENCE_KINDS.has(eventKind)) {
    throw new ValidationError(
      "presence records must use status, location, or agents.",
    );
  }
  const expiresAt =
    value.expiresAt === undefined
      ? undefined
      : assertIso(value.expiresAt, "expiresAt");
  if (mode === "presence" && !expiresAt)
    throw new ValidationError("presence records require expiresAt.");
  if (
    expiresAt &&
    Date.parse(expiresAt) <=
      Date.parse(assertIso(value.occurredAt, "occurredAt"))
  ) {
    throw new ValidationError("expiresAt must be later than occurredAt.");
  }
  const candidate =
    value.candidate === undefined
      ? undefined
      : validateCandidate(value.candidate);
  return {
    source,
    producer,
    providerEventId,
    eventKind,
    ...(eventType ? { eventType } : {}),
    mode,
    occurredAt: assertIso(value.occurredAt, "occurredAt"),
    observedAt: assertIso(value.observedAt, "observedAt"),
    ...(expiresAt ? { expiresAt } : {}),
    ...(value.replacementKey
      ? {
          replacementKey: assertShortString(
            value.replacementKey,
            "replacementKey",
            200,
          ),
        }
      : {}),
    ...(candidate ? { candidate } : {}),
    ...(value.payload ? { payload: assertSafePayload(value.payload) } : {}),
  };
}

/**
 * Candidate wording is review context. It reaches public JSON only through a
 * manual approval or an explicit, manually trusted producer/type policy.
 */
export function validateCandidate(value) {
  assertObject(value, "candidate");
  return {
    title: assertShortString(
      value.title,
      "candidate.title",
      MAX_PUBLIC_TEXT_LENGTH,
    ),
    summary: assertShortString(
      value.summary,
      "candidate.summary",
      MAX_PUBLIC_TEXT_LENGTH,
    ),
    href: assertHttpUrl(value.href, "candidate.href"),
    linkLabel: assertShortString(
      value.linkLabel ?? "View source",
      "candidate.linkLabel",
      80,
    ),
    ...(value.relatedProject
      ? {
          relatedProject: assertShortString(
            value.relatedProject,
            "candidate.relatedProject",
            120,
          ),
        }
      : {}),
  };
}

/** This is the only shape allowed to cross into a static site's public JSON. */
export function validatePublicProjection(value) {
  assertObject(value, "public projection");
  return {
    title: assertShortString(
      value.title,
      "public projection title",
      MAX_PUBLIC_TEXT_LENGTH,
    ),
    summary: assertShortString(
      value.summary,
      "public projection summary",
      MAX_PUBLIC_TEXT_LENGTH,
    ),
    href: assertHttpUrl(value.href, "public projection href"),
    linkLabel: assertShortString(
      value.linkLabel,
      "public projection linkLabel",
      80,
    ),
    ...(value.evidenceUrl
      ? {
          evidenceUrl: assertHttpUrl(
            value.evidenceUrl,
            "public projection evidenceUrl",
          ),
        }
      : {}),
    ...(value.relatedProject
      ? {
          relatedProject: assertShortString(
            value.relatedProject,
            "public projection relatedProject",
            120,
          ),
        }
      : {}),
  };
}

export function validatePublicExport(value) {
  assertObject(value, "public export");
  if (value.version !== 1)
    throw new ValidationError("public export version must be 1.");
  assertIso(value.generatedAt, "public export generatedAt");
  if (!Array.isArray(value.events))
    throw new ValidationError("public export events must be an array.");
  if (value.events.length > 1000)
    throw new ValidationError("public export may contain at most 1000 events.");
  const ids = new Set();
  const events = value.events.map((event) => {
    assertObject(event, "public export event");
    if (
      event.mode !== undefined ||
      event.expiresAt !== undefined ||
      event.replacementKey !== undefined
    ) {
      throw new ValidationError(
        "public export cannot contain runtime presence fields.",
      );
    }
    const id = assertShortString(event.id, "public export event id", 80);
    if (ids.has(id))
      throw new ValidationError(`public export has duplicate event id ${id}.`);
    ids.add(id);
    const occurredAt = assertIso(event.occurredAt, "public export occurredAt");
    const observedAt = assertIso(event.observedAt, "public export observedAt");
    const source = assertShortString(event.source, "public export source", 40);
    if (!SOURCES.includes(source))
      throw new ValidationError("public export source is unknown.");
    const eventKind = assertShortString(event.kind, "public export kind", 40);
    if (!EVENT_KINDS.includes(eventKind) || PRESENCE_KINDS.has(eventKind)) {
      throw new ValidationError(
        "public export contains a runtime-only presence kind.",
      );
    }
    const projection = validatePublicProjection(event);
    const evidence = assertObject(event.evidence, "public export evidence");
    return {
      id,
      occurredAt,
      date: occurredAt.slice(0, 10),
      dateLabel: occurredAt.slice(0, 10),
      observedAt,
      source,
      kind: eventKind,
      ...projection,
      evidence: {
        url: assertHttpUrl(evidence.url, "public export evidence.url"),
        observedAt: assertIso(
          evidence.observedAt,
          "public export evidence.observedAt",
        ),
      },
    };
  });
  return { version: 1, generatedAt: value.generatedAt, events };
}
