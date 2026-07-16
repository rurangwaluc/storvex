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
import type {
  SignupPlan,
  SignupPlanSection,
} from "../../src/features/onboarding/types";
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
    cyan: "#20C8FF",
    cyanSoft: isDark ? "#67E8F9" : "#0369A1",
    panel: isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC",
    panelStrong: isDark ? "rgba(255, 255, 255, 0.10)" : "#FFFFFF",
    border: isDark
      ? "rgba(148, 163, 184, 0.16)"
      : "rgba(15, 23, 42, 0.12)",
    borderStrong: isDark
      ? "rgba(125, 211, 252, 0.32)"
      : "rgba(14, 165, 233, 0.34)",
    selected: isDark
      ? "rgba(32, 200, 255, 0.13)"
      : "rgba(14, 165, 233, 0.08)",
    success: isDark ? "#86EFAC" : "#15803D",
    danger: isDark ? "#FCA5A5" : "#B91C1C",
    beamTop: isDark
      ? "rgba(32, 200, 255, 0.18)"
      : "rgba(32, 200, 255, 0.10)",
    beamBottom: isDark
      ? "rgba(37, 99, 235, 0.18)"
      : "rgba(37, 99, 235, 0.08)",
  };
}

type Palette = ReturnType<typeof createPalette>;

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function planLevel(plan: SignupPlan) {
  const configured = cleanString(
    plan.entitlements?.planLevel,
  ).toUpperCase();

  if (configured) return configured;

  const key = cleanString(plan.key).toUpperCase();
  const tierKey = cleanString(plan.tierKey).toUpperCase();

  if (key.includes("STARTER") || tierKey.includes("STARTER")) {
    return "STARTER";
  }

  if (key.includes("GROWTH") || tierKey.includes("GROWTH")) {
    return "GROWTH";
  }

  if (key.includes("BUSINESS") || tierKey.includes("BUSINESS")) {
    return "BUSINESS";
  }

  if (key.includes("ENTERPRISE") || tierKey.includes("ENTERPRISE")) {
    return "ENTERPRISE";
  }

  return "OTHER";
}

function planRank(plan: SignupPlan) {
  const level = planLevel(plan);

  if (level === "STARTER") return 1;
  if (level === "GROWTH") return 2;
  if (level === "BUSINESS") return 3;
  if (level === "ENTERPRISE") return 4;

  return 99;
}

function planName(plan: SignupPlan) {
  return (
    cleanString(plan.label) ||
    cleanString(plan.name) ||
    cleanString(plan.tierLabel) ||
    "Storvex plan"
  );
}

function planDescription(plan: SignupPlan) {
  return (
    cleanString(plan.shortDescription) ||
    cleanString(plan.description) ||
    "Professional control for sales, stock, money and daily store work."
  );
}

function planAudience(plan: SignupPlan) {
  return (
    cleanString(plan.audience) ||
    "Retail businesses using Storvex"
  );
}

function planPrice(plan: SignupPlan) {
  return nullableNumber(plan.price ?? plan.priceAmount) ?? 0;
}

function formatMoney(plan: SignupPlan | null) {
  if (!plan) return "—";

  return `${Math.round(planPrice(plan)).toLocaleString()} ${
    cleanString(plan.currency) || "RWF"
  }`;
}

function capacityText(plan: SignupPlan) {
  const staffLimit = nullableNumber(plan.staffLimit);
  const branchLimit = nullableNumber(plan.branchLimit);

  const staff =
    staffLimit == null
      ? "Custom users"
      : `${staffLimit} active user${staffLimit === 1 ? "" : "s"}`;

  const branches =
    branchLimit == null
      ? "Custom locations"
      : `${branchLimit} store location${
          branchLimit === 1 ? "" : "s"
        }`;

  return `${staff} — ${branches}`;
}

function featureItems(plan: SignupPlan) {
  const sectionItems = Array.isArray(plan.sections)
    ? plan.sections.flatMap((section) =>
        Array.isArray(section.items) ? section.items : [],
      )
    : [];

  const direct = Array.isArray(plan.highlights)
    ? plan.highlights
    : Array.isArray(plan.features)
      ? plan.features
      : [];

  return [...sectionItems, ...direct]
    .map(cleanString)
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 5);
}

