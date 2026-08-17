const SDK_ID = "storvex-meta-sdk";
const SDK_URL = "https://connect.facebook.net/en_US/sdk.js";
const SUPPORTED_EVENTS = new Set(["FINISH", "FINISH_ONLY_WABA", "CANCEL", "ERROR"]);

let sdkPromise = null;

export function isAllowedMetaMessageOrigin(origin) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && (hostname === "facebook.com" || hostname.endsWith(".facebook.com"));
  } catch {
    return false;
  }
}

export function parseEmbeddedSignupMessage(event) {
  if (!isAllowedMetaMessageOrigin(event?.origin)) return null;

  let payload = event?.data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }

  if (!payload || typeof payload !== "object" || payload.type !== "WA_EMBEDDED_SIGNUP") return null;
  if (!SUPPORTED_EVENTS.has(payload.event)) return null;
  if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) return null;

  return {
    event: payload.event,
    data: {
      wabaId: String(payload.data.waba_id || "").trim() || null,
      phoneNumberId: String(payload.data.phone_number_id || "").trim() || null,
      businessId: String(payload.data.business_id || "").trim() || null,
      currentStep: String(payload.data.current_step || "").trim() || null,
    },
  };
}

export function loadMetaSdk(appId, version = "v24.0") {
  if (typeof window === "undefined") return Promise.reject(new Error("META_SDK_BROWSER_REQUIRED"));
  if (window.FB) {
    window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version });
    return Promise.resolve(window.FB);
  }
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      document.getElementById(SDK_ID)?.remove();
      sdkPromise = null;
      reject(new Error("META_SDK_LOAD_FAILED"));
    }, 15000);
    window.fbAsyncInit = () => {
      window.clearTimeout(timeout);
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version });
      resolve(window.FB);
    };

    const existing = document.getElementById(SDK_ID);
    if (existing) return;
    const script = document.createElement("script");
    script.id = SDK_ID;
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      sdkPromise = null;
      reject(new Error("META_SDK_LOAD_FAILED"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function launchEmbeddedSignup(FB, configId, callback) {
  return FB.login(callback, {
    config_id: configId,
    response_type: "code",
    override_default_response_type: true,
    extras: { sessionInfoVersion: "3" },
  });
}

export const META_SDK_URL = SDK_URL;
