import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../../../src/components/app/AppShell";
import { AppText } from "../../../../../src/components/ui/AppText";
import { AsyncButton } from "../../../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../../../src/components/ui/Skeleton";
import { routes } from "../../../../../src/constants/routes";
import {
  draftCustomerName,
  useDeleteWhatsAppSaleDraft,
  useFinalizeWhatsAppSaleDraft,
  useUpdateWhatsAppSaleDraft,
  useWhatsAppSaleDraft,
} from "../../../../../src/features/whatsapp/hooks";
import type {
  WhatsAppSaleDraft,
  WhatsAppSaleType,
} from "../../../../../src/features/whatsapp/types";
import { useBranchStore } from "../../../../../src/store/branchStore";

const WHATSAPP_BLUE = "#22C7F4";

type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type PaymentMethod = "CASH" | "MOMO" | "BANK" | "OTHER";

type FinalizeForm = {
  saleType: "CASH" | "CREDIT";
  amountPaid: string;
  paymentMethod: PaymentMethod;
  dueDate: string;
  note: string;
};

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: unknown) {
  return `RWF ${Math.round(num(value)).toLocaleString()}`;
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
    fg: WHATSAPP_BLUE,
    bg: "rgba(34, 199, 244, 0.12)",
    border: "rgba(34, 199, 244, 0.30)",
    solid: WHATSAPP_BLUE,
  };
}

function dateLabel(value?: string | null) {
  if (!value) return "Not set";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not set";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function draftStatusTone(draft?: WhatsAppSaleDraft | null): Tone {
  if (!draft?.isDraft) return "green";
  if (num(draft?.balanceDue, 0) > 0) return "amber";
  return "cyan";
}

function defaultFinalizeForm(draft?: WhatsAppSaleDraft | null): FinalizeForm {
  const saleType =
    String(draft?.saleType || "CASH").toUpperCase() === "CREDIT"
      ? "CREDIT"
      : "CASH";

  return {
    saleType,
    amountPaid:
      saleType === "CASH"
        ? String(num(draft?.total, 0))
        : String(num(draft?.amountPaid, 0) || ""),
    paymentMethod: "CASH",
    dueDate: draft?.dueDate ? String(draft.dueDate).slice(0, 10) : "",
    note: "",
  };
}

function customerPhone(draft?: WhatsAppSaleDraft | null) {
  return clean(draft?.conversation?.phone || draft?.customer?.phone, "No phone");
}

function saleCompleteErrorMessage(error: unknown) {
  const err = error as {
    code?: string;
    message?: string;
    response?: {
      data?: {
        code?: string;
        message?: string;
        error?: string;
      };
    };
  };

  const code = String(
    err?.response?.data?.code ||
      err?.response?.data?.error ||
      err?.code ||
      "",
  ).toUpperCase();

  const message = String(
    err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "",
  ).toLowerCase();

  if (
    code === "CASH_DRAWER_CLOSED" ||
    message.includes("cash_drawer_closed") ||
    message.includes("cash drawer")
  ) {
    return "Open the cash drawer before completing a sale paid with cash.";
  }

  if (code === "INSUFFICIENT_STOCK" || message.includes("insufficient stock")) {
    return "Some products do not have enough stock in this selling location.";
  }

  if (code === "SALE_DRAFT_NOT_FOUND" || message.includes("sale_draft_not_found")) {
    return "This WhatsApp sale draft is no longer available. It may already be completed or deleted.";
  }

  if (code === "PAYMENT_EXCEEDS_TOTAL" || message.includes("payment_exceeds_total")) {
    return "Payment cannot be more than the sale total.";
  }

  if (code === "INVALID_DUE_DATE" || message.includes("invalid_due_date")) {
    return "Check the due date and use YYYY-MM-DD format.";
  }

  if (code === "BRANCH_REQUIRED" || message.includes("branch_required")) {
    return "Choose the selling location before completing this WhatsApp sale.";
  }

  return "The WhatsApp sale could not be completed. Please try again.";
}

