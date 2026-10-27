"use strict";

const { randomUUID } = require("node:crypto");
const {
  normalizeEmail,
  normalizeFullName
} = require("./accountSignupOtp.core");

function createAccountSignupRequestHandler({
  prisma,
  challengeService,
  sendEmailOtp,
  checkRateLimit,
  checkCooldown
}) {
  if (!prisma?.storvexAccount ||
      !prisma?.user ||
      typeof challengeService?.issue !== "function" ||
      typeof challengeService?.invalidate !== "function" ||
      typeof sendEmailOtp !== "function" ||
      typeof checkRateLimit !== "function" ||
      typeof checkCooldown !== "function") {
    throw new TypeError("Required signup dependencies missing.");
  }

  return async function accountSignupRequest(req, res) {
    let email;
    let fullName;

    try {
      email = normalizeEmail(req.body?.email);
      fullName = normalizeFullName(req.body?.fullName);
    } catch {
      return res.status(400).json({
        error: "Enter a valid full name and email address."
      });
    }

    // Return an opaque challenge reference even for ineligible
    // addresses, without creating an OTP or account.
    const publicResponse = {
      message: "If registration can proceed, a verification email will be sent.",
      challengeId: randomUUID()
    };

    try {
      const allowed = await checkRateLimit({ req, email });
      if (!allowed) {
        return res.status(429).json({
          error: "Too many requests. Please try again later."
        });
      }

      const cooldownAllowed = await checkCooldown({ email, req });
      if (!cooldownAllowed) {
        return res.status(202).json(publicResponse);
      }

      // An existing retailer must use the account linking/sign-in
      // journey. Never create a conflicting identity here.
      const existingRetailUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });

      if (existingRetailUser) {
        return res.status(202).json(publicResponse);
      }

      let account = await prisma.storvexAccount.findUnique({
        where: { email }
      });

      if (account?.emailVerifiedAt || account?.status === "ACTIVE") {
        return res.status(202).json(publicResponse);
      }

      if (!account) {
        try {
          account = await prisma.storvexAccount.create({
            data: {
              id: randomUUID(),
              fullName,
              email,
              status: "PENDING"
            }
          });
        } catch (error) {
          if (error.code !== "P2002") throw error;
          account = await prisma.storvexAccount.findUnique({
            where: { email }
          });
        }
      }

      if (!account || account.emailVerifiedAt ||
          account.status !== "PENDING") {
        return res.status(202).json(publicResponse);
      }

      const issued = await challengeService.issue({ account });
      const delivery = await sendEmailOtp({
        to: email,
        code: issued.code,
        ttlMinutes: 10
      });

      if (!delivery?.sent) {
        await challengeService.invalidate(issued.challengeId);
        return res.status(202).json(publicResponse);
      }

      // The challenge ID is public; the OTP itself is secret.
      return res.status(202).json({
        ...publicResponse,
        challengeId: issued.challengeId
      });
    } catch {
      return res.status(503).json({
        error: "Registration is temporarily unavailable."
      });
    }
  };
}

module.exports = { createAccountSignupRequestHandler };
