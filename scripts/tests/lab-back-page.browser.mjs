/** Back Page's Lab (issue #98): what the parity test cannot see. The lab
 * book has a Bench and a Shelf with the featured experiment leading; the
 * Labbook is every update newest first, each where its links land, with
 * its artifact taped in; a redacted update is scribbles with the few words
 * it shows among them, and none of the words it hides; a Pen or a demo asks nothing of another site until asked; the
 * first page's diary is where the recent updates are, with no strip of
 * headlines there or in the lab book; and an experiment's page lists its
 * updates and the project it became.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Real routes are read against /prism/content.json; the states src/content
 * does not hold come from the harness's fixtures (src/prism/fixtures.ts).
 * Same server and Chromium as prism-parity.browser.mjs (or BASE=<origin>).
 * LAB_SHOTS=<dir> also saves pictures of each part at each size;
 * LAB_ONLY=<regexp> runs only the subtests it names. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import {
  experimentUpdates,
  labbookHref,
  penUser,
} from "../../src/lib/labbook.ts";
import { labPlaces } from "../../src/lib/rules.ts";
import { REDACTION_MARKER } from "../../src/prism/labbook-fixture.ts";
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
/** The pages lying open. */
const OPEN = "#lens-shell .bp-spread";
const real = (path) => {
  const [route, hash = ""] = path.split("#");
  return `${route}?lens=back-page${hash && `#${hash}`}`;
};
const harness = (fixture, route) =>
  `/prism/harness?lens=back-page&fixture=${fixture}&route=${encodeURIComponent(route)}`;

/** The experiments and place headings on the open pages, in order. */
const places = () =>
  [
    ...document.querySelectorAll(
      "#lens-shell .bp-spread :is([data-lab-place], [data-part='lab.title'])",
    ),
  ].map((el) => {
    if (el.dataset.labPlace)
      return {
        place: el.dataset.labPlace,
        heading: el.querySelector("h2")?.textContent.trim(),
      };
    const link = el.querySelector("a");
    return {
      slug: el.dataset.ref,
      href: link.getAttribute("href"),
      newTab: link.target === "_blank",
      arrow: !!el.querySelector(".bp-out"),
      featured: !!el.closest("[data-featured]"),
    };
  });

/** The updates on the open pages, in order. */
const updates = () => {
  // an element's words as written, whatever CSS does to their case
  const text = (el) => {
    if (!el) return "";
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const said = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      if (node.textContent.trim()) said.push(node.textContent.trim());
    return said.join(" ").replace(/\s+/g, " ");
  };
  return [
    ...document.querySelectorAll(
      "#lens-shell .bp-spread :is([data-part='update.item'], [data-part='update.redacted'])",
    ),
  ].map((item) => {
    const title = item.querySelector(".bp-diary__title");
    const media = item.querySelector("img, video, audio");
    return {
      id: item.id ? item.id.slice(2) : null,
      part: item.dataset.part,
      ref: item.dataset.ref,
      here: item.hasAttribute("data-here"),
      text: text(item),
      title: text(title),
      href: title?.querySelector("a")?.getAttribute("href") ?? null,
      summary: text(item.querySelector(".bp-diary__summary")),
      origin: text(item.querySelector(".bp-diary__src")),
      date: item.querySelector("time")?.getAttribute("datetime") ?? null,
      about: [...item.querySelectorAll(".bp-log__about a")].map((a) => ({
        href: a.getAttribute("href"),
        text: a.firstChild.textContent,
      })),
      artifact: item.querySelector("[data-artifact]")?.dataset.artifact ?? null,
      media: media && {
        tag: media.tagName.toLowerCase(),
        src: media.getAttribute("src"),
        name: media.getAttribute("alt") ?? media.getAttribute("aria-label"),
        controls: media.controls ?? null,
        poster: media.getAttribute("poster"),
      },
      bars: [...item.querySelectorAll("[data-redaction-bar]")].map((bar) => ({
        width: bar.getBoundingClientRect().width,
        inked: bar.querySelectorAll("svg path").length,
      })),
      controls: item.querySelectorAll(
        "a, button, iframe, img, video, audio, [data-artifact]",
      ).length,
      links: item.querySelectorAll("a").length,
    };
  });
};

