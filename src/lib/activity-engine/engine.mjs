import { createHash } from "node:crypto";
import { REVIEW_STATES } from "./constants.mjs";
import { ActivityEngineError, ValidationError } from "./errors.mjs";
import {
  assertAllowedByPolicy,
  matchingAutoPublishRule,
  validatePolicy,
} from "./policy.mjs";
import { mutateStore, readStore, writePublicExport } from "./store.mjs";
import {
  validateEnvelope,
  validatePublicExport,
  validatePublicProjection,
} from "./validation.mjs";

const nowIso = (clock) => new Date(clock()).toISOString();
const identityFor = (event) =>
  JSON.stringify([event.source, event.producer, event.providerEventId]);
const stableIdFor = (identity) =>
  `activity_${createHash("sha256").update(identity).digest("hex").slice(0, 16)}`;
const fingerprintFor = (event) =>
  createHash("sha256").update(JSON.stringify(event)).digest("hex");

function entryAt(record, operation, at, extra = {}) {
  record.history.push({ operation, at, revision: record.revision, ...extra });
}

function requireRecord(store, id) {
  const record = store.records.find((item) => item.id === id);
  if (!record)
    throw new ActivityEngineError(
      `No activity record exists with id ${id}.`,
      "RECORD_NOT_FOUND",
    );
  return record;
}

function hasManualApprovalForProducer(store, event) {
  return store.records.some(
    (record) =>
      record.event.source === event.source &&
      record.event.producer === event.producer &&
      record.history.some(
        (entry) => entry.operation === "approved" && entry.method === "manual",
      ),
  );
}

/** Ingests one untrusted record into the private review queue. */
export async function ingest({
  storeDir,
  policy: inputPolicy,
  event: inputEvent,
  clock = Date.now,
}) {
  const event = validateEnvelope(inputEvent);
  const policy = validatePolicy(inputPolicy);
  assertAllowedByPolicy(event, policy);
  const at = nowIso(clock);
  return mutateStore(storeDir, (store) => {
    const identity = identityFor(event);
    const revisionEvent = { ...event };
    delete revisionEvent.observedAt;
    const fingerprint = fingerprintFor(revisionEvent);
    const existing = store.records.find(
      (record) => record.identity === identity,
    );
    if (existing && existing.fingerprint === fingerprint) {
      // A polling retry may be observed later without becoming a material
      // revision that would discard an approved editorial projection.
      if (
        Date.parse(event.observedAt) > Date.parse(existing.event.observedAt)
      ) {
        existing.event.observedAt = event.observedAt;
      }
      return { outcome: "duplicate", record: existing };
    }
    if (existing) {
      existing.revision += 1;
      existing.fingerprint = fingerprint;
      existing.event = event;
      existing.status = "pending";
      delete existing.public;
      existing.review = null;
      entryAt(existing, "revised", at);
      return { outcome: "revised", record: existing };
    }
    const autoRule = matchingAutoPublishRule(event, policy);
    // Rules only trust the already validated candidate projection after a
    // person has manually approved one record from this exact producer.
    const autoPublish = Boolean(
      autoRule && event.candidate && hasManualApprovalForProducer(store, event),
    );
    const record = {
      id: stableIdFor(identity),
      identity,
      revision: 1,
      fingerprint,
      status: autoPublish ? "approved" : "pending",
      event,
      ...(autoPublish
        ? { public: validatePublicProjection(event.candidate) }
        : {}),
      review: autoPublish
        ? {
            decidedAt: at,
            decidedBy: "policy",
            method: "auto",
            policyRule: autoRule,
          }
        : null,
      history: [
        { operation: "ingested", at, revision: 1 },
        ...(autoPublish
          ? [
              {
                operation: "approved",
                at,
                revision: 1,
                method: "auto",
                policyRule: autoRule,
              },
            ]
          : []),
      ],
    };
    store.records.push(record);
    return { outcome: autoPublish ? "auto-approved" : "queued", record };
  });
}

