import { ReactNode, useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Href, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "../ui/AppScreen";
import { AppText } from "../ui/AppText";
import { useThemeMode } from "../../lib/theme/useThemeMode";
import { useAuthStore } from "../../store/authStore";
import { roleCanAccessPath, roleLabel } from "../../constants/appAccess";
import { routes } from "../../constants/routes";
import { AppHeader } from "./AppHeader";
import { AppBottomNav } from "./AppBottomNav";

function createPalette(isDark: boolean) {
  return {
    page: isDark ? "#06111F" : "#F4F7FB",
    stage: isDark ? "#06111F" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#06111F",
    muted: isDark ? "#AFC1D6" : "#516173",
    soft: isDark ? "#9FB2C8" : "#64748B",
    cyan: isDark ? "#67E8F9" : "#0369A1",
    panel: isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC",
    panelStrong: isDark ? "rgba(255, 255, 255, 0.10)" : "#FFFFFF",
    border: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.12)",
    borderStrong: isDark
      ? "rgba(125, 211, 252, 0.26)"
      : "rgba(14, 165, 233, 0.28)",
    beamTop: isDark
      ? "rgba(32, 200, 255, 0.14)"
      : "rgba(32, 200, 255, 0.08)",
    beamBottom: isDark
      ? "rgba(37, 99, 235, 0.13)"
      : "rgba(37, 99, 235, 0.07)",
  };
}

export type AppShellPalette = ReturnType<typeof createPalette>;

type AppShellProps = {
  children: (palette: AppShellPalette) => ReactNode;
};

