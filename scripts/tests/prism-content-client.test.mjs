import assert from "node:assert/strict";
import test from "node:test";
import { kindOf } from "../../src/prism/routes.ts";
import {
  createContentLoader,
  writingChanged,
} from "../../src/prism/content-client.ts";
const payload = (slug) => ({
  site: {},
  pages: {},
  writing: {
    posts: [],
    status: "available",
    ...(slug
      ? { entry: { slug, html: `<p>${slug}</p>` }, entryStatus: "available" }
      : {}),
  },
});

test("lens content cache expires and writing requests force refresh", async () => {
  let now = 0;
  let requests = 0;
  const loader = createContentLoader(
    async () => {
      requests += 1;
      return Response.json(payload());
    },
    () => now,
  );
  await loader.load();
  await loader.load();
  assert.equal(requests, 1);
  now = 60_001;
  await loader.load();
  assert.equal(requests, 2);
  await loader.load(undefined, true);
  assert.equal(requests, 3);
});

test("concurrent content requests deduplicate and rejected requests can recover", async () => {
  let requests = 0;
  let broken = true;
  const loader = createContentLoader(async () => {
    requests += 1;
    if (broken) return new Response("", { status: 503 });
    return Response.json(payload());
  });
  await Promise.all([
    assert.rejects(loader.load()),
    assert.rejects(loader.load()),
  ]);
  assert.equal(requests, 1);
  broken = false;
  await Promise.all([loader.load(), loader.load()]);
  assert.equal(requests, 2);
});

test("articles are lazy, slug-keyed and never carried into the index", async () => {
  const requests = [];
  const loader = createContentLoader(async (input) => {
    requests.push(input);
    const slug = new URL(input, "https://burooj.dev").searchParams.get(
      "writing",
    );
    return Response.json(payload(slug ?? "accidental-old-body"));
  });
  const first = await loader.load("first");
  const second = await loader.load("second");
  const index = await loader.load();
  assert.equal(first.writing.entry.slug, "first");
  assert.equal(second.writing.entry.slug, "second");
  assert.equal(index.writing.entry, undefined);
  assert.equal(index.writing.entryStatus, undefined);
  assert.deepEqual(requests, [
    "/prism/content.json?writing=first",
    "/prism/content.json?writing=second",
    "/prism/content.json",
  ]);
});

test("a mismatched article response is rejected and not cached", async () => {
  let wrong = true;
  let requests = 0;
  const loader = createContentLoader(async () => {
    requests += 1;
    return Response.json(payload(wrong ? "wrong" : "right"));
  });
  await assert.rejects(loader.load("right"), /did not match/);
  wrong = false;
  assert.equal((await loader.load("right")).writing.entry.slug, "right");
  assert.equal(requests, 2);
});

test("same-URL screens refresh for edits, revocations and outages, not identical data", () => {
  const initial = payload("first");
  assert.equal(writingChanged(initial, structuredClone(initial)), false);
  const edited = structuredClone(initial);
  edited.writing.entry.html = "<p>Edited</p>";
  assert.equal(writingChanged(initial, edited), true);
  const revoked = structuredClone(initial);
  delete revoked.writing.entry;
  revoked.writing.entryStatus = "missing";
  assert.equal(writingChanged(initial, revoked), true);
  const outage = structuredClone(initial);
  delete outage.writing.entry;
  outage.writing.entryStatus = "unavailable";
  outage.writing.status = "unavailable";
  assert.equal(writingChanged(initial, outage), true);
});

test("writing route classification rejects surplus segments and malformed slugs", () => {
  assert.equal(kindOf("/writing").kind, "writing");
  assert.equal(kindOf("/writing/").kind, "writing");
  assert.deepEqual(kindOf("/writing/hello"), {
    kind: "writing-entry",
    slug: "hello",
  });
  assert.deepEqual(kindOf("/writing/hello/"), {
    kind: "writing-entry",
    slug: "hello",
  });
  for (const path of [
    "/writing/hello/extra",
    "/writing//hello",
    "/writing/hello//",
    "/writing/..",
    "/writing/hello%2Fextra",
    `/writing/${"x".repeat(201)}`,
  ])
    assert.equal(kindOf(path).kind, "other", path);
});
