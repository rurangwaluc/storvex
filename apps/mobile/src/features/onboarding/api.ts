import { api } from "../../lib/api/client";
import {
  getSecureItem,
  setSecureItem,
} from "../../lib/storage/secureStorage";
import type {
  ConfirmSignupPayload,
  ConfirmSignupResponse,
  OwnerIntentPayload,
  OwnerIntentResponse,
  SendOtpPayload,
  SendOtpResponse,
  SignupPaymentPayload,
  SignupPaymentResponse,
  SignupPlansResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
} from "./types";

const SIGNUP_DEVICE_ID_KEY = "storvex_signup_device_id";

function createLocalDeviceId() {
  const randomOne = Math.random().toString(36).slice(2);
  const randomTwo = Math.random().toString(36).slice(2);
  return `storvex-mobile-${Date.now()}-${randomOne}-${randomTwo}`;
}

export async function getOrCreateSignupDeviceId() {
  const existing = await getSecureItem(SIGNUP_DEVICE_ID_KEY);

  if (existing) {
    return existing;
  }

  const next = createLocalDeviceId();
  await setSecureItem(SIGNUP_DEVICE_ID_KEY, next);
  return next;
}

export async function createOwnerIntent(payload: OwnerIntentPayload) {
  const deviceId = payload.deviceId || (await getOrCreateSignupDeviceId());

  return api.post<OwnerIntentResponse>(
    "/auth/owner-intent",
    {
      ...payload,
      deviceId,
      browserFingerprint: payload.browserFingerprint || deviceId,
      mode: payload.mode || "TRIAL",
    },
    {
      requiresAuth: false,
    },
  );
}

export async function sendSignupOtp(payload: SendOtpPayload) {
  return api.post<SendOtpResponse>("/auth/signup/otp/send", payload, {
    requiresAuth: false,
  });
}

export async function verifySignupOtp(payload: VerifyOtpPayload) {
  return api.post<VerifyOtpResponse>("/auth/signup/otp/verify", payload, {
    requiresAuth: false,
  });
}

export async function getSignupPlans() {
  return api.get<SignupPlansResponse>("/auth/plans", {
    requiresAuth: false,
  });
}

export async function createSignupPayment(payload: SignupPaymentPayload) {
  return api.post<SignupPaymentResponse>("/auth/signup/payment", payload, {
    requiresAuth: false,
  });
}

export async function confirmSignup(payload: ConfirmSignupPayload) {
  return api.post<ConfirmSignupResponse>("/auth/confirm-signup", payload, {
    requiresAuth: false,
  });
}