function AccessNotAvailable({
  palette,
  role,
}: {
  palette: AppShellPalette;
  role?: string | null;
}) {
  return (
    <View
      style={[
        styles.blockedPanel,
        {
          borderColor: palette.borderStrong,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.blockedIcon}>
        <Ionicons name="shield-checkmark-outline" size={22} color="#06111F" />
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
          ACCESS NOT AVAILABLE
        </AppText>

        <AppText variant="subtitle" color={palette.text}>
          This workspace is not part of {roleLabel(role).toLowerCase()} access.
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.blockedText}>
          Storvex only shows tools that match each staff member’s responsibility. Ask the owner if this person needs wider access.
        </AppText>
      </View>

      <View style={styles.blockedActions}>
        <Pressable
          onPress={() => router.replace(routes.dashboard as Href)}
          style={({ pressed }) => [
            styles.blockedButton,
            {
              backgroundColor: "#20C8FF",
              borderColor: "#20C8FF",
              opacity: pressed ? 0.76 : 1,
            },
          ]}
        >
          <AppText variant="label" color="#06111F" center>
            Back to home
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => router.replace(routes.support as Href)}
          style={({ pressed }) => [
            styles.blockedButton,
            {
              backgroundColor: palette.panelStrong,
              borderColor: palette.border,
              opacity: pressed ? 0.76 : 1,
            },
          ]}
        >
          <AppText variant="label" color={palette.text} center>
            Open support
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { resolvedMode } = useThemeMode();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const isDark = resolvedMode === "dark";
  const isTablet = width >= 768;
  const palette = useMemo(() => createPalette(isDark), [isDark]);

  const shellMaxWidth = isTablet ? 760 : 460;
  const navMaxWidth = isTablet ? 560 : Math.min(width - 44, 420);
  const canAccessCurrentScreen = roleCanAccessPath(user?.role || "OWNER", pathname);

  return (
    <View style={[styles.root, { backgroundColor: palette.page }]}>
      <AppScreen
        scroll={false}
        padded={false}
        contentStyle={{
          flex: 1,
          backgroundColor: palette.page,
        }}
      >
        <View
          style={[
            styles.page,
            {
              paddingHorizontal: isTablet ? 40 : 14,
              paddingTop: isTablet ? 30 : 14,
              paddingBottom: isTablet ? 30 : 14,
            },
          ]}
        >
          <View
            style={[
              styles.stage,
              {
                maxWidth: shellMaxWidth,
                backgroundColor: palette.stage,
                borderColor: palette.border,
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.backgroundBeamTop,
                { backgroundColor: palette.beamTop },
              ]}
            />

            <View
              pointerEvents="none"
              style={[
                styles.backgroundBeamBottom,
                { backgroundColor: palette.beamBottom },
              ]}
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.scroller}
              contentContainerStyle={[
                styles.scrollerContent,
                {
                  paddingHorizontal: isTablet ? 22 : 18,
                  paddingTop: isTablet ? 22 : 18,
                  paddingBottom: Platform.OS === "ios" ? 112 : 104,
                },
              ]}
            >
              <View style={styles.content}>
                <AppHeader isDark={isDark} palette={palette} />

                <View style={styles.main}>
                  {canAccessCurrentScreen ? (
                    children(palette)
                  ) : (
                    <AccessNotAvailable palette={palette} role={user?.role} />
                  )}
                </View>
              </View>
            </ScrollView>

            <View pointerEvents="box-none" style={styles.bottomDock}>
              <View
                style={[
                  styles.bottomInner,
                  {
                    maxWidth: navMaxWidth,
                    backgroundColor: isDark
                      ? "rgba(15, 29, 45, 0.96)"
                      : "rgba(255, 255, 255, 0.96)",
                    borderColor: isDark
                      ? "rgba(148, 163, 184, 0.14)"
                      : "rgba(15, 23, 42, 0.08)",
                  },
                ]}
              >
                <View
                  pointerEvents="none"
                  style={[
                    styles.bottomGlowLeft,
                    {
                      backgroundColor: isDark
                        ? "rgba(34, 197, 94, 0.12)"
                        : "rgba(14, 165, 233, 0.08)",
                    },
                  ]}
                />

                <View
                  pointerEvents="none"
                  style={[
                    styles.bottomGlowRight,
                    {
                      backgroundColor: isDark
                        ? "rgba(34, 199, 244, 0.09)"
                        : "rgba(37, 99, 235, 0.06)",
                    },
                  ]}
                />

                <View style={styles.bottomNavContent}>
                  <AppBottomNav palette={palette} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  page: {
    flex: 1,
    alignItems: "center",
  },

  stage: {
    flex: 1,
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },

  backgroundBeamTop: {
    position: "absolute",
    top: -145,
    right: -105,
    width: 290,
    height: 290,
    transform: [{ rotate: "18deg" }],
    opacity: 0.92,
  },

  backgroundBeamBottom: {
    position: "absolute",
    left: -145,
    bottom: 92,
    width: 260,
    height: 260,
    transform: [{ rotate: "-24deg" }],
    opacity: 0.72,
  },

  scroller: {
    flex: 1,
    zIndex: 2,
  },

  scrollerContent: {
    flexGrow: 1,
  },

  content: {
    gap: 18,
  },

  main: {
    gap: 16,
  },

  bottomDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Platform.OS === "ios" ? 20 : 18,
    paddingHorizontal: 18,
    alignItems: "center",
    zIndex: 80,
    elevation: 80,
  },

  bottomInner: {
    width: "100%",
    alignSelf: "center",
    position: "relative",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 34,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 24,
  },

  bottomNavContent: {
    position: "relative",
    zIndex: 2,
  },

  bottomGlowLeft: {
    position: "absolute",
    left: -34,
    bottom: -38,
    width: 94,
    height: 94,
    borderRadius: 47,
    opacity: 0.6,
  },

  bottomGlowRight: {
    position: "absolute",
    right: -48,
    top: -50,
    width: 112,
    height: 112,
    borderRadius: 56,
    opacity: 0.6,
  },

  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  blockedPanel: {
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },

  blockedIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  blockedText: {
    lineHeight: 19,
  },

  blockedActions: {
    gap: 10,
  },

  blockedButton: {
    minHeight: 52,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
});
