import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { collections, parse, problems } from "./lib/content-config.mjs";

// The Lab's data contract (issue #14): what src/content may say about an
// experiment and an update, checked against the schemas the build itself
// validates with.

const experiment = (over = {}) => ({
  title: "A fixture experiment",
  summary: "An experiment that exists only in this test.",
  place: "bench",
  ...over,
});

test("an experiment that still says its type or era is refused, by name", () => {
  assert.deepEqual(problems("lab", experiment()), []);
  assert.deepEqual(problems("lab", experiment({ type: "SVG + motion" })), [
    ": Unrecognized key(s) in object: 'type'",
  ]);
  assert.deepEqual(problems("lab", experiment({ sourceEra: "CodePen" })), [
    ": Unrecognized key(s) in object: 'sourceEra'",
  ]);
  // Even said emptily, the way the old default left them.
  assert.deepEqual(problems("lab", experiment({ type: "", sourceEra: "" })), [
    ": Unrecognized key(s) in object: 'type', 'sourceEra'",
  ]);
  const parsed = parse("lab", experiment());
  assert.ok(!("type" in parsed) && !("sourceEra" in parsed));
});

test("an experiment says where it sits: on the Bench or on the Shelf", () => {
  assert.deepEqual(problems("lab", experiment({ place: "shelf" })), []);

  const { place, ...unplaced } = experiment();
  assert.deepEqual(problems("lab", unplaced), ["place: Required"]);
  assert.match(
    problems("lab", experiment({ place: "drawer" })).join("\n"),
    /^place: /,
  );
});

test("an experiment may graduate into a project, and one may take pride of place", () => {
  const graduated = parse(
    "lab",
    experiment({ place: "shelf", graduatedTo: "dayshaper", featured: true }),
  );
  assert.equal(graduated.graduatedTo, "dayshaper");
  assert.equal(graduated.featured, true);

  const plain = parse("lab", experiment());
  assert.equal(plain.graduatedTo, undefined);
  assert.equal(plain.featured, undefined);
});

const update = (over = {}) => ({
  title: "A fixture update",
  date: "2026-09-26",
  summary: "Something small happened, worth a note.",
  ...over,
});

test("an update is open unless it says otherwise", () => {
  const asWrittenBefore = update({
    dateLabel: "26 Sep 2026",
    href: "/projects/dayshaper",
    linkLabel: "Read the project",
  });
  assert.equal(parse("updates", asWrittenBefore).visibility, "open");
});

test("an update needs no link and no date label", () => {
  assert.deepEqual(problems("updates", update()), []);
});

test("an update may come from CodePen, and the site has a name for that", () => {
  assert.deepEqual(problems("updates", update({ source: "codepen" })), []);
  const site = JSON.parse(readFileSync("src/content/site/config.json", "utf8"));
  assert.equal(site.updateSources.codepen, "CodePen");
});

test("an open update may belong to an experiment and carry an artifact", () => {
  const artifact = {
    kind: "pen",
    src: "https://codepen.io/beejsbj/pen/abXZWLQ",
    alt: "A lotus drawing itself one line at a time",
    poster: "/images/lab/motion-path-graph.svg",
  };
  const parsed = parse(
    "updates",
    update({ relatedExperiment: "motion-path-graph", artifact }),
  );
  assert.equal(parsed.relatedExperiment, "motion-path-graph");
  assert.deepEqual(parsed.artifact, artifact);

  for (const kind of ["image", "video", "pen", "demo", "sound"])
    assert.deepEqual(
      problems("updates", update({ artifact: { ...artifact, kind } })),
      [],
    );
  assert.match(
    problems(
      "updates",
      update({ artifact: { ...artifact, kind: "hologram" } }),
    ).join("\n"),
    /^artifact\.kind: /,
  );
  const { alt, ...unlabelled } = artifact;
  assert.deepEqual(problems("updates", update({ artifact: unlabelled })), [
    "artifact.alt: Required",
  ]);
});

// A redacted update's shape: what kind of work it was, and its line, part
// by part. A string is a word shown as written; a number is a black bar of
// that length.
const shape = { work: "code", parts: ["Rewired", 4, 2, "the", 6] };
const redacted = (over = {}) => ({
  date: "2026-09-26",
  visibility: "redacted",
  shape,
  ...over,
});
const shaped = (parts) => redacted({ shape: { ...shape, parts } });
const REFUSED = "A redacted update shows its shape and nothing else.";

test("a redacted update with a title or a summary is rejected", () => {
  assert.deepEqual(
    problems(
      "updates",
      redacted({ title: "The hidden thing", summary: "What it was." }),
    ),
    [`title: ${REFUSED}`, `summary: ${REFUSED}`],
  );
});

