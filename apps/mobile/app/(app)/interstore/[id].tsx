import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  dealRemainingQuantity,
  dealReturnedQuantity,
  dealSoldQuantity,
  dealQuantity,
  useAddInterStorePayment,
  useInterStoreDeal,
  useInterStorePayments,
  useMarkInterStorePaid,
  useReceiveInterStoreDeal,
  useReturnInterStoreDeal,
  useSellInterStoreDeal,
} from "../../../src/features/interstore/hooks";
import type {
  InterStoreDeal,
  InterStorePayment,
  InterStorePaymentMethod,
  InterStorePaymentSummary,
} from "../../../src/features/interstore/types";
import { useBranchStore } from "../../../src/store/branchStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type SaleForm = {
  soldQuantity: string;
  soldPrice: string;
};

type ReturnForm = {
  returnedQuantity: string;
};

type PaymentForm = {
  amount: string;
  method: InterStorePaymentMethod;
  note: string;
};

type PaidForm = {
  amount: string;
  method: InterStorePaymentMethod;
};

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: unknown) {
  return `RWF ${Math.round(toNumber(value, 0)).toLocaleString()}`;
}

function toDateLabel(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toDateTimeLabel(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function statusMeta(status: unknown): { label: string; tone: Tone; icon: IoniconName } {
  const key = String(status || "").toUpperCase();

  if (key === "BORROWED") return { label: "Borrowed", tone: "amber", icon: "time-outline" };
  if (key === "RECEIVED") return { label: "Received", tone: "blue", icon: "download-outline" };
  if (key === "SOLD") return { label: "Sold", tone: "cyan", icon: "cash-outline" };
  if (key === "PAID") return { label: "Paid", tone: "green", icon: "checkmark-done-outline" };
  if (key === "RETURNED") return { label: "Returned", tone: "slate", icon: "return-up-back-outline" };

  return { label: key || "Unknown", tone: "slate", icon: "help-circle-outline" };
}

function branchName(deal: InterStoreDeal | null | undefined) {
  const branch = deal?.branch || deal?.borrowerBranch || null;
  const code = clean(branch?.code, "");
  const name = clean(branch?.name, "");
  if (code && name) return `${code} · ${name}`;
  return name || code || "Current selling location";
}

function supplierLabel(deal: InterStoreDeal | null | undefined) {
  if (!deal) return "—";
  if (deal.supplierTenantId) return "Internal store";
  return clean(deal.externalSupplierName, "External supplier");
}

function getColumns(width: number) {
  if (width >= 760) return 4;
  if (width >= 430) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function SummaryCard({
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
    <View style={[styles.summaryCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.summaryTop}>
        <View style={[styles.summaryIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <Ionicons name={icon} size={16} color={spec.fg} />
        </View>
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      </View>
      <AppText variant="subtitle" color={palette.text}>{value}</AppText>
      <AppText variant="caption" color={palette.soft} style={styles.cardText}>{helper}</AppText>
    </View>
  );
}

function InfoBox({ label, value, helper, palette }: { label: string; value: string; helper?: string; palette: AppShellPalette }) {
  return (
    <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      <AppText variant="label" color={palette.text} style={styles.infoValue}>{value}</AppText>
      {helper ? <AppText variant="caption" color={palette.soft} style={styles.cardText}>{helper}</AppText> : null}
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  palette,
  keyboardType = "default",
  multiline = false,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  palette: AppShellPalette;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.soft}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        style={[
          styles.input,
          multiline ? styles.textArea : null,
          { borderColor: palette.border, backgroundColor: palette.panel, color: palette.text },
        ]}
      />
    </View>
  );
}

function ScreenSkeleton({ palette, layoutWidth }: { palette: AppShellPalette; layoutWidth: number }) {
  const cardWidth = widthForColumns(getColumns(layoutWidth));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <View style={[styles.headerCard, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.08)" }]}> 
        <Skeleton height={16} width="34%" />
        <Skeleton height={30} width="72%" />
        <Skeleton height={14} width="60%" />
      </View>
      <View style={styles.responsiveGrid}>{[1, 2, 3, 4].map((item) => <View key={item} style={{ width: cardWidth }}><Skeleton height={112} width="100%" /></View>)}</View>
      <Skeleton height={240} width="100%" />
      <Skeleton height={210} width="100%" />
    </View>
  );
}

function PaymentRow({ payment, palette }: { payment: InterStorePayment; palette: AppShellPalette }) {
  return (
    <View style={[styles.paymentRow, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>{money(payment.amount)}</AppText>
        <AppText variant="caption" color={palette.soft}>{clean(payment.method)} · {toDateTimeLabel(payment.createdAt)}</AppText>
        {payment.note ? <AppText variant="caption" color={palette.soft} style={styles.cardText}>{payment.note}</AppText> : null}
      </View>
      <Ionicons name="receipt-outline" size={20} color={palette.cyan} />
    </View>
  );
}

export default function InterStoreDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] || "" : params.id || "";
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(width, 760);
  const summaryWidth = widthForColumns(getColumns(layoutWidth));

  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const scopeParams = useMemo(() => ({ branchId: activeBranchId }), [activeBranchId]);

  const dealQuery = useInterStoreDeal(id, scopeParams);
  const paymentsQuery = useInterStorePayments(id, scopeParams);
  const receiveDeal = useReceiveInterStoreDeal(scopeParams);
  const sellDeal = useSellInterStoreDeal(scopeParams);
  const returnDeal = useReturnInterStoreDeal(scopeParams);
  const addPayment = useAddInterStorePayment(scopeParams);
  const markPaid = useMarkInterStorePaid(scopeParams);

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState<SaleForm>({ soldQuantity: "1", soldPrice: "" });
  const [returnForm, setReturnForm] = useState<ReturnForm>({ returnedQuantity: "1" });
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ amount: "", method: "CASH", note: "" });
  const [paidForm, setPaidForm] = useState<PaidForm>({ amount: "", method: "CASH" });

  const deal = dealQuery.data || null;
  const payments = paymentsQuery.data?.payments || [];
  const summary = paymentsQuery.data?.summary || { owed: 0, totalPaid: 0, balanceDue: 0, count: 0 };
  const status = String(deal?.status || "").toUpperCase();
  const meta = statusMeta(status);
  const isLoading = dealQuery.isLoading || paymentsQuery.isLoading;

  function refreshAll() {
    void Promise.all([dealQuery.refetch(), paymentsQuery.refetch()]);
  }

  async function confirmReceive() {
    if (!deal?.id) return;

    Alert.alert(
      "Receive this movement?",
      "Confirm only when the product is physically inside this selling location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Receive",
          onPress: async () => {
            await receiveDeal.mutateAsync(deal.id);
            refreshAll();
          },
        },
      ],
    );
  }

  async function saveSale() {
    if (!deal?.id) return;

    const soldQuantity = Number(saleForm.soldQuantity);
    const soldPrice = saleForm.soldPrice.trim() ? Number(saleForm.soldPrice) : undefined;

    if (!Number.isInteger(soldQuantity) || soldQuantity <= 0) {
      Alert.alert("Check sale", "Sold quantity must be greater than 0.");
      return;
    }

    if (soldPrice !== undefined && (!Number.isFinite(soldPrice) || soldPrice <= 0)) {
      Alert.alert("Check sale", "Sold price must be greater than 0.");
      return;
    }

    await sellDeal.mutateAsync({ id: deal.id, payload: { soldQuantity, soldPrice } });
    setSaleModalOpen(false);
    refreshAll();
  }

  async function saveReturn() {
    if (!deal?.id) return;

    const returnedQuantity = Number(returnForm.returnedQuantity);
    if (!Number.isInteger(returnedQuantity) || returnedQuantity <= 0) {
      Alert.alert("Check return", "Returned quantity must be greater than 0.");
      return;
    }

    await returnDeal.mutateAsync({ id: deal.id, payload: { returnedQuantity } });
    setReturnModalOpen(false);
    refreshAll();
  }

  async function savePayment() {
    if (!deal?.id) return;

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Check payment", "Payment amount must be greater than 0.");
      return;
    }

    await addPayment.mutateAsync({
      id: deal.id,
      payload: { amount, method: paymentForm.method, note: paymentForm.note.trim() || null },
    });
    setPaymentForm({ amount: "", method: "CASH", note: "" });
    setPaymentModalOpen(false);
    refreshAll();
  }

  async function savePaid() {
    if (!deal?.id) return;

    const amount = Number(paidForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Check payment", "Paid amount must be greater than 0.");
      return;
    }

    await markPaid.mutateAsync({ id: deal.id, payload: { paidAmount: amount, paymentMethod: paidForm.method } });
    setPaidModalOpen(false);
    refreshAll();
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <ScreenSkeleton palette={palette} layoutWidth={layoutWidth} />
        ) : !deal ? (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Ionicons name="warning-outline" size={34} color={toneSpec("amber", palette).fg} />
              <AppText variant="subtitle" color={palette.text} center>Movement not found</AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>This movement could not be loaded.</AppText>
              <AsyncButton onPress={() => router.replace(routes.interstore)} variant="secondary">Back to inter-store</AsyncButton>
            </View>
          </View>
        ) : (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <View style={[styles.topBar, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Pressable onPress={() => router.replace(routes.interstore)} style={[styles.backButton, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
                <Ionicons name="chevron-back-outline" size={19} color={palette.text} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Inter-store detail</AppText>
                <AppText variant="subtitle" color={palette.text}>{clean(deal.productName, "Movement record")}</AppText>
              </View>
              <View style={[styles.statusPill, { borderColor: toneSpec(meta.tone, palette).border, backgroundColor: toneSpec(meta.tone, palette).bg }]}> 
                <AppText variant="caption" color={toneSpec(meta.tone, palette).fg} style={styles.statusText}>{meta.label}</AppText>
              </View>
            </View>

            <View style={[styles.headerCard, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.10)" }]}> 
              <View style={styles.headerRow}>
                <View style={[styles.heroIcon, { backgroundColor: toneSpec(meta.tone, palette).solid }]}> 
                  <Ionicons name={meta.icon} size={22} color="#06111F" />
                </View>
                <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Movement control</AppText>
                  <AppText variant="subtitle" color={palette.text}>Track receipt, sale, return, and payment.</AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>Supplier: {supplierLabel(deal)} · Selling location: {branchName(deal)}</AppText>
                </View>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              <SummaryCard label="Taken" value={`${dealQuantity(deal)} units`} helper="Original quantity" icon="cube-outline" tone="cyan" palette={palette} width={summaryWidth} />
              <SummaryCard label="Sold" value={`${dealSoldQuantity(deal)} units`} helper="Recorded sales" icon="cash-outline" tone="green" palette={palette} width={summaryWidth} />
              <SummaryCard label="Returned" value={`${dealReturnedQuantity(deal)} units`} helper="Returned units" icon="return-up-back-outline" tone="slate" palette={palette} width={summaryWidth} />
              <SummaryCard label="Left" value={`${dealRemainingQuantity(deal)} units`} helper="Still active" icon="layers-outline" tone={dealRemainingQuantity(deal) > 0 ? "amber" : "green"} palette={palette} width={summaryWidth} />
            </View>

            <View style={[styles.sectionCard, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <View style={styles.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Record details</AppText>
                  <AppText variant="subtitle" color={palette.text}>Movement overview</AppText>
                </View>
                <AsyncButton onPress={refreshAll} variant="secondary" style={styles.smallButton}>Refresh</AsyncButton>
              </View>

              <View style={styles.infoGrid}>
                <InfoBox label="Product" value={clean(deal.productName)} helper={clean(deal.serial, "No serial/reference")} palette={palette} />
                <InfoBox label="Supplier" value={supplierLabel(deal)} helper={clean(deal.externalSupplierPhone, "No supplier phone")} palette={palette} />
                <InfoBox label="Reseller" value={clean(deal.resellerName)} helper={clean(deal.resellerPhone, "No phone")} palette={palette} />
                <InfoBox label="Due date" value={toDateLabel(deal.dueDate)} helper="Expected settlement date" palette={palette} />
              </View>

              <View style={styles.detailStack}>
                <View style={styles.detailRow}><AppText variant="caption" color={palette.soft}>Agreed price</AppText><AppText variant="caption" color={palette.text}>{money(deal.agreedPrice)}</AppText></View>
                <View style={styles.detailRow}><AppText variant="caption" color={palette.soft}>Sold price</AppText><AppText variant="caption" color={palette.text}>{deal.soldPrice == null ? "Not recorded" : money(deal.soldPrice)}</AppText></View>
                <View style={styles.detailRow}><AppText variant="caption" color={palette.soft}>Created</AppText><AppText variant="caption" color={palette.text}>{toDateTimeLabel(deal.createdAt)}</AppText></View>
                <View style={styles.detailRow}><AppText variant="caption" color={palette.soft}>Last update</AppText><AppText variant="caption" color={palette.text}>{toDateTimeLabel(deal.updatedAt)}</AppText></View>
              </View>

              {deal.notes ? <View style={[styles.noteBox, { borderColor: palette.border, backgroundColor: palette.stage }]}><AppText variant="caption" color={palette.soft} style={styles.cardText}>{deal.notes}</AppText></View> : null}
            </View>

            <View style={[styles.sectionCard, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Allowed actions</AppText>
              <AppText variant="subtitle" color={palette.text}>What can be done now</AppText>

              <View style={styles.actionGrid}>
                {status === "BORROWED" ? (
                  <>
                    <AsyncButton onPress={confirmReceive} variant="primary" style={styles.actionButton} disabled={receiveDeal.isPending}>{receiveDeal.isPending ? "Receiving" : "Receive"}</AsyncButton>
                    <AsyncButton onPress={() => setReturnModalOpen(true)} variant="secondary" style={styles.actionButton}>Return</AsyncButton>
                  </>
                ) : null}

                {status === "RECEIVED" ? (
                  <>
                    <AsyncButton onPress={() => setSaleModalOpen(true)} variant="primary" style={styles.actionButton}>Record sale</AsyncButton>
                    <AsyncButton onPress={() => setReturnModalOpen(true)} variant="secondary" style={styles.actionButton}>Return</AsyncButton>
                  </>
                ) : null}

                {status === "SOLD" ? (
                  <>
                    <AsyncButton onPress={() => setPaymentModalOpen(true)} variant="primary" style={styles.actionButton}>Record payment</AsyncButton>
                    <AsyncButton onPress={() => { setPaidForm((current) => ({ ...current, amount: String(summary.balanceDue || summary.owed || "") })); setPaidModalOpen(true); }} variant="secondary" style={styles.actionButton}>Mark paid</AsyncButton>
                  </>
                ) : null}

                {status === "PAID" || status === "RETURNED" ? (
                  <View style={[styles.closedPanel, { borderColor: palette.border, backgroundColor: palette.stage }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={palette.soft} />
                    <AppText variant="caption" color={palette.soft} center>This record is closed for action.</AppText>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={[styles.sectionCard, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <View style={styles.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Settlement</AppText>
                  <AppText variant="subtitle" color={palette.text}>Payment progress</AppText>
                </View>
              </View>

              <View style={styles.responsiveGrid}>
                <SummaryCard label="Owed" value={money(summary.owed)} helper="Based on sale" icon="wallet-outline" tone={summary.owed > 0 ? "amber" : "slate"} palette={palette} width={summaryWidth} />
                <SummaryCard label="Paid" value={money(summary.totalPaid)} helper={`${summary.count} payment(s)`} icon="receipt-outline" tone={summary.totalPaid > 0 ? "green" : "slate"} palette={palette} width={summaryWidth} />
                <SummaryCard label="Balance" value={money(summary.balanceDue)} helper="Still unpaid" icon="alert-circle-outline" tone={summary.balanceDue > 0 ? "red" : "green"} palette={palette} width={summaryWidth} />
                <SummaryCard label="Status" value={statusMeta(deal.status).label} helper="Current stage" icon="flag-outline" tone={meta.tone} palette={palette} width={summaryWidth} />
              </View>

              <View style={styles.paymentList}>
                {payments.length === 0 ? (
                  <View style={[styles.emptyInline, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
                    <AppText variant="caption" color={palette.soft} center>No payments recorded for this movement.</AppText>
                  </View>
                ) : payments.slice(0, 6).map((payment) => <PaymentRow key={payment.id} payment={payment} palette={palette} />)}
              </View>
            </View>

            <SaleModal open={saleModalOpen} palette={palette} form={saleForm} deal={deal} saving={sellDeal.isPending} onChange={(key, value) => setSaleForm((current) => ({ ...current, [key]: value }))} onClose={() => setSaleModalOpen(false)} onSave={saveSale} />
            <ReturnModal open={returnModalOpen} palette={palette} form={returnForm} deal={deal} saving={returnDeal.isPending} onChange={(value) => setReturnForm({ returnedQuantity: value })} onClose={() => setReturnModalOpen(false)} onSave={saveReturn} />
            <PaymentModal open={paymentModalOpen} palette={palette} form={paymentForm} summary={summary} saving={addPayment.isPending} onChange={(key, value) => setPaymentForm((current) => ({ ...current, [key]: value }))} onClose={() => setPaymentModalOpen(false)} onSave={savePayment} />
            <PaidModal open={paidModalOpen} palette={palette} form={paidForm} summary={summary} saving={markPaid.isPending} onChange={(key, value) => setPaidForm((current) => ({ ...current, [key]: value }))} onClose={() => setPaidModalOpen(false)} onSave={savePaid} />
          </View>
        )
      }
    </AppShell>
  );
}

function ModalFrame({
  open,
  palette,
  title,
  eyebrow,
  children,
  saving,
  saveLabel,
  danger = false,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  title: string;
  eyebrow: string;
  children: ReactNode;
  saving: boolean;
  saveLabel: string;
  danger?: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>{eyebrow}</AppText>
              <AppText variant="subtitle" color={palette.text}>{title}</AppText>
            </View>
            <Pressable onPress={onClose} style={[styles.closeButton, { borderColor: palette.border }]}> 
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>

          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>Cancel</AsyncButton>
            <AsyncButton onPress={onSave} variant={danger ? "danger" : "primary"} style={styles.footerButton} disabled={saving}>{saving ? "Saving" : saveLabel}</AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SaleModal({ open, palette, form, deal, saving, onChange, onClose, onSave }: { open: boolean; palette: AppShellPalette; form: SaleForm; deal: InterStoreDeal; saving: boolean; onChange: (key: keyof SaleForm, value: string) => void; onClose: () => void; onSave: () => Promise<void>; }) {
  return (
    <ModalFrame open={open} palette={palette} title="Record sale" eyebrow="Sale progress" saving={saving} saveLabel="Save sale" onClose={onClose} onSave={onSave}>
      <InfoBox label="Product" value={clean(deal.productName)} helper={`${dealRemainingQuantity(deal)} unit(s) left`} palette={palette} />
      <Field label="Sold quantity" value={form.soldQuantity} placeholder="1" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("soldQuantity", value)} />
      <Field label="Sold price" value={form.soldPrice} placeholder="Optional selling price" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("soldPrice", value)} />
    </ModalFrame>
  );
}

function ReturnModal({ open, palette, form, deal, saving, onChange, onClose, onSave }: { open: boolean; palette: AppShellPalette; form: ReturnForm; deal: InterStoreDeal; saving: boolean; onChange: (value: string) => void; onClose: () => void; onSave: () => Promise<void>; }) {
  return (
    <ModalFrame open={open} palette={palette} title="Record return" eyebrow="Return product" saving={saving} saveLabel="Save return" danger onClose={onClose} onSave={onSave}>
      <InfoBox label="Product" value={clean(deal.productName)} helper={`${dealRemainingQuantity(deal)} unit(s) left`} palette={palette} />
      <Field label="Returned quantity" value={form.returnedQuantity} placeholder="1" palette={palette} keyboardType="numeric" onChangeText={onChange} />
    </ModalFrame>
  );
}

function PaymentModal({ open, palette, form, summary, saving, onChange, onClose, onSave }: { open: boolean; palette: AppShellPalette; form: PaymentForm; summary: InterStorePaymentSummary; saving: boolean; onChange: (key: keyof PaymentForm, value: string) => void; onClose: () => void; onSave: () => Promise<void>; }) {
  return (
    <ModalFrame open={open} palette={palette} title="Record payment" eyebrow="Supplier settlement" saving={saving} saveLabel="Save payment" onClose={onClose} onSave={onSave}>
      <InfoBox label="Balance" value={money(summary.balanceDue)} helper="Amount still unpaid" palette={palette} />
      <Field label="Amount" value={form.amount} placeholder="0" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("amount", value)} />
      <Field label="Method" value={form.method} placeholder="CASH, MOMO, BANK, OTHER" palette={palette} onChangeText={(value) => onChange("method", value.toUpperCase() as InterStorePaymentMethod)} />
      <Field label="Note" value={form.note} placeholder="Optional payment note" palette={palette} multiline onChangeText={(value) => onChange("note", value)} />
    </ModalFrame>
  );
}

function PaidModal({ open, palette, form, summary, saving, onChange, onClose, onSave }: { open: boolean; palette: AppShellPalette; form: PaidForm; summary: InterStorePaymentSummary; saving: boolean; onChange: (key: keyof PaidForm, value: string) => void; onClose: () => void; onSave: () => Promise<void>; }) {
  return (
    <ModalFrame open={open} palette={palette} title="Mark as paid" eyebrow="Close settlement" saving={saving} saveLabel="Mark paid" onClose={onClose} onSave={onSave}>
      <InfoBox label="Balance" value={money(summary.balanceDue)} helper="Confirm exact paid amount" palette={palette} />
      <Field label="Paid amount" value={form.amount} placeholder="0" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("amount", value)} />
      <Field label="Method" value={form.method} placeholder="CASH, MOMO, BANK, OTHER" palette={palette} onChangeText={(value) => onChange("method", value.toUpperCase() as InterStorePaymentMethod)} />
    </ModalFrame>
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

  topBar: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  backButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerCard: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
    overflow: "hidden",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  heroIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
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
    width: 30,
    height: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  cardText: {
    flexShrink: 1,
    lineHeight: 18,
  },

  sectionCard: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  smallButton: {
    minHeight: 42,
    paddingHorizontal: 14,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  infoBox: {
    flexGrow: 1,
    flexBasis: "48%",
    minWidth: 150,
    borderWidth: 1,
    padding: 11,
    gap: 5,
  },

  infoValue: {
    lineHeight: 20,
  },

  detailStack: {
    gap: 8,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  noteBox: {
    borderWidth: 1,
    padding: 11,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    minWidth: 150,
    minHeight: 48,
  },

  closedPanel: {
    width: "100%",
    minHeight: 56,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  statusPill: {
    flexShrink: 0,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  statusText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  paymentList: {
    gap: 9,
  },

  paymentRow: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  emptyInline: {
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },

  emptyPanel: {
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },

  fieldWrap: {
    gap: 7,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontFamily: "Quicksand_600SemiBold",
    fontSize: 14,
  },

  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  modalCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "92%",
    borderWidth: 1,
    overflow: "hidden",
  },

  modalHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScroll: {
    maxHeight: 560,
  },

  modalBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },

  modalFooter: {
    padding: 16,
    flexDirection: "row",
    gap: 10,
  },

  footerButton: {
    flex: 1,
    minHeight: 52,
  },
});
