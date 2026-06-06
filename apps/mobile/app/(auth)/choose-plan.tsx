import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { ThemeToggle } from "../../src/components/ui/ThemeToggle";
import { routes } from "../../src/constants/routes";
import { useSignupPlans } from "../../src/features/onboarding/hooks";
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
    cyanSoft: isDark ? "#67E8F9" : "#0369A1",
    panel: isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC",
    panelStrong: isDark ? "rgba(255, 255, 255, 0.10)" : "#FFFFFF",
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

type TeamOption = {
  tierKey: string;
  ownerLabel: string;
  helper: string;
  staffLimit: number;
  branchLimit: number;
  plans: SignupPlan[];
};

type PaymentOption = {
  cycleKey: string;
  label: string;
  helper: string;
  days: number;
  plan: SignupPlan;
};

function getPlanPrice(plan: SignupPlan) {
  const price = plan.priceAmount ?? plan.price ?? 0;
  return Number.isFinite(Number(price)) ? Number(price) : 0;
}

function formatMoney(plan: SignupPlan | null) {
  if (!plan) return "0 RWF";

  const price = getPlanPrice(plan);
  const currency = plan.currency || "RWF";

  return `${price.toLocaleString()} ${currency}`;
}

function getPlanDays(plan: SignupPlan) {
  return plan.days || plan.trialDays || 30;
}

function getCycleKey(plan: SignupPlan) {
  if (plan.cycleKey) return plan.cycleKey;

  const days = getPlanDays(plan);

  if (days >= 365) return "YEARLY";
  if (days >= 180) return "SIX_MONTHS";
  if (days >= 90) return "THREE_MONTHS";
  return "MONTHLY";
}

function getCycleLabel(plan: SignupPlan) {
  if (plan.cycleLabel) return plan.cycleLabel;

  const days = getPlanDays(plan);

  if (days >= 365) return "1 Year";
  if (days >= 180) return "6 Months";
  if (days >= 90) return "3 Months";
  return "Monthly";
}

function getCycleHelper(plan: SignupPlan) {
  const days = getPlanDays(plan);

  if (days >= 365) return "Best long-term value";
  if (days >= 180) return "Good for stable stores";
  if (days >= 90) return "Quarterly payment";
  return "Pay month by month";
}

function getCycleOrder(plan: SignupPlan) {
  const days = getPlanDays(plan);

  if (days >= 365) return 4;
  if (days >= 180) return 3;
  if (days >= 90) return 2;
  return 1;
}

function getTierKey(plan: SignupPlan) {
  if (plan.tierKey) return plan.tierKey;
  if (plan.key.includes(":")) return plan.key.split(":")[0];
  if (plan.key.includes("-")) return plan.key.split("-")[0];

  const staff = plan.staffLimit || 1;
  return `staff_${staff}`;
}

function getStaffLimit(plan: SignupPlan) {
  return plan.staffLimit || 1;
}

function getBranchLimit(plan: SignupPlan) {
  return plan.branchLimit || 1;
}

function getOwnerFriendlyTeamLabel(staffLimit: number) {
  if (staffLimit <= 1) return "Just me";
  if (staffLimit === 2) return "Owner + 1 staff";
  if (staffLimit === 3) return "Small team";
  if (staffLimit <= 5) return `Team of ${staffLimit}`;
  return `Large team`;
}

function getOwnerFriendlyTeamHelper(staffLimit: number, branchLimit: number) {
  if (staffLimit <= 1) {
    return "For an owner working alone.";
  }

  if (staffLimit === 2) {
    return "For owner plus one trusted staff member.";
  }

  return `${staffLimit} people — ${branchLimit} ${
    branchLimit === 1 ? "selling location" : "selling locations"
  }`;
}

function groupTeamOptions(plans: SignupPlan[]) {
  const selfServePlans = plans.filter((plan) => !plan.isEnterprise);
  const map = new Map<string, TeamOption>();

  for (const plan of selfServePlans) {
    const tierKey = getTierKey(plan);
    const staffLimit = getStaffLimit(plan);
    const branchLimit = getBranchLimit(plan);
    const existing = map.get(tierKey);

    if (existing) {
      existing.plans.push(plan);
      continue;
    }

    map.set(tierKey, {
      tierKey,
      ownerLabel: getOwnerFriendlyTeamLabel(staffLimit),
      helper: getOwnerFriendlyTeamHelper(staffLimit, branchLimit),
      staffLimit,
      branchLimit,
      plans: [plan],
    });
  }

  return Array.from(map.values())
    .map((team) => ({
      ...team,
      plans: team.plans.sort((a, b) => getCycleOrder(a) - getCycleOrder(b)),
    }))
    .sort((a, b) => a.staffLimit - b.staffLimit);
}

function getPaymentOptions(team: TeamOption | null): PaymentOption[] {
  if (!team) return [];

  return team.plans.map((plan) => ({
    cycleKey: getCycleKey(plan),
    label: getCycleLabel(plan),
    helper: getCycleHelper(plan),
    days: getPlanDays(plan),
    plan,
  }));
}

