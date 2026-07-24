-- Storvex current schema baseline.
-- Generated from apps/api/prisma/schema.prisma on 2026-07-24.
-- Previous migrations are preserved under prisma/legacy-migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MarketplaceCustomerStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "MarketplaceCustomerVerificationChannel" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "MarketplaceAnalyticsEventType" AS ENUM ('STORE_VIEW', 'PRODUCT_VIEW', 'PRODUCT_CARD_OPEN', 'ADD_TO_CART', 'SAVE_PRODUCT', 'ADD_TO_COMPARE', 'SEARCH', 'SEARCH_NO_RESULTS');

-- CreateEnum
CREATE TYPE "MarketplaceRequestStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MarketplaceContactChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "MarketplaceFulfilmentMethod" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "MarketplaceDeliveryCoverage" AS ENUM ('KIGALI', 'OUTSIDE_KIGALI');

-- CreateEnum
CREATE TYPE "MarketplaceRequestPaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'MOMO_ON_DELIVERY', 'PAY_ON_PICKUP', 'SELLER_APPROVED_OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('ACCOUNT_ACCESS', 'BILLING_PAYMENT', 'ONBOARDING_SETUP', 'POS_SALES', 'INVENTORY_STOCK', 'RECEIPTS_INVOICES', 'WHATSAPP', 'STAFF_USERS', 'BUG_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('NORMAL', 'URGENT', 'BUSINESS_BLOCKED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_TENANT', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportMessageSenderType" AS ENUM ('TENANT_USER', 'PLATFORM_USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'SELLER', 'STOREKEEPER', 'TECHNICIAN', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT');

