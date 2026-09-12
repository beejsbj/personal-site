import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { selectActivitySnapshot } from "../../src/lib/activity.mjs";

const read = (path) => readFileSync(path, "utf8");
const html = read("dist/client/index.html");
const schema = read("src/content.config.ts");
const component = read("src/design/compounds/UpdateEntry.astro");
const entries = readdirSync("src/content/updates")
  .filter((name) => name.endsWith(".md"))
  .map((name) => read(`src/content/updates/${name}`));

test("activity is a chronological native list, not a writing grid or live log", () => {
  const list = html.match(
    /<ol\b[^>]*aria-label="Recent activity, newest first"[^>]*>([\s\S]*?)<\/ol>/,
  );
  assert.ok(list, "The homepage must render the shared activity stream");
  const dates = [...list[1].matchAll(/<time\b[^>]*datetime="([^"]+)"/g)].map(
    ([, date]) => date,
  );
  assert.ok(
    dates.length >= 5,
    "Preserve earlier project updates alongside new events",
  );
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.equal((list[1].match(/<li\b/g) || []).length, dates.length);
  assert.doesNotMatch(list[1], /<h[1-6]\b|role="log"|aria-live=/);
  assert.match(html, /collected by hand/);
});

test("different event kinds have distinct labels and icon paths", () => {
  for (const kind of [
    "project",
    "pull-request",
    "repository",
    "writing",
    "lab",
    "milestone",
    "status",
    "location",
    "agents",
  ]) {
    assert.ok(schema.includes(`"${kind}"`), `Missing schema kind ${kind}`);
    assert.match(
      component,
      new RegExp(`(?:"${kind}"|${kind}):\\s*\\{`),
      `Missing visual definition ${kind}`,
    );
  }
  for (const kind of ["pull-request", "milestone", "project"]) {
    assert.ok(
      html.includes(`data-event-kind="${kind}"`),
      `Missing real ${kind} event`,
    );
  }
});

test("seeded milestones link to verifiable sources and do not invent live presence", () => {
  for (const name of ["warm-welcome-pr.md", "component-guide.md"]) {
    const entry = read(`src/content/updates/${name}`);
    assert.match(
      entry,
      /evidence:\s*\n\s+url: "https:\/\/github\.com\/beejsbj\/personal-site\//,
    );
    assert.match(entry, /observedAt: "\d{4}-\d{2}-\d{2}T/);
  }
  const pr = read("src/content/updates/warm-welcome-pr.md");
  assert.match(pr, /Opened the warm-welcome redesign PR/);
  assert.match(pr, /\/pull\/3/);
  assert.doesNotMatch(pr, /closed|merged/i);
  for (const entry of entries) {
    assert.doesNotMatch(
      entry,
      /kind: "(?:status|location|agents)"/,
      "Static seeds must not pretend to be a live presence service",
    );
  }
});

test("ephemeral event contract requires expiry and acknowledges build-time limits", () => {
  assert.match(
    schema,
    /\["status", "location", "agents"\]\.includes\(update\.kind\) &&\s*!update\.expiresAt/,
  );
  const stream = read("src/design/compounds/ActivityStream.astro");
  assert.match(stream, /deployed HTML does not self-expire/);
  assert.match(stream, /selectActivitySnapshot\(Astro\.props\.updates\)/);
  assert.match(stream, /A quiet moment/);
});

test("snapshot filters future/expired signals, handles empty input, and preserves inputs", () => {
  const now = new Date("2026-09-12T08:00:00Z");
  const entries = [
    { date: "2026-09-01", id: "older" },
    { date: "2026-09-13", id: "future" },
    { date: "2026-09-11", expiresAt: "2026-09-12T08:00:00Z", id: "expired" },
    {
      date: "2026-09-12",
      expiresAt: "2026-09-12T09:00:00Z",
      id: "valid-at-build",
    },
    { date: "not-a-date", id: "invalid" },
    { date: "2026-09-10", expiresAt: "not-a-date", id: "invalid-expiry" },
  ];
  const before = structuredClone(entries);
  assert.deepEqual(
    selectActivitySnapshot(entries, now).map((entry) => entry.id),
    ["valid-at-build", "older"],
  );
  assert.deepEqual(selectActivitySnapshot([], now), []);
  assert.deepEqual(entries, before);
  assert.deepEqual(
    selectActivitySnapshot(entries, new Date("2026-09-12T09:00:00Z")).map(
      (entry) => entry.id,
    ),
    ["older"],
  );
});
