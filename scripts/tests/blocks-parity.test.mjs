import assert from "node:assert/strict";
import test from "node:test";
import { BLOCK_TYPES } from "../../src/lib/blocks.ts";
import { BLOCK_GAPS, expectedParts, isGap } from "../../src/prism/parity.ts";
import { PARTS, blockRef } from "../../src/prism/parts.ts";

// A page's blocks in the parity contract (issue #133): each block is a
// part every lens owes, and a lens that does not draw it yet says so, with
// the ticket of the design pass that will.

const BLOCK_PARTS = BLOCK_TYPES.map((type) => `block.${type}`);
const picture = { src: "/images/lab/beating-shapes.png", alt: "Shapes" };
const blocks = [
  { type: "text", html: "<p>How it began.</p>" },
  {
    type: "gallery",
    name: "drawings",
    items: [{ ...picture, caption: "The **first** try." }, picture],
  },
  {
    type: "compare",
    name: "redrawn",
    before: picture,
    after: { ...picture, caption: "Drawn again." },
    caption: "A month apart.",
  },
  {
    type: "embed",
    name: "the-pen",
    kind: "pen",
    src: "https://codepen.io/beejsbj/pen/abXZWLQ",
    frame: "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
    alt: "A lotus drawing itself",
  },
  {
    type: "model",
    name: "room",
    src: "/models/room.spz",
    format: "spz",
    caption: "The room, scanned.",
  },
  {
    type: "code",
    name: "the-trick",
    language: "js",
    code: "\nconst length = path.getTotalLength();\npath.style.strokeDasharray = length;\n",
    caption: "The whole trick.",
  },
  {
    type: "quote",
    name: "in-my-words",
    text: "I wanted the line to look like it was **being drawn**, not revealed, and it took a week to get there.",
    source: "A note to myself",
  },
  {
    type: "steps",
    name: "how",
    items: [{ title: "Measure", text: "Ask each path [how long](/x) it is." }],
  },
  {
    type: "tree",
    name: "files",
    tree: [{ name: "lotus/", children: [{ name: "draw.js", note: "draws" }] }],
  },
  { type: "audio", name: "the-tone", src: "/a.wav", caption: "The tone." },
  { type: "film", name: "the-loop", src: "/a.webm", alt: "A loop", loop: true },
  // As a later site might send it.
  { type: "hologram", name: "from-later", caption: "Not a block yet." },
];
const entry = (over) => ({
  slug: "lotus",
  title: "Lotus",
  summary: "A drawing.",
  links: [],
  html: "<p>How it began.</p>",
  blocks,
  ...over,
});
const content = {
  lab: [entry({ detail: "/lab/lotus", hasPage: true, place: "bench" })],
  projects: [entry({ href: "/projects/lotus", tools: [] })],
  labbook: [],
};
const owed = (kind, path) =>
  expectedParts({ kind, path, slug: "lotus" }, content).filter((want) =>
    want.part.startsWith("block."),
  );

test("every block a page may name is a part of its own", () => {
  for (const part of BLOCK_PARTS)
    assert.ok(PARTS.includes(part), `${part} is a part`);
  assert.deepEqual(
    PARTS.filter((part) => part.startsWith("block.")).sort(),
    [...BLOCK_PARTS].sort(),
  );
  assert.equal(blockRef("lotus", "drawings"), "lotus/drawings");
});

test("an experiment's page owes each of its blocks, with the words it must show", () => {
  assert.deepEqual(owed("lab-entry", "/lab/lotus"), [
    {
      part: "block.gallery",
      ref: "lotus/drawings",
      texts: ["The first try."],
    },
    {
      part: "block.compare",
      ref: "lotus/redrawn",
      texts: ["Drawn again.", "A month apart."],
    },
    // Alt text is for whoever cannot see it: a lens need not print it.
    { part: "block.embed", ref: "lotus/the-pen", texts: [] },
    { part: "block.model", ref: "lotus/room", texts: ["The room, scanned."] },
    {
      part: "block.code",
      ref: "lotus/the-trick",
      texts: ["const length = path.getTotalLength();", "The whole trick."],
    },
    {
      part: "block.quote",
      ref: "lotus/in-my-words",
      texts: [
        "I wanted the line to look like it was being drawn, not revea",
        "A note to myself",
      ],
    },
    {
      part: "block.steps",
      ref: "lotus/how",
      texts: ["Measure", "Ask each path how long it is."],
    },
    { part: "block.tree", ref: "lotus/files", texts: ["lotus/", "draw.js"] },
    { part: "block.audio", ref: "lotus/the-tone", texts: ["The tone."] },
    { part: "block.film", ref: "lotus/the-loop", texts: [] },
    // The prose is the entry's body, as before, and a kind of block the
    // contract has not heard of is owed by no lens.
  ]);
});

test("a project's page owes the same blocks, and a page with none owes none", () => {
  assert.deepEqual(
    owed("project", "/projects/lotus"),
    owed("lab-entry", "/lab/lotus"),
  );
  const plain = {
    ...content,
    lab: [{ ...content.lab[0], blocks: [blocks[0]] }],
  };
  assert.deepEqual(
    expectedParts({ kind: "lab-entry", path: "/lab/lotus", slug: "lotus" }, plain)
      .map((want) => want.part),
    ["lab.title", "lab.summary", "lab.body"],
  );
});

test("Daylight and Calling Card draw every block; each other lens records the gap and its design pass", () => {
  const TICKETS = {
    "cut-paper": "#130",
    "back-page": "#131",
    hion: "#132",
  };
  assert.deepEqual(Object.keys(BLOCK_GAPS).sort(), Object.keys(TICKETS).sort());
  for (const [lens, ticket] of Object.entries(TICKETS)) {
    assert.ok(BLOCK_GAPS[lens].why.includes(ticket), `${lens} names ${ticket}`);
    for (const part of BLOCK_PARTS)
      for (const kind of ["lab-entry", "project"])
        assert.equal(isGap(lens, kind, part), true, `${lens} ${kind} ${part}`);
    // The gap is its blocks alone: the page's own parts are still owed.
    for (const part of ["lab.title", "lab.summary", "lab.body"])
      assert.equal(isGap(lens, "lab-entry", part), false, `${lens} ${part}`);
  }
  for (const lens of ["daylight", "calling-card"])
    for (const part of BLOCK_PARTS)
      for (const kind of ["lab-entry", "project"])
        assert.equal(isGap(lens, kind, part), false, `${lens} ${kind} ${part}`);
});

test("a kind of block the contract has not heard of is owed by no lens", () => {
  // What the shells do with one is a browser test (blocks.browser.mjs, on
  // the `lab-blocks` harness fixture): they show the prose and pass over it.
  const later = { type: "hologram", name: "from-later", caption: "Later." };
  const only = { ...content, lab: [{ ...content.lab[0], blocks: [later] }] };
  assert.deepEqual(
    expectedParts({ kind: "lab-entry", path: "/lab/lotus", slug: "lotus" }, only)
      .map((want) => want.part),
    ["lab.title", "lab.summary", "lab.body"],
  );
});
