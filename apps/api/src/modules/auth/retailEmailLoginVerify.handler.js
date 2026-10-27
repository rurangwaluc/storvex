"use strict";

const FAILURE = Object.freeze({
  message: "Invalid or expired verification code."
});

function createRetailEmailLoginVerifyHandler(deps) {
  const required = [
    "consumeChallenge",
    "findRetailUserById",
    "authorizeRetailLogin",
    "createRetailSession",
    "writeAuthenticatedResponse",
    "revokeRetailSession"
  ];

  if (
    !deps ||
    required.some(name => typeof deps[name] !== "function")
  ) {
    throw new TypeError(
      "All retail OTP verification security dependencies are required."
    );
  }

  return async function verifyRetailEmailLogin(req, res) {
    const fail = () => res.status(401).json(FAILURE);
    const body = req && req.body;

    if (
      !body ||
      typeof body.challengeId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        .test(body.challengeId) ||
      typeof body.code !== "string" ||
      !/^\d{6}$/.test(body.code)
    ) {
      return fail();
    }

    let session = null;
    let completed = false;

    try {
      // consumeChallenge MUST atomically consume the code
      // and return null for expired/replayed/exhausted codes.
      const consumed = await deps.consumeChallenge({
        challengeId: body.challengeId,
        code: body.code
      });

      if (
        !consumed ||
        consumed.challengeId !== body.challengeId ||
        typeof consumed.userId !== "string" ||
        !consumed.userId ||
        typeof consumed.email !== "string" ||
        !consumed.email
      ) {
        return fail();
      }

      // Never trust account status saved in a prior challenge.
      const user = await deps.findRetailUserById({
        userId: consumed.userId
      });

      if (
        !user ||
        user.id !== consumed.userId ||
        user.isActive !== true ||
        typeof user.email !== "string" ||
        user.email.trim().toLowerCase() !==
          consumed.email.trim().toLowerCase() ||
        typeof user.tenantId !== "string" ||
        !user.tenantId.trim()
      ) {
        return fail();
      }

      // This must enforce retail tenant/membership
      // authorization, not merely check the User record.
      const permitted = await deps.authorizeRetailLogin({
        user,
        tenantId: user.tenantId
      });

      if (permitted !== true) return fail();

      session = await deps.createRetailSession({
        user,
        tenantId: user.tenantId,
        request: req
      });

      // Reject incomplete session creation.
      if (
        !session ||
        typeof session.id !== "string" ||
        !session.id
      ) {
        return fail();
      }

      // Existing auth response/cookie conventions must be
      // applied through this adapter during later integration.
      // The handler itself does not manufacture a JWT.
      const response = await deps.writeAuthenticatedResponse({
        res,
        user,
        session
      });
      completed = true;
      return response;
    } catch {
      // Do not expose internal errors or whether the
      // challenge/account/tenant exists.
      return fail();
    } finally {
      if (session && !completed) {
        try {
          await deps.revokeRetailSession({ session });
        } catch {
          // Integration must separately monitor failed revocations.
        }
      }
    }
  };
}

module.exports = {
  createRetailEmailLoginVerifyHandler,
  FAILURE
};
