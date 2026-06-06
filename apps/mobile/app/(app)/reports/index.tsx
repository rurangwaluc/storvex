import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import {
  formatReportDate,
  getReportNumbers,
  insightText,
  insightTitle,
  money,
  percentLabel,
  rangeFromPreset,
  reportRangeLabel,
  topSellerName,
  topSellerRevenue,
  topSellerUnits,
  useReportsHub,
} from "../../../src/features/reports/hooks";
import type { ReportRangePreset } from "../../../src/features/reports/types";
import { useBranchStore } from "../../../src/store/branchStore";

const PREVIEW_LIMIT = 4;

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";
type ReportTab = "OVERVIEW" | "PROFIT" | "CASH" | "ACTIONS";

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

function toneForAmount(value: number): Tone {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return "slate";
}

function getColumns(width: number) {
  if (width >= 720) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns === 2) return "48.6%" as DimensionValue;
  return "100%" as DimensionValue;
}

function StatusPill({ label, tone, palette }: { label: string; tone: Tone; palette: AppShellPalette }) {
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: spec.solid }]} />
      <AppText variant="caption" color={spec.fg} style={styles.statusText}>
        {label}
      </AppText>
    </View>
  );
}

function ReportsSkeleton({ palette, layoutWidth }: { palette: AppShellPalette; layoutWidth: number }) {
  const cardWidth = widthForColumns(getColumns(layoutWidth));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <View style={[styles.heroPanel, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.09)" }]}>
        <View style={styles.heroTop}>
          <Skeleton height={56} width={56} />
          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="44%" />
            <Skeleton height={26} width="70%" />
            <Skeleton height={14} width="86%" />
          </View>
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={[styles.metricCard, { width: cardWidth, borderColor: palette.border, backgroundColor: palette.panel }]}>
            <Skeleton height={12} width="45%" />
            <Skeleton height={26} width="66%" />
            <Skeleton height={12} width="80%" />
          </View>
        ))}
      </View>

      {[1, 2, 3].map((item) => (
        <Skeleton key={item} height={118} width="100%" />
      ))}
    </View>
  );
}

