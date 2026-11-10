import assert from "node:assert/strict";
import test from "node:test";
import { parse, problems } from "./lib/content-config.mjs";

// The Lab's data contract (issue #14): what src/content may say about an
// experiment, an update and a headline, checked against the schemas the
// build itself validates with.

const experiment = (over = {}) => ({
  title: "A fixture experiment",
  summary: "An experiment that exists only in this test.",
  place: "bench",
  ...over,
});

test("an experiment needs no type or era of its own", () => {
  assert.deepEqual(problems("lab", experiment()), []);
  assert.deepEqual(
    problems(
      "lab",
      experiment({ type: "SVG + motion", sourceEra: "CodePen" }),
    ),
    [],
  );
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
