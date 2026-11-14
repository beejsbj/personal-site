/** Calling Card's second pass of the Lab (issue #168): the Bench, the
 * Shelf and the Labbook are each their own screen of the game, not a grid
 * and two lists. The Bench is a Palace map, its requests targets on the
 * infiltration route with the cursor's "you are here" on the one
 * selected; the Shelf is the Velvet Room's compendium, an arcana card for
 * each case laid side by side; the Labbook is the calendar, each month a
 * strip of its days that marks the day being read, and the days between
 * two entries said as the game says time passing.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read in the harness on fixtures, whatever src/content holds: lab-kinds
 * (every kind of card in both places) and labbook-notebook (four months),
 * and on /lab for the narrowing the client router answers. BASE=<origin>
 * runs it against a server already up; LAB_ONLY=<regexp> runs the
 * subtests whose names match. Every request to another site is answered
 * with a blank. Same server and Chromium as prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import {
  labbookMonths,
  labbookSubjects,
  monthCalendar,
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

/** Whole days from one date (YYYY-MM-DD) back to another. */
const between = (later, earlier) =>
  Math.round((Date.parse(later) - Date.parse(earlier)) / 86_400_000);

/** What each entry should say of the days since the one above it, in the
 * order they are shown: nothing for the first, nor for a day or less. */
/** In the page: what turns (scrolls) the board, the board itself on a
 * desktop, the screen's main on a phone. */
const TURNER = `(el) => {
  for (let at = el; at; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at);
    if ((overflowY === "auto" || overflowY === "scroll") && at.scrollHeight > at.clientHeight) return at;
  }
  return document.scrollingElement;
}`;

