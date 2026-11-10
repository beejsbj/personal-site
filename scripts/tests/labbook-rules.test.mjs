import assert from "node:assert/strict";
import test from "node:test";
import {
  embedSrc,
  newestFirst,
  penEmbedSrc,
  penUser,
  relatedLinks,
} from "../../src/lib/labbook.ts";
import { expectedParts, GAPS, isGap } from "../../src/prism/parity.ts";
import { PARTS } from "../../src/prism/parts.ts";

// The rules behind the Labbook and the ticker as a page shows them (issue
// #95): the order, what an artifact's frame loads, what an update is about,
// and what every lens owes. The pages themselves are looked at in a
// browser, in labbook-daylight.browser.mjs.

test("the Labbook reads newest first, whatever order it was written in", () => {
  const written = [
    { id: "first-petal", date: "2026-08-02" },
    { id: "b-same-day", date: "2026-09-01" },
    { id: "replay-control", date: "2026-09-26" },
    { id: "a-same-day", date: "2026-09-01" },
  ];
  const before = structuredClone(written);
  assert.deepEqual(
    newestFirst(written).map((update) => update.id),
    // On one day, in id order.
    ["replay-control", "a-same-day", "b-same-day", "first-petal"],
  );
  assert.deepEqual(written, before);
});

test("a Pen's frame is built from its id, read out of a normal Pen URL", () => {
  const embed = "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result";
  for (const src of [
    "https://codepen.io/beejsbj/pen/abXZWLQ",
    "https://codepen.io/beejsbj/pen/abXZWLQ/",
    "https://codepen.io/beejsbj/pen/abXZWLQ?editors=1010",
    "https://codepen.io/beejsbj/full/abXZWLQ",
    "https://codepen.io/beejsbj/details/abXZWLQ",
    "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=html%2Cresult",
    "https://cdpn.io/beejsbj/fullpage/abXZWLQ/",
  ])
    assert.equal(penEmbedSrc(src), embed, src);
  assert.equal(
    penEmbedSrc("https://codepen.io/someone-else/pen/QWERTY"),
    "https://codepen.io/someone-else/embed/QWERTY?default-tab=result",
  );
});

test("a Pen named by its id alone is the site's own", () => {
  assert.equal(
    penEmbedSrc("abXZWLQ", "beejsbj"),
    "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
  );
  assert.equal(penEmbedSrc("abXZWLQ"), undefined, "no user, no Pen");
});

test("what is not a Pen has no Pen frame", () => {
  for (const src of [
    "https://example.com/beejsbj/pen/abXZWLQ",
    "https://codepen.io/beejsbj",
    "https://codepen.io/beejsbj/pen/",
    "/lab/somewhere",
    "",
  ])
    assert.equal(penEmbedSrc(src, "beejsbj"), undefined, src);
});

test("the site's Pens are whoever its CodePen address names", () => {
  const social = (...hrefs) => ({
    social: hrefs.map((href) => ({ label: "A fixture", href })),
  });
  assert.equal(
    penUser(
      social(
        "https://github.com/someone/",
        "https://codepen.io/beejsbj",
        "https://codepen.io/someone-else",
        "mailto:someone@example.com",
      ),
    ),
    "beejsbj",
    "the first CodePen address, by its name",
  );
  assert.equal(
    penUser(social("https://codepen.io/be-ej_sbj/pen/abXZWLQ?editors=1010")),
    "be-ej_sbj",
  );
  for (const href of [
    "https://example.com/codepen.io/beejsbj",
    "http://codepen.io/beejsbj",
    "https://codepen.io/",
  ])
    assert.equal(penUser(social(href)), undefined, href);
  assert.equal(penUser(social()), undefined, "no address, no one");
  // And that name owns a Pen written as its id alone.
  assert.equal(
    penEmbedSrc("abXZWLQ", penUser(social("https://codepen.io/beejsbj"))),
    "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
  );
});

test("only a Pen and a demo load into a frame, and a demo loads its own address", () => {
  const artifact = (kind, src) => ({ kind, src, alt: "A fixture" });
  assert.equal(
    embedSrc(artifact("pen", "https://codepen.io/beejsbj/pen/abXZWLQ")),
    "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
  );
  assert.equal(
    embedSrc(artifact("pen", "abXZWLQ"), "beejsbj"),
    "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
  );
  assert.equal(
    embedSrc(artifact("demo", "https://example.com/demo/")),
    "https://example.com/demo/",
  );
  for (const kind of ["image", "video", "sound"])
    assert.equal(embedSrc(artifact(kind, "/images/x.png")), undefined, kind);
});

const places = {
  lab: [
    {
      slug: "motion-path-graph",
      title: "Motion Path Graph",
      detail: "https://codepen.io/beejsbj/pen/abXZWLQ",
    },
    { slug: "cockpit", title: "Cockpit", detail: "/lab/cockpit" },
  ],
  projects: [
    { slug: "dayshaper", title: "Dayshaper", href: "/projects/dayshaper" },
    { slug: "qrng", title: "QRNG Demo Apps", href: "/projects/qrng" },
  ],
};

