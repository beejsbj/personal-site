/** Back Page's page numbers and the links that turn its pages (issue #120).
 * The lab book is numbered as it is written: its own pages from 1, then
 * each experiment's pages on from the last, however many pages the Lab
 * and the experiments before run to, with no number skipped or written
 * twice. And a footnote link in an essay turns the book to the page that
 * holds its note, and the note's own link turns it back.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on the real Lab against /prism/content.json, and on an essay with
 * a footnote served by the runtime fixture's stand-in for Substack. Same
 * server and Chromium as prism-parity.browser.mjs. LAB_ONLY=<regexp> runs
 * only the subtests it names. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import {
  fixturePost,
  serveRuntimeFixture,
} from "./lib/runtime-fixture.mjs";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const ONLY = process.env.LAB_ONLY ? new RegExp(process.env.LAB_ONLY) : null;
/** The pages lying open. */
const OPEN = "#lens-shell .bp-spread";
const real = (path) => `${path}?lens=back-page`;
/** Where a page's number is written: first at its head, its date after. */
const NUMBER = ".bp-page__head > span:first-child b";

/** An essay whose footnote is called in its first lines and written at its
 * end, many pages on, the way Substack writes one. */
const FOOTNOTED = "footnoted";
const footnoted = fixturePost(FOOTNOTED, {
  body_html: [
    '<p>A claim that wants a source.<a class="footnote-anchor" data-component-name="FootnoteAnchorToDOM" id="footnote-anchor-1" href="#footnote-1" target="_self">1</a></p>',
    ...Array.from(
      { length: 40 },
      (_, i) =>
        `<p>Paragraph ${i + 1} carries the argument on, a few lines at a time, so that the note at the end lies well past the page that calls it.</p>`,
    ),
    '<div class="footnote" data-component-name="FootnoteToDOM"><a id="footnote-1" href="#footnote-anchor-1" class="footnote-number" contenteditable="false" target="_self">1</a><div class="footnote-content"><p>The source the claim wanted.</p></div></div>',
  ].join(""),
});

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Back Page numbers its pages on and turns to a footnote",
  { skip, timeout: 20 * 60_000 },
  async (suite) => {
    const t = {
      test: (name, fn) =>
        suite.test(name, { skip: !!ONLY && !ONLY.test(name) }, fn),
    };
    const { chromium: browserType } = await import("playwright-core");
    assert.ok(
      existsSync("dist/client/index.html"),
      "build first: dist/client is missing",
    );
    const server = await serveRuntimeFixture({
      posts: [fixturePost(), footnoted],
    });
    const { base } = server;
    const browser = await browserType.launch({ executablePath: executable });
    const content = await (await fetch(`${base}/prism/content.json`)).json();

    /** The book open at `path`, at one size. */
    const open = async (size, path) => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: "reduce",
      });
      const errors = [];
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}${path}`, { waitUntil: "load" });
      await page.waitForSelector("html[data-shell-ready]", { timeout: 20000 });
      await page.waitForSelector(`${OPEN} .bp-page`);
      await page.waitForTimeout(500);
      return { context, page, errors };
    };
    const next = (page) => page.locator("#lens-shell [data-prism-turn='next']");
    /** The numbers written at the head of the open pages, left to right. */
    const numbers = (page) =>
      page.evaluate(([open, number]) =>
        [...document.querySelectorAll(`${open} .bp-page ${number}`)].map(
          (b) => b.textContent,
        ),
      [OPEN, NUMBER]);
    /** Every number written in the open chapter, read page by page as the
     * pages are turned, stopping where the chapter ends. */
    const chapterNumbers = async (page) => {
      const path = await page.evaluate(() => location.pathname);
      const all = [...(await numbers(page))];
      for (let i = 0; i < 80; i += 1) {
        if (!(await next(page).count())) break;
        const shown = (await numbers(page)).join();
        await next(page).click();
        // the last view's corner turns to the next chapter: stop there
        await page.waitForFunction(
          ([open, number, path, shown]) =>
            location.pathname !== path ||
            [...document.querySelectorAll(`${open} .bp-page ${number}`)]
              .map((b) => b.textContent)
              .join() !== shown,
          [OPEN, NUMBER, path, shown],
          { timeout: 10000 },
        );
        await page.waitForTimeout(450);
        if ((await page.evaluate(() => location.pathname)) !== path) break;
        all.push(...(await numbers(page)));
      }
      return all;
    };
    /** The number written at the head of the open page holding `selector`,
     * or null when no open page holds it. */
    const pageOf = (page, selector) =>
      page.evaluate(
        ([open, number, selector]) => {
          const el = document.querySelector(`${open} ${selector}`);
          const no = el?.closest(".bp-page")?.querySelector(number)?.textContent;
          return no ? Number(no) : null;
        },
        [OPEN, NUMBER, selector],
      );

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: the lab book's page numbers run on from the Lab into each experiment's pages`,
          async () => {
            const chapters = [
              "/lab",
              ...content.lab.filter((item) => item.hasPage).map((item) => item.detail),
            ];
            assert.ok(chapters.length > 1, "the Lab has an experiment with a page");
            let last = 0;
            for (const path of chapters) {
              const { context, page, errors } = await open(size, real(path));
              const written = await chapterNumbers(page);
              assert.ok(written.length, `${path} has numbered pages`);
              assert.ok(
                written.every((no) => /^\d+$/.test(no)),
                `${path}: every page is numbered (${written.join(", ")})`,
              );
              const expected = written.map((_, i) => String(last + 1 + i));
              assert.deepEqual(
                written,
                expected,
                `${path} runs on from page ${last}, without a gap or a repeat`,
              );
              last += written.length;
              assert.deepEqual(errors, [], `${path}: no errors`);
              await context.close();
            }
          },
        );

        await t.test(
          `${size}: an essay's footnote turns to the page holding its note, and back`,
          async () => {
            const { context, page, errors } = await open(
              size,
              real(`/writing/${FOOTNOTED}`),
            );
            const call = 'a[href="#ss-footnote-1"]';
            const note = '[id="ss-footnote-1"]';
            const from = await pageOf(page, call);
            assert.ok(from, "the footnote's call is on the opening pages");
            assert.equal(
              await pageOf(page, note),
              null,
              "the note lies on a later page, not the open one",
            );

            await page.locator(`${OPEN} ${call}`).click();
            await page.waitForFunction(
              ([open, note]) => !!document.querySelector(`${open} ${note}`),
              [OPEN, note],
              { timeout: 10000 },
            );
            await page.waitForTimeout(450);
            const to = await pageOf(page, note);
            assert.ok(to > from, `the book turned on to the note (${from} to ${to})`);
            assert.equal(
              await page.evaluate(() => location.hash),
              "#ss-footnote-1",
              "the address says where",
            );
            assert.equal(
              await pageOf(page, call),
              null,
              "the page calling the note is turned away",
            );

            await page.locator(`${OPEN} a[href="#ss-footnote-anchor-1"]`).click();
            await page.waitForFunction(
              ([open, call]) => !!document.querySelector(`${open} ${call}`),
              [OPEN, call],
              { timeout: 10000 },
            );
            await page.waitForTimeout(450);
            assert.equal(
              await pageOf(page, call),
              from,
              "the note's own link turns back to the page that calls it",
            );

            await page.goBack();
            await page.waitForFunction(
              ([open, note]) => !!document.querySelector(`${open} ${note}`),
              [OPEN, note],
              { timeout: 10000 },
            );
            await page.waitForTimeout(450);
            assert.equal(await pageOf(page, note), to, "Back turns to the note again");
            assert.deepEqual(errors, [], "no errors");
            await context.close();
          },
        );
      }
    } finally {
      await browser.close();
      await server.close();
    }
  },
);
