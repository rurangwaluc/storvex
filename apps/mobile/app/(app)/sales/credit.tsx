import { useEffect, useMemo, useState } from "react";
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
import { AppBackButton } from "../../../src/components/app/AppBackButton";
import { AppText } from "../../../src/components/ui/AppText";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  normalizeSalesList,
  saleAmount,
  saleBalanceAmount,
  salePaidAmount,
  useOutstandingCreditSales,
  useOverdueCreditSales,
} from "../../../src/features/sales/hooks";
import type { SaleListItem } from "../../../src/features/sales/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const PAGE_SIZE = 5;

type CreditTab = "outstanding" | "overdue";
type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

function formatMoney(value: unknown, options: { compact?: boolean } = {}) {
  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;

  if (!options.compact) return `${safe.toLocaleString()} RWF`;

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

function formatDate(value?: string | null) {
  if (!value) return "No pay-by date";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "No pay-by date";
  }
}

function saleTitle(sale: SaleListItem) {
  return (
    sale.receiptNumber ||
    sale.saleNumber ||
    sale.reference ||
    `Sale ${String(sale.id || "").slice(0, 8)}`
  );
}

function customerName(sale: SaleListItem) {
  return sale.customerName || sale.customer?.name || "Customer";
}

function customerPhone(sale: SaleListItem) {
  return sale.customerPhone || sale.customer?.phone || "No phone saved";
}

function dueDate(sale: SaleListItem) {
  return sale.dueDate || sale.paymentDueDate || null;
}

function openReceipt(saleId: string) {
  router.push(`/(app)/sales/${encodeURIComponent(saleId)}` as Href);
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

function getColumns(width: number, type: "summary" | "cards" | "money") {
  if (type === "summary") {
    if (width >= 680) return 2;
    return 1;
  }

  if (type === "money") {
    if (width >= 680) return 2;
    return 1;
  }

  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 3) return "32%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
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
      <AppText variant="caption" color={spec.fg} style={styles.statusText}>
        {label}
      </AppText>
    </View>
  );
}

function CreditSkeleton({
  palette,
  layoutWidth,
}: {
  palette: AppShellPalette;
  layoutWidth: number;
}) {
  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <Skeleton height={46} width="42%" />

      <View
        style={[
          styles.heroPanel,
          {
            borderColor: palette.borderStrong,
            backgroundColor: "rgba(32, 200, 255, 0.08)",
          },
        ]}
      >
        <View style={styles.heroTop}>
          <Skeleton height={56} width={56} />

          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="42%" />
            <Skeleton height={24} width="76%" />
            <Skeleton height={14} width="62%" />
          </View>
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2].map((item) => (
          <View
            key={item}
            style={[
              styles.summaryCard,
              {
                width: summaryWidth,
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={12} width="50%" />
            <Skeleton height={22} width="72%" />
            <Skeleton height={12} width="62%" />
          </View>
        ))}
      </View>

      {[1, 2, 3].map((item) => (
        <View
          key={item}
          style={[
            styles.creditCard,
            {
              borderColor: palette.border,
              backgroundColor: palette.panel,
            },
          ]}
        >
          <Skeleton height={18} width="52%" />
          <Skeleton height={14} width="72%" />
          <Skeleton height={18} width="36%" />
        </View>
      ))}
    </View>
  );
}

