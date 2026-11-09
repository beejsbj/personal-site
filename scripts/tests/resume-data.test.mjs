import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resume = JSON.parse(readFileSync("src/data/resume.json", "utf8"));

test("synced resume data has basics and work entries", () => {
  assert.equal(resume.basics.name, "Burooj Rashid");
  assert.ok(resume.basics.label);
  assert.ok(resume.work.length > 0);
  for (const job of resume.work) {
    assert.ok(job.name && job.position && job.startDate);
    assert.ok(job.highlights.length > 0);
  }
  assert.ok(resume.projects.length > 0);
  assert.ok(resume.education.length > 0);
});

test("synced resume data carries no private contact fields", () => {
  assert.equal("phone" in resume.basics, false);
  assert.equal("address" in (resume.basics.location ?? {}), false);
});

test("resume page renders from src/data/resume.json", () => {
  const page = readFileSync("src/pages/resume.astro", "utf8");
  assert.match(page, /data\/resume\.json/);
  assert.doesNotMatch(page, /getEntry\(\s*"pages",\s*"resume"/);
});
