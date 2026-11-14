/** Daylight's design pass of the Lab (issue #128): the Bench is a mat that
 * experiments lie on as what they hold, the Shelf boards they stand on; an
 * experiment's page is laid out as a notebook's spreads and plates, not
 * stacked; each month of the Labbook has its page of a calendar.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on fixtures, whatever src/content holds: /prism/fixtures/lab?fixture=kinds
 * (every kind of card in both places), the fixture experiments'
 * pages, and the fixture Labbook (?labbook=notebook). BASE=<origin> runs
 * it against a server already up; LAB_ONLY=<regexp> runs the subtests
 * whose names match. Same server and Chromium as prism-parity.browser.mjs. */
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
const KINDS = "/prism/fixtures/lab?fixture=kinds";
const NOTEBOOK = "/prism/fixtures/lab?labbook=notebook";
const BLOCKS = "/prism/fixtures/lab/fixture-blocks";
const ONLY = process.env.LAB_ONLY && new RegExp(process.env.LAB_ONLY);

/** What each card in the kinds fixture holds, and so how it lies: its
 * place, and how many pictures it shows. */
const CARDS = {
  "fixture-kinds-featured": ["bench", "prints", 3],
  "fixture-kinds-print": ["bench", "print", 1],
  "fixture-kinds-words": ["bench", "words", 0],
  "fixture-kinds-pen": ["bench", "play", 1],
  "fixture-kinds-stack": ["bench", "prints", 2],
  "fixture-kinds-note": ["bench", "words", 0],
  "fixture-kinds-shelved": ["shelf", "print", 1],
  "fixture-kinds-shelf-pen": ["shelf", "play", 1],
  "fixture-kinds-shelf-stack": ["shelf", "prints", 2],
  "fixture-kinds-shelf-words": ["shelf", "words", 0],
};

/** The room's cards as laid: what each holds, its pictures, whether any
 * picture can be reached by the keyboard or is named aloud, how its piece
 * is turned, and where its board is. */