function TabButton({
  label,
  active,
  tone,
  palette,
  onPress,
}: {
  label: string;
  active: boolean;
  tone: Tone;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(active ? tone : "slate", palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        {
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.solid : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={active ? "#06111F" : palette.soft} style={styles.tabText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
  tone,
  palette,
  width,
  compact,
}: {
  label: string;
  value: string;
  helper: string;
  icon: IoniconName;
  tone: Tone;
  palette: AppShellPalette;
  width: DimensionValue;
  compact: boolean;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.summaryCard,
        {
          width,
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.summaryTop}>
        <View
          style={[
            styles.smallIcon,
            {
              borderColor: spec.border,
              backgroundColor: spec.bg,
            },
          ]}
        >
          <Ionicons name={icon} size={15} color={spec.fg} />
        </View>

        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          {label}
        </AppText>
      </View>

      <MoneyText value={value} color={palette.text} compact={compact} />

      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
        {helper}
      </AppText>
    </View>
  );
}

function InfoBox({
  label,
  value,
  palette,
  width,
  isMoney = false,
  compact = false,
  tone = "slate",
}: {
  label: string;
  value: string;
  palette: AppShellPalette;
  width: DimensionValue;
  isMoney?: boolean;
  compact?: boolean;
  tone?: Tone;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.infoBox,
        {
          width,
          borderColor: palette.border,
          backgroundColor: "rgba(148, 163, 184, 0.06)",
        },
      ]}
    >
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
        {label}
      </AppText>

      {isMoney ? (
        <MoneyText value={value} color={tone === "slate" ? palette.text : spec.fg} compact={compact} />
      ) : (
        <AppText variant="label" color={tone === "slate" ? palette.text : spec.fg} style={styles.infoValue}>
          {value}
        </AppText>
      )}
    </View>
  );
}

function CreditSaleCard({
  sale,
  overdue,
  palette,
  moneyWidth,
  compact,
}: {
  sale: SaleListItem;
  overdue: boolean;
  palette: AppShellPalette;
  moneyWidth: DimensionValue;
  compact: boolean;
}) {
  const tone: Tone = overdue ? "red" : "amber";
  const spec = toneSpec(tone, palette);

  const total = saleAmount(sale);
  const paid = salePaidAmount(sale);
  const left = saleBalanceAmount(sale);

  return (
    <Pressable
      onPress={() => openReceipt(sale.id)}
      style={({ pressed }) => [
        styles.creditCard,
        {
          borderColor: overdue ? spec.border : palette.border,
          backgroundColor: overdue ? spec.bg : palette.panel,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.creditTop}>
        <View
          style={[
            styles.creditIcon,
            {
              borderColor: spec.border,
              backgroundColor: overdue ? spec.solid : toneSpec("cyan", palette).solid,
            },
          ]}
        >
          <Ionicons
            name={overdue ? "alert-circle-outline" : "time-outline"}
            size={17}
            color="#06111F"
          />
        </View>

        <View style={{ flex: 1, gap: 5 }}>
          <AppText variant="label" color={palette.text}>
            {customerName(sale)}
          </AppText>

          <View style={styles.stackedDetails}>
            <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
              Phone
            </AppText>

            <AppText variant="caption" color={palette.text} style={styles.cardText}>
              {customerPhone(sale)}
            </AppText>

            <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
              Receipt
            </AppText>

            <AppText variant="caption" color={palette.text} style={styles.cardText}>
              {saleTitle(sale)}
            </AppText>
          </View>
        </View>

        <StatusPill label={overdue ? "Overdue" : "To collect"} tone={tone} palette={palette} />
      </View>

      <View style={styles.moneyGrid}>
        <InfoBox
          label="Sale total"
          value={formatMoney(total, { compact })}
          palette={palette}
          width={moneyWidth}
          isMoney
          compact={compact}
        />

        <InfoBox
          label="Money received"
          value={formatMoney(paid, { compact })}
          palette={palette}
          width={moneyWidth}
          isMoney
          compact={compact}
          tone="green"
        />

        <InfoBox
          label="Still to pay"
          value={formatMoney(left, { compact })}
          palette={palette}
          width={moneyWidth}
          isMoney
          compact={compact}
          tone={overdue ? "red" : "amber"}
        />

        <InfoBox
          label="Pay-by date"
          value={formatDate(dueDate(sale))}
          palette={palette}
          width={moneyWidth}
          tone={overdue ? "red" : "slate"}
        />
      </View>

      <View
        style={[
          styles.openRow,
          {
            borderColor: spec.border,
            backgroundColor: overdue ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
          },
        ]}
      >
        <AppText variant="caption" color={overdue ? spec.fg : palette.cyan} style={styles.openText}>
          Open sale and record customer payment
        </AppText>

        <Ionicons name="chevron-forward" size={17} color={overdue ? spec.fg : palette.cyan} />
      </View>
    </Pressable>
  );
}

export default function SalesCreditScreen() {
  const { width } = useWindowDimensions();

  const layoutWidth = Math.min(width, 720);
  const compact = layoutWidth < 560;

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const [tab, setTab] = useState<CreditTab>("outstanding");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const outstandingQuery = useOutstandingCreditSales(activeBranch?.id);
  const overdueQuery = useOverdueCreditSales(activeBranch?.id);

  const outstandingSales = useMemo(
    () => normalizeSalesList(outstandingQuery.data),
    [outstandingQuery.data],
  );

  const overdueSales = useMemo(
    () => normalizeSalesList(overdueQuery.data),
    [overdueQuery.data],
  );

  const activeSales = tab === "outstanding" ? outstandingSales : overdueSales;
  const visibleSales = activeSales.slice(0, visibleCount);
  const canLoadMore = visibleCount < activeSales.length;

  const outstandingTotal = useMemo(
    () => outstandingSales.reduce((sum, sale) => sum + saleBalanceAmount(sale), 0),
    [outstandingSales],
  );

  const overdueTotal = useMemo(
    () => overdueSales.reduce((sum, sale) => sum + saleBalanceAmount(sale), 0),
    [overdueSales],
  );

  const activeTotal = tab === "outstanding" ? outstandingTotal : overdueTotal;
  const activeCount = activeSales.length;
  const shownCount = Math.min(visibleCount, activeSales.length);

  const isLoading =
    isHydrating ||
    !user ||
    !tenant ||
    outstandingQuery.isLoading ||
    overdueQuery.isLoading;

  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const moneyWidth = widthForColumns(getColumns(layoutWidth, "money"));

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, activeBranch?.id]);

  function changeTab(nextTab: CreditTab) {
    setTab(nextTab);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <CreditSkeleton palette={palette} layoutWidth={layoutWidth} />
        ) : (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <AppBackButton label="Back to Sales" to={routes.sales} palette={palette} />

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
                  <Ionicons name="people-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />

                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      Pay-later sales
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Customers who still owe money.
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Follow money still to collect and open a sale when the customer pays.
                  </AppText>
                </View>

                {!compact ? (
                  <StatusPill
                    label={`${activeCount} sale${activeCount === 1 ? "" : "s"}`}
                    tone={tab === "overdue" ? "red" : "amber"}
                    palette={palette}
                  />
                ) : null}
              </View>

              {compact ? (
                <View style={styles.compactStatusRow}>
                  <StatusPill
                    label={`${activeCount} sale${activeCount === 1 ? "" : "s"}`}
                    tone={tab === "overdue" ? "red" : "amber"}
                    palette={palette}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.responsiveGrid}>
              <SummaryCard
                label="Still to collect"
                value={formatMoney(outstandingTotal, { compact })}
                helper={`${outstandingSales.length} sale${
                  outstandingSales.length === 1 ? "" : "s"
                } with money left`}
                icon="time-outline"
                tone="amber"
                palette={palette}
                width={summaryWidth}
                compact={compact}
              />

              <SummaryCard
                label="Overdue"
                value={formatMoney(overdueTotal, { compact })}
                helper={`${overdueSales.length} sale${
                  overdueSales.length === 1 ? "" : "s"
                } past pay-by date`}
                icon="alert-circle-outline"
                tone={overdueTotal > 0 ? "red" : "slate"}
                palette={palette}
                width={summaryWidth}
                compact={compact}
              />
            </View>

            <View
              style={[
                styles.controlPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                  View
                </AppText>

                <AppText variant="label" color={palette.text}>
                  {tab === "outstanding" ? "All customers with money left" : "Customers past pay-by date"}
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  Showing {shownCount} of {activeSales.length}
                </AppText>
              </View>

              <View style={styles.tabRow}>
                <TabButton
                  label="To collect"
                  active={tab === "outstanding"}
                  tone="amber"
                  palette={palette}
                  onPress={() => changeTab("outstanding")}
                />

                <TabButton
                  label="Overdue"
                  active={tab === "overdue"}
                  tone="red"
                  palette={palette}
                  onPress={() => changeTab("overdue")}
                />
              </View>
            </View>

            {outstandingQuery.isFetching || overdueQuery.isFetching ? (
              <View
                style={[
                  styles.refreshBox,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <Skeleton height={12} width={12} />

                <AppText variant="caption" color={palette.soft}>
                  Updating pay-later sales...
                </AppText>
              </View>
            ) : null}

            <View
              style={[
                styles.activeSummary,
                {
                  borderColor: tab === "overdue"
                    ? toneSpec("red", palette).border
                    : toneSpec("amber", palette).border,
                  backgroundColor: tab === "overdue"
                    ? toneSpec("red", palette).bg
                    : toneSpec("amber", palette).bg,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                  Current view
                </AppText>

                <AppText variant="label" color={palette.text}>
                  {tab === "outstanding" ? "Money still to collect" : "Overdue money"}
                </AppText>
              </View>

              <View style={styles.activeTotalBox}>
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                  Total
                </AppText>

                <MoneyText
                  value={formatMoney(activeTotal, { compact })}
                  color={tab === "overdue" ? toneSpec("red", palette).fg : toneSpec("amber", palette).fg}
                  compact={compact}
                />
              </View>
            </View>

            {activeSales.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <AppText variant="label" color={palette.text}>
                  {tab === "outstanding" ? "No money left to collect" : "No overdue money"}
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  {tab === "outstanding"
                    ? "Pay-later sales with money left will appear here."
                    : "Sales past their pay-by date will appear here."}
                </AppText>
              </View>
            ) : (
              <View style={styles.list}>
                {visibleSales.map((sale) => (
                  <CreditSaleCard
                    key={sale.id}
                    sale={sale}
                    overdue={tab === "overdue"}
                    palette={palette}
                    moneyWidth={moneyWidth}
                    compact={compact}
                  />
                ))}
              </View>
            )}

            {canLoadMore ? (
              <AsyncButton
                fullWidth
                onPress={async () => {
                  setVisibleCount((current) => current + PAGE_SIZE);
                }}
                disabled={outstandingQuery.isFetching || overdueQuery.isFetching}
                style={styles.loadMoreButton}
              >
                Load 5 more
              </AsyncButton>
            ) : null}

            <AsyncButton
              fullWidth
              onPress={async () => {
                await Promise.all([
                  outstandingQuery.refetch(),
                  overdueQuery.refetch(),
                ]);
              }}
              disabled={outstandingQuery.isFetching || overdueQuery.isFetching}
              style={styles.refreshButton}
            >
              Refresh balances
            </AsyncButton>
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

  screenBottomSpace: {
    paddingBottom: 30,
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

  compactStatusRow: {
    alignItems: "flex-start",
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    minHeight: 112,
    borderWidth: 1,
    padding: 13,
    gap: 8,
  },

  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  smallIcon: {
    width: 30,
    height: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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

  statusText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  controlPanel: {
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  tabRow: {
    flexDirection: "row",
    gap: 8,
  },

  tabButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  tabText: {
    letterSpacing: 0.4,
  },

  refreshBox: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  activeSummary: {
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  activeTotalBox: {
    minWidth: 138,
    alignItems: "flex-end",
    gap: 4,
  },

  list: {
    gap: 10,
  },

  creditCard: {
    borderWidth: 1,
    padding: 14,
    gap: 13,
  },

  creditTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  creditIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stackedDetails: {
    gap: 3,
  },

  moneyGrid: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  infoBox: {
    minHeight: 74,
    borderWidth: 1,
    padding: 12,
    gap: 5,
  },

  infoValue: {
    lineHeight: 19,
  },

  openRow: {
    minHeight: 42,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  openText: {
    flex: 1,
    lineHeight: 17,
  },

  emptyBox: {
    borderWidth: 1,
    padding: 15,
    gap: 5,
  },

  loadMoreButton: {
    minHeight: 54,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
  },

  refreshButton: {
    minHeight: 54,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
  },

  cardText: {
    lineHeight: 18,
  },
});