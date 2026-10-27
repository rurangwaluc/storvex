"use strict";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OTP = /^\d{6}$/;

function createAccountSignupVerifyHandler({
  prisma,
  challengeService,
  sessionService
}) {
  if (
    typeof prisma?.storvexAccountOtpChallenge?.findUnique !== "function" ||
    typeof challengeService?.consume !== "function" ||
    typeof sessionService?.create !== "function"
  ) {
    throw new TypeError("Signup verification dependencies missing.");
  }

  return async function accountSignupVerify(req, res) {
    const { challengeId, code } = req.body || {};

    const invalid = () => res.status(400).json({
      error: "Invalid or expired verification code."
    });

    if (
      typeof challengeId !== "string" ||
      !UUID.test(challengeId) ||
      typeof code !== "string" ||
      !OTP.test(code)
    ) {
      return invalid();
    }

    try {
      const challenge = await prisma.storvexAccountOtpChallenge.findUnique({
        where: { id: challengeId },
        select: { accountId: true }
      });

      if (!challenge) return invalid();

      const result = await challengeService.consume({
        accountId: challenge.accountId,
        challengeId,
        code
      });

      if (!result?.verified) return invalid();

      const session = await sessionService.create({
        accountId: result.accountId
      });

      // The HTTP transport and cookie policy are configured
      // by the route integration, not this domain handler.
      res.set("Cache-Control", "no-store");

      return res.status(200).json({
        verified: true,
        accountSessionToken: session.token,
        expiresAt: session.expiresAt.toISOString(),
        nextStep: "BUSINESS_ONBOARDING"
      });
    } catch {
      return res.status(503).json({
        error: "Verification is temporarily unavailable."
      });
    }
  };
}

module.exports = { createAccountSignupVerifyHandler };