function errorMessage(error: unknown) {
  const err = error as {
    code?: string;
    message?: string;
    response?: {
      data?: {
        code?: string;
        message?: string;
      };
    };
  };

  const code = String(err?.response?.data?.code || err?.code || "").toUpperCase();
  const message = String(err?.response?.data?.message || err?.message || "").toLowerCase();

  if (code === "CASH_DRAWER_CLOSED" || message.includes("cash drawer")) {
    return "Open the cash drawer for this selling location before completing a cash WhatsApp sale.";
  }

  if (code === "INSUFFICIENT_STOCK" || message.includes("insufficient stock")) {
    return "Some products do not have enough stock in this selling location. Review the items before completing the sale.";
  }

  if (code === "SALE_DRAFT_NOT_FOUND" || message.includes("draft")) {
    return "This sale draft is no longer available. It may already be completed or deleted.";
  }

  if (code === "BRANCH_REQUIRED" || message.includes("branch")) {
    return "Choose a selling location before completing this WhatsApp sale.";
  }

  if (message.includes("subscription")) {
    return "Business access needs attention before this sale can be completed.";
  }

  return err?.response?.data?.message || err?.message || "The sale could not be completed. Please try again.";
}

function paymentMethodLabel(method: PaymentMethod) {
  if (method === "CASH") return "Cash";
  if (method === "MOMO") return "MoMo";
  if (method === "BANK") return "Bank";
  return "Other";
}

function saleTypeLabel(value?: WhatsAppSaleType | string | null) {
  const key = String(value || "").toUpperCase();

  if (key === "CASH") return "Cash sale";
  if (key === "CREDIT") return "Credit sale";

  return "Sale type not selected";
}

