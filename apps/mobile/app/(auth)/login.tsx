import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { AppButton } from "../../src/components/ui/AppButton";
import { AppScreen } from "../../src/components/ui/AppScreen";
import { AppText } from "../../src/components/ui/AppText";
import { AppTextInput } from "../../src/components/ui/AppTextInput";
import { AsyncButton } from "../../src/components/ui/AsyncButton";
import { ThemeToggle } from "../../src/components/ui/ThemeToggle";
import { routes } from "../../src/constants/routes";
import { useLoginOwner } from "../../src/features/auth/hooks";
import { useThemeMode } from "../../src/lib/theme/useThemeMode";
import { useAuthStore } from "../../src/store/authStore";

const logo = require("../../assets/images/storvex_white.webp");
const logoDark = require("../../assets/images/storvex_dark.webp");
const icon = require("../../assets/images/storvex_icon.webp");

function createPalette(isDark: boolean) {
  return {
    page: isDark ? "#06111F" : "#F4F7FB",
    stage: isDark ? "#06111F" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#06111F",
    muted: isDark ? "#AFC1D6" : "#516173",
    soft: isDark ? "#9FB2C8" : "#64748B",
    danger: isDark ? "#FCA5A5" : "#B91C1C",
    cyanSoft: isDark ? "#67E8F9" : "#0369A1",
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

type Palette = ReturnType<typeof createPalette>;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

function LoginTrustPanel({ palette }: { palette: Palette }) {
  return (
    <View
      style={[
        styles.trustPanel,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.trustIcon}>
        <AppText variant="caption" color="#06111F">
          ✓
        </AppText>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="label" color={palette.text}>
          Secure owner access
        </AppText>
        <AppText variant="caption" color={palette.soft}>
          Use the owner email and password created during signup.
        </AppText>
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const { resolvedMode } = useThemeMode();
  const { width, height } = useWindowDimensions();

  const isDark = resolvedMode === "dark";
  const palette = useMemo(() => createPalette(isDark), [isDark]);

  const isTablet = width >= 768;
  const compact = height < 760;

  const setSession = useAuthStore((state) => state.setSession);
  const loginMutation = useLoginOwner();

  const [email, setEmail] = useState("demo@shop.rw");
  const [password, setPassword] = useState("Test@12345");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");

  async function submitLogin() {
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter the owner email.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter the owner password.");
      return;
    }

    try {
      const response = await loginMutation.mutateAsync({
        email: cleanEmail,
        password,
      });

      await setSession({
        token: response.token,
        user: response.user,
        tenant: response.tenant ?? null,
        subscription: response.subscription ?? null,
        activeBranch: response.activeBranch ?? null,
        allowedBranches: response.allowedBranches ?? [],
      });

      router.replace(routes.dashboard);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Login failed. Check the owner email and password.";

      setError(message);
    }
  }

  return (
    <AppScreen
      scroll
      padded={false}
      contentStyle={{
        flexGrow: 1,
        backgroundColor: palette.page,
      }}
    >
      <View
        style={[
          styles.page,
          {
            paddingHorizontal: isTablet ? 40 : 20,
            paddingTop: isTablet ? 30 : 18,
            paddingBottom: isTablet ? 30 : 18,
          },
        ]}
      >
        <View
          style={[
            styles.stage,
            {
              maxWidth: isTablet ? 620 : 440,
              minHeight: compact ? 690 : 760,
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

          <View style={styles.header}>
            <Image
              source={isDark ? logo : logoDark}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.headerActions}>
              <ThemeToggle />
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.heroRow}>
              <View style={styles.iconWrap}>
                <View style={styles.iconGlow} />
                <View style={styles.iconBox}>
                  <Image source={icon} style={styles.icon} resizeMode="contain" />
                </View>
              </View>

              <View style={{ flex: 1, gap: 8 }}>
                <View style={styles.kickerRow}>
                  <View style={styles.kickerDot} />
                  <AppText variant="caption" color={palette.cyanSoft}>
                    OWNER LOGIN
                  </AppText>
                </View>

                <AppText variant="display" color={palette.text}>
                  Welcome back to your store control room.
                </AppText>
              </View>
            </View>

            <AppText variant="muted" color={palette.muted}>
              Sign in with the owner account to control sales, stock, cash, staff,
              and business activity.
            </AppText>

            <LoginTrustPanel palette={palette} />

            <View
              style={[
                styles.formPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <AppTextInput
                label="Owner email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError("");
                }}
                placeholder="owner@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.passwordWrap}>
                <AppTextInput
                  label="Password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Pressable
                  onPress={() => setPasswordVisible((current) => !current)}
                  style={({ pressed }) => [
                    styles.passwordToggle,
                    {
                      backgroundColor: isDark
                        ? "rgba(32, 200, 255, 0.09)"
                        : "rgba(3, 105, 161, 0.07)",
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={palette.cyanSoft}
                  />
                </Pressable>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <AppText variant="caption" color={palette.danger}>
                    {error}
                  </AppText>
                </View>
              ) : null}

              <AsyncButton
                fullWidth
                disabled={loginMutation.isPending}
                onPress={submitLogin}
                style={styles.primaryButton}
              >
                Continue to dashboard
              </AsyncButton>
            </View>

            <View
              style={[
                styles.helpPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.noteMark}>
                <AppText variant="caption" color="#06111F">
                  i
                </AppText>
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="label" color={palette.text}>
                  New business?
                </AppText>
                <AppText variant="caption" color={palette.soft}>
                  Create the owner setup first, verify OTP, then return here to
                  login.
                </AppText>
              </View>
            </View>

            <AppButton
              fullWidth
              variant="secondary"
              onPress={() => router.replace(routes.businessIntent)}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.055)"
                    : "#FFFFFF",
                  borderColor: palette.border,
                },
              ]}
            >
              Create owner setup
            </AppButton>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stage: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
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
    bottom: 100,
    width: 260,
    height: 260,
    transform: [{ rotate: "-24deg" }],
    opacity: 0.72,
  },

  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    zIndex: 2,
  },

  logo: {
    width: 126,
    height: 34,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  content: {
    paddingTop: 38,
    gap: 18,
    zIndex: 2,
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  iconWrap: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
  },

  iconGlow: {
    position: "absolute",
    width: 76,
    height: 76,
    backgroundColor: "rgba(32, 200, 255, 0.14)",
    transform: [{ rotate: "10deg" }],
  },

  iconBox: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    shadowColor: "#20C8FF",
    shadowOpacity: 0.26,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },

  icon: {
    width: 40,
    height: 40,
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

  trustPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  trustIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  formPanel: {
    borderWidth: 1,
    padding: 15,
    gap: 14,
  },

  passwordWrap: {
    position: "relative",
  },

  passwordToggle: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 36,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },

  errorBox: {
    padding: 12,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.22)",
  },

  helpPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  noteMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  primaryButton: {
    minHeight: 60,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
    borderRadius: 8,
  },

  secondaryButton: {
    minHeight: 56,
    borderRadius: 0,
  },
});
