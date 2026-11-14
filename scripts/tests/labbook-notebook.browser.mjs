/** Daylight's Labbook as a notebook (issue #134): kept by month under a
 * heading each, narrowed to one experiment or project and back by link
 * and by keyboard with the choice in the address, every entry in its
 * place with its artifact or its redaction, and each other lens still
 * showing the whole Labbook when the address narrows it.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Read on /prism/fixtures/lab?labbook=notebook, whose Labbook is written
 * as content (src/content/fixture-updates), and on /lab against
 * /prism/content.json. Same server and Chromium as the other browser
 * files. LAB_SHOTS=<dir> also saves pictures of the Labbook (whole, one
 * month, narrowed) at each size; LAB_ONLY=<regexp> runs only the subtests
 * it names. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";
import { checkRedactedLine, redactedLine } from "./lib/redaction.mjs";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const NOTEBOOK = "/prism/fixtures/lab?labbook=notebook";
const SHOTS = process.env.LAB_SHOTS;
const ONLY = process.env.LAB_ONLY ? new RegExp(process.env.LAB_ONLY) : null;
// The lenses whose Labbook does not narrow yet. Calling Card's does (#129)
// and so does Cut Paper's (#130): lab-calling-card-design.browser.mjs and
// lab-cut-paper-design.browser.mjs look at them.
const SHELLS = ["back-page", "hion"];

// The fixture Labbook, newest first, by month. Written out here rather
// than derived, so the page is checked against what the fixture says.
const MONTHS = [
  {
    month: "2026-10",
    label: "October 2026",
    ids: [
      "notebook-plain",
      "notebook-linked",
      "notebook-picture",
      "notebook-half-said",
    ],
  },
  { month: "2026-09", label: "September 2026", ids: ["notebook-one-line"] },
  {
    month: "2026-08",
    label: "August 2026",
    ids: [
      "notebook-pen",
      "notebook-film",
      "notebook-kept-back",
      "notebook-sound",
      "notebook-demo",
    ],
  },
  {
    month: "2026-07",
    label: "July 2026",
    ids: ["notebook-graduated", "notebook-first"],
  },
];
const EVERY = MONTHS.flatMap(({ ids }) => ids);
// What each thing the fixture is about holds, newest first.
const QUIET = {
  ref: "experiment:fixture-quiet",
  title: "An old sketch, gone quiet",
  ids: [
    "notebook-pen",
    "notebook-kept-back",
    "notebook-demo",
    "notebook-first",
  ],
  months: ["2026-08", "2026-07"],
};
const DAYSHAPER = {
  ref: "project:dayshaper",
  title: "Dayshaper",
  ids: ["notebook-linked", "notebook-sound", "notebook-graduated"],
  months: ["2026-10", "2026-08", "2026-07"],
};

/** The Labbook as a visitor sees it now: its months and the entries in
 * each that are shown, what it can be narrowed to, and what it says it is
 * narrowed to. */