function PeriodPicker({
  value,
  onChange,
  palette,
}: {
  value: ReportRangePreset;
  onChange: (preset: ReportRangePreset) => void;
  palette: AppShellPalette;
}) {
  const options: Array<{ value: ReportRangePreset; label: string }> = [
    { value: "TODAY", label: "Today" },
    { value: "7D", label: "7 days" },
    { value: "30D", label: "30 days" },
    { value: "MONTH", label: "Month" },
  ];

  return (
    <View style={[styles.periodWrap, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      {options.map((option) => {
        const active = value === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.periodButton,
              {
                backgroundColor: active ? palette.cyan : "transparent",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <AppText variant="caption" color={active ? "#06111F" : palette.soft} style={styles.periodText}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabButton({
  active,
  label,
  icon,
  onPress,
  palette,
}: {
  active: boolean;
  label: string;
  icon: IoniconName;
  onPress: () => void;
  palette: AppShellPalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        {
          borderColor: active ? palette.borderStrong : palette.border,
          backgroundColor: active ? "rgba(32, 200, 255, 0.13)" : palette.panel,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? palette.cyan : palette.soft} />
      <AppText variant="caption" color={active ? palette.cyan : palette.soft} style={styles.tabText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone,
  palette,
  width,
}: {
  label: string;
  value: string;
  helper: string;
  icon: IoniconName;
  tone: Tone;
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.metricCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.metricTop}>
        <View style={[styles.metricIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
          <Ionicons name={icon} size={18} color={spec.fg} />
        </View>

        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          {label}
        </AppText>
      </View>

      <AppText variant="subtitle" color={palette.text} style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>

      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
        {helper}
      </AppText>
    </View>
  );
}

function ReportCard({
  title,
  helper,
  icon,
  tone,
  primary,
  palette,
  width,
}: {
  title: string;
  helper: string;
  icon: IoniconName;
  tone: Tone;
  primary?: boolean;
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.reportCard,
        {
          width,
          borderColor: primary ? spec.border : palette.border,
          backgroundColor: primary ? spec.bg : palette.panel,
        },
      ]}
    >
      <View style={styles.reportTop}>
        <View style={[styles.reportIcon, { borderColor: spec.border, backgroundColor: primary ? spec.solid : spec.bg }]}>
          <Ionicons name={icon} size={20} color={primary ? "#06111F" : spec.fg} />
        </View>

        <StatusPill label="Ready" tone={tone} palette={palette} />
      </View>

      <AppText variant="label" color={palette.text}>
        {title}
      </AppText>

      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
        {helper}
      </AppText>
    </View>
  );
}

function SectionHeader({
  eyebrow,
  title,
  helper,
  palette,
}: {
  eyebrow: string;
  title: string;
  helper?: string;
  palette: AppShellPalette;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
        {eyebrow}
      </AppText>
      <AppText variant="subtitle" color={palette.text}>
        {title}
      </AppText>
      {helper ? (
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

function ActionCard({
  title,
  text,
  tone,
  icon,
  palette,
}: {
  title: string;
  text: string;
  tone: Tone;
  icon: IoniconName;
  palette: AppShellPalette;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.actionCard, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={[styles.actionIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
        <Ionicons name={icon} size={17} color={spec.fg} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <AppText variant="label" color={palette.text}>
          {title}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {text}
        </AppText>
      </View>

      <StatusPill label={tone === "green" ? "Good" : tone === "red" ? "Urgent" : "Review"} tone={tone} palette={palette} />
    </View>
  );
}

function SellerRow({
  name,
  units,
  revenue,
  maxRevenue,
  index,
  palette,
}: {
  name: string;
  units: number;
  revenue: number;
  maxRevenue: number;
  index: number;
  palette: AppShellPalette;
}) {
  const pct = maxRevenue > 0 ? Math.max(8, Math.min(100, (revenue / maxRevenue) * 100)) : 8;

  return (
    <View style={[styles.sellerRow, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={[styles.sellerRank, { backgroundColor: index === 0 ? palette.cyan : "rgba(148, 163, 184, 0.16)" }]}>
        <AppText variant="caption" color={index === 0 ? "#06111F" : palette.soft} style={styles.rankText}>
          {index + 1}
        </AppText>
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
        <View style={styles.sellerTopLine}>
          <AppText variant="label" color={palette.text} numberOfLines={1} style={{ flex: 1 }}>
            {name}
          </AppText>
          <AppText variant="caption" color={palette.cyan}>
            {money(revenue)}
          </AppText>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: "rgba(148, 163, 184, 0.14)" }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: palette.cyan }]} />
        </View>

        <AppText variant="caption" color={palette.soft}>
          {units.toLocaleString()} unit{units === 1 ? "" : "s"} sold
        </AppText>
      </View>
    </View>
  );
}

function EmptyPanel({ title, text, palette }: { title: string; text: string; palette: AppShellPalette }) {
  return (
    <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <Ionicons name="bar-chart-outline" size={24} color={palette.soft} />
      <AppText variant="label" color={palette.text} center>
        {title}
      </AppText>
      <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
        {text}
      </AppText>
    </View>
  );
}

export default function ReportsScreen() {
  const { width } = useWindowDimensions();
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const [preset, setPreset] = useState<ReportRangePreset>("MONTH");
  const [tab, setTab] = useState<ReportTab>("OVERVIEW");

  const layoutWidth = Math.min(width, 760);
  const compact = layoutWidth < 560;
  const cardWidth = widthForColumns(getColumns(layoutWidth));

  const range = useMemo(() => rangeFromPreset(preset, activeBranchId), [preset, activeBranchId]);
  const reportsQuery = useReportsHub(range);

  return (
    <AppShell>
      {(palette) => {
        if (reportsQuery.isLoading) {
          return <ReportsSkeleton palette={palette} layoutWidth={layoutWidth} />;
        }

        const hub = reportsQuery.data || null;
        const numbers = getReportNumbers(hub);
        const comparisonPercent = hub?.insights?.comparison?.percent || {};
        const profitTrend = comparisonPercent.profit;
        const revenueTrend = comparisonPercent.revenue;
        const reorderItems = Array.isArray(hub?.insights?.reorderSuggestions?.items)
          ? hub.insights.reorderSuggestions.items.slice(0, PREVIEW_LIMIT)
          : [];
        const collectionItems = Array.isArray(hub?.insights?.collections?.items)
          ? hub.insights.collections.items.slice(0, PREVIEW_LIMIT)
          : [];
        const topSellers = Array.isArray(hub?.financial?.topSellers)
          ? hub.financial.topSellers.slice(0, PREVIEW_LIMIT)
          : Array.isArray(hub?.dashboard?.topSellers)
            ? hub.dashboard.topSellers.slice(0, PREVIEW_LIMIT)
            : [];
        const maxSellerRevenue = Math.max(...topSellers.map((item) => topSellerRevenue(item)), 0);
        const hasAnyData = Boolean(hub?.dashboard || hub?.financial || hub?.cashFlow || hub?.incomeStatement);

        return (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <View
              style={[
                styles.heroPanel,
                compact ? styles.heroPanelCompact : null,
                {
                  borderColor: palette.borderStrong,
                  backgroundColor: "rgba(32, 200, 255, 0.10)",
                },
              ]}
            >
              <View style={styles.heroGlow} />

              <View style={styles.heroTop}>
                <View style={[styles.heroIcon, compact ? styles.heroIconCompact : null]}>
                  <Ionicons name="bar-chart-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      Reports
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Owner command center.
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Money, profit, cash movement, stock pressure, and customer follow-up for {activeBranch?.name || "the current selling location"}.
                  </AppText>
                </View>

                {!compact ? <StatusPill label="Live" tone="green" palette={palette} /> : null}
              </View>

              <View style={styles.heroControls}>
                <View style={{ flex: 1, minWidth: compact ? "100%" : 260 }}>
                  <PeriodPicker value={preset} onChange={setPreset} palette={palette} />
                </View>

                <AsyncButton
                  variant="secondary"
                  onPress={async () => {
                    await reportsQuery.refetch();
                  }}
                  style={styles.refreshButton}
                >
                  Refresh
                </AsyncButton>
              </View>

              <View style={styles.compactStatusRow}>
                <StatusPill label={reportRangeLabel(range)} tone="cyan" palette={palette} />
                {reportsQuery.isFetching ? <StatusPill label="Updating" tone="amber" palette={palette} /> : null}
              </View>
            </View>

            {reportsQuery.isError ? (
              <View style={[styles.noticePanel, { borderColor: toneSpec("red", palette).border, backgroundColor: toneSpec("red", palette).bg }]}>
                <Ionicons name="warning-outline" size={18} color={toneSpec("red", palette).fg} />
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="label" color={palette.text}>
                    Reports did not load
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Check the connection, then refresh. Storvex will keep the screen stable while the report reloads.
                  </AppText>
                </View>
              </View>
            ) : null}

            <View style={styles.responsiveGrid}>
              <MetricCard
                label="Revenue"
                value={money(numbers.revenue)}
                helper={`${numbers.salesCount.toLocaleString()} sale record${numbers.salesCount === 1 ? "" : "s"}`}
                icon="trending-up-outline"
                tone="green"
                palette={palette}
                width={cardWidth}
              />

              <MetricCard
                label="Expenses"
                value={money(numbers.expenses)}
                helper={`${numbers.approvedExpenses.toLocaleString()} approved expense${numbers.approvedExpenses === 1 ? "" : "s"}`}
                icon="wallet-outline"
                tone={numbers.expenses > 0 ? "amber" : "green"}
                palette={palette}
                width={cardWidth}
              />

              <MetricCard
                label="Profit estimate"
                value={money(numbers.profit)}
                helper={`Trend: ${percentLabel(profitTrend)}`}
                icon="stats-chart-outline"
                tone={toneForAmount(numbers.profit)}
                palette={palette}
                width={cardWidth}
              />

              <MetricCard
                label="Cash flow"
                value={money(numbers.netCashFlow)}
                helper="Money in minus money out"
                icon="cash-outline"
                tone={toneForAmount(numbers.netCashFlow)}
                palette={palette}
                width={cardWidth}
              />
            </View>

            <View style={styles.tabGrid}>
              <TabButton active={tab === "OVERVIEW"} label="Overview" icon="grid-outline" onPress={() => setTab("OVERVIEW")} palette={palette} />
              <TabButton active={tab === "PROFIT"} label="Profit" icon="trophy-outline" onPress={() => setTab("PROFIT")} palette={palette} />
              <TabButton active={tab === "CASH"} label="Cash" icon="cash-outline" onPress={() => setTab("CASH")} palette={palette} />
              <TabButton active={tab === "ACTIONS"} label="Actions" icon="alert-circle-outline" onPress={() => setTab("ACTIONS")} palette={palette} />
            </View>

            {tab === "OVERVIEW" ? (
              <>
                <View style={styles.responsiveGrid}>
                  <ReportCard
                    title="Cash flow"
                    helper="Money in, money out, payment split, and cash movement control."
                    icon="cash-outline"
                    tone="green"
                    primary
                    palette={palette}
                    width={cardWidth}
                  />
                  <ReportCard
                    title="Income statement"
                    helper="Sales, expenses, profit estimate, and margin for the selected period."
                    icon="analytics-outline"
                    tone="blue"
                    palette={palette}
                    width={cardWidth}
                  />
                  <ReportCard
                    title="Daily close"
                    helper="Today’s close view for sales, expenses, repairs, and owner checks."
                    icon="calendar-outline"
                    tone="amber"
                    palette={palette}
                    width={cardWidth}
                  />
                  <ReportCard
                    title="Profit table"
                    helper="Plain owner view of what is bringing money into the store."
                    icon="podium-outline"
                    tone="cyan"
                    palette={palette}
                    width={cardWidth}
                  />
                </View>

                {!hasAnyData ? (
                  <EmptyPanel
                    title="No report data yet"
                    text="Once sales, expenses, repairs, or stock activity are recorded, this screen becomes the owner command center."
                    palette={palette}
                  />
                ) : null}
              </>
            ) : null}

            {tab === "PROFIT" ? (
              <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <SectionHeader
                  eyebrow="Profit control"
                  title="What the selected period is saying"
                  helper="This is the simplest owner view: revenue minus approved expenses."
                  palette={palette}
                />

                <View style={styles.responsiveGrid}>
                  <MetricCard label="Revenue" value={money(numbers.revenue)} helper="Money generated from sales" icon="receipt-outline" tone="green" palette={palette} width={cardWidth} />
                  <MetricCard label="Approved expenses" value={money(numbers.expenses)} helper="Spending counted in profit" icon="wallet-outline" tone="amber" palette={palette} width={cardWidth} />
                  <MetricCard label="Profit estimate" value={money(numbers.profit)} helper={numbers.profit > 0 ? "The period is profitable" : numbers.profit < 0 ? "Expenses are above revenue" : "Revenue and expenses are balanced"} icon="trophy-outline" tone={toneForAmount(numbers.profit)} palette={palette} width={cardWidth} />
                  <MetricCard label="Revenue trend" value={percentLabel(revenueTrend)} helper="Compared to the previous period" icon="pulse-outline" tone={Number(revenueTrend || 0) >= 0 ? "green" : "amber"} palette={palette} width={cardWidth} />
                </View>
              </View>
            ) : null}

            {tab === "CASH" ? (
              <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <SectionHeader
                  eyebrow="Cash movement"
                  title="Money control for this period"
                  helper="Use this to understand what came in, what went out, and whether cash stayed healthy."
                  palette={palette}
                />

                <View style={styles.responsiveGrid}>
                  <MetricCard label="Money in" value={money(hub?.cashFlow?.summary?.moneyIn ?? numbers.revenue)} helper="Sales and received payments" icon="arrow-down-circle-outline" tone="green" palette={palette} width={cardWidth} />
                  <MetricCard label="Money out" value={money(hub?.cashFlow?.summary?.moneyOut ?? numbers.expenses)} helper="Expenses and cash leaving" icon="arrow-up-circle-outline" tone="amber" palette={palette} width={cardWidth} />
                  <MetricCard label="Net cash flow" value={money(numbers.netCashFlow)} helper="Money in minus money out" icon="swap-vertical-outline" tone={toneForAmount(numbers.netCashFlow)} palette={palette} width={cardWidth} />
                  <MetricCard label="Daily close" value={formatReportDate(hub?.dailyClose?.date || range.to)} helper="Latest close period loaded" icon="calendar-number-outline" tone="blue" palette={palette} width={cardWidth} />
                </View>
              </View>
            ) : null}

            {tab === "ACTIONS" ? (
              <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
                <SectionHeader
                  eyebrow="Owner actions"
                  title="What needs attention"
                  helper="Reports should tell the owner where to act, not just display numbers."
                  palette={palette}
                />

                <View style={styles.stackSmall}>
                  <ActionCard
                    title="Revenue trend"
                    text={`Revenue change compared to the previous period: ${percentLabel(revenueTrend)}.`}
                    tone={Number(revenueTrend || 0) >= 0 ? "green" : "amber"}
                    icon="pulse-outline"
                    palette={palette}
                  />

                  <ActionCard
                    title="Reorder pressure"
                    text={`${reorderItems.length} product${reorderItems.length === 1 ? "" : "s"} need stock review based on current report signals.`}
                    tone={reorderItems.length ? "amber" : "green"}
                    icon="cube-outline"
                    palette={palette}
                  />

                  <ActionCard
                    title="Customer collections"
                    text={`${collectionItems.length} customer${collectionItems.length === 1 ? "" : "s"} need payment follow-up.`}
                    tone={collectionItems.length ? "red" : "green"}
                    icon="people-outline"
                    palette={palette}
                  />

                  <ActionCard
                    title="Repair workload"
                    text={`${numbers.openRepairs.toLocaleString()} open repair${numbers.openRepairs === 1 ? "" : "s"}; ${numbers.completedRepairs.toLocaleString()} completed.`}
                    tone={numbers.openRepairs > 0 ? "amber" : "green"}
                    icon="construct-outline"
                    palette={palette}
                  />
                </View>
              </View>
            ) : null}

            <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <SectionHeader
                eyebrow="Top sellers"
                title="Products bringing money in"
                helper="Showing the first four to keep the mobile layout clean."
                palette={palette}
              />

              {topSellers.length > 0 ? (
                <View style={styles.stackSmall}>
                  {topSellers.map((item, index) => (
                    <SellerRow
                      key={String(item.id || item.productId || `${topSellerName(item)}-${index}`)}
                      name={topSellerName(item)}
                      units={topSellerUnits(item)}
                      revenue={topSellerRevenue(item)}
                      maxRevenue={maxSellerRevenue}
                      index={index}
                      palette={palette}
                    />
                  ))}
                </View>
              ) : (
                <EmptyPanel
                  title="No top sellers yet"
                  text="Top products will appear here after sales are recorded in this period."
                  palette={palette}
                />
              )}
            </View>

            <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}>
              <SectionHeader
                eyebrow="Follow-up"
                title="Stock and customer signals"
                helper="Four items are enough on mobile. The owner sees the pressure without drowning in rows."
                palette={palette}
              />

              <View style={styles.responsiveGrid}>
                <View style={{ width: cardWidth, gap: 10 }}>
                  <StatusPill label="Reorder" tone={reorderItems.length ? "amber" : "green"} palette={palette} />
                  {reorderItems.length > 0 ? (
                    reorderItems.map((item, index) => (
                      <ActionCard
                        key={String(item.id || `${insightTitle(item)}-${index}`)}
                        title={insightTitle(item)}
                        text={insightText(item)}
                        tone="amber"
                        icon="cube-outline"
                        palette={palette}
                      />
                    ))
                  ) : (
                    <EmptyPanel title="Stock pressure is calm" text="No urgent reorder signal returned for this period." palette={palette} />
                  )}
                </View>

                <View style={{ width: cardWidth, gap: 10 }}>
                  <StatusPill label="Collections" tone={collectionItems.length ? "red" : "green"} palette={palette} />
                  {collectionItems.length > 0 ? (
                    collectionItems.map((item, index) => (
                      <ActionCard
                        key={String(item.id || `${insightTitle(item)}-${index}`)}
                        title={insightTitle(item)}
                        text={insightText(item)}
                        tone="red"
                        icon="call-outline"
                        palette={palette}
                      />
                    ))
                  ) : (
                    <EmptyPanel title="No urgent collections" text="No overdue customer pressure returned for this period." palette={palette} />
                  )}
                </View>
              </View>
            </View>
          </View>
        );
      }}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },

  stackSmall: {
    gap: 10,
  },

  screenBottomSpace: {
    paddingBottom: 20,
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
    gap: 6,
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

  heroControls: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },

  refreshButton: {
    minWidth: 112,
  },

  compactStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  periodWrap: {
    minHeight: 46,
    borderWidth: 1,
    padding: 5,
    flexDirection: "row",
    gap: 4,
  },

  periodButton: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  periodText: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  tabGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  tabButton: {
    minHeight: 42,
    minWidth: "23%",
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  tabText: {
    fontSize: 10,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },

  metricCard: {
    minHeight: 118,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },

  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  metricIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  metricValue: {
    lineHeight: 23,
  },

  reportCard: {
    minHeight: 148,
    borderWidth: 1,
    padding: 15,
    gap: 12,
  },

  reportTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  reportIcon: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  panel: {
    borderWidth: 1,
    padding: 15,
    gap: 14,
  },

  sectionHeader: {
    gap: 6,
  },

  actionCard: {
    minHeight: 82,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  actionIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  sellerRow: {
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  sellerRank: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  rankText: {
    fontSize: 10,
    fontFamily: "Quicksand_800ExtraBold",
  },

  sellerTopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  progressTrack: {
    height: 5,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
  },

  statusPill: {
    flexShrink: 0,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusDot: {
    width: 7,
    height: 7,
  },

  statusText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  noticePanel: {
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  emptyPanel: {
    minHeight: 132,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  cardText: {
    flexShrink: 1,
    lineHeight: 18,
  },
});
