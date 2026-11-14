/** Back Page's drawings belong to their entries (issue #167). The doodles
 * the Lab draws in the margin, on the Bench beside an experiment that holds
 * only words and large under the name on its own page, are each the one the
 * rule in drawings.ts chooses from that entry: drawn beside it, the same
 * on every visit, whatever else is on the list and whatever chance there is.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on /lab against /prism/content.json and on the harness's fixtures
 * (src/prism/fixtures.ts: lab-kinds, lab-no-cover). Same server and
 * Chromium as prism-parity.browser.mjs (or BASE=<origin>). LAB_SHOTS=<dir>
 * also saves pictures. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import { DRAWINGS, drawingFor } from "../../src/prism/shells/back-page/drawings.ts";
import { labPlaces } from "../../src/lib/rules.ts";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const SHOTS = process.env.LAB_SHOTS;
const OPEN = "#lens-shell .bp-spread";
const harness = (fixture, route) =>
  `/prism/harness?lens=back-page&fixture=${fixture}&route=${encodeURIComponent(route)}`;

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Back Page's drawings are the entries' own",
  { skip, timeout: 10 * 60_000 },
  async (suite) => {
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
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });

    /** The book open at `path`, at one size. `chance` is what Math.random
     * would say, so a drawing that is left to it shows. */
    const open = async (size, path, chance = 0.5) => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: "reduce",
      });
      await context.addInitScript((value) => {
        Math.random = () => value;
      }, chance);
      const errors = [];
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}${path}`, { waitUntil: "load" });
      await page.waitForSelector("html[data-shell-ready]", { timeout: 20000 });
      if (path.startsWith("/prism/harness"))
        await page.waitForFunction(() => window.prismHarness?.ready);
      await page.waitForSelector(`${OPEN} .bp-page`);
      await page.waitForTimeout(500);
      return { context, page, errors };
    };
    const next = (page) => page.locator("#lens-shell [data-prism-turn='next']");
    /** What `read` says of each view of the open chapter, turning its pages. */
    const leaf = async (page, read) => {
      const views = [];
      for (let i = 0; i < 60; i += 1) {
        views.push(await page.evaluate(read));
        if (!(await next(page).count())) break;
        await next(page).click();
        await page.waitForTimeout(450);
      }
      return views.flat();
    };
    /** Each drawing on the open pages: whose it is, what it is, whether it
     * sits beside that entry's name, and how it is written. */
    const drawn = () =>
      [...document.querySelectorAll("#lens-shell .bp-spread .bp-doodle")].map(
        (svg) => {
          const entry = svg.closest(".bp-labitem, .bp-page");
          const name = entry.querySelector("[data-part='lab.title']");
          const a = svg.getBoundingClientRect();
          const n = name.getBoundingClientRect();
          return {
            slug: name.dataset.ref,
            drawing: svg.dataset.drawing,
            index: svg.dataset.doodle,
            inEntry: !!svg.closest(".bp-labitem"),
            // beside the name, or under it on the entry's own page
            beside: a.right <= n.left + 1 || a.left >= n.right - 1,
            under: a.top >= n.bottom - 1,
            within: entry.contains(svg),
            markup: svg.outerHTML,
          };
        },
      );

    try {
      for (const size of Object.keys(SIZES)) {
        await suite.test(
          `${size}: each drawing on the Bench is the one its entry's rule chooses, drawn beside that entry`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("lab-kinds", "/lab"),
            );
            const { lab } = await page.evaluate(() => window.prismHarness.content);
            const found = await leaf(page, drawn);
            const bench = labPlaces(lab).find(({ place }) => place === "bench");
            const bare = bench.entries.filter(
              (entry) => !entry.preview && !entry.cover,
            );
            assert.ok(bare.length, "the fixture's Bench has words-only entries");
            assert.deepEqual(
              found.map((one) => one.slug).sort(),
              bare.map((entry) => entry.slug).sort(),
              "a drawing in the margin of each entry that holds only words, and no others",
            );
            for (const one of found) {
              const entry = lab.find((item) => item.slug === one.slug);
              assert.equal(one.drawing, drawingFor(entry), one.slug);
              assert.ok(DRAWINGS.includes(one.drawing));
              assert.equal(one.index, String(DRAWINGS.indexOf(one.drawing)));
              assert.ok(one.inEntry && one.within, `${one.slug}: in its own entry`);
              assert.ok(one.beside, `${one.slug}: beside its name, not over it`);
            }
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await suite.test(
          `${size}: the real Bench's drawings are the experiments' own, and each differs`,
          async () => {
            const { context, page, errors } = await open(size, "/lab");
            const { lab } = await (await fetch(`${base}/prism/content.json`)).json();
            const found = await leaf(page, drawn);
            assert.ok(found.length >= 3, "the real Bench has drawings");
            for (const one of found)
              assert.equal(
                one.drawing,
                drawingFor(lab.find((item) => item.slug === one.slug)),
                one.slug,
              );
            assert.equal(
              new Set(found.map((one) => one.drawing)).size,
              found.length,
              `no two the same: ${found.map((one) => one.drawing)}`,
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await suite.test(
          `${size}: an experiment has the same drawing on the list and on its own page, and under its name`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("lab-no-cover", "/lab"),
            );
            const listed = (await leaf(page, drawn)).find(
              (one) => one.slug === "fixture-sketch",
            );
            assert.ok(listed, "the sketch is drawn on the Bench");
            const own = await open(size, harness("lab-no-cover", "/lab/fixture-sketch"));
            const [page1] = await own.page.evaluate(drawn);
            assert.equal(page1.slug, "fixture-sketch");
            assert.equal(page1.drawing, listed.drawing);
            assert.ok(page1.under && page1.within, "drawn large under its name");
            assert.deepEqual([...errors, ...own.errors], []);
            await context.close();
            await own.context.close();
          },
        );

        await suite.test(
          `${size}: two visits draw the same, whatever chance says`,
          async () => {
            const pictures = [];
            for (const chance of [0.01, 0.99]) {
              const { context, page, errors } = await open(
                size,
                harness("lab-kinds", "/lab"),
                chance,
              );
              pictures.push(await leaf(page, drawn));
              assert.deepEqual(errors, []);
              await context.close();
            }
            assert.ok(pictures[0].length);
            assert.deepEqual(
              pictures[0].map((one) => one.markup),
              pictures[1].map((one) => one.markup),
              "the same strokes, drawing for drawing",
            );
          },
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
