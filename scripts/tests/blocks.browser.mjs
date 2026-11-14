/** A page told with blocks (issue #133): Daylight draws every block on the
 * fixture experiment written with all of them, at a phone's width and a
 * desktop's, from the keyboard, and an embed or a model asks nothing of
 * anyone until it is pressed. Every other lens is handed the same blocks,
 * plus one of a kind no lens has heard of, and shows the page's prose
 * without tripping on them.
 *
 *   corepack pnpm@10.6.5 build && corepack pnpm@10.6.5 test:prism
 *
 * The fixture is src/content/fixtures/fixture-blocks.md; Daylight renders
 * it at /prism/fixtures/lab/fixture-blocks with the component /lab/<slug>
 * uses. Same server and Chromium as prism-parity.browser.mjs. Every request
 * to another site is refused here and noted, so a click on the Pen asks
 * CodePen for nothing. BLOCK_SHOTS=<dir> saves a full-page picture of the
 * page at each size. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
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
const SLUG = "fixture-blocks";
const PAGE = `/prism/fixtures/lab/${SLUG}`;
const SHELLS = ["calling-card", "cut-paper", "back-page", "hion"];
const SHOTS = process.env.BLOCK_SHOTS;

/** What a request asks for that only a pressed embed or model may: a
 * frame's page, a model's file, or the viewer. */
const LIVE =
  /\/prism\/fixtures\/(demo\.svg|cube\.glb|cloud\.splat)|codepen\.io|model-viewer|spark|three/;

/** The blocks Daylight shows, as a visitor finds them. */
const read = (page) =>
  page.evaluate(() => {
    const main = document.querySelector(".site-frame main");
    const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const all = (selector, root = main) => [
      ...(root?.querySelectorAll(selector) ?? []),
    ];
    return {
      blocks: all("[data-part^='block.']").map((el) => ({
        part: el.getAttribute("data-part"),
        ref: el.getAttribute("data-ref"),
        shown: el.checkVisibility(),
      })),
      text: (ref) => text(main.querySelector(`[data-ref="${ref}"]`)),
      frames: all("iframe").length,
      canvases: all("canvas").length,
      tooWide: all("*")
        .filter(
          (el) =>
            el.checkVisibility() &&
            el.getBoundingClientRect().right > window.innerWidth + 1,
        )
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
    };
  });

/** The words inside one block. */
const words = (page, name) =>
  page
    .locator(`[data-ref="${SLUG}/${name}"]`)
    .evaluate((el) => el.innerText.replace(/\s+/g, " ").trim());

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