function getSelectedSummary(team: TeamOption | null, plan: SignupPlan | null) {
  if (!team || !plan) return "No plan selected yet.";

  return `${team.ownerLabel} — ${getCycleLabel(plan)} — ${team.staffLimit} ${
    team.staffLimit === 1 ? "person" : "people"
  }`;
}

function PlanSkeleton({ palette }: { palette: Palette }) {
  return (
    <View style={styles.skeletonStack}>
      {[1, 2, 3].map((item) => (
        <View
          key={item}
          style={[
            styles.skeletonCard,
            {
              backgroundColor: palette.panel,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={[styles.skeletonLine, { width: "42%" }]} />
          <View style={[styles.skeletonLine, { width: "76%" }]} />
          <View style={[styles.skeletonLine, { width: "58%" }]} />
        </View>
      ))}
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
                PAID PLAN
              </AppText>
              <AppText variant="title" color={palette.text}>
                Choose the access path first.
              </AppText>
              <AppText variant="muted" color={palette.muted}>
                Paid plan selection only opens after owner OTP verification and
                choosing “Pay first”.
              </AppText>
            </View>

            <AppButton
              fullWidth
              onPress={() => router.replace(routes.choosePath)}
              style={styles.primaryButton}
            >
              Go to choose path
            </AppButton>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

function TeamOptionCard({
  team,
  selected,
  palette,
  onPress,
}: {
  team: TeamOption;
  selected: boolean;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        {
          borderColor: selected ? "#20C8FF" : palette.border,
          backgroundColor: selected ? "rgba(32, 200, 255, 0.14)" : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {team.ownerLabel}
        </AppText>
        <AppText variant="caption" color={palette.soft}>
          {team.helper}
        </AppText>
      </View>

      <View
        style={[
          styles.checkBox,
          {
            backgroundColor: selected ? "#67E8F9" : "transparent",
            borderColor: selected ? "#67E8F9" : palette.borderStrong,
          },
        ]}
      >
        <AppText variant="caption" color={selected ? "#06111F" : palette.soft}>
          {selected ? "✓" : ""}
        </AppText>
      </View>
    </Pressable>
  );
}

function PaymentOptionCard({
  option,
  selected,
  palette,
  onPress,
}: {
  option: PaymentOption;
  selected: boolean;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.paymentCard,
        {
          borderColor: selected ? "#20C8FF" : palette.border,
          backgroundColor: selected ? "rgba(32, 200, 255, 0.14)" : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {option.label}
        </AppText>
        <AppText variant="caption" color={palette.soft}>
          {option.helper}
        </AppText>
      </View>

      <View style={styles.paymentPrice}>
        <AppText variant="label" color={palette.text}>
          {formatMoney(option.plan)}
        </AppText>
        <AppText variant="caption" color={palette.soft}>
          {option.days} days
        </AppText>
      </View>
    </Pressable>
  );
}

export default function ChoosePlanScreen() {
  const { resolvedMode } = useThemeMode();
  const { width, height } = useWindowDimensions();

  const isDark = resolvedMode === "dark";
  const palette = useMemo(() => createPalette(isDark), [isDark]);

  const isTablet = width >= 768;
  const compact = height < 760;

  const intent = useOnboardingStore((state) => state.intent);
  const intentId = useOnboardingStore((state) => state.intentId);
  const signupMode = useOnboardingStore((state) => state.signupMode);
  const setSelectedPlan = useOnboardingStore((state) => state.setSelectedPlan);

  const plansQuery = useSignupPlans();
  const plans = plansQuery.data?.plans || [];

  const teamOptions = useMemo(() => groupTeamOptions(plans), [plans]);

  const [selectedTierKey, setSelectedTierKey] = useState<string | null>(null);
  const [selectedCycleKey, setSelectedCycleKey] = useState<string | null>(null);

  const canChoosePlan =
    Boolean(intentId) && Boolean(intent) && signupMode === "PAID";

  const selectedTeam =
    teamOptions.find((team) => team.tierKey === selectedTierKey) ||
    teamOptions[0] ||
    null;

  const paymentOptions = useMemo(
    () => getPaymentOptions(selectedTeam),
    [selectedTeam],
  );

  const selectedPayment =
    paymentOptions.find((option) => option.cycleKey === selectedCycleKey) ||
    paymentOptions[0] ||
    null;

  const selectedPlan = selectedPayment?.plan || null;

  useEffect(() => {
    if (teamOptions.length === 0) return;

    setSelectedTierKey((current) => current || teamOptions[0].tierKey);
  }, [teamOptions]);

  useEffect(() => {
    if (paymentOptions.length === 0) return;

    const monthly =
      paymentOptions.find((option) => option.days <= 31) || paymentOptions[0];

    setSelectedCycleKey((current) => {
      const stillExists = paymentOptions.some(
        (option) => option.cycleKey === current,
      );

      return stillExists ? current : monthly.cycleKey;
    });
  }, [paymentOptions]);

  function chooseTeam(team: TeamOption) {
    setSelectedTierKey(team.tierKey);

    const monthly =
      team.plans.find((plan) => getPlanDays(plan) <= 31) || team.plans[0];

    setSelectedCycleKey(getCycleKey(monthly));
  }

  function continueToPayment() {
    if (!selectedPlan) return;

    setSelectedPlan(selectedPlan);
    router.push(routes.ownerPayment);
  }

  if (!canChoosePlan) {
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
              maxWidth: isTablet ? 660 : 460,
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
            <View style={styles.titleBlock}>
              <View style={styles.kickerRow}>
                <View style={styles.kickerDot} />
                <AppText variant="caption" color={palette.cyanSoft}>
                  PAID ACCESS
                </AppText>
              </View>

              <AppText variant="display" color={palette.text}>
                Choose who will use Storvex.
              </AppText>

              <AppText variant="muted" color={palette.muted}>
                Select the number of people first. Then choose how long the
                owner wants to pay for.
              </AppText>
            </View>

            <View
              style={[
                styles.summaryStrip,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={palette.cyanSoft}>
                  STEP 4 OF 7
                </AppText>
                <AppText variant="label" color={palette.text}>
                  {intent?.storeName}
                </AppText>
              </View>

              <View style={styles.summaryBadge}>
                <AppText variant="caption" color="#06111F">
                  Pay first
                </AppText>
              </View>
            </View>

            {plansQuery.isLoading ? (
              <PlanSkeleton palette={palette} />
            ) : plansQuery.isError ? (
              <View
                style={[
                  styles.errorPanel,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <AppText variant="subtitle" color={palette.text}>
                  Plans could not load.
                </AppText>
                <AppText variant="caption" color={palette.soft}>
                  Check your backend server and try again.
                </AppText>
                <AppButton
                  fullWidth
                  variant="secondary"
                  onPress={() => plansQuery.refetch()}
                  style={styles.secondaryButton}
                >
                  Retry loading plans
                </AppButton>
              </View>
            ) : (
              <>
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionNumber}>
                      <AppText variant="caption" color="#06111F">
                        1
                      </AppText>
                    </View>

                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" color={palette.text}>
                        How many people will use it?
                      </AppText>
                      <AppText variant="caption" color={palette.soft}>
                        This controls staff access.
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.teamGrid}>
                    {teamOptions.map((team) => (
                      <TeamOptionCard
                        key={team.tierKey}
                        team={team}
                        selected={selectedTeam?.tierKey === team.tierKey}
                        palette={palette}
                        onPress={() => chooseTeam(team)}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionNumber}>
                      <AppText variant="caption" color="#06111F">
                        2
                      </AppText>
                    </View>

                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle" color={palette.text}>
                        How long should the owner pay for?
                      </AppText>
                      <AppText variant="caption" color={palette.soft}>
                        This controls the subscription period.
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.paymentList}>
                    {paymentOptions.map((option) => (
                      <PaymentOptionCard
                        key={option.cycleKey}
                        option={option}
                        selected={selectedCycleKey === option.cycleKey}
                        palette={palette}
                        onPress={() => setSelectedCycleKey(option.cycleKey)}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}

            {selectedPlan ? (
              <View
                style={[
                  styles.selectedStrip,
                  {
                    borderColor: palette.borderStrong,
                    backgroundColor: "rgba(32, 200, 255, 0.11)",
                  },
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="caption" color={palette.cyanSoft}>
                    SELECTED
                  </AppText>
                  <AppText variant="label" color={palette.text}>
                    {getSelectedSummary(selectedTeam, selectedPlan)}
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    {selectedTeam?.branchLimit || 1}{" "}
                    {(selectedTeam?.branchLimit || 1) === 1
                      ? "selling location"
                      : "selling locations"}
                  </AppText>
                </View>

                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  <AppText variant="subtitle" color={palette.text}>
                    {formatMoney(selectedPlan)}
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    Total payment
                  </AppText>
                </View>
              </View>
            ) : null}

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
                  Keep it simple for the owner
                </AppText>
                <AppText variant="caption" color={palette.soft}>
                  People controls access. Payment period controls how long the
                  business can use Storvex.
                </AppText>
              </View>
            </View>

            <View style={styles.footerActions}>
              <AppButton
                fullWidth
                disabled={!selectedPlan || plansQuery.isLoading}
                onPress={continueToPayment}
                style={styles.primaryButton}
              >
                Continue to owner payment
              </AppButton>

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

  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderWidth: 1,
    padding: 14,
  },

  summaryBadge: {
    backgroundColor: "#67E8F9",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  skeletonStack: {
    gap: 12,
  },

  skeletonCard: {
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },

  skeletonLine: {
    height: 12,
    backgroundColor: "rgba(148, 163, 184, 0.28)",
  },

  sectionBlock: {
    gap: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sectionNumber: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  teamGrid: {
    gap: 10,
  },

  choiceCard: {
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  checkBox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentList: {
    gap: 10,
  },

  paymentCard: {
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  paymentPrice: {
    minWidth: 112,
    alignItems: "flex-end",
    gap: 3,
  },

  selectedStrip: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  errorPanel: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
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