/** What on the open pages runs past its page's edge, or is too tall for it. */
const spills = () => {
  const out = [];
  for (const page of document.querySelectorAll(
    "#lens-shell .bp-spread .bp-page",
  )) {
    const box = page.getBoundingClientRect();
    if (page.hasAttribute("data-oversize")) out.push("a page too full to turn");
    for (const el of page.querySelectorAll(
      ".bp-flow > *, .bp-shelfcard li, [data-artifact], [data-redaction-bar]",
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
  "Back Page keeps the Lab in its lab book",
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
    const words = content.pages.lab;
    const months = content.lenses["back-page"].months;
    /** A day as the book writes it in the margin: "20 Aug". */
    const day = (date) =>
      `${Number(date.slice(8))} ${months[Number(date.slice(5, 7)) - 1]}`;
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });

    /** The book open at `path`, at one size. Nothing leaves the test:
     * whatever a page asks of another origin is written down and answered
     * with a blank. `rewrite` changes /prism/content.json on its way in. */
    const open = async (size, path, { motion = false, rewrite } = {}) => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: motion ? "no-preference" : "reduce",
      });
      const asked = [];
      const errors = [];
      await context.route(
        (url) => url.origin !== base,
        (route) => {
          asked.push(route.request().url());
          return route.fulfill({ contentType: "text/html", body: "" });
        },
      );
      if (rewrite)
        await context.route(
          (url) => url.pathname === "/prism/content.json",
          async (route) => {
            const response = await route.fetch();
            return route.fulfill({
              response,
              json: rewrite(await response.json()),
            });
          },
        );
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}${path}`, { waitUntil: "load" });
      await page.waitForSelector("html[data-shell-ready]", { timeout: 20000 });
      if (path.startsWith("/prism/harness"))
        await page.waitForFunction(() => window.prismHarness?.ready);
      await page.waitForSelector(`${OPEN} .bp-page`);
      await page.waitForTimeout(500);
      return { context, page, asked, errors };
    };
    const next = (page) => page.locator("#lens-shell [data-prism-turn='next']");
    const shot = async (page, name) => {
      if (SHOTS)
        await page.screenshot({ path: join(SHOTS, `back-page-${name}.png`) });
    };
    /** Read every view of the open chapter, turning its pages: what
     * `read` says of each or, given several, what each says. `picture`
     * names a picture of each view. */
    const leaf = async (page, read, picture) => {
      const views = [];
      for (let i = 0; i < 60; i += 1) {
        if (picture) await shot(page, `${picture}-${i + 1}`);
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
    /** The harness's own content: the real one, bent by its fixture. */
    const fixtureContent = (page) =>
      page.evaluate(() => window.prismHarness.content);

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: the lab book has a Bench and a Shelf, the featured experiment leading`,
          async () => {
            const { context, page, errors } = await open(size, real("/lab"));
            const views = await leaf(page, places, `lab-${size}`);
            const seen = views.flat();
            const groups = labPlaces(content.lab);
            assert.deepEqual(
              seen.map((item) => item.place ?? item.slug),
              groups.flatMap(({ place, entries }) => [
                place,
                ...entries.map((entry) => entry.slug),
              ]),
              "the Bench, then the Shelf, each in the shared order",
            );
            for (const { place } of groups)
              assert.equal(
                seen.find((item) => item.place === place).heading,
                words.places[place].title,
              );
            const featured = content.lab.filter((entry) => entry.featured);
            assert.deepEqual(
              seen.filter((item) => item.featured).map((item) => item.slug),
              featured.map((entry) => entry.slug),
              "only the featured experiment is drawn large",
            );
            if (featured.length)
              assert.equal(
                seen.find((item) => item.slug).slug,
                featured[0].slug,
                "and it leads the Bench",
              );
            for (const entry of content.lab) {
              const shown = seen.find((item) => item.slug === entry.slug);
              assert.equal(shown.href, entry.detail, entry.slug);
              // An experiment that lives elsewhere says so; one with a
              // page in this book does not.
              assert.equal(shown.arrow, !entry.hasPage, entry.slug);
              assert.equal(shown.newTab, !entry.hasPage, entry.slug);
            }
            assert.deepEqual(errors, []);
            await context.close();

            // What an experiment used to have to say is no longer asked for.
            const bare = await open(size, harness("lab-bare-entry", "/lab"));
            const all = await leaf(bare.page, () => ({
              meta: document.querySelectorAll(
                "#lens-shell .bp-spread [data-part='lab.meta']",
              ).length,
              stray: [
                ...document.querySelectorAll("#lens-shell .bp-spread p"),
              ].filter((p) => /^[\s·]*$/.test(p.textContent)).length,
            }));
            assert.deepEqual(
              all.filter((view) => view.meta || view.stray),
              [],
              "no line for a type or an era, and no empty one",
            );
            await bare.context.close();
          },
        );

        await t.test(
          `${size}: the Labbook lists every update newest first, each where its links land`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("labbook", "/lab"),
            );
            const fixture = await fixtureContent(page);
            const order = () => ({
              heading: [
                ...document.querySelectorAll(
                  "#lens-shell .bp-spread .bp-sechead h2",
                ),
              ].map((h2) => h2.textContent.trim()),
              shelf: !!document.querySelector(
                "#lens-shell .bp-spread .bp-shelfcard",
              ),
              entries: [
                ...document.querySelectorAll(
                  "#lens-shell .bp-spread li[id^='u-']",
                ),
              ].map((li) => li.id.slice(2)),
            });
            const read = await leaf(page, [order, updates, spills]);
            const views = read.map(([view]) => view);
            const entries = read.flatMap(([, list]) => list);
            const spilt = read.flatMap(([, , list]) => list);
            const head = views.findIndex((view) =>
              view.heading.includes(words.labbook.title),
            );
            assert.ok(head >= 0, "the Labbook has its heading");
            assert.ok(
              views.findLastIndex((view) => view.shelf) <= head,
              "it comes after the Shelf",
            );
            assert.deepEqual(
              views.flatMap((view) => view.entries),
              fixture.labbook.map((update) => update.id),
            );

            const dates = entries.map((entry) => entry.date);
            assert.deepEqual(dates, [...dates].sort().reverse());
            for (const update of fixture.labbook) {
              const entry = entries.find((item) => item.id === update.id);
              assert.equal(entry.ref, update.id);
              assert.equal(entry.date, update.date);
              if (update.visibility !== "open") continue;
              assert.equal(entry.part, "update.item");
              assert.ok(entry.title.startsWith(update.title), update.id);
              assert.equal(entry.summary, update.summary);
              // An update with nowhere to go is a title, not a link to itself.
              assert.equal(entry.href, update.href ?? null, update.id);
              assert.equal(
                entry.artifact,
                update.artifact?.kind ?? null,
                update.id,
              );
            }
            const about = (id) =>
              entries.find((entry) => entry.id === id).about;
            const [experiment] = fixture.lab;
            const [project] = fixture.projects;
            assert.deepEqual(about("fixture-first-line"), [
              { href: experiment.detail, text: experiment.title },
            ]);
            assert.deepEqual(
              about("fixture-graduated").map((link) => link.href),
              [fixture.lab[1].detail, project.href],
            );
            assert.deepEqual(about("fixture-film"), []);
            assert.deepEqual(spilt, [], "nothing runs past its page");
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: a redacted update is scribbles, each said once, its kind of work and its day, and none of the words it hides`,
          async () => {
            const { context, page } = await open(
              size,
              harness("labbook", "/lab"),
            );
            const fixture = await fixtureContent(page);
            const kept = fixture.labbook.find(
              (update) => update.id === "fixture-kept-back",
            );
            const { parts } = kept.shape;
            assert.ok(parts.every((part) => typeof part === "number"));
            await turnTo(page, `#u-${kept.id}`);
            await shot(page, `redacted-${size}`);
            const entry = (await page.evaluate(updates)).find(
              (item) => item.id === kept.id,
            );
            assert.equal(entry.part, "update.redacted");
            const { redacted } = words.labbook;
            assert.equal(
              entry.text,
              [
                day(kept.date),
                redacted.label,
                ...parts.map(() => redacted.bar),
                redacted.works[kept.shape.work],
              ].join(" "),
              "its day, that it is redacted, a word for each scribble and the kind of work: no more",
            );
            assert.equal(entry.controls, 0, "no link, picture or frame");
            assert.equal(entry.bars.length, parts.length);
            assert.ok(entry.bars.every((bar) => bar.inked));
            const item = page.locator(`${OPEN} #u-${kept.id}`);
            checkRedactedLine(
              assert,
              await item.evaluate(redactedLine),
              parts,
              {
                bar: redacted.bar,
                within: await item.evaluate((el) => {
                  const { left, right } = el
                    .closest(".bp-page")
                    .getBoundingClientRect();
                  return { left, right };
                }),
              },
            );
            await context.close();

            // The fixture's redacted updates arrive with words they must
            // not have. None reaches any page they could be on.
            for (const path of [
              harness("labbook", "/lab"),
              harness("labbook", "/"),
            ]) {
              const book = await open(size, path);
              const html = await leaf(
                book.page,
                () => document.documentElement.outerHTML,
              );
              assert.ok(html.join("").includes("data-part"), path);
              assert.ok(
                !html.join("").includes(REDACTION_MARKER),
                `${path} shows none of the hidden words`,
              );
              await book.context.close();
            }
          },
        );

        await t.test(
          `${size}: a redacted update may show a few of its words, in their places among its scribbles`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("labbook", "/lab"),
            );
            const fixture = await fixtureContent(page);
            const half = fixture.labbook.find(
              (update) => update.id === "fixture-half-said",
            );
            const { parts } = half.shape;
            assert.deepEqual(parts, ["Rewired", 4, 2, "the", 6]);
            await turnTo(page, `#u-${half.id}`);
            await shot(page, `redacted-mixed-${size}`);
            const entry = (await page.evaluate(updates)).find(
              (item) => item.id === half.id,
            );
            assert.equal(entry.part, "update.redacted");
            const { redacted } = words.labbook;
            assert.equal(
              entry.text,
              [
                day(half.date),
                redacted.label,
                `Rewired ${redacted.bar} ${redacted.bar} the ${redacted.bar}`,
                redacted.works[half.shape.work],
              ].join(" "),
              "its day, that it is redacted, its line and the kind of work: no more",
            );
            assert.equal(entry.controls, 0, "no link, picture or frame");
            assert.equal(entry.bars.length, 3);
            assert.ok(entry.bars.every((bar) => bar.inked));
            const item = page.locator(`${OPEN} #u-${half.id}`);
            checkRedactedLine(
              assert,
              await item.evaluate(redactedLine),
              parts,
              {
                bar: redacted.bar,
                within: await item.evaluate((el) => {
                  const { left, right } = el
                    .closest(".bp-page")
                    .getBoundingClientRect();
                  return { left, right };
                }),
              },
            );
            // The words are in the hand an update's title is written in.
            const type = (selector) =>
              page
                .locator(`${OPEN} ${selector}`)
                .first()
                .evaluate((el) => {
                  const { color, fontFamily, fontSize, fontWeight } =
                    getComputedStyle(el);
                  return { color, fontFamily, fontSize, fontWeight };
                });
            const word = await type(`#u-${half.id} [data-redaction-word]`);
            await turnTo(page, ".bp-log .bp-diary__title");
            assert.deepEqual(word, await type(".bp-log .bp-diary__title"));
            assert.deepEqual(await page.evaluate(spills), []);
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: a picture, a film and a sound are taped in beside their updates`,
          async () => {
            const { context, page } = await open(
              size,
              harness("labbook", "/lab"),
            );
            const fixture = await fixtureContent(page);
            const wanted = Object.fromEntries(
              fixture.labbook
                .filter((update) => update.artifact)
                .map((update) => [update.id, update.artifact]),
            );
            await turnTo(page, "[data-artifact='image']");
            await page.waitForFunction(
              () =>
                document.querySelector(
                  "#lens-shell .bp-spread [data-artifact='image'] img",
                ).naturalWidth > 0,
            );
            await shot(page, `artifact-image-${size}`);
            await context.close();
            const book = await open(size, harness("labbook", "/lab"));
            const entries = (await leaf(book.page, updates)).flat();
            const media = (id) => entries.find((item) => item.id === id).media;
            const picture = wanted["fixture-first-line"];
            assert.deepEqual(media("fixture-first-line"), {
              tag: "img",
              src: picture.src,
              name: picture.alt,
              controls: null,
              poster: null,
            });
            const film = wanted["fixture-film"];
            assert.deepEqual(media("fixture-film"), {
              tag: "video",
              src: film.src,
              name: film.alt,
              controls: true,
              poster: film.poster,
            });
            const sound = wanted["fixture-tone"];
            assert.deepEqual(media("fixture-tone"), {
              tag: "audio",
              src: sound.src,
              name: sound.alt,
              controls: true,
              poster: null,
            });
            await book.context.close();
          },
        );

        await t.test(
          `${size}: a Pen and a demo ask nothing of another site until they are asked`,
          async () => {
            const { context, page, asked } = await open(
              size,
              harness("labbook", "/lab"),
            );
            const frames = await leaf(
              page,
              () => document.querySelectorAll("iframe").length,
            );
            assert.deepEqual(
              frames.filter(Boolean),
              [],
              "no frame anywhere in the book",
            );
            assert.deepEqual(asked, [], "and nothing asked of another site");
            await context.close();

            const pen = await open(size, harness("labbook", "/lab"));
            await turnTo(pen.page, "[data-artifact='pen']");
            const stage = pen.page.locator(
              `${OPEN} [data-artifact='pen'] [data-artifact-frame]`,
            );
            await shot(pen.page, `pen-before-${size}`);
            const before = await stage.boundingBox();
            assert.equal(
              (await stage.locator("[data-artifact-load]").innerText()).trim(),
              words.labbook.artifact.load.pen,
            );
            // The link under it opens it where it lives, whatever happens.
            assert.equal(
              await pen.page
                .locator(`${OPEN} [data-artifact='pen'] figcaption a`)
                .getAttribute("href"),
              "https://codepen.io/beejsbj/pen/abXZWLQ",
            );
            await stage.locator("[data-artifact-load]").click();
            const frame = stage.locator("iframe");
            await frame.waitFor();
            assert.equal(await frame.getAttribute("src"), PEN_FRAME);
            const fixture = await fixtureContent(pen.page);
            assert.equal(
              await frame.getAttribute("title"),
              fixture.labbook.find((update) => update.id === "fixture-replay")
                .artifact.alt,
            );
            const after = await stage.boundingBox();
            assert.deepEqual(
              [after.width, after.height].map(Math.round),
              [before.width, before.height].map(Math.round),
              "the frame takes the card's own room",
            );
            await pen.page.waitForTimeout(300);
            await shot(pen.page, `pen-after-${size}`);
            assert.deepEqual(pen.asked, [PEN_FRAME], "one request, the Pen's");
            await pen.context.close();

            // The keyboard starts a demo the same way.
            const demo = await open(size, harness("labbook", "/lab"));
            await turnTo(demo.page, "[data-artifact='demo']");
            await shot(demo.page, `demo-before-${size}`);
            const ask = demo.page.locator(
              `${OPEN} [data-artifact='demo'] [data-artifact-load]`,
            );
            await ask.focus();
            await demo.page.keyboard.press("Enter");
            const running = demo.page.locator(
              `${OPEN} [data-artifact='demo'] iframe`,
            );
            await running.waitFor();
            assert.equal(await running.getAttribute("src"), DEMO_FRAME);
            await demo.page.waitForTimeout(300);
            assert.deepEqual(demo.asked, [DEMO_FRAME]);
            await demo.context.close();

            // A Pen named by its id alone is the site's own.
            if (size === "desktop") {
              const [newest] = content.labbook;
              const own = await open(size, real(`/lab#u-${newest.id}`), {
                rewrite: (data) => ({
                  ...data,
                  labbook: data.labbook.map((update) =>
                    update.id === newest.id
                      ? {
                          ...update,
                          artifact: {
                            kind: "pen",
                            src: "abXZWLQ",
                            alt: "A Pen named by its id",
                          },
                        }
                      : update,
                  ),
                }),
              });
              assert.equal(
                await own.page
                  .locator(`${OPEN} #u-${newest.id} [data-artifact-frame]`)
                  .getAttribute("data-artifact-frame"),
                `https://codepen.io/${penUser(content.site)}/embed/abXZWLQ?default-tab=result`,
              );
              assert.deepEqual(own.asked, []);
              await own.context.close();
            }
          },
        );

        await t.test(
          `${size}: there is no strip of headlines on the first page or in the lab book`,
          async () => {
            // On real content and on the fixture Labbook alike.
            for (const path of [
              real("/"),
              real("/lab"),
              harness("labbook", "/"),
              harness("labbook", "/lab"),
            ]) {
              const { context, page, errors } = await open(size, path);
              const views = await leaf(page, () => ({
                strips: document.querySelectorAll(
                  "#lens-shell :is([data-ticker], .bp-ticker, [data-part='ticker.headline'])",
                ).length,
                h1: document.querySelectorAll("#lens-shell .bp-spread h1")
                  .length,
              }));
              assert.equal(
                views.reduce((sum, view) => sum + view.strips, 0),
                0,
                `${path} has no strip`,
              );
              assert.equal(
                views.reduce((sum, view) => sum + view.h1, 0),
                1,
                `${path} is still written`,
              );
              assert.deepEqual(errors, []);
              await context.close();
            }
          },
        );

        await t.test(
          `${size}: the first page's diary lists every update, newest first, as before`,
          async () => {
            const { context, page, errors } = await open(size, real("/"));
            const views = await leaf(
              page,
              [
                updates,
                // what is written down the page, block by block
                () =>
                  [
                    ...document.querySelectorAll(
                      "#lens-shell .bp-spread .bp-flow > *",
                    ),
                  ].map(
                    (el) =>
                      el.dataset.part ??
                      (el.querySelector(".bp-tally")
                        ? `tally:${el.querySelector("h2").textContent}`
                        : el.className),
                  ),
                spills,
              ],
              `home-updates-${size}`,
            );
            const diary = views.flatMap(([entries]) => entries);
            assert.deepEqual(
              diary.map(
                ({ ref, part, date, title, href, summary, origin }) => ({
                  ref,
                  part,
                  date,
                  title,
                  href,
                  summary,
                  origin,
                }),
              ),
              content.updates.map((update) => ({
                ref: update.id,
                part: "update.item",
                date: update.date,
                // a way out of the book says so, to a screen reader
                title: /^https?:/.test(update.href)
                  ? `${update.title} (${content.lenses["back-page"].newTab})`
                  : update.title,
                href: update.href,
                summary: update.summary,
                origin: `${update.sourceLabel} · ${update.kindLabel}`,
              })),
              "the whole home stream, in its order",
            );
            assert.ok(diary.length >= 7, "the seeded updates are there");
            // Down the page as it was: the welcome, the note of what is
            // going on now straight after it, then the diary under its
            // heading and its tally.
            const blocks = views.flatMap(([, written]) => written);
            const welcome = blocks.indexOf("home.welcome");
            assert.deepEqual(blocks.slice(welcome, welcome + 3), [
              "home.welcome",
              "home.currently",
              `tally:${content.pages.home.updates.title}`,
            ]);
            assert.deepEqual(
              views.flatMap(([, , spilt]) => spilt),
              [],
            );
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: an update with nowhere to go is text, not a link, in the first page's diary and in the Labbook`,
          async () => {
            // Nothing in the book points at an update's place in the Labbook.
            const pointers = () =>
              document.querySelectorAll("#lens-shell a[href*='#u-']").length;

            const home = await open(size, harness("labbook", "/"));
            const stream = (await fixtureContent(home.page)).updates;
            const nowhere = stream.filter((update) => !update.href);
            assert.ok(nowhere.length >= 2, "the fixture has such updates");
            assert.ok(stream.length > nowhere.length, "and ones that do go");
            const views = await leaf(
              home.page,
              [updates, pointers],
              `home-nowhere-${size}`,
            );
            const diary = views.flatMap(([entries]) => entries);
            assert.deepEqual(
              diary.map(({ ref, href, links }) => ({ ref, href, links })),
              stream.map((update) => ({
                ref: update.id,
                href: update.href ?? null,
                links: update.href ? 1 : 0,
              })),
              "a title is a link only where its update goes somewhere",
            );
            assert.deepEqual(
              views.map(([, pointing]) => pointing),
              views.map(() => 0),
            );
            assert.deepEqual(home.errors, []);
            await home.context.close();

            const lab = await open(size, harness("labbook", "/lab"));
            const written = (await fixtureContent(lab.page)).labbook.filter(
              (update) => update.visibility === "open",
            );
            const read = await leaf(lab.page, [updates, pointers]);
            const entries = read.flatMap(([list]) => list);
            for (const update of written) {
              const entry = entries.find((item) => item.ref === update.id);
              assert.equal(entry.href, update.href ?? null, update.id);
            }
            // With nothing it is about and nothing that lives elsewhere,
            // such an update has no link in it at all.
            for (const id of ["fixture-film", "fixture-tone"])
              assert.equal(
                entries.find((entry) => entry.ref === id).links,
                0,
                `${id} has no link in it`,
              );
            assert.deepEqual(
              read.map(([, pointing]) => pointing),
              read.map(() => 0),
            );
            assert.deepEqual(lab.errors, []);
            await lab.context.close();
          },
        );

        await t.test(
          `${size}: a link to an update opens the lab book at it, and the address moving on turns the pages`,
          async () => {
            // the update furthest into the book, and the one it opens at
            const [first] = content.labbook;
            const last = content.labbook.at(-1);
            const landed = (page, id) =>
              page.waitForSelector(`${OPEN} #u-${id}[data-here]`, {
                timeout: 15000,
              });

            // Straight to an update deep in the book.
            const deep = await open(size, real(`/lab#u-${last.id}`));
            await landed(deep.page, last.id);
            await shot(deep.page, `landed-${size}`);
            assert.deepEqual(deep.errors, []);
            await deep.context.close();

            // The address moves to another update (typed in, or Back and
            // Forward): the pages turn to it, and Back takes the mark away.
            const lab = await open(size, real("/lab"));
            assert.equal(
              await lab.page.locator(`${OPEN} [data-here]`).count(),
              0,
            );
            await lab.page.evaluate((id) => {
              location.hash = `u-${id}`;
            }, last.id);
            await landed(lab.page, last.id);
            assert.equal(
              await lab.page.locator(`${OPEN} [data-here]`).count(),
              1,
            );
            assert.equal(
              new URL(lab.page.url()).pathname + new URL(lab.page.url()).hash,
              labbookHref(last.id),
            );
            assert.equal(
              await lab.page.evaluate(() => document.activeElement?.id),
              `u-${last.id}`,
              "and the update has the focus",
            );
            await lab.page.evaluate((id) => {
              location.hash = `u-${id}`;
            }, first.id);
            await landed(lab.page, first.id);
            await lab.page.goBack();
            await landed(lab.page, last.id);
            await lab.page.goBack();
            await lab.page.waitForFunction(
              () => !document.querySelector("#lens-shell [data-here]"),
            );
            assert.deepEqual(lab.errors, []);
            await lab.context.close();
          },
        );

        await t.test(
          `${size}: an experiment's page lists its updates, newest first, and the project it became`,
          async () => {
            const { context, page, errors } = await open(
              size,
              harness("lab-full-page", "/lab/fixture-study"),
            );
            const fixture = await fixtureContent(page);
            const study = fixture.lab.find(
              (entry) => entry.slug === "fixture-study",
            );
            const project = fixture.projects.find(
              (entry) => entry.slug === study.graduatedTo,
            );
            const views = await leaf(page, () => {
              const note = document.querySelector(
                "#lens-shell .bp-spread [data-part='lab.graduation']",
              );
              return {
                graduation: note && {
                  ref: note.dataset.ref,
                  href: note.getAttribute("href"),
                  text: [...note.querySelectorAll("small, span")]
                    .map((el) => el.textContent.trim())
                    .join(" "),
                },
                headings: [
                  ...document.querySelectorAll(
                    "#lens-shell .bp-spread .bp-sechead h2",
                  ),
                ].map((h2) => h2.textContent.trim()),
                meta: document.querySelectorAll(
                  "#lens-shell .bp-spread [data-part='lab.meta']",
                ).length,
                html: document.documentElement.outerHTML,
              };
            });
            const graduation = views.find((view) => view.graduation).graduation;
            assert.equal(graduation.ref, study.slug);
            assert.equal(graduation.href, project.href);
            assert.equal(
              graduation.text,
              `${words.detail.labels.graduated} ${project.title} →`,
            );
            assert.ok(
              views.some((view) =>
                view.headings.includes(words.detail.labels.updates),
              ),
              "its part of the Labbook has its heading",
            );
            assert.equal(
              views.reduce((sum, view) => sum + view.meta, 0),
              0,
              "no type or era",
            );
            // Its redacted update arrives with words it must not have.
            assert.ok(
              !views.some((view) => view.html.includes(REDACTION_MARKER)),
              "none of the hidden words is on the experiment's page",
            );

            const again = await open(
              size,
              harness("lab-full-page", "/lab/fixture-study"),
            );
            await turnTo(again.page, "[data-part='lab.graduation']");
            await shot(again.page, `experiment-${size}`);
            const entries = (await leaf(again.page, updates)).flat();
            const record = experimentUpdates(fixture.labbook, study.slug);
            assert.deepEqual(
              entries.map((entry) => entry.ref),
              record.map((update) => update.id),
              "newest first, the redacted one in its place",
            );
            for (const update of record) {
              const entry = entries.find((item) => item.ref === update.id);
              // Its place in the Labbook is the Lab's, not this page's.
              assert.equal(entry.id, null);
              if (update.visibility !== "open") {
                assert.equal(entry.part, "update.redacted");
                assert.equal(entry.bars.length, update.shape.parts.length);
                assert.equal(entry.controls, 0);
                continue;
              }
              assert.ok(entry.title.startsWith(update.title));
              // An update with nowhere to go is text, not a link to its
              // place in the Labbook.
              assert.equal(entry.href, update.href ?? null, update.id);
            }
            assert.deepEqual([...errors, ...again.errors], []);
            await context.close();
            await again.context.close();

            // An experiment that says little: no note, no record, no gaps.
            const bare = await open(
              size,
              harness("lab-bare-entry", "/lab/fixture-poster"),
            );
            const quiet = await leaf(bare.page, () => ({
              graduation: document.querySelectorAll(
                "#lens-shell .bp-spread [data-part='lab.graduation']",
              ).length,
              updates: document.querySelectorAll(
                "#lens-shell .bp-spread :is(.bp-log, .bp-sechead)",
              ).length,
              meta: document.querySelectorAll(
                "#lens-shell .bp-spread [data-part='lab.meta']",
              ).length,
              empty: [
                ...document.querySelectorAll(
                  "#lens-shell .bp-spread .bp-flow :is(p, dl, ul, ol)",
                ),
              ].filter((el) => /^[\s·]*$/.test(el.textContent)).length,
            }));
            assert.deepEqual(
              quiet.filter((view) => Object.values(view).some(Boolean)),
              [],
            );
            await bare.context.close();
          },
        );
      }
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
