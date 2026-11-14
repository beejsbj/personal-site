/** Calling Card's design pass of the Lab (issue #129): the Bench is the
 * request board, each request pinned as what it holds (an evidence photo,
 * a fan of them, a screen to play it on, or only its words); the Shelf is
 * a list of cases, a row each; a brief is a case file, its request card
 * beside a report told with the page's blocks as spreads and plates; the
 * Labbook is kept by month, each on its page of the calendar, and narrows
 * to one target.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read in the harness on fixtures, whatever src/content holds: lab-kinds
 * (every kind of card in both places), labbook-notebook (four months),
 * lab-blocks (every block), lab-no-cover and lab-bare-entry (pages that
 * say little), and on /lab for the narrowing the client router answers.
 * BASE=<origin> runs it against a server already up; LAB_ONLY=<regexp>
 * runs the subtests whose names match. Every request to another site is
 * answered with a blank and written down. Same server and Chromium as
 * prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import {
  labbookMonths,
  labbookSubjects,
  monthCalendar,
  monthLabel,
} from "../../src/lib/labbook.ts";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const ONLY = process.env.LAB_ONLY && new RegExp(process.env.LAB_ONLY);
const harness = (name, route) =>
  `/prism/harness?lens=calling-card&fixture=${name}&route=${encodeURIComponent(route)}`;
const KINDS = harness("lab-kinds", "/lab");
const NOTEBOOK = harness("labbook-notebook", "/lab");
const BLOCKS = harness("lab-blocks", "/lab/fixture-blocks");

/** What each request in the kinds fixture holds, and how many pictures it
 * shows for it: on the Bench all of them (three at most), on the Shelf
 * the first, cut into its row; a screen shows its poster. */
const CARDS = {
  "fixture-kinds-featured": ["bench", "prints", 3],
  "fixture-kinds-print": ["bench", "print", 1],
  "fixture-kinds-words": ["bench", "words", 0],
  "fixture-kinds-pen": ["bench", "play", 1],
  "fixture-kinds-stack": ["bench", "prints", 2],
  "fixture-kinds-note": ["bench", "words", 0],
  "fixture-kinds-shelved": ["shelf", "print", 1],
  "fixture-kinds-shelf-pen": ["shelf", "play", 1],
  "fixture-kinds-shelf-stack": ["shelf", "prints", 1],
  "fixture-kinds-shelf-words": ["shelf", "words", 0],
};

/** Nothing reaches past the screen's edge, and nothing scrolls sideways
 * (the painted grounds, the wipe and words kept for assistive technology
 * are cut at their edges by design). */
