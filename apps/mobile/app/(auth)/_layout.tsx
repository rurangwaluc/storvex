import { Href, Stack, router } from "expo-router";
import { useEffect } from "react";
import { routes } from "../../src/constants/routes";
import { useAuthStore } from "../../src/store/authStore";

export default function AuthLayout() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  useEffect(() => {
    if (!isHydrating && (token || user)) {
      router.replace(routes.dashboard as Href);
    }
  }, [isHydrating, token, user]);

  return <Stack screenOptions={{ headerShown: false }} />;
}