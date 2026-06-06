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
import { useCreateSignupPayment } from "../../src/features/onboarding/hooks";
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

function getPlanTitle(plan: SignupPlan | null) {
  if (!plan) return "Selected plan";
  return plan.label || plan.name || plan.key;
}

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

function getPlanSummary(plan: SignupPlan | null) {
  if (!plan) return "No plan selected";

  const staff = plan.staffLimit || 1;
  const branches = plan.branchLimit || 1;

  return `${staff} staff ${staff === 1 ? "member" : "members"} — ${branches} ${
    branches === 1 ? "location" : "locations"
  } — ${plan.days || 30} days`;
}

function normalizePhone(value: string) {
  return value.trim().replace(/[^\d]/g, "");
}

function isValidRwandaPhone(value: string) {
  const phone = normalizePhone(value);
  return /^07\d{8}$/.test(phone) || /^2507\d{8}$/.test(phone);
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
                OWNER PAYMENT
              </AppText>
              <AppText variant="title" color={palette.text}>
                Choose a paid plan first.
              </AppText>
              <AppText variant="muted" color={palette.muted}>
                Owner payment opens after selecting a paid plan for the
                business.
              </AppText>
            </View>

            <AppButton
              fullWidth
              onPress={() => router.replace(routes.choosePlan)}
              style={styles.primaryButton}
            >
              Go to choose plan
            </AppButton>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

export default function OwnerPaymentScreen() {
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
  const setPayment = useOnboardingStore((state) => state.setPayment);

  const paymentMutation = useCreateSignupPayment();

  const [phone, setPhone] = useState(intent?.phone || "");
  const [error, setError] = useState("");
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  const canPay =
    Boolean(intentId) &&
    Boolean(intent) &&
    signupMode === "PAID" &&
    Boolean(selectedPlanKey) &&
    Boolean(selectedPlan);

  async function submitPayment() {
    setError("");

    if (!intentId || !selectedPlanKey) {
      setError("Missing signup details. Please choose the plan again.");
      return;
    }

    if (!isValidRwandaPhone(phone)) {
      setError("Use a valid MoMo number: 07XXXXXXXX or 2507XXXXXXXX.");
      return;
    }

    try {
      const response = await paymentMutation.mutateAsync({
        intentId,
        planKey: selectedPlanKey,
        phone,
      });

      const reference =
        response.paymentReference ||
        response.reference ||
        response.paymentId ||
        "Payment request sent";

      setPaymentReference(reference);

      setPayment({
        paymentId: response.paymentId || null,
        reference,
        status: response.status || "PENDING",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Payment request failed. Please try again.";

      setError(message);
    }
  }

  function continueAfterPayment() {
    router.push(routes.createPassword);
  }

  if (!canPay) {
    return (
      <MissingState
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
              maxWidth: isTablet ? 640 : 460,
              minHeight: compact ? 740 : 820,
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
            <View style={styles.titleBlock}>
              <View style={styles.kickerRow}>
                <View style={styles.kickerDot} />
                <AppText variant="caption" color={palette.cyanSoft}>
                  OWNER PAYMENT
                </AppText>
              </View>

              <AppText variant="display" color={palette.text}>
                Send the owner payment request.
              </AppText>

              <AppText variant="muted" color={palette.muted}>
                The business workspace will only be created after payment,
                password, and final confirmation.
              </AppText>
            </View>

            <View
              style={[
                styles.planPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.planTop}>
                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="caption" color={palette.cyanSoft}>
                    SELECTED PLAN
                  </AppText>
                  <AppText variant="subtitle" color={palette.text}>
                    {getPlanTitle(selectedPlan)}
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    {getPlanSummary(selectedPlan)}
                  </AppText>
                </View>

                <View style={styles.priceBlock}>
                  <AppText variant="subtitle" color={palette.text}>
                    {formatMoney(selectedPlan)}
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    To pay
                  </AppText>
                </View>
              </View>

              <Pressable
                onPress={() => router.replace(routes.choosePlan)}
                style={({ pressed }) => [
                  styles.changePlanButton,
                  {
                    borderColor: palette.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.cyanSoft}>
                  Change plan
                </AppText>
              </Pressable>
            </View>

            <View
              style={[
                styles.paymentPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.methodRow}>
                <View style={styles.methodIcon}>
                  <AppText variant="label" color="#06111F">
                    Mo
                  </AppText>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>
                    MTN Mobile Money
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    Use the owner’s MoMo number for the payment request.
                  </AppText>
                </View>
              </View>

              <AppTextInput
                label="Owner MoMo number"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setError("");
                }}
                placeholder="07XXXXXXXX"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              {error ? (
                <View style={styles.errorBox}>
                  <AppText variant="caption" color={palette.danger}>
                    {error}
                  </AppText>
                </View>
              ) : null}

              {paymentReference ? (
                <View style={styles.successBox}>
                  <View style={styles.successMark}>
                    <AppText variant="caption" color="#06111F">
                      ✓
                    </AppText>
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="label" color={palette.text}>
                      Payment request sent
                    </AppText>
                    <AppText variant="caption" color={palette.soft}>
                      Reference: {paymentReference}
                    </AppText>
                  </View>
                </View>
              ) : null}
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
                  i
                </AppText>
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="label" color={palette.text}>
                  After payment, create the owner password
                </AppText>
                <AppText variant="caption" color={palette.soft}>
                  The final signup confirmation creates the business, owner,
                  subscription, and main selling location.
                </AppText>
              </View>
            </View>

            <View style={styles.footerActions}>
              {paymentReference ? (
                <AppButton
                  fullWidth
                  onPress={continueAfterPayment}
                  style={styles.primaryButton}
                >
                  Continue to create password
                </AppButton>
              ) : (
                <AsyncButton
                    fullWidth
                    disabled={paymentMutation.isPending}
                    onPress={submitPayment}
                    style={styles.primaryButton}
                    >
                    Send payment request
                </AsyncButton>
              )}

              <AppButton
                fullWidth
                variant="secondary"
                onPress={() => router.replace(routes.choosePlan)}
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
                Back to plans
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

  planPanel: {
    borderWidth: 1,
    padding: 15,
    gap: 14,
  },

  planTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  priceBlock: {
    alignItems: "flex-end",
    gap: 2,
  },

  changePlanButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  paymentPanel: {
    borderWidth: 1,
    padding: 15,
    gap: 14,
  },

  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  methodIcon: {
    width: 42,
    height: 42,
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

  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.22)",
  },

  successMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  notePanel: {
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