function normalizedPlans(plans: SignupPlan[]) {
  return plans
    .filter((plan) => plan && cleanString(plan.key))
    .filter(
      (plan) =>
        !plan.isEnterprise &&
        planLevel(plan) !== "ENTERPRISE",
    )
    .sort((left, right) => {
      const rankDifference = planRank(left) - planRank(right);

      if (rankDifference !== 0) return rankDifference;

      return planPrice(left) - planPrice(right);
    });
}

function recommendedPlan(plans: SignupPlan[]) {
  return (
    plans.find((plan) => plan.recommended) ||
    plans.find((plan) => planLevel(plan) === "GROWTH") ||
    plans[0] ||
    null
  );
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
              borderColor: palette.border,
              backgroundColor: palette.panel,
            },
          ]}
        >
          <View style={styles.skeletonHeader}>
            <View
              style={[
                styles.skeletonLine,
                { width: "38%" },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                { width: 74 },
              ]}
            />
          </View>

          <View
            style={[
              styles.skeletonLine,
              { width: "76%" },
            ]}
          />

          <View
            style={[
              styles.skeletonLine,
              { width: "58%" },
            ]}
          />
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
          <View style={styles.missingHeader}>
            <Image
              source={isDark ? logo : logoDark}
              style={styles.logo}
              resizeMode="contain"
            />

            <ThemeToggle />
          </View>

          <View style={styles.missingBody}>
            <View
              style={[
                styles.missingIcon,
                { borderColor: palette.border },
              ]}
            >
              <Image
                source={icon}
                style={styles.missingIconImage}
                resizeMode="contain"
              />
            </View>

            <AppText variant="title" color={palette.text}>
              Choose paid access first.
            </AppText>

            <AppText variant="muted" color={palette.muted}>
              Return to the access choice and select paid activation before
              choosing a Storvex plan.
            </AppText>

            <View style={styles.footerActions}>
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
                onPress={() =>
                  router.replace(routes.businessIntent)
                }
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panelStrong,
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

function FeatureLine({
  text,
  palette,
}: {
  text: string;
  palette: Palette;
}) {
  return (
    <View style={styles.featureLine}>
      <View style={styles.featureCheck}>
        <AppText variant="caption" color="#06111F">
          ✓
        </AppText>
      </View>

      <AppText
        variant="caption"
        color={palette.text}
        style={styles.featureText}
      >
        {text}
      </AppText>
    </View>
  );
}