test("an update links to the experiment and the project it is about", () => {
  assert.deepEqual(
    relatedLinks(
      { relatedExperiment: "cockpit", relatedProject: "dayshaper" },
      places,
    ),
    [
      { kind: "experiment", title: "Cockpit", href: "/lab/cockpit" },
      { kind: "project", title: "Dayshaper", href: "/projects/dayshaper" },
    ],
  );
  assert.deepEqual(
    relatedLinks({ relatedExperiment: "motion-path-graph" }, places),
    [
      {
        kind: "experiment",
        title: "Motion Path Graph",
        href: "https://codepen.io/beejsbj/pen/abXZWLQ",
      },
    ],
  );
  assert.deepEqual(relatedLinks({}, places), []);
});

test("a project may be named by its title, as the older updates do", () => {
  assert.deepEqual(relatedLinks({ relatedProject: "QRNG Demo Apps" }, places), [
    { kind: "project", title: "QRNG Demo Apps", href: "/projects/qrng" },
  ]);
});

test("an update about something that is not shown links nowhere", () => {
  assert.deepEqual(
    relatedLinks(
      { relatedExperiment: "roulette", relatedProject: "Pizza Nano" },
      places,
    ),
    [],
  );
});

// As little of /prism/content.json as the lab and home routes read.
const open = (id, date, over = {}) => ({
  id,
  date,
  kind: "lab",
  source: "codepen",
  visibility: "open",
  title: `Update ${id}`,
  summary: "Something small happened, worth a note.",
  ...over,
});
const content = {
  pages: {
    home: {
      hero: {
        headline: "Burooj here!",
        greeting: "Hey there!",
        occupation: "Frontend developer",
        welcome: "Look around!",
      },
      work: { limit: 3 },
      updates: { limit: 1 },
      currently: { body: "Maintaining things." },
      elsewhere: { items: [] },
    },
    lab: {
      header: { title: "Small things.", intro: "My workshop." },
      more: { label: "More sketches" },
      aside: "Looking for more?",
    },
  },
  projects: [],
  featured: [],
  lab: [],
  updates: [
    { id: "replay-control", title: "Update replay-control" },
    { id: "first-petal", title: "Update first-petal" },
  ],
  labbook: [
    open("replay-control", "2026-09-26"),
    {
      id: "kept-private",
      date: "2026-09-20",
      kind: "project",
      source: "bjslab",
      visibility: "redacted",
      shape: { work: "code", bars: [4, 2, 3] },
    },
    open("first-petal", "2026-08-02"),
  ],
  headlines: [
    {
      id: "petals",
      date: "2026-09-26",
      text: "A lotus learns to draw itself twice",
      updates: ["replay-control", "first-petal"],
    },
    {
      id: "hush",
      date: "2026-09-20",
      text: "Something is afoot",
      updates: ["kept-private"],
    },
  ],
};
const owed = (kind, part) =>
  expectedParts({ kind, path: "/" }, content)
    .filter((expectation) => expectation.part === part)
    .map(({ ref, texts }) => ({ ref, texts }));

test("the Lab owes the whole Labbook: each open update by its title, each redacted one by its place", () => {
  assert.ok(PARTS.includes("update.redacted"));
  assert.deepEqual(owed("lab", "update.item"), [
    { ref: "replay-control", texts: ["Update replay-control"] },
    { ref: "first-petal", texts: ["Update first-petal"] },
  ]);
  // A redacted update has no words to compare: it only has to be there.
  assert.deepEqual(owed("lab", "update.redacted"), [
    { ref: "kept-private", texts: [] },
  ]);
});

test("the home page and the Lab owe every headline on the ticker", () => {
  assert.ok(PARTS.includes("ticker.headline"));
  const headlines = [
    { ref: "petals", texts: ["A lotus learns to draw itself twice"] },
    { ref: "hush", texts: ["Something is afoot"] },
  ];
  assert.deepEqual(owed("home", "ticker.headline"), headlines);
  assert.deepEqual(owed("lab", "ticker.headline"), headlines);
  // The home stream is still its own list, cut to its limit.
  assert.deepEqual(owed("home", "update.item"), [
    { ref: "replay-control", texts: ["Update replay-control"] },
  ]);
  assert.deepEqual(owed("home", "update.redacted"), []);
});

test("each lens that has no Labbook or ticker yet says so, naming its ticket", () => {
  const tickets = {
    "calling-card": "#96",
    "back-page": "#98",
  };
  for (const [lens, ticket] of Object.entries(tickets)) {
    for (const [kind, part] of [
      ["lab", "update.item"],
      ["lab", "update.redacted"],
      ["lab", "ticker.headline"],
      ["home", "ticker.headline"],
    ]) {
      assert.ok(isGap(lens, kind, part), `${lens} ${kind} ${part}`);
      assert.ok(
        GAPS[lens][kind][part].includes(ticket),
        `${lens} ${kind} ${part} names ${ticket}`,
      );
    }
  }
  assert.equal(isGap("daylight", "lab", "update.item"), false);
  assert.equal(isGap("daylight", "home", "ticker.headline"), false);
});
