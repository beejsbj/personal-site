import assert from "node:assert/strict";
import test from "node:test";
import {
  PresenceValidationError,
  selectPresenceSignals,
  validatePresenceSnapshot,
} from "../../src/lib/activity-presence.mjs";

const now = Date.parse("2026-09-20T12:02:00Z");
const signal = (overrides = {}) => ({
  id: "activity_0123456789abcdef",
  title: "Astra is tinkering on Undertext",
  summary: "A public, short-lived work signal.",
  href: "https://example.test/undertext",
  linkLabel: "View Undertext",
  source: "bjslab",
  kind: "agents",
  observedAt: "2026-09-20T12:01:00Z",
  expiresAt: "2026-09-20T12:05:00Z",
  ...overrides,
});

test("selector returns only fresh public fields and strips unknown signal properties", () => {
  const document = {
    version: 1,
    generatedAt: "2026-09-20T12:02:00Z",
    signals: [
      signal({ privateNote: "must not cross the boundary" }),
      signal({
        id: "activity_fedcba9876543210",
        observedAt: "2026-09-20T11:50:00Z",
        expiresAt: "2026-09-20T11:55:00Z",
      }),
      signal({
        id: "activity_1111111111111111",
        observedAt: "2026-09-20T12:03:00Z",
        expiresAt: "2026-09-20T12:04:00Z",
      }),
    ],
  };
  const selected = selectPresenceSignals(document, now);
  assert.deepEqual(selected, [signal()]);
  assert.equal(selected[0].privateNote, undefined);
  assert.deepEqual(
    validatePresenceSnapshot(document, { now }).signals,
    selected,
  );
});

test("selector fails closed for malformed, credentialed, or overlong presence signals", () => {
  const document = {
    version: 1,
    generatedAt: "2026-09-20T12:02:00Z",
    signals: [signal()],
  };
  assert.throws(
    () =>
      selectPresenceSignals(
        {
          ...document,
          signals: [signal({ href: "https://token:secret@example.test" })],
        },
        now,
      ),
    PresenceValidationError,
  );
  assert.throws(
    () =>
      selectPresenceSignals(
        {
          ...document,
          signals: [signal({ expiresAt: "2026-09-20T12:07:00Z" })],
        },
        now,
      ),
    /no more than five minutes/,
  );
  assert.throws(
    () =>
      selectPresenceSignals(
        { ...document, signals: [signal({ kind: "location" })] },
        now,
      ),
    /status or agents/,
  );
});
