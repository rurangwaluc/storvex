import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Keyboard,
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
import { useThemeMode } from "../../src/lib/theme/useThemeMode";
import { useOnboardingStore } from "../../src/store/onboardingStore";

const logo = require("../../assets/images/storvex_white.webp");
const logoDark = require("../../assets/images/storvex_dark.webp");
const icon = require("../../assets/images/storvex_icon.webp");

type FieldErrors = {
  password?: string;
  confirmPassword?: string;
};

function createPalette(isDark: boolean) {
  return {
    page: isDark ? "#06111F" : "#F4F7FB",
    stage: isDark ? "#06111F" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#06111F",
    muted: isDark ? "#AFC1D6" : "#516173",
    soft: isDark ? "#9FB2C8" : "#64748B",
    cyan: "#20C8FF",
    cyanSoft: isDark ? "#67E8F9" : "#0369A1",
    panel: isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC",
    panelStrong: isDark ? "rgba(3, 17, 31, 0.34)" : "#FFFFFF",
    border: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.12)",
    borderStrong: isDark
      ? "rgba(125, 211, 252, 0.22)"
      : "rgba(15, 23, 42, 0.16)",
    beamTop: isDark
      ? "rgba(32, 200, 255, 0.18)"
      : "rgba(32, 200, 255, 0.10)",
    beamBottom: isDark
      ? "rgba(37, 99, 235, 0.18)"
      : "rgba(37, 99, 235, 0.10)",
    grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)",
    dangerPanel: isDark ? "rgba(127, 29, 29, 0.22)" : "#FEF2F2",
    dangerBorder: isDark ? "rgba(248, 113, 113, 0.28)" : "#FCA5A5",
    dangerText: isDark ? "#FCA5A5" : "#B91C1C",
    successPanel: isDark ? "rgba(34,197,94,0.14)" : "#ECFDF5",
    successBorder: isDark ? "rgba(74,222,128,0.28)" : "#86EFAC",
    successText: isDark ? "#86EFAC" : "#15803D",
  };
}

type Palette = ReturnType<typeof createPalette>;

function getPasswordScore(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return score;
}

function getPasswordLabel(score: number) {
  if (score <= 1) return "Weak";
  if (score <= 3) return "Good";
  return "Strong";
}

function RequirementRow({
  met,
  label,
  palette,
}: {
  met: boolean;
  label: string;
  palette: Palette;
}) {
  return (
    <View style={styles.requirementRow}>
      <View
        style={[
          styles.requirementMark,
          {
            backgroundColor: met ? "#67E8F9" : "rgba(148, 163, 184, 0.25)",
          },
        ]}
      >
        <AppText variant="caption" color={met ? "#06111F" : palette.soft}>
          {met ? "✓" : ""}
        </AppText>
      </View>

      <AppText variant="caption" color={met ? palette.text : palette.soft}>
        {label}
      </AppText>
    </View>
  );
}

function MissingSetupState({
  palette,
  isDark,
  isTablet,
}: {
  palette: Palette;
  isDark: boolean;
  isTablet: boolean;
}) {
  return (
    <AppScreen
      scroll={false}
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
            paddingVertical: isTablet ? 30 : 18,
          },
        ]}
      >
        <View
          style={[
            styles.missingStage,
            {
              maxWidth: isTablet ? 520 : 420,
              backgroundColor: palette.stage,
              borderColor: palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.backgroundBeamTop,
              { backgroundColor: palette.beamTop },
            ]}
          />
          <View style={styles.missingHeader}>
            <Image
              source={isDark ? logo : logoDark}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemeToggle />
          </View>

          <View style={styles.missingBody}>
            <View style={styles.missingTopRow}>
              <View style={styles.missingIconWrap}>
                <View style={styles.missingIconGlow} />
                <View style={styles.missingIcon}>
                  <Image
                    source={icon}
                    style={styles.missingIconImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={styles.missingTitleWrap}>
                <View style={styles.kickerRow}>
                  <View style={styles.kickerDot} />
                  <AppText variant="caption" color={palette.cyanSoft}>
                    PASSWORD SETUP
                  </AppText>
                </View>

                <AppText variant="title" color={palette.text}>
                  Finish the previous steps first.
                </AppText>

                <AppText variant="caption" color={palette.soft}>
                  Password creation needs a verified signup intent and an access
                  path.
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.missingSummary,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <View style={styles.summaryIndex}>
                  <AppText variant="caption" color="#06111F">
                    1
                  </AppText>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>
                    Verify owner access
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    Email and phone OTP must be completed.
                  </AppText>
                </View>
              </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: palette.border },
                ]}
              />

              <View style={styles.summaryRow}>
                <View style={styles.summaryIndex}>
                  <AppText variant="caption" color="#06111F">
                    2
                  </AppText>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>
                    Choose access path
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    Select trial or paid access before password creation.
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <AppButton
                fullWidth
                onPress={() => router.replace(routes.choosePath)}
                style={styles.primaryButton}
              >
                Go to access choice
              </AppButton>

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
                Restart business setup
              </AppButton>
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

