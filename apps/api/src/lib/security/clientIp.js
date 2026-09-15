const net = require("node:net");

const MAX_IP_LENGTH = 64;

function normalizeClientIp(value) {
  if (Array.isArray(value)) return null;
  let candidate = value;
  candidate = String(candidate || "").trim();

  if (!candidate || candidate.includes(",")) return null;
  if (candidate.startsWith("::ffff:")) candidate = candidate.slice(7);
  if (candidate.length > MAX_IP_LENGTH || !net.isIP(candidate)) return null;

  return candidate;
}

function isRailwayProduction(env = process.env) {
  return env.NODE_ENV === "production" && Boolean(
    env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID,
  );
}

function getClientIp(req, env = process.env) {
  if (isRailwayProduction(env)) {
    const railwayIp = normalizeClientIp(req?.headers?.["x-real-ip"]);
    return railwayIp || null;
  }

  return (
    normalizeClientIp(req?.socket?.remoteAddress) ||
    normalizeClientIp(req?.ip) ||
    null
  );
}

module.exports = {
  MAX_IP_LENGTH,
  normalizeClientIp,
  isRailwayProduction,
  getClientIp,
};