function PlanCard({
  plan,
  selected,
  palette,
  onPress,
}: {
  plan: SignupPlan;
  selected: boolean;
  palette: Palette;
  onPress: () => void;
}) {
  const features = featureItems(plan);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${planName(plan)}, ${formatMoney(plan)} per month`}
      style={({ pressed }) => [
        styles.planCard,
        {
          borderColor: selected
            ? palette.cyan
            : palette.border,
          backgroundColor: selected
            ? palette.selected
            : palette.panel,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.planTop}>
        <View style={styles.planTitleWrap}>
          <AppText variant="caption" color={palette.cyanSoft}>
            {planAudience(plan)}
          </AppText>

          <AppText variant="subtitle" color={palette.text}>
            {planName(plan)}
          </AppText>
        </View>

        {plan.recommended ? (
          <View style={styles.recommendedBadge}>
            <AppText variant="caption" color="#06111F">
              RECOMMENDED
            </AppText>
          </View>
        ) : (
          <View
            style={[
              styles.selectionMark,
              {
                borderColor: selected
                  ? palette.cyan
                  : palette.borderStrong,
                backgroundColor: selected
                  ? palette.cyan
                  : "transparent",
              },
            ]}
          >
            <AppText
              variant="caption"
              color={selected ? "#06111F" : palette.soft}
            >
              {selected ? "✓" : ""}
            </AppText>
          </View>
        )}
      </View>

      <AppText variant="muted" color={palette.muted}>
        {planDescription(plan)}
      </AppText>

      <View style={styles.priceRow}>
        <AppText variant="title" color={palette.text}>
          {formatMoney(plan)}
        </AppText>

        <AppText variant="caption" color={palette.soft}>
          per month
        </AppText>
      </View>

      <View
        style={[
          styles.capacityStrip,
          {
            borderColor: palette.border,
            backgroundColor: palette.panelStrong,
          },
        ]}
      >
        <AppText variant="caption" color={palette.text}>
          {capacityText(plan)}
        </AppText>
      </View>

      {features.length ? (
        <View style={styles.featureList}>
          {features.map((feature) => (
            <FeatureLine
              key={feature}
              text={feature}
              palette={palette}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <AppText
          variant="label"
          color={selected ? palette.cyanSoft : palette.text}
        >
          {selected ? "Selected plan" : `Choose ${planName(plan)}`}
        </AppText>

        <View
          style={[
            styles.selectionMark,
            {
              borderColor: selected
                ? palette.cyan
                : palette.borderStrong,
              backgroundColor: selected
                ? palette.cyan
                : "transparent",
            },
          ]}
        >
          <AppText
            variant="caption"
            color={selected ? "#06111F" : palette.soft}
          >
            {selected ? "✓" : "→"}
          </AppText>
        </View>
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
  const signupMode = useOnboardingStore(
    (state) => state.signupMode,
  );
  const storedPlanKey = useOnboardingStore(
    (state) => state.selectedPlanKey,
  );
  const setSelectedPlan = useOnboardingStore(
    (state) => state.setSelectedPlan,
  );

  const plansQuery = useSignupPlans();

  const plans = useMemo(
    () => normalizedPlans(plansQuery.data?.plans || []),
    [plansQuery.data?.plans],
  );

  const [selectedPlanKey, setSelectedPlanKey] = useState<
    string | null
  >(storedPlanKey);

  const selectedPlan =
    plans.find((plan) => plan.key === selectedPlanKey) ||
    recommendedPlan(plans);

  const canChoosePlan =
    Boolean(intentId) &&
    Boolean(intent) &&
    signupMode === "PAID";

  useEffect(() => {
    if (!plans.length) return;

    setSelectedPlanKey((current) => {
      const currentExists = plans.some(
        (plan) => plan.key === current,
      );

      if (currentExists) return current;

      return recommendedPlan(plans)?.key || null;
    });
  }, [plans]);

  function continueToPayment() {
    if (!selectedPlan) return;

    setSelectedPlan(selectedPlan);
    router.push(routes.ownerPayment);
  }

  if (!canChoosePlan) {
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
            paddingHorizontal: isTablet ? 40 : 16,
            paddingTop: isTablet ? 30 : 16,
            paddingBottom: isTablet ? 30 : 22,
          },
        ]}
      >
        <View
          style={[
            styles.stage,
            {
              maxWidth: isTablet ? 680 : 480,
              minHeight: compact ? 680 : 760,
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
                    backgroundColor: palette.panel,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.text}>
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
                  PAID ACTIVATION
                </AppText>
              </View>

              <AppText variant="display" color={palette.text}>
                Choose the plan that fits your store.
              </AppText>

              <AppText variant="muted" color={palette.muted}>
                Prices, user capacity, locations and included business tools
                come directly from Storvex billing.
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
              <View style={styles.progressCopy}>
                <AppText variant="caption" color={palette.cyanSoft}>
                  STEP 4 OF 7
                </AppText>

                <AppText variant="label" color={palette.text}>
                  {intent?.storeName || "Business setup"}
                </AppText>
              </View>

              <View style={styles.progressBadge}>
                <AppText variant="caption" color="#06111F">
                  MARKETPLACE INCLUDED
                </AppText>
              </View>
            </View>

            {plansQuery.isLoading ? (
              <PlanSkeleton palette={palette} />
            ) : null}

            {plansQuery.isError ? (
              <View
                style={[
                  styles.errorPanel,
                  {
                    borderColor: palette.danger,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <AppText variant="label" color={palette.danger}>
                  Plans could not be loaded.
                </AppText>

                <AppText variant="caption" color={palette.muted}>
                  Check the connection and try again. No price is stored
                  inside the mobile app.
                </AppText>

                <AppButton
                  fullWidth
                  variant="secondary"
                  onPress={() => plansQuery.refetch()}
                  style={[
                    styles.secondaryButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.panelStrong,
                    },
                  ]}
                >
                  Retry loading plans
                </AppButton>
              </View>
            ) : null}

            {!plansQuery.isLoading &&
            !plansQuery.isError &&
            !plans.length ? (
              <View
                style={[
                  styles.errorPanel,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <AppText variant="label" color={palette.text}>
                  No paid plans are available.
                </AppText>

                <AppText variant="caption" color={palette.muted}>
                  Return to the access choice or contact Storvex support.
                </AppText>
              </View>
            ) : null}

            {plans.length ? (
              <View
                style={styles.planList}
                accessibilityRole="radiogroup"
              >
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.key}
                    plan={plan}
                    selected={selectedPlan?.key === plan.key}
                    palette={palette}
                    onPress={() => setSelectedPlanKey(plan.key)}
                  />
                ))}
              </View>
            ) : null}

            {selectedPlan ? (
              <View
                style={[
                  styles.selectedSummary,
                  {
                    borderColor: palette.borderStrong,
                    backgroundColor: palette.selected,
                  },
                ]}
              >
                <View style={styles.selectedSummaryCopy}>
                  <AppText variant="caption" color={palette.cyanSoft}>
                    SELECTED PLAN
                  </AppText>

                  <AppText variant="label" color={palette.text}>
                    {planName(selectedPlan)}
                  </AppText>

                  <AppText variant="caption" color={palette.muted}>
                    {capacityText(selectedPlan)}
                  </AppText>
                </View>

                <View style={styles.selectedPrice}>
                  <AppText variant="subtitle" color={palette.text}>
                    {formatMoney(selectedPlan)}
                  </AppText>

                  <AppText variant="caption" color={palette.soft}>
                    per month
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

              <View style={styles.noteCopy}>
                <AppText variant="label" color={palette.text}>
                  One clear monthly plan
                </AppText>

                <AppText variant="caption" color={palette.muted}>
                  Marketplace access is included. Storvex does not charge a
                  Marketplace sales commission at launch.
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
                    borderColor: palette.border,
                    backgroundColor: palette.panelStrong,
                  },
                ]}
              >
                Change access choice
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.26,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 10,
  },

  missingStage: {
    width: "100%",
    borderWidth: 1,
    padding: 20,
    gap: 24,
  },

  backgroundBeamTop: {
    position: "absolute",
    width: 260,
    height: 260,
    top: -150,
    right: -100,
    borderRadius: 130,
  },

  backgroundBeamBottom: {
    position: "absolute",
    width: 220,
    height: 220,
    bottom: -150,
    left: -100,
    borderRadius: 110,
  },

  header: {
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  missingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    width: 118,
    height: 30,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  backButton: {
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  content: {
    zIndex: 2,
    paddingTop: 34,
    gap: 18,
  },

  missingBody: {
    gap: 18,
  },

  missingIcon: {
    width: 62,
    height: 62,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  missingIconImage: {
    width: 42,
    height: 42,
  },

  titleBlock: {
    gap: 12,
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
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  progressCopy: {
    gap: 3,
  },

  progressBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#67E8F9",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  skeletonStack: {
    gap: 12,
  },

  skeletonCard: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },

  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  skeletonLine: {
    height: 12,
    backgroundColor: "rgba(148, 163, 184, 0.26)",
  },

  planList: {
    gap: 12,
  },

  planCard: {
    width: "100%",
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },

  planTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  planTitleWrap: {
    flex: 1,
    gap: 5,
  },

  recommendedBadge: {
    backgroundColor: "#67E8F9",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  selectionMark: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  priceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 8,
  },

  capacityStrip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  featureList: {
    gap: 8,
  },

  featureLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  featureCheck: {
    width: 20,
    height: 20,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  featureText: {
    flex: 1,
    lineHeight: 20,
  },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  selectedSummary: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  selectedSummaryCopy: {
    gap: 4,
  },

  selectedPrice: {
    alignItems: "flex-start",
    gap: 3,
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
    alignItems: "flex-start",
    gap: 12,
  },

  noteMark: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  noteCopy: {
    flex: 1,
    gap: 4,
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
