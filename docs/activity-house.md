# Activity House

`/house` is a hidden, noindex illustrated floorplan. It is a public-facing
metaphor for places where work happens, not a machine map, an account inventory,
or a live operations board. It intentionally has no header, footer, or sitemap
entry of its own; discovery comes from the contextual link under “What's
happening” on the home page.

## What is illustrated

- The Mac wing, S23+ balcony, bjslab machine room, Cockpit dispatch hall,
  Undertext digestion room, Design Lab atelier, Reddit reading nook, and a
  public-project gallery are room nouns rather than live system claims.
- The project gallery only links to `/projects`, a public site route.
- Hermes is a pair of permanent, allegorical resident profiles. The labels are
  illustration copy, not identities or a profile inventory.
- T3, Codex, Claude, and Astra are visiting worker figures. They remain absent
  in the normal quiet house and appear only under the persistent, explicit
  **Imagine a busy house** demo label. That scene is fictional.

The default status is **“The house is waiting for a signal.”** It must stay
truthful: a static render cannot say that a worker is active, idle, connected,
or unavailable.

## Presence handoff

The component installs the shared same-origin `/api/now` activity runtime and
listens for the browser event below. No real feed is configured yet, so the
runtime starts unavailable and the house makes no live claim.

```ts
window.dispatchEvent(
  new CustomEvent("activity:presence", {
    detail: {
      status: "connected" as const,
      signals: [
        {
          id: "activity_0123456789abcdef",
          title: "Public, reviewed title",
          summary: "Public, reviewed summary.",
          href: "https://burooj.dev/projects",
          linkLabel: "Read more",
          source: "agent-session",
          kind: "agents",
          relatedProject: "undertext",
          observedAt: "2026-09-20T00:00:00Z",
          expiresAt: "2026-09-20T00:05:00Z",
        },
      ],
    },
  }),
);
```

Only non-expired signals with public title and summary render. `relatedProject`
may illuminate a matching room, but the house never maps a signal to a person or
a device. If the fictional demo is active, real signals are retained until the
viewer leaves it; they are never merged into the demo story. The production
presence installer belongs to the shared activity runtime, where visibility,
freshness, error handling, and source review are governed.

## Interaction and motion

The floorplan rooms are native buttons with pressed state and an adjacent detail
panel. The same room descriptions are native `<details>` entries below the map,
so the page remains readable and navigable without JavaScript. The only motion
is a slow demo-only worker drift, controlled by a visible pause button and
disabled for `prefers-reduced-motion`. There is no animation loop in JavaScript;
the page controller uses abortable listeners and cleans up before Astro swaps.
