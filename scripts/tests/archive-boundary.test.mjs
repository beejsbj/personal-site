import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const archiveRoots = [
  "about",
  "assets",
  "data",
  "images",
  "projects",
  "styles",
  "templates",
  "functions.php",
  "index.php",
  "docker-compose.yaml",
  ".HTACCESS",
];

const archivalVideos = [
  "api3-ecosystem-laptop.mp4",
  "e4p-laptop.mp4",
  "e4p-mobile.mp4",
  "flashcards-laptop.mp4",
  "flashcards-mobile.mp4",
  "garden-laptop.mp4",
  "lottery-mobile.mp4",
  "lottery-reset.mp4",
  "lottery-roll-submit.mp4",
  "lottery-tablet.mp4",
  "quantumon-laptop.mp4",
  "quantumon-mobile.mp4",
  "roulette-laptop-connect.mp4",
  "roulette-laptop-spin.mp4",
  "roulette-mobile.mp4",
  "style-guide-laptop.mp4",
];

function rootPattern(path) {
  return path.includes(".") && !path.includes("/") ? `/${path}` : `/${path}/`;
}

const archiveIsExcludedVercelInput =
  process.env.VERCEL === "1" && archiveRoots.every((path) => !existsSync(path));

test("Vercel excludes the root-level PHP/JSON archive", () => {
  const ignored = new Set(readFileSync(".vercelignore", "utf8").split(/\r?\n/));
  for (const path of archiveRoots) {
    assert.ok(
      ignored.has(rootPattern(path)),
      `Vercel must exclude archive input: ${path}`,
    );
  }
});

test(
  "a full checkout retains PHP/JSON archive inputs and Docker wiring",
  {
    skip:
      archiveIsExcludedVercelInput &&
      "Vercel intentionally excludes the local-only archive inputs",
  },
  () => {
    for (const path of archiveRoots) {
      assert.ok(existsSync(path), `Missing retained archive input: ${path}`);
    }
    const compose = readFileSync("docker-compose.yaml", "utf8");
    assert.match(compose, /\.\/:\/var\/www\/html\//);
    const php = readFileSync("functions.php", "utf8");
    assert.match(php, /data\/pages/);
    assert.match(php, /templates\/pages/);
  },
);

test(
  "a full checkout retains historical videos outside the Astro payload",
  {
    skip:
      archiveIsExcludedVercelInput &&
      "Vercel intentionally excludes the local-only archive inputs",
  },
  () => {
    for (const filename of archivalVideos) {
      const archiveCopy = join("images", "projects", filename);
      assert.ok(
        existsSync(archiveCopy),
        `Missing archival video: ${archiveCopy}`,
      );
      assert.ok(
        statSync(archiveCopy).size > 0,
        `Empty archival video: ${archiveCopy}`,
      );
    }

    assert.ok(
      statSync("images/projects/roulette-laptop-connect.mp4").size > 74_000_000,
      "The original 74 MiB roulette capture must remain recoverable in the archive",
    );
  },
);

test("the active public and built payload do not deliver archived videos", () => {
  const builtHtml = [
    "dist/client/index.html",
    "dist/client/projects/index.html",
    "dist/client/lab/index.html",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");

  for (const filename of archivalVideos) {
    assert.doesNotMatch(
      builtHtml,
      new RegExp(filename),
      `Built HTML references ${filename}`,
    );
    assert.equal(
      existsSync(join("public", "images", "projects", filename)),
      false,
      `Public delivery copy remains: ${filename}`,
    );
    assert.equal(
      existsSync(join("dist", "client", "images", "projects", filename)),
      false,
      `Built delivery copy remains: ${filename}`,
    );
  }
});
