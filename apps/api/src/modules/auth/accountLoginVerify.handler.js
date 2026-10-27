"use strict";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OTP = /^\d{6}$/;

function createAccountLoginVerifyHandler({
  prisma,
  challengeService,
  sessionService
}) {
  if (
    typeof prisma?.storvexAccountOtpChallenge?.findUnique !== "function" ||
    typeof challengeService?.consume !== "function" ||
    typeof sessionService?.create !== "function"
  ) {
    throw new TypeError(
      "Account login verification dependencies required."
    );
  }

  return async function accountLoginVerify(req, res) {
    const { challengeId, code } = req.body || {};

    res.set("Cache-Control", "no-store");

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
      const challenge =
        await prisma.storvexAccountOtpChallenge.findUnique({
          where: { id: challengeId },
          select: {
            accountId: true,
            purpose: true
          }
        });

      if (
        !challenge ||
        challenge.purpose !== "LOGIN"
      ) {
        return invalid();
      }

      const result = await challengeService.consume({
        accountId: challenge.accountId,
        challengeId,
        code
      });

      if (
        result?.verified !== true ||
        result.accountId !== challenge.accountId
      ) {
        return invalid();
      }

      const session = await sessionService.create({
        accountId: result.accountId
      });

      // This is an internal result.
      // The API transport layer must move the token
      // into an HttpOnly cookie before replying publicly.
      return res.status(200).json({
        authenticated: true,
        accountSessionToken: session.token,
        expiresAt: session.expiresAt.toISOString(),
        nextStep: "BUSINESS_ONBOARDING"
      });
    } catch {
      return res.status(503).json({
        error: "Email sign-in is temporarily unavailable."
      });
    }
  };
}

module.exports = {
  createAccountLoginVerifyHandler
};
