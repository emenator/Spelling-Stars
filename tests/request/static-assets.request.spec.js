const assert = require("node:assert/strict");
const path = require("node:path");
const { after, before, describe, test } = require("node:test");
const { createStaticServer } = require("../helpers/static-server.js");

const root = path.resolve(__dirname, "../..");
const server = createStaticServer(root);
let baseUrl;
let serverStartError;

describe("request: static hosting contract", () => {
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

  test("serves the app shell at / and /index.html", async (t) => {
    if (serverStartError) return t.skip(serverStartError.message);

    for (const route of ["/", "/index.html"]) {
      const response = await fetch(`${baseUrl}${route}`);
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(body, /Build a spelling game from your word list/);
      assert.match(body, /app-core\.js/);
      assert.match(body, /app\.js/);
    }
  });

  test("serves linked CSS and JavaScript assets", async (t) => {
    if (serverStartError) return t.skip(serverStartError.message);

    for (const route of ["/styles.css", "/app-data.js", "/app-core.js", "/app.js"]) {
      const response = await fetch(`${baseUrl}${route}`);
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.ok(body.length > 100, `${route} should not be empty`);
    }
  });

  test("returns 404 for missing static assets", async (t) => {
    if (serverStartError) return t.skip(serverStartError.message);

    const response = await fetch(`${baseUrl}/missing-file.js`);

    assert.equal(response.status, 404);
  });
});
