import { validatePresenceSnapshot } from "./activity-presence.mjs";

const ROOM_KINDS = new Set(["project", "place"]);
const FURNISHINGS = new Set([
  "desk",
  "bench",
  "shelves",
  "table",
  "sofa",
  "plants",
]);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ROOMS = 200;
const MAX_RESIDENTS = 500;

const fail = (message) => {
  throw new TypeError(`House catalog: ${message}`);
};
const object = (value, name) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${name} must be an object.`);
  return value;
};
const text = (value, name, max) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(`${name} must be a non-empty string of at most ${max} characters.`);
  return value.trim();
};
const keyFor = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function generatedRoomId(reference) {
  const slug = keyFor(reference);
  if (slug.length <= 80) return slug;
  // FNV-1a 64 gives a deterministic compact suffix without making layout/order
  // part of the identifier. The full reviewed reference remains the alias key.
  let hash = 0xcbf29ce484222325n;
  for (const character of reference) {
    hash ^= BigInt(character.codePointAt(0));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  const suffix = hash.toString(36);
  return `${slug.slice(0, 79 - suffix.length)}-${suffix}`;
}

function href(value, name) {
  if (value === undefined) return undefined;
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 500 ||
    /[\u0000-\u001F\u007F]/.test(value)
  )
    fail(`${name} must be a URL or root-relative path.`);
  if (value.startsWith("/")) {
    if (value.startsWith("//") || value.startsWith("/\\"))
      fail(`${name} must not be protocol-relative.`);
    return value;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${name} must be a URL or root-relative path.`);
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

/** Validate the readable public catalog used to arrange house rooms. */
export function validateHouseCatalog(value) {
  object(value, "catalog");
  if (value.version !== 1) fail("version must be 1.");
  if (!Array.isArray(value.rooms) || value.rooms.length > MAX_ROOMS)
    fail(`rooms must contain at most ${MAX_ROOMS} entries.`);
  if (!Array.isArray(value.residents) || value.residents.length > MAX_RESIDENTS)
    fail(`residents must contain at most ${MAX_RESIDENTS} entries.`);
  const seenIds = new Set();
  const aliases = new Map();
  const rooms = value.rooms.map((room, index) => {
    object(room, `rooms[${index}]`);
    const id = text(room.id, `rooms[${index}].id`, 80);
    if (!ID.test(id)) fail(`rooms[${index}].id must be a normalized slug.`);
    if (seenIds.has(id)) fail(`duplicate room id ${id}.`);
    seenIds.add(id);
    const title = text(room.title, `rooms[${index}].title`, 120);
    const summary = text(room.summary, `rooms[${index}].summary`, 280);
    if (!ROOM_KINDS.has(room.kind)) fail(`rooms[${index}].kind is invalid.`);
    if (!FURNISHINGS.has(room.furnishing))
      fail(`rooms[${index}].furnishing is invalid.`);
    const roomAliases = room.aliases === undefined ? [] : room.aliases;
    if (!Array.isArray(roomAliases) || roomAliases.length > 30)
      fail(`rooms[${index}].aliases is invalid.`);
    const explicitAliases = roomAliases.map((alias, aliasIndex) =>
      keyFor(text(alias, `rooms[${index}].aliases[${aliasIndex}]`, 120)),
    );
    if (new Set(explicitAliases).size !== explicitAliases.length)
      fail(`duplicate aliases in room ${id}.`);
    const normalizedAliases = [id, title, ...explicitAliases].map(keyFor);
    const localAliases = new Set();
    for (const alias of normalizedAliases) {
      if (!alias) fail(`rooms[${index}] has an empty alias.`);
      if (localAliases.has(alias)) continue;
      localAliases.add(alias);
      const owner = aliases.get(alias);
      if (owner !== undefined && owner !== id)
        fail(`ambiguous alias ${alias}.`);
      aliases.set(alias, id);
    }
    const roomHref = href(room.href, `rooms[${index}].href`);
    return {
      id,
      title,
      summary,
      kind: room.kind,
      furnishing: room.furnishing,
      ...(roomHref ? { href: roomHref } : {}),
      aliases: explicitAliases,
      pinned:
        room.pinned === undefined
          ? false
          : typeof room.pinned === "boolean"
            ? room.pinned
            : fail(`rooms[${index}].pinned must be boolean.`),
      hidden:
        room.hidden === undefined
          ? false
          : typeof room.hidden === "boolean"
            ? room.hidden
            : fail(`rooms[${index}].hidden must be boolean.`),
      order:
        room.order === undefined
          ? 100
          : Number.isInteger(room.order) &&
              room.order >= -10_000 &&
              room.order <= 10_000
            ? room.order
            : fail(`rooms[${index}].order must be a bounded integer.`),
    };
  });
  const residentIds = new Set();
  const residents = value.residents.map((resident, index) => {
    object(resident, `residents[${index}]`);
    const id = text(resident.id, `residents[${index}].id`, 80);
    if (!ID.test(id) || residentIds.has(id))
      fail(`resident id ${id} is invalid or duplicate.`);
    residentIds.add(id);
    const roomId = text(resident.roomId, `residents[${index}].roomId`, 80);
    if (!seenIds.has(roomId))
      fail(`resident ${id} references unknown room ${roomId}.`);
    return {
      id,
      name: text(resident.name, `residents[${index}].name`, 120),
      role: text(resident.role, `residents[${index}].role`, 120),
      roomId,
    };
  });
  return { version: 1, rooms, residents };
}