test("an open update with a shape is rejected", () => {
  assert.deepEqual(problems("updates", update({ shape })), [
    "shape: Only a redacted update has a shape.",
  ]);
});

test("a redacted update is a date, a kind of work and a line of words and black bars", () => {
  assert.deepEqual(parse("updates", redacted({ source: "bjslab" })), {
    kind: "project",
    source: "bjslab",
    date: "2026-09-26",
    visibility: "redacted",
    shape,
  });
  for (const work of ["code", "design", "writing", "research", "other"])
    assert.deepEqual(
      problems("updates", redacted({ shape: { ...shape, work } })),
      [],
    );
  // Bars alone, with no word shown, is still a shape.
  assert.deepEqual(problems("updates", shaped([4, 2, 3])), []);
  // A word may be as long as 24 characters, and may carry its punctuation.
  assert.deepEqual(
    problems("updates", shaped(["a".repeat(24), 3, "(re-wired),"])),
    [],
  );

  const { shape: _, ...shapeless } = redacted();
  assert.deepEqual(problems("updates", shapeless), ["shape: Required"]);
  assert.match(
    problems(
      "updates",
      redacted({ shape: { ...shape, work: "plotting" } }),
    ).join("\n"),
    /^shape\.work: /,
  );
  // The bars it used to be written as are not its parts.
  assert.deepEqual(
    problems("updates", redacted({ shape: { work: "code", bars: [4, 2] } })),
    ["shape.parts: Required"],
  );
});

test("a redacted update always blacks something out: at least one bar, each with a length", () => {
  assert.deepEqual(problems("updates", shaped(["Rewired", "the"])), [
    "shape.parts: A redacted update blacks out at least one part.",
  ]);
  assert.deepEqual(problems("updates", shaped([])), [
    "shape.parts: A redacted update blacks out at least one part.",
  ]);
  for (const parts of [
    [4, 0],
    [4, -2],
    ["Rewired", 0],
  ])
    assert.match(
      problems("updates", shaped(parts)).join("\n"),
      /^shape\.parts\.1: /,
      `parts ${JSON.stringify(parts)} should be refused`,
    );
});

test("a word shown in a redacted update is one short word, never a sentence", () => {
  assert.deepEqual(problems("updates", shaped(["a".repeat(25), 4])), [
    "shape.parts.0: A word shown in a redacted update is at most 24 characters.",
  ]);
  for (const sentence of ["Rewired the", "Rewired\tthe", "line\nbreak", " the"])
    assert.deepEqual(
      problems("updates", shaped([4, sentence])),
      [
        "shape.parts.1: A word shown in a redacted update has no spaces: one word to a part.",
      ],
      JSON.stringify(sentence),
    );
  assert.deepEqual(problems("updates", shaped([4, ""])), [
    "shape.parts.1: A word shown in a redacted update is not empty.",
  ]);
  // Nothing but a word or a length is a part.
  assert.match(
    problems("updates", shaped([4, { word: "Rewired" }])).join("\n"),
    /^shape\.parts\.1: /,
  );
});

test("a redacted update carries nothing that could say what it hides", () => {
  const words = {
    href: "https://example.com/the-hidden-thing",
    linkLabel: "See the hidden thing",
    dateLabel: "The day of the hidden thing",
    artifact: { kind: "image", src: "/images/hidden.png", alt: "Hidden" },
    evidence: {
      url: "https://example.com/the-hidden-thing",
      observedAt: "2026-09-26T08:00:00Z",
    },
  };
  for (const [field, value] of Object.entries(words))
    assert.deepEqual(
      problems("updates", redacted({ [field]: value })),
      [`${field}: ${REFUSED}`],
      `a redacted update with ${field}`,
    );
});

test("there is one record, the update: no collection of headlines beside it", () => {
  assert.ok(!("headlines" in collections), "a headlines collection");
  assert.ok(
    !existsSync("src/content/headlines.json"),
    "src/content/headlines.json",
  );
  // And the site has no words for a strip of them.
  const site = JSON.parse(readFileSync("src/content/site/config.json", "utf8"));
  assert.ok(!("ticker" in site), "ticker in site/config.json");
  assert.ok(
    !("ticker" in parse("site", { ...site, ticker: { label: "News" } })),
    "the site carries a ticker's words",
  );
});

test("an update names its project by slug, and one that is no project's slug is refused", () => {
  assert.deepEqual(
    problems("updates", update({ relatedProject: "dayshaper" })),
    [],
  );
  assert.deepEqual(
    problems("updates", update({ relatedProject: "Conduit Market" })),
    ['relatedProject: "Conduit Market" is not the slug of any project.'],
  );
  assert.deepEqual(
    problems("updates", update({ relatedProject: "no-such-project" })),
    ['relatedProject: "no-such-project" is not the slug of any project.'],
  );
});
