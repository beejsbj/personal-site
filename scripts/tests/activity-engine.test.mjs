import assert from "node:assert/strict";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import {
  approve,
  buildPresenceSnapshot,
  buildStaticExport,
  defaultPolicy,
  fromAgentSessionLifecycle,
  fromGithubPullRequest,
  ingest,
  retract,
  validatePolicy,
  validatePublicExport,
} from "../../src/lib/activity-engine/index.mjs";

const FIXED_CLOCK = () => Date.parse("2026-09-20T13:00:00Z");
const execFile = promisify(execFileCallback);
const repositoryRoot = process.cwd();

async function workspace() {
  const directory = await mkdtemp(join(tmpdir(), "activity-engine-"));
  const storeDir = join(directory, "store");
  return {
    directory,
    storeDir,
    async cleanup() {
      await rm(directory, { recursive: true, force: true });
    },
  };
}

function policy() {
  const value = defaultPolicy();
  value.sources.bjslab.producers = [
    "bjslab:one",
    "bjslab:two",
    "bjslab:one:extra",
  ];
  value.sources.manual.producers = ["manual:operator"];
  return value;
}

function event(overrides = {}) {
  return {
    source: "bjslab",
    producer: "bjslab:one",
    providerEventId: "fixture-1",
    eventKind: "milestone",
    mode: "event",
    occurredAt: "2026-09-20T12:00:00Z",
    observedAt: "2026-09-20T12:01:00Z",
    candidate: {
      title: "Untrusted candidate",
      summary: "Must be reviewed before publication.",
      href: "https://example.test/source",
      linkLabel: "View source",
    },
    ...overrides,
  };
}

const projection = {
  title: "Reviewed milestone",
  summary: "Only this explicit copy becomes public.",
  href: "https://example.test/reviewed",
  linkLabel: "Read update",
};

function autoPolicy() {
  const value = policy();
  value.autoPublish = [
    {
      source: "bjslab",
      producer: "bjslab:one",
      eventType: "work.milestone",
      eventKind: "milestone",
    },
  ];
  return value;
}

function presencePolicy() {
  const value = policy();
  value.autoPresence = [
    {
      source: "bjslab",
      producer: "bjslab:one",
      eventType: "work.tinkering",
      eventKind: "agents",
    },
  ];
  return value;
}

function presenceEvent(overrides = {}) {
  return event({
    providerEventId: "undertext-now",
    eventKind: "agents",
    eventType: "work.tinkering",
    mode: "presence",
    occurredAt: "2026-09-20T12:00:00Z",
    observedAt: "2026-09-20T12:01:00Z",
    expiresAt: "2026-09-20T12:05:00Z",
    replacementKey: "undertext-work",
    candidate: {
      title: "Astra is tinkering on Undertext",
      summary: "A public, short-lived work signal.",
      href: "https://example.test/undertext",
      linkLabel: "View Undertext",
    },
    ...overrides,
  });
}

test("imports are private, review-first, bounded, and stored with private permissions", async () => {
  const testStore = await workspace();
  try {
    const result = await ingest({
      storeDir: testStore.storeDir,
      policy: policy(),
      event: event(),
      clock: FIXED_CLOCK,
    });
    assert.equal(result.outcome, "queued");
    assert.equal(result.record.status, "pending");
    assert.equal(result.record.public, undefined);
    const storeMode =
      (await stat(join(testStore.storeDir, "activity-store.json"))).mode &
      0o777;
    assert.equal(storeMode, 0o600);
    await assert.rejects(
      ingest({
        storeDir: testStore.storeDir,
        policy: policy(),
        event: event({
          providerEventId: "unsafe",
          payload: { transcript: "do not store" },
        }),
      }),
      /never ingested/,
    );
    await assert.rejects(
      ingest({
        storeDir: testStore.storeDir,
        policy: policy(),
        event: event({
          providerEventId: "bad-url",
          candidate: { ...event().candidate, href: "file:///private" },
        }),
      }),
      /http\(s\)/,
    );
    await assert.rejects(
      ingest({
        storeDir: testStore.storeDir,
        policy: policy(),
        event: event({
          source: "generic",
          producer: "generic:unknown",
          providerEventId: "private-source",
        }),
      }),
      /disabled by policy/,
    );
    await assert.rejects(
      ingest({
        storeDir: testStore.storeDir,
        policy: policy(),
        event: event({
          providerEventId: "overlong-presence",
          eventKind: "agents",
          eventType: "work.tinkering",
          mode: "presence",
          observedAt: "2026-09-20T12:01:00Z",
          expiresAt: "2026-09-20T12:07:00Z",
          replacementKey: "overlong",
        }),
      }),
      /no more than five minutes/,
    );
  } finally {
    await testStore.cleanup();
  }
});

