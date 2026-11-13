import assert from "node:assert/strict";
import test from "node:test";
import { parse, problems } from "./lib/content-config.mjs";

// The blocks an experiment's or a project's page is told with (issue #133):
// what src/content may say about each, checked against the schemas the
// build itself validates with. A page's `blocks` are named; its body places
// them (blocks-rules.test.mjs).

const experiment = (blocks) => ({
  title: "A fixture experiment",
  summary: "An experiment that exists only in this test.",
  place: "bench",
  blocks,
});
/** What the build would say about one block, written as `it`. */
const said = (block) => problems("lab", experiment({ it: block }));
const accepted = (block) => assert.deepEqual(said(block), []);
const UNSAID = "Say what it shows: give it alt text or a caption.";

const picture = { src: "/images/lab/beating-shapes.png", alt: "Shapes" };

test("a gallery is pictures, each with its own words", () => {
  accepted({ type: "gallery", items: [picture] });
  accepted({
    type: "gallery",
    items: [
      { ...picture, caption: "The first try.", width: 1200, height: 800 },
      { src: "https://example.com/second.png", caption: "The second." },
    ],
  });
  assert.deepEqual(said({ type: "gallery", items: [] }), [
    "blocks.it.items: A gallery shows at least one picture.",
  ]);
  assert.deepEqual(said({ type: "gallery" }), ["blocks.it.items: Required"]);
  assert.deepEqual(
    said({ type: "gallery", items: [picture], columns: 3 }),
    ["blocks.it: Unrecognized key(s) in object: 'columns'"],
  );
  assert.deepEqual(
    said({ type: "gallery", items: [{ ...picture, credit: "Someone" }] }),
    ["blocks.it.items.0: Unrecognized key(s) in object: 'credit'"],
  );
  assert.deepEqual(
    said({ type: "gallery", items: [{ ...picture, src: "shapes.png" }] }),
    [
      "blocks.it.items.0.src: A file is a site path (/images/…) or an https:// address.",
    ],
  );
});

test("a compare is a before and an after", () => {
  const after = { src: "/images/lab/motion-path-graph.svg", alt: "A lotus" };
  accepted({ type: "compare", before: picture, after });
  accepted({
    type: "compare",
    before: { ...picture, label: "2019" },
    after: { ...after, label: "2024" },
    caption: "Five years apart.",
  });
  assert.deepEqual(said({ type: "compare", before: picture }), [
    "blocks.it.after: Required",
  ]);
  assert.deepEqual(
    said({ type: "compare", before: picture, after, slider: true }),
    ["blocks.it: Unrecognized key(s) in object: 'slider'"],
  );
});

test("an embed is a Pen, a demo or a deck, and where it lives", () => {
  const pen = {
    type: "embed",
    kind: "pen",
    src: "https://codepen.io/beejsbj/pen/abXZWLQ",
    alt: "A lotus drawing itself",
  };
  accepted(pen);
  accepted({ ...pen, kind: "demo", src: "https://example.com/demo" });
  accepted({
    ...pen,
    kind: "deck",
    src: "/prism/fixtures/deck.html",
    poster: "/images/lab/motion-path-graph.svg",
    caption: "The talk's slides.",
    ratio: "16/9",
  });
  assert.match(said({ ...pen, kind: "tweet" }).join("\n"), /^blocks\.it\.kind: /);
  assert.deepEqual(said({ ...pen, src: "https://example.com/not-a-pen" }), [
    "blocks.it.src: A Pen is named by its address: https://codepen.io/<user>/pen/<id>.",
  ]);
  assert.deepEqual(said({ ...pen, src: "http://example.com/demo" }), [
    "blocks.it.src: A file is a site path (/images/…) or an https:// address.",
  ]);
  assert.deepEqual(said({ ...pen, ratio: "wide" }), [
    'blocks.it.ratio: A ratio is written width/height: "16/9".',
  ]);
  assert.deepEqual(said({ ...pen, autoload: true }), [
    "blocks.it: Unrecognized key(s) in object: 'autoload'",
  ]);
});

