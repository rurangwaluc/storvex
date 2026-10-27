"use strict";

const { createAccountSignupRequestComposition } =
  require("./accountSignupRequest.composition");
const { createAccountSignupChallengeService } =
  require("./accountSignupChallenge.service");
const { createAccountSignupSessionService } =
  require("./accountSignupSession.service");
const { createAccountSignupVerifyHandler } =
  require("./accountSignupVerify.handler");
const { createAccountLoginRequestComposition } =
  require("./accountLoginRequest.composition");
const { createAccountLoginChallengeService } =
  require("./accountLoginChallenge.service");
const { createAccountLoginVerifyHandler } =
  require("./accountLoginVerify.handler");

const { loginProtection } =
  require("../../lib/security/loginProtection");
const { createRetailEmailLoginProtectionAdapter } =
  require("./retailEmailLoginProtection.adapter");

const COOKIE = "storvex_account_session";
const PATH = "/api/auth/account";
const MAX_AGE = 8 * 60 * 60 * 1000;

function readCookie(req) {
  const header = req.headers?.cookie || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === COOKIE) {
      return part.slice(index + 1).trim();
    }
  }
  return null;
}

function createAccountSignupApiHandlers({
  prisma,
  getClientIp,
  pepper = () => process.env.RETAIL_EMAIL_LOGIN_PEPPER,
  requestHandler,
  challengeService,
  sessionService,
  checkVerifyRateLimit
}) {
  if (!prisma) throw new TypeError("Prisma required.");

  const sessions = sessionService ||
    createAccountSignupSessionService({ prisma });

  const protection = createRetailEmailLoginProtectionAdapter({
    loginProtection
  });

  const verifyLimit = checkVerifyRateLimit ||
    (async ({ req, challengeId }) => {
      const reservation = await protection.begin({
        identifier: "account-signup-verify:" + challengeId,
        ip: getClientIp(req)
      });
      return (await reservation.failed()) === true;
    });

  function verificationHandler() {
    const secret = pepper();
    if (typeof secret !== "string" ||
        Buffer.byteLength(secret) < 32) return null;

    const challenges = challengeService ||
      createAccountSignupChallengeService({
        prisma, pepper: secret
      });

    return createAccountSignupVerifyHandler({
      prisma,
      challengeService: challenges,
      sessionService: sessions
    });
  }

  const request = requestHandler ||
    createAccountSignupRequestComposition({
      prisma, getClientIp
    });

  let accountLoginRequestHandler = null;

  async function loginRequest(req, res) {
    if (!accountLoginRequestHandler) {
      if (typeof getClientIp !== "function") {
        return res.status(503).json({
          error: "Email sign-in is temporarily unavailable."
        });
      }

      accountLoginRequestHandler =
        createAccountLoginRequestComposition({
          prisma, getClientIp
        });
    }

    return accountLoginRequestHandler(req, res);
  }

  function cookieOptions(req) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || req.secure === true,
      sameSite: "lax",
      path: PATH,
      maxAge: MAX_AGE
    };
  }

  function rejectCrossSite(req, res) {
    const origin = req.get?.("origin");
    if (!origin) return false;

    const host = req.get("host");
    const protocol = req.protocol;

    if (!host || !["http", "https"].includes(protocol) ||
        origin !== `${protocol}://${host}`) {
      res.status(403).json({
        error: "Request origin not permitted."
      });
      return true;
    }
    return false;
  }

  return {
    request,
    loginRequest,

    async loginVerify(req, res) {
      if (rejectCrossSite(req, res)) return;

      res.set("Cache-Control", "no-store");

      let allowed;
      try {
        const challengeId =
          typeof req.body?.challengeId === "string"
            ? req.body.challengeId
            : "invalid-challenge";

        const reservation = await protection.begin({
          identifier: "account-login-verify:" + challengeId,
          ip: getClientIp(req)
        });

        allowed = (await reservation.failed()) === true;
      } catch {
        return res.status(503).json({
          error: "Email sign-in is temporarily unavailable."
        });
      }

      if (!allowed) {
        return res.status(429).json({
          error: "Too many attempts. Please try again later."
        });
      }

      const secret = pepper();

      if (
        typeof secret !== "string" ||
        Buffer.byteLength(secret) < 32
      ) {
        return res.status(503).json({
          error: "Email sign-in is temporarily unavailable."
        });
      }

      const challenges = createAccountLoginChallengeService({
        prisma,
        pepper: secret
      });

      const verify = createAccountLoginVerifyHandler({
        prisma,
        challengeService: challenges,
        sessionService: sessions
      });

      const bridge = {
        status(code) {
          this.code = code;
          return this;
        },
        set() {
          return this;
        },
        json(body) {
          if (this.code !== 200) {
            return res.status(this.code).json(body);
          }

          const {
            accountSessionToken,
            ...publicBody
          } = body;

          if (
            typeof accountSessionToken !== "string" ||
            !/^[a-f0-9]{64}$/.test(accountSessionToken)
          ) {
            return res.status(503).json({
              error: "Email sign-in is temporarily unavailable."
            });
          }

          res.cookie(
            COOKIE,
            accountSessionToken,
            cookieOptions(req)
          );

          res.set("Cache-Control", "no-store");
          return res.status(200).json(publicBody);
        }
      };

      return verify(req, bridge);
    },

    async verify(req, res) {
      if (rejectCrossSite(req, res)) return;

      res.set("Cache-Control", "no-store");

      try {
        const challengeId =
          typeof req.body?.challengeId === "string"
            ? req.body.challengeId
            : "invalid-challenge";

        const allowed = await verifyLimit({
          req,
          challengeId
        });

        if (!allowed) {
          return res.status(429).json({
            error: "Too many attempts. Please try again later."
          });
        }
      } catch {
        return res.status(503).json({
          error: "Verification is temporarily unavailable."
        });
      }

      const verify = verificationHandler();
      if (!verify) {
        return res.status(503).json({
          error: "Verification is temporarily unavailable."
        });
      }

      // Capture the internal verification response so the token
      // never appears in the public JSON body.
      const bridge = {
        status(code) { this.code = code; return this; },
        set() { return this; },
        json(body) {
          if (this.code !== 200) {
            return res.status(this.code).json(body);
          }

          const { accountSessionToken, ...publicBody } = body;
          res.cookie(
            COOKIE,
            accountSessionToken,
            cookieOptions(req)
          );
          res.set("Cache-Control", "no-store");
          return res.status(200).json(publicBody);
        }
      };

      return verify(req, bridge);
    },

    async me(req, res) {
      res.set("Cache-Control", "no-store");
      try {
        const actor = await sessions.authenticate(readCookie(req));
        if (!actor) {
          return res.status(401).json({
            error: "Account authentication required."
          });
        }
        return res.status(200).json({ account: actor });
      } catch {
        return res.status(503).json({
          error: "Account session unavailable."
        });
      }
    },

    async logout(req, res) {
      if (rejectCrossSite(req, res)) return;

      try {
        const token = readCookie(req);
        if (token) await sessions.revoke(token);

        res.clearCookie(COOKIE, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production" || req.secure === true,
          sameSite: "lax",
          path: PATH
        });
        res.set("Cache-Control", "no-store");

        return res.status(200).json({ loggedOut: true });
      } catch {
        return res.status(503).json({
          error: "Account logout unavailable."
        });
      }
    }
  };
}

module.exports = { createAccountSignupApiHandlers };
