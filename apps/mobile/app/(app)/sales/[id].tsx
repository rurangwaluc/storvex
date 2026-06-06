import { useMemo, useState } from "react";
import { Href, router, useLocalSearchParams } from "expo-router";
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
import { useCashDrawerStatus } from "../../../src/features/cashDrawer/hooks";
import {
  saleAmount,
  useAddSalePayment,
  useSaleReceipt,
} from "../../../src/features/sales/hooks";
import type {
  SaleListItem,
  SaleReceiptItem,
  SaleReceiptPayment,
  SaleReceiptResponse,
  SalesPaymentMethod,
} from "../../../src/features/sales/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const PAYMENT_METHOD_OPTIONS: Array<{
  label: string;
  value: SalesPaymentMethod;
}> = [
  { label: "Cash", value: "CASH" },
  { label: "MoMo", value: "MOMO" },
  { label: "Card", value: "CARD" },
  { label: "Bank", value: "BANK" },
  { label: "Other", value: "OTHER" },
];

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

function normalizeMoney(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanId(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function receiptDocumentId(
  receipt?: SaleReceiptResponse | null,
  sale?: SaleListItem | null,
  saleId?: string | null,
) {
  return cleanId(receipt?.id || sale?.id || saleId);
}

function safeNumber(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function receiptSale(receipt?: SaleReceiptResponse | null): SaleListItem | null {
  if (!receipt) return null;
  if (receipt.sale) return receipt.sale;
  if (receipt.id) return receipt as SaleListItem;

  return null;
}

function receiptTitle(receipt?: SaleReceiptResponse | null, sale?: SaleListItem | null) {
  return (
    sale?.receiptNumber ||
    sale?.saleNumber ||
    sale?.reference ||
    receipt?.receiptNumber ||
    receipt?.saleNumber ||
    receipt?.reference ||
    `Sale ${String(sale?.id || receipt?.id || "").slice(0, 8)}`
  );
}

function customerLabel(sale?: SaleListItem | null) {
  return (
    sale?.customerName ||
    sale?.customerPhone ||
    sale?.customer?.name ||
    sale?.customer?.phone ||
    "Walk-in customer"
  );
}

function saleDate(sale?: SaleListItem | null) {
  return sale?.createdAt || sale?.soldAt || sale?.date || null;
}

function saleStatus(sale?: SaleListItem | null) {
  const status = String(sale?.paymentStatus || sale?.status || "Paid").toUpperCase();

  if (status.includes("PARTIAL")) return "Partly paid";
  if (status.includes("UNPAID")) return "Not paid yet";
  if (status.includes("CREDIT")) return "Pay later";
  if (status.includes("PAID")) return "Paid";

  return status.replaceAll("_", " ").toLowerCase();
}

function statusTone(status: string): Tone {
  const normalized = status.toUpperCase();

  if (normalized.includes("PARTLY") || normalized.includes("LATER") || normalized.includes("NOT")) {
    return "amber";
  }

  return "green";
}

function receiptItems(receipt?: SaleReceiptResponse | null, sale?: SaleListItem | null) {
  if (Array.isArray(receipt?.items)) return receipt.items;
  if (Array.isArray(receipt?.saleItems)) return receipt.saleItems;
  if (Array.isArray(sale?.items)) return sale.items;

  return [];
}

function receiptPayments(receipt?: SaleReceiptResponse | null, sale?: SaleListItem | null) {
  if (Array.isArray(receipt?.payments)) return receipt.payments;
  if (Array.isArray(sale?.payments)) return sale.payments;

  return [];
}

function paymentsTotal(payments: SaleReceiptPayment[]) {
  return payments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);
}

function paidAmount(sale?: SaleListItem | null, payments: SaleReceiptPayment[] = []) {
  const paymentTotal = paymentsTotal(payments);

  if (!sale) return paymentTotal;

  const summaryPaid = safeNumber(sale.amountPaid ?? sale.paidAmount ?? 0);

  return Math.max(summaryPaid, paymentTotal);
}

function amountLeft(sale?: SaleListItem | null, payments: SaleReceiptPayment[] = []) {
  if (!sale) return 0;

  const explicitBalance = sale.balanceDue;

  if (explicitBalance !== undefined && explicitBalance !== null && explicitBalance !== "") {
    return safeNumber(explicitBalance);
  }

  return Math.max(0, saleAmount(sale) - paidAmount(sale, payments));
}

function itemName(item: SaleReceiptItem) {
  return (
    item.name ||
    item.productName ||
    item.product?.name ||
    item.sku ||
    item.product?.sku ||
    "Sold item"
  );
}

function itemMeta(item: SaleReceiptItem) {
  return (
    item.serialNumber ||
    item.imei ||
    item.product?.serialNumber ||
    item.product?.imei ||
    item.sku ||
    item.product?.sku ||
    "Item details"
  );
}

function itemQuantity(item: SaleReceiptItem) {
  return safeNumber(item.quantity ?? item.qty ?? 1) || 1;
}

function itemUnitPrice(item: SaleReceiptItem) {
  return safeNumber(item.unitPrice ?? item.price ?? 0);
}

function itemLineTotal(item: SaleReceiptItem) {
  const provided = safeNumber(item.lineTotal ?? item.totalAmount ?? item.total ?? 0);
  if (provided > 0) return provided;

  return itemQuantity(item) * itemUnitPrice(item);
}

function cleanPaymentMethod(value?: string | null) {
  const text = String(value || "").trim();
  const upper = text.toUpperCase();

  if (!text) return "Payment";
  if (upper === "CASH") return "Cash";
  if (upper === "MOMO") return "MoMo";
  if (upper === "CARD") return "Card";
  if (upper === "BANK") return "Bank";
  if (upper === "OTHER") return "Other";

  return text;
}

function paymentMethod(payment: SaleReceiptPayment) {
  return cleanPaymentMethod(payment.paymentMethod || payment.method);
}

function paymentDate(payment: SaleReceiptPayment) {
  return payment.paidAt || payment.createdAt || null;
}

function paymentAmount(payment: SaleReceiptPayment) {
  return safeNumber(payment.amount);
}

function parsePaymentNote(payment: SaleReceiptPayment) {
  const rawNote = String(payment.note || "").trim();
  const rawReference = String(payment.reference || "").trim();
  const method = cleanPaymentMethod(payment.paymentMethod || payment.method);

  if (!rawNote.includes("•")) {
    return {
      title: rawNote || "Payment received",
      receipt: "",
      method,
      reference: rawReference,
      note: rawNote && rawNote !== "Payment received" ? rawNote : "",
    };
  }

  const parts = rawNote
    .split("•")
    .map((item) => item.trim())
    .filter(Boolean);

  const [title, receipt, noteMethod, noteReference] = parts;

  return {
    title: title || "Payment received",
    receipt: receipt || "",
    method: cleanPaymentMethod(noteMethod || method),
    reference: rawReference || noteReference || "",
    note: "",
  };
}

function drawerIsOpen(value: unknown) {
  return Boolean((value as { openSession?: { id?: string | null } } | null)?.openSession?.id);
}

function drawerBlocksCashSales(value: unknown) {
  return Boolean(
    (value as { settings?: { blockCashSales?: boolean | null } } | null)?.settings
      ?.blockCashSales ?? true,
  );
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

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 3) return "32%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function getColumns(width: number, type: "summary" | "details" | "sections") {
  if (type === "summary") {
    if (width >= 680) return 2;
    return 1;
  }

  if (type === "details") {
    if (width >= 680) return 2;
    return 1;
  }

  if (width >= 720) return 2;
  return 1;
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
    <View style={[styles.summaryCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.summaryTop}>
        <View style={[styles.smallIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
          <Ionicons name={icon} size={15} color={spec.fg} />
        </View>

        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          {label}
        </AppText>
      </View>

      {isMoney ? (
        <MoneyText value={value} color={palette.text} compact={compact} />
      ) : (
        <AppText variant="label" color={palette.text}>
          {value}
        </AppText>
      )}

      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
        {helper}
      </AppText>
    </View>
  );
}

function CustomerDocumentPanel({
  documentId,
  receiptNumber,
  palette,
}: {
  documentId: string;
  receiptNumber: string;
  palette: AppShellPalette;
}) {
  const spec = toneSpec("cyan", palette);

  function openReceiptDocument() {
    if (documentId) {
      router.push(`/(app)/documents/receipts/${encodeURIComponent(documentId)}` as Href);
      return;
    }

    router.push(routes.documents as Href);
  }

  return (
    <View
      style={[
        styles.documentPanel,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <View style={styles.documentPanelTop}>
        <View style={[styles.documentIcon, { backgroundColor: spec.solid }]}>
          <Ionicons name="document-text-outline" size={17} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color={palette.text}>
            Customer document
          </AppText>

          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            Open the customer receipt for preview, download, printing, or sharing.
          </AppText>
        </View>
      </View>

      <View
        style={[
          styles.documentMetaBox,
          {
            borderColor: palette.border,
            backgroundColor: palette.panel,
          },
        ]}
      >
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          Receipt
        </AppText>

        <AppText variant="label" color={palette.text}>
          {receiptNumber}
        </AppText>
      </View>

      <Pressable
        onPress={openReceiptDocument}
        style={({ pressed }) => [
          styles.documentButton,
          {
            backgroundColor: spec.solid,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <Ionicons name="open-outline" size={16} color="#06111F" />

        <AppText variant="label" color="#06111F">
          Open customer receipt
        </AppText>
      </Pressable>
    </View>
  );
}

function InfoBox({
  label,
  value,
  palette,
  width,
}: {
  label: string;
  value: string;
  palette: AppShellPalette;
  width: DimensionValue;
}) {
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

      <AppText variant="label" color={palette.text} style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

function SectionTitle({
  title,
  helper,
  palette,
}: {
  title: string;
  helper: string;
  palette: AppShellPalette;
}) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="subtitle" color={palette.text}>
        {title}
      </AppText>

      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
        {helper}
      </AppText>
    </View>
  );
}

function MethodChip({
  label,
  active,
  palette,
  onPress,
}: {
  label: string;
  active: boolean;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(active ? "cyan" : "slate", palette);

  return (
    <Pressable
      onPress={onPress}
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
        {label}
      </AppText>
    </Pressable>
  );
}

function ReceiptSkeleton({
  palette,
  layoutWidth,
}: {
  palette: AppShellPalette;
  layoutWidth: number;
}) {
  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const sectionWidth = widthForColumns(getColumns(layoutWidth, "sections"));

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
            <Skeleton height={14} width="38%" />
            <Skeleton height={26} width="70%" />
            <Skeleton height={14} width="78%" />
          </View>
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ width: summaryWidth }}>
            <Skeleton height={104} width="100%" />
          </View>
        ))}
      </View>

      <View style={styles.twoColumnSections}>
        {[1, 2].map((section) => (
          <View key={section} style={[styles.sectionColumn, { width: sectionWidth }]}>
            <Skeleton height={24} width="54%" />
            <Skeleton height={124} width="100%" />
          </View>
        ))}
      </View>
    </View>
  );
}

function ItemCard({
  item,
  palette,
  compact,
}: {
  item: SaleReceiptItem;
  palette: AppShellPalette;
  compact: boolean;
}) {
  return (
    <View style={[styles.itemCard, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.itemTop}>
        <View style={styles.itemIcon}>
          <Ionicons name="cube-outline" size={16} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color={palette.text}>
            {itemName(item)}
          </AppText>

          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            {itemMeta(item)}
          </AppText>
        </View>
      </View>

      <View style={styles.itemMetaGrid}>
        <InfoBox label="Quantity" value={String(itemQuantity(item))} palette={palette} width="100%" />
        <InfoBox
          label="Unit price"
          value={formatMoney(itemUnitPrice(item), { compact })}
          palette={palette}
          width="100%"
        />
      </View>

      <View style={styles.itemTotal}>
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          Item total
        </AppText>

        <MoneyText value={formatMoney(itemLineTotal(item), { compact })} color={palette.text} compact={compact} />
      </View>
    </View>
  );
}

function PaymentCard({
  payment,
  palette,
  compact,
}: {
  payment: SaleReceiptPayment;
  palette: AppShellPalette;
  compact: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const details = parsePaymentNote(payment);
  const hasExtraDetails = Boolean(details.receipt || details.reference || details.note);

  return (
    <View style={[styles.itemCard, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.itemTop}>
        <View style={styles.itemIcon}>
          <Ionicons name="card-outline" size={16} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color={palette.text}>
            {details.title}
          </AppText>

          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            {formatDateTime(paymentDate(payment))}
          </AppText>
        </View>
      </View>

      <View style={styles.paymentMetaGrid}>
        <InfoBox label="Method" value={details.method} palette={palette} width="100%" />

        <View style={styles.itemTotal}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Amount received
          </AppText>

          <MoneyText value={formatMoney(paymentAmount(payment), { compact })} color={palette.text} compact={compact} />
        </View>

        {hasExtraDetails ? (
          <Pressable
            onPress={() => setExpanded((current) => !current)}
            style={styles.detailsToggle}
          >
            <AppText variant="caption" color={palette.cyan}>
              {expanded ? "Hide more details" : "View more details"}
            </AppText>

            <Ionicons
              name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
              size={15}
              color={palette.cyan}
            />
          </Pressable>
        ) : null}

        {expanded && details.receipt ? (
          <InfoBox label="Receipt" value={details.receipt} palette={palette} width="100%" />
        ) : null}

        {expanded && details.reference ? (
          <InfoBox label="Payment note" value={details.reference} palette={palette} width="100%" />
        ) : null}

        {expanded && details.note ? (
          <InfoBox label="Note" value={details.note} palette={palette} width="100%" />
        ) : null}
      </View>
    </View>
  );
}

function AddPaymentPanel({
  saleId,
  branchId,
  amountLeftValue,
  palette,
  drawerOpen,
  drawerBlocksCash,
  compact,
  onPaymentAdded,
}: {
  saleId: string;
  branchId?: string | null;
  amountLeftValue: number;
  palette: AppShellPalette;
  drawerOpen: boolean;
  drawerBlocksCash: boolean;
  compact: boolean;
  onPaymentAdded: () => Promise<void>;
}) {
  const addPayment = useAddSalePayment();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<SalesPaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const amountNumber = safeNumber(amount);
  const cashBlocked = method === "CASH" && drawerBlocksCash && !drawerOpen;

  async function submitPayment() {
    setFormError("");

    if (!saleId) {
      setFormError("This sale could not be found.");
      return;
    }

    if (amountNumber <= 0) {
      setFormError("Enter the amount the customer paid.");
      return;
    }

    if (amountLeftValue > 0 && amountNumber > amountLeftValue) {
      setFormError("The payment cannot be more than the amount left.");
      return;
    }

    if (cashBlocked) {
      setFormError("Open the cash drawer before recording a cash payment.");
      return;
    }

    try {
      await addPayment.mutateAsync({
        saleId,
        branchId,
        amount: amountNumber,
        paymentMethod: method,
        note: note.trim() || null,
      });

      setAmount("");
      setMethod("CASH");
      setNote("");

      await onPaymentAdded();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment could not be saved.";
      setFormError(message);
    }
  }

  return (
    <View
      style={[
        styles.addPaymentPanel,
        {
          borderColor: toneSpec("cyan", palette).border,
          backgroundColor: toneSpec("cyan", palette).bg,
        },
      ]}
    >
      <View style={styles.addPaymentTop}>
        <View style={styles.itemIcon}>
          <Ionicons name="add-circle-outline" size={16} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color={palette.text}>
            Add customer payment
          </AppText>

          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            Amount left: {formatMoney(amountLeftValue, { compact })}
          </AppText>
        </View>
      </View>

      <AppTextInput
        label="Amount paid"
        value={amount}
        onChangeText={(value) => {
          setAmount(normalizeMoney(value));
          setFormError("");
        }}
        placeholder="0"
        keyboardType="numeric"
      />

      <View style={styles.methodWrap}>
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          Payment method
        </AppText>

        <View style={styles.methodGrid}>
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <MethodChip
              key={option.value}
              label={option.label}
              active={method === option.value}
              palette={palette}
              onPress={() => {
                setMethod(option.value);
                setFormError("");
              }}
            />
          ))}
        </View>
      </View>

      {method === "CASH" ? (
        <View
          style={[
            styles.cashNotice,
            {
              borderColor: toneSpec(drawerOpen ? "green" : "amber", palette).border,
              backgroundColor: toneSpec(drawerOpen ? "green" : "amber", palette).bg,
            },
          ]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="label" color={palette.text}>
              Cash drawer: {drawerOpen ? "Open" : "Closed"}
            </AppText>

            <AppText variant="caption" color={palette.soft} style={styles.cardText}>
              {drawerOpen
                ? "Cash payment can be saved."
                : "Open the cash drawer before taking cash."}
            </AppText>
          </View>

          {!drawerOpen ? (
            <Pressable
              onPress={() => router.push(routes.cashDrawer as Href)}
              style={styles.openDrawerButton}
            >
              <AppText variant="caption" color="#06111F">
                Open
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <AppTextInput
        label="Payment note"
        value={note}
        onChangeText={(value) => {
          setNote(value);
          setFormError("");
        }}
        placeholder="Example: customer paid from MoMo"
      />

      {formError ? (
        <View style={styles.errorBox}>
          <AppText variant="caption" color="#FCA5A5">
            {formError}
          </AppText>
        </View>
      ) : null}

      <AsyncButton
        fullWidth
        disabled={addPayment.isPending || cashBlocked}
        onPress={submitPayment}
        style={styles.recordPaymentButton}
      >
        {cashBlocked ? "Open cash drawer first" : "Save payment"}
      </AsyncButton>
    </View>
  );
}

export default function SaleReceiptScreen() {
  const { width } = useWindowDimensions();

  const layoutWidth = Math.min(width, 720);
  const compact = layoutWidth < 560;

  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const saleId = Array.isArray(params.id) ? params.id[0] : params.id;
  const receiptQuery = useSaleReceipt(saleId, activeBranch?.id);
  const drawerQuery = useCashDrawerStatus();

  const receipt = receiptQuery.data;
  const sale = useMemo(() => receiptSale(receipt), [receipt]);
  const items = useMemo(() => receiptItems(receipt, sale), [receipt, sale]);
  const payments = useMemo(() => receiptPayments(receipt, sale), [receipt, sale]);

  const documentId = useMemo(
  () => receiptDocumentId(receipt, sale, saleId),
  [receipt, sale, saleId],
);

  const saleTotal = sale ? saleAmount(sale) : 0;
  const paid = paidAmount(sale, payments);
  const left = amountLeft(sale, payments);
  const status = saleStatus(sale);
  const drawerOpen = drawerIsOpen(drawerQuery.data);
  const drawerBlocksCash = drawerBlocksCashSales(drawerQuery.data);

  const isLoading = isHydrating || !user || !tenant || receiptQuery.isLoading;

  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const detailWidth = widthForColumns(getColumns(layoutWidth, "details"));
  const sectionWidth = widthForColumns(getColumns(layoutWidth, "sections"));

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <ReceiptSkeleton palette={palette} layoutWidth={layoutWidth} />
        ) : (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <AppBackButton label="Back to sales list" to={routes.salesList} palette={palette} />

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
                  <Ionicons name="receipt-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />

                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      Sale details
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    {receiptTitle(receipt, sale)}
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    See what was sold, how much was paid, and what is still left.
                  </AppText>
                </View>

                {!compact ? (
                  <StatusPill label={status} tone={statusTone(status)} palette={palette} />
                ) : null}
              </View>

              {compact ? (
                <View style={styles.compactStatusRow}>
                  <StatusPill label={status} tone={statusTone(status)} palette={palette} />
                </View>
              ) : null}
            </View>

            <CustomerDocumentPanel
              documentId={documentId}
              receiptNumber={receiptTitle(receipt, sale)}
              palette={palette}
            />

            {receiptQuery.isError ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    borderColor: toneSpec("red", palette).border,
                    backgroundColor: toneSpec("red", palette).bg,
                  },
                ]}
              >
                <AppText variant="label" color="#FCA5A5">
                  Could not load this sale.
                </AppText>

                <AsyncButton
                  fullWidth
                  onPress={async () => {
                    await receiptQuery.refetch();
                  }}
                  style={styles.retryButton}
                >
                  Try again
                </AsyncButton>
              </View>
            ) : null}

            <View style={styles.responsiveGrid}>
              <SummaryCard
                label="Sale total"
                value={formatMoney(saleTotal, { compact })}
                helper="Full sale amount"
                icon="cash-outline"
                tone="cyan"
                palette={palette}
                width={summaryWidth}
                isMoney
                compact={compact}
              />

              <SummaryCard
                label="Money received"
                value={formatMoney(paid, { compact })}
                helper="Customer has paid"
                icon="checkmark-circle-outline"
                tone="green"
                palette={palette}
                width={summaryWidth}
                isMoney
                compact={compact}
              />

              <SummaryCard
                label="Still to pay"
                value={formatMoney(left, { compact })}
                helper={left > 0 ? "Customer still needs to pay" : "Fully paid"}
                icon="time-outline"
                tone={left > 0 ? "amber" : "slate"}
                palette={palette}
                width={summaryWidth}
                isMoney
                compact={compact}
              />

              <SummaryCard
                label="Status"
                value={status}
                helper="Payment status"
                icon="shield-checkmark-outline"
                tone={statusTone(status)}
                palette={palette}
                width={summaryWidth}
                compact={compact}
              />
            </View>

            <View
              style={[
                styles.infoPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.responsiveGrid}>
                <InfoBox
                  label="Customer"
                  value={customerLabel(sale)}
                  palette={palette}
                  width={detailWidth}
                />

                <InfoBox
                  label="Date and time"
                  value={formatDateTime(saleDate(sale))}
                  palette={palette}
                  width={detailWidth}
                />

                <InfoBox
                  label="Payment method"
                  value={cleanPaymentMethod(String(sale?.paymentMethod || ""))}
                  palette={palette}
                  width={detailWidth}
                />

                <InfoBox
                  label="Selling location"
                  value={receipt?.branch?.name || activeBranch?.name || "Main selling location"}
                  palette={palette}
                  width={detailWidth}
                />
              </View>
            </View>

            {left > 0 && saleId ? (
              <AddPaymentPanel
                saleId={saleId}
                branchId={activeBranch?.id}
                amountLeftValue={left}
                palette={palette}
                drawerOpen={drawerOpen}
                drawerBlocksCash={drawerBlocksCash}
                compact={compact}
                onPaymentAdded={async () => {
                  await Promise.all([receiptQuery.refetch(), drawerQuery.refetch()]);
                }}
              />
            ) : null}

            <View style={styles.twoColumnSections}>
              <View style={[styles.sectionColumn, { width: sectionWidth }]}>
                <SectionTitle
                  title="Items sold"
                  helper={
                    items.length > 0
                      ? `${items.length} item${items.length === 1 ? "" : "s"} on this sale`
                      : "No sold items were returned for this sale"
                  }
                  palette={palette}
                />

                {items.length === 0 ? (
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
                      No item details yet
                    </AppText>

                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      The sale opened, but item details were not returned yet.
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.sectionList}>
                    {items.map((item, index) => (
                      <ItemCard
                        key={item.id || `${itemName(item)}-${index}`}
                        item={item}
                        palette={palette}
                        compact={compact}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={[styles.sectionColumn, { width: sectionWidth }]}>
                <SectionTitle
                  title="Payments received"
                  helper={
                    payments.length > 0
                      ? `${payments.length} payment${payments.length === 1 ? "" : "s"} saved`
                      : "No payment details were returned for this sale"
                  }
                  palette={palette}
                />

                {payments.length > 0 ? (
                  <View style={styles.sectionList}>
                    {payments.map((payment, index) => (
                      <PaymentCard
                        key={payment.id || `${paymentMethod(payment)}-${index}`}
                        payment={payment}
                        palette={palette}
                        compact={compact}
                      />
                    ))}
                  </View>
                ) : (
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
                      No payment details yet
                    </AppText>

                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      The sale summary is available, but payment details were not returned yet.
                    </AppText>
                  </View>
                )}
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

  twoColumnSections: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  sectionColumn: {
    gap: 10,
  },

  sectionList: {
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

  statusPillText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  infoPanel: {
    borderWidth: 1,
    padding: 14,
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

  sectionTitle: {
    gap: 4,
  },

  itemCard: {
    minHeight: 142,
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  itemTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  itemIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  itemMetaGrid: {
    gap: 8,
  },

  itemTotal: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 10,
    gap: 4,
  },

  paymentMetaGrid: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 10,
    gap: 8,
  },

  detailsToggle: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  addPaymentPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  addPaymentTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  methodWrap: {
    gap: 8,
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

  cashNotice: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  openDrawerButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  recordPaymentButton: {
    minHeight: 54,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
  },

  emptyBox: {
    borderWidth: 1,
    padding: 14,
    gap: 5,
  },

  errorBox: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },

  retryButton: {
    minHeight: 48,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
  },

  documentPanel: {
  borderWidth: 1,
  padding: 14,
  gap: 12,
},

documentPanelTop: {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
},

documentIcon: {
  width: 34,
  height: 34,
  alignItems: "center",
  justifyContent: "center",
},

documentMetaBox: {
  borderWidth: 1,
  padding: 12,
  gap: 5,
},

documentButton: {
  minHeight: 48,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},

  cardText: {
    lineHeight: 18,
  },
});