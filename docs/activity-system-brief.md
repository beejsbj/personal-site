# What's happening: postcards and a little house

The public activity area describes things Burooj is doing, making, trying, and
living around. Its voice can be playful: “Astra is tinkering on Undertext,”
“Undertext is digesting,” or “The overnight experiment has woken up.” These are
examples of editorial voice, not assertions about current activity.

## Two kinds of postcard

**Lasting stories** describe meaningful starts, changes, or outcomes. They come
from authored Markdown or the engine's approved durable export. An agent ending
its session is not automatically a worthwhile story.

**Happening now** describes a short-lived observation: an experiment running, a
schedule doing its rounds, a worker tinkering, or a lab processing something.
These require fresh, deliberately public signals. A missing signal means we do
not know; it does not prove everything is idle, healthy, or finished.

The homepage heading is “What's happening.” A small “Step inside the house”
link below it leads to `/house`; it does not become another main-navigation item.
The floor plan turns devices into wings and projects into rooms. Hermes residents
belong to the illustration; visiting workers need a current signal. An explicit
imagined-house mode can show the idea before real sources are connected, with a
persistent demo label. It never silently impersonates live work.

## Publication policy

Review a new source first. After that, explicitly allow selected milestone or
presence types from the exact reviewed producer. Both forms of automation default
to off. Public drafts should be charming and concise without inventing facts,
exposing private work, or pretending a session's raw log is interesting prose.

The path remains: observation → agent-edited public wording → source/type review
policy → public projection. The source producer or an editorial agent prepares
the draft; the site does not run a summarizing model. Corrections require review.
Prompts, transcripts, private hostnames, filesystem paths, credentials, and raw
service/session payloads do not belong in public projections.

## Implemented delivery boundary

- `src/lib/activity-engine/` owns local ingestion, review, revisions, withdrawal,
  and independent durable/presence projections. See [its guide](activity-engine.md).
- `src/data/activity.public.json` contains only durable approved stories and
  supplements authored Markdown. It is initially empty.
- `/api/now` is a read-only server route for a separately published, reviewed
  presence feed configured with server-only `ACTIVITY_PRESENCE_URL`. It accepts
  HTTPS, refuses redirects/embedded credentials, bounds response size/time,
  validates the public schema, and returns `Cache-Control: no-store`.
- No feed configured, invalid data, or an unavailable source produces an empty
  `unavailable` response. Upstream errors and private details never reach visitors.
- The shared browser controller polls every 30 seconds only while a relevant
  surface is visible. It removes expired claims independently of polling, clears
  signals on connection failure, and cleans up on navigation. The house and
  homepage consume the same validated signals.
- Presence must expire within five minutes of observation. It never enters the
  durable static JSON. No-JavaScript visitors still have the authored stories and
  the house illustration; they are not shown an indefinite live claim.

## What remains to connect

No real bjslab, device, agent, schedule, or self-hosted-app producer is connected.
No credentials or private account access have been granted. Next, choose one
narrow producer, prepare public wording and a heartbeat/termination rule, review
its first projection, and publish that feed at a configured endpoint. Deployment
settings and the source publisher are a separate integration step.

The house is an exploratory portfolio page. Turning it into `start.burooj.dev`,
a private launcher, or an authenticated operations surface is a later product
choice. Its noindex directive and omitted navigation/sitemap entries make it less
discoverable; the doorway is not access control.