-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('MAIN', 'STANDARD');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OwnerIntentStatus" AS ENUM ('PENDING', 'PAID', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionAccessMode" AS ENUM ('TRIAL', 'ACTIVE', 'GRACE', 'READ_ONLY', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('RECEIVED', 'CHECKING', 'WAITING_APPROVAL', 'APPROVED', 'IN_REPAIR', 'READY_FOR_PICKUP', 'COLLECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "RepairApprovalStatus" AS ENUM ('NOT_REQUESTED', 'WAITING', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'SALARY', 'UTILITIES', 'TRANSPORT', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpensePaidFrom" AS ENUM ('CASH_DRAWER', 'BANK', 'MOMO', 'OWNER_MONEY', 'OTHER');

-- CreateEnum
CREATE TYPE "InterStoreDealStatus" AS ENUM ('BORROWED', 'SOLD', 'RETURNED', 'PAID', 'RECEIVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE_DEAL', 'MARK_SOLD', 'MARK_RETURNED', 'MARK_PAID', 'MARK_RECEIVED', 'ADD_PAYMENT', 'EXPENSE_CREATED', 'EXPENSE_APPROVED', 'EXPENSE_DELETED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DEACTIVATED', 'PRODUCT_ACTIVATED', 'STOCK_ADJUSTED', 'SALE_CREATED', 'SALE_PAYMENT_ADDED', 'SALE_CANCELLED', 'SALE_REFUNDED', 'WARRANTY_CREATED', 'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_DEACTIVATED', 'CUSTOMER_REACTIVATED', 'WHATSAPP_REPLY_SENT', 'WHATSAPP_CONVERSATION_STATUS_UPDATED', 'WHATSAPP_CONVERSATION_ASSIGNED', 'WHATSAPP_CONVERSATION_UNASSIGNED', 'WHATSAPP_SALE_DRAFT_CREATED', 'WHATSAPP_SALE_DRAFT_UPDATED', 'WHATSAPP_SALE_DRAFT_DELETED', 'WHATSAPP_SALE_DRAFT_FINALIZED', 'WHATSAPP_ACCOUNT_CREATED', 'WHATSAPP_ACCOUNT_UPDATED', 'WHATSAPP_ACCOUNT_STATUS_UPDATED', 'WHATSAPP_PROMOTION_CREATED', 'WHATSAPP_PROMOTION_UPDATED', 'WHATSAPP_PROMOTION_DELETED', 'WHATSAPP_BROADCAST_CREATED', 'WHATSAPP_BROADCAST_UPDATED', 'WHATSAPP_BROADCAST_QUEUED', 'WHATSAPP_BROADCAST_SENT', 'WHATSAPP_BROADCAST_FAILED', 'BRANCH_CREATED', 'BRANCH_UPDATED', 'BRANCH_SET_MAIN', 'BRANCH_ARCHIVED', 'BRANCH_REACTIVATED', 'BRANCH_STAFF_ASSIGNED', 'BRANCH_STAFF_REMOVED', 'MARKETPLACE_DELIVERY_FAILED');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('INTERSTORE_DEAL', 'EXPENSE', 'SALE', 'REPAIR', 'PRODUCT', 'CUSTOMER', 'USER', 'TENANT', 'SUBSCRIPTION', 'PAYMENT', 'WHATSAPP_CONVERSATION', 'WHATSAPP_MESSAGE', 'WHATSAPP_BROADCAST', 'BRANCH', 'MARKETPLACE_ORDER');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('CASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "SalePaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "InterStorePaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "SalePaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'LOCATION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "StockAdjustmentType" AS ENUM ('RESTOCK', 'LOSS', 'CORRECTION');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierIdType" AS ENUM ('NATIONAL_ID', 'PASSPORT');

-- CreateEnum
CREATE TYPE "SupplierSourceType" AS ENUM ('BOUGHT', 'GIFT', 'TRADE_IN', 'CONSIGNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplySourceType" AS ENUM ('BOUGHT', 'GIFT', 'TRADE_IN', 'CONSIGNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierBillStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierPaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "OwnerLoanType" AS ENUM ('GIVEN_OUT', 'RECEIVED');

-- CreateEnum
CREATE TYPE "OwnerLoanStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OwnerLoanPaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "MoneyAccountType" AS ENUM ('MOMO', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "MoneyMovementDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "MoneyMovementReason" AS ENUM ('OPENING_BALANCE', 'LOAN_GIVEN_OUT', 'LOAN_RECEIVED', 'LOAN_REPAYMENT', 'OWNER_ADJUSTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('BILL', 'RECEIPT', 'DELIVERY_NOTE', 'PURCHASE_ORDER', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "cash_drawer_event_type" AS ENUM ('OPEN', 'CLOSE', 'ADJUST');

-- CreateEnum
CREATE TYPE "cash_movement_reason" AS ENUM ('FLOAT', 'WITHDRAWAL', 'DEPOSIT', 'EXPENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "cash_movement_type" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ProformaStatus" AS ENUM ('DRAFT', 'SENT', 'EXPIRED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductMarketplaceStatus" AS ENUM ('INTERNAL', 'DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "ProductImageType" AS ENUM ('ORIGINAL', 'CLEANED');

-- CreateEnum
CREATE TYPE "ProductImageStudioStatus" AS ENUM ('PENDING', 'PROCESSING', 'REVIEW', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'PLATFORM_SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "role" "UserRole" NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "is_granted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerIntent" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "status" "OwnerIntentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "address" TEXT,
    "convertedAt" TIMESTAMP(3),
    "district" TEXT,
    "ownerName" TEXT NOT NULL,
    "sector" TEXT,
    "shopType" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "deviceId" TEXT,
    "browserFingerprint" TEXT,
    "signupIp" TEXT,
    "signupUserAgent" TEXT,
    "trialGrantedAt" TIMESTAMP(3),
    "trialEligibilityCheckedAt" TIMESTAMP(3),
    "trialBlockedReason" TEXT,
    "requestedPlanKey" TEXT,
    "requestedTierKey" TEXT,
    "requestedCycleKey" TEXT,
    "requestedStaffLimit" INTEGER,
    "requestedPriceAmount" DOUBLE PRECISION,
    "requestedCurrency" TEXT,
    "requestedEntitlements" JSONB,

    CONSTRAINT "OwnerIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "intentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "reference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "planKey" TEXT,
    "tierKey" TEXT,
    "cycleKey" TEXT,
    "staffLimit" INTEGER,
    "branchLimit" INTEGER,
    "priceAmount" DOUBLE PRECISION,
    "entitlementSnapshot" JSONB,
    "purpose" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoUrl" TEXT,
    "receiptHeader" TEXT,
    "receiptFooter" TEXT,
    "logoKey" TEXT,
    "shopType" TEXT,
    "district" TEXT,
    "sector" TEXT,
    "address" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'RW',
    "currencyCode" TEXT NOT NULL DEFAULT 'RWF',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Kigali',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "cash_drawer_block_cash_sales" BOOLEAN NOT NULL DEFAULT true,
    "mainBranchId" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceSellerProfile" (
    "tenantId" TEXT NOT NULL,
    "publicSlug" TEXT,
    "marketplaceCode" CHAR(3) NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "customerPhone" TEXT,
    "whatsappPhone" TEXT,
    "marketplaceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "temporarilyClosed" BOOLEAN NOT NULL DEFAULT false,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryAreas" JSONB,
    "paymentMethods" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceSellerProfile_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "MarketplaceCustomer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "MarketplaceCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCustomerSession" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceCustomerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCustomerPasswordReset" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestedIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceCustomerPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCustomerVerification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" "MarketplaceCustomerVerificationChannel" NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceCustomerVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "marketplaceCustomerId" TEXT,
    "visitorId" VARCHAR(80),
    "eventType" "MarketplaceAnalyticsEventType" NOT NULL,
    "searchTerm" TEXT,
    "source" VARCHAR(80),
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "marketplaceCustomerId" TEXT,
    "requestNumber" TEXT NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "status" "MarketplaceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "preferredContact" "MarketplaceContactChannel" NOT NULL,
    "fulfilmentMethod" "MarketplaceFulfilmentMethod" NOT NULL,
    "deliveryCoverage" "MarketplaceDeliveryCoverage",
    "paymentMethod" "MarketplaceRequestPaymentMethod" NOT NULL,
    "fulfilmentBranchId" TEXT,
    "saleId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "deliveryAddress" TEXT,
    "deliveryDistrict" TEXT,
    "deliverySector" TEXT,
    "customerNote" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellerNameSnapshot" TEXT NOT NULL,
    "sellerPhoneSnapshot" TEXT,
    "sellerEmailSnapshot" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "deliveryFailedAt" TIMESTAMP(3),
    "deliveryFailureReason" TEXT,
    "deliveryFailureNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productSlugSnapshot" TEXT NOT NULL,
    "productTitleSnapshot" TEXT NOT NULL,
    "productCategorySnapshot" TEXT,
    "productImageSnapshot" TEXT,
    "productUrlSnapshot" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceRequestReservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MarketplaceRequestReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "BranchType" NOT NULL DEFAULT 'STANDARD',
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "email" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'RW',
    "district" TEXT,
    "sector" TEXT,
    "address" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBranchAssignment" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "canOperate" BOOLEAN NOT NULL DEFAULT true,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBranchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDocumentSettings" (
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

    CONSTRAINT "TenantDocumentSettings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "TenantDocumentCounter" (
    "tenantId" TEXT NOT NULL,
    "nextReceiptSeq" BIGINT NOT NULL DEFAULT 1,
    "nextInvoiceSeq" BIGINT NOT NULL DEFAULT 1,
    "nextWarrantySeq" BIGINT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextProformaSeq" BIGINT NOT NULL DEFAULT 1,
    "nextDeliverySeq" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "TenantDocumentCounter_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "accessMode" "SubscriptionAccessMode" NOT NULL DEFAULT 'ACTIVE',
    "planKey" TEXT,
    "tierKey" TEXT,
    "cycleKey" TEXT,
    "staffLimit" INTEGER,
    "branchLimit" INTEGER,
    "extraBranchCount" INTEGER NOT NULL DEFAULT 0,
    "priceAmount" DOUBLE PRECISION,
    "currency" TEXT,
    "entitlementSnapshot" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "trialStartDate" TIMESTAMP(3),
    "trialEndDate" TIMESTAMP(3),
    "graceEndDate" TIMESTAMP(3),
    "readOnlySince" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "renewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialConsumed" BOOLEAN NOT NULL DEFAULT false,
    "trialSourceIntentId" TEXT,
    "nextPlanKey" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "serial" TEXT,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "sellPrice" DOUBLE PRECISION NOT NULL,
    "stockQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "brand" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "subcategoryOther" TEXT,
    "minStockLevel" INTEGER,
    "barcode" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "supplierName" TEXT,
    "supplierId" TEXT,
    "categoryAttributes" JSONB,
    "marketplaceStatus" "ProductMarketplaceStatus" NOT NULL DEFAULT 'INTERNAL',
    "marketplaceTitle" TEXT,
    "marketplaceDescription" TEXT,
    "marketplacePrice" DOUBLE PRECISION,
    "marketplaceSalePrice" DOUBLE PRECISION,
    "marketplaceSaleStartsAt" TIMESTAMP(3),
    "marketplaceSaleEndsAt" TIMESTAMP(3),
    "marketplaceCategory" TEXT,
    "marketplaceAttributes" JSONB,
    "marketplaceSlug" TEXT,
    "marketplacePublishedAt" TIMESTAMP(3),
    "marketplaceUnpublishedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "imageType" "ProductImageType" NOT NULL DEFAULT 'ORIGINAL',
    "sourceImageId" TEXT,
    "isMarketplaceApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "studioVersion" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailKey" TEXT,
    "reviewKey" TEXT,
    "reviewThumbnailKey" TEXT,
    "thumbnailWidth" INTEGER,
    "thumbnailHeight" INTEGER,
    "thumbnailSizeBytes" INTEGER,
    "backgroundColor" TEXT,
    "processingProvider" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImageStudioRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceImageId" TEXT NOT NULL,
    "resultImageId" TEXT,
    "status" "ProductImageStudioStatus" NOT NULL DEFAULT 'PENDING',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "requestedById" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImageStudioRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchInventory" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyOnHand" INTEGER NOT NULL DEFAULT 0,
    "qtyReserved" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER,
    "shelfLabel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "tinNumber" TEXT,
    "idNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketplaceCustomerId" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "cashierId" TEXT NOT NULL,
    "customerId" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "subtotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxName" TEXT,
    "taxMode" TEXT NOT NULL DEFAULT 'NONE',
    "taxDisplayMode" TEXT NOT NULL DEFAULT 'HIDDEN',
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    "showTaxOnCustomerDocuments" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "saleType" "SaleType" NOT NULL DEFAULT 'CASH',
    "status" "SalePaymentStatus" NOT NULL DEFAULT 'PAID',
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "draftSource" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelNote" TEXT,
    "refundedTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receiptNumber" TEXT,
    "invoiceNumber" TEXT,
    "conversationId" TEXT,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "receivedById" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "SalePaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proforma" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT,
    "createdById" TEXT,
    "number" TEXT NOT NULL,
    "status" "ProformaStatus" NOT NULL DEFAULT 'DRAFT',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "validUntil" TIMESTAMP(3),
    "preparedBy" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "conversationId" TEXT,
    "draftSaleId" TEXT,
    "convertedToSaleId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProformaItem" (
    "id" TEXT NOT NULL,
    "proformaId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "serial" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProformaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleRefund" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "sale_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleRefundItem" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "refund_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SaleRefundItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repair" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT NOT NULL,
    "technicianId" TEXT,
    "repairNumber" TEXT,
    "device" TEXT NOT NULL,
    "serial" TEXT,
    "issue" TEXT NOT NULL,
    "status" "RepairStatus" NOT NULL,
    "approvalStatus" "RepairApprovalStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "approvalNote" TEXT,
    "expectedPickupAt" TIMESTAMP(3),
    "warrantyEnd" TIMESTAMP(3),
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Repair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidFrom" "ExpensePaidFrom" NOT NULL DEFAULT 'CASH_DRAWER',
    "paymentReference" TEXT,
    "cashDrawerSessionId" UUID,
    "cashDrawerMovementId" UUID,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterStoreDeal" (
    "id" TEXT NOT NULL,
    "supplierTenantId" TEXT,
    "borrowerTenantId" TEXT NOT NULL,
    "borrowerBranchId" TEXT,
    "productId" TEXT,
    "serial" TEXT NOT NULL,
    "agreedPrice" DOUBLE PRECISION NOT NULL,
    "status" "InterStoreDealStatus" NOT NULL DEFAULT 'BORROWED',
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalSupplierName" TEXT,
    "externalSupplierPhone" TEXT,
    "productName" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "receivedProductId" TEXT,
    "soldPrice" DOUBLE PRECISION,
    "paidAmount" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "saleId" TEXT,
    "resellerName" TEXT NOT NULL,
    "resellerPhone" TEXT NOT NULL,
    "resellerStore" TEXT,
    "resellerWorkplace" TEXT,
    "resellerDistrict" TEXT,
    "resellerSector" TEXT,
    "resellerAddress" TEXT,
    "resellerNationalId" TEXT,
    "productCategory" TEXT,
    "productColor" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "takenAt" TIMESTAMP(3),

    CONSTRAINT "InterStoreDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterStorePayment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "receivedById" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "InterStorePaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterStorePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "metadata" JSONB,
    "action" "AuditAction" NOT NULL,
    "entity" "AuditEntity" NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "businessName" TEXT,
    "phoneNumberId" TEXT,
    "wabaId" TEXT,
    "accessToken" TEXT,
    "webhookVerifyToken" TEXT,
    "appSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "customerId" TEXT,
    "phone" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT,
    "broadcastId" TEXT,
    "direction" "WhatsAppDirection" NOT NULL,
    "type" "WhatsAppMessageType" NOT NULL,
    "textContent" TEXT,
    "mediaUrl" TEXT,
    "messageId" TEXT,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'SENT',
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "productId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppBroadcast" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "promotionId" TEXT,
    "templateName" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en_US',
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "targetMode" TEXT,
    "targetBranchId" TEXT,
    "targetProductId" TEXT,
    "targetCategory" TEXT,
    "targetCustomerIds" JSONB,
    "queuedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "processingLockedAt" TIMESTAMP(3),
    "processingLockedBy" TEXT,
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "processingLastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdById" TEXT,
    "recipientUserId" TEXT,
    "recipientRole" "UserRole",
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialGuard" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "email" TEXT,
    "phone" TEXT,
    "deviceId" TEXT,
    "browserFingerprint" TEXT,
    "normalizedEmail" TEXT,
    "normalizedPhone" TEXT,
    "deviceHash" TEXT,
    "fingerprintHash" TEXT,
    "ipHash" TEXT,
    "intentId" TEXT,
    "tenantId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "consumedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialGuard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpDeliveryLog" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "otpId" TEXT,
    "intentId" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "target" TEXT NOT NULL,
    "provider" TEXT,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "messageId" TEXT,
    "metadata" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "OtpDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "productId" TEXT NOT NULL,
    "type" "StockAdjustmentType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "beforeQty" INTEGER NOT NULL,
    "afterQty" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idType" "SupplierIdType" NOT NULL,
    "idNumber" TEXT NOT NULL,
    "companyName" TEXT,
    "taxId" TEXT,
    "sourceType" "SupplierSourceType" NOT NULL DEFAULT 'OTHER',
    "sourceDetails" TEXT,
    "verifiedAt" TIMESTAMP(6),

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" DATE,
    "receivedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItemSerial" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderItemSerial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierSupply" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "sourceType" "SupplySourceType" NOT NULL DEFAULT 'OTHER',
    "sourceDetails" TEXT,
    "documentRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierSupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierSupplyItem" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "subcategoryOther" TEXT,
    "brand" TEXT,
    "serial" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "buyPrice" DOUBLE PRECISION NOT NULL,
    "sellPrice" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierSupplyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "supplyId" TEXT,
    "purchaseOrderId" TEXT,
    "billNumber" TEXT,
    "status" "SupplierBillStatus" NOT NULL DEFAULT 'UNPAID',
    "billDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentRef" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBillItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierBillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "billId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "SupplierPaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "cashMovementId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerLoan" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "type" "OwnerLoanType" NOT NULL,
    "partyName" TEXT NOT NULL,
    "partyPhone" TEXT,
    "originalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "OwnerLoanStatus" NOT NULL DEFAULT 'OPEN',
    "paymentMethod" "OwnerLoanPaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "note" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "OwnerLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerLoanPayment" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "loanId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "method" "OwnerLoanPaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerLoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyAccount" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "accountType" "MoneyAccountType" NOT NULL,
    "label" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyAccountMovement" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "accountId" TEXT NOT NULL,
    "direction" "MoneyMovementDirection" NOT NULL,
    "reason" "MoneyMovementReason" NOT NULL DEFAULT 'OTHER',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceBefore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyAccountMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "billId" TEXT,
    "supplyId" TEXT,
    "purchaseOrderId" TEXT,
    "type" "SupplierDocumentType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "documentRef" TEXT,
    "url" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryNote" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "saleId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "deliveredBy" TEXT,
    "receivedBy" TEXT,
    "receivedByPhone" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryNoteItem" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "deliveryNoteId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "serial" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryNoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_drawer_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "session_id" UUID,
    "type" "cash_drawer_event_type" NOT NULL,
    "amount" BIGINT,
    "note" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_drawer_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_drawer_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_by_user_id" UUID NOT NULL,
    "opening_cash" BIGINT NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMPTZ(6),
    "closed_by_user_id" UUID,
    "closing_cash" BIGINT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_drawer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "branch_id" TEXT,
    "session_id" UUID NOT NULL,
    "type" "cash_movement_type" NOT NULL,
    "reason" "cash_movement_reason" NOT NULL,
    "amount" BIGINT NOT NULL,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "branch_id" TEXT,
    "opened_by" UUID,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opening_cash" BIGINT NOT NULL DEFAULT 0,
    "opening_reason" TEXT,
    "opening_note" TEXT,
    "closed_by" UUID,
    "closed_at" TIMESTAMPTZ(6),
    "counted_cash" BIGINT,
    "close_note" TEXT,
    "closing_reason" TEXT,
    "closing_explanation" TEXT,
    "expected_cash_at_close" BIGINT,
    "cash_difference" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleWarranty" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "sale_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "policy" TEXT,
    "duration_months" INTEGER,
    "duration_days" INTEGER,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warrantyNumber" TEXT,

    CONSTRAINT "SaleWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleWarrantyUnit" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "warranty_id" TEXT NOT NULL,
    "sale_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "serial" TEXT,
    "imei1" TEXT,
    "imei2" TEXT,
    "unit_label" TEXT,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleWarrantyUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceLabel" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordChangeEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PasswordChangeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "assignedToPlatformUserId" TEXT,
    "title" TEXT NOT NULL,
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(6),
    "closedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticketId" TEXT NOT NULL,
    "senderType" "SupportMessageSenderType" NOT NULL,
    "tenantUserId" TEXT,
    "platformUserId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAttachment" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceRequestDailySequence" (
    "tenantId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceRequestDailySequence_pkey" PRIMARY KEY ("tenantId","dateKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permission_id_key" ON "RolePermission"("role", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_user_id_permission_id_key" ON "UserPermission"("user_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_intentId_idx" ON "Payment"("intentId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_purpose_idx" ON "Payment"("purpose");

-- CreateIndex
CREATE INDEX "Payment_planKey_idx" ON "Payment"("planKey");

-- CreateIndex
CREATE INDEX "Payment_tierKey_idx" ON "Payment"("tierKey");

-- CreateIndex
CREATE INDEX "Payment_cycleKey_idx" ON "Payment"("cycleKey");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_mainBranchId_key" ON "Tenant"("mainBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceSellerProfile_publicSlug_key" ON "MarketplaceSellerProfile"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceSellerProfile_marketplaceCode_key" ON "MarketplaceSellerProfile"("marketplaceCode");

-- CreateIndex
CREATE INDEX "MarketplaceSellerProfile_marketplaceEnabled_idx" ON "MarketplaceSellerProfile"("marketplaceEnabled");

-- CreateIndex
CREATE INDEX "MarketplaceSellerProfile_temporarilyClosed_idx" ON "MarketplaceSellerProfile"("temporarilyClosed");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCustomer_email_key" ON "MarketplaceCustomer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCustomer_phone_key" ON "MarketplaceCustomer"("phone");

-- CreateIndex
CREATE INDEX "MarketplaceCustomer_status_idx" ON "MarketplaceCustomer"("status");

-- CreateIndex
CREATE INDEX "MarketplaceCustomer_createdAt_idx" ON "MarketplaceCustomer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCustomerSession_tokenId_key" ON "MarketplaceCustomerSession"("tokenId");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerSession_customerId_idx" ON "MarketplaceCustomerSession"("customerId");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerSession_customerId_isRevoked_idx" ON "MarketplaceCustomerSession"("customerId", "isRevoked");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerSession_expiresAt_idx" ON "MarketplaceCustomerSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCustomerPasswordReset_tokenHash_key" ON "MarketplaceCustomerPasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerPasswordReset_customerId_createdAt_idx" ON "MarketplaceCustomerPasswordReset"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerPasswordReset_customerId_usedAt_idx" ON "MarketplaceCustomerPasswordReset"("customerId", "usedAt");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerPasswordReset_expiresAt_idx" ON "MarketplaceCustomerPasswordReset"("expiresAt");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerVerification_customerId_channel_idx" ON "MarketplaceCustomerVerification"("customerId", "channel");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerVerification_target_idx" ON "MarketplaceCustomerVerification"("target");

-- CreateIndex
CREATE INDEX "MarketplaceCustomerVerification_expiresAt_idx" ON "MarketplaceCustomerVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_tenantId_occurredAt_idx" ON "MarketplaceAnalyticsEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_tenantId_eventType_occurredAt_idx" ON "MarketplaceAnalyticsEvent"("tenantId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_tenantId_productId_occurredAt_idx" ON "MarketplaceAnalyticsEvent"("tenantId", "productId", "occurredAt");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_tenantId_searchTerm_occurredAt_idx" ON "MarketplaceAnalyticsEvent"("tenantId", "searchTerm", "occurredAt");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_visitorId_eventType_occurredAt_idx" ON "MarketplaceAnalyticsEvent"("visitorId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_marketplaceCustomerId_eventType_o_idx" ON "MarketplaceAnalyticsEvent"("marketplaceCustomerId", "eventType", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceRequest_requestNumber_key" ON "MarketplaceRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceRequest_trackingToken_key" ON "MarketplaceRequest"("trackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceRequest_clientRequestId_key" ON "MarketplaceRequest"("clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceRequest_saleId_key" ON "MarketplaceRequest"("saleId");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_tenantId_idx" ON "MarketplaceRequest"("tenantId");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_marketplaceCustomerId_idx" ON "MarketplaceRequest"("marketplaceCustomerId");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_marketplaceCustomerId_createdAt_idx" ON "MarketplaceRequest"("marketplaceCustomerId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_tenantId_status_idx" ON "MarketplaceRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_tenantId_createdAt_idx" ON "MarketplaceRequest"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_tenantId_fulfilmentBranchId_idx" ON "MarketplaceRequest"("tenantId", "fulfilmentBranchId");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_customerPhone_idx" ON "MarketplaceRequest"("customerPhone");

-- CreateIndex
CREATE INDEX "MarketplaceRequest_customerEmail_idx" ON "MarketplaceRequest"("customerEmail");

-- CreateIndex
CREATE INDEX "MarketplaceRequestItem_requestId_idx" ON "MarketplaceRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "MarketplaceRequestItem_productId_idx" ON "MarketplaceRequestItem"("productId");

-- CreateIndex
CREATE INDEX "MarketplaceRequestItem_requestId_productId_idx" ON "MarketplaceRequestItem"("requestId", "productId");

-- CreateIndex
CREATE INDEX "MarketplaceRequestReservation_tenantId_requestId_idx" ON "MarketplaceRequestReservation"("tenantId", "requestId");

-- CreateIndex
CREATE INDEX "MarketplaceRequestReservation_tenantId_productId_idx" ON "MarketplaceRequestReservation"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "MarketplaceRequestReservation_tenantId_branchId_idx" ON "MarketplaceRequestReservation"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "MarketplaceRequestReservation_requestId_idx" ON "MarketplaceRequestReservation"("requestId");

-- CreateIndex
CREATE INDEX "MarketplaceRequestReservation_requestItemId_idx" ON "MarketplaceRequestReservation"("requestItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceRequestReservation_requestItemId_branchId_key" ON "MarketplaceRequestReservation"("requestItemId", "branchId");

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- CreateIndex
CREATE INDEX "Branch_tenantId_status_idx" ON "Branch"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_tenantId_code_key" ON "Branch"("tenantId", "code");

-- CreateIndex
CREATE INDEX "UserBranchAssignment_tenantId_userId_idx" ON "UserBranchAssignment"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "UserBranchAssignment_tenantId_branchId_idx" ON "UserBranchAssignment"("tenantId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBranchAssignment_userId_branchId_key" ON "UserBranchAssignment"("userId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_id_idx" ON "User"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_accessMode_idx" ON "Subscription"("accessMode");

-- CreateIndex
CREATE INDEX "Subscription_planKey_idx" ON "Subscription"("planKey");

-- CreateIndex
CREATE INDEX "Subscription_tierKey_idx" ON "Subscription"("tierKey");

-- CreateIndex
CREATE INDEX "Subscription_cycleKey_idx" ON "Subscription"("cycleKey");

-- CreateIndex
CREATE INDEX "Product_tenantId_supplierId_idx" ON "Product"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE INDEX "Product_tenantId_category_idx" ON "Product"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Product_tenantId_subcategory_idx" ON "Product"("tenantId", "subcategory");

-- CreateIndex
CREATE INDEX "Product_tenantId_name_idx" ON "Product"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Product_tenantId_barcode_idx" ON "Product"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "Product_tenantId_brand_idx" ON "Product"("tenantId", "brand");

-- CreateIndex
CREATE INDEX "Product_tenantId_supplierName_idx" ON "Product"("tenantId", "supplierName");

-- CreateIndex
CREATE INDEX "Product_tenantId_marketplaceStatus_idx" ON "Product"("tenantId", "marketplaceStatus");

-- CreateIndex
CREATE INDEX "Product_tenantId_marketplaceCategory_idx" ON "Product"("tenantId", "marketplaceCategory");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_marketplaceSlug_key" ON "Product"("tenantId", "marketplaceSlug");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_idx" ON "ProductImage"("tenantId");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_productId_idx" ON "ProductImage"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_productId_isPrimary_idx" ON "ProductImage"("tenantId", "productId", "isPrimary");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_productId_imageType_idx" ON "ProductImage"("tenantId", "productId", "imageType");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_sourceImageId_idx" ON "ProductImage"("tenantId", "sourceImageId");

-- CreateIndex
CREATE INDEX "ProductImage_tenantId_productId_isMarketplaceApproved_idx" ON "ProductImage"("tenantId", "productId", "isMarketplaceApproved");

-- CreateIndex
CREATE INDEX "ProductImageStudioRun_tenantId_idx" ON "ProductImageStudioRun"("tenantId");

-- CreateIndex
CREATE INDEX "ProductImageStudioRun_tenantId_productId_idx" ON "ProductImageStudioRun"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ProductImageStudioRun_tenantId_sourceImageId_idx" ON "ProductImageStudioRun"("tenantId", "sourceImageId");

-- CreateIndex
CREATE INDEX "ProductImageStudioRun_tenantId_productId_status_idx" ON "ProductImageStudioRun"("tenantId", "productId", "status");

-- CreateIndex
CREATE INDEX "ProductImageStudioRun_resultImageId_idx" ON "ProductImageStudioRun"("resultImageId");

-- CreateIndex
CREATE INDEX "BranchInventory_tenantId_branchId_idx" ON "BranchInventory"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "BranchInventory_tenantId_productId_idx" ON "BranchInventory"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchInventory_branchId_productId_key" ON "BranchInventory"("branchId", "productId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_marketplaceCustomerId_idx" ON "Customer"("marketplaceCustomerId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_name_idx" ON "Customer"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Customer_tenantId_phone_idx" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Customer_tenantId_isActive_idx" ON "Customer"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Customer_tenantId_tinNumber_idx" ON "Customer"("tenantId", "tinNumber");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idNumber_idx" ON "Customer"("tenantId", "idNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_marketplaceCustomerId_key" ON "Customer"("tenantId", "marketplaceCustomerId");

-- CreateIndex
CREATE INDEX "Sale_conversationId_idx" ON "Sale"("conversationId");

-- CreateIndex
CREATE INDEX "Sale_tenantId_idx" ON "Sale"("tenantId");

-- CreateIndex
CREATE INDEX "Sale_branchId_idx" ON "Sale"("branchId");

-- CreateIndex
CREATE INDEX "Sale_tenantId_branchId_createdAt_idx" ON "Sale"("tenantId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_tenantId_isDraft_idx" ON "Sale"("tenantId", "isDraft");

-- CreateIndex
CREATE INDEX "Sale_tenantId_draftSource_idx" ON "Sale"("tenantId", "draftSource");

-- CreateIndex
CREATE INDEX "Sale_tenantId_taxMode_idx" ON "Sale"("tenantId", "taxMode");

-- CreateIndex
CREATE INDEX "Sale_tenantId_createdAt_taxMode_idx" ON "Sale"("tenantId", "createdAt", "taxMode");

-- CreateIndex
CREATE INDEX "Sale_saleType_idx" ON "Sale"("saleType");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_dueDate_idx" ON "Sale"("dueDate");

-- CreateIndex
CREATE INDEX "Sale_isCancelled_idx" ON "Sale"("isCancelled");

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");

-- CreateIndex
CREATE INDEX "SalePayment_tenantId_idx" ON "SalePayment"("tenantId");

-- CreateIndex
CREATE INDEX "SalePayment_branchId_idx" ON "SalePayment"("branchId");

-- CreateIndex
CREATE INDEX "SalePayment_receivedById_idx" ON "SalePayment"("receivedById");

-- CreateIndex
CREATE UNIQUE INDEX "SalePayment_tenantId_note_key" ON "SalePayment"("tenantId", "note");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_status_createdAt_idx" ON "Proforma"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_branchId_createdAt_idx" ON "Proforma"("tenantId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_customerName_idx" ON "Proforma"("tenantId", "customerName");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_customerPhone_idx" ON "Proforma"("tenantId", "customerPhone");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_validUntil_idx" ON "Proforma"("tenantId", "validUntil");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_convertedToSaleId_idx" ON "Proforma"("tenantId", "convertedToSaleId");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_source_createdAt_idx" ON "Proforma"("tenantId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_conversationId_createdAt_idx" ON "Proforma"("tenantId", "conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Proforma_tenantId_draftSaleId_idx" ON "Proforma"("tenantId", "draftSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "Proforma_tenantId_number_key" ON "Proforma"("tenantId", "number");

-- CreateIndex
CREATE INDEX "ProformaItem_proformaId_createdAt_idx" ON "ProformaItem"("proformaId", "createdAt");

-- CreateIndex
CREATE INDEX "ProformaItem_productId_idx" ON "ProformaItem"("productId");

-- CreateIndex
CREATE INDEX "SaleRefund_sale_id_idx" ON "SaleRefund"("sale_id");

-- CreateIndex
CREATE INDEX "SaleRefund_tenant_id_idx" ON "SaleRefund"("tenant_id");

-- CreateIndex
CREATE INDEX "SaleRefund_branch_id_idx" ON "SaleRefund"("branch_id");

-- CreateIndex
CREATE INDEX "SaleRefund_created_by_id_idx" ON "SaleRefund"("created_by_id");

-- CreateIndex
CREATE INDEX "SaleRefundItem_refund_id_idx" ON "SaleRefundItem"("refund_id");

-- CreateIndex
CREATE INDEX "SaleRefundItem_product_id_idx" ON "SaleRefundItem"("product_id");

-- CreateIndex
CREATE INDEX "Repair_tenantId_idx" ON "Repair"("tenantId");

-- CreateIndex
CREATE INDEX "Repair_tenantId_repairNumber_idx" ON "Repair"("tenantId", "repairNumber");

-- CreateIndex
CREATE INDEX "Repair_tenantId_status_idx" ON "Repair"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Repair_tenantId_archivedAt_idx" ON "Repair"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "Repair_branchId_idx" ON "Repair"("branchId");

-- CreateIndex
CREATE INDEX "Repair_tenantId_branchId_createdAt_idx" ON "Repair"("tenantId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "Expense_tenantId_idx" ON "Expense"("tenantId");

-- CreateIndex
CREATE INDEX "Expense_branchId_idx" ON "Expense"("branchId");

-- CreateIndex
CREATE INDEX "Expense_paidFrom_idx" ON "Expense"("paidFrom");

-- CreateIndex
CREATE INDEX "Expense_cashDrawerSessionId_idx" ON "Expense"("cashDrawerSessionId");

-- CreateIndex
CREATE INDEX "Expense_cashDrawerMovementId_idx" ON "Expense"("cashDrawerMovementId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_branchId_createdAt_idx" ON "Expense"("tenantId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "InterStoreDeal_borrowerTenantId_idx" ON "InterStoreDeal"("borrowerTenantId");

-- CreateIndex
CREATE INDEX "InterStoreDeal_borrowerTenantId_borrowerBranchId_idx" ON "InterStoreDeal"("borrowerTenantId", "borrowerBranchId");

-- CreateIndex
CREATE INDEX "InterStoreDeal_borrowerTenantId_borrowerBranchId_status_idx" ON "InterStoreDeal"("borrowerTenantId", "borrowerBranchId", "status");

-- CreateIndex
CREATE INDEX "InterStoreDeal_supplierTenantId_idx" ON "InterStoreDeal"("supplierTenantId");

-- CreateIndex
CREATE INDEX "InterStoreDeal_status_idx" ON "InterStoreDeal"("status");

-- CreateIndex
CREATE INDEX "InterStoreDeal_receivedProductId_idx" ON "InterStoreDeal"("receivedProductId");

-- CreateIndex
CREATE INDEX "InterStoreDeal_resellerPhone_idx" ON "InterStoreDeal"("resellerPhone");

-- CreateIndex
CREATE INDEX "InterStoreDeal_serial_idx" ON "InterStoreDeal"("serial");

-- CreateIndex
CREATE INDEX "InterStorePayment_dealId_idx" ON "InterStorePayment"("dealId");

-- CreateIndex
CREATE INDEX "InterStorePayment_tenantId_idx" ON "InterStorePayment"("tenantId");

-- CreateIndex
CREATE INDEX "InterStorePayment_tenantId_branchId_idx" ON "InterStorePayment"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "InterStorePayment_receivedById_idx" ON "InterStorePayment"("receivedById");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_branchId_createdAt_idx" ON "AuditLog"("tenantId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entity_createdAt_idx" ON "AuditLog"("tenantId", "entity", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_phoneNumberId_key" ON "WhatsAppAccount"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppAccount_tenantId_idx" ON "WhatsAppAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_tenantId_phoneNumber_key" ON "WhatsAppAccount"("tenantId", "phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_tenantId_idx" ON "WhatsAppConversation"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_phone_idx" ON "WhatsAppConversation"("phone");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_accountId_idx" ON "WhatsAppConversation"("accountId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_tenantId_status_idx" ON "WhatsAppConversation"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_messageId_key" ON "WhatsAppMessage"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_conversationId_idx" ON "WhatsAppMessage"("conversationId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_idx" ON "WhatsAppMessage"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_accountId_idx" ON "WhatsAppMessage"("accountId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_broadcastId_idx" ON "WhatsAppMessage"("broadcastId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_broadcastId_status_idx" ON "WhatsAppMessage"("broadcastId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_status_idx" ON "WhatsAppMessage"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_messageId_idx" ON "WhatsAppMessage"("messageId");

-- CreateIndex
CREATE INDEX "Promotion_tenantId_idx" ON "Promotion"("tenantId");

-- CreateIndex
CREATE INDEX "Promotion_productId_idx" ON "Promotion"("productId");

-- CreateIndex
CREATE INDEX "Promotion_createdAt_idx" ON "Promotion"("createdAt");

-- CreateIndex
CREATE INDEX "Promotion_archivedAt_idx" ON "Promotion"("archivedAt");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_tenantId_idx" ON "WhatsAppBroadcast"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_accountId_idx" ON "WhatsAppBroadcast"("accountId");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_status_idx" ON "WhatsAppBroadcast"("status");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_tenantId_status_nextAttemptAt_idx" ON "WhatsAppBroadcast"("tenantId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_processingLockedAt_idx" ON "WhatsAppBroadcast"("processingLockedAt");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_createdAt_idx" ON "WhatsAppBroadcast"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_archivedAt_idx" ON "WhatsAppBroadcast"("archivedAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_idx" ON "Notification"("recipientUserId");

-- CreateIndex
CREATE INDEX "Notification_recipientRole_idx" ON "Notification"("recipientRole");

-- CreateIndex
CREATE INDEX "OtpCode_intentId_channel_idx" ON "OtpCode"("intentId", "channel");

-- CreateIndex
CREATE INDEX "OtpCode_target_idx" ON "OtpCode"("target");

-- CreateIndex
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrialGuard_email_key" ON "TrialGuard"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TrialGuard_phone_key" ON "TrialGuard"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "TrialGuard_deviceId_key" ON "TrialGuard"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialGuard_browserFingerprint_key" ON "TrialGuard"("browserFingerprint");

-- CreateIndex
CREATE INDEX "TrialGuard_normalizedEmail_idx" ON "TrialGuard"("normalizedEmail");

-- CreateIndex
CREATE INDEX "TrialGuard_normalizedPhone_idx" ON "TrialGuard"("normalizedPhone");

-- CreateIndex
CREATE INDEX "TrialGuard_deviceHash_idx" ON "TrialGuard"("deviceHash");

-- CreateIndex
CREATE INDEX "TrialGuard_fingerprintHash_idx" ON "TrialGuard"("fingerprintHash");

-- CreateIndex
CREATE INDEX "TrialGuard_ipHash_idx" ON "TrialGuard"("ipHash");

-- CreateIndex
CREATE INDEX "TrialGuard_tenantId_idx" ON "TrialGuard"("tenantId");

-- CreateIndex
CREATE INDEX "TrialGuard_intentId_idx" ON "TrialGuard"("intentId");

-- CreateIndex
CREATE INDEX "OtpDeliveryLog_intentId_requestedAt_idx" ON "OtpDeliveryLog"("intentId", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "OtpDeliveryLog_target_requestedAt_idx" ON "OtpDeliveryLog"("target", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "OtpDeliveryLog_status_requestedAt_idx" ON "OtpDeliveryLog"("status", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "OtpDeliveryLog_provider_requestedAt_idx" ON "OtpDeliveryLog"("provider", "requestedAt" DESC);

-- CreateIndex
CREATE INDEX "StockAdjustment_tenantId_createdAt_idx" ON "StockAdjustment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockAdjustment_branchId_createdAt_idx" ON "StockAdjustment"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "StockAdjustment_tenantId_productId_createdAt_idx" ON "StockAdjustment"("tenantId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_isActive_idx" ON "Supplier"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_name_idx" ON "Supplier"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_idType_idNumber_key" ON "Supplier"("tenantId", "idType", "idNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_branchId_idx" ON "PurchaseOrder"("branchId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_status_createdAt_idx" ON "PurchaseOrder"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_orderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "POItemSerial_productId_idx" ON "PurchaseOrderItemSerial"("productId");

-- CreateIndex
CREATE INDEX "POItemSerial_purchaseOrderId_idx" ON "PurchaseOrderItemSerial"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "POItemSerial_purchaseOrderItemId_idx" ON "PurchaseOrderItemSerial"("purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "POItemSerial_tenantId_idx" ON "PurchaseOrderItemSerial"("tenantId");

-- CreateIndex
CREATE INDEX "POItemSerial_tenantId_serial_idx" ON "PurchaseOrderItemSerial"("tenantId", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "POItemSerial_tenantId_serial_key" ON "PurchaseOrderItemSerial"("tenantId", "serial");

-- CreateIndex
CREATE INDEX "SupplierSupply_supplierId_createdAt_idx" ON "SupplierSupply"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierSupply_tenantId_createdAt_idx" ON "SupplierSupply"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierSupply_branchId_createdAt_idx" ON "SupplierSupply"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierSupply_purchaseOrderId_idx" ON "SupplierSupply"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "SupplierSupplyItem_supplyId_idx" ON "SupplierSupplyItem"("supplyId");

-- CreateIndex
CREATE INDEX "SupplierSupplyItem_tenantId_createdAt_idx" ON "SupplierSupplyItem"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierBill_tenantId_idx" ON "SupplierBill"("tenantId");

-- CreateIndex
CREATE INDEX "SupplierBill_tenantId_supplierId_idx" ON "SupplierBill"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "SupplierBill_tenantId_branchId_idx" ON "SupplierBill"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "SupplierBill_tenantId_status_idx" ON "SupplierBill"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SupplierBill_tenantId_dueDate_idx" ON "SupplierBill"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "SupplierBill_supplierId_idx" ON "SupplierBill"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierBill_supplyId_idx" ON "SupplierBill"("supplyId");

-- CreateIndex
CREATE INDEX "SupplierBill_purchaseOrderId_idx" ON "SupplierBill"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBill_tenantId_billNumber_key" ON "SupplierBill"("tenantId", "billNumber");

-- CreateIndex
CREATE INDEX "SupplierBillItem_tenantId_idx" ON "SupplierBillItem"("tenantId");

-- CreateIndex
CREATE INDEX "SupplierBillItem_billId_idx" ON "SupplierBillItem"("billId");

-- CreateIndex
CREATE INDEX "SupplierBillItem_productId_idx" ON "SupplierBillItem"("productId");

-- CreateIndex
CREATE INDEX "SupplierPayment_tenantId_idx" ON "SupplierPayment"("tenantId");

-- CreateIndex
CREATE INDEX "SupplierPayment_tenantId_supplierId_idx" ON "SupplierPayment"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_tenantId_branchId_idx" ON "SupplierPayment"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_billId_idx" ON "SupplierPayment"("billId");

-- CreateIndex
CREATE INDEX "SupplierPayment_paidAt_idx" ON "SupplierPayment"("paidAt");

-- CreateIndex
CREATE INDEX "OwnerLoan_tenantId_idx" ON "OwnerLoan"("tenantId");

-- CreateIndex
CREATE INDEX "OwnerLoan_branchId_idx" ON "OwnerLoan"("branchId");

-- CreateIndex
CREATE INDEX "OwnerLoan_tenantId_type_status_idx" ON "OwnerLoan"("tenantId", "type", "status");

-- CreateIndex
CREATE INDEX "OwnerLoan_tenantId_startedAt_idx" ON "OwnerLoan"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "OwnerLoan_tenantId_archivedAt_idx" ON "OwnerLoan"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "OwnerLoanPayment_tenantId_idx" ON "OwnerLoanPayment"("tenantId");

-- CreateIndex
CREATE INDEX "OwnerLoanPayment_branchId_idx" ON "OwnerLoanPayment"("branchId");

-- CreateIndex
CREATE INDEX "OwnerLoanPayment_loanId_idx" ON "OwnerLoanPayment"("loanId");

-- CreateIndex
CREATE INDEX "OwnerLoanPayment_tenantId_paidAt_idx" ON "OwnerLoanPayment"("tenantId", "paidAt");

-- CreateIndex
CREATE INDEX "MoneyAccount_tenantId_idx" ON "MoneyAccount"("tenantId");

-- CreateIndex
CREATE INDEX "MoneyAccount_branchId_idx" ON "MoneyAccount"("branchId");

-- CreateIndex
CREATE INDEX "MoneyAccount_tenantId_accountType_idx" ON "MoneyAccount"("tenantId", "accountType");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyAccount_tenantId_branchId_accountType_key" ON "MoneyAccount"("tenantId", "branchId", "accountType");

-- CreateIndex
CREATE INDEX "MoneyAccountMovement_tenantId_idx" ON "MoneyAccountMovement"("tenantId");

-- CreateIndex
CREATE INDEX "MoneyAccountMovement_branchId_idx" ON "MoneyAccountMovement"("branchId");

-- CreateIndex
CREATE INDEX "MoneyAccountMovement_accountId_idx" ON "MoneyAccountMovement"("accountId");

-- CreateIndex
CREATE INDEX "MoneyAccountMovement_tenantId_createdAt_idx" ON "MoneyAccountMovement"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MoneyAccountMovement_sourceType_sourceId_idx" ON "MoneyAccountMovement"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "SupplierDocument_tenantId_idx" ON "SupplierDocument"("tenantId");

-- CreateIndex
CREATE INDEX "SupplierDocument_tenantId_supplierId_idx" ON "SupplierDocument"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "SupplierDocument_supplierId_idx" ON "SupplierDocument"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierDocument_billId_idx" ON "SupplierDocument"("billId");

-- CreateIndex
CREATE INDEX "SupplierDocument_supplyId_idx" ON "SupplierDocument"("supplyId");

-- CreateIndex
CREATE INDEX "SupplierDocument_purchaseOrderId_idx" ON "SupplierDocument"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "DeliveryNote_tenant_createdAt_idx" ON "DeliveryNote"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DeliveryNote_tenant_sale_idx" ON "DeliveryNote"("tenantId", "saleId");

-- CreateIndex
CREATE INDEX "DeliveryNote_branchId_createdAt_idx" ON "DeliveryNote"("branchId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNote_tenant_number_key" ON "DeliveryNote"("tenantId", "number");

-- CreateIndex
CREATE INDEX "DeliveryNoteItem_note_idx" ON "DeliveryNoteItem"("deliveryNoteId");

-- CreateIndex
CREATE INDEX "DeliveryNoteItem_product_idx" ON "DeliveryNoteItem"("productId");

-- CreateIndex
CREATE INDEX "idx_cash_drawer_events_session_created" ON "cash_drawer_events"("session_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cash_drawer_events_tenant_created" ON "cash_drawer_events"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cash_drawer_sessions_tenant_created" ON "cash_drawer_sessions"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cash_drawer_sessions_tenant_open" ON "cash_drawer_sessions"("tenant_id", "closed_at");

-- CreateIndex
CREATE INDEX "cash_movements_session_id_idx" ON "cash_movements"("session_id");

-- CreateIndex
CREATE INDEX "cash_movements_session_created_at_idx" ON "cash_movements"("session_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cash_movements_tenant_id_idx" ON "cash_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "cash_movements_tenant_branch_created_at_idx" ON "cash_movements"("tenant_id", "branch_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cash_sessions_tenant_id_idx" ON "cash_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "cash_sessions_tenant_branch_opened_at_idx" ON "cash_sessions"("tenant_id", "branch_id", "opened_at" DESC);

-- CreateIndex
CREATE INDEX "cash_sessions_tenant_branch_closed_at_idx" ON "cash_sessions"("tenant_id", "branch_id", "closed_at" DESC);

-- CreateIndex
CREATE INDEX "SaleWarranty_sale_id_idx" ON "SaleWarranty"("sale_id");

-- CreateIndex
CREATE INDEX "SaleWarranty_tenant_id_idx" ON "SaleWarranty"("tenant_id");

-- CreateIndex
CREATE INDEX "SaleWarranty_branch_id_idx" ON "SaleWarranty"("branch_id");

-- CreateIndex
CREATE INDEX "SaleWarranty_created_by_id_idx" ON "SaleWarranty"("created_by_id");

-- CreateIndex
CREATE INDEX "SaleWarrantyUnit_warranty_id_idx" ON "SaleWarrantyUnit"("warranty_id");

-- CreateIndex
CREATE INDEX "SaleWarrantyUnit_sale_item_id_idx" ON "SaleWarrantyUnit"("sale_item_id");

-- CreateIndex
CREATE INDEX "SaleWarrantyUnit_product_id_idx" ON "SaleWarrantyUnit"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "SaleWarrantyUnit_unique_serial_per_warranty" ON "SaleWarrantyUnit"("warranty_id", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenId_key" ON "UserSession"("tokenId");

-- CreateIndex
CREATE INDEX "UserSession_tenantId_userId_idx" ON "UserSession"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "UserSession_tenantId_createdAt_idx" ON "UserSession"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSession_tenantId_userId_isRevoked_idx" ON "UserSession"("tenantId", "userId", "isRevoked");

-- CreateIndex
CREATE INDEX "LoginEvent_tenantId_createdAt_idx" ON "LoginEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_tenantId_userId_createdAt_idx" ON "LoginEvent"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_tenantId_status_createdAt_idx" ON "LoginEvent"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordChangeEvent_tenantId_userId_createdAt_idx" ON "PasswordChangeEvent"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordChangeEvent_tenantId_changedById_createdAt_idx" ON "PasswordChangeEvent"("tenantId", "changedById", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_status_createdAt_idx" ON "SupportTicket"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_priority_createdAt_idx" ON "SupportTicket"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedToPlatformUserId_createdAt_idx" ON "SupportTicket"("assignedToPlatformUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportAttachment_ticketId_createdAt_idx" ON "SupportAttachment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceRequestDailySequence_dateKey_idx" ON "MarketplaceRequestDailySequence"("dateKey");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "OwnerIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_mainBranchId_fkey" FOREIGN KEY ("mainBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceSellerProfile" ADD CONSTRAINT "MarketplaceSellerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCustomerSession" ADD CONSTRAINT "MarketplaceCustomerSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "MarketplaceCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCustomerPasswordReset" ADD CONSTRAINT "MarketplaceCustomerPasswordReset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "MarketplaceCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCustomerVerification" ADD CONSTRAINT "MarketplaceCustomerVerification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "MarketplaceCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAnalyticsEvent" ADD CONSTRAINT "MarketplaceAnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAnalyticsEvent" ADD CONSTRAINT "MarketplaceAnalyticsEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAnalyticsEvent" ADD CONSTRAINT "MarketplaceAnalyticsEvent_marketplaceCustomerId_fkey" FOREIGN KEY ("marketplaceCustomerId") REFERENCES "MarketplaceCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_marketplaceCustomerId_fkey" FOREIGN KEY ("marketplaceCustomerId") REFERENCES "MarketplaceCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_fulfilmentBranchId_fkey" FOREIGN KEY ("fulfilmentBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequest" ADD CONSTRAINT "MarketplaceRequest_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequestItem" ADD CONSTRAINT "MarketplaceRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MarketplaceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceRequestItem" ADD CONSTRAINT "MarketplaceRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchAssignment" ADD CONSTRAINT "UserBranchAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchAssignment" ADD CONSTRAINT "UserBranchAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBranchAssignment" ADD CONSTRAINT "UserBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDocumentSettings" ADD CONSTRAINT "TenantDocumentSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDocumentCounter" ADD CONSTRAINT "TenantDocumentCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_marketplaceCustomerId_fkey" FOREIGN KEY ("marketplaceCustomerId") REFERENCES "MarketplaceCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_draftSaleId_fkey" FOREIGN KEY ("draftSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaItem" ADD CONSTRAINT "ProformaItem_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "Proforma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaItem" ADD CONSTRAINT "ProformaItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefund" ADD CONSTRAINT "SaleRefund_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefund" ADD CONSTRAINT "SaleRefund_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefund" ADD CONSTRAINT "SaleRefund_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefund" ADD CONSTRAINT "SaleRefund_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefundItem" ADD CONSTRAINT "SaleRefundItem_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "SaleRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRefundItem" ADD CONSTRAINT "SaleRefundItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repair" ADD CONSTRAINT "Repair_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_borrowerTenantId_fkey" FOREIGN KEY ("borrowerTenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_borrowerBranchId_fkey" FOREIGN KEY ("borrowerBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_receivedProductId_fkey" FOREIGN KEY ("receivedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_supplierTenantId_fkey" FOREIGN KEY ("supplierTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStorePayment" ADD CONSTRAINT "InterStorePayment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "InterStoreDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStorePayment" ADD CONSTRAINT "InterStorePayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStorePayment" ADD CONSTRAINT "InterStorePayment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStorePayment" ADD CONSTRAINT "InterStorePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAccount" ADD CONSTRAINT "WhatsAppAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WhatsAppAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WhatsAppAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "WhatsAppBroadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WhatsAppAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "OwnerIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpDeliveryLog" ADD CONSTRAINT "OtpDeliveryLog_otpId_fkey" FOREIGN KEY ("otpId") REFERENCES "OtpCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpDeliveryLog" ADD CONSTRAINT "OtpDeliveryLog_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "OwnerIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItemSerial" ADD CONSTRAINT "POItemSerial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItemSerial" ADD CONSTRAINT "POItemSerial_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItemSerial" ADD CONSTRAINT "POItemSerial_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItemSerial" ADD CONSTRAINT "POItemSerial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupplierSupply" ADD CONSTRAINT "SupplierSupply_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupplierSupply" ADD CONSTRAINT "SupplierSupply_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupplierSupply" ADD CONSTRAINT "SupplierSupply_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierSupply" ADD CONSTRAINT "SupplierSupply_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierSupplyItem" ADD CONSTRAINT "SupplierSupplyItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupplierSupplyItem" ADD CONSTRAINT "SupplierSupplyItem_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "SupplierSupply"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupplierSupplyItem" ADD CONSTRAINT "SupplierSupplyItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "SupplierSupply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillItem" ADD CONSTRAINT "SupplierBillItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillItem" ADD CONSTRAINT "SupplierBillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillItem" ADD CONSTRAINT "SupplierBillItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerLoan" ADD CONSTRAINT "OwnerLoan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerLoan" ADD CONSTRAINT "OwnerLoan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerLoanPayment" ADD CONSTRAINT "OwnerLoanPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerLoanPayment" ADD CONSTRAINT "OwnerLoanPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerLoanPayment" ADD CONSTRAINT "OwnerLoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "OwnerLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyAccountMovement" ADD CONSTRAINT "MoneyAccountMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyAccountMovement" ADD CONSTRAINT "MoneyAccountMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyAccountMovement" ADD CONSTRAINT "MoneyAccountMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "SupplierSupply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryNoteItem" ADD CONSTRAINT "DeliveryNoteItem_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DeliveryNoteItem" ADD CONSTRAINT "DeliveryNoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_drawer_events" ADD CONSTRAINT "cash_drawer_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cash_drawer_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cash_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SaleWarranty" ADD CONSTRAINT "SaleWarranty_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleWarranty" ADD CONSTRAINT "SaleWarranty_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleWarranty" ADD CONSTRAINT "SaleWarranty_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleWarranty" ADD CONSTRAINT "SaleWarranty_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleWarrantyUnit" ADD CONSTRAINT "SaleWarrantyUnit_warranty_id_fkey" FOREIGN KEY ("warranty_id") REFERENCES "SaleWarranty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleWarrantyUnit" ADD CONSTRAINT "SaleWarrantyUnit_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "SaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordChangeEvent" ADD CONSTRAINT "PasswordChangeEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordChangeEvent" ADD CONSTRAINT "PasswordChangeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordChangeEvent" ADD CONSTRAINT "PasswordChangeEvent_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToPlatformUserId_fkey" FOREIGN KEY ("assignedToPlatformUserId") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom constraints not represented by the Prisma datamodel.

ALTER TABLE "TenantDocumentSettings"
  ADD CONSTRAINT "TenantDocumentSettings_documentHeaderDisplay_check"
  CHECK (
    "documentHeaderDisplay" IN (
      'LOGO_AND_NAME',
      'LOGO_ONLY',
      'NAME_ONLY'
    )
  );

ALTER TABLE "TenantDocumentSettings"
  ADD CONSTRAINT "TenantDocumentSettings_documentSizeMode_check"
  CHECK (
    "documentSizeMode" IN (
      'AUTO',
      'COMPACT',
      'STANDARD'
    )
  );

ALTER TABLE "TenantDocumentSettings"
  ADD CONSTRAINT "TenantDocumentSettings_taxMode_check"
  CHECK (
    "taxMode" IN (
      'NONE',
      'VAT_18',
      'TURNOVER_3_INTERNAL',
      'VAT_18_PLUS_TURNOVER_3',
      'CUSTOM'
    )
  );

ALTER TABLE "TenantDocumentSettings"
  ADD CONSTRAINT "TenantDocumentSettings_taxDisplayMode_check"
  CHECK (
    "taxDisplayMode" IN (
      'HIDDEN',
      'CUSTOMER_FACING',
      'INTERNAL_ONLY'
    )
  );

ALTER TABLE "TenantDocumentSettings"
  ADD CONSTRAINT "TenantDocumentSettings_taxRateBps_check"
  CHECK (
    "taxRateBps" >= 0
    AND "taxRateBps" <= 10000
  );

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_taxMode_check"
  CHECK (
    "taxMode" IN (
      'NONE',
      'VAT_18',
      'TURNOVER_3_INTERNAL',
      'VAT_18_PLUS_TURNOVER_3',
      'CUSTOM'
    )
  );

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_taxDisplayMode_check"
  CHECK (
    "taxDisplayMode" IN (
      'HIDDEN',
      'CUSTOMER_FACING',
      'INTERNAL_ONLY'
    )
  );

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_taxRateBps_check"
  CHECK (
    "taxRateBps" >= 0
    AND "taxRateBps" <= 10000
  );

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_marketplaceSalePrice_nonnegative"
  CHECK (
    "marketplaceSalePrice" IS NULL
    OR "marketplaceSalePrice" >= 0
  );

ALTER TABLE "MarketplaceRequestItem"
  ADD CONSTRAINT "MarketplaceRequestItem_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "MarketplaceRequestItem"
  ADD CONSTRAINT "MarketplaceRequestItem_unitPrice_check"
  CHECK ("unitPrice" >= 0);

ALTER TABLE "MarketplaceRequestItem"
  ADD CONSTRAINT "MarketplaceRequestItem_lineTotal_check"
  CHECK ("lineTotal" >= 0);

ALTER TABLE "MarketplaceRequest"
  ADD CONSTRAINT "MarketplaceRequest_subtotal_check"
  CHECK ("subtotal" >= 0);

ALTER TABLE "MarketplaceRequest"
  ADD CONSTRAINT "MarketplaceRequest_deliveryFee_check"
  CHECK ("deliveryFee" >= 0);

ALTER TABLE "MarketplaceRequest"
  ADD CONSTRAINT "MarketplaceRequest_total_check"
  CHECK ("total" >= 0);
