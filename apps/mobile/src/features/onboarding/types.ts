export type SignupMode = "TRIAL" | "PAID";

export type OtpChannel = "EMAIL" | "PHONE";

export type OwnerIntentPayload = {
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  shopType?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  deviceId?: string | null;
  browserFingerprint?: string | null;
  mode?: SignupMode;
  planKey?: string | null;
};

export type OwnerIntent = {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  shopType?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  deviceId?: string | null;
  browserFingerprint?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  requestedPlanKey?: string | null;
  requestedTierKey?: string | null;
  requestedCycleKey?: string | null;
  requestedStaffLimit?: number | null;
  requestedPriceAmount?: number | null;
  requestedCurrency?: string | null;
  status: string;
  expiresAt: string;
  createdAt?: string;
};

export type OwnerIntentResponse = {
  intentId: string;
  expiresAt: string;
  message: string;
  intent: OwnerIntent;
};

export type SendOtpPayload = {
  intentId: string;
  channel: OtpChannel;
};

export type SendOtpResponse = {
  message: string;
  channel: OtpChannel;
  expiresAt?: string;
  sent?: boolean;
  provider?: string | null;
  messageId?: string | null;
  sendReason?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  devOtp?: string;
  devTarget?: string;
};

export type VerifyOtpPayload = {
  intentId: string;
  channel: OtpChannel;
  code: string;
};

export type VerifyOtpResponse = {
  message: string;
  channel: OtpChannel;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
};

export type SignupPlanSection = {
  key?: string | null;
  label?: string | null;
  items?: string[];
};

export type SignupPlanCapacity = {
  staffLimit?: number | null;
  branchLimit?: number | null;
  [key: string]: unknown;
};

export type SignupPlanEntitlements = {
  planLevel?: string | null;
  marketplaceEnabled?: boolean;
  marketplaceIncluded?: boolean;
  imageStudioEnabled?: boolean;
  supportLevel?: string | null;
  reportingLevel?: string | null;
  [key: string]: unknown;
};

export type SignupPlan = {
  key: string;

  name?: string;
  label?: string;
  description?: string | null;
  shortDescription?: string | null;
  audience?: string | null;

  tierKey?: string | null;
  cycleKey?: string | null;
  tierLabel?: string | null;
  cycleLabel?: string | null;

  price?: number | null;
  priceAmount?: number | null;
  currency?: string | null;

  days?: number | null;
  billingCycle?: string | null;
  trialDays?: number | null;

  staffLimit?: number | null;
  branchLimit?: number | null;

  features?: string[];
  highlights?: string[];
  sections?: SignupPlanSection[];
  capacity?: SignupPlanCapacity | null;
  entitlements?: SignupPlanEntitlements | null;

  recommended?: boolean;
  isEnterprise?: boolean;
  marketplaceIncluded?: boolean;
  launchPricing?: boolean;
};

export type SignupPlansResponse = {
  plans: SignupPlan[];
  trialDays?: number;
  currency?: string;
};

export type SignupPaymentPayload = {
  intentId: string;
  planKey: string;
  phone: string;
};

export type SignupPaymentResponse = {
  message?: string;

  paymentId?: string | null;
  paymentReference?: string | null;
  reference?: string | null;

  intentId?: string;
  plan?: SignupPlan | null;
  phone?: string | null;

  status?: string | null;

  paymentUrl?: string | null;
  checkoutUrl?: string | null;
  redirectUrl?: string | null;
  authorizationUrl?: string | null;
};

export type ConfirmSignupPayload = {
  intentId: string;
  password: string;
  mode: SignupMode;
  planKey?: string | null;
  planDays?: number | null;
};

export type ConfirmSignupResponse = {
  message: string;
  token?: string;
  tenantId?: string;
  ownerEmail?: string;
  mode?: SignupMode;
  subscriptionDays?: number;

  user?: {
    id: string;
    tenantId: string;
    role: string;
    name: string;
    email: string;
    phone?: string | null;
  };

  tenant?: Record<string, unknown>;
  mainBranch?: Record<string, unknown>;
  activeBranch?: Record<string, unknown>;
  allowedBranches?: Record<string, unknown>[];

  subscription?: {
    planKey?: string | null;
    tierKey?: string | null;
    cycleKey?: string | null;
    staffLimit?: number | null;
    branchLimit?: number | null;
    extraBranchCount?: number | null;
    priceAmount?: number | null;
    currency?: string | null;
    startDate?: string | Date | null;
  };
};