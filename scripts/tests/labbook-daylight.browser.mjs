/** Daylight's Labbook (issue #95): the Lab lists every update newest
 * first, each where its links land; an artifact is shown, a Pen or a demo
 * only once asked for; a redacted update is its bars; and the home page's
 * Recent updates are where the most recent ones are. There is no ticker of
 * headlines.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on /lab and / against /prism/content.json, and on
 * /prism/fixtures/lab and /prism/fixtures/home, whose fixture Labbook
 * (src/prism/labbook-fixture.ts) has every state whatever src/content holds. Same server and Chromium as
 * prism-parity.browser.mjs. LAB_SHOTS=<dir> also saves pictures of the
 * Labbook's parts and the home page's updates at each size;
 * LAB_ONLY=<regexp> runs only the subtests it names. */
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

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const ROOM = "/prism/fixtures/lab";
const HOME = "/prism/fixtures/home";
const SHOTS = process.env.LAB_SHOTS;
const ONLY = process.env.LAB_ONLY ? new RegExp(process.env.LAB_ONLY) : null;
const PEN_FRAME = "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result";
const DEMO_FRAME = "https://example.com/fixture-demo/";
const fixture = labbookFixture();

/** The Labbook as a visitor meets it: each update's element, in order. */
const labbook = (page) =>
  page.evaluate(async () => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const section = document.querySelector(".site-frame main #labbook");
    if (!section) return null;
    const entries = [];
    for (const item of section.querySelectorAll("li[id^='u-']")) {
      const open = item.querySelector("[data-part='update.item']");
      const redacted = item.querySelector("[data-part='update.redacted']");
      const title = item.querySelector(".event-title");
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
        id: item.id.slice(2),
        part: (open ?? redacted)?.dataset.part ?? null,
        ref: (open ?? redacted)?.dataset.ref ?? null,
        text: text(item),
        origin: text(item.querySelector(".event-origin")),
        title: text(title),
        href: title?.querySelector("a")?.getAttribute("href") ?? null,
        summary: text(item.querySelector(".event-detail")),
        date: item.querySelector("time")?.getAttribute("datetime") ?? null,
        dateLabel: text(item.querySelector("time")),
        related: [...item.querySelectorAll("[data-related]")].map((el) => ({
          kind: el.dataset.related,
          label: text(el.querySelector("span")),
          title: text(el.querySelector(".link-label")),
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
      afterShelf:
        !!document.querySelector("[data-lab-place='shelf']") &&
        !!(
          document
            .querySelector("[data-lab-place='shelf']")
            .compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
      entries,
    };
  });

/** Where the ticker of headlines used to be, by every name it had. */
const TICKER =
  ":is([data-ticker], .ticker, .home-ticker, [data-part='ticker.headline'])";

/** The home page's Recent updates, as a visitor meets them. */
const recent = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const section = document.querySelector(".site-frame main section.updates");
    const list = section.querySelector("ol");
    return {
      heading: text(
        document.getElementById(section.getAttribute("aria-labelledby")),
      ),
      intro: text(section.querySelector(".stream-intro")),
      label: list.getAttribute("aria-label"),
      items: [...list.querySelectorAll(":scope > li")].map((item) => {
        const entry = item.querySelector("[data-part='update.item']");
        const title = item.querySelector(".event-title");
        return {
          id: entry?.dataset.ref ?? null,
          origin: text(item.querySelector(".event-origin")),
          title: text(title),
          href: title.querySelector("a")?.getAttribute("href") ?? undefined,
          date: item.querySelector("time").getAttribute("datetime"),
          when: text(item.querySelector("time")),
          links: item.querySelectorAll("a").length,
        };
      }),
      // What follows the welcome on the page.
      afterWelcome:
        document.querySelector(".site-frame main .welcome-region")
          .nextElementSibling?.className ?? null,
    };
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Daylight shows the Labbook, its artifacts, redaction and the recent updates",
  { skip, timeout: 10 * 60_000 },
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

    /** A page at one size. Nothing here leaves the test: whatever a page
     * asks of another origin is written down and answered with a blank. */
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
      const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
      assert.equal(response.status(), 200, `${path} answers`);
      return { context, page, asked };
    };
    /** A picture of the screen with `selector` in the middle of it. */
    const shot = async (page, selector, name) => {
      if (!SHOTS) return;
      await page
        .locator(selector)
        .first()
        .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(SHOTS, `${name}.png`) });
    };

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: /lab lists the seeded updates newest first, each with its anchor`,
          async () => {
            const { context, page } = await open(size, "/lab");
            const book = await labbook(page);
            const overflow = await page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
            );
            assert.ok(book, "the Lab has a Labbook");
            assert.equal(book.heading, copy.title);
            assert.ok(book.afterShelf, "the Labbook comes below the Shelf");
            assert.equal(overflow, 0, "nothing wider than the screen");
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
              assert.equal(entry.part, "update.item");
              assert.equal(entry.ref, update.id);
              assert.equal(entry.title, update.title);
              assert.equal(entry.summary, update.summary);
              assert.equal(entry.date, update.date);
              assert.equal(entry.dateLabel, updateDateLabel(update.date));
              assert.equal(
                entry.origin,
                `${content.site.updateSources[update.source]} / ${content.site.updateKinds[update.kind]}`,
              );
              assert.equal(entry.href, update.href ?? null);
            }
            assert.deepEqual(
              book.entries.find((entry) => entry.id === "dayshaper").related,
              [
                {
                  kind: "project",
                  label: copy.related.project,
                  title: "Dayshaper",
                  href: "/projects/dayshaper",
                },
              ],
            );
            await shot(page, "#labbook-title", `lab-labbook-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: an update with nowhere to go is text, not a link, in Recent updates and in the Labbook`,
          async () => {
            const written = fixture.labbook.filter(
              (update) => update.visibility === "open",
            );
            const nowhere = written.filter((update) => !update.href);
            assert.ok(nowhere.length >= 2, "the fixture has such updates");
            assert.ok(written.length > nowhere.length, "and ones that do go");
            // Nothing on the page points at an update's place in the Labbook.
            const pointers = (page) =>
              page.locator(".site-frame main a[href*='#u-']").count();

            const home = await open(size, HOME);
            const stream = (await recent(home.page)).items;
            for (const update of written) {
              const item = stream.find((entry) => entry.id === update.id);
              assert.ok(item, `${update.id} is in Recent updates`);
              assert.equal(item.title, update.title);
              assert.equal(item.href, update.href, update.id);
              assert.equal(item.links, update.href ? 1 : 0, update.id);
            }
            assert.equal(await pointers(home.page), 0);
            await shot(home.page, "section.updates", `home-nowhere-${size}`);
            await home.context.close();

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
            await room.context.close();
          },
        );

        await t.test(
          `${size}: a link to an update lands on it in the Labbook`,
          async () => {
            const { context, page } = await open(size, "/lab#u-qrng-demos");
            await page.waitForTimeout(400);
            const landed = await page.evaluate(() => {
              const target = document.querySelector(":target");
              const { top, bottom } = target.getBoundingClientRect();
              return { id: target.id, top, bottom, height: innerHeight };
            });
            assert.equal(landed.id, "u-qrng-demos");
            assert.ok(
              landed.top >= 0 && landed.top < landed.height,
              `the update is on screen (its top at ${landed.top})`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: an update with an artifact shows it, with its words`,
          async () => {
            const { context, page, asked } = await open(size, ROOM);
            const book = await labbook(page);
            assert.deepEqual(
              book.entries.map((entry) => entry.id),
              [
                "fixture-graduated",
                "fixture-tone",
                "fixture-demo",
                "fixture-replay",
                "fixture-film",
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
            assert.deepEqual(entry("fixture-first-line").related, [
              {
                kind: "experiment",
                label: copy.related.experiment,
                title: "An old sketch, gone quiet",
                href: "https://example.com/fixture-quiet",
              },
            ]);
            assert.deepEqual(
              entry("fixture-graduated").related.map((item) => item.kind),
              ["experiment", "project"],
            );
            const media = await page.evaluate(async () => {
              const film = document.querySelector("#u-fixture-film video");
              const tone = document.querySelector("#u-fixture-tone audio");
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
            const overflow = await page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
            );
            assert.equal(overflow, 0, "nothing wider than the screen");
            await shot(page, "#u-fixture-first-line", `labbook-image-${size}`);
            await shot(page, "#labbook-title", `labbook-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: a Pen and a demo load only after a click`,
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
                const figure = document.querySelector(
                  `#${id} [data-artifact-frame]`,
                );
                const { height } = figure.getBoundingClientRect();
                const loader = figure.querySelector("[data-artifact-load]");
                return {
                  height: Math.round(height),
                  loader:
                    loader?.textContent.replace(/\s+/g, " ").trim() ?? null,
                  poster:
                    figure.querySelector("img")?.getAttribute("src") ?? null,
                  says: figure.textContent.replace(/\s+/g, " ").trim(),
                };
              }, id);

            // Scroll the whole Labbook past, as a reader would.
            await page.locator("#labbook").scrollIntoViewIfNeeded();
            await page.mouse.wheel(0, 4000);
            await page.waitForTimeout(500);
            assert.deepEqual(await frames(), [], "no frame before a click");
            assert.deepEqual(asked, [], "nothing asked of CodePen or the demo");

            const pen = await stage("u-fixture-replay");
            assert.equal(pen.loader, copy.artifact.load.pen);
            assert.equal(pen.poster, "/images/lab/motion-path-graph.svg");
            const demo = await stage("u-fixture-demo");
            assert.equal(demo.loader, copy.artifact.load.demo);
            assert.equal(demo.poster, null, "no poster: a plain placeholder");
            assert.ok(
              demo.says.includes("A grid of shapes that beat in time"),
              "the placeholder says what it holds",
            );
            await shot(page, "#u-fixture-replay", `pen-before-${size}`);
            await shot(page, "#u-fixture-demo", `demo-before-${size}`);

            await page.click("#u-fixture-replay [data-artifact-load]");
            await page.waitForSelector("#u-fixture-replay iframe");
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
            assert.equal(page.url(), `${base}${ROOM}`, "the page stays put");
            assert.deepEqual(asked, [PEN_FRAME], "the click asked for the Pen");
            assert.equal(
              (await stage("u-fixture-replay")).height,
              pen.height,
              "the frame takes the placeholder's room",
            );
            assert.equal(
              (await stage("u-fixture-replay")).loader,
              null,
              "the frame takes the button's place",
            );
            await shot(page, "#u-fixture-replay", `pen-after-${size}`);

            // The keyboard asks the same way.
            await page.focus("#u-fixture-demo [data-artifact-load]");
            await page.keyboard.press("Enter");
            await page.waitForSelector("#u-fixture-demo iframe");
            assert.deepEqual(
              (await frames()).map((frame) => frame.src),
              [DEMO_FRAME, PEN_FRAME],
            );
            assert.deepEqual(asked, [PEN_FRAME, DEMO_FRAME]);
            const [frame] = await frames();
            assert.equal(frame.title, "A grid of shapes that beat in time");
            assert.ok(frame.width > 200, "the frame has room to be used");
            await context.close();
          },
        );

        await t.test(
          `${size}: a redacted update is its bars, with a name a screen reader can say`,
          async () => {
            const { context, page } = await open(size, ROOM);
            const book = await labbook(page);
            const kept = fixture.labbook.find(
              (update) => update.visibility === "redacted",
            );
            const entry = book.entries.find((item) => item.id === kept.id);
            assert.equal(entry.part, "update.redacted");
            assert.equal(entry.ref, kept.id);
            assert.equal(entry.bars, kept.shape.bars.length);
            assert.equal(entry.date, kept.date);
            assert.equal(
              entry.text,
              `${copy.redacted.label} ${copy.redacted.works[kept.shape.work]} ${updateDateLabel(kept.date)}`,
            );
            assert.equal(entry.controls, 0, "nothing to follow or play");
            assert.deepEqual(entry.related, []);
            assert.equal(
              await page
                .getByRole("article", { name: copy.redacted.label })
                .count(),
              1,
              "it is named for assistive technology",
            );
            const bars = await page.evaluate((id) => {
              const all = [
                ...document.querySelectorAll(`#u-${id} [data-redaction-bar]`),
              ];
              return all.map((bar) => {
                const { width, height } = bar.getBoundingClientRect();
                return {
                  width,
                  height,
                  hidden: !!bar.closest("[aria-hidden='true']"),
                  ink: getComputedStyle(bar).backgroundColor,
                };
              });
            }, kept.id);
            const text = await page.evaluate(
              () => getComputedStyle(document.body).color,
            );
            for (const bar of bars) {
              assert.ok(bar.hidden, "a bar says nothing");
              assert.ok(bar.height > 8, "a bar is tall enough to be a line");
              assert.equal(bar.ink, text, "a bar is the ink's own black");
            }
            // Longer numbers, longer bars.
            const order = (list) =>
              list
                .map((value, index) => [value, index])
                .sort(([a], [b]) => a - b)
                .map(([, index]) => index);
            assert.deepEqual(
              order(bars.map((bar) => bar.width)),
              order(kept.shape.bars),
            );
            assert.ok(
              !(await page.content()).includes(REDACTION_MARKER),
              "nothing it hides is in the page",
            );
            await shot(page, `#u-${kept.id}`, `redacted-${size}`);
            await context.close();
          },
        );

        for (const path of ["/", "/lab", ROOM])
          await t.test(
            `${size}: there is no ticker of headlines on ${path}`,
            async () => {
              const { context, page } = await open(size, path);
              assert.equal(
                await page.locator(TICKER).count(),
                0,
                `no ticker on ${path}`,
              );
              assert.equal(
                await page.evaluate(
                  () =>
                    document.documentElement.scrollWidth -
                    document.documentElement.clientWidth,
                ),
                0,
                "nothing wider than the screen",
              );
              await context.close();
            },
          );

        await t.test(
          `${size}: the home page's Recent updates are the first of the home stream, newest first, as before`,
          async () => {
            const { context, page } = await open(size, "/");
            const { updates } = content.pages.home;
            const shown = await recent(page);
            assert.equal(shown.heading, updates.title);
            assert.equal(shown.intro, updates.intro);
            assert.equal(shown.label, updates.listLabel);
            assert.deepEqual(
              shown.items.map(({ links, ...item }) => item),
              content.updates.slice(0, updates.limit).map((update) => ({
                id: update.id,
                origin: `${update.sourceLabel} / ${update.kindLabel}`,
                title: update.title,
                href: update.href,
                date: update.date,
                when: update.dateLabel,
              })),
              "the first of the home stream, in its order",
            );
            assert.ok(shown.items.length >= 7, "the seeded updates are there");
            // The work and the sidebar follow the welcome, as they did:
            // nothing lies between them.
            assert.equal(
              shown.afterWelcome,
              "below",
              "the work block follows the welcome",
            );
            await shot(page, "section.updates", `home-updates-${size}`);
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