test("tuple identity avoids colon collisions across producers and observed retries preserve approval", async () => {
  const testStore = await workspace();
  try {
    const first = await ingest({
      storeDir: testStore.storeDir,
      policy: policy(),
      event: event({ providerEventId: "extra:id" }),
      clock: FIXED_CLOCK,
    });
    const second = await ingest({
      storeDir: testStore.storeDir,
      policy: policy(),
      event: event({ producer: "bjslab:one:extra", providerEventId: "id" }),
      clock: FIXED_CLOCK,
    });
    assert.notEqual(first.record.id, second.record.id);
    await approve({
      storeDir: testStore.storeDir,
      id: first.record.id,
      expectedRevision: 1,
      projection,
      clock: FIXED_CLOCK,
    });
    const retry = await ingest({
      storeDir: testStore.storeDir,
      policy: policy(),
      event: event({
        providerEventId: "extra:id",
        observedAt: "2026-09-20T12:05:00Z",
      }),
      clock: FIXED_CLOCK,
    });
    assert.equal(retry.outcome, "duplicate");
    assert.equal(retry.record.revision, 1);
    assert.equal(retry.record.status, "approved");
    assert.equal(retry.record.public.title, projection.title);
    assert.equal(retry.record.event.observedAt, "2026-09-20T12:05:00Z");
  } finally {
    await testStore.cleanup();
  }
});

test("a material correction requires fresh review and retraction removes the public projection", async () => {
  const testStore = await workspace();
  try {
    const queued = await ingest({
      storeDir: testStore.storeDir,
      policy: policy(),
      event: event(),
      clock: FIXED_CLOCK,
    });
    await approve({
      storeDir: testStore.storeDir,
      id: queued.record.id,
      expectedRevision: 1,
      projection,
      clock: FIXED_CLOCK,
    });
    const revised = await ingest({
      storeDir: testStore.storeDir,
      policy: policy(),
      event: event({
        candidate: {
          ...event().candidate,
          summary: "Provider corrected this event.",
        },
      }),
      clock: FIXED_CLOCK,
    });
    assert.equal(revised.outcome, "revised");
    assert.equal(revised.record.revision, 2);
    assert.equal(revised.record.status, "pending");
    assert.equal(revised.record.public, undefined);
    await assert.rejects(
      approve({
        storeDir: testStore.storeDir,
        id: queued.record.id,
        expectedRevision: 1,
        projection,
        clock: FIXED_CLOCK,
      }),
      /reviewed revision 1, but .* is now revision 2/,
    );
    await approve({
      storeDir: testStore.storeDir,
      id: queued.record.id,
      expectedRevision: 2,
      projection,
      clock: FIXED_CLOCK,
    });
    const retracted = await retract({
      storeDir: testStore.storeDir,
      id: queued.record.id,
      clock: FIXED_CLOCK,
    });
    assert.equal(retracted.status, "retracted");
    assert.equal(retracted.public, undefined);
  } finally {
    await testStore.cleanup();
  }
});

