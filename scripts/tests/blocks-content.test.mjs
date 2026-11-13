import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { proseHtml } from "../../src/lib/blocks.ts";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

// A page's blocks as the site hands them on (issue #133): in
// /prism/content.json for every lens, and in the pages Daylight builds.
// The experiment told with every block is a fixture written as a real one
// is (src/content/fixtures/fixture-blocks.md), so what is read here went
// through the schema, the markdown renderer and the placing of blocks.

const read = (path) => readFileSync(path, "utf8");
const FIXTURE = "dist/client/prism/fixtures/lab/fixture-blocks";

test("content.json carries every entry's page as an ordered list of typed blocks", async () => {
  const fixture = await serveRuntimeFixture();
  try {
    const data = await (await fixture.fetch("/prism/content.json")).json();
    assert.ok(data.projects.length && data.lab.length);
    for (const entry of [...data.projects, ...data.lab]) {
      assert.ok(Array.isArray(entry.blocks), `${entry.slug}: no blocks`);
      for (const block of entry.blocks)
        assert.equal(typeof block.type, "string", `${entry.slug}: a block has no type`);
      // The body a lens read before is still there: the prose of the page.
      assert.equal(entry.html, proseHtml(entry.blocks), `${entry.slug}: html`);
      if (entry.html.trim())
        assert.equal(entry.blocks[0].type, "text", `${entry.slug}: prose`);
    }
    // What the blocks say for themselves reaches every lens with them.
    const { blocks } = data.site;
    assert.deepEqual(Object.keys(blocks).sort(), ["compare", "embed", "model"]);
    for (const kind of ["pen", "demo", "deck"]) {
      assert.ok(blocks.embed.load[kind], `embed.load.${kind}`);
      assert.ok(blocks.embed.open[kind], `embed.open.${kind}`);
    }
    for (const key of ["load", "close", "note", "hint", "failed"])
      assert.ok(blocks.model[key], `model.${key}`);
  } finally {
    await fixture.close();
  }
});

test("an experiment written with every block is carried in the order its body places them", () => {
  const entry = JSON.parse(read(`${FIXTURE}.json`));
  assert.equal(entry.slug, "fixture-blocks");
  assert.deepEqual(
    entry.blocks.map((block) => block.name ?? block.type),
    [
      "text",
      "drawings",
      "redrawn",
      "text",
      "the-pen",
      "the-demo",
      "text",
      "cube",
      "cloud",
      "text",
      "in-my-words",
      "how",
      "the-trick",
      "files",
      "text",
      "the-tone",
      "the-loop",
      "text",
      // not placed by the body: after the prose
      "the-take",
    ],
  );
  const named = Object.fromEntries(
    entry.blocks.filter((block) => block.name).map((block) => [block.name, block]),
  );
  assert.deepEqual(
    Object.values(named).map((block) => block.type),
    [
      "gallery",
      "compare",
      "embed",
      "embed",
      "model",
      "model",
      "quote",
      "steps",
      "code",
      "tree",
      "audio",
      "film",
      "film",
    ],
  );
  // The prose between is rendered markdown, and no line that places a
  // block is left in it.
  const [opening] = entry.blocks;
  assert.match(opening.html, /^<p>This experiment exists to show every block/);
  assert.match(opening.html, /<h2[^>]*>How it began<\/h2>/);
  assert.doesNotMatch(entry.html, /::[a-z]/);
  assert.equal(entry.html, proseHtml(entry.blocks));

  assert.deepEqual(named.drawings.items[0], {
    src: "/images/lab/motion-path-graph.svg",
    alt: "A lotus drawn in orange and blue lines",
    caption: "The finished drawing, every path measured first.",
  });
  assert.equal(named.redrawn.after.label, "A month later");
  assert.deepEqual(named["the-pen"], {
    type: "embed",
    name: "the-pen",
    kind: "pen",
    src: "https://codepen.io/beejsbj/pen/abXZWLQ",
    frame: "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
    alt: "The lotus drawing itself, one line at a time",
    poster: "/images/lab/motion-path-graph.svg",
    caption: "The Pen itself. It draws when it loads.",
  });
  assert.equal(named["the-demo"].frame, "/prism/fixtures/demo.html");
  assert.equal(named.cube.format, "glb");
  assert.deepEqual(
    [named.cloud.format, named.cloud.rotation, named.cloud.ratio],
    ["splat", [180, 0, 0], "4/3"],
  );
  assert.match(named["the-trick"].code, /^const length = path\.getTotalLength\(\);\n/);
  assert.equal(named["the-trick"].language, "js");
  assert.equal(named["in-my-words"].date, "2026-08");
  assert.equal(named.how.items.length, 3);
  assert.deepEqual(named.files.tree, [
    {
      name: "lotus/",
      children: [
        { name: "index.html" },
        { name: "draw.js", note: "measures, then draws" },
        {
          name: "paths/",
          children: [{ name: "petals.svg" }, { name: "stem.svg" }],
        },
      ],
    },
    { name: "README.md" },
  ]);
  assert.equal(named["the-loop"].loop, true);
  assert.equal(named["the-take"].loop, false);
});

