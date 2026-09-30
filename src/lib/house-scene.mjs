/**
 * Turns a house model into a floorplan scene and renders it as markup.
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
 * Arrange a model into wings, lit rooms, and the people standing in them.
 * @param {any} model
 * @returns {{ studios: any[], around: any[], rooms: any[], waiting: any[], busy: boolean, status: string }}
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
    studios: rooms.filter((room) => room.kind === "project"),
    around: rooms.filter((room) => room.kind !== "project"),
    rooms,
    waiting,
    busy: litCount > 0 || waiting.length > 0,
    status,
  };
}

/* ---------- Artwork, seen from above. Coordinates are drawings, not layout. ---------- */

const PROP_ART = {
  builder: `<ellipse class="house-figure__prop" cx="12" cy="11" rx="6.2" ry="5.6"/>`,
  scout: `<path class="house-figure__tool" d="M18 12l5-6"/><circle class="house-figure__prop" cx="23" cy="6" r="1.4"/>`,
  tinkerer: `<path class="house-figure__tool" d="M19 15l3.5-4"/><path class="house-figure__tool" d="M21 8.6a1.9 1.9 0 1 0 2.8 2.4"/>`,
  consultant: `<rect class="house-figure__prop" x="18.5" y="13" width="5" height="6.5" rx="0.5"/>`,
  messenger: `<rect class="house-figure__prop" x="18" y="14" width="6" height="4.4" rx="0.4"/><path class="house-figure__tool" d="M18 14l3 2.2 3-2.2"/>`,
  keeper: `<circle class="house-figure__prop" cx="21" cy="17" r="2.8"/><path class="house-figure__tool" d="M21 15.4V17h1.3"/>`,
  plain: "",
};

export function figureMarkup(figure, { arriving = false } = {}) {
  const label = `${figure.name}, ${figure.role}${figure.doing ? ` — ${figure.doing}` : ""}`;
  return `<span class="house-figure" data-figure="${esc(figure.kind)}" data-prop="${esc(figure.prop)}"${arriving ? " data-arriving" : ""} data-figure-key="${esc(figure.key)}" title="${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><ellipse class="house-figure__body" cx="12" cy="14.5" rx="8.5" ry="5"/><circle class="house-figure__head" cx="12" cy="11" r="4.4"/>${PROP_ART[figure.prop] ?? ""}</svg><span class="house-figure__name">${esc(figure.name)}</span></span>`;
}

const FURNISHING_ART = {
  desk: `<rect x="6" y="4" width="48" height="15" rx="1"/><path d="M21 7h18"/><rect x="44" y="8" width="6" height="4" rx="0.6"/><circle cx="30" cy="29" r="6.5"/><path d="M24 33.5q6 4 12 0"/>`,
  bench: `<rect x="3" y="3" width="54" height="13" rx="1"/><path d="M9 7v5M14 6.5l3 5.5M24 9.5h9M42 6h5v6h-5z"/><circle cx="18" cy="28" r="5"/><circle cx="42" cy="28" r="5"/>`,
  shelves: `<rect x="3" y="2" width="54" height="7"/><path d="M11 2v7M17 2v7M26 2v7M31 2v7M42 2v7M49 2v7"/><rect x="12" y="17" width="36" height="21" rx="3" class="house-plan__rug"/><circle cx="30" cy="27.5" r="6"/>`,
  table: `<circle cx="30" cy="20" r="11"/><rect x="26" y="2" width="8" height="4.5" rx="1"/><rect x="26" y="33.5" width="8" height="4.5" rx="1"/><rect x="10" y="16" width="4.5" height="8" rx="1"/><rect x="45.5" y="16" width="4.5" height="8" rx="1"/>`,
  sofa: `<path d="M4 4h52v18h-7V11H11v11H4z"/><path d="M11 11h38"/><rect x="18" y="27" width="24" height="10" rx="1.5"/>`,
  plants: `<circle cx="14" cy="14" r="9"/><path d="M14 5v18M5 14h18M8 8l12 12M20 8L8 20"/><circle cx="44" cy="26" r="7"/><path d="M44 19v14M37 26h14"/><circle cx="46" cy="7" r="3.5"/>`,
};

const furnishingMarkup = (kind) =>
  `<svg class="house-room__furniture" viewBox="0 0 60 40" aria-hidden="true" focusable="false">${FURNISHING_ART[kind] ?? FURNISHING_ART.desk}</svg>`;

const people = (figures, arriving) =>
  figures.map((figure) => figureMarkup(figure, { arriving: arriving.has(figure.key) })).join("");

function roomMarkup(room, selectedId, arriving) {
  const names = room.figures.map((figure) => `${figure.name} (${figure.role})`);
  const spoken = [
    room.title,
    room.lit ? `lights on${room.whisper ? `: ${room.whisper}` : ""}` : "",
    names.length ? `${listJoin(names)} ${names.length > 1 ? "are" : "is"} here` : "",
    room.note ? `latest: ${room.note.title}` : "",
  ]
    .filter(Boolean)
    .join(". ");
  return `<button type="button" class="house-room" data-house-room="${esc(room.id)}" data-kind="${esc(room.kind)}" data-lit="${room.lit}"${room.wide ? " data-wide" : ""} aria-pressed="${room.id === selectedId}"><span class="sr-only">${esc(spoken)}</span><span class="house-room__door" aria-hidden="true"></span><span class="house-room__label" aria-hidden="true"><span class="house-room__lamp"></span><strong>${esc(room.title)}</strong>${room.lit && room.whisper ? `<span class="house-room__whisper">${esc(room.whisper)}</span>` : ""}</span><span class="house-room__floor" aria-hidden="true">${furnishingMarkup(room.furnishing)}${people(room.figures, arriving)}</span>${room.note ? `<span class="house-room__note" aria-hidden="true"><span><time datetime="${esc(dateOf(room.note))}">${esc(shortDate(room.note))}</time>${esc(room.note.title)}</span></span>` : ""}</button>`;
}

/**
 * The plan from above: studios along the top, a hallway through the middle,
 * the rest of the house below it, and a front door onto the mat outside.
 * @param {any} scene
 * @param {{ selectedId?: string, arriving?: Set<string> }} [options]
 */
export function renderHouseMarkup(scene, { selectedId, arriving = new Set() } = {}) {
  const wing = (name, rooms, extra = "") =>
    rooms.length || extra
      ? `<div class="house-plan__wing" data-wing="${name}">${rooms.map((room) => roomMarkup(room, selectedId, arriving)).join("")}${extra}</div>`
      : "";
  const entry = `<div class="house-entry"><span class="house-room__door" aria-hidden="true"></span><span class="house-entry__label">Front door</span><span class="house-entry__door" aria-hidden="true"></span><span class="house-entry__mat">${scene.waiting.length ? people(scene.waiting, arriving) : `<span class="house-entry__welcome">Welcome</span>`}</span></div>`;
  return `<div class="house-plan">${wing("studios", scene.studios)}<div class="house-plan__hall" aria-hidden="true"><span>Hallway</span></div>${wing("around", scene.around, entry)}</div><p class="house-plan__title" aria-hidden="true">Ground plan · one room per project</p>`;
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
