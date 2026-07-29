const DEVICE_ID_KEY = "storvex_deviceId";

function safeValue(value) {
  return String(value ?? "").trim();
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getCanvasSignal() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return "";

    context.textBaseline = "top";
    context.font = "14px Arial";
    context.fillText("Storvex device verification", 2, 2);

    return canvas.toDataURL();
  } catch {
    return "";
  }
}

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export async function getBrowserFingerprint() {
  const screenInfo =
    typeof window !== "undefined" && window.screen
      ? [
          window.screen.width,
          window.screen.height,
          window.screen.colorDepth,
          window.screen.pixelDepth,
        ].join("x")
      : "";

  const fingerprintSource = [
    safeValue(navigator.userAgent),
    safeValue(navigator.platform),
    safeValue(navigator.language),
    safeValue((navigator.languages || []).join(",")),
    safeValue(navigator.hardwareConcurrency),
    safeValue(navigator.deviceMemory),
    safeValue(navigator.maxTouchPoints),
    safeValue(screenInfo),
    safeValue(Intl.DateTimeFormat().resolvedOptions().timeZone),
    safeValue(getCanvasSignal()),
  ].join("|");

  return sha256(fingerprintSource);
}

export async function getDeviceIdentity() {
  const deviceId = getOrCreateDeviceId();
  const browserFingerprint = await getBrowserFingerprint();

  return {
    deviceId,
    browserFingerprint,
  };
}
