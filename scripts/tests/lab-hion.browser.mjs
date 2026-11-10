/** Hion's Lab (issue #99): the Bench and the Shelf, the Labbook with its
 * artifacts and its redacted updates, the reel of headlines on the home
 * page and in the Lab, and an experiment's own record and graduation.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on /lab and / against /prism/content.json, and in the harness on
 * the `labbook`, `lab-full-page` and `lab-bare-entry` fixtures, which hold
 * every state whatever src/content does. Same server and Chromium as
 * prism-parity.browser.mjs. LAB_SHOTS=<dir> also saves pictures of each
 * part at each size. */
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

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const SHOTS = process.env.LAB_SHOTS;
const PEN_FRAME = "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result";
const DEMO_FRAME = "https://example.com/fixture-demo/";
const fixture = labbookFixture();
const harness = (name, route) =>
  `/prism/harness?lens=hion&fixture=${name}&route=${encodeURIComponent(route)}`;
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
            return {
              slug: title.dataset.ref,
              title: text(title.querySelector("a")?.firstChild),
              href: title.querySelector("a")?.getAttribute("href") ?? null,
              summary: text(entry.querySelector("[data-part='lab.summary']")),
              featured: entry.hasAttribute("data-lab-featured"),
              width: entry.getBoundingClientRect().width,
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
    const section = document.querySelector("#lens-shell .hion-strand--labbook");
    if (!section) return null;
    const entries = [];
    for (const item of section.querySelectorAll("ol > li")) {
      const title = item.querySelector(".hion-tied__title");
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
        // What is tied on at its knot, a line at a time.
        text: [...item.querySelectorAll(".hion-tied__block > *")]
          .map(text)
          .filter(Boolean)
          .join(" "),
        origin: text(item.querySelector(".hion-tied__title + .hion-meta")),
        title: text(title?.querySelector("a")?.firstChild ?? title),
        href: title?.querySelector("a")?.getAttribute("href") ?? null,
        summary: text(item.querySelector(".hion-tied__summary")),
        date: item.querySelector("time")?.getAttribute("datetime") ?? null,
        dateLabel: text(item.querySelector("time")),
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
      });
    }
    return {
      heading: text(
        document.getElementById(section.getAttribute("aria-labelledby")),
      ),
      whole: section.hasAttribute("data-labbook"),
      afterShelf: !!(
        document
          .querySelector("#lens-shell [data-lab-place='shelf']")
          ?.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING
      ),
      entries,
    };
  });

