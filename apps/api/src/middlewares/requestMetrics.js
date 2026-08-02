const { performance } = require("node:perf_hooks");

const TRACKED_API_PREFIXES = Object.freeze([
  "/api/marketplace",
  "/api/dashboard",
  "/api/inventory",
  "/api/customers",
  "/api/suppliers",
]);

function environmentFlag(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === "true";
}

function normalizeMetricPath(path) {
  const segments = String(path || "/")
    .split("/")
    .filter(Boolean);

  if (
    segments[0] === "api" &&
    segments[1] === "suppliers" &&
    segments.length >= 3
  ) {
    segments[2] = ":id";
  }

  if (
    segments[0] === "api" &&
    segments[1] === "customers" &&
    segments.length >= 3
  ) {
    segments[2] = ":id";
  }

  if (
    segments[0] === "api" &&
    segments[1] === "inventory" &&
    segments[2] === "products" &&
    segments.length >= 4
  ) {
    segments[3] = ":id";
  }

  if (
    segments[0] === "api" &&
    segments[1] === "marketplace" &&
    segments[2] === "stores" &&
    segments.length >= 4
  ) {
    segments[3] = ":storeSlug";

    if (
      segments[4] === "products" &&
      segments.length >= 6
    ) {
      segments[5] = ":productSlug";
    }
  }

  return `/${segments.join("/")}` || "/";
}

function requestPath(req) {
  const originalUrl = String(req?.originalUrl || req?.url || "");
  const pathname = originalUrl.split("?")[0] || "/";

  return normalizeMetricPath(pathname);
}

function shouldTrackRequest(req) {
  if (String(req?.method || "").toUpperCase() === "OPTIONS") {
    return false;
  }

  const path = requestPath(req);

  return TRACKED_API_PREFIXES.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}/`),
  );
}

function numericHeader(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : null;
}

function responseHeader(res, name) {
  if (typeof res?.getHeader !== "function") {
    return undefined;
  }

  return res.getHeader(name);
}

function defaultLogger(metric) {
  console.info(JSON.stringify(metric));
}

function createRequestMetricsMiddleware({
  enabled = environmentFlag(
    process.env.API_METRICS_ENABLED,
  ),
  logger = defaultLogger,
  now = () => performance.now(),
} = {}) {
  return function requestMetrics(req, res, next) {
    if (!enabled || !shouldTrackRequest(req)) {
      next();
      return;
    }

    const startedAt = now();

    res.once("finish", () => {
      const durationMs = Number(
        (now() - startedAt).toFixed(2),
      );

      const metric = {
        event: "api_request_metric",
        timestamp: new Date().toISOString(),
        method: String(req.method || "GET").toUpperCase(),
        path: requestPath(req),
        statusCode: Number(res.statusCode || 0),
        durationMs,
        responseBytes: numericHeader(
          responseHeader(res, "content-length"),
        ),
        contentType:
          String(
            responseHeader(res, "content-type") || "",
          ).split(";")[0] || null,
      };

      try {
        logger(metric);
      } catch (error) {
        console.warn(
          "API metrics logger failed:",
          error?.message || error,
        );
      }
    });

    next();
  };
}

const requestMetrics =
  createRequestMetricsMiddleware();

module.exports = requestMetrics;
module.exports.TRACKED_API_PREFIXES =
  TRACKED_API_PREFIXES;
module.exports.createRequestMetricsMiddleware =
  createRequestMetricsMiddleware;
module.exports.normalizeMetricPath =
  normalizeMetricPath;
module.exports.requestPath = requestPath;
module.exports.shouldTrackRequest =
  shouldTrackRequest;