test("an exact, manually trusted public-summary producer may auto-publish a later milestone only", async () => {
  const testStore = await workspace();
  try {
    const reviewed = await ingest({
      storeDir: testStore.storeDir,
      policy: autoPolicy(),
      event: event({ eventType: "work.milestone" }),
      clock: FIXED_CLOCK,
    });
    assert.equal(
      reviewed.outcome,
      "queued",
      "the first record always establishes trust through review",
    );
    await approve({
      storeDir: testStore.storeDir,
      id: reviewed.record.id,
      expectedRevision: 1,
      projection,
      clock: FIXED_CLOCK,
    });

    const automatic = await ingest({
      storeDir: testStore.storeDir,
      policy: autoPolicy(),
      event: event({
        providerEventId: "trusted-next-move",
        eventType: "work.milestone",
        candidate: {
          title: "Prepared public milestone",
          summary: "Substantial work completed with public evidence.",
          href: "https://example.test/prepared",
          linkLabel: "Read update",
          ignoredInternalField: "not projected",
        },
        payload: { debug: "not public" },
      }),
      clock: FIXED_CLOCK,
    });
    assert.equal(automatic.outcome, "auto-approved");
    assert.equal(automatic.record.review.method, "auto");
    assert.deepEqual(
      automatic.record.review.policyRule,
      autoPolicy().autoPublish[0],
    );
    assert.deepEqual(automatic.record.public, {
      title: "Prepared public milestone",
      summary: "Substantial work completed with public evidence.",
      href: "https://example.test/prepared",
      linkLabel: "Read update",
    });
    assert.doesNotMatch(
      JSON.stringify(automatic.record.public),
      /debug|ignoredInternalField/,
    );

    await retract({
      storeDir: testStore.storeDir,
      id: automatic.record.id,
      clock: FIXED_CLOCK,
    });
    const withdrawnRetry = await ingest({
      storeDir: testStore.storeDir,
      policy: autoPolicy(),
      event: automatic.record.event,
      clock: FIXED_CLOCK,
    });
    assert.equal(withdrawnRetry.outcome, "duplicate");
    assert.equal(
      withdrawnRetry.record.status,
      "retracted",
      "a retry cannot silently resurrect a withdrawal",
    );

    const otherProducer = await ingest({
      storeDir: testStore.storeDir,
      policy: autoPolicy(),
      event: event({
        providerEventId: "other-producer",
        producer: "bjslab:two",
        eventType: "work.milestone",
      }),
      clock: FIXED_CLOCK,
    });
    const otherType = await ingest({
      storeDir: testStore.storeDir,
      policy: autoPolicy(),
      event: event({
        providerEventId: "other-type",
        eventType: "deployment.succeeded",
      }),
      clock: FIXED_CLOCK,
    });
    assert.equal(otherProducer.record.status, "pending");
    assert.equal(otherType.record.status, "pending");

    const corrected = await ingest({
      storeDir: testStore.storeDir,
      policy: autoPolicy(),
      event: event({
        providerEventId: "trusted-next-move",
        eventType: "work.milestone",
        candidate: {
          ...event().candidate,
          summary: "A corrected public draft.",
        },
      }),
      clock: FIXED_CLOCK,
    });
    assert.equal(corrected.outcome, "revised");
    assert.equal(
      corrected.record.status,
      "pending",
      "corrections always re-enter review",
    );

    const invalidAuto = autoPolicy();
    invalidAuto.autoPublish[0].eventKind = "agents";
    assert.throws(() => validatePolicy(invalidAuto), /durable event kinds/);
  } finally {
    await testStore.cleanup();
  }
});

test("presence is review-first, renews only through a trusted exact rule, and successor records suppress zombies", async () => {
  const testStore = await workspace();
  try {
    const first = await ingest({
      storeDir: testStore.storeDir,
      policy: presencePolicy(),
      event: presenceEvent(),
      clock: FIXED_CLOCK,
    });
    assert.equal(first.outcome, "queued");
    await approve({
      storeDir: testStore.storeDir,
      id: first.record.id,
      expectedRevision: 1,
      projection: first.record.event.candidate,
      clock: FIXED_CLOCK,
    });

    const autoNewSignal = await ingest({
      storeDir: testStore.storeDir,
      policy: presencePolicy(),
      event: presenceEvent({
        providerEventId: "another-public-now",
        replacementKey: "another-work",
      }),
      clock: FIXED_CLOCK,
    });
    assert.equal(autoNewSignal.outcome, "auto-approved");
    assert.equal(autoNewSignal.record.review.method, "auto");

    const renewed = await ingest({
      storeDir: testStore.storeDir,
      policy: presencePolicy(),
      event: presenceEvent({
        observedAt: "2026-09-20T12:02:00Z",
        expiresAt: "2026-09-20T12:06:00Z",
      }),
      clock: FIXED_CLOCK,
    });
    assert.equal(renewed.outcome, "renewed");
    assert.equal(renewed.record.status, "approved");
    assert.equal(renewed.record.event.expiresAt, "2026-09-20T12:06:00Z");

    const changedCopy = await ingest({
      storeDir: testStore.storeDir,
      policy: presencePolicy(),
      event: presenceEvent({
        observedAt: "2026-09-20T12:03:00Z",
        expiresAt: "2026-09-20T12:07:00Z",
        candidate: {
          ...presenceEvent().candidate,
          summary: "Changed public copy requires review.",
        },
      }),
      clock: FIXED_CLOCK,
    });
    assert.equal(changedCopy.outcome, "revised");
    assert.equal(changedCopy.record.status, "pending");

    const approvedChangedCopy = await approve({
      storeDir: testStore.storeDir,
      id: changedCopy.record.id,
      expectedRevision: 2,
      projection: changedCopy.record.event.candidate,
      clock: FIXED_CLOCK,
    });
    const runningSnapshot = buildPresenceSnapshot([approvedChangedCopy], {
      now: Date.parse("2026-09-20T12:04:00Z"),
      generatedAt: "2026-09-20T12:04:00Z",
    });
    assert.equal(runningSnapshot.signals.length, 1);

    const retractedSnapshot = buildPresenceSnapshot(
      [{ ...approvedChangedCopy, status: "retracted", revision: 3 }],
      {
        now: Date.parse("2026-09-20T12:04:00Z"),
        generatedAt: "2026-09-20T12:04:00Z",
      },
    );
    assert.deepEqual(retractedSnapshot.signals, []);

    const completed = {
      id: "activity_aaaaaaaaaaaaaaaa",
      revision: 1,
      status: "approved",
      event: {
        ...event({
          providerEventId: "undertext-completed",
          eventType: "work.milestone",
          observedAt: "2026-09-20T12:04:00Z",
        }),
        replacementKey: "undertext-work",
      },
      public: projection,
    };
    const completedSnapshot = buildPresenceSnapshot(
      [approvedChangedCopy, completed],
      {
        now: Date.parse("2026-09-20T12:04:30Z"),
        generatedAt: "2026-09-20T12:04:30Z",
      },
    );
    assert.deepEqual(completedSnapshot.signals, []);

    const failed = {
      ...approvedChangedCopy,
      id: "activity_bbbbbbbbbbbbbbbb",
      revision: 1,
      event: presenceEvent({
        providerEventId: "undertext-failed",
        eventType: "session.failed",
        observedAt: "2026-09-20T12:04:00Z",
        expiresAt: "2026-09-20T12:06:00Z",
      }),
      public: { ...approvedChangedCopy.public, title: "Undertext paused" },
    };
    const failedSnapshot = buildPresenceSnapshot(
      [approvedChangedCopy, failed],
      {
        now: Date.parse("2026-09-20T12:04:30Z"),
        generatedAt: "2026-09-20T12:04:30Z",
      },
    );
    assert.deepEqual(
      failedSnapshot.signals.map((signal) => signal.title),
      ["Undertext paused"],
    );

    const invalidPolicy = presencePolicy();
    invalidPolicy.autoPresence[0].eventKind = "milestone";
    assert.throws(() => validatePolicy(invalidPolicy), /status or agents/);
  } finally {
    await testStore.cleanup();
  }
});

