/** Hion and the new Lab (issue #99): the lens owes every part of it, and
 * its shell no longer reads what an experiment need not say. The pages
 * themselves are looked at in lab-hion.browser.mjs. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { GAPS, isGap } from "../../src/prism/parity.ts";
import { REDACTION_MARKER } from "../../src/prism/labbook-fixture.ts";

const SHELL = "src/prism/shells/hion";
const sources = readdirSync(SHELL)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => ({ name, source: readFileSync(join(SHELL, name), "utf8") }));

test("Hion leaves nothing of the Lab out", () => {
  for (const [kind, part] of [
    ["home", "ticker.headline"],
    ["lab", "ticker.headline"],
    ["lab", "update.item"],
    ["lab", "update.redacted"],
    ["lab-entry", "lab.graduation"],
    ["lab-entry", "update.item"],
  ])
    assert.equal(isGap("hion", kind, part), false, `hion ${kind} ${part}`);
  assert.ok(
    !JSON.stringify(GAPS.hion ?? {}).includes("#99"),
    "no gap still waits on #99",
  );
});

test("Hion's shell reads neither an experiment's era nor its type", () => {
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

test("Hion's shell never reads a redacted update's words", () => {
  const screens = sources.find(({ name }) => name === "screens.ts").source;
  const redacted = screens.slice(
    screens.indexOf('if (update.visibility !== "open")'),
    screens.indexOf("const { updateKinds, updateSources }"),
  );
  assert.ok(redacted.length > 0, "the Labbook narrows on visibility first");
  for (const field of ["title", "summary", "href", "linkLabel", "artifact"])
    assert.ok(
      !new RegExp(`update\\.${field}\\b`).test(redacted),
      `a redacted update's ${field} is read`,
    );
  assert.ok(!sources.some(({ source }) => source.includes(REDACTION_MARKER)));
});
