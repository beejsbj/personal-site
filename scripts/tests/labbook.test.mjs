import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  labbookHref,
  labbookUpdate,
  streamUpdate,
  updateDateLabel,
} from "../../src/lib/labbook.ts";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

// The Labbook's rules (issue #14): how src/content's updates and headlines
// become the documents /prism/content.json hands to every lens.

const read = (path) => readFileSync(path, "utf8");

test("an update's date label is written the way the hand-written ones were", () => {
  assert.equal(updateDateLabel("2026-07-01"), "01 Jul 2026");
  assert.equal(updateDateLabel("2025-12-31"), "31 Dec 2025");

  const written = readdirSync("src/content/updates")
    .map((name) => read(`src/content/updates/${name}`))
    .map((entry) => ({
      date: entry.match(/^date: "(.+)"$/m)?.[1],
      dateLabel: entry.match(/^dateLabel: "(.+)"$/m)?.[1],
    }))
    .filter((entry) => entry.dateLabel);
  assert.ok(written.length >= 7, "the seeded updates carry date labels");
  for (const { date, dateLabel } of written)
    assert.equal(updateDateLabel(date), dateLabel);
});

// Updates as the schema hands them over (src/content.config.ts).
const open = (over = {}) => ({
  kind: "lab",
  source: "codepen",
  visibility: "open",
  date: "2026-09-26",
  title: "A lotus, one line at a time",
  summary: "The path study has a replay control now.",
  ...over,
});
const redacted = (over = {}) => ({
  kind: "project",
  source: "bjslab",
  visibility: "redacted",
  date: "2026-09-27",
  shape: { work: "code", bars: [4, 2, 3] },
  ...over,
});

test("the Labbook carries an open update's words, and nothing the site keeps to itself", () => {
  const artifact = {
    kind: "pen",
    src: "https://codepen.io/beejsbj/pen/abXZWLQ",
    alt: "A lotus drawing itself",
  };
  assert.deepEqual(labbookUpdate("lotus-replay", open()), {
    id: "lotus-replay",
    date: "2026-09-26",
    kind: "lab",
    source: "codepen",
    visibility: "open",
    title: "A lotus, one line at a time",
    summary: "The path study has a replay control now.",
  });
  assert.deepEqual(
    labbookUpdate(
      "lotus-replay",
      open({
        dateLabel: "Late September",
        href: "https://codepen.io/beejsbj/pen/abXZWLQ",
        linkLabel: "Open the Pen",
        artifact,
        relatedProject: "garden",
        relatedExperiment: "motion-path-graph",
        evidence: {
          url: "https://codepen.io/beejsbj/pen/abXZWLQ",
          observedAt: "2026-09-26T08:00:00Z",
        },
        expiresAt: "2027-01-01T00:00:00Z",
      }),
    ),
    {
      id: "lotus-replay",
      date: "2026-09-26",
      kind: "lab",
      source: "codepen",
      relatedProject: "garden",
      relatedExperiment: "motion-path-graph",
      visibility: "open",
      title: "A lotus, one line at a time",
      summary: "The path study has a replay control now.",
      href: "https://codepen.io/beejsbj/pen/abXZWLQ",
      linkLabel: "Open the Pen",
      artifact,
    },
  );
});

test("the Labbook carries a redacted update's shape and never its words", () => {
  const shown = {
    id: "something-private",
    date: "2026-09-27",
    kind: "project",
    source: "bjslab",
    relatedExperiment: "cockpit",
    visibility: "redacted",
    shape: { work: "code", bars: [4, 2, 3] },
  };
  assert.deepEqual(
    labbookUpdate(
      "something-private",
      redacted({ relatedExperiment: "cockpit" }),
    ),
    shown,
  );
  // The schema refuses words on a redacted update. Should some reach the
  // gate anyway, they stop here.
  assert.deepEqual(
    labbookUpdate(
      "something-private",
      redacted({
        relatedExperiment: "cockpit",
        title: "The hidden thing",
        summary: "What it was.",
        href: "https://example.com/the-hidden-thing",
        linkLabel: "See the hidden thing",
        dateLabel: "The day of the hidden thing",
        artifact: { kind: "image", src: "/images/hidden.png", alt: "Hidden" },
      }),
    ),
    shown,
  );
});

test("the home stream shows a fully written update exactly as written", () => {
  const written = open({
    dateLabel: "Late September",
    href: "https://codepen.io/beejsbj/pen/abXZWLQ",
    linkLabel: "Open the Pen",
  });
  assert.deepEqual(streamUpdate("lotus-replay", written), written);
});

test("the home stream fills in what an open update left unsaid", () => {
  assert.equal(labbookHref("lotus-replay"), "/lab#u-lotus-replay");
  assert.deepEqual(streamUpdate("lotus-replay", open()), {
    ...open(),
    dateLabel: "26 Sep 2026",
    href: "/lab#u-lotus-replay",
    linkLabel: "A lotus, one line at a time",
  });
});

test("the home stream has no redacted updates", () => {
  assert.equal(streamUpdate("something-private", redacted()), undefined);
});

test("content.json carries the Labbook and where each experiment sits", async () => {
  const fixture = await serveRuntimeFixture();
  try {
    const data = await (await fixture.fetch("/prism/content.json")).json();

    assert.deepEqual(
      data.labbook.find((update) => update.id === "dayshaper"),
      {
        id: "dayshaper",
        date: "2026-09-26",
        kind: "project",
        source: "site",
        relatedProject: "dayshaper",
        visibility: "open",
        title: "Dayshaper is available",
        summary:
          "A day planner built around a 24-hour ring, with movable plans, a changing sky, and shareable days.",
        href: "/projects/dayshaper",
        linkLabel: "Read the project",
      },
    );
    // Every seeded update is open, so the Labbook and the home stream hold
    // the same updates in the same order: newest first.
    assert.deepEqual(
      data.labbook.map((update) => update.id),
      data.updates.map((update) => update.id),
    );
    assert.deepEqual(
      data.labbook.map((update) => update.date),
      data.labbook
        .map((update) => update.date)
        .sort()
        .reverse(),
    );
    assert.ok(data.labbook.length >= 7, "the seeded updates are all here");

    assert.deepEqual(
      data.lab.map((entry) => [entry.slug, entry.place]),
      [
        ["motion-path-graph", "shelf"],
        ["beating-shapes", "shelf"],
      ],
    );

    // What the lenses read today is all still there.
    const update = data.updates.find((item) => item.id === "dayshaper");
    assert.equal(update.dateLabel, "26 Sep 2026");
    assert.equal(update.href, "/projects/dayshaper");
    assert.equal(update.linkLabel, "Read the project");
    assert.equal(update.kindLabel, "Project");
    assert.equal(update.sourceLabel, "This site");
    const lotus = data.lab.find((entry) => entry.slug === "motion-path-graph");
    assert.equal(lotus.type, "SVG + motion");
    assert.equal(lotus.sourceEra, "CodePen");
  } finally {
    await fixture.close();
  }
});