const room = (page) =>
  page.evaluate(() => {
    const turned = (el) => {
      const { rotate } = getComputedStyle(el);
      return rotate === "none" ? 0 : parseFloat(rotate);
    };
    const cards = [...document.querySelectorAll("main [data-lab-place] article")];
    return {
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      mats: Object.fromEntries(
        [...document.querySelectorAll("main [data-lab-place]")].map((place) => [
          place.dataset.labPlace,
          getComputedStyle(place.querySelector("ul")).backgroundImage,
        ]),
      ),
      cards: cards.map((card) => {
        const piece =
          card.querySelector(".lab-card__object > *") ??
          card.querySelector(".ds-note");
        // The board is under the piece, or, where a piece has a board to
        // itself, under the whole card.
        const object = card.querySelector(".lab-card__object");
        const board = (
          getComputedStyle(card).borderBottomStyle === "none" ? object : card
        )?.getBoundingClientRect();
        return {
          slug: card.querySelector("[data-part='lab.title']").dataset.ref,
          place: card.closest("[data-lab-place]").dataset.labPlace,
          holds: card.dataset.holds,
          pictures: card.querySelectorAll("img").length,
          // A picture is the title link's pointer shortcut, never another
          // stop for the keyboard or another name read aloud.
          spoken: [...card.querySelectorAll("img")].filter(
            (img) => img.alt || !img.closest("[aria-hidden='true']"),
          ).length,
          slip: !!card.querySelector(".ds-note"),
          turn: piece ? turned(piece) : null,
          board: board && {
            left: Math.round(board.left),
            right: Math.round(board.right),
            bottom: Math.round(board.bottom),
          },
        };
      }),
    };
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Daylight's design pass of the Lab",
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
    const t = {
      test: (name, fn) =>
        suite.test(name, { skip: !!ONLY && !ONLY.test(name) }, fn),
    };
    const open = async (size, path, motion = "reduce") => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: motion,
      });
      // Nothing here leaves the test.
      await context.route(
        (url) => url.origin !== base,
        (route) => route.fulfill({ contentType: "text/html", body: "" }),
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
      assert.equal(response.status(), 200, `${path} answers`);
      return { context, page, errors };
    };

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: on the Bench each card lies as what it holds; on the Shelf it stands straight on its board`,
          async () => {
            const { context, page, errors } = await open(size, KINDS);
            const seen = await room(page);
            await context.close();
            assert.equal(seen.overflow, 0, "nothing wider than the screen");
            assert.deepEqual(errors, []);
            assert.deepEqual(
              Object.fromEntries(
                seen.cards.map((card) => [
                  card.slug,
                  [card.place, card.holds, card.pictures],
                ]),
              ),
              CARDS,
            );
            for (const card of seen.cards) {
              assert.equal(card.spoken, 0, `${card.slug}: a picture is said`);
              // With no picture, a card on the Bench is a slip; one on the
              // Shelf stands as a block with its initial.
              assert.equal(
                card.slip,
                card.holds === "words" && card.place === "bench",
                `${card.slug}: slip`,
              );
              if (card.place === "bench")
                assert.notEqual(card.turn, 0, `${card.slug} lies straight`);
              else assert.equal(card.turn, 0, `${card.slug} leans`);
            }
            assert.match(seen.mats.bench, /linear-gradient/, "the mat");
            assert.equal(seen.mats.shelf, "none", "the Shelf has no mat");
            // The boards abreast meet, at one height, as one shelf; on a
            // phone each piece has a board of its own.
            const boards = seen.cards
              .filter((card) => card.place === "shelf")
              .map((card) => card.board);
            const rows = Object.values(
              Object.groupBy(boards, (board) => board.bottom),
            );
            assert.equal(
              rows.length,
              size === "desktop" ? 1 : boards.length,
              `rows of boards: ${JSON.stringify(boards)}`,
            );
            for (const row of rows)
              for (let i = 1; i < row.length; i += 1)
                assert.ok(
                  Math.abs(row[i].left - row[i - 1].right) <= 1,
                  `boards meet: ${JSON.stringify(row)}`,
                );
          },
        );

        await t.test(
          `${size}: the keyboard goes from each card's title to its play button, card by card, and nowhere else in a card`,
          async () => {
            const { context, page } = await open(size, KINDS);
            const expected = Object.entries(CARDS).flatMap(([slug, [, holds]]) =>
              holds === "play" ? [`title:${slug}`, `play:${slug}`] : [`title:${slug}`],
            );
            await page.locator("[data-part='lab.title'] a").first().focus();
            const stops = [];
            for (let i = 0; i < expected.length; i += 1) {
              stops.push(
                await page.evaluate(() => {
                  const el = document.activeElement;
                  const card = el.closest("article");
                  const slug = card?.querySelector("[data-part='lab.title']")
                    ?.dataset.ref;
                  const what = el.matches("[data-block-toggle]")
                    ? "play"
                    : el.closest("[data-part='lab.title']")
                      ? "title"
                      : el.tagName.toLowerCase();
                  const ring = getComputedStyle(el).outlineStyle;
                  return { stop: `${what}:${slug}`, ring };
                }),
              );
              await page.keyboard.press("Tab");
            }
            await context.close();
            assert.deepEqual(
              stops.map((s) => s.stop),
              expected,
            );
            for (const { stop, ring } of stops)
              assert.notEqual(ring, "none", `${stop} shows where focus is`);
          },
        );

        await t.test(
          `${size}: an experiment's page is laid out as spreads and plates, every block in the order it is read`,
          async () => {
            const { context, page } = await open(size, BLOCKS);
            const box = (selector) =>
              page
                .locator(selector)
                .first()
                .evaluate((el) => {
                  const r = el.getBoundingClientRect();
                  return {
                    top: Math.round(r.top + scrollY),
                    bottom: Math.round(r.bottom + scrollY),
                    left: Math.round(r.left),
                    right: Math.round(r.right),
                  };
                });
            const block = (name) =>
              box(`[data-ref="fixture-blocks/${name}"]`);
            const heading = await box("[data-part='lab.body'] h2:has-text('How it was made')");
            const quote = await block("in-my-words");
            const trick = await block("the-trick");
            const files = await block("files");
            const steps = await page
              .locator(`[data-ref="fixture-blocks/how"] > li`)
              .evaluateAll((items) =>
                items.map((li) => Math.round(li.getBoundingClientRect().top)),
              );
            const drawings = await page
              .locator(`[data-ref="fixture-blocks/drawings"] > figure`)
              .evaluateAll((items) =>
                items.map((el) => {
                  const r = el.getBoundingClientRect();
                  return { top: r.top, left: r.left, right: r.right };
                }),
              );
            const pen = await block("the-pen");
            const stage = await box(`[data-ref="fixture-blocks/the-pen"] [data-block-stage]`);
            const bar = await box(`[data-ref="fixture-blocks/the-pen"] .block-stage__bar`);
            // Every block and the words between, top to bottom in the
            // order written, on a phone; beside each other where there is
            // room.
            const order = await page
              .locator("[data-part='lab.body'] :is([data-part^='block.'], .blocks-spread__text)")
              .evaluateAll((els) =>
                els.map((el) => Math.round(el.getBoundingClientRect().top)),
              );
            const overflow = await page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
            );
            await context.close();
            assert.equal(overflow, 0, "nothing wider than the screen");
            if (size === "desktop") {
              assert.ok(quote.left > heading.right, "the quote stands beside its words");
              assert.ok(quote.top < heading.bottom, "level with them");
              assert.equal(trick.top, files.top, "code and files side by side");
              assert.ok(files.left > trick.right);
              assert.equal(new Set(steps).size, 1, "the steps run across");
              assert.ok(
                drawings[1].left > drawings[0].right &&
                  drawings[1].top < drawings[0].top + 1,
                "the gallery is a sheet, its pictures beside the first",
              );
              assert.ok(
                bar.left >= stage.right && bar.top < stage.bottom,
                "something live has its label beside it",
              );
              assert.ok(pen.right - pen.left > quote.right - quote.left);
            } else {
              for (let i = 1; i < order.length; i += 1)
                assert.ok(order[i] > order[i - 1], `in order: ${order}`);
              for (let i = 1; i < steps.length; i += 1)
                assert.ok(steps[i] > steps[i - 1], "steps run down");
            }
          },
        );

        await t.test(
          `${size}: an experiment's head is its card: a print beside the words, a sheet under them, or a slip`,
          async () => {
            const look = async (slug) => {
              const { context, page } = await open(size, `/prism/fixtures/lab/${slug}`);
              const seen = await page.evaluate(() => {
                const r = (el) => el?.getBoundingClientRect();
                const title = r(document.querySelector("[data-part='lab.title']"));
                const media = document.querySelector("[data-part='lab.media']");
                const items = [...(media?.children ?? [])].map(r);
                return {
                  slip: !!document.querySelector("[data-part='lab.title']").closest(".ds-note"),
                  beside: !!items[0] && items[0].left > title.right,
                  under: !!items[0] && items[0].top > title.bottom,
                  lead: items.length > 1 && items[0].width > items[1].width,
                };
              });
              await context.close();
              return seen;
            };
            const poster = await look("fixture-poster");
            assert.equal(poster.slip, false);
            assert.equal(poster.beside, size === "desktop", "one print beside");
            const study = await look("fixture-study");
            assert.equal(study.under, true, "a sheet under the words");
            assert.equal(study.lead, size === "desktop", "the first the largest");
            const sketch = await look("fixture-sketch");
            assert.equal(sketch.slip, true, "no picture: a slip");
          },
        );

        await t.test(
          `${size}: each month of the Labbook has its page of a calendar, its written days marked, for the eye alone`,
          async () => {
            const { context, page } = await open(size, NOTEBOOK);
            const months = await page.evaluate(() =>
              [...document.querySelectorAll("[data-labbook-month]")].map((month) => {
                const calendar = month.querySelector("[data-labbook-calendar]");
                const days = [...(calendar?.children ?? [])];
                const marked = days.filter((day) => day.matches("[data-written]"));
                return {
                  month: month.dataset.labbookMonth,
                  hidden: calendar?.getAttribute("aria-hidden"),
                  shown: !!calendar?.checkVisibility(),
                  days: days.length,
                  marked: marked.map((day) => Number(day.textContent)),
                  // Nothing links to an update's place unless it is
                  // written to (labbook-daylight.browser.mjs).
                  links: calendar?.querySelectorAll("a, [tabindex]").length,
                  written: [
                    ...new Set(
                      [...month.querySelectorAll(".labbook-entry time")].map(
                        (time) => Number(time.getAttribute("datetime").slice(8)),
                      ),
                    ),
                  ].sort((a, b) => a - b),
                };
              }),
            );
            assert.deepEqual(
              months.map((m) => [m.month, m.days]),
              [
                ["2026-10", 31],
                ["2026-09", 30],
                ["2026-08", 31],
                ["2026-07", 31],
              ],
            );
            for (const month of months) {
              assert.equal(month.hidden, "true", `${month.month}: said aloud`);
              assert.equal(month.shown, true, `${month.month}: shown`);
              assert.deepEqual(month.marked, month.written, month.month);
              assert.equal(month.links, 0, `${month.month}: a link or a stop`);
            }
            await context.close();

            // Narrowed, only the days with an entry about it stay marked.
            const narrowed = await open(
              size,
              `${NOTEBOOK}&experiment=fixture-quiet`,
            );
            const still = await narrowed.page.evaluate(() =>
              [...document.querySelectorAll("[data-labbook-month]")]
                .filter((month) => month.checkVisibility())
                .map((month) => [
                  month.dataset.labbookMonth,
                  [...month.querySelectorAll("[data-labbook-calendar] [data-written]")]
                    .filter((day) => getComputedStyle(day).color !== "rgba(0, 0, 0, 0)")
                    .map((day) => Number(day.textContent)),
                  [...month.querySelectorAll(".labbook-entry")]
                    .filter((entry) => entry.checkVisibility())
                    .map((entry) =>
                      Number(entry.querySelector("time").getAttribute("datetime").slice(8)),
                    )
                    .sort((a, b) => a - b),
                ]),
            );
            await narrowed.context.close();
            for (const [month, marked, written] of still)
              assert.deepEqual(marked, written, `${month}, narrowed`);
          },
        );
      }

      await t.test(
        "desktop: an artifact keeps to a column of its own width beside an entry's words",
        async () => {
          const { context, page } = await open("desktop", NOTEBOOK);
          const widths = await page.evaluate(() =>
            [...document.querySelectorAll(".labbook-entry")]
              .map((entry) => [entry, entry.querySelector(".event-artifact")])
              .filter(([, artifact]) => artifact)
              .map(([entry, artifact]) => ({
                id: entry.id,
                share:
                  artifact.getBoundingClientRect().width /
                  entry.querySelector(".event-body").getBoundingClientRect().width,
                width: artifact.getBoundingClientRect().width,
                rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
              })),
          );
          await context.close();
          assert.ok(widths.length >= 5, "the fixture's entries with artifacts");
          for (const { id, share, width, rem } of widths) {
            assert.ok(share <= 0.4 + 0.01, `${id}: ${Math.round(share * 100)}% of the entry`);
            assert.ok(width <= 20 * rem + 1, `${id}: ${width}px`);
          }
        },
      );

      await t.test(
        "desktop: picked up, a pile fans out; asked for less motion, nothing on the Bench moves",
        async () => {
          const fan = async (motion) => {
            const { context, page } = await open("desktop", KINDS, motion);
            const card = page.locator(
              "article:has([data-part='lab.title'][data-ref='fixture-kinds-stack'])",
            );
            const under = card.locator(".lab-card__under").first();
            const piece = card.locator(".lab-card__object > *").first();
            const read = () =>
              Promise.all([
                under.evaluate((el) => getComputedStyle(el).rotate),
                piece.evaluate((el) => getComputedStyle(el).rotate),
                piece.evaluate((el) => getComputedStyle(el).transitionDuration),
              ]);
            const before = await read();
            await card.hover();
            await page.waitForTimeout(500);
            const hovered = await read();
            // Picked up by the keyboard, it is the same as by a pointer.
            await page.mouse.move(0, 0);
            await card.locator("[data-part='lab.title'] a").focus();
            await page.keyboard.press("Shift+Tab");
            await page.keyboard.press("Tab");
            await page.waitForTimeout(500);
            const focused = await read();
            await context.close();
            return { before, hovered, focused };
          };
          const moving = await fan("no-preference");
          assert.ok(
            parseFloat(moving.hovered[0]) > parseFloat(moving.before[0]),
            `the under print turns further: ${moving.before[0]} to ${moving.hovered[0]}`,
          );
          assert.equal(moving.hovered[1], "0deg", "the pile lies straight");
          assert.deepEqual(moving.focused, moving.hovered, "by keyboard too");
          const still = await fan("reduce");
          assert.deepEqual(still.hovered, still.before, "nothing moves");
          assert.deepEqual(still.focused, still.before, "nothing moves");
          assert.match(still.before[2], /^0s/, "nothing is timed to move");
        },
      );
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
