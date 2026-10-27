const INLINE_SCRIPT =
  "https://checkout.flutterwave.com/v3.js";

const REFERENCE = /^[A-Za-z0-9_-]{8,100}$/;
const PUBLIC_TEST_KEY = /^FLWPUBK_TEST-[A-Za-z0-9_-]+$/;

let loadingScript = null;

export function validateSandboxInlineResponse(data, selection) {
  const config = data?.inlineConfig;

  if (
    data?.sandbox !== true ||
    data?.checkoutMethod !== "FLUTTERWAVE_SANDBOX_INLINE" ||
    data?.provider !== "FLUTTERWAVE" ||
    data?.paymentStatus !== "PENDING" ||
    data?.merchantName !== "RURAXIS LTD" ||
    !REFERENCE.test(data?.paymentReference || "") ||
    data?.durationMonths !== selection?.durationMonths ||
    data?.totalAmount !== selection?.expectedTotal ||
    data?.currency !== selection?.expectedCurrency ||
    !Number.isSafeInteger(data?.totalAmount) ||
    data.totalAmount <= 0 ||
    !Number.isSafeInteger(data?.monthlyAmount) ||
    data.monthlyAmount <= 0 ||
    !Number.isSafeInteger(data?.discountPercent) ||
    !config ||
    !PUBLIC_TEST_KEY.test(config.public_key || "") ||
    config.tx_ref !== data.paymentReference ||
    config.amount !== data.totalAmount ||
    config.currency !== data.currency ||
    config.payment_options !== "mobilemoneyrwanda,card" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      config.customer?.email || ""
    ) ||
    config.redirect_url !== undefined ||
    config.callback !== undefined ||
    config.onclose !== undefined
  ) {
    throw new Error(
      "Storvex could not validate the secure test checkout."
    );
  }

  // Do not spread arbitrary server properties into the provider call.
  return {
    public_key: config.public_key,
    tx_ref: config.tx_ref,
    amount: config.amount,
    currency: config.currency,
    payment_options: config.payment_options,
    customer: {
      email: config.customer.email,
      name: "Storvex Customer",
    },
    customizations: {
      title: "Storvex Subscription",
      description: "Subscription renewal",
    },
  };
}

export function loadFlutterwaveInlineScript() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    return Promise.reject(
      new Error("Flutterwave checkout requires a browser.")
    );
  }

  if (typeof window.FlutterwaveCheckout === "function") {
    return Promise.resolve(window.FlutterwaveCheckout);
  }

  if (loadingScript) return loadingScript;

  loadingScript = new Promise((resolve, reject) => {
    // We own this script element. Do not trust an existing unknown
    // script element with the same source.
    const script = document.createElement("script");
    script.src = INLINE_SCRIPT;
    script.async = true;
    script.dataset.storvexFlutterwaveInline = "true";

    script.onload = () => {
      if (typeof window.FlutterwaveCheckout !== "function") {
        script.remove();
        reject(new Error("Secure payment library is unavailable."));
        return;
      }

      resolve(window.FlutterwaveCheckout);
    };

    script.onerror = () => {
      script.remove();
      reject(new Error("Could not load secure payment checkout."));
    };

    document.head.appendChild(script);
  }).catch(error => {
    loadingScript = null;
    throw error;
  });

  return loadingScript;
}

/**
 * A popup callback is only a notification.
 *
 * onPaymentNotification must independently call Storvex's
 * authenticated server verification endpoint. Never trust the
 * callback status, amount, or transaction ID as proof of payment.
 */
export function openSandboxInlinePopup({
  data,
  selection,
  checkout,
  onPaymentNotification,
  onClose,
  development = process.env.NODE_ENV === "development",
}) {
  if (!development) {
    throw new Error("Test checkout is unavailable.");
  }

  if (typeof checkout !== "function") {
    throw new Error("Flutterwave Inline is unavailable.");
  }

  const config = validateSandboxInlineResponse(data, selection);

  const modal = checkout({
    ...config,

    callback: () => {
      // Ignore all untrusted Flutterwave callback fields.
      // Pass only the reference obtained from Storvex's API.
      if (typeof onPaymentNotification === "function") {
        onPaymentNotification(config.tx_ref);
      }
    },

    onclose: incomplete => {
      if (typeof onClose === "function") {
        onClose({
          reference: config.tx_ref,
          incomplete: incomplete === true,
        });
      }
    },
  });

  return {
    reference: config.tx_ref,
    modal,
  };
}
