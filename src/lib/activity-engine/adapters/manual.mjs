import {
  assertEventType,
  assertIso,
  assertObject,
  assertShortString,
  validateActor,
} from "../validation.mjs";

/** Generic/manual producer for intentional local operator entries. */
export function fromManualEvent(
  input,
  { observedAt = new Date().toISOString() } = {},
) {
  assertObject(input, "manual event");
  return {
    source: input.source ?? "manual",
    producer: input.producer ?? "manual:operator",
    providerEventId: assertShortString(input.id, "manual id", 200),
    eventKind: input.eventKind ?? "milestone",
    ...(input.eventType
      ? { eventType: assertEventType(input.eventType, "manual eventType") }
      : {}),
    mode: input.mode ?? "event",
    occurredAt: assertIso(input.occurredAt, "manual occurredAt"),
    observedAt: assertIso(observedAt, "observedAt"),
    ...(input.expiresAt
      ? { expiresAt: assertIso(input.expiresAt, "manual expiresAt") }
      : {}),
    ...(input.replacementKey
      ? {
          replacementKey: assertShortString(
            input.replacementKey,
            "manual replacementKey",
            200,
          ),
        }
      : {}),
    candidate: {
      title: assertShortString(input.title, "manual title", 280),
      summary: assertShortString(input.summary, "manual summary", 280),
      href: input.href,
      linkLabel: input.linkLabel ?? "View update",
      ...(input.actor ? { actor: validateActor(input.actor, "public actor") } : {}),
      ...(input.relatedProject
        ? {
            relatedProject: assertShortString(
              input.relatedProject,
              "manual relatedProject",
              120,
            ),
          }
        : {}),
    },
  };
}
