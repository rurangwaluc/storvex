import toast from "react-hot-toast";

function normalizeCode(error) {
  return String(
    error?.response?.data?.code ||
      error?.code ||
      error?.data?.code ||
      ""
  ).toUpperCase();
}

function normalizeStatus(error) {
  return Number(
    error?.response?.status ||
      error?.status ||
      error?.data?.status ||
      0
  );
}

export function isSubscriptionBlockedError(error) {
  const status = normalizeStatus(error);
  const code = normalizeCode(error);

  return (
    status === 403 &&
    (code === "SUBSCRIPTION_READ_ONLY" ||
      code === "SUBSCRIPTION_BLOCKED" ||
      code === "NO_SUBSCRIPTION")
  );
}

export function getSubscriptionBlockedMessage(error) {
  const code = normalizeCode(error);

  if (code === "SUBSCRIPTION_BLOCKED") {
    return "Subscription expired. Renew to continue operations.";
  }

  if (code === "NO_SUBSCRIPTION") {
    return "No active subscription found. Renew to continue.";
  }

  return "Subscription is in read-only mode. Renew to continue this action.";
}

export function toastSubscriptionBlockedError(error, options = {}) {
  if (!isSubscriptionBlockedError(error)) return false;

  const {
    toastId = "subscription-blocked",
    fallbackMessage,
  } = options;

  toast.error(fallbackMessage || getSubscriptionBlockedMessage(error), {
    id: toastId,
  });

  return true;
}

export function handleSubscriptionBlockedError(error, options = {}) {
  return toastSubscriptionBlockedError(error, options);
}