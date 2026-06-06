import { useMutation, useQuery } from "@tanstack/react-query";
import { getMe, loginOwner } from "./api";

export function useLoginOwner() {
  return useMutation({
    mutationFn: loginOwner,
  });
}

export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["auth-me"],
    queryFn: getMe,
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  });
}