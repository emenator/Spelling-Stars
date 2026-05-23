const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function createStaticServer(rootDir) {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const resolved = path.resolve(rootDir, `.${pathname}`);

    if (!resolved.startsWith(rootDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const body = await fs.readFile(resolved);
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(resolved)] || "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });

  return {
    async start() {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timed out starting static server")), 1500);
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      server.unref();
      const address = server.address();
      return `http://127.0.0.1:${address.port}`;
    },
    async stop() {
      server.closeAllConnections?.();
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

module.exports = { createStaticServer };
