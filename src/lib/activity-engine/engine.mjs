import { createHash } from "node:crypto";
import { validatePresenceSnapshot } from "../activity-presence.mjs";
import { MAX_INPUT_BYTES, REVIEW_STATES } from "./constants.mjs";
import { ActivityEngineError, ValidationError } from "./errors.mjs";
import {
  assertAllowedByPolicy,
  matchingAutoPresenceRule,
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
const materialFingerprintFor = (event) => {
  const material = { ...event };
  delete material.observedAt;
  if (event.mode === "presence") delete material.expiresAt;
  return fingerprintFor(material);
};

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

function automaticRuleFor(event, policy) {
  return event.mode === "presence"
    ? matchingAutoPresenceRule(event, policy)
    : matchingAutoPublishRule(event, policy);
}

function reviseRecord(record, event, fingerprint, deliveryFingerprint, at) {
  record.revision += 1;
  record.fingerprint = fingerprint;
  record.deliveryFingerprint = deliveryFingerprint;
  record.event = event;
  record.status = "pending";
  delete record.public;
  record.review = null;
  entryAt(record, "revised", at);
  return { outcome: "revised", record };
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
    const fingerprint = materialFingerprintFor(event);
    const deliveryFingerprint = fingerprintFor(event);
    const existing = store.records.find(
      (record) => record.identity === identity,
    );
    const existingDeliveryFingerprint =
      existing?.deliveryFingerprint ??
      (existing ? fingerprintFor(existing.event) : undefined);
    if (existing && existingDeliveryFingerprint === deliveryFingerprint) {
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
      if (existing.fingerprint === fingerprint && event.mode !== "presence") {
        if (
          Date.parse(event.observedAt) > Date.parse(existing.event.observedAt)
        ) {
          existing.event.observedAt = event.observedAt;
        }
        existing.deliveryFingerprint = deliveryFingerprint;
        return { outcome: "duplicate", record: existing };
      }
      const presenceRule = automaticRuleFor(event, policy);
      const canRenewPresence = Boolean(
        event.mode === "presence" &&
        existing.fingerprint === fingerprint &&
        existing.status === "approved" &&
        event.candidate &&
        presenceRule &&
        hasManualApprovalForProducer(store, event),
      );
      if (canRenewPresence) {
        existing.event = event;
        existing.fingerprint = fingerprint;
        existing.deliveryFingerprint = deliveryFingerprint;
        existing.review = {
          ...existing.review,
          lastRenewedAt: at,
          renewalMethod: "auto",
          policyRule: presenceRule,
        };
        entryAt(existing, "renewed", at, {
          method: "auto",
          policyRule: presenceRule,
        });
        return { outcome: "renewed", record: existing };
      }
      return reviseRecord(
        existing,
        event,
        fingerprint,
        deliveryFingerprint,
        at,
      );
    }
    const autoRule = automaticRuleFor(event, policy);
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
      deliveryFingerprint,
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
      ...(record.public.actor ? { actor: record.public.actor } : {}),
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

function isLaterReplacement(left, right) {
  const difference =
    Date.parse(left.event.observedAt) - Date.parse(right.event.observedAt);
  if (difference !== 0) return difference > 0;
  if (left.revision !== right.revision) return left.revision > right.revision;
  return left.id.localeCompare(right.id) > 0;
}

/** Build a separate, short-lived public view. Never use this for static HTML. */
export function buildPresenceSnapshot(
  records,
  { now = Date.now(), generatedAt = new Date(now).toISOString() } = {},
) {
  const latestByReplacement = new Map();
  for (const record of records) {
    const replacementKey = record.event.replacementKey;
    if (!replacementKey) continue;
    const key = JSON.stringify([
      record.event.source,
      record.event.producer,
      replacementKey,
    ]);
    const previous = latestByReplacement.get(key);
    if (!previous || isLaterReplacement(record, previous)) {
      latestByReplacement.set(key, record);
    }
  }
  const signals = records
    .filter(
      (record) =>
        record.status === "approved" &&
        record.event.mode === "presence" &&
        ["status", "agents"].includes(record.event.eventKind) &&
        record.public,
    )
    .filter((record) => {
      const replacementKey = record.event.replacementKey;
      if (!replacementKey) return false;
      const key = JSON.stringify([
        record.event.source,
        record.event.producer,
        replacementKey,
      ]);
      return latestByReplacement.get(key) === record;
    })
    .map((record) => ({
      id: record.id,
      title: record.public.title,
      summary: record.public.summary,
      href: record.public.href,
      linkLabel: record.public.linkLabel,
      source: record.event.source,
      kind: record.event.eventKind,
      observedAt: record.event.observedAt,
      expiresAt: record.event.expiresAt,
      ...(record.public.relatedProject
        ? { relatedProject: record.public.relatedProject }
        : {}),
      ...(record.public.actor ? { actor: record.public.actor } : {}),
    }));
  return validatePresenceSnapshot(
    { version: 1, generatedAt, signals },
    { now },
  );
}

export async function exportPresence({ storeDir, outFile, now, generatedAt }) {
  const store = await readStore(storeDir);
  const document = buildPresenceSnapshot(store.records, { now, generatedAt });
  await writePublicExport(outFile, document);
  return document;
}

/** One bounded public document for consumers that need durable and current data. */
export function buildActivityFeed(
  records,
  { now = Date.now(), generatedAt = new Date(now).toISOString() } = {},
) {
  const events = buildStaticExport(records, { generatedAt }).events;
  const signals = buildPresenceSnapshot(records, { now, generatedAt }).signals;
  const document = { version: 1, generatedAt, events, signals };
  if (Buffer.byteLength(JSON.stringify(document), "utf8") > MAX_INPUT_BYTES) {
    throw new ActivityEngineError(
      `Public activity feed exceeds the ${MAX_INPUT_BYTES}-byte limit.`,
      "FEED_TOO_LARGE",
    );
  }
  return document;
}

export async function exportFeed({ storeDir, outFile, now, generatedAt }) {
  const store = await readStore(storeDir);
  const document = buildActivityFeed(store.records, { now, generatedAt });
  await writePublicExport(outFile, document);
  return document;
}
