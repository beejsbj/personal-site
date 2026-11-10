/** Daylight's Labbook and ticker (issue #95): the Lab lists every update
 * newest first, each where its links land; an artifact is shown, a Pen or a
 * demo only once asked for; a redacted update is its bars; and the ticker
 * runs the headlines, gently, stopping for a pointer or the keyboard.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on /lab and / against /prism/content.json, and on
 * /prism/fixtures/lab, whose fixture Labbook (src/prism/labbook-fixture.ts)
 * has every state whatever src/content holds. Same server and Chromium as
 * prism-parity.browser.mjs. LAB_SHOTS=<dir> also saves pictures of the
 * Labbook's parts and the ticker at each size. */
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
const SHOTS = process.env.LAB_SHOTS;
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

/** The ticker as it stands this instant. */
const ticker = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const root = document.querySelector(".site-frame main [data-ticker]");
    if (!root) return null;
    const strip = root.querySelector("[data-ticker-strip]");
    const box = (el) => {
      const { left, right, top, bottom } = el.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const runs = [...root.querySelectorAll("[data-ticker-run]")];
    const following = root.nextElementSibling ?? root.parentElement;
    return {
      name: text(document.getElementById(root.getAttribute("aria-labelledby"))),
      headlines: [
        ...root.querySelectorAll("[data-part='ticker.headline']"),
      ].map((item) => {
        const link = item.querySelector("a");
        return {
          id: item.dataset.ref,
          text: text(link),
          href: link.getAttribute("href"),
          box: box(link),
          visible: link.checkVisibility(),
        };
      }),
      // Links anyone can reach with Tab or a screen reader.
      reachable: [...root.querySelectorAll("a")].filter(
        (link) => link.tabIndex >= 0 && !link.closest("[aria-hidden='true']"),
      ).length,
      runs: runs.map((run) => ({
        x: run.getBoundingClientRect().left,
        visible: run.checkVisibility(),
        running: run
          .getAnimations()
          .some((animation) => animation.playState === "running"),
        animations: run.getAnimations().length,
      })),
      strip: box(strip),
      box: box(root),
      below: following.getBoundingClientRect().top,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Daylight shows the Labbook, its artifacts, redaction and the ticker",
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

        for (const path of ["/", "/lab"])
          await t.test(
            `${size}: the ticker on ${path} runs the seeded headlines, each linking into the Labbook`,
            async () => {
              const { context, page } = await open(size, path);
              const strip = await ticker(page);
              assert.ok(strip, "there is a ticker");
              assert.equal(strip.name, content.site.ticker.label);
              assert.deepEqual(
                strip.headlines.map(({ id, text, href }) => ({
                  id,
                  text,
                  href,
                })),
                content.headlines.map((headline) => ({
                  id: headline.id,
                  text: headline.text,
                  href: `/lab#u-${headline.updates[0]}`,
                })),
              );
              assert.equal(strip.reachable, content.headlines.length);
              assert.equal(strip.overflow, 0, "nothing wider than the screen");
              if (path === "/" && SHOTS) {
                await shot(page, "[data-ticker]", `ticker-home-still-${size}`);
                // And as most visitors meet it: running.
                const live = await open(size, "/", { motion: true });
                await live.page.waitForTimeout(2500);
                await shot(live.page, "[data-ticker]", `ticker-home-${size}`);
                await live.context.close();
              }
              // Following one lands on its update.
              const [first] = content.headlines;
              await page
                .locator("[data-part='ticker.headline'] a")
                .first()
                .click();
              await page.waitForURL(`${base}/lab#u-${first.updates[0]}`);
              await page.waitForSelector(`#u-${first.updates[0]}:target`);
              await context.close();
            },
          );

        await t.test(
          `${size}: with motion reduced the ticker is still, and every headline can be read`,
          async () => {
            const { context, page } = await open(size, ROOM);
            const before = await ticker(page);
            await page.waitForTimeout(600);
            const after = await ticker(page);
            assert.equal(before.headlines.length, 3);
            assert.deepEqual(
              before.runs.map((run) => run.animations),
              before.runs.map(() => 0),
              "nothing is animated",
            );
            assert.deepEqual(
              after.runs.map((run) => run.x),
              before.runs.map((run) => run.x),
              "nothing moves",
            );
            assert.deepEqual(
              before.runs.map((run) => run.visible),
              [true, false],
              "the headlines are said once",
            );
            for (const headline of before.headlines) {
              assert.ok(headline.visible, `${headline.id} is shown`);
              assert.ok(
                headline.box.left >= before.strip.left - 1 &&
                  headline.box.right <= before.strip.right + 1,
                `${headline.id} fits inside the strip`,
              );
            }
            await shot(page, "[data-ticker]", `ticker-still-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: the ticker moves gently, holds under a pointer, and never shifts the page`,
          async () => {
            const { context, page } = await open(size, ROOM, { motion: true });
            await page.mouse.move(0, 0);
            const start = await ticker(page);
            await page.waitForTimeout(1000);
            const later = await ticker(page);
            assert.deepEqual(
              start.runs.map((run) => run.running),
              [true, true],
              "both runs of the tape are moving",
            );
            const travelled = start.runs[0].x - later.runs[0].x;
            assert.ok(
              travelled > 5 && travelled < 90,
              `it drifts left at a reading pace (${travelled.toFixed(1)}px in a second)`,
            );
            assert.equal(
              (start.runs[0].x - start.runs[1].x).toFixed(1),
              (later.runs[0].x - later.runs[1].x).toFixed(1),
              "the two runs travel as one tape",
            );
            assert.equal(later.overflow, 0, "nothing wider than the screen");
            if (size === "desktop") {
              const { strip } = later;
              await page.mouse.move(
                (strip.left + strip.right) / 2,
                (strip.top + strip.bottom) / 2,
              );
              await page.waitForTimeout(100);
              const held = await ticker(page);
              await page.waitForTimeout(600);
              const still = await ticker(page);
              assert.equal(still.runs[0].x, held.runs[0].x, "it holds");
              assert.deepEqual(
                still.runs.map((run) => run.animations),
                [1, 1],
                "held, not started over",
              );
              await page.mouse.move(0, 0);
              await page.waitForTimeout(600);
              const released = await ticker(page);
              assert.ok(
                released.runs[0].x < still.runs[0].x,
                "and goes on from where it was",
              );
              for (const moment of [held, still, released]) {
                assert.deepEqual(moment.box, start.box, "the strip stays put");
                assert.equal(moment.below, start.below, "so does what follows");
              }
            }
            assert.deepEqual(later.box, start.box, "the strip stays put");
            assert.equal(later.below, start.below, "so does what follows");
            await shot(page, "[data-ticker]", `ticker-moving-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: the ticker rests for the keyboard, shows the headline in focus, and lets go`,
          async () => {
            const { context, page } = await open(size, ROOM, { motion: true });
            await page.waitForTimeout(1500);
            const moving = await ticker(page);
            const links = page.locator("[data-part='ticker.headline'] a");
            const focused = () =>
              page.evaluate(() => {
                const el = document.activeElement;
                const item = el?.closest("[data-part='ticker.headline']");
                const { left, right } = el.getBoundingClientRect();
                return {
                  headline: item?.dataset.ref ?? null,
                  inTicker: !!el?.closest("[data-ticker]"),
                  left,
                  right,
                };
              });
            // Tab in from whatever comes before the ticker.
            await page.evaluate(() => {
              const first = document.querySelector(
                "[data-part='ticker.headline'] a",
              );
              const all = [
                ...document.querySelectorAll("a[href], button"),
              ].filter((el) => el.tabIndex >= 0 && el.checkVisibility());
              all[all.indexOf(first) - 1].focus();
            });
            const seen = [];
            for (let i = 0; i < (await links.count()); i += 1) {
              await page.keyboard.press("Tab");
              await page.waitForTimeout(150);
              const now = await focused();
              const strip = await ticker(page);
              await page.waitForTimeout(400);
              const still = await ticker(page);
              seen.push(now.headline);
              assert.ok(now.inTicker, "Tab reaches each headline");
              assert.deepEqual(
                still.runs.map((run) => run.x),
                strip.runs.map((run) => run.x),
                "the tape is at rest while a headline has focus",
              );
              // All of it when it fits; its beginning when it is longer
              // than the strip.
              const room = strip.strip.right - strip.strip.left;
              assert.ok(
                now.left >= strip.strip.left - 1 &&
                  (now.right <= strip.strip.right + 1 ||
                    (now.right - now.left > room - 60 &&
                      now.left < strip.strip.left + 120)),
                `${now.headline} is in view while it has focus (${now.left} to ${now.right} in ${strip.strip.left} to ${strip.strip.right})`,
              );
              assert.deepEqual(strip.box, moving.box, "the strip stays put");
              assert.equal(strip.below, moving.below, "so does what follows");
            }
            // In the order they are written, each once: the second run of
            // the tape is for the eye only.
            assert.deepEqual(
              seen,
              moving.headlines.map((headline) => headline.id),
            );
            await page.keyboard.press("Tab");
            assert.equal(
              (await focused()).inTicker,
              false,
              "one more Tab leaves the ticker",
            );
            await page.waitForTimeout(700);
            const resumed = await ticker(page);
            assert.deepEqual(
              resumed.runs.map((run) => run.running),
              [true, true],
              "and the tape runs again",
            );
            assert.equal(
              await page.evaluate(
                () => document.querySelector("[data-ticker-strip]").scrollLeft,
              ),
              0,
              "from its start, not from wherever focus had scrolled it",
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: one headline still fills the strip, and none leaves no strip`,
          async () => {
            const one = await open(size, `${ROOM}?headlines=one`, {
              motion: true,
            });
            const strip = await ticker(one.page);
            assert.equal(strip.headlines.length, 1);
            assert.equal(strip.reachable, 1);
            // A run is never narrower than the strip, so one headline
            // crosses the whole of it and the next lap follows without a gap.
            const width = strip.strip.right - strip.strip.left;
            assert.ok(
              strip.runs[1].x - strip.runs[0].x >= width - 1,
              "the tape is a full lap long",
            );
            assert.equal(strip.overflow, 0);
            await shot(one.page, "[data-ticker]", `ticker-one-${size}`);
            await one.context.close();

            const none = await open(size, `${ROOM}?headlines=none`);
            assert.equal(await ticker(none.page), null);
            assert.equal(
              await none.page.locator("[data-ticker], .ticker").count(),
              0,
              "nothing is left where it would be",
            );
            await none.context.close();
          },
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
