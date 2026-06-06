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
import { AsyncButton } from "../../src/components/ui/AsyncButton";
import { ThemeToggle } from "../../src/components/ui/ThemeToggle";
import { routes } from "../../src/constants/routes";
import { useConfirmSignup } from "../../src/features/onboarding/hooks";
import type { SignupPlan } from "../../src/features/onboarding/types";
import { useThemeMode } from "../../src/lib/theme/useThemeMode";
import { useOnboardingStore } from "../../src/store/onboardingStore";

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
    success: isDark ? "#86EFAC" : "#15803D",
    cyanSoft: isDark ? "#67E8F9" : "#0369A1",
    panel: isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC",
    border: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.12)",
    borderStrong: isDark
      ? "rgba(125, 211, 252, 0.26)"
      : "rgba(14, 165, 233, 0.28)",
    beamTop: isDark
      ? "rgba(32, 200, 255, 0.18)"
      : "rgba(32, 200, 255, 0.10)",
    beamBottom: isDark
      ? "rgba(37, 99, 235, 0.18)"
      : "rgba(37, 99, 235, 0.10)",
    grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)",
  };
}

type Palette = ReturnType<typeof createPalette>;

function getPlanPrice(plan: SignupPlan | null) {
  if (!plan) return 0;
  const price = plan.priceAmount ?? plan.price ?? 0;
  return Number.isFinite(Number(price)) ? Number(price) : 0;
}

function formatMoney(plan: SignupPlan | null) {
  if (!plan) return "0 RWF";

  const price = getPlanPrice(plan);
  const currency = plan.currency || "RWF";

  return `${price.toLocaleString()} ${currency}`;
}

function getPlanDays(plan: SignupPlan | null) {
  if (!plan) return null;
  return plan.days || plan.trialDays || 30;
}

function getPlanLabel(plan: SignupPlan | null) {
  if (!plan) return "Selected paid plan";
  return plan.label || plan.name || plan.key;
}

function getCycleLabel(plan: SignupPlan | null) {
  if (!plan) return "Paid period";
  if (plan.cycleLabel) return plan.cycleLabel;

  const days = getPlanDays(plan) || 30;

  if (days >= 365) return "1 Year";
  if (days >= 180) return "6 Months";
  if (days >= 90) return "3 Months";
  return "Monthly";
}

function SummaryRow({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: Palette;
}) {
  return (
    <View style={styles.summaryRow}>
      <AppText variant="caption" color={palette.soft}>
        {label}
      </AppText>
      <AppText variant="label" color={palette.text}>
        {value}
      </AppText>
    </View>
  );
}

