const assert = require("node:assert/strict");
const path = require("node:path");
const { after, before, describe, test } = require("node:test");
const { createStaticServer } = require("../helpers/static-server.js");

const root = path.resolve(__dirname, "../..");
const server = createStaticServer(root);
let baseUrl;
let playwright;
let serverStartError;

async function loadPlaywright(t) {
  try {
    playwright = require("playwright");
    return true;
  } catch {
    t.skip("Playwright is not installed; run `npm install --save-dev playwright` to enable E2E specs.");
    return false;
  }
}

describe("e2e: classroom game flow", () => {
  before(async () => {
    try {
      baseUrl = await server.start();
    } catch (error) {
      serverStartError = error;
    }
  });

  after(async () => {
    if (baseUrl) await server.stop();
  });

  test("teacher can generate, reveal, and advance a classroom question", async (t) => {
    if (serverStartError) return t.skip(serverStartError.message);
    if (!(await loadPlaywright(t))) return;

    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(baseUrl);
      await page.getByRole("button", { name: "Try sample list" }).click();
      await assert.equal(await page.locator("#questionCount").textContent(), "25 kept");

      await page.getByRole("button", { name: "Start game" }).click();
      await assert.equal(await page.locator("#progressText").textContent(), "Question 1 of 25");
      await assert.equal(await page.locator("#classroomModeButton").evaluate((node) => node.classList.contains("active")), true);
      await assert.equal(await page.locator("#nextButton").isDisabled(), true);

      await page.getByRole("button", { name: "Reveal answer" }).click();
      await assert.match(await page.locator("#feedback").textContent(), /Answer:|Correct:/);
      await assert.equal(await page.locator("#nextButton").isDisabled(), false);

      await page.locator("#nextButton").click();
      await assert.equal(await page.locator("#progressText").textContent(), "Question 2 of 25");
    } finally {
      await browser.close();
    }
  });

  test("visual toggle hides visual clues except on image-only questions", async (t) => {
    if (serverStartError) return t.skip(serverStartError.message);
    if (!(await loadPlaywright(t))) return;

    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    try {
      await page.goto(baseUrl);
      await page.getByRole("button", { name: "Try sample list" }).click();
      await page.getByRole("button", { name: "Start game" }).click();

      await page.locator("#visualToggleButton").click();
      await assert.equal(await page.locator("#promptEmoji").textContent(), "");

      for (let attempts = 0; attempts < 30; attempts += 1) {
        if ((await page.locator("#questionType").textContent()) === "What word is this?") break;
        await page.locator("#cornerNextButton").click();
      }

      await assert.equal(await page.locator("#questionType").textContent(), "What word is this?");
      await assert.notEqual(await page.locator("#promptEmoji").textContent(), "");
    } finally {
      await browser.close();
    }
  });
});
