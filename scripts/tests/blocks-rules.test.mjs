import assert from "node:assert/strict";
import test from "node:test";
import {
  BLOCK_TYPES,
  modelFormat,
  placeBlocks,
  proseHtml,
  quoteDateLabel,
} from "../../src/lib/blocks.ts";
import { parse } from "./lib/content-config.mjs";

// How a page's body and its named blocks become the one ordered list
// /prism/content.json hands to every lens (issue #133). The blocks are
// taken from the schema, as the build hands them over.

const blocks = (written) =>
  parse("lab", {
    title: "A fixture experiment",
    summary: "An experiment that exists only in this test.",
    place: "bench",
    blocks: written,
  }).blocks;

const gallery = {
  type: "gallery",
  items: [{ src: "/images/lab/beating-shapes.png", alt: "Shapes" }],
};
const quote = { type: "quote", text: "It felt like a room.", source: "A note" };
const WHERE = "lab/fixture.md";

test("a body that places its blocks is cut where it places them, prose between", () => {
  const html = [
    "<h2>How it began</h2>",
    "<p>A paragraph before the pictures.</p>",
    "<p>::drawings</p>",
    "<p>A paragraph between.</p>",
    "<p>::in-my-words</p>",
    "<p>And one to end on.</p>",
  ].join("\n");
  const page = placeBlocks(
    html,
    // written in another order than the body places them
    blocks({ "in-my-words": quote, drawings: gallery }),
    WHERE,
  );
  assert.deepEqual(page, [
    {
      type: "text",
      html: "<h2>How it began</h2>\n<p>A paragraph before the pictures.</p>",
    },
    { ...gallery, name: "drawings" },
    { type: "text", html: "<p>A paragraph between.</p>" },
    { ...quote, name: "in-my-words" },
    { type: "text", html: "<p>And one to end on.</p>" },
  ]);
  // The prose alone is the body every lens showed before there were blocks.
  assert.equal(
    proseHtml(page),
    "<h2>How it began</h2>\n<p>A paragraph before the pictures.</p>\n<p>A paragraph between.</p>\n<p>And one to end on.</p>",
  );
});

test("a block the body does not place follows the prose, in the order written", () => {
  const page = placeBlocks(
    "<p>Only words.</p>\n<p>::second</p>",
    blocks({ first: gallery, second: quote, third: gallery }),
    WHERE,
  );
  assert.deepEqual(
    page.map((block) => block.name ?? block.type),
    ["text", "second", "first", "third"],
  );
});

test("a page with no blocks is its prose, and one with neither is empty", () => {
  const html = "<p>One paragraph.</p>";
  assert.deepEqual(placeBlocks(html, {}, WHERE), [{ type: "text", html }]);
  assert.equal(proseHtml(placeBlocks(html, {}, WHERE)), html);
  assert.deepEqual(placeBlocks("", {}, WHERE), []);
  assert.deepEqual(placeBlocks("", blocks({ only: quote }), WHERE), [
    { ...quote, name: "only" },
  ]);
});

test("placing a block that is not there, or one twice, stops the build, naming it", () => {
  assert.throws(
    () =>
      placeBlocks("<p>::drawings</p>", blocks({ sketches: gallery }), WHERE),
    {
      message:
        'No block is named "drawings" (placed by ::drawings in lab/fixture.md).',
    },
  );
  assert.throws(
    () =>
      placeBlocks(
        "<p>::drawings</p>\n<p>Words.</p>\n<p>::drawings</p>",
        blocks({ drawings: gallery }),
        WHERE,
      ),
    { message: 'The block "drawings" is placed twice in lab/fixture.md.' },
  );
  // Not an own property of the blocks: no block, whatever objects inherit.
  assert.throws(() => placeBlocks("<p>::constructor</p>", {}, WHERE), {
    message: /^No block is named "constructor"/,
  });
});

test("a block is placed on a line of its own: not in a list, a quote or a sentence", () => {
  for (const html of [
    "<ul>\n<li>\n<p>::drawings</p>\n</li>\n</ul>",
    "<blockquote>\n<p>::drawings</p>\n</blockquote>",
  ])
    assert.throws(
      () => placeBlocks(html, blocks({ drawings: gallery }), WHERE),
      {
        message:
          "::drawings is inside a list or a quote in lab/fixture.md: a block is placed by a line of its own.",
      },
    );
  // Among other words it is only words, and the block follows the prose.
  const html = "<p>The <code>::before</code> rule and ::drawings both.</p>";
  assert.deepEqual(placeBlocks(html, blocks({ drawings: gallery }), WHERE), [
    { type: "text", html },
    { ...gallery, name: "drawings" },
  ]);
});

test("an embed is handed over with what its frame loads, a model with its format", () => {
  const [pen, demo, room] = placeBlocks(
    "",
    blocks({
      pen: {
        type: "embed",
        kind: "pen",
        src: "https://codepen.io/beejsbj/pen/abXZWLQ",
        alt: "A lotus drawing itself",
      },
      demo: {
        type: "embed",
        kind: "demo",
        src: "https://example.com/demo",
        alt: "A demo",
      },
      room: {
        type: "model",
        src: "https://example.com/room.SPZ?v=2",
        alt: "A room",
      },
    }),
    WHERE,
  );
  assert.equal(
    pen.frame,
    "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
  );
  assert.equal(pen.src, "https://codepen.io/beejsbj/pen/abXZWLQ");
  assert.equal(demo.frame, "https://example.com/demo");
  assert.equal(room.format, "spz");
  assert.deepEqual(
    ["a.glb", "/m/a.spz", "a.sog#x", "a.splat?x=1", "a.ply", "glb"].map(
      modelFormat,
    ),
    ["glb", "spz", "sog", "splat", undefined, undefined],
  );
});

test("the blocks a page may name are the ten the ticket asks for", () => {
  assert.deepEqual([...BLOCK_TYPES].sort(), [
    "audio",
    "code",
    "compare",
    "embed",
    "film",
    "gallery",
    "model",
    "quote",
    "steps",
    "tree",
  ]);
});

test("a quote's date is said as far as it was given", () => {
  assert.equal(quoteDateLabel("2024"), "2024");
  assert.equal(quoteDateLabel("2024-03"), "Mar 2024");
  assert.equal(quoteDateLabel("2024-03-09"), "09 Mar 2024");
});
