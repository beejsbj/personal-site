/** Back Page's Lab (issue #98): what the parity test cannot see. The lab
 * book has a Bench and a Shelf with the featured experiment leading; the
 * Labbook is every update newest first, each where its links land, with
 * its artifact taped in; a redacted update is scribbles, and none of its
 * words; a Pen or a demo asks nothing of another site until asked; the
 * ticker is pulled through a headline at a time, holds for a pointer and
 * the keyboard, and lies still when motion is reduced; and an experiment's
 * page lists its updates and the project it became.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Real routes are read against /prism/content.json; the states src/content
 * does not hold come from the harness's fixtures (src/prism/fixtures.ts).
 * Same server and Chromium as prism-parity.browser.mjs (or BASE=<origin>).
 * LAB_SHOTS=<dir> also saves pictures of each part at each size. */
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
        hidden: bar.getAttribute("aria-hidden") === "true",
      })),
      controls: item.querySelectorAll(
        "a, button, iframe, img, video, audio, [data-artifact]",
      ).length,
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
      ".bp-flow > *, .bp-shelfcard li, [data-artifact], [data-redaction-bar], .bp-ticker__window",
    )) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.left < box.left - 1 || r.right > box.right + 1))
        out.push(`${el.className || el.tagName}: ${r.left} to ${r.right}`);
    }
  }
  return out;
};

