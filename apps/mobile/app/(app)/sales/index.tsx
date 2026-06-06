import { Href, router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import { useCashDrawerStatus } from "../../../src/features/cashDrawer/hooks";
import { useDashboardSales } from "../../../src/features/sales/hooks";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type SalesAction = {
  title: string;
  helper: string;
  icon: IoniconName;
  href: string;
  tone: Tone;
  featured?: boolean;
};

function formatMoney(value: unknown, options: { compact?: boolean } = {}) {
  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;

  if (!options.compact) {
    return `${safe.toLocaleString()} RWF`;
  }

  const abs = Math.abs(safe);

  if (abs >= 1_000_000_000) {
    const next = safe / 1_000_000_000;
    return `${Number.isInteger(next) ? next.toFixed(0) : next.toFixed(1)}B RWF`;
  }

  if (abs >= 1_000_000) {
    const next = safe / 1_000_000;
    return `${Number.isInteger(next) ? next.toFixed(0) : next.toFixed(1)}M RWF`;
  }

  if (abs >= 100_000) {
    const next = safe / 1_000;
    return `${Number.isInteger(next) ? next.toFixed(0) : next.toFixed(1)}K RWF`;
  }

  return `${safe.toLocaleString()} RWF`;
}

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isLightPalette(palette: AppShellPalette) {
  const stage = String(palette.stage || "").toLowerCase();
  const panel = String(palette.panel || "").toLowerCase();

  return (
    stage.includes("fff") ||
    stage.includes("f8") ||
    stage.includes("f9") ||
    panel.includes("fff") ||
    panel.includes("f8") ||
    panel.includes("f9")
  );
}

function toneSpec(tone: Tone, palette: AppShellPalette) {
  const light = isLightPalette(palette);

  if (tone === "green") {
    return {
      fg: light ? "#047857" : "#34D399",
      bg: light ? "rgba(16, 185, 129, 0.10)" : "rgba(52, 211, 153, 0.14)",
      border: light ? "rgba(4, 120, 87, 0.22)" : "rgba(52, 211, 153, 0.30)",
      solid: light ? "#10B981" : "#34D399",
    };
  }

  if (tone === "amber") {
    return {
      fg: light ? "#B45309" : "#FBBF24",
      bg: light ? "rgba(245, 158, 11, 0.10)" : "rgba(251, 191, 36, 0.14)",
      border: light ? "rgba(180, 83, 9, 0.22)" : "rgba(251, 191, 36, 0.30)",
      solid: "#FBBF24",
    };
  }

  if (tone === "red") {
    return {
      fg: light ? "#BE123C" : "#FB7185",
      bg: light ? "rgba(225, 29, 72, 0.09)" : "rgba(251, 113, 133, 0.14)",
      border: light ? "rgba(190, 18, 60, 0.22)" : "rgba(251, 113, 133, 0.30)",
      solid: "#FB7185",
    };
  }

  if (tone === "blue") {
    return {
      fg: light ? "#2563EB" : "#60A5FA",
      bg: light ? "rgba(37, 99, 235, 0.09)" : "rgba(96, 165, 250, 0.14)",
      border: light ? "rgba(37, 99, 235, 0.22)" : "rgba(96, 165, 250, 0.30)",
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
    solid: palette.cyan,
  };
}

function getColumns(width: number, type: "actions" | "stats") {
  if (type === "actions") {
    if (width >= 980) return 4;
    if (width >= 680) return 2;
    return 1;
  }

  if (width >= 980) return 4;
  if (width >= 620) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 3) return "32%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function StatusPill({
  label,
  tone,
  palette,
}: {
  label: string;
  tone: Tone;
  palette: AppShellPalette;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.statusPill,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <AppText variant="caption" color={spec.fg} style={styles.statusPillText}>
        {label}
      </AppText>
    </View>
  );
}

function MoneyText({
  value,
  color,
  compact = false,
}: {
  value: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={compact ? 0.54 : 0.62}
      style={[
        styles.moneyText,
        {
          color,
          fontSize: compact ? 20 : 22,
          lineHeight: compact ? 25 : 28,
        },
      ]}
    >
      {value}
    </Text>
  );
}

