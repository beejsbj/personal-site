# Activity House

`/house` is an unlisted, noindex illustrated floorplan reached from the home
page’s “What’s happening” doorway. It gives public projects and public places a
room, then lets their reviewed milestones and fresh postcards make the rooms
more specific. It is not a machine inventory or a dashboard of private work.

## What arranges the house

`src/data/house.catalog.json` owns the readable public catalog: room title,
summary, kind, furnishing, links, aliases, order, pins, and permanent residents.
Edit it by hand or with the dev-only editor (see `docs/house-editor.md`). The
shared `buildHouseModel()` function combines that catalog with public project
records, approved durable activity, and fresh presence signals.

- Catalog order and pins decide the walking order. A pinned room is also drawn
  wider.
- A public project without a catalog room gets one automatically.
- A reviewed activity item with a new public `relatedProject` can add a room at
  runtime. Hidden catalog and project records are suppressed before rendering.
- Durable milestones are pinned to a room's wall (the latest one shows as a
  note) but never turn its lights on.
- Only a fresh, validated presence signal turns a room's lamp on. A signal with
  an `actor` also puts that person in the room; one without a matching room
  waits at the front door. Nothing claims a room, device, or worker is idle,
  offline, or absent.

## The drawing

`src/lib/house-scene.mjs` turns the model into a dollhouse cross-section: a
roof, an upstairs of project studios, a downstairs of places, and a front
door. The same module renders the markup on the server and in the browser, so
a feed refresh draws exactly what first paint drew. Every interpolated string
is escaped there, and the component's styles are global for the same reason.

- Residents are ink figures who bob in place. Visitors are filled figures who
  wander a little and walk in when they first appear.
- An actor's free-text role picks a costume (builder's hat, scout's spyglass,
  tinkerer's wrench, consultant's clipboard, messenger's envelope). An unknown
  role gets a plain figure; the costume never adds a claim.
- The chimney smokes and the status dot pulses only while a light is on.
- The status line is written from the scene: who is where, or who is minding
  which room when nobody has checked in.

Rooms are native buttons; choosing one fills the postcard beside the house
with who's here, fresh notes, and the milestones pinned to that wall. Without
JavaScript the server-rendered house and first postcard remain readable, and a
`<noscript>` list walks every room. Motion stops under `prefers-reduced-motion`,
and all listeners are abortable before Astro swaps pages.

## Rehearsal

With no real feed connected the house is usually quiet. In `astro dev`, the
page offers **Rehearse with pretend visitors** (`?visitors=pretend`), which adds
a handful of clearly fake, short-lived signals so the busy house can be judged.
The flag is only set from `import.meta.env.DEV`; public builds ignore the query.

## Presence boundary

The shared same-origin `/api/now` runtime currently starts with no real feed
configured. When a reviewed public feed is added, it must send only the activity
event fields and optional structured actor metadata already validated by the
shared runtime. Raw prompts, logs, private paths, device identifiers, and
unreviewed source payloads do not belong in the catalog, runtime event, or page.
