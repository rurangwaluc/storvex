/**
 * Tab-scoped Flutterwave Inline recovery hint.
 *
 * Browser storage contains a reference, never payment proof.
 * Every recovered payment must be checked with the authenticated
 * STORVEX payment-status API before showing success.
 */
const STORAGE_KEY = "storvex_inline_renewal_reference_v1";
const MAX_AGE_MS = 30 * 60 * 1000;

function validReference(reference) {
  return (
    typeof reference === "string" &&
    /^[A-Za-z0-9_-]{8,100}$/.test(reference)
  );
}

export function saveInlineRecoveryReference(
  storage,
  reference,
  now = Date.now()
) {
  if (!validReference(reference) || !Number.isFinite(now)) {
    return false;
  }

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ reference, savedAt: now })
    );
    return true;
  } catch {
    return false;
  }
}

export function readInlineRecoveryReference(
  storage,
  now = Date.now()
) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const age = now - entry?.savedAt;

    if (
      !validReference(entry?.reference) ||
      !Number.isFinite(entry?.savedAt) ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > MAX_AGE_MS
    ) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return entry.reference;
  } catch {
    return null;
  }
}

export function clearInlineRecoveryReference(
  storage,
  reference
) {
  try {
    // Clearing is not a recovery attempt and must not depend
    // on the stored timestamp. The expected reference prevents
    // an older callback from deleting a newer payment.
    if (reference !== undefined) {
      if (!validReference(reference)) return false;

      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const entry = JSON.parse(raw);

      if (entry?.reference !== reference) {
        return false;
      }
    }

    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
