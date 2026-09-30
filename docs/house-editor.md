# House roster editor

`/house/edit` is a development-only editor for the public house roster. It is
available only on `localhost`, `127.0.0.1`, or IPv6 loopback while Astro runs in
development mode; every other request returns a 404 before the page renders.
It is excluded from public navigation and search indexing.

The editor reads `/api/house-catalog` once on opening and keeps edits in a
browser-local draft. It never saves on open or while fields are changed. Use
**Save roster** to send the current catalog together with its revision; the API
is the authority for validation and durable writes. A changed on-disk revision
returns a conflict and leaves the local draft intact. Choosing **Reload latest
roster** explicitly replaces that draft with the current file.

Rooms and residents describe the public house. They must not be used as an
inventory of private machines, accounts, or live activity. Suggested project
rooms are copied into the draft only when **Add selected project room** is
chosen, so generated site content is never silently written into the roster.

Without JavaScript, read the local data file at
`src/data/house.catalog.json`; the editor makes no network request and no write.
