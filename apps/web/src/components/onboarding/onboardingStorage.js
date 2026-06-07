const ONBOARDING_KEY = "storvex_onboarding";

export const ONBOARDING_STORAGE_KEYS = [
  ONBOARDING_KEY,
  "storvex_intentId",
  "storvex_ownerPhone",
  "storvex_ownerEmail",
  "storvex_storeName",
  "storvex_ownerName",
  "storvex_shopType",
  "storvex_district",
  "storvex_sector",
  "storvex_address",
  "storvex_deviceId",
  "storvex_emailVerified",
  "storvex_phoneVerified",
  "storvex_signupMode",
  "storvex_planKey",
];

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function cleanString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function readBoolean(key) {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(key) === "true";
}

export function readOnboardingState() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(ONBOARDING_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    const fallback = {
      intentId: cleanString(storage.getItem("storvex_intentId")),
      storeName: cleanString(storage.getItem("storvex_storeName")),
      ownerName: cleanString(storage.getItem("storvex_ownerName")),
      email: cleanString(storage.getItem("storvex_ownerEmail")),
      phone: cleanString(storage.getItem("storvex_ownerPhone")),
      shopType: cleanString(storage.getItem("storvex_shopType")),
      district: cleanString(storage.getItem("storvex_district")),
      sector: cleanString(storage.getItem("storvex_sector")),
      address: cleanString(storage.getItem("storvex_address")),
      deviceId: cleanString(storage.getItem("storvex_deviceId")),
      emailVerified: readBoolean("storvex_emailVerified"),
      phoneVerified: readBoolean("storvex_phoneVerified"),
      signupMode: cleanString(storage.getItem("storvex_signupMode")),
      planKey: cleanString(storage.getItem("storvex_planKey")),
    };

    return {
      ...fallback,
      ...(parsed || {}),
    };
  } catch {
    return null;
  }
}

export function saveOnboardingState(nextState = {}) {
  const storage = getStorage();
  if (!storage) return;

  const next = {
    ...(readOnboardingState() || {}),
    ...nextState,
  };

  storage.setItem(ONBOARDING_KEY, JSON.stringify(next));

  storage.setItem("storvex_intentId", cleanString(next.intentId));
  storage.setItem("storvex_ownerPhone", cleanString(next.phone));
  storage.setItem("storvex_ownerEmail", cleanString(next.email));
  storage.setItem("storvex_storeName", cleanString(next.storeName));
  storage.setItem("storvex_ownerName", cleanString(next.ownerName));
  storage.setItem("storvex_shopType", cleanString(next.shopType));
  storage.setItem("storvex_district", cleanString(next.district));
  storage.setItem("storvex_sector", cleanString(next.sector));
  storage.setItem("storvex_address", cleanString(next.address));
  storage.setItem("storvex_deviceId", cleanString(next.deviceId));

  if (typeof next.emailVerified === "boolean") {
    storage.setItem("storvex_emailVerified", String(next.emailVerified));
  }

  if (typeof next.phoneVerified === "boolean") {
    storage.setItem("storvex_phoneVerified", String(next.phoneVerified));
  }

  if (typeof next.signupMode === "string") {
    storage.setItem("storvex_signupMode", cleanString(next.signupMode));
  }

  if (typeof next.planKey === "string") {
    storage.setItem("storvex_planKey", cleanString(next.planKey));
  }
}

export function saveOnboardingPatch(patch = {}) {
  saveOnboardingState({
    ...(readOnboardingState() || {}),
    ...patch,
  });
}

export function clearOnboardingState() {
  const storage = getStorage();
  if (!storage) return;

  ONBOARDING_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
}

export function hasOnboardingDraft(state = readOnboardingState()) {
  return Boolean(state?.intentId && state?.storeName && state?.email && state?.phone);
}

export function getOnboardingResumeTarget(state = readOnboardingState()) {
  if (!state?.intentId) return "/signup";

  if (!state.emailVerified || !state.phoneVerified) {
    return "/verify-otp";
  }

  if (!state.signupMode) {
    return "/owner-payment";
  }

  if (state.signupMode === "TRIAL") {
    return "/confirm-signup?mode=TRIAL";
  }

  if (state.signupMode === "PAID") {
    return "/confirm-signup?mode=PAID";
  }

  return "/owner-payment";
}