import assert from "node:assert/strict";
import test from "node:test";
import { selectFeedEvents } from "../../src/lib/activity-feed.mjs";

const now = Date.parse("2026-09-20T12:00:00Z");
const event = (overrides = {}) => ({
  id: "activity_0123456789abcdef",
  kind: "milestone",
  source: "bjslab",
  title: "A new reading room",
  summary: "Undertext has a new public chapter.",
  href: "https://burooj.dev/projects",
  linkLabel: "Look around",
  occurredAt: "2026-09-20T10:00:00Z",
  relatedProject: "Undertext",
  ...overrides,
});

test("the shared feed selects public durable events and strips non-public fields", () => {
  const values = selectFeedEvents(
    [
      event({
        payload: { private: true },
        actor: {
          id: "astra",
          name: "Astra",
          role: "Tinkerer",
          internal: "discard",
        },
      }),
      event({ id: "future", occurredAt: "2026-09-21T00:00:00Z" }),
      event({ id: "old", expiresAt: "2026-09-20T11:00:00Z" }),
    ],
    now,
  );
  assert.equal(values.length, 1);
  assert.equal(values[0].relatedProject, "Undertext");
  assert.deepEqual(values[0].actor, {
    id: "astra",
    name: "Astra",
    role: "Tinkerer",
  });
  assert.equal("payload" in values[0], false);
});

test("the feed rejects executable links and presence records in the durable list", () => {
  for (const href of [
    "javascript:alert(1)",
    "//elsewhere.test",
    "/\\elsewhere.test",
    "https://user:password@example.test",
    "/\t/elsewhere.test",
  ]) {
    assert.throws(() => selectFeedEvents([event({ href })], now));
  }
  assert.throws(() => selectFeedEvents([event({ kind: "agents" })], now));
  assert.equal(selectFeedEvents([event(), event()], now).length, 1);
});

test("authored day-only dates become precise timestamps for the same runtime contract", () => {
  const [item] = selectFeedEvents([event({ occurredAt: undefined, date: "2026-09-19" })], now);
  assert.equal(item.occurredAt, "2026-09-19T00:00:00.000Z");
  assert.equal(item.date, "2026-09-19");
});
