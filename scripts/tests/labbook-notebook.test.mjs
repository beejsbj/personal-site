import assert from "node:assert/strict";
import test from "node:test";
import {
  labbookMonths,
  labbookSubjects,
  monthLabel,
  narrowedTo,
  narrowHref,
  subjectsOf,
} from "../../src/lib/labbook.ts";
import { expectedParts, GAPS, isGap } from "../../src/prism/parity.ts";
import { PARTS } from "../../src/prism/parts.ts";

// The rules behind the Labbook as a notebook (issue #134): its months, the
// experiments and projects it can be narrowed to, and how the narrowing is
// written in the address. Every lens reads these; Daylight's page is looked
// at in a browser, in labbook-notebook.browser.mjs.

const update = (id, date, over = {}) => ({
  id,
  date,
  kind: "lab",
  source: "site",
  visibility: "open",
  title: `Update ${id}`,
  summary: "Something small.",
  ...over,
});
const kept = (id, date, over = {}) => ({
  id,
  date,
  kind: "project",
  source: "bjslab",
  visibility: "redacted",
  shape: { work: "code", parts: [3, 2] },
  ...over,
});

const shown = {
  lab: [
    { slug: "lotus", title: "Lotus", detail: "/lab/lotus" },
    {
      slug: "motion-path-graph",
      title: "Motion Path Graph",
      detail: "https://codepen.io/beejsbj/pen/abXZWLQ",
    },
  ],
  projects: [
    { slug: "dayshaper", title: "Dayshaper", href: "/projects/dayshaper" },
    { slug: "qrng", title: "QRNG Demo Apps", href: "/projects/qrng" },
  ],
};

test("the Labbook is kept by month: newest month first, and newest first in each", () => {
  const written = [
    update("first-petal", "2026-07-02"),
    update("b-same-day", "2026-09-01"),
    update("replay-control", "2026-09-26"),
    update("a-same-day", "2026-09-01"),
    update("new-year", "2027-01-03"),
    update("late-july", "2026-07-30"),
  ];
  const before = structuredClone(written);
  assert.deepEqual(
    labbookMonths(written).map(({ month, updates }) => [
      month,
      updates.map((u) => u.id),
    ]),
    [
      ["2027-01", ["new-year"]],
      ["2026-09", ["replay-control", "a-same-day", "b-same-day"]],
      // A month with nothing in it has no place: August is not here.
      ["2026-07", ["late-july", "first-petal"]],
    ],
  );
  assert.deepEqual(written, before, "what it was handed is left as it was");
  assert.deepEqual(labbookMonths([]), []);
});

test("a month is named in full, with its year", () => {
  assert.equal(monthLabel("2026-09"), "September 2026");
  assert.equal(monthLabel("2027-01"), "January 2027");
  assert.equal(monthLabel("2026-12"), "December 2026");
});

test("an update is about the experiment and the project it names that are shown", () => {
  assert.deepEqual(
    subjectsOf(
      update("x", "2026-09-01", {
        relatedExperiment: "lotus",
        relatedProject: "dayshaper",
      }),
      shown,
    ),
    [
      { kind: "experiment", slug: "lotus", title: "Lotus", href: "/lab/lotus" },
      {
        kind: "project",
        slug: "dayshaper",
        title: "Dayshaper",
        href: "/projects/dayshaper",
      },
    ],
  );
  // A project named by its title, as the older updates do, is known by its
  // slug all the same.
  assert.deepEqual(
    subjectsOf(
      update("y", "2026-06-20", { relatedProject: "QRNG Demo Apps" }),
      shown,
    ).map(({ kind, slug }) => [kind, slug]),
    [["project", "qrng"]],
  );
  // A redacted update is about what it names, too: its shape keeps that.
  assert.deepEqual(
    subjectsOf(
      kept("z", "2026-09-02", { relatedExperiment: "lotus" }),
      shown,
    ).map(({ slug }) => slug),
    ["lotus"],
  );
  assert.deepEqual(
    subjectsOf(
      update("w", "2026-09-01", { relatedExperiment: "roulette" }),
      shown,
    ),
    [],
    "something not shown is nothing the Labbook can be narrowed to",
  );
});

test("the Labbook can be narrowed to each experiment and project it is about, latest first", () => {
  const labbook = [
    update("first-petal", "2026-07-02", { relatedExperiment: "lotus" }),
    update("ring", "2026-09-26", { relatedProject: "dayshaper" }),
    kept("hidden-petal", "2026-09-20", { relatedExperiment: "lotus" }),
    update("graduated", "2026-08-01", {
      relatedExperiment: "lotus",
      relatedProject: "dayshaper",
    }),
    update("lottery", "2026-06-20", { relatedProject: "QRNG Demo Apps" }),
    update("plain", "2026-09-27"),
    update("gone", "2026-09-28", { relatedExperiment: "roulette" }),
  ];
  assert.deepEqual(labbookSubjects(labbook, shown), [
    {
      kind: "project",
      slug: "dayshaper",
      title: "Dayshaper",
      href: "/projects/dayshaper",
      count: 2,
    },
    // Its redacted update counts: it is among its entries.
    {
      kind: "experiment",
      slug: "lotus",
      title: "Lotus",
      href: "/lab/lotus",
      count: 3,
    },
    {
      kind: "project",
      slug: "qrng",
      title: "QRNG Demo Apps",
      href: "/projects/qrng",
      count: 1,
    },
  ]);
  assert.deepEqual(labbookSubjects([update("plain", "2026-09-27")], shown), []);
});

