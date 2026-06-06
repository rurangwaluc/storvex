export const STORE_NAV_ITEMS = [
  {
    section: "Core",
    items: [
      { label: "Dashboard", to: "/app", icon: "dashboard" },
      { label: "Sales / POS", to: "/app/pos", icon: "pos" },
      { label: "Inventory", to: "/app/inventory", icon: "inventory" },
      { label: "Customers", to: "/app/customers", icon: "customers" },
      { label: "Suppliers", to: "/app/suppliers", icon: "suppliers" },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Repairs", to: "/app/repairs", icon: "repairs" },
      { label: "Documents", to: "/app/documents", icon: "documents" },
      { label: "Inter-store", to: "/app/interstore", icon: "transfer" },
      { label: "WhatsApp", to: "/app/whatsapp/inbox", icon: "chat" },
      {
        label: "Support",
        to: "/app/support",
        icon: "support",
        roles: [
          "OWNER",
          "MANAGER",
          "CASHIER",
          "SELLER",
          "STOREKEEPER",
          "TECHNICIAN",
        ],
      },
    ],
  },
  {
    section: "Management",
    items: [
      { label: "Reports", to: "/app/reports", icon: "reports" },
      { label: "Employees", to: "/app/employees", icon: "team" },
      { label: "Billing", to: "/app/billing", icon: "billing" },
      { label: "Settings", to: "/app/settings", icon: "settings" },
      { label: "Audit logs", to: "/app/audit", icon: "audit" },
    ],
  },
];