const timeFor = (item) =>
  Date.parse(item.occurredAt ?? `${item.date}T00:00:00Z`);
const visibleEvent = (event, now) =>
  Number.isFinite(timeFor(event)) &&
  timeFor(event) <= now &&
  (!event.expiresAt || Date.parse(event.expiresAt) > now);

/** Build a coordinate-free room model from public catalog, reviewed updates, and fresh signals. */
export function buildHouseModel({
  catalog,
  projects = [],
  events = [],
  signals = [],
  now = Date.now(),
}) {
  const approvedCatalog = validateHouseCatalog(catalog);
  const rooms = new Map();
  const aliases = new Map();
  const hidden = new Set();
  const hiddenKeys = new Set();
  for (const room of approvedCatalog.rooms) {
    for (const alias of [room.id, keyFor(room.title), ...room.aliases])
      aliases.set(alias, room.id);
    if (room.hidden) {
      hidden.add(room.id);
      for (const alias of [room.id, keyFor(room.title), ...room.aliases])
        hiddenKeys.add(alias);
    } else
      rooms.set(room.id, {
        ...room,
        href: room.href ?? "/house",
        origin: "catalog",
        events: [],
        occupants: [],
        active: false,
      });
  }
  const resolve = (reference) => aliases.get(keyFor(reference));
  const ensureActivityRoom = (reference) => {
    const referenceKey = keyFor(reference);
    if (hiddenKeys.has(referenceKey)) return null;
    const existing = resolve(reference);
    if (existing) return hidden.has(existing) ? null : existing;
    const slug = referenceKey;
    if (!slug) return undefined;
    const id = generatedRoomId(reference);
    if (!rooms.has(id)) {
      rooms.set(id, {
        id,
        title: text(reference, "relatedProject", 120),
        summary: "A reviewed public activity thread.",
        kind: "project",
        furnishing: "desk",
        href: "/house",
        aliases: [],
        pinned: false,
        hidden: false,
        order: 100,
        origin: "activity",
        events: [],
        occupants: [],
        active: false,
      });
      aliases.set(slug, id);
    }
    return id;
  };
  for (const project of projects) {
    if (!project) continue;
    if (project.hidden) {
      for (const reference of [project.id, project.title].filter(Boolean)) {
        const projectKey = keyFor(reference);
        hiddenKeys.add(projectKey);
        const catalogId = aliases.get(projectKey);
        if (catalogId) {
          hidden.add(catalogId);
          rooms.delete(catalogId);
        }
      }
      continue;
    }
    // Archived projects do not generate a room, but an explicit catalog room
    // remains visible so an operator can deliberately keep its place.
    if (project.archived) {
      continue;
    }
    const id = keyFor(project.id ?? project.title ?? "");
    if (!id) continue;
    const catalogId = resolve(project.id ?? project.title);
    if (catalogId) {
      if (hidden.has(catalogId)) continue;
      const room = rooms.get(catalogId);
      if (room) {
        room.summary = room.summary || project.summary;
        room.href = room.href || href(project.href, "project.href") || "/house";
      }
      continue;
    }
    rooms.set(id, {
      id,
      title: text(project.title, "project.title", 120),
      summary: text(project.summary, "project.summary", 280),
      kind: "project",
      furnishing: "desk",
      href: href(project.href, "project.href") ?? "/house",
      aliases: [],
      pinned: false,
      hidden: false,
      order: 100,
      origin: "project",
      events: [],
      occupants: [],
      active: false,
    });
    aliases.set(id, id);
    aliases.set(keyFor(project.title), id);
  }
  const unassignedEvents = [];
  for (const event of events.filter((item) => visibleEvent(item, now))) {
    const roomId = event.relatedProject
      ? ensureActivityRoom(event.relatedProject)
      : undefined;
    if (roomId === null) continue;
    if (!roomId) unassignedEvents.push(event);
    else rooms.get(roomId).events.push(event);
  }
  const freshSignals = validatePresenceSnapshot(
    { version: 1, generatedAt: new Date(now).toISOString(), signals },
    { now },
  ).signals;
  const unassignedSignals = [];
  for (const signal of freshSignals) {
    const roomId = signal.relatedProject
      ? ensureActivityRoom(signal.relatedProject)
      : undefined;
    if (roomId === null) continue;
    if (!roomId) unassignedSignals.push(signal);
    else {
      const room = rooms.get(roomId);
      room.occupants.push(signal);
      room.active = true;
    }
  }
  const output = [...rooms.values()]
    .map((room) => {
      room.events.sort(
        (left, right) =>
          timeFor(right) - timeFor(left) ||
          String(left.id).localeCompare(String(right.id)),
      );
      const activity = [...room.events, ...room.occupants]
        .map(
          (item) =>
            item.observedAt ?? item.occurredAt ?? `${item.date}T00:00:00Z`,
        )
        .filter(Boolean)
        .reduce(
          (latest, candidate) =>
            !latest || Date.parse(candidate) > Date.parse(latest)
              ? candidate
              : latest,
          undefined,
        );
      return { ...room, ...(activity ? { lastActivityAt: activity } : {}) };
    })
    .sort(
      (left, right) =>
        Number(right.pinned) - Number(left.pinned) ||
        left.order - right.order ||
        (right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0) -
          (left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0) ||
        left.id.localeCompare(right.id),
    );
  return {
    rooms: output,
    unassignedEvents,
    unassignedSignals,
    residents: approvedCatalog.residents,
  };
}
