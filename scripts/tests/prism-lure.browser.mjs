/** Browser: the prism costs nothing until the visitor reaches for the lure.
 * No stage and no face loads on page load, even for a returning visitor
 * whose lure is docked; reaching for it builds the five faces, each idle
 * from its first frame; catching it opens the prism and wakes the face in
 * front. Same build, server and Chromium as prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

const faces = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#prism-stage iframe")].map((frame) => ({
      src: frame.getAttribute("src"),
      idle: !!frame.contentDocument?.documentElement.hasAttribute(
        "data-prism-idle",
      ),
    })),
  );

test(
  "the lure loads the prism only on intent",
  { skip, timeout: 3 * 60_000 },
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
    let browser;
    const visit = async (path, { returning = false } = {}) => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        reducedMotion: "reduce",
      });
      if (returning)
        await context.addInitScript(() => {
          if (window === window.top) localStorage.setItem("prism:found", "1");
        });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const faceRequests = [];
      page.on("request", (request) => {
        if (request.url().includes("prism-face=")) faceRequests.push(request);
      });
      await page.goto(`${base}${path}`, { waitUntil: "load" });
      return { context, page, errors, faceRequests };
    };
    try {
      browser = await browserType.launch({ executablePath: executable });
      await t.test(
        "a docked lure loads nothing until reached for",
        async () => {
          const { context, page, errors, faceRequests } = await visit(
            "/?lens=hion",
            { returning: true },
          );
          await page.waitForSelector("#prism-lure.is-docked");
          await page.waitForTimeout(1500);
          assert.equal(await page.locator("#prism-stage").count(), 0);
          assert.equal(faceRequests.length, 0, "no face was requested");

          await page.hover("#prism-lure");
          await page.waitForSelector("#prism-stage", { state: "attached" });
          await page.waitForFunction(
            () =>
              [...document.querySelectorAll("#prism-stage iframe")].every(
                (frame) => frame.contentDocument?.readyState === "complete",
              ),
            null,
            { timeout: 15000 },
          );
          const built = await faces(page);
          assert.equal(built.length, 5, "five faces");
          assert.ok(
            built.every((face) => face.idle),
            "every face is idle until the stage opens",
          );

          await page.click("#prism-lure");
          await page.waitForSelector("#prism-stage.is-open", {
            timeout: 15000,
          });
          await page.waitForFunction(
            () =>
              document.querySelector("#prism-stage")?.dataset.outside ===
              "true",
          );
          await page.waitForTimeout(200);
          const open = await faces(page);
          assert.equal(
            open.filter((face) => !face.idle).length,
            1,
            "only the face in front is awake",
          );

          // Closing hands focus back to the lure; that is not a new reach.
          await page.keyboard.press("Escape");
          await page.waitForSelector("#prism-stage", {
            state: "detached",
            timeout: 15000,
          });
          const before = faceRequests.length;
          await page.waitForTimeout(800);
          assert.equal(await page.locator("#prism-stage").count(), 0);
          assert.equal(
            faceRequests.length,
            before,
            "no face reloaded on close",
          );
          // Reaching again builds the stage again.
          await page.mouse.move(10, 10);
          await page.hover("#prism-lure");
          await page.waitForSelector("#prism-stage", { state: "attached" });
          assert.equal((await faces(page)).length, 5);
          assert.deepEqual(errors, []);
          await context.close();
        },
      );

      await t.test("a wild lure loads nothing until reached for", async () => {
        const { context, page, errors, faceRequests } =
          await visit("/?prism=lure");
        await page.waitForSelector("#prism-lure[data-state='wild']", {
          timeout: 5000,
        });
        await page.waitForTimeout(1000);
        assert.equal(await page.locator("#prism-stage").count(), 0);
        assert.equal(faceRequests.length, 0, "no face was requested");
        // Keyboard: focus is intent; Enter always catches.
        await page.focus("#prism-lure");
        await page.waitForSelector("#prism-stage", { state: "attached" });
        await page.keyboard.press("Enter");
        await page.waitForSelector("#prism-stage.is-open", { timeout: 15000 });
        assert.deepEqual(errors, []);
        await context.close();
      });

      await t.test("a catch with no reach first builds the stage", async () => {
        const { context, page, errors, faceRequests } = await visit("/", {
          returning: true,
        });
        await page.waitForSelector("#prism-lure.is-docked");
        // When the stage opens, note whether every face had loaded.
        await page.evaluate(() => {
          new MutationObserver(() => {
            const stage = document.querySelector("#prism-stage.is-open");
            if (!stage || "facesReady" in window) return;
            window.facesReady = [...stage.querySelectorAll("iframe")].map(
              (frame) => frame.contentDocument?.readyState === "complete",
            );
          }).observe(document.body, {
            subtree: true,
            childList: true,
            attributeFilter: ["class"],
          });
        });
        assert.equal(faceRequests.length, 0, "no face was requested");
        // A scripted click, as ?prism=open does: no pointer, no focus.
        await page.evaluate(() =>
          document.getElementById("prism-lure").click(),
        );
        await page.waitForSelector("#prism-stage.is-open", { timeout: 15000 });
        const ready = await page.evaluate(() => window.facesReady);
        assert.deepEqual(
          ready,
          [true, true, true, true, true],
          "the camera waits for all five faces",
        );
        assert.deepEqual(errors, []);
        await context.close();
      });
    } finally {
      await browser?.close();
      await server?.close();
    }
  },
);
