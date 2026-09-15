const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");

test("production app does not register the auth-test diagnostic route", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const appPath = require.resolve("../src/app");
  delete require.cache[appPath];
  const app = require(appPath);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    const result = await new Promise((resolve, reject) => {
      http.get({ hostname: "127.0.0.1", port: address.port, path: "/api/auth-test" }, (res) => {
        res.resume();
        res.on("end", () => resolve({ status: res.statusCode }));
      }).on("error", reject);
    });
    assert.equal(result.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    delete require.cache[appPath];
  }
});
