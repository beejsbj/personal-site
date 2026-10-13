/** Back Page's About book: the study notes are cut from the about body
 * without losing, adding or reordering a word, and the lens copy names no
 * paper as content. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pieces } from "../../src/prism/shells/back-page/sentences.ts";

const squash = (text) => text.replace(/\s+/g, "");
/** The pieces, joined, are the paragraph: nothing lost, added or moved. */
const whole = (text) =>
  assert.equal(squash(pieces(text).map((p) => text.slice(p.start, p.end)).join("")), squash(text));
const kinds = (text) => pieces(text).map((p) => p.kind);
const words = (text) => pieces(text).map((p) => text.slice(p.start, p.end));

test("a paragraph becomes a point, then an arrow for each sentence after it", () => {
  const text =
    "I make places on the web. My journey into web development began with Perpetual Education, learning the whole process from an idea to a working site.";
  whole(text);
  assert.deepEqual(kinds(text), ["point", "more"]);
  assert.equal(words(text)[0], "I make places on the web.");
});

test("questions and exclamations end sentences too", () => {
  const text = "Have a project in mind? Tell me about it. It pays! Both have room.";
  whole(text);
  assert.deepEqual(kinds(text), ["point", "more", "more", "more"]);
});

test("a quotation is lifted out whole, even with sentences inside it", () => {
  const text =
    "When I started, I wrote: “The World is Wide. And as I explore this Web I hope to find where my talents and interests intersect!” That curiosity is still a good description of what brings me back.";
  whole(text);
  assert.deepEqual(kinds(text), ["point", "quote", "more"]);
  assert.ok(words(text)[1].startsWith("“The World is Wide. And"));
  assert.ok(words(text)[1].endsWith("intersect!”"));
});

test("a short quoted phrase stays in its sentence", () => {
  const text = "I call it “the lab” for short. It holds experiments.";
  whole(text);
  assert.deepEqual(kinds(text), ["point", "more"]);
});

test("abbreviations and initials don't end a sentence", () => {
  const text = "I use tools, e.g. Vue and Astro, daily. Dr. Smith and J. Doe taught me. Then I left.";
  whole(text);
  assert.deepEqual(words(text), [
    "I use tools, e.g. Vue and Astro, daily.",
    "Dr. Smith and J. Doe taught me.",
    "Then I left.",
  ]);
});

test("text with no sentence ends is one point, and empty text is none", () => {
  whole("just a phrase without a full stop");
  assert.deepEqual(kinds("just a phrase without a full stop"), ["point"]);
  assert.deepEqual(pieces("   "), []);
});

test("Back Page's copy names no paper as content, and has no contents slip", () => {
  const copy = JSON.parse(readFileSync("src/content/lenses/back-page.json", "utf8"));
  assert.equal(copy.contents, undefined, "the contents slip is gone");
  for (const [id, paper] of Object.entries(copy.papers))
    assert.deepEqual(Object.keys(paper), ["pens"], `paper ${id} carries only the soldiers' pen names`);
  const books = Object.keys(copy.books).filter((key) => typeof copy.books[key] === "object");
  assert.deepEqual(books, ["home", "about", "lab", "projects", "writing"], "five books; the resume is stapled into About");
  const paperWords = /squared|feint|ruled|legal|graph|blueprint|2 mm/i;
  for (const key of books)
    for (const value of Object.values(copy.books[key]).flat())
      assert.doesNotMatch(String(value), paperWords, `book ${key} names a paper: ${value}`);
});
