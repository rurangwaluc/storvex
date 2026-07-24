// src/modules/notifications/index.js
const {
  sendEmailOtp,
  sendEmailMessage,
} = require("./email.provider");

const {
  sendSmsOtp,
  checkSmsOtp,
} = require("./sms.provider");

module.exports = {
  sendEmailOtp,
  sendEmailMessage,
  sendSmsOtp,
  checkSmsOtp,
};
