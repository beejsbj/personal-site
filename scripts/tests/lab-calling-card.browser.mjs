/** Calling Card's Lab (issue #96): the Bench and the Shelf on the request
 * board, the Labbook with its artifacts and its redacted updates, the
 * pause menu's phone where the recent updates are, and an experiment's own
 * record and graduation. There is no wire of headlines.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on /lab and / against /prism/content.json, and in the harness on
 * the `labbook`, `lab-full-page`, `lab-bare-entry` and `lab-no-cover`
 * fixtures, which hold every state whatever src/content does. Same server
 * and Chromium as prism-parity.browser.mjs. LAB_SHOTS=<dir> also saves
 * pictures of each part at each size; LAB_ONLY=<regexp> runs only the
 * subtests it names. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import {
  labbookFixture,
  REDACTION_MARKER,
} from "../../src/prism/labbook-fixture.ts";
import { updateDateLabel } from "../../src/lib/labbook.ts";
import { labPlaces } from "../../src/lib/rules.ts";
import { checkRedactedLine, redactedLine } from "./lib/redaction.mjs";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const SHOTS = process.env.LAB_SHOTS;
const ONLY = process.env.LAB_ONLY ? new RegExp(process.env.LAB_ONLY) : null;
const PEN_FRAME = "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result";
const DEMO_FRAME = "https://example.com/fixture-demo/";
const fixture = labbookFixture();
const harness = (name, route) =>
  `/prism/harness?lens=calling-card&fixture=${name}&route=${encodeURIComponent(route)}`;
const ROOM = harness("labbook", "/lab");

const words = (text) => (text ?? "").replace(/\s+/g, " ").trim();

/** The board's places as a visitor meets them, in order. */
const places = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    return [...document.querySelectorAll("#lens-shell [data-lab-place]")].map(
      (place) => ({
        place: place.dataset.labPlace,
        heading: text(
          document.getElementById(place.getAttribute("aria-labelledby")),
        ),
        entries: [...place.querySelectorAll("[data-part='lab.title']")].map(
          (title) => {
            const entry = title.closest("li");
            const card = title.closest("a");
            return {
              slug: title.dataset.ref,
              // Cut-out lettering says its word once, for everyone.
              title: text(title.querySelector(".cc-sr") ?? title),
              href: card?.getAttribute("href") ?? null,
              summary: text(entry.querySelector("[data-part='lab.summary']")),
              number: text(card.querySelector(".cc-request__no")),
              featured: entry.hasAttribute("data-lab-featured"),
              width: entry.getBoundingClientRect().width,
              // Anything on the card that says nothing: an empty label, a
              // separator between two things left unsaid.
              hollow: [...card.querySelectorAll(":scope > span")].filter(
                (el) => !/[\p{L}\p{N}]/u.test(el.textContent),
              ).length,
            };
          },
        ),
      }),
    );
  });

/** The Labbook (or an experiment's stretch of it): each update, in order. */
const labbook = (page) =>
  page.evaluate(async () => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const section = document.querySelector("#lens-shell .cc-log");
    if (!section) return null;
    const entries = [];
    for (const item of section.querySelectorAll("ol > li")) {
      const title = item.querySelector(".cc-entry__title");
      const pictures = [];
      for (const img of item.querySelectorAll("img")) {
        img.scrollIntoView({ block: "center", inline: "nearest" });
        for (let i = 0; i < 50 && !img.complete; i += 1)
          await new Promise((done) => setTimeout(done, 100));
        pictures.push({
          src: img.getAttribute("src"),
          alt: img.alt,
          painted: img.naturalWidth > 0 && img.checkVisibility(),
        });
      }
      // Every word of it that is said aloud, a piece at a time.
      const said = [];
      const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.parentElement.closest("[aria-hidden='true']")) continue;
        if (node.textContent.trim()) said.push(text(node));
      }
      entries.push({
        id: item.id.replace(/^u-/, ""),
        anchored: item.id.startsWith("u-"),
        part: item.dataset.part ?? null,
        ref: item.dataset.ref ?? null,
        said,
        origin: text(item.querySelector(".cc-entry__origin")),
        title: text(title?.querySelector("a")?.firstChild ?? title),
        href: title?.querySelector("a")?.getAttribute("href") ?? null,
        summary: text(item.querySelector(".cc-entry__summary")),
        date: item.querySelector("time")?.getAttribute("datetime") ?? null,
        dateLabel: text(item.querySelector("time .cc-sr")),
        // What the day plate shows: the year, month/day, the weekday.
        plate: [...item.querySelectorAll("time > [aria-hidden='true']")].map(
          text,
        ),
        related: [...item.querySelectorAll("[data-related]")].map((el) => ({
          kind: el.dataset.related,
          label: text(el.querySelector("span")),
          title: text(el.querySelector("a")?.firstChild),
          href: el.querySelector("a")?.getAttribute("href") ?? null,
        })),
        pictures,
        bars: item.querySelectorAll("[data-redaction-bar]").length,
        controls: item.querySelectorAll("a, button, iframe, video, audio")
          .length,
        links: item.querySelectorAll("a").length,
      });
    }
    return {
      heading: text(
        document.getElementById(section.getAttribute("aria-labelledby")),
      ),
      whole: section.hasAttribute("data-cc-labbook"),
      afterShelf: !!(
        document
          .querySelector("#lens-shell [data-lab-place='shelf']")
          ?.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING
      ),
      entries,
    };
  });

