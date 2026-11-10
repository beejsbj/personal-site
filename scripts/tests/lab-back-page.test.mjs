import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { scribbledOut, seed } from "../../src/prism/shells/back-page/ink.ts";

// Back Page's Lab (issue #98), as far as Node can see it: what the shell no
// longer reads, and the scribble a redacted update is drawn as. The book
// itself is looked at in a browser, in lab-back-page.browser.mjs.

const SHELL = "src/prism/shells/back-page";
const sources = readdirSync(SHELL).map((name) => ({
  name,
  source: readFileSync(join(SHELL, name), "utf8"),
}));

test("Back Page reads neither an experiment's era nor its type", () => {
  for (const { name, source } of sources) {
    assert.ok(!source.includes("sourceEra"), `${name} reads sourceEra`);
    assert.doesNotMatch(
      source,
      /\b(?:item|entry)\.type\b|\blabels\.(?:type|era)\b/,
      `${name} reads an experiment's type, or the labels for it`,
    );
  }
  // The link out to an experiment no longer names where it came from.
  const copy = JSON.parse(
    readFileSync("src/content/lenses/back-page.json", "utf8"),
  );
  assert.doesNotMatch(copy.lab.tryIt, /\{/);
});

test("a scribble is strokes and nothing else, the same every time, longer for a longer bar", () => {
  const draw = (letters, key = "struck-fixture") =>
    scribbledOut(letters, "var(--bp-blue)", seed(key));
  const short = draw(3);
  const long = draw(8);
  for (const svg of [short, long]) {
    assert.match(
      svg,
      /^<svg [^>]*aria-hidden="true"[^>]*>(<path [^>]*\/>)+<\/svg>$/,
    );
    assert.equal(svg.replace(/<[^>]*>/g, ""), "", "no words between its tags");
    assert.doesNotMatch(svg, /<text|<title|<desc/);
  }
  const width = (svg) => Number(svg.match(/viewBox="0 0 (\d+) /)[1]);
  assert.ok(width(long) > width(short));
  // Drawn from its seed, so the same update is the same scribble on every
  // visit, and two updates are not each other's.
  assert.equal(draw(5), draw(5));
  assert.notEqual(draw(5), draw(5, "struck-another"));
});
