/** Hion's design pass of the Lab (issue #132): the Lab is a loom room.
 * The Bench is work still on the loom: each experiment hangs in the loop
 * as what it holds (a picture on two threads, a string of them, a place
 * stitched out for something to play with its cord to pull, or its name
 * alone, written large); the Shelf is swatches put by, laid flat on their
 * wefts; an experiment's page is its draft, the words strung down the
 * page with the small blocks hung in its margin and the big ones hung
 * across it; the Labbook is a record in knots, a cord for each month with
 * a knot for each day written in, and it narrows to one thing it is about.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read in the harness on fixtures, whatever src/content holds: lab-kinds
 * (every kind of card in both places), labbook-notebook (four months),
 * lab-blocks (every block), lab-no-cover and lab-bare-entry (pages that
 * say little), project-blocks (a project told with blocks), and on /lab
 * for the narrowing the client router answers. BASE=<origin> runs it
 * against a server already up; LAB_ONLY=<regexp> runs the subtests whose
 * names match. Every request to another site is answered with a blank and
 * written down. Same server and Chromium as prism-parity.browser.mjs. */
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
  `/prism/harness?lens=hion&fixture=${name}&route=${encodeURIComponent(route)}`;
const KINDS = harness("lab-kinds", "/lab");
const NOTEBOOK = harness("labbook-notebook", "/lab");
const BLOCKS = harness("lab-blocks", "/lab/fixture-blocks");

/** What each experiment in the kinds fixture holds, and how many pictures
 * it shows for it: on the Bench all of them (three at most), on the Shelf
 * the first, woven into its swatch; a place to play shows its poster. */
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

const BLOCK_PARTS = [
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
];

