import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { problems } from "./lib/content-config.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import { updateDateLabel } from "../../src/lib/labbook.ts";
import {
  labbookFixture,
  REDACTION_MARKER,
} from "../../src/prism/labbook-fixture.ts";

// The Labbook as Daylight ships it (issue #95). Run after
// `pnpm build`: these read the built pages and the emitted handler. How
// they behave in a browser is in labbook-daylight.browser.mjs.

const read = (path) => readFileSync(path, "utf8");
const text = (html) =>
  html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Each update's element in a page's Labbook, in page order. */
const entries = (html) => {
  const labbook = html.match(
    /<section\b[^>]*\bid="labbook"[^>]*>([\s\S]*?)<\/section>/,
  )?.[1];
  if (!labbook) return [];
  return labbook
    .split(/(?=<li\b[^>]*\bid="u-)/)
    .slice(1)
    .map((html) => ({ id: html.match(/\bid="u-([^"]+)"/)[1], html }));
};

/** Every trace of a ticker of headlines in a page, by the names it had. */
const tickerTraces = (html) =>
  html.match(
    /<[a-z]+\b[^>]*\s(?:data-ticker\b|data-part="ticker\.headline"|class="[^"]*\bticker\b)[^>]*>/g,
  ) ?? [];

const keptBack = labbookFixture().labbook.find(
  (update) => update.visibility === "redacted",
);
const WORDS = ["title", "summary", "href", "linkLabel", "artifact"];

test("the schema refuses a redacted update that carries words", () => {
  // The fixture's redacted update, as it would be written in src/content:
  // its id is the file name.
  const { id, ...written } = keptBack;
  for (const field of WORDS)
    assert.ok(
      JSON.stringify(written[field]).includes(REDACTION_MARKER),
      `the fixture hides the marker in ${field}`,
    );
  assert.deepEqual(
    problems("updates", written),
    WORDS.map(
      (field) => `${field}: A redacted update shows its shape and no words.`,
    ),
  );
  // Without them it is a redacted update the build accepts.
  const shapeOnly = Object.fromEntries(
    Object.entries(written).filter(([field]) => !WORDS.includes(field)),
  );
  assert.deepEqual(problems("updates", shapeOnly), []);
});

/** A redacted update's line in its entry's markup, part by part: a word
 * as written, a bar as what it says aloud. */
const line = (html) =>
  [
    ...html.matchAll(
      /<span\b[^>]*\bdata-redaction-(word|bar)\b[^>]*>([\s\S]*?)<\/span>/g,
    ),
  ].map(([, kind, inside]) =>
    kind === "word" ? text(inside) : { bar: text(inside) },
  );

test("a redacted update is drawn as its line, its kind of work and its date, and nothing it hides", async () => {
  const fixture = await serveRuntimeFixture();
  try {
    const { pages } = await (await fixture.fetch("/prism/content.json")).json();
    const { label, bar, works } = pages.lab.labbook.redacted;
    const response = await fixture.fetch("/prism/fixtures/lab");
    assert.equal(response.status, 200);
    const html = await response.text();

    const shown = entries(html);
    assert.ok(
      shown.some((entry) => entry.id === "fixture-replay"),
      "the fixture room has a Labbook",
    );
    const hidden = labbookFixture().labbook.filter(
      (update) => update.visibility === "redacted",
    );
    assert.deepEqual(
      hidden.map((update) =>
        update.shape.parts.some((part) => typeof part === "string"),
      ),
      [false, true],
      "the fixture has one that is bars alone and one that shows a few words",
    );
    for (const update of hidden) {
      const redacted = shown.find((entry) => entry.id === update.id);
      assert.ok(redacted, `${update.id} has its place in the Labbook`);
      const { parts, work } = update.shape;
      assert.deepEqual(
        line(redacted.html),
        parts.map((part) => (typeof part === "string" ? part : { bar })),
        `${update.id}: its words as written and a bar for each number, in order`,
      );
      assert.match(redacted.html, /data-part="update\.redacted"/);
      assert.equal(
        text(redacted.html),
        [
          label,
          works[work],
          ...parts.map((part) => (typeof part === "string" ? part : bar)),
          updateDateLabel(update.date),
        ].join(" "),
        `${update.id}: its name, its kind of work, its line and its date are all it says`,
      );
      assert.doesNotMatch(
        redacted.html,
        /<(?:a|img|iframe|video|audio|source|button)\b/,
        `${update.id} links to nothing and shows no artifact`,
      );
    }
    // Not in its own entry, not anywhere.
    assert.ok(
      !html.includes(REDACTION_MARKER),
      "nothing a redacted update hides is anywhere in the page",
    );
    assert.deepEqual(fixture.foreign, [], "no live network");
  } finally {
    await fixture.close();
  }
});

test("no redacted update is in the shipped seed", async () => {
  for (const name of readdirSync("src/content/updates"))
    assert.doesNotMatch(
      read(`src/content/updates/${name}`),
      /^visibility:\s*"?redacted/m,
      `src/content/updates/${name}`,
    );
  const fixture = await serveRuntimeFixture();
  try {
    const data = await (await fixture.fetch("/prism/content.json")).json();
    assert.ok(data.labbook.length >= 7, "the seeded updates are all here");
    assert.deepEqual(
      data.labbook.filter((update) => update.visibility === "redacted"),
      [],
    );
  } finally {
    await fixture.close();
  }
});

test("/lab lists the seeded updates newest first, each where its links land", async () => {
  const fixture = await serveRuntimeFixture();
  try {
    const data = await (await fixture.fetch("/prism/content.json")).json();
    const shown = entries(read("dist/client/lab/index.html"));
    assert.deepEqual(
      shown.map((entry) => entry.id),
      data.labbook.map((update) => update.id),
    );
    assert.deepEqual(
      shown.map((entry) => entry.id),
      [
        "dayshaper",
        "component-guide",
        "emotitone-performance-deck",
        "warm-welcome-pr",
        "conduit-market",
        "api3-showcase",
        "qrng-demos",
      ],
    );
    for (const update of data.labbook) {
      const { html } = shown.find((entry) => entry.id === update.id);
      const says = text(html);
      for (const words of [
        update.title,
        update.summary,
        updateDateLabel(update.date),
        data.site.updateKinds[update.kind],
        data.site.updateSources[update.source],
      ])
        assert.ok(says.includes(words), `${update.id} says "${words}"`);
      assert.match(
        html,
        new RegExp(`<time\\b[^>]*datetime="${update.date}"`),
        `${update.id} is dated`,
      );
      if (update.href)
        assert.ok(
          html.includes(`href="${update.href}"`),
          `${update.id} links to ${update.href}`,
        );
    }
    // What an update is about is a link to it.
    const dayshaper = shown.find((entry) => entry.id === "dayshaper").html;
    assert.match(
      dayshaper,
      /data-related="project"[\s\S]*?href="\/projects\/dayshaper"[\s\S]*?Dayshaper/,
    );
  } finally {
    await fixture.close();
  }
});

test("neither the home page nor the Lab has a ticker of headlines", async () => {
  const fixture = await serveRuntimeFixture();
  try {
    for (const page of ["index.html", "lab/index.html", "about/index.html"])
      assert.deepEqual(tickerTraces(read(`dist/client/${page}`)), [], page);
    const room = await (await fixture.fetch("/prism/fixtures/lab")).text();
    assert.ok(entries(room).length > 0, "the fixture room has a Labbook");
    assert.deepEqual(tickerTraces(room), [], "the fixture room");
  } finally {
    await fixture.close();
  }
});

test("with no updates there is no Labbook", async () => {
  const fixture = await serveRuntimeFixture();
  try {
    const bare = await (
      await fixture.fetch("/prism/fixtures/lab?labbook=none")
    ).text();
    assert.deepEqual(entries(bare), []);
    assert.doesNotMatch(bare, /<[a-z]+\b[^>]*\sid="labbook"/);
  } finally {
    await fixture.close();
  }
});
