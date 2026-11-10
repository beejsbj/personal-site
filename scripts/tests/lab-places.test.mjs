import assert from "node:assert/strict";
import test from "node:test";
import { labPlaces } from "../../src/lib/rules.ts";

// Where the Lab's experiments sit (issue #14): the Bench, then the Shelf,
// each in the one order every lens shows.

const experiment = (title, over = {}) => ({
  title,
  place: "bench",
  order: 100,
  ...over,
});
const titles = (group) => group.entries.map((entry) => entry.title);

test("the Lab is the Bench, then the Shelf, whatever order the entries arrive in", () => {
  const groups = labPlaces([
    experiment("Old sketch", { place: "shelf", order: 1 }),
    experiment("New thing", { order: 2 }),
    experiment("Older sketch", { place: "shelf", order: 3 }),
  ]);
  assert.deepEqual(
    groups.map((group) => group.place),
    ["bench", "shelf"],
  );
  assert.deepEqual(titles(groups[0]), ["New thing"]);
  assert.deepEqual(titles(groups[1]), ["Old sketch", "Older sketch"]);
});

test("the featured entry leads its place; the rest follow order, then title", () => {
  const [bench] = labPlaces([
    experiment("Second", { order: 2 }),
    experiment("Pride of place", { order: 9, featured: true }),
    experiment("B, unordered"),
    experiment("First", { order: 1 }),
    experiment("A, unordered"),
  ]);
  assert.deepEqual(titles(bench), [
    "Pride of place",
    "First",
    "Second",
    "A, unordered",
    "B, unordered",
  ]);

  const [shelf] = labPlaces([
    experiment("Quiet", { place: "shelf", order: 1 }),
    experiment("Kept in view", { place: "shelf", order: 2, featured: true }),
  ]);
  assert.deepEqual(titles(shelf), ["Kept in view", "Quiet"]);
});

test("a place nothing sits in is left out", () => {
  const onlyShelf = labPlaces([experiment("Quiet", { place: "shelf" })]);
  assert.deepEqual(
    onlyShelf.map((group) => group.place),
    ["shelf"],
  );
  const onlyBench = labPlaces([experiment("Busy")]);
  assert.deepEqual(
    onlyBench.map((group) => group.place),
    ["bench"],
  );
  assert.deepEqual(labPlaces([]), []);
});

test("an entry is handed back as it came", () => {
  const entry = experiment("With extras", { slug: "with-extras", cover: "" });
  assert.equal(labPlaces([entry])[0].entries[0], entry);
});
