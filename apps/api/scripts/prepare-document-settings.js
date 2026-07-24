const {
  PrismaClient,
} = require("@prisma/client");

const prisma = new PrismaClient();

async function prepareDocumentSettings() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TenantDocumentSettings" (
      "tenantId" TEXT NOT NULL,
      "receiptPrefix" TEXT NOT NULL DEFAULT 'RCT',
      "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
      "warrantyPrefix" TEXT NOT NULL DEFAULT 'WAR',
      "receiptPadding" INTEGER NOT NULL DEFAULT 6,
      "invoicePadding" INTEGER NOT NULL DEFAULT 6,
      "warrantyPadding" INTEGER NOT NULL DEFAULT 6,
      "invoiceTerms" TEXT,
      "warrantyTerms" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      "proformaPrefix" TEXT NOT NULL DEFAULT 'PRF',
      "proformaPadding" INTEGER NOT NULL DEFAULT 6,
      "proformaTerms" TEXT,
      "deliveryNoteTerms" TEXT,

      "documentPrimaryColor" TEXT,
      "documentAccentColor" TEXT,

      "documentHeaderDisplay" TEXT NOT NULL DEFAULT 'LOGO_AND_NAME',
      "documentSizeMode" TEXT NOT NULL DEFAULT 'AUTO',

      "taxMode" TEXT NOT NULL DEFAULT 'NONE',
      "taxDisplayMode" TEXT NOT NULL DEFAULT 'HIDDEN',
      "taxName" TEXT,
      "taxRateBps" INTEGER NOT NULL DEFAULT 0,
      "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
      "showTaxOnCustomerDocuments" BOOLEAN NOT NULL DEFAULT false,

      "deliveryPrefix" TEXT NOT NULL DEFAULT 'DLV',
      "deliveryPadding" INTEGER NOT NULL DEFAULT 6,

      "deliveryRequireReceiverName" BOOLEAN NOT NULL DEFAULT true,
      "deliveryRequireReceiverPhone" BOOLEAN NOT NULL DEFAULT false,
      "deliveryRequireSignature" BOOLEAN NOT NULL DEFAULT true,
      "deliveryRequireDeliveredBy" BOOLEAN NOT NULL DEFAULT true,
      "deliveryRequireLocation" BOOLEAN NOT NULL DEFAULT true,
      "deliveryShowSerialNumbers" BOOLEAN NOT NULL DEFAULT true,
      "deliveryAllowPartialDelivery" BOOLEAN NOT NULL DEFAULT false,

      "showDocumentLogo" BOOLEAN NOT NULL DEFAULT true,
      "showDocumentQr" BOOLEAN NOT NULL DEFAULT false,
      "showDocumentWatermark" BOOLEAN NOT NULL DEFAULT false,
      "showPrintedDate" BOOLEAN NOT NULL DEFAULT true,
      "showBusinessContacts" BOOLEAN NOT NULL DEFAULT true,

      "autoReceiptNumbering" BOOLEAN NOT NULL DEFAULT true,
      "autoInvoiceNumbering" BOOLEAN NOT NULL DEFAULT true,
      "autoWarrantyNumbering" BOOLEAN NOT NULL DEFAULT true,
      "autoProformaNumbering" BOOLEAN NOT NULL DEFAULT true,
      "autoDeliveryNumbering" BOOLEAN NOT NULL DEFAULT true,

      CONSTRAINT "TenantDocumentSettings_pkey"
        PRIMARY KEY ("tenantId")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TenantDocumentCounter" (
      "tenantId" TEXT NOT NULL,
      "nextReceiptSeq" BIGINT NOT NULL DEFAULT 1,
      "nextInvoiceSeq" BIGINT NOT NULL DEFAULT 1,
      "nextWarrantySeq" BIGINT NOT NULL DEFAULT 1,
      "nextProformaSeq" BIGINT NOT NULL DEFAULT 1,
      "nextDeliverySeq" BIGINT NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "TenantDocumentCounter_pkey"
        PRIMARY KEY ("tenantId")
    )
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
          'TenantDocumentSettings_tenantId_fkey'
      ) THEN
        ALTER TABLE "TenantDocumentSettings"
          ADD CONSTRAINT
            "TenantDocumentSettings_tenantId_fkey"
          FOREIGN KEY ("tenantId")
          REFERENCES "Tenant"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE;
      END IF;
    END
    $$
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
          'TenantDocumentCounter_tenantId_fkey'
      ) THEN
        ALTER TABLE "TenantDocumentCounter"
          ADD CONSTRAINT
            "TenantDocumentCounter_tenantId_fkey"
          FOREIGN KEY ("tenantId")
          REFERENCES "Tenant"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE;
      END IF;
    END
    $$
  `);

  console.log(
    "TenantDocumentSettings table is ready.",
  );

  console.log(
    "TenantDocumentCounter table is ready.",
  );
}

prepareDocumentSettings()
  .catch((error) => {
    console.error(
      "Failed to prepare document settings tables:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
