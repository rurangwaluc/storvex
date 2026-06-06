import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";

import { AppButton } from "../../src/components/ui/AppButton";
import { AppScreen } from "../../src/components/ui/AppScreen";
import { AppText } from "../../src/components/ui/AppText";
import { ThemeToggle } from "../../src/components/ui/ThemeToggle";
import { routes } from "../../src/constants/routes";
import { useThemeMode } from "../../src/lib/theme/useThemeMode";

const logo = require("../../assets/images/storvex_white.webp");
const logoDark = require("../../assets/images/storvex_dark.webp");
const icon = require("../../assets/images/storvex_icon.webp");

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "blue" | "slate";

type ControlCard = {
  label: string;
  value: string;
  helper: string;
  icon: IoniconName;
  tone: Tone;
  featured?: boolean;
};

type SetupStep = {
  label: string;
  detail: string;
  icon: IoniconName;
  tone: Tone;
};

const controlItems: ControlCard[] = [
  {
    label: "Sales",
    value: "POS ready",
    helper: "Create receipts fast.",
    icon: "receipt-outline",
    tone: "cyan",
    featured: true,
  },
  {
    label: "Stock",
    value: "Live count",
    helper: "Know what is available.",
    icon: "cube-outline",
    tone: "green",
  },
  {
    label: "Cash",
    value: "Controlled",
    helper: "Track money in and out.",
    icon: "wallet-outline",
    tone: "amber",
  },
];

const setupSteps: SetupStep[] = [
  {
    label: "Business profile",
    detail: "Name the business and choose what it sells.",
    icon: "storefront-outline",
    tone: "cyan",
  },
  {
    label: "Owner check",
    detail: "Confirm phone and email before access is created.",
    icon: "shield-checkmark-outline",
    tone: "green",
  },
  {
    label: "Access choice",
    detail: "Start with trial access or pay first.",
    icon: "key-outline",
    tone: "blue",
  },
  {
    label: "Workspace opens",
    detail: "Arrive with owner control and main location ready.",
    icon: "grid-outline",
    tone: "amber",
  },
];

function createPalette(isDark: boolean) {
  return {
    isDark,
    page: isDark ? "#06111F" : "#F4F7FB",
    stage: isDark ? "#06111F" : "#FFFFFF",
    heroBg: isDark ? "rgba(32, 200, 255, 0.10)" : "rgba(6, 182, 212, 0.08)",
    text: isDark ? "#FFFFFF" : "#06111F",
    muted: isDark ? "#AFC1D6" : "#4B5F74",
    soft: isDark ? "#9FB2C8" : "#64748B",
    cyan: isDark ? "#67E8F9" : "#0369A1",
    cyanStrong: isDark ? "#20C8FF" : "#06AFCF",
    panel: isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC",
    panelStrong: isDark ? "rgba(255, 255, 255, 0.10)" : "#FFFFFF",
    panelLifted: isDark ? "rgba(6, 17, 31, 0.92)" : "rgba(255, 255, 255, 0.94)",
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
    badgeBg: isDark ? "rgba(14, 165, 233, 0.10)" : "rgba(3, 105, 161, 0.08)",
    success: "#22C55E",
    buttonText: "#06111F",
    shadow: isDark ? "#000000" : "#0F172A",
  };
}

type Palette = ReturnType<typeof createPalette>;