/** The reel as it stands this instant. */
const reel = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const root = document.querySelector("#lens-shell [data-reel]");
    if (!root) return null;
    const strip = root.querySelector("[data-reel-strip]");
    const box = (el) => {
      const { left, right, top, bottom } = el.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const runs = [...root.querySelectorAll("[data-reel-run]")];
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
        (link) =>
          link.tabIndex >= 0 &&
          link.checkVisibility() &&
          !link.closest("[aria-hidden='true']"),
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
  "Hion shows the Bench, the Shelf, the Labbook and the reel",
  { skip, timeout: 15 * 60_000 },
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

    /** A page at one size, once Hion has drawn it. Nothing here leaves the
     * test: whatever a page asks of another origin is written down and
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
          .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(SHOTS, `${name}.png`) });
    };

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: /lab hangs the Bench and lays out the Shelf, the featured experiment leading`,
          async () => {
            const { context, page, errors } = await open(
              size,
              "/lab?lens=hion",
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
            const bench = room.find(({ place }) => place === "bench");
            const lead = content.lab.find(
              (entry) => entry.place === "bench" && entry.featured,
            );
            if (lead) {
              assert.equal(bench.entries[0].slug, lead.slug);
              assert.deepEqual(
                bench.entries.map((entry) => entry.featured),
                bench.entries.map((_, i) => i === 0),
                "one experiment has pride of place",
              );
              if (size === "desktop")
                assert.ok(
                  bench.entries
                    .slice(1)
                    .every((entry) => entry.width < bench.entries[0].width),
                  "and it is given more room than the rest",
                );
            }
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await shot(page, null, `hion-lab-${size}`);
            await shot(page, "[data-lab-place='bench']", `hion-bench-${size}`);
            await shot(
              page,
              "[data-lab-place='bench'] li:nth-child(4)",
              `hion-bench-rows-${size}`,
            );
            await shot(
              page,
              "[data-lab-place='shelf'] ol",
              `hion-shelf-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: /lab knots the seeded updates on the Labbook, newest first, each with its anchor`,
          async () => {
            const { context, page } = await open(size, "/lab?lens=hion");
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
            await shot(
              page,
              ".hion-strand--labbook ol",
              `hion-lab-labbook-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a link to an update lands on its knot in the Labbook`,
          async () => {
            const { context, page } = await open(
              size,
              "/lab?lens=hion#u-qrng-demos",
            );
            await page.waitForTimeout(600);
            const landed = await page.evaluate(() => {
              const target = document.querySelector(
                "#lens-shell [data-landed]",
              );
              if (!target) return null;
              const { top, bottom } = target.getBoundingClientRect();
              return {
                id: target.id,
                top,
                bottom,
                height: innerHeight,
                shown: getComputedStyle(target).opacity,
              };
            });
            assert.ok(landed, "an update is marked as the one landed on");
            assert.equal(landed.id, "u-qrng-demos");
            assert.ok(
              landed.top >= 0 && landed.top < landed.height,
              `the update is on screen (its top at ${landed.top})`,
            );
            assert.equal(landed.shown, "1", "and drawn");
            await shot(page, null, `hion-landed-${size}`);
            await context.close();
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
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await shot(
              page,
              "#u-fixture-first-line",
              `hion-labbook-image-${size}`,
            );
            await shot(page, "#u-fixture-film", `hion-labbook-film-${size}`);
            await shot(
              page,
              ".hion-strand--labbook h2",
              `hion-labbook-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a Pen and a demo load only after their cord is pulled`,
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
            const kept = (id) =>
              page.evaluate((id) => {
                const place = document.querySelector(
                  `#${id} [data-kept-frame]`,
                );
                const { height } = place.getBoundingClientRect();
                const cord = place.querySelector("[data-kept-pull]");
                return {
                  height: Math.round(height),
                  cord: cord?.textContent.replace(/\s+/g, " ").trim() ?? null,
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
            await page.locator("[data-labbook]").scrollIntoViewIfNeeded();
            await page.mouse.wheel(0, 6000);
            await page.waitForTimeout(600);
            assert.deepEqual(await frames(), [], "no frame before a pull");
            assert.deepEqual(asked, [], "nothing asked of CodePen or the demo");

            const pen = await kept("u-fixture-replay");
            assert.equal(pen.cord, copy.artifact.load.pen);
            assert.equal(pen.poster, "/images/lab/motion-path-graph.svg");
            const demo = await kept("u-fixture-demo");
            assert.equal(demo.cord, copy.artifact.load.demo);
            assert.equal(demo.poster, null, "no poster: a plain place");
            assert.ok(
              demo.says.includes("A grid of shapes that beat in time"),
              "the place says what it is kept for",
            );
            assert.ok(pen.says.includes(copy.artifact.note));
            await shot(page, "#u-fixture-replay", `hion-pen-before-${size}`);
            await shot(page, "#u-fixture-demo", `hion-demo-before-${size}`);

            await page.click("#u-fixture-replay [data-kept-pull]");
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
            assert.deepEqual(asked, [PEN_FRAME], "the pull asked for the Pen");
            const after = await kept("u-fixture-replay");
            assert.equal(
              after.height,
              pen.height,
              "the frame takes the place kept",
            );
            assert.equal(after.below, pen.below, "and nothing under it moves");
            assert.equal(after.cord, null, "the frame takes the cord's place");
            await shot(page, "#u-fixture-replay", `hion-pen-after-${size}`);

            // The keyboard asks the same way.
            await page.focus("#u-fixture-demo [data-kept-pull]");
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
            // Where each lives is an ordinary link, there from the start.
            assert.equal(
              await page
                .locator("#u-fixture-replay .hion-artifact__home a")
                .getAttribute("href"),
              "https://codepen.io/beejsbj/pen/abXZWLQ",
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a redacted update is its bindings, with a name a screen reader can say`,
          async () => {
            const { context, page } = await open(size, ROOM);
            const book = await labbook(page);
            const hidden = fixture.labbook.find(
              (update) => update.visibility === "redacted",
            );
            const entry = book.entries.find((item) => item.id === hidden.id);
            assert.equal(entry.part, "update.redacted");
            assert.equal(entry.ref, hidden.id);
            assert.equal(entry.bars, hidden.shape.bars.length);
            assert.equal(entry.date, hidden.date);
            assert.equal(
              entry.text,
              `${updateDateLabel(hidden.date)} ${copy.redacted.label} ${copy.redacted.works[hidden.shape.work]}`,
              "its date, what it is, its kind of work: no other word",
            );
            assert.equal(entry.controls, 0, "nothing to follow or play");
            assert.deepEqual(entry.related, []);
            assert.deepEqual(entry.pictures, []);
            assert.equal(
              await page
                .locator(`#u-${hidden.id}`)
                .getByText(copy.redacted.label, { exact: true })
                .count(),
              1,
              "it is named for assistive technology",
            );
            const bars = await page.evaluate((id) => {
              const bound = document.querySelector(`#u-${id} .hion-bound`);
              const canvas = bound.querySelector("canvas");
              return {
                hidden: bound.getAttribute("aria-hidden") === "true",
                wound: !!canvas && canvas.width > 0 && canvas.checkVisibility(),
                bars: [...bound.querySelectorAll("[data-redaction-bar]")].map(
                  (bar) => {
                    const { width, height } = bar.getBoundingClientRect();
                    return { width, height };
                  },
                ),
              };
            }, hidden.id);
            assert.ok(bars.hidden, "the bindings say nothing");
            assert.ok(bars.wound, "thread is wound round them");
            for (const bar of bars.bars)
              assert.ok(
                bar.height > 8,
                "a binding is tall enough to hide a word",
              );
            // Longer numbers, longer bindings.
            const order = (list) =>
              list
                .map((value, index) => [value, index])
                .sort(([a], [b]) => a - b)
                .map(([, index]) => index);
            assert.deepEqual(
              order(bars.bars.map((bar) => bar.width)),
              order(hidden.shape.bars),
            );
            assert.ok(
              !(await page.content()).includes(REDACTION_MARKER),
              "nothing it hides is in the page",
            );
            await shot(page, `#u-${hidden.id}`, `hion-redacted-${size}`);
            await context.close();
          },
        );

        for (const path of ["/", "/lab"])
          await t.test(
            `${size}: the reel on ${path} carries the seeded headlines, each linking into the Labbook`,
            async () => {
              const { context, page } = await open(size, `${path}?lens=hion`);
              const strip = await reel(page);
              assert.ok(strip, "there is a reel");
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
              const name = path === "/" ? "home" : "lab";
              await shot(
                page,
                "#lens-shell [data-reel]",
                `hion-reel-${name}-still-${size}`,
              );
              // And as most visitors meet it, running: one long line that
              // widens nothing it hangs in.
              const live = await open(size, `${path}?lens=hion`, {
                motion: true,
              });
              await live.page.waitForTimeout(1200);
              const running = await reel(live.page);
              const { width } = SIZES[size].viewport;
              assert.ok(
                running.box.left >= 0 && running.box.right <= width + 0.5,
                `the running reel keeps inside the screen (${running.box.left} to ${running.box.right} of ${width})`,
              );
              assert.ok(
                running.strip.right - running.strip.left <=
                  running.box.right - running.box.left + 0.5,
                "and its strip inside the reel",
              );
              await shot(
                live.page,
                "#lens-shell [data-reel]",
                `hion-reel-${name}-${size}`,
              );
              await live.context.close();
              // Following one lands on its update, whichever page it was on.
              const [first] = content.headlines;
              await page
                .locator("[data-part='ticker.headline'] a")
                .first()
                .click();
              await page.waitForURL(
                (url) =>
                  url.pathname === "/lab" &&
                  url.hash === `#u-${first.updates[0]}`,
              );
              await page.waitForSelector(
                `#lens-shell #u-${first.updates[0]}[data-landed]`,
              );
              await page.waitForTimeout(900);
              const top = await page
                .locator(`#lens-shell #u-${first.updates[0]}`)
                .evaluate((el) => el.getBoundingClientRect().top);
              assert.ok(
                top >= 0 && top < SIZES[size].viewport.height,
                `the update is on screen (its top at ${top})`,
              );
              await context.close();
            },
          );

        await t.test(
          `${size}: with motion reduced the reel is still, and every headline can be read`,
          async () => {
            const { context, page } = await open(size, ROOM);
            const before = await reel(page);
            await page.waitForTimeout(600);
            const after = await reel(page);
            assert.ok(before.headlines.length >= 3);
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
              "the headlines are told once",
            );
            for (const headline of before.headlines) {
              assert.ok(headline.visible, `${headline.id} is shown`);
              assert.ok(
                headline.box.left >= before.strip.left - 1 &&
                  headline.box.right <= before.strip.right + 1,
                `${headline.id} fits inside the strip`,
              );
            }
            assert.equal(before.overflow, 0);
            await shot(page, "[data-reel]", `hion-reel-still-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: the reel is drawn through gently, holds under a pointer, and never shifts the page`,
          async () => {
            const { context, page } = await open(size, ROOM, { motion: true });
            await page.mouse.move(0, 0);
            await page.waitForTimeout(1200);
            const start = await reel(page);
            await page.waitForTimeout(1000);
            const later = await reel(page);
            assert.deepEqual(
              start.runs.map((run) => run.running),
              [true, true],
              "both runs of the thread are moving",
            );
            const travelled = start.runs[0].x - later.runs[0].x;
            assert.ok(
              travelled > 5 && travelled < 90,
              `it is drawn left at a reading pace (${travelled.toFixed(1)}px in a second)`,
            );
            assert.equal(
              (start.runs[0].x - start.runs[1].x).toFixed(1),
              (later.runs[0].x - later.runs[1].x).toFixed(1),
              "the two runs travel as one thread",
            );
            assert.ok(
              start.runs[1].x - start.runs[0].x >=
                start.strip.right - start.strip.left - 1,
              "a run is never shorter than the strip",
            );
            assert.equal(later.overflow, 0, "nothing wider than the screen");
            if (size === "desktop") {
              const { strip } = later;
              await page.mouse.move(
                (strip.left + strip.right) / 2,
                (strip.top + strip.bottom) / 2,
              );
              await page.waitForTimeout(100);
              const held = await reel(page);
              await page.waitForTimeout(600);
              const still = await reel(page);
              assert.equal(still.runs[0].x, held.runs[0].x, "it holds");
              assert.deepEqual(
                still.runs.map((run) => run.animations),
                [1, 1],
                "held, not started over",
              );
              await page.mouse.move(0, 0);
              await page.waitForTimeout(600);
              const released = await reel(page);
              assert.ok(
                released.runs[0].x < still.runs[0].x,
                "and goes on from where it was",
              );
              for (const moment of [held, still, released]) {
                assert.deepEqual(moment.box, start.box, "the reel stays put");
                assert.equal(moment.below, start.below, "so does what follows");
              }
            }
            assert.deepEqual(later.box, start.box, "the reel stays put");
            assert.equal(later.below, start.below, "so does what follows");
            await context.close();
          },
        );

        await t.test(
          `${size}: the reel rests for the keyboard, shows the headline in focus, and lets go`,
          async () => {
            const { context, page } = await open(size, ROOM, { motion: true });
            await page.waitForTimeout(1500);
            const moving = await reel(page);
            const links = page.locator("[data-part='ticker.headline'] a");
            const focused = () =>
              page.evaluate(() => {
                const el = document.activeElement;
                const item = el?.closest("[data-part='ticker.headline']");
                const { left, right } = el.getBoundingClientRect();
                return {
                  headline: item?.dataset.ref ?? null,
                  inReel: !!el?.closest("[data-reel]"),
                  left,
                  right,
                };
              });
            // Tab in from whatever comes before the reel.
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
              const strip = await reel(page);
              await page.waitForTimeout(400);
              const still = await reel(page);
              seen.push(now.headline);
              assert.ok(now.inReel, "Tab reaches each headline");
              assert.deepEqual(
                still.runs.map((run) => run.x),
                strip.runs.map((run) => run.x),
                "the thread is at rest while a headline has focus",
              );
              // All of it when it fits; its beginning when it is longer
              // than the strip.
              const room = strip.strip.right - strip.strip.left;
              assert.ok(
                now.left >= strip.strip.left - 1 &&
                  (now.right <= strip.strip.right + 1 ||
                    (now.right - now.left > room - 120 &&
                      now.left < strip.strip.left + 160)),
                `${now.headline} is in view while it has focus (${now.left} to ${now.right} in ${strip.strip.left} to ${strip.strip.right})`,
              );
              assert.equal(
                strip.box.right - strip.box.left,
                moving.box.right - moving.box.left,
                "the reel keeps its width",
              );
              assert.equal(
                strip.box.bottom - strip.box.top,
                moving.box.bottom - moving.box.top,
                "and its height",
              );
            }
            // In the order they are written, each once: the second run of
            // the thread is for the eye only.
            assert.deepEqual(
              seen,
              moving.headlines.map((headline) => headline.id),
            );
            await page.keyboard.press("Tab");
            assert.equal(
              (await focused()).inReel,
              false,
              "one more Tab leaves the reel",
            );
            await page.waitForTimeout(700);
            const resumed = await reel(page);
            assert.deepEqual(
              resumed.runs.map((run) => run.running),
              [true, true],
              "and the thread runs again",
            );
            assert.equal(
              await page.evaluate(
                () => document.querySelector("[data-reel-strip]").scrollLeft,
              ),
              0,
              "from its start, not from wherever focus had scrolled it",
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: one headline still crosses the whole strip, and none leaves no reel`,
          async () => {
            const one = await open(size, "/?lens=hion", {
              motion: true,
              bend: (data) => ({
                ...data,
                headlines: data.headlines.slice(0, 1),
              }),
            });
            await one.page.waitForTimeout(1200);
            const strip = await reel(one.page);
            assert.equal(strip.headlines.length, 1);
            assert.equal(strip.reachable, 1);
            assert.ok(
              strip.runs[1].x - strip.runs[0].x >=
                strip.strip.right - strip.strip.left - 1,
              "the thread is a full lap long",
            );
            assert.equal(strip.overflow, 0);
            await one.context.close();

            for (const path of ["/", "/lab"]) {
              const none = await open(size, `${path}?lens=hion`, {
                bend: (data) => ({ ...data, headlines: [] }),
              });
              assert.equal(await reel(none.page), null);
              assert.equal(
                await none.page
                  .locator("#lens-shell :is([data-reel], .hion-reel)")
                  .count(),
                0,
                `nothing is left where it would be on ${path}`,
              );
              assert.deepEqual(none.errors, []);
              await none.context.close();
            }
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
            // With somewhere to go it goes there; with nowhere, to its
            // place in the Labbook.
            assert.equal(
              entry("fixture-study-replay").href,
              "https://codepen.io/beejsbj/pen/abXZWLQ",
            );
            assert.equal(
              entry("fixture-study-first-line").href,
              "/lab#u-fixture-study-first-line",
            );
            assert.equal(entry("fixture-study-kept-back").bars, 3);
            assert.equal(entry("fixture-study-kept-back").controls, 0);
            assert.ok(
              book.entries.every((item) => !item.anchored),
              "its links land in the Labbook, not here",
            );

            const project = await page.evaluate(
              () => window.prismHarness.content.projects[0],
            );
            const graduation = page.locator("[data-part='lab.graduation']");
            assert.equal(await graduation.count(), 1);
            assert.equal(
              words(await graduation.locator("dt").textContent()),
              content.pages.lab.detail.labels.graduated,
            );
            assert.equal(
              words(
                await graduation
                  .locator("dd a")
                  .evaluate((a) => a.firstChild.textContent),
              ),
              project.title,
            );
            assert.equal(
              await graduation.locator("a").getAttribute("href"),
              project.href,
            );
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            assert.deepEqual(errors, []);
            await shot(page, null, `hion-experiment-${size}`);
            await shot(
              page,
              ".hion-strand--labbook ol",
              `hion-experiment-updates-${size}`,
            );
            await shot(page, ".hion-onward", `hion-experiment-onward-${size}`);
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
                tags: main.querySelectorAll(".hion-tag--meta").length,
                record: main.querySelectorAll(".hion-strand--labbook").length,
                graduation: main.querySelectorAll(
                  "[data-part='lab.graduation']",
                ).length,
                cover: [...main.querySelectorAll(".hion-picture img")].map(
                  (img) => img.getAttribute("src"),
                ),
              };
            });
            const { labels } = content.pages.lab.detail;
            for (const label of [labels.type, labels.era, labels.graduated])
              assert.ok(!shown.text.includes(label), `no "${label}" label`);
            assert.equal(shown.tags, 0, "no empty tag hangs in its head");
            assert.equal(shown.record, 0, "no updates, no strand");
            assert.equal(shown.graduation, 0);
            assert.deepEqual(
              shown.cover,
              ["/images/lab/beating-shapes.png"],
              "its cover stands in for a picture",
            );
            assert.deepEqual(errors, []);
            await shot(page, null, `hion-experiment-bare-${size}`);
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
