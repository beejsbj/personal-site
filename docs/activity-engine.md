# Local activity engine

This is a local, file-backed review queue for activity from public GitHub work,
intentional bjslab service/deployment milestones, agent-session lifecycle facts,
manual entries, and future explicit generic producers. It creates a small static
JSON projection for the site. It is not a webhook server, poller, SSH/T3 client,
authentication system, or runtime presence endpoint.

The engine supplements the existing hand-authored Markdown updates. A source
going offline leaves Markdown and the last committed JSON untouched.

## Safety model

Every event has `source + producer + providerEventId` identity. Re-delivering
the same material event is a duplicate; a change other than `observedAt` creates
a new revision and puts it back in review. `occurredAt` records when it happened;
`observedAt` records when the local engine learned it. Approved records can be
retracted. The private store retains its revision/history receipt.

Sources and producer IDs are deny-by-default: the policy file has an explicit
allowlist per source. The bundled defaults only name synthetic example producers.
Replace them with deliberate source identities before real use. `manual` is also
review-first.

An operator may later add an exact `autoPublish` rule for a deliberately reviewed
public-summary producer, for example `bjslab:public-milestones` with
`work.milestone`, or a reviewed deployment producer with `deployment.succeeded`.
Each rule must name the exact source, producer, granular event type, and durable
display kind; wildcards and presence kinds are rejected. The rule stays inert
until the local store contains one manual approval for that same source and
producer. A matching later event can then use only its validated candidate title,
summary, URL, link label, and related project. This explicitly trusts that
producer's prepared public text and URLs for that one type; it never trusts raw
payloads, logs, transcripts, or unreviewed private facts. Corrections always
return to review, and rejected/retracted retry records never auto-resurrect.

Imported payloads are size-bounded and reject obvious credential, prompt,
transcript, history, log, and path keys. This heuristic is not proof that a
payload is safe. The allowlist, narrow adapters, and the human approval step are
the actual privacy boundary. Do not put private source payloads, prompts, logs,
paths, tokens, or transcripts in a fixture or store.

`mode: "event"` describes durable history. `mode: "presence"` describes a
short-lived state and needs an `expiresAt`; it may only use `status`, `location`,
or `agents`. Presence never enters `src/data/activity.public.json`: a static
build cannot enforce freshness after deployment. A completed agent-session uses
the durable `milestone` kind after editorial review; a running/failed lifecycle
indication is presence. A substantial action can also be a dated durable fact
when it starts, without pretending it remains live indefinitely.

## Public drafting contract

The intended pipeline is: private observations → agent-edited public draft →
reviewed source/type policy → approved public milestone. This engine does not
run an LLM or scrape sessions. A producer preparing a candidate must describe a
substantial action or outcome, distinguish started/in-progress from completed,
link public evidence where available, and omit noise, implementation paths,
private service details, prompts, logs, and transcripts. Candidate text is
intentionally prepared for public review; raw session/service adapters remain
queued by default. `session.completed` is a lifecycle fact, not a blanket reason
to publish a milestone.

## Files and permissions

The default private store is `.activity-engine/activity-store.json`, which is
ignored by Git. Writes are atomic and files are created mode `0600`; its directory
is created mode `0700`. Mutating commands take an exclusive `activity-store.lock`.
If a command crashes, inspect the process before removing that lock; it is not
safe for another process to guess that a stale lock can be broken.

The export belongs at `src/data/activity.public.json`. It has only approved
durable projection fields and opaque hashed IDs. It does not contain provider
IDs, producer IDs, raw payloads, candidate copy, review notes, or store history.

```json
{
  "version": 1,
  "generatedAt": "2026-09-20T13:00:00Z",
  "events": [
    {
      "id": "activity_a1b2c3d4e5f60708",
      "occurredAt": "2026-09-20T12:00:00Z",
      "date": "2026-09-20",
      "dateLabel": "2026-09-20",
      "observedAt": "2026-09-20T12:01:00Z",
      "source": "bjslab",
      "kind": "milestone",
      "title": "Reviewed service milestone",
      "summary": "Public, curated wording.",
      "href": "https://example.test/evidence",
      "linkLabel": "View update",
      "evidence": {
        "url": "https://example.test/evidence",
        "observedAt": "2026-09-20T12:01:00Z"
      }
    }
  ]
}
```

`date` and `dateLabel` always derive from `occurredAt`; a reviewer cannot change
the historical event date through the projection. A review projection may set a
separate `evidenceUrl` when its public evidence is different from its reader
destination. Exports sort by the actual UTC instant and then opaque ID, so
timezone offsets remain deterministic.

## Operator workflow

Start with a policy and narrow its synthetic fixture producers to intentional
real producer identities:

```sh
node scripts/activity/index.mjs policy-init
node scripts/activity/index.mjs import --policy .activity-engine/policy.json \
  --file scripts/tests/fixtures/activity-engine/events.json --adapter raw
node scripts/activity/index.mjs list --status pending
```

Inspect the private local store to copy an import's candidate facts into a fresh
review file at `.activity-engine/review-id.json`, then edit it for accuracy and
voice. Never approve a raw provider payload. Keep policy and review files under
the ignored `.activity-engine/` directory; the only reviewable public artifact
is the exported `src/data/activity.public.json`.

```sh
node scripts/activity/index.mjs approve --id activity_REPLACE_ME --revision 1 \
  --projection .activity-engine/review-id.json \
  --by buroj
node scripts/activity/index.mjs export --out src/data/activity.public.json
```

Use the `revision` from `list`: approval is rejected if a provider correction
arrived after the review, so an old editorial decision cannot apply to new facts.
Use `reject --id … --note …` when it should remain private/noisy. Use `retract
--id … --note …` when published output must disappear, then run `export` and
review the JSON diff before committing it. A materially corrected provider record
queues a fresh revision under the same opaque ID; it needs fresh approval.

After that first manual approval, an operator can opt in one carefully bounded
rule in `.activity-engine/policy.json`:

```json
{
  "autoPublish": [
    {
      "source": "bjslab",
      "producer": "bjslab:public-milestones",
      "eventType": "work.milestone",
      "eventKind": "milestone"
    }
  ]
}
```

Keep this alongside the required `sources` policy object. The producer must
already be exactly allowlisted there. Do not add a rule until its public drafts
have been manually reviewed; rules do not make every agent session activity
interesting enough to publish.

Supported fixture translation boundaries are `--adapter github-pr`,
`bjslab-milestone`, `agent-session`, and `manual`; `raw` accepts an already
normalized envelope. They intentionally only transform local JSON fixtures. A
future receiver must independently authenticate requests, enforce rate/replay
limits, and call this engine with a narrow source adapter; this repository does
not implement such a receiver.

Run the focused checks with:

```sh
node --test scripts/tests/activity-engine.test.mjs
```
