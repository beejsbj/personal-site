import { ValidationError } from "../errors.mjs";
import {
  assertEventType,
  assertIso,
  assertObject,
  assertShortString,
} from "../validation.mjs";

const LIFECYCLE_ACTIONS = new Set([
  "started",
  "completed",
  "failed",
  "cancelled",
]);

/**
 * Lifecycle facts only. Prompts, transcripts, tool logs, machine paths and
 * free-form agent history are intentionally not accepted by this boundary.
 */
export function fromAgentSessionLifecycle(
  input,
  { observedAt = new Date().toISOString() } = {},
) {
  assertObject(input, "agent session lifecycle");
  const action = assertShortString(input.action, "agent session action", 40);
  if (!LIFECYCLE_ACTIONS.has(action))
    throw new ValidationError(
      "agent session action must be started, completed, failed, or cancelled.",
    );
  const id = assertShortString(input.id, "agent session id", 200);
  const completed = action === "completed";
  const producer =
    input.producer === undefined
      ? "agent-session:operator"
      : assertShortString(input.producer, "agent session producer", 160);
  return {
    source: "agent-session",
    producer,
    providerEventId: `session:${id}:${action}`,
    eventKind: completed ? "milestone" : "status",
    eventType: assertEventType(`session.${action}`, "agent session eventType"),
    mode: completed ? "event" : "presence",
    occurredAt: assertIso(input.occurredAt, "agent session occurredAt"),
    observedAt: assertIso(observedAt, "observedAt"),
    ...(completed
      ? {}
      : {
          expiresAt: assertIso(input.expiresAt, "agent session expiresAt"),
          replacementKey: `session:${id}`,
        }),
    candidate: {
      title: assertShortString(input.title, "agent session title", 280),
      summary: assertShortString(input.summary, "agent session summary", 280),
      href: input.href,
      linkLabel: input.linkLabel ?? "View update",
    },
  };
}
