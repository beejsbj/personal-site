/** Cut Paper's Lab (issue #97): the armed and the muted pads of the rack
 * (the Bench and the Shelf), the Labbook with its artifacts and its redacted
 * updates, the tape of headlines on the home page and in the Lab, and an
 * experiment's own record and graduation.
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

/** The tape of headlines as it stands this instant. */
const tape = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const root = document.querySelector("#lens-shell [data-tape]");
    if (!root) return null;
    const strip = root.querySelector("[data-tape-strip]");
    const box = (el) => {
      const { left, right, top, bottom } = el.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const runs = [...root.querySelectorAll("[data-tape-run]")];
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
  "Cut Paper shows the Bench, the Shelf, the Labbook and the tape of headlines",
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
    /** A picture of the screen with `selector` near the top of it. */
    const shot = async (page, selector, name, block = "start") => {
      if (!SHOTS) return;
      if (selector)
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
            await shot(page, "#lens-shell [data-log]", `cut-paper-labbook-${size}`);
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
            await shot(page, null, `cut-paper-landed-${size}`);
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
            await page.locator("#lens-shell [data-log]").scrollIntoViewIfNeeded();
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
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