test("a model is a .glb, .spz, .sog or .splat file", () => {
  const model = {
    type: "model",
    src: "/prism/fixtures/cube.glb",
    alt: "A cube",
  };
  accepted(model);
  for (const file of ["room.spz", "room.sog", "room.splat", "room.GLB"])
    accepted({ ...model, src: `https://example.com/${file}` });
  accepted({
    ...model,
    poster: "/images/lab/beating-shapes.png",
    caption: "The room, scanned.",
    ratio: "4/3",
    rotation: [180, 0, 0],
  });
  assert.deepEqual(said({ ...model, src: "/models/room.ply" }), [
    "blocks.it.src: A model is a .glb, .spz, .sog or .splat file.",
  ]);
  assert.match(
    said({ ...model, rotation: [180, 0] }).join("\n"),
    /^blocks\.it\.rotation: /,
  );
  assert.deepEqual(said({ ...model, autorotate: true }), [
    "blocks.it: Unrecognized key(s) in object: 'autorotate'",
  ]);
});

test("an embed's or a model's poster is one of the site's own files", () => {
  const OWN =
    "A poster is one of the site's own files (/images/…): nothing is asked of another site before a click.";
  const poster = "https://example.com/poster.png";
  assert.deepEqual(
    said({
      type: "embed",
      kind: "demo",
      src: "https://example.com/demo",
      alt: "A demo",
      poster,
    }),
    [`blocks.it.poster: ${OWN}`],
  );
  assert.deepEqual(
    said({ type: "model", src: "/models/room.glb", alt: "A room", poster }),
    [`blocks.it.poster: ${OWN}`],
  );
  assert.deepEqual(
    said({ type: "film", src: "/films/loop.webm", alt: "A loop", poster }),
    [`blocks.it.poster: ${OWN}`],
  );
});

test("a code excerpt says its language", () => {
  const code = { type: "code", language: "css", code: ".a { color: red }" };
  accepted(code);
  accepted({ ...code, caption: "The whole trick." });
  assert.deepEqual(said({ type: "code", code: code.code }), [
    "blocks.it.language: Required",
  ]);
  assert.deepEqual(said({ ...code, code: "" }), [
    "blocks.it.code: A code excerpt is not empty.",
  ]);
  assert.deepEqual(said({ ...code, highlight: [2] }), [
    "blocks.it: Unrecognized key(s) in object: 'highlight'",
  ]);
});

test("a quote is words and where they were said", () => {
  const quote = {
    type: "quote",
    text: "I wanted it to feel like a room, not a list.",
    source: "A note to myself",
  };
  accepted(quote);
  for (const date of ["2024", "2024-03", "2024-03-09", 2024])
    accepted({ ...quote, date });
  assert.deepEqual(said({ type: "quote", text: quote.text }), [
    "blocks.it.source: Required",
  ]);
  assert.match(
    said({ ...quote, date: "last spring" }).join("\n"),
    /^blocks\.it\.date: /,
  );
  assert.deepEqual(said({ ...quote, author: "Someone else" }), [
    "blocks.it: Unrecognized key(s) in object: 'author'",
  ]);
});

test("steps are numbered by their order, each with words and maybe a picture", () => {
  accepted({ type: "steps", items: [{ text: "Measure the path." }] });
  accepted({
    type: "steps",
    items: [
      { title: "Measure", text: "Ask the path how long it is." },
      { text: "Draw it over time.", image: picture },
    ],
  });
  assert.deepEqual(said({ type: "steps", items: [] }), [
    "blocks.it.items: Steps have at least one step.",
  ]);
  assert.deepEqual(said({ type: "steps", items: [{ title: "Measure" }] }), [
    "blocks.it.items.0.text: Required",
  ]);
  assert.deepEqual(
    said({ type: "steps", items: [{ text: "One.", number: 4 }] }),
    ["blocks.it.items.0: Unrecognized key(s) in object: 'number'"],
  );
});

test("a tree is written as an indented outline and handed over as nodes", () => {
  const tree = [
    "src/",
    "  content/",
    "    lab/  # one file to an experiment",
    "  pages/",
    "package.json",
  ].join("\n");
  const parsed = parse("lab", experiment({ it: { type: "tree", tree } }));
  assert.deepEqual(parsed.blocks.it, {
    type: "tree",
    tree: [
      {
        name: "src/",
        children: [
          {
            name: "content/",
            children: [{ name: "lab/", note: "one file to an experiment" }],
          },
          { name: "pages/" },
        ],
      },
      { name: "package.json" },
    ],
  });
  accepted({ type: "tree", tree, caption: "Where things live." });
  assert.deepEqual(said({ type: "tree", tree: "src/\n      deep.ts" }), [
    "blocks.it.tree: Line 2 is indented further than a child of the line above: two spaces to a level.",
  ]);
  assert.deepEqual(said({ type: "tree", tree: "src/\n   odd.ts" }), [
    "blocks.it.tree: Line 2 is indented by 3 spaces: two spaces to a level.",
  ]);
  assert.deepEqual(said({ type: "tree", tree: " \n" }), [
    "blocks.it.tree: A tree names at least one file or folder.",
  ]);
  assert.deepEqual(said({ type: "tree", tree, depth: 2 }), [
    "blocks.it: Unrecognized key(s) in object: 'depth'",
  ]);
});

