# Storvex

Storvex is a business-control platform for technical retail businesses.

Current focus:

- Electronics retailers
- Hardware / quincaillerie businesses
- Home and kitchen materials businesses
- Lighting businesses
- Spare parts businesses

The platform helps businesses manage:

- Sales
- Inventory
- Customers
- Suppliers
- Expenses
- Staff access
- Cash drawer control
- Documents
- Reports
- Repairs / warranty
- WhatsApp commerce workflows
- Platform billing and support

Future direction:

- Public store pages
- Live-stock marketplace
- AI sales/support agent
- AI stock insights and business-control assistant

---

## Monorepo structure

```txt
storvex/
├── apps/
│   ├── api/          # Express + Prisma backend
│   ├── web/          # Store/business web app, now running on Next.js
│   ├── platform/     # Storvex platform/admin app, Next.js
│   └── mobile/       # Expo mobile app
├── packages/
│   ├── config/
│   ├── db/
│   ├── permissions/
│   ├── schemas/
│   ├── ui/
│   └── utils/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── scripts/
├── docs/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md