function SectionSkeleton({
  palette,
  width,
}: {
  palette: AppShellPalette;
  width: number;
}) {
  const actionWidth = widthForColumns(getColumns(width, "actions"));
  const statWidth = widthForColumns(getColumns(width, "stats"));
  const compact = width < 560;

  return (
    <View style={styles.stack}>
      <View
        style={[
          styles.heroPanel,
          compact ? styles.heroPanelCompact : null,
          {
            borderColor: palette.borderStrong,
            backgroundColor: "rgba(32, 200, 255, 0.08)",
          },
        ]}
      >
        <View style={[styles.heroTop, compact ? styles.heroTopCompact : null]}>
          <Skeleton height={compact ? 46 : 56} width={compact ? 46 : 56} />

          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="42%" />
            <Skeleton height={26} width="76%" />
            <Skeleton height={14} width="62%" />
          </View>
        </View>

        <Skeleton height={compact ? 102 : 66} width="100%" />
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View
            key={`action-${item}`}
            style={[
              styles.actionCard,
              {
                width: actionWidth,
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={42} width={42} />

            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={16} width="52%" />
              <Skeleton height={13} width="78%" />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2].map((item) => (
          <View
            key={`status-${item}`}
            style={[
              styles.statusCard,
              {
                width: statWidth,
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={34} width={34} />
            <Skeleton height={13} width="58%" />
            <Skeleton height={22} width="70%" />
            <Skeleton height={13} width="82%" />
          </View>
        ))}
      </View>
    </View>
  );
}

function InlineLoading({
  palette,
  label = "Updating numbers...",
}: {
  palette: AppShellPalette;
  label?: string;
}) {
  return (
    <View
      style={[
        styles.inlineLoading,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.inlineLoadingDot}>
        <Skeleton height={12} width={12} />
      </View>

      <AppText variant="caption" color={palette.soft} style={styles.inlineLoadingText}>
        {label}
      </AppText>
    </View>
  );
}

function SalesActionCard({
  title,
  helper,
  icon,
  href,
  tone,
  palette,
  width,
  featured = false,
}: SalesAction & {
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <Pressable
      onPress={() => router.push(href as Href)}
      style={({ pressed }) => [
        styles.actionCard,
        {
          width,
          borderColor: featured ? spec.border : palette.border,
          backgroundColor: featured ? spec.bg : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.actionTop}>
        <View
          style={[
            styles.iconBox,
            {
              borderColor: spec.border,
              backgroundColor: featured ? spec.solid : spec.bg,
            },
          ]}
        >
          <Ionicons name={icon} size={21} color={featured ? "#06111F" : spec.fg} />
        </View>

        <View
          style={[
            styles.actionArrow,
            {
              borderColor: palette.border,
              backgroundColor: "rgba(148, 163, 184, 0.08)",
            },
          ]}
        >
          <Ionicons name="chevron-forward" size={15} color={palette.soft} />
        </View>
      </View>

      <View style={styles.actionBody}>
        <AppText variant="label" color={palette.text}>
          {title}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.actionHelper}>
          {helper}
        </AppText>
      </View>

      {featured ? <StatusPill label="Primary action" tone={tone} palette={palette} /> : null}
    </Pressable>
  );
}

function StatusCard({
  label,
  value,
  helper,
  icon,
  tone,
  palette,
  width,
  isMoney = false,
  compact = false,
}: {
  label: string;
  value: string;
  helper: string;
  icon: IoniconName;
  tone: Tone;
  palette: AppShellPalette;
  width: DimensionValue;
  isMoney?: boolean;
  compact?: boolean;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.statusCard,
        compact ? styles.statusCardCompact : null,
        {
          width,
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.statusTop}>
        <View
          style={[
            styles.statusIcon,
            compact ? styles.statusIconCompact : null,
            {
              borderColor: spec.border,
              backgroundColor: spec.bg,
            },
          ]}
        >
          <Ionicons name={icon} size={compact ? 16 : 18} color={spec.fg} />
        </View>

        <AppText variant="caption" color={palette.soft} style={styles.statusLabel}>
          {label}
        </AppText>
      </View>

      {isMoney ? (
        <MoneyText value={value} color={palette.text} compact={compact} />
      ) : (
        <AppText variant="subtitle" color={palette.text} style={styles.statusValueText}>
          {value}
        </AppText>
      )}

      <AppText variant="caption" color={palette.soft} style={styles.statusHelper}>
        {helper}
      </AppText>
    </View>
  );
}

function HeroMetric({
  label,
  value,
  tone,
  palette,
  isMoney = false,
  compact = false,
}: {
  label: string;
  value: string;
  tone: Tone;
  palette: AppShellPalette;
  isMoney?: boolean;
  compact?: boolean;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.heroMetric,
        compact ? styles.heroMetricCompact : null,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <AppText variant="caption" color={palette.soft} style={styles.heroMetricLabel}>
        {label}
      </AppText>

      {isMoney ? (
        <MoneyText value={value} color={spec.fg} compact={compact} />
      ) : (
        <AppText variant="label" color={spec.fg} style={styles.heroMetricValue}>
          {value}
        </AppText>
      )}
    </View>
  );
}

export default function SalesScreen() {
  const { width } = useWindowDimensions();
  const compactHero = width < 560;

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const salesSummaryQuery = useDashboardSales(activeBranch?.id);
  const cashDrawerQuery = useCashDrawerStatus();

  const isLoading =
    isHydrating ||
    !user ||
    !tenant ||
    salesSummaryQuery.isLoading ||
    cashDrawerQuery.isLoading;

  const todayTotal = salesSummaryQuery.data?.todayTotal ?? 0;
  const todayCount = salesSummaryQuery.data?.todayCount ?? 0;
  const drawerOpen = Boolean(cashDrawerQuery.data?.openSession?.id);

  const salesHelper =
    todayCount === 0
      ? "No sales recorded today"
      : `${todayCount} sale${todayCount === 1 ? "" : "s"} recorded today`;

  const drawerHelper = drawerOpen
    ? "Cash sales can continue"
    : "Open drawer before taking cash";

  const actionWidth = widthForColumns(getColumns(width, "actions"));
  const statWidth = widthForColumns(getColumns(width, "stats"));
  const compactSalesTotal = formatMoney(todayTotal, { compact: compactHero });
  const fullSalesTotal = formatMoney(todayTotal);

  const salesActions: SalesAction[] = [
    {
      title: "Open POS",
      helper: "Start a sale, add items, and create a receipt.",
      icon: "calculator-outline",
      href: routes.pos,
      tone: "cyan",
      featured: true,
    },
    {
      title: "Today’s sales",
      helper: "See recent sales without long scrolling.",
      icon: "cash-outline",
      href: routes.salesList,
      tone: "blue",
    },
    {
      title: "Pay-later sales",
      helper: "See customers who still owe money.",
      icon: "people-outline",
      href: routes.salesCredit,
      tone: "amber",
    },
    {
      title: "Cash drawer",
      helper: drawerOpen ? "Drawer is open." : "Open drawer before cash sales.",
      icon: "wallet-outline",
      href: routes.cashDrawer,
      tone: drawerOpen ? "green" : "amber",
    },
  ];

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <SectionSkeleton palette={palette} width={width} />
        ) : (
          <View style={styles.stack}>
            <View
              style={[
                styles.heroPanel,
                compactHero ? styles.heroPanelCompact : null,
                {
                  borderColor: palette.borderStrong,
                  backgroundColor: "rgba(32, 200, 255, 0.10)",
                },
              ]}
            >
              <View style={styles.heroGlow} />

              <View style={[styles.heroTop, compactHero ? styles.heroTopCompact : null]}>
                <View
                  style={[
                    styles.heroIcon,
                    compactHero ? styles.heroIconCompact : null,
                  ]}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={compactHero ? 20 : 23}
                    color="#06111F"
                  />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />

                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      SALES CONTROL
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Sell and serve customers.
                  </AppText>

                 
                </View>

                {!compactHero ? (
                  <StatusPill
                    label={drawerOpen ? "Drawer open" : "Drawer closed"}
                    tone={drawerOpen ? "green" : "amber"}
                    palette={palette}
                  />
                ) : null}
              </View>

              {compactHero ? (
                <View style={styles.compactStatusRow}>
                  <StatusPill
                    label={drawerOpen ? "Drawer open" : "Drawer closed"}
                    tone={drawerOpen ? "green" : "amber"}
                    palette={palette}
                  />
                </View>
              ) : null}

              <View style={[styles.heroMetrics, compactHero ? styles.heroMetricsCompact : null]}>
                <HeroMetric
                  label="Sales today"
                  value={compactSalesTotal}
                  tone="cyan"
                  palette={palette}
                  isMoney
                  compact={compactHero}
                />

                <HeroMetric
                  label="Sales count"
                  value={`${todayCount}`}
                  tone="blue"
                  palette={palette}
                  compact={compactHero}
                />

                <HeroMetric
                  label="Cash session"
                  value={drawerOpen ? "Open" : "Closed"}
                  tone={drawerOpen ? "green" : "amber"}
                  palette={palette}
                  compact={compactHero}
                />
              </View>
            </View>

            {(salesSummaryQuery.isFetching && !salesSummaryQuery.isLoading) ||
            (cashDrawerQuery.isFetching && !cashDrawerQuery.isLoading) ? (
              <InlineLoading palette={palette} />
            ) : null}

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                  SALES ACTIONS
                </AppText>

                <AppText variant="title" color={palette.text}>
                  Run customer sales
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.sectionSubtitle}>
                  Start a sale, review recent receipts, follow pay-later balances, or control the drawer.
                </AppText>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              {salesActions.map((action) => (
                <SalesActionCard
                  key={action.title}
                  {...action}
                  width={actionWidth}
                  palette={palette}
                />
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                  SALES STATUS
                </AppText>

                <AppText variant="title" color={palette.text}>
                  Today’s selling snapshot
                </AppText>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              <StatusCard
                label="SALES TODAY"
                value={compactHero ? compactSalesTotal : fullSalesTotal}
                helper={salesHelper}
                icon="cash-outline"
                tone="cyan"
                palette={palette}
                width={statWidth}
                isMoney
                compact={compactHero}
              />

              <StatusCard
                label="CASH SESSION"
                value={drawerOpen ? "Open" : "Closed"}
                helper={drawerHelper}
                icon="wallet-outline"
                tone={drawerOpen ? "green" : "amber"}
                palette={palette}
                width={statWidth}
                compact={compactHero}
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
                <Ionicons name="link-outline" size={15} color="#06111F" />
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label" color={palette.text}>
                  Built for daily selling
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.noteText}>
                  POS, receipts, customer records, balances, and cash control are connected here.
                </AppText>
              </View>
            </View>
          </View>
        )
      }
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },

  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  heroPanel: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },

  heroPanelCompact: {
    padding: 14,
    gap: 14,
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

  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  heroTopCompact: {
    alignItems: "flex-start",
    gap: 10,
  },

  heroIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  heroIconCompact: {
    width: 46,
    height: 46,
  },

  heroContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
    gap: 8,
  },

  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  heroDot: {
    width: 6,
    height: 6,
    backgroundColor: "#67E8F9",
  },

  heroTitle: {
    lineHeight: 24,
  },


  metaLabel: {
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  locationValue: {
    lineHeight: 18,
  },

  compactStatusRow: {
    alignItems: "flex-start",
  },

  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  heroMetricsCompact: {
    flexDirection: "column",
  },

  heroMetric: {
    minWidth: 118,
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },

  heroMetricCompact: {
    width: "100%",
    minWidth: 0,
  },

  heroMetricLabel: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  heroMetricValue: {
    lineHeight: 19,
  },

  moneyText: {
    width: "100%",
    maxWidth: "100%",
    fontWeight: "900",
    letterSpacing: -0.7,
    includeFontPadding: false,
  },

  statusPill: {
    flexShrink: 0,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusPillText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  inlineLoading: {
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  inlineLoadingDot: {
    width: 12,
    height: 12,
  },

  inlineLoadingText: {
    lineHeight: 18,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  sectionSubtitle: {
    lineHeight: 18,
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  actionCard: {
    minHeight: 154,
    borderWidth: 1,
    padding: 15,
    gap: 14,
  },

  actionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  actionArrow: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  actionBody: {
    flex: 1,
    gap: 6,
  },

  actionHelper: {
    lineHeight: 18,
  },

  statusCard: {
    minHeight: 132,
    borderWidth: 1,
    padding: 13,
    gap: 9,
  },

  statusCardCompact: {
    minHeight: 122,
  },

  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },

  statusIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  statusIconCompact: {
    width: 30,
    height: 30,
  },

  statusLabel: {
    flex: 1,
    minWidth: 0,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  statusValueText: {
    lineHeight: 25,
  },

  statusHelper: {
    lineHeight: 18,
  },

  notePanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  noteMark: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  noteText: {
    lineHeight: 18,
  },
});