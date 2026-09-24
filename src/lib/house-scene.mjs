/**
 * Turns a house model into a dollhouse scene and renders it as markup.
 * The server and the browser share this renderer, so a feed refresh draws the
 * exact same house the first paint did. Every interpolated value is escaped.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ESCAPES[character]);

const PROPS = [
  ["builder", /build|construct|maker/i],
  ["scout", /scout|explor|research|search/i],
  ["tinkerer", /tinker|fix|mechanic|repair/i],
  ["consultant", /consult|review|advis|critic/i],
  ["messenger", /messeng|courier|post|digest|gateway/i],
  ["keeper", /keep|rhythm|clock|schedul|resident/i],
];
/** A role is free public text; the prop is only a costume chosen from it. */
export const propFor = (role = "") =>
  PROPS.find(([, pattern]) => pattern.test(role))?.[0] ?? "plain";

const dateOf = (item) =>
  item.observedAt ?? item.occurredAt ?? (item.date ? `${item.date}T00:00:00Z` : undefined);
export const shortDate = (item) => {
  const date = new Date(dateOf(item));
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)
    : "";
};
const longDate = (item) => {
  const date = new Date(dateOf(item));
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date)
    : "";
};

const listJoin = (items) =>
  items.length < 3
    ? items.join(" and ")
    : `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;

/**
 * Arrange a model into floors, lit rooms, and the people standing in them.
 * @param {any} model
 * @returns {{ upstairs: any[], downstairs: any[], rooms: any[], waiting: any[], busy: boolean, status: string }}
 */
export function buildHouseScene(model) {
  const residentsByRoom = new Map();
  for (const resident of model.residents ?? []) {
    const list = residentsByRoom.get(resident.roomId) ?? [];
    list.push(resident);
    residentsByRoom.set(resident.roomId, list);
  }
  const rooms = model.rooms.map((room) => {
    const figures = [
      ...(residentsByRoom.get(room.id) ?? []).map((resident) => ({
        key: `resident:${resident.id}`,
        name: resident.name,
        role: resident.role,
        prop: propFor(resident.role),
        kind: "resident",
      })),
      ...room.occupants
        .filter((signal) => signal.actor)
        .map((signal) => ({
          key: `visitor:${signal.actor.id}:${room.id}`,
          name: signal.actor.name,
          role: signal.actor.role,
          prop: propFor(signal.actor.role),
          kind: "visitor",
          doing: signal.title,
        })),
    ];
    return {
      ...room,
      figures,
      lit: room.active,
      whisper: room.occupants[0]?.title,
      note: room.events[0],
      wide: room.pinned,
    };
  });
  const waiting = (model.unassignedSignals ?? [])
    .filter((signal) => signal.actor)
    .map((signal) => ({
      key: `visitor:${signal.actor.id}:porch`,
      name: signal.actor.name,
      role: signal.actor.role,
      prop: propFor(signal.actor.role),
      kind: "visitor",
      doing: signal.title,
    }));
  const visitors = rooms.flatMap((room) =>
    room.figures
      .filter((figure) => figure.kind === "visitor")
      .map((figure) => `${figure.name} in ${room.title}`),
  );
  const residents = rooms.flatMap((room) =>
    room.figures
      .filter((figure) => figure.kind === "resident")
      .map((figure) => ({ name: figure.name, room: room.title })),
  );
  const litCount = rooms.filter((room) => room.lit).length;
  let status;
  if (visitors.length || waiting.length) {
    const around = [...visitors, ...waiting.map((figure) => `${figure.name} at the door`)];
    status = `${listJoin(around)}. ${around.length === 1 ? "One light" : "Lights"} on right now.`;
  } else if (litCount) {
    status = `${litCount === 1 ? "A light is" : `${litCount} lights are`} on, but nobody’s signed the guestbook.`;
  } else if (residents.length) {
    const byRoom = new Map();
    for (const { name, room } of residents)
      byRoom.set(room, [...(byRoom.get(room) ?? []), name]);
    const minding = [...byRoom].map(([room, names]) => `${listJoin(names)} ${names.length > 1 ? "are" : "is"} minding ${room}`);
    status = `${listJoin(minding)}. Nobody else has checked in just now.`;
  } else status = "Nobody has checked in just now.";
  return {
    upstairs: rooms.filter((room) => room.kind === "project"),
    downstairs: rooms.filter((room) => room.kind !== "project"),
    rooms,
    waiting,
    busy: litCount > 0 || waiting.length > 0,
    status,
  };
}

/* ---------- Artwork. Coordinates are drawings, not layout. ---------- */

const PROP_ART = {
  builder: `<path class="house-figure__prop" d="M6.4 7.4a5.6 5.6 0 0 1 11.2 0h1.6v1.5H4.8V7.4z"/>`,
  scout: `<path class="house-figure__tool" d="M16 21l6.5-6"/><circle class="house-figure__prop" cx="22.5" cy="15" r="1.6"/>`,
  tinkerer: `<path class="house-figure__tool" d="M17 24l4.5-4.5"/><path class="house-figure__tool" d="M20 17.8a2.2 2.2 0 1 0 3.2 3.2"/>`,
  consultant: `<rect class="house-figure__prop" x="16.5" y="19" width="5.5" height="7" rx="0.6"/><path class="house-figure__tool" d="M17.7 21.4h3.1M17.7 23.4h3.1"/>`,
  messenger: `<rect class="house-figure__prop" x="16" y="21" width="7" height="5" rx="0.4"/><path class="house-figure__tool" d="M16 21l3.5 2.6L23 21"/>`,
  keeper: `<path class="house-figure__prop" d="M7.2 4.8Q12 0.6 16.8 4.8Q12 3.4 7.2 4.8z"/>`,
  plain: "",
};

export function figureMarkup(figure, { arriving = false } = {}) {
  const label = `${figure.name}, ${figure.role}${figure.doing ? ` — ${figure.doing}` : ""}`;
  return `<span class="house-figure" data-figure="${esc(figure.kind)}" data-prop="${esc(figure.prop)}"${arriving ? " data-arriving" : ""} data-figure-key="${esc(figure.key)}" title="${esc(label)}"><svg viewBox="0 0 24 40" aria-hidden="true" focusable="false"><path class="house-figure__leg" d="M10 31v8M14 31v8"/><path class="house-figure__body" d="M6.5 32Q6 16.5 12 15.5Q18 16.5 17.5 32z"/><circle class="house-figure__head" cx="12" cy="9" r="5"/>${PROP_ART[figure.prop] ?? ""}</svg><span class="house-figure__name">${esc(figure.name)}</span></span>`;
}

const FURNISHING_ART = {
  desk: `<path d="M3 23h56M7 23v16M55 23v16M20 6h22v13H20zM31 19v4M49 23V12l6-4"/><path d="M52 6.5l6 2.5-2 3.5-6-2.5z"/>`,
  bench: `<path d="M2 25h76M6 25v14M74 25v14M8 4h44v14H8z"/><path d="M14 8v6M22 8v4M30 8v7M40 8l4 5M60 25v-7h8v7"/>`,
  shelves: `<path d="M6 2h40v37H6zM6 14h40M6 27h40"/><path d="M10 14V5M13 14V6M16 14V4M24 27v-9M27 27v-10M30 27v-8M36 27l3-9M11 39v-8M15 39v-9"/>`,
  table: `<path d="M12 24h54M18 24v15M60 24v15M4 39V16M4 29h9v10M74 39V16M74 29h-9v10"/><path d="M34 24c0-6 10-6 10 0M44 19.5h4"/>`,
  sofa: `<path d="M8 20q0-6 6-6h48q6 0 6 6v8H8zM2 24h8v12H2zM66 24h8v12h-8zM4 36v3M72 36v3M10 32h56"/>`,
  plants: `<path d="M14 28h16l-2 11H16zM22 28V14M22 18q-8-2-10-10q8 1 10 10M22 16q7-3 9-11q-8 2-9 11M50 30h12l-1.5 9h-9zM56 30v-8M56 24q-5-1-6-6q5 1 6 6"/>`,
};

const furnishingMarkup = (kind) =>
  `<svg class="house-room__furniture" viewBox="0 0 80 40" aria-hidden="true" focusable="false">${FURNISHING_ART[kind] ?? FURNISHING_ART.desk}</svg>`;

function roomMarkup(room, selectedId, arriving) {
  const people = room.figures.map((figure) => `${figure.name} (${figure.role})`);
  const spoken = [
    room.title,
    room.lit ? `lights on${room.whisper ? `: ${room.whisper}` : ""}` : "",
    people.length ? `${listJoin(people)} ${people.length > 1 ? "are" : "is"} here` : "",
    room.note ? `latest: ${room.note.title}` : "",
  ]
    .filter(Boolean)
    .join(". ");
  return `<button type="button" class="house-room" data-house-room="${esc(room.id)}" data-kind="${esc(room.kind)}" data-lit="${room.lit}"${room.wide ? " data-wide" : ""} aria-pressed="${room.id === selectedId}"><span class="sr-only">${esc(spoken)}</span><span class="house-room__lamp" aria-hidden="true"></span><span class="house-room__label" aria-hidden="true"><strong>${esc(room.title)}</strong>${room.lit && room.whisper ? `<span class="house-room__whisper">${esc(room.whisper)}</span>` : ""}</span>${room.note ? `<span class="house-room__note" aria-hidden="true"><time datetime="${esc(dateOf(room.note))}">${esc(shortDate(room.note))}</time>${esc(room.note.title)}</span>` : ""}<span class="house-room__floor" aria-hidden="true">${furnishingMarkup(room.furnishing)}<span class="house-room__people">${room.figures.map((figure) => figureMarkup(figure, { arriving: arriving.has(figure.key) })).join("")}</span></span></button>`;
}

/**
 * The building itself: roof, two floors, and a front porch.
 * @param {any} scene
 * @param {{ selectedId?: string, arriving?: Set<string> }} [options]
 */
export function renderHouseMarkup(scene, { selectedId, arriving = new Set() } = {}) {
  const floor = (name, label, rooms, extra = "") =>
    rooms.length || extra
      ? `<div class="house-floor" data-floor="${name}"><p class="house-floor__label">${esc(label)}</p><div class="house-floor__rooms">${rooms.map((room) => roomMarkup(room, selectedId, arriving)).join("")}${extra}</div></div>`
      : "";
  const porch = `<div class="house-porch"><span class="house-porch__mat">${scene.waiting.length ? "Someone’s at the door" : "The front door"}</span><span class="house-porch__step"><span class="house-porch__people">${scene.waiting.map((figure) => figureMarkup(figure, { arriving: arriving.has(figure.key) })).join("")}</span><span class="house-porch__door" aria-hidden="true"></span></span></div>`;
  return `<div class="house-roof" aria-hidden="true"><span class="house-roof__chimney"><i></i><i></i><i></i></span></div>${floor("upstairs", "Upstairs · the studios", scene.upstairs)}${floor("downstairs", "Downstairs · around the house", scene.downstairs, porch)}`;
}

/** The selected room, written like the back of a postcard. */
export function renderRoomDetail(room) {
  if (!room) return `<p class="house-detail__empty">Pick a room to look inside.</p>`;
  const here = room.figures.length
    ? `<ul class="house-detail__people">${room.figures
        .map(
          (figure) =>
            `<li>${figureMarkup(figure)}<span><strong>${esc(figure.name)}</strong> <span class="house-detail__role">${esc(figure.role)}</span>${figure.doing ? `<span class="house-detail__doing">${esc(figure.doing)}</span>` : ""}</span></li>`,
        )
        .join("")}</ul>`
    : `<p class="house-detail__quiet">Nobody’s in right now.</p>`;
  const signals = room.occupants.filter((signal) => !signal.actor);
  const now = signals.length
    ? `<ul class="house-detail__now">${signals.map((signal) => `<li><a href="${esc(signal.href)}">${esc(signal.title)}</a> <span>${esc(signal.summary)}</span></li>`).join("")}</ul>`
    : "";
  const lately = room.events.length
    ? `<ol class="house-detail__lately">${room.events
        .slice(0, 6)
        .map(
          (event) =>
            `<li><time datetime="${esc(dateOf(event))}">${esc(longDate(event))}</time><a href="${esc(event.href)}">${esc(event.title)}</a><span>${esc(event.summary)}</span></li>`,
        )
        .join("")}</ol>`
    : `<p class="house-detail__quiet">No milestones pinned to this wall yet.</p>`;
  const visit =
    room.href && room.href !== "/house"
      ? `<a class="house-detail__visit" href="${esc(room.href)}">Go to ${esc(room.title)}</a>`
      : "";
  return `<p class="house-detail__eyebrow">${room.kind === "project" ? "Studio" : "Room"}${room.lit ? " · lights on" : ""}</p><h2 tabindex="-1">${esc(room.title)}</h2><p class="house-detail__summary">${esc(room.summary)}</p>${visit}<section><h3>Who’s here</h3>${here}${now}</section><section><h3>Pinned to the wall</h3>${lately}</section>`;
}
