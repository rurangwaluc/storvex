import { useMemo, useState } from "react";
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
import { useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  expenseCategoryLabel,
  expenseStatusLabel,
  useApproveExpense,
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
} from "../../../src/features/expenses/hooks";
import type {
  ExpenseCategory,
  ExpenseRecord,
} from "../../../src/features/expenses/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const ACCENT = "#22C7F4";
const EXPENSE_PREVIEW_LIMIT = 4;

const CATEGORY_OPTIONS: Array<{
  value: ExpenseCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "RENT", label: "Rent", icon: "home-outline" },
  { value: "SALARY", label: "Salary", icon: "people-outline" },
  { value: "UTILITIES", label: "Utilities", icon: "flash-outline" },
  { value: "TRANSPORT", label: "Transport", icon: "car-outline" },
  { value: "MAINTENANCE", label: "Maintenance", icon: "construct-outline" },
  { value: "OTHER", label: "Other", icon: "wallet-outline" },
];

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";
type StatusFilter = "ALL" | "PENDING" | "APPROVED";

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

type ExpenseForm = {
  title: string;
  amount: string;
  category: ExpenseCategory;
  notes: string;
};

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
    fg: palette.cyan,
    bg: "rgba(32, 200, 255, 0.12)",
    border: "rgba(32, 200, 255, 0.30)",
    solid: palette.cyan,
  };
}