function NoticePanel({
  notice,
  palette,
  onClose,
}: {
  notice: Notice;
  palette: AppShellPalette;
  onClose: () => void;
}) {
  if (!notice) return null;

  const spec = toneSpec(notice.tone, palette);

  return (
    <View
      style={[
        styles.noticePanel,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <View style={[styles.noticeIcon, { backgroundColor: spec.solid }]}>
        <Ionicons
          name={notice.tone === "red" ? "warning-outline" : "checkmark-outline"}
          size={17}
          color="#06111F"
        />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {notice.title}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {notice.text}
        </AppText>
      </View>

      <Pressable onPress={onClose} style={[styles.noticeClose, { borderColor: spec.border }]}>
        <Ionicons name="close-outline" size={18} color={spec.fg} />
      </Pressable>
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
}: {
  label: string;
  value: string;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: Tone;
  palette: AppShellPalette;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.summaryCard,
        {
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

      <AppText variant="subtitle" color={palette.text}>
        {value}
      </AppText>

      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
        {helper}
      </AppText>
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
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
        {label}
      </AppText>

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
          {
            borderColor: palette.border,
            backgroundColor: palette.panel,
            color: palette.text,
          },
        ]}
      />
    </View>
  );
}

function ChoiceChip({
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
  const spec = toneSpec(tone, palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        {
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppText
        variant="caption"
        color={active ? spec.fg : palette.soft}
        style={styles.filterText}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function FinalizeModal({
  open,
  palette,
  form,
  saving,
  total,
  notice,
  onChange,
  onClose,
  onClearNotice,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  form: FinalizeForm;
  saving: boolean;
  total: number;
  notice: Notice;
  onChange: (key: keyof FinalizeForm, value: string) => void;
  onClose: () => void;
  onClearNotice: () => void;
  onSave: () => Promise<void>;
}) {
  const amountPaid = num(form.amountPaid, 0);
  const balance = Math.max(total - amountPaid, 0);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              borderColor: palette.borderStrong,
              backgroundColor: palette.stage,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.eyebrow}>
                Complete WhatsApp sale
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Confirm payment and finish the sale
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Review payment details before this draft becomes a completed sale.
              </AppText>
            </View>

            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[styles.closeButton, { borderColor: palette.border }]}
            >
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <NoticePanel
              notice={notice}
              palette={palette}
              onClose={onClearNotice}
            />

            <View style={styles.checkoutPreview}>
              <View
                style={[
                  styles.checkoutBox,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                  Total
                </AppText>
                <AppText variant="subtitle" color={palette.text}>
                  {money(total)}
                </AppText>
              </View>

              <View
                style={[
                  styles.checkoutBox,
                  {
                    borderColor: balance > 0 ? toneSpec("amber", palette).border : palette.border,
                    backgroundColor: balance > 0 ? toneSpec("amber", palette).bg : palette.panel,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                  Balance
                </AppText>
                <AppText
                  variant="subtitle"
                  color={balance > 0 ? toneSpec("amber", palette).fg : palette.text}
                >
                  {money(balance)}
                </AppText>
              </View>
            </View>

            <View style={styles.choiceRow}>
              <ChoiceChip
                label="Cash sale"
                active={form.saleType === "CASH"}
                tone="green"
                palette={palette}
                onPress={() => onChange("saleType", "CASH")}
              />
              <ChoiceChip
                label="Credit sale"
                active={form.saleType === "CREDIT"}
                tone="amber"
                palette={palette}
                onPress={() => onChange("saleType", "CREDIT")}
              />
            </View>

            <Field
              label="Amount paid"
              value={form.amountPaid}
              placeholder="0"
              palette={palette}
              keyboardType="numeric"
              onChangeText={(value) => onChange("amountPaid", value)}
            />

            <View style={styles.choiceRow}>
              {(["CASH", "MOMO", "BANK", "OTHER"] as const).map((method) => (
                <ChoiceChip
                  key={method}
                  label={paymentMethodLabel(method)}
                  active={form.paymentMethod === method}
                  tone="blue"
                  palette={palette}
                  onPress={() => onChange("paymentMethod", method)}
                />
              ))}
            </View>

            {form.saleType === "CREDIT" ? (
              <Field
                label="Due date"
                value={form.dueDate}
                placeholder="YYYY-MM-DD"
                palette={palette}
                onChangeText={(value) => onChange("dueDate", value)}
              />
            ) : null}

            <Field
              label="Payment note"
              value={form.note}
              placeholder="Optional note for this payment"
              palette={palette}
              multiline
              onChangeText={(value) => onChange("note", value)}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <AsyncButton
              onPress={onClose}
              variant="secondary"
              style={styles.footerButton}
              disabled={saving}
            >
              Keep editing
            </AsyncButton>

            <AsyncButton
              onPress={onSave}
              variant="primary"
              style={[styles.footerButton, styles.sameBlueButton]}
              disabled={saving}
            >
              {saving ? "Saving" : "Complete sale"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WhatsAppSaleDraftDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const saleId = String(id || "");
  const { width } = useWindowDimensions();
  const compact = Math.min(width, 760) < 560;
  const activeBranchId = useBranchStore((state) => state.activeBranchId);

  const draftQuery = useWhatsAppSaleDraft(saleId);
  const finalizeDraft = useFinalizeWhatsAppSaleDraft();
  const updateDraft = useUpdateWhatsAppSaleDraft();
  const deleteDraft = useDeleteWhatsAppSaleDraft();

  const draft = draftQuery.data || null;
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeNotice, setFinalizeNotice] = useState<Notice>(null);
  const [finalizeForm, setFinalizeForm] = useState<FinalizeForm>(() =>
    defaultFinalizeForm(null),
  );

  function openFinalize() {
    setFinalizeNotice(null);
    setFinalizeForm(defaultFinalizeForm(draft));
    setFinalizeOpen(true);
  }

  function updateFinalizeForm(key: keyof FinalizeForm, value: string) {
    setFinalizeNotice(null);
    setFinalizeForm((current) => ({ ...current, [key]: value }));
  }

  async function saveDraftType(type: WhatsAppSaleType): Promise<void> {
    if (!draft?.id) return;

    if (!activeBranchId) {
      Alert.alert(
        "Choose selling location",
        "Choose the selling location before preparing checkout.",
      );
      return;
    }

    try {
      await updateDraft.mutateAsync({
        saleId: draft.id,
        payload: {
          branchId: activeBranchId,
          saleType: type,
        },
      });

      const fresh = await draftQuery.refetch();
      const updatedDraft = fresh.data || draft;

      setFinalizeNotice(null);
      setFinalizeForm({
        ...defaultFinalizeForm(updatedDraft),
        saleType: type === "CASH" ? "CASH" : "CREDIT",
        amountPaid:
          type === "CASH"
            ? String(num(updatedDraft?.total, 0))
            : String(num(updatedDraft?.amountPaid, 0) || ""),
      });

      setFinalizeOpen(true);
    } catch (error) {
      Alert.alert("Checkout could not start", errorMessage(error));
    }
  }

  async function completeSale(): Promise<void> {
    if (!draft?.id) return;

    if (!activeBranchId) {
      setFinalizeNotice({
        tone: "red",
        title: "Choose selling location",
        text: "Choose the selling location before completing this WhatsApp sale.",
      });
      return;
    }

    const amountPaid = Number(finalizeForm.amountPaid || 0);
    const total = num(draft.total, 0);

    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      setFinalizeNotice({
        tone: "red",
        title: "Check payment",
        text: "Amount paid must be 0 or more.",
      });
      return;
    }

    if (amountPaid > total) {
      setFinalizeNotice({
        tone: "red",
        title: "Check payment",
        text: "Amount paid cannot be more than the sale total.",
      });
      return;
    }

    if (finalizeForm.saleType === "CASH" && amountPaid < total) {
      setFinalizeNotice({
        tone: "red",
        title: "Check payment",
        text: "For a paid-now sale, the full amount should be paid.",
      });
      return;
    }

    if (finalizeForm.saleType === "CREDIT" && finalizeForm.dueDate.trim()) {
      const date = new Date(finalizeForm.dueDate.trim());

      if (Number.isNaN(date.getTime())) {
        setFinalizeNotice({
          tone: "red",
          title: "Check due date",
          text: "Use YYYY-MM-DD format.",
        });
        return;
      }
    }

    try {
      setFinalizeNotice(null);

      await finalizeDraft.mutateAsync({
        saleId: draft.id,
        payload: {
          branchId: activeBranchId,
          saleType: finalizeForm.saleType,
          amountPaid,
          paymentMethod: finalizeForm.paymentMethod,
          dueDate:
            finalizeForm.saleType === "CREDIT"
              ? finalizeForm.dueDate.trim() || null
              : null,
          note: finalizeForm.note.trim() || null,
        },
      });

      setFinalizeNotice(null);
      setFinalizeOpen(false);
      await draftQuery.refetch();

      Alert.alert(
        "Sale completed",
        "The WhatsApp sale is complete. Stock, payment, and sale records are now updated.",
        [
          {
            text: "Stay here",
            style: "cancel",
          },
          {
            text: "Back to WhatsApp sales",
            onPress: () => router.push(routes.whatsapp as never),
          },
        ],
      );
    } catch (error) {
      setFinalizeNotice({
        tone: "red",
        title: "Sale not completed",
        text: saleCompleteErrorMessage(error),
      });
    }
  }

  async function removeDraft(): Promise<void> {
    if (!draft?.id) return;

    Alert.alert(
      "Delete sale draft?",
      "This removes the WhatsApp sale draft. The customer conversation stays available.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteDraft.mutateAsync(draft.id);
            router.push(routes.whatsapp as never);
          },
        },
      ],
    );
  }

  return (
    <AppShell>
      {(palette) => {
        const statusSpec = toneSpec(draftStatusTone(draft), palette);
        const total = num(draft?.total, 0);
        const paid = num(draft?.amountPaid, 0);
        const balance = num(draft?.balanceDue, Math.max(total - paid, 0));

        return draftQuery.isLoading ? (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <Skeleton height={58} width="100%" />
            <Skeleton height={124} width="100%" />
            <View style={styles.summaryGrid}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.summarySkeletonItem}>
                  <Skeleton height={112} width="100%" />
                </View>
              ))}
            </View>
            <Skeleton height={220} width="100%" />
          </View>
        ) : !draft ? (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <View
              style={[
                styles.emptyPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <Ionicons name="warning-outline" size={32} color={toneSpec("amber", palette).fg} />
              <AppText variant="subtitle" color={palette.text} center>
                Sale draft not found
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                This WhatsApp sale draft could not be loaded.
              </AppText>
              <AsyncButton onPress={() => router.push(routes.whatsapp as never)} variant="secondary">
                Back to WhatsApp sales
              </AsyncButton>
            </View>
          </View>
        ) : (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <View
              style={[
                styles.topBar,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <Pressable
                onPress={() => router.push(routes.whatsapp as never)}
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    borderColor: palette.border,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Ionicons name="chevron-back-outline" size={20} color={palette.text} />
              </Pressable>

              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.eyebrow}>
                  WhatsApp sale draft
                </AppText>
                <AppText variant="subtitle" color={palette.text} numberOfLines={1}>
                  {draftCustomerName(draft)}
                </AppText>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    borderColor: statusSpec.border,
                    backgroundColor: statusSpec.bg,
                  },
                ]}
              >
                <AppText variant="caption" color={statusSpec.fg} style={styles.statusText}>
                  {draft.isDraft ? "Draft" : "Completed"}
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.heroPanel,
                compact ? styles.heroPanelCompact : null,
                {
                  borderColor: palette.borderStrong,
                  backgroundColor: "rgba(34, 199, 244, 0.10)",
                },
              ]}
            >
              <View style={styles.heroGlow} />

              <View style={styles.heroTop}>
                <View style={[styles.heroIcon, compact ? styles.heroIconCompact : null]}>
                  <Ionicons name="receipt-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.eyebrow}>
                    Sale checkout
                  </AppText>
                  <AppText variant="subtitle" color={palette.text}>
                    Review this WhatsApp sale before checkout
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Confirm the customer, products, and payment before completing this sale.
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Customer phone: {customerPhone(draft)}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Total"
                value={money(total)}
                helper="Sale amount"
                icon="wallet-outline"
                tone="cyan"
                palette={palette}
              />
              <SummaryCard
                label="Paid"
                value={money(paid)}
                helper="Recorded so far"
                icon="cash-outline"
                tone={paid > 0 ? "green" : "slate"}
                palette={palette}
              />
              <SummaryCard
                label="Balance"
                value={money(balance)}
                helper="Still unpaid"
                icon="alert-circle-outline"
                tone={balance > 0 ? "amber" : "green"}
                palette={palette}
              />
              <SummaryCard
                label="Due date"
                value={dateLabel(draft.dueDate)}
                helper={saleTypeLabel(draft.saleType)}
                icon="calendar-outline"
                tone="blue"
                palette={palette}
              />
            </View>

            <View
              style={[
                styles.customerPanel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.customerRow}>
                <View style={[styles.customerIcon, { backgroundColor: WHATSAPP_BLUE }]}>
                  <Ionicons name="person-outline" size={18} color="#06111F" />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.eyebrow}>
                    Customer
                  </AppText>
                  <AppText variant="label" color={palette.text}>
                    {draftCustomerName(draft)}
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    {customerPhone(draft)}
                  </AppText>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.panel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.panelHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.eyebrow}>
                    Items
                  </AppText>
                  <AppText variant="subtitle" color={palette.text}>
                    Products in this sale
                  </AppText>
                </View>
              </View>

              <View style={styles.itemList}>
                {(draft.items || []).map((item) => {
                  const quantity = num(item.quantity, 0);
                  const unitPrice = num(item.unitPrice, 0);
                  const lineTotal = quantity * unitPrice;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.itemRow,
                        {
                          borderColor: palette.border,
                          backgroundColor: palette.stage,
                        },
                      ]}
                    >
                      <View style={[styles.itemIcon, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                        <Ionicons name="cube-outline" size={16} color={WHATSAPP_BLUE} />
                      </View>

                      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                        <AppText variant="label" color={palette.text} numberOfLines={1}>
                          {clean(item.product?.name, "Product")}
                        </AppText>
                        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                          {clean(item.product?.sku || item.product?.serial || item.product?.barcode, "No reference")}
                        </AppText>
                      </View>

                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <AppText variant="caption" color={palette.soft}>
                          {quantity.toLocaleString()} × {money(unitPrice)}
                        </AppText>
                        <AppText variant="label" color={palette.text}>
                          {money(lineTotal)}
                        </AppText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                styles.panel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.eyebrow}>
                Checkout actions
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Complete this WhatsApp sale
              </AppText>

              {draft.isDraft ? (
                <>
                  <View
                    style={[
                      styles.checkoutActionPanel,
                      {
                        borderColor: toneSpec("cyan", palette).border,
                        backgroundColor: toneSpec("cyan", palette).bg,
                      },
                    ]}
                  >
                    <View style={styles.checkoutActionTop}>
                      <View
                        style={[
                          styles.checkoutActionIcon,
                          {
                            borderColor: toneSpec("cyan", palette).border,
                            backgroundColor: palette.stage,
                          },
                        ]}
                      >
                        <Ionicons name="shield-checkmark-outline" size={18} color={WHATSAPP_BLUE} />
                      </View>

                      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                        <AppText variant="label" color={palette.text}>
                          Ready for checkout
                        </AppText>
                        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                          Open the final review, confirm payment, then Storvex will update the sale, stock, and payment records.
                        </AppText>
                      </View>
                    </View>

                    <AsyncButton
                      onPress={openFinalize}
                      variant="primary"
                      fullWidth
                      style={styles.sameBlueButton}
                      disabled={finalizeDraft.isPending}
                    >
                      Complete sale
                    </AsyncButton>
                  </View>

                  <View style={styles.checkoutModePanel}>
                    <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                      Sale type
                    </AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      Current choice: {saleTypeLabel(draft.saleType)}
                    </AppText>

                    <View style={styles.choiceRow}>
                      <AsyncButton
                        onPress={() => saveDraftType("CASH")}
                        variant="secondary"
                        style={styles.actionButton}
                        disabled={updateDraft.isPending}
                      >
                        Set as cash sale
                      </AsyncButton>

                      <AsyncButton
                        onPress={() => saveDraftType("CREDIT")}
                        variant="secondary"
                        style={styles.actionButton}
                        disabled={updateDraft.isPending}
                      >
                        Set as credit sale
                      </AsyncButton>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.deletePanel,
                      {
                        borderColor: toneSpec("red", palette).border,
                        backgroundColor: toneSpec("red", palette).bg,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <AppText variant="label" color={palette.text}>
                        Remove this draft
                      </AppText>
                      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                        This only removes the prepared sale. The WhatsApp conversation stays available.
                      </AppText>
                    </View>

                    <AsyncButton
                      onPress={removeDraft}
                      variant="danger"
                      style={styles.deleteButton}
                      disabled={deleteDraft.isPending}
                    >
                      Delete
                    </AsyncButton>
                  </View>
                </>
              ) : (
                <View
                  style={[
                    styles.closedBox,
                    {
                      borderColor: toneSpec("green", palette).border,
                      backgroundColor: toneSpec("green", palette).bg,
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={28}
                    color={toneSpec("green", palette).fg}
                  />

                  <AppText variant="subtitle" color={palette.text} center>
                    WhatsApp sale completed
                  </AppText>

                  <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                    This draft is now a completed sale. Stock, payment, and business records are updated.
                  </AppText>

                  <View style={styles.choiceRow}>
                    <AsyncButton
                      onPress={() => router.push(routes.whatsapp as never)}
                      variant="secondary"
                      style={styles.actionButton}
                    >
                      Back to WhatsApp sales
                    </AsyncButton>

                    <AsyncButton
                      onPress={() => router.push(routes.salesList as never)}
                      variant="primary"
                      style={[styles.actionButton, styles.sameBlueButton]}
                    >
                      View sales
                    </AsyncButton>
                  </View>
                </View>
              )}
            </View>

            <FinalizeModal
              open={finalizeOpen}
              palette={palette}
              form={finalizeForm}
              total={total}
              saving={finalizeDraft.isPending}
              notice={finalizeNotice}
              onChange={updateFinalizeForm}
              onClose={() => {
                setFinalizeNotice(null);
                setFinalizeOpen(false);
              }}
              onClearNotice={() => setFinalizeNotice(null)}
              onSave={completeSale}
            />
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

  screenBottomSpace: {
    paddingBottom: 30,
  },

  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  cardText: {
    flexShrink: 1,
    lineHeight: 18,
  },

  sameBlueButton: {
    backgroundColor: WHATSAPP_BLUE,
    borderColor: WHATSAPP_BLUE,
  },

  topBar: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  statusPill: {
    flexShrink: 0,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 10,
    letterSpacing: 0.5,
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
    backgroundColor: "rgba(34, 199, 244, 0.12)",
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
    backgroundColor: WHATSAPP_BLUE,
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

  summaryGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summarySkeletonItem: {
    flexGrow: 1,
    minWidth: 150,
  },

  summaryCard: {
    flexGrow: 1,
    minWidth: 150,
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

  customerPanel: {
    borderWidth: 1,
    padding: 14,
  },

  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  customerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  panel: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  itemList: {
    gap: 10,
  },

  itemRow: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  itemIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  actionButton: {
    flexGrow: 1,
    minHeight: 46,
  },

  checkoutActionPanel: {
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  checkoutActionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  checkoutActionIcon: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  checkoutModePanel: {
    gap: 10,
  },

  deletePanel: {
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  deleteButton: {
    minHeight: 44,
    minWidth: 96,
  },

  closedBox: {
    borderWidth: 1,
    padding: 18,
    gap: 8,
    alignItems: "center",
  },

  emptyPanel: {
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },

  noticePanel: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  noticeIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeClose: {
    width: 30,
    height: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.68)",
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

  checkoutPreview: {
    flexDirection: "row",
    gap: 10,
  },

  checkoutBox: {
    flex: 1,
    borderWidth: 1,
    padding: 12,
    gap: 6,
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

  choiceChip: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  filterText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
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