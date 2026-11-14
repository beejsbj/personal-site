/** Cut Paper's design pass of the Lab (issue #130): the Bench is a rack of
 * pads, each loaded with what its experiment holds (a sample, a chop of
 * several, a plug-in to play, or only its MIDI); the Shelf is the browser,
 * a file to a row; an experiment's page is its clip box over its story,
 * laid out as an arrangement read down the page, with locators at its
 * chapters and its blocks as the session's own pieces; the Labbook is the
 * Markers track kept by month, each month a step row of its days, and
 * soloed to one thing it is about.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read in the harness on fixtures, whatever src/content holds: lab-kinds
 * (every kind of card in both places), labbook-notebook (four months),
 * lab-blocks (every block), lab-no-cover and lab-bare-entry (pages that
 * say little), and on /lab for the soloing the client router answers.
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
  `/prism/harness?lens=cut-paper&fixture=${name}&route=${encodeURIComponent(route)}`;
const KINDS = harness("lab-kinds", "/lab");
const NOTEBOOK = harness("labbook-notebook", "/lab");
const BLOCKS = harness("lab-blocks", "/lab/fixture-blocks");

/** What each experiment in the kinds fixture holds, and how many pictures
 * its slot shows for it: on the Bench all of them (three at most), each a
 * slice of the chop; on the Shelf the first, as the file's thumbnail; a
 * plug-in shows its poster on its screen, or its name when it has none. */
const SLOTS = {
  "fixture-kinds-featured": ["bench", "prints", 3],
  "fixture-kinds-print": ["bench", "print", 1],
  "fixture-kinds-words": ["bench", "words", 0],
  "fixture-kinds-pen": ["bench", "play", 1],
  "fixture-kinds-stack": ["bench", "prints", 2],
  "fixture-kinds-note": ["bench", "words", 0],
  // a demo with nothing to show: its name stands on its screen
  "fixture-kinds-demo": ["bench", "play", 0],
  "fixture-kinds-shelved": ["shelf", "print", 1],
  "fixture-kinds-shelf-pen": ["shelf", "play", 1],
  "fixture-kinds-shelf-stack": ["shelf", "prints", 1],
  "fixture-kinds-shelf-words": ["shelf", "words", 0],
};

/** Nothing reaches past the screen's edge, and nothing scrolls sideways
 * (words kept for assistive technology, the wipe and the overview's run
 * are cut at their edges by design). */
