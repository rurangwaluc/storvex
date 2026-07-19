import { apiFetch } from "./apiClient";

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      query.set(key, String(value));
    },
  );

  const value = query.toString();

  return value ? `?${value}` : "";
}

export function listOwnerMarketplaceRequests(
  params = {},
) {
  return apiFetch(
    `/store/marketplace-requests${buildQuery(
      params,
    )}`,
  );
}

export function getOwnerMarketplaceRequest(
  requestId,
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}`,
  );
}