test("an audio clip is a file and its words", () => {
  const audio = {
    type: "audio",
    src: "/prism/fixtures/tone.wav",
    caption: "The tone it plays.",
  };
  accepted(audio);
  assert.deepEqual(said({ type: "audio", caption: audio.caption }), [
    "blocks.it.src: Required",
  ]);
  assert.deepEqual(said({ ...audio, autoplay: true }), [
    "blocks.it: Unrecognized key(s) in object: 'autoplay'",
  ]);
});

test("a film is a short clip that may loop, with a poster", () => {
  const film = {
    type: "film",
    src: "/prism/fixtures/film.webm",
    alt: "Lines drawing themselves",
  };
  assert.equal(parse("lab", experiment({ it: film })).blocks.it.loop, false);
  accepted({
    ...film,
    loop: true,
    poster: "/images/lab/motion-path-graph.svg",
    caption: "It plays on a loop.",
  });
  assert.match(said({ ...film, loop: "yes" }).join("\n"), /^blocks\.it\.loop: /);
  assert.deepEqual(said({ ...film, controls: false }), [
    "blocks.it: Unrecognized key(s) in object: 'controls'",
  ]);
});

test("every piece of media says what it shows: alt text or a caption", () => {
  const src = "/images/lab/beating-shapes.png";
  assert.deepEqual(said({ type: "gallery", items: [{ src }] }), [
    `blocks.it.items.0.alt: ${UNSAID}`,
  ]);
  assert.deepEqual(
    said({ type: "compare", before: { src }, after: { src, alt: "After" } }),
    [`blocks.it.before.alt: ${UNSAID}`],
  );
  assert.deepEqual(
    said({
      type: "steps",
      items: [{ text: "Look at it.", image: { src, alt: " " } }],
    }),
    [`blocks.it.items.0.image.alt: ${UNSAID}`],
  );
  for (const wordless of [
    { type: "embed", kind: "demo", src: "https://example.com/demo" },
    { type: "model", src: "/models/room.splat" },
    { type: "audio", src: "/prism/fixtures/tone.wav" },
    { type: "film", src: "/prism/fixtures/film.webm" },
  ]) {
    assert.deepEqual(said(wordless), [`blocks.it.alt: ${UNSAID}`]);
    accepted({ ...wordless, alt: "What it shows" });
    accepted({ ...wordless, caption: "What it shows." });
  }
});

test("a block is named in lower-case words, and is of a kind the site knows", () => {
  const block = { type: "gallery", items: [picture] };
  assert.deepEqual(
    problems("lab", experiment({ "first-drawings": block, take2: block })),
    [],
  );
  assert.deepEqual(problems("lab", experiment({ "First Drawings": block })), [
    'blocks.First Drawings: A block is named in lower-case letters, digits and hyphens, starting with a letter: "first-drawings".',
  ]);
  assert.match(
    said({ type: "hologram", src: "/models/room.glb" }).join("\n"),
    /^blocks\.it\.type: Invalid discriminator value/,
  );
  // Prose is the body, not a block of its own.
  assert.match(
    said({ type: "text", html: "<p>Words.</p>" }).join("\n"),
    /^blocks\.it\.type: Invalid discriminator value/,
  );
});

test("a project's page is told with the same blocks, and a page may have none", () => {
  const project = (over = {}) => ({
    title: "A fixture project",
    summary: "A project that exists only in this test.",
    year: 2026,
    dateLabel: "Jan 2026",
    role: "Design & development",
    location: "Somewhere",
    tools: [],
    status: "selected",
    cover: "",
    ...over,
  });
  assert.deepEqual(parse("projects", project()).blocks, {});
  assert.deepEqual(parse("lab", experiment(undefined)).blocks, {});
  assert.deepEqual(
    problems(
      "projects",
      project({ blocks: { shots: { type: "gallery", items: [picture] } } }),
    ),
    [],
  );
  assert.deepEqual(
    problems(
      "projects",
      project({ blocks: { shots: { type: "gallery", items: [{}] } } }),
    ),
    ["blocks.shots.items.0.src: Required"],
  );
});
