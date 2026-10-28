/** Browser: the prism costs nothing until the lure is caught. No stage and no
 * face loads on page load, even for a returning visitor whose lure is
 * docked, nor on hovering or focusing the lure. Catching it builds the faces,
 * each idle from its first frame, while the lure gathers light; once they
 * are ready the lure bursts and the prism opens. Same build, server and
 * Chromium as prism-parity.browser.mjs. */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { chromium } from "./lib/chromium.mjs";
import { serveRuntimeFixture } from "./lib/runtime-fixture.mjs";

const executable = chromium();
const skip = executable
  ? false
  : "no Chromium: set PRISM_CHROMIUM or install a Playwright headless shell";

/** What the page looks like at the moment the stage opens. */
const watchOpen = (page) =>
  page.evaluate(() => {
    new MutationObserver(() => {
      const stage = document.querySelector("#prism-stage.is-open");
      if (!stage || "atOpen" in window) return;
      const lure = document.getElementById("prism-lure");
      window.atOpen = {
        ready: [...stage.querySelectorAll("iframe")].map(
          (frame) => frame.contentDocument?.readyState === "complete",
        ),
        burst: !!lure?.classList.contains("is-caught"),
        gathering: !!lure?.classList.contains("is-gathering"),
      };
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributeFilter: ["class"],
    });
  });

test(
  "the lure loads the prism only when caught",
  { skip, timeout: 4 * 60_000 },
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
    const visit = async (
      path,
      { returning = false, reducedMotion = "reduce" } = {},
    ) => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        reducedMotion,
      });
      await context.addInitScript((returning) => {
        if (window === window.top) {
          if (returning) localStorage.setItem("prism:found", "1");
          return;
        }
        // A face: was it idle before any of its own script ran?
        addEventListener("DOMContentLoaded", () => {
          window.bornIdle =
            document.documentElement.hasAttribute("data-prism-idle");
        });
      }, returning);
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
    const nothingLoaded = async (page, faceRequests, why) => {
      assert.equal(await page.locator("#prism-stage").count(), 0, why);
      assert.equal(faceRequests.length, 0, `no face was requested: ${why}`);
    };
    try {
      browser = await browserType.launch({ executablePath: executable });

      await t.test("a docked lure loads nothing until caught", async () => {
        const { context, page, errors, faceRequests } = await visit(
          "/?lens=hion",
          { returning: true },
        );
        await page.waitForSelector("#prism-lure.is-docked");
        await page.waitForTimeout(1500);
        await nothingLoaded(page, faceRequests, "on page load");
        await page.hover("#prism-lure");
        await page.focus("#prism-lure");
        await page.waitForTimeout(800);
        await nothingLoaded(page, faceRequests, "on hover and focus");

        await watchOpen(page);
        await page.click("#prism-lure");
        // Caught: the lure gathers light while the faces load.
        assert.ok(
          await page.locator("#prism-lure.is-gathering[aria-busy]").count(),
          "the lure gathers light",
        );
        assert.equal(await page.locator("#prism-gather").count(), 1);
        await page.waitForSelector("#prism-stage.is-open", { timeout: 15000 });
        const atOpen = await page.evaluate(() => window.atOpen);
        assert.deepEqual(
          atOpen.ready,
          [true, true, true, true],
          "the camera waits for the four framed faces",
        );
        assert.ok(atOpen.burst && !atOpen.gathering, "the lure has burst");
        const born = await page.evaluate(() =>
          [...document.querySelectorAll("#prism-stage iframe")].map(
            (frame) => frame.contentWindow?.bornIdle,
          ),
        );
        assert.deepEqual(born, [true, true, true, true], "faces born idle");

        // Closing lets go of the lure and loads nothing more.
        await page.waitForFunction(
          () =>
            document.querySelector("#prism-stage")?.dataset.outside === "true",
        );
        await page.keyboard.press("Escape");
        await page.waitForSelector("#prism-stage", {
          state: "detached",
          timeout: 15000,
        });
        const before = faceRequests.length;
        await page.waitForTimeout(800);
        assert.equal(faceRequests.length, before, "no face reloaded on close");
        assert.equal(await page.locator("#prism-gather").count(), 0);
        assert.equal(
          await page
            .locator("#prism-lure.is-gathering, #prism-lure.is-caught")
            .count(),
          0,
          "the lure is released",
        );
        // And it can be caught again.
        await page.mouse.move(10, 10);
        await page.click("#prism-lure");
        await page.waitForSelector("#prism-stage.is-open", { timeout: 15000 });
        assert.deepEqual(errors, []);
        await context.close();
      });

      await t.test("a wild lure loads nothing until caught", async () => {
        const { context, page, errors, faceRequests } =
          await visit("/?prism=lure");
        await page.waitForSelector("#prism-lure[data-state='wild']", {
          timeout: 5000,
        });
        await page.focus("#prism-lure");
        await page.waitForTimeout(1000);
        await nothingLoaded(page, faceRequests, "on arrival and focus");
        // Keyboard: Enter always catches.
        await page.keyboard.press("Enter");
        await page.waitForSelector("#prism-stage.is-open", { timeout: 15000 });
        assert.deepEqual(errors, []);
        await context.close();
      });

      await t.test("the gathering light moves, then clears", async () => {
        const { context, page, errors } = await visit("/", {
          returning: true,
          reducedMotion: "no-preference",
        });
        await page.waitForSelector("#prism-lure.is-docked");
        // A scripted click, as ?prism=open does.
        await page.evaluate(() =>
          document.getElementById("prism-lure").click(),
        );
        const running = await page.evaluate(() =>
          document
            .getAnimations()
            .filter((a) => a.playState === "running")
            .map((a) => a.animationName),
        );
        assert.ok(running.includes("prism-gather"), "rings close in");
        assert.ok(running.includes("prism-drink"), "the glass takes them in");
        await page.waitForSelector("#prism-stage.is-open", { timeout: 15000 });
        await page.waitForSelector("#prism-gather", {
          state: "detached",
          timeout: 2000,
        });
        assert.deepEqual(errors, []);
        await context.close();
      });
    } finally {
      await browser?.close();
      await server?.close();
    }
  },
);