test("static export is deterministic, omits runtime presence, derives date, and never serializes private candidates", () => {
  const records = [
    {
      id: "activity_a",
      status: "approved",
      event: event({ occurredAt: "2026-09-20T10:00:00Z" }),
      public: projection,
    },
    {
      id: "activity_b",
      status: "approved",
      event: event({
        providerEventId: "later-offset",
        occurredAt: "2026-09-20T10:30:00+01:00",
        observedAt: "2026-09-20T12:00:00Z",
      }),
      public: { ...projection, title: "Later instant" },
    },
    {
      id: "activity_presence",
      status: "approved",
      event: event({
        providerEventId: "presence",
        eventKind: "agents",
        mode: "presence",
        expiresAt: "2026-09-20T13:00:00Z",
      }),
      public: projection,
    },
  ];
  const exported = buildStaticExport(records, {
    generatedAt: "2026-09-20T13:00:00Z",
  });
  assert.deepEqual(
    exported.events.map((item) => item.id),
    ["activity_a", "activity_b"],
  );
  assert.equal(exported.events[0].date, "2026-09-20");
  assert.equal(exported.events[0].candidate, undefined);
  assert.doesNotMatch(
    JSON.stringify(exported),
    /bjslab:one|fixture-1|Untrusted candidate/,
  );
  assert.deepEqual(validatePublicExport(exported), exported);
  assert.throws(
    () =>
      validatePublicExport({
        ...exported,
        events: [
          ...exported.events,
          { ...exported.events[0], id: "activity_presence", kind: "agents" },
        ],
      }),
    /runtime-only/,
  );
  assert.throws(
    () =>
      validatePublicExport({
        ...exported,
        events: [{ ...exported.events[0], mode: "presence" }],
      }),
    /runtime presence fields/,
  );
  assert.throws(
    () =>
      validatePublicExport({
        ...exported,
        events: [{ ...exported.events[0], expiresAt: "2026-09-21T10:00:00Z" }],
      }),
    /runtime presence fields/,
  );
});

