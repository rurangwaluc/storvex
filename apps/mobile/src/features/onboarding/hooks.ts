import { useMutation, useQuery } from "@tanstack/react-query";
import {
  confirmSignup,
  createOwnerIntent,
  createSignupPayment,
  getSignupPlans,
  sendSignupOtp,
  verifySignupOtp,
} from "./api";

export function useCreateOwnerIntent() {
  return useMutation({
    mutationFn: createOwnerIntent,
  });
}

export function useSendSignupOtp() {
  return useMutation({
    mutationFn: sendSignupOtp,
  });
}

export function useVerifySignupOtp() {
  return useMutation({
    mutationFn: verifySignupOtp,
  });
}

export function useSignupPlans() {
  return useQuery({
    queryKey: ["signup-plans"],
    queryFn: getSignupPlans,
    staleTime: 60_000,
  });
}

export function useCreateSignupPayment() {
  return useMutation({
    mutationFn: createSignupPayment,
  });
}

export function useConfirmSignup() {
  return useMutation({
    mutationFn: confirmSignup,
  });
}