import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("project history includes applications and the learning arcade in dated order", () => {
  const html = read("dist/client/projects/index.html");
  for (const slug of [
    "conduit-market",
    "api3-ecosystem",
    "flashcards",
    "qrng",
    "e4p",
    "garden",
  ]) {
    assert.match(html, new RegExp(`href="/projects/${slug}"`));
    assert.ok(existsSync(`dist/client/projects/${slug}/index.html`));
  }
  const years = [...html.matchAll(/id="year-(\d{4})"/g)].map((match) =>
    Number(match[1]),
  );
  assert.deepEqual(years, [2025, 2024, 2022, 2021]);
  assert.ok(
    html.indexOf('href="/projects/flashcards"') <
      html.indexOf('href="/projects/qrng"'),
  );
  for (const slug of ["e4p", "garden"]) {
    const detail = read(`dist/client/projects/${slug}/index.html`);
    assert.match(detail, />Arcade</);
    assert.match(detail, /archived arcade project/);
  }
});

test("Lab contains experiment destinations, not project or style-guide cards", () => {
  const html = read("dist/client/lab/index.html");
  assert.match(html, /https:\/\/codepen.io\/beejsbj\/pen\/abXZWLQ/);
  assert.match(html, /https:\/\/codepen.io\/beejsbj\/pen\/BaeoNPG/);
  assert.doesNotMatch(
    html,
    /href="\/lab\/(?:e4p|garden|flashcards|style-guide)"/,
  );
  assert.doesNotMatch(html, /iframe/);
  assert.doesNotMatch(
    read("src/content/projects/pizza-nano.md"),
    /https:\/\/pizzanano.ca/,
  );
});
