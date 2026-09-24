import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHouseModel,
  validateHouseCatalog,
} from "../../src/lib/activity-house-model.mjs";

const now = Date.parse("2026-09-20T12:03:00Z");
const catalog = {
  version: 1,
  rooms: [
    {
      id: "undertext",
      title: "Undertext",
      summary: "A reading room.",
      kind: "project",
      furnishing: "desk",
      aliases: ["under-text"],
      pinned: true,
      order: 1,
    },
    {
      id: "private-room",
      title: "Private room",
      summary: "Not shown.",
      kind: "place",
      furnishing: "sofa",
      hidden: true,
    },
  ],
  residents: [
    { id: "astra", name: "Astra", role: "maker", roomId: "undertext" },
  ],
};
const event = (overrides = {}) => ({
  id: "activity_0123456789abcdef",
  date: "2026-09-20",
  occurredAt: "2026-09-20T12:00:00Z",
  title: "Started a public experiment",
  summary: "A durable update.",
  href: "/lab",
  linkLabel: "View",
  source: "bjslab",
  kind: "milestone",
  relatedProject: "Undertext",
  actor: { id: "astra", name: "Astra", role: "maker" },
  ...overrides,
});
const signal = (overrides = {}) => ({
  id: "activity_fedcba9876543210",
  title: "Astra is tinkering on Undertext",
  summary: "A fresh public signal.",
  href: "https://example.test/lab",
  linkLabel: "View",
  source: "bjslab",
  kind: "agents",
  observedAt: "2026-09-20T12:01:00Z",
  expiresAt: "2026-09-20T12:05:00Z",
  relatedProject: "under-text",
  actor: { id: "astra", name: "Astra", role: "maker" },
  ...overrides,
});

test("catalog normalizes defaults and rejects ambiguous public room aliases", () => {
  const validated = validateHouseCatalog(catalog);
  assert.deepEqual(validated.rooms[0].aliases, ["under-text"]);
  assert.equal(validated.rooms[0].order, 1);
  assert.throws(
    () =>
      validateHouseCatalog({
        ...catalog,
        rooms: [
          ...catalog.rooms,
          {
            id: "other",
            title: "Other",
            summary: "x",
            kind: "place",
            furnishing: "sofa",
            aliases: ["Undertext"],
          },
        ],
      }),
    /ambiguous alias/,
  );
  assert.throws(
    () =>
      validateHouseCatalog({
        ...catalog,
        rooms: [
          { ...catalog.rooms[0], href: "https://token:secret@example.test" },
        ],
      }),
    /without credentials/,
  );
});

test("model joins aliases, respects hidden rooms, creates reviewed activity rooms, and expires occupants", () => {
  const model = buildHouseModel({
    catalog,
    projects: [
      {
        id: "undertext",
        title: "Undertext project",
        summary: "Project fallback",
        href: "/undertext",
      },
      {
        id: "private-room",
        title: "Private room",
        summary: "Nope",
        href: "/private",
      },
      {
        id: "garden",
        title: "Garden",
        summary: "A visible project",
        href: "/garden",
      },
      {
        id: "secret-work",
        title: "Secret work",
        summary: "Not shown",
        href: "/secret",
        hidden: true,
      },
    ],
    events: [
      event(),
      event({
        id: "activity_1111111111111111",
        relatedProject: "New experiment",
      }),
      event({
        id: "activity_2222222222222222",
        relatedProject: "private-room",
      }),
      event({
        id: "activity_3333333333333333",
        relatedProject: "Secret work",
      }),
    ],
    signals: [signal()],
    now,
  });
  const undertext = model.rooms.find((room) => room.id === "undertext");
  assert.equal(undertext.events.length, 1);
  assert.equal(undertext.occupants.length, 1);
  assert.equal(undertext.active, true);
  assert.equal(undertext.occupants[0].actor.name, "Astra");
  assert.ok(
    model.rooms.some(
      (room) => room.id === "new-experiment" && room.origin === "activity",
    ),
  );
  assert.ok(!model.rooms.some((room) => room.id === "private-room"));
  assert.ok(!model.rooms.some((room) => room.id === "secret-work"));
  assert.equal(model.unassignedEvents.length, 0);
  const stale = buildHouseModel({
    catalog,
    events: [event()],
    signals: [signal({ expiresAt: "2026-09-20T12:02:00Z" })],
    now,
  });
  assert.equal(
    stale.rooms.find((room) => room.id === "undertext").active,
    false,
  );
  assert.equal(stale.residents[0].name, "Astra");
});

test("generated activity IDs are catalog-editable, stable when long, and hidden differs from archived", () => {
  const longReference =
    "A deliberately long public experiment name that exceeds the normal room identifier limit for stable catalog editing";
  const first = buildHouseModel({
    catalog,
    events: [event({ relatedProject: longReference })],
    now,
  });
  const second = buildHouseModel({
    catalog,
    events: [event({ relatedProject: longReference })],
    now,
  });
  const firstRoom = first.rooms.find((room) => room.origin === "activity");
  const secondRoom = second.rooms.find((room) => room.origin === "activity");
  assert.equal(firstRoom.id, secondRoom.id);
  assert.ok(firstRoom.id.length <= 80);
  assert.ok(!firstRoom.id.startsWith("activity-"));

  const catalogWithGarden = {
    ...catalog,
    rooms: [
      ...catalog.rooms,
      {
        id: "garden",
        title: "Garden",
        summary: "Kept only when deliberate.",
        kind: "place",
        furnishing: "plants",
        pinned: true,
      },
    ],
  };
  const hidden = buildHouseModel({
    catalog: catalogWithGarden,
    projects: [
      { id: "garden", title: "Garden", summary: "Hidden source", hidden: true },
    ],
    now,
  });
  const archived = buildHouseModel({
    catalog: catalogWithGarden,
    projects: [
      {
        id: "garden",
        title: "Garden",
        summary: "Archived source",
        archived: true,
      },
    ],
    now,
  });
  assert.ok(!hidden.rooms.some((room) => room.id === "garden"));
  assert.ok(archived.rooms.some((room) => room.id === "garden"));
});
