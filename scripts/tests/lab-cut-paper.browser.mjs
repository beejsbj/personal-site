/** Cut Paper's Lab (issue #97): the armed and the muted pads of the rack
 * (the Bench and the Shelf), the Labbook with its artifacts and its redacted
 * updates, the ribbon of headlines on the home page and in the Lab, and an
 * experiment's own record and graduation.
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

/** The ribbon of headlines as it stands this instant. */
const ribbon = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const root = document.querySelector("#lens-shell [data-ribbon]");
    if (!root) return null;
    const strip = root.querySelector("[data-ribbon-strip]");
    const box = (el) => {
      const { left, right, top, bottom } = el.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const runs = [...root.querySelectorAll("[data-ribbon-run]")];
    const following = root.nextElementSibling ?? root.parentElement;
    const view = root.closest(".cp-scroll").getBoundingClientRect();
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
          day: item.querySelector("time")?.getAttribute("datetime") ?? null,
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
      room: strip.clientWidth,
      scrolled: strip.scrollLeft,
      box: box(root),
      view: { left: view.left, right: view.right },
      below: following.getBoundingClientRect().top,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
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
  "Cut Paper shows the Bench, the Shelf, the Labbook and the ribbon of headlines",
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
          `${size}: /lab arms the Bench and mutes the Shelf, the featured experiment leading`,
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
          `${size}: a redacted update is strips of black paper over its words, with a name a screen reader can say`,
          async () => {
            const { context, page } = await open(size, ROOM);
            const book = await labbook(page);
            const hidden = fixture.labbook.find(
              (update) => update.visibility === "redacted",
            );
            const entry = book.entries.find((item) => item.id === hidden.id);
            assert.equal(entry.part, "update.redacted");
            assert.equal(entry.ref, hidden.id);
            assert.equal(entry.strips, hidden.shape.bars.length);
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
                .locator(`#lens-shell #u-${hidden.id}`)
                .getByText(copy.redacted.label, { exact: true })
                .count(),
              1,
              "it is named for assistive technology",
            );
            const strike = await page.evaluate((id) => {
              const struck = document.querySelector(
                `#lens-shell #u-${id} .cp-strike`,
              );
              const paper = getComputedStyle(struck.closest("ol"));
              return {
                hidden: struck.getAttribute("aria-hidden") === "true",
                paper: paper.backgroundColor,
                strips: [...struck.querySelectorAll("[data-strip]")].map(
                  (strip) => {
                    const { width, height } = strip.getBoundingClientRect();
                    return {
                      width,
                      height,
                      ink: getComputedStyle(strip).backgroundColor,
                      shown: strip.checkVisibility(),
                    };
                  },
                ),
              };
            }, hidden.id);
            assert.ok(strike.hidden, "the strips say nothing");
            for (const strip of strike.strips) {
              assert.ok(strip.shown);
              assert.ok(
                strip.height > 8,
                "a strip is tall enough to hide a word",
              );
              assert.equal(strip.ink, "rgb(10, 9, 8)", "black paper");
              assert.notEqual(strip.ink, strike.paper, "on paper that is not");
            }
            // Longer numbers, longer strips.
            const order = (list) =>
              list
                .map((value, index) => [value, index])
                .sort(([a], [b]) => a - b)
                .map(([, index]) => index);
            assert.deepEqual(
              order(strike.strips.map((strip) => strip.width)),
              order(hidden.shape.bars),
            );
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

        for (const path of ["/", "/lab"])
          await t.test(
            `${size}: the ribbon on ${path} carries the seeded headlines, each linking into the Labbook`,
            async () => {
              const { context, page, errors } = await open(
                size,
                `${path}?lens=cut-paper`,
              );
              const strip = await ribbon(page);
              assert.ok(strip, "there is a ribbon");
              assert.equal(strip.name, content.site.ticker.label);
              assert.deepEqual(
                strip.headlines.map(({ id, text, href, day }) => ({
                  id,
                  text,
                  href,
                  day,
                })),
                content.headlines.map((headline) => ({
                  id: headline.id,
                  text: headline.text,
                  href: `/lab#u-${headline.updates[0]}`,
                  day: headline.date,
                })),
              );
              assert.equal(strip.reachable, content.headlines.length);
              assert.equal(
                await overflow(page),
                0,
                "nothing wider than the screen",
              );
              assert.deepEqual(errors, []);
              const name = path === "/" ? "home" : "lab";
              await shot(page, null, `cut-paper-ribbon-${name}-still-${size}`);
              // And as most visitors meet it, running: one long line that
              // widens nothing it lies in.
              const live = await open(size, `${path}?lens=cut-paper`, {
                motion: true,
              });
              await live.page.waitForTimeout(1500);
              const running = await ribbon(live.page);
              assert.deepEqual(
                running.runs.map((run) => run.running),
                [true, true],
                "it runs",
              );
              assert.ok(
                running.box.left >= running.view.left - 0.5 &&
                  running.box.right <= running.view.right + 0.5,
                `the running ribbon keeps inside the view (${running.box.left} to ${running.box.right} in ${running.view.left} to ${running.view.right})`,
              );
              assert.ok(
                running.strip.left >= running.box.left - 0.5 &&
                  running.strip.right <= running.box.right + 0.5,
                "and its strip inside the ribbon",
              );
              assert.equal(await overflow(live.page), 0);
              await shot(live.page, null, `cut-paper-ribbon-${name}-${size}`);
              await live.context.close();
              // Following one lands on its update, whichever page it was on.
              const [first] = content.headlines;
              await page
                .locator("#lens-shell [data-part='ticker.headline'] a")
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
              const landed = await page
                .locator(`#lens-shell #u-${first.updates[0]}`)
                .evaluate((el) => {
                  const view = el.closest(".cp-scroll").getBoundingClientRect();
                  const { top, bottom } = el.getBoundingClientRect();
                  return { top, bottom, from: view.top, to: view.bottom };
                });
              // Under the margin kept above a landed line, whether the
              // shell or the browser's own jump to the fragment put it there.
              assert.ok(
                landed.top >= landed.from + 40 && landed.top < landed.to,
                `the update is in the view, clear of its top (${landed.top} in ${landed.from} to ${landed.to})`,
              );
              await context.close();
            },
          );

        await t.test(
          `${size}: with motion reduced the ribbon is still, and every headline can be read`,
          async () => {
            const { context, page } = await open(size, ROOM);
            const before = await ribbon(page);
            await page.waitForTimeout(600);
            const after = await ribbon(page);
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
                headline.box.left >= before.strip.left - 0.5 &&
                  headline.box.right <= before.strip.right + 0.5,
                `${headline.id} fits inside the strip`,
              );
            }
            assert.equal(await overflow(page), 0);
            await shot(page, null, `cut-paper-ribbon-still-${size}`);
            await context.close();
          },
        );

        await t.test(
          `${size}: the ribbon runs at a reading pace, holds under a pointer, and never shifts the page`,
          async () => {
            const { context, page } = await open(size, ROOM, { motion: true });
            await page.mouse.move(0, 0);
            await page.waitForTimeout(1500);
            const start = await ribbon(page);
            await page.waitForTimeout(1000);
            const later = await ribbon(page);
            assert.deepEqual(
              start.runs.map((run) => run.running),
              [true, true],
              "both runs of the ribbon are moving",
            );
            const travelled = start.runs[0].x - later.runs[0].x;
            assert.ok(
              travelled > 5 && travelled < 90,
              `it runs left at a reading pace (${travelled.toFixed(1)}px in a second)`,
            );
            assert.equal(
              (start.runs[0].x - start.runs[1].x).toFixed(1),
              (later.runs[0].x - later.runs[1].x).toFixed(1),
              "the two runs travel as one ribbon",
            );
            assert.ok(
              start.runs[1].x - start.runs[0].x >= start.room - 1,
              "a run is never shorter than the strip",
            );
            assert.equal(
              await overflow(page),
              0,
              "nothing wider than the screen",
            );
            if (size === "desktop") {
              const { strip } = later;
              await page.mouse.move(
                (strip.left + strip.right) / 2,
                (strip.top + strip.bottom) / 2,
              );
              await page.waitForTimeout(100);
              const held = await ribbon(page);
              await page.waitForTimeout(600);
              const still = await ribbon(page);
              assert.equal(still.runs[0].x, held.runs[0].x, "it holds");
              assert.deepEqual(
                still.runs.map((run) => run.animations),
                [1, 1],
                "held, not started over",
              );
              await page.mouse.move(0, 0);
              await page.waitForTimeout(600);
              const released = await ribbon(page);
              assert.ok(
                released.runs[0].x < still.runs[0].x,
                "and goes on from where it was",
              );
              for (const moment of [held, still, released]) {
                assert.deepEqual(moment.box, start.box, "the ribbon stays put");
                assert.equal(moment.below, start.below, "so does what follows");
              }
            }
            assert.deepEqual(later.box, start.box, "the ribbon stays put");
            assert.equal(later.below, start.below, "so does what follows");
            await context.close();
          },
        );

        await t.test(
          `${size}: one headline still crosses the whole strip, and none leaves no ribbon`,
          async () => {
            const one = await open(size, "/?lens=cut-paper", {
              motion: true,
              bend: (data) => ({
                ...data,
                headlines: data.headlines.slice(0, 1),
              }),
            });
            await one.page.waitForTimeout(1500);
            const strip = await ribbon(one.page);
            assert.equal(strip.headlines.length, 1);
            assert.equal(strip.reachable, 1);
            assert.ok(
              strip.runs[1].x - strip.runs[0].x >= strip.room - 1,
              "the ribbon is a full lap long",
            );
            await one.page.waitForTimeout(1000);
            const travelled =
              strip.runs[0].x - (await ribbon(one.page)).runs[0].x;
            assert.ok(
              travelled > 5 && travelled < 90,
              `and no faster for being short (${travelled.toFixed(1)}px in a second)`,
            );
            assert.equal(await overflow(one.page), 0);
            await one.context.close();

            for (const path of ["/", "/lab"]) {
              const none = await open(size, `${path}?lens=cut-paper`, {
                bend: (data) => ({ ...data, headlines: [] }),
              });
              assert.equal(await ribbon(none.page), null);
              assert.equal(
                await none.page
                  .locator("#lens-shell :is([data-ribbon], .cp-ribbon)")
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
            // With somewhere to go it goes there; with nowhere, to its
            // line in the Labbook.
            assert.equal(
              entry("fixture-study-replay").href,
              "https://codepen.io/beejsbj/pen/abXZWLQ",
            );
            assert.equal(
              entry("fixture-study-first-line").href,
              "/lab#u-fixture-study-first-line",
            );
            const hidden = entry("fixture-study-kept-back");
            assert.equal(hidden.strips, 3);
            assert.equal(hidden.controls, 0);
            assert.equal(
              hidden.text,
              `20 Aug 2026 ${copy.redacted.label} ${copy.redacted.works.code}`,
              "its date, what it is, its kind of work: no other word",
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
            for (const label of [labels.type, labels.era, labels.graduated])
              assert.ok(!shown.text.includes(label), `no "${label}" label`);
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

      /** Tab into the ribbon from whatever comes before it. */
      const tabIn = async (page) => {
        await page.evaluate(() => {
          const first = document.querySelector(
            "#lens-shell [data-part='ticker.headline'] a",
          );
          const all = [...document.querySelectorAll("a[href], button")].filter(
            (el) => el.tabIndex >= 0 && el.checkVisibility(),
          );
          all[all.indexOf(first) - 1].focus();
        });
        await page.keyboard.press("Tab");
      };
      /** What has the focus, and where it and its headline lie. */
      const focused = (page) =>
        page.evaluate(() => {
          const el = document.activeElement;
          const item = el?.closest("[data-part='ticker.headline']");
          const { left, right } = el.getBoundingClientRect();
          return {
            headline: item?.dataset.ref ?? null,
            inRibbon: !!el?.closest("#lens-shell [data-ribbon]"),
            left,
            right,
            from: item?.getBoundingClientRect().left ?? null,
          };
        });
      /** The link in focus is all in view when its words fit the strip;
       * when they are longer than the strip, its headline is at the
       * strip's beginning. No allowance for how a machine sets its type. */
      const inView = (now, strip) => {
        const where = `${now.headline}: ${now.left} to ${now.right}, its headline from ${now.from}, in ${strip.strip.left} to ${strip.strip.right}`;
        if (now.right - now.left <= strip.room)
          assert.ok(
            now.left >= strip.strip.left - 0.5 &&
              now.right <= strip.strip.right + 0.5,
            `words that fit are all in view (${where})`,
          );
        else
          assert.ok(
            now.from >= strip.strip.left - 0.5 &&
              now.from <= strip.strip.left + 16,
            `words longer than the strip are shown from the beginning (${where})`,
          );
      };

      for (const [name, size] of [
        ["desktop", SIZES.desktop],
        ["390px", phone(390)],
        ["450px", phone(450)],
        ["480px", phone(480)],
      ])
        await t.test(
          `${name}: the ribbon rests for the keyboard, shows the headline in focus, and lets go`,
          async () => {
            const { context, page } = await open(size, ROOM, { motion: true });
            await page.waitForTimeout(1500);
            const moving = await ribbon(page);
            const links = page.locator(
              "#lens-shell [data-part='ticker.headline'] a",
            );
            await tabIn(page);
            const seen = [];
            for (let i = 0; i < (await links.count()); i += 1) {
              if (i) await page.keyboard.press("Tab");
              await page.waitForTimeout(150);
              const now = await focused(page);
              const strip = await ribbon(page);
              await page.waitForTimeout(400);
              const still = await ribbon(page);
              seen.push(now.headline);
              assert.ok(now.inRibbon, "Tab reaches each headline");
              assert.deepEqual(
                still.runs.map((run) => run.x),
                strip.runs.map((run) => run.x),
                "the ribbon is at rest while a headline has focus",
              );
              inView(now, strip);
              assert.deepEqual(
                strip.box,
                moving.box,
                "the ribbon keeps its place and size",
              );
            }
            // In the order they are written, each once: the second run of
            // the ribbon is for the eye only.
            assert.deepEqual(
              seen,
              moving.headlines.map((headline) => headline.id),
            );
            await page.keyboard.press("Tab");
            assert.equal(
              (await focused(page)).inRibbon,
              false,
              "one more Tab leaves the ribbon",
            );
            await page.waitForTimeout(700);
            const resumed = await ribbon(page);
            assert.deepEqual(
              resumed.runs.map((run) => run.running),
              [true, true],
              "and the ribbon runs again",
            );
            assert.equal(
              resumed.scrolled,
              0,
              "from its start, not from wherever focus had scrolled it",
            );
            await context.close();
          },
        );

      await t.test(
        "a headline whose words fit the strip is shown whole in focus, though its day is not",
        async () => {
          // Measured here, so no machine's type decides it: the screen is
          // cut to halfway between the first headline's words and the whole
          // of it (its mark, its day, its words).
          const wide = await open(phone(700), ROOM, { motion: true });
          await tabIn(wide.page);
          await wide.page.waitForTimeout(200);
          const measured = await wide.page.evaluate(() => {
            const link = document.activeElement;
            const item = link.closest("[data-part='ticker.headline']");
            const strip = link.closest("[data-ribbon-strip]");
            return {
              words: link.getBoundingClientRect().width,
              whole: item.getBoundingClientRect().width,
              chrome: innerWidth - strip.clientWidth,
            };
          });
          await wide.context.close();
          assert.ok(measured.whole > measured.words + 20);
          const width = Math.round(
            (measured.words + measured.whole) / 2 + measured.chrome,
          );
          const { context, page } = await open(phone(width), ROOM, {
            motion: true,
          });
          await tabIn(page);
          await page.waitForTimeout(300);
          const now = await focused(page);
          const strip = await ribbon(page);
          assert.ok(now.inRibbon);
          assert.ok(
            now.right - now.left <= strip.room && strip.room < measured.whole,
            `the words fit the strip and the headline does not (${now.right - now.left} and ${measured.whole} in ${strip.room})`,
          );
          inView(now, strip);
          await context.close();
        },
      );
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
