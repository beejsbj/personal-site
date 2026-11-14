import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { DRAWINGS, drawingFor } from "../../src/prism/shells/back-page/drawings.ts";
import { doodle, seed } from "../../src/prism/shells/back-page/ink.ts";

// Which drawing sits beside an experiment (issue #167), as far as Node can
// see it: the rule that chooses it, and that the set it chooses from is all
// drawn. That the drawing is beside its entry in the book is looked at in a
// browser, in lab-back-page-drawings.browser.mjs.

const words = (title, summary = "", rest = {}) => ({
  title,
  summary,
  place: "bench",
  blocks: [],
  media: [],
  ...rest,
});

test("a drawing is chosen from the entry's subject: what it says it is about", () => {
  const says = (title, summary) => drawingFor(words(title, summary));
  assert.equal(says("Two birds", "A crow and a cockatoo talk."), "bird");
  assert.equal(says("Kitchen", "Recipes written in Cooklang."), "pot");
  assert.equal(says("Melograph", "Hum or sing a phrase and get a pitch line."), "note");
  assert.equal(says("Resonance", "A musical orchestra-defence game."), "note");
  assert.equal(says("House-making and 3D", "From floor plans to a model in Blender."), "house");
  assert.equal(says("Persona 5 stars", "A Pen after the stars in Persona 5."), "star");
  assert.equal(says("Game of Life", "The Game of Life, in a Pen."), "noughts");
  assert.equal(says("Beating Shapes", "Shapes that keep time on a single beat."), "beats");
  assert.equal(says("Clockwork Observatory", "A brass orrery and telescope."), "planet");
  assert.equal(says("Path Under Strain", "A canvas study of strain, shape and repair."), "bolt");
  assert.equal(says("Undertext", "Reading a text in layers."), "spiral");
  assert.equal(says("Journal engine", "Guided journaling rituals."), "book");
  assert.equal(says("Films from code", "Short films and a lyric video."), "clapper");
  assert.equal(says("Motion Path Graph", "Drawing a lotus one line at a time."), "lotus");
});

test("the first subject it names wins, so a rule can be read off the table", () => {
  // strain comes before shape, a house before 3D, music before games
  assert.equal(drawingFor(words("Strained shapes")), "bolt");
  assert.equal(drawingFor(words("A 3D house")), "house");
  assert.equal(drawingFor(words("A musical game")), "note");
});

test("with no subject it is drawn from what the page holds, then from its kind", () => {
  const blank = (kind) => words("Untitled", "Nothing said.", kind);
  assert.equal(drawingFor(blank({ blocks: [{ type: "model" }] })), "box");
  assert.equal(drawingFor(blank({ blocks: [{ type: "film" }] })), "clapper");
  assert.equal(drawingFor(blank({ blocks: [{ type: "audio" }] })), "note");
  assert.equal(drawingFor(blank({ media: [{ type: "video" }] })), "clapper");
  // a page's text is not a subject
  assert.equal(drawingFor(blank({ blocks: [{ type: "text" }] })), drawingFor(blank({})));
  // the kind: something to play, several pictures, one picture, only words
  const play = drawingFor(blank({ preview: { kind: "pen", frame: "x" } }));
  const prints = drawingFor(blank({ cover: "/a.png", media: [{ type: "image", src: "/b.png" }] }));
  const print = drawingFor(blank({ cover: "/a.png" }));
  const only = drawingFor(blank({}));
  assert.equal(new Set([play, prints, print, only]).size, 4, "each kind has its own");
  assert.equal(drawingFor(blank({ preview: { kind: "demo", frame: "x" } })), play);
});

test("the choice belongs to the entry alone: not its order, its neighbours or a chance", () => {
  const entry = words("Quantumon", "My first paid gig.", { cover: "/q.png" });
  const first = drawingFor(entry);
  for (let i = 0; i < 20; i += 1) assert.equal(drawingFor({ ...entry }), first);
  // listed or not among others, in either order, nothing changes
  const others = ["Kitchen", "Two birds", "Resonance"].map((t) => words(t));
  const among = [entry, ...others].map(drawingFor);
  const reversed = [...others, entry].reverse().map(drawingFor);
  assert.equal(among[0], first);
  assert.equal(reversed[0], first);
  // what the entry says decides it, not where it lies
  assert.equal(drawingFor({ ...entry, place: "shelf", order: 99 }), first);
  // the rule draws on no randomness at all
  const source = readFileSync("src/prism/shells/back-page/drawings.ts", "utf8");
  assert.doesNotMatch(source, /Math\.random|\bseed\b|Date\.now|crypto/);
});

test("every drawing it can choose is drawn, once, in the lens's two pens", () => {
  assert.equal(new Set(DRAWINGS).size, DRAWINGS.length);
  const sketches = DRAWINGS.map((name) => doodle(name, seed("fixture")));
  assert.equal(new Set(sketches).size, DRAWINGS.length, "none is another's copy");
  for (const [i, svg] of sketches.entries()) {
    assert.match(svg, new RegExp(`^<svg class="bp-doodle" data-doodle="${i}" data-drawing="${DRAWINGS[i]}" viewBox="0 0 120 110" aria-hidden="true">`));
    const paths = svg.match(/<path [^>]*>/g) ?? [];
    assert.ok(paths.length >= 2, `${DRAWINGS[i]} has strokes`);
    for (const path of paths) {
      assert.match(path, /pathLength="1"/, `${DRAWINGS[i]}: each stroke can be drawn on`);
      assert.match(path, /stroke="var\(--bp-(?:blue|red)\)"|stroke="[^"]+"/);
    }
    assert.doesNotMatch(svg, /<text|<title|<desc|<image|<script/);
    // drawn the same on every visit
    assert.equal(svg, doodle(DRAWINGS[i], seed("fixture")));
  }
  // the first thirteen keep the places the page's motion already names
  assert.deepEqual(DRAWINGS.slice(0, 3), ["lotus", "beats", "spiral"]);
});

test("every real experiment gets a drawing, and the Bench's are not one another's", () => {
  const DIR = "src/content/lab";
  const entries = readdirSync(DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const [, front = ""] = readFileSync(join(DIR, name), "utf8").split(/^---$/m);
      const field = (key) => front.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.trim();
      return { name, entry: words(field("title"), field("summary"), { place: field("place"), cover: field("cover") }) };
    });
  assert.ok(entries.length > 10);
  for (const { name, entry } of entries) assert.ok(DRAWINGS.includes(drawingFor(entry)), name);
  // the experiments with nothing but words are the ones drawn in the margin
  const bare = entries.filter(({ entry }) => entry.place === "bench" && !entry.cover);
  const drawn = bare.map(({ entry }) => drawingFor(entry));
  assert.equal(new Set(drawn).size, drawn.length, `the bare Bench: ${drawn.join(", ")}`);
});