function toneSpec(tone: Tone, palette: Palette) {
  if (tone === "green") {
    return {
      fg: palette.isDark ? "#34D399" : "#047857",
      bg: palette.isDark
        ? "rgba(52, 211, 153, 0.14)"
        : "rgba(16, 185, 129, 0.10)",
      border: palette.isDark
        ? "rgba(52, 211, 153, 0.30)"
        : "rgba(4, 120, 87, 0.22)",
      solid: palette.isDark ? "#34D399" : "#10B981",
    };
  }

  if (tone === "amber") {
    return {
      fg: palette.isDark ? "#FBBF24" : "#B45309",
      bg: palette.isDark
        ? "rgba(251, 191, 36, 0.14)"
        : "rgba(245, 158, 11, 0.10)",
      border: palette.isDark
        ? "rgba(251, 191, 36, 0.30)"
        : "rgba(180, 83, 9, 0.22)",
      solid: "#FBBF24",
    };
  }

  if (tone === "blue") {
    return {
      fg: palette.isDark ? "#60A5FA" : "#2563EB",
      bg: palette.isDark
        ? "rgba(96, 165, 250, 0.14)"
        : "rgba(37, 99, 235, 0.09)",
      border: palette.isDark
        ? "rgba(96, 165, 250, 0.30)"
        : "rgba(37, 99, 235, 0.22)",
      solid: "#60A5FA",
    };
  }

  if (tone === "slate") {
    return {
      fg: palette.soft,
      bg: "rgba(148, 163, 184, 0.10)",
      border: "rgba(148, 163, 184, 0.22)",
      solid: palette.soft,
    };
  }

  return {
    fg: palette.cyan,
    bg: "rgba(32, 200, 255, 0.12)",
    border: "rgba(32, 200, 255, 0.30)",
    solid: palette.cyanStrong,
  };
}

function getColumns(width: number) {
  if (width >= 640) return 3;
  if (width >= 500) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns === 3) return "31.9%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function stepWidthForViewport(width: number): DimensionValue {
  return width >= 370 ? "48.7%" as DimensionValue : "100%" as DimensionValue;
}

function StatusPill({
  label,
  tone,
  palette,
  tiny = false,
}: {
  label: string;
  tone: Tone;
  palette: Palette;
  tiny?: boolean;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.statusPill,
        tiny ? styles.statusPillTiny : null,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: spec.solid }]} />

      <AppText variant="caption" color={spec.fg} style={styles.statusPillText}>
        {label}
      </AppText>
    </View>
  );
}

function HeaderBadge({ palette }: { palette: Palette }) {
  return (
    <View
      style={[
        styles.headerBadge,
        {
          borderColor: palette.borderStrong,
          backgroundColor: palette.badgeBg,
        },
      ]}
    >
      <View style={[styles.headerBadgeDot, { backgroundColor: palette.success }]} />

      <AppText variant="caption" color={palette.cyan} numberOfLines={1}>
        Owner-first
      </AppText>
    </View>
  );
}

