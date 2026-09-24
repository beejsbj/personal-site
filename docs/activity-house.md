# Activity House

`/house` is an unlisted, noindex illustrated floorplan reached from the home
page’s “What’s happening” doorway. It gives public projects and public places a
room, then lets their reviewed milestones and fresh postcards make the rooms
more specific. It is not a machine inventory or a dashboard of private work.

## What arranges the house

`src/data/activity-house.ts` owns the readable public catalog: room title,
summary, kind, furnishing, links, aliases, order, pins, and permanent residents.
The shared `buildHouseModel()` function combines that catalog with public project
records, approved durable activity, and fresh presence signals.

- Catalog order and pins decide the ordinary walking order.
- A public project without a catalog room can receive one automatically.
- A reviewed activity item with a new public `relatedProject` can add a room at
  runtime. Hidden catalog and project records are suppressed before rendering.
- Durable milestones fill the inspector but never make a room active.
- Only a fresh, validated presence signal makes a filled actor portrait appear.
  A room without one says “No fresh postcard”; it never claims that a device or
  worker is idle, offline, or absent.

The initial page renders the complete model on the server and stores the
public-safe input as escaped inert JSON. The client recomputes the same model on
`activity:presence`, preserving the selected room where it still exists. It asks
the shared activity runtime to re-emit its current state after Astro navigation;
it does not poll anything itself.

## Interaction and accessibility

The main floorplan uses native room buttons, a selected-room inspector, and
progressive search/filter controls. Without JavaScript, those controls remain
hidden and the native room details below the plan provide the same readable
project, place, postcard, and milestone information. The plan uses a responsive
grid and reusable furnishing silhouettes, without room-specific coordinates.

Persistent residents have unfilled ink portraits. Fresh actors carry their
reviewed name and role in a filled portrait. There is no fictional busy-house
mode. Hover movement is disabled for `prefers-reduced-motion`, and all event
listeners are abortable before Astro swaps pages.

## Presence boundary

The shared same-origin `/api/now` runtime currently starts with no real feed
configured. When a reviewed public feed is added, it must send only the activity
event fields and optional structured actor metadata already validated by the
shared runtime. Raw prompts, logs, private paths, device identifiers, and
unreviewed source payloads do not belong in the catalog, runtime event, or page.
