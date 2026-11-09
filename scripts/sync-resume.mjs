#!/usr/bin/env node
// Pull the public resume export from the private burooj-inc repo into this site.
//
//   bun run sync:resume
//   BUROOJ_INC_DIR=/path/to/burooj-inc bun run sync:resume
//
// burooj-inc (me/ -> faces/exports/resume.json) is the source of truth; this
// site keeps no copy of Burooj's data beyond the committed snapshot in
// src/data/resume.json. Vercel builds from that committed snapshot and never
// sees burooj-inc, so after syncing, commit the updated file.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const incRoot = resolve(
  process.env.BUROOJ_INC_DIR || resolve(siteRoot, "..", "burooj-inc"),
);
const source = resolve(incRoot, "faces", "exports", "resume.json");
const target = resolve(siteRoot, "src", "data", "resume.json");

let parsed;
try {
  parsed = JSON.parse(readFileSync(source, "utf8"));
} catch (error) {
  console.error(`sync-resume: cannot read a valid resume export at ${source}`);
  console.error(`  ${error.message}`);
  console.error(
    "  Set BUROOJ_INC_DIR to the burooj-inc checkout if it lives elsewhere.",
  );
  process.exit(1);
}
if (!parsed.basics || !Array.isArray(parsed.work) || parsed.work.length === 0) {
  console.error(
    `sync-resume: ${source} has no basics or work entries; refusing to copy.`,
  );
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`sync-resume: ${source} -> ${target}`);
