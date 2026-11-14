import assert from "node:assert/strict";
import test from "node:test";
import { arrangeBlocks } from "../../src/lib/blocks.ts";
import { monthCalendar } from "../../src/lib/labbook.ts";
import { labPrints } from "../../src/lib/rules.ts";

// The rules under Daylight's design pass of the Lab (issue #128): how an
// experiment's page is laid out as spreads and plates, how a month of the
// Labbook is drawn as a page of a calendar, and which pictures a card on
// the list holds. Pure, so any lens may use them.

const text = (html) => ({ type: "text", html });
const block = (type, name) => ({ type, name });

test("words keep the small blocks after them beside them, in their margin", () => {
  assert.deepEqual(
    arrangeBlocks([
      text("<h2>How</h2>"),
      block("quote", "said"),
      block("code", "trick"),
    ]),
    [
      {
        kind: "spread",
        text: text("<h2>How</h2>"),
        asides: [block("quote", "said"), block("code", "trick")],
      },
    ],
  );
});

test("a picture, a film, something live or steps is a plate of its own, across the page", () => {
  for (const type of ["gallery", "compare", "embed", "model", "film", "steps"])
    assert.deepEqual(
      arrangeBlocks([text("<p>a</p>"), block(type, "it"), text("<p>b</p>")]),
      [
        { kind: "spread", text: text("<p>a</p>"), asides: [] },
        { kind: "plate", block: block(type, "it") },
        { kind: "spread", text: text("<p>b</p>"), asides: [] },
      ],
      type,
    );
});

test("small blocks with no words before them stand together in a row of their own", () => {
  assert.deepEqual(
    arrangeBlocks([
      block("steps", "how"),
      block("code", "trick"),
      block("tree", "files"),
      block("audio", "tone"),
    ]),
    [
      { kind: "plate", block: block("steps", "how") },
      {
        kind: "spread",
        asides: [
          block("code", "trick"),
          block("tree", "files"),
          block("audio", "tone"),
        ],
      },
    ],
  );
  assert.deepEqual(arrangeBlocks([block("quote", "first")]), [
    { kind: "spread", asides: [block("quote", "first")] },
  ]);
});

test("the arrangement keeps every block, in the order the page is read", () => {
  const page = [
    text("<p>one</p>"),
    block("gallery", "a"),
    block("quote", "b"),
    text("<p>two</p>"),
    block("tree", "c"),
    block("film", "d"),
  ];
  const read = arrangeBlocks(page).flatMap((group) =>
    group.kind === "plate"
      ? [group.block]
      : [...(group.text ? [group.text] : []), ...group.asides],
  );
  assert.deepEqual(read, page);
  assert.deepEqual(arrangeBlocks([]), []);
});

test("a month is a page of a calendar: its days by the week, Monday first, the days written in marked", () => {
  // September 2026 begins on a Tuesday and has thirty days.
  const september = monthCalendar("2026-09", [
    { id: "a", date: "2026-09-11" },
    { id: "b", date: "2026-09-11" },
    { id: "c", date: "2026-09-26" },
  ]);
  assert.equal(september.lead, 1, "one empty day before the first");
  assert.equal(september.days.length, 30);
  assert.deepEqual(
    september.days.filter((day) => day.updates.length),
    [
      { day: 11, updates: ["a", "b"] },
      { day: 26, updates: ["c"] },
    ],
  );
  assert.deepEqual(september.days[0], { day: 1, updates: [] });
  // February 2027 begins on a Monday; a leap year's February has 29.
  assert.equal(monthCalendar("2027-02", []).lead, 0);
  assert.equal(monthCalendar("2027-02", []).days.length, 28);
  assert.equal(monthCalendar("2028-02", []).days.length, 29);
  // A Sunday is the last day of its week.
  assert.equal(monthCalendar("2026-11", []).lead, 6);
});

test("a card holds its cover and its other pictures, three at most, each once", () => {
  assert.deepEqual(labPrints({ cover: "/a.png", media: [] }), ["/a.png"]);
  assert.deepEqual(
    labPrints({
      cover: "/a.png",
      media: [
        { type: "image", src: "/a.png" },
        { type: "video", src: "/film.webm" },
        { type: "image", src: "/b.png" },
        { type: "image", src: "/c.png" },
        { type: "image", src: "/d.png" },
      ],
    }),
    ["/a.png", "/b.png", "/c.png"],
  );
  // With no cover, no pictures: a card with no cover is a slip of paper.
  assert.deepEqual(
    labPrints({ media: [{ type: "image", src: "/b.png" }] }),
    [],
  );
  assert.deepEqual(labPrints({ cover: "/a.png" }), ["/a.png"]);
});
