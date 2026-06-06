import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppButton } from "../../../src/components/ui/AppButton";
import { AppText } from "../../../src/components/ui/AppText";
import { AppTextInput } from "../../../src/components/ui/AppTextInput";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import {
  useAccessMembers,
  useCreateAccessMember,
  useResetAccessMemberPassword,
  useStoreLocations,
  useUpdateAccessMember,
  useUpdateAccessMemberStatus,
} from "../../../src/features/settings/hooks";
import type {
  AccessMember,
  CreateAccessMemberPayload,
  StaffRole,
  StaffStoreAccess,
  StoreLocation,
} from "../../../src/features/settings/types";
import { useAuthStore } from "../../../src/store/authStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";
type ModalMode = "create" | "edit";

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

type EditableAssignment = {
  branchId: string;
  isDefault: boolean;
  canOperate: boolean;
  canViewReports: boolean;
};

type AccessFormValues = {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  password: string;
  branchAssignments: EditableAssignment[];
};

const STAFF_ROLES: StaffRole[] = [
  "MANAGER",
  "CASHIER",
  "SELLER",
  "STOREKEEPER",
  "TECHNICIAN",
];

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeRole(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function roleLabel(value?: string | null) {
  const role = normalizeRole(value);

  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  if (role === "CASHIER") return "Cashier";
  if (role === "SELLER") return "Seller";
  if (role === "STOREKEEPER") return "Storekeeper";
  if (role === "TECHNICIAN") return "Technician";

  return "Staff";
}

function roleAccessText(value?: string | null) {
  const role = normalizeRole(value);

  if (role === "OWNER") return "Full business control";
  if (role === "MANAGER") return "Runs daily operations and sees reports";
  if (role === "CASHIER") return "Handles sales and cash drawer work";
  if (role === "SELLER") return "Creates sales and manages customers";
  if (role === "STOREKEEPER") return "Controls stock movement and stock checks";
  if (role === "TECHNICIAN") return "Handles repairs and service work";

  return "Business access";
}

function roleTone(value?: string | null): Tone {
  const role = normalizeRole(value);

  if (role === "OWNER") return "cyan";
  if (role === "MANAGER") return "blue";
  if (role === "CASHIER") return "green";
  if (role === "SELLER") return "green";
  if (role === "STOREKEEPER") return "amber";
  if (role === "TECHNICIAN") return "slate";

  return "slate";
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleDateString();
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

function activeLocations(locations: StoreLocation[]) {
  return locations.filter((location) => {
    const status = String(location.status || "ACTIVE").toUpperCase();
    return location.id && status === "ACTIVE";
  });
}

function assignmentBranchName(assignment: StaffStoreAccess) {
  return clean(
    assignment.branch?.name || assignment.branch?.code || assignment.branchId,
    "Store location",
  );
}

function memberLocationsText(member: AccessMember) {
  const assignments = Array.isArray(member.branchAssignments)
    ? member.branchAssignments
    : [];

  if (normalizeRole(member.role) === "OWNER") return "All store locations";
  if (!assignments.length) return "No location assigned";

  const names = assignments.map(assignmentBranchName).filter(Boolean);

  if (names.length <= 2) return names.join(", ");

  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

function selectedAssignment(assignments: EditableAssignment[], branchId?: string | null) {
  if (!branchId) return null;
  return assignments.find((item) => item.branchId === branchId) || null;
}

function buildInitialAssignments(member: AccessMember): EditableAssignment[] {
  return (member.branchAssignments || [])
    .filter((assignment) => assignment?.branchId)
    .map((assignment) => ({
      branchId: assignment.branchId,
      isDefault: Boolean(assignment.isDefault),
      canOperate: assignment.canOperate !== false,
      canViewReports: Boolean(assignment.canViewReports),
    }));
}

function normalizeAssignments(assignments: EditableAssignment[]) {
  const unique = new Map<string, EditableAssignment>();

  for (const assignment of assignments) {
    if (!assignment.branchId) continue;
    unique.set(assignment.branchId, {
      branchId: assignment.branchId,
      isDefault: Boolean(assignment.isDefault),
      canOperate: assignment.canOperate !== false,
      canViewReports: Boolean(assignment.canViewReports),
    });
  }

  const list = Array.from(unique.values());
  if (!list.length) return [];

  if (!list.some((item) => item.isDefault)) {
    return list.map((item, index) => ({ ...item, isDefault: index === 0 }));
  }

  let picked = false;
  return list.map((item) => {
    if (item.isDefault && !picked) {
      picked = true;
      return item;
    }

    return { ...item, isDefault: false };
  });
}

function accessRiskLabel({
  inactiveCount,
  unassignedCount,
  remainingSeats,
}: {
  inactiveCount: number;
  unassignedCount: number;
  remainingSeats: number | null;
}) {
  if (unassignedCount > 0) {
    return {
      tone: "amber" as Tone,
      title: "Review needed",
      text: `${unassignedCount} staff member${unassignedCount === 1 ? "" : "s"} need store-location access.`,
    };
  }

  if (remainingSeats === 0) {
    return {
      tone: "amber" as Tone,
      title: "Seat limit reached",
      text: "Your current plan has no available staff seat left.",
    };
  }

  if (inactiveCount > 0) {
    return {
      tone: "blue" as Tone,
      title: "Inactive access kept visible",
      text: "Inactive staff access is listed for owner review.",
    };
  }

  return {
    tone: "green" as Tone,
    title: "Access looks controlled",
    text: "Owner access is protected and active staff have clear store-location access.",
  };
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validatePassword(value: string) {
  const password = value.trim();
  if (password.length < 6) return "Temporary password must be at least 6 characters.";
  return null;
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
    <View style={[styles.pill, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <AppText variant="caption" color={spec.fg} style={styles.pillText}>
        {label}
      </AppText>
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
}: {
  label: string;
  value: string;
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
      <View style={[styles.summaryIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
        <Ionicons name={icon} size={17} color={spec.fg} />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="caption" color={palette.soft} style={styles.summaryLabel}>
          {label}
        </AppText>
        <AppText variant="subtitle" color={palette.text} style={styles.summaryValue}>
          {value}
        </AppText>
      </View>
    </View>
  );
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
    <View style={[styles.noticePanel, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <View style={[styles.noticeIcon, { backgroundColor: spec.solid }]}>
        <Ionicons name="checkmark" size={16} color="#06111F" />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={spec.fg}>
          {notice.title}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.noticeText}>
          {notice.text}
        </AppText>
      </View>

      <Pressable onPress={onClose} style={styles.noticeClose}>
        <Ionicons name="close" size={17} color={palette.soft} />
      </Pressable>
    </View>
  );
}

function RiskPanel({
  tone,
  title,
  text,
  palette,
}: {
  tone: Tone;
  title: string;
  text: string;
  palette: AppShellPalette;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.riskPanel, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <View style={[styles.riskIcon, { backgroundColor: spec.solid }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#06111F" />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={spec.fg}>
          {title}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

function AccessSkeleton({
  palette,
  width,
}: {
  palette: AppShellPalette;
  width: number;
}) {
  const effectiveWidth = Math.min(width, 720);
  const summaryWidth = widthForColumns(getColumns(effectiveWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(effectiveWidth, "cards"));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <View style={styles.topBar}>
        <Skeleton height={42} width={42} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={12} width="28%" />
          <Skeleton height={24} width="58%" />
        </View>
        <Skeleton height={30} width={92} />
      </View>

      <View style={[styles.hero, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.10)" }]}>
        <Skeleton height={54} width={54} />
        <View style={{ flex: 1, gap: 10 }}>
          <Skeleton height={13} width="34%" />
          <Skeleton height={26} width="74%" />
          <Skeleton height={14} width="92%" />
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={`summary-${item}`} style={[styles.summaryCard, { width: summaryWidth, borderColor: palette.border, backgroundColor: palette.panel }]}>
            <Skeleton height={32} width={32} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={11} width="44%" />
              <Skeleton height={19} width="66%" />
            </View>
          </View>
        ))}
      </View>

      <Skeleton height={64} width="100%" />
      <Skeleton height={34} width="62%" />

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={`member-${item}`} style={[styles.memberCard, { width: cardWidth, borderColor: palette.border, backgroundColor: palette.panel }]}>
            <View style={styles.memberTop}>
              <Skeleton height={38} width={38} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton height={18} width="62%" />
                <Skeleton height={12} width="44%" />
              </View>
            </View>
            <Skeleton height={42} width="100%" />
            <Skeleton height={42} width="100%" />
          </View>
        ))}
      </View>
    </View>
  );
}

function MemberCard({
  member,
  palette,
  width,
  currentUserId,
  savingStatus,
  resettingPassword,
  onEdit,
  onToggleStatus,
  onResetPassword,
}: {
  member: AccessMember;
  palette: AppShellPalette;
  width: DimensionValue;
  currentUserId?: string | null;
  savingStatus: boolean;
  resettingPassword: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onResetPassword: () => void;
}) {
  const role = normalizeRole(member.role);
  const isOwner = role === "OWNER";
  const isSelf = Boolean(currentUserId && currentUserId === member.id);
  const active = member.isActive !== false;
  const roleSpec = toneSpec(roleTone(role), palette);

  return (
    <View style={[styles.memberCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.memberTop}>
        <View style={[styles.avatar, { borderColor: roleSpec.border, backgroundColor: roleSpec.bg }]}>
          <Ionicons name={isOwner ? "shield-checkmark-outline" : "person-outline"} size={18} color={roleSpec.fg} />
        </View>

        <View style={{ flex: 1, gap: 7 }}>
          <View style={styles.memberNameRow}>
            <AppText variant="label" color={palette.text} style={styles.memberName}>
              {clean(member.name, "Staff member")}
            </AppText>
            <StatusPill label={roleLabel(role)} tone={roleTone(role)} palette={palette} />
            <StatusPill label={active ? "Active" : "Inactive"} tone={active ? "green" : "slate"} palette={palette} />
            {isSelf ? <StatusPill label="You" tone="cyan" palette={palette} /> : null}
          </View>

          <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
            {roleAccessText(role)}
          </AppText>
        </View>
      </View>

      <View style={styles.compactGrid}>
        <View style={[styles.compactInfo, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.compactLabel}>
            Contact
          </AppText>
          <AppText variant="caption" color={palette.text} style={styles.compactValue}>
            {clean(member.email || member.phone, "No contact recorded")}
          </AppText>
        </View>

        <View style={[styles.compactInfo, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.compactLabel}>
            Store access
          </AppText>
          <AppText variant="caption" color={palette.text} style={styles.compactValue}>
            {memberLocationsText(member)}
          </AppText>
        </View>

        <View style={[styles.compactInfo, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.compactLabel}>
            Added
          </AppText>
          <AppText variant="caption" color={palette.text} style={styles.compactValue}>
            {formatDate(member.createdAt)}
          </AppText>
        </View>
      </View>

      <View style={styles.memberActions}>
        <Pressable
          disabled={isOwner}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.primaryAction,
            {
              borderColor: isOwner ? palette.border : palette.cyan,
              backgroundColor: isOwner ? palette.stage : palette.cyan,
              opacity: isOwner ? 0.45 : pressed ? 0.76 : 1,
            },
          ]}
        >
          <AppText variant="label" color={isOwner ? palette.soft : "#06111F"}>
            Edit access
          </AppText>
        </Pressable>

        <Pressable
          disabled={isOwner || isSelf || resettingPassword}
          onPress={onResetPassword}
          style={({ pressed }) => [
            styles.secondaryAction,
            {
              borderColor: toneSpec("blue", palette).border,
              backgroundColor: toneSpec("blue", palette).bg,
              opacity: isOwner || isSelf ? 0.45 : pressed || resettingPassword ? 0.7 : 1,
            },
          ]}
        >
          <AppText variant="label" color={toneSpec("blue", palette).fg}>
            {resettingPassword ? "Saving..." : "Reset password"}
          </AppText>
        </Pressable>

        <Pressable
          disabled={isOwner || isSelf || savingStatus}
          onPress={onToggleStatus}
          style={({ pressed }) => [
            styles.secondaryAction,
            {
              borderColor: active ? toneSpec("red", palette).border : toneSpec("green", palette).border,
              backgroundColor: active ? toneSpec("red", palette).bg : toneSpec("green", palette).bg,
              opacity: isOwner || isSelf ? 0.45 : pressed || savingStatus ? 0.7 : 1,
            },
          ]}
        >
          <AppText variant="label" color={active ? toneSpec("red", palette).fg : toneSpec("green", palette).fg}>
            {savingStatus ? "Saving..." : active ? "Deactivate" : "Activate"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function AssignmentEditor({
  locations,
  palette,
  assignments,
  onChange,
}: {
  locations: StoreLocation[];
  palette: AppShellPalette;
  assignments: EditableAssignment[];
  onChange: (assignments: EditableAssignment[]) => void;
}) {
  const usableLocations = useMemo(() => activeLocations(locations), [locations]);

  function updateAssignment(branchId: string, patch: Partial<EditableAssignment>) {
    const exists = assignments.find((item) => item.branchId === branchId);

    let next: EditableAssignment[];
    if (!exists) {
      next = [
        ...assignments,
        {
          branchId,
          isDefault: assignments.length === 0,
          canOperate: true,
          canViewReports: false,
          ...patch,
        },
      ];
    } else {
      next = assignments.map((item) => (item.branchId === branchId ? { ...item, ...patch } : item));
    }

    if (patch.isDefault) {
      next = next.map((item) => ({ ...item, isDefault: item.branchId === branchId }));
    }

    onChange(normalizeAssignments(next));
  }

  function toggleLocation(branchId: string) {
    const exists = assignments.some((item) => item.branchId === branchId);

    if (!exists) {
      onChange(
        normalizeAssignments([
          ...assignments.map((item) => ({ ...item, isDefault: false })),
          {
            branchId,
            isDefault: true,
            canOperate: true,
            canViewReports: false,
          },
        ]),
      );
      return;
    }

    onChange(normalizeAssignments(assignments.filter((item) => item.branchId !== branchId)));
  }

  if (!usableLocations.length) {
    return (
      <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
        <Ionicons name="location-outline" size={20} color={palette.soft} />
        <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
          Add an active store location before assigning staff access.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.locationList}>
      {usableLocations.map((location) => {
        const branchId = String(location.id || "");
        const activeAssignment = selectedAssignment(assignments, branchId);
        const selected = Boolean(activeAssignment);
        const spec = toneSpec(selected ? "cyan" : "slate", palette);

        return (
          <View
            key={branchId}
            style={[
              styles.locationEditorCard,
              {
                borderColor: selected ? spec.border : palette.border,
                backgroundColor: selected ? spec.bg : palette.panel,
              },
            ]}
          >
            <Pressable onPress={() => toggleLocation(branchId)} style={styles.locationMainRow}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: selected ? palette.cyan : palette.border,
                    backgroundColor: selected ? palette.cyan : "transparent",
                  },
                ]}
              >
                {selected ? <Ionicons name="checkmark" size={14} color="#06111F" /> : null}
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="label" color={palette.text}>
                  {clean(location.name, "Store location")}
                </AppText>
                <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                  {location.isMain ? "Main store location" : clean(location.code, "Selling location")}
                </AppText>
              </View>

              {activeAssignment?.isDefault ? <StatusPill label="Default" tone="green" palette={palette} /> : null}
            </Pressable>

            {selected ? (
              <View style={styles.assignmentOptions}>
                <Pressable
                  onPress={() => updateAssignment(branchId, { isDefault: true })}
                  style={[
                    styles.assignmentOption,
                    {
                      borderColor: activeAssignment?.isDefault ? toneSpec("green", palette).border : palette.border,
                      backgroundColor: activeAssignment?.isDefault ? toneSpec("green", palette).bg : palette.stage,
                    },
                  ]}
                >
                  <AppText variant="caption" color={activeAssignment?.isDefault ? toneSpec("green", palette).fg : palette.soft}>
                    Default location
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => updateAssignment(branchId, { canOperate: !(activeAssignment?.canOperate !== false) })}
                  style={[
                    styles.assignmentOption,
                    {
                      borderColor: activeAssignment?.canOperate !== false ? toneSpec("cyan", palette).border : palette.border,
                      backgroundColor: activeAssignment?.canOperate !== false ? toneSpec("cyan", palette).bg : palette.stage,
                    },
                  ]}
                >
                  <AppText variant="caption" color={activeAssignment?.canOperate !== false ? toneSpec("cyan", palette).fg : palette.soft}>
                    Can sell / work
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => updateAssignment(branchId, { canViewReports: !Boolean(activeAssignment?.canViewReports) })}
                  style={[
                    styles.assignmentOption,
                    {
                      borderColor: activeAssignment?.canViewReports ? toneSpec("blue", palette).border : palette.border,
                      backgroundColor: activeAssignment?.canViewReports ? toneSpec("blue", palette).bg : palette.stage,
                    },
                  ]}
                >
                  <AppText variant="caption" color={activeAssignment?.canViewReports ? toneSpec("blue", palette).fg : palette.soft}>
                    Can view reports
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function AccessModal({
  visible,
  mode,
  member,
  locations,
  palette,
  saving,
  onClose,
  onSave,
}: {
  visible: boolean;
  mode: ModalMode;
  member: AccessMember | null;
  locations: StoreLocation[];
  palette: AppShellPalette;
  saving: boolean;
  onClose: () => void;
  onSave: (values: AccessFormValues) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("CASHIER");
  const [password, setPassword] = useState("");
  const [assignments, setAssignments] = useState<EditableAssignment[]>([]);

  useEffect(() => {
    if (!visible) return;

    if (mode === "edit" && member) {
      const nextRole = normalizeRole(member.role);
      setName(clean(member.name, ""));
      setEmail(clean(member.email, ""));
      setPhone(clean(member.phone, ""));
      setRole(nextRole === "OWNER" ? "MANAGER" : (nextRole || "CASHIER") as StaffRole);
      setPassword("");
      setAssignments(buildInitialAssignments(member));
      return;
    }

    setName("");
    setEmail("");
    setPhone("");
    setRole("CASHIER");
    setPassword("");
    setAssignments([]);
  }, [member, mode, visible]);

  function submit() {
    const cleanedName = name.trim();
    const cleanedEmail = email.trim().toLowerCase();
    const cleanedPhone = phone.trim();
    const normalizedAssignments = normalizeAssignments(assignments);

    if (!cleanedName) {
      Alert.alert("Name required", "Enter the staff member name.");
      return;
    }

    if (!cleanedEmail || !validateEmail(cleanedEmail)) {
      Alert.alert("Email required", "Enter a valid email address for this staff member.");
      return;
    }

    if (mode === "create") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        Alert.alert("Temporary password required", passwordError);
        return;
      }
    }

    if (!normalizedAssignments.length) {
      Alert.alert("Choose a store location", "Select at least one store location for this staff member.");
      return;
    }

    onSave({
      name: cleanedName,
      email: cleanedEmail,
      phone: cleanedPhone,
      role,
      password: password.trim(),
      branchAssignments: normalizedAssignments,
    });
  }

  const title = mode === "create" ? "Add staff" : clean(member?.name, "Staff member");
  const subtitle = mode === "create"
    ? "Create access with responsibility, store locations, and a temporary password."
    : "Update responsibility, store locations, selling access, and report access.";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <View style={[styles.modalCard, { borderColor: toneSpec("cyan", palette).border, backgroundColor: palette.stage }]}>
          <View style={styles.formHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                STAFF ACCESS
              </AppText>
              <AppText variant="title" color={palette.text}>
                {title}
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                {subtitle}
              </AppText>
            </View>

            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, { borderColor: palette.border, backgroundColor: palette.panel, opacity: pressed ? 0.72 : 1 }]}>
              <Ionicons name="close" size={18} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.formSection}>
              <AppTextInput label="Name" value={name} onChangeText={setName} placeholder="Example: Alice Uwase" />
              <AppTextInput label="Email" value={email} onChangeText={setEmail} placeholder="staff@example.com" keyboardType="email-address" autoCapitalize="none" />
              <AppTextInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Optional phone number" keyboardType="phone-pad" />
              {mode === "create" ? (
                <AppTextInput
                  label="Temporary password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  autoCapitalize="none"
                />
              ) : null}
            </View>

            <View style={styles.formSection}>
              <AppText variant="label" color={palette.text}>
                Responsibility
              </AppText>
              <View style={styles.roleGrid}>
                {STAFF_ROLES.map((item) => {
                  const selected = normalizeRole(role) === item;
                  const spec = toneSpec(selected ? roleTone(item) : "slate", palette);

                  return (
                    <Pressable
                      key={item}
                      onPress={() => setRole(item)}
                      style={({ pressed }) => [
                        styles.roleChip,
                        {
                          borderColor: selected ? spec.border : palette.border,
                          backgroundColor: selected ? spec.bg : palette.panel,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <AppText variant="label" color={selected ? spec.fg : palette.text}>
                        {roleLabel(item)}
                      </AppText>
                      <AppText variant="caption" color={palette.soft} style={styles.roleHelper}>
                        {roleAccessText(item)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.formTitleRow}>
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>
                    Store locations
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                    {assignments.length} selected
                  </AppText>
                </View>
              </View>

              <AssignmentEditor
                locations={locations}
                palette={palette}
                assignments={assignments}
                onChange={setAssignments}
              />
            </View>
          </ScrollView>

          <View style={styles.formActions}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.secondaryButton, { borderColor: palette.border, backgroundColor: palette.panel, opacity: pressed ? 0.72 : 1 }]}>
              <AppText variant="label" color={palette.text}>
                Cancel
              </AppText>
            </Pressable>

            <AppButton loading={saving} onPress={submit} style={styles.saveButton}>
              {mode === "create" ? "Add staff" : "Save access"}
            </AppButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ResetPasswordModal({
  visible,
  member,
  palette,
  saving,
  onClose,
  onSave,
}: {
  visible: boolean;
  member: AccessMember | null;
  palette: AppShellPalette;
  saving: boolean;
  onClose: () => void;
  onSave: (password: string) => void;
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (visible) setPassword("");
  }, [visible]);

  function submit() {
    const error = validatePassword(password);
    if (error) {
      Alert.alert("Temporary password required", error);
      return;
    }

    onSave(password.trim());
  }

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
        <View style={[styles.passwordCard, { borderColor: toneSpec("blue", palette).border, backgroundColor: palette.stage }]}>
          <View style={styles.formHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                PASSWORD RESET
              </AppText>
              <AppText variant="title" color={palette.text}>
                {clean(member.name, "Staff member")}
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                Set a temporary password and share it with this staff member privately.
              </AppText>
            </View>

            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, { borderColor: palette.border, backgroundColor: palette.panel, opacity: pressed ? 0.72 : 1 }]}>
              <Ionicons name="close" size={18} color={palette.text} />
            </Pressable>
          </View>

          <AppTextInput
            label="New temporary password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
          />

          <View style={styles.formActions}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.secondaryButton, { borderColor: palette.border, backgroundColor: palette.panel, opacity: pressed ? 0.72 : 1 }]}>
              <AppText variant="label" color={palette.text}>
                Cancel
              </AppText>
            </Pressable>

            <AppButton loading={saving} onPress={submit} style={styles.saveButton}>
              Reset password
            </AppButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function RolesAndAccessScreen() {
  const { width } = useWindowDimensions();
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUser = useAuthStore((state) => state.user);

  const membersQuery = useAccessMembers();
  const locationsQuery = useStoreLocations();
  const createMember = useCreateAccessMember();
  const updateMember = useUpdateAccessMember();
  const updateStatus = useUpdateAccessMemberStatus();
  const resetPassword = useResetAccessMemberPassword();

  const [notice, setNotice] = useState<Notice>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingMember, setEditingMember] = useState<AccessMember | null>(null);
  const [passwordMember, setPasswordMember] = useState<AccessMember | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const members = membersQuery.data?.users || [];
  const locations = locationsQuery.data?.branches || [];
  const seatUsage = membersQuery.data?.seatUsage || membersQuery.data?.subscriptionUsage || null;
  const activeStoreLocations = useMemo(() => activeLocations(locations), [locations]);

  const effectiveWidth = contentWidth || Math.min(width, 720);
  const summaryWidth = widthForColumns(getColumns(effectiveWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(effectiveWidth, "cards"));

  const activeMembers = members.filter((member) => member.isActive !== false);
  const inactiveMembers = members.filter((member) => member.isActive === false);
  const unassignedStaff = members.filter((member) => {
    if (normalizeRole(member.role) === "OWNER") return false;
    return !Array.isArray(member.branchAssignments) || member.branchAssignments.length === 0;
  });

  const usedSeats = Number(seatUsage?.usedSeats ?? seatUsage?.activeUsers ?? activeMembers.length);
  const staffLimitRaw = seatUsage?.staffLimit ?? seatUsage?.seatLimit ?? null;
  const staffLimit = staffLimitRaw == null ? null : Number(staffLimitRaw);
  const remainingSeats =
    staffLimit == null || !Number.isFinite(staffLimit)
      ? null
      : Math.max(0, staffLimit - usedSeats);
  const canAddStaff = remainingSeats == null || remainingSeats > 0;

  const risk = accessRiskLabel({
    inactiveCount: inactiveMembers.length,
    unassignedCount: unassignedStaff.length,
    remainingSeats,
  });

  const loading = membersQuery.isLoading || locationsQuery.isLoading;

  function showNotice(nextNotice: Notice) {
    setNotice(nextNotice);

    if (noticeTimer.current) clearTimeout(noticeTimer.current);

    noticeTimer.current = setTimeout(() => {
      setNotice(null);
    }, 4200);
  }

  async function refreshAll() {
    await Promise.all([membersQuery.refetch(), locationsQuery.refetch()]);
  }

  function openCreateModal() {
    if (!activeStoreLocations.length) {
      Alert.alert("Store location required", "Add an active store location before adding staff access.");
      return;
    }

    if (!canAddStaff) {
      Alert.alert("Seat limit reached", "Your current plan has no available staff seat left.");
      return;
    }

    setEditingMember(null);
    setModalMode("create");
  }

  function openEditModal(member: AccessMember) {
    setEditingMember(member);
    setModalMode("edit");
  }

  function closeAccessModal() {
    setModalMode(null);
    setEditingMember(null);
  }

  function confirmToggleStatus(member: AccessMember) {
    const active = member.isActive !== false;
    const action = active ? "Deactivate" : "Activate";

    Alert.alert(
      `${action} access?`,
      active
        ? `${clean(member.name, "This staff member")} will no longer be able to use this business account.`
        : `${clean(member.name, "This staff member")} will be able to use this business account again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          style: active ? "destructive" : "default",
          onPress: () => {
            void toggleStatus(member);
          },
        },
      ],
    );
  }

  async function toggleStatus(member: AccessMember) {
    if (!member.id || updateStatus.isPending) return;

    setSavingStatusId(member.id);

    try {
      await updateStatus.mutateAsync({
        userId: member.id,
        isActive: member.isActive === false,
      });

      showNotice({
        tone: "green",
        title: member.isActive === false ? "Access activated" : "Access deactivated",
        text: `${clean(member.name, "Staff member")} access was updated.`,
      });

      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update access.";
      Alert.alert("Could not update access", message);
    } finally {
      setSavingStatusId(null);
    }
  }

  function confirmSaveAccess(values: AccessFormValues) {
    const targetName = modalMode === "create" ? values.name : clean(editingMember?.name, "This staff member");

    Alert.alert(
      modalMode === "create" ? "Add staff access?" : "Save access changes?",
      modalMode === "create"
        ? `${targetName} will be able to use Storvex with the selected store-location access.`
        : `${targetName} will use the selected responsibility and store-location access.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: modalMode === "create" ? "Add staff" : "Save access",
          onPress: () => {
            void saveAccess(values);
          },
        },
      ],
    );
  }

  async function saveAccess(values: AccessFormValues) {
    if (!modalMode || createMember.isPending || updateMember.isPending) return;

    try {
      if (modalMode === "create") {
        const payload: CreateAccessMemberPayload = {
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          role: values.role,
          password: values.password,
          branchAssignments: values.branchAssignments.map((assignment) => ({
            branchId: assignment.branchId,
            isDefault: Boolean(assignment.isDefault),
            canOperate: Boolean(assignment.canOperate),
            canViewReports: Boolean(assignment.canViewReports),
          })),
        };

        await createMember.mutateAsync(payload);

        showNotice({
          tone: "green",
          title: "Staff added",
          text: `${values.name} can now use Storvex with the selected access.`,
        });
      } else {
        if (!editingMember?.id) return;

        await updateMember.mutateAsync({
          userId: editingMember.id,
          payload: {
            name: values.name,
            email: values.email,
            phone: values.phone || null,
            role: values.role,
            branchAssignments: values.branchAssignments.map((assignment) => ({
              branchId: assignment.branchId,
              isDefault: Boolean(assignment.isDefault),
              canOperate: Boolean(assignment.canOperate),
              canViewReports: Boolean(assignment.canViewReports),
            })),
          },
        });

        showNotice({
          tone: "green",
          title: "Access saved",
          text: `${clean(editingMember.name, "Staff member")} access was updated.`,
        });
      }

      closeAccessModal();
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save access.";
      Alert.alert("Could not save access", message);
    }
  }

  function confirmResetPassword(password: string) {
    if (!passwordMember) return;

    Alert.alert(
      "Reset password?",
      `${clean(passwordMember.name, "This staff member")} will use the new temporary password you entered.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset password",
          onPress: () => {
            void saveResetPassword(password);
          },
        },
      ],
    );
  }

  async function saveResetPassword(password: string) {
    if (!passwordMember?.id || resetPassword.isPending) return;

    setResettingPasswordId(passwordMember.id);

    try {
      await resetPassword.mutateAsync({
        userId: passwordMember.id,
        payload: { password },
      });

      showNotice({
        tone: "green",
        title: "Password reset",
        text: `${clean(passwordMember.name, "Staff member")} can sign in with the new temporary password.`,
      });

      setPasswordMember(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reset password.";
      Alert.alert("Could not reset password", message);
    } finally {
      setResettingPasswordId(null);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        loading ? (
          <AccessSkeleton palette={palette} width={width} />
        ) : (
          <View
            style={[styles.stack, styles.screenBottomSpace]}
            onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
          >
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={20} color={palette.text} />
              </Pressable>

              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                  SETTINGS
                </AppText>
                <AppText variant="title" color={palette.text}>
                  Roles and access
                </AppText>
              </View>

              <StatusPill label="Owner control" tone="cyan" palette={palette} />
            </View>

            <NoticePanel notice={notice} palette={palette} onClose={() => setNotice(null)} />

            <View style={[styles.hero, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.10)" }]}>
              <View style={styles.heroGlow} />
              <View style={styles.heroIcon}>
                <Ionicons name="people-circle-outline" size={26} color="#06111F" />
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroDot} />
                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    ACCESS CONTROL
                  </AppText>
                </View>

                <AppText variant="subtitle" color={palette.text}>
                  Know who can do what
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.heroText}>
                  Add staff, set responsibility, control store-location access, and protect the owner account.
                </AppText>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              <SummaryCard label="Active staff" value={String(activeMembers.length)} icon="people-outline" tone="green" palette={palette} width={summaryWidth} />
              <SummaryCard label="Needs review" value={String(unassignedStaff.length)} icon="alert-circle-outline" tone={unassignedStaff.length ? "amber" : "green"} palette={palette} width={summaryWidth} />
              <SummaryCard label="Store locations" value={String(activeStoreLocations.length)} icon="location-outline" tone="cyan" palette={palette} width={summaryWidth} />
              <SummaryCard label="Seats left" value={remainingSeats == null ? "Plan based" : String(remainingSeats)} icon="person-add-outline" tone={remainingSeats === 0 ? "amber" : "blue"} palette={palette} width={summaryWidth} />
            </View>

            <RiskPanel tone={risk.tone} title={risk.title} text={risk.text} palette={palette} />

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                  STAFF ACCESS
                </AppText>
                <AppText variant="title" color={palette.text}>
                  Staff and store locations
                </AppText>
                <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                  Edit staff access safely. Owner control cannot be reduced here.
                </AppText>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={refreshAll}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.panel,
                      opacity: pressed || membersQuery.isFetching || locationsQuery.isFetching ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons name="refresh" size={17} color={palette.cyan} />
                </Pressable>

                <Pressable
                  onPress={openCreateModal}
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      borderColor: canAddStaff ? palette.cyan : palette.border,
                      backgroundColor: canAddStaff ? palette.cyan : palette.panel,
                      opacity: pressed || !canAddStaff ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons name="person-add-outline" size={16} color={canAddStaff ? "#06111F" : palette.soft} />
                  <AppText variant="label" color={canAddStaff ? "#06111F" : palette.soft}>
                    Add staff
                  </AppText>
                </Pressable>
              </View>
            </View>

            {members.length ? (
              <View style={styles.responsiveGrid}>
                {members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    palette={palette}
                    width={cardWidth}
                    currentUserId={currentUser?.id || null}
                    savingStatus={savingStatusId === member.id}
                    resettingPassword={resettingPasswordId === member.id}
                    onEdit={() => openEditModal(member)}
                    onToggleStatus={() => confirmToggleStatus(member)}
                    onResetPassword={() => setPasswordMember(member)}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <View style={[styles.emptyIcon, { backgroundColor: toneSpec("cyan", palette).bg }]}>
                  <Ionicons name="people-outline" size={22} color={palette.cyan} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="label" color={palette.text}>
                    No staff added
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                    Add staff access so each person has a clear responsibility and store location.
                  </AppText>
                </View>
              </View>
            )}

            <AccessModal
              visible={Boolean(modalMode)}
              mode={modalMode || "create"}
              member={editingMember}
              locations={locations}
              palette={palette}
              saving={createMember.isPending || updateMember.isPending}
              onClose={closeAccessModal}
              onSave={confirmSaveAccess}
            />

            <ResetPasswordModal
              visible={Boolean(passwordMember)}
              member={passwordMember}
              palette={palette}
              saving={resetPassword.isPending}
              onClose={() => setPasswordMember(null)}
              onSave={confirmResetPassword}
            />
          </View>
        )
      }
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  screenBottomSpace: {
    paddingBottom: 160,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  pill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  noticePanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  noticeIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeText: {
    lineHeight: 18,
  },
  noticeClose: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
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
  heroIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
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
    minHeight: 70,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  summaryValue: {
    lineHeight: 19,
  },
  riskPanel: {
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  riskIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionText: {
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    minHeight: 42,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  memberCard: {
    borderWidth: 1,
    padding: 13,
    gap: 11,
  },
  memberTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  avatar: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: {
    lineHeight: 20,
  },
  compactGrid: {
    gap: 7,
  },
  compactInfo: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  compactLabel: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  compactValue: {
    lineHeight: 18,
  },
  memberActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  primaryAction: {
    minHeight: 40,
    flexGrow: 1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryAction: {
    minHeight: 40,
    minWidth: 112,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  emptyPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
    backgroundColor: "rgba(2, 8, 23, 0.72)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "92%",
    alignSelf: "center",
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  passwordCard: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  modalScrollContent: {
    gap: 14,
    paddingBottom: 6,
  },
  formHeader: {
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
  formSection: {
    gap: 10,
  },
  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roleGrid: {
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  roleHelper: {
    lineHeight: 17,
  },
  locationList: {
    gap: 9,
  },
  locationEditorCard: {
    borderWidth: 1,
    padding: 11,
    gap: 10,
  },
  locationMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  assignmentOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assignmentOption: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  formActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  secondaryButton: {
    minHeight: 48,
    minWidth: 104,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveButton: {
    minHeight: 48,
    minWidth: 138,
  },
});
