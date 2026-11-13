import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// What the Lab's own entries must say (issue #92), read straight from
// src/content/lab: the words a visitor is shown are real words, and every
// experiment on show leads somewhere.

const DIR = "src/content/lab";
const PLACEHOLDER = /lorem|ipsum|#todo|\btodo\b|\btbd\b|placeholder/i;

const entries = readdirSync(DIR)
  .filter((name) => name.endsWith(".md"))
  .map((name) => {
    const [, frontmatter = "", ...rest] = readFileSync(
      join(DIR, name),
      "utf8",
    ).split(/^---$/m);
    const field = (key) =>
      frontmatter
        .match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]
        ?.trim();
    return {
      slug: name.replace(/\.md$/, ""),
      frontmatter,
      body: rest.join("---").trim(),
      field,
    };
  });
const visible = entries.filter((entry) => entry.field("hidden") !== "true");

test("every experiment sits on the Bench or the Shelf and says what it is", () => {
  for (const entry of entries) {
    assert.match(
      entry.field("place") ?? "",
      /^(bench|shelf)$/,
      `${entry.slug}: no place`,
    );
    const summary = entry.field("summary") ?? "";
    assert.ok(summary, `${entry.slug}: no summary`);
    assert.doesNotMatch(
      summary,
      PLACEHOLDER,
      `${entry.slug}: placeholder text in its summary`,
    );
  }
});

test("no experiment on show carries placeholder text", () => {
  for (const entry of visible)
    assert.doesNotMatch(
      `${entry.frontmatter}\n${entry.body}`,
      PLACEHOLDER,
      `${entry.slug}: placeholder text`,
    );
});

test("every experiment on show links out or has a body to read", () => {
  for (const entry of visible)
    assert.ok(
      entry.field("href") || entry.body,
      `${entry.slug}: neither an href nor a body`,
    );
});

/** The site's own files an entry's front matter names: its cover, and the
 * `src` and `poster` of its media and of its blocks. */
const named = (frontmatter) =>
  [...frontmatter.matchAll(/^\s*(?:cover|src|poster):\s*"?(.*?)"?\s*$/gm)]
    .map(([, src]) => src)
    .filter((src) => src.startsWith("/"));

test("every picture an experiment names is a file in public/", () => {
  for (const entry of entries) {
    const cover = entry.field("cover");
    if (cover !== undefined)
      assert.match(cover, /^\//, `${entry.slug}: its cover is not a site path`);
    for (const src of named(entry.frontmatter))
      assert.ok(
        existsSync(join("public", src)),
        `${entry.slug}: ${src} is not in public/`,
      );
  }
});

test("every file a project on show or a fixture experiment names is in public/ too", () => {
  for (const dir of ["src/content/projects", "src/content/fixtures"]) {
    const files = readdirSync(dir).filter((name) => name.endsWith(".md"));
    assert.ok(files.length, `${dir} has entries`);
    for (const name of files) {
      const [, frontmatter = ""] = readFileSync(join(dir, name), "utf8").split(
        /^---$/m,
      );
      // A hidden project is not built, and two of them name covers that
      // were never brought over.
      if (/^hidden:\s*true\s*$/m.test(frontmatter)) continue;
      for (const src of named(frontmatter))
        assert.ok(
          existsSync(join("public", src)),
          `${dir}/${name}: ${src} is not in public/`,
        );
    }
  }
  // The fixture names a poster, a model and a film, so each kind is looked for.
  const [, fixture] = readFileSync(
    "src/content/fixtures/fixture-blocks.md",
    "utf8",
  ).split(/^---$/m);
  for (const file of [
    "/images/lab/beating-shapes.png",
    "/prism/fixtures/cube.glb",
    "/prism/fixtures/cloud.splat",
    "/prism/fixtures/film.webm",
    "/prism/fixtures/tone.wav",
    "/prism/fixtures/demo.svg",
  ])
    assert.ok(named(fixture).includes(file), `the check sees ${file}`);
});

test("at most one experiment on show takes pride of place", () => {
  const featured = visible
    .filter((entry) => entry.field("featured") === "true")
    .map((entry) => entry.slug);
  assert.ok(
    featured.length <= 1,
    `more than one experiment is featured: ${featured.join(", ")}`,
  );
});

test("Cockpit is not an experiment: the Lab has no entry for it", () => {
  assert.ok(
    !entries.some((entry) => entry.slug === "cockpit"),
    "src/content/lab/cockpit.md",
  );
  assert.ok(
    !entries.some((entry) => /^cockpit$/i.test(entry.field("title") ?? "")),
    "an experiment titled Cockpit",
  );
});

test("Strudel tools are two entries, Melograph and midi-strudel, each with its own picture", () => {
  const slugs = entries.map((entry) => entry.slug);
  assert.ok(
    !slugs.some((slug) => slug.startsWith("strudel")),
    "the one Strudel entry is still there",
  );

  const mediaOf = (entry) =>
    [...entry.frontmatter.matchAll(/^\s+src:\s*"?(.*?)"?\s*$/gm)].map(
      ([, src]) => src,
    );
  const expected = {
    melograph: {
      title: "Melograph",
      live: "https://melograph-swart.vercel.app",
      source: "https://github.com/beejsbj/melograph",
    },
    "midi-strudel": {
      title: "midi-strudel",
      live: "https://midi-strudel.vercel.app",
      source: "https://github.com/beejsbj/midi-strudel",
    },
  };

  const pictures = [];
  for (const [slug, { title, live, source }] of Object.entries(expected)) {
    const entry = entries.find((item) => item.slug === slug);
    assert.ok(entry, `${slug}: no entry`);
    assert.equal(entry.field("title"), title, `${slug}: title`);
    assert.ok(entry.field("summary"), `${slug}: no summary`);
    assert.ok(entry.body, `${slug}: no page`);
    assert.ok(
      entry.frontmatter.includes(`url: "${live}"`),
      `${slug}: live link`,
    );
    assert.ok(
      entry.frontmatter.includes(`url: "${source}"`),
      `${slug}: source link`,
    );
    // Each tool names only itself, and its cover is the one picture it has.
    for (const other of Object.values(expected).filter(
      (o) => o.title !== title,
    ))
      for (const url of [other.live, other.source])
        assert.ok(!entry.frontmatter.includes(url), `${slug}: links to ${url}`);
    const cover = entry.field("cover");
    assert.ok(cover, `${slug}: no cover`);
    assert.deepEqual(
      mediaOf(entry),
      [cover],
      `${slug}: its picture is its cover`,
    );
    pictures.push(cover);
  }
  assert.equal(
    new Set(pictures).size,
    pictures.length,
    "the two share a picture",
  );
});

test("Meditejo says its art is drawn by code", () => {
  const meditejo = entries.find((entry) => entry.slug === "meditejo");
  const summary = meditejo.field("summary");
  assert.match(summary, /drawn by code/i, "its summary");
  assert.match(meditejo.body, /drawn by code/i, "its body");
  assert.doesNotMatch(
    `${meditejo.frontmatter}\n${meditejo.body}`,
    /generated (art|mark)|\bAI\b/i,
    "meditejo: its art is called generated, or AI",
  );
});

test("no experiment calls code-made work 'generated' without saying by what", () => {
  for (const entry of entries) {
    const text = `${entry.frontmatter}\n${entry.body}`;
    for (const [phrase] of text.matchAll(
      /\bgenerat(?:ed|ive)\b(?!\s+by\b)[^.\n]{0,30}/gi,
    ))
      assert.fail(`${entry.slug}: "${phrase.trim()}" does not say by what`);
  }
});