const beats = (updates, phrase) =>
  updates.map((update, i) => {
    const n = i ? between(updates[i - 1].date, update.date) : 0;
    return n > 1 ? phrase.replace("{n}", String(n)) : null;
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Calling Card's Lab is three screens: a Palace map, a compendium and a calendar",
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
    const lens = content.lenses["calling-card"];

    /** A page at one size, once the shell has drawn it. */
    const open = async (size, path, { motion = false } = {}) => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: motion ? "no-preference" : "reduce",
      });
      await context.route(
        (url) => url.origin !== base,
        (route) => route.fulfill({ contentType: "text/html", body: "" }),
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}${path}`, { waitUntil: "load" });
      await page.waitForSelector("html[data-shell-ready]", { timeout: 30000 });
      if (path.startsWith("/prism/harness"))
        await page.waitForFunction(() => window.prismHarness?.ready);
      await page.waitForTimeout(700);
      return { context, page, errors };
    };
    const harnessed = (page) =>
      page.evaluate(() => window.prismHarness.content);

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: each place fills the board as its own screen, on its own ground`,
          async () => {
            const { context, page, errors } = await open(size, KINDS);
            const screens = await page.evaluate((TURNER) => {
              const board = eval(TURNER)(
                document.querySelector("#lens-shell .cc-requests__sheet"),
              );
              return [
                ...document.querySelectorAll(
                  "#lens-shell [data-lab-place], #lens-shell [data-cc-labbook]",
                ),
              ].map((place) => ({
                place: place.dataset.labPlace ?? "labbook",
                kind: place.dataset.ccScreen ?? null,
                height: place.getBoundingClientRect().height,
                board: board.clientHeight,
                ground: getComputedStyle(place).backgroundImage,
              }));
            }, TURNER);
            assert.deepEqual(
              screens.map(({ place, kind }) => [place, kind]),
              [
                ["bench", "map"],
                ["shelf", "compendium"],
                ["labbook", "calendar"],
              ],
            );
            for (const screen of screens)
              assert.ok(
                screen.height >= screen.board - 2,
                `the ${screen.place} fills the board (${screen.height} of ${screen.board})`,
              );
            const grounds = screens.map(({ ground }) => ground);
            assert.ok(
              grounds.every((ground) => ground !== "none"),
              "each is painted",
            );
            assert.equal(new Set(grounds).size, 3, "each on a ground of its own");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: the Bench is a Palace map, its route running through every request, and the cursor on the one selected`,
          async () => {
            const { context, page, errors } = await open(size, KINDS);
            const map = () =>
              page.evaluate(() => {
                const bench = document.querySelector(
                  "#lens-shell [data-lab-place='bench']",
                );
                const route = bench.querySelector("svg.cc-route");
                const here = bench.querySelector(".cc-route__here");
                if (!route) return null;
                const frame = route.getBoundingClientRect();
                const path = route.querySelector(".cc-route__path");
                // Where the route turns, on the page.
                const points = [
                  ...path.getAttribute("d").matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g),
                ].map(([, x, y]) => [frame.left + Number(x), frame.top + Number(y)]);
                const pins = [...bench.querySelectorAll(".cc-pin")].map((pin) => {
                  const box = pin
                    .querySelector("a.cc-request")
                    .getBoundingClientRect();
                  return {
                    left: box.left,
                    right: box.right,
                    top: box.top,
                    bottom: box.bottom,
                    selected:
                      pin.querySelector("a.cc-request").dataset.state === "selected",
                  };
                });
                const spot = here?.getBoundingClientRect();
                return {
                  hidden: route.getAttribute("aria-hidden"),
                  reachable: route.querySelectorAll("a, button, [tabindex]").length,
                  points,
                  pins,
                  here: spot && {
                    x: spot.left + spot.width / 2,
                    y: spot.top + spot.height / 2,
                  },
                };
              });
            const drawn = await map();
            assert.ok(drawn, "the Bench has its route");
            assert.equal(drawn.hidden, "true", "the route is for the eye");
            assert.equal(drawn.reachable, 0, "and nothing on it is a stop");
            // The route calls at every request, in the board's order.
            let last = -1;
            for (const [i, pin] of drawn.pins.entries()) {
              const at = drawn.points.findIndex(
                ([x, y], k) =>
                  k > last &&
                  x >= pin.left - 1 &&
                  x <= pin.right + 1 &&
                  y >= pin.top - 1 &&
                  y <= pin.bottom + 1,
              );
              assert.ok(at > last, `the route calls at request ${i + 1}, in order`);
              last = at;
            }
            // The cursor is on the request selected, and follows the keys.
            const inside = ({ x, y }, pin) =>
              x >= pin.left - 2 &&
              x <= pin.right + 2 &&
              y >= pin.top - 40 &&
              y <= pin.bottom + 2;
            const first = page.locator("#lens-shell [data-lab-place='bench'] a.cc-request").first();
            await first.focus();
            await page.waitForTimeout(200);
            let now = await map();
            const one = now.pins.findIndex((pin) => pin.selected);
            assert.equal(one, 0);
            assert.ok(now.here, "the map has a cursor");
            assert.ok(inside(now.here, now.pins[0]), "the cursor is on the first");
            await page.keyboard.press("ArrowDown");
            await page.waitForTimeout(300);
            now = await map();
            assert.equal(now.pins.findIndex((pin) => pin.selected), 1);
            assert.ok(inside(now.here, now.pins[1]), "and moves to the next");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: the Shelf is the compendium, an arcana card for each case laid side by side`,
          async () => {
            const { context, page, errors } = await open(size, KINDS);
            const cards = await page.evaluate(() =>
              [
                ...document.querySelectorAll(
                  "#lens-shell [data-lab-place='shelf'] .cc-pin",
                ),
              ].map((pin) => {
                const box = (el) => el.getBoundingClientRect();
                const frame = box(pin);
                const card = pin.querySelector("a.cc-request");
                const no = box(card.querySelector(".cc-request__no"));
                const name = box(card.querySelector(".cc-request__title"));
                return {
                  top: frame.top,
                  left: frame.left,
                  width: frame.width,
                  height: frame.height,
                  // Its number heads the card; its name is under its art.
                  numberAbove: no.bottom <= name.top,
                  inside:
                    no.left >= frame.left - 1 &&
                    no.right <= frame.right + 1 &&
                    name.left >= frame.left - 1 &&
                    name.right <= frame.right + 1,
                };
              }),
            );
            assert.ok(cards.length > 2);
            for (const [i, card] of cards.entries()) {
              assert.ok(card.numberAbove, `card ${i + 1}: its number heads it`);
              assert.ok(card.inside, `card ${i + 1}: its words stay on it`);
              assert.ok(card.height > card.width, `card ${i + 1} stands upright`);
            }
            assert.ok(
              cards.some((one, i) =>
                cards.some(
                  (other, k) =>
                    k !== i &&
                    Math.abs(other.top - one.top) < 2 &&
                    other.left !== one.left,
                ),
              ),
              "cards are laid side by side",
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: the Labbook is the calendar, each month a strip of its days, the day being read marked on it`,
          async () => {
            const { context, page, errors } = await open(size, NOTEBOOK);
            const content = await harnessed(page);
            const months = labbookMonths(content.labbook);
            const strips = await page.evaluate(() =>
              [...document.querySelectorAll("#lens-shell [data-cc-month]")].map(
                (month) => {
                  const days = [...month.querySelectorAll(".cc-cal__day")];
                  return {
                    month: month.dataset.ccMonth,
                    days: days.length,
                    // Rows by layout: a struck day is turned, the day being
                    // read stands up out of the strip.
                    rows: days
                      .map((day) => day.offsetTop + day.offsetHeight / 2)
                      .sort((a, b) => a - b)
                      .filter((middle, i, all) => !i || middle - all[i - 1] > 10)
                      .length,
                  };
                },
              ),
            );
            for (const strip of strips) {
              const { days } = monthCalendar(strip.month, content.labbook);
              assert.equal(strip.days, days.length, `${strip.month}: every day`);
              assert.ok(
                strip.rows <= (size === "desktop" ? 1 : 2),
                `${strip.month}: a strip, ${strip.rows} rows`,
              );
            }
            // Turn the board to a day well into the second month: its strip
            // stays in view, and marks that day.
            const { month, updates } = months[1];
            const update = updates[Math.min(1, updates.length - 1)];
            const read = await page.evaluate(
              async ({ month, id, TURNER }) => {
                const board = eval(TURNER)(
                  document.querySelector("#lens-shell .cc-requests__sheet"),
                );
                const entry = document.getElementById(`u-${id}`);
                const strip = document.querySelector(
                  `#lens-shell [data-cc-month='${month}'] .cc-month__page`,
                );
                // As a reader brings it up: just under the strip.
                entry.scrollIntoView({ block: "start", behavior: "instant" });
                const view = board.getBoundingClientRect();
                await new Promise((done) => setTimeout(done, 500));
                const box = strip.getBoundingClientRect();
                return {
                  stripTop: box.top - view.top,
                  stripBottom: box.bottom - view.top,
                  entryTop: entry.getBoundingClientRect().top - view.top,
                  board: view.height,
                  today: [
                    ...document.querySelectorAll("#lens-shell .cc-cal__day[data-today]"),
                  ].map((day) => ({
                    month: day.closest("[data-cc-month]").dataset.ccMonth,
                    day: Number(day.textContent),
                  })),
                };
              },
              { month, id: update.id, TURNER },
            );
            assert.ok(
              read.stripTop >= -1 && read.stripBottom <= read.board * 0.5,
              `the month's strip stays at the top of the board (${read.stripTop} to ${read.stripBottom})`,
            );
            assert.ok(
              read.entryTop >= read.stripBottom - 4,
              `the day comes up under the strip, not behind it (${read.entryTop}, ${read.stripBottom})`,
            );
            assert.deepEqual(
              read.today,
              [{ month, day: Number(update.date.slice(8, 10)) }],
              "the day being read is marked, and only it",
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: between two entries, the days that passed are said, for the eye`,
          async () => {
            const { context, page, errors } = await open(size, NOTEBOOK);
            const content = await harnessed(page);
            assert.ok(lens.lab.earlier, "the lens names the days between");
            const order = labbookMonths(content.labbook).flatMap(
              ({ updates }) => updates,
            );
            const said = await page.evaluate(() =>
              [...document.querySelectorAll("#lens-shell [data-cc-labbook] .cc-entry")].map(
                (entry) => entry.dataset.earlier ?? null,
              ),
            );
            assert.deepEqual(said, beats(order, lens.lab.earlier));
            const one = page
              .locator("#lens-shell [data-cc-labbook] .cc-entry[data-earlier]")
              .first();
            assert.ok(await one.count(), "the fixture has a gap to say");
            assert.ok(
              !(await one.ariaSnapshot()).includes(
                lens.lab.earlier.replace("{n}", ""),
              ),
              "the gap is not read out among the entry's words",
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: narrowed, the days between are counted between the entries shown`,
          async () => {
            const { context, page, errors } = await open(
              size,
              "/lab?lens=calling-card",
            );
            const subjects = labbookSubjects(content.labbook, content);
            const target = subjects.find((s) => s.count > 1) ?? subjects[0];
            const key = `${target.kind}:${target.slug}`;
            await page
              .locator(`#lens-shell [data-part='labbook.subject'][data-ref='${key}']`)
              .click();
            await page.waitForURL(
              (url) => url.searchParams.get(target.kind) === target.slug,
            );
            await page.waitForTimeout(900);
            const shown = await page.evaluate(() =>
              [...document.querySelectorAll("#lens-shell [data-cc-labbook] .cc-entry")]
                .filter((entry) => entry.checkVisibility())
                .map((entry) => ({
                  id: entry.id.replace(/^u-/, ""),
                  earlier: entry.dataset.earlier ?? null,
                })),
            );
            const order = labbookMonths(content.labbook)
              .flatMap(({ updates }) => updates)
              .filter((update) => shown.some(({ id }) => id === update.id));
            assert.equal(shown.length, target.count);
            assert.deepEqual(
              shown.map(({ earlier }) => earlier),
              beats(order, lens.lab.earlier),
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
