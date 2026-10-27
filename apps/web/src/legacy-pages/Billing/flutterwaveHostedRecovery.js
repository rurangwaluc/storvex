/**
 * Hosted Flutterwave sandbox recovery hint.
 *
 * Storage is not payment evidence. The authenticated API
 * remains authoritative about payment and checkout state.
 */
const KEY = "storvex_hosted_renewal_reference_v1";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function validHostedReference(value) {
  return typeof value === "string" &&
    /^[A-Za-z0-9_-]{8,100}$/.test(value);
}

export function saveHostedRecoveryReference(
  storage,
  reference,
  now = Date.now()
) {
  if (!validHostedReference(reference) ||
      !Number.isFinite(now)) return false;

  try {
    storage.setItem(
      KEY,
      JSON.stringify({ reference, savedAt: now })
    );
    return true;
  } catch {
    return false;
  }
}

export function readHostedRecoveryReference(
  storage,
  now = Date.now()
) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const age = now - entry?.savedAt;

    if (!validHostedReference(entry?.reference) ||
        !Number.isFinite(entry.savedAt) ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > MAX_AGE) {
      storage.removeItem(KEY);
      return null;
    }

    return entry.reference;
  } catch {
    return null;
  }
}

export function clearHostedRecoveryReference(
  storage,
  expectedReference
) {
  if (!validHostedReference(expectedReference)) return false;

  try {
    const raw = storage.getItem(KEY);
    if (!raw) return false;

    const entry = JSON.parse(raw);
    if (entry?.reference !== expectedReference) return false;

    storage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

export function trustedHostedRecoveryUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);

    return url.protocol === "https:" &&
      url.hostname === "checkout-v2.dev-flutterwave.com" &&
      !url.username &&
      !url.password &&
      !url.hash;
  } catch {
    return false;
  }
}