const sideways = (page) =>
  page.evaluate(() => {
    const out = [];
    const wide =
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth;
    if (wide > 0) out.push(`the document, by ${wide}px`);
    for (const el of document.querySelectorAll("#lens-shell .cp-scroll *")) {
      if (el.closest(".cp-sr")) continue;
      if (el.scrollLeft !== 0) out.push(`${el.className} is at ${el.scrollLeft}`);
      const { overflowX } = getComputedStyle(el);
      if (
        overflowX !== "visible" &&
        overflowX !== "clip" &&
        !el.matches("pre, pre *") &&
        el.scrollWidth > el.clientWidth + 1
      )
        out.push(`${el.tagName.toLowerCase()}.${el.className}`);
      if (el.checkVisibility() && el.getBoundingClientRect().right > innerWidth + 1)
        out.push(`${el.tagName.toLowerCase()}.${el.className} runs off`);
    }
    return out;
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Cut Paper's Lab is a rack, a browser, a clip's story and a Markers track kept by month",
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
      await page.waitForTimeout(900);
      return { context, page, asked, errors };
    };
    const harnessed = (page) =>
      page.evaluate(() => window.prismHarness.content);

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: each pad is loaded with what it holds, and the Shelf is the browser, a file to a row`,
          async () => {
            const { context, page, asked, errors } = await open(size, KINDS);
            const shown = await page.evaluate(() =>
              [
                ...document.querySelectorAll(
                  "#lens-shell [data-lab-place] [data-holds]:has([data-part='lab.title'])",
                ),
              ].map((slot) => {
                const box = slot.getBoundingClientRect();
                const list = slot.parentElement.getBoundingClientRect();
                return {
                  slug: slot
                    .querySelector("[data-part='lab.title']")
                    .getAttribute("data-ref"),
                  place: slot.closest("[data-lab-place]").dataset.labPlace,
                  holds: slot.dataset.holds,
                  pictures: slot.querySelectorAll("img").length,
                  slices: slot.querySelectorAll(".cp-chop__slice").length,
                  // A picture is for the eye: the slot says it in words.
                  named: [...slot.querySelectorAll("img")].filter(
                    (img) => img.alt && !img.closest("[aria-hidden='true']"),
                  ).length,
                  // What kind of pad it is, said on the pad for the eye.
                  tag: slot.querySelector(".cp-holds")?.textContent.trim() ?? "",
                  left: Math.round(box.left),
                  top: box.top,
                  bottom: box.bottom,
                  share: box.width / list.width,
                };
              }),
            );
            assert.deepEqual(
              Object.fromEntries(
                shown.map(({ slug, place, holds, pictures }) => [
                  slug,
                  [place, holds, pictures],
                ]),
              ),
              SLOTS,
            );
            const holds = content.lenses["cut-paper"].lab.holds;
            for (const slot of shown) {
              assert.equal(slot.named, 0, `${slot.slug}'s pictures are for the eye`);
              assert.ok(
                slot.tag.startsWith(holds[slot.holds].split(" ")[0]),
                `${slot.slug} says it is a ${holds[slot.holds]}: ${slot.tag}`,
              );
              if (slot.place === "bench" && slot.holds === "prints")
                assert.equal(slot.slices, slot.pictures, `${slot.slug} is chopped`);
            }
            const bench = shown.filter((slot) => slot.place === "bench");
            const shelf = shown.filter((slot) => slot.place === "shelf");
            // The Shelf is one file under another, each across the browser.
            for (let i = 1; i < shelf.length; i += 1)
              assert.ok(
                shelf[i].top >= shelf[i - 1].bottom - 1,
                `${shelf[i].slug} is under ${shelf[i - 1].slug}`,
              );
            assert.ok(
              shelf.every((slot) => slot.share > 0.95),
              "a file takes the browser's width",
            );
            // The Bench is a grid of pads, side by side.
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
              "pads stand side by side on the Bench",
            );
            assert.deepEqual(asked, [], "nothing is asked of another site");
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: a plug-in plays where it is racked, and only when asked`,
          async () => {
            const { context, page, asked, errors } = await open(size, KINDS);
            const fixture = await harnessed(page);
            for (const slug of [
              "fixture-kinds-pen",
              "fixture-kinds-demo",
              "fixture-kinds-shelf-pen",
            ]) {
              const entry = fixture.lab.find((item) => item.slug === slug);
              const slot = page.locator("#lens-shell [data-holds='play']", {
                has: page.locator(`[data-part='lab.title'][data-ref='${slug}']`),
              });
              const pad = slot.locator("button").first();
              const power = slot.locator("button[data-block-toggle]");
              assert.ok(await pad.getAttribute("aria-label"), `${slug}'s pad is named`);
              // The power is a stop in the slot's own order: on the rack
              // after its pad (the bar it is named on), in the browser
              // after its name. Nothing outside the slot comes between.
              await slot.evaluate((el) => {
                const stops = [...el.querySelectorAll("a[href], button")];
                const power = el.querySelector("button[data-block-toggle]");
                stops[stops.indexOf(power) - 1].focus();
              });
              await page.keyboard.press("Tab");
              assert.equal(
                await power.evaluate((el) => el === document.activeElement),
                true,
                `${slug}: the power is the next stop`,
              );
              assert.notEqual(
                await power.evaluate((el) => getComputedStyle(el).outlineStyle),
                "none",
                `${slug}: the power shows where the keyboard is`,
              );
              assert.equal(
                (await power.textContent()).trim(),
                fixture.pages.lab.preview.load[entry.preview.kind],
              );
              assert.equal(
                await slot.locator("[data-part='lab.preview']").count(),
                1,
                `${slug} owes its way to play`,
              );
              assert.equal(await page.locator("#lens-shell iframe").count(), 0);
              assert.ok(
                !asked.includes(entry.preview.frame),
                `${slug}: nothing is asked of its site before the press`,
              );
              const before = await slot.boundingBox();
              await page.keyboard.press("Enter");
              await page.waitForSelector("#lens-shell iframe");
              assert.equal(
                await page.locator("#lens-shell iframe").getAttribute("src"),
                entry.preview.frame,
                `${slug} plays itself`,
              );
              assert.equal(await power.getAttribute("aria-pressed"), "true");
              assert.equal(
                (await power.textContent()).trim(),
                fixture.pages.lab.preview.close,
              );
              assert.deepEqual(
                await slot.boundingBox(),
                before,
                `${slug}: nothing moves when it plays`,
              );
              // Escape puts it away, and the rack stays.
              await page.keyboard.press("Escape");
              await page.waitForTimeout(300);
              assert.equal(await page.locator("#lens-shell iframe").count(), 0);
              assert.equal(await power.getAttribute("aria-pressed"), "false");
              assert.equal(
                await page.evaluate(
                  () => document.querySelector("#lens-shell .cp-screen")?.dataset.screen,
                ),
                "lab",
              );
              assert.deepEqual(await slot.boundingBox(), before);
            }
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: with less motion asked for, nothing in the rack moves`,
          async () => {
            const { context, page, errors } = await open(size, KINDS);
            for (const slug of ["fixture-kinds-featured", "fixture-kinds-stack"]) {
              const slot = page.locator("#lens-shell [data-holds]", {
                has: page.locator(`[data-part='lab.title'][data-ref='${slug}']`),
              });
              await slot.locator("button").first().focus();
              await slot.hover().catch(() => {});
            }
            await page.waitForTimeout(400);
            const moving = await page.evaluate(() =>
              document
                .getAnimations()
                .filter((animation) =>
                  animation.effect?.target?.closest?.("[data-lab-place]"),
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
          `${size}: the Labbook is kept by month, each a step row of its days`,
          async () => {
            const { context, page, errors } = await open(size, NOTEBOOK);
            const fixture = await harnessed(page);
            const months = await page.evaluate(() =>
              [...document.querySelectorAll("#lens-shell [data-cp-month]")].map(
                (month) => {
                  const steps = month.querySelector(".cp-steps");
                  return {
                    month: month.dataset.cpMonth,
                    name: month
                      .querySelector("[data-part='labbook.month']")
                      .textContent.replace(/\s+/g, " ")
                      .trim(),
                    ids: [...month.querySelectorAll("ol > li")].map((line) =>
                      line.id.replace(/^u-/, ""),
                    ),
                    hidden: steps.getAttribute("aria-hidden"),
                    reachable: steps.querySelectorAll("a, button, [tabindex]")
                      .length,
                    lead: getComputedStyle(steps).getPropertyValue("--lead"),
                    written: [
                      ...steps.querySelectorAll(".cp-steps__day[data-written]"),
                    ].map((day) => Number(day.textContent)),
                  };
                },
              ),
            );
            assert.deepEqual(
              months.map(({ month, ids }) => ({ month, ids })),
              labbookMonths(fixture.labbook).map(({ month, updates }) => ({
                month,
                ids: updates.map((update) => update.id),
              })),
              "newest month first, each holding its own days",
            );
            for (const month of months) {
              const { lead, days } = monthCalendar(month.month, fixture.labbook);
              assert.equal(month.name, monthLabel(month.month));
              assert.equal(month.hidden, "true", "the steps are for the eye");
              assert.equal(month.reachable, 0, "and go nowhere");
              assert.equal(Number(month.lead), lead);
              assert.deepEqual(
                month.written,
                days.filter((day) => day.updates.length).map((day) => day.day),
                `${month.month}: the days written in are lit`,
              );
            }
            assert.equal(
              await page.locator("#lens-shell a[href*='#u-']").count(),
              0,
              "nothing points at the Labbook's lines",
            );
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: the Labbook solos one thing it is about, and back`,
          async () => {
            // On /lab the client router answers the soloing in place.
            const { context, page, errors } = await open(size, "/lab?lens=cut-paper");
            const subjects = labbookSubjects(content.labbook, content);
            assert.ok(subjects.length > 0, "the Labbook is about something");
            const shown = await page
              .locator("#lens-shell [data-part='labbook.subject']")
              .evaluateAll((links) =>
                links.map((link) => ({
                  ref: link.dataset.ref,
                  visible: link.checkVisibility(),
                })),
              );
            assert.deepEqual(
              shown.map(({ ref }) => ref),
              subjects.map((s) => `${s.kind}:${s.slug}`),
            );
            assert.ok(shown.every(({ visible }) => visible));
            const target = subjects[0];
            const key = `${target.kind}:${target.slug}`;
            await page
              .locator(`#lens-shell [data-part='labbook.subject'][data-ref='${key}']`)
              .click();
            await page.waitForURL(
              (url) => url.searchParams.get(target.kind) === target.slug,
            );
            await page.waitForTimeout(900);
            const soloed = await page.evaluate(() => {
              const visible = (el) => el.checkVisibility();
              return {
                screen: document.querySelector("#lens-shell .cp-screen")?.dataset
                  .screen,
                focus: document.activeElement?.matches("[data-cp-narrowed]"),
                says: document
                  .querySelector("#lens-shell [data-cp-narrowed]")
                  ?.textContent.replace(/\s+/g, " ")
                  .trim(),
                current: document
                  .querySelector("#lens-shell [data-part='labbook.subject'][aria-current='true']")
                  ?.getAttribute("data-ref"),
                entries: [
                  ...document.querySelectorAll("#lens-shell [data-log='labbook'] ol > li"),
                ]
                  .filter(visible)
                  .map((line) => line.dataset.about ?? ""),
                months: [
                  ...document.querySelectorAll("#lens-shell [data-cp-month]"),
                ].map(
                  (month) =>
                    visible(month) ===
                    [...month.querySelectorAll("ol > li")].some(visible),
                ),
                lit: [
                  ...document.querySelectorAll(
                    "#lens-shell .cp-steps__day[data-written]:not([data-elsewhere])",
                  ),
                ].map((day) => day.dataset.about ?? ""),
              };
            });
            assert.equal(soloed.screen, "lab");
            assert.ok(soloed.focus, "the line saying what it shows has the focus");
            assert.ok(soloed.says.includes(target.title), soloed.says);
            assert.equal(soloed.current, key);
            assert.equal(soloed.entries.length, target.count);
            assert.ok(
              soloed.entries.every((about) => about.split(" ").includes(key)),
              "only the entries about it",
            );
            assert.ok(
              soloed.lit.every((about) => about.split(" ").includes(key)),
              "only its days stay lit",
            );
            assert.ok(soloed.months.every(Boolean), "a month left empty is put away");
            await page.locator("#lens-shell [data-cp-all]").click();
            await page.waitForURL((url) => !url.searchParams.has(target.kind));
            await page.waitForTimeout(900);
            const whole = await page.evaluate(() => ({
              focus: document.activeElement?.getAttribute("data-ref"),
              entries: [
                ...document.querySelectorAll("#lens-shell [data-log='labbook'] ol > li"),
              ].filter((el) => el.checkVisibility()).length,
              status: document
                .querySelector("#lens-shell [data-cp-narrowed]")
                ?.checkVisibility(),
            }));
            assert.equal(whole.focus, key, "back to what it was soloed by");
            assert.equal(whole.entries, content.labbook.length);
            assert.equal(whole.status, false);
            assert.deepEqual(errors, []);
            await context.close();

            // Arriving soloed: the Labbook is turned to it already.
            const arrived = await open(
              size,
              `/lab?lens=cut-paper&${target.kind}=${target.slug}#labbook`,
            );
            assert.equal(
              await arrived.page
                .locator("#lens-shell [data-log='labbook'] ol > li")
                .evaluateAll((all) => all.filter((el) => el.checkVisibility()).length),
              target.count,
            );
            const status = await arrived.page
              .locator("#lens-shell [data-cp-narrowed]")
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
          `${size}: an experiment's page is its clip box over a story of spreads and plates`,
          async () => {
            const { context, page, asked, errors } = await open(size, BLOCKS);
            const laid = await page.evaluate(() => {
              const box = (el) => el?.getBoundingClientRect();
              const story = document.querySelector("#lens-shell .cp-story");
              return {
                head: box(document.querySelector("#lens-shell .cp-clipview__side")),
                story: box(story),
                spreads: [
                  ...document.querySelectorAll("#lens-shell .cp-spread[data-asides]"),
                ]
                  .filter((spread) => spread.querySelector(".cp-prose"))
                  .map((spread) => {
                    const text = box(spread.querySelector(".cp-prose"));
                    const aside = box(spread.querySelector(".cp-spread__margin"));
                    return {
                      beside: aside.left >= text.right - 1,
                      under: aside.top >= text.bottom - 1,
                    };
                  }),
                plates: [...document.querySelectorAll("#lens-shell .cp-plate")].map(
                  (plate) => box(plate).width,
                ),
                widest: Math.max(
                  ...[...document.querySelectorAll("#lens-shell .cp-spread")].map(
                    (spread) => box(spread).width,
                  ),
                ),
                locators: [
                  ...document.querySelectorAll("#lens-shell .cp-story h2"),
                ].map((h2) => h2.dataset.locator ?? null),
                steps: [
                  ...document.querySelectorAll(
                    "#lens-shell [data-part='block.steps'] > li",
                  ),
                ].map((step) => Math.round(box(step).top)),
                labels: [
                  ...document.querySelectorAll(
                    "#lens-shell [data-part='block.compare'] .cp-ab__label",
                  ),
                ].map((label) => label.textContent.trim()),
                blocks: [
                  ...document.querySelectorAll("#lens-shell [data-part^='block.']"),
                ].map((el) => el.dataset.part),
                frames: document.querySelectorAll("#lens-shell iframe").length,
                canvases: document.querySelectorAll("#lens-shell canvas").length,
              };
            });
            assert.ok(laid.head.bottom <= laid.story.top + 1, "the clip box, then its story");
            assert.ok(laid.spreads.length > 0, "the page has spreads");
            assert.ok(laid.plates.length > 0, "and plates");
            assert.ok(
              laid.plates.every((width) => width >= laid.widest - 2),
              "a plate runs across the story",
            );
            if (size === "desktop")
              assert.ok(
                laid.spreads.every(({ beside }) => beside),
                "a spread's small blocks stand in its margin",
              );
            else
              assert.ok(
                laid.spreads.every(({ under }) => under),
                "on a phone a spread's small blocks follow its words",
              );
            assert.deepEqual(
              laid.locators,
              laid.locators.map((_, i) => String(i + 1)),
              "each chapter is a locator, numbered in order",
            );
            assert.equal(laid.steps.length, 3);
            if (size === "desktop")
              assert.ok(
                laid.steps.every((top) => top === laid.steps[0]),
                "the steps are a sequencer row",
              );
            else
              assert.ok(
                laid.steps.every((top, i) => i === 0 || top > laid.steps[i - 1]),
                "on a phone the steps run down",
              );
            const fixture = await harnessed(page);
            assert.deepEqual(laid.labels, [
              fixture.site.blocks.compare.before,
              "A month later",
            ]);
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
            // The demo, asked for, plays in its plug-in window; Escape puts
            // it away and leaves the page as it was.
            const power = page.locator(
              "#lens-shell [data-ref='fixture-blocks/the-demo'] button[data-block-toggle]",
            );
            await power.focus();
            await page.keyboard.press("Enter");
            await page.waitForSelector("#lens-shell iframe");
            await page.keyboard.press("Escape");
            await page.waitForTimeout(300);
            assert.equal(await page.locator("#lens-shell iframe").count(), 0);
            assert.equal(
              await page.evaluate(
                () => document.querySelector("#lens-shell .cp-screen")?.dataset.screen,
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
          `${size}: the playhead reads down the story, and lights the chapter it is in`,
          async () => {
            const { context, page, errors } = await open(size, BLOCKS);
            const hidden = await page
              .locator("#lens-shell .cp-story__head")
              .evaluate((el) => !!el.closest("[aria-hidden='true']"));
            assert.ok(hidden, "the reading playhead is for the eye");
            const lit = async (n) => {
              await page.evaluate((n) => {
                const h2 = document.querySelector(
                  `#lens-shell .cp-story h2[data-locator='${n}']`,
                );
                const scroller = document.querySelector("#lens-shell .cp-scroll");
                scroller.scrollTop +=
                  h2.getBoundingClientRect().top -
                  scroller.getBoundingClientRect().top -
                  scroller.clientHeight * 0.25;
              }, n);
              await page.waitForTimeout(250);
              return page.evaluate(() =>
                [
                  ...document.querySelectorAll("#lens-shell .cp-story h2[data-live]"),
                ].map((h2) => h2.dataset.locator),
              );
            };
            assert.deepEqual(await lit(2), ["2"]);
            assert.deepEqual(await lit(4), ["4"]);
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
          `${size}: a page that says little is its clip box and its words, with no empty margin`,
          async () => {
            for (const [fixture, slug, holds] of [
              ["lab-no-cover", "fixture-sketch", "words"],
              ["lab-bare-entry", "fixture-poster", "print"],
            ]) {
              const { context, page, errors } = await open(
                size,
                harness(fixture, `/lab/${slug}`),
              );
              const shown = await page.evaluate(() => ({
                holds: document.querySelector("#lens-shell .cp-clipview__side [data-holds]")
                  ?.dataset.holds,
                story: [...document.querySelectorAll("#lens-shell .cp-story")].map(
                  (story) => story.textContent.trim().length,
                ),
                margins: document.querySelectorAll("#lens-shell .cp-spread__margin")
                  .length,
              }));
              assert.equal(shown.holds, holds, slug);
              assert.equal(shown.story.length, 1, `${slug} has its story`);
              assert.ok(shown.story[0] > 0, `${slug}'s story says something`);
              assert.equal(shown.margins, 0, `${slug} keeps no empty margin`);
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
