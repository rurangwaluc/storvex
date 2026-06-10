const express = require("express");

const router = express.Router();

const authController = require("./auth.controller");
const momoService = require("./momo.service");
const paymentController = require("./payment.controller");
const otpController = require("./otp.controller");
const meController = require("./me.controller");
const passwordResetController = require("./passwordReset.controller");

const authenticate = require("../../middlewares/authenticate");
const { getPaidPlans, getTrialDays } = require("../../config/plans");

// ---------- helpers ----------
function normalizePhoneTo250(phone) {
  const raw = String(phone || "").trim().replace(/[^\d]/g, "");
  if (!raw) return null;
  if (raw.startsWith("07") && raw.length === 10) return `250${raw.slice(1)}`;
  if (raw.startsWith("2507") && raw.length === 12) return raw;
  return raw;
}

function isRwandaMsisdn250(phone) {
  return /^2507\d{8}$/.test(String(phone || ""));
}

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

async function createOwnerPayment(req, res) {
  const { intentId, phone, planKey } = req.body || {};

  if (!intentId || !phone || !planKey) {
    return res.status(400).json({
      message: "intentId, planKey, phone required",
    });
  }

  const phoneNorm = normalizePhoneTo250(phone);

  if (!phoneNorm || !isRwandaMsisdn250(phoneNorm)) {
    return res.status(400).json({
      message: "Invalid MSISDN format. Use 07XXXXXXXX or 2507XXXXXXXX",
    });
  }

  try {
    const result = await momoService.createPaymentFromPlan(
      cleanString(intentId),
      cleanString(planKey),
      phoneNorm
    );

    const testingMode = isMockPaymentResult(result);

    return res.status(202).json({
      message: testingMode ? "Testing payment approved" : "Payment request sent to MoMo",
      testingMode,
      paymentReference: result.paymentReference,
      intentId: result.intentId,
      plan: result.plan,
      phone: phoneNorm,
      payment: result.payment || null,
      provider: result.provider || null,
    });
  } catch (err) {
    console.error("MoMo ERROR DETAILS:");
    console.error(err.response?.data || err.message);

    return res.status(err.status || 500).json({
      message: err.message || "MoMo payment failed",
      error: err.response?.data || err.message,
      reason: err.reason || undefined,
    });
  }
}

// -----------------------------------------------------------------------------
// Public onboarding routes
// -----------------------------------------------------------------------------

router.post("/owner-intent", authController.ownerIntent);
router.post("/signup/owner-intent", authController.ownerIntent);

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

router.post("/owner-payment", createOwnerPayment);
router.post("/signup/payment", createOwnerPayment);

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