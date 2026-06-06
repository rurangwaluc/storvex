import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { AppScreen } from "../src/components/ui/AppScreen";
import { Skeleton } from "../src/components/ui/Skeleton";
import { useAuthStore } from "../src/store/authStore";
import { useThemeMode } from "../src/lib/theme/useThemeMode";
import { routes } from "../src/constants/routes";

export default function IndexScreen() {
  const { theme } = useThemeMode();
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isHydrating) return;

    if (isAuthenticated) {
      router.replace(routes.dashboard);
      return;
    }

    router.replace(routes.landing);
  }, [isHydrating, isAuthenticated]);

  return (
    <AppScreen scroll={false}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: theme.spacing[4],
        }}
      >
        <Skeleton height={36} width="60%" />
        <Skeleton height={18} width="88%" />
        <Skeleton height={18} width="74%" />
        <Skeleton height={160} radius={theme.radius.xl} />
      </View>
    </AppScreen>
  );
}