/** Approval is a deliberate editorial act; `event.candidate` never flows here. */
export async function approve({
  storeDir,
  id,
  expectedRevision,
  projection: inputProjection,
  decidedBy,
  note,
  clock = Date.now,
}) {
  const projection = validatePublicProjection(inputProjection);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw new ValidationError(
      "Approval requires a positive integer expectedRevision.",
    );
  }
  const at = nowIso(clock);
  return mutateStore(storeDir, (store) => {
    const record = requireRecord(store, id);
    if (record.revision !== expectedRevision) {
      throw new ActivityEngineError(
        `Approval reviewed revision ${expectedRevision}, but ${id} is now revision ${record.revision}. Review the current record before approving.`,
        "STALE_APPROVAL",
      );
    }
    if (record.status === "retracted")
      throw new ActivityEngineError(
        "Retracted records cannot be approved; ingest a corrected revision.",
        "RETRACTED_RECORD",
      );
    record.status = "approved";
    record.public = projection;
    record.review = {
      decidedAt: at,
      decidedBy: decidedBy || "operator",
      method: "manual",
      ...(note ? { note } : {}),
    };
    entryAt(record, "approved", at, { method: "manual" });
    return record;
  });
}

export async function reject({
  storeDir,
  id,
  decidedBy = "operator",
  note,
  clock = Date.now,
}) {
  const at = nowIso(clock);
  return mutateStore(storeDir, (store) => {
    const record = requireRecord(store, id);
    record.status = "rejected";
    delete record.public;
    record.review = {
      decidedAt: at,
      decidedBy,
      method: "manual",
      ...(note ? { note } : {}),
    };
    entryAt(record, "rejected", at, { method: "manual" });
    return record;
  });
}

export async function retract({
  storeDir,
  id,
  decidedBy = "operator",
  note,
  clock = Date.now,
}) {
  const at = nowIso(clock);
  return mutateStore(storeDir, (store) => {
    const record = requireRecord(store, id);
    record.status = "retracted";
    delete record.public;
    record.review = {
      decidedAt: at,
      decidedBy,
      method: "manual",
      ...(note ? { note } : {}),
    };
    entryAt(record, "retracted", at, { method: "manual" });
    return record;
  });
}

export async function listRecords(storeDir, { status } = {}) {
  if (status && !REVIEW_STATES.includes(status))
    throw new ValidationError(`Unknown review state ${status}.`);
  const store = await readStore(storeDir);
  return store.records.filter((record) => !status || record.status === status);
}

/**
 * Static exports contain durable, explicitly approved events only. Runtime
 * presence needs a separate endpoint with delivery-time freshness semantics.
 */
export function buildStaticExport(
  records,
  { generatedAt = new Date().toISOString() } = {},
) {
  const events = records
    .filter(
      (record) =>
        record.status === "approved" &&
        record.event.mode === "event" &&
        record.public,
    )
    .map((record) => ({
      id: record.id,
      occurredAt: record.event.occurredAt,
      date: record.event.occurredAt.slice(0, 10),
      dateLabel: record.event.occurredAt.slice(0, 10),
      observedAt: record.event.observedAt,
      source: record.event.source,
      kind: record.event.eventKind,
      title: record.public.title,
      summary: record.public.summary,
      href: record.public.href,
      linkLabel: record.public.linkLabel,
      evidence: {
        url: record.public.evidenceUrl ?? record.public.href,
        observedAt: record.event.observedAt,
      },
      ...(record.public.relatedProject
        ? { relatedProject: record.public.relatedProject }
        : {}),
    }))
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
        left.id.localeCompare(right.id),
    );
  return validatePublicExport({ version: 1, generatedAt, events });
}

export async function exportStatic({ storeDir, outFile, generatedAt }) {
  const store = await readStore(storeDir);
  const document = buildStaticExport(store.records, { generatedAt });
  await writePublicExport(outFile, document);
  return document;
}
