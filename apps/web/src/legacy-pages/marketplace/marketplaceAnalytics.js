import {
  recordMarketplaceAnalyticsEvent,
} from "../../services/marketplaceApi";

const MARKETPLACE_VISITOR_KEY =
  "storvex_marketplace_visitor_v1";

function cleanString(value) {
  return String(value || "").trim();
}

function randomVisitorId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `visitor_${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
  }

  return `visitor_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 18)}`;
}

export function getMarketplaceVisitorId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing = cleanString(
      window.localStorage.getItem(
        MARKETPLACE_VISITOR_KEY,
      ),
    );

    if (
      /^[a-zA-Z0-9:_-]{16,80}$/.test(
        existing,
      )
    ) {
      return existing;
    }

    const created = randomVisitorId().slice(
      0,
      80,
    );

    window.localStorage.setItem(
      MARKETPLACE_VISITOR_KEY,
      created,
    );

    return created;
  } catch {
    return randomVisitorId().slice(0, 80);
  }
}

export async function trackMarketplaceActivity(
  payload = {},
) {
  const storeSlug = cleanString(
    payload.storeSlug,
  );

  const eventType = cleanString(
    payload.eventType,
  ).toUpperCase();

  if (!storeSlug || !eventType) {
    return {
      recorded: false,
      skipped: true,
    };
  }

  try {
    return await recordMarketplaceAnalyticsEvent({
      ...payload,
      storeSlug,
      eventType,
      visitorId:
        getMarketplaceVisitorId(),
    });
  } catch {
    /*
     * Analytics must never interrupt customer shopping.
     * The action remains successful even when tracking
     * cannot reach the API.
     */
    return {
      recorded: false,
      failed: true,
    };
  }
}

export function trackMarketplaceActivityQuietly(
  payload = {},
) {
  void trackMarketplaceActivity(payload);
}
