export const routes = {
  root: "/",

  landing: "/(auth)/landing",
  businessIntent: "/(auth)/business-intent",
  verifyOtp: "/(auth)/verify-otp",
  choosePath: "/(auth)/choose-path",
  choosePlan: "/(auth)/choose-plan",
  ownerPayment: "/(auth)/owner-payment",
  createPassword: "/(auth)/create-password",
  confirmSignup: "/(auth)/confirm-signup",
  login: "/(auth)/login",

  dashboard: "/(app)/dashboard",

  sales: "/(app)/sales",
  salesList: "/(app)/sales/list",
  salesCredit: "/(app)/sales/credit",

  pos: "/(app)/pos",
  cashDrawer: "/(app)/cash-drawer",

  stock: "/(app)/stock",
  inventory: "/(app)/inventory",

  people: "/(app)/people",
  customers: "/(app)/customers",
  customer: (id: string) => `/(app)/customers/${id}` as const,

  employees: "/(app)/people",
  more: "/(app)/more",

  documents: "/(app)/documents",
  document: (id: string) => `/(app)/documents/${id}` as const,

  repairs: "/(app)/repairs",
  repair: (id: string) => `/(app)/repairs/${id}` as const,

  reports: "/(app)/reports",
  report: (id: string) => `/(app)/reports/${id}` as const,

  expenses: "/(app)/expenses",
  expense: (id: string) => `/(app)/expenses/${id}` as const,

  suppliers: "/(app)/suppliers",
  supplier: (id: string) => `/(app)/suppliers/${id}` as const,
  supplierSupplyNew: (id: string) => `/(app)/suppliers/${id}/supplies/new` as const,

  support: "/(app)/support",
  supportThread: (id: string) => `/(app)/support/${id}` as const,

  settings: "/(app)/settings",
  settingsBusiness: "/(app)/settings/business",
  settingsDocuments: "/(app)/settings/documents",
  settingsTaxDisplay: "/(app)/settings/tax-display",
  settingsLocations: "/(app)/settings/locations",
  settingsSecurity: "/(app)/settings/security",
  settingsAccess: "/(app)/settings/access",

  interstore: "/(app)/interstore",
  interstoreDetail: (id: string) => `/(app)/interstore/${id}` as const,

  whatsapp: "/(app)/whatsapp",
  whatsappConversation: (id: string) => `/(app)/whatsapp/conversations/${id}` as const,
  whatsappDraft: (id: string) => `/(app)/whatsapp/drafts/${id}` as const,

  whatsappBroadcasts: "/(app)/whatsapp/broadcasts",
  whatsappBroadcast: (id: string) => `/(app)/whatsapp/broadcasts/${id}` as const,

  whatsappPromotions: "/(app)/whatsapp/promotions",
  whatsappPromotion: (id: string) => `/(app)/whatsapp/promotions/${id}` as const,

  reorderList: "/(app)/more",
  stockHistory: "/(app)/more",
} as const;
