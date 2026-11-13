import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { labPreview } from "../../src/lib/labbook.ts";
import { parse, problems } from "./lib/content-config.mjs";

// A link-out experiment that lives as a Pen, or as a demo it says may be
// framed, can be played where it sits in the Lab (issue #135): what src/content
// may say, and which entries that makes playable.

const experiment = (over = {}) => ({
  title: "A fixture experiment",
  summary: "An experiment that exists only in this test.",
  place: "shelf",
  ...over,
});
const pen = "https://codepen.io/beejsbj/pen/abXZWLQ";

test("an entry may say its demo can be played in place, and only a link out can say so", () => {
  assert.deepEqual(
    problems("lab", experiment({ href: "https://demo.example", embeddable: true })),
    [],
  );
  assert.equal(
    parse("lab", experiment({ href: "https://demo.example", embeddable: true }))
      .embeddable,
    true,
  );
  assert.deepEqual(problems("lab", experiment({ embeddable: true })), [
    "embeddable: A page can be framed only if the entry links out: give it an https:// href.",
  ]);
  assert.deepEqual(
    problems("lab", experiment({ href: "http://demo.example", embeddable: true })),
    [
      "embeddable: A page can be framed only if the entry links out: give it an https:// href.",
    ],
  );
  assert.match(
    problems("lab", experiment({ href: pen, embeddable: "yes" })).join("\n"),
    /^embeddable: /,
  );
  // The lab schema is strict: no other spelling of it is quietly dropped.
  assert.deepEqual(problems("lab", experiment({ href: pen, preview: pen })), [
    ": Unrecognized key(s) in object: 'preview'",
  ]);
});

test("a Pen can be played in place without saying so", () => {
  assert.equal(
    labPreview({ href: pen }),
    "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
  );
  for (const kind of ["full", "details", "embed", "fullpage"])
    assert.equal(
      labPreview({ href: `https://codepen.io/beejsbj/${kind}/abXZWLQ` }),
      "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
      kind,
    );
});

test("only a Pen is played unasked: a collection, a profile or a page of Pens is not a Pen", () => {
  for (const href of [
    "https://codepen.io/collection/PYdEaG",
    "https://codepen.io/beejsbj",
    "https://codepen.io/beejsbj/pens/popular",
    "https://codepen.io/beejsbj/pen/",
    "https://example.com/beejsbj/pen/abXZWLQ",
    "http://codepen.io/beejsbj/pen/abXZWLQ",
  ])
    assert.equal(labPreview({ href }), undefined, href);
  assert.equal(labPreview({}), undefined, "an entry with a page here");
});

test("another site is framed only when the entry says it may be", () => {
  const demo = "https://kitchen.example.dev/";
  assert.equal(labPreview({ href: demo }), undefined);
  assert.equal(labPreview({ href: demo, embeddable: false }), undefined);
  assert.equal(labPreview({ href: demo, embeddable: true }), demo);
  // Said of nothing, it frames nothing.
  assert.equal(labPreview({ embeddable: true }), undefined);
});

test("a Pen the entry says may not be framed is not", () => {
  assert.equal(labPreview({ href: pen, embeddable: false }), undefined);
  assert.equal(
    labPreview({ href: pen, embeddable: true }),
    "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
    "a Pen's frame is its embed whatever else is said",
  );
});

test("the Shelf's real Pens can be played in place, and the collection cannot", () => {
  const read = (slug) =>
    readFileSync(`src/content/lab/${slug}.md`, "utf8").match(
      /^href: "(.*)"$/m,
    )?.[1];
  for (const slug of [
    "13black-spade",
    "motion-path-graph",
    "game-of-life",
    "persona-5-stars",
    "beating-shapes",
    "design-trampoline-logo",
  ])
    assert.ok(labPreview({ href: read(slug) }), slug);
  assert.equal(labPreview({ href: read("css-notebook") }), undefined);
});
