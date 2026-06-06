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
import { AppTextInput } from "../../../src/components/ui/AppTextInput";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  normalizeSalesList,
  saleAmount,
  useSalesList,
} from "../../../src/features/sales/hooks";
import type { SaleListItem } from "../../../src/features/sales/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const PAGE_SIZE = 5;
const MAX_FETCH_LIMIT = 50;

type DateFilterKey = "today" | "yesterday" | "sevenDays" | "thirtyDays" | "all";
type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

const DATE_FILTERS: Array<{
  key: DateFilterKey;
  label: string;
}> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "sevenDays", label: "7 days" },
  { key: "thirtyDays", label: "30 days" },
  { key: "all", label: "All" },
];

function useDebouncedValue(value: string, delay = 260) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

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

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
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

function customerLabel(sale: SaleListItem) {
  return (
    sale.customerName ||
    sale.customerPhone ||
    sale.customer?.name ||
    sale.customer?.phone ||
    "Walk-in customer"
  );
}

function saleDate(sale: SaleListItem) {
  return sale.createdAt || sale.soldAt || sale.date || null;
}

function saleStatus(sale: SaleListItem) {
  return String(sale.paymentStatus || sale.status || "Paid").toUpperCase();
}

function paidAmount(sale: SaleListItem) {
  const amount = Number(sale.amountPaid ?? sale.paidAmount ?? saleAmount(sale) ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function balanceAmount(sale: SaleListItem) {
  const amount = Number(sale.balanceDue ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function subtractDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function getDateRange(filter: DateFilterKey) {
  const now = new Date();

  if (filter === "all") return null;

  if (filter === "today") {
    return {
      from: startOfDay(now),
      to: endOfDay(now),
    };
  }

  if (filter === "yesterday") {
    const yesterday = subtractDays(1);

    return {
      from: startOfDay(yesterday),
      to: endOfDay(yesterday),
    };
  }

  if (filter === "sevenDays") {
    return {
      from: startOfDay(subtractDays(6)),
      to: endOfDay(now),
    };
  }

  return {
    from: startOfDay(subtractDays(29)),
    to: endOfDay(now),
  };
}

function filterSalesByDate(sales: SaleListItem[], filter: DateFilterKey) {
  const range = getDateRange(filter);

  if (!range) return sales;

  return sales.filter((sale) => {
    const rawDate = saleDate(sale);
    if (!rawDate) return false;

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return false;

    return date >= range.from && date <= range.to;
  });
}

function dateFilterLabel(filter: DateFilterKey) {
  if (filter === "today") return "today";
  if (filter === "yesterday") return "yesterday";
  if (filter === "sevenDays") return "last 7 days";
  if (filter === "thirtyDays") return "last 30 days";
  return "all time";
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

function getColumns(width: number, type: "summary" | "details" | "cards") {
  if (type === "summary") {
    if (width >= 680) return 2;
    return 1;
  }

  if (type === "details") {
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

function StatusBadge({
  value,
  palette,
}: {
  value: string;
  palette: AppShellPalette;
}) {
  const isCredit =
    value.includes("PARTIAL") ||
    value.includes("UNPAID") ||
    value.includes("CREDIT");

  const spec = toneSpec(isCredit ? "amber" : "green", palette);

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <AppText variant="caption" color={spec.fg} style={styles.badgeText}>
        {isCredit ? "Pay later" : "Paid"}
      </AppText>
    </View>
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
            styles.summaryIcon,
            {
              borderColor: spec.border,
              backgroundColor: spec.bg,
            },
          ]}
        >
          <Ionicons name={icon} size={16} color={spec.fg} />
        </View>

        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          {label}
        </AppText>
      </View>

      {isMoney ? (
        <MoneyText value={value} color={palette.text} compact={compact} />
      ) : (
        <AppText variant="subtitle" color={palette.text}>
          {value}
        </AppText>
      )}

      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
        {helper}
      </AppText>
    </View>
  );
}

function DetailBox({
  label,
  value,
  palette,
  width,
  isMoney = false,
  compact = false,
}: {
  label: string;
  value: string;
  palette: AppShellPalette;
  width: DimensionValue;
  isMoney?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailBox,
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
        <MoneyText value={value} color={palette.text} compact={compact} />
      ) : (
        <AppText variant="label" color={palette.text} style={styles.detailValue}>
          {value}
        </AppText>
      )}
    </View>
  );
}

function DateFilterChips({
  value,
  palette,
  onChange,
}: {
  value: DateFilterKey;
  palette: AppShellPalette;
  onChange: (value: DateFilterKey) => void;
}) {
  return (
    <View style={styles.filterWrap}>
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
        Date filter
      </AppText>

      <View style={styles.filterRow}>
        {DATE_FILTERS.map((item) => {
          const active = item.key === value;
          const spec = toneSpec(active ? "cyan" : "slate", palette);

          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  borderColor: active ? spec.border : palette.border,
                  backgroundColor: active ? spec.solid : palette.panel,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <AppText variant="caption" color={active ? "#06111F" : palette.soft}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SalesListSkeleton({
  palette,
  width,
}: {
  palette: AppShellPalette;
  width: number;
}) {
  const cardWidth = widthForColumns(getColumns(width, "cards"));
  const summaryWidth = widthForColumns(getColumns(width, "summary"));

  return (
    <View style={styles.stack}>
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
            <Skeleton height={14} width="38%" />
            <Skeleton height={26} width="70%" />
            <Skeleton height={14} width="78%" />
          </View>
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ width: summaryWidth }}>
            <Skeleton height={96} width="100%" />
          </View>
        ))}
      </View>

      <Skeleton height={54} width="100%" />

      <View style={styles.filterRow}>
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} height={34} width={72} />
        ))}
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4, 5].map((item) => (
          <View
            key={item}
            style={[
              styles.saleCard,
              {
                width: cardWidth,
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={18} width="52%" />
            <Skeleton height={14} width="72%" />
            <Skeleton height={18} width="34%" />
          </View>
        ))}
      </View>
    </View>
  );
}

