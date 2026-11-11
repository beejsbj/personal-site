/** Cut Paper's Lab (issue #97): the armed and the muted pads of the rack
 * (the Bench and the Shelf), the Labbook with its artifacts and its redacted
 * updates, the home page's locators where the recent updates are, and an
 * experiment's own record and graduation. There is no ribbon of headlines.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on /lab and / against /prism/content.json, and in the harness on
 * the `labbook`, `lab-full-page` and `lab-bare-entry` fixtures, which hold
 * every state whatever src/content does. Same server and Chromium as
 * prism-parity.browser.mjs. LAB_SHOTS=<dir> also saves pictures of each
 * part at each size; LAB_ONLY=<regexp> runs only the subtests it names. */
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

const phone = (width) => ({
  viewport: { width, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: phone(390),
};
const SHOTS = process.env.LAB_SHOTS;
const ONLY = process.env.LAB_ONLY ? new RegExp(process.env.LAB_ONLY) : null;
const PEN_FRAME = "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result";
const DEMO_FRAME = "https://example.com/fixture-demo/";
const fixture = labbookFixture();
const harness = (name, route) =>
  `/prism/harness?lens=cut-paper&fixture=${name}&route=${encodeURIComponent(route)}`;
const ROOM = harness("labbook", "/lab");

const words = (text) => (text ?? "").replace(/\s+/g, " ").trim();

/** The Lab's places as a visitor meets them, in order. */
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
            const pad = entry.querySelector("button");
            return {
              slug: title.dataset.ref,
              title: text(title.firstChild),
              href: title.getAttribute("href"),
              summary: text(entry.querySelector("[data-part='lab.summary']")),
              featured: entry.hasAttribute("data-lab-featured"),
              width: entry.getBoundingClientRect().width,
              pad: !!pad && pad.checkVisibility() && !!pad.ariaLabel,
              // Anything in it that says nothing: an empty label, a
              // separator between two things left unsaid.
              hollow: [...entry.querySelectorAll("p, h3, li, dt, dd")].filter(
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
    const section = document.querySelector("#lens-shell [data-log]");
    if (!section) return null;
    // Every word in it, whatever element holds it.
    const said = (el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const out = [];
      while (walker.nextNode()) out.push(text(walker.currentNode));
      return out.filter(Boolean).join(" ");
    };
    const entries = [];
    for (const item of section.querySelectorAll("ol > li")) {
      const title = item.querySelector(".cp-log__title");
      const pictures = [];
      for (const img of item.querySelectorAll("img")) {
        img.scrollIntoView();
        for (let i = 0; i < 50 && !img.complete; i += 1)
          await new Promise((done) => setTimeout(done, 100));
        pictures.push({
          src: img.getAttribute("src"),
          alt: img.alt,
          painted: img.naturalWidth > 0 && img.checkVisibility(),
        });
      }
      entries.push({
        id: item.id.replace(/^u-/, ""),
        anchored: item.id.startsWith("u-"),
        part: item.dataset.part ?? null,
        ref: item.dataset.ref ?? null,
        text: said(item),
        origin: text(item.querySelector(".cp-log__origin")),
        title: text(title?.querySelector("a")?.firstChild ?? title),
        href: title?.querySelector("a")?.getAttribute("href") ?? null,
        summary: text(item.querySelector(".cp-log__sum")),
        date: item.querySelector("time")?.getAttribute("datetime") ?? null,
        dateLabel: text(item.querySelector("time")),
        related: [...item.querySelectorAll("[data-about]")].map((el) => ({
          kind: el.dataset.about,
          label: text(el.querySelector("span")),
          title: text(el.querySelector("a")?.firstChild),
          href: el.querySelector("a")?.getAttribute("href") ?? null,
        })),
        pictures,
        strips: item.querySelectorAll("[data-strip]").length,
        controls: item.querySelectorAll("a, button, iframe, video, audio")
          .length,
        links: item.querySelectorAll("a").length,
      });
    }
    return {
      heading: text(
        document.getElementById(section.getAttribute("aria-labelledby")),
      ),
      whole: section.dataset.log === "labbook",
      afterShelf: !!(
        document
          .querySelector("#lens-shell [data-lab-place='shelf']")
          ?.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING
      ),
      entries,
    };
  });

/** Where the ribbon of headlines used to be, by every name it had. */
const RIBBON = ":is([data-ribbon], .cp-ribbon, .cp-home__ribbon)";

/** The home page's locators: the recent updates, as a visitor meets them. */
const locators = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const section = document.querySelector("#lens-shell .cp-locators");
    const list = section.querySelector("ol");
    const home = document.querySelector("#lens-shell .cp-home");
    return {
      heading: text(
        document.getElementById(section.getAttribute("aria-labelledby")),
      ),
      intro: text(section.querySelector(".cp-locators__intro")),
      label: list?.getAttribute("aria-label") ?? null,
      items: [...(list?.querySelectorAll(":scope > li") ?? [])].map((item) => {
        const title = item.querySelector(".cp-loc__title");
        return {
          id: item.dataset.part === "update.item" ? item.dataset.ref : null,
          when: text(item.querySelector(".cp-loc__when")),
          title: text(title.firstChild),
          href: title.getAttribute("href"),
          origin: text(item.querySelector("small")),
          links: item.querySelectorAll("a").length,
        };
      }),
      // What lies in the view above the home grid.
      above: [...home.parentElement.children].indexOf(home),
    };
  });

