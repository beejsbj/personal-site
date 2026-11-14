/** Playing an experiment where its card stands (issue #135): a card whose
 * experiment lives as a Pen, or as a demo that says it may be framed, has a
 * control that loads it in place of its still. Nothing is framed, and
 * nothing asked of another site, before the press; after it there is one
 * frame; the still stays until the piece has loaded; the card does not
 * change size; a second press or Escape puts the still back; the link out
 * is always there; and only one is open on the page at a time.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * Checked on /prism/fixtures/lab?fixture=preview, whose experiments cover a
 * Pen with a cover, one without, a demo on the Shelf, the featured card and
 * one that cannot be played, and on /lab itself against /prism/content.json.
 * Every request to another site is refused here and noted; the one a press
 * makes is answered with a stub page, when the test lets it, so the test can
 * watch the still while the piece is loading. Same server and Chromium as
 * prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

const SIZES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};
const ROOM = "/prism/fixtures/lab?fixture=preview";
/** What each playable fixture card loads, and where its link goes. */
const PENS = {
  "fixture-pen": {
    frame: "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
    href: "https://codepen.io/beejsbj/pen/abXZWLQ",
  },
  "fixture-pen-bare": {
    frame: "https://codepen.io/beejsbj/embed/xxexKMq?default-tab=result",
    href: "https://codepen.io/beejsbj/pen/xxexKMq",
  },
  "fixture-demo-row": {
    frame: "https://demo.example/play",
    href: "https://demo.example/play",
  },
  "fixture-feature": {
    frame: "https://codepen.io/beejsbj/embed/BaeoNPG?default-tab=result",
    href: "https://codepen.io/beejsbj/pen/BaeoNPG",
  },
};
const SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "a card plays its experiment in place",
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
    const copy = content.pages.lab.preview;
    const frames = new Set(Object.values(PENS).map((pen) => pen.frame));

    /** Open a page. Everything asked of another site is noted and refused,
     * but a frame the page is meant to ask for, which is held until
     * `let.go()` and then answered with a stub page. */
    async function visit(path, options, look) {
      const context = await browser.newContext(options);
      const asked = [];
      let release = () => {};
      let gate = new Promise((go) => (release = go));
      const control = {
        hold() {
          gate = new Promise((go) => (release = go));
        },
        go: () => release(),
      };
      await context.route("**/*", async (route) => {
        const url = route.request().url();
        if (url.startsWith(base)) return route.continue();
        asked.push(url);
        if (!frames.has(url) && !/^https:\/\/codepen\.io\//.test(url))
          return route.abort();
        await gate;
        return route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>stub</title><p>Stub piece.</p>",
        });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !/Failed to load resource/.test(message.text())
        )
          errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(`${base}${path}`, { waitUntil: "load" });
        await look(page, asked, control);
        assert.deepEqual(errors, [], "console errors");
      } finally {
        control.go();
        await context.close();
      }
    }

    const card = (page, slug) =>
      page.locator(`article:has([data-part="lab.title"][data-ref="${slug}"])`);
    const button = (page, slug) =>
      card(page, slug).locator("[data-block-toggle]");
    const stage = (page, slug) =>
      card(page, slug).locator("[data-block-stage]");
    /** The sizes of a card and its stage, and of the page around it. */
    const box = (page, slug) =>
      card(page, slug).evaluate((el) => {
        const stage = el.querySelector("[data-block-stage]");
        return {
          card: [el.offsetWidth, el.offsetHeight],
          stage: [stage.offsetWidth, stage.offsetHeight],
          page: document.documentElement.scrollHeight,
        };
      });
    /** Whether the still shows, as a visitor would see it. */
    const still = (page, slug) =>
      stage(page, slug)
        .locator(".lab-card__still")
        .evaluate((el) => el.checkVisibility({ visibilityProperty: true }));
    const framed = (page) => page.locator("iframe");
    /** Tab onto the control, as a visitor would, then press the key. */
    async function press(page, slug, key = "Enter") {
      const control = button(page, slug);
      await control.focus();
      assert.equal(
        await control.evaluate((el) => el === document.activeElement),
        true,
        `${slug}'s control takes focus`,
      );
      await page.keyboard.press(key);
      return control;
    }
    const loaded = (page, slug) =>
      stage(page, slug).evaluate(
        (el) =>
          new Promise((done) => {
            const check = () =>
              el.dataset.live === "on" ? done(true) : setTimeout(check, 20);
            check();
          }),
      );

    try {
      for (const [size, options] of Object.entries(SIZES)) {
        await t.test(
          `${size}: nothing is framed or asked for before a press, and every playable card says how to play it`,
          () =>
            visit(
              ROOM,
              { ...options, reducedMotion: "reduce" },
              async (page, asked) => {
                await page.waitForTimeout(300);
                assert.equal(await framed(page).count(), 0, "a frame");
                assert.deepEqual(
                  asked,
                  [],
                  "asked of another site before a press",
                );
                assert.deepEqual(
                  await page
                    .locator("[data-block-toggle]")
                    .evaluateAll((els) =>
                      els.map((el) => [
                        el
                          .closest("article")
                          .querySelector("[data-part='lab.title']").dataset.ref,
                        el.getAttribute("aria-label"),
                        el.textContent.trim(),
                        el.getAttribute("aria-pressed"),
                        el.checkVisibility(),
                      ]),
                    ),
                  [
                    [
                      "fixture-feature",
                      `${copy.load.pen}: The one with pride of place`,
                      copy.load.pen,
                      "false",
                      true,
                    ],
                    [
                      "fixture-pen",
                      `${copy.load.pen}: A Pen with a cover`,
                      copy.load.pen,
                      "false",
                      true,
                    ],
                    [
                      "fixture-pen-bare",
                      `${copy.load.pen}: A Pen with no cover`,
                      copy.load.pen,
                      "false",
                      true,
                    ],
                    [
                      "fixture-demo-row",
                      `${copy.load.demo}: A demo on the Shelf`,
                      copy.load.demo,
                      "false",
                      true,
                    ],
                  ],
                );
                // The one that cannot be played has none, and still links out.
                assert.equal(await button(page, "fixture-link").count(), 0);
                assert.equal(await stage(page, "fixture-link").count(), 0);
                // Said once, plainly, on each: nothing loads until asked.
                assert.equal(
                  await page
                    .locator(".lab-card__note", { hasText: copy.note })
                    .count(),
                  Object.keys(PENS).length,
                );
              },
            ),
        );

        await t.test(
          `${size}: a press loads exactly one frame, the still stays until it has loaded, and nothing moves`,
          () =>
            visit(
              ROOM,
              { ...options, reducedMotion: "reduce" },
              async (page, asked, control) => {
                for (const [slug, { frame, href }] of Object.entries(PENS)) {
                  control.hold();
                  const before = await box(page, slug);
                  assert.equal(await still(page, slug), true, `${slug}: still`);
                  const pressed = await press(page, slug);

                  // Asked for, once, on the press; not yet loaded.
                  await page.waitForFunction(
                    (n) => document.querySelectorAll("iframe").length === n,
                    1,
                  );
                  assert.equal(
                    await framed(page).count(),
                    1,
                    `${slug}: frames`,
                  );
                  await page.waitForTimeout(100);
                  assert.deepEqual(
                    asked.filter((url) => url === frame),
                    [frame],
                    `${slug}: asked for its frame, once`,
                  );
                  assert.equal(
                    await pressed.getAttribute("aria-pressed"),
                    "true",
                  );
                  assert.equal(await pressed.textContent(), copy.close);
                  assert.equal(
                    await still(page, slug),
                    true,
                    `${slug}: the still stays while the piece loads`,
                  );
                  assert.equal(
                    await stage(page, slug)
                      .locator("iframe")
                      .evaluate((el) =>
                        el.checkVisibility({ visibilityProperty: true }),
                      ),
                    false,
                    `${slug}: the frame waits behind the still`,
                  );
                  assert.deepEqual(
                    await box(page, slug),
                    before,
                    `${slug}: loading`,
                  );

                  // How it is framed.
                  const attrs = await stage(page, slug)
                    .locator("iframe")
                    .evaluate((el) => ({
                      src: el.getAttribute("src"),
                      title: el.title,
                      sandbox: el.getAttribute("sandbox"),
                      referrerpolicy: el.getAttribute("referrerpolicy"),
                      loading: el.getAttribute("loading"),
                      allow: el.getAttribute("allow"),
                    }));
                  assert.deepEqual(attrs, {
                    src: frame,
                    title: (
                      await card(page, slug)
                        .locator("[data-part='lab.title'] .link-label")
                        .innerText()
                    ).trim(),
                    sandbox: SANDBOX,
                    referrerpolicy: "strict-origin",
                    loading: "eager",
                    allow: "fullscreen",
                  });

                  // Loaded: the piece replaces the still, in the same box.
                  control.go();
                  await loaded(page, slug);
                  assert.equal(
                    await still(page, slug),
                    false,
                    `${slug}: still gone`,
                  );
                  assert.equal(
                    await stage(page, slug)
                      .locator("iframe")
                      .evaluate((el) =>
                        el.checkVisibility({ visibilityProperty: true }),
                      ),
                    true,
                  );
                  await page
                    .frameLocator(
                      `#${await stage(page, slug).getAttribute("id")} iframe`,
                    )
                    .getByText("Stub piece.")
                    .waitFor();
                  assert.deepEqual(
                    await box(page, slug),
                    before,
                    `${slug}: loaded`,
                  );

                  // The way out is still there, and still where it went.
                  const out = card(page, slug).locator(
                    "[data-part='lab.title'] a",
                  );
                  assert.equal(
                    await out.isVisible(),
                    true,
                    `${slug}: link out`,
                  );
                  assert.equal(
                    await out.getAttribute("href"),
                    href,
                    `${slug}: link out`,
                  );

                  // A second press puts the still back and takes the frame away.
                  await page.keyboard.press(" ");
                  assert.equal(
                    await framed(page).count(),
                    0,
                    `${slug}: put away`,
                  );
                  assert.equal(await still(page, slug), true);
                  assert.equal(
                    await pressed.getAttribute("aria-pressed"),
                    "false",
                  );
                  assert.equal(
                    await pressed.textContent(),
                    slug === "fixture-demo-row"
                      ? copy.load.demo
                      : copy.load.pen,
                  );
                  assert.deepEqual(
                    await box(page, slug),
                    before,
                    `${slug}: put away`,
                  );

                  // Escape does too, and leaves the focus on the control.
                  await page.keyboard.press("Enter");
                  await loaded(page, slug);
                  await page.keyboard.press("Escape");
                  assert.equal(
                    await framed(page).count(),
                    0,
                    `${slug}: Escape`,
                  );
                  assert.equal(await still(page, slug), true);
                  assert.equal(
                    await pressed.evaluate(
                      (el) => el === document.activeElement,
                    ),
                    true,
                    `${slug}: focus returns to the control`,
                  );
                  assert.deepEqual(
                    await box(page, slug),
                    before,
                    `${slug}: Escape`,
                  );
                }
              },
            ),
        );
      }

      await t.test(
        "one piece plays at a time: opening another puts the first away",
        () =>
          visit(ROOM, SIZES.desktop, async (page, _asked, control) => {
            control.go();
            await press(page, "fixture-pen");
            await loaded(page, "fixture-pen");
            await press(page, "fixture-demo-row");
            await loaded(page, "fixture-demo-row");
            assert.equal(await framed(page).count(), 1, "frames");
            assert.equal(
              await stage(page, "fixture-pen").locator("iframe").count(),
              0,
            );
            assert.equal(await still(page, "fixture-pen"), true);
            assert.equal(
              await button(page, "fixture-pen").getAttribute("aria-pressed"),
              "false",
            );
            assert.equal(
              await button(page, "fixture-demo-row").getAttribute(
                "aria-pressed",
              ),
              "true",
            );
            // Opened and put away again, the page is as it was.
            await press(page, "fixture-demo-row");
            assert.equal(await framed(page).count(), 0);
          }),
      );

      await t.test(
        "/lab: each Pen on the Shelf has the control, and nothing else does; nothing is asked of CodePen before a press",
        () =>
          visit(
            "/lab",
            { ...SIZES.desktop, reducedMotion: "reduce" },
            async (page, asked) => {
              const playable = content.lab
                .filter((entry) => entry.preview)
                .map((entry) => entry.slug);
              assert.ok(playable.length >= 6, "the Shelf's Pens");
              const slugs = await page
                .locator("[data-block-toggle]")
                .evaluateAll((els) =>
                  els.map(
                    (el) =>
                      el
                        .closest("article")
                        .querySelector("[data-part='lab.title']").dataset.ref,
                  ),
                );
              assert.deepEqual([...slugs].sort(), [...playable].sort());
              assert.equal(await framed(page).count(), 0);
              assert.deepEqual(asked, [], "asked of another site");
              for (const entry of content.lab.filter(
                (e) => e.href && !e.preview,
              ))
                assert.equal(
                  await button(page, entry.slug).count(),
                  0,
                  `${entry.slug} cannot be played in place`,
                );
            },
          ),
      );
    } finally {
      await browser.close();
      await server?.close();
    }
  },
);