/** The ticker on the open pages, as it stands this instant. */
const ticker = () => {
  const root = document.querySelector("#lens-shell .bp-spread [data-ticker]");
  if (!root) return null;
  const box = (el) => {
    const { left, right, top, bottom } = el.getBoundingClientRect();
    return { left, right, top, bottom };
  };
  const strip = root.querySelector(".bp-ticker__strip");
  const frames = [...root.querySelectorAll("[data-part='ticker.headline']")];
  return {
    name: root.getAttribute("aria-label"),
    tag: root.querySelector(".bp-ticker__tag")?.textContent ?? null,
    headlines: frames.map((frame) => {
      const link = frame.querySelector("a");
      return {
        id: frame.dataset.ref,
        text: link.textContent,
        href: link.getAttribute("href"),
        date: frame.querySelector("time")?.getAttribute("datetime"),
        box: box(link),
        shown:
          link.checkVisibility() && getComputedStyle(frame).opacity !== "0",
        focused: document.activeElement === link,
      };
    }),
    // Links anyone can reach with Tab or a screen reader.
    reachable: [...root.querySelectorAll("a")].filter(
      (link) => link.tabIndex >= 0 && !link.closest("[aria-hidden='true']"),
    ).length,
    x: strip.getBoundingClientRect().left,
    animations: strip.getAnimations().length,
    running: strip
      .getAnimations()
      .filter((animation) => animation.playState === "running").length,
    window: box(root.querySelector(".bp-ticker__window")),
    box: box(root),
    focusInside: root.contains(document.activeElement),
  };
};
/** The headlines whose words are wholly inside the strip's window. */
const inWindow = (state) =>
  state.headlines
    .filter(
      ({ box, shown }) =>
        shown &&
        box.left >= state.window.left - 1 &&
        box.right <= state.window.right + 1 &&
        box.top >= state.window.top - 1 &&
        box.bottom <= state.window.bottom + 1,
    )
    .map(({ id }) => id);

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "Back Page keeps the Lab in its lab book",
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
          `${size}: a redacted update is scribbles, its kind of work and its day, and none of its words`,
          async () => {
            const { context, page } = await open(
              size,
              harness("labbook", "/lab"),
            );
            await turnTo(page, "[data-part='update.redacted']");
            await shot(page, `redacted-${size}`);
            const [entry] = (await page.evaluate(updates)).filter(
              (item) => item.part === "update.redacted",
            );
            const fixture = await fixtureContent(page);
            const kept = fixture.labbook.find(
              (update) => update.id === "fixture-kept-back",
            );
            assert.equal(entry.id, kept.id);
            assert.equal(
              entry.text,
              [
                day(kept.date),
                words.labbook.redacted.label,
                words.labbook.redacted.works[kept.shape.work],
              ].join(" "),
              "its day, that it is redacted, and the kind of work: no more",
            );
            assert.equal(entry.controls, 0, "no link, picture or frame");
            assert.equal(entry.bars.length, kept.shape.bars.length);
            assert.ok(entry.bars.every((bar) => bar.hidden && bar.inked));
            if (size === "desktop") {
              // A longer number, a longer scribble: 5, 3, 8, 4.
              const [five, three, eight, four] = entry.bars.map(
                (bar) => bar.width,
              );
              assert.ok(
                eight > five && five > four && four > three,
                `${[five, three, eight, four]}`,
              );
            }
            await context.close();

            // The fixture's redacted update arrives with words it must not
            // have. None reaches any page it could be on.
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
          `${size}: the ticker is on the first page and in the lab book, each headline a link to its update`,
          async () => {
            for (const path of ["/", "/lab"]) {
              const { context, page, errors } = await open(size, real(path));
              await turnTo(page, "[data-ticker]");
              await shot(
                page,
                `ticker-still-${path === "/" ? "home" : "lab"}-${size}`,
              );
              const strip = await page.evaluate(ticker);
              assert.equal(strip.name, content.site.ticker.label);
              assert.equal(strip.tag, content.site.ticker.label);
              assert.deepEqual(
                strip.headlines.map(({ id, text, href, date }) => ({
                  id,
                  text,
                  href,
                  date,
                })),
                content.headlines.map((headline) => ({
                  id: headline.id,
                  text: headline.text,
                  href: labbookHref(headline.updates[0]),
                  date: headline.date,
                })),
              );
              assert.equal(strip.reachable, content.headlines.length);
              // Motion is reduced here: the strip lies still, and every
              // headline can be read where it lies.
              assert.equal(strip.animations, 0, "nothing moves");
              assert.deepEqual(
                inWindow(strip),
                content.headlines.map((headline) => headline.id),
                "every headline is on the strip",
              );
              assert.deepEqual(await page.evaluate(spills), []);
              assert.deepEqual(errors, []);
              await context.close();
            }
          },
        );

        await t.test(
          `${size}: the ticker is pulled through a headline at a time, and holds for a pointer and the keyboard`,
          async () => {
            const { context, page } = await open(size, real("/lab"), {
              motion: true,
            });
            await page.waitForSelector(`${OPEN} [data-ticker]`);
            // the book has come onto the desk and its page is written in
            await page.waitForTimeout(2500);
            const first = await page.evaluate(ticker);
            assert.equal(first.running, 2, "the strip is being pulled");
            await shot(page, `ticker-lab-${size}`);
            if (SHOTS) {
              const home = await open(size, real("/"), { motion: true });
              await turnTo(home.page, "[data-ticker]");
              await home.page.waitForTimeout(2500);
              await shot(home.page, `ticker-home-${size}`);
              await home.context.close();
            }
            const ids = content.headlines.map((headline) => headline.id);
            // Within two pulls a different headline is in the window, and
            // the strip has not moved the page around it.
            const seen = new Set(inWindow(first));
            let later = first;
            for (let i = 0; i < 60 && seen.size < 2; i += 1) {
              await page.waitForTimeout(200);
              later = await page.evaluate(ticker);
              for (const id of inWindow(later)) seen.add(id);
              assert.ok(
                inWindow(later).length <= 1,
                "one headline at a time is whole in the window",
              );
            }
            assert.ok(seen.size >= 2, `it moves on: ${[...seen]}`);
            assert.deepEqual(later.window, first.window);
            assert.deepEqual(later.box, first.box);

            if (size === "desktop") {
              // A pointer over the strip holds it where it is, for longer
              // than a pull takes to come round.
              await page.hover(`${OPEN} .bp-ticker__window`);
              await page.waitForTimeout(200);
              const held = await page.evaluate(ticker);
              await page.waitForTimeout(6500);
              const still = await page.evaluate(ticker);
              assert.equal(still.x, held.x, "held under the pointer");
              assert.equal(still.running, 0);
              await page.mouse.move(2, 2);
              let moved = false;
              for (let i = 0; i < 40 && !moved; i += 1) {
                await page.waitForTimeout(200);
                moved = (await page.evaluate(ticker)).x !== held.x;
              }
              assert.ok(moved, "and goes on when the pointer leaves");
            }

            // The keyboard: the strip lies still, the headline in focus is
            // the one in the window, and Tab reaches each once, in order.
            await page.locator(`${OPEN} [data-ticker] a`).first().focus();
            for (const id of ids) {
              const resting = await page.evaluate(ticker);
              assert.equal(resting.animations, 0, "at rest for the keyboard");
              assert.equal(
                resting.headlines.find((headline) => headline.focused)?.id,
                id,
              );
              assert.deepEqual(inWindow(resting), [id], `${id} is in view`);
              assert.deepEqual(resting.window, first.window);
              await page.keyboard.press("Tab");
            }
            const left = await page.evaluate(ticker);
            assert.equal(left.focusInside, false, "one more Tab leaves it");
            assert.equal(left.running, 2, "and it is pulled again");
            await context.close();
          },
        );

        await t.test(
          `${size}: one headline lies still on its strip, and none leaves no strip`,
          async () => {
            const one = await open(size, real("/lab"), {
              motion: true,
              rewrite: (data) => ({
                ...data,
                headlines: data.headlines.slice(0, 1),
              }),
            });
            const alone = await one.page.evaluate(ticker);
            assert.deepEqual(
              alone.headlines.map((headline) => headline.id),
              [content.headlines[0].id],
            );
            assert.equal(alone.animations, 0, "nowhere to be pulled to");
            assert.deepEqual(inWindow(alone), [content.headlines[0].id]);
            await one.context.close();

            for (const path of ["/", "/lab"]) {
              const none = await open(size, real(path), {
                rewrite: (data) => ({ ...data, headlines: [] }),
              });
              const views = await leaf(none.page, () => ({
                strips: document.querySelectorAll("#lens-shell [data-ticker]")
                  .length,
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
              assert.deepEqual(none.errors, []);
              await none.context.close();
            }
          },
        );

        await t.test(
          `${size}: a headline opens the lab book at its update`,
          async () => {
            // the headline about the update furthest into the book
            const at = (headline) =>
              content.labbook.findIndex(
                (update) => update.id === headline.updates[0],
              );
            const headline = content.headlines.reduce((far, item) =>
              at(item) > at(far) ? item : far,
            );
            const last = content.labbook[at(headline)];
            const landed = (page, id) =>
              page.waitForSelector(`${OPEN} #u-${id}[data-here]`, {
                timeout: 15000,
              });

            // Straight to an update deep in the book.
            const deep = await open(size, real(`/lab#u-${last.id}`));
            await landed(deep.page, last.id);
            await shot(deep.page, `landed-${size}`);
            await deep.context.close();

            // From the first page's ticker: another book, opened there.
            const home = await open(size, real("/"));
            await turnTo(home.page, "[data-ticker]");
            await home.page
              .locator(
                `${OPEN} [data-part='ticker.headline'][data-ref='${headline.id}'] a`,
              )
              .click();
            await landed(home.page, last.id);
            assert.equal(
              new URL(home.page.url()).pathname + new URL(home.page.url()).hash,
              labbookHref(last.id),
            );
            assert.equal(
              await home.page.evaluate(() => document.activeElement?.id),
              `u-${last.id}`,
              "and the update has the focus",
            );
            assert.deepEqual(home.errors, []);
            await home.context.close();

            // From the Lab's own ticker: the pages turn to it, and Back
            // takes the mark away again.
            const lab = await open(size, real("/lab"));
            await turnTo(lab.page, "[data-ticker]");
            await lab.page
              .locator(
                `${OPEN} [data-part='ticker.headline'][data-ref='${headline.id}'] a`,
              )
              .click();
            await landed(lab.page, last.id);
            assert.equal(
              await lab.page.locator(`${OPEN} [data-here]`).count(),
              1,
            );
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
                assert.equal(entry.bars.length, update.shape.bars.length);
                assert.equal(entry.controls, 0);
                continue;
              }
              assert.ok(entry.title.startsWith(update.title));
              // An update with nowhere else to go opens the Labbook at it.
              assert.equal(entry.href, update.href ?? labbookHref(update.id));
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
