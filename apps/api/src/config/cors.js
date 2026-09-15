const PRODUCTION_ORIGINS = new Set([
  "https://www.storvex.rw",
  "https://storvex.rw",
]);

const DEVELOPMENT_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function configuredOrigins(env = process.env) {
  return String(env.CORS_ALLOWED_ORIGINS || env.FRONTEND_URL || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function isCorsOriginAllowed(origin, env = process.env) {
  if (!origin) return true;
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  if (env.NODE_ENV === "production") return false;
  return DEVELOPMENT_ORIGINS.has(origin) || configuredOrigins(env).includes(origin);
}

function corsOptions(env = process.env) {
  return {
    origin(origin, callback) {
      callback(null, isCorsOriginAllowed(origin, env));
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Accept",
      "Content-Type",
      "x-branch-id",
      "x-storvex-onboarding-token",
    ],
    credentials: false,
  };
}

function shouldExposeAuthTest(env = process.env) {
  return env.NODE_ENV !== "production";
}

module.exports = {
  PRODUCTION_ORIGINS,
  DEVELOPMENT_ORIGINS,
  isCorsOriginAllowed,
  corsOptions,
  shouldExposeAuthTest,
};
