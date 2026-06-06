import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { AppText } from "../../../src/components/ui/AppText";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import {
  branchDisplayName,
  normalizeEmployeeBranches,
  roleLabel,
  useCreatePeopleCustomer,
  useCreatePeopleEmployee,
  useCustomerLedger,
  useDeletePeopleEmployee,
  usePeopleBranches,
  usePeopleCustomers,
  usePeopleEmployees,
  useResetPeopleEmployeePassword,
  useSetCustomerStatus,
  useSetEmployeeStatus,
  useUpdatePeopleCustomer,
  useUpdatePeopleEmployee,
} from "../../../src/features/people/hooks";
import type {
  CustomerPayload,
  CustomerRecord,
  EmployeePayload,
  EmployeeRecord,
  PeopleBranch,
  StaffRole,
} from "../../../src/features/people/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";
type PeopleTab = "CUSTOMERS" | "STAFF" | "ACCESS";

type Notice = {
  tone: "success" | "danger" | "info";
  title: string;
  text: string;
} | null;

const INITIAL_LIST_LIMIT = 4;

const STAFF_ROLES: Array<{ value: StaffRole; label: string; helper: string; icon: IoniconName; tone: Tone }> = [
  { value: "MANAGER", label: "Manager", helper: "Supervises daily work without owner-only controls.", icon: "briefcase-outline", tone: "blue" },
  { value: "CASHIER", label: "Cashier", helper: "Handles payments, receipts, and cash activity.", icon: "cash-outline", tone: "green" },
  { value: "SELLER", label: "Seller", helper: "Creates sales and helps customers buy faster.", icon: "receipt-outline", tone: "amber" },
  { value: "STOREKEEPER", label: "Storekeeper", helper: "Controls stock movement and supplier receiving.", icon: "cube-outline", tone: "cyan" },
  { value: "TECHNICIAN", label: "Technician", helper: "Handles repair jobs and customer device work.", icon: "construct-outline", tone: "green" },
];

const EMPTY_CUSTOMER_FORM: CustomerPayload = {
  name: "",
  phone: "",
  email: "",
  address: "",
  tinNumber: "",
  idNumber: "",
  notes: "",
  whatsappOptIn: false,
};

const EMPTY_EMPLOYEE_FORM: EmployeePayload = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "CASHIER",
  branchIds: [],
  defaultBranchId: null,
  canViewAllBranches: false,
};

function isLightPalette(palette: AppShellPalette) {
  const stage = String(palette.stage || "").toLowerCase();
  const panel = String(palette.panel || "").toLowerCase();

  return stage.includes("fff") || stage.includes("f8") || stage.includes("f9") || panel.includes("fff") || panel.includes("f8") || panel.includes("f9");
}

function toneSpec(tone: Tone, palette: AppShellPalette) {
  const light = isLightPalette(palette);

  if (tone === "green") {
    return {
      fg: light ? "#047857" : "#34D399",
      bg: light ? "rgba(16,185,129,0.10)" : "rgba(52,211,153,0.14)",
      border: light ? "rgba(4,120,87,0.22)" : "rgba(52,211,153,0.30)",
      solid: light ? "#10B981" : "#34D399",
    };
  }

  if (tone === "amber") {
    return {
      fg: light ? "#B45309" : "#FBBF24",
      bg: light ? "rgba(245,158,11,0.10)" : "rgba(251,191,36,0.14)",
      border: light ? "rgba(180,83,9,0.22)" : "rgba(251,191,36,0.30)",
      solid: "#FBBF24",
    };
  }

  if (tone === "red") {
    return {
      fg: light ? "#BE123C" : "#FB7185",
      bg: light ? "rgba(225,29,72,0.09)" : "rgba(251,113,133,0.14)",
      border: light ? "rgba(190,18,60,0.22)" : "rgba(251,113,133,0.30)",
      solid: "#FB7185",
    };
  }

  if (tone === "blue") {
    return {
      fg: light ? "#2563EB" : "#60A5FA",
      bg: light ? "rgba(37,99,235,0.09)" : "rgba(96,165,250,0.14)",
      border: light ? "rgba(37,99,235,0.22)" : "rgba(96,165,250,0.30)",
      solid: "#60A5FA",
    };
  }

  if (tone === "slate") {
    return {
      fg: palette.soft,
      bg: "rgba(148,163,184,0.10)",
      border: "rgba(148,163,184,0.22)",
      solid: palette.soft,
    };
  }

  return {
    fg: palette.cyan,
    bg: "rgba(32,200,255,0.12)",
    border: "rgba(32,200,255,0.30)",
    solid: palette.cyan,
  };
}

function columnsFor(width: number) {
  return width >= 680 ? 2 : 1;
}

function widthForColumns(columns: number): DimensionValue {
  return columns === 2 ? ("48.7%" as DimensionValue) : ("100%" as DimensionValue);
}

function formatMoney(value: unknown) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function searchText(items: unknown[]) {
  return items.map((item) => String(item || "").toLowerCase()).join(" ");
}

function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}

function canManagePeople(role?: string | null) {
  const key = normalizeRole(role);
  return key === "OWNER" || key === "PLATFORM_ADMIN";
}

function canViewStaff(role?: string | null) {
  const key = normalizeRole(role);
  return key === "OWNER" || key === "MANAGER" || key === "PLATFORM_ADMIN";
}

function initialsFromName(name?: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "ST";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
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

function IconBox({ icon, tone, palette, filled = false }: { icon: IoniconName; tone: Tone; palette: AppShellPalette; filled?: boolean }) {
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.iconBox, { borderColor: spec.border, backgroundColor: filled ? spec.solid : spec.bg }]}>
      <Ionicons name={icon} size={19} color={filled ? "#06111F" : spec.fg} />
    </View>
  );
}

function InputBox({
  label,
  value,
  onChangeText,
  placeholder,
  palette,
  multiline = false,
  keyboardType = "default",
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  palette: AppShellPalette;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.soft}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline ? styles.textArea : null,
          {
            color: palette.text,
            borderColor: palette.border,
            backgroundColor: isLightPalette(palette) ? "#FFFFFF" : "rgba(3,17,31,0.44)",
          },
        ]}
      />
    </View>
  );
}

function NoticeBanner({ notice, palette, onClose }: { notice: Notice; palette: AppShellPalette; onClose: () => void }) {
  if (!notice) return null;

  const tone = notice.tone === "danger" ? "red" : notice.tone === "success" ? "green" : "cyan";
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.notice, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
      <View style={[styles.noticeMark, { backgroundColor: spec.solid }]}> 
        <Ionicons name={notice.tone === "danger" ? "alert-outline" : notice.tone === "success" ? "checkmark-outline" : "information-outline"} size={16} color="#06111F" />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="label" color={palette.text}>{notice.title}</AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>{notice.text}</AppText>
      </View>
      <Pressable onPress={onClose} style={styles.closeMini}>
        <Ionicons name="close" size={16} color={palette.soft} />
      </Pressable>
    </View>
  );
}

