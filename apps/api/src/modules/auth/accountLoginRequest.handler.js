"use strict";

const { randomUUID } = require("node:crypto");
const { normalizeEmail } = require("./accountSignupOtp.core");

const PUBLIC_MESSAGE =
  "If the account is eligible, a verification code will be sent.";

function createAccountLoginRequestHandler({
  prisma,
  challengeService,
  checkRateLimit,
  checkCooldown,
  sendEmailOtp
}) {
  if (
    typeof prisma?.storvexAccount?.findUnique !== "function" ||
    typeof challengeService?.issue !== "function" ||
    typeof challengeService?.invalidate !== "function" ||
    typeof checkRateLimit !== "function" ||
    typeof checkCooldown !== "function" ||
    typeof sendEmailOtp !== "function"
  ) {
    throw new TypeError("Account login dependencies required.");
  }

  return async function accountLoginRequest(req, res) {
    // Public response must not disclose account existence.
    const response = {
      message: PUBLIC_MESSAGE,
      challengeId: randomUUID()
    };

    const respond = () => res.status(202).json(response);

    let email;

    try {
      email = normalizeEmail(req.body?.email);
    } catch {
      return respond();
    }

    try {
      const allowed = await checkRateLimit({ req, email });

      if (allowed !== true) {
        return res.status(429).json({
          error: "Too many requests. Please try again later."
        });
      }

      const cooldown = await checkCooldown({ req, email });

      if (cooldown !== true) return respond();

      const account = await prisma.storvexAccount.findUnique({
        where: { email }
      });

      if (
        !account ||
        account.email !== email ||
        account.status !== "ACTIVE" ||
        !account.emailVerifiedAt
      ) {
        return respond();
      }

      let issued;

      try {
        issued = await challengeService.issue({ account });

        if (
          typeof issued?.challengeId !== "string" ||
          typeof issued?.code !== "string" ||
          !(issued?.expiresAt instanceof Date)
        ) {
          throw new Error("Incomplete challenge.");
        }

        const delivery = await sendEmailOtp({
          to: email,
          code: issued.code,
          ttlMinutes: Math.max(
            1,
            Math.ceil(
              (issued.expiresAt.getTime() - Date.now()) / 60000
            )
          )
        });

        if (delivery?.sent !== true) {
          return respond();
        }

        response.challengeId = issued.challengeId;
        return respond();
      } finally {
        // On a failed delivery or incomplete issuance, the
        // public fake challenge remains unusable.
        if (
          issued?.challengeId &&
          response.challengeId !== issued.challengeId
        ) {
          await challengeService.invalidate(issued.challengeId)
            .catch(() => {});
        }
      }
    } catch {
      return res.status(503).json({
        error: "Email sign-in is temporarily unavailable."
      });
    }
  };
}

module.exports = {
  createAccountLoginRequestHandler,
  PUBLIC_MESSAGE
};
