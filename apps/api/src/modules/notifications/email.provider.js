// src/modules/notifications/email.provider.js
let ResendCtor = null;

try {
  const { Resend } = require("resend");
  ResendCtor = Resend;
} catch (_) {
  ResendCtor = null;
}

function isDevEchoEnabled() {
  return String(process.env.DEV_OTP_ECHO || "false").toLowerCase() === "true";
}

function cleanString(value) {
  return String(value || "").trim();
}

function maskEmail(email) {
  const value = cleanString(email);

  if (!value.includes("@")) return value || "unknown";

  const [name, domain] = value.split("@");
  const safeName = name.length <= 2 ? `${name.slice(0, 1)}***` : `${name.slice(0, 2)}***`;

  return `${safeName}@${domain}`;
}

function buildEmailText(code, ttlMinutes) {
  return [
    `Your Storvex verification code is: ${code}`,
    "",
    `This code expires in ${ttlMinutes} minutes.`,
    "",
    "If you did not request this code, ignore this email.",
  ].join("\n");
}

function buildEmailHtml(code, ttlMinutes) {
  return `
    <div style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e5eaf3;border-radius:18px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 18px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#0ea5e9;">
                    Storvex verification
                  </p>

                  <h1 style="margin:0;font-size:24px;line-height:1.2;color:#0f172a;">
                    Confirm your email
                  </h1>

                  <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#475569;">
                    Use this code to continue setting up your Storvex store.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:8px 28px 10px;">
                  <div style="background:#f1f7ff;border:1px solid #dbeafe;border-radius:16px;padding:18px;text-align:center;">
                    <div style="font-size:34px;line-height:1;font-weight:900;letter-spacing:8px;color:#0f172a;">
                      ${code}
                    </div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:10px 28px 28px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                    This code expires in <strong style="color:#0f172a;">${ttlMinutes} minutes</strong>.
                  </p>

                  <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#94a3b8;">
                    If you did not request this code, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">
              Storvex account security
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function readResendConfig() {
  const apiKey = cleanString(process.env.RESEND_API_KEY);
  const from = cleanString(process.env.RESEND_FROM);

  return {
    apiKey,
    from,
  };
}

async function sendEmailOtp({ to, code, ttlMinutes }) {
  const target = cleanString(to);

  if (!target) {
    return {
      sent: false,
      reason: "EMAIL_TARGET_MISSING",
      provider: "RESEND",
      messageId: null,
    };
  }

  if (process.env.NODE_ENV !== "production" && isDevEchoEnabled()) {
    console.log("DEV EMAIL OTP:", { to: maskEmail(target), code });

    return {
      sent: true,
      provider: "DEV_ECHO",
      messageId: null,
    };
  }

  const { apiKey, from } = readResendConfig();

  if (!apiKey) {
    return {
      sent: false,
      reason: "RESEND_API_KEY_MISSING",
      provider: "RESEND",
      messageId: null,
    };
  }

  if (!from) {
    return {
      sent: false,
      reason: "RESEND_FROM_MISSING",
      provider: "RESEND",
      messageId: null,
    };
  }

  if (!ResendCtor) {
    return {
      sent: false,
      reason: "RESEND_SDK_NOT_INSTALLED",
      provider: "RESEND",
      messageId: null,
    };
  }

  try {
    const resend = new ResendCtor(apiKey);

    const response = await resend.emails.send({
      from,
      to: target,
      subject: "Your Storvex verification code",
      text: buildEmailText(code, ttlMinutes),
      html: buildEmailHtml(code, ttlMinutes),
      headers: {
        "X-Entity-Ref-ID": `storvex-otp-${Date.now()}`,
      },
    });

    if (response?.error) {
      console.error("Resend send failed:", response.error);

      return {
        sent: false,
        reason: response.error?.message || "RESEND_SEND_FAILED",
        provider: "RESEND",
        messageId: null,
      };
    }

    const messageId = response?.data?.id || response?.id || null;

    if (!messageId) {
      console.error("Resend send returned no message id:", response);

      return {
        sent: false,
        reason: "RESEND_NO_MESSAGE_ID",
        provider: "RESEND",
        messageId: null,
      };
    }

    console.log("Resend OTP email sent:", {
      to: maskEmail(target),
      messageId,
    });

    return {
      sent: true,
      provider: "RESEND",
      messageId,
    };
  } catch (err) {
    console.error("Resend send failed:", {
      message: err?.message,
      name: err?.name,
      statusCode: err?.statusCode,
    });

    return {
      sent: false,
      reason: err?.message || "RESEND_SEND_FAILED",
      provider: "RESEND",
      messageId: null,
    };
  }
}

module.exports = { sendEmailOtp };