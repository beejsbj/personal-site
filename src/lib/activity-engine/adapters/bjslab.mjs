import {
  assertEventType,
  assertIso,
  assertObject,
  assertShortString,
} from "../validation.mjs";

/** Accepts an intentional bjslab milestone export; it does not reach SSH/T3. */
export function fromBjslabMilestone(
  input,
  { observedAt = new Date().toISOString() } = {},
) {
  assertObject(input, "bjslab milestone");
  const producer = assertShortString(input.producer, "bjslab producer", 160);
  return {
    source: "bjslab",
    producer: `bjslab:${producer}`,
    providerEventId: assertShortString(input.id, "bjslab milestone id", 200),
    eventKind: "milestone",
    eventType: assertEventType(
      input.eventType ?? "milestone",
      "bjslab eventType",
    ),
    mode: "event",
    occurredAt: assertIso(input.occurredAt, "bjslab occurredAt"),
    observedAt: assertIso(observedAt, "observedAt"),
    candidate: {
      title: assertShortString(input.title, "bjslab title", 280),
      summary: assertShortString(input.summary, "bjslab summary", 280),
      href: input.href,
      linkLabel: input.linkLabel ?? "View update",
    },
  };
}