/** Where the wire of headlines used to be, by every name it had: the wire
 * itself, and the column put round the pause menu's plates to hold it. */
const WIRE = ":is([data-cc-wire], .cc-wire, .cc-home__side)";

/** The phone's messages, top to bottom: the home page's recent updates. */
const messages = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    return [
      ...document.querySelectorAll(
        "#lens-shell .cc-phone .cc-msg:not(.cc-msg--typing)",
      ),
    ].map((message) => {
      const link = message.querySelector("a");
      return {
        title: text(message.querySelector(".cc-msg__title")),
        summary: text(message.querySelector(".cc-msg__body")),
        // Its words, without the arrow that marks a way out.
        link: link ? text(link.firstChild) : undefined,
        href: link?.getAttribute("href") ?? undefined,
        origin: text(message.querySelector(".cc-msg__meta")),
      };
    });
  });

/** Whatever on the screen has been slid sideways, or could be: the document
 * wider than the screen, a column scrolled off its start, or one with room
 * to be. Nothing can reach the lens's painted grounds. On a phone the pause menu's portrait and a
 * brief's tilted paper hang over the edge of their columns, as they did
 * before the Lab: those two may have room, and must still not have moved. */
const sideways = (page) =>
  page.evaluate(() => {
    const name = (el) => `${el.tagName.toLowerCase()}.${el.className}`;
    const out = [];
    const wide =
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth;
    if (wide > 0) out.push(`the document, by ${wide}px`);
    for (const el of document.querySelectorAll("#lens-shell *")) {
      if (el.closest(".cc-sr, .cc-screen__bg, .cc-wipe")) continue;
      if (el.scrollLeft !== 0) out.push(`${name(el)} is at ${el.scrollLeft}`);
      // The screen itself is fixed: only its columns turn.
      if (el.scrollTop !== 0 && el.matches(".cc-stage, .cc-screen"))
        out.push(`${name(el)} has slid up ${el.scrollTop}`);
      const { overflowX } = getComputedStyle(el);
      if (
        overflowX !== "visible" &&
        overflowX !== "clip" &&
        el.scrollWidth > el.clientWidth + 1 &&
        !el.matches(":is(.cc-home, .cc-brief) > main")
      )
        out.push(`${name(el)} has ${el.scrollWidth - el.clientWidth}px to go`);
    }
    return out;
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Calling Card shows the Bench, the Shelf, the Labbook and the recent updates",
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
    const copy = content.pages.lab.labbook;
    const lens = content.lenses["calling-card"];
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });

    /** A page at one size, once the shell has drawn it. Nothing here leaves
     * the test: whatever a page asks of another origin is written down and
     * answered with a blank. `bend` changes content.json on its way in. */
    const open = async (size, path, { motion = false, bend } = {}) => {
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
      if (bend)
        await context.route("**/prism/content.json*", async (route) => {
          const response = await route.fetch();
          return route.fulfill({
            response,
            json: bend(await response.json()),
          });
        });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
      assert.equal(response.status(), 200, `${path} answers`);
      await page.waitForSelector("html[data-shell-ready]", { timeout: 30000 });
      if (path.startsWith("/prism/harness"))
        await page.waitForFunction(() => window.prismHarness?.ready);
      await page.waitForTimeout(700);
      return { context, page, asked, errors };
    };
    /** A picture of the screen with `selector` in the middle of it. */
    const shot = async (page, selector, name) => {
      if (!SHOTS) return;
      if (selector)
        await page
          .locator(selector)
          .first()
          .evaluate((el) =>
            el.scrollIntoView({ block: "center", inline: "nearest" }),
          );
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(SHOTS, `${name}.png`) });
    };

    try {
      for (const size of Object.keys(SIZES)) {
        const { width, height } = SIZES[size].viewport;

        await t.test(
          `${size}: /lab pins the Bench and stands the Shelf, each in the shared order`,
          async () => {
            const { context, page, errors } = await open(
              size,
              "/lab?lens=calling-card",
            );
            const room = await places(page);
            const expected = labPlaces(content.lab);
            assert.deepEqual(
              room.map(({ place, heading }) => ({ place, heading })),
              expected.map(({ place }) => ({
                place,
                heading: content.pages.lab.places[place].title,
              })),
              "the Bench, then the Shelf, each under its heading",
            );
            for (const [i, group] of expected.entries()) {
              assert.deepEqual(
                room[i].entries.map(({ slug, title, href, summary }) => ({
                  slug,
                  title,
                  href,
                  summary,
                })),
                group.entries.map((entry) => ({
                  slug: entry.slug,
                  title: entry.title,
                  href: entry.detail,
                  summary: entry.summary,
                })),
                `the ${group.place} in the shared order`,
              );
              for (const entry of room[i].entries)
                assert.equal(
                  entry.hollow,
                  0,
                  `${entry.slug} leaves no empty label or stray separator`,
                );
            }
            // One run of request numbers down the whole board.
            assert.deepEqual(
              room.flatMap(({ entries }) =>
                entries.map(({ number }) => number),
              ),
              expected
                .flatMap(({ entries }) => entries)
                .map((_, i) =>
                  lens.lab.number.replace(
                    "{n}",
                    String(i + 1).padStart(2, "0"),
                  ),
                ),
            );
            // Pride of place is given as the content gives it: to one
            // experiment, or to none (both are looked at on fixtures below).
            const bench = room.find(({ place }) => place === "bench");
            assert.deepEqual(
              bench.entries.map((entry) => entry.featured),
              expected
                .find(({ place }) => place === "bench")
                .entries.map((entry) => !!entry.featured),
            );
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await shot(page, null, `calling-card-lab-${size}`);
            await shot(
              page,
              "[data-lab-place='bench'] li:nth-child(3)",
              `calling-card-bench-${size}`,
            );
            await shot(
              page,
              "[data-lab-place='shelf'] li:nth-child(3)",
              `calling-card-shelf-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: the Bench with one experiment featured, and with none`,
          async () => {
            const benchOf = async (page) => {
              const { lab } = await page.evaluate(
                () => window.prismHarness.content,
              );
              return {
                expected: labPlaces(lab).find(({ place }) => place === "bench")
                  .entries,
                shown: (await places(page)).find(
                  ({ place }) => place === "bench",
                ).entries,
              };
            };

            // One featured: the last on the Bench by order, so it leads
            // only because it is featured.
            const one = await open(size, harness("lab-featured", "/lab"));
            const withOne = await benchOf(one.page);
            assert.ok(
              withOne.expected[0].featured &&
                withOne.expected[0].order > withOne.expected[1].order,
              "the fixture features the last experiment by order",
            );
            assert.deepEqual(
              withOne.shown.map((entry) => entry.slug),
              withOne.expected.map((entry) => entry.slug),
              "it leads the Bench",
            );
            assert.deepEqual(
              withOne.shown.map((entry) => entry.featured),
              withOne.shown.map((_, i) => i === 0),
              "one experiment has pride of place",
            );
            const [lead, ...rest] = withOne.shown;
            if (size === "desktop")
              assert.ok(
                rest.every((entry) => entry.width < lead.width),
                "and it is given more room than the rest",
              );
            assert.deepEqual(await sideways(one.page), [], "nothing slides");
            assert.deepEqual(one.errors, []);
            await shot(
              one.page,
              "#lens-shell [data-lab-place='bench']",
              `calling-card-bench-featured-${size}`,
            );
            await one.context.close();

            // None featured: the same Bench in its plain order, no
            // experiment marked and none given the featured one's room.
            const none = await open(size, harness("lab-none-featured", "/lab"));
            const without = await benchOf(none.page);
            assert.ok(without.expected.every((entry) => !entry.featured));
            assert.deepEqual(
              without.shown.map((entry) => entry.slug),
              without.expected.map((entry) => entry.slug),
              "the Bench in its own order",
            );
            assert.deepEqual(
              without.shown.filter((entry) => entry.featured),
              [],
              "no experiment is marked as featured",
            );
            if (size === "desktop")
              assert.ok(
                without.shown.every((entry) => entry.width < lead.width),
                "and none is given the featured one's room",
              );
            assert.deepEqual(await sideways(none.page), [], "nothing slides");
            assert.deepEqual(none.errors, []);
            await shot(
              none.page,
              "#lens-shell [data-lab-place='bench']",
              `calling-card-bench-none-featured-${size}`,
            );
            await none.context.close();
          },
        );

        await t.test(
          `${size}: back from a brief, the board is turned to the request it was opened from`,
          async () => {
            // A request far enough down the board to be out of sight.
            const order = labPlaces(content.lab).flatMap(
              ({ entries }) => entries,
            );
            const far = order.findLast(
              (entry) => entry.hasPage && order.indexOf(entry) >= 6,
            );
            assert.ok(far, "an experiment with a page, well down the board");
            const { context, page, errors } = await open(
              size,
              "/lab?lens=calling-card",
            );
            await page
              .locator(`#lens-shell a.cc-request[href="${far.detail}"]`)
              .focus();
            await page.keyboard.press("Enter");
            await page.waitForURL((url) => url.pathname === far.detail);
            await page.waitForSelector("#lens-shell .cc-brief");
            await page.keyboard.press("Escape");
            await page.waitForURL((url) => url.pathname === "/lab");
            await page.waitForSelector("#lens-shell .cc-requests");
            await page.waitForTimeout(700);
            const card = await page
              .locator("#lens-shell .cc-request[data-state='selected']")
              .evaluate((el) => {
                const { top, bottom } = el.getBoundingClientRect();
                return { href: el.getAttribute("href"), top, bottom };
              });
            assert.equal(card.href, far.detail, "the cursor is on it");
            assert.ok(
              card.top >= 0 && card.bottom <= height,
              `and it is on screen (${card.top} to ${card.bottom} of ${height})`,
            );
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: what an experiment need not say is not asked of it`,
          async () => {
            // No experiment says a type or an era any more; the board and
            // its brief are handed neither, and show no label for them.
            for (const route of ["/lab", "/lab/fixture-sketch"]) {
              const { context, page, errors } = await open(
                size,
                harness("lab-no-cover", route),
              );
              // On the board, its own card; on its brief, the whole page.
              const shown = await page.evaluate(() => {
                const card = document
                  .querySelector(
                    "#lens-shell [data-lab-place] [data-ref='fixture-sketch']",
                  )
                  ?.closest("li");
                return {
                  text: (card ?? document.querySelector("#lens-shell main"))
                    .textContent,
                  entry: window.prismHarness.content.lab.find(
                    (entry) => entry.slug === "fixture-sketch",
                  ),
                };
              });
              for (const gone of ["type", "sourceEra"])
                assert.ok(!(gone in shown.entry), `${route} is handed ${gone}`);
              assert.ok(shown.text.includes(shown.entry.summary), route);
              for (const label of ["Type", "Era"])
                assert.equal(
                  await page
                    .locator("#lens-shell main")
                    .getByText(label, { exact: true })
                    .count(),
                  0,
                  `${route} has no "${label}" label`,
                );
              assert.deepEqual(errors, []);
              await context.close();
            }
          },
        );

        await t.test(
          `${size}: /lab turns the calendar back through the seeded updates, newest first, each with its anchor`,
          async () => {
            const { context, page } = await open(
              size,
              "/lab?lens=calling-card",
            );
            const book = await labbook(page);
            assert.ok(book, "the Lab has a Labbook");
            assert.ok(book.whole);
            assert.equal(book.heading, copy.title);
            assert.ok(book.afterShelf, "the Labbook comes below the Shelf");
            assert.deepEqual(
              book.entries.map((entry) => entry.id),
              content.labbook.map((update) => update.id),
            );
            const dates = book.entries.map((entry) => entry.date);
            assert.deepEqual(
              dates,
              [...dates].sort().reverse(),
              "newest first",
            );
            for (const update of content.labbook) {
              const entry = book.entries.find((item) => item.id === update.id);
              assert.ok(entry.anchored, `${update.id} is where its links land`);
              assert.equal(entry.part, "update.item");
              assert.equal(entry.ref, update.id);
              assert.equal(entry.title, update.title);
              assert.equal(entry.summary, update.summary);
              assert.equal(entry.date, update.date);
              assert.equal(entry.dateLabel, updateDateLabel(update.date));
              const [year, month, day] = update.date.split("-").map(Number);
              assert.deepEqual(entry.plate, [
                String(year),
                `${month}/${day}`,
                lens.weekdays[
                  new Date(Date.UTC(year, month - 1, day)).getUTCDay()
                ],
              ]);
              assert.equal(
                entry.origin,
                `${content.site.updateSources[update.source]} · ${content.site.updateKinds[update.kind]}`,
              );
              assert.equal(entry.href, update.href ?? null);
            }
            assert.deepEqual(await sideways(page), [], "nothing slides");
            await shot(
              page,
              ".cc-log ol > li:nth-child(2)",
              `calling-card-lab-labbook-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a link to an update lands on its day in the Labbook`,
          async () => {
            const { context, page } = await open(
              size,
              "/lab?lens=calling-card#u-qrng-demos",
              { motion: true },
            );
            await page.waitForTimeout(900);
            const landed = await page.evaluate(() => {
              const target = document.querySelector(
                "#lens-shell [data-cc-landed]",
              );
              if (!target) return null;
              const { top, bottom } = target.getBoundingClientRect();
              return {
                id: target.id,
                top,
                bottom,
                marked: document.querySelectorAll(
                  "#lens-shell [data-cc-landed]",
                ).length,
              };
            });
            assert.ok(landed, "an update is marked as the one landed on");
            assert.equal(landed.id, "u-qrng-demos");
            assert.equal(landed.marked, 1);
            assert.ok(
              landed.top >= 0 && landed.bottom <= height,
              `the update is on screen (${landed.top} to ${landed.bottom} of ${height})`,
            );
            assert.deepEqual(await sideways(page), [], "nothing slid sideways");
            await shot(page, null, `calling-card-landed-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: an update with nowhere to go is text, not a link, on the phone and in the Labbook`,
          async () => {
            const written = fixture.labbook.filter(
              (update) => update.visibility === "open",
            );
            const nowhere = written.filter((update) => !update.href);
            assert.ok(nowhere.length >= 2, "the fixture has such updates");
            assert.ok(written.length > nowhere.length, "and ones that do go");
            // Nothing on the screen points at an update's place in the Labbook.
            const pointers = (page) =>
              page.locator("#lens-shell a[href*='#u-']").count();

            const home = await open(size, harness("labbook", "/"));
            const stream = (
              await home.page.evaluate(() => window.prismHarness.content)
            ).updates;
            await home.page.locator("#lens-shell .cc-phonechip").click();
            await home.page.waitForSelector("#lens-shell .cc-phone .cc-msg");
            const thread = await messages(home.page);
            assert.equal(thread.length, stream.length);
            for (const update of stream) {
              const message = thread.find(
                (item) => item.title === update.title,
              );
              assert.ok(message, `${update.id} is a message`);
              // A message with nowhere to go has no link under its words.
              assert.equal(message.href, update.href, update.id);
              assert.equal(message.link, update.linkLabel, update.id);
            }
            for (const update of nowhere)
              assert.equal(
                thread.find((item) => item.title === update.title).href,
                undefined,
                `${update.id} has no link`,
              );
            assert.equal(await pointers(home.page), 0);
            assert.deepEqual(home.errors, []);
            await home.page.waitForTimeout(600);
            await shot(home.page, null, `calling-card-home-nowhere-${size}`);
            await home.context.close();

            const room = await open(size, ROOM);
            const book = (await labbook(room.page)).entries;
            for (const update of written) {
              const entry = book.find((item) => item.id === update.id);
              assert.equal(entry.href, update.href ?? null, update.id);
            }
            // With nothing it is about and nothing that lives elsewhere,
            // such an update has no link in it at all.
            for (const id of ["fixture-film", "fixture-tone"])
              assert.equal(
                book.find((entry) => entry.id === id).links,
                0,
                `${id} has no link in it`,
              );
            assert.equal(await pointers(room.page), 0);
            assert.deepEqual(room.errors, []);
            await room.context.close();
          },
        );

        await t.test(
          `${size}: an update with an artifact shows it, with its words`,
          async () => {
            const { context, page, asked, errors } = await open(size, ROOM);
            const book = await labbook(page);
            const ids = book.entries.map((entry) => entry.id);
            assert.deepEqual(
              ids.filter((id) => id.startsWith("fixture-")),
              [
                "fixture-graduated",
                "fixture-tone",
                "fixture-demo",
                "fixture-replay",
                "fixture-film",
                "fixture-half-said",
                "fixture-kept-back",
                "fixture-first-line",
              ],
              "the fixture Labbook, written oldest first, reads newest first",
            );
            const entry = (id) => book.entries.find((item) => item.id === id);
            assert.deepEqual(entry("fixture-first-line").pictures, [
              {
                src: "/images/lab/motion-path-graph.svg",
                alt: "A lotus drawn in orange and blue lines",
                painted: true,
              },
            ]);
            // An update with nowhere else to go has a title and no link.
            assert.equal(entry("fixture-first-line").href, null);
            assert.equal(entry("fixture-graduated").href, "/projects");
            assert.deepEqual(
              entry("fixture-first-line").related.map(({ kind, label }) => ({
                kind,
                label,
              })),
              [{ kind: "experiment", label: copy.related.experiment }],
            );
            assert.deepEqual(
              entry("fixture-graduated").related.map((item) => item.kind),
              ["experiment", "project"],
            );
            const media = await page.evaluate(async () => {
              const film = document.querySelector(
                "#lens-shell #u-fixture-film video",
              );
              const tone = document.querySelector(
                "#lens-shell #u-fixture-tone audio",
              );
              film.scrollIntoView({ block: "center", inline: "nearest" });
              for (let i = 0; i < 50 && film.readyState < 1; i += 1)
                await new Promise((done) => setTimeout(done, 100));
              return {
                film: {
                  src: film.querySelector("source")?.getAttribute("src"),
                  controls: film.controls,
                  name: film.getAttribute("aria-label"),
                  poster: film.getAttribute("poster"),
                  loaded: film.videoWidth > 0 && film.checkVisibility(),
                },
                tone: {
                  src: tone.getAttribute("src"),
                  controls: tone.controls,
                  name: tone.getAttribute("aria-label"),
                  shown: tone.checkVisibility(),
                  says: tone
                    .closest("figure")
                    .querySelector("figcaption")
                    ?.textContent.trim(),
                },
              };
            });
            assert.deepEqual(media.film, {
              src: "/prism/fixtures/film.webm",
              controls: true,
              name: "The lines of the drawing appearing one after another",
              poster: "/images/lab/beating-shapes.png",
              loaded: true,
            });
            assert.deepEqual(media.tone, {
              src: "/prism/fixtures/tone.wav",
              controls: true,
              name: "A short, steady tone",
              shown: true,
              says: "A short, steady tone",
            });
            assert.deepEqual(asked, [], "nothing was asked of another site");
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await shot(
              page,
              "#lens-shell #u-fixture-first-line",
              `calling-card-labbook-image-${size}`,
            );
            await shot(
              page,
              "#lens-shell #u-fixture-film",
              `calling-card-labbook-film-${size}`,
            );
            await shot(
              page,
              "#lens-shell #u-fixture-tone",
              `calling-card-labbook-sound-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a Pen and a demo load only after their prompt is pressed`,
          async () => {
            const { context, page, asked } = await open(size, ROOM);
            const frames = () =>
              page.evaluate(() =>
                [...document.querySelectorAll("#lens-shell iframe")].map(
                  (frame) => ({
                    within: frame.closest("li[id^='u-']")?.id ?? null,
                    src: frame.getAttribute("src"),
                    title: frame.title,
                    focused: document.activeElement === frame,
                    width: Math.round(frame.getBoundingClientRect().width),
                  }),
                ),
              );
            const stage = (id) =>
              page.evaluate((id) => {
                const place = document.querySelector(
                  `#lens-shell #${id} [data-cc-frame]`,
                );
                const { height } = place.getBoundingClientRect();
                const ask = place.querySelector("[data-cc-load]");
                return {
                  height: Math.round(height),
                  // What the prompt says; its key cap is for the eye.
                  ask:
                    ask
                      ?.querySelector(":scope > span")
                      ?.textContent.replace(/\s+/g, " ")
                      .trim() ?? null,
                  poster:
                    place.querySelector("img")?.getAttribute("src") ?? null,
                  says: place.textContent.replace(/\s+/g, " ").trim(),
                  below: Math.round(
                    place
                      .closest("li")
                      .nextElementSibling?.getBoundingClientRect().top -
                      place.getBoundingClientRect().top,
                  ),
                };
              }, id);

            // Turn the whole board past, as a reader would.
            await page.evaluate(() => {
              for (const el of document.querySelectorAll(
                "#lens-shell .cc-requests__board, #lens-shell main",
              ))
                el.scrollTo(0, el.scrollHeight);
            });
            await page.waitForTimeout(600);
            assert.deepEqual(await frames(), [], "no frame before a press");
            assert.deepEqual(asked, [], "nothing asked of CodePen or the demo");

            const pen = await stage("u-fixture-replay");
            assert.equal(pen.ask, copy.artifact.load.pen);
            assert.equal(pen.poster, "/images/lab/motion-path-graph.svg");
            const demo = await stage("u-fixture-demo");
            assert.equal(demo.ask, copy.artifact.load.demo);
            assert.equal(demo.poster, null, "no poster: a plain screen");
            assert.ok(
              demo.says.includes("A grid of shapes that beat in time"),
              "the screen says what it is kept for",
            );
            assert.ok(pen.says.includes(copy.artifact.note));
            await shot(
              page,
              "#lens-shell #u-fixture-replay",
              `calling-card-pen-before-${size}`,
            );
            await shot(
              page,
              "#lens-shell #u-fixture-demo",
              `calling-card-demo-before-${size}`,
            );

            await page.click("#lens-shell #u-fixture-replay [data-cc-load]");
            await page.waitForSelector("#lens-shell #u-fixture-replay iframe");
            assert.deepEqual(
              (await frames()).map(({ width, ...frame }) => frame),
              [
                {
                  within: "u-fixture-replay",
                  src: PEN_FRAME,
                  title: "The lotus drawing itself, with a replay button",
                  focused: true,
                },
              ],
            );
            assert.deepEqual(asked, [PEN_FRAME], "the press asked for the Pen");
            const after = await stage("u-fixture-replay");
            assert.equal(
              after.height,
              pen.height,
              "the frame takes the screen kept for it",
            );
            assert.equal(after.below, pen.below, "and nothing under it moves");
            assert.equal(after.ask, null, "the frame takes the prompt's place");
            await shot(
              page,
              "#lens-shell #u-fixture-replay",
              `calling-card-pen-after-${size}`,
            );

            // The keyboard asks the same way.
            await page.focus("#lens-shell #u-fixture-demo [data-cc-load]");
            await page.keyboard.press("Enter");
            await page.waitForSelector("#lens-shell #u-fixture-demo iframe");
            // One plays at a time (labbook-stage.browser.mjs): the demo
            // puts the Pen away.
            assert.deepEqual(
              (await frames()).map((frame) => frame.src),
              [DEMO_FRAME],
            );
            assert.deepEqual(asked, [PEN_FRAME, DEMO_FRAME]);
            const [frame] = await frames();
            assert.equal(frame.title, "A grid of shapes that beat in time");
            assert.ok(frame.width > 200, "the frame has room to be used");
            // Where each lives is an ordinary link, there from the start.
            assert.equal(
              await page
                .locator("#lens-shell #u-fixture-replay .cc-artifact__home a")
                .getAttribute("href"),
              "https://codepen.io/beejsbj/pen/abXZWLQ",
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a redacted update is its cut-outs, each said once, under a name a screen reader can say`,
          async () => {
            const { context, page } = await open(size, ROOM);
            const book = await labbook(page);
            const hidden = fixture.labbook.find(
              (update) => update.id === "fixture-kept-back",
            );
            const { parts } = hidden.shape;
            assert.ok(parts.every((part) => typeof part === "number"));
            const entry = book.entries.find((item) => item.id === hidden.id);
            assert.equal(entry.part, "update.redacted");
            assert.equal(entry.ref, hidden.id);
            assert.equal(entry.bars, parts.length);
            assert.equal(entry.date, hidden.date);
            assert.deepEqual(
              entry.said,
              [
                updateDateLabel(hidden.date),
                copy.redacted.label,
                ...parts.map(() => copy.redacted.bar),
                copy.redacted.works[hidden.shape.work],
              ],
              "its date, what it is, a word for each cut-out, its kind of work: no other word",
            );
            assert.equal(entry.controls, 0, "nothing to follow or play");
            assert.deepEqual(entry.related, []);
            assert.deepEqual(entry.pictures, []);
            const item = page.locator(`#lens-shell #u-${hidden.id}`);
            checkRedactedLine(
              assert,
              await item.evaluate(redactedLine),
              parts,
              {
                bar: copy.redacted.bar,
                within: await item.evaluate((el) => {
                  const { left, right } = el.getBoundingClientRect();
                  return { left, right };
                }),
              },
            );
            const bars = await item.evaluate((el) =>
              [...el.querySelectorAll("[data-redaction-bar]")].map((bar) => ({
                height: bar.offsetHeight,
                ink: getComputedStyle(bar).backgroundColor,
              })),
            );
            for (const bar of bars) {
              assert.ok(
                bar.height > 16,
                "a cut-out is tall enough to hide a word",
              );
              assert.equal(bar.ink, "rgb(10, 10, 10)", "and solid black");
            }
            assert.ok(
              !(await page.content()).includes(REDACTION_MARKER),
              "nothing it hides is in the page",
            );
            await shot(
              page,
              `#lens-shell #u-${hidden.id}`,
              `calling-card-redacted-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a redacted update may show a few of its words, in their places among its cut-outs`,
          async () => {
            const { context, page, errors } = await open(size, ROOM);
            const book = await labbook(page);
            const half = fixture.labbook.find(
              (update) => update.id === "fixture-half-said",
            );
            const { parts } = half.shape;
            assert.deepEqual(parts, ["Rewired", 4, 2, "the", 6]);
            const entry = book.entries.find((item) => item.id === half.id);
            assert.equal(entry.part, "update.redacted");
            assert.equal(entry.bars, 3);
            assert.deepEqual(
              entry.said,
              [
                updateDateLabel(half.date),
                copy.redacted.label,
                "Rewired",
                copy.redacted.bar,
                copy.redacted.bar,
                "the",
                copy.redacted.bar,
                copy.redacted.works[half.shape.work],
              ],
              "its date, what it is, its line and its kind of work: no other word",
            );
            assert.equal(entry.controls, 0, "nothing to follow or play");
            const item = page.locator(`#lens-shell #u-${half.id}`);
            checkRedactedLine(
              assert,
              await item.evaluate(redactedLine),
              parts,
              {
                bar: copy.redacted.bar,
                within: await item.evaluate((el) => {
                  const { left, right } = el.getBoundingClientRect();
                  return { left, right };
                }),
              },
            );
            // The words are set as an update's title is, in the slip's ink.
            const type = (selector) =>
              page
                .locator(`#lens-shell ${selector}`)
                .first()
                .evaluate((el) => {
                  const { fontFamily, fontSize, textTransform } =
                    getComputedStyle(el);
                  return { fontFamily, fontSize, textTransform };
                });
            assert.deepEqual(
              await type(`#u-${half.id} [data-redaction-word]`),
              await type("[data-cc-labbook] .cc-entry__title"),
            );
            assert.equal(
              await item
                .locator("[data-redaction-word]")
                .first()
                .evaluate((el) => getComputedStyle(el).color),
              "rgb(10, 10, 10)",
              "in the black the cut-outs are",
            );
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.ok(
              !(await page.content()).includes(REDACTION_MARKER),
              "nothing it hides is in the page",
            );
            assert.deepEqual(errors, []);
            await shot(
              page,
              `#lens-shell #u-${half.id}`,
              `calling-card-redacted-mixed-${size}`,
            );
            await context.close();
          },
        );

        for (const path of ["/", "/lab"])
          await t.test(
            `${size}: there is no wire of headlines on ${path}`,
            async () => {
              // On real content and on the fixture Labbook alike.
              for (const address of [
                `${path}?lens=calling-card`,
                harness("labbook", path),
              ]) {
                const { context, page, errors } = await open(size, address);
                assert.equal(
                  await page.locator(`#lens-shell ${WIRE}`).count(),
                  0,
                  `no wire on ${address}`,
                );
                assert.equal(
                  await page
                    .locator("#lens-shell [data-part='ticker.headline']")
                    .count(),
                  0,
                  "and no headline",
                );
                assert.deepEqual(await sideways(page), [], "nothing slides");
                assert.deepEqual(errors, []);
                await context.close();
              }
            },
          );

        await t.test(
          `${size}: the home page's phone holds the updates as messages, the newest last, as before`,
          async () => {
            const { context, page, errors } = await open(
              size,
              "/?lens=calling-card",
            );
            const [latest] = content.updates;
            const chip = page.locator("#lens-shell .cc-phonechip");
            assert.deepEqual(
              await chip.evaluate((el) => ({
                id: el.dataset.part === "update.item" ? el.dataset.ref : null,
                says: el.querySelector(".cc-phonechip__text").textContent,
                count: el.querySelector(".cc-phonechip__badge").textContent,
              })),
              {
                id: latest.id,
                says: latest.title,
                count: String(content.updates.length),
              },
              "the phone on the pause menu shows the newest update",
            );
            // The plates stand in the pause menu itself, as they did: no
            // column was put round them to hold a wire.
            assert.equal(
              await page
                .locator("#lens-shell .cc-home__plates")
                .evaluate((el) => el.parentElement.tagName),
              "MAIN",
            );
            await shot(page, null, `calling-card-home-${size}`);
            await chip.click();
            await page.waitForSelector("#lens-shell .cc-phone .cc-msg");
            assert.deepEqual(
              await messages(page),
              // Oldest day first; on one day, the later in the stream
              // comes first, so the newest of all is last.
              content.updates
                .map((update, at) => ({ update, at }))
                .sort(
                  (a, b) =>
                    a.update.date.localeCompare(b.update.date) || b.at - a.at,
                )
                .map(({ update }) => ({
                  title: update.title,
                  summary: update.summary,
                  link: update.linkLabel,
                  href: update.href,
                  origin: `${update.sourceLabel} · ${update.kindLabel}`,
                })),
            );
            assert.deepEqual(errors, []);
            await page.waitForTimeout(600);
            await shot(page, null, `calling-card-home-updates-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: an experiment's brief tells its part of the Labbook and the project it became`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("lab-full-page", "/lab/fixture-study"),
            );
            const book = await labbook(page);
            assert.ok(book, "the brief has its stretch of the Labbook");
            assert.equal(book.heading, content.pages.lab.detail.labels.updates);
            assert.deepEqual(
              book.entries.map(({ ref, part, dateLabel }) => ({
                ref,
                part,
                dateLabel,
              })),
              [
                {
                  ref: "fixture-study-graduated",
                  part: "update.item",
                  dateLabel: "30 Sep 2026",
                },
                {
                  ref: "fixture-study-replay",
                  part: "update.item",
                  dateLabel: "12 Sep 2026",
                },
                {
                  ref: "fixture-study-kept-back",
                  part: "update.redacted",
                  dateLabel: "20 Aug 2026",
                },
                {
                  ref: "fixture-study-first-line",
                  part: "update.item",
                  dateLabel: "02 Aug 2026",
                },
              ],
              "newest first, the redacted one in its place",
            );
            const entry = (ref) =>
              book.entries.find((item) => item.ref === ref);
            // With somewhere to go it goes there; with nowhere, it is
            // text, not a link to its place in the Labbook.
            assert.equal(
              entry("fixture-study-replay").href,
              "https://codepen.io/beejsbj/pen/abXZWLQ",
            );
            assert.equal(entry("fixture-study-first-line").href, null);
            assert.equal(
              await page.locator("#lens-shell a[href*='#u-']").count(),
              0,
              "nothing points at the Labbook's days",
            );
            assert.equal(entry("fixture-study-kept-back").bars, 3);
            assert.equal(entry("fixture-study-kept-back").controls, 0);
            // This one arrives with words it must not have; none are shown.
            assert.deepEqual(entry("fixture-study-kept-back").said, [
              "20 Aug 2026",
              copy.redacted.label,
              copy.redacted.bar,
              copy.redacted.bar,
              copy.redacted.bar,
              copy.redacted.works.code,
            ]);
            assert.ok(
              !(await page.content()).includes(REDACTION_MARKER),
              "nothing it hides is in the page",
            );
            assert.ok(
              book.entries.every((item) => !item.anchored),
              "its links land in the Labbook, not here",
            );

            const project = await page.evaluate(
              () => window.prismHarness.content.projects[0],
            );
            const graduation = page.locator(
              "#lens-shell [data-part='lab.graduation']",
            );
            assert.equal(await graduation.count(), 1);
            assert.equal(
              words(await graduation.textContent()),
              `${content.pages.lab.detail.labels.graduated} ${project.title}`,
            );
            assert.equal(
              await graduation.locator("a").getAttribute("href"),
              project.href,
            );
            // Its own pictures and film, pinned to the brief.
            assert.deepEqual(
              await page
                .locator("#lens-shell [data-part='lab.media']")
                .evaluate((rail) =>
                  [...rail.querySelectorAll("img, video")].map((el) =>
                    el.getAttribute("src"),
                  ),
                ),
              [
                "/images/lab/motion-path-graph.svg",
                "/images/lab/beating-shapes.png",
                "/prism/fixtures/film.webm",
              ],
            );
            // The brief stamps where the request stands now.
            assert.equal(
              words(
                await page
                  .locator("#lens-shell .cc-brief__no span")
                  .textContent(),
              ),
              lens.lab.status.shelf,
            );
            assert.deepEqual(await sideways(page), [], "nothing slides");
            assert.deepEqual(errors, []);
            await shot(page, null, `calling-card-experiment-${size}`);
            await shot(
              page,
              "#lens-shell [data-part='lab.media']",
              `calling-card-experiment-media-${size}`,
            );
            await shot(
              page,
              "#lens-shell .cc-log ol > li:nth-child(2)",
              `calling-card-experiment-updates-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: an experiment that says little leaves no empty label, and no record`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("lab-bare-entry", "/lab/fixture-poster"),
            );
            const shown = await page.evaluate(() => {
              const main = document.querySelector("#lens-shell main");
              return {
                text: main.textContent.replace(/\s+/g, " ").trim(),
                hollow: [...main.querySelectorAll("p, dt, dd, li, h2, h3")]
                  .filter((el) => !/[\p{L}\p{N}]/u.test(el.textContent))
                  .map((el) => el.className),
                record: main.querySelectorAll(".cc-log").length,
                graduation: main.querySelectorAll(
                  "[data-part='lab.graduation']",
                ).length,
                cover: [
                  ...main.querySelectorAll("[data-part='lab.media'] img"),
                ].map((img) => img.getAttribute("src")),
              };
            });
            const { labels } = content.pages.lab.detail;
            assert.ok(
              !shown.text.includes(labels.graduated),
              `no "${labels.graduated}" label`,
            );
            assert.deepEqual(shown.hollow, [], "nothing on the brief is empty");
            assert.equal(shown.record, 0, "no updates, no record");
            assert.equal(shown.graduation, 0);
            assert.deepEqual(
              shown.cover,
              ["/images/lab/beating-shapes.png"],
              "its cover stands in for a picture",
            );
            assert.deepEqual(errors, []);
            await shot(page, null, `calling-card-experiment-bare-${size}`);
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
