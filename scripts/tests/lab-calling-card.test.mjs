/** Calling Card and the new Lab (issue #96): the lens owes every part of
 * it, and its shell no longer reads what an experiment need not say. The
 * pages themselves are looked at in lab-calling-card.browser.mjs. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { GAPS, isGap } from "../../src/prism/parity.ts";
import { REDACTION_MARKER } from "../../src/prism/labbook-fixture.ts";

const SHELL = "src/prism/shells/calling-card";
const read = (ending) =>
  readdirSync(SHELL)
    .filter((name) => name.endsWith(ending))
    .map((name) => ({ name, source: readFileSync(join(SHELL, name), "utf8") }));
const sources = read(".ts");

test("Calling Card leaves nothing of the new Lab out", () => {
  for (const [kind, part] of [
    ["lab", "update.item"],
    ["lab", "update.redacted"],
    ["lab-entry", "lab.graduation"],
    ["lab-entry", "update.item"],
  ])
    assert.equal(
      isGap("calling-card", kind, part),
      false,
      `calling-card ${kind} ${part}`,
    );
  assert.ok(
    !JSON.stringify(GAPS["calling-card"] ?? {}).includes("#96"),
    "no gap still waits on #96",
  );
});

test("Calling Card has no wire of headlines: the recent updates are where they were", () => {
  for (const { name, source } of [...sources, ...read(".css")])
    assert.doesNotMatch(
      source,
      /\bheadlines\b|\bticker\b|cc-wire|\btendWire\b|\bwire\(/i,
      `${name} still has the wire`,
    );
});

test("Calling Card's shell reads neither an experiment's era nor its type", () => {
  for (const { name, source } of sources) {
    assert.ok(!source.includes("sourceEra"), `${name} reads sourceEra`);
    assert.ok(
      !/\b(?:entry|data|experiment)\.type\b/.test(source),
      `${name} reads an experiment's type`,
    );
    assert.ok(
      !/labels\.(?:type|era)\b/.test(source),
      `${name} labels a type or an era`,
    );
  }
});

test("Calling Card's shell never reads a redacted update's words", () => {
  const labbook = sources.find(({ name }) => name === "labbook.ts")?.source;
  assert.ok(labbook, "the Labbook has a file of its own");
  // The Labbook narrows on visibility, and hands a redacted update to the
  // one function that draws it.
  assert.match(labbook, /update\.visibility !== "open"\)\s*return censored\(/);
  const censored = labbook.slice(
    labbook.indexOf("function censored("),
    labbook.indexOf("\nfunction ", labbook.indexOf("function censored(") + 1),
  );
  assert.ok(censored.length > 0, "a redacted update is drawn by `censored`");
  for (const field of ["title", "summary", "href", "linkLabel", "artifact"])
    assert.ok(
      !new RegExp(`\\.${field}\\b`).test(censored),
      `a redacted update's ${field} is read`,
    );
  assert.ok(!sources.some(({ source }) => source.includes(REDACTION_MARKER)));
});
