const express = require("express");

const prisma = require("../../config/database");
const {
  assertOnboardingAccess,
  publicOnboardingError,
} = require("./onboardingIntent.security");

const router = express.Router();

const authController = require("./auth.controller");
const {
  createAccountBusinessCompletionGuard,
} = require("./accountBusinessCompletion.guard");
const { createRetailEmailLoginApiHandlers } =
  require("./retailEmailLoginApi.handlers");
const { createAccountSignupApiHandlers } =
  require("./accountSignupApi.handlers");
const { createUnifiedLoginApiHandlers } =
  require("./unifiedLoginApi.handlers");
const { createAccountWorkspaceSessionHandler } =
  require("./accountWorkspaceSession.handler");
const logoutController = require("./logout.controller");
const momoService = require("./momo.service");
const paymentController = require("./payment.controller");
const otpController = require("./otp.controller");
const meController = require("./me.controller");
const passwordResetController = require("./passwordReset.controller");

const authenticate = require("../../middlewares/authenticate");
const { getPaidPlans, getTrialDays } = require("../../config/plans");
const { listPublicMarkets } = require("../../config/markets");
const {
  getOnboardingCatalogueForMarket,
} = require("../../config/subscriptions/pricing");
const {
  requestCountryHint,
} = require("../../lib/geo/countryHint");

// ---------- helpers ----------
function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(text)) return true;
    if (["false", "0", "no", "off"].includes(text)) return false;
  }

  return fallback;
}

function isPaymentTestingMode() {
  return toBool(
    process.env.MOMO_TEST_MODE ??
      process.env.MOMO_MOCK_MODE ??
      process.env.MTN_MOMO_MOCK_MODE,
    false
  );
}

function isMockPaymentResult(result) {
  return Boolean(
    isPaymentTestingMode() ||
      result?.testingMode ||
      result?.mock ||
      result?.provider?.mock ||
      String(result?.provider?.targetEnvironment || "").toLowerCase() === "mock" ||
      String(result?.provider?.environment || "").toLowerCase() === "mock"
  );
}

