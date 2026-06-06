import { router } from "expo-router";
import { useMemo } from "react";
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
      ? "rgba(125, 211, 252, 0.22)"
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

function DecisionCard({
  step,
  title,
  description,
  helper,
  badge,
  onPress,
  palette,
  featured = false,
}: {
  step: string;
  title: string;
  description: string;
  helper: string;
  badge: string;
  onPress: () => void;
  palette: Palette;
  featured?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.decisionCard,
        {
          borderColor: featured ? "#20C8FF" : palette.border,
          backgroundColor: featured
            ? "rgba(32, 200, 255, 0.12)"
            : palette.panel,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.stepBox,
            {
              backgroundColor: featured ? "#67E8F9" : "transparent",
              borderColor: featured ? "#67E8F9" : palette.borderStrong,
            },
          ]}
        >
          <AppText
            variant="caption"
            color={featured ? "#06111F" : palette.cyanSoft}
          >
            {step}
          </AppText>
        </View>

        <View style={{ flex: 1, gap: 5 }}>
          <AppText variant="caption" color={palette.cyanSoft}>
            {badge}
          </AppText>

          <AppText variant="subtitle" color={palette.text}>
            {title}
          </AppText>
        </View>
      </View>

      <AppText variant="muted" color={palette.muted}>
        {description}
      </AppText>

      <View
        style={[
          styles.helperStrip,
          {
            borderColor: palette.border,
            backgroundColor: featured
              ? "rgba(32, 200, 255, 0.08)"
              : "rgba(148, 163, 184, 0.08)",
          },
        ]}
      >
        <AppText variant="caption" color={palette.soft}>
          {helper}
        </AppText>
      </View>

      <View style={styles.cardAction}>
        <AppText variant="label" color={palette.text}>
          Select this option
        </AppText>

        <View style={styles.arrowBox}>
          <AppText variant="label" color="#06111F">
            →
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

function MissingVerifiedState({
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
                    ACCESS CHOICE
                  </AppText>
                </View>

                <AppText variant="title" color={palette.text}>
                  Verify owner access first.
                </AppText>

                <AppText variant="caption" color={palette.soft}>
                  Choose trial or payment after email and phone OTP are done.
                </AppText>
              </View>
            </View>

            <View style={styles.actions}>
              <AppButton
                fullWidth
                onPress={() => router.replace(routes.verifyOtp)}
                style={styles.primaryButton}
              >
                Go to OTP verification
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

export default function ChoosePathScreen() {
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
  const setSignupPath = useOnboardingStore((state) => state.setSignupPath);

  const canChoosePath =
    Boolean(intentId) && Boolean(intent) && emailVerified && phoneVerified;

  function chooseTrial() {
    setSignupPath({
      mode: "TRIAL",
      plan: null,
    });

    router.push(routes.createPassword);
  }

  function choosePaid() {
    setSignupPath({
      mode: "PAID",
      plan: null,
    });

    router.push(routes.choosePlan);
  }

  if (!canChoosePath) {
    return (
      <MissingVerifiedState
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
              minHeight: compact ? 700 : 760,
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
                  CHOOSE ACCESS
                </AppText>
              </View>

              <AppText variant="display" color={palette.text}>
                How do you want to start?
              </AppText>

              <AppText variant="muted" color={palette.muted}>
                Choose one option. You can either test Storvex first or pay
                before the workspace is created.
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
                  STEP 3 OF 6
                </AppText>
                <AppText variant="label" color={palette.text}>
                  {intent?.storeName || "Business setup"}
                </AppText>
              </View>

              <View style={styles.progressBadge}>
                <AppText variant="caption" color="#06111F">
                  Owner verified
                </AppText>
              </View>
            </View>

            <View style={styles.choicePanel}>
              <DecisionCard
                step="1"
                badge="TEST FIRST"
                title="Start with free trial"
                description="Create the business workspace now and test Storvex before paying."
                helper="Best when the owner wants to try the system with real stock, staff, and daily work."
                onPress={chooseTrial}
                palette={palette}
                featured
              />

              <DecisionCard
                step="2"
                badge="PAY FIRST"
                title="Choose a paid plan"
                description="Choose team size, pay first, then create the business workspace."
                helper="Best when the owner is ready to start using Storvex seriously today."
                onPress={choosePaid}
                palette={palette}
              />
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
                  Nothing is created yet
                </AppText>
                <AppText variant="caption" color={palette.soft}>
                  The business, owner account, subscription, and main selling
                  location are created only after password and final
                  confirmation.
                </AppText>
              </View>
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
    bottom: 88,
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
    top: 304,
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
    paddingTop: 38,
    gap: 20,
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

  choicePanel: {
    gap: 14,
  },

  decisionCard: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  stepBox: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  helperStrip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  arrowBox: {
    width: 30,
    height: 30,
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
