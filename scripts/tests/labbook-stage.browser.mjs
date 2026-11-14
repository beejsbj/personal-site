/** The Labbook plays on the shared stage (issues #144, #156): a Pen or a
 * demo in the Labbook is loaded by the same stage as a card's Pen
 * (src/lib/block-stage.ts), in Daylight and in each of the four lenses, so
 * starting one puts away any other on the page, whichever place it is in,
 * and Escape puts away the one playing. Every frame is made by the stage:
 * sandboxed, with the stage's referrer policy. Nothing is framed before a
 * press (labbook-daylight.browser.mjs and labbook-notebook.browser.mjs keep
 * that one).
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Daylight is checked on /prism/fixtures/lab?fixture=preview, which has Pens
 * to play on its cards and, below, the fixture Labbook with a Pen and a demo;
 * each lens on the harness, with the `labbook` fixture. Every request to another site is answered with a stub page, or refused. Same
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
const LENSES = ["calling-card", "cut-paper", "back-page", "hion"];
const lensRoom = (lens) =>
  `/prism/harness?lens=${lens}&fixture=labbook&route=${encodeURIComponent("/lab")}`;
/** What asks for a Labbook piece to play: the stage answers it. */
const ASK = "[data-artifact-load]";

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

    async function visit(options, look, room = ROOM, hold = null) {
      const context = await browser.newContext(options);
      await context.route("**/*", async (route) => {
        const url = route.request().url();
        if (url.startsWith(base)) return route.continue();
        if (!/^https:\/\/(codepen\.io|example\.com|demo\.example)\//.test(url))
          return route.abort();
        // A page held back is a frame still loading.
        await hold;
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
        await page.goto(`${base}${room}`, { waitUntil: "load" });
        if (room.startsWith("/prism/harness")) {
          await page.waitForSelector("html[data-shell-ready]", {
            timeout: 30000,
          });
          await page.waitForFunction(() => window.prismHarness?.ready);
        }
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

        for (const lens of LENSES) {
          // The page under a lens's shell holds the same ids, hidden: only
          // what the shell shows is read.
          const piece = (id) => `#lens-shell [id="${id}"]`;
          const frames = (page) =>
            page.evaluate(
              () =>
                [...document.querySelectorAll("#lens-shell iframe")].map(
                  (frame) => ({
                    id: frame.closest("[id^='u-']")?.id ?? "elsewhere",
                    sandbox: frame.getAttribute("sandbox"),
                    referrerPolicy: frame.referrerPolicy,
                    allow: frame.allow,
                  }),
                ),
            );
          /** Bring the piece into view as a visitor would: Back Page keeps
           * its Labbook on pages, so the book is turned to the one it is on. */
          const reveal = async (page, id) => {
            if (lens !== "back-page")
              return page.waitForSelector(piece(id), { state: "attached" });
            const turn = (which) =>
              page.locator(
                which === "next"
                  ? "#lens-shell [data-prism-turn='next']"
                  : "#lens-shell button.bp-corner--prev",
              );
            const here = () =>
              page.locator(`#lens-shell .bp-spread [id="${id}"]`).count();
            let step = "next";
            for (let i = 0; i < 80 && !(await here()); i += 1) {
              if (step === "next" && !(await turn("next").count()))
                step = "prev";
              assert.ok(await turn(step).count(), `${id} is in the book`);
              await turn(step).click();
              await page.waitForTimeout(450);
            }
            assert.ok(await here(), `${id} is on an open page`);
          };
          const start = async (page, id) => {
            await reveal(page, id);
            await page.locator(`${piece(id)} ${ASK}`).click();
          };
          const framed = (page, id) =>
            page.waitForFunction(
              (selector) => document.querySelector(selector),
              `${piece(id)} iframe`,
            );
          const asking = async (page, id) => {
            await reveal(page, id);
            return page.locator(`${piece(id)} ${ASK}`).isVisible();
          };

          await t.test(
            `${size}, ${lens}: one Labbook piece at a time, in a sandbox`,
            () =>
              visit(
                { ...options, reducedMotion: "reduce" },
                async (page) => {
                  assert.deepEqual(await frames(page), [], "nothing before a press");
                  await start(page, BOOK_PEN);
                  await framed(page, BOOK_PEN);
                  await start(page, BOOK_DEMO);
                  await framed(page, BOOK_DEMO);
                  const now = await frames(page);
                  assert.deepEqual(
                    now.map((frame) => frame.id),
                    [BOOK_DEMO],
                    "the demo has put the Pen away",
                  );
                  assert.ok(await asking(page, BOOK_PEN), "the Pen asks again");
                  await start(page, BOOK_PEN);
                  await framed(page, BOOK_PEN);
                  const again = await frames(page);
                  assert.deepEqual(
                    again.map((frame) => frame.id),
                    [BOOK_PEN],
                    "and the Pen has put the demo away",
                  );
                  for (const frame of again) {
                    assert.match(frame.sandbox, /allow-scripts/);
                    assert.doesNotMatch(
                      frame.sandbox,
                      /allow-(top-navigation|forms|modals|downloads)/,
                    );
                    assert.equal(frame.referrerPolicy, "strict-origin");
                    assert.equal(frame.allow, "fullscreen");
                  }
                },
                lensRoom(lens),
              ),
          );

          await t.test(
            `${size}, ${lens}: a piece keeps its size while its frame is still loading`,
            async () => {
              let release;
              const held = new Promise((done) => (release = done));
              try {
                await visit(
                { ...options, reducedMotion: "reduce" },
                async (page) => {
                  const measure = () =>
                    page.evaluate((id) => {
                      const entry = document.querySelector(
                        `#lens-shell [id="${id}"]`,
                      );
                      const stage = entry.querySelector("[data-block-stage]");
                      const box = (el) => {
                        const { width, height } = el.getBoundingClientRect();
                        return [Math.round(width), Math.round(height)];
                      };
                      return {
                        stage: box(stage),
                        entry: box(entry),
                        live: stage.dataset.live ?? null,
                      };
                    }, BOOK_PEN);
                  await reveal(page, BOOK_PEN);
                  const before = await measure();
                  await start(page, BOOK_PEN);
                  await framed(page, BOOK_PEN);
                  const loading = await measure();
                  assert.equal(loading.live, "loading", "the frame is still loading");
                  assert.deepEqual(loading.stage, before.stage, "its stage keeps its size");
                  assert.deepEqual(loading.entry, before.entry, "and so does its entry");
                  release();
                  await page.waitForFunction(
                    (selector) =>
                      document.querySelector(selector)?.dataset.live === "on",
                    `${piece(BOOK_PEN)} [data-block-stage]`,
                  );
                  const after = await measure();
                  assert.deepEqual(after.stage, before.stage);
                  assert.deepEqual(after.entry, before.entry);
                },
                lensRoom(lens),
                held,
                );
              } finally {
                release();
              }
            },
          );

          await t.test(
            `${size}, ${lens}: Escape puts away whichever is playing, and stays on the Labbook`,
            () =>
              visit(
                { ...options, reducedMotion: "reduce" },
                async (page) => {
                  await start(page, BOOK_PEN);
                  await framed(page, BOOK_PEN);
                  // A key pressed inside someone else's page never reaches
                  // this one, so Escape is pressed from the entry's own link.
                  await page.focus(`${piece(BOOK_PEN)} figcaption a`);
                  await page.keyboard.press("Escape");
                  assert.deepEqual(await frames(page), [], "the Pen is away");
                  assert.ok(await asking(page, BOOK_PEN), "it asks again");
                  assert.ok(
                    await page.locator(piece(BOOK_PEN)).isVisible(),
                    "Escape did not also take the visitor off the Labbook",
                  );
                },
                lensRoom(lens),
              ),
          );
        }
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
