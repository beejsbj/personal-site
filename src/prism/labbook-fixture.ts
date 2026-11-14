/** A fixture Labbook: every state the Labbook can show, whatever
 * src/content holds. The shells meet it in the harness (the `labbook`
 * fixture in ./fixtures); Daylight renders it at /prism/fixtures/lab.
 *
 * Plain data with no runtime imports, so the Node tests load it too. */
import type { Update } from "../lib/labbook";

/** Written into every field a redacted update must not have. It is on no
 * page: a lens that shows it is showing hidden words. */
export const REDACTION_MARKER = "fixture-words-nobody-may-read";

/** What a redacted update must never arrive with: words outside its shape.
 * The schema refuses them (scripts/tests/labbook-daylight.test.mjs);
 * should some get past, a lens still draws its shape and nothing else. */
const hidden = {
  title: `${REDACTION_MARKER}: the title`,
  summary: `${REDACTION_MARKER}: the summary`,
  href: `/lab/${REDACTION_MARKER}`,
  linkLabel: `${REDACTION_MARKER}: the link`,
  artifact: {
    kind: "image",
    src: `/images/${REDACTION_MARKER}.png`,
    alt: `${REDACTION_MARKER}: the picture`,
  },
};

/** A redacted update that is bars alone. */
const keptBack = {
  id: "fixture-kept-back",
  date: "2026-08-20",
  kind: "project",
  source: "bjslab",
  visibility: "redacted",
  shape: { work: "code", parts: [5, 3, 8, 4] },
  ...hidden,
} as Update;

/** A redacted update that shows a few of its words: its line reads
 * "Rewired ████ ██ the ██████". */
const halfSaid = {
  id: "fixture-half-said",
  date: "2026-08-24",
  kind: "project",
  source: "bjslab",
  visibility: "redacted",
  shape: { work: "design", parts: ["Rewired", 4, 2, "the", 6] },
  ...hidden,
} as Update;

const PEN = "https://codepen.io/beejsbj/pen/abXZWLQ";

/** The Labbook as written: oldest first. `experiments` are the slugs of
 * two experiments on the page, `project` the slug of a project. */
export const labbookFixture = ({
  experiments = [],
  project,
}: { experiments?: string[]; project?: string } = {}): {
  labbook: Update[];
} => ({
  labbook: [
    {
      id: "fixture-first-line",
      date: "2026-08-02",
      kind: "lab",
      source: "codepen",
      relatedExperiment: experiments[0],
      visibility: "open",
      title: "The first line draws itself",
      summary: "One path, measured and drawn from end to end.",
      artifact: {
        kind: "image",
        src: "/images/lab/motion-path-graph.svg",
        alt: "A lotus drawn in orange and blue lines",
      },
    },
    keptBack,
    halfSaid,
    {
      id: "fixture-film",
      date: "2026-08-28",
      kind: "lab",
      source: "site",
      visibility: "open",
      title: "A film of the lines, one after another",
      summary: "Two seconds of it, recorded so it can be watched anywhere.",
      artifact: {
        kind: "video",
        src: "/prism/fixtures/film.webm",
        alt: "The lines of the drawing appearing one after another",
        poster: "/images/lab/beating-shapes.png",
      },
    },
    {
      id: "fixture-replay",
      date: "2026-09-12",
      kind: "lab",
      source: "codepen",
      relatedExperiment: experiments[1],
      visibility: "open",
      title: "A replay control, so it plays more than once",
      summary: "The drawing can be watched again without reloading.",
      href: PEN,
      linkLabel: "Open the Pen",
      artifact: {
        kind: "pen",
        src: PEN,
        alt: "The lotus drawing itself, with a replay button",
        poster: "/images/lab/motion-path-graph.svg",
      },
    },
    {
      id: "fixture-demo",
      date: "2026-09-18",
      kind: "repository",
      source: "github",
      relatedProject: project,
      visibility: "open",
      title: "A demo with nothing to show until it runs",
      summary:
        "No poster for this one: only what it is, and a way to start it.",
      artifact: {
        kind: "demo",
        src: "https://example.com/fixture-demo/",
        alt: "A grid of shapes that beat in time",
      },
    },
    {
      id: "fixture-tone",
      date: "2026-09-20",
      kind: "lab",
      source: "manual",
      visibility: "open",
      title: "The tone the shapes beat to",
      summary: "A quarter of a second of it.",
      artifact: {
        kind: "sound",
        src: "/prism/fixtures/tone.wav",
        alt: "A short, steady tone",
      },
    },
    {
      id: "fixture-graduated",
      date: "2026-09-30",
      kind: "milestone",
      source: "site",
      relatedProject: project,
      relatedExperiment: experiments[1],
      visibility: "open",
      title: "The study became a project",
      summary: "What started as one line has a home of its own now.",
      href: "/projects",
      linkLabel: "See the projects",
    },
  ],
});
