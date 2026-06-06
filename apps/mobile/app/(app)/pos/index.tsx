import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import { AppTextInput } from "../../../src/components/ui/AppTextInput";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  PAYMENT_METHOD_OPTIONS,
  SALE_PAYMENT_METHODS,
  SALE_TYPES,
  type CashDrawerStatus,
  type PosCartItem,
  type PosCustomer,
  type PosProduct,
  type SalePaymentMethod,
  type SaleType,
} from "../../../src/features/pos/types";
import {
  useCashDrawerStatus,
  useCreateSale,
  useCustomerSearch,
  useProductSearch,
  useQuickPicks,
} from "../../../src/features/pos/hooks";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

type PosStep = "payment" | "customer" | "products" | "review";
type CustomerMode = "WALKIN" | "EXISTING" | "NEW";
type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

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

function normalizeMoney(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function productPrice(product: PosProduct) {
  const amount = Number(product.sellPrice ?? product.price ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function productStock(product: PosProduct) {
  const amount = Number(
    product.effectiveStockQty ?? product.branchStockQty ?? product.stockQty ?? 0,
  );

  return Number.isFinite(amount) ? amount : 0;
}

function normalizeResponseList<T>(
  value:
    | T[]
    | {
        products?: T[];
        customers?: T[];
        items?: T[];
        data?: T[];
      }
    | undefined,
) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.customers)) return value.customers;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function isDrawerOpen(status?: CashDrawerStatus | null) {
  return Boolean(status?.openSession?.id);
}

function drawerBlocksCashSales(status?: CashDrawerStatus | null) {
  return Boolean(status?.settings?.blockCashSales ?? true);
}

function paymentTouchesCashDrawer(method: SalePaymentMethod) {
  return method === SALE_PAYMENT_METHODS.CASH;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);

  return toDateInputValue(date);
}

function formatDueDateLabel(value: string) {
  if (!value) return "No date selected";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  } catch {
    return value;
  }
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

function getColumns(width: number, type: "summary" | "choices" | "cards") {
  if (type === "summary") {
    if (width >= 920) return 3;
    if (width >= 620) return 2;
    return 1;
  }

  if (type === "choices") {
    if (width >= 920) return 3;
    if (width >= 560) return 2;
    return 1;
  }

  if (width >= 920) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 3) return "32%" as DimensionValue;
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
    <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <AppText variant="caption" color={spec.fg} style={styles.statusPillText}>
        {label}
      </AppText>
    </View>
  );
}

