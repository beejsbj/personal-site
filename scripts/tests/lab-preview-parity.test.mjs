import assert from "node:assert/strict";
import test from "node:test";
import { GAPS, expectedParts, isGap } from "../../src/prism/parity.ts";
import { PARTS } from "../../src/prism/parts.ts";

// A card that can be played in place, in the parity contract (issue #135):
// the part is owed on the Lab's list, by each entry that can be played, and
// a lens that does not draw it yet says so, with the ticket of the design
// pass that will.

const copy = {
  load: { pen: "Play the Pen here", demo: "Run the demo here" },
  close: "Put it away",
  note: "Nothing loads until you ask.",
  loading: "Loading",
};
const entry = (slug, over = {}) => ({
  slug,
  title: `Title of ${slug}`,
  summary: `Summary of ${slug}`,
  detail: `https://example.com/${slug}`,
  hasPage: false,
  place: "shelf",
  links: [],
  media: [],
  order: 1,
  html: "",
  blocks: [],
  ...over,
});
const content = {
  pages: {
    lab: {
      header: { title: "Lab", intro: "A room." },
      more: { label: "More" },
      aside: "Aside.",
      preview: copy,
    },
  },
  lab: [
    entry("a-pen", {
      preview: {
        kind: "pen",
        frame: "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
      },
    }),
    entry("a-demo", {
      preview: { kind: "demo", frame: "https://demo.example/" },
    }),
    entry("a-link"),
  ],
  projects: [],
  labbook: [],
};
const lab = { kind: "lab", path: "/lab" };

test("the Lab's list owes a way to play each entry that can be played, and no other", () => {
  assert.ok(PARTS.includes("lab.preview"));
  const owed = expectedParts(lab, content).filter(
    (want) => want.part === "lab.preview",
  );
  assert.deepEqual(owed, [
    { part: "lab.preview", ref: "a-pen", texts: ["Play the Pen here"] },
    { part: "lab.preview", ref: "a-demo", texts: ["Run the demo here"] },
  ]);
});

test("an entry's own page does not owe it", () => {
  const page = { ...content, lab: [{ ...content.lab[0], hasPage: true }] };
  assert.ok(
    !expectedParts(
      { kind: "lab-entry", path: "/lab/a-pen", slug: "a-pen" },
      page,
    ).some((want) => want.part === "lab.preview"),
  );
});

test("Daylight, Calling Card and Back Page play an entry in place; each other lens records the gap and its design pass", () => {
  const TICKETS = {
    "cut-paper": "#130",
    hion: "#132",
  };
  for (const [lens, ticket] of Object.entries(TICKETS)) {
    const why = GAPS[lens]?.lab?.["lab.preview"];
    assert.ok(why?.includes(ticket), `${lens} names ${ticket}`);
    assert.equal(isGap(lens, "lab", "lab.preview"), true, lens);
    // Only this part is left off: the entry's words are still owed.
    for (const part of ["lab.title", "lab.summary"])
      assert.equal(isGap(lens, "lab", part), false, `${lens} ${part}`);
  }
  for (const lens of ["daylight", "calling-card", "back-page"])
    assert.equal(isGap(lens, "lab", "lab.preview"), false, lens);
});
