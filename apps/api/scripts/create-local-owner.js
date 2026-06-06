const bcrypt = require("bcryptjs");
const prisma = require("../src/config/database");

async function main() {
  const email = String(process.env.LOCAL_OWNER_EMAIL || "owner@ruraxis.com")
    .trim()
    .toLowerCase();

  const phone = String(process.env.LOCAL_OWNER_PHONE || "250785587830").trim();
  const password = String(process.env.LOCAL_OWNER_PASSWORD || "Owner@12345");
  const businessName = String(process.env.LOCAL_BUSINESS_NAME || "Storvex Electronics Demo").trim();

  if (password.length < 8) {
    throw new Error("LOCAL_OWNER_PASSWORD must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (existing) {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email },
      data: {
        password: passwordHash,
        isActive: true,
        role: "OWNER",
      },
    });

    console.log("Local owner already existed. Password reset:", {
      email,
      password,
    });

    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: businessName,
        email,
        phone,
        status: "ACTIVE",
        shopType: "ELECTRONICS",
        district: "Nyarugenge",
        sector: "Nyarugenge",
        address: "Kigali, Rwanda",
        countryCode: "RW",
        currencyCode: "RWF",
        timezone: "Africa/Kigali",
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    });

    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: "Store Owner",
        email,
        phone,
        password: passwordHash,
        role: "OWNER",
        isActive: true,
      },
    });

    const mainBranch = await tx.branch.create({
      data: {
        tenantId: tenant.id,
        name: `${businessName} Main Branch`,
        code: "MAIN",
        type: "MAIN",
        status: "ACTIVE",
        phone,
        countryCode: "RW",
        district: "Nyarugenge",
        sector: "Nyarugenge",
        address: "Kigali, Rwanda",
        isMain: true,
        createdById: owner.id,
      },
    });

    await tx.tenant.update({
      where: { id: tenant.id },
      data: {
        mainBranchId: mainBranch.id,
      },
    });

    await tx.userBranchAssignment.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        branchId: mainBranch.id,
        isDefault: true,
        canOperate: true,
        canViewReports: true,
      },
    });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 365);

    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        status: "ACTIVE",
        accessMode: "ACTIVE",
        planKey: "local-dev",
        tierKey: "business",
        cycleKey: "annual",
        staffLimit: 50,
        branchLimit: 5,
        extraBranchCount: 0,
        priceAmount: 0,
        currency: "RWF",
        startDate,
        endDate,
        trialConsumed: false,
      },
    });

    await tx.tenantDocumentSettings.create({
      data: {
        tenantId: tenant.id,
        receiptPrefix: "RCT",
        invoicePrefix: "INV",
        warrantyPrefix: "WAR",
        proformaPrefix: "PRF",
        receiptPadding: 6,
        invoicePadding: 6,
        warrantyPadding: 6,
        proformaPadding: 6,
        documentHeaderDisplay: "LOGO_AND_NAME",
        documentSizeMode: "AUTO",
        taxMode: "NONE",
        taxDisplayMode: "HIDDEN",
        taxName: "VAT",
        taxRateBps: 0,
        pricesIncludeTax: false,
        showTaxOnCustomerDocuments: false,
      },
    });

    await tx.tenantDocumentCounter.create({
      data: {
        tenantId: tenant.id,
        nextReceiptSeq: 1,
        nextInvoiceSeq: 1,
        nextWarrantySeq: 1,
        nextProformaSeq: 1,
      },
    });

    return { tenant, owner, mainBranch };
  });

  console.log("Local Storvex owner ready:", {
    business: result.tenant.name,
    tenantId: result.tenant.id,
    branch: result.mainBranch.name,
    branchId: result.mainBranch.id,
    email,
    password,
  });
}

main()
  .catch((error) => {
    console.error("Failed to create local owner:", error);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });