const express = require("express");

const prisma = require("../../config/database");
const {
  assertOnboardingAccess,
  publicOnboardingError,
} = require("./onboardingIntent.security");

const router = express.Router();

const authController = require("./auth.controller");
const momoService = require("./momo.service");
const paymentController = require("./payment.controller");
const otpController = require("./otp.controller");
const meController = require("./me.controller");
const passwordResetController = require("./passwordReset.controller");

const authenticate = require("../../middlewares/authenticate");
const { getPaidPlans, getTrialDays } = require("../../config/plans");
const { listPublicOnboardingMarkets } = require("../../config/markets");

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

router.get(
  "/signup/owner-intent/:intentId/status",
  authController.getOwnerIntentStatus
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
  return res.json({ markets: listPublicOnboardingMarkets() });
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

router.post("/password/forgot", passwordResetController.forgotPassword);
router.post("/password/reset", passwordResetController.resetPassword);

// -----------------------------------------------------------------------------
// Authenticated account/workspace route
// -----------------------------------------------------------------------------

router.get("/me", authenticate, meController.me);

// -----------------------------------------------------------------------------
// Payment callbacks
// -----------------------------------------------------------------------------

router.post(
  "/payments/momo/callback",
  express.json(),
  paymentController.momoCallback
);

router.post(
  "/payments/momo/callback/dev",
  express.json(),
  paymentController.momoCallbackDev
);

module.exports = router;