function ControlCard({
  item,
  palette,
  width,
  tiny,
}: {
  item: ControlCard;
  palette: Palette;
  width: DimensionValue;
  tiny: boolean;
}) {
  const spec = toneSpec(item.tone, palette);

  return (
    <View
      style={[
        styles.controlCard,
        tiny ? styles.controlCardTiny : null,
        {
          width,
          borderColor: item.featured ? spec.border : palette.border,
          backgroundColor: item.featured ? spec.bg : palette.panel,
        },
      ]}
    >
      <View style={styles.controlTop}>
        <View
          style={[
            styles.controlIcon,
            tiny ? styles.controlIconTiny : null,
            {
              borderColor: spec.border,
              backgroundColor: item.featured ? spec.solid : spec.bg,
            },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={tiny ? 17 : 19}
            color={item.featured ? "#06111F" : spec.fg}
          />
        </View>

        {item.featured && !tiny ? (
          <View
            style={[
              styles.smallTag,
              {
                borderColor: spec.border,
                backgroundColor: palette.isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.72)",
              },
            ]}
          >
            <AppText variant="caption" color={spec.fg} style={styles.smallTagText}>
              First action
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.controlBody}>
        <AppText variant="caption" color={spec.fg} style={styles.eyebrow}>
          {item.label}
        </AppText>

        <AppText variant="label" color={palette.text}>
          {item.value}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {item.helper}
        </AppText>
      </View>
    </View>
  );
}

function SetupStepCard({
  step,
  index,
  palette,
  tiny,
  width,
}: {
  step: SetupStep;
  index: number;
  palette: Palette;
  tiny: boolean;
  width: DimensionValue;
}) {
  const spec = toneSpec(step.tone, palette);

  return (
    <View
      style={[
        styles.stepCard,
        tiny ? styles.stepCardTiny : null,
        {
          width,
          borderColor: spec.border,
          backgroundColor: palette.panelLifted,
          shadowColor: palette.shadow,
        },
      ]}
    >
      <View style={styles.stepTopRow}>
        <View style={[styles.stepIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <Ionicons name={step.icon} size={tiny ? 16 : 18} color={spec.fg} />
        </View>

        <View style={[styles.stepNumber, { backgroundColor: spec.solid }]}> 
          <AppText variant="caption" color={step.tone === "amber" ? "#06111F" : palette.buttonText}>
            {index + 1}
          </AppText>
        </View>
      </View>

      <View style={styles.stepCardBody}>
        <AppText variant="label" color={palette.text} numberOfLines={2}>
          {step.label}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.stepCardText}>
          {step.detail}
        </AppText>
      </View>
    </View>
  );
}

function TrustPanel({ palette, tiny }: { palette: Palette; tiny: boolean }) {
  return (
    <View
      style={[
        styles.trustPanel,
        tiny ? styles.trustPanelTiny : null,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={[styles.trustIcon, { backgroundColor: palette.cyanStrong }]}> 
        <Ionicons name="shield-checkmark-outline" size={16} color="#06111F" />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          Built for owners who need control, not guesswork.
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          Staff only see the tools their work needs. Owners keep the full picture.
        </AppText>
      </View>
    </View>
  );
}

export default function LandingScreen() {
  const { resolvedMode } = useThemeMode();
  const { width, height } = useWindowDimensions();

  const isDark = resolvedMode === "dark";
  const palette = useMemo(() => createPalette(isDark), [isDark]);

  const viewportWidth = Math.min(width, 720);
  const isTablet = width >= 768;
  const compactHeight = height < 760;
  const tinyScreen = viewportWidth < 400;
  const smallScreen = viewportWidth < 560;
  const veryNarrow = viewportWidth < 360;
  const controlWidth = widthForColumns(getColumns(viewportWidth));
  const setupStepWidth = stepWidthForViewport(viewportWidth);

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
            backgroundColor: palette.page,
            paddingHorizontal: isTablet ? 40 : tinyScreen ? 10 : 16,
            paddingTop: isTablet ? 30 : tinyScreen ? 10 : 16,
            paddingBottom: isTablet ? 30 : tinyScreen ? 10 : 16,
          },
        ]}
      >
        <View
          style={[
            styles.stage,
            tinyScreen ? styles.stageTiny : null,
            {
              maxWidth: isTablet ? 660 : 448,
              minHeight: compactHeight ? 680 : 760,
              backgroundColor: palette.stage,
              borderColor: palette.border,
              shadowColor: palette.shadow,
              paddingHorizontal: veryNarrow ? 14 : tinyScreen ? 16 : 22,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[styles.backgroundBeamTop, { backgroundColor: palette.beamTop }]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.backgroundBeamBottom,
              { backgroundColor: palette.beamBottom },
            ]}
          />

          <View style={[styles.header, tinyScreen ? styles.headerTiny : null]}>
            <Image
              source={isDark ? logo : logoDark}
              style={[styles.logo, tinyScreen ? styles.logoTiny : null]}
              resizeMode="contain"
            />

            <View style={[styles.headerActions, tinyScreen ? styles.headerActionsTiny : null]}>
              <ThemeToggle />

              {!tinyScreen && !veryNarrow ? <HeaderBadge palette={palette} /> : null}
            </View>
          </View>

          <View
            style={[
              styles.heroPanel,
              smallScreen ? styles.heroPanelSmall : null,
              tinyScreen ? styles.heroPanelTiny : null,
              {
                borderColor: palette.borderStrong,
                backgroundColor: palette.heroBg,
              },
            ]}
          >
            <View style={styles.heroGlow} />

            <View style={styles.heroHeaderRow}>
              <View
                style={[
                  styles.productMarkWrap,
                  tinyScreen ? styles.productMarkWrapTiny : null,
                ]}
              >
                <View
                  style={[
                    styles.productMarkGlow,
                    tinyScreen ? styles.productMarkGlowTiny : null,
                  ]}
                />

                <View
                  style={[
                    styles.productMark,
                    tinyScreen ? styles.productMarkTiny : null,
                  ]}
                >
                  <Image
                    source={icon}
                    style={[styles.productIcon, tinyScreen ? styles.productIconTiny : null]}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={styles.heroHeaderText}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroDot} />

                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    Retail control room
                  </AppText>
                </View>

                <StatusPill
                  label="Ready for setup"
                  tone="green"
                  palette={palette}
                  tiny={tinyScreen}
                />
              </View>
            </View>

            <View style={styles.heroCopy}>
              <AppText
                variant="display"
                color={palette.text}
                style={[
                  styles.heroHeadline,
                  smallScreen ? styles.heroHeadlineSmall : null,
                  tinyScreen ? styles.heroHeadlineTiny : null,
                ]}
              >
                Stop guessing. Control sales, stock, and cash from your phone.
              </AppText>

              <AppText
                variant="muted"
                color={palette.muted}
                style={tinyScreen ? styles.heroSubtextTiny : null}
              >
                Storvex gives shop owners one clean mobile workspace to track sales,
                stock, cash, staff, documents, expenses, and business activity before
                small mistakes become expensive.
              </AppText>
            </View>
          </View>

          <View style={[styles.sectionHeader, tinyScreen ? styles.sectionHeaderTiny : null]}>
            <View style={{ flex: 1, gap: 3 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                What Storvex controls
              </AppText>

              <AppText
                variant="title"
                color={palette.text}
                style={tinyScreen ? styles.sectionTitleTiny : null}
              >
                Start with the work that leaks money
              </AppText>
            </View>
          </View>

          <View style={[styles.responsiveGrid, tinyScreen ? styles.responsiveGridTiny : null]}>
            {controlItems.map((item) => (
              <ControlCard
                key={item.label}
                item={item}
                palette={palette}
                width={controlWidth}
                tiny={tinyScreen}
              />
            ))}
          </View>

          <View
            style={[
              styles.setupPanel,
              compactHeight ? styles.setupPanelCompact : null,
              tinyScreen ? styles.setupPanelTiny : null,
              {
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <View style={styles.setupHeader}>
              <View style={styles.setupHeaderText}>
                <View style={styles.heroLabelRow}>
                  <View style={[styles.heroDot, { backgroundColor: palette.cyanStrong }]} />

                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    Owner setup
                  </AppText>
                </View>

                <AppText
                  variant="subtitle"
                  color={palette.text}
                  style={tinyScreen ? styles.setupTitleTiny : null}
                >
                  Setup without confusion.
                </AppText>
              </View>

              <View style={[styles.setupCount, { backgroundColor: palette.cyanStrong }]}> 
                <AppText variant="caption" color={palette.buttonText} numberOfLines={1}>
                  4 steps
                </AppText>
              </View>
            </View>

            <View style={styles.setupIntroRow}>
              <View style={[styles.setupRail, { backgroundColor: palette.cyanStrong }]} />

              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Each card is one clear decision. The owner arrives with access, a main
                selling location, and a workspace ready for daily work.
              </AppText>
            </View>

            <View style={[styles.stepGrid, tinyScreen ? styles.stepGridTiny : null]}>
              {setupSteps.map((step, index) => (
                <SetupStepCard
                  key={step.label}
                  step={step}
                  index={index}
                  palette={palette}
                  tiny={tinyScreen}
                  width={setupStepWidth}
                />
              ))}
            </View>
          </View>

          <View style={[styles.ctaPanel, tinyScreen ? styles.ctaPanelTiny : null]}>
            <AppButton
              fullWidth
              onPress={() => router.push(routes.businessIntent)}
              style={[
                styles.primaryButton,
                tinyScreen ? styles.primaryButtonTiny : null,
                {
                  backgroundColor: palette.cyanStrong,
                  borderColor: palette.cyanStrong,
                },
              ]}
            >
              Create my business
            </AppButton>

            <Pressable
              onPress={() => router.push(routes.login)}
              style={({ pressed }) => [
                styles.loginLink,
                tinyScreen ? styles.loginLinkTiny : null,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <AppText variant="label" color={palette.cyan} center>
                Login to existing workspace
              </AppText>
            </Pressable>

            <TrustPanel palette={palette} tiny={tinyScreen} />
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
    paddingTop: 20,
    paddingBottom: 20,
    shadowOpacity: 0.24,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },

  stageTiny: {
    paddingTop: 14,
    paddingBottom: 14,
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

  headerTiny: {
    minHeight: 38,
  },

  logo: {
    width: 126,
    height: 34,
  },

  logoTiny: {
    width: 104,
    height: 28,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },

  headerActionsTiny: {
    flexShrink: 1,
    maxWidth: 170,
  },

  headerBadge: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  headerBadgeDot: {
    width: 7,
    height: 7,
  },

  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  heroPanel: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    marginTop: 24,
    padding: 16,
    gap: 16,
    zIndex: 2,
  },

  heroPanelSmall: {
    marginTop: 20,
    padding: 14,
    gap: 14,
  },

  heroPanelTiny: {
    marginTop: 14,
    padding: 12,
    gap: 12,
  },

  heroGlow: {
    position: "absolute",
    right: -88,
    top: -88,
    width: 178,
    height: 178,
    backgroundColor: "rgba(32, 200, 255, 0.12)",
    transform: [{ rotate: "18deg" }],
  },

  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  productMarkWrap: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  productMarkWrapTiny: {
    width: 52,
    height: 52,
  },

  productMarkGlow: {
    position: "absolute",
    width: 62,
    height: 62,
    backgroundColor: "rgba(32, 200, 255, 0.14)",
    transform: [{ rotate: "10deg" }],
  },

  productMarkGlowTiny: {
    width: 52,
    height: 52,
  },

  productMark: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    shadowColor: "#20C8FF",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  productMarkTiny: {
    width: 42,
    height: 42,
  },

  productIcon: {
    width: 34,
    height: 34,
  },

  productIconTiny: {
    width: 29,
    height: 29,
  },

  heroHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 7,
    alignItems: "flex-start",
  },

  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },

  heroDot: {
    width: 7,
    height: 7,
    backgroundColor: "#22C55E",
  },

  heroCopy: {
    width: "100%",
    gap: 12,
  },

  heroHeadline: {
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: -0.7,
  },

  heroHeadlineSmall: {
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.6,
  },

  heroHeadlineTiny: {
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: -0.5,
  },

  heroSubtextTiny: {
    lineHeight: 21,
  },

  statusPill: {
    flexShrink: 1,
    maxWidth: "100%",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusPillTiny: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
  },

  statusPillText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  sectionHeader: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 2,
  },

  sectionHeaderTiny: {
    marginTop: 14,
  },

  sectionTitleTiny: {
    lineHeight: 25,
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    zIndex: 2,
  },

  responsiveGridTiny: {
    gap: 8,
    marginTop: 8,
  },

  controlCard: {
    minHeight: 118,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  controlCardTiny: {
    minHeight: 88,
    padding: 12,
    gap: 10,
  },

  controlTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  controlIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  controlIconTiny: {
    width: 34,
    height: 34,
  },

  smallTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  smallTagText: {
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  controlBody: {
    gap: 5,
  },

  setupPanel: {
    marginTop: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    zIndex: 2,
  },

  setupPanelCompact: {
    padding: 14,
    gap: 13,
  },

  setupPanelTiny: {
    marginTop: 14,
    padding: 12,
    gap: 12,
  },

  setupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  setupHeaderText: {
    flex: 1,
    gap: 5,
  },

  setupTitleTiny: {
    lineHeight: 24,
  },

  setupCount: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  setupIntroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  setupRail: {
    width: 3,
    minHeight: 42,
  },

  stepGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  stepGridTiny: {
    gap: 8,
  },

  stepCard: {
    minHeight: 132,
    borderWidth: 1,
    padding: 12,
    justifyContent: "space-between",
    gap: 12,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },

  stepCardTiny: {
    minHeight: 124,
    padding: 10,
    gap: 10,
  },

  stepTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  stepIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumber: {
    minWidth: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  stepCardBody: {
    gap: 5,
  },

  stepCardText: {
    lineHeight: 18,
  },

  ctaPanel: {
    marginTop: 16,
    gap: 13,
    zIndex: 2,
  },

  ctaPanelTiny: {
    marginTop: 14,
    gap: 10,
  },

  primaryButton: {
    minHeight: 60,
    borderRadius: 8,
  },

  primaryButtonTiny: {
    minHeight: 56,
  },

  loginLink: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  loginLinkTiny: {
    minHeight: 44,
  },

  trustPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  trustPanelTiny: {
    padding: 12,
    gap: 10,
  },

  trustIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  cardText: {
    lineHeight: 18,
  },
});
