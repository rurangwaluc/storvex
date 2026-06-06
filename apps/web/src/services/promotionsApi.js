/* src/services/promotionsApi.js
 *
 * WhatsApp Promotions API
 *
 * Promotions are the message bodies attached to WhatsApp broadcasts.
 * They hold a title + message text, and optionally reference a product.
 *
 * Backend routes:
 *   GET    /api/whatsapp/promotions        → { promotions: [...] }
 *   POST   /api/whatsapp/promotions        → { created: true, promotion: {...} }
 *   PATCH  /api/whatsapp/promotions/:id    → { updated: true, promotion: {...} }
 */

import { apiFetch } from "./apiClient";

// ─── normalizers ─────────────────────────────────────────────────────────────

function trim(v) {
  return String(v ?? "").trim();
}

function normalizePromotion(raw) {
  if (!raw) return null;
  return {
    id:          trim(raw.id),
    tenantId:    trim(raw.tenantId),
    title:       trim(raw.title),
    message:     typeof raw.message === "string" ? raw.message : "",
    productId:   trim(raw.productId),
    createdById: trim(raw.createdById),
    sentAt:      raw.sentAt  || null,
    createdAt:   raw.createdAt || null,
    product: raw.product
      ? {
          id:        trim(raw.product.id),
          name:      trim(raw.product.name),
          sku:       trim(raw.product.sku),
          sellPrice: Number(raw.product.sellPrice || 0),
        }
      : null,
    createdBy: raw.createdBy
      ? {
          id:   trim(raw.createdBy.id),
          name: trim(raw.createdBy.name),
          role: trim(raw.createdBy.role).toUpperCase(),
        }
      : null,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * List all promotions for the current tenant.
 * @param {{ q?: string, limit?: number }} [filters]
 */
export async function listPromotions(filters = {}) {
  const query = {};
  const q     = String(filters.q  || "").trim();
  const limit = Number(filters.limit);
  if (q)                                  query.q     = q;
  if (Number.isFinite(limit) && limit > 0) query.limit = Math.floor(limit);

  const data = await apiFetch("/whatsapp/promotions", { query });

  return {
    promotions: Array.isArray(data?.promotions)
      ? data.promotions.map(normalizePromotion).filter(Boolean)
      : [],
  };
}

/**
 * Create a new promotion.
 * @param {{ title: string, message: string, productId?: string }} payload
 */
export async function createPromotion(payload) {
  const body = {};
  const title   = String(payload?.title   || "").trim();
  const message = String(payload?.message || "").trim();
  const pid     = String(payload?.productId || "").trim();

  if (!title)   throw new Error("title is required");
  if (!message) throw new Error("message is required");

  body.title   = title;
  body.message = message;
  if (pid) body.productId = pid;

  const data = await apiFetch("/whatsapp/promotions", {
    method: "POST",
    body,
  });

  return {
    created:   Boolean(data?.created),
    promotion: data?.promotion ? normalizePromotion(data.promotion) : null,
  };
}

/**
 * Update an existing promotion (only title/message; only if not yet sent).
 * @param {string} promotionId
 * @param {{ title?: string, message?: string }} payload
 */
export async function updatePromotion(promotionId, payload) {
  const id   = String(promotionId || "").trim();
  const body = {};

  if (payload?.title   !== undefined) body.title   = String(payload.title   || "").trim();
  if (payload?.message !== undefined) body.message = String(payload.message || "").trim();

  const data = await apiFetch(`/whatsapp/promotions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });

  return {
    updated:   Boolean(data?.updated),
    promotion: data?.promotion ? normalizePromotion(data.promotion) : null,
  };
}