const overflow = (page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Hion's Lab is a loom room: work on the loom, swatches put by, a draft and a record in knots",
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
      await page.waitForSelector("#lens-shell main", { timeout: 15000 });
      await page.waitForTimeout(700);
      return { context, page, asked, errors };
    };
    const harnessed = (page) =>
      page.evaluate(() => window.prismHarness.content);

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: on the Bench each experiment hangs as what it holds; on the Shelf it lies as a swatch`,
          async () => {
            const { context, page, asked, errors } = await open(size, KINDS);
            const shown = await page.evaluate(() =>
              [
                ...document.querySelectorAll(
                  "#lens-shell [data-lab-place] li[data-holds]",
                ),
              ].map((piece) => {
                const box = piece.getBoundingClientRect();
                const title = piece.querySelector("[data-part='lab.title']");
                return {
                  slug: title.getAttribute("data-ref"),
                  place: piece.closest("[data-lab-place]").dataset.labPlace,
                  holds: piece.dataset.holds,
                  hangs: piece.hasAttribute("data-ink"),
                  pictures: piece.querySelectorAll("img").length,
                  // A picture is for the eye: the experiment says it in words.
                  named: [...piece.querySelectorAll("img")].filter(
                    (img) => img.alt && !img.closest("[aria-hidden='true']"),
                  ).length,
                  swatch: piece.querySelectorAll(
                    ".hion-swatch[aria-hidden='true']",
                  ).length,
                  titleSize: parseFloat(getComputedStyle(title).fontSize),
                  left: Math.round(box.left),
                  top: box.top,
                  bottom: box.bottom,
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
              CARDS,
            );
            const bench = shown.filter((piece) => piece.place === "bench");
            const shelf = shown.filter((piece) => piece.place === "shelf");
            for (const piece of shown)
              assert.equal(
                piece.named,
                0,
                `${piece.slug}'s pictures are nameless`,
              );
            assert.ok(
              bench.every((piece) => piece.hangs),
              "everything on the Bench hangs from a thread",
            );
            assert.ok(
              shelf.every((piece) => !piece.hangs && piece.swatch === 1),
              "everything on the Shelf lies on its weft as a swatch",
            );
            // Only words: the name is all it has to hang, so it is written
            // larger than the name under a picture.
            const named = (slug) => shown.find((piece) => piece.slug === slug);
            assert.ok(
              named("fixture-kinds-words").titleSize >
                named("fixture-kinds-print").titleSize,
              "a name alone is written large",
            );
            // The Shelf is one swatch under another; the Bench hangs side
            // by side on a desktop.
            for (let i = 1; i < shelf.length; i += 1)
              assert.ok(
                shelf[i].top >= shelf[i - 1].bottom - 1,
                `${shelf[i].slug} lies under ${shelf[i - 1].slug}`,
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
                "experiments hang side by side on the Bench",
              );
            assert.deepEqual(asked, [], "nothing is asked of another site");
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: a Pen plays in the place stitched out for it, only when its cord is pulled`,
          async () => {
            const { context, page, asked, errors } = await open(size, KINDS);
            const fixture = await harnessed(page);
            for (const slug of [
              "fixture-kinds-pen",
              "fixture-kinds-shelf-pen",
            ]) {
              const entry = fixture.lab.find((item) => item.slug === slug);
              const piece = page.locator("#lens-shell li[data-holds]", {
                has: page.locator(
                  `[data-part='lab.title'][data-ref='${slug}']`,
                ),
              });
              const title = piece.locator("[data-part='lab.title'] a");
              const cord = piece.locator("button[data-block-toggle]");
              assert.equal(
                await piece.locator("[data-part='lab.preview']").count(),
                1,
                `${slug}: its way to play is marked`,
              );
              // Its name, then its cord: the next stop.
              await title.focus();
              await page.keyboard.press("Tab");
              assert.equal(
                await cord.evaluate((el) => el === document.activeElement),
                true,
                `${slug}: the cord follows its name`,
              );
              assert.notEqual(
                await cord.evaluate((el) => getComputedStyle(el).outlineStyle),
                "none",
                `${slug}: the cord shows where the keyboard is`,
              );
              assert.equal(
                (await cord.textContent()).trim(),
                fixture.pages.lab.preview.load[entry.preview.kind],
              );
              assert.equal(await page.locator("#lens-shell iframe").count(), 0);
              assert.ok(
                !asked.includes(entry.preview.frame),
                `${slug}: nothing is asked of its site before the pull`,
              );
              const before = await piece.boundingBox();
              await page.keyboard.press("Enter");
              await page.waitForSelector("#lens-shell iframe");
              assert.equal(
                await piece.locator("iframe").getAttribute("src"),
                entry.preview.frame,
                `${slug} plays itself, where it is`,
              );
              assert.equal(await cord.getAttribute("aria-pressed"), "true");
              assert.equal(
                (await cord.textContent()).trim(),
                fixture.pages.lab.preview.close,
              );
              assert.deepEqual(
                await piece.boundingBox(),
                before,
                `${slug}: nothing moves when it plays`,
              );
              // Escape puts it away, and the Lab stays.
              await page.keyboard.press("Escape");
              await page.waitForTimeout(300);
              assert.equal(await page.locator("#lens-shell iframe").count(), 0);
              assert.equal(await cord.getAttribute("aria-pressed"), "false");
              assert.equal(
                await page.locator("#lens-shell main.hion-screen--lab").count(),
                1,
                "Escape did not leave the Lab",
              );
              assert.deepEqual(await piece.boundingBox(), before);
            }
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: with less motion asked for, nothing in the Lab's places moves`,
          async () => {
            const { context, page, errors } = await open(size, KINDS);
            for (const slug of [
              "fixture-kinds-stack",
              "fixture-kinds-shelved",
            ]) {
              const link = page.locator(
                `#lens-shell [data-part='lab.title'][data-ref='${slug}'] a`,
              );
              await link.focus();
              await link.hover().catch(() => {});
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
          `${size}: the Labbook is kept by month, each a cord knotted on the days written in`,
          async () => {
            const { context, page, errors } = await open(size, NOTEBOOK);
            const fixture = await harnessed(page);
            const months = await page.evaluate(() =>
              [
                ...document.querySelectorAll(
                  "#lens-shell [data-labbook] [data-month]",
                ),
              ].map((month) => {
                const cord = month.querySelector(".hion-tally");
                return {
                  month: month.dataset.month,
                  name: month
                    .querySelector("[data-part='labbook.month']")
                    .textContent.replace(/\s+/g, " ")
                    .trim(),
                  ids: [...month.querySelectorAll("li[id^='u-']")].map(
                    (entry) => entry.id.replace(/^u-/, ""),
                  ),
                  hidden: cord?.getAttribute("aria-hidden"),
                  reachable: cord?.querySelectorAll("a, button, [tabindex]")
                    .length,
                  length: Number(cord?.dataset.length),
                  knots: [...(cord?.querySelectorAll("[data-day]") ?? [])].map(
                    (knot) => Number(knot.dataset.day),
                  ),
                };
              }),
            );
            const expected = labbookMonths(fixture.labbook);
            assert.deepEqual(
              months.map(({ month, ids }) => ({ month, ids })),
              expected.map(({ month, updates }) => ({
                month,
                ids: updates.map((update) => update.id),
              })),
              "newest month first, each holding its own days",
            );
            for (const month of months) {
              const { days } = monthCalendar(month.month, fixture.labbook);
              assert.equal(month.name, monthLabel(month.month));
              assert.equal(month.hidden, "true", "the cord is for the eye");
              assert.equal(month.reachable, 0, "and links nowhere");
              assert.equal(month.length, days.length, "as long as its month");
              assert.deepEqual(
                month.knots,
                days.filter((day) => day.updates.length).map((day) => day.day),
                `${month.month}: a knot for each day written in`,
              );
            }
            assert.equal(
              await page.locator("#lens-shell a[href*='#u-']").count(),
              0,
              "nothing points at the Labbook's knots",
            );
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: the Labbook narrows to one thing it is about, and back`,
          async () => {
            // On /lab the client router answers the narrowing in place.
            const { context, page, errors } = await open(
              size,
              "/lab?lens=hion",
            );
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
            const link = page.locator(
              `#lens-shell [data-part='labbook.subject'][data-ref='${key}']`,
            );
            await link.scrollIntoViewIfNeeded();
            await link.click();
            await page.waitForURL(
              (url) => url.searchParams.get(target.kind) === target.slug,
            );
            await page.waitForTimeout(900);
            const narrowed = await page.evaluate((key) => {
              const visible = (el) => el.checkVisibility();
              const book = document.querySelector("#lens-shell [data-labbook]");
              return {
                lab: !!document.querySelector(
                  "#lens-shell main.hion-screen--lab",
                ),
                focus: document.activeElement?.matches("[data-hion-narrowed]"),
                says: book
                  .querySelector("[data-hion-narrowed]")
                  ?.textContent.replace(/\s+/g, " ")
                  .trim(),
                current: book
                  .querySelector("[aria-current='true']")
                  ?.getAttribute("data-ref"),
                entries: [...book.querySelectorAll("li[id^='u-']")]
                  .filter(visible)
                  .map((entry) => entry.dataset.about ?? ""),
                months: [...book.querySelectorAll("[data-month]")].map(
                  (month) =>
                    visible(month) ===
                    [...month.querySelectorAll("li[id^='u-']")].some(visible),
                ),
                knots: [
                  ...book.querySelectorAll(
                    ".hion-tally [data-day]:not([data-elsewhere])",
                  ),
                ]
                  .filter((knot) => visible(knot.closest("[data-month]")))
                  .map((knot) => knot.dataset.about ?? ""),
              };
            }, key);
            assert.ok(narrowed.lab, "still on the Lab");
            assert.ok(
              narrowed.focus,
              "the line saying what it shows has the focus",
            );
            assert.ok(narrowed.says.includes(target.title), narrowed.says);
            assert.equal(narrowed.current, key);
            assert.equal(narrowed.entries.length, target.count);
            assert.ok(
              narrowed.entries.every((about) => about.split(" ").includes(key)),
              "only the entries about it",
            );
            assert.ok(
              narrowed.knots.every((about) => about.split(" ").includes(key)),
              "only its days are knotted",
            );
            assert.ok(
              narrowed.months.every(Boolean),
              "a month left empty is put away",
            );
            await page.locator("#lens-shell [data-hion-all]").click();
            await page.waitForURL((url) => !url.searchParams.has(target.kind));
            await page.waitForTimeout(900);
            const whole = await page.evaluate(() => ({
              focus: document.activeElement?.getAttribute("data-ref"),
              entries: [
                ...document.querySelectorAll(
                  "#lens-shell [data-labbook] li[id^='u-']",
                ),
              ].filter((el) => el.checkVisibility()).length,
              status: document
                .querySelector("#lens-shell [data-hion-narrowed]")
                ?.checkVisibility(),
            }));
            assert.equal(
              whole.focus,
              key,
              "back to the cord it was narrowed by",
            );
            assert.equal(whole.entries, content.labbook.length);
            assert.equal(whole.status, false);
            assert.deepEqual(errors, []);
            await context.close();

            // Arriving narrowed: it is narrowed already, and says so.
            const arrived = await open(
              size,
              `/lab?lens=hion&${target.kind}=${target.slug}`,
            );
            assert.equal(
              await arrived.page
                .locator("#lens-shell [data-labbook] li[id^='u-']")
                .evaluateAll(
                  (all) => all.filter((el) => el.checkVisibility()).length,
                ),
              target.count,
            );
            assert.ok(
              await arrived.page
                .locator("#lens-shell [data-hion-narrowed]")
                .isVisible(),
              "and says what it shows",
            );
            assert.deepEqual(arrived.errors, []);
            await arrived.context.close();
          },
        );

        await t.test(
          `${size}: an experiment's page is its draft: words with the small blocks hung beside them, and plates across`,
          async () => {
            const { context, page, asked, errors } = await open(size, BLOCKS);
            const laid = await page.evaluate(() => {
              const box = (el) => el?.getBoundingClientRect();
              const spreads = [
                ...document.querySelectorAll(
                  "#lens-shell .hion-spread[data-asides]",
                ),
              ]
                .filter((spread) => spread.querySelector(".hion-prose"))
                .map((spread) => ({
                  text: box(spread.querySelector(".hion-prose")),
                  aside: box(spread.querySelector(".hion-spread__margin")),
                }));
              const steps = document.querySelector(
                "#lens-shell [data-part='block.steps']",
              );
              return {
                spreads: spreads.map(({ text, aside }) => ({
                  beside: aside.left >= text.right - 1,
                  under: aside.top >= text.bottom - 1,
                })),
                plates: document.querySelectorAll("#lens-shell .hion-plate")
                  .length,
                blocks: [
                  ...document.querySelectorAll(
                    "#lens-shell [data-part^='block.']",
                  ),
                ].map((el) => el.dataset.part),
                knots: steps?.querySelectorAll("[data-ink='tally'] [data-step]")
                  .length,
                frames: document.querySelectorAll("#lens-shell iframe").length,
              };
            });
            assert.ok(laid.spreads.length > 0, "the page has spreads");
            assert.ok(laid.plates > 0, "and plates");
            if (size === "desktop")
              assert.ok(
                laid.spreads.every(({ beside }) => beside),
                "a spread's small blocks hang in its margin",
              );
            else
              assert.ok(
                laid.spreads.every(({ under }) => under),
                "on a phone a spread's small blocks follow its words",
              );
            assert.deepEqual(
              [...new Set(laid.blocks)].sort(),
              BLOCK_PARTS,
              "every block is drawn, and the one no lens knows is passed over",
            );
            assert.equal(
              laid.knots,
              3,
              "each step is a knot tied along one thread",
            );
            assert.equal(laid.frames, 0);
            assert.deepEqual(asked, [], "nothing live before a pull");
            // The Pen, asked for, plays in its place; Escape puts it away
            // and leaves the page open.
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
              await page
                .locator("#lens-shell main.hion-screen--lab-entry")
                .count(),
              1,
              "Escape did not leave the page",
            );
            // With less motion asked for, a looping film stands still.
            assert.equal(
              await page
                .locator(
                  "#lens-shell [data-ref='fixture-blocks/the-loop'] video",
                )
                .evaluate((film) => film.paused),
              true,
            );
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: a looping film plays by itself, silently, when motion is welcome`,
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
          `${size}: a page that says little hangs what it has by its head, and no empty loop`,
          async () => {
            for (const [fixture, slug, holds, pictures] of [
              ["lab-no-cover", "fixture-sketch", "words", 0],
              ["lab-bare-entry", "fixture-poster", "print", 1],
            ]) {
              const { context, page, errors } = await open(
                size,
                harness(fixture, `/lab/${slug}`),
              );
              const shown = await page.evaluate(() => {
                const head = document.querySelector(
                  "#lens-shell .hion-entry-head",
                );
                const picture = document.querySelector(
                  "#lens-shell main .hion-picture img",
                );
                const box = (el) => el?.getBoundingClientRect();
                return {
                  holds: head?.dataset.holds,
                  pictures: document.querySelectorAll("#lens-shell main img")
                    .length,
                  // the picture hangs level with the head, not under it
                  byHead: picture ? box(picture).top < box(head).bottom : null,
                  empty: [
                    ...document.querySelectorAll("#lens-shell main .hion-loop"),
                  ].filter(
                    (loop) =>
                      !loop.textContent.trim() && !loop.querySelector("img"),
                  ).length,
                };
              });
              assert.equal(shown.holds, holds, slug);
              assert.equal(shown.pictures, pictures, slug);
              if (pictures && size === "desktop")
                assert.ok(
                  shown.byHead,
                  `${slug}'s one picture hangs by its head`,
                );
              assert.equal(shown.empty, 0, `${slug} has no empty loop`);
              assert.equal(
                await overflow(page),
                0,
                "nothing wider than the screen",
              );
              assert.deepEqual(errors, []);
              await context.close();
            }
          },
        );

        await t.test(
          `${size}: a project told with blocks is drawn as a draft too`,
          async () => {
            const project = content.projects[0];
            const { context, page, asked, errors } = await open(
              size,
              harness("project-blocks", `/projects/${project.slug}`),
            );
            const blocks = await page
              .locator("#lens-shell [data-part^='block.']")
              .evaluateAll((all) =>
                [...new Set(all.map((el) => el.dataset.part))].sort(),
              );
            assert.deepEqual(blocks, BLOCK_PARTS);
            assert.ok(
              (await page
                .locator("#lens-shell [data-part='project.body']")
                .count()) > 0,
              "its words are its body",
            );
            assert.deepEqual(asked, [], "nothing live before a pull");
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
