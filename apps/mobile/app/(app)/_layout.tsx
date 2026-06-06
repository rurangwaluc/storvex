import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../src/components/ui/AppText";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { routes } from "../../src/constants/routes";
import { useMe } from "../../src/features/auth/hooks";
import { useAuthStore } from "../../src/store/authStore";

function AppHydrationSkeleton() {
  return (
    <View style={styles.loadingPage}>
      <View style={styles.loadingCard}>
        <View style={styles.loadingTop}>
          <View style={styles.loadingDot} />
          <AppText variant="caption" color="#67E8F9">
            OPENING STORVEX
          </AppText>
        </View>

        <AppText variant="title" color="#FFFFFF">
          Preparing your workspace...
        </AppText>

        <AppText variant="muted" color="#AFC1D6">
          Restoring your secure owner access.
        </AppText>

        <View style={styles.skeletonStack}>
          <Skeleton height={18} width="58%" />
          <Skeleton height={14} width="84%" />
          <Skeleton height={14} width="70%" />
          <Skeleton height={78} />
          <Skeleton height={78} />
        </View>
      </View>
    </View>
  );
}

function AppSessionGate() {
  const token = useAuthStore((state) => state.token);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const setMe = useAuthStore((state) => state.setMe);

  const meQuery = useMe(Boolean(token) && !isHydrating);

  useEffect(() => {
    if (!meQuery.data) return;

    const branches =
      meQuery.data.branches && meQuery.data.branches.length > 0
        ? meQuery.data.branches
        : meQuery.data.allowedBranches && meQuery.data.allowedBranches.length > 0
          ? meQuery.data.allowedBranches
          : meQuery.data.activeBranch
            ? [meQuery.data.activeBranch]
            : [];

    setMe({
      user: meQuery.data.user,
      tenant: meQuery.data.tenant,
      subscription: meQuery.data.subscription ?? null,
      activeBranch: meQuery.data.activeBranch ?? meQuery.data.mainBranch ?? null,
      allowedBranches: branches,
    });
  }, [meQuery.data, setMe]);

  if (isHydrating) {
    return <AppHydrationSkeleton />;
  }

  if (!token) {
    return <Redirect href={routes.login} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function AppLayout() {
  return <AppSessionGate />;
}

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    backgroundColor: "#06111F",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  loadingCard: {
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    padding: 20,
    gap: 14,
  },

  loadingTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  loadingDot: {
    width: 7,
    height: 7,
    backgroundColor: "#22C55E",
  },

  skeletonStack: {
    marginTop: 8,
    gap: 12,
  },
});