test(
  "a page told with blocks, in every lens",
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
    const browser = await browserType.launch({
      executablePath: executable,
      // WebGL in a headless shell, for the model viewer.
      args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
    });
    const content = await (await fetch(`${base}/prism/content.json`)).json();
    const copy = content.site.blocks;
    const fixture = await (await fetch(`${base}${PAGE}.json`)).json();
    const named = fixture.blocks.filter((block) => block.name);

    /** Open the fixture's page at one size; `look` handles it. Every
     * request is noted, and one to another site is refused. */
    async function visit(path, options, look) {
      const context = await browser.newContext(options);
      const asked = [];
      await context.route("**/*", (route) => {
        const url = route.request().url();
        asked.push(url);
        return url.startsWith(base) ? route.continue() : route.abort();
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
        await look(page, asked);
        assert.deepEqual(errors, [], "console errors");
      } finally {
        await context.close();
      }
    }

    /** Scroll the whole page past the visitor, so everything lazy loads. */
    const scrollThrough = (page) =>
      page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((done) => setTimeout(done, 40));
        }
        window.scrollTo(0, 0);
      });

    /** Press a block's button from the keyboard: Tab onto it, as a
     * visitor would, then the key. */
    async function press(page, name, key = "Enter") {
      const button = page.locator(
        `[data-ref="${SLUG}/${name}"] [data-block-toggle]`,
      );
      await button.focus();
      assert.equal(
        await button.evaluate((el) => el === document.activeElement),
        true,
        `${name}'s button takes focus`,
      );
      await page.keyboard.press(key);
      return button;
    }
    const stage = (page, name) =>
      page.locator(`[data-ref="${SLUG}/${name}"] [data-block-stage]`);

    try {
      for (const [size, options] of Object.entries(SIZES)) {
        await t.test(`Daylight draws every block, in order (${size})`, () =>
          visit(
            PAGE,
            { ...options, reducedMotion: "reduce" },
            async (page, asked) => {
              await scrollThrough(page);
              const seen = await read(page);
              assert.deepEqual(
                seen.blocks,
                named.map((block) => ({
                  part: `block.${block.type}`,
                  ref: `${SLUG}/${block.name}`,
                  shown: true,
                })),
              );
              assert.deepEqual(seen.tooWide, [], "nothing runs off the side");
              // The prose between them, and no line that placed one.
              const body = await page
                .locator('[data-part="lab.body"]')
                .innerText();
              assert.match(body, /This experiment exists to show every block/);
              assert.doesNotMatch(body, /::[a-z]/);

              // What each says.
              assert.match(
                await words(page, "drawings"),
                /The finished drawing, every path measured first\..*An earlier try/,
              );
              assert.deepEqual(
                await page
                  .locator(`[data-ref="${SLUG}/drawings"] img`)
                  .evaluateAll((imgs) =>
                    imgs.map((img) => [img.alt, img.naturalWidth > 0]),
                  ),
                [
                  ["A lotus drawn in orange and blue lines", true],
                  ["Black and white shapes on a grid", true],
                  ["A grid of live and dead cells", true],
                ],
              );
              const redrawn = await words(page, "redrawn");
              assert.ok(redrawn.startsWith(copy.compare.before), redrawn);
              assert.match(
                redrawn,
                /A month later.*before and after I stopped/,
              );
              assert.match(
                await words(page, "the-trick"),
                /^const length = path\.getTotalLength\(\);.*The whole trick, in draw\.js\.$/,
              );
              assert.equal(
                await page
                  .locator(`[data-ref="${SLUG}/the-trick"] pre`)
                  .getAttribute("tabindex"),
                "0",
                "a long line can be scrolled to from the keyboard",
              );
              assert.equal(
                await words(page, "in-my-words"),
                "I wanted the line to look like it was being drawn, not revealed. A note to myself, Aug 2026",
              );
              assert.deepEqual(
                await page
                  .locator(`ol[data-ref="${SLUG}/how"] > li`)
                  .evaluateAll((items) =>
                    items.map((li) => li.innerText.replace(/\s+/g, " ").trim()),
                  ),
                [
                  "Measure Ask each path how long it is, with getTotalLength().",
                  "Hide the stroke by offsetting it by that length. Every stroke, hidden and waiting.",
                  "Draw Bring the offset back to zero, one path after another.",
                ],
              );
              assert.equal(
                await words(page, "files"),
                "lotus/ index.html draw.js measures, then draws paths/ petals.svg stem.svg README.md Where it lives.",
              );
              const tone = page.locator(`[data-ref="${SLUG}/the-tone"] audio`);
              assert.deepEqual(
                await tone.evaluate((el) => [el.controls, el.preload]),
                [true, "none"],
              );
              // Asked for less motion: the loop waits to be played.
              const loop = page.locator(`[data-ref="${SLUG}/the-loop"] video`);
              await loop.scrollIntoViewIfNeeded();
              await page.waitForTimeout(400);
              assert.deepEqual(
                await loop.evaluate((el) => [el.controls, el.loop, el.paused]),
                [true, true, true],
              );

              // Nothing live yet: no frame, no viewer, and nothing asked
              // for that only a press may ask for.
              assert.equal(seen.frames, 0);
              assert.equal(seen.canvases, 0);
              assert.deepEqual(
                asked.filter((url) => LIVE.test(url)),
                [],
                "asked before a press",
              );
              assert.deepEqual(
                asked.filter((url) => !url.startsWith(base)),
                [],
                "asked of another site",
              );

              if (SHOTS) {
                mkdirSync(SHOTS, { recursive: true });
                await page.screenshot({
                  path: join(SHOTS, `${SLUG}-${size}.png`),
                  fullPage: true,
                });
              }
            },
          ),
        );
      }

      await t.test(
        "an embed loads on a press from the keyboard, and goes on a second press or Escape",
        () =>
          visit(PAGE, SIZES.desktop, async (page, asked) => {
            const demo = stage(page, "the-demo");
            const button = await press(page, "the-demo");
            const frame = demo.locator("iframe");
            await frame.waitFor();
            assert.equal(
              await frame.getAttribute("src"),
              "/prism/fixtures/demo.svg",
            );
            assert.equal(await button.getAttribute("aria-pressed"), "true");
            assert.equal(await button.textContent(), copy.embed.close);
            await page
              .frameLocator(`[data-ref="${SLUG}/the-demo"] iframe`)
              .getByText("The fixture demo is running.")
              .waitFor();
            assert.ok(asked.some((url) => url.endsWith("/demo.svg")));

            // A second press puts it away, and its words come back.
            await page.keyboard.press(" ");
            assert.equal(await demo.locator("iframe").count(), 0);
            assert.equal(await button.getAttribute("aria-pressed"), "false");
            assert.equal(await button.textContent(), copy.embed.load.demo);
            assert.equal(
              (await demo.textContent()).trim(),
              "A demo that says it is running",
            );

            // Escape from within the block does too, and leaves the
            // focus on the button.
            await page.keyboard.press("Enter");
            await frame.waitFor();
            await page.keyboard.press("Escape");
            assert.equal(await demo.locator("iframe").count(), 0);
            assert.equal(
              await button.evaluate((el) => el === document.activeElement),
              true,
            );

            // The Pen's frame is its embed on CodePen: asked for on the
            // press, not before (and refused here).
            const pen = stage(page, "the-pen");
            assert.deepEqual(
              asked.filter((url) => /codepen/.test(url)),
              [],
            );
            assert.equal(
              await pen.locator("img").getAttribute("alt"),
              "The lotus drawing itself, one line at a time",
            );
            await press(page, "the-pen");
            assert.equal(
              await pen.locator("iframe").getAttribute("src"),
              "https://codepen.io/beejsbj/embed/abXZWLQ?default-tab=result",
            );
            await page.keyboard.press("Escape");
            assert.equal(await pen.locator("iframe").count(), 0);
            assert.equal(await pen.locator("img").count(), 1, "its poster");
          }),
      );

      await t.test(
        "a model's viewer is fetched on a press, shows the model, and goes again",
        () =>
          visit(PAGE, SIZES.desktop, async (page, asked) => {
            const status = (name) =>
              page.locator(`[data-ref="${SLUG}/${name}"] .block-stage__status`);
            for (const [name, file] of [
              ["cube", "/prism/fixtures/cube.glb"],
              ["cloud", "/prism/fixtures/cloud.splat"],
            ]) {
              const before = asked.length;
              const button = await press(page, name);
              const canvas = stage(page, name).locator("canvas");
              await canvas.waitFor();
              await page.waitForFunction(
                (ref) =>
                  !document
                    .querySelector(`[data-ref="${ref}"] [data-block-stage]`)
                    ?.hasAttribute("aria-busy"),
                `${SLUG}/${name}`,
                { timeout: 20_000 },
              );
              assert.equal(
                await status(name).textContent(),
                copy.model.hint,
                `${name} is showing`,
              );
              const now = asked.slice(before);
              assert.ok(
                now.some((url) => url.endsWith(file)),
                `${name}: ${file} asked for on the press`,
              );
              // From the keyboard: the canvas takes focus and the arrows
              // turn the model.
              await canvas.focus();
              await page.keyboard.press("ArrowLeft");
              await page.keyboard.press("Escape");
              assert.equal(
                await stage(page, name).locator("canvas").count(),
                0,
              );
              assert.equal(await button.getAttribute("aria-pressed"), "false");
              assert.equal(await status(name).textContent(), "");
            }
            assert.ok(asked.some((url) => /model-viewer/.test(url)));
          }),
      );

      await t.test(
        "a looping film plays by itself in view, unless asked for less motion",
        () =>
          visit(
            PAGE,
            { ...SIZES.phone, reducedMotion: "no-preference" },
            async (page) => {
              const loop = page.locator(`[data-ref="${SLUG}/the-loop"] video`);
              const take = page.locator(`[data-ref="${SLUG}/the-take"] video`);
              await loop.scrollIntoViewIfNeeded();
              await page.waitForFunction(
                (ref) =>
                  !document.querySelector(`[data-ref="${ref}"] video`)?.paused,
                `${SLUG}/the-loop`,
                { timeout: 5000 },
              );
              assert.equal(await loop.evaluate((el) => el.muted), true);
              await take.scrollIntoViewIfNeeded();
              await page.waitForTimeout(300);
              assert.equal(await take.evaluate((el) => el.paused), true);
            },
          ),
      );

      for (const lens of SHELLS)
        await t.test(
          `${lens} shows the prose and passes over blocks it does not draw`,
          () =>
            visit(
              `/prism/harness?lens=${lens}&fixture=lab-blocks&route=${encodeURIComponent(`/lab/${SLUG}`)}`,
              { ...SIZES.desktop, reducedMotion: "reduce" },
              async (page) => {
                await page.waitForFunction(() => window.prismHarness?.ready);
                const state = await page.evaluate(() => ({
                  error: window.prismHarness.error,
                  types: window.prismHarness.content.lab
                    .find((entry) => entry.slug === "fixture-blocks")
                    ?.blocks.map((block) => block.type),
                }));
                assert.equal(state.error, undefined);
                // Handed every kind of block, and one it cannot know.
                assert.deepEqual([...new Set(state.types)].sort(), [
                  "audio",
                  "code",
                  "compare",
                  "embed",
                  "film",
                  "gallery",
                  "hologram",
                  "model",
                  "quote",
                  "steps",
                  "text",
                  "tree",
                ]);
                await page.waitForSelector("html[data-shell-ready]");
                const body = page.locator('#lens-shell [data-part="lab.body"]');
                await body.first().waitFor();
                assert.match(
                  await body.first().textContent(),
                  /This experiment exists to show every block/,
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
