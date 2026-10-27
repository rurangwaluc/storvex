// Legacy payment endpoints retired.
// Never accept client-declared payment success or payment amounts.
// Use the verified payment infrastructure instead.
const express = require("express");
const router = express.Router();

router.use((_req, res) => {
  return res.status(503).json({
    message: "This payment method is unavailable.",
  });
});

module.exports = router;
