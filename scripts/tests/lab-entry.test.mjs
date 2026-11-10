import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { experimentUpdates } from "../../src/lib/labbook.ts";
import { checkGraduations, graduatedProject } from "../../src/lib/rules.ts";

// An experiment's own page (issue #94): the rules behind what it shows
// besides its own words. The page itself is looked at in a browser, in
// lab-entry.browser.mjs.

const projects = [
  { slug: "dayshaper", title: "Dayshaper", href: "/projects/dayshaper" },
  { slug: "garden", title: "Garden", href: "/projects/garden" },
];

test("an experiment that graduated points at the project it became", () => {
  assert.deepEqual(
    graduatedProject({ graduatedTo: "garden" }, projects),
    projects[1],
  );
  assert.equal(graduatedProject({}, projects), undefined);
});

test("an experiment graduating into a project nobody wrote stops the build, naming both", () => {
  const lab = [
    { slug: "ring-sketches", graduatedTo: "dayshaper" },
    { slug: "beating-shapes" },
  ];
  assert.doesNotThrow(() => checkGraduations(lab, projects));
  assert.throws(
    () =>
      checkGraduations(
        [...lab, { slug: "lotus-studies", graduatedTo: "the-lotus-app" }],
        projects,
      ),
    {
      message:
        'No project has the slug "the-lotus-app" (graduatedTo in lab/lotus-studies.md).',
    },
  );
});

// Updates as the Labbook carries them (src/lib/labbook.ts).
const update = (id, date, relatedExperiment, over = {}) => ({
  id,
  date,
  kind: "lab",
  source: "codepen",
  ...(relatedExperiment ? { relatedExperiment } : {}),
  visibility: "open",
  title: `Update ${id}`,
  summary: "Something small happened, worth a note.",
  ...over,
});

test("an experiment's updates are the ones about it, newest first", () => {
  const { title, summary, ...wordless } = update(
    "kept-private",
    "2026-09-20",
    "lotus-studies",
  );
  const redacted = {
    ...wordless,
    visibility: "redacted",
    shape: { work: "code", bars: [4, 2, 3] },
  };
  const labbook = [
    update("first-petal", "2026-08-02", "lotus-studies"),
    update("a-beat", "2026-09-27", "beating-shapes"),
    update("replay-control", "2026-09-26", "lotus-studies"),
    update("site-news", "2026-09-25"),
    redacted,
    update("b-same-day", "2026-09-01", "lotus-studies"),
    update("a-same-day", "2026-09-01", "lotus-studies"),
  ];
  const before = structuredClone(labbook);

  assert.deepEqual(
    experimentUpdates(labbook, "lotus-studies").map((item) => item.id),
    // On one day, in id order, as the Labbook itself goes.
    [
      "replay-control",
      "kept-private",
      "a-same-day",
      "b-same-day",
      "first-petal",
    ],
  );
  // A redacted one stays what it is: its shape, for whoever draws it.
  assert.deepEqual(experimentUpdates(labbook, "lotus-studies")[1], redacted);
  assert.deepEqual(experimentUpdates(labbook, "motion-path-graph"), []);
  assert.deepEqual(labbook, before);
});

test("the fixture experiments' pages are built for the tests, and kept out of search", () => {
  for (const slug of ["fixture-sketch", "fixture-poster", "fixture-study"]) {
    const page = readFileSync(
      `dist/client/prism/fixtures/lab/${slug}/index.html`,
      "utf8",
    );
    assert.match(page, /noindex, follow/, `${slug} is not indexed`);
  }
  assert.doesNotMatch(
    readFileSync("dist/client/sitemap-0.xml", "utf8"),
    /\/prism\/fixtures\//,
  );
});