/** The scripts and stylesheets a built page asks for. */
const asks = (html) =>
  [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
    ([, url]) => url,
  );

test("a page with no block but prose is sent nothing for blocks", () => {
  const told = read(`${FIXTURE}/index.html`);
  const forBlocks = asks(told).filter((url) => /block/i.test(url));
  assert.ok(
    forBlocks.some((url) => url.endsWith(".css")),
    "the page told with blocks links their stylesheet",
  );
  // Every other page an entry has is prose alone today.
  const plain = [
    ...readdirSync("dist/client/lab", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `dist/client/lab/${entry.name}/index.html`),
    ...readdirSync("dist/client/projects", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `dist/client/projects/${entry.name}/index.html`),
    "dist/client/prism/fixtures/lab/fixture-study/index.html",
  ].filter(existsSync);
  assert.ok(plain.length > 10, "the built entry pages");
  const scripts = (html) => html.match(/<script\b[\s\S]*?<\/script>/g) ?? [];
  const live = scripts(told).filter((script) => /data-block-toggle/.test(script));
  for (const path of plain) {
    const html = read(path);
    assert.deepEqual(
      asks(html).filter((url) => forBlocks.includes(url)),
      [],
      `${path} asks for the blocks' stylesheet or script`,
    );
    assert.doesNotMatch(html, /data-block-toggle|block-stage/, path);
    assert.doesNotMatch(html, /class="block[ "]/, path);
  }
  // The live blocks' script is on the page that has them, inline or by
  // address, and is small: the viewer is not in it.
  const stage = [
    ...live,
    ...asks(told)
      .filter((url) => url.endsWith(".js"))
      .map((url) => read(join("dist/client", url)))
      .filter((source) => /data-block-toggle/.test(source)),
  ];
  assert.equal(stage.length, 1, "one script makes the blocks live");
  assert.ok(stage[0].length < 6000, `it is ${stage[0].length} bytes`);
  assert.doesNotMatch(stage[0], /WebGLRenderer|SplatMesh/);
});

test("an embed and a model are built as a poster and a button: no frame, no viewer", () => {
  const html = read(`${FIXTURE}/index.html`);
  assert.doesNotMatch(html, /<iframe\b/);
  assert.doesNotMatch(html, /<canvas\b/);
  // Nothing on the page is fetched from another site: the Pen's address is
  // only a link, and what its frame will load.
  const fetched = [
    ...html.matchAll(/<(?:img|script|source|video|audio|link|iframe)\b[^>]*?(?:src|href|poster)="(https?:[^"]+)"/g),
  ]
    .map(([, url]) => url)
    .filter((url) => !url.startsWith("https://burooj.dev/"));
  assert.deepEqual(fetched, []);
  assert.equal((html.match(/data-block-toggle/g) ?? []).length, 4);
});
