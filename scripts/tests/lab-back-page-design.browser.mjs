/** Back Page's design pass of the Lab (issue #131): the lab book written
 * up the way an exercise book is. Its contents at the front turn to where
 * each place starts; on the Bench each experiment lies as what it holds
 * and the Shelf is a library card with a stamp beside each picture; one
 * that can be played plays where it lies, asking nothing of anyone before
 * the press and moving nothing when pressed; an experiment's page sticks
 * in every block where its words place it, its headings and steps
 * numbered in the margin; the Labbook is kept by month, each dated with a
 * calendar that links nowhere, and narrowed from its tally chart by link
 * and by keyboard, with the choice in the address.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on the harness's fixtures (src/prism/fixtures.ts: lab-kinds,
 * lab-blocks, labbook-notebook) and on /lab against /prism/content.json.
 * Every request to another site is noted and answered with a blank page.
 * Same server and Chromium as prism-parity.browser.mjs (or BASE=<origin>).
 * LAB_SHOTS=<dir> also saves pictures; LAB_ONLY=<regexp> runs only the
 * subtests it names. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import {
  labbookMonths,
  labbookSubjects,
  monthCalendar,
  monthLabel,
  subjectsOf,
} from "../../src/lib/labbook.ts";
import { labPlaces, labPrints } from "../../src/lib/rules.ts";

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
/** The pages lying open. */
const OPEN = "#lens-shell .bp-spread";
/** What only a pressed piece may ask for: a frame's page, a model's file,
 * or the viewer. */
const LIVE =
  /\/prism\/fixtures\/(demo\.svg|cube\.glb|cloud\.splat)|codepen\.io|example\.com|model-viewer|spark|three/;
const harness = (fixture, route) =>
  `/prism/harness?lens=back-page&fixture=${fixture}&route=${encodeURIComponent(route)}`;
const BLOCKS = "fixture-blocks";

