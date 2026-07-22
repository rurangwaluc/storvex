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

export function getOwnerMarketplaceAnalytics(
  params = {},
) {
  return apiFetch(
    `/store/marketplace-analytics${buildQuery(
      params,
    )}`,
  );
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

export function confirmOwnerMarketplaceRequest(
  requestId,
  payload = {},
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/confirm`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function rejectOwnerMarketplaceRequest(
  requestId,
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/reject`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function startPreparingOwnerMarketplaceRequest(
  requestId,
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/start-preparing`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function markReadyOwnerMarketplaceRequest(
  requestId,
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/ready-for-pickup`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function markOutForDeliveryOwnerMarketplaceRequest(
  requestId,
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/out-for-delivery`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function completePickupOwnerMarketplaceRequest(
  requestId,
  payload = {},
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/complete-pickup`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function completeDeliveryOwnerMarketplaceRequest(
  requestId,
  payload = {},
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/complete-delivery`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function failDeliveryOwnerMarketplaceRequest(
  requestId,
  payload = {},
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/delivery-failed`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function cancelOwnerMarketplaceRequest(
  requestId,
) {
  return apiFetch(
    `/store/marketplace-requests/${encodeURIComponent(
      requestId,
    )}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}