const notebook = (page) =>
  page.evaluate(() => {
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const section = document.querySelector(".site-frame main #labbook");
    if (!section) return null;
    const shown = (el) => el.checkVisibility();
    const months = [...section.querySelectorAll("[data-part='labbook.month']")]
      .filter(shown)
      .map((heading) => {
        const group = heading.closest("[data-labbook-month]");
        return {
          month: heading.dataset.ref,
          label: text(heading),
          level: heading.tagName,
          group: group?.dataset.labbookMonth ?? null,
          ids: [...(group?.querySelectorAll("li[id^='u-']") ?? [])]
            .filter(shown)
            .map((item) => item.id.slice(2)),
        };
      });
    const subjects = [
      ...section.querySelectorAll("[data-part='labbook.subject']"),
    ]
      .filter(shown)
      .map((link) => ({
        ref: link.dataset.ref,
        text: text(link),
        href: link.getAttribute("href"),
        current: link.getAttribute("aria-current"),
      }));
    const status = section.querySelector("[data-labbook-narrowed]");
    return {
      narrowed: section.dataset.narrowed ?? null,
      months,
      shown: [...section.querySelectorAll("li[id^='u-']")]
        .filter(shown)
        .map((item) => item.id.slice(2)),
      written: [...section.querySelectorAll("li[id^='u-']")].map((item) =>
        item.id.slice(2),
      ),
      subjects,
      status: status && shown(status) ? text(status) : null,
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
  "Daylight keeps the Labbook as a notebook: by month, narrowed to one thing and back",
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

    /** A page at one size. Nothing leaves the test: whatever a page asks of
     * another origin is written down and answered with a blank. */
    const open = async (
      size,
      path,
      { motion = false, script = true, lens } = {},
    ) => {
      const context = await browser.newContext({
        ...SIZES[size],
        reducedMotion: motion ? "no-preference" : "reduce",
        javaScriptEnabled: script,
      });
      if (lens)
        await context.addInitScript(
          (lens) => localStorage.setItem("prism:lens", lens),
          lens,
        );
      const asked = [];
      const errors = [];
      await context.route(
        (url) => url.origin !== base,
        (route) => {
          asked.push(route.request().url());
          return route.fulfill({ contentType: "text/html", body: "" });
        },
      );
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(`${base}${path}`, { waitUntil: "load" });
      assert.equal(response.status(), 200, `${path} answers`);
      return { context, page, asked, errors };
    };
    /** Wait until the Labbook says it is narrowed to `ref` (or to nothing). */
    const narrowedTo = (page, ref) =>
      page.waitForFunction(
        (ref) =>
          (document.querySelector(".site-frame main #labbook")?.dataset
            .narrowed ?? null) === ref && document.readyState === "complete",
        ref,
      );
    const where = (page) => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}${url.hash}`;
    };
    /** A picture of the element, or of the screen with it in the middle. */
    const shot = async (page, selector, name, { whole = false } = {}) => {
      if (!SHOTS) return;
      const target = page.locator(selector).first();
      await target.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(400);
      if (whole) await target.screenshot({ path: join(SHOTS, `${name}.png`) });
      else await page.screenshot({ path: join(SHOTS, `${name}.png`) });
    };

    try {
      for (const size of Object.keys(SIZES)) {
        await t.test(
          `${size}: the Labbook is kept by month, a heading for each, newest first`,
          async () => {
            const { context, page, errors } = await open(size, NOTEBOOK);
            const book = await notebook(page);
            assert.ok(book, "the fixture room has a Labbook");
            assert.equal(book.narrowed, null, "nothing narrows it");
            assert.deepEqual(
              book.months.map(({ ids, ...month }) => month),
              MONTHS.map(({ month, label }) => ({
                month,
                label,
                level: "H3",
                group: month,
              })),
              "a heading per month, newest first, each heading its own month",
            );
            assert.deepEqual(
              book.months.map(({ ids }) => ids),
              MONTHS.map(({ ids }) => ids),
              "each entry under its own month, newest first",
            );
            assert.deepEqual(book.shown, EVERY, "every entry is shown");
            // What it can be narrowed to: each thing an entry is about,
            // the one written in most recently first, with how many.
            assert.deepEqual(
              book.subjects.map(({ ref }) => ref),
              ["project:dayshaper", "experiment:fixture-featured", QUIET.ref],
            );
            assert.deepEqual(
              book.subjects.map(({ current }) => current),
              [null, null, null],
            );
            const quiet = book.subjects.find(({ ref }) => ref === QUIET.ref);
            assert.ok(quiet.text.startsWith(QUIET.title), quiet.text);
            assert.ok(quiet.text.includes("4"), "it says how many");
            assert.equal(
              quiet.href,
              "/prism/fixtures/lab?labbook=notebook&experiment=fixture-quiet#labbook",
            );
            assert.equal(book.status, null, "it says nothing of narrowing");
            assert.equal(book.overflow, 0, "nothing wider than the screen");
            assert.deepEqual(errors, []);
            await shot(page, "#labbook", `notebook-${size}`, { whole: true });
            await shot(
              page,
              "[data-labbook-month='2026-08']",
              `notebook-month-${size}`,
            );
            await shot(
              page,
              "[data-labbook-month='2026-09']",
              `notebook-one-entry-month-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: an entry shows its artifact, and a redacted one its words and bars, in its month`,
          async () => {
            const { context, page, asked } = await open(size, NOTEBOOK);
            const inMonth = (id) =>
              page.evaluate(
                (id) =>
                  document
                    .getElementById(`u-${id}`)
                    ?.closest("[data-labbook-month]")?.dataset.labbookMonth ??
                  null,
                id,
              );
            const picture = await page.evaluate(async () => {
              const img = document.querySelector("#u-notebook-picture img");
              img.scrollIntoView();
              for (let i = 0; i < 50 && !img.complete; i += 1)
                await new Promise((done) => setTimeout(done, 100));
              return {
                src: img.getAttribute("src"),
                alt: img.alt,
                painted: img.naturalWidth > 0 && img.checkVisibility(),
              };
            });
            assert.deepEqual(picture, {
              src: "/images/lab/beating-shapes.png",
              alt: "A grid of coloured shapes caught mid-beat",
              painted: true,
            });
            assert.equal(await inMonth("notebook-picture"), "2026-10");
            const has = (selector) =>
              page.locator(selector).first().isVisible();
            assert.ok(await has("#u-notebook-film video[controls]"), "a film");
            assert.ok(
              await has("#u-notebook-sound audio[controls]"),
              "a sound",
            );
            assert.ok(
              await has("#u-notebook-pen [data-artifact-load]"),
              "a Pen, waiting to be asked for",
            );
            assert.ok(
              await has("#u-notebook-demo [data-artifact-load]"),
              "a demo, waiting to be asked for",
            );
            assert.equal(await page.locator("iframe").count(), 0);
            assert.deepEqual(asked, [], "nothing asked of another site");
            for (const id of [
              "notebook-film",
              "notebook-sound",
              "notebook-pen",
            ])
              assert.ok(
                ["2026-08"].includes(await inMonth(id)),
                `${id} is in August`,
              );

            // What an entry is about is a link to it, in its words.
            const about = await page
              .locator("#u-notebook-graduated [data-related]")
              .evaluateAll((items) =>
                items.map((item) => ({
                  kind: item.dataset.related,
                  href: item.querySelector("a")?.getAttribute("href"),
                })),
              );
            assert.deepEqual(about, [
              { kind: "experiment", href: "/lab/fixture-featured" },
              { kind: "project", href: "/projects/dayshaper" },
            ]);
            // An update with no link of its own stays text.
            assert.equal(
              await page.locator("#u-notebook-plain a").count(),
              0,
              "the plain entry has no link",
            );
            assert.equal(
              await page.locator("#u-notebook-one-line a").count(),
              0,
              "nor does the one-line entry",
            );

            for (const [id, parts] of [
              ["notebook-half-said", ["Moved", 3, "into", 5, 2]],
              ["notebook-kept-back", [5, 3, 8, 4]],
            ]) {
              const item = page.locator(`#u-${id}`);
              assert.equal(
                await item.locator("[data-part='update.redacted']").count(),
                1,
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
              assert.equal(
                await item.locator("a, img, video, audio").count(),
                0,
              );
            }
            assert.equal(await inMonth("notebook-half-said"), "2026-10");
            assert.equal(await inMonth("notebook-kept-back"), "2026-08");
            await shot(
              page,
              "#u-notebook-half-said",
              `notebook-redacted-${size}`,
            );
            await context.close();
          },
        );

        await t.test(
          `${size}: a link narrows the Labbook to one experiment, the address keeps it, and it goes back`,
          async () => {
            const { context, page, errors } = await open(size, NOTEBOOK);
            await page.click(
              `[data-part='labbook.subject'][data-ref='${QUIET.ref}']`,
            );
            await narrowedTo(page, QUIET.ref);
            assert.equal(
              where(page),
              "/prism/fixtures/lab?labbook=notebook&experiment=fixture-quiet#labbook",
            );
            const check = async (when) => {
              const book = await notebook(page);
              assert.deepEqual(
                book.shown,
                QUIET.ids,
                `${when}: only its entries`,
              );
              assert.deepEqual(
                book.months.map(({ month }) => month),
                QUIET.months,
                `${when}: only the months it was worked on`,
              );
              assert.deepEqual(
                book.written,
                EVERY,
                `${when}: the rest is still in the page`,
              );
              assert.ok(
                book.status?.includes(QUIET.title),
                `${when}: it says what it is narrowed to (${book.status})`,
              );
              assert.ok(
                book.status.startsWith(
                  `${copy.narrow.showing} ${QUIET.title}. ${copy.narrow.all}`,
                ),
                `${when}: it reads as written (${book.status})`,
              );
              assert.deepEqual(
                book.subjects.map(({ ref, current }) => [ref, current]),
                [
                  ["project:dayshaper", null],
                  ["experiment:fixture-featured", null],
                  [QUIET.ref, "true"],
                ],
                `${when}: the one it is narrowed to is marked`,
              );
              assert.equal(book.overflow, 0);
            };
            await check("after the click");
            await shot(page, "#labbook", `notebook-narrowed-${size}`, {
              whole: true,
            });

            await page.reload({ waitUntil: "load" });
            await narrowedTo(page, QUIET.ref);
            await check("after a reload");

            // And back: every entry, and the address says nothing of it.
            await page.click("[data-labbook-narrowed] a");
            await narrowedTo(page, null);
            assert.equal(
              where(page),
              "/prism/fixtures/lab?labbook=notebook#labbook",
            );
            assert.deepEqual((await notebook(page)).shown, EVERY);
            assert.equal((await notebook(page)).status, null);

            // The browser's Back and Forward go through the same states.
            await page.goBack();
            await narrowedTo(page, QUIET.ref);
            assert.deepEqual((await notebook(page)).shown, QUIET.ids);
            await page.goForward();
            await narrowedTo(page, null);
            assert.deepEqual((await notebook(page)).shown, EVERY);
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        // On the fixture room a narrowing is a whole page load (it is a
        // tool page, without the client router); on /lab it is the
        // router's swap. The keyboard is followed through both.
        for (const path of [NOTEBOOK, "/lab"])
          await t.test(
            `${size}: on ${path} the keyboard narrows it and brings it back, and focus follows`,
            async () => {
              const { context, page, errors } = await open(size, path);
              const focused = () =>
                page.evaluate(() => {
                  const el = document.activeElement;
                  return {
                    ref: el?.dataset?.ref ?? null,
                    narrowed: !!el?.closest?.("[data-labbook-narrowed]"),
                    all: el?.hasAttribute?.("data-labbook-all") ?? false,
                    text: (el?.textContent ?? "")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 80),
                  };
                });
              const before = await notebook(page);
              // The first thing it can be narrowed to: on the fixture,
              // the project.
              const [first] = before.subjects;
              if (path === NOTEBOOK) assert.equal(first.ref, DAYSHAPER.ref);
              // Tab from the Labbook's heading to that link.
              await page.locator("#labbook-title").evaluate((el) => {
                el.tabIndex = -1;
                el.focus();
              });
              await page.keyboard.press("Tab");
              assert.equal(
                (await focused()).ref,
                first.ref,
                "one Tab from the heading is the first link",
              );
              await page.keyboard.press("Enter");
              await narrowedTo(page, first.ref);
              assert.equal(where(page), first.href);
              const narrowed = await notebook(page);
              if (path === NOTEBOOK) {
                assert.deepEqual(narrowed.shown, DAYSHAPER.ids);
                assert.deepEqual(
                  narrowed.months.map(({ month }) => month),
                  DAYSHAPER.months,
                );
              } else {
                assert.ok(narrowed.shown.length > 0);
                assert.ok(narrowed.shown.length < before.shown.length);
              }
              const after = await focused();
              assert.ok(
                after.narrowed,
                `focus lands on what it is narrowed to (${after.text})`,
              );
              // One Tab on is the way back.
              await page.keyboard.press("Tab");
              assert.ok((await focused()).all, "the next stop is the way back");
              await page.keyboard.press("Enter");
              await narrowedTo(page, null);
              assert.deepEqual((await notebook(page)).shown, before.shown);
              assert.equal(
                (await focused()).ref,
                first.ref,
                "focus returns to the link it left from",
              );
              assert.deepEqual(errors, []);
              await context.close();
            },
          );

        await t.test(
          `${size}: an address naming nothing it holds narrows nothing`,
          async () => {
            const { context, page, errors } = await open(
              size,
              `${NOTEBOOK}&experiment=no-such-thing`,
            );
            const book = await notebook(page);
            assert.equal(book.narrowed, null);
            assert.deepEqual(book.shown, EVERY);
            assert.equal(book.status, null);
            assert.deepEqual(errors, []);
            await context.close();
          },
        );

        await t.test(
          `${size}: narrowing is a turn of the page, not a trip: no cover plays`,
          async () => {
            // On /lab, where the client router and its cover are.
            const { context, page } = await open(size, "/lab", {
              motion: true,
            });
            const [first] = (await notebook(page)).subjects;
            const covers = page.evaluate(
              () =>
                new Promise((done) => {
                  let seen = 0;
                  const look = () => {
                    if (document.querySelector(".page-cover")) seen += 1;
                  };
                  const timer = setInterval(look, 16);
                  setTimeout(() => {
                    clearInterval(timer);
                    done(seen);
                  }, 1500);
                }),
            );
            await page.click(
              `[data-part='labbook.subject'][data-ref='${first.ref}']`,
            );
            assert.equal(await covers, 0, "the page cover never swells");
            await narrowedTo(page, first.ref);
            // A link that does go somewhere still plays it.
            const away = page.evaluate(
              () =>
                new Promise((done) => {
                  const timer = setInterval(() => {
                    if (!document.querySelector(".page-cover")) return;
                    clearInterval(timer);
                    done(true);
                  }, 16);
                  setTimeout(() => done(false), 1500);
                }),
            );
            await page.click(".site-frame main .lab-aside a");
            assert.equal(await away, true, "a trip to another page has it");
            await context.close();
          },
        );

        await t.test(
          `${size}: without script the Labbook is whole, kept by month, and offers no narrowing it cannot do`,
          async () => {
            const { context, page } = await open(
              size,
              `${NOTEBOOK}&experiment=fixture-quiet`,
              { script: false },
            );
            const book = await notebook(page);
            assert.deepEqual(book.shown, EVERY, "every entry");
            assert.deepEqual(
              book.months.map(({ month }) => month),
              MONTHS.map(({ month }) => month),
            );
            assert.deepEqual(
              book.subjects,
              [],
              "no links that would do nothing",
            );
            assert.equal(book.status, null);
            assert.equal(book.overflow, 0);
            await context.close();
          },
        );

        await t.test(
          `${size}: /lab is kept by month and can be narrowed to what its updates are about`,
          async () => {
            const { context, page, errors } = await open(size, "/lab");
            const book = await notebook(page);
            const months = [
              ...new Set(content.labbook.map((u) => u.date.slice(0, 7))),
            ];
            assert.deepEqual(
              book.months.map(({ month }) => month),
              months,
            );
            assert.deepEqual(
              book.months.flatMap(({ ids }) => ids),
              content.labbook.map((u) => u.id),
            );
            assert.ok(book.subjects.length > 0, "there is something to follow");
            for (const subject of book.subjects)
              assert.match(
                subject.href,
                /^\/lab\?(experiment|project)=[\w-]+#labbook$/,
              );
            assert.equal(book.overflow, 0);
            assert.deepEqual(errors, []);
            await shot(page, "#labbook", `lab-notebook-${size}`, {
              whole: true,
            });

            const [first] = book.subjects;
            await page.click(
              `[data-part='labbook.subject'][data-ref='${first.ref}']`,
            );
            await narrowedTo(page, first.ref);
            const narrowed = await notebook(page);
            assert.ok(narrowed.shown.length > 0);
            assert.ok(narrowed.shown.length < content.labbook.length);
            await context.close();
          },
        );
      }

      // The address each shell is handed: the Labbook narrowed to the
      // first thing /lab can be narrowed to.
      const narrowing = await (async () => {
        const { context, page } = await open("desktop", "/lab");
        const [first] = (await notebook(page)).subjects;
        await context.close();
        return first.href;
      })();
      for (const lens of SHELLS)
        await t.test(
          `${lens}: an address that narrows the Labbook shows it as before`,
          async () => {
            /** The updates the shell shows on arriving at `path`. */
            const arrive = async (path) => {
              const { context, page, errors } = await open("desktop", path, {
                lens,
              });
              await page.waitForFunction(
                () => !!document.querySelector("#lens-shell [data-part]"),
                null,
                { timeout: 15_000 },
              );
              await page.waitForTimeout(800);
              const look = () =>
                page.evaluate(() => ({
                  refs: [
                    ...document.querySelectorAll(
                      "#lens-shell :is([data-part='update.item'], [data-part='update.redacted'])",
                    ),
                  ]
                    .filter((el) => el.checkVisibility())
                    .map((el) => el.dataset.ref),
                  turn: !!document.querySelector(
                    "#lens-shell [data-prism-turn='next']:not([disabled])",
                  ),
                }));
              // A lens that shows a page at a time (Back Page) is read to
              // its end, as the parity test reads it.
              let seen = await look();
              const shown = [...seen.refs];
              for (let i = 0; seen.turn && i < 40; i += 1) {
                await page.click("#lens-shell [data-prism-turn='next']");
                await page.waitForTimeout(450);
                seen = await look();
                shown.push(...seen.refs);
              }
              await context.close();
              return { shown: [...new Set(shown)].sort(), errors };
            };
            const whole = await arrive("/lab");
            const narrowed = await arrive(narrowing);
            assert.ok(whole.shown.length > 0, "the shell shows its Labbook");
            assert.deepEqual(narrowed.shown, whole.shown, narrowing);
            assert.deepEqual(narrowed.errors, [], "nothing broke");
          },
        );
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
