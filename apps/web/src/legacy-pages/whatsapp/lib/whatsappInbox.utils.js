import { jwtDecode } from "jwt-decode";

import {
  WHATSAPP_WORKSPACE_ROLES,
  WHATSAPP_MANAGER_ROLES,
  WORKSPACE_CACHE_KEY,
  BUSINESS_CATEGORY_LABELS,
} from "./whatsappInbox.constants";

export function cx(...items) {
  return items.filter(Boolean).join(" ");
}

export function normalizeRole(value) {
  return String(value || "").trim().toUpperCase();
}

export function getCurrentUserRole() {
  try {
    const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");
    if (!token) return "";
    const decoded = jwtDecode(token);
    return normalizeRole(decoded?.role || decoded?.roles?.[0] || "");
  } catch {
    return "";
  }
}

export function canManageWhatsAppTools(role) {
  return WHATSAPP_MANAGER_ROLES.includes(normalizeRole(role));
}

export function canUseWhatsAppInbox(role) {
  return WHATSAPP_WORKSPACE_ROLES.includes(normalizeRole(role));
}

export function money(value) {
  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;

  return `${Math.round(safe).toLocaleString("en-US")} RWF`;
}

export function formatCompactNumber(value) {
  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;

  return new Intl.NumberFormat("en-US", {
    notation: safe >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(safe);
}

export function initials(value) {
  const text = String(value || "").trim();

  if (!text) return "WA";

  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "WA"
  );
}

export function cleanPhone(value) {
  return String(value || "").trim() || "No phone";
}

export function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeBusinessCategory(value) {
  const category = String(value || "").trim().toUpperCase();

  if (["HARDWARE", "QUINCAILLERIE"].includes(category)) return "HARDWARE";
  if (["HOME_KITCHEN", "HOME_AND_KITCHEN", "HOME & KITCHEN"].includes(category)) return "HOME_KITCHEN";
  if (category === "LIGHTING") return "LIGHTING";
  if (["SPARE_PARTS", "SPARE PARTS", "AUTO_PARTS"].includes(category)) return "SPARE_PARTS";

  return "ELECTRONICS";
}

export function categoryLabel(value) {
  return BUSINESS_CATEGORY_LABELS[normalizeBusinessCategory(value)] || "Retail store";
}

export function readStoredJson(key) {
  try {
    const raw =
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) ||
      (typeof localStorage !== "undefined" && localStorage.getItem(key));

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readTokenPayload() {
  try {
    const token =
      (typeof localStorage !== "undefined" &&
        (localStorage.getItem("tenantToken") || localStorage.getItem("token"))) ||
      "";

    return token ? jwtDecode(token) : {};
  } catch {
    return {};
  }
}

export function getRegisteredBusinessCategory() {
  const workspace = readStoredJson(WORKSPACE_CACHE_KEY) || {};
  const tokenPayload = readTokenPayload();
  const tenant = workspace?.tenant || workspace?.business || workspace?.store || {};
  const candidates = [
    tenant?.businessCategory,
    tenant?.category,
    tenant?.shopType,
    workspace?.businessCategory,
    workspace?.category,
    workspace?.shopType,
    workspace?.tenant?.businessCategory,
    workspace?.tenant?.category,
    workspace?.tenant?.shopType,
    workspace?.business?.businessCategory,
    workspace?.business?.category,
    workspace?.business?.shopType,
    tokenPayload?.businessCategory,
    tokenPayload?.category,
    tokenPayload?.shopType,
  ];

  const match = candidates.find((value) => cleanText(value));
  return normalizeBusinessCategory(match);
}

export function normalizeProductList(data) {
  const raw = data?.products || data?.data?.products || data?.data || data?.items || data || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => ({
    id: String(item.id || ""),
    name: String(item.name || "Product"),
    sku: String(item.sku || ""),
    serial: String(item.serial || ""),
    sellPrice: Number(item.sellPrice || item.price || 0),
    stockQty: Number(item.stockQty || item.availableQty || item.branchQty || 0),
  }));
}

export function safeError(err, fallback) {
  const code = String(err?.response?.data?.code || "").toUpperCase();

  if (code === "WHATSAPP_ACCOUNT_NOT_FOUND") return "No active WhatsApp store number was found.";
  if (code === "WHATSAPP_ACCOUNT_PHONE_NUMBER_ID_MISSING") return "The WhatsApp store number needs setup before sending.";
  if (code === "WHATSAPP_ACCOUNT_ACCESS_TOKEN_MISSING") return "The WhatsApp store number needs setup before sending.";
  if (code === "PRODUCT_ID_REQUIRED_FOR_TARGET") return "This audience needs a promotion connected to a product.";
  if (code === "CATEGORY_REQUIRED") return "Choose a business category for this audience.";
  if (code === "NO_BROADCAST_RECIPIENTS") return "No matching customers were found for this audience.";
  if (code === "PROMOTION_NOT_FOUND") return "The selected promotion could not be found.";
  if (code === "CASH_DRAWER_CLOSED") return "Open the cash drawer before completing this sale.";

  return err?.response?.data?.message || err?.message || fallback;
}

export function statusLabel(value) {
  const status = String(value || "").trim().toUpperCase();

  if (status === "DRAFT") return "Draft";
  if (status === "QUEUED") return "Queued";
  if (status === "SENT") return "Sent";
  if (status === "FAILED") return "Needs attention";
  if (status === "OPEN") return "Open";
  if (status === "CLOSED") return "Closed";
  if (status === "ACTIVE") return "Active";
  if (status === "PAID") return "Paid";
  if (status === "PARTIAL") return "Partial";
  if (status === "CASH") return "Cash";
  if (status === "CREDIT") return "Credit";

  return status || "Record";
}

export function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDay(value) {
  if (!value) return "Today";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Today";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function dateLabel(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function shortDate(value) {
  if (!value) return "No purchases yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No purchases yet";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function daysSince(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function customerTier(summary) {
  const orders = Number(summary?.totalOrders || 0);
  const revenue = Number(summary?.totalRevenue || 0);
  const outstanding = Number(summary?.outstandingCredit || 0);

  if (outstanding > 0) return { label: "Credit watch", tone: "warning" };
  if (orders >= 10 || revenue >= 1000000) return { label: "VIP customer", tone: "success" };
  if (orders >= 3 || revenue >= 250000) return { label: "Returning customer", tone: "info" };
  if (orders > 0) return { label: "New buyer", tone: "neutral" };

  return { label: "New lead", tone: "neutral" };
}

export function recommendedCustomerAction(summary) {
  const orders = Number(summary?.totalOrders || 0);
  const outstanding = Number(summary?.outstandingCredit || 0);
  const lastPurchaseDays = daysSince(summary?.lastPurchase);

  if (outstanding > 0) return "Send payment reminder";
  if (orders === 0) return "Convert chat into first sale";
  if (lastPurchaseDays !== null && lastPurchaseDays >= 30) return "Follow up with a fresh offer";
  if (orders >= 3) return "Offer related accessories";

  return "Create sale when customer confirms";
}

export function leadTemperature({ conversation, draft, summary }) {
  const activityDays = daysSince(conversation?.updatedAt || conversation?.latestMessage?.createdAt);
  const orders = Number(summary?.totalOrders || 0);

  if (draft?.id && orders > 0 && activityDays !== null && activityDays <= 3) {
    return {
      key: "HOT",
      label: "🔥 Hot lead",
      shortLabel: "Hot",
      tone: "success",
      reason: "Draft sale, buying history, and activity within 3 days.",
    };
  }

  if (activityDays !== null && activityDays <= 14) {
    return {
      key: "WARM",
      label: "🟡 Warm lead",
      shortLabel: "Warm",
      tone: "warning",
      reason: "Recent activity within 14 days.",
    };
  }

  return {
    key: "COLD",
    label: "⚪ Cold lead",
    shortLabel: "Cold",
    tone: "neutral",
    reason: "No meaningful activity for more than 14 days.",
  };
}

export function latestQuotation(summary) {
  return summary?.latestQuotation || summary?.proformas?.[0] || null;
}

export function hasQuotation(summary) {
  return Boolean(summary?.hasQuotation || Number(summary?.quotationCount || 0) > 0 || latestQuotation(summary));
}

export function isQuotationConverted(quotation) {
  return Boolean(
    quotation?.convertedToSaleId ||
      quotation?.convertedAt ||
      String(quotation?.status || "").toUpperCase() === "CONVERTED"
  );
}

export function convertedDraftSaleIds(summary) {
  const ids = new Set();
  const quotations = Array.isArray(summary?.proformas) ? summary.proformas : [];

  quotations.forEach((quotation) => {
    if (isQuotationConverted(quotation) && quotation?.draftSaleId) {
      ids.add(String(quotation.draftSaleId));
    }
  });

  const latest = latestQuotation(summary);
  if (isQuotationConverted(latest) && latest?.draftSaleId) {
    ids.add(String(latest.draftSaleId));
  }

  return ids;
}

export function isActiveWhatsAppDraft(draft, summary) {
  if (!draft?.id) return false;

  if (draft.isCancelled || draft.cancelledAt || draft.finalizedAt) return false;
  if (draft.isDraft === false) return false;

  const convertedIds = convertedDraftSaleIds(summary);
  if (convertedIds.has(String(draft.id))) return false;

  return true;
}

export function hasCompletedSale(summary) {
  return Number(summary?.totalOrders || 0) > 0 || Boolean(summary?.lastPurchase);
}

export function latestCompletedSale(summary) {
  return summary?.latestSale || null;
}

export function latestDeliveryNote(summary) {
  return summary?.latestDeliveryNote || summary?.deliveryNotes?.[0] || null;
}

export function hasDeliveryNote(summary) {
  return Boolean(summary?.hasDeliveryNote || Number(summary?.deliveryNoteCount || 0) > 0 || latestDeliveryNote(summary));
}

export function latestWarranty(summary) {
  return summary?.latestWarranty || summary?.warranties?.[0] || null;
}

export function hasWarranty(summary) {
  return Boolean(summary?.hasWarranty || Number(summary?.warrantyCount || 0) > 0 || latestWarranty(summary));
}

export function deliveryNoteCustomerMessage({ conversation, summary }) {
  const note = latestDeliveryNote(summary);
  const name = customerName(conversation);
  const number = note?.number || "your delivery note";
  const saleItems = normalizeSaleItemsForDelivery(latestCompletedSale(summary));

  const itemsText = saleItems
    .slice(0, 3)
    .map((item) => `${item.productName}${Number(item.quantity || 0) > 1 ? ` x${Number(item.quantity)}` : ""}`)
    .join(", ");

  const extraItems =
    saleItems.length > 3
      ? ` and ${saleItems.length - 3} more item${saleItems.length - 3 === 1 ? "" : "s"}`
      : "";

  const deliveryItems = itemsText
    ? `${itemsText}${extraItems}`
    : `${Number(note?.itemsCount || 0) || "the"} item${Number(note?.itemsCount || 0) === 1 ? "" : "s"}`;

  return `Hello ${name}, your delivery note ${number} is ready for ${deliveryItems}. Please check the products and quantities when received.`;
}

export function warrantyCustomerMessage({ conversation, summary }) {
  const warranty = latestWarranty(summary);
  const note = latestDeliveryNote(summary);
  const name = customerName(conversation);
  const number = warranty?.number || warranty?.warrantyNumber || "your warranty";
  const units = Array.isArray(warranty?.units) ? warranty.units : [];
  const saleItems = normalizeSaleItemsForDelivery(latestCompletedSale(summary));
  const productNames = (units.length ? units : saleItems)
    .slice(0, 3)
    .map((item) => cleanText(item.productName || item.unitLabel || item.name))
    .filter(Boolean);

  const productsText = productNames.length
    ? productNames.join(", ")
    : "your covered product";
  const endText = warranty?.endsAt ? ` until ${dateLabel(warranty.endsAt)}` : "";
  const deliveryText = note?.number ? ` Please keep delivery note ${note.number} for support requests.` : "";

  return `Hello ${name}, your warranty ${number} is active for ${productsText}${endText}.${deliveryText}`;
}

export function latestDeliveryNoteCustomerMessage({ messages = [], summary }) {
  const note = latestDeliveryNote(summary);
  if (!note) return null;

  const number = String(note.number || "").toLowerCase();
  const noteTime = note.createdAt || note.date ? new Date(note.createdAt || note.date).getTime() : 0;

  return [...messages]
    .filter((message) => {
      if (!isOutboundMessage(message)) return false;

      const text = messageText(message).toLowerCase();
      if (!text) return false;

      const messageTime = message.createdAt ? new Date(message.createdAt).getTime() : 0;
      if (noteTime && messageTime && messageTime < noteTime) return false;

      const mentionsDeliveryNote =
        text.includes("delivery note") || text.includes("delivered") || (number && text.includes(number));
      const mentionsItems =
        text.includes("products") || text.includes("quantities") || text.includes("items") || text.includes("received");

      return Boolean(mentionsDeliveryNote && mentionsItems);
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0] || null;
}

export function hasDeliveryNoteCustomerMessage({ messages = [], summary }) {
  return Boolean(latestDeliveryNoteCustomerMessage({ messages, summary }));
}

export function latestWarrantyCustomerMessage({ messages = [], summary }) {
  const warranty = latestWarranty(summary);
  if (!warranty) return null;

  const number = String(warranty.number || warranty.warrantyNumber || "").toLowerCase();
  const warrantyTime = warranty.createdAt ? new Date(warranty.createdAt).getTime() : 0;

  return [...messages]
    .filter((message) => {
      if (!isOutboundMessage(message)) return false;

      const text = messageText(message).toLowerCase();
      if (!text) return false;

      const messageTime = message.createdAt ? new Date(message.createdAt).getTime() : 0;
      if (warrantyTime && messageTime && messageTime < warrantyTime) return false;

      const mentionsWarranty = text.includes("warranty") || (number && text.includes(number));
      const mentionsSupport =
        text.includes("support") ||
        text.includes("service") ||
        text.includes("covered") ||
        text.includes("active");

      return Boolean(mentionsWarranty && mentionsSupport);
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0] || null;
}

export function hasWarrantyCustomerMessage({ messages = [], summary }) {
  return Boolean(latestWarrantyCustomerMessage({ messages, summary }));
}

export function normalizeSaleItemsForDelivery(sale) {
  const items = Array.isArray(sale?.items) ? sale.items : [];

  return items
    .map((item) => {
      const product = item.product || {};
      const productName =
        cleanText(item.productName) ||
        cleanText(product.name) ||
        cleanText(item.name) ||
        "Product";

      return {
        productId: cleanText(item.productId || product.id) || undefined,
        productName,
        serial: cleanText(item.serial || product.serial || product.sku) || undefined,
        quantity: Math.max(1, Number(item.quantity || 1)),
      };
    })
    .filter((item) => item.productName && item.quantity > 0);
}

export function latestOpenQuotation(summary) {
  const quotations = Array.isArray(summary?.proformas) ? summary.proformas : [];
  const openFromList = quotations.find((quotation) => quotation && !isQuotationConverted(quotation));

  if (openFromList) return openFromList;

  const latest = latestQuotation(summary);
  return latest && !isQuotationConverted(latest) ? latest : null;
}

export function messageText(message) {
  return String(message?.textContent || "").trim();
}

export function isOutboundMessage(message) {
  return String(message?.direction || "").toUpperCase() === "OUTBOUND";
}

export function quotationFollowUpMessage({ conversation, summary }) {
  const quotation = latestQuotation(summary);
  const name = customerName(conversation);
  const number = quotation?.number || "your quotation";
  const amount = money(quotation?.total || 0);

  return `Hello ${name}, your quotation ${number} for ${amount} is ready. Please confirm if you would like us to proceed with the sale.`;
}

export function latestQuotationFollowUp({ messages = [], summary }) {
  const quotation = latestQuotation(summary);
  if (!quotation) return null;

  const number = String(quotation.number || "").toLowerCase();
  const quotationTime = quotation.createdAt ? new Date(quotation.createdAt).getTime() : 0;

  return [...messages]
    .filter((message) => {
      if (!isOutboundMessage(message)) return false;

      const text = messageText(message).toLowerCase();
      if (!text) return false;

      const messageTime = message.createdAt ? new Date(message.createdAt).getTime() : 0;
      if (quotationTime && messageTime && messageTime < quotationTime) return false;

      const mentionsQuotation =
        text.includes("quotation") || text.includes("proforma") || (number && text.includes(number));
      const asksForDecision =
        text.includes("confirm") || text.includes("proceed") || text.includes("ready");

      return Boolean(mentionsQuotation && asksForDecision);
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0] || null;
}

export function hasQuotationFollowUp({ messages = [], summary }) {
  return Boolean(latestQuotationFollowUp({ messages, summary }));
}

export function recommendedSalesAction({ conversation, draft, summary, messages = [] }) {
  const outstanding = Number(summary?.outstandingCredit || 0);
  const orders = Number(summary?.totalOrders || 0);
  const lastPurchaseDays = daysSince(summary?.lastPurchase);

  if (outstanding > 0) {
    return {
      label: "Collect payment",
      detail: "Customer has outstanding credit. Payment follow-up is the highest-value action.",
      primary: "Payment reminder",
      action: "REMINDER",
    };
  }

  const openQuotation = latestOpenQuotation(summary);

  if (orders > 0 && !openQuotation) {
    if (!hasDeliveryNote(summary)) {
      return {
        label: "Create delivery note",
        detail: "The sale is completed. Prepare a delivery note with products and quantities only — no prices or totals.",
        primary: "Create delivery note",
        action: "DELIVERY_NOTE",
      };
    }

    if (!hasDeliveryNoteCustomerMessage({ messages, summary })) {
      return {
        label: "Send delivery note message",
        detail: "The delivery note is ready. Send a clear customer message with the delivery note number and delivered items only.",
        primary: "Prepare message",
        action: "DELIVERY_NOTE_MESSAGE",
      };
    }

    if (!hasWarranty(summary)) {
      return {
        label: "Create warranty",
        detail: "Delivery is documented. Create a warranty record from the completed sale for covered products.",
        primary: "Create warranty",
        action: "CREATE_WARRANTY",
      };
    }

    if (!hasWarrantyCustomerMessage({ messages, summary })) {
      return {
        label: "Send warranty message",
        detail: "The warranty record is ready. Send a simple support message with the warranty number and covered products.",
        primary: "Prepare message",
        action: "WARRANTY_MESSAGE",
      };
    }

    return {
      label: "After-sale support",
      detail: "The customer has delivery and warranty support recorded. Offer setup help, useful accessories, or close the conversation.",
      primary: "Prepare support",
      action: "AFTER_SALE",
    };
  }

  if (hasQuotationFollowUp({ messages, summary }) && openQuotation) {
    return {
      label: "Convert quotation to sale",
      detail: "The quotation follow-up was sent. When the customer confirms, convert this proforma into a real sale.",
      primary: "Convert to sale",
      action: "CONVERT_PROFORMA",
      quotationId: openQuotation.id,
    };
  }

  if (openQuotation || hasQuotation(summary)) {
    return {
      label: "Follow up quotation",
      detail: "A proforma exists for this conversation. Fill the reply box with a clear follow-up message.",
      primary: "Follow up",
      action: "FOLLOW_UP",
    };
  }

  if (!draft?.id) {
    return {
      label: "Create draft sale",
      detail: "No active draft exists for this conversation yet.",
      primary: "Create draft",
      action: "DRAFT",
    };
  }

  if (draft?.id) {
    return {
      label: "Create quotation",
      detail: "A draft exists. Convert it into a professional proforma before final sale.",
      primary: "Create quotation",
      action: "QUOTATION",
    };
  }

  if (orders > 0 && lastPurchaseDays !== null && lastPurchaseDays <= 30) {
    return {
      label: "Offer accessories",
      detail: "Customer recently bought. Recommend useful add-ons or replacements.",
      primary: "Prepare offer",
      action: "OFFER",
    };
  }

  return {
    label: "Follow up",
    detail: "Keep the conversation active and move the customer toward a concrete buying decision.",
    primary: "Follow up",
    action: "FOLLOW_UP",
  };
}

export function buildSalesTimeline({ conversation, draft, summary, messages = [] }) {
  const events = [];

  if (conversation?.createdAt) {
    events.push({
      id: "conversation-started",
      at: conversation.createdAt,
      title: "Started WhatsApp conversation",
      meta: cleanPhone(conversation.phone),
    });
  }

  if (draft?.id) {
    events.push({
      id: `draft-${draft.id}`,
      at: draft.createdAt || draft.updatedAt,
      title: "Draft sale created",
      meta: `${money(draft.total)} · ${draft.items?.length || 0} item${draft.items?.length === 1 ? "" : "s"}`,
    });
  }

  const quotationEvents = Array.isArray(summary?.proformas)
    ? summary.proformas
    : latestQuotation(summary)
      ? [latestQuotation(summary)]
      : [];

  quotationEvents.forEach((quotation) => {
    if (!quotation?.createdAt) return;

    events.push({
      id: `proforma-${quotation.id || quotation.number || quotation.createdAt}`,
      at: quotation.createdAt,
      title: "Proforma created",
      meta: `${quotation.number || "Proforma"} · ${money(quotation.total)}`,
    });
  });

  const quotationFollowUp = latestQuotationFollowUp({ messages, summary });

  if (quotationFollowUp?.createdAt) {
    events.push({
      id: `quotation-follow-up-${quotationFollowUp.id || quotationFollowUp.createdAt}`,
      at: quotationFollowUp.createdAt,
      title: "Quotation follow-up sent",
      meta: latestQuotation(summary)?.number || "Customer follow-up",
    });
  }

  if (summary?.lastPurchase) {
    events.push({
      id: "last-purchase",
      at: summary.lastPurchase,
      title: "Sale completed",
      meta: `${Number(summary.totalOrders || 0)} total order${Number(summary.totalOrders || 0) === 1 ? "" : "s"}`,
    });
  }

  const deliveryEvents = Array.isArray(summary?.deliveryNotes)
    ? summary.deliveryNotes
    : latestDeliveryNote(summary)
      ? [latestDeliveryNote(summary)]
      : [];

  deliveryEvents.forEach((note) => {
    if (!note?.createdAt && !note?.date) return;

    events.push({
      id: `delivery-note-${note.id || note.number || note.createdAt || note.date}`,
      at: note.createdAt || note.date,
      title: "Delivery note created",
      meta: `${note.number || "Delivery note"} · ${Number(note.itemsCount || 0)} item${Number(note.itemsCount || 0) === 1 ? "" : "s"}`,
    });
  });

  const deliveryNoteMessage = latestDeliveryNoteCustomerMessage({ messages, summary });

  if (deliveryNoteMessage?.createdAt) {
    events.push({
      id: `delivery-note-message-${deliveryNoteMessage.id || deliveryNoteMessage.createdAt}`,
      at: deliveryNoteMessage.createdAt,
      title: "Delivery note message sent",
      meta: latestDeliveryNote(summary)?.number || "Customer delivery update",
    });
  }

  const warranty = latestWarranty(summary);

  if (warranty?.createdAt || summary?.lastWarranty) {
    events.push({
      id: `warranty-${warranty?.id || warranty?.number || summary.lastWarranty}`,
      at: warranty?.createdAt || summary.lastWarranty,
      title: "Warranty activated",
      meta: `${warranty?.number || warranty?.warrantyNumber || "Warranty"} · ${Number(warranty?.unitsCount || warranty?.units?.length || 0)} covered item${Number(warranty?.unitsCount || warranty?.units?.length || 0) === 1 ? "" : "s"}`,
    });
  }

  return events
    .filter((event) => event.at && !Number.isNaN(new Date(event.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(-5);
}

export function normalizeDraftItemsForProforma(draft) {
  const items = Array.isArray(draft?.items) ? draft.items : [];

  return items
    .map((item) => {
      const product = item.product || {};
      const productName =
        cleanText(product.name) || cleanText(item.productName) || cleanText(item.name);

      if (!productName) return null;

      return {
        productId: cleanText(item.productId || product.id),
        productName,
        sku: cleanText(product.sku),
        category: cleanText(product.category || product.businessCategory),
        stockQty: Number(product.stockQty ?? product.availableQty ?? product.branchQty ?? 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        unitPrice: Number(item.unitPrice ?? item.price ?? product.sellPrice ?? 0),
        description: cleanText(product.serial || product.barcode),
      };
    })
    .filter(Boolean);
}

export function buildWhatsAppProformaPrefill({ conversation, draft }) {
  if (!conversation?.id) return null;

  const name = cleanText(conversation.customer?.name) || cleanText(conversation.phone) || "WhatsApp customer";
  const phone = cleanText(conversation.customer?.phone) || cleanText(conversation.phone);
  const sourceLines = [
    "Source: WhatsApp",
    `Conversation ID: ${conversation.id}`,
  ];

  if (draft?.id) sourceLines.push(`Draft sale ID: ${draft.id}`);

  return {
    source: "WHATSAPP",
    conversationId: conversation.id,
    draftSaleId: draft?.id || "",
    customerId: conversation.customerId || conversation.customer?.id || draft?.customerId || "",
    customerName: name,
    customerPhone: phone,
    customerEmail: conversation.customer?.email || draft?.customer?.email || "",
    customerAddress: conversation.customer?.address || draft?.customer?.address || "",
    reference: `WHATSAPP:${conversation.id}`,
    notes: sourceLines.join("\n"),
    items: normalizeDraftItemsForProforma(draft),
    createdAt: new Date().toISOString(),
  };
}


export function buyingProbability({ conversation, draft, summary }) {
  let score = 20;

  const text = [
    conversation?.latestMessage?.textContent,
    conversation?.customer?.name,
    conversation?.phone,
  ]
    .join(" ")
    .toLowerCase();

  if (draft?.id) score += 35;
  if (text.includes("price") || text.includes("how much") || text.includes("angahe")) score += 18;
  if (text.includes("available") || text.includes("stock") || text.includes("ufite")) score += 18;
  if (text.includes("pay later") || text.includes("credit") || text.includes("ideni")) score += 15;
  if (text.includes("deliver") || text.includes("delivery") || text.includes("location")) score += 12;
  if (Number(summary?.totalOrders || 0) > 0) score += 10;
  if (Number(summary?.outstandingCredit || 0) > 0) score -= 8;

  return Math.max(0, Math.min(100, score));
}

export function probabilityLabel(score) {
  if (score >= 75) return { label: "High", tone: "success" };
  if (score >= 40) return { label: "Medium", tone: "warning" };
  return { label: "Low", tone: "neutral" };
}

export function opportunityValue({ draft, summary }) {
  const draftTotal = Number(draft?.total || 0);
  if (draftTotal > 0) return draftTotal;

  const orders = Number(summary?.totalOrders || 0);
  const revenue = Number(summary?.totalRevenue || 0);

  if (orders > 0 && revenue > 0) return Math.round(revenue / orders);

  return 0;
}

export function conversationPriority({ conversation, draft, summary }) {
  const score = buyingProbability({ conversation, draft, summary });
  const outstanding = Number(summary?.outstandingCredit || 0);
  const orders = Number(summary?.totalOrders || 0);

  if (draft?.id) return { label: "Buying", tone: "warning" };
  if (score >= 75) return { label: "Hot", tone: "success" };
  if (outstanding > 0) return { label: "Follow up", tone: "warning" };
  if (orders >= 3) return { label: "Returning", tone: "info" };
  return { label: "New", tone: "neutral" };
}


export function customerName(conversation) {
  return (
    conversation?.customer?.name ||
    conversation?.phone ||
    conversation?.assignedTo?.name ||
    "WhatsApp customer"
  );
}

export function latestPreview(conversation) {
  const message = conversation?.latestMessage;
  if (!message) return "No messages yet";

  return `${message.direction === "OUTBOUND" ? "You: " : ""}${message.textContent || "Message"}`;
}

export function unreadCount(conversation, active) {
  if (active) return 0;

  const explicit =
    conversation?.unreadCount ??
    conversation?.unreadMessages ??
    conversation?.unreadMessageCount ??
    conversation?.unseenCount ??
    null;

  if (explicit === null || explicit === undefined) return 0;

  const value = Number(explicit);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

export function markConversationOpened(conversation) {
  if (!conversation) return conversation;

  return {
    ...conversation,
    unreadCount: 0,
    unreadMessages: 0,
    unreadMessageCount: 0,
    unseenCount: 0,
  };
}

export function toneForStatus(status) {
  const value = String(status || "").toUpperCase();

  if (["SENT", "PAID", "ACTIVE", "READY", "OPEN"].includes(value)) return "success";
  if (["PARTIAL", "QUEUED", "DRAFT"].includes(value)) return "warning";
  if (["FAILED", "OVERDUE", "MISSING", "CLOSED"].includes(value)) return "danger";

  return "neutral";
}