export default function CreatePasswordScreen() {
  const { resolvedMode } = useThemeMode();
  const { width, height } = useWindowDimensions();

  const isDark = resolvedMode === "dark";
  const palette = useMemo(() => createPalette(isDark), [isDark]);

  const isTablet = width >= 768;
  const compact = height < 760;

  const intent = useOnboardingStore((state) => state.intent);
  const intentId = useOnboardingStore((state) => state.intentId);
  const emailVerified = useOnboardingStore((state) => state.emailVerified);
  const phoneVerified = useOnboardingStore((state) => state.phoneVerified);
  const signupMode = useOnboardingStore((state) => state.signupMode);
  const selectedPlan = useOnboardingStore((state) => state.selectedPlan);
  const setOwnerPassword = useOnboardingStore((state) => state.setOwnerPassword);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const passwordScore = getPasswordScore(password);
  const passwordLabel = getPasswordLabel(passwordScore);

  const requirements = [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "Uppercase and lowercase letters",
      met: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      label: "At least one number",
      met: /\d/.test(password),
    },
    {
      label: "One symbol for stronger protection",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const canOpenPassword =
    Boolean(intentId) &&
    Boolean(intent) &&
    emailVerified &&
    phoneVerified &&
    Boolean(signupMode);

  function validate() {
    const nextErrors: FieldErrors = {};

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Use at least 8 characters.";
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      nextErrors.password = "Use uppercase and lowercase letters.";
    } else if (!/\d/.test(password)) {
      nextErrors.password = "Use at least one number.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleContinue() {
    Keyboard.dismiss();

    if (!validate()) {
      return;
    }

    setOwnerPassword(password);
    router.push(routes.confirmSignup);
  }

  if (!canOpenPassword) {
    return (
      <MissingSetupState
        palette={palette}
        isDark={isDark}
        isTablet={isTablet}
      />
    );
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
              minHeight: compact ? 720 : 790,
              backgroundColor: palette.stage,
              borderColor: palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.backgroundBeamTop,
              { backgroundColor: palette.beamTop },
            ]}
          />
          <View
            style={[
              styles.backgroundBeamBottom,
              { backgroundColor: palette.beamBottom },
            ]}
          />
          <View style={[styles.gridLineOne, { backgroundColor: palette.grid }]} />
          <View style={[styles.gridLineTwo, { backgroundColor: palette.grid }]} />
          <View style={[styles.gridLineThree, { backgroundColor: palette.grid }]} />

          <View style={styles.header}>
            <Image
              source={isDark ? logo : logoDark}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.headerActions}>
              <ThemeToggle />

              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    borderColor: palette.borderStrong,
                    backgroundColor: isDark
                      ? "rgba(14, 165, 233, 0.10)"
                      : "rgba(2, 6, 23, 0.05)",
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={isDark ? "#D7F8FF" : "#06111F"}
                >
                  Back
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.titleBlock}>
              <View style={styles.kickerRow}>
                <View style={styles.kickerDot} />
                <AppText variant="caption" color={palette.cyanSoft}>
                  OWNER PASSWORD
                </AppText>
              </View>

              <AppText variant="display" color={palette.text}>
                Create the owner login password.
              </AppText>

              <AppText variant="muted" color={palette.muted}>
                This password protects the owner account that will control
                billing, staff access, store locations, reports, and business
                settings.
              </AppText>
            </View>

            <View
              style={[
                styles.progressStrip,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={palette.cyanSoft}>
                  STEP 4 OF 6
                </AppText>
                <AppText variant="label" color={palette.text}>
                  Secure owner account
                </AppText>
              </View>

              <View style={styles.progressBadge}>
                <AppText variant="caption" color="#06111F">
                  {signupMode === "PAID" ? "Paid path" : "Trial path"}
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.contextPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.contextRow}>
                <View style={styles.contextMark}>
                  <AppText variant="caption" color="#06111F">
                    S
                  </AppText>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>
                    {intent?.storeName}
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    {signupMode === "PAID"
                      ? selectedPlan?.name || "Paid access selected"
                      : "Free trial selected"}
                  </AppText>
                </View>
              </View>
            </View>

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
                label="Password"
                placeholder="Create a strong password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrors((current) => ({
                    ...current,
                    password: undefined,
                  }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.password}
              />

              <AppTextInput
                label="Confirm password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setErrors((current) => ({
                    ...current,
                    confirmPassword: undefined,
                  }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword}
              />

              <Pressable
                onPress={() => setShowPassword((current) => !current)}
                style={({ pressed }) => [
                  styles.showPasswordButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panelStrong,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.cyanSoft}>
                  {showPassword ? "Hide password" : "Show password"}
                </AppText>
              </Pressable>

              <View
                style={[
                  styles.strengthPanel,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panelStrong,
                  },
                ]}
              >
                <View style={styles.strengthHeader}>
                  <View>
                    <AppText variant="caption" color={palette.cyanSoft}>
                      PASSWORD STRENGTH
                    </AppText>
                    <AppText variant="label" color={palette.text}>
                      {passwordLabel}
                    </AppText>
                  </View>

                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4, 5].map((item) => (
                      <View
                        key={item}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              item <= passwordScore
                                ? "#67E8F9"
                                : "rgba(148, 163, 184, 0.22)",
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.requirements}>
                  {requirements.map((requirement) => (
                    <RequirementRow
                      key={requirement.label}
                      met={requirement.met}
                      label={requirement.label}
                      palette={palette}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View
              style={[
                styles.notePanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.noteMark}>
                <AppText variant="caption" color="#06111F">
                  !
                </AppText>
              </View>

              <AppText variant="caption" color={palette.soft}>
                The password is held only for this signup step and is submitted
                during final confirmation.
              </AppText>
            </View>

            <View style={styles.actions}>
              <AsyncButton
                fullWidth
                onPress={handleContinue}
                style={styles.primaryButton}
              >
                Continue to confirmation
              </AsyncButton>

              <AppButton
                fullWidth
                variant="secondary"
                onPress={() => router.replace(routes.choosePath)}
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
                Change access path
              </AppButton>
            </View>
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

  missingStage: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },

  backgroundBeamTop: {
    position: "absolute",
    top: -130,
    right: -90,
    width: 270,
    height: 270,
    transform: [{ rotate: "18deg" }],
  },

  backgroundBeamBottom: {
    position: "absolute",
    left: -120,
    bottom: 118,
    width: 240,
    height: 240,
    transform: [{ rotate: "-24deg" }],
  },

  gridLineOne: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 98,
    height: 1,
  },

  gridLineTwo: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 308,
    height: 1,
  },

  gridLineThree: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 82,
    width: 1,
  },

  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    zIndex: 2,
  },

  missingHeader: {
    minHeight: 42,
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

  backButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  content: {
    paddingTop: 40,
    gap: 22,
    zIndex: 2,
  },

  missingBody: {
    paddingTop: 24,
    gap: 16,
    zIndex: 2,
  },

  missingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  missingIconWrap: {
    width: 74,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },

  missingIconGlow: {
    position: "absolute",
    width: 74,
    height: 74,
    backgroundColor: "rgba(32, 200, 255, 0.14)",
    transform: [{ rotate: "10deg" }],
  },

  missingIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    shadowColor: "#20C8FF",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },

  missingIconImage: {
    width: 40,
    height: 40,
  },

  missingTitleWrap: {
    flex: 1,
    gap: 7,
  },

  missingSummary: {
    borderWidth: 1,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    padding: 13,
  },

  summaryIndex: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  summaryDivider: {
    height: 1,
  },

  titleBlock: {
    gap: 14,
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

  progressStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderWidth: 1,
    padding: 14,
  },

  progressBadge: {
    backgroundColor: "#67E8F9",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  contextPanel: {
    borderWidth: 1,
    padding: 14,
  },

  contextRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  contextMark: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  formPanel: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },

  showPasswordButton: {
    minHeight: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  strengthPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  strengthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  strengthBars: {
    flexDirection: "row",
    gap: 5,
  },

  strengthBar: {
    width: 18,
    height: 6,
  },

  requirements: {
    gap: 9,
  },

  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  requirementMark: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  notePanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  noteMark: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  actions: {
    gap: 12,
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
