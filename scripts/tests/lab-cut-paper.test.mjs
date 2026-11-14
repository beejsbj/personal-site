/** Cut Paper and the new Lab (issue #97): the lens owes every part of it,
 * and its shell no longer reads what an experiment need not say. The pages
 * themselves are looked at in lab-cut-paper.browser.mjs. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { GAPS, isGap } from "../../src/prism/parity.ts";
import { REDACTION_MARKER } from "../../src/prism/labbook-fixture.ts";

const SHELL = "src/prism/shells/cut-paper";
const read = (ending) =>
  readdirSync(SHELL)
    .filter((name) => name.endsWith(ending))
    .map((name) => ({ name, source: readFileSync(join(SHELL, name), "utf8") }));
const sources = read(".ts");

test("Cut Paper leaves nothing of the Lab out", () => {
  for (const [kind, part] of [
    ["lab", "update.item"],
    ["lab", "update.redacted"],
    ["lab-entry", "lab.graduation"],
    ["lab-entry", "update.item"],
  ])
    assert.equal(
      isGap("cut-paper", kind, part),
      false,
      `cut-paper ${kind} ${part}`,
    );
  assert.ok(
    !JSON.stringify(GAPS["cut-paper"] ?? {}).includes("#97"),
    "no gap still waits on #97",
  );
});

test("Cut Paper has no ribbon of headlines: the recent updates are where they were", () => {
  for (const { name, source } of [...sources, ...read(".css")])
    assert.doesNotMatch(
      source,
      /\bheadlines\b|\bticker\b|ribbon/i,
      `${name} still has the ribbon`,
    );
});

test("Cut Paper's shell reads neither an experiment's era nor its type", () => {
  for (const { name, source } of sources) {
    assert.ok(!source.includes("sourceEra"), `${name} reads sourceEra`);
    assert.ok(
      !/\b(?:item|entry|experiment)\.type\b(?!\s*===)/.test(source),
      `${name} reads an experiment's type`,
    );
    assert.ok(
      !/labels\.(?:type|era)\b/.test(source),
      `${name} labels a type or an era`,
    );
  }
});

test("Cut Paper's shell holds none of the words a redacted update hides", () => {
  assert.ok(!sources.some(({ source }) => source.includes(REDACTION_MARKER)));
});

test("Cut Paper's skip link says what the site content says", () => {
  assert.ok(
    !sources.some(({ source }) => source.includes("Skip to main")),
    "a shell file still hard-codes the skip link's words",
  );
  const frame = sources.find(({ name }) => name === "frame.ts").source;
  assert.match(frame, /class: "skip-link" }, content\.site\.skipLink/);
});
