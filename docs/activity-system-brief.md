# Future work: a public activity system

Status: shaping brief for a separate issue, not an implemented service or approved
architecture. Burooj wants updates from across his work: repositories, pull
requests, writing, experiments, and potentially agent/status signals. Projects
remain lasting portfolio records; activity records events.

## What exists

- Six manually authored Markdown records in `src/content/updates/`.
- A typed schema in `src/content.config.ts`: event kinds, source, optional evidence
  URL/observation time, and expiry required for ephemeral kinds.
- Shared `ActivityStream` / `UpdateEntry` rendering.
- `src/lib/activity.mjs` sorts a snapshot and filters future/expired items at
  build/render time, not continuously in deployed HTML.

There are no webhooks, polling jobs, ingestion API, agent publishing credentials,
moderation queue, or live telemetry. An attractive stream does not establish those
capabilities.

## Intended experience

A readable stream of meaningful changes, not a raw commit firehose: “Merged the
new keyboard controls,” “Published an article,” “Created an experiment,” or
“A project shipped.” Wording can have Burooj's voice while facts stay precise:
opened, closed, and merged pull requests are not interchangeable.

Presence is different from history. “Three agents running” may become false in
seconds; “Published an article” remains true. Never treat changing presence as a
permanent milestone.

## Candidate event contract

Adapters should produce a common envelope, not arbitrary HTML:

- Stable internal ID, provider/source event ID, event kind, subject, exact action.
- `occurredAt` separate from `observedAt`/`receivedAt`, public evidence URL where
  available, and correction/retraction history.
- Public title/summary, destination, optional related project, visibility, review
  state, and producer identity/provenance.
- Ephemeral records also need expiry, last heartbeat/freshness, and a replacement
  key so a new presence snapshot replaces the previous one.

Validate before publication. Deduplicate retries by provider + source event ID;
define how edited articles or PR transitions update a record. Keep renderers
independent of provider payload details.

## Publication and privacy boundary

- Default deny for private repos, homelab internals, precise location, agent
  prompts, paths, logs, secrets, and unreviewed free-form text.
- Begin with explicit public-source allowlists. Being public upstream does not
  mean every event is useful or intended for amplification here.
- Give producers scoped, revocable credentials. Verify webhook signatures;
  prevent replay, limit payload size/rate, and retain actor receipts.
- Agents propose structured events through an API or CLI. They cannot bypass
  schema, privacy checks, or review by supplying prose.
- Decide which low-risk public events can auto-publish and which need approval.
  Provide a reliable correction/withdrawal path.
- Location and agent counts are opt-in. Publish only intentional coarse/aggregate
  signals with short freshness windows; never infer location.

## Delivery choices

1. **Generated content + rebuild:** simplest static-site fit and reviewable Git
   diff. Costs latency and rebuild dependence; cannot alone guarantee fresh
   presence in already-deployed HTML.
2. **Small event store + public read endpoint:** supports deduplication, review,
   correction, and freshness. Adds hosting, credentials, storage, and operations.
3. **Hybrid:** stable portfolio snapshot with read-only enhancement of the activity
   area. Supports fresher signals but requires honest stale/offline behavior and
   a usable no-JavaScript fallback.

Recommendation for shaping, not a settled choice: start with durable events from
one public source, retain manual entries, and separate ingestion from rendering.
Add presence only after freshness and privacy behavior are designed and tested.

## First implementation slice and acceptance gates

After agreeing the source and publishing policy, connect one allowlisted source
end to end. Include fixtures for authentic delivery, duplicate retry, edited
event, private payload, invalid signature, outage, and correction. Show an accepted
event with provenance; rejected payloads must not leak into public output. Keep
manual authoring and the base portfolio usable when the source is unavailable.

Before any presence slice, prove expiry at the public delivery boundary even
without another build. An offline producer yields absent/stale status, never a
confident old “currently” claim.

## Decisions for the separate issue

- Which first source: GitHub, writing feed, explicit agent milestones, or another?
- Which repositories/event types deserve display? How much grouping/noise control?
- Who can propose versus publish, and what requires Burooj's review?
- What latency and maintenance cost are acceptable? Where does the service live?
- Does activity need an archive or only a small homepage window?
- Is presence worth its privacy/freshness complexity now or later?
- Where does authored voice end and automated summarization begin? How are
  summaries checked against the source event?

Non-goals: deploy a service, grant credentials, connect private accounts, implement
prism, or claim the curated stream is live.
