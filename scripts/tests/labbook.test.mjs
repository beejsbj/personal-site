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

// The Labbook's rules (issue #14): how src/content's updates become the
// documents /prism/content.json hands to every lens.

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
  assert.deepEqual(streamUpdate(written), written);
});

test("an update need not open anywhere: the home stream gives it no link", () => {
  const shown = streamUpdate(open());
  // Only its date label is written for it.
  assert.deepEqual(shown, { ...open(), dateLabel: "26 Sep 2026" });
  assert.ok(!("href" in shown), "it is sent somewhere it did not say");
  assert.ok(!("linkLabel" in shown), "it has words for a way it has not got");
  // Words for a way are nothing without the way.
  assert.deepEqual(streamUpdate(open({ linkLabel: "Open the Pen" })), shown);
  // Its place in the Labbook is still where it is, for whoever points there.
  assert.equal(labbookHref("lotus-replay"), "/lab#u-lotus-replay");
});

test("an update with somewhere to go and no words for the way is linked by its title", () => {
  const href = "https://codepen.io/beejsbj/pen/abXZWLQ";
  assert.deepEqual(streamUpdate(open({ href })), {
    ...open(),
    dateLabel: "26 Sep 2026",
    href,
    linkLabel: "A lotus, one line at a time",
  });
});

test("the home stream has no redacted updates", () => {
  assert.equal(streamUpdate(redacted()), undefined);
});

test("content.json carries the Labbook and where each experiment sits, and no headlines", async () => {
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

    // One record, the update: no headlines beside the Labbook, and no
    // words for a strip of them.
    assert.ok(!("headlines" in data), "content.json has a headlines key");
    assert.ok(!("ticker" in data.site), "content.json names a ticker");

    assert.deepEqual(
      data.lab.map((entry) => [entry.slug, entry.place]),
      [
        ["cockpit", "bench"],
        ["strudel-tools", "bench"],
        ["clockwork-observatory", "bench"],
        ["films-from-code", "bench"],
        ["undertext", "bench"],
        ["house-making", "bench"],
        ["gaussian-splatting", "bench"],
        ["journal-engine", "bench"],
        ["meditejo", "bench"],
        ["path-under-strain", "bench"],
        ["resonance", "bench"],
        ["kitchen", "bench"],
        ["two-birds", "bench"],
        ["motion-path-graph", "shelf"],
        ["beating-shapes", "shelf"],
        ["persona-5-stars", "shelf"],
        ["game-of-life", "shelf"],
        ["13black-spade", "shelf"],
        ["design-trampoline-logo", "shelf"],
        ["css-notebook", "shelf"],
      ],
    );

    // What the lenses read today is all still there.
    const update = data.updates.find((item) => item.id === "dayshaper");
    assert.equal(update.dateLabel, "26 Sep 2026");
    assert.equal(update.href, "/projects/dayshaper");
    assert.equal(update.linkLabel, "Read the project");
    assert.equal(update.kindLabel, "Project");
    assert.equal(update.sourceLabel, "This site");

    // What every experiment used to say is gone, and so are its labels.
    for (const entry of data.lab)
      for (const field of ["type", "sourceEra"])
        assert.ok(!(field in entry), `${entry.slug} still has ${field}`);
    assert.deepEqual(Object.keys(data.pages.lab.detail.labels).sort(), [
      "graduated",
      "updates",
    ]);
  } finally {
    await fixture.close();
  }
});