const sideways = (page) =>
  page.evaluate(() => {
    const out = [];
    const wide =
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth;
    if (wide > 0) out.push(`the document, by ${wide}px`);
    for (const el of document.querySelectorAll("#lens-shell *")) {
      if (el.closest(".cc-sr, .cc-screen__bg, .cc-wipe")) continue;
      if (el.scrollLeft !== 0) out.push(`${el.className} is at ${el.scrollLeft}`);
      const { overflowX } = getComputedStyle(el);
      if (
        overflowX !== "visible" &&
        overflowX !== "clip" &&
        el.scrollWidth > el.clientWidth + 1
      )
        out.push(`${el.tagName.toLowerCase()}.${el.className}`);
    }
    return out;
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Calling Card's Lab is a request board, a case file and a calendar",
  { skip, timeout: 15 * 60_000 },
  async (suite) => {
    const t = {
      test: (name, fn) =>
        suite.test(name, { skip: !!ONLY && !ONLY.test(name) }, fn),
    };
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

    /** A page at one size, once the shell has drawn it. */
    const open = async (size, path, { motion = false } = {}) => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: motion ? "no-preference" : "reduce",
      });
      const asked = [];
      await context.route(
        (url) => url.origin !== base,
        (route) => {
          asked.push(route.request().url());
          return route.fulfill({ contentType: "text/html", body: "" });
        },
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}${path}`, { waitUntil: "load" });
      await page.waitForSelector("html[data-shell-ready]", { timeout: 30000 });
      if (path.startsWith("/prism/harness"))
        await page.waitForFunction(() => window.prismHarness?.ready);
      await page.waitForTimeout(700);
      return { context, page, asked, errors };
    };
    const harnessed = (page) =>
      page.evaluate(() => window.prismHarness.content);

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: each request is pinned as what it holds, and the Shelf is a list`,
          async () => {
            const { context, page, asked, errors } = await open(size, KINDS);
            const shown = await page.evaluate(() =>
              [...document.querySelectorAll("#lens-shell .cc-pin")].map(
                (pin) => {
                  const card = pin.querySelector("a.cc-request");
                  const box = pin.getBoundingClientRect();
                  return {
                    slug: pin
                      .querySelector("[data-part='lab.title']")
                      .getAttribute("data-ref"),
                    place: pin.closest("[data-lab-place]").dataset.labPlace,
                    holds: pin.dataset.holds,
                    cardHolds: card.dataset.holds,
                    pictures: pin.querySelectorAll("img").length,
                    // A picture is for the eye: the request says it in words.
                    named: [...pin.querySelectorAll("img")].filter(
                      (img) =>
                        img.alt && !img.closest("[aria-hidden='true']"),
                    ).length,
                    linkedPictures: card.querySelectorAll("img").length,
                    // How far it is turned, in degrees.
                    turned: (() => {
                      const { transform } = getComputedStyle(card);
                      if (transform === "none") return 0;
                      const [a, b] = transform
                        .match(/matrix\(([^)]+)\)/)[1]
                        .split(",")
                        .map(Number);
                      return Math.abs((Math.atan2(b, a) * 180) / Math.PI);
                    })(),
                    left: Math.round(box.left),
                    top: box.top,
                    bottom: box.bottom,
                  };
                },
              ),
            );
            assert.deepEqual(
              Object.fromEntries(
                shown.map(({ slug, place, holds, pictures }) => [
                  slug,
                  [place, holds, pictures],
                ]),
              ),
              CARDS,
            );
            for (const pin of shown) {
              assert.equal(pin.cardHolds, pin.holds, `${pin.slug} says it`);
              // A pinned photo is nameless; a screen's poster names it.
              assert.equal(
                pin.named,
                pin.holds === "play" ? 1 : 0,
                `${pin.slug}'s pictures`,
              );
            }
            // The Bench is pinned at angles; the Shelf's rows are not.
            const bench = shown.filter((pin) => pin.place === "bench");
            const shelf = shown.filter((pin) => pin.place === "shelf");
            assert.ok(
              bench.every((pin) => pin.turned > 0.3),
              "the Bench is pinned at angles",
            );
            assert.ok(
              shelf.every((pin) => pin.turned < 0.01),
              "the Shelf is listed straight",
            );
            // The Shelf is one row under another; the Bench is not, on a
            // desktop, where requests stand side by side.
            for (let i = 1; i < shelf.length; i += 1)
              assert.ok(
                shelf[i].top >= shelf[i - 1].bottom - 1,
                `${shelf[i].slug} is under ${shelf[i - 1].slug}`,
              );
            if (size === "desktop")
              assert.ok(
                bench.some((one) =>
                  bench.some(
                    (other) =>
                      other !== one &&
                      other.left !== one.left &&
                      other.top < one.bottom &&
                      one.top < other.bottom,
                  ),
                ),
                "requests stand side by side on the Bench",
              );
            assert.deepEqual(asked, [], "nothing is asked of another site");
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: a request plays where it is pinned, and only when asked`,
          async () => {
            const { context, page, asked, errors } = await open(size, KINDS);
            const content = await harnessed(page);
            for (const slug of [
              "fixture-kinds-pen",
              "fixture-kinds-shelf-pen",
            ]) {
              const entry = content.lab.find((item) => item.slug === slug);
              const pin = page.locator("#lens-shell .cc-pin", {
                has: page.locator(`[data-part='lab.title'][data-ref='${slug}']`),
              });
              const card = pin.locator("a.cc-request");
              const button = pin.locator("button[data-block-toggle]");
              // The request's link, then its screen's prompt: the next stop.
              await card.focus();
              await page.keyboard.press("Tab");
              assert.equal(
                await button.evaluate((el) => el === document.activeElement),
                true,
                `${slug}: the prompt follows its request`,
              );
              assert.notEqual(
                await button.evaluate((el) => getComputedStyle(el).outlineStyle),
                "none",
                `${slug}: the prompt shows where the keyboard is`,
              );
              assert.equal(
                (await button.textContent()).trim(),
                content.pages.lab.preview.load[entry.preview.kind],
              );
              assert.equal(await page.locator("#lens-shell iframe").count(), 0);
              assert.ok(
                !asked.includes(entry.preview.frame),
                `${slug}: nothing is asked of its site before the press`,
              );
              const before = await pin.boundingBox();
              await page.keyboard.press("Enter");
              await page.waitForSelector("#lens-shell iframe");
              const frame = await page
                .locator("#lens-shell iframe")
                .getAttribute("src");
              assert.equal(frame, entry.preview.frame, `${slug} plays itself`);
              assert.equal(await button.getAttribute("aria-pressed"), "true");
              assert.equal(
                (await button.textContent()).trim(),
                content.pages.lab.preview.close,
              );
              assert.deepEqual(
                await pin.boundingBox(),
                before,
                `${slug}: nothing moves when it plays`,
              );
              // Escape puts it away, and the board stays.
              await page.keyboard.press("Escape");
              await page.waitForTimeout(300);
              assert.equal(await page.locator("#lens-shell iframe").count(), 0);
              assert.equal(await button.getAttribute("aria-pressed"), "false");
              assert.equal(
                await page.evaluate(
                  () => document.querySelector("#lens-shell .cc-screen")?.dataset
                    .screen,
                ),
                "lab",
                "Escape did not leave the board",
              );
              assert.deepEqual(await pin.boundingBox(), before);
            }
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: with less motion asked for, nothing on the board moves`,
          async () => {
            const { context, page, errors } = await open(size, KINDS);
            const card = page.locator("#lens-shell a.cc-request").nth(4);
            await card.focus();
            await card.hover().catch(() => {});
            await page.waitForTimeout(400);
            const moving = await page.evaluate(() =>
              document
                .getAnimations()
                .filter((animation) =>
                  animation.effect?.target?.closest?.(".cc-requests__board"),
                )
                .filter((animation) => animation.playState === "running")
                .map((animation) => animation.effect.target.className),
            );
            assert.deepEqual(moving, []);
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: the Labbook is kept by month, each on its page of the calendar`,
          async () => {
            const { context, page, errors } = await open(size, NOTEBOOK);
            const content = await harnessed(page);
            const months = await page.evaluate(() =>
              [...document.querySelectorAll("#lens-shell [data-cc-month]")].map(
                (month) => {
                  const calendar = month.querySelector(".cc-cal");
                  return {
                    month: month.dataset.ccMonth,
                    name: month
                      .querySelector("[data-part='labbook.month']")
                      .textContent.replace(/\s+/g, " ")
                      .trim(),
                    ids: [...month.querySelectorAll(".cc-entry")].map((entry) =>
                      entry.id.replace(/^u-/, ""),
                    ),
                    hidden: calendar.getAttribute("aria-hidden"),
                    reachable: calendar.querySelectorAll(
                      "a, button, [tabindex]",
                    ).length,
                    lead: getComputedStyle(calendar).getPropertyValue("--lead"),
                    written: [
                      ...calendar.querySelectorAll(".cc-cal__day[data-written]"),
                    ].map((day) => Number(day.textContent)),
                  };
                },
              ),
            );
            const expected = labbookMonths(content.labbook);
            assert.deepEqual(
              months.map(({ month, ids }) => ({ month, ids })),
              expected.map(({ month, updates }) => ({
                month,
                ids: updates.map((update) => update.id),
              })),
              "newest month first, each holding its own days",
            );
            for (const month of months) {
              const { lead, days } = monthCalendar(
                month.month,
                content.labbook,
              );
              assert.ok(
                month.name.endsWith(monthLabel(month.month)),
                `${month.month} is named ${month.name}`,
              );
              assert.equal(month.hidden, "true", "the calendar is for the eye");
              assert.equal(month.reachable, 0, "and links nowhere");
              assert.equal(Number(month.lead), lead);
              assert.deepEqual(
                month.written,
                days.filter((day) => day.updates.length).map((day) => day.day),
                `${month.month}: the days written in are struck`,
              );
            }
            assert.equal(
              await page.locator("#lens-shell a[href*='#u-']").count(),
              0,
              "nothing points at the Labbook's days",
            );
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: the Labbook narrows to one target, and back`,
          async () => {
            // On /lab the client router answers the narrowing in place.
            const { context, page, errors } = await open(
              size,
              "/lab?lens=calling-card",
            );
            const subjects = labbookSubjects(content.labbook, content);
            assert.ok(subjects.length > 0, "the Labbook is about something");
            const shownTargets = await page
              .locator("#lens-shell [data-part='labbook.subject']")
              .evaluateAll((links) =>
                links.map((link) => ({
                  ref: link.dataset.ref,
                  visible: link.checkVisibility(),
                })),
              );
            assert.deepEqual(
              shownTargets.map(({ ref }) => ref),
              subjects.map((s) => `${s.kind}:${s.slug}`),
            );
            assert.ok(shownTargets.every(({ visible }) => visible));
            const target = subjects[0];
            const key = `${target.kind}:${target.slug}`;
            const link = page.locator(
              `#lens-shell [data-part='labbook.subject'][data-ref='${key}']`,
            );
            await link.click();
            await page.waitForURL((url) =>
              url.searchParams.get(target.kind) === target.slug,
            );
            await page.waitForTimeout(900);
            const narrowed = await page.evaluate((key) => {
              const visible = (el) => el.checkVisibility();
              return {
                screen: document.querySelector("#lens-shell .cc-screen")
                  ?.dataset.screen,
                focus: document.activeElement?.matches("[data-cc-narrowed]"),
                says: document
                  .querySelector("#lens-shell [data-cc-narrowed]")
                  ?.textContent.replace(/\s+/g, " ")
                  .trim(),
                current: document
                  .querySelector("#lens-shell [aria-current='true']")
                  ?.getAttribute("data-ref"),
                entries: [...document.querySelectorAll("#lens-shell .cc-entry")]
                  .filter(visible)
                  .map((entry) => entry.dataset.about ?? ""),
                // A month is shown exactly when it has an entry shown.
                months: [
                  ...document.querySelectorAll("#lens-shell [data-cc-month]"),
                ].map(
                  (month) =>
                    visible(month) ===
                    [...month.querySelectorAll(".cc-entry")].some(visible),
                ),
                struck: [
                  ...document.querySelectorAll(
                    "#lens-shell .cc-cal__day[data-written]:not([data-elsewhere])",
                  ),
                ].map((day) => day.dataset.about ?? ""),
              };
            }, key);
            assert.equal(narrowed.screen, "lab");
            assert.ok(narrowed.focus, "the line saying what it shows has the focus");
            assert.ok(narrowed.says.includes(target.title), narrowed.says);
            assert.equal(narrowed.current, key);
            assert.equal(narrowed.entries.length, target.count);
            assert.ok(
              narrowed.entries.every((about) => about.split(" ").includes(key)),
              "only the entries about it",
            );
            assert.ok(
              narrowed.struck.every((about) => about.split(" ").includes(key)),
              "only its days are struck",
            );
            assert.ok(
              narrowed.months.every(Boolean),
              "a month left empty is put away",
            );
            await page.locator("#lens-shell [data-cc-all]").click();
            await page.waitForURL((url) => !url.searchParams.has(target.kind));
            await page.waitForTimeout(900);
            const whole = await page.evaluate(() => ({
              focus: document.activeElement?.getAttribute("data-ref"),
              entries: [...document.querySelectorAll("#lens-shell .cc-entry")]
                .filter((el) => el.checkVisibility()).length,
              status: document
                .querySelector("#lens-shell [data-cc-narrowed]")
                ?.checkVisibility(),
            }));
            assert.equal(whole.focus, key, "back to the target it was narrowed by");
            assert.equal(whole.entries, content.labbook.length);
            assert.equal(whole.status, false);
            assert.deepEqual(errors, []);
            await context.close();

            // Arriving narrowed: the board is turned to it already.
            const arrived = await open(
              size,
              `/lab?lens=calling-card&${target.kind}=${target.slug}`,
            );
            assert.equal(
              await arrived.page
                .locator("#lens-shell .cc-entry")
                .evaluateAll((all) => all.filter((el) => el.checkVisibility()).length),
              target.count,
            );
            const status = await arrived.page
              .locator("#lens-shell [data-cc-narrowed]")
              .boundingBox();
            assert.ok(
              status && status.y >= 0 && status.y + status.height <= SIZES[size].viewport.height,
              "and what it shows is on screen",
            );
            assert.deepEqual(arrived.errors, []);
            await arrived.context.close();
          },
        );

        await t.test(
          `${size}: a brief is a case file: its card beside a report of spreads and plates`,
          async () => {
            const { context, page, asked, errors } = await open(size, BLOCKS);
            const laid = await page.evaluate(() => {
              const box = (el) => el?.getBoundingClientRect();
              const card = box(document.querySelector("#lens-shell .cc-brief__paper"));
              const report = box(document.querySelector("#lens-shell .cc-report"));
              const spreads = [
                ...document.querySelectorAll("#lens-shell .cc-spread[data-asides]"),
              ]
                .filter((spread) => spread.querySelector(".cc-prose"))
                .map((spread) => ({
                  text: box(spread.querySelector(".cc-prose")),
                  aside: box(spread.querySelector(".cc-spread__margin")),
                }));
              const plates = [
                ...document.querySelectorAll("#lens-shell .cc-report__plate"),
              ].map((plate) => box(plate).width);
              return {
                card,
                report,
                spreads: spreads.map(({ text, aside }) => ({
                  beside: aside.left >= text.right - 1,
                  under: aside.top >= text.bottom - 1,
                })),
                plates,
                blocks: [
                  ...document.querySelectorAll("#lens-shell [data-part^='block.']"),
                ].map((el) => el.dataset.part),
                frames: document.querySelectorAll("#lens-shell iframe").length,
                canvases: document.querySelectorAll("#lens-shell canvas").length,
              };
            });
            assert.ok(laid.spreads.length > 0, "the page has spreads");
            assert.ok(laid.plates.length > 0, "and plates");
            if (size === "desktop") {
              assert.ok(
                laid.card.right <= laid.report.left,
                "the request card stands beside the report",
              );
              assert.ok(
                laid.spreads.every(({ beside }) => beside),
                "a spread's small blocks stand in its margin",
              );
            } else {
              assert.ok(laid.card.bottom <= laid.report.top, "card, then report");
              assert.ok(
                laid.spreads.every(({ under }) => under),
                "on a phone a spread's small blocks follow its words",
              );
            }
            assert.deepEqual(
              [...new Set(laid.blocks)].sort(),
              [
                "block.audio",
                "block.code",
                "block.compare",
                "block.embed",
                "block.film",
                "block.gallery",
                "block.model",
                "block.quote",
                "block.steps",
                "block.tree",
              ],
              "every block is drawn, and the one no lens knows is passed over",
            );
            assert.equal(laid.frames + laid.canvases, 0);
            assert.deepEqual(asked, [], "nothing live before a press");
            // The Pen, asked for, plays on its screen; Escape puts it
            // away and leaves the brief open.
            const pen = page.locator(
              "#lens-shell [data-ref='fixture-blocks/the-pen'] button[data-block-toggle]",
            );
            await pen.focus();
            await page.keyboard.press("Enter");
            await page.waitForSelector("#lens-shell iframe");
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
            assert.equal(await page.locator("#lens-shell iframe").count(), 0);
            assert.equal(
              await page.evaluate(
                () => document.querySelector("#lens-shell .cc-screen")?.dataset.screen,
              ),
              "lab-entry",
            );
            // With less motion asked for, a looping film stands still.
            assert.equal(
              await page
                .locator("#lens-shell [data-ref='fixture-blocks/the-loop'] video")
                .evaluate((film) => film.paused),
              true,
            );
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: a looping film plays by itself when motion is welcome`,
          async () => {
            const { context, page, errors } = await open(size, BLOCKS, {
              motion: true,
            });
            const film = page.locator(
              "#lens-shell [data-ref='fixture-blocks/the-loop'] video",
            );
            await film.scrollIntoViewIfNeeded();
            await page.waitForFunction(
              () =>
                !document.querySelector(
                  "#lens-shell [data-ref='fixture-blocks/the-loop'] video",
                )?.paused,
              null,
              { timeout: 5000 },
            );
            assert.equal(await film.evaluate((el) => el.muted), true);
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: a brief that says little is a card, its words, and no empty report`,
          async () => {
            for (const [fixture, slug, holds, pictures] of [
              ["lab-no-cover", "fixture-sketch", "words", 0],
              ["lab-bare-entry", "fixture-poster", "print", 1],
            ]) {
              const { context, page, errors } = await open(
                size,
                harness(fixture, `/lab/${slug}`),
              );
              const shown = await page.evaluate(() => ({
                holds: document.querySelector("#lens-shell .cc-brief__file")
                  ?.dataset.holds,
                pictures: document.querySelectorAll(
                  "#lens-shell [data-part='lab.media'] img",
                ).length,
                reports: [...document.querySelectorAll("#lens-shell .cc-report")]
                  .map((report) => report.textContent.trim().length),
                facts: [
                  ...document.querySelectorAll("#lens-shell .cc-brief__facts dt"),
                ].map((dt) => dt.textContent),
              }));
              assert.equal(shown.holds, holds, slug);
              assert.equal(shown.pictures, pictures, slug);
              assert.equal(shown.reports.length, 1, `${slug} has its report`);
              assert.ok(shown.reports[0] > 0, `${slug}'s report says something`);
              // No reports in the Labbook, no sighting and no intel.
              assert.deepEqual(shown.facts, [
                content.lenses["calling-card"].lab.file.status,
              ]);
              assert.deepEqual(await sideways(page), [], "nothing slides");
              assert.deepEqual(errors, []);
              await context.close();
            }
          },
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
