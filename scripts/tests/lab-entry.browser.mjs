/** An experiment's own page in Daylight (issue #94): its pictures, links
 * and body, its part of the Labbook, and the project it graduated into.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * No experiment in src/content has all of these, so the page is read on
 * the fixture experiments (src/prism/fixtures.ts), which Daylight renders
 * at /prism/fixtures/lab/<slug> with the component /lab/<slug> uses.
 * Same server and Chromium as prism-parity.browser.mjs. LAB_SHOTS=<dir>
 * also saves a full-page picture of each page at each size. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import { REDACTION_MARKER } from "../../src/prism/labbook-fixture.ts";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const STUDY = "/prism/fixtures/lab/fixture-study";
const SKETCH = "/prism/fixtures/lab/fixture-sketch";
const POSTER = "/prism/fixtures/lab/fixture-poster";
const SHOTS = process.env.LAB_SHOTS;

/** What Daylight's page shows, as a visitor would find it. Pictures are
 * scrolled to first, since they load lazily. */
const read = (page) =>
  page.evaluate(async () => {
    const main = document.querySelector(".site-frame main");
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const all = (selector, root = main) => [
      ...(root?.querySelectorAll(selector) ?? []),
    ];
    const one = (name) => main.querySelector(`[data-part="${name}"]`);
    const images = [];
    for (const img of all("img", one("lab.media"))) {
      img.scrollIntoView();
      for (let i = 0; i < 50 && !img.complete; i += 1)
        await new Promise((done) => setTimeout(done, 100));
      images.push({
        src: img.getAttribute("src"),
        alt: img.alt,
        painted: img.naturalWidth > 0 && img.checkVisibility(),
      });
    }
    const films = [];
    for (const video of all("video", one("lab.media"))) {
      video.scrollIntoView();
      for (let i = 0; i < 50 && video.readyState < 1; i += 1)
        await new Promise((done) => setTimeout(done, 100));
      films.push({
        src: video.querySelector("source")?.getAttribute("src"),
        controls: video.controls,
        loaded: video.videoWidth > 0 && video.checkVisibility(),
      });
    }
    const wide = all("*").filter(
      (el) =>
        el.checkVisibility() &&
        el.getBoundingClientRect().right > window.innerWidth + 1,
    );
    return {
      h1: all("h1", document)
        .filter((el) => el.checkVisibility())
        .map(text),
      summary: text(one("lab.summary")),
      facts: all(".entry-page__label").map(text),
      // The strip the facts sit in, by how many it holds.
      strips: all(".entry-page__meta").map((strip) => strip.children.length),
      links: all("a", one("lab.links")).map((a) => ({
        label: text(a.querySelector(".link-label")),
        href: a.getAttribute("href"),
      })),
      images,
      films,
      captions: all("figcaption", one("lab.media")).map(text),
      bodyHeadings: all("h2", one("lab.body")).map(text),
      body: text(one("lab.body")),
      updates: all('[data-part="update.item"]').map((el) => ({
        id: el.getAttribute("data-ref"),
        title: text(el.querySelector(".event-title")),
        href: el.querySelector(".event-title a")?.getAttribute("href"),
        summary: text(el.querySelector(".event-detail")),
        date: el.querySelector("time")?.getAttribute("datetime"),
        dateLabel: text(el.querySelector("time")),
        shown: el.checkVisibility(),
      })),
      // Its part of the Labbook as listed: open and redacted, in order.
      listed: all(".entry-updates__list > li").map((item) => {
        const el = item.querySelector("[data-part]");
        return {
          part: el?.getAttribute("data-part"),
          id: el?.getAttribute("data-ref"),
          date: item.querySelector("time")?.getAttribute("datetime"),
          text: text(item),
          bars: all("[data-redaction-bar]", item).map((bar) => ({
            width: bar.getBoundingClientRect().width,
            shown: bar.checkVisibility(),
          })),
          controls: all("a, button, img, iframe, video, audio", item).length,
        };
      }),
      headings: all("h2").map(text),
      graduation: all('[data-part="lab.graduation"]').map((el) => ({
        text: text(el),
        href: el.querySelector("a")?.getAttribute("href"),
        shown: el.checkVisibility(),
      })),
      words: text(main),
      html: main.innerHTML,
      tooWide: wide.map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
    };
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "an experiment's page in Daylight",
  { skip, timeout: 10 * 60_000 },
  async (t) => {
    const { chromium: browserType } = await import("playwright-core");
    const external = process.env.BASE;
    if (!external)
      assert.ok(
        existsSync("dist/client/index.html"),
        "build first: dist/client is missing",
      );
    const server = external ? null : await serveRuntimeFixture();
    const base = external ?? server.base;
    const browser = await browserType.launch({ executablePath: executable });
    const content = await (await fetch(`${base}/prism/content.json`)).json();
    const { labels } = content.pages.lab.detail;

    /** Open a fixture's page at one size; `look` reads it. */
    async function visit(path, size, look) {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !/Failed to load resource/.test(message.text())
        )
          errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(`${base}${path}`, { waitUntil: "load" });
        const seen = await read(page);
        if (SHOTS) {
          mkdirSync(SHOTS, { recursive: true });
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({
            path: join(SHOTS, `${path.split("/").pop()}-${size}.png`),
            fullPage: true,
          });
        }
        await look(seen, page);
        assert.deepEqual(errors, [], "console errors");
      } finally {
        await context.close();
      }
    }

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `a lab entry with media, links and a body shows all three (${size})`,
          () =>
            visit(STUDY, size, (seen) => {
              assert.deepEqual(seen.h1, [
                "A study with everything on its page",
              ]);
              assert.match(seen.summary, /^An experiment that kept a record/);
              assert.deepEqual(seen.links, [
                {
                  label: "Open the Pen",
                  href: "https://codepen.io/beejsbj/pen/abXZWLQ",
                },
                { label: "Source", href: "https://example.com/source" },
              ]);
              assert.deepEqual(seen.images, [
                {
                  src: "/images/lab/motion-path-graph.svg",
                  alt: "A lotus drawn in orange and blue lines",
                  painted: true,
                },
                {
                  src: "/images/lab/beating-shapes.png",
                  alt: "Black and white shapes on a grid",
                  painted: true,
                },
              ]);
              assert.deepEqual(seen.films, [
                {
                  src: "/prism/fixtures/film.webm",
                  controls: true,
                  loaded: true,
                },
              ]);
              assert.deepEqual(seen.captions, [
                "The finished drawing.",
                "The lines, drawn one after another.",
              ]);
              assert.deepEqual(seen.bodyHeadings, [
                "How it was made",
                "What it taught me",
              ]);
              assert.match(seen.body, /measuring each path before drawing it/);
              assert.match(seen.body, /Measure the path ?Draw it over time/);
              assert.match(seen.body, /what carried over\.$/);
              assert.deepEqual(seen.tooWide, [], "nothing runs off the side");
            }),
        );

        await t.test(
          `an experiment that says little shows its cover, and no empty labels (${size})`,
          async () => {
            await visit(POSTER, size, (seen) => {
              assert.deepEqual(seen.h1, ["A poster and a paragraph"]);
              // No pictures of its own: the cover stands in.
              assert.deepEqual(seen.images, [
                {
                  src: "/images/lab/beating-shapes.png",
                  alt: "",
                  painted: true,
                },
              ]);
              // It graduated into nothing, so has no fact and no strip
              // for one, and it has no links.
              assert.deepEqual(seen.facts, []);
              assert.deepEqual(seen.strips, []);
              assert.deepEqual(seen.links, []);
              assert.match(seen.body, /^One paragraph, and the cover/);
              assert.deepEqual(seen.tooWide, [], "nothing runs off the side");
            });
            // What it graduated into is the only fact a page has.
            assert.deepEqual(Object.keys(labels).sort(), [
              "graduated",
              "updates",
            ]);
            await visit(STUDY, size, (seen) => {
              assert.deepEqual(seen.facts, [labels.graduated]);
              assert.deepEqual(seen.strips, [1]);
            });
          },
        );

        await t.test(
          `it lists the experiment's updates, newest first (${size})`,
          () =>
            visit(STUDY, size, (seen) => {
              assert.deepEqual(seen.updates, [
                {
                  id: "fixture-study-graduated",
                  title: "The study became a project",
                  // nowhere to go: text, not a link to its place in the Labbook
                  href: undefined,
                  summary:
                    "What started as one line has a home of its own now.",
                  date: "2026-09-30",
                  dateLabel: "30 Sep 2026",
                  shown: true,
                },
                {
                  id: "fixture-study-replay",
                  title: "A replay control, so it plays more than once",
                  href: "https://codepen.io/beejsbj/pen/abXZWLQ",
                  summary:
                    "The drawing can be watched again without reloading.",
                  date: "2026-09-12",
                  dateLabel: "12 Sep 2026",
                  shown: true,
                },
                {
                  id: "fixture-study-first-line",
                  title: "The first line draws itself",
                  href: undefined,
                  summary: "One path, measured and drawn from end to end.",
                  date: "2026-08-02",
                  dateLabel: "02 Aug 2026",
                  shown: true,
                },
              ]);
              assert.ok(
                seen.headings.includes(labels.updates),
                `the list is headed "${labels.updates}"`,
              );
            }),
        );

        await t.test(
          `a redacted update is listed in its place, as its shape and its date (${size})`,
          () =>
            visit(STUDY, size, async (seen, page) => {
              assert.deepEqual(
                seen.listed.map(({ part, id, date }) => ({ part, id, date })),
                [
                  {
                    part: "update.item",
                    id: "fixture-study-graduated",
                    date: "2026-09-30",
                  },
                  {
                    part: "update.item",
                    id: "fixture-study-replay",
                    date: "2026-09-12",
                  },
                  {
                    part: "update.redacted",
                    id: "fixture-study-kept-back",
                    date: "2026-08-20",
                  },
                  {
                    part: "update.item",
                    id: "fixture-study-first-line",
                    date: "2026-08-02",
                  },
                ],
              );
              const kept = seen.listed[2];
              const { redacted } = content.pages.lab.labbook;
              assert.equal(
                kept.text,
                `${redacted.label} ${redacted.works.code} ${redacted.bar} ${redacted.bar} ${redacted.bar} 20 Aug 2026`,
                "its name, its kind of work, a word for each bar and its date are all it says",
              );
              assert.equal(kept.controls, 0, "nothing to follow or play");
              // The fixture's shape is 4, 2, 3: a bar for each, a longer
              // number a longer bar.
              assert.equal(kept.bars.length, 3);
              assert.ok(kept.bars.every((bar) => bar.shown && bar.width > 0));
              const [first, second, third] = kept.bars.map((bar) => bar.width);
              assert.ok(
                first > third && third > second,
                `the bars keep their order (${first}, ${second}, ${third})`,
              );
              // The fixture writes the marker into every field a redacted
              // update must not have.
              assert.ok(
                !(await page.content()).includes(REDACTION_MARKER),
                "nothing it hides is in the page",
              );
              assert.deepEqual(seen.tooWide, [], "nothing runs off the side");
            }),
        );

        await t.test(
          `an experiment with no updates has no list of them (${size})`,
          () =>
            visit(SKETCH, size, (seen) => {
              assert.deepEqual(seen.h1, ["A sketch with no cover"]);
              assert.match(seen.body, /A paragraph about the sketch\./);
              assert.deepEqual(seen.updates, []);
              assert.ok(
                !seen.headings.includes(labels.updates),
                `no "${labels.updates}" heading`,
              );
              assert.ok(!seen.words.includes(labels.updates));
              assert.deepEqual(seen.tooWide, [], "nothing runs off the side");
            }),
        );

        await t.test(
          `an experiment that graduated links to the project it became (${size})`,
          async () => {
            // The fixture graduated into the first project there is.
            const [project] = content.projects;
            await visit(STUDY, size, async (seen, page) => {
              assert.equal(seen.graduation.length, 1);
              const [line] = seen.graduation;
              assert.ok(line.shown);
              assert.equal(
                line.text.replace(/\s/g, ""),
                `${labels.graduated}${project.title}`.replace(/\s/g, ""),
              );
              assert.equal(line.href, project.href);
              await page.click('[data-part="lab.graduation"] a');
              await page.waitForURL(`${base}${project.href}`);
              assert.equal(
                await page.locator("h1").first().innerText(),
                project.title,
              );
            });
            await visit(SKETCH, size, (seen) => {
              assert.deepEqual(seen.graduation, []);
              assert.ok(!seen.words.includes(labels.graduated));
            });
          },
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