function DueDatePicker({
  value,
  palette,
  onChange,
}: {
  value: string;
  palette: AppShellPalette;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [draftDate, setDraftDate] = useState(value);

  const quickOptions = [
    { label: "7 days", value: addDays(7) },
    { label: "14 days", value: addDays(14) },
    { label: "30 days", value: addDays(30) },
  ];

  const calendar = useMemo(() => {
    const today = new Date();
    const activeMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = activeMonth.getFullYear();
    const month = activeMonth.getMonth();
    const firstDay = activeMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{
      key: string;
      label: string;
      value: string;
      disabled: boolean;
      muted: boolean;
    }> = [];

    for (let index = 0; index < firstDay; index += 1) {
      cells.push({
        key: `blank-${index}`,
        label: "",
        value: "",
        disabled: true,
        muted: true,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day, 12, 0, 0, 0);
      const normalizedToday = new Date();
      normalizedToday.setHours(0, 0, 0, 0);

      cells.push({
        key: toDateInputValue(date),
        label: String(day),
        value: toDateInputValue(date),
        disabled: date < normalizedToday,
        muted: date < normalizedToday,
      });
    }

    return {
      monthLabel: new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(activeMonth),
      cells,
    };
  }, [monthOffset]);

  function openPicker() {
    setDraftDate(value || addDays(7));
    setOpen(true);
  }

  function confirmDate() {
    if (!draftDate) return;
    onChange(draftDate);
    setOpen(false);
  }

  return (
    <View style={[styles.dueDateBox, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.dueDateTop}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Pay-by date
          </AppText>

          <AppText variant="label" color={palette.text}>
            {formatDueDateLabel(value)}
          </AppText>
        </View>

        <Pressable
          onPress={() => (open ? setOpen(false) : openPicker())}
          style={({ pressed }) => [
            styles.chooseDateButton,
            {
              borderColor: open ? toneSpec("cyan", palette).border : palette.border,
              backgroundColor: open ? toneSpec("cyan", palette).solid : "rgba(148, 163, 184, 0.08)",
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <Ionicons
            name={open ? "chevron-up-outline" : "calendar-outline"}
            size={16}
            color={open ? "#06111F" : palette.cyan}
          />

          <AppText variant="caption" color={open ? "#06111F" : palette.cyan}>
            {open ? "Close" : "Pick"}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.dueDateGrid}>
        {quickOptions.map((option) => {
          const active = value === option.value;

          return (
            <Pressable
              key={option.label}
              onPress={() => {
                onChange(option.value);
                setDraftDate(option.value);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.dueDateChip,
                {
                  borderColor: active ? toneSpec("cyan", palette).border : palette.border,
                  backgroundColor: active ? toneSpec("cyan", palette).solid : "transparent",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <AppText variant="caption" color={active ? "#06111F" : palette.soft}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {open ? (
        <View
          style={[
            styles.popupCalendar,
            {
              borderColor: palette.borderStrong,
              backgroundColor: palette.panelStrong,
            },
          ]}
        >
          <View
            style={[
              styles.popupCalendarArrow,
              {
                backgroundColor: palette.panelStrong,
                borderLeftColor: palette.borderStrong,
                borderTopColor: palette.borderStrong,
              },
            ]}
          />

          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() => setMonthOffset((current) => current - 1)}
              style={styles.calendarArrowButton}
            >
              <Ionicons name="chevron-back-outline" size={16} color={palette.soft} />
            </Pressable>

            <AppText variant="label" color={palette.text}>
              {calendar.monthLabel}
            </AppText>

            <Pressable
              onPress={() => setMonthOffset((current) => current + 1)}
              style={styles.calendarArrowButton}
            >
              <Ionicons name="chevron-forward-outline" size={16} color={palette.soft} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <View key={`${day}-${index}`} style={styles.weekCell}>
                <AppText variant="caption" color={palette.soft}>
                  {day}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendar.cells.map((cell) => {
              const active = draftDate === cell.value;

              return (
                <Pressable
                  key={cell.key}
                  disabled={cell.disabled}
                  onPress={() => setDraftDate(cell.value)}
                  style={({ pressed }) => [
                    styles.calendarDay,
                    {
                      borderColor: active ? toneSpec("cyan", palette).border : "transparent",
                      backgroundColor: active
                        ? toneSpec("cyan", palette).solid
                        : pressed
                          ? "rgba(103, 232, 249, 0.12)"
                          : "transparent",
                      opacity: cell.disabled ? 0.34 : 1,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    color={active ? "#06111F" : cell.muted ? palette.soft : palette.text}
                  >
                    {cell.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarFooter}>
            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                styles.calendarFooterButton,
                {
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <AppText variant="caption" color="#FCA5A5">
                Close
              </AppText>
            </Pressable>

            <Pressable
              onPress={confirmDate}
              style={({ pressed }) => [
                styles.calendarFooterButton,
                {
                  backgroundColor: toneSpec("cyan", palette).solid,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <AppText variant="caption" color="#06111F">
                Confirm
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PosSkeleton({
  palette,
  width,
}: {
  palette: AppShellPalette;
  width: number;
}) {
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
        {[1, 2, 3].map((item) => (
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
            <Skeleton height={13} width="48%" />
            <Skeleton height={24} width="72%" />
          </View>
        ))}
      </View>

      {[1, 2, 3, 4].map((item) => (
        <View
          key={item}
          style={[
            styles.accordionPanel,
            {
              borderColor: palette.border,
              backgroundColor: palette.panel,
            },
          ]}
        >
          <Skeleton height={22} width="70%" />
          <Skeleton height={14} width="84%" />
        </View>
      ))}
    </View>
  );
}

function StepPanel({
  step,
  number,
  title,
  summary,
  icon,
  activeStep,
  setActiveStep,
  palette,
  children,
}: {
  step: PosStep;
  number: string;
  title: string;
  summary: string;
  icon: IoniconName;
  activeStep: PosStep;
  setActiveStep: (step: PosStep) => void;
  palette: AppShellPalette;
  children: ReactNode;
}) {
  const isOpen = activeStep === step;
  const spec = toneSpec(isOpen ? "cyan" : "slate", palette);

  return (
    <View
      style={[
        styles.accordionPanel,
        {
          borderColor: isOpen ? spec.border : palette.border,
          backgroundColor: isOpen ? spec.bg : palette.panel,
        },
      ]}
    >
      <Pressable
        onPress={() => setActiveStep(step)}
        style={({ pressed }) => [styles.stepHeader, { opacity: pressed ? 0.82 : 1 }]}
      >
        <View style={[styles.stepNumber, { backgroundColor: isOpen ? spec.solid : "rgba(148, 163, 184, 0.14)" }]}>
          <AppText variant="caption" color={isOpen ? "#06111F" : palette.soft}>
            {number}
          </AppText>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.stepTitleRow}>
            <Ionicons name={icon} size={17} color={isOpen ? palette.cyan : palette.soft} />
            <AppText variant="label" color={palette.text}>
              {title}
            </AppText>
          </View>

          <AppText variant="caption" color={palette.soft} style={styles.stepSummary}>
            {summary}
          </AppText>
        </View>

        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={palette.soft}
        />
      </Pressable>

      {isOpen ? <View style={styles.stepBody}>{children}</View> : null}
    </View>
  );
}

function ChoiceCard({
  title,
  helper,
  active,
  palette,
  width,
  onPress,
}: {
  title: string;
  helper: string;
  active: boolean;
  palette: AppShellPalette;
  width: DimensionValue;
  onPress: () => void;
}) {
  const spec = toneSpec(active ? "cyan" : "slate", palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        {
          width,
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 5 }}>
        <AppText variant="label" color={active ? spec.fg : palette.text}>
          {title}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.choiceHelper}>
          {helper}
        </AppText>
      </View>

      <View
        style={[
          styles.checkBox,
          {
            borderColor: active ? spec.border : palette.borderStrong,
            backgroundColor: active ? spec.solid : "transparent",
          },
        ]}
      >
        <AppText variant="caption" color={active ? "#06111F" : palette.soft}>
          {active ? "✓" : ""}
        </AppText>
      </View>
    </Pressable>
  );
}

function ProductCard({
  product,
  palette,
  width,
  compact,
  onAdd,
}: {
  product: PosProduct;
  palette: AppShellPalette;
  width: DimensionValue;
  compact: boolean;
  onAdd: (product: PosProduct) => void;
}) {
  const stock = productStock(product);
  const disabled = stock <= 0;
  const price = formatMoney(productPrice(product), { compact });

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onAdd(product)}
      style={({ pressed }) => [
        styles.productCard,
        {
          width,
          borderColor: palette.border,
          backgroundColor: palette.panel,
          opacity: disabled ? 0.56 : pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.productTop}>
        <View style={styles.productIcon}>
          <Ionicons name="cube-outline" size={18} color="#06111F" />
        </View>

        <StatusPill
          label={stock > 0 ? `${stock} available` : "Out of stock"}
          tone={stock > 0 ? "green" : "red"}
          palette={palette}
        />
      </View>

      <View style={{ gap: 5 }}>
        <AppText variant="label" color={palette.text}>
          {product.name}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {product.brand || product.category || product.sku || "Product"}
        </AppText>
      </View>

      <View style={styles.productBottom}>
        <MoneyText value={price} color={palette.text} compact={compact} />

        <View style={styles.smallBadge}>
          <AppText variant="caption" color="#06111F">
            Add
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

function CustomerCard({
  customer,
  selected,
  palette,
  width,
  onPress,
}: {
  customer: PosCustomer;
  selected: boolean;
  palette: AppShellPalette;
  width: DimensionValue;
  onPress: () => void;
}) {
  const spec = toneSpec(selected ? "cyan" : "slate", palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.customerCard,
        {
          width,
          borderColor: selected ? spec.border : palette.border,
          backgroundColor: selected ? spec.bg : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.customerIcon}>
        <Ionicons name="person-outline" size={17} color="#06111F" />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {customer.name}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {customer.phone || customer.email || "No phone saved"}
        </AppText>
      </View>

      {selected ? (
        <View style={styles.smallBadge}>
          <AppText variant="caption" color="#06111F">
            Chosen
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function CartItemCard({
  item,
  palette,
  compact,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: PosCartItem;
  palette: AppShellPalette;
  compact: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.cartItem, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={{ flex: 1, gap: 5 }}>
        <AppText variant="label" color={palette.text}>
          {item.name}
        </AppText>

        <View style={styles.stackedMeta}>
          <AppText variant="caption" color={palette.soft}>
            Price
          </AppText>
          <AppText variant="caption" color={palette.text}>
            {formatMoney(item.price, { compact })}
          </AppText>

          <AppText variant="caption" color={palette.soft}>
            Available stock
          </AppText>
          <AppText variant="caption" color={palette.text}>
            {item.stockQty}
          </AppText>
        </View>
      </View>

      <View style={styles.qtyRow}>
        <Pressable onPress={onDecrease} style={styles.qtyButton}>
          <AppText variant="label" color="#06111F">
            −
          </AppText>
        </Pressable>

        <AppText variant="label" color={palette.text}>
          {item.quantity}
        </AppText>

        <Pressable onPress={onIncrease} style={styles.qtyButton}>
          <AppText variant="label" color="#06111F">
            +
          </AppText>
        </Pressable>
      </View>

      <Pressable onPress={onRemove} style={styles.removeButton}>
        <Ionicons name="trash-outline" size={16} color="#FCA5A5" />
      </Pressable>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
  palette,
  width,
  isMoney = false,
  compact = false,
}: {
  label: string;
  value: string;
  icon: IoniconName;
  tone: Tone;
  palette: AppShellPalette;
  width: DimensionValue;
  isMoney?: boolean;
  compact?: boolean;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.summaryCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.summaryTop}>
        <View style={[styles.summaryIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
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
    </View>
  );
}

export default function PosScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 560;

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const [activeStep, setActiveStep] = useState<PosStep>("payment");
  const [saleType, setSaleType] = useState<SaleType>(SALE_TYPES.CASH);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>(SALE_PAYMENT_METHODS.CASH);
  const [paymentReference, setPaymentReference] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [customerMode, setCustomerMode] = useState<CustomerMode>("WALKIN");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [error, setError] = useState("");

  const debouncedProductQuery = useDebouncedValue(productQuery);
  const debouncedCustomerQuery = useDebouncedValue(customerQuery);
  const customerSearchReady = customerMode === "EXISTING" && debouncedCustomerQuery.trim().length >= 2;

  const quickPicksQuery = useQuickPicks(activeBranch?.id);
  const productSearchQuery = useProductSearch({
    q: debouncedProductQuery,
    branchId: activeBranch?.id,
    enabled: debouncedProductQuery.trim().length > 0,
  });
  const customerSearchQuery = useCustomerSearch({
    q: debouncedCustomerQuery,
    enabled: customerSearchReady,
  });
  const drawerQuery = useCashDrawerStatus(Boolean(user && tenant));
  const createSaleMutation = useCreateSale();

  const isLoading = isHydrating || !user || !tenant;

  const quickProducts = useMemo(() => {
    const best = quickPicksQuery.data?.bestSellers || [];
    const latest = quickPicksQuery.data?.latest || [];
    return (best.length > 0 ? best : latest).slice(0, 5);
  }, [quickPicksQuery.data]);

  const searchedProducts = useMemo(
    () => normalizeResponseList<PosProduct>(productSearchQuery.data).slice(0, 8),
    [productSearchQuery.data],
  );

  const customers = useMemo(() => {
    if (!customerSearchReady) return [];
    return normalizeResponseList<PosCustomer>(customerSearchQuery.data).slice(0, 5);
  }, [customerSearchQuery.data, customerSearchReady]);

  const productsToShow = debouncedProductQuery.trim() ? searchedProducts : quickProducts;
  const showingSearchResults = Boolean(debouncedProductQuery.trim());

  const drawerStatus = drawerQuery.data;
  const drawerOpen = isDrawerOpen(drawerStatus);
  const blockCashSales = drawerBlocksCashSales(drawerStatus);
  const selectedMethodTouchesDrawer = paymentTouchesCashDrawer(paymentMethod);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const paid = Number(amountPaid || 0);

  const hasCashDrawerRisk =
    selectedMethodTouchesDrawer &&
    blockCashSales &&
    !drawerOpen &&
    (saleType === SALE_TYPES.CASH || paid > 0);

  const paymentSummary = saleType === SALE_TYPES.CREDIT ? `Pay later, ${paymentMethod}` : `Paid now, ${paymentMethod}`;

  const customerSummary =
    customerMode === "WALKIN"
      ? "Walk-in customer"
      : customerMode === "EXISTING"
        ? selectedCustomer?.name || "Search customer"
        : customerName.trim()
          ? customerPhone.trim()
            ? `${customerName.trim()}, ${customerPhone.trim()}`
            : customerName.trim()
          : "New customer";

  const productSummary =
    itemCount > 0 ? `${itemCount} item${itemCount === 1 ? "" : "s"} selected` : "Search or quick picks";

  const reviewSummary = cart.length > 0 ? `${formatMoney(total, { compact })} ready to finish` : "Add products first";

  const summaryWidth = widthForColumns(getColumns(width, "summary"));
  const choiceWidth = widthForColumns(getColumns(width, "choices"));
  const cardWidth = widthForColumns(getColumns(width, "cards"));
  const totalText = formatMoney(total, { compact });
  const fullTotalText = formatMoney(total);

  function openCashDrawerScreen() {
    router.push(routes.cashDrawer as Href);
  }

  function addProduct(product: PosProduct) {
    setError("");

    const stock = productStock(product);

    if (stock <= 0) {
      setError("This item is out of stock.");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        if (existing.quantity + 1 > existing.stockQty) {
          setError("You cannot sell more than available stock.");
          return current;
        }

        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          price: productPrice(product),
          quantity: 1,
          stockQty: stock,
        },
      ];
    });

    setActiveStep("review");
  }

  function increaseQuantity(productId: string) {
    setCart((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;

        if (item.quantity + 1 > item.stockQty) {
          setError("You cannot sell more than available stock.");
          return item;
        }

        return { ...item, quantity: item.quantity + 1 };
      }),
    );
  }

  function decreaseQuantity(productId: string) {
    setCart((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
      ),
    );
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  async function finishSale() {
    setError("");

    if (cart.length === 0) {
      setError("Add at least one item before finishing the sale.");
      setActiveStep("products");
      return;
    }

    if (hasCashDrawerRisk) {
      setError("Open the cash drawer before taking cash.");
      setActiveStep("payment");
      return;
    }

    if (saleType === SALE_TYPES.CREDIT && customerMode === "WALKIN") {
      setError("Pay-later sales need an existing or new customer.");
      setActiveStep("customer");
      return;
    }

    if (saleType === SALE_TYPES.CREDIT && !dueDate) {
      setError("Choose when the customer should pay.");
      setActiveStep("payment");
      return;
    }

    if (customerMode === "EXISTING" && !selectedCustomer) {
      setError("Search and choose an existing customer first.");
      setActiveStep("customer");
      return;
    }

    if (customerMode === "NEW" && (!customerName.trim() || !customerPhone.trim())) {
      setError("Customer name and phone are required.");
      setActiveStep("customer");
      return;
    }

    if (saleType === SALE_TYPES.CREDIT && paid > total) {
      setError("Deposit cannot be more than the sale total.");
      setActiveStep("payment");
      return;
    }

    try {
      await createSaleMutation.mutateAsync({
        branchId: activeBranch?.id || null,
        saleType,
        paymentMethod,
        paymentReference: paymentReference.trim() || null,
        amountPaid: saleType === SALE_TYPES.CREDIT ? paid : undefined,
        dueDate: saleType === SALE_TYPES.CREDIT ? dueDate : undefined,
        customerId: customerMode === "EXISTING" ? selectedCustomer?.id : undefined,
        customer:
          customerMode === "NEW"
            ? {
                name: customerName.trim(),
                phone: customerPhone.trim(),
              }
            : undefined,
        customerName: customerMode === "NEW" ? customerName.trim() : undefined,
        customerPhone: customerMode === "NEW" ? customerPhone.trim() : undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      setCart([]);
      setSaleType(SALE_TYPES.CASH);
      setPaymentMethod(SALE_PAYMENT_METHODS.CASH);
      setPaymentReference("");
      setAmountPaid("");
      setDueDate("");
      setCustomerMode("WALKIN");
      setCustomerQuery("");
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
      setProductQuery("");
      setActiveStep("payment");

      void quickPicksQuery.refetch();
      void drawerQuery.refetch();

      router.replace(routes.salesList as Href);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sale could not be completed.";
      setError(message);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <PosSkeleton palette={palette} width={width} />
        ) : (
          <View style={styles.stack}>
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

              <View style={[styles.heroTop, compact ? styles.heroTopCompact : null]}>
                <View style={[styles.heroIcon, compact ? styles.heroIconCompact : null]}>
                  <Ionicons name="receipt-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      POS CONTROL
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    New sale
                  </AppText>

                
                </View>

                {!compact ? (
                  <StatusPill
                    label={drawerOpen ? "Drawer open" : "Drawer closed"}
                    tone={drawerOpen ? "green" : "amber"}
                    palette={palette}
                  />
                ) : null}
              </View>

              {compact ? (
                <View style={styles.compactStatusRow}>
                  <StatusPill
                    label={drawerOpen ? "Drawer open" : "Drawer closed"}
                    tone={drawerOpen ? "green" : "amber"}
                    palette={palette}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.responsiveGrid}>
              <SummaryCard
                label="Items"
                value={`${itemCount}`}
                icon="cube-outline"
                tone="blue"
                palette={palette}
                width={summaryWidth}
                compact={compact}
              />

              <SummaryCard
                label="Total"
                value={compact ? totalText : fullTotalText}
                icon="cash-outline"
                tone="cyan"
                palette={palette}
                width={summaryWidth}
                isMoney
                compact={compact}
              />

              <SummaryCard
                label="Method"
                value={paymentMethod}
                icon="card-outline"
                tone={selectedMethodTouchesDrawer ? "amber" : "green"}
                palette={palette}
                width={summaryWidth}
                compact={compact}
              />
            </View>

            <StepPanel
              step="payment"
              number="1"
              title="Payment"
              summary={paymentSummary}
              icon="card-outline"
              activeStep={activeStep}
              setActiveStep={setActiveStep}
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <ChoiceCard
                  title="Paid now"
                  helper="Cash, MoMo, Card, Bank, or another payment received today."
                  active={saleType === SALE_TYPES.CASH}
                  palette={palette}
                  width={choiceWidth}
                  onPress={() => {
                    setSaleType(SALE_TYPES.CASH);
                    setCustomerMode("WALKIN");
                    setDueDate("");
                    setAmountPaid("");
                  }}
                />

                <ChoiceCard
                  title="Pay later"
                  helper="Use when an existing or new customer will pay later."
                  active={saleType === SALE_TYPES.CREDIT}
                  palette={palette}
                  width={choiceWidth}
                  onPress={() => {
                    setSaleType(SALE_TYPES.CREDIT);
                    if (customerMode === "WALKIN") setCustomerMode("EXISTING");
                  }}
                />
              </View>

              <View style={[styles.selectBox, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <View style={styles.selectHeader}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                      Payment method
                    </AppText>

                    <AppText variant="label" color={palette.text}>
                      {PAYMENT_METHOD_OPTIONS.find((item) => item.value === paymentMethod)?.label || paymentMethod}
                    </AppText>
                  </View>

                  {selectedMethodTouchesDrawer ? (
                    <StatusPill label="Drawer" tone="amber" palette={palette} />
                  ) : null}
                </View>

                <View style={styles.methodGrid}>
                  {PAYMENT_METHOD_OPTIONS.map((option) => {
                    const active = option.value === paymentMethod;
                    const spec = toneSpec(active ? "cyan" : "slate", palette);

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setPaymentMethod(option.value)}
                        style={({ pressed }) => [
                          styles.methodChip,
                          {
                            borderColor: active ? spec.border : palette.border,
                            backgroundColor: active ? spec.solid : "transparent",
                            opacity: pressed ? 0.82 : 1,
                          },
                        ]}
                      >
                        <AppText variant="caption" color={active ? "#06111F" : palette.soft}>
                          {option.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {selectedMethodTouchesDrawer ? (
                <View
                  style={[
                    styles.drawerBox,
                    {
                      borderColor: toneSpec(drawerOpen ? "green" : "amber", palette).border,
                      backgroundColor: toneSpec(drawerOpen ? "green" : "amber", palette).bg,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="label" color={palette.text}>
                      Cash drawer: {drawerQuery.isLoading ? "Checking..." : drawerOpen ? "Open" : "Closed"}
                    </AppText>

                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      {drawerOpen
                        ? "Cash sale can be recorded."
                        : blockCashSales
                          ? "Open the drawer before taking cash."
                          : "Cash sale can continue, but drawer is closed."}
                    </AppText>
                  </View>

                  {drawerOpen ? (
                    <AsyncButton
                      onPress={async () => {
                        await drawerQuery.refetch();
                      }}
                      disabled={drawerQuery.isFetching}
                      style={styles.refreshButton}
                    >
                      Check
                    </AsyncButton>
                  ) : (
                    <AsyncButton onPress={openCashDrawerScreen} style={styles.refreshButton}>
                      Open
                    </AsyncButton>
                  )}
                </View>
              ) : null}

              <AppTextInput
                label="Payment note"
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="MoMo code, bank slip, or note"
              />

              {saleType === SALE_TYPES.CREDIT ? (
                <View style={styles.inputGrid}>
                  <AppTextInput
                    label="Deposit paid now"
                    value={amountPaid}
                    onChangeText={(value) => setAmountPaid(normalizeMoney(value))}
                    placeholder="0"
                    keyboardType="numeric"
                  />

                  <DueDatePicker value={dueDate} palette={palette} onChange={setDueDate} />
                </View>
              ) : null}

              <Pressable onPress={() => setActiveStep("customer")} style={styles.nextButton}>
                <AppText variant="label" color="#06111F">
                  Continue to customer
                </AppText>
              </Pressable>
            </StepPanel>

            <StepPanel
              step="customer"
              number="2"
              title="Customer"
              summary={customerSummary}
              icon="person-outline"
              activeStep={activeStep}
              setActiveStep={setActiveStep}
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <ChoiceCard
                  title="Walk-in"
                  helper="Quick sale without saving customer details."
                  active={customerMode === "WALKIN"}
                  palette={palette}
                  width={choiceWidth}
                  onPress={() => {
                    if (saleType === SALE_TYPES.CREDIT) {
                      setError("Pay-later sales need an existing or new customer.");
                      return;
                    }

                    setCustomerMode("WALKIN");
                    setSelectedCustomer(null);
                  }}
                />

                <ChoiceCard
                  title="Existing customer"
                  helper="Search and attach a saved customer."
                  active={customerMode === "EXISTING"}
                  palette={palette}
                  width={choiceWidth}
                  onPress={() => {
                    setCustomerMode("EXISTING");
                    setCustomerName("");
                    setCustomerPhone("");
                  }}
                />

                <ChoiceCard
                  title="New customer"
                  helper="Save customer name and phone with this sale."
                  active={customerMode === "NEW"}
                  palette={palette}
                  width={choiceWidth}
                  onPress={() => {
                    setCustomerMode("NEW");
                    setSelectedCustomer(null);
                  }}
                />
              </View>

              {customerMode === "EXISTING" ? (
                <>
                  <AppTextInput
                    label="Find customer"
                    value={customerQuery}
                    onChangeText={(value) => {
                      setCustomerQuery(value);
                      setSelectedCustomer(null);
                    }}
                    placeholder="Type at least 2 letters or digits"
                  />

                  {!customerSearchReady ? (
                    <View style={styles.emptyBox}>
                      <AppText variant="label" color={palette.text}>
                        Search customer first
                      </AppText>

                      <AppText variant="caption" color={palette.soft}>
                        Saved customers will appear only after typing.
                      </AppText>
                    </View>
                  ) : customerSearchQuery.isFetching ? (
                    <View style={styles.responsiveGrid}>
                      {[1, 2].map((item) => (
                        <View key={item} style={{ width: cardWidth }}>
                          <Skeleton height={74} />
                        </View>
                      ))}
                    </View>
                  ) : customers.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <AppText variant="label" color={palette.text}>
                        No customer found
                      </AppText>

                      <AppText variant="caption" color={palette.soft}>
                        Search again or use New customer.
                      </AppText>
                    </View>
                  ) : (
                    <View style={styles.responsiveGrid}>
                      {customers.map((customer) => (
                        <CustomerCard
                          key={customer.id}
                          customer={customer}
                          selected={selectedCustomer?.id === customer.id}
                          palette={palette}
                          width={cardWidth}
                          onPress={() => setSelectedCustomer(customer)}
                        />
                      ))}
                    </View>
                  )}
                </>
              ) : null}

              {customerMode === "NEW" ? (
                <View style={styles.inputGrid}>
                  <AppTextInput
                    label="Customer name"
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Customer name"
                  />

                  <AppTextInput
                    label="Customer phone"
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    placeholder="07XXXXXXXX"
                    keyboardType="phone-pad"
                  />
                </View>
              ) : null}

              <Pressable onPress={() => setActiveStep("products")} style={styles.nextButton}>
                <AppText variant="label" color="#06111F">
                  Continue to products
                </AppText>
              </Pressable>
            </StepPanel>

            <StepPanel
              step="products"
              number="3"
              title="Products"
              summary={productSummary}
              icon="cube-outline"
              activeStep={activeStep}
              setActiveStep={setActiveStep}
              palette={palette}
            >
              <AppTextInput
                label="Find product"
                value={productQuery}
                onChangeText={setProductQuery}
                placeholder="Search product, code, SKU, serial, or IMEI"
              />

              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                {showingSearchResults
                  ? "Showing up to 8 search results."
                  : "Showing up to 5 top selling or latest products."}
              </AppText>

              {quickPicksQuery.isLoading || productSearchQuery.isFetching ? (
                <View style={styles.responsiveGrid}>
                  {[1, 2, 3].map((item) => (
                    <View key={item} style={{ width: cardWidth }}>
                      <Skeleton height={120} />
                    </View>
                  ))}
                </View>
              ) : productsToShow.length === 0 ? (
                <View style={styles.emptyBox}>
                  <AppText variant="label" color={palette.text}>
                    {showingSearchResults ? "No products found" : "No quick picks yet"}
                  </AppText>

                  <AppText variant="caption" color={palette.soft}>
                    {showingSearchResults
                      ? "Try another name, code, SKU, serial, or IMEI."
                      : "Products will appear here after inventory is created or sales begin."}
                  </AppText>
                </View>
              ) : (
                <View style={styles.responsiveGrid}>
                  {productsToShow.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      palette={palette}
                      width={cardWidth}
                      compact={compact}
                      onAdd={addProduct}
                    />
                  ))}
                </View>
              )}

              <Pressable onPress={() => setActiveStep("review")} style={styles.nextButton}>
                <AppText variant="label" color="#06111F">
                  Review sale
                </AppText>
              </Pressable>
            </StepPanel>

            <StepPanel
              step="review"
              number="4"
              title="Review"
              summary={reviewSummary}
              icon="checkmark-done-outline"
              activeStep={activeStep}
              setActiveStep={setActiveStep}
              palette={palette}
            >
              {cart.length === 0 ? (
                <View style={styles.emptyBox}>
                  <AppText variant="label" color={palette.text}>
                    Cart is empty
                  </AppText>

                  <AppText variant="caption" color={palette.soft}>
                    Add products before finishing this sale.
                  </AppText>
                </View>
              ) : (
                <View style={styles.cartList}>
                  {cart.map((item) => (
                    <CartItemCard
                      key={item.productId}
                      item={item}
                      palette={palette}
                      compact={compact}
                      onIncrease={() => increaseQuantity(item.productId)}
                      onDecrease={() => decreaseQuantity(item.productId)}
                      onRemove={() => removeItem(item.productId)}
                    />
                  ))}
                </View>
              )}

              {error ? (
                <View style={styles.errorBox}>
                  <AppText variant="caption" color="#FCA5A5">
                    {error}
                  </AppText>
                </View>
              ) : null}

              {hasCashDrawerRisk ? (
                <View style={styles.errorBox}>
                  <AppText variant="caption" color="#FCA5A5">
                    Cash drawer is closed. Open it before finishing a cash sale.
                  </AppText>

                  <AsyncButton fullWidth onPress={openCashDrawerScreen} style={styles.openDrawerButton}>
                    Open cash drawer
                  </AsyncButton>
                </View>
              ) : null}

              <View style={styles.totalRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                    Sale total
                  </AppText>

                  <MoneyText value={compact ? totalText : fullTotalText} color={palette.text} compact={compact} />
                </View>

                <StatusPill label={paymentMethod} tone={selectedMethodTouchesDrawer ? "amber" : "green"} palette={palette} />
              </View>

              <AsyncButton
                fullWidth
                disabled={createSaleMutation.isPending || cart.length === 0 || hasCashDrawerRisk}
                onPress={finishSale}
                style={styles.finishButton}
              >
                {hasCashDrawerRisk ? "Open cash drawer first" : "Finish sale"}
              </AsyncButton>
            </StepPanel>
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
    minHeight: 94,
    borderWidth: 1,
    padding: 13,
    gap: 9,
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

  accordionPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  stepSummary: {
    lineHeight: 18,
  },

  stepNumber: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  stepBody: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 12,
    gap: 12,
  },

  choiceCard: {
    minHeight: 94,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  choiceHelper: {
    lineHeight: 18,
  },

  checkBox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  selectBox: {
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  selectHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  methodChip: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  drawerBox: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  refreshButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
  },

  inputGrid: {
    gap: 12,
  },

  dueDateBox: {
    borderWidth: 1,
    padding: 12,
    gap: 10,
    position: "relative",
  },

  dueDateTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  chooseDateButton: {
    minHeight: 36,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  dueDateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  dueDateChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  popupCalendar: {
    marginTop: 2,
    alignSelf: "center",
    width: "92%",
    maxWidth: 330,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  popupCalendarArrow: {
    position: "absolute",
    top: -8,
    right: 28,
    width: 16,
    height: 16,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    transform: [{ rotate: "45deg" }],
  },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  calendarArrowButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  weekRow: {
    flexDirection: "row",
  },

  weekCell: {
    width: "14.285%",
    alignItems: "center",
    justifyContent: "center",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  calendarDay: {
    width: "14.285%",
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 4,
  },

  calendarFooterButton: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  nextButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  productCard: {
    minHeight: 148,
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  productTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  productIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  productBottom: {
    gap: 9,
  },

  customerCard: {
    minHeight: 74,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  customerIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  smallBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#67E8F9",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  cardText: {
    lineHeight: 18,
  },

  emptyBox: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    padding: 14,
    gap: 5,
  },

  cartList: {
    gap: 10,
  },

  cartItem: {
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  stackedMeta: {
    gap: 3,
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  qtyButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  removeButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  errorBox: {
    padding: 12,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.22)",
    gap: 10,
  },

  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  openDrawerButton: {
    minHeight: 50,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
  },

  finishButton: {
    minHeight: 60,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
  },
});