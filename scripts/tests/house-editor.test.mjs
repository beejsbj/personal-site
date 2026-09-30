import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateHouseCatalog } from "../../src/lib/activity-house-model.mjs";

const read = (path) => readFileSync(path, "utf8");
const controller = read("src/design/unique/house-editor.ts");
const page = read("src/pages/house/edit.astro");
const specimen = read("src/design/unique/HouseEditor.astro");
const catalog = JSON.parse(read("src/data/house.catalog.json"));

test("the editor accepts the real public roster through the shared house validator", () => {
  const approved = validateHouseCatalog(catalog);

  assert.equal(approved.rooms.length, 9);
  assert.equal(
    approved.rooms.find((room) => room.id === "emotitone")?.href,
    "https://github.com/beejsbj/emotitone-solfrege",
  );
  assert.equal(approved.residents[0]?.roomId, "cockpit");
  assert.match(controller, /import \{ validateHouseCatalog \}/);
  assert.doesNotMatch(controller, /href\.startsWith\("\/"\)/);
});

test("resident assignment and browser-safe public links follow the server model", () => {
  const invalid = structuredClone(catalog);
  invalid.rooms[0].href = "javascript:alert(1)";
  invalid.residents[0].roomId = "missing-room";

  assert.throws(
    () => validateHouseCatalog(invalid),
    /http\(s\) URL without credentials/,
  );
  assert.match(specimen, /Every resident belongs to one public room/);
  assert.doesNotMatch(specimen, /No room assigned/);
  assert.match(controller, /resident\.roomId = room\.value/);
  assert.match(controller, /roomId: catalog\.rooms\[0\]\.id/);
});

test("the edit page is local-only and keeps explicit save and conflict recovery controls", () => {
  assert.match(page, /export const prerender = false/);
  assert.match(page, /import\.meta\.env\.DEV/);
  assert.match(page, /localhost/);
  assert.match(page, /127\.0\.0\.1/);
  assert.match(page, /return new Response\(null, \{ status: 404 \}\)/);
  assert.match(page, /noindex=\{true\}/);
  assert.match(specimen, /data-house-editor-save/);
  assert.match(specimen, /data-house-editor-reload/);
  assert.match(specimen, /data-house-editor-suggested-room/);
  assert.match(specimen, /data-house-editor-resident-list/);
  assert.match(specimen, /src\/data\/house\.catalog\.json/);
  assert.doesNotMatch(
    specimen,
    /<input[^>]+type="submit"[^>]+value="Auto-save"/,
  );
  assert.match(controller, /method: "PUT"/);
  assert.match(controller, /credentials: "same-origin"/);
  assert.match(controller, /statusCode === 409/);
  assert.match(controller, /localStorage/);
});
