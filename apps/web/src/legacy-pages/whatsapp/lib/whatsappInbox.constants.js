export const WHATSAPP_WORKSPACE_ROLES = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "STOREKEEPER",
  "TECHNICIAN",
];

export const WHATSAPP_MANAGER_ROLES = ["OWNER", "MANAGER"];
export const DEFAULT_MESSAGE_FORMAT = "promo_template";
export const DEFAULT_MESSAGE_LANGUAGE = "en_US";
export const PROMOTION_LIST_LIMIT = 8;
export const BROADCAST_LIST_LIMIT = 6;
export const RECIPIENT_PREVIEW_VISIBLE_LIMIT = 10;
export const LARGE_AUDIENCE_WARNING_COUNT = 50;
export const FORCE_QUEUE_RECIPIENT_COUNT = 500;
export const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";
export const BROADCAST_PREVIEW_CACHE_KEY = "storvex_whatsapp_broadcast_preview_cache_v1";
export const BROADCAST_FAILURE_CACHE_KEY = "storvex_whatsapp_broadcast_failure_cache_v1";

export const BUSINESS_CATEGORY_LABELS = {
  ELECTRONICS: "Electronics retail",
  ELECTRONICS_RETAIL: "Electronics retail",
  PHONE_SHOP: "Electronics retail",
  LAPTOP_SHOP: "Electronics retail",
  ACCESSORIES_SHOP: "Electronics retail",
  REPAIR_SHOP: "Electronics retail",
  MIXED_ELECTRONICS: "Electronics retail",
  HARDWARE: "Hardware / Quincaillerie",
  QUINCAILLERIE: "Hardware / Quincaillerie",
  HOME_KITCHEN: "Home & kitchen",
  HOME_AND_KITCHEN: "Home & kitchen",
  LIGHTING: "Lighting",
  SPARE_PARTS: "Spare parts",
  AUTO_PARTS: "Spare parts",
};

export const AUDIENCE_OPTIONS = [
  {
    value: "ALL_OPTED_IN",
    label: "All WhatsApp customers",
    helper: "Every customer allowed to receive updates.",
  },
  {
    value: "CATEGORY_CUSTOMERS",
    label: "This store category customers",
    helper: "Customers matched to your registered business category.",
  },
  {
    value: "CREDIT_CUSTOMERS",
    label: "Credit customers",
    helper: "Customers with credit purchase history.",
  },
  {
    value: "OVERDUE_CREDIT_CUSTOMERS",
    label: "Overdue credit customers",
    helper: "Customers who need payment follow-up.",
  },
  {
    value: "PRODUCT_BUYERS",
    label: "Product buyers",
    helper: "Customers connected to the selected promotion product.",
  },
];