/** How much wider than its window the page is: the document, and the view
 * the session scrolls in. */
const overflow = (page) =>
  page.evaluate(() => {
    const view = document.querySelector("#lens-shell .cp-scroll");
    return Math.max(
      document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      view.scrollWidth - view.clientWidth,
    );
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Cut Paper shows the Bench, the Shelf, the Labbook and the recent updates",
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
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });

    /** A page at one size, once Cut Paper has printed it. Nothing here
     * leaves the test: whatever a page asks of another origin is written
     * down and answered with a blank. `bend` changes content.json on its
     * way in. */
    const open = async (size, path, { motion = false, bend } = {}) => {
      const context = await browser.newContext({
        ...(SIZES[size] ?? size),
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
    /** A picture of the screen with `selector` near the top of it: with
     * none, the top of the page; with HERE, wherever the page is. */
    const HERE = Symbol("here");
    const shot = async (page, selector, name, block = "start") => {
      if (!SHOTS) return;
      if (selector !== HERE)
        await page.evaluate(() => {
          document.querySelector("#lens-shell .cp-scroll").scrollTop = 0;
        });
      if (selector && selector !== HERE)
        await page
          .locator(selector)
          .first()
          .evaluate((el, block) => el.scrollIntoView({ block }), block);
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(SHOTS, `${name}.png`) });
    };

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: /lab arms the Bench and mutes the Shelf, each in the shared order`,
          async () => {
            const { context, page, errors } = await open(
              size,
              "/lab?lens=cut-paper",
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
              for (const entry of room[i].entries) {
                assert.equal(
                  entry.hollow,
                  0,
                  `${entry.slug} leaves no empty label or stray separator`,
                );
                assert.ok(entry.pad, `${entry.slug} has a pad to press`);
              }
              assert.ok(
                (
                  await page
                    .locator(`#lens-shell [data-lab-place='${group.place}']`)
                    .textContent()
                ).includes(content.pages.lab.places[group.place].note),
                `the ${group.place} says what it is`,
              );
            }
            // Pride of place is given as the content gives it: to one
            // experiment, or to none (both are looked at on fixtures below).
            const bench = room.find(({ place }) => place === "bench");
            assert.deepEqual(
              bench.entries.map((entry) => entry.featured),
              expected
                .find(({ place }) => place === "bench")
                .entries.map((entry) => !!entry.featured),
            );
            assert.equal(
              await page.locator("#lens-shell [data-part='lab.meta']").count(),
              0,
              "no type or era is printed",
            );
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await shot(page, null, `cut-paper-lab-${size}`);
            await shot(
              page,
              "#lens-shell [data-lab-place='bench']",
              `cut-paper-bench-${size}`,
            );
            await shot(
              page,
              "#lens-shell [data-lab-place='shelf']",
              `cut-paper-shelf-${size}`,
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
            assert.equal(
              await overflow(one.page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(one.errors, []);
            await shot(
              one.page,
              "#lens-shell [data-lab-place='bench']",
              `cut-paper-bench-featured-${size}`,
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
            assert.equal(
              await overflow(none.page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(none.errors, []);
            await shot(
              none.page,
              "#lens-shell [data-lab-place='bench']",
              `cut-paper-bench-none-featured-${size}`,
            );
            await none.context.close();
          },
        );

        await t.test(
          `${size}: /lab writes the seeded updates into the Labbook, newest first, each with its anchor`,
          async () => {
            const { context, page, errors } = await open(
              size,
              "/lab?lens=cut-paper",
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
              assert.equal(
                entry.origin,
                `${content.site.updateSources[update.source]} · ${content.site.updateKinds[update.kind]}`,
              );
              assert.equal(entry.href, update.href ?? null);
            }
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await shot(
              page,
              "#lens-shell [data-log]",
              `cut-paper-labbook-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a link to an update lands on it in the Labbook`,
          async () => {
            const { context, page } = await open(
              size,
              "/lab?lens=cut-paper#u-qrng-demos",
            );
            await page.waitForTimeout(600);
            const landed = await page.evaluate(() => {
              const target = document.querySelector(
                "#lens-shell [data-landed]",
              );
              if (!target) return null;
              const view = target.closest(".cp-scroll").getBoundingClientRect();
              const { top, bottom } = target.getBoundingClientRect();
              return {
                id: target.id,
                top,
                bottom,
                view: { top: view.top, bottom: view.bottom },
                marked: document.querySelectorAll("#lens-shell [data-landed]")
                  .length,
              };
            });
            assert.ok(landed, "an update is marked as the one landed on");
            assert.equal(landed.id, "u-qrng-demos");
            assert.equal(landed.marked, 1);
            assert.ok(
              landed.top >= landed.view.top &&
                landed.bottom <= landed.view.bottom,
              `the update is in the view (${landed.top} to ${landed.bottom} in ${landed.view.top} to ${landed.view.bottom})`,
            );
            await shot(page, HERE, `cut-paper-landed-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: an update with nowhere to go is text, not a link, in the locators and in the Labbook`,
          async () => {
            const written = fixture.labbook.filter(
              (update) => update.visibility === "open",
            );
            const nowhere = written.filter((update) => !update.href);
            assert.ok(nowhere.length >= 2, "the fixture has such updates");
            assert.ok(written.length > nowhere.length, "and ones that do go");
            // Nothing in the view points at an update's place in the Labbook.
            const pointers = (page) =>
              page.locator("#lens-shell a[href*='#u-']").count();

            const home = await open(size, harness("labbook", "/"));
            const shown = (await locators(home.page)).items;
            const stream = (
              await home.page.evaluate(() => window.prismHarness.content)
            ).updates.slice(0, content.pages.home.updates.limit);
            assert.ok(
              stream.some((update) => !update.href) &&
                stream.some((update) => update.href),
              "both kinds are among the recent updates",
            );
            assert.deepEqual(
              shown.map(({ id, title, href, links }) => ({
                id,
                title,
                href,
                links,
              })),
              stream.map((update) => ({
                id: update.id,
                title: update.title,
                href: update.href ?? null,
                links: update.href ? 1 : 0,
              })),
            );
            assert.equal(await pointers(home.page), 0);
            assert.equal(await overflow(home.page), 0);
            assert.deepEqual(home.errors, []);
            await shot(
              home.page,
              "#lens-shell .cp-locators",
              `cut-paper-home-nowhere-${size}`,
            );
            await home.context.close();

            // The arrangement's Markers lane and, on a phone, the tape.
            const session = await open(size, harness("labbook", "/projects"));
            const marks = await session.page.evaluate(() => ({
              flags: [
                ...document.querySelectorAll(
                  "#lens-shell .cp-lane--markers .cp-flag",
                ),
              ].map((flag) => flag.getAttribute("href")),
              tape: [...document.querySelectorAll("#lens-shell .cp-tmark")].map(
                (mark) => ({
                  id: mark.dataset.ref,
                  href: mark.querySelector("a")?.getAttribute("href") ?? null,
                }),
              ),
            }));
            const all = (
              await session.page.evaluate(() => window.prismHarness.content)
            ).updates;
            assert.deepEqual(
              [...marks.flags].sort(),
              all.map((update) => update.href ?? null).sort(),
              "a flag is a link only where its update goes somewhere",
            );
            assert.deepEqual(
              marks.tape,
              marks.tape.map(({ id }) => ({
                id,
                href: all.find((update) => update.id === id).href ?? null,
              })),
            );
            assert.equal(await pointers(session.page), 0);
            assert.deepEqual(session.errors, []);
            await session.context.close();

            const room = await open(size, ROOM);
            const book = (await labbook(room.page)).entries;
            for (const update of written) {
              const entry = book.find((item) => item.id === update.id);
              assert.equal(entry.title, update.title);
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
            // A flag on the lane still goes to its update's line: the
            // oldest update's, the one no other flag lies over.
            const oldest = (
              await room.page.evaluate(() => window.prismHarness.content)
            ).labbook.at(-1).id;
            const flag = room.page.locator(
              `#lens-shell [data-log='labbook'] .cp-flag[data-flag='u-${oldest}']`,
            );
            assert.equal(
              await flag.evaluate((el) => el.tagName),
              "SPAN",
              "a flag is a pin, not a link",
            );
            await flag.evaluate((el) => el.scrollIntoView({ block: "center" }));
            await flag.click({ position: { x: 3, y: 4 } });
            await room.page.waitForSelector(
              `#lens-shell #u-${oldest}[data-landed]`,
            );
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
            const about = await page.evaluate(
              () => window.prismHarness.content,
            );
            assert.deepEqual(entry("fixture-graduated").related, [
              {
                kind: "experiment",
                label: copy.related.experiment,
                title: about.lab[1].title,
                href: about.lab[1].detail,
              },
              {
                kind: "project",
                label: copy.related.project,
                title: about.projects[0].title,
                href: about.projects[0].href,
              },
            ]);
            const media = await page.evaluate(async () => {
              const film = document.querySelector(
                "#lens-shell #u-fixture-film video",
              );
              const tone = document.querySelector(
                "#lens-shell #u-fixture-tone audio",
              );
              film.scrollIntoView();
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
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await shot(
              page,
              "#lens-shell #u-fixture-film",
              `cut-paper-labbook-film-${size}`,
            );
            await shot(
              page,
              "#lens-shell #u-fixture-first-line",
              `cut-paper-labbook-image-${size}`,
              "center",
            );
            await shot(
              page,
              "#lens-shell #u-fixture-tone",
              `cut-paper-labbook-sound-${size}`,
              "center",
            );
            await shot(
              page,
              "#lens-shell [data-log]",
              `cut-paper-labbook-fixture-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a Pen and a demo load only when they are asked for`,
          async () => {
            const { context, page, asked } = await open(size, ROOM);
            const frames = () =>
              page.evaluate(() =>
                [...document.querySelectorAll("iframe")].map((frame) => ({
                  within: frame.closest("li[id^='u-']")?.id ?? null,
                  src: frame.getAttribute("src"),
                  title: frame.title,
                  focused: document.activeElement === frame,
                  width: Math.round(frame.getBoundingClientRect().width),
                })),
              );
            const stage = (id) =>
              page.evaluate((id) => {
                const place = document.querySelector(
                  `#lens-shell #${id} [data-embed]`,
                );
                const { height } = place.getBoundingClientRect();
                const ask = place.querySelector("[data-embed-load]");
                return {
                  height: Math.round(height),
                  ask: ask?.textContent.replace(/\s+/g, " ").trim() ?? null,
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

            // Scroll the whole Labbook past, as a reader would.
            await page
              .locator("#lens-shell [data-log]")
              .scrollIntoViewIfNeeded();
            await page.mouse.move(
              SIZES[size].viewport.width / 2,
              SIZES[size].viewport.height / 2,
            );
            await page.mouse.wheel(0, 9000);
            await page.waitForTimeout(600);
            assert.deepEqual(await frames(), [], "no frame before it is asked");
            assert.deepEqual(asked, [], "nothing asked of CodePen or the demo");

            const pen = await stage("u-fixture-replay");
            assert.equal(pen.ask, copy.artifact.load.pen);
            assert.equal(pen.poster, "/images/lab/motion-path-graph.svg");
            const demo = await stage("u-fixture-demo");
            assert.equal(demo.ask, copy.artifact.load.demo);
            assert.equal(demo.poster, null, "no poster: a plain stage");
            assert.ok(
              demo.says.includes("A grid of shapes that beat in time"),
              "the stage says what it is kept for",
            );
            assert.ok(pen.says.includes(copy.artifact.note));
            await shot(
              page,
              "#lens-shell #u-fixture-replay",
              `cut-paper-pen-before-${size}`,
              "center",
            );
            await shot(
              page,
              "#lens-shell #u-fixture-demo",
              `cut-paper-demo-before-${size}`,
              "center",
            );

            await page.click("#lens-shell #u-fixture-replay [data-embed-load]");
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
            assert.deepEqual(asked, [PEN_FRAME], "the ask was for the Pen");
            const after = await stage("u-fixture-replay");
            assert.equal(
              after.height,
              pen.height,
              "the frame takes the stage's room",
            );
            assert.equal(after.below, pen.below, "and nothing under it moves");
            assert.equal(after.ask, null, "the frame takes the button's place");
            await shot(
              page,
              "#lens-shell #u-fixture-replay",
              `cut-paper-pen-after-${size}`,
              "center",
            );

            // The keyboard asks the same way.
            await page.focus("#lens-shell #u-fixture-demo [data-embed-load]");
            await page.keyboard.press("Enter");
            await page.waitForSelector("#lens-shell #u-fixture-demo iframe");
            assert.deepEqual(
              (await frames()).map((frame) => frame.src),
              [DEMO_FRAME, PEN_FRAME],
            );
            assert.deepEqual(asked, [PEN_FRAME, DEMO_FRAME]);
            const [frame] = await frames();
            assert.equal(frame.title, "A grid of shapes that beat in time");
            assert.ok(frame.width > 200, "the frame has room to be used");
            // Where each lives is an ordinary link, there from the start.
            const home = page.locator(
              "#lens-shell #u-fixture-replay .cp-art__home a",
            );
            assert.equal(
              await home.getAttribute("href"),
              "https://codepen.io/beejsbj/pen/abXZWLQ",
            );
            assert.equal(
              words(await home.evaluate((a) => a.firstChild.textContent)),
              copy.artifact.open.pen,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a redacted update is strips of black paper over its words, each said once, under a name a screen reader can say`,
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
            assert.equal(entry.strips, parts.length);
            assert.equal(entry.date, hidden.date);
            assert.equal(
              entry.text,
              [
                updateDateLabel(hidden.date),
                copy.redacted.label,
                copy.redacted.works[hidden.shape.work],
                ...parts.map(() => copy.redacted.bar),
              ].join(" "),
              "its date, what it is, its kind of work, a word for each strip: no other word",
            );
            assert.equal(entry.controls, 0, "nothing to follow or play");
            assert.deepEqual(entry.related, []);
            assert.deepEqual(entry.pictures, []);
            const item = page.locator(`#lens-shell #u-${hidden.id}`);
            assert.equal(
              await item
                .getByText(copy.redacted.label, { exact: true })
                .count(),
              1,
              "it is named for assistive technology",
            );
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
            const strike = await item.evaluate((el) => ({
              paper: getComputedStyle(el.closest("ol")).backgroundColor,
              strips: [...el.querySelectorAll("[data-strip]")].map((strip) => ({
                height: strip.getBoundingClientRect().height,
                ink: getComputedStyle(strip).backgroundColor,
              })),
            }));
            for (const strip of strike.strips) {
              assert.ok(
                strip.height > 8,
                "a strip is tall enough to hide a word",
              );
              assert.equal(strip.ink, "rgb(10, 9, 8)", "black paper");
              assert.notEqual(strip.ink, strike.paper, "on paper that is not");
            }
            assert.ok(
              !(await page.content()).includes(REDACTION_MARKER),
              "nothing it hides is in the page",
            );
            await shot(
              page,
              `#lens-shell #u-${hidden.id}`,
              `cut-paper-redacted-${size}`,
              "center",
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a redacted update may show a few of its words, in their places among its strips`,
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
            assert.equal(entry.strips, 3);
            assert.equal(
              entry.text,
              [
                updateDateLabel(half.date),
                copy.redacted.label,
                copy.redacted.works[half.shape.work],
                `Rewired ${copy.redacted.bar} ${copy.redacted.bar} the ${copy.redacted.bar}`,
              ].join(" "),
              "its date, what it is, its kind of work and its line: no other word",
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
            // The words are set as an update's title is, in the log's ink.
            const type = (selector) =>
              page
                .locator(`#lens-shell ${selector}`)
                .first()
                .evaluate((el) => {
                  const { color, fontFamily, fontSize, textTransform } =
                    getComputedStyle(el);
                  return { color, fontFamily, fontSize, textTransform };
                });
            assert.deepEqual(
              await type(`#u-${half.id} [data-redaction-word]`),
              await type("[data-log='labbook'] .cp-log__title"),
            );
            assert.equal(await overflow(page), 0);
            assert.ok(
              !(await page.content()).includes(REDACTION_MARKER),
              "nothing it hides is in the page",
            );
            assert.deepEqual(errors, []);
            await shot(
              page,
              `#lens-shell #u-${half.id}`,
              `cut-paper-redacted-mixed-${size}`,
              "center",
            );
            await context.close();
          },
        );

        for (const path of ["/", "/lab"])
          await t.test(
            `${size}: there is no ribbon of headlines on ${path}`,
            async () => {
              // On real content and on the fixture Labbook alike.
              for (const address of [
                `${path}?lens=cut-paper`,
                harness("labbook", path),
              ]) {
                const { context, page, errors } = await open(size, address);
                assert.equal(
                  await page.locator(`#lens-shell ${RIBBON}`).count(),
                  0,
                  `no ribbon on ${address}`,
                );
                assert.equal(
                  await page
                    .locator("#lens-shell [data-part='ticker.headline']")
                    .count(),
                  0,
                  "and no headline",
                );
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
          `${size}: the home page's locators are the recent updates, newest first, as before`,
          async () => {
            const { context, page, errors } = await open(
              size,
              "/?lens=cut-paper",
            );
            const { updates } = content.pages.home;
            const shown = await locators(page);
            assert.equal(
              shown.heading,
              `${content.lenses["cut-paper"].home.locators} · ${updates.title}`,
            );
            assert.equal(shown.intro, updates.intro);
            assert.equal(shown.label, updates.listLabel);
            assert.deepEqual(
              shown.items.map(({ links, ...item }) => item),
              content.updates.slice(0, updates.limit).map((update) => ({
                id: update.id,
                when: update.dateLabel,
                title: update.title,
                href: update.href,
                origin: `${update.kindLabel} · ${update.sourceLabel}`,
              })),
              "the first of the home stream, in its order",
            );
            assert.ok(shown.items.length >= 7, "the seeded updates are there");
            // The view starts with the set's name, as it did: nothing
            // lies above the home grid.
            assert.equal(shown.above, 0, "nothing lies above the home grid");
            assert.equal(await overflow(page), 0);
            assert.deepEqual(errors, []);
            await shot(
              page,
              "#lens-shell .cp-locators",
              `cut-paper-home-updates-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: an experiment's page tells its part of the Labbook and the project it became`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("lab-full-page", "/lab/fixture-study"),
            );
            const book = await labbook(page);
            assert.ok(book, "the page has its stretch of the Labbook");
            assert.equal(book.whole, false);
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
            // text, not a link to its line in the Labbook.
            assert.equal(
              entry("fixture-study-replay").href,
              "https://codepen.io/beejsbj/pen/abXZWLQ",
            );
            assert.equal(entry("fixture-study-first-line").href, null);
            assert.equal(
              await page.locator("#lens-shell a[href*='#u-']").count(),
              0,
              "nothing points at the Labbook's lines",
            );
            const hidden = entry("fixture-study-kept-back");
            assert.equal(hidden.strips, 3);
            assert.equal(hidden.controls, 0);
            assert.equal(
              hidden.text,
              `20 Aug 2026 ${copy.redacted.label} ${copy.redacted.works.code} ${copy.redacted.bar} ${copy.redacted.bar} ${copy.redacted.bar}`,
              "its date, what it is, its kind of work, a word for each strip: no other word",
            );
            assert.ok(
              !(await page.content()).includes(REDACTION_MARKER),
              "nothing it hides is in the page",
            );
            assert.ok(
              book.entries.every((item) => !item.anchored),
              "its links land in the Labbook, not here",
            );
            // Its own name goes without saying; the project it is about is said.
            const project = await page.evaluate(
              () => window.prismHarness.content.projects[0],
            );
            assert.deepEqual(
              entry("fixture-study-graduated").related.map(
                ({ kind, href }) => ({ kind, href }),
              ),
              [{ kind: "project", href: project.href }],
            );

            const graduation = page.locator(
              "#lens-shell [data-part='lab.graduation']",
            );
            assert.equal(await graduation.count(), 1);
            assert.equal(
              await graduation.getAttribute("data-ref"),
              "fixture-study",
            );
            assert.equal(
              words(await graduation.locator("span").first().textContent()),
              content.pages.lab.detail.labels.graduated,
            );
            assert.equal(
              words(
                await graduation
                  .locator("a")
                  .evaluate((a) => a.firstChild.textContent),
              ),
              project.title,
            );
            assert.equal(
              await graduation.locator("a").getAttribute("href"),
              project.href,
            );
            // Its pictures and its film, after the cover its pad wears.
            const shown = await page.evaluate(async () => {
              const media = document.querySelector(
                "#lens-shell [data-part='lab.media']",
              );
              const out = [];
              for (const el of media.querySelectorAll("img, video")) {
                el.scrollIntoView();
                for (
                  let i = 0;
                  i < 50 && !(el.complete ?? el.readyState >= 1);
                  i += 1
                )
                  await new Promise((done) => setTimeout(done, 100));
                out.push({
                  src: el.getAttribute("src"),
                  painted:
                    (el.naturalWidth ?? el.videoWidth) > 0 &&
                    el.checkVisibility(),
                });
              }
              return {
                media: out,
                pad:
                  document
                    .querySelector("#lens-shell .cp-clipview__side .cp-pad img")
                    ?.getAttribute("src") ?? null,
              };
            });
            assert.deepEqual(shown, {
              media: [
                { src: "/images/lab/beating-shapes.png", painted: true },
                { src: "/prism/fixtures/film.webm", painted: true },
              ],
              pad: "/images/lab/motion-path-graph.svg",
            });
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await shot(page, null, `cut-paper-experiment-${size}`);
            await shot(
              page,
              "#lens-shell [data-part='lab.graduation']",
              `cut-paper-experiment-graduation-${size}`,
              "center",
            );
            await shot(
              page,
              "#lens-shell [data-log]",
              `cut-paper-experiment-updates-${size}`,
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
              const main = document.querySelector("#lens-shell .cp-screen");
              return {
                text: main.textContent.replace(/\s+/g, " ").trim(),
                hollow: [
                  ...main.querySelectorAll("p, h2, h3, li, dt, dd, dl, ul"),
                ].filter((el) => !/[\p{L}\p{N}]/u.test(el.textContent)).length,
                record: main.querySelectorAll("[data-log]").length,
                graduation: main.querySelectorAll(
                  "[data-part='lab.graduation']",
                ).length,
                meta: main.querySelectorAll("[data-part='lab.meta']").length,
                cover: [...main.querySelectorAll(".cp-pad img")].map((img) =>
                  img.getAttribute("src"),
                ),
              };
            });
            const { labels } = content.pages.lab.detail;
            assert.ok(
              !shown.text.includes(labels.graduated),
              `no "${labels.graduated}" label`,
            );
            assert.equal(shown.hollow, 0, "nothing on the page is empty");
            assert.equal(shown.meta, 0);
            assert.equal(shown.record, 0, "no updates, no log");
            assert.equal(shown.graduation, 0);
            assert.deepEqual(
              shown.cover,
              ["/images/lab/beating-shapes.png"],
              "its cover is on its pad",
            );
            assert.equal(await overflow(page), 0);
            assert.deepEqual(errors, []);
            await shot(page, null, `cut-paper-experiment-bare-${size}`);
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