function getColumns(width: number, mode: "summary" | "cards") {
  if (mode === "summary") {
    if (width >= 760) return 4;
    if (width >= 430) return 2;
    return 1;
  }

  if (width >= 760) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function emptyForm(): ExpenseForm {
  return {
    title: "",
    amount: "",
    category: "OTHER",
    notes: "",
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

function expenseTone(expense: ExpenseRecord): Tone {
  const status = String(expense.status || "").toUpperCase();
  if (status === "APPROVED") return "green";
  if (status === "PENDING") return "amber";
  return "slate";
}

function roleCanApprove(role?: string | null) {
  const key = String(role || "").toUpperCase();
  return key === "OWNER" || key === "MANAGER";
}

function roleCanDelete(role?: string | null) {
  return String(role || "").toUpperCase() === "OWNER";
}

function errorMessage(error: unknown) {
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

  if (code === "EXPENSE_TITLE_REQUIRED") return "Add a clear expense title.";
  if (code === "EXPENSE_CATEGORY_INVALID") return "Choose a valid expense category.";
  if (code === "EXPENSE_AMOUNT_INVALID") return "Expense amount must be greater than 0.";
  if (code === "EXPENSE_NOT_FOUND") return "This expense record could not be found.";
  if (code === "APPROVED_EXPENSE_CANNOT_BE_DELETED") {
    return "Approved expenses are financial records and cannot be deleted.";
  }
  if (code === "STORE_LOCATION_REQUIRED" || message.includes("store location")) {
    return "Choose the selling location before recording this expense.";
  }
  if (code === "STORE_LOCATION_ACCESS_DENIED") {
    return "You do not have access to this selling location.";
  }
  if (code === "STORE_LOCATION_NOT_ACTIVE") {
    return "This selling location is not active. Choose another selling location.";
  }
  if (message.includes("subscription")) {
    return "Business access needs attention before expenses can be changed.";
  }

  return err?.response?.data?.message || err?.message || "The expense action could not be completed. Please try again.";
}

function branchDisplayName(branch: { code?: string | null; name?: string | null } | null | undefined) {
  const name = clean(branch?.name, "");
  const code = clean(branch?.code, "");

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;

  return "current selling location";
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
        <View style={[styles.summaryIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
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

function NoticePanel({ notice, palette, onClose }: { notice: Notice; palette: AppShellPalette; onClose?: () => void }) {
  if (!notice) return null;

  const spec = toneSpec(notice.tone, palette);

  return (
    <View style={[styles.noticePanel, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
      <View style={[styles.noticeMark, { backgroundColor: spec.solid }]}> 
        <Ionicons name={notice.tone === "red" ? "warning-outline" : "checkmark-outline"} size={15} color="#06111F" />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {notice.title}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {notice.text}
        </AppText>
      </View>

      {onClose ? (
        <Pressable onPress={onClose} style={[styles.noticeClose, { borderColor: spec.border }]}> 
          <Ionicons name="close-outline" size={18} color={spec.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ScreenSkeleton({ palette, layoutWidth }: { palette: AppShellPalette; layoutWidth: number }) {
  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <View style={[styles.heroPanel, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.08)" }]}> 
        <View style={styles.heroTop}>
          <Skeleton height={56} width={56} />
          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="38%" />
            <Skeleton height={24} width="74%" />
            <Skeleton height={14} width="66%" />
          </View>
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ width: summaryWidth }}>
            <Skeleton height={112} width="100%" />
          </View>
        ))}
      </View>

      <Skeleton height={104} width="100%" />

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ width: cardWidth }}>
            <Skeleton height={188} width="100%" />
          </View>
        ))}
      </View>
    </View>
  );
}

function FilterChip({
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
        styles.filterChip,
        {
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.filterText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function CategoryChip({
  option,
  active,
  palette,
  onPress,
}: {
  option: (typeof CATEGORY_OPTIONS)[number];
  active: boolean;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(active ? "cyan" : "slate", palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        {
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Ionicons name={option.icon} size={15} color={active ? spec.fg : palette.soft} />
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.filterText}>
        {option.label}
      </AppText>
    </Pressable>
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

function ExpenseCard({
  expense,
  palette,
  width,
  canApprove,
  canDelete,
  approving,
  deleting,
  onApprove,
  onDelete,
}: {
  expense: ExpenseRecord;
  palette: AppShellPalette;
  width: DimensionValue;
  canApprove: boolean;
  canDelete: boolean;
  approving: boolean;
  deleting: boolean;
  onApprove: () => void;
  onDelete: () => void;
}) {
  const tone = expenseTone(expense);
  const spec = toneSpec(tone, palette);
  const approved = String(expense.status || "").toUpperCase() === "APPROVED";

  return (
    <View style={[styles.expenseCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <Ionicons name="wallet-outline" size={17} color={spec.fg} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="label" color={palette.text} numberOfLines={1}>
            {clean(expense.title, "Expense")}
          </AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText} numberOfLines={1}>
            {expenseCategoryLabel(expense.category)}
          </AppText>
        </View>

        <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <AppText variant="caption" color={spec.fg} style={styles.statusText}>
            {expenseStatusLabel(expense.status)}
          </AppText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Amount
          </AppText>
          <AppText variant="label" color={palette.text}>
            {money(expense.amount)}
          </AppText>
        </View>

        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Date
          </AppText>
          <AppText variant="label" color={palette.text}>
            {dateLabel(expense.createdAt)}
          </AppText>
        </View>
      </View>

      <View style={styles.detailStack}>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Selling location</AppText>
          <AppText variant="caption" color={palette.text}>{branchDisplayName(expense.branch)}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Recorded by</AppText>
          <AppText variant="caption" color={palette.text}>{clean(expense.createdBy?.name, "Staff member")}</AppText>
        </View>
        {approved ? (
          <View style={styles.detailRow}>
            <AppText variant="caption" color={palette.soft}>Approved by</AppText>
            <AppText variant="caption" color={palette.text}>{clean(expense.approvedBy?.name, "Manager")}</AppText>
          </View>
        ) : null}
      </View>

      {expense.notes ? (
        <View style={[styles.noteBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Note
          </AppText>
          <AppText variant="caption" color={palette.text} style={styles.cardText}>
            {expense.notes}
          </AppText>
        </View>
      ) : null}

      {!approved && (canApprove || canDelete) ? (
        <View style={styles.actionRow}>
          {canApprove ? (
            <AsyncButton onPress={onApprove} variant="primary" style={styles.cardButton} disabled={approving || deleting}>
              {approving ? "Approving" : "Approve"}
            </AsyncButton>
          ) : null}

          {canDelete ? (
            <AsyncButton onPress={onDelete} variant="danger" style={styles.cardButton} disabled={approving || deleting}>
              {deleting ? "Deleting" : "Delete"}
            </AsyncButton>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ExpenseModal({
  open,
  palette,
  form,
  notice,
  saving,
  onChange,
  onClose,
  onClearNotice,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  form: ExpenseForm;
  notice: Notice;
  saving: boolean;
  onChange: (key: keyof ExpenseForm, value: string) => void;
  onClose: () => void;
  onClearNotice: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>
                New expense
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Record business spending
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Add the amount, category, and a clear note when proof is needed.
              </AppText>
            </View>

            <Pressable onPress={onClose} disabled={saving} style={[styles.closeButton, { borderColor: palette.border, opacity: saving ? 0.5 : 1 }]}> 
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <NoticePanel notice={notice} palette={palette} onClose={onClearNotice} />

            <Field
              label="Expense title"
              value={form.title}
              placeholder="Example: Transport for delivery"
              palette={palette}
              onChangeText={(value) => onChange("title", value)}
            />

            <Field
              label="Amount"
              value={form.amount}
              placeholder="0"
              palette={palette}
              keyboardType="numeric"
              onChangeText={(value) => onChange("amount", value)}
            />

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                Category
              </AppText>
              <View style={styles.choiceRow}>
                {CATEGORY_OPTIONS.map((option) => (
                  <CategoryChip
                    key={option.value}
                    option={option}
                    active={form.category === option.value}
                    palette={palette}
                    onPress={() => onChange("category", option.value)}
                  />
                ))}
              </View>
            </View>

            <Field
              label="Note"
              value={form.notes}
              placeholder="Optional proof note or reason"
              palette={palette}
              multiline
              onChangeText={(value) => onChange("notes", value)}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>
              Cancel
            </AsyncButton>
            <AsyncButton onPress={onSave} variant="primary" style={[styles.footerButton, styles.accentButton]} disabled={saving}>
              {saving ? "Saving" : "Save expense"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ExpensesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(width, 760);
  const compact = layoutWidth < 560;

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [screenNotice, setScreenNotice] = useState<Notice>(null);
  const [modalNotice, setModalNotice] = useState<Notice>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(() => emptyForm());

  const expensesQuery = useExpenses({ branchId: activeBranchId });
  const createExpense = useCreateExpense();
  const approveExpense = useApproveExpense();
  const deleteExpense = useDeleteExpense();

  const expenses = expensesQuery.data || [];
  const canApprove = roleCanApprove(user?.role);
  const canDelete = roleCanDelete(user?.role);

  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();

    return expenses.filter((expense) => {
      const status = String(expense.status || "").toUpperCase();
      const matchesStatus = filter === "ALL" || status === filter;
      const haystack = [
        expense.title,
        expenseCategoryLabel(expense.category),
        expense.notes,
        expense.createdBy?.name,
        expense.branch?.name,
        expense.branch?.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [expenses, filter, query]);

  const visibleExpenses = showAllExpenses
    ? filteredExpenses
    : filteredExpenses.slice(0, EXPENSE_PREVIEW_LIMIT);

  const approved = expenses.filter((expense) => String(expense.status || "").toUpperCase() === "APPROVED");
  const pending = expenses.filter((expense) => String(expense.status || "").toUpperCase() !== "APPROVED");
  const approvedTotal = approved.reduce((total, expense) => total + num(expense.amount), 0);
  const pendingTotal = pending.reduce((total, expense) => total + num(expense.amount), 0);
  const totalRecorded = expenses.reduce((total, expense) => total + num(expense.amount), 0);

  const isLoading = isHydrating || !user || !tenant || (expensesQuery.isLoading && !expensesQuery.data);
  const isRefreshing = expensesQuery.isFetching;

  function updateForm(key: keyof ExpenseForm, value: string) {
    setModalNotice(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openExpenseModal() {
    setForm(emptyForm());
    setModalNotice(null);
    setModalOpen(true);
  }

  function closeExpenseModal() {
    if (createExpense.isPending) return;
    setModalOpen(false);
    setModalNotice(null);
  }

  async function refreshAll() {
    await expensesQuery.refetch();
  }

  async function saveExpense() {
    const title = form.title.trim();
    const amount = Number(form.amount || 0);

    if (!title) {
      setModalNotice({ tone: "amber", title: "Add expense title", text: "Give this expense a clear business title." });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setModalNotice({ tone: "amber", title: "Check amount", text: "Expense amount must be greater than 0." });
      return;
    }

    try {
      await createExpense.mutateAsync({
        title,
        amount,
        category: form.category,
        notes: form.notes.trim() || null,
      });

      setModalOpen(false);
      setForm(emptyForm());
      setScreenNotice({
        tone: "green",
        title: "Expense recorded",
        text: "The expense is saved and waiting for approval if needed.",
      });
    } catch (error) {
      setModalNotice({
        tone: "red",
        title: "Expense not saved",
        text: errorMessage(error),
      });
    }
  }

  async function approveCurrentExpense(expense: ExpenseRecord) {
    try {
      await approveExpense.mutateAsync(expense.id);
      setScreenNotice({
        tone: "green",
        title: "Expense approved",
        text: `${clean(expense.title, "Expense")} is now approved as a business record.`,
      });
    } catch (error) {
      setScreenNotice({
        tone: "red",
        title: "Expense not approved",
        text: errorMessage(error),
      });
    }
  }

  function deleteCurrentExpense(expense: ExpenseRecord) {
    Alert.alert(
      "Delete expense?",
      "This removes the expense record if it has not been approved yet.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense.mutateAsync(expense.id);
              setScreenNotice({
                tone: "green",
                title: "Expense deleted",
                text: `${clean(expense.title, "Expense")} was removed from expenses.`,
              });
            } catch (error) {
              setScreenNotice({
                tone: "red",
                title: "Expense not deleted",
                text: errorMessage(error),
              });
            }
          },
        },
      ],
    );
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <ScreenSkeleton palette={palette} layoutWidth={layoutWidth} />
        ) : (
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
                  <Ionicons name="wallet-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      Expenses
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Control spending before it becomes leakage.
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Record, approve, and review business expenses for {branchDisplayName(activeBranch)}.
                  </AppText>
                </View>

                {!compact ? (
                  <AsyncButton onPress={openExpenseModal} variant="primary" style={styles.heroButton}>
                    Add expense
                  </AsyncButton>
                ) : null}
              </View>

              {compact ? (
                <AsyncButton onPress={openExpenseModal} variant="primary" fullWidth>
                  Add expense
                </AsyncButton>
              ) : null}
            </View>

            <NoticePanel notice={screenNotice} palette={palette} onClose={() => setScreenNotice(null)} />

            <View style={styles.responsiveGrid}>
              <SummaryCard
                label="Recorded"
                value={expenses.length.toLocaleString()}
                helper="Expense records"
                icon="document-text-outline"
                tone="cyan"
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Pending"
                value={pending.length.toLocaleString()}
                helper={money(pendingTotal)}
                icon="time-outline"
                tone={pending.length > 0 ? "amber" : "slate"}
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Approved"
                value={approved.length.toLocaleString()}
                helper={money(approvedTotal)}
                icon="checkmark-done-outline"
                tone="green"
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Total spend"
                value={money(totalRecorded)}
                helper="All visible records"
                icon="wallet-outline"
                tone="blue"
                palette={palette}
                width={summaryWidth}
              />
            </View>

            <View style={[styles.controlPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <View style={styles.searchRow}>
                <View style={[styles.searchBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
                  <Ionicons name="search-outline" size={17} color={palette.soft} />
                  <TextInput
                    value={query}
                    onChangeText={(value) => {
                      setQuery(value);
                      setShowAllExpenses(false);
                    }}
                    placeholder="Search title, category, note, or staff"
                    placeholderTextColor={palette.soft}
                    style={[styles.searchInput, { color: palette.text }]}
                  />
                </View>

                <AsyncButton onPress={refreshAll} variant="secondary" style={styles.refreshButton} disabled={isRefreshing}>
                  {isRefreshing ? "Refreshing" : "Refresh"}
                </AsyncButton>
              </View>

              <View style={styles.filterRow}>
                <FilterChip label="All" active={filter === "ALL"} tone="cyan" palette={palette} onPress={() => { setFilter("ALL"); setShowAllExpenses(false); }} />
                <FilterChip label="Needs approval" active={filter === "PENDING"} tone="amber" palette={palette} onPress={() => { setFilter("PENDING"); setShowAllExpenses(false); }} />
                <FilterChip label="Approved" active={filter === "APPROVED"} tone="green" palette={palette} onPress={() => { setFilter("APPROVED"); setShowAllExpenses(false); }} />
              </View>
            </View>

            {pending.length > 0 ? (
              <View style={[styles.attentionPanel, { borderColor: toneSpec("amber", palette).border, backgroundColor: toneSpec("amber", palette).bg }]}> 
                <View style={[styles.attentionIcon, { backgroundColor: toneSpec("amber", palette).solid }]}> 
                  <Ionicons name="warning-outline" size={18} color="#06111F" />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <AppText variant="label" color={palette.text}>
                    Expenses need approval
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Review pending expenses before reports treat spending as controlled.
                  </AppText>
                </View>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={filter === "APPROVED" ? toneSpec("green", palette).fg : filter === "PENDING" ? toneSpec("amber", palette).fg : palette.cyan} style={styles.eyebrow}>
                  Expense records
                </AppText>
                <AppText variant="subtitle" color={palette.text}>
                  Spending control
                </AppText>
              </View>

              <AppText variant="caption" color={palette.soft}>
                {visibleExpenses.length.toLocaleString()} of {filteredExpenses.length.toLocaleString()} shown
              </AppText>
            </View>

            {expensesQuery.isError ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} />
                <AppText variant="subtitle" color={palette.text} center>
                  Expenses could not load
                </AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                  Check the connection and refresh this screen.
                </AppText>
                <AsyncButton onPress={refreshAll} variant="secondary">
                  Try again
                </AsyncButton>
              </View>
            ) : filteredExpenses.length === 0 ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <Ionicons name="wallet-outline" size={32} color={palette.cyan} />
                <AppText variant="subtitle" color={palette.text} center>
                  No expenses found
                </AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                  Record the first business expense for this selling location.
                </AppText>
                <AsyncButton onPress={openExpenseModal} variant="primary">
                  Add expense
                </AsyncButton>
              </View>
            ) : (
              <>
                <View style={styles.responsiveGrid}>
                  {visibleExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      palette={palette}
                      width={cardWidth}
                      canApprove={canApprove}
                      canDelete={canDelete}
                      approving={approveExpense.isPending}
                      deleting={deleteExpense.isPending}
                      onApprove={() => approveCurrentExpense(expense)}
                      onDelete={() => deleteCurrentExpense(expense)}
                    />
                  ))}
                </View>

                {filteredExpenses.length > EXPENSE_PREVIEW_LIMIT ? (
                  <View style={styles.showMoreWrap}>
                    <AsyncButton onPress={() => setShowAllExpenses((current) => !current)} variant="secondary">
                      {showAllExpenses ? "Show fewer expenses" : "View more expenses"}
                    </AsyncButton>
                  </View>
                ) : null}
              </>
            )}

            <View style={[styles.nextPanel, { borderColor: "rgba(34, 199, 244, 0.28)", backgroundColor: "rgba(34, 199, 244, 0.10)" }]}> 
              <View style={[styles.nextIcon, { borderColor: "rgba(34, 199, 244, 0.30)", backgroundColor: "rgba(34, 199, 244, 0.13)" }]}> 
                <Ionicons name="bar-chart-outline" size={20} color={ACCENT} />
              </View>

              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <AppText variant="label" color={palette.text}>
                  Review business reports
                </AppText>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  Approved expenses help show cleaner profit and spending reports.
                </AppText>
              </View>

              <Pressable
                onPress={() => router.push(routes.reports as never)}
                style={({ pressed }) => [
                  styles.nextButton,
                  {
                    borderColor: "rgba(34, 199, 244, 0.30)",
                    backgroundColor: "rgba(34, 199, 244, 0.14)",
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <AppText variant="caption" color={ACCENT} style={styles.nextButtonText}>
                  Reports
                </AppText>
              </Pressable>
            </View>

            <ExpenseModal
              open={modalOpen}
              palette={palette}
              form={form}
              notice={modalNotice}
              saving={createExpense.isPending}
              onChange={updateForm}
              onClose={closeExpenseModal}
              onClearNotice={() => setModalNotice(null)}
              onSave={saveExpense}
            />
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

  heroButton: {
    minHeight: 44,
    paddingHorizontal: 16,
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

  accentButton: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },

  noticePanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  noticeMark: {
    width: 30,
    height: 30,
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

  controlPanel: {
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchBox: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Quicksand_600SemiBold",
    fontSize: 13,
    paddingVertical: 0,
  },

  refreshButton: {
    minHeight: 48,
    paddingHorizontal: 14,
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

  filterText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  attentionPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  attentionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },

  expenseCard: {
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  cardIcon: {
    width: 34,
    height: 34,
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

  infoGrid: {
    flexDirection: "row",
    gap: 8,
  },

  infoBox: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    gap: 5,
  },

  detailStack: {
    gap: 7,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  noteBox: {
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  cardButton: {
    flex: 1,
    minHeight: 46,
  },

  emptyPanel: {
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },

  showMoreWrap: {
    alignItems: "center",
    paddingTop: 4,
  },

  nextPanel: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  nextIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  nextButton: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  nextButtonText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
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

  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  categoryChip: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
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
