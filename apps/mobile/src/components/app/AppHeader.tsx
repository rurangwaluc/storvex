import { Href, router } from "expo-router";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { routes } from "../../constants/routes";
import { useAuthStore } from "../../store/authStore";
import { useBranchStore } from "../../store/branchStore";
import { ThemeToggle } from "../ui/ThemeToggle";
import { AppText } from "../ui/AppText";

const logo = require("../../../assets/images/storvex_white.webp");
const logoDark = require("../../../assets/images/storvex_dark.webp");

type AppHeaderProps = {
  isDark: boolean;
  palette: {
    text: string;
    muted: string;
    soft: string;
    cyan: string;
    panel: string;
    border: string;
    borderStrong: string;
  };
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(name?: string | null, email?: string | null) {
  const cleanName = String(name || "").trim();

  if (cleanName) {
    return cleanName.split(/\s+/)[0];
  }

  const cleanEmail = String(email || "").trim();

  if (cleanEmail.includes("@")) {
    return cleanEmail.split("@")[0];
  }

  return "Owner";
}

function getRoleLabel(role?: string | null) {
  const effectiveRole = String(role || "OWNER").trim().toUpperCase();

  if (effectiveRole === "OWNER") return "Owner access";
  if (effectiveRole === "MANAGER") return "Manager access";
  if (effectiveRole === "CASHIER") return "Cashier access";
  if (effectiveRole === "SELLER") return "Sales access";
  if (effectiveRole === "STOREKEEPER") return "Stock access";
  if (effectiveRole === "TECHNICIAN") return "Repair access";

  return "Owner access";
}

export function AppHeader({ isDark, palette }: AppHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const logout = useAuthStore((state) => state.logout);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const firstName = getFirstName(user?.name, user?.email);
  const businessName = tenant?.name || "Your business";
  const branchName = activeBranch?.name || "Main selling location";

  async function handleLogout() {
    await logout();
    router.replace(routes.login as Href);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Image
          source={isDark ? logo : logoDark}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.actions}>
          <ThemeToggle />

          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => [
              styles.logoutButton,
              {
                borderColor: palette.borderStrong,
                backgroundColor: isDark
                  ? "rgba(14, 165, 233, 0.10)"
                  : "rgba(2, 6, 23, 0.04)",
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={17} color={palette.cyan} />

            <AppText variant="caption" color={palette.cyan}>
              Sign out
            </AppText>
          </Pressable>
        </View>
      </View>

      <View style={styles.greetingBlock}>
        <View style={styles.kickerRow}>
          <View style={styles.kickerDot} />

          <AppText variant="caption" color={palette.cyan}>
            {getRoleLabel(user?.role).toUpperCase()}
          </AppText>
        </View>

        <AppText variant="title" color={palette.text}>
          {getGreeting()}, {firstName}
        </AppText>

        <AppText variant="muted" color={palette.muted}>
          {businessName} is ready for today’s work.
        </AppText>
      </View>

      <View
        style={[
          styles.locationStrip,
          {
            backgroundColor: palette.panel,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.locationIcon}>
          <Ionicons name="storefront-outline" size={17} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={palette.soft}>
            CURRENT SELLING LOCATION
          </AppText>

          <AppText variant="label" color={palette.text}>
            {branchName}
          </AppText>
        </View>

        <View style={styles.liveBadge}>
          <AppText variant="caption" color="#06111F">
            Live
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 18,
  },

  topRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  logo: {
    width: 126,
    height: 34,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logoutButton: {
    minHeight: 38,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  greetingBlock: {
    gap: 9,
  },

  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  kickerDot: {
    width: 7,
    height: 7,
    backgroundColor: "#22C55E",
  },

  locationStrip: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  locationIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  liveBadge: {
    backgroundColor: "#67E8F9",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});