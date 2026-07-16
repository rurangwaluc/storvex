export type SubscriptionAccessMode = "TRIAL" | "ACTIVE" | "READ_ONLY";

export type SubscriptionSummary = {
  id?: string;
  accessMode: SubscriptionAccessMode;
  storedAccessMode?: string | null;

  canRead: boolean;
  canOperate: boolean;

  status?: string | null;
  planName?: string | null;
  planKey?: string | null;
  tierKey?: string | null;
  cycleKey?: string | null;

  startDate?: string | null;
  endDate?: string | null;

  trialStartDate?: string | null;
  trialEndDate?: string | null;
  trialEndsAt?: string | null;

  currentPeriodEndsAt?: string | null;
  graceEndDate?: string | null;
  readOnlySince?: string | null;

  lastPaymentAt?: string | null;
  renewedAt?: string | null;

  staffLimit?: number | null;
  branchLimit?: number | null;
  extraBranchCount?: number | null;
  effectiveBranchLimit?: number | null;
  activeBranches?: number | null;

  entitlements?: {
    planLevel?: string | null;
    marketplaceEnabled?: boolean;
    marketplaceIncluded?: boolean;
    marketplaceCommissionEnabled?: boolean;
    sellerManagedDelivery?: boolean;
    deliveryAreaLimit?: number | null;
    marketplaceOrderLimit?: number | null;
    imageStudioEnabled?: boolean;
    supportLevel?: string | null;
    reportingLevel?: string | null;
    [key: string]: unknown;
  } | null;

  canAddBranch?: boolean;
  overBranchLimit?: boolean;
  atBranchLimit?: boolean;

  daysLeft?: number | null;
  reason?: string | null;
};