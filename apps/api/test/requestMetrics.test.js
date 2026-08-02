const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const {
  TRACKED_API_PREFIXES,
  createRequestMetricsMiddleware,
  requestPath,
  shouldTrackRequest,
} = require(
  "../src/middlewares/requestMetrics",
);

function response({
  statusCode = 200,
  headers = {},
} = {}) {
  const res = new EventEmitter();

  res.statusCode = statusCode;
  res.getHeader = (name) =>
    headers[String(name).toLowerCase()];

  return res;
}

test(
  "tracks only the approved API route families",
  () => {
    assert.deepEqual(
      TRACKED_API_PREFIXES,
      [
        "/api/marketplace",
        "/api/dashboard",
        "/api/inventory",
        "/api/customers",
        "/api/suppliers",
      ],
    );

    assert.equal(
      shouldTrackRequest({
        method: "GET",
        originalUrl:
          "/api/marketplace/products?page=2",
      }),
      true,
    );

    assert.equal(
      shouldTrackRequest({
        method: "GET",
        originalUrl: "/api/dashboard",
      }),
      true,
    );

    assert.equal(
      shouldTrackRequest({
        method: "GET",
        originalUrl: "/api/auth/me",
      }),
      false,
    );

    assert.equal(
      shouldTrackRequest({
        method: "OPTIONS",
        originalUrl: "/api/inventory",
      }),
      false,
    );
  },
);

test(
  "removes query values from the recorded path",
  () => {
    assert.equal(
      requestPath({
        originalUrl:
          "/api/customers?search=private-value&page=1",
      }),
      "/api/customers",
    );
  },
);

test(
  "records a completed request without sensitive input",
  () => {
    const metrics = [];
    const times = [100, 112.346];

    const middleware =
      createRequestMetricsMiddleware({
        enabled: true,
        logger: (metric) => {
          metrics.push(metric);
        },
        now: () => times.shift(),
      });

    const req = {
      method: "GET",
      originalUrl:
        "/api/marketplace/products?search=television",
      headers: {
        authorization: "Bearer private-token",
      },
      body: {
        privateValue: "must-not-be-logged",
      },
    };

    const res = response({
      statusCode: 200,
      headers: {
        "content-length": "321",
        "content-type":
          "application/json; charset=utf-8",
      },
    });

    let nextCalls = 0;

    middleware(req, res, () => {
      nextCalls += 1;
    });

    res.emit("finish");

    assert.equal(nextCalls, 1);
    assert.equal(metrics.length, 1);

    assert.deepEqual(
      {
        event: metrics[0].event,
        method: metrics[0].method,
        path: metrics[0].path,
        statusCode: metrics[0].statusCode,
        durationMs: metrics[0].durationMs,
        responseBytes: metrics[0].responseBytes,
        contentType: metrics[0].contentType,
      },
      {
        event: "api_request_metric",
        method: "GET",
        path: "/api/marketplace/products",
        statusCode: 200,
        durationMs: 12.35,
        responseBytes: 321,
        contentType: "application/json",
      },
    );

    const serialized = JSON.stringify(metrics[0]);

    assert.equal(
      serialized.includes("private-token"),
      false,
    );
    assert.equal(
      serialized.includes("private-value"),
      false,
    );
    assert.equal(
      serialized.includes("television"),
      false,
    );
  },
);

test(
  "does nothing when measurements are disabled",
  () => {
    const metrics = [];

    const middleware =
      createRequestMetricsMiddleware({
        enabled: false,
        logger: (metric) => {
          metrics.push(metric);
        },
      });

    const req = {
      method: "GET",
      originalUrl: "/api/dashboard",
    };

    const res = response();

    let nextCalls = 0;

    middleware(req, res, () => {
      nextCalls += 1;
    });

    res.emit("finish");

    assert.equal(nextCalls, 1);
    assert.equal(metrics.length, 0);
  },
);