test("agent lifecycle boundary makes completed sessions durable milestones and other states expiring presence", () => {
  const completed = fromAgentSessionLifecycle(
    {
      id: "synthetic-session",
      action: "completed",
      occurredAt: "2026-09-20T12:00:00Z",
      title: "Completed a synthetic task",
      summary: "No prompt or logs are captured.",
      href: "https://example.test/session",
    },
    { observedAt: "2026-09-20T12:01:00Z" },
  );
  assert.deepEqual(
    { kind: completed.eventKind, mode: completed.mode },
    { kind: "milestone", mode: "event" },
  );
  const running = fromAgentSessionLifecycle(
    {
      id: "synthetic-session",
      action: "started",
      occurredAt: "2026-09-20T12:00:00Z",
      expiresAt: "2026-09-20T12:10:00Z",
      title: "Synthetic task running",
      summary: "Coarse lifecycle state only.",
      href: "https://example.test/session",
    },
    { observedAt: "2026-09-20T12:01:00Z" },
  );
  assert.deepEqual(
    { kind: running.eventKind, mode: running.mode },
    { kind: "status", mode: "presence" },
  );
});

test("GitHub adapter requires an explicit public repository flag and URLs cannot contain credentials", () => {
  const input = {
    action: "opened",
    repository: { full_name: "example/public-repo", private: false },
    pull_request: {
      number: 1,
      title: "Synthetic PR",
      created_at: "2026-09-20T12:00:00Z",
      html_url: "https://example.test/pr/1",
    },
  };
  assert.equal(
    fromGithubPullRequest(input, { observedAt: "2026-09-20T12:01:00Z" }).source,
    "github",
  );
  assert.throws(
    () =>
      fromGithubPullRequest({
        ...input,
        repository: { full_name: "example/public-repo" },
      }),
    /explicitly be false/,
  );
  assert.throws(
    () =>
      buildStaticExport([
        {
          id: "activity_secret_url",
          status: "approved",
          event: event(),
          public: {
            ...projection,
            href: "https://token:secret@example.test/private",
          },
        },
      ]),
    /URL credentials/,
  );
});

test("CLI ingests a fixture batch sequentially and carries a reviewed item through export and retraction", async () => {
  const testStore = await workspace();
  try {
    const policyFile = join(testStore.directory, "policy.json");
    const reviewFile = join(testStore.directory, "review.json");
    const exportFile = join(testStore.directory, "activity.public.json");
    const presenceFile = join(testStore.directory, "presence.public.json");
    const initialPolicyFile = join(testStore.directory, "initial-policy.json");
    const cliPolicy = policy();
    cliPolicy.sources.bjslab = {
      enabled: true,
      producers: ["bjslab:milestone-producer", "bjslab:second-producer"],
      review: "required",
    };
    await writeFile(policyFile, JSON.stringify(cliPolicy));
    await writeFile(reviewFile, JSON.stringify(projection));
    const cli = (args) =>
      execFile(process.execPath, ["scripts/activity/index.mjs", ...args], {
        cwd: repositoryRoot,
      });
    await cli(["policy-init", "--out", initialPolicyFile]);
    await assert.rejects(
      cli(["policy-init", "--out", initialPolicyFile]),
      /EEXIST/,
    );
    const imported = JSON.parse(
      (
        await cli([
          "import",
          "--store",
          testStore.storeDir,
          "--policy",
          policyFile,
          "--file",
          "scripts/tests/fixtures/activity-engine/events.json",
        ])
      ).stdout,
    );
    assert.equal(imported.length, 2);
    const listed = JSON.parse(
      (
        await cli([
          "list",
          "--store",
          testStore.storeDir,
          "--status",
          "pending",
        ])
      ).stdout,
    );
    assert.equal(listed.length, 2);
    await cli([
      "approve",
      "--store",
      testStore.storeDir,
      "--id",
      listed[0].id,
      "--revision",
      String(listed[0].revision),
      "--projection",
      reviewFile,
    ]);
    await assert.rejects(
      cli(["list", "--store", testStore.storeDir, "--sttaus", "pending"]),
      /not valid for list/,
    );
    const firstExport = JSON.parse(
      (
        await cli([
          "export",
          "--store",
          testStore.storeDir,
          "--out",
          exportFile,
        ])
      ).stdout,
    );
    assert.equal(firstExport.events.length, 1);
    const presenceExport = JSON.parse(
      (
        await cli([
          "export-presence",
          "--store",
          testStore.storeDir,
          "--out",
          presenceFile,
        ])
      ).stdout,
    );
    assert.deepEqual(presenceExport.signals, []);
    assert.equal((await stat(exportFile)).mode & 0o777, 0o644);
    await cli(["retract", "--store", testStore.storeDir, "--id", listed[0].id]);
    const secondExport = JSON.parse(
      (
        await cli([
          "export",
          "--store",
          testStore.storeDir,
          "--out",
          exportFile,
        ])
      ).stdout,
    );
    assert.deepEqual(secondExport.events, []);
  } finally {
    await testStore.cleanup();
  }
});