function SummaryCard({ label, value, helper, icon, tone, palette, width }: { label: string; value: string; helper: string; icon: IoniconName; tone: Tone; palette: AppShellPalette; width: DimensionValue }) {
  return (
    <View style={[styles.summaryCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.summaryTop}>
        <IconBox icon={icon} tone={tone} palette={palette} />
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      </View>
      <AppText variant="subtitle" color={palette.text}>{value}</AppText>
      <AppText variant="caption" color={palette.soft} style={styles.cardText}>{helper}</AppText>
    </View>
  );
}

function TabButton({ tab, active, label, icon, palette, onPress }: { tab: PeopleTab; active: boolean; label: string; icon: IoniconName; palette: AppShellPalette; onPress: (tab: PeopleTab) => void }) {
  return (
    <Pressable
      onPress={() => onPress(tab)}
      style={({ pressed }) => [
        styles.tabButton,
        {
          borderColor: active ? palette.borderStrong : palette.border,
          backgroundColor: active ? "rgba(32,200,255,0.14)" : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={16} color={active ? palette.cyan : palette.soft} />
      <AppText variant="caption" color={active ? palette.cyan : palette.soft} style={styles.tabText}>{label}</AppText>
    </Pressable>
  );
}

function PeopleSkeleton({ palette, width }: { palette: AppShellPalette; width: number }) {
  const cardWidth = widthForColumns(columnsFor(width));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <View style={[styles.heroPanel, { borderColor: palette.borderStrong, backgroundColor: "rgba(32,200,255,0.08)" }]}> 
        <View style={styles.heroTop}>
          <Skeleton height={56} width={56} />
          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="36%" />
            <Skeleton height={24} width="64%" />
            <Skeleton height={14} width="78%" />
          </View>
        </View>
      </View>
      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={[styles.summaryCard, { width: cardWidth, borderColor: palette.border, backgroundColor: palette.panel }]}> 
            <Skeleton height={34} width={34} />
            <Skeleton height={24} width="42%" />
            <Skeleton height={14} width="72%" />
          </View>
        ))}
      </View>
      {[1, 2, 3].map((item) => (
        <Skeleton key={item} height={118} width="100%" />
      ))}
    </View>
  );
}

