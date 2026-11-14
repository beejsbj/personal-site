/** The Labbook plays on the shared stage (issue #144): a Pen or a demo in
 * the Labbook is loaded by the same stage as a card's Pen
 * (src/lib/block-stage.ts), so starting one puts away any other on the
 * page, whichever place it is in, and Escape puts away the one playing.
 * Nothing is framed before a press (labbook-daylight.browser.mjs and
 * labbook-notebook.browser.mjs keep that one).
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Checked on /prism/fixtures/lab?fixture=preview, which has Pens to play on
 * its cards and, below, the fixture Labbook with a Pen and a demo. Every
 * request to another site is answered with a stub page, or refused. Same
 * server and Chromium as prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const ROOM = "/prism/fixtures/lab?fixture=preview";
const CARD = "fixture-pen-bare";
const BOOK_PEN = "u-fixture-replay";
const BOOK_DEMO = "u-fixture-demo";

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "a Labbook Pen plays one at a time with the cards",
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

    async function visit(options, look) {
      const context = await browser.newContext(options);
      await context.route("**/*", (route) => {
        const url = route.request().url();
        if (url.startsWith(base)) return route.continue();
        if (!/^https:\/\/(codepen\.io|example\.com|demo\.example)\//.test(url))
          return route.abort();
        return route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>stub</title><p>Stub piece.</p>",
        });
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
        await page.goto(`${base}${ROOM}`, { waitUntil: "load" });
        await look(page);
        assert.deepEqual(errors, [], "console errors");
      } finally {
        await context.close();
      }
    }

    /** Where each frame on the page is: in a card, or in a Labbook entry. */
    const playing = (page) =>
      page.evaluate(() =>
        [...document.querySelectorAll("iframe")].map(
          (frame) =>
            frame.closest("li[id^='u-']")?.id ??
            frame
              .closest("article")
              ?.querySelector("[data-part='lab.title']")?.dataset.ref ??
            "elsewhere",
        ),
      );
    const startCard = (page) =>
      page
        .locator(
          `article:has([data-part="lab.title"][data-ref="${CARD}"]) [data-block-toggle]`,
        )
        .click();
    const startBook = (page, id) =>
      page.locator(`#${id} [data-artifact-load]`).click();
    /** Whether a Labbook entry asks to be played, as a visitor sees it. */
    const waiting = (page, id) =>
      page.locator(`#${id} [data-artifact-load]`).isVisible();

    try {
      for (const [size, options] of Object.entries(SIZES)) {
        await t.test(
          `${size}: starting a card's Pen puts a Labbook Pen away, and the reverse`,
          () =>
            visit({ ...options, reducedMotion: "reduce" }, async (page) => {
              assert.deepEqual(await playing(page), [], "nothing playing");

              await startCard(page);
              await page.waitForSelector("iframe");
              assert.deepEqual(await playing(page), [CARD]);

              await startBook(page, BOOK_PEN);
              await page.waitForFunction(
                (id) => document.querySelector(`#${id} iframe`),
                BOOK_PEN,
              );
              assert.deepEqual(
                await playing(page),
                [BOOK_PEN],
                "only the Labbook's Pen is playing; the card's is put away",
              );
              assert.equal(
                await page
                  .locator(
                    `article:has([data-part="lab.title"][data-ref="${CARD}"]) [data-block-toggle]`,
                  )
                  .getAttribute("aria-pressed"),
                "false",
                "the card's control is back to asking",
              );

              await startCard(page);
              await page.waitForFunction(
                (id) => !document.querySelector(`#${id} iframe`),
                BOOK_PEN,
              );
              assert.deepEqual(
                await playing(page),
                [CARD],
                "only the card's Pen is playing; the Labbook's is put away",
              );
              assert.ok(
                await waiting(page, BOOK_PEN),
                "the Labbook's Pen asks to be played again",
              );
            }),
        );

        await t.test(
          `${size}: one Labbook piece at a time, and it can be played again after`,
          () =>
            visit({ ...options, reducedMotion: "reduce" }, async (page) => {
              await startBook(page, BOOK_PEN);
              await page.waitForFunction(
                (id) => document.querySelector(`#${id} iframe`),
                BOOK_PEN,
              );
              await startBook(page, BOOK_DEMO);
              await page.waitForFunction(
                (id) => document.querySelector(`#${id} iframe`),
                BOOK_DEMO,
              );
              assert.deepEqual(await playing(page), [BOOK_DEMO]);
              assert.ok(await waiting(page, BOOK_PEN));
              await startBook(page, BOOK_PEN);
              await page.waitForFunction(
                (id) => document.querySelector(`#${id} iframe`),
                BOOK_PEN,
              );
              assert.deepEqual(await playing(page), [BOOK_PEN]);
            }),
        );

        await t.test(
          `${size}: Escape puts away whichever is playing`,
          () =>
            visit({ ...options, reducedMotion: "reduce" }, async (page) => {
              // A card's: Escape from its control.
              await startCard(page);
              await page.waitForSelector("iframe");
              await page.keyboard.press("Escape");
              assert.deepEqual(await playing(page), [], "the card's is away");

              // A Labbook's: the frame has the focus once it plays, and a
              // key pressed inside someone else's page never reaches this
              // one, so Escape is pressed from the entry's own link.
              await startBook(page, BOOK_PEN);
              await page.waitForFunction(
                (id) => document.querySelector(`#${id} iframe`),
                BOOK_PEN,
              );
              await page.focus(`#${BOOK_PEN} figcaption a`);
              await page.keyboard.press("Escape");
              assert.deepEqual(await playing(page), [], "the Labbook's is away");
              assert.ok(await waiting(page, BOOK_PEN), "it asks again");
              assert.equal(
                await page.evaluate(
                  (id) =>
                    document.activeElement ===
                    document.querySelector(`#${id} [data-artifact-load]`),
                  BOOK_PEN,
                ),
                true,
                "the focus goes back to what asked for it",
              );
            }),
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