function SaleDetails({
  sale,
  palette,
  detailWidth,
  compact,
  onClose,
}: {
  sale: SaleListItem;
  palette: AppShellPalette;
  detailWidth: DimensionValue;
  compact: boolean;
  onClose: () => void;
}) {
  const amount = saleAmount(sale);
  const paid = paidAmount(sale);
  const balance = balanceAmount(sale);
  const status = saleStatus(sale);

  return (
    <View
      style={[
        styles.detailPanel,
        {
          borderColor: toneSpec("cyan", palette).border,
          backgroundColor: toneSpec("cyan", palette).bg,
        },
      ]}
    >
      <View style={styles.detailTop}>
        <View style={styles.saleIcon}>
          <Ionicons name="receipt-outline" size={17} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="subtitle" color={palette.text}>
            {saleTitle(sale)}
          </AppText>

          <AppText variant="caption" color={palette.soft}>
            Sale details
          </AppText>
        </View>

        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={22} color="#06111F" />
        </Pressable>
      </View>

      <View style={styles.detailGrid}>
        <DetailBox label="Customer" value={customerLabel(sale)} palette={palette} width={detailWidth} />
        <DetailBox label="Amount" value={formatMoney(amount, { compact })} palette={palette} width={detailWidth} isMoney compact={compact} />
        <DetailBox label="Payment" value={String(sale.paymentMethod || "—")} palette={palette} width={detailWidth} />
        <DetailBox label="Status" value={status} palette={palette} width={detailWidth} />
        <DetailBox label="Paid" value={formatMoney(paid, { compact })} palette={palette} width={detailWidth} isMoney compact={compact} />
        <DetailBox label="Balance" value={formatMoney(balance, { compact })} palette={palette} width={detailWidth} isMoney compact={compact} />
        <DetailBox label="Time" value={formatDateTime(saleDate(sale))} palette={palette} width={detailWidth} />
      </View>

      <View style={styles.detailActions}>
        <AsyncButton fullWidth onPress={() => openReceipt(sale.id)} style={styles.receiptButton}>
          Open full receipt
        </AsyncButton>

        <AsyncButton fullWidth onPress={onClose} style={styles.doneButton}>
          Close details
        </AsyncButton>
      </View>
    </View>
  );
}

