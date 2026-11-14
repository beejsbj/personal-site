/** An experiment's cover and media in every lens (issue #121): on the Lab
 * the cover is somewhere on its card, and on its own page the media are
 * there, pictures and film. Read in the harness on lab-cover-media, a Lab
 * of one experiment that has a cover, two pictures and a film. A lens that
 * leaves one out says so in src/prism/parity.ts; none is here to say it.
 * How each lens draws them is looked at in its own design test.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Same server and Chromium as prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

const LENSES = ["calling-card", "cut-paper", "back-page", "hion"];
const SLUG = "fixture-study";
const COVER = "motion-path-graph.svg";
const PICTURE = "beating-shapes.png";
const FILM = "film.webm";

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "every lens shows an experiment's cover on the Lab and its media on its page",
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
    /** Every address the shell points a picture or a film at, wherever on
     * the page it sits. */
    const sources = async (lens, route) => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        reducedMotion: "reduce",
      });
      await context.route(
        (url) => url.origin !== base,
        (answer) => answer.fulfill({ contentType: "text/html", body: "" }),
      );
      const page = await context.newPage();
      await page.goto(
        `${base}/prism/harness?lens=${lens}&fixture=lab-cover-media&route=${encodeURIComponent(route)}`,
        { waitUntil: "load" },
      );
      await page.waitForSelector("html[data-shell-ready]", { timeout: 30000 });
      await page.waitForFunction(() => window.prismHarness?.ready);
      await page.waitForSelector("#lens-shell main", { timeout: 15000 });
      await page.waitForTimeout(700);
      const found = await page.evaluate(() => {
        const shell = document.querySelector("#lens-shell");
        const attrs = ["src", "poster", "data-src", "srcset", "style"];
        return [...shell.querySelectorAll("*")].flatMap((el) =>
          attrs.map((name) => el.getAttribute(name) ?? "").filter(Boolean),
        );
      });
      await context.close();
      return found.join(" ");
    };
    try {
      for (const lens of LENSES) {
        await suite.test(`${lens}: the cover is on the Lab`, async () => {
          assert.ok(
            (await sources(lens, "/lab")).includes(COVER),
            `${lens}'s Lab leaves out the experiment's cover`,
          );
        });
        await suite.test(`${lens}: the media are on its page`, async () => {
          const found = await sources(lens, `/lab/${SLUG}`);
          assert.ok(found.includes(PICTURE), `${lens} leaves out a picture`);
          assert.ok(found.includes(FILM), `${lens} leaves out the film`);
        });
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
