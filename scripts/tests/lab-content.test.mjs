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
    "/prism/fixtures/demo.html",
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
