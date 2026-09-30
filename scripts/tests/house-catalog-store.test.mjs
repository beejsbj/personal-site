import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  readHouseCatalog,
  saveHouseCatalog,
  isLocalEditorRequest,
} from "../../src/lib/house-catalog-store.mjs";

const catalog = () => ({
  version: 1,
  rooms: [
    {
      id: "undertext",
      title: "Undertext",
      summary: "A reading room.",
      kind: "project",
      furnishing: "shelves",
    },
  ],
  residents: [],
});

test("local roster saves are atomic, validated, and reject outdated drafts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "house-roster-"));
  try {
    const file = join(dir, "catalog.json");
    await writeFile(file, JSON.stringify(catalog()));
    const initial = await readHouseCatalog(file);
    const edit = catalog();
    edit.rooms[0].title = "The reading room";
    const saved = await saveHouseCatalog(file, initial.revision, edit);
    assert.notEqual(saved.revision, initial.revision);
    assert.equal(
      (await readHouseCatalog(file)).catalog.rooms[0].title,
      "The reading room",
    );
    await assert.rejects(saveHouseCatalog(file, initial.revision, catalog()), {
      code: "CONFLICT",
    });
    const before = await readFile(file, "utf8");
    const invalid = catalog();
    invalid.rooms[0].href = "javascript:alert(1)";
    await assert.rejects(saveHouseCatalog(file, saved.revision, invalid));
    assert.equal(await readFile(file, "utf8"), before);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the file editor is unavailable in production or from another origin", () => {
  const get = new Request("http://127.0.0.1:4321/api/house-catalog");
  assert.equal(isLocalEditorRequest(get, false), false);
  assert.equal(isLocalEditorRequest(get, true), true);
  assert.equal(
    isLocalEditorRequest(
      new Request("https://burooj.dev/api/house-catalog"),
      true,
    ),
    false,
  );
  const put = (origin) =>
    new Request(get.url, {
      method: "PUT",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    });
  assert.equal(
    isLocalEditorRequest(put("https://elsewhere.test"), true),
    false,
  );
  assert.equal(isLocalEditorRequest(put("null"), true), false);
  assert.equal(isLocalEditorRequest(put("http://127.0.0.1:4321"), true), true);
});