/** What on the open pages runs past its page's edge, or is too tall for it. */
const spills = () => {
  const out = [];
  for (const page of document.querySelectorAll(
    "#lens-shell .bp-spread .bp-page",
  )) {
    const box = page.getBoundingClientRect();
    if (page.hasAttribute("data-oversize")) out.push("a page too full to turn");
    for (const el of page.querySelectorAll(
      ".bp-flow > *, .bp-shelfcard li, .bp-gallery > *, .bp-compare__pair > *, .bp-live, .bp-cal",
    )) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.left < box.left - 1 || r.right > box.right + 1))
        out.push(`${el.className || el.tagName}: ${r.left} to ${r.right}`);
    }
  }
  return out;
};

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Back Page's lab book is written up as an exercise book",
  { skip, timeout: 20 * 60_000 },
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
    const browser = await browserType.launch({
      executablePath: executable,
      // WebGL in a headless shell, for the model viewer.
      args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
    });
    const content = await (await fetch(`${base}/prism/content.json`)).json();
    const words = content.pages.lab;
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });

    /** The book open at `path`, at one size. Every request is noted; one
     * to another site is answered with a blank page. */
    const open = async (size, path, { motion = false } = {}) => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: motion ? "no-preference" : "reduce",
      });
      const asked = [];
      await context.route("**/*", (route) => {
        const url = route.request().url();
        asked.push(url);
        return url.startsWith(base)
          ? route.continue()
          : route.fulfill({ contentType: "text/html", body: "" });
      });
      const errors = [];
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !/Failed to load resource/.test(message.text())
        )
          errors.push(message.text());
      });
      await page.goto(`${base}${path}`, { waitUntil: "load" });
      await page.waitForSelector("html[data-shell-ready]", { timeout: 20000 });
      if (path.startsWith("/prism/harness"))
        await page.waitForFunction(() => window.prismHarness?.ready);
      await page.waitForSelector(`${OPEN} .bp-page`);
      await page.waitForTimeout(500);
      const live = () => asked.filter((url) => LIVE.test(url));
      return { context, page, asked, live, errors };
    };
    const next = (page) => page.locator("#lens-shell [data-prism-turn='next']");
    const shot = async (page, name) => {
      if (SHOTS)
        await page.screenshot({ path: join(SHOTS, `back-page-${name}.png`) });
    };
    /** Read every view of the open chapter from where it lies, turning its
     * pages: what `read` says of each and, given several, what each says. */
    const leaf = async (page, read) => {
      const views = [];
      for (let i = 0; i < 60; i += 1) {
        if (Array.isArray(read)) {
          const view = [];
          for (const one of read) view.push(await page.evaluate(one));
          views.push(view);
        } else views.push(await page.evaluate(read));
        if (!(await next(page).count())) break;
        await next(page).click();
        await page.waitForTimeout(450);
      }
      return views;
    };
    /** Turn on until `selector` is on the open pages. */
    const turnTo = async (page, selector) => {
      for (let i = 0; i < 60; i += 1) {
        if (await page.locator(`${OPEN} ${selector}`).count()) return;
        assert.ok(await next(page).count(), `${selector} is in the book`);
        await next(page).click();
        await page.waitForTimeout(450);
      }
    };
    const fixtureContent = (page) =>
      page.evaluate(() => window.prismHarness.content);
    /** The number written at the head of the page holding `selector`. */
    const pageNumber = (page, selector) =>
      page.evaluate(
        ([open, selector]) =>
          Number(
            document
              .querySelector(`${open} ${selector}`)
              ?.closest(".bp-page")
              ?.querySelector(".bp-page__head b")?.textContent,
          ),
        [OPEN, selector],
      );

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: the contents at the front turn to where each place and month starts`,
          async () => {
            const path = harness("labbook-notebook", "/lab");
            const first = await open(size, path);
            const fixture = await fixtureContent(first.page);
            const rows = await first.page.evaluate(
              (open) =>
                [
                  ...document.querySelectorAll(`${open} .bp-contents li`),
                ].map((li) => ({
                  id: li.querySelector("a").getAttribute("href").slice(1),
                  label: li.querySelector("a").textContent.trim(),
                  page: li.querySelector(".bp-contents__page").textContent,
                  sub: li.hasAttribute("data-sub"),
                })),
              OPEN,
            );
            await shot(first.page, `contents-${size}`);
            await first.context.close();
            const months = labbookMonths(fixture.labbook).slice(0, 6);
            assert.deepEqual(
              rows.map(({ label, sub }) => ({ label, sub })),
              [
                ...labPlaces(fixture.lab).map(({ place }) => ({
                  label: words.places[place].title,
                  sub: false,
                })),
                { label: words.labbook.title, sub: false },
                ...months.map(({ month }) => ({
                  label: monthLabel(month),
                  sub: true,
                })),
              ],
              "each place, the Labbook and its latest months, in order",
            );
            // Each line, followed, turns to its place: the page it names,
            // the place given the focus, and the address saying where.
            for (const row of [rows[1], rows.at(-1)]) {
              const { context, page, errors } = await open(size, path);
              await page.click(`${OPEN} .bp-contents a[href='#${row.id}']`);
              await page.waitForSelector(`${OPEN} [id='${row.id}']`, {
                timeout: 15000,
              });
              await page.waitForTimeout(400);
              assert.equal(
                `p. ${await pageNumber(page, `[id='${row.id}']`)}`,
                row.page,
                `${row.label} starts on the page the contents give`,
              );
              assert.equal(
                await page.evaluate(() => document.activeElement?.id),
                row.id,
              );
              assert.equal(new URL(page.url()).hash, `#${row.id}`);
              assert.deepEqual(errors, []);
              await context.close();
            }
          },
        );

        await t.test(
          `${size}: on the Bench each experiment lies as what it holds; the Shelf is a card with a stamp for each picture`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("lab-kinds", "/lab"),
            );
            const { lab } = await fixtureContent(page);
            const read = () => {
              const bench = [
                ...document.querySelectorAll(
                  "#lens-shell .bp-spread .bp-labitem",
                ),
              ].map((item) => ({
                slug: item.querySelector("[data-part='lab.title']").dataset
                  .ref,
                holds: item.dataset.holds,
                prints: item.querySelectorAll(".bp-snaps-fan img").length,
                doodle: !!item.querySelector(":scope > svg.bp-doodle"),
                stage: !!item.querySelector("[data-block-stage]"),
                // pictures here are for the eye: the name beside says it
                named: [...item.querySelectorAll("img")].filter(
                  (img) => img.alt && !img.closest("[aria-hidden='true']"),
                ).length,
              }));
              const shelf = [
                ...document.querySelectorAll(
                  "#lens-shell .bp-spread .bp-shelfcard li",
                ),
              ].map((li) => ({
                slug: li.querySelector("[data-part='lab.title']").dataset.ref,
                holds: li.dataset.holds,
                stamp: !!li.querySelector(".bp-stamp img"),
                stage: !!li.querySelector(".bp-stamp[data-block-stage]"),
                named: [...li.querySelectorAll("img")].filter((img) => img.alt)
                  .length,
              }));
              return { bench, shelf };
            };
            const views = await leaf(page, [read, spills]);
            const bench = views.flatMap(([view]) => view.bench);
            const shelf = views.flatMap(([view]) => view.shelf);
            assert.deepEqual(views.flatMap(([, spilt]) => spilt), []);
            const groups = Object.fromEntries(
              labPlaces(lab).map(({ place, entries }) => [place, entries]),
            );
            assert.deepEqual(
              bench,
              groups.bench.map((entry) => {
                const prints = labPrints(entry).length;
                const holds = entry.preview
                  ? "play"
                  : prints > 1
                    ? "prints"
                    : prints
                      ? "print"
                      : "words";
                return {
                  slug: entry.slug,
                  holds,
                  prints: holds === "print" || holds === "prints" ? prints : 0,
                  doodle: holds === "words",
                  stage: holds === "play",
                  named: 0,
                };
              }),
              "each lies as what it holds",
            );
            assert.deepEqual(
              shelf,
              groups.shelf.map((entry) => ({
                slug: entry.slug,
                holds: entry.preview ? "play" : entry.cover ? "stamp" : "words",
                stamp: !!entry.cover,
                stage: !!entry.preview,
                named: 0,
              })),
              "each line has a stamp of its picture, if it has one",
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: an experiment plays where it lies, asking nothing before the press and moving nothing when pressed`,
          async () => {
            const { context, page, live } = await open(
              size,
              harness("lab-kinds", "/lab"),
            );
            const { lab } = await fixtureContent(page);
            const frames = await leaf(
              page,
              () => document.querySelectorAll("#lens-shell iframe").length,
            );
            assert.deepEqual(frames.filter(Boolean), [], "no frame anywhere");
            assert.deepEqual(live(), [], "and nothing asked of another site");
            await context.close();

            // On the Bench: pressed, one frame in the picture's own room.
            const pen = lab.find((entry) => entry.slug === "fixture-kinds-pen");
            const bench = await open(size, harness("lab-kinds", "/lab"));
            const button = bench.page.locator(
              `${OPEN} [data-part='lab.preview'][data-ref='${pen.slug}']`,
            );
            await turnTo(bench.page, `[data-part='lab.preview'][data-ref='${pen.slug}']`);
            assert.equal(
              (await button.innerText()).trim(),
              words.preview.load.pen,
            );
            const item = bench.page.locator(`${OPEN} .bp-labitem`, {
              has: bench.page.locator(`[data-ref='${pen.slug}']`),
            });
            const stage = item.locator("[data-block-stage]");
            const before = {
              item: await item.boundingBox(),
              stage: await stage.boundingBox(),
              // the note's own height, whatever its tilt does to its box
              button: await button.evaluate((el) => el.offsetHeight),
            };
            await shot(bench.page, `play-before-${size}`);
            await button.click();
            const frame = stage.locator("iframe");
            await frame.waitFor();
            assert.equal(await frame.getAttribute("src"), pen.preview.frame);
            assert.equal(await frame.getAttribute("title"), pen.title);
            assert.equal(await button.getAttribute("aria-pressed"), "true");
            assert.equal((await button.innerText()).trim(), words.preview.close);
            await bench.page.waitForTimeout(300);
            const after = {
              item: await item.boundingBox(),
              stage: await stage.boundingBox(),
              button: await button.evaluate((el) => el.offsetHeight),
            };
            for (const key of ["item", "stage"])
              assert.deepEqual(
                [after[key].width, after[key].height].map(Math.round),
                [before[key].width, before[key].height].map(Math.round),
                `the ${key} keeps its size`,
              );
            assert.equal(
              after.button,
              before.button,
              "the note's words change, not its height",
            );
            assert.deepEqual(bench.live(), [pen.preview.frame]);
            await shot(bench.page, `play-after-${size}`);
            // Escape from it puts it away, and the focus goes back to its note.
            await button.focus();
            await bench.page.keyboard.press("Escape");
            await bench.page.waitForFunction(
              (open) => !document.querySelector(`${open} iframe`),
              OPEN,
            );
            assert.equal(await button.getAttribute("aria-pressed"), "false");
            assert.equal(
              await bench.page.evaluate(
                () => document.activeElement?.dataset.ref,
              ),
              pen.slug,
            );
            // The keyboard starts it the same way.
            await bench.page.keyboard.press("Enter");
            await stage.locator("iframe").waitFor();
            assert.deepEqual(bench.errors, []);
            await bench.context.close();

            // On the Shelf: the stamp is the piece, played in its own
            // square; and only one plays at a time.
            const quiet = lab.find(
              (entry) => entry.slug === "fixture-kinds-shelf-pen",
            );
            const shelf = await open(size, harness("lab-kinds", "/lab"));
            const press = shelf.page.locator(
              `${OPEN} [data-part='lab.preview'][data-ref='${quiet.slug}']`,
            );
            await turnTo(shelf.page, `[data-part='lab.preview'][data-ref='${quiet.slug}']`);
            const mine = shelf.page.locator(`[data-ref='${quiet.slug}']`);
            const row = shelf.page.locator(`${OPEN} .bp-shelfcard li`, {
              has: mine,
            });
            const card = shelf.page.locator(`${OPEN} .bp-shelfcard`, {
              has: mine,
            });
            const was = [await row.boundingBox(), await card.boundingBox()];
            await press.click();
            const playing = row.locator(".bp-stamp iframe");
            await playing.waitFor();
            assert.equal(await playing.getAttribute("src"), quiet.preview.frame);
            await shelf.page.waitForTimeout(300);
            const now = [await row.boundingBox(), await card.boundingBox()];
            assert.deepEqual(
              now.map((box) => [box.width, box.height].map(Math.round)),
              was.map((box) => [box.width, box.height].map(Math.round)),
              "the line and its card keep their size",
            );
            await shot(shelf.page, `stamp-play-${size}`);
            assert.deepEqual(shelf.live(), [quiet.preview.frame]);
            assert.deepEqual(shelf.errors, []);
            await shelf.context.close();
          },
        );

        await t.test(
          `${size}: an experiment's page sticks in every block where its words place it`,
          async () => {
            const path = harness("lab-blocks", `/lab/${BLOCKS}`);
            const { context, page, live, errors } = await open(size, path);
            const fixture = (await fixtureContent(page)).lab.find(
              (entry) => entry.slug === BLOCKS,
            );
            const read = () => ({
              order: [
                ...document.querySelectorAll(
                  "#lens-shell .bp-spread :is([data-part^='block.'], h2:has(> .bp-num), .bp-steps > li)",
                ),
              ].map((el) =>
                el.dataset.part?.startsWith("block.")
                  ? `${el.dataset.part}:${el.dataset.ref.split("/")[1]}`
                  : el.tagName === "H2"
                    ? `h2:${el.querySelector(".bp-num").textContent}`
                    : `step:${el.querySelector(".bp-num").textContent}`,
              ),
              live: document.querySelectorAll(
                "#lens-shell :is(iframe, canvas)",
              ).length,
            });
            const views = (await leaf(page, [read, spills])).map(
              ([view, spilt]) => ({ ...view, spilt }),
            );
            // every block once, in the page's order (one of a kind this
            // book has not heard of passed over), every heading and step
            // numbered in turn
            const order = [...new Set(views.flatMap((view) => view.order))];
            const known = fixture.blocks.filter(
              (block) => block.type !== "text" && block.type !== "hologram",
            );
            assert.deepEqual(
              order.filter((key) => key.startsWith("block.")),
              known.map((block) => `block.${block.type}:${block.name}`),
            );
            const headings = order.filter((key) => key.startsWith("h2:"));
            assert.deepEqual(
              headings,
              headings.map((_, i) => `h2:${i + 1}`),
            );
            const steps = known.find((block) => block.type === "steps");
            assert.deepEqual(
              order.filter((key) => key.startsWith("step:")),
              steps.items.map((_, i) => `step:${i + 1}`),
            );
            assert.deepEqual(views.flatMap((view) => view.spilt), []);
            assert.deepEqual(
              views.map((view) => view.live),
              views.map(() => 0),
              "nothing live before a press",
            );
            assert.deepEqual(live(), [], "and nothing asked for");
            assert.deepEqual(errors, []);
            await context.close();

            // The Pen: a frame in its own room, on a press, and put away.
            const pen = await open(size, path);
            const block = (name) =>
              pen.page.locator(`${OPEN} [data-ref='${BLOCKS}/${name}']`);
            await turnTo(pen.page, `[data-ref='${BLOCKS}/the-pen']`);
            await shot(pen.page, `blocks-pen-${size}`);
            const toggle = block("the-pen").locator("[data-block-toggle]");
            const room = block("the-pen").locator("[data-block-stage]");
            const size0 = await room.boundingBox();
            await toggle.click();
            await room.locator("iframe").waitFor();
            const embed = known.find((b) => b.name === "the-pen");
            assert.equal(
              await room.locator("iframe").getAttribute("src"),
              embed.frame,
            );
            const size1 = await room.boundingBox();
            assert.deepEqual(
              [size1.width, size1.height].map(Math.round),
              [size0.width, size0.height].map(Math.round),
            );
            assert.deepEqual(pen.live(), [embed.frame]);
            await toggle.click();
            assert.equal(await room.locator("iframe").count(), 0);
            assert.deepEqual(pen.errors, []);
            await pen.context.close();

            // The model: its viewer fetched on a press, and gone again.
            const model = await open(size, path);
            const cube = model.page.locator(`${OPEN} [data-ref='${BLOCKS}/cube']`);
            await turnTo(model.page, `[data-ref='${BLOCKS}/cube']`);
            await cube.locator("[data-block-toggle]").click();
            await cube.locator("canvas").waitFor({ timeout: 20000 });
            assert.ok(model.live().some((url) => /cube\.glb|model-viewer/.test(url)));
            await cube.locator("[data-block-toggle]").click();
            assert.equal(await cube.locator("canvas").count(), 0);
            assert.deepEqual(model.errors, []);
            await model.context.close();
          },
        );

        await t.test(
          `${size}: a film on a loop plays by itself only for a visitor who has not asked for less motion`,
          async () => {
            const path = harness("lab-blocks", `/lab/${BLOCKS}`);
            const film = `[data-ref='${BLOCKS}/the-loop'] video`;
            const calm = await open(size, path);
            await turnTo(calm.page, film);
            await calm.page.waitForTimeout(800);
            assert.equal(
              await calm.page.locator(`${OPEN} ${film}`).evaluate((v) => v.paused),
              true,
              "still, under reduced motion",
            );
            await calm.context.close();
            const moving = await open(size, path, { motion: true });
            await turnTo(moving.page, film);
            await moving.page.waitForFunction(
              (selector) => !document.querySelector(selector)?.paused,
              `${OPEN} ${film}`,
              { timeout: 5000 },
            );
            assert.equal(
              await moving.page
                .locator(`${OPEN} ${film}`)
                .evaluate((v) => v.muted && v.loop),
              true,
            );
            await moving.context.close();
          },
        );

        await t.test(
          `${size}: the Labbook is kept by month, each dated with a calendar that links nowhere`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("labbook-notebook", "/lab"),
            );
            const fixture = await fixtureContent(page);
            await turnTo(page, "#labbook");
            const views = await leaf(page, () =>
              [
                ...document.querySelectorAll("#lens-shell .bp-spread .bp-month"),
              ].map((head) => {
                const cal = head.querySelector(".bp-cal");
                const list = head.nextElementSibling;
                return {
                  month: head.querySelector("[data-part='labbook.month']")
                    .dataset.ref,
                  name: head.querySelector("h3").textContent.trim(),
                  hidden: cal.getAttribute("aria-hidden"),
                  stops: cal.querySelectorAll("a, button, [tabindex]").length,
                  ringed: [...cal.querySelectorAll("[data-on]")].map((day) =>
                    Number(day.textContent),
                  ),
                  days: cal.children.length,
                  first: list?.querySelector("li[id^='u-']")?.id.slice(2),
                };
              }),
            );
            const seen = views.flat();
            assert.deepEqual(
              seen,
              labbookMonths(fixture.labbook).map(({ month, updates }) => {
                const { days } = monthCalendar(month, updates);
                return {
                  month,
                  name: monthLabel(month),
                  hidden: "true",
                  stops: 0,
                  ringed: days
                    .filter((day) => day.updates.length)
                    .map((day) => day.day),
                  days: days.length,
                  first: updates[0].id,
                };
              }),
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: the tally chart narrows the Labbook, by link and by keyboard, and the address keeps it`,
          async () => {
            const shown = { lab: content.lab, projects: content.projects };
            const subjects = labbookSubjects(content.labbook, shown);
            assert.ok(subjects.length >= 2, "/lab has things to narrow to");
            const entries = () =>
              [
                ...document.querySelectorAll(
                  "#lens-shell .bp-spread :is([data-part='update.item'], [data-part='update.redacted'])",
                ),
              ].map((li) => li.dataset.ref);
            const about = (subject) =>
              content.labbook
                .filter((update) =>
                  subjectsOf(update, shown).some(
                    (s) => s.kind === subject.kind && s.slug === subject.slug,
                  ),
                )
                .map((update) => update.id);
            const { context, page, errors } = await open(size, "/lab?lens=back-page");
            const [one, two] = subjects;
            const subject = (s) =>
              `[data-part='labbook.subject'][data-ref='${s.kind}:${s.slug}']`;
            const link = (s) => `${OPEN} ${subject(s)}`;
            await turnTo(page, subject(one));
            // Each row: its name, a stroke for each entry, and what it is.
            const rows = await page.evaluate(
              (open) =>
                [...document.querySelectorAll(`${open} .bp-tallies li`)].map(
                  (li) => ({
                    ref: li.querySelector("a").dataset.ref,
                    strokes: li.querySelectorAll(".bp-tally path").length,
                  }),
                ),
              OPEN,
            );
            for (const row of rows) {
              const known = subjects.find(
                (s) => `${s.kind}:${s.slug}` === row.ref,
              );
              assert.equal(row.strokes, known.count, row.ref);
            }
            // By keyboard: the address names it, and only its entries are kept.
            await page.locator(link(one)).focus();
            await page.keyboard.press("Enter");
            await page.waitForFunction(
              (kind) => new URL(location.href).searchParams.has(kind),
              one.kind,
            );
            await page.waitForSelector(`${OPEN} .bp-narrowed`, {
              timeout: 15000,
            });
            assert.equal(
              new URL(page.url()).searchParams.get(one.kind),
              one.slug,
            );
            assert.equal(
              await page.locator(link(one)).getAttribute("aria-current"),
              "true",
            );
            await shot(page, `narrowed-${size}`);
            const kept = [...new Set((await leaf(page, entries)).flat())];
            assert.deepEqual(kept, about(one));
            // By link, to another; then back to all of it.
            const again = await open(size, `/lab?lens=back-page&${one.kind}=${one.slug}#labbook`);
            await turnTo(again.page, subject(two));
            await again.page.click(link(two));
            await again.page.waitForFunction(
              ([kind, slug]) =>
                new URL(location.href).searchParams.get(kind) === slug,
              [two.kind, two.slug],
            );
            await again.page.waitForSelector(
              `${link(two)}[aria-current='true']`,
              { timeout: 15000 },
            );
            await again.page.click(`${OPEN} .bp-narrowed a`);
            await again.page.waitForFunction(
              () => !document.querySelector("#lens-shell .bp-narrowed"),
            );
            const all = [...new Set((await leaf(again.page, entries)).flat())];
            assert.deepEqual(all, content.labbook.map((update) => update.id));
            // Back keeps the choice.
            await again.page.goBack();
            await again.page.waitForSelector(`${OPEN} .bp-narrowed`, {
              timeout: 15000,
            });
            assert.equal(
              await again.page.locator(link(two)).getAttribute("aria-current"),
              "true",
            );
            assert.deepEqual([...errors, ...again.errors], []);
            await context.close();
            await again.context.close();
          },
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