function SaleCard({
  sale,
  palette,
  selected,
  width,
  compact,
  onPress,
}: {
  sale: SaleListItem;
  palette: AppShellPalette;
  selected: boolean;
  width: DimensionValue;
  compact: boolean;
  onPress: () => void;
}) {
  const amount = saleAmount(sale);
  const status = saleStatus(sale);
  const balance = balanceAmount(sale);
  const hasBalance = balance > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.saleCard,
        {
          width,
          borderColor: selected ? toneSpec("cyan", palette).border : palette.border,
          backgroundColor: selected ? toneSpec("cyan", palette).bg : palette.panel,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.saleTop}>
        <View style={styles.saleIcon}>
          <Ionicons name="receipt-outline" size={17} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 5 }}>
          <AppText variant="label" color={palette.text}>
            {saleTitle(sale)}
          </AppText>

          <View style={styles.stackedMeta}>
            <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
              Customer
            </AppText>
            <AppText variant="caption" color={palette.text}>
              {customerLabel(sale)}
            </AppText>

            <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
              Time
            </AppText>
            <AppText variant="caption" color={palette.text}>
              {formatDateTime(saleDate(sale))}
            </AppText>
          </View>
        </View>

        <StatusBadge value={status} palette={palette} />
      </View>

      <View style={styles.saleBottom}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Amount
          </AppText>

          <MoneyText value={formatMoney(amount, { compact })} color={palette.text} compact={compact} />
        </View>

        <View style={styles.saleRightStatus}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Status
          </AppText>

          <AppText variant="label" color={hasBalance ? toneSpec("amber", palette).fg : palette.text}>
            {hasBalance ? "Balance due" : "Paid"}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