async function getOwnerSignupPaymentStatus(req, res) {
  const intentId = cleanString(
    req.query.intentId ||
      req.body?.intentId,
  );

  const reference = cleanString(
    req.params.reference ||
      req.query.reference ||
      req.body?.reference,
  );

  if (!intentId || !reference) {
    return res.status(400).json({
      message: "intentId and reference are required",
    });
  }

  try {
    const intent = await prisma.ownerIntent.findUnique({
      where: {
        id: intentId,
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        onboardingTokenHash: true,
        onboardingTokenExpiresAt: true,
        onboardingTokenRevokedAt: true,
      },
    });

    assertOnboardingAccess(req, intent);

    await prisma.ownerIntent
      .update({
        where: {
          id: intent.id,
        },
        data: {
          lastAccessedAt: new Date(),
        },
        select: {
          id: true,
        },
      })
      .catch(() => null);

    const payment = await prisma.payment.findFirst({
      where: {
        intentId: intent.id,
        reference,
        purpose: "OWNER_SIGNUP",
      },
      select: {
        reference: true,
        status: true,
        amount: true,
        currency: true,
        planKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment request not found",
      });
    }

    return res.json({
      payment: {
        reference: payment.reference,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        planKey: payment.planKey,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    });
  } catch (err) {
    const publicError = publicOnboardingError(
      err,
      "We could not check the payment. Please try again.",
    );

    return res
      .status(publicError.status)
      .json(publicError.body);
  }
}

async function createOwnerPayment(req, res) {
  const { intentId, phone, planKey } = req.body || {};

  if (!intentId || !phone || !planKey) {
    return res.status(400).json({
      message: "intentId, planKey, phone required",
    });
  }

  try {
    const intent = await prisma.ownerIntent.findUnique({
      where: {
        id: cleanString(intentId),
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        onboardingTokenHash: true,
        onboardingTokenExpiresAt: true,
        onboardingTokenRevokedAt: true,
      },
    });

    assertOnboardingAccess(
      req,
      intent,
    );

    await prisma.ownerIntent
      .update({
        where: {
          id: intent.id,
        },
        data: {
          lastAccessedAt:
            new Date(),
        },
        select: {
          id: true,
        },
      })
      .catch(() => null);

    const result = await momoService.createPaymentFromPlan(
      cleanString(intentId),
      cleanString(planKey),
      phone
    );

    const testingMode = isMockPaymentResult(result);

    return res.status(202).json({
      message: testingMode ? "Testing payment approved" : "Payment request sent to MoMo",
      testingMode,
      paymentReference: result.paymentReference,
      intentId: result.intentId,
      plan: result.plan,
      phone: result.phone,
      payment: result.payment || null,
      provider: result.provider || null,
    });
  } catch (err) {
    console.error("MoMo ERROR DETAILS:");
    console.error(err.response?.data || err.message);

    const publicError =
      publicOnboardingError(
        err,
        "We could not start the payment. Please try again.",
      );

    return res
      .status(publicError.status)
      .json(publicError.body);
  }
}

// -----------------------------------------------------------------------------
// Public onboarding routes
// -----------------------------------------------------------------------------

router.post("/owner-intent", authController.ownerIntent);
router.post("/signup/owner-intent", authController.ownerIntent);

router.post(
  "/account/business/intent",
  createAccountBusinessCompletionGuard({ prisma }),
  authController.ownerIntent
);

router.get(
  "/signup/owner-intent/:intentId/status",
  authController.getOwnerIntentStatus
);

router.get(
  "/signup/owner-intent/:intentId/plans",
  async (req, res) => {
    try {
      const intentId = cleanString(req.params?.intentId);

      if (!intentId) {
        return res.status(400).json({
          message:
            "Your setup could not be restored. Please start again.",
          code: "ONBOARDING_ID_REQUIRED",
        });
      }

      const intent =
        await prisma.ownerIntent.findUnique({
          where: { id: intentId },
          select: {
            id: true,
            countryCode: true,
            status: true,
            expiresAt: true,
            onboardingTokenHash: true,
            onboardingTokenExpiresAt: true,
            onboardingTokenRevokedAt: true,
          },
        });

      assertOnboardingAccess(req, intent);

      const catalogue =
        getOnboardingCatalogueForMarket(
          intent.countryCode,
        );

      return res.json({
        trialDays: getTrialDays(),
        ...catalogue,
      });
    } catch (error) {
      const publicError =
        publicOnboardingError(
          error,
          "We could not load Storvex plans. Please try again.",
        );

      return res
        .status(publicError.status)
        .json(publicError.body);
    }
  },
);

router.post("/otp/send", otpController.sendOtp);
router.post("/otp/verify", otpController.verifyOtp);

router.post("/signup/otp/send", otpController.sendOtp);
router.post("/signup/otp/verify", otpController.verifyOtp);

router.get("/plans", (req, res) => {
  return res.json({
    trialDays: getTrialDays(),
    plans: getPaidPlans(),
  });
});

router.get("/markets", (req, res) => {
  return res.json({ markets: listPublicMarkets() });
});

router.get("/country-hint", (req, res) => {
  return res.json({
    countryCode: requestCountryHint(req)?.countryCode || null,
  });
});

router.post("/owner-payment", createOwnerPayment);
router.post("/signup/payment", createOwnerPayment);

router.get(
  "/owner-payment/:reference/status",
  getOwnerSignupPaymentStatus,
);

router.get(
  "/signup/payment/:reference/status",
  getOwnerSignupPaymentStatus,
);

router.post("/confirm-signup", authController.confirmSignup);
router.post("/signup/confirm", authController.confirmSignup);

router.post("/signup/initiate", authController.initiateSignup);

router.post("/login", authController.login);

// Retail passwordless email login; password login is preserved.
const retailEmailLogin = createRetailEmailLoginApiHandlers({
  prisma,
  signAuthToken: authController.signAuthToken,
  getClientIp: authController.getClientIp,
  getUserAgent: authController.getUserAgent
});

router.post("/retail/email-login/request",
  retailEmailLogin.request);
router.post("/retail/email-login/verify",
  retailEmailLogin.verify);

router.post(
  "/logout",
  authenticate,
  logoutController.logout,
);

// Account identity before retail-business onboarding.
const accountSignup = createAccountSignupApiHandlers({
  prisma,
  getClientIp: authController.getClientIp
});

const unifiedLogin = createUnifiedLoginApiHandlers({
  prisma,
  retail: retailEmailLogin,
  account: accountSignup,
  getClientIp: authController.getClientIp
});

router.post("/login/unified/request", unifiedLogin.request);
router.post("/login/unified/verify", unifiedLogin.verify);

router.post("/account/login/request", accountSignup.loginRequest);
router.post("/account/login/verify", accountSignup.loginVerify);
router.post("/account/signup", accountSignup.request);
router.post("/account/signup/verify", accountSignup.verify);
router.get("/account/me", accountSignup.me);
router.post("/account/workspace/session", createAccountWorkspaceSessionHandler({
  prisma,
  signAuthToken: authController.signAuthToken,
  getClientIp: authController.getClientIp,
  getUserAgent: authController.getUserAgent,
}));
router.post("/account/logout", accountSignup.logout);

router.post(
  "/account/business/confirm",
  createAccountBusinessCompletionGuard({ prisma }),
  authController.confirmSignup
);

router.post("/password/forgot", passwordResetController.forgotPassword);
router.post("/password/reset", passwordResetController.resetPassword);

// -----------------------------------------------------------------------------
// Authenticated account/workspace route
// -----------------------------------------------------------------------------

router.get("/me", authenticate, meController.me);

// -----------------------------------------------------------------------------
// Payment callbacks
// -----------------------------------------------------------------------------

// Fail closed until provider-authenticated payment verification is installed.
// Return 503 so providers may retry; never trust a callback status alone.
router.post(
  "/payments/momo/callback",
  express.json(),
  (_req, res) =>
    res.status(503).json({
      message: "Payment verification is temporarily unavailable",
    })
);



module.exports = router;
