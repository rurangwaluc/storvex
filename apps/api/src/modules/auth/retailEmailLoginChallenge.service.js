"use strict";

const {
  generateCode,
  generateChallengeId,
  hashCode,
  verifyCode,
  normalizeEmail
} = require("./retailEmailLoginOtp.core");

const MAX_ATTEMPTS = 5;
const TTL_MS = 10 * 60 * 1000;

function delegate(db) {
  const model = db && db.retailEmailLoginChallenge;

  if (
    !model ||
    typeof model.create !== "function" ||
    typeof model.findUnique !== "function" ||
    typeof model.updateMany !== "function"
  ) {
    throw new TypeError("Challenge database delegate required.");
  }

  return model;
}

function validDate(now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("Valid date required.");
  }
  return now;
}

async function issueChallenge({
  db,
  userId,
  email,
  pepper,
  now = new Date()
}) {
  const model = delegate(db);
  const issuedAt = validDate(now);

  if (typeof userId !== "string" || !userId.trim()) {
    throw new TypeError("Retail user ID required.");
  }

  const normalizedEmail = normalizeEmail(email);
  const id = generateChallengeId();
  const code = generateCode();
  const expiresAt = new Date(issuedAt.getTime() + TTL_MS);

  const codeHash = hashCode({
    userId,
    email: normalizedEmail,
    challengeId: id,
    code,
    pepper
  });

  await model.create({
    data: {
      id,
      userId,
      email: normalizedEmail,
      codeHash,
      expiresAt,
      attempts: 0,
      consumedAt: null
    }
  });

  // Server-only result. Future handler must send the code
  // through the verified email provider, never to the client.
  return { challengeId: id, code, expiresAt };
}

async function consumeChallenge({
  db,
  challengeId,
  code,
  pepper,
  now = new Date()
}) {
  const model = delegate(db);
  const checkedAt = validDate(now);

  if (
    typeof challengeId !== "string" ||
    !challengeId.trim()
  ) {
    return null;
  }

  const row = await model.findUnique({
    where: { id: challengeId }
  });

  if (!row) return null;

  if (
    row.consumedAt !== null ||
    !(row.expiresAt instanceof Date) ||
    row.expiresAt.getTime() <= checkedAt.getTime() ||
    row.attempts >= MAX_ATTEMPTS
  ) {
    return null;
  }

  const valid = verifyCode({
    userId: row.userId,
    email: row.email,
    challengeId: row.id,
    code,
    pepper,
    expectedHash: row.codeHash
  });

  const where = {
    id: challengeId,
    userId: row.userId,
    email: row.email,
    codeHash: row.codeHash,
    consumedAt: null,
    expiresAt: { gt: checkedAt },
    attempts: { lt: MAX_ATTEMPTS }
  };

  if (!valid) {
    await model.updateMany({
      where,
      data: { attempts: { increment: 1 } }
    });
    return null;
  }

  // A conditional atomic update allows one winner only,
  // including when two correct submissions race.
  const result = await model.updateMany({
    where,
    data: { consumedAt: checkedAt }
  });

  if (result.count !== 1) return null;

  return {
    userId: row.userId,
    email: row.email,
    challengeId: row.id
  };
}

module.exports = {
  issueChallenge,
  consumeChallenge,
  MAX_ATTEMPTS,
  TTL_MS
};