function MissingState({
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
      contentStyle={{ flexGrow: 1, backgroundColor: palette.page }}
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

          <View style={styles.header}>
            <Image
              source={isDark ? logo : logoDark}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemeToggle />
          </View>

          <View style={styles.missingBody}>
            <View style={styles.missingIcon}>
              <Image source={icon} style={styles.missingIconImage} />
            </View>

            <View style={{ gap: 8 }}>
              <AppText variant="caption" color={palette.cyanSoft}>
                FINAL SIGNUP
              </AppText>
              <AppText variant="title" color={palette.text}>
                Complete the previous steps first.
              </AppText>
              <AppText variant="muted" color={palette.muted}>
                Final confirmation needs verified owner details, access path,
                and owner password.
              </AppText>
            </View>

            <View style={styles.actions}>
              <AppButton
                fullWidth
                onPress={() => router.replace(routes.createPassword)}
                style={styles.primaryButton}
              >
                Go to create password
              </AppButton>

              <AppButton
                fullWidth
                variant="secondary"
                onPress={() => router.replace(routes.choosePath)}
                style={styles.secondaryButton}
              >
                Choose access path
              </AppButton>
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

export default function ConfirmSignupScreen() {
  const { resolvedMode } = useThemeMode();
  const { width, height } = useWindowDimensions();

  const isDark = resolvedMode === "dark";
  const palette = useMemo(() => createPalette(isDark), [isDark]);

  const isTablet = width >= 768;
  const compact = height < 760;

  const intent = useOnboardingStore((state) => state.intent);
  const intentId = useOnboardingStore((state) => state.intentId);
  const signupMode = useOnboardingStore((state) => state.signupMode);
  const selectedPlan = useOnboardingStore((state) => state.selectedPlan);
  const selectedPlanKey = useOnboardingStore((state) => state.selectedPlanKey);
  const payment = useOnboardingStore((state) => state.payment);
  const ownerPassword = useOnboardingStore((state) => state.ownerPassword);
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);

  const confirmMutation = useConfirmSignup();

  const [error, setError] = useState("");
  const [completedEmail, setCompletedEmail] = useState<string | null>(null);
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);

  const isPaid = signupMode === "PAID";
  const isTrial = signupMode === "TRIAL";

  const canConfirm =
    Boolean(intentId) &&
    Boolean(intent) &&
    Boolean(ownerPassword) &&
    (isTrial || (isPaid && Boolean(selectedPlanKey)));

  async function submitConfirmSignup() {
    setError("");

    if (!intentId || !ownerPassword || !signupMode) {
      setError("Missing signup details. Please go back and complete the setup.");
      return;
    }

    if (signupMode === "PAID" && !selectedPlanKey) {
      setError("Choose a paid plan before confirming signup.");
      return;
    }

    try {
      const response = await confirmMutation.mutateAsync({
        intentId,
        password: ownerPassword,
        mode: signupMode,
        planKey: signupMode === "PAID" ? selectedPlanKey : null,
        planDays: signupMode === "PAID" ? getPlanDays(selectedPlan) : null,
      });

      setCompletedEmail(response.ownerEmail || response.user?.email || intent?.email || null);
      setCompletedMessage(response.message || "Signup completed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Signup confirmation failed.";

      setError(message);
    }
  }

  function continueToLogin() {
    resetOnboarding();
    router.replace(routes.login);
  }

  if (!canConfirm && !completedMessage) {
    return (
      <MissingState palette={palette} isDark={isDark} isTablet={isTablet} />
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
              maxWidth: isTablet ? 640 : 460,
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
            {completedMessage ? (
              <>
                <View style={styles.successHero}>
                  <View style={styles.successIcon}>
                    <AppText variant="subtitle" color="#06111F">
                      ✓
                    </AppText>
                  </View>

                  <View style={{ flex: 1, gap: 8 }}>
                    <AppText variant="caption" color={palette.success}>
                      WORKSPACE CREATED
                    </AppText>

                    <AppText variant="display" color={palette.text}>
                      Storvex is ready for this business.
                    </AppText>

                    <AppText variant="muted" color={palette.muted}>
                      The owner account, subscription, and main selling location
                      have been created.
                    </AppText>
                  </View>
                </View>

                <View
                  style={[
                    styles.summaryPanel,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.panel,
                    },
                  ]}
                >
                  <SummaryRow
                    label="Business"
                    value={intent?.storeName || "Business"}
                    palette={palette}
                  />
                  <SummaryRow
                    label="Owner email"
                    value={completedEmail || intent?.email || "Owner email"}
                    palette={palette}
                  />
                  <SummaryRow
                    label="Result"
                    value={completedMessage}
                    palette={palette}
                  />
                </View>

                <AppButton
                  fullWidth
                  onPress={continueToLogin}
                  style={styles.primaryButton}
                >
                  Continue to login
                </AppButton>
              </>
            ) : (
              <>
                <View style={styles.titleBlock}>
                  <View style={styles.kickerRow}>
                    <View style={styles.kickerDot} />
                    <AppText variant="caption" color={palette.cyanSoft}>
                      FINAL CONFIRMATION
                    </AppText>
                  </View>

                  <AppText variant="display" color={palette.text}>
                    Create the business workspace.
                  </AppText>

                  <AppText variant="muted" color={palette.muted}>
                    Review the setup. This final step creates the business,
                    owner account, subscription, and main selling location.
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
                      {isPaid ? "STEP 7 OF 7" : "STEP 6 OF 6"}
                    </AppText>
                    <AppText variant="label" color={palette.text}>
                      Ready to create workspace
                    </AppText>
                  </View>

                  <View style={styles.progressBadge}>
                    <AppText variant="caption" color="#06111F">
                      {isPaid ? "Paid path" : "Trial"}
                    </AppText>
                  </View>
                </View>

                <View
                  style={[
                    styles.summaryPanel,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.panel,
                    },
                  ]}
                >
                  <SummaryRow
                    label="Business"
                    value={intent?.storeName || "Business"}
                    palette={palette}
                  />
                  <SummaryRow
                    label="Owner"
                    value={intent?.ownerName || "Owner"}
                    palette={palette}
                  />
                  <SummaryRow
                    label="Phone"
                    value={intent?.phone || "Owner phone"}
                    palette={palette}
                  />
                  <SummaryRow
                    label="Access"
                    value={isPaid ? "Paid plan" : "Free trial"}
                    palette={palette}
                  />

                  {isPaid ? (
                    <>
                      <SummaryRow
                        label="Plan"
                        value={`${getPlanLabel(selectedPlan)} — ${getCycleLabel(
                          selectedPlan,
                        )}`}
                        palette={palette}
                      />
                      <SummaryRow
                        label="Amount"
                        value={formatMoney(selectedPlan)}
                        palette={palette}
                      />
                      <SummaryRow
                        label="Payment reference"
                        value={payment?.reference || "Waiting for paid confirmation"}
                        palette={palette}
                      />
                    </>
                  ) : (
                    <SummaryRow
                      label="Trial access"
                      value="Trial will start after confirmation"
                      palette={palette}
                    />
                  )}
                </View>

                {isPaid ? (
                  <View
                    style={[
                      styles.warningPanel,
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
                        Paid signup requires completed payment
                      </AppText>
                      <AppText variant="caption" color={palette.soft}>
                        If MoMo has not marked the payment successful yet, the
                        backend will block workspace creation.
                      </AppText>
                    </View>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.errorBox}>
                    <AppText variant="caption" color={palette.danger}>
                      {error}
                    </AppText>
                  </View>
                ) : null}

                <View style={styles.footerActions}>
                  <AsyncButton
                    fullWidth
                    disabled={confirmMutation.isPending}
                    onPress={submitConfirmSignup}
                    style={styles.primaryButton}
                  >
                    Confirm and create workspace
                  </AsyncButton>

                  <AppButton
                    fullWidth
                    variant="secondary"
                    onPress={() => router.replace(routes.createPassword)}
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
                    Back to password
                  </AppButton>
                </View>
              </>
            )}
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
    top: 322,
    height: 1,
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

  backButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  content: {
    paddingTop: 40,
    gap: 18,
    zIndex: 2,
  },

  missingBody: {
    paddingTop: 34,
    gap: 18,
    zIndex: 2,
  },

  missingIcon: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  missingIconImage: {
    width: 42,
    height: 42,
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

  summaryPanel: {
    borderWidth: 1,
    padding: 15,
    gap: 12,
  },

  summaryRow: {
    gap: 4,
  },

  warningPanel: {
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

  errorBox: {
    padding: 12,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.22)",
  },

  successHero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  successIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  actions: {
    gap: 12,
  },

  footerActions: {
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
