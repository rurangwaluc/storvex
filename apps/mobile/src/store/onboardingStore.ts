import { create } from "zustand";
import type { OwnerIntent, SignupPlan } from "../features/onboarding/types";

type SignupMode = "TRIAL" | "PAID";

type PaymentSummary = {
  paymentId?: string | null;
  reference?: string | null;
  status?: string | null;
};

type OnboardingStore = {
  intentId: string | null;
  intent: OwnerIntent | null;
  signupMode: SignupMode | null;
  selectedPlan: SignupPlan | null;
  selectedPlanKey: string | null;
  payment: PaymentSummary | null;
  ownerPassword: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;

  setOwnerIntent: (payload: {
    intentId: string;
    intent?: OwnerIntent | null;
  }) => void;

  setOtpStatus: (payload: {
    emailVerified?: boolean;
    phoneVerified?: boolean;
  }) => void;

  setSignupPath: (payload: {
    mode: SignupMode;
    plan?: SignupPlan | null;
  }) => void;

  setSelectedPlan: (plan: SignupPlan) => void;
  setPayment: (payment: PaymentSummary | null) => void;
  setOwnerPassword: (password: string) => void;
  setSignupMode: (mode: SignupMode) => void;
  resetOnboarding: () => void;
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  intentId: null,
  intent: null,
  signupMode: null,
  selectedPlan: null,
  selectedPlanKey: null,
  payment: null,
  ownerPassword: null,
  emailVerified: false,
  phoneVerified: false,

  setOwnerIntent: ({ intentId, intent = null }) => {
    set({
      intentId,
      intent,
      emailVerified: !!intent?.emailVerified,
      phoneVerified: !!intent?.phoneVerified,
    });
  },

  setOtpStatus: ({ emailVerified, phoneVerified }) => {
    set((current) => ({
      emailVerified:
        typeof emailVerified === "boolean"
          ? emailVerified
          : current.emailVerified,
      phoneVerified:
        typeof phoneVerified === "boolean"
          ? phoneVerified
          : current.phoneVerified,
      intent: current.intent
        ? {
            ...current.intent,
            emailVerified:
              typeof emailVerified === "boolean"
                ? emailVerified
                : current.intent.emailVerified,
            phoneVerified:
              typeof phoneVerified === "boolean"
                ? phoneVerified
                : current.intent.phoneVerified,
          }
        : current.intent,
    }));
  },

  setSignupPath: ({ mode, plan = null }) => {
    set({
      signupMode: mode,
      selectedPlan: plan,
      selectedPlanKey: plan?.key ?? null,
      payment: mode === "TRIAL" ? null : undefined,
    });
  },

  setSelectedPlan: (plan) => {
    set({
      signupMode: "PAID",
      selectedPlan: plan,
      selectedPlanKey: plan.key,
    });
  },

  setPayment: (payment) => {
    set({ payment });
  },

  setOwnerPassword: (password) => {
    set({ ownerPassword: password });
  },

  setSignupMode: (mode) => {
    set({ signupMode: mode });
  },

  resetOnboarding: () => {
    set({
      intentId: null,
      intent: null,
      signupMode: null,
      selectedPlan: null,
      selectedPlanKey: null,
      payment: null,
      ownerPassword: null,
      emailVerified: false,
      phoneVerified: false,
    });
  },
}));