test("the address says what the Labbook is narrowed to, and lands on it", () => {
  assert.equal(
    narrowHref({ kind: "experiment", slug: "lotus" }),
    "/lab?experiment=lotus#labbook",
  );
  assert.equal(
    narrowHref({ kind: "project", slug: "dayshaper" }),
    "/lab?project=dayshaper#labbook",
  );
  assert.equal(narrowHref(undefined), "/lab#labbook", "and back to all of it");
  // Wherever the Labbook is, what else the address says stays; a narrowing
  // replaces the one before it.
  assert.equal(
    narrowHref(
      { kind: "project", slug: "dayshaper" },
      "/prism/fixtures/lab?labbook=notebook&experiment=lotus",
    ),
    "/prism/fixtures/lab?labbook=notebook&project=dayshaper#labbook",
  );
  assert.equal(
    narrowHref(
      undefined,
      "/prism/fixtures/lab?labbook=notebook&project=dayshaper",
    ),
    "/prism/fixtures/lab?labbook=notebook#labbook",
  );
});

test("the address is read back the same way", () => {
  assert.deepEqual(narrowedTo("?experiment=lotus"), {
    kind: "experiment",
    slug: "lotus",
  });
  assert.deepEqual(narrowedTo("?lens=hion&project=dayshaper"), {
    kind: "project",
    slug: "dayshaper",
  });
  assert.equal(narrowedTo(""), undefined);
  assert.equal(
    narrowedTo("?experiment="),
    undefined,
    "an empty name is nothing",
  );
  // Both at once is not a narrowing the Labbook offers: the experiment wins.
  assert.deepEqual(narrowedTo("?project=dayshaper&experiment=lotus"), {
    kind: "experiment",
    slug: "lotus",
  });
});

// As little of /prism/content.json as the Lab's route reads.
const content = {
  pages: {
    lab: {
      header: { title: "Small things.", intro: "My workshop." },
      more: { label: "More sketches" },
      aside: "Looking for more?",
    },
  },
  projects: shown.projects,
  lab: shown.lab.map((entry) => ({ ...entry, summary: "A try." })),
  labbook: [
    update("ring", "2026-09-26", { relatedProject: "dayshaper" }),
    kept("hidden-petal", "2026-09-20", { relatedExperiment: "lotus" }),
    update("first-petal", "2026-07-02", { relatedExperiment: "lotus" }),
    update("plain", "2026-06-27"),
  ],
};
const owed = (part) =>
  expectedParts({ kind: "lab", path: "/lab" }, content)
    .filter((expectation) => expectation.part === part)
    .map(({ ref, texts }) => ({ ref, texts }));

test("the Lab owes a heading for each month of the Labbook, named in full", () => {
  assert.ok(PARTS.includes("labbook.month"));
  assert.deepEqual(owed("labbook.month"), [
    { ref: "2026-09", texts: ["September 2026"] },
    { ref: "2026-07", texts: ["July 2026"] },
    { ref: "2026-06", texts: ["June 2026"] },
  ]);
});

test("the Lab owes a way to narrow the Labbook to each thing it is about", () => {
  assert.ok(PARTS.includes("labbook.subject"));
  assert.deepEqual(owed("labbook.subject"), [
    { ref: "project:dayshaper", texts: ["Dayshaper"] },
    { ref: "experiment:lotus", texts: ["Lotus"] },
  ]);
});

test("every lens groups and narrows the Labbook; a lens that did not would say which design pass will", () => {
  // Every design pass has drawn it (#128 to #132): no lens waits on one.
  const passes = {};
  for (const part of ["labbook.month", "labbook.subject"]) {
    for (const lens of ["daylight", "calling-card", "cut-paper", "back-page", "hion"])
      assert.equal(isGap(lens, "lab", part), false, `${lens} ${part}`);
    for (const [lens, ticket] of Object.entries(passes)) {
      assert.equal(isGap(lens, "lab", part), true, `${lens} ${part}`);
      assert.match(GAPS[lens].lab[part], new RegExp(ticket), `${lens} ${part}`);
    }
  }
  // Every update stays owed by every lens: a gap here is the grouping and
  // the narrowing, never the record.
  for (const lens of ["daylight", "calling-card", "cut-paper", "back-page", "hion"])
    for (const part of ["update.item", "update.redacted"])
      assert.equal(isGap(lens, "lab", part), false, `${lens} ${part}`);
});