function CustomerCard({
  customer,
  palette,
  width,
  onEdit,
  onHistory,
  onToggleStatus,
}: {
  customer: CustomerRecord;
  palette: AppShellPalette;
  width?: DimensionValue;
  onEdit: (customer: CustomerRecord) => void;
  onHistory: (customer: CustomerRecord) => void;
  onToggleStatus: (customer: CustomerRecord) => void;
}) {
  const active = customer.isActive !== false;
  const outstanding = Number(customer.outstanding || 0);

  return (
    <View style={[styles.recordCard, width ? { width } : null, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.recordHeader}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: active ? palette.cyan : palette.soft }]}> 
            <AppText variant="caption" color="#06111F">{initialsFromName(customer.name)}</AppText>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <AppText variant="label" color={palette.text}>{customer.name}</AppText>
            <AppText variant="caption" color={palette.soft}>{customer.phone || "No phone saved"}</AppText>
          </View>
        </View>
        <StatusPill label={active ? "Active" : "Inactive"} tone={active ? "green" : "amber"} palette={palette} />
      </View>

      <View style={styles.detailGrid}>
        <View style={[styles.detailCell, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Email</AppText>
          <AppText variant="caption" color={palette.text}>{customer.email || "Not saved"}</AppText>
        </View>
        <View style={[styles.detailCell, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Outstanding</AppText>
          <AppText variant="caption" color={outstanding > 0 ? toneSpec("red", palette).fg : palette.text}>{formatMoney(outstanding)}</AppText>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={() => onHistory(customer)} style={[styles.smallAction, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
          <AppText variant="caption" color={palette.text}>History</AppText>
        </Pressable>
        <Pressable onPress={() => onEdit(customer)} style={[styles.smallAction, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
          <AppText variant="caption" color={palette.text}>Edit</AppText>
        </Pressable>
        <Pressable onPress={() => onToggleStatus(customer)} style={[styles.smallAction, { borderColor: active ? toneSpec("amber", palette).border : toneSpec("green", palette).border, backgroundColor: active ? toneSpec("amber", palette).bg : toneSpec("green", palette).bg }]}> 
          <AppText variant="caption" color={active ? toneSpec("amber", palette).fg : toneSpec("green", palette).fg}>{active ? "Deactivate" : "Reactivate"}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function EmployeeCard({
  employee,
  palette,
  width,
  canManage,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: {
  employee: EmployeeRecord;
  palette: AppShellPalette;
  width?: DimensionValue;
  canManage: boolean;
  onEdit: (employee: EmployeeRecord) => void;
  onResetPassword: (employee: EmployeeRecord) => void;
  onToggleStatus: (employee: EmployeeRecord) => void;
  onDelete: (employee: EmployeeRecord) => void;
}) {
  const active = employee.isActive !== false;
  const roleKey = normalizeRole(employee.role);
  const protectedOwner = roleKey === "OWNER";
  const branches = normalizeEmployeeBranches(employee);
  const visibleBranches = branches.slice(0, 2);

  return (
    <View style={[styles.recordCard, width ? { width } : null, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.recordHeader}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: roleKey === "OWNER" ? "#67E8F9" : active ? "#34D399" : palette.soft }]}> 
            <AppText variant="caption" color="#06111F">{initialsFromName(employee.name)}</AppText>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <AppText variant="label" color={palette.text}>{employee.name}</AppText>
            <AppText variant="caption" color={palette.soft}>{employee.email || "No email saved"}</AppText>
          </View>
        </View>
        <StatusPill label={active ? "Active" : "Inactive"} tone={active ? "green" : "amber"} palette={palette} />
      </View>

      <View style={styles.detailGrid}>
        <View style={[styles.detailCell, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Responsibility</AppText>
          <AppText variant="caption" color={palette.text}>{roleLabel(employee.role)}</AppText>
        </View>
        <View style={[styles.detailCell, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Phone</AppText>
          <AppText variant="caption" color={palette.text}>{employee.phone || "Not saved"}</AppText>
        </View>
      </View>

      <View style={[styles.branchPanel, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Selling locations</AppText>
        <View style={styles.chipWrap}>
          {visibleBranches.length > 0 ? (
            visibleBranches.map((branch) => (
              <View key={branch.id} style={[styles.miniChip, { borderColor: branch.isDefault ? palette.borderStrong : palette.border, backgroundColor: branch.isDefault ? "rgba(32,200,255,0.12)" : palette.panel }]}> 
                <AppText variant="caption" color={branch.isDefault ? palette.cyan : palette.text}>{branchDisplayName(branch)}{branch.isDefault ? " · Default" : ""}</AppText>
              </View>
            ))
          ) : (
            <AppText variant="caption" color={toneSpec("amber", palette).fg}>No selling location assigned</AppText>
          )}
          {branches.length > visibleBranches.length ? (
            <View style={[styles.miniChip, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <AppText variant="caption" color={palette.soft}>+{branches.length - visibleBranches.length} more</AppText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable disabled={!canManage || protectedOwner} onPress={() => onEdit(employee)} style={[styles.smallAction, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: !canManage || protectedOwner ? 0.5 : 1 }]}> 
          <AppText variant="caption" color={palette.text}>Edit</AppText>
        </Pressable>
        <Pressable disabled={!canManage || protectedOwner} onPress={() => onResetPassword(employee)} style={[styles.smallAction, { borderColor: palette.border, backgroundColor: palette.panelStrong, opacity: !canManage || protectedOwner ? 0.5 : 1 }]}> 
          <AppText variant="caption" color={palette.text}>Password</AppText>
        </Pressable>
        <Pressable disabled={!canManage || protectedOwner} onPress={() => onToggleStatus(employee)} style={[styles.smallAction, { borderColor: active ? toneSpec("amber", palette).border : toneSpec("green", palette).border, backgroundColor: active ? toneSpec("amber", palette).bg : toneSpec("green", palette).bg, opacity: !canManage || protectedOwner ? 0.5 : 1 }]}> 
          <AppText variant="caption" color={active ? toneSpec("amber", palette).fg : toneSpec("green", palette).fg}>{active ? "Deactivate" : "Reactivate"}</AppText>
        </Pressable>
        <Pressable disabled={!canManage || protectedOwner} onPress={() => onDelete(employee)} style={[styles.smallAction, { borderColor: toneSpec("red", palette).border, backgroundColor: toneSpec("red", palette).bg, opacity: !canManage || protectedOwner ? 0.5 : 1 }]}> 
          <AppText variant="caption" color={toneSpec("red", palette).fg}>Remove</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function CustomerModal({
  open,
  palette,
  initial,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  initial: CustomerRecord | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: CustomerPayload, customerId?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<CustomerPayload>(EMPTY_CUSTOMER_FORM);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initial?.name || "",
      phone: initial?.phone || "",
      email: initial?.email || "",
      address: initial?.address || "",
      tinNumber: initial?.tinNumber || "",
      idNumber: initial?.idNumber || "",
      notes: initial?.notes || "",
      whatsappOptIn: Boolean(initial?.whatsappOptIn),
    });
  }, [open, initial]);

  async function submit() {
    const name = String(form.name || "").trim();
    const phone = String(form.phone || "").trim();

    if (!name || !phone) return;
    await onSave({ ...form, name, phone }, initial?.id);
  }

  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, gap: 5 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>{initial ? "Edit customer" : "New customer"}</AppText>
              <AppText variant="subtitle" color={palette.text}>{initial ? "Update customer profile" : "Create customer profile"}</AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>Used for sales, receipts, credit follow-up, repairs, warranties, and customer history.</AppText>
            </View>
            <Pressable disabled={busy} onPress={onClose} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Ionicons name="close" size={18} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            <View style={styles.twoCol}>
              <View style={styles.fieldHalf}>
                <InputBox label="Name" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Full name" palette={palette} />
              </View>
              <View style={styles.fieldHalf}>
                <InputBox label="Phone" value={form.phone} onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))} placeholder="07x xxx xxxx" palette={palette} keyboardType="phone-pad" />
              </View>
            </View>
            <InputBox label="Email" value={form.email || ""} onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))} placeholder="email@example.com" palette={palette} keyboardType="email-address" />
            <InputBox label="Address" value={form.address || ""} onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))} placeholder="Customer address" palette={palette} />
            <View style={styles.twoCol}>
              <View style={styles.fieldHalf}>
                <InputBox label="TIN number" value={form.tinNumber || ""} onChangeText={(value) => setForm((prev) => ({ ...prev, tinNumber: value }))} placeholder="Optional" palette={palette} />
              </View>
              <View style={styles.fieldHalf}>
                <InputBox label="ID number" value={form.idNumber || ""} onChangeText={(value) => setForm((prev) => ({ ...prev, idNumber: value }))} placeholder="Optional" palette={palette} />
              </View>
            </View>
            <InputBox label="Notes" value={form.notes || ""} onChangeText={(value) => setForm((prev) => ({ ...prev, notes: value }))} placeholder="Internal notes about this customer" palette={palette} multiline />

            <Pressable onPress={() => setForm((prev) => ({ ...prev, whatsappOptIn: !prev.whatsappOptIn }))} style={[styles.toggleRow, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label" color={palette.text}>Allow WhatsApp follow-up</AppText>
                <AppText variant="caption" color={palette.soft}>Use this when the customer accepts store updates.</AppText>
              </View>
              <Switch value={Boolean(form.whatsappOptIn)} onValueChange={(value) => setForm((prev) => ({ ...prev, whatsappOptIn: value }))} />
            </Pressable>
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable disabled={busy} onPress={onClose} style={[styles.secondaryAction, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <AppText variant="label" color={palette.text}>Cancel</AppText>
            </Pressable>
            <AsyncButton disabled={busy || !form.name.trim() || !form.phone.trim()} onPress={submit} style={styles.primaryAction}>
              {initial ? "Save customer" : "Create customer"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EmployeeModal({
  open,
  palette,
  initial,
  branches,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  initial: EmployeeRecord | null;
  branches: PeopleBranch[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: EmployeePayload, employeeId?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<EmployeePayload>(EMPTY_EMPLOYEE_FORM);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const editing = Boolean(initial?.id);
  const selectedRole = STAFF_ROLES.find((role) => normalizeRole(form.role) === role.value) || STAFF_ROLES[1];

  useMemo(() => {
    if (!open) return;

    const assignedBranches = normalizeEmployeeBranches(initial || null);
    const defaultBranch = assignedBranches.find((branch) => branch.isDefault) || assignedBranches.find((branch) => branch.isMain) || assignedBranches[0] || branches.find((branch) => branch.isMain) || branches[0] || null;

    setForm({
      name: initial?.name || "",
      email: initial?.email || "",
      phone: initial?.phone || "",
      password: "",
      role: initial?.role || "CASHIER",
      branchIds: assignedBranches.length > 0 ? assignedBranches.map((branch) => branch.id) : defaultBranch?.id ? [defaultBranch.id] : [],
      defaultBranchId: defaultBranch?.id || null,
      canViewAllBranches: Boolean(initial?.canViewAllBranches),
    });
  }, [open, initial, branches]);

  function toggleBranch(branchId: string) {
    setForm((prev) => {
      const current = Array.isArray(prev.branchIds) ? prev.branchIds : [];
      const exists = current.includes(branchId);
      const nextIds = exists ? current.filter((id) => id !== branchId) : [...current, branchId];
      const defaultBranchId = nextIds.includes(String(prev.defaultBranchId || "")) ? prev.defaultBranchId : nextIds[0] || null;

      return { ...prev, branchIds: nextIds, defaultBranchId };
    });
  }

  async function submit() {
    const name = String(form.name || "").trim();
    const email = String(form.email || "").trim();
    const password = String(form.password || "").trim();

    if (!name || !email || !form.role) return;
    if (!editing && password.length < 6) return;
    if (branches.length > 0 && (!form.branchIds || form.branchIds.length === 0)) return;

    await onSave({ ...form, name, email, password: password || undefined }, initial?.id);
  }

  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, gap: 5 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>{editing ? "Edit staff" : "New staff"}</AppText>
              <AppText variant="subtitle" color={palette.text}>{editing ? "Update responsibility and access" : "Add staff with clear responsibility"}</AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>Assign the person to selling locations and choose what they are responsible for.</AppText>
            </View>
            <Pressable disabled={busy} onPress={onClose} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Ionicons name="close" size={18} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            <InputBox label="Name" value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Staff name" palette={palette} />
            <InputBox label="Email" value={form.email} onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))} placeholder="staff@example.com" palette={palette} keyboardType="email-address" />
            <InputBox label="Phone" value={form.phone || ""} onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))} placeholder="Optional" palette={palette} keyboardType="phone-pad" />
            {!editing ? (
              <InputBox label="Temporary password" value={form.password || ""} onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))} placeholder="At least 6 characters" palette={palette} secureTextEntry />
            ) : null}

            <View style={styles.optionBlock}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Responsibility</AppText>
              <Pressable
                onPress={() => setRolePickerOpen((current) => !current)}
                style={[
                  styles.roleDropdownButton,
                  {
                    borderColor: rolePickerOpen ? palette.borderStrong : palette.border,
                    backgroundColor: rolePickerOpen ? "rgba(32,200,255,0.10)" : palette.panel,
                  },
                ]}
              >
                <View style={[styles.iconBox, { borderColor: toneSpec(selectedRole.tone, palette).border, backgroundColor: toneSpec(selectedRole.tone, palette).bg }]}> 
                  <Ionicons name={selectedRole.icon} size={18} color={toneSpec(selectedRole.tone, palette).fg} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>{selectedRole.label}</AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>{selectedRole.helper}</AppText>
                </View>
                <Ionicons name={rolePickerOpen ? "chevron-up" : "chevron-down"} size={18} color={palette.soft} />
              </Pressable>

              {rolePickerOpen ? (
                <View style={styles.roleDropdownList}>
                  {STAFF_ROLES.map((role) => {
                    const selected = normalizeRole(form.role) === role.value;
                    const spec = toneSpec(role.tone, palette);
                    return (
                      <Pressable
                        key={role.value}
                        onPress={() => {
                          setForm((prev) => ({ ...prev, role: role.value }));
                          setRolePickerOpen(false);
                        }}
                        style={[
                          styles.roleDropdownItem,
                          {
                            borderColor: selected ? spec.border : palette.border,
                            backgroundColor: selected ? spec.bg : palette.panelStrong,
                          },
                        ]}
                      >
                        <Ionicons name={role.icon} size={16} color={selected ? spec.fg : palette.soft} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="caption" color={selected ? spec.fg : palette.text}>{role.label}</AppText>
                          <AppText variant="caption" color={palette.soft} style={styles.cardText}>{role.helper}</AppText>
                        </View>
                        {selected ? <Ionicons name="checkmark" size={16} color={spec.fg} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.optionBlock}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Selling locations</AppText>
              <View style={styles.optionGrid}>
                {branches.length > 0 ? (
                  branches.map((branch) => {
                    const selected = Array.isArray(form.branchIds) && form.branchIds.includes(branch.id);
                    const isDefault = form.defaultBranchId === branch.id;
                    return (
                      <Pressable key={branch.id} onPress={() => toggleBranch(branch.id)} style={[styles.locationOption, { borderColor: selected ? palette.borderStrong : palette.border, backgroundColor: selected ? "rgba(32,200,255,0.12)" : palette.panel }]}> 
                        <View style={{ flex: 1, gap: 4 }}>
                          <AppText variant="label" color={palette.text}>{branchDisplayName(branch)}</AppText>
                          <AppText variant="caption" color={palette.soft}>{branch.isMain ? "Main selling location" : "Selling location"}</AppText>
                        </View>
                        <View style={[styles.checkCircle, { borderColor: selected ? palette.cyan : palette.border, backgroundColor: selected ? palette.cyan : "transparent" }]}> 
                          {selected ? <Ionicons name="checkmark" size={13} color="#06111F" /> : null}
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={[styles.locationOption, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                    <AppText variant="caption" color={palette.soft}>No selling locations returned by the server.</AppText>
                  </View>
                )}
              </View>
              {form.branchIds && form.branchIds.length > 1 ? (
                <View style={styles.defaultBlock}>
                  <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Default selling location</AppText>
                  <View style={styles.chipWrap}>
                    {branches.filter((branch) => form.branchIds?.includes(branch.id)).map((branch) => (
                      <Pressable key={branch.id} onPress={() => setForm((prev) => ({ ...prev, defaultBranchId: branch.id }))} style={[styles.miniChip, { borderColor: form.defaultBranchId === branch.id ? palette.borderStrong : palette.border, backgroundColor: form.defaultBranchId === branch.id ? "rgba(32,200,255,0.14)" : palette.panel }]}> 
                        <AppText variant="caption" color={form.defaultBranchId === branch.id ? palette.cyan : palette.text}>{branchDisplayName(branch)}</AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable disabled={busy} onPress={onClose} style={[styles.secondaryAction, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <AppText variant="label" color={palette.text}>Cancel</AppText>
            </Pressable>
            <AsyncButton disabled={busy || !form.name.trim() || !form.email.trim() || (!editing && String(form.password || "").trim().length < 6)} onPress={submit} style={styles.primaryAction}>
              {editing ? "Save staff" : "Create staff"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LedgerModal({ customer, customerId, palette, onClose }: { customer: CustomerRecord | null; customerId: string | null; palette: AppShellPalette; onClose: () => void }) {
  const ledgerQuery = useCustomerLedger(customerId);
  const ledger = ledgerQuery.data;
  const sales = Array.isArray(ledger?.sales) ? ledger.sales : [];

  if (!customerId) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.detailsModalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, gap: 5 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Customer history</AppText>
              <AppText variant="subtitle" color={palette.text}>{ledger?.customer?.name || customer?.name || "Customer"}</AppText>
              <AppText variant="caption" color={palette.soft}>Purchases, payments, and outstanding balance.</AppText>
            </View>
            <Pressable onPress={onClose} style={[styles.modalClose, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Ionicons name="close" size={18} color={palette.text} />
            </Pressable>
          </View>

          {ledgerQuery.isLoading ? (
            <View style={styles.modalScroll}>
              {[1, 2, 3].map((item) => <Skeleton key={item} height={74} width="100%" />)}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.detailGrid}>
                <View style={[styles.detailCell, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                  <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Sales</AppText>
                  <AppText variant="label" color={palette.text}>{String(ledger?.summary?.totalSales || 0)}</AppText>
                </View>
                <View style={[styles.detailCell, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                  <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Outstanding</AppText>
                  <AppText variant="label" color={Number(ledger?.summary?.totalOutstanding || 0) > 0 ? toneSpec("red", palette).fg : palette.text}>{formatMoney(ledger?.summary?.totalOutstanding)}</AppText>
                </View>
              </View>
              <View style={styles.detailGrid}>
                <View style={[styles.detailCell, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                  <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Total value</AppText>
                  <AppText variant="label" color={palette.text}>{formatMoney(ledger?.summary?.totalAll)}</AppText>
                </View>
                <View style={[styles.detailCell, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                  <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Paid</AppText>
                  <AppText variant="label" color={toneSpec("green", palette).fg}>{formatMoney(ledger?.summary?.totalPaid)}</AppText>
                </View>
              </View>

              <View style={styles.optionBlock}>
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Sales history</AppText>
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <View key={sale.id} style={[styles.historyItem, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                      <View style={{ flex: 1, gap: 4 }}>
                        <AppText variant="label" color={palette.text}>{sale.receiptNumber || sale.invoiceNumber || "Sale record"}</AppText>
                        <AppText variant="caption" color={palette.soft}>{formatDate(sale.createdAt)}</AppText>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <AppText variant="label" color={palette.text}>{formatMoney(sale.total)}</AppText>
                        <AppText variant="caption" color={palette.soft}>{sale.status || sale.saleType || "Sale"}</AppText>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                    <AppText variant="label" color={palette.text}>No sales history yet</AppText>
                    <AppText variant="caption" color={palette.soft}>This customer has no saved sales records here.</AppText>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({ open, palette, title, text, confirmLabel, danger = false, busy, onClose, onConfirm }: { open: boolean; palette: AppShellPalette; title: string; text: string; confirmLabel: string; danger?: boolean; busy: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  if (!open) return null;
  const spec = toneSpec(danger ? "red" : "green", palette);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.confirmCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={[styles.noticeMark, { backgroundColor: spec.solid }]}> 
            <Ionicons name={danger ? "warning-outline" : "checkmark-outline"} size={17} color="#06111F" />
          </View>
          <View style={{ gap: 8 }}>
            <AppText variant="subtitle" color={palette.text}>{title}</AppText>
            <AppText variant="caption" color={palette.soft} style={styles.cardText}>{text}</AppText>
          </View>
          <View style={styles.modalActions}>
            <Pressable disabled={busy} onPress={onClose} style={[styles.secondaryAction, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <AppText variant="label" color={palette.text}>Cancel</AppText>
            </Pressable>
            <AsyncButton disabled={busy} onPress={onConfirm} style={[styles.primaryAction, { backgroundColor: danger ? spec.solid : "#20C8FF", borderColor: danger ? spec.solid : "#20C8FF" }]}> 
              {confirmLabel}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ResetPasswordModal({ open, employee, palette, busy, onClose, onConfirm }: { open: boolean; employee: EmployeeRecord | null; palette: AppShellPalette; busy: boolean; onClose: () => void; onConfirm: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");

  useMemo(() => {
    if (open) setPassword("");
  }, [open, employee?.id]);

  if (!open || !employee) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.confirmCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={{ gap: 8 }}>
            <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Reset password</AppText>
            <AppText variant="subtitle" color={palette.text}>{employee.name}</AppText>
            <AppText variant="caption" color={palette.soft} style={styles.cardText}>Set a temporary password and share it privately.</AppText>
          </View>
          <InputBox label="New password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" palette={palette} />
          <View style={styles.modalActions}>
            <Pressable disabled={busy} onPress={onClose} style={[styles.secondaryAction, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <AppText variant="label" color={palette.text}>Cancel</AppText>
            </Pressable>
            <AsyncButton disabled={busy || password.trim().length < 6} onPress={() => onConfirm(password)} style={styles.primaryAction}>
              Reset password
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PeopleScreen() {
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(width, 720);
  const cardWidth = widthForColumns(columnsFor(layoutWidth));

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const cachedBranches = useBranchStore((state) => state.branches);

  const role = String(user?.role || "").toUpperCase();
  const managerCanView = canViewStaff(role);
  const ownerCanManage = canManagePeople(role);

  const customersQuery = usePeopleCustomers({ includeInactive: true });
  const employeesQuery = usePeopleEmployees();
  const branchesQuery = usePeopleBranches();

  const createCustomerMutation = useCreatePeopleCustomer();
  const updateCustomerMutation = useUpdatePeopleCustomer();
  const setCustomerStatusMutation = useSetCustomerStatus();
  const createEmployeeMutation = useCreatePeopleEmployee();
  const updateEmployeeMutation = useUpdatePeopleEmployee();
  const setEmployeeStatusMutation = useSetEmployeeStatus();
  const resetPasswordMutation = useResetPeopleEmployeePassword();
  const deleteEmployeeMutation = useDeletePeopleEmployee();

  const [activeTab, setActiveTab] = useState<PeopleTab>("CUSTOMERS");
  const [search, setSearch] = useState("");
  const [customerStatus, setCustomerStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [roleFilter, setRoleFilter] = useState<"ALL" | StaffRole>("ALL");
  const [visibleCustomersCount, setVisibleCustomersCount] = useState(INITIAL_LIST_LIMIT);
  const [visibleEmployeesCount, setVisibleEmployeesCount] = useState(INITIAL_LIST_LIMIT);
  const [notice, setNotice] = useState<Notice>(null);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerEditing, setCustomerEditing] = useState<CustomerRecord | null>(null);
  const [ledgerCustomer, setLedgerCustomer] = useState<CustomerRecord | null>(null);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeEditing, setEmployeeEditing] = useState<EmployeeRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<EmployeeRecord | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    text: string;
    confirmLabel: string;
    danger: boolean;
    action: null | (() => Promise<void>);
  }>({ open: false, title: "", text: "", confirmLabel: "", danger: false, action: null });

  const branches = useMemo(() => {
    if (branchesQuery.data && branchesQuery.data.length > 0) return branchesQuery.data;
    return cachedBranches;
  }, [branchesQuery.data, cachedBranches]);

  const customers = customersQuery.data || [];
  const employees = employeesQuery.data || [];
  const staffEmployees = useMemo(
    () => employees.filter((employee) => normalizeRole(employee.role) !== "OWNER"),
    [employees],
  );

  const customerSummary = useMemo(() => {
    const active = customers.filter((customer) => customer.isActive !== false).length;
    const inactive = customers.length - active;
    const outstanding = customers.reduce((sum, customer) => sum + Number(customer.outstanding || 0), 0);
    const whatsapp = customers.filter((customer) => Boolean(customer.whatsappOptIn)).length;

    return { active, inactive, outstanding, whatsapp };
  }, [customers]);

  const employeeSummary = useMemo(() => {
    const active = staffEmployees.filter((employee) => employee.isActive !== false).length;
    const inactive = staffEmployees.length - active;
    const managers = staffEmployees.filter((employee) => normalizeRole(employee.role) === "MANAGER").length;
    const assigned = staffEmployees.filter((employee) => normalizeEmployeeBranches(employee).length > 0).length;

    return { active, inactive, managers, assigned };
  }, [staffEmployees]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const active = customer.isActive !== false;
      const matchesStatus = customerStatus === "ALL" ? true : customerStatus === "ACTIVE" ? active : !active;
      const matchesSearch = !q || searchText([customer.name, customer.phone, customer.email, customer.address, customer.tinNumber, customer.idNumber]).includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [customers, customerStatus, search]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();

    return staffEmployees.filter((employee) => {
      const branchesText = normalizeEmployeeBranches(employee).map(branchDisplayName).join(" ");
      const matchesRole = roleFilter === "ALL" ? true : normalizeRole(employee.role) === roleFilter;
      const matchesSearch = !q || searchText([employee.name, employee.email, employee.phone, employee.role, branchesText]).includes(q);
      return matchesRole && matchesSearch;
    });
  }, [staffEmployees, roleFilter, search]);

  const visibleCustomers = filteredCustomers.slice(0, visibleCustomersCount);
  const visibleEmployees = filteredEmployees.slice(0, visibleEmployeesCount);
  const hasMoreCustomers = visibleCustomersCount < filteredCustomers.length;
  const hasMoreEmployees = visibleEmployeesCount < filteredEmployees.length;

  useEffect(() => {
    setVisibleCustomersCount(INITIAL_LIST_LIMIT);
    setVisibleEmployeesCount(INITIAL_LIST_LIMIT);
  }, [activeTab, search, customerStatus, roleFilter]);

  const loading = isHydrating || !user || !tenant || customersQuery.isLoading || (managerCanView && employeesQuery.isLoading);

  async function refreshAll() {
    await Promise.all([customersQuery.refetch(), employeesQuery.refetch(), branchesQuery.refetch()]);
    setNotice({ tone: "success", title: "People refreshed", text: "Customer and staff records are up to date." });
  }

  async function saveCustomer(payload: CustomerPayload, customerId?: string) {
    try {
      if (customerId) {
        await updateCustomerMutation.mutateAsync({ customerId, payload });
        setNotice({ tone: "success", title: "Customer updated", text: `${payload.name} was updated successfully.` });
      } else {
        await createCustomerMutation.mutateAsync(payload);
        setNotice({ tone: "success", title: "Customer created", text: `${payload.name} was added to customer records.` });
      }
      setCustomerModalOpen(false);
      setCustomerEditing(null);
    } catch (error) {
      setNotice({ tone: "danger", title: "Customer not saved", text: error instanceof Error ? error.message : "Please check the details and try again." });
    }
  }

  async function saveEmployee(payload: EmployeePayload, employeeId?: string) {
    try {
      if (employeeId) {
        await updateEmployeeMutation.mutateAsync({ employeeId, payload });
        setNotice({ tone: "success", title: "Staff updated", text: `${payload.name} was updated successfully.` });
      } else {
        await createEmployeeMutation.mutateAsync(payload);
        setNotice({ tone: "success", title: "Staff created", text: `${payload.name} can now access the workspace.` });
      }
      setEmployeeModalOpen(false);
      setEmployeeEditing(null);
    } catch (error) {
      setNotice({ tone: "danger", title: "Staff not saved", text: error instanceof Error ? error.message : "Please check the details and try again." });
    }
  }

  function askCustomerStatus(customer: CustomerRecord) {
    const active = customer.isActive !== false;
    setConfirmState({
      open: true,
      title: active ? "Deactivate customer?" : "Reactivate customer?",
      text: active ? `${customer.name} will be hidden from active customer lists. Their history stays saved.` : `${customer.name} will appear in active customer lists again.`,
      confirmLabel: active ? "Deactivate" : "Reactivate",
      danger: active,
      action: async () => {
        await setCustomerStatusMutation.mutateAsync({ customerId: customer.id, active: !active });
        setNotice({ tone: "success", title: active ? "Customer deactivated" : "Customer reactivated", text: `${customer.name} was updated.` });
      },
    });
  }

  function askEmployeeStatus(employee: EmployeeRecord) {
    const active = employee.isActive !== false;
    setConfirmState({
      open: true,
      title: active ? "Deactivate staff member?" : "Reactivate staff member?",
      text: active ? `${employee.name} will no longer access the workspace.` : `${employee.name} will regain workspace access.`,
      confirmLabel: active ? "Deactivate" : "Reactivate",
      danger: active,
      action: async () => {
        await setEmployeeStatusMutation.mutateAsync({ employeeId: employee.id, active: !active });
        setNotice({ tone: "success", title: active ? "Staff deactivated" : "Staff reactivated", text: `${employee.name} was updated.` });
      },
    });
  }

  function askDeleteEmployee(employee: EmployeeRecord) {
    setConfirmState({
      open: true,
      title: "Remove staff member?",
      text: `Remove ${employee.name} from this workspace. Use this only when the record should no longer be kept in the active staff list.`,
      confirmLabel: "Remove",
      danger: true,
      action: async () => {
        await deleteEmployeeMutation.mutateAsync(employee.id);
        setNotice({ tone: "success", title: "Staff removed", text: `${employee.name} was removed.` });
      },
    });
  }

  async function runConfirmAction() {
    if (!confirmState.action) return;

    try {
      await confirmState.action();
      setConfirmState({ open: false, title: "", text: "", confirmLabel: "", danger: false, action: null });
    } catch (error) {
      setNotice({ tone: "danger", title: "Action failed", text: error instanceof Error ? error.message : "Please try again." });
      setConfirmState({ open: false, title: "", text: "", confirmLabel: "", danger: false, action: null });
    }
  }

  async function resetPassword(password: string) {
    if (!resetTarget) return;

    try {
      await resetPasswordMutation.mutateAsync({ employeeId: resetTarget.id, password });
      setNotice({ tone: "success", title: "Password reset", text: `New temporary password saved for ${resetTarget.name}.` });
      setResetTarget(null);
    } catch (error) {
      setNotice({ tone: "danger", title: "Password not reset", text: error instanceof Error ? error.message : "Please try again." });
    }
  }

  return (
    <AppShell>
      {(palette) =>
        loading ? (
          <PeopleSkeleton palette={palette} width={layoutWidth} />
        ) : (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <View style={[styles.heroPanel, { borderColor: palette.borderStrong, backgroundColor: "rgba(32,200,255,0.10)" }]}> 
              <View style={styles.heroGlow} />
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Ionicons name="people-outline" size={23} color="#06111F" />
                </View>
                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>People control</AppText>
                  </View>
                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>Customers, staff, and access.</AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>Manage the people connected to {tenant?.name || "this business"} with clear responsibility and clean records.</AppText>
                </View>
                <StatusPill label={ownerCanManage ? "Owner control" : "View access"} tone={ownerCanManage ? "green" : "amber"} palette={palette} />
              </View>
            </View>

            <NoticeBanner notice={notice} palette={palette} onClose={() => setNotice(null)} />

            <View style={styles.responsiveGrid}>
              <SummaryCard label="Active customers" value={String(customerSummary.active)} helper="Customer records ready for sales and service." icon="person-outline" tone="cyan" palette={palette} width={cardWidth} />
              <SummaryCard label="Active staff" value={String(employeeSummary.active)} helper="People who can work in the workspace." icon="people-circle-outline" tone="green" palette={palette} width={cardWidth} />
              <SummaryCard label="Assigned staff" value={String(employeeSummary.assigned)} helper="Staff connected to selling locations." icon="storefront-outline" tone="blue" palette={palette} width={cardWidth} />
              <SummaryCard label="Outstanding" value={formatMoney(customerSummary.outstanding)} helper="Customer balance still to follow up." icon="wallet-outline" tone={customerSummary.outstanding > 0 ? "amber" : "green"} palette={palette} width={cardWidth} />
            </View>

            <View style={[styles.toolbar, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <View style={styles.tabsRow}>
                <TabButton tab="CUSTOMERS" active={activeTab === "CUSTOMERS"} label="Customers" icon="person-outline" palette={palette} onPress={setActiveTab} />
                <TabButton tab="STAFF" active={activeTab === "STAFF"} label="Staff" icon="people-circle-outline" palette={palette} onPress={setActiveTab} />
                <TabButton tab="ACCESS" active={activeTab === "ACCESS"} label="Access" icon="shield-checkmark-outline" palette={palette} onPress={setActiveTab} />
              </View>

              <View style={[styles.searchBox, { borderColor: palette.border, backgroundColor: isLightPalette(palette) ? "#FFFFFF" : "rgba(3,17,31,0.42)" }]}> 
                <Ionicons name="search-outline" size={17} color={palette.soft} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={activeTab === "CUSTOMERS" ? "Search customers" : activeTab === "STAFF" ? "Search staff" : "Search access guide"}
                  placeholderTextColor={palette.soft}
                  style={[styles.searchInput, { color: palette.text }]}
                />
                {search.trim() ? (
                  <Pressable onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={17} color={palette.soft} />
                  </Pressable>
                ) : null}
              </View>

              {activeTab === "CUSTOMERS" ? (
                <View style={styles.chipWrap}>
                  {[{ key: "ACTIVE", label: "Active" }, { key: "ALL", label: "All" }, { key: "INACTIVE", label: "Inactive" }].map((item) => (
                    <Pressable key={item.key} onPress={() => setCustomerStatus(item.key as "ALL" | "ACTIVE" | "INACTIVE")} style={[styles.filterChip, { borderColor: customerStatus === item.key ? palette.borderStrong : palette.border, backgroundColor: customerStatus === item.key ? "rgba(32,200,255,0.14)" : palette.panelStrong }]}> 
                      <AppText variant="caption" color={customerStatus === item.key ? palette.cyan : palette.text}>{item.label}</AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {activeTab === "STAFF" ? (
                <View style={styles.chipWrap}>
                  {[{ value: "ALL", label: "All" }, ...STAFF_ROLES.map((roleItem) => ({ value: roleItem.value, label: roleItem.label }))].map((item) => (
                    <Pressable key={String(item.value)} onPress={() => setRoleFilter(item.value)} style={[styles.filterChip, { borderColor: roleFilter === item.value ? palette.borderStrong : palette.border, backgroundColor: roleFilter === item.value ? "rgba(32,200,255,0.14)" : palette.panelStrong }]}> 
                      <AppText variant="caption" color={roleFilter === item.value ? palette.cyan : palette.text}>{item.label}</AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.toolbarActions}>
                <AsyncButton onPress={refreshAll} variant="secondary" style={[styles.refreshButton, { borderColor: palette.border }]}>Refresh</AsyncButton>
                {activeTab === "CUSTOMERS" ? (
                  <Pressable onPress={() => { setCustomerEditing(null); setCustomerModalOpen(true); }} style={[styles.addButton, { backgroundColor: "#20C8FF", borderColor: "#20C8FF" }]}> 
                    <AppText variant="label" color="#06111F">New customer</AppText>
                  </Pressable>
                ) : activeTab === "STAFF" && ownerCanManage ? (
                  <Pressable onPress={() => { setEmployeeEditing(null); setEmployeeModalOpen(true); }} style={[styles.addButton, { backgroundColor: "#20C8FF", borderColor: "#20C8FF" }]}> 
                    <AppText variant="label" color="#06111F">New staff</AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {activeTab === "CUSTOMERS" ? (
              <View style={styles.stack}>
                <View style={styles.listHeader}>
                  <View>
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Customer records</AppText>
                    <AppText variant="subtitle" color={palette.text}>Customers</AppText>
                  </View>
                  <AppText variant="caption" color={palette.soft}>{visibleCustomers.length} of {filteredCustomers.length} shown</AppText>
                </View>
                {customersQuery.isError ? (
                  <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                    <AppText variant="label" color={palette.text}>Customers could not load</AppText>
                    <AppText variant="caption" color={palette.soft}>Check the connection and refresh.</AppText>
                  </View>
                ) : filteredCustomers.length > 0 ? (
                  <>
                    <View style={styles.recordsGrid}>
                      {visibleCustomers.map((customer) => (
                        <CustomerCard
                          key={customer.id}
                          customer={customer}
                          palette={palette}
                          width={cardWidth}
                          onEdit={(item) => { setCustomerEditing(item); setCustomerModalOpen(true); }}
                          onHistory={(item) => setLedgerCustomer(item)}
                          onToggleStatus={askCustomerStatus}
                        />
                      ))}
                    </View>
                    {hasMoreCustomers ? (
                      <Pressable onPress={() => setVisibleCustomersCount((count) => count + INITIAL_LIST_LIMIT)} style={[styles.viewMoreButton, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
                        <AppText variant="label" color={palette.text}>View more customers</AppText>
                        <AppText variant="caption" color={palette.soft}>{filteredCustomers.length - visibleCustomers.length} more</AppText>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                    <IconBox icon="person-add-outline" tone="cyan" palette={palette} />
                    <AppText variant="label" color={palette.text}>No customers found</AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>Create a customer profile once, then reuse it for sales, repairs, credit follow-up, and WhatsApp updates.</AppText>
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === "STAFF" ? (
              <View style={styles.stack}>
                <View style={styles.listHeader}>
                  <View>
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Staff records</AppText>
                    <AppText variant="subtitle" color={palette.text}>Team members</AppText>
                  </View>
                  <AppText variant="caption" color={palette.soft}>{visibleEmployees.length} of {filteredEmployees.length} shown</AppText>
                </View>
                {!managerCanView ? (
                  <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                    <IconBox icon="lock-closed-outline" tone="amber" palette={palette} />
                    <AppText variant="label" color={palette.text}>Staff list is protected</AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>Only owners and managers can view staff records.</AppText>
                  </View>
                ) : employeesQuery.isError ? (
                  <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                    <AppText variant="label" color={palette.text}>Staff could not load</AppText>
                    <AppText variant="caption" color={palette.soft}>Check the connection and refresh.</AppText>
                  </View>
                ) : filteredEmployees.length > 0 ? (
                  <>
                    <View style={styles.recordsGrid}>
                      {visibleEmployees.map((employee) => (
                        <EmployeeCard
                          key={employee.id}
                          employee={employee}
                          palette={palette}
                          width={cardWidth}
                          canManage={ownerCanManage}
                          onEdit={(item) => { setEmployeeEditing(item); setEmployeeModalOpen(true); }}
                          onResetPassword={setResetTarget}
                          onToggleStatus={askEmployeeStatus}
                          onDelete={askDeleteEmployee}
                        />
                      ))}
                    </View>
                    {hasMoreEmployees ? (
                      <Pressable onPress={() => setVisibleEmployeesCount((count) => count + INITIAL_LIST_LIMIT)} style={[styles.viewMoreButton, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
                        <AppText variant="label" color={palette.text}>View more staff</AppText>
                        <AppText variant="caption" color={palette.soft}>{filteredEmployees.length - visibleEmployees.length} more</AppText>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                    <IconBox icon="person-add-outline" tone="green" palette={palette} />
                    <AppText variant="label" color={palette.text}>No staff found</AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>Add staff with clear responsibility and selling-location access.</AppText>
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === "ACCESS" ? (
              <View style={styles.stack}>
                <View style={[styles.notePanel, { borderColor: palette.borderStrong, backgroundColor: "rgba(32,200,255,0.10)" }]}> 
                  <IconBox icon="shield-checkmark-outline" tone="cyan" palette={palette} filled />
                  <View style={{ flex: 1, gap: 5 }}>
                    <AppText variant="label" color={palette.text}>Keep access simple and safe</AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>Owners keep full control. Staff should only see the tools needed for their responsibility.</AppText>
                  </View>
                </View>
                <View style={styles.recordsGrid}>
                  {STAFF_ROLES.map((roleItem) => {
                    const spec = toneSpec(roleItem.tone, palette);
                    return (
                      <View key={roleItem.value} style={[styles.accessCard, { width: cardWidth, borderColor: palette.border, backgroundColor: palette.panel }]}> 
                        <View style={styles.accessCardHeader}>
                          <View style={[styles.iconBox, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
                            <Ionicons name={roleItem.icon} size={18} color={spec.fg} />
                          </View>
                          <StatusPill label="Controlled" tone={roleItem.tone} palette={palette} />
                        </View>
                        <View style={{ gap: 5 }}>
                          <AppText variant="label" color={palette.text}>{roleItem.label}</AppText>
                          <AppText variant="caption" color={palette.soft} style={styles.cardText}>{roleItem.helper}</AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <CustomerModal
              open={customerModalOpen}
              palette={palette}
              initial={customerEditing}
              busy={createCustomerMutation.isPending || updateCustomerMutation.isPending}
              onClose={() => { setCustomerModalOpen(false); setCustomerEditing(null); }}
              onSave={saveCustomer}
            />

            <EmployeeModal
              open={employeeModalOpen}
              palette={palette}
              initial={employeeEditing}
              branches={branches}
              busy={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
              onClose={() => { setEmployeeModalOpen(false); setEmployeeEditing(null); }}
              onSave={saveEmployee}
            />

            <LedgerModal customer={ledgerCustomer} customerId={ledgerCustomer?.id || null} palette={palette} onClose={() => setLedgerCustomer(null)} />

            <ResetPasswordModal
              open={Boolean(resetTarget)}
              employee={resetTarget}
              palette={palette}
              busy={resetPasswordMutation.isPending}
              onClose={() => setResetTarget(null)}
              onConfirm={resetPassword}
            />

            <ConfirmModal
              open={confirmState.open}
              palette={palette}
              title={confirmState.title}
              text={confirmState.text}
              confirmLabel={confirmState.confirmLabel}
              danger={confirmState.danger}
              busy={setCustomerStatusMutation.isPending || setEmployeeStatusMutation.isPending || deleteEmployeeMutation.isPending}
              onClose={() => setConfirmState({ open: false, title: "", text: "", confirmLabel: "", danger: false, action: null })}
              onConfirm={runConfirmAction}
            />
          </View>
        )
      }
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  screenBottomSpace: { paddingBottom: 20 },
  eyebrow: { letterSpacing: 0.8, textTransform: "uppercase" },
  cardText: { flexShrink: 1, lineHeight: 18 },
  heroPanel: { position: "relative", overflow: "hidden", borderWidth: 1, padding: 16, gap: 16 },
  heroGlow: { position: "absolute", right: -88, top: -88, width: 178, height: 178, backgroundColor: "rgba(32,200,255,0.12)", transform: [{ rotate: "18deg" }] },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroIcon: { width: 56, height: 56, alignItems: "center", justifyContent: "center", backgroundColor: "#67E8F9" },
  heroContent: { flex: 1, minWidth: 0, gap: 6 },
  heroLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  heroDot: { width: 6, height: 6, backgroundColor: "#67E8F9" },
  heroTitle: { lineHeight: 24 },
  responsiveGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  recordsGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { minHeight: 112, borderWidth: 1, padding: 13, gap: 8 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBox: { width: 38, height: 38, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statusPill: { flexShrink: 0, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 7, height: 7 },
  statusText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  notice: { borderWidth: 1, padding: 13, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  noticeMark: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  closeMini: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  toolbar: { borderWidth: 1, padding: 12, gap: 12 },
  tabsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tabButton: { minHeight: 38, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  tabText: { fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" },
  searchBox: { minHeight: 48, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 14, outlineStyle: "none" as never },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  toolbarActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  refreshButton: { minHeight: 46, borderRadius: 0 },
  addButton: { minHeight: 46, borderWidth: 1, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  listHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  recordCard: { borderWidth: 1, padding: 14, gap: 12, minHeight: 184 },
  recordHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  avatarWrap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  detailGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  detailCell: { flex: 1, minWidth: 130, borderWidth: 1, padding: 11, gap: 4 },
  branchPanel: { borderWidth: 1, padding: 11, gap: 8 },
  miniChip: { borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallAction: { borderWidth: 1, minHeight: 36, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  emptyPanel: { borderWidth: 1, padding: 18, gap: 10, alignItems: "flex-start" },
  notePanel: { borderWidth: 1, padding: 14, flexDirection: "row", gap: 12 },
  accessCard: { borderWidth: 1, padding: 14, gap: 12, minHeight: 116 },
  accessCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  viewMoreButton: { borderWidth: 1, minHeight: 48, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.72)", padding: 16, alignItems: "center", justifyContent: "center" },
  modalCard: { width: "100%", maxWidth: 540, maxHeight: "92%", borderWidth: 1, padding: 16, gap: 14, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 28, shadowOffset: { width: 0, height: 18 }, elevation: 16 },
  detailsModalCard: { maxWidth: 560 },
  confirmCard: { width: "100%", maxWidth: 430, borderWidth: 1, padding: 16, gap: 16 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  modalClose: { width: 38, height: 38, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalScroll: { gap: 12, paddingBottom: 4 },
  twoCol: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  fieldHalf: { flex: 1, minWidth: 180 },
  inputWrap: { gap: 7 },
  input: { minHeight: 50, borderWidth: 1, paddingHorizontal: 13, fontSize: 14 },
  textArea: { minHeight: 96, paddingTop: 12, paddingBottom: 12 },
  toggleRow: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  modalActions: { flexDirection: "row", gap: 10 },
  secondaryAction: { flex: 1, minHeight: 50, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  primaryAction: { flex: 1, minHeight: 50, borderRadius: 0, backgroundColor: "#20C8FF", borderColor: "#20C8FF" },
  optionBlock: { gap: 10 },
  optionGrid: { gap: 8 },
  roleOption: { borderWidth: 1, padding: 11, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  roleDropdownButton: { minHeight: 62, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  roleDropdownList: { gap: 8 },
  roleDropdownItem: { borderWidth: 1, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  locationOption: { borderWidth: 1, padding: 12, flexDirection: "row", gap: 12, alignItems: "center" },
  checkCircle: { width: 24, height: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  defaultBlock: { gap: 8 },
  historyItem: { borderWidth: 1, padding: 12, flexDirection: "row", gap: 12, alignItems: "center" },
});