export default function SalesListScreen() {
  const { width } = useWindowDimensions();

  /**
   * AppShell displays the mobile app inside a narrower centered surface on web/tablet.
   * useWindowDimensions() gives the full browser width, so we cap it to the real
   * mobile content width before deciding columns.
   */
  const layoutWidth = Math.min(width, 720);
  const compact = layoutWidth < 560;

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("today");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const salesQuery = useSalesList({
    branchId: activeBranch?.id,
    limit: MAX_FETCH_LIMIT,
    q: debouncedSearch,
  });

  const isLoading = isHydrating || !user || !tenant || salesQuery.isLoading;

  const allSales = useMemo(() => normalizeSalesList(salesQuery.data), [salesQuery.data]);

  const filteredSales = useMemo(
    () => filterSalesByDate(allSales, dateFilter),
    [allSales, dateFilter],
  );

  const visibleSales = filteredSales.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredSales.length;

  const filteredTotal = useMemo(
    () => filteredSales.reduce((sum, sale) => sum + saleAmount(sale), 0),
    [filteredSales],
  );

  const paidTotal = useMemo(
    () => filteredSales.reduce((sum, sale) => sum + paidAmount(sale), 0),
    [filteredSales],
  );

  const balanceTotal = useMemo(
    () => filteredSales.reduce((sum, sale) => sum + balanceAmount(sale), 0),
    [filteredSales],
  );

  const payLaterCount = useMemo(
    () => filteredSales.filter((sale) => balanceAmount(sale) > 0).length,
    [filteredSales],
  );

  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const detailWidth = widthForColumns(getColumns(layoutWidth, "details"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSelectedSaleId(null);
  }, [debouncedSearch, activeBranch?.id, dateFilter]);

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <SalesListSkeleton palette={palette} width={layoutWidth} />
        ) : (
          <View style={styles.stack}>
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
                  <Ionicons name="list-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />

                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      Sales list
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Sales for {dateFilterLabel(dateFilter)}.
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.heroText}>
                    Review receipts, customers, payments, and balances without opening every sale.
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              <SummaryCard
                label="Shown"
                value={`${Math.min(visibleCount, filteredSales.length)} of ${filteredSales.length}`}
                helper="Visible records"
                icon="albums-outline"
                tone="blue"
                palette={palette}
                width={summaryWidth}
                compact={compact}
              />

              <SummaryCard
                label="Total"
                value={formatMoney(filteredTotal, { compact })}
                helper="Sales amount"
                icon="cash-outline"
                tone="cyan"
                palette={palette}
                width={summaryWidth}
                isMoney
                compact={compact}
              />

              <SummaryCard
                label="Paid"
                value={formatMoney(paidTotal, { compact })}
                helper="Money received"
                icon="checkmark-done-outline"
                tone="green"
                palette={palette}
                width={summaryWidth}
                isMoney
                compact={compact}
              />

              <SummaryCard
                label="Pay later"
                value={formatMoney(balanceTotal, { compact })}
                helper={`${payLaterCount} sale${payLaterCount === 1 ? "" : "s"} with balance`}
                icon="time-outline"
                tone={balanceTotal > 0 ? "amber" : "slate"}
                palette={palette}
                width={summaryWidth}
                isMoney
                compact={compact}
              />
            </View>

            <AppTextInput
              label="Search sales"
              value={search}
              onChangeText={setSearch}
              placeholder="Receipt, customer, phone, or payment"
            />

            <DateFilterChips value={dateFilter} palette={palette} onChange={setDateFilter} />

            {salesQuery.isFetching && !salesQuery.isLoading ? (
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
                  Updating sales...
                </AppText>
              </View>
            ) : null}

            {visibleSales.length === 0 ? (
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
                  No sales found
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  No sales match {dateFilterLabel(dateFilter)}. Try another date filter or search.
                </AppText>
              </View>
            ) : (
              <View style={styles.responsiveGrid}>
                {visibleSales.map((sale) => {
                  const selected = sale.id === selectedSaleId;

                  return (
                    <View key={sale.id} style={[styles.saleGroup, { width: cardWidth }]}>
                      <SaleCard
                        sale={sale}
                        palette={palette}
                        selected={selected}
                        width="100%"
                        compact={compact}
                        onPress={() =>
                          setSelectedSaleId((current) => (current === sale.id ? null : sale.id))
                        }
                      />

                      {selected ? (
                        <SaleDetails
                          sale={sale}
                          palette={palette}
                          detailWidth={detailWidth}
                          compact={compact}
                          onClose={() => setSelectedSaleId(null)}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {canLoadMore ? (
              <AsyncButton
                fullWidth
                onPress={() => setVisibleCount((current) => current + PAGE_SIZE)}
                disabled={salesQuery.isFetching}
                style={styles.loadMoreButton}
              >
                Load 5 more
              </AsyncButton>
            ) : null}
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

  heroText: {
    lineHeight: 18,
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

  summaryIcon: {
    width: 32,
    height: 32,
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

  filterWrap: {
    gap: 8,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  saleGroup: {
    gap: 8,
  },

  saleCard: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  saleTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  saleIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  stackedMeta: {
    gap: 3,
  },

  badge: {
    flexShrink: 0,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  badgeText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  saleBottom: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 12,
    flexDirection: "row",
    gap: 12,
  },

  saleRightStatus: {
    alignItems: "flex-end",
    gap: 4,
  },

  emptyBox: {
    borderWidth: 1,
    padding: 15,
    gap: 5,
  },

  refreshBox: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  loadMoreButton: {
    minHeight: 54,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
  },

  detailPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  detailTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  detailGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  detailBox: {
    minHeight: 76,
    borderWidth: 1,
    padding: 12,
    gap: 5,
  },

  detailValue: {
    lineHeight: 19,
  },

  detailActions: {
    gap: 10,
  },

  receiptButton: {
    minHeight: 52,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
  },

  doneButton: {
    minHeight: 52,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
  },

  cardText: {
    lineHeight: 18,
  },
});