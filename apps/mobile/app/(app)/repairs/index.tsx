import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View, type DimensionValue, type KeyboardTypeOptions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import {
  repairStatusLabel,
  useArchiveRepair,
  useAssignTechnician,
  useCreateRepair,
  useDeleteRepair,
  useRepairCustomers,
  useRepairs,
  useRepairTechnicians,
  useUpdateRepairStatus,
} from "../../../src/features/repairs/hooks";
import type { RepairCustomer, RepairPerson, RepairRecord, RepairStatus } from "../../../src/features/repairs/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const ACCENT = "#22C7F4";
const GREEN = "#34D399";
const AMBER = "#FBBF24";
const RED = "#FB7185";
const REPAIR_PREVIEW_LIMIT = 4;
const CUSTOMER_PREVIEW_LIMIT = 8;

const REPAIR_STATUSES: Array<{ value: RepairStatus; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "RECEIVED", label: "Received", icon: "file-tray-outline" },
  { value: "IN_PROGRESS", label: "In progress", icon: "construct-outline" },
  { value: "COMPLETED", label: "Completed", icon: "checkmark-done-outline" },
  { value: "DELIVERED", label: "Delivered", icon: "bag-check-outline" },
];

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

type RepairForm = {
  customerId: string;
  customerSearch: string;
  device: string;
  serial: string;
  issue: string;
  warrantyEnd: string;
};

function emptyRepairForm(): RepairForm {
  return {
    customerId: "",
    customerSearch: "",
    device: "",
    serial: "",
    issue: "",
    warrantyEnd: "",
  };
}

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function dateLabel(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseIsoDate(value?: string | null) {
  if (!value) return null;

  const parts = String(value).split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function monthTitle(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function getCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function branchDisplayName(branch?: { code?: string | null; name?: string | null } | null) {
  const name = clean(branch?.name, "");
  const code = clean(branch?.code, "");

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;

  return "current selling location";
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
      fg: light ? "#047857" : GREEN,
      bg: light ? "rgba(16, 185, 129, 0.10)" : "rgba(52, 211, 153, 0.14)",
      border: light ? "rgba(4, 120, 87, 0.22)" : "rgba(52, 211, 153, 0.30)",
      solid: GREEN,
    };
  }

  if (tone === "amber") {
    return {
      fg: light ? "#B45309" : AMBER,
      bg: light ? "rgba(245, 158, 11, 0.10)" : "rgba(251, 191, 36, 0.14)",
      border: light ? "rgba(180, 83, 9, 0.22)" : "rgba(251, 191, 36, 0.30)",
      solid: AMBER,
    };
  }

  if (tone === "red") {
    return {
      fg: light ? "#BE123C" : RED,
      bg: light ? "rgba(225, 29, 72, 0.09)" : "rgba(251, 113, 133, 0.14)",
      border: light ? "rgba(190, 18, 60, 0.22)" : "rgba(251, 113, 133, 0.30)",
      solid: RED,
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
    bg: "rgba(34, 199, 244, 0.12)",
    border: "rgba(34, 199, 244, 0.30)",
    solid: ACCENT,
  };
}

function statusTone(status?: string | null): Tone {
  const key = String(status || "").toUpperCase();

  if (key === "DELIVERED") return "green";
  if (key === "COMPLETED") return "blue";
  if (key === "IN_PROGRESS") return "amber";

  return "slate";
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

function repairErrorMessage(error: unknown) {
  const err = error as { message?: string; response?: { data?: { code?: string; message?: string; error?: string } } };
  const code = String(err?.response?.data?.code || err?.response?.data?.error || "").toUpperCase();
  const message = String(err?.response?.data?.message || err?.message || "").toLowerCase();

  if (code === "CUSTOMER_REQUIRED" || message.includes("customer")) return "Choose the customer before saving this repair.";
  if (code === "DEVICE_REQUIRED" || message.includes("device")) return "Add the device name before saving.";
  if (code === "ISSUE_REQUIRED" || message.includes("issue")) return "Describe the repair issue before saving.";
  if (code === "BRANCH_REQUIRED" || message.includes("branch")) return "Choose the selling location before saving this repair.";
  if (message.includes("subscription")) return "Business access needs attention before repairs can be updated.";

  return "Repair record could not be saved. Please try again.";
}

function SummaryCard({ label, value, helper, icon, tone, palette, width }: { label: string; value: string; helper: string; icon: IoniconName; tone: Tone; palette: AppShellPalette; width: DimensionValue }) {
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

function NoticePanel({ notice, palette }: { notice: Notice; palette: AppShellPalette }) {
  if (!notice) return null;

  const spec = toneSpec(notice.tone, palette);

  return (
    <View style={[styles.noticePanel, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
      <View style={[styles.noticeMark, { backgroundColor: spec.solid }]}> 
        <Ionicons name={notice.tone === "red" ? "warning-outline" : notice.tone === "amber" ? "alert-circle-outline" : "checkmark-outline"} size={15} color="#06111F" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>{notice.title}</AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>{notice.text}</AppText>
      </View>
    </View>
  );
}

function Field({ label, value, placeholder, palette, keyboardType = "default", multiline = false, onChangeText }: { label: string; value: string; placeholder: string; palette: AppShellPalette; keyboardType?: KeyboardTypeOptions; multiline?: boolean; onChangeText: (value: string) => void }) {
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
          { outlineStyle: "none" } as never,
        ]}
      />
    </View>
  );
}

function CalendarDateField({ label, value, placeholder, palette, onChange }: { label: string; value: string; placeholder: string; palette: AppShellPalette; onChange: (value: string) => void }) {
  const selectedDate = parseIsoDate(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate || new Date());
  const cells = getCalendarCells(visibleMonth);
  const todayIso = toIsoDate(new Date());
  const selectedIso = selectedDate ? toIsoDate(selectedDate) : "";
  const cyan = toneSpec("cyan", palette);

  function chooseDate(day: number) {
    const nextDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    onChange(toIsoDate(nextDate));
    setOpen(false);
  }

  function chooseQuick(months: number) {
    const today = new Date();
    const nextDate = new Date(today.getFullYear(), today.getMonth() + months, today.getDate());
    onChange(toIsoDate(nextDate));
    setVisibleMonth(nextDate);
    setOpen(false);
  }

  return (
    <View style={styles.fieldWrap}>
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      <Pressable
        onPress={() => {
          setVisibleMonth(selectedDate || new Date());
          setOpen((current) => !current);
        }}
        style={({ pressed }) => [
          styles.dateSelectButton,
          {
            borderColor: open ? cyan.border : palette.border,
            backgroundColor: open ? cyan.bg : palette.panel,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={18} color={open ? cyan.fg : palette.soft} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText variant="label" color={value ? palette.text : palette.soft} numberOfLines={1}>
            {value ? dateLabel(value) : placeholder}
          </AppText>
          {value ? <AppText variant="caption" color={palette.soft}>{value}</AppText> : null}
        </View>
        {value ? (
          <Pressable onPress={() => onChange("")} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={palette.soft} />
          </Pressable>
        ) : null}
        <Ionicons name={open ? "chevron-up-outline" : "chevron-down-outline"} size={17} color={palette.soft} />
      </Pressable>

      {open ? (
        <View style={[styles.calendarPanel, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <View style={styles.calendarTop}>
            <Pressable onPress={() => setVisibleMonth((current) => addMonths(current, -1))} style={[styles.calendarNavButton, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <Ionicons name="chevron-back-outline" size={18} color={palette.text} />
            </Pressable>

            <AppText variant="label" color={palette.text}>{monthTitle(visibleMonth)}</AppText>

            <Pressable onPress={() => setVisibleMonth((current) => addMonths(current, 1))} style={[styles.calendarNavButton, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <Ionicons name="chevron-forward-outline" size={18} color={palette.text} />
            </Pressable>
          </View>

          <View style={styles.quickDateRow}>
            {[
              { label: "Today", months: 0 },
              { label: "+3 months", months: 3 },
              { label: "+6 months", months: 6 },
              { label: "+1 year", months: 12 },
            ].map((item) => (
              <Pressable key={item.label} onPress={() => chooseQuick(item.months)} style={({ pressed }) => [styles.quickDateChip, { borderColor: palette.border, backgroundColor: palette.panel, opacity: pressed ? 0.84 : 1 }]}>
                <AppText variant="caption" color={palette.text} style={styles.chipText}>{item.label}</AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <AppText key={`${day}-${index}`} variant="caption" color={palette.soft} style={styles.weekDay}>{day}</AppText>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {cells.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.calendarDayButton} />;

              const iso = toIsoDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
              const selected = iso === selectedIso;
              const today = iso === todayIso;

              return (
                <Pressable
                  key={iso}
                  onPress={() => chooseDate(day)}
                  style={({ pressed }) => [
                    styles.calendarDayButton,
                    {
                      borderColor: selected ? cyan.border : today ? palette.borderStrong : "transparent",
                      backgroundColor: selected ? ACCENT : today ? palette.panel : "transparent",
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <AppText variant="caption" color={selected ? "#06111F" : palette.text} style={styles.calendarDayText}>{String(day)}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ChoiceChip({ label, active, tone, palette, onPress }: { label: string; active: boolean; tone: Tone; palette: AppShellPalette; onPress: () => void }) {
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
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.chipText}>{label}</AppText>
    </Pressable>
  );
}

function ScreenSkeleton({ palette, layoutWidth }: { palette: AppShellPalette; layoutWidth: number }) {
  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <View style={[styles.heroPanel, { borderColor: palette.borderStrong, backgroundColor: "rgba(34, 199, 244, 0.08)" }]}> 
        <View style={styles.heroTop}>
          <Skeleton height={56} width={56} />
          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="38%" />
            <Skeleton height={24} width="72%" />
            <Skeleton height={14} width="68%" />
          </View>
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => <View key={item} style={{ width: summaryWidth }}><Skeleton height={112} width="100%" /></View>)}
      </View>

      <Skeleton height={88} width="100%" />

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => <View key={item} style={{ width: cardWidth }}><Skeleton height={206} width="100%" /></View>)}
      </View>
    </View>
  );
}

function RepairCard({ repair, palette, width, technicians, canChangeStatus, canAssign, canArchive, canDelete, busyId, onStatusChange, onAssign, onArchive, onDelete, onViewDetails }: { repair: RepairRecord; palette: AppShellPalette; width: DimensionValue; technicians: RepairPerson[]; canChangeStatus: boolean; canAssign: boolean; canArchive: boolean; canDelete: boolean; busyId: string; onStatusChange: (repairId: string, status: RepairStatus) => void; onAssign: (repairId: string, technicianId?: string | null) => void; onArchive: (repair: RepairRecord) => void; onDelete: (repair: RepairRecord) => void; onViewDetails: (repair: RepairRecord) => void }) {
  const tone = statusTone(repair.status);
  const spec = toneSpec(tone, palette);
  const customer = repair.customer;
  const selectedTechnicianId = repair.technicianId || repair.technician?.id || "";
  const busy = busyId === repair.id;

  return (
    <View style={[styles.repairCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.repairHeader}>
        <View style={[styles.repairIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <Ionicons name="construct-outline" size={17} color={spec.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="label" color={palette.text} numberOfLines={1}>{clean(repair.device, "Device")}</AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText} numberOfLines={2}>{clean(repair.issue, "No issue description")}</AppText>
        </View>
        <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <AppText variant="caption" color={spec.fg} style={styles.statusText}>{repairStatusLabel(repair.status)}</AppText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Customer</AppText>
          <AppText variant="label" color={palette.text} numberOfLines={1}>{clean(customer?.name, "Customer")}</AppText>
          <AppText variant="caption" color={palette.soft} numberOfLines={1}>{clean(customer?.phone, "No phone")}</AppText>
        </View>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Received</AppText>
          <AppText variant="label" color={palette.text}>{dateLabel(repair.createdAt)}</AppText>
          <AppText variant="caption" color={palette.soft} numberOfLines={1}>{clean(repair.serial, "No serial")}</AppText>
        </View>
      </View>

      {canChangeStatus ? (
        <View style={styles.controlBlock}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Progress</AppText>
          <View style={styles.choiceRow}>
            {REPAIR_STATUSES.map((status) => (
              <ChoiceChip
                key={String(status.value)}
                label={status.label}
                active={String(repair.status || "").toUpperCase() === status.value}
                tone={statusTone(status.value)}
                palette={palette}
                onPress={() => onStatusChange(repair.id, status.value)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {canAssign ? (
        <View style={styles.controlBlock}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Technician</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
            <ChoiceChip label="Unassigned" active={!selectedTechnicianId} tone="slate" palette={palette} onPress={() => onAssign(repair.id, null)} />
            {technicians.map((technician) => (
              <ChoiceChip
                key={String(technician.id)}
                label={clean(technician.name, "Staff")}
                active={selectedTechnicianId === technician.id}
                tone="blue"
                palette={palette}
                onPress={() => onAssign(repair.id, technician.id || null)}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Technician</AppText>
          <AppText variant="caption" color={palette.text}>{clean(repair.technician?.name, "Unassigned")}</AppText>
        </View>
      )}

      {repair.warrantyEnd ? (
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Warranty</AppText>
          <AppText variant="caption" color={palette.text}>{dateLabel(repair.warrantyEnd)}</AppText>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <AsyncButton onPress={() => onViewDetails(repair)} variant="secondary" style={styles.smallAction} disabled={busy}>View details</AsyncButton>
        {canArchive ? <AsyncButton onPress={() => onArchive(repair)} variant="secondary" style={styles.smallAction} disabled={busy}>Archive</AsyncButton> : null}
        {canDelete ? <AsyncButton onPress={() => onDelete(repair)} variant="danger" style={styles.smallAction} disabled={busy}>Delete</AsyncButton> : null}
      </View>
    </View>
  );
}

function RepairDetailsModal({ repair, palette, technicians, canChangeStatus, canAssign, busyId, onClose, onStatusChange, onAssign }: { repair: RepairRecord | null; palette: AppShellPalette; technicians: RepairPerson[]; canChangeStatus: boolean; canAssign: boolean; busyId: string; onClose: () => void; onStatusChange: (repairId: string, status: RepairStatus) => void; onAssign: (repairId: string, technicianId?: string | null) => void }) {
  if (!repair) return null;

  const tone = statusTone(repair.status);
  const spec = toneSpec(tone, palette);
  const selectedTechnicianId = repair.technicianId || repair.technician?.id || "";
  const busy = busyId === repair.id;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, styles.detailsModalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}> 
            <View style={[styles.modalHeaderIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
              <Ionicons name="construct-outline" size={22} color={spec.fg} />
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Repair details</AppText>
              <AppText variant="subtitle" color={palette.text} numberOfLines={1}>{clean(repair.device, "Device repair")}</AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>Full intake record, customer details, progress, and handover status.</AppText>
            </View>

            <Pressable onPress={onClose} disabled={busy} style={[styles.closeButton, { borderColor: palette.border, opacity: busy ? 0.5 : 1 }]}> 
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailHeroPanel, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <AppText variant="caption" color={spec.fg} style={styles.eyebrow}>{repairStatusLabel(repair.status)}</AppText>
                <AppText variant="subtitle" color={palette.text}>{clean(repair.device, "Device")}</AppText>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>{clean(repair.issue, "No issue description saved.")}</AppText>
              </View>
              <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: palette.stage }]}> 
                <AppText variant="caption" color={spec.fg} style={styles.statusText}>{repairStatusLabel(repair.status)}</AppText>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={[styles.detailBox, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Customer</AppText>
                <AppText variant="label" color={palette.text}>{clean(repair.customer?.name, "Customer")}</AppText>
                <AppText variant="caption" color={palette.soft}>{clean(repair.customer?.phone, "No phone saved")}</AppText>
              </View>

              <View style={[styles.detailBox, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Device proof</AppText>
                <AppText variant="label" color={palette.text}>{clean(repair.serial, "No serial / IMEI")}</AppText>
                <AppText variant="caption" color={palette.soft}>Received {dateLabel(repair.createdAt)}</AppText>
              </View>

              <View style={[styles.detailBox, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Technician</AppText>
                <AppText variant="label" color={palette.text}>{clean(repair.technician?.name, "Unassigned")}</AppText>
                <AppText variant="caption" color={palette.soft}>Responsible staff</AppText>
              </View>

              <View style={[styles.detailBox, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Warranty</AppText>
                <AppText variant="label" color={palette.text}>{repair.warrantyEnd ? dateLabel(repair.warrantyEnd) : "No warranty saved"}</AppText>
                <AppText variant="caption" color={palette.soft}>Customer handover reference</AppText>
              </View>
            </View>

            <View style={[styles.formSection, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Reported issue</AppText>
              <AppText variant="label" color={palette.text} style={styles.detailIssueText}>{clean(repair.issue, "No issue description saved.")}</AppText>
            </View>

            {canChangeStatus ? (
              <View style={[styles.formSection, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Progress</AppText>
                <View style={styles.choiceRow}>
                  {REPAIR_STATUSES.map((status) => (
                    <ChoiceChip
                      key={String(status.value)}
                      label={status.label}
                      active={String(repair.status || "").toUpperCase() === status.value}
                      tone={statusTone(status.value)}
                      palette={palette}
                      onPress={() => onStatusChange(repair.id, status.value)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {canAssign ? (
              <View style={[styles.formSection, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Technician assignment</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                  <ChoiceChip label="Unassigned" active={!selectedTechnicianId} tone="slate" palette={palette} onPress={() => onAssign(repair.id, null)} />
                  {technicians.map((technician) => (
                    <ChoiceChip
                      key={String(technician.id)}
                      label={clean(technician.name, "Staff")}
                      active={selectedTechnicianId === technician.id}
                      tone="blue"
                      palette={palette}
                      onPress={() => onAssign(repair.id, technician.id || null)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: palette.border }]}> 
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={busy}>Close</AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RepairCreateModal({ open, palette, customers, form, notice, saving, onChange, onClose, onSave }: { open: boolean; palette: AppShellPalette; customers: RepairCustomer[]; form: RepairForm; notice: Notice; saving: boolean; onChange: <K extends keyof RepairForm>(key: K, value: RepairForm[K]) => void; onClose: () => void; onSave: () => void }) {
  const [showMore, setShowMore] = useState(false);

  const selectedCustomer = customers.find((customer) => customer.id === form.customerId) || null;
  const search = form.customerSearch.trim().toLowerCase();
  const shouldShowCustomerResults = search.length >= 2 && (!selectedCustomer || clean(selectedCustomer.name, "").toLowerCase() !== search);
  const visibleCustomers = shouldShowCustomerResults
    ? customers
        .filter((customer) => [customer.name, customer.phone, customer.email]
          .map((item) => String(item || "").toLowerCase())
          .join(" ")
          .includes(search))
        .slice(0, CUSTOMER_PREVIEW_LIMIT)
    : [];

  const customerSpec = toneSpec(selectedCustomer ? "green" : shouldShowCustomerResults ? "cyan" : "slate", palette);

  function handleCustomerSearch(value: string) {
    onChange("customerSearch", value);

    if (selectedCustomer && value.trim().toLowerCase() !== clean(selectedCustomer.name, "").toLowerCase()) {
      onChange("customerId", "");
    }
  }

  function selectCustomer(customer: RepairCustomer) {
    onChange("customerId", customer.id);
    onChange("customerSearch", clean(customer.name, ""));
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}> 
            <View style={[styles.modalHeaderIcon, { backgroundColor: "#67E8F9" }]}> 
              <Ionicons name="construct-outline" size={22} color="#06111F" />
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>New repair</AppText>
              <AppText variant="subtitle" color={palette.text}>Log customer device</AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>Choose the customer, record the device, then save the repair for follow-up.</AppText>
            </View>

            <Pressable onPress={onClose} disabled={saving} style={[styles.closeButton, { borderColor: palette.border, opacity: saving ? 0.5 : 1 }]}> 
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <NoticePanel notice={notice} palette={palette} />

            <View style={[styles.formSection, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <View style={styles.formSectionHeader}>
                <View style={[styles.stepBadge, { borderColor: customerSpec.border, backgroundColor: customerSpec.bg }]}> 
                  <AppText variant="caption" color={customerSpec.fg} style={styles.stepBadgeText}>1</AppText>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>Customer</AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>Type at least 2 characters. Customer results stay hidden until you search.</AppText>
                </View>
              </View>

              <View style={[styles.customerSearchShell, { borderColor: selectedCustomer ? toneSpec("green", palette).border : shouldShowCustomerResults ? toneSpec("cyan", palette).border : palette.border, backgroundColor: palette.stage }]}> 
                <Ionicons name="search-outline" size={17} color={selectedCustomer ? toneSpec("green", palette).fg : shouldShowCustomerResults ? palette.cyan : palette.soft} />
                <TextInput
                  value={form.customerSearch}
                  placeholder="Search customer name or phone"
                  placeholderTextColor={palette.soft}
                  onChangeText={handleCustomerSearch}
                  style={[styles.customerSearchInput, { color: palette.text }, { outlineStyle: "none" } as never]}
                />
                {form.customerSearch ? (
                  <Pressable
                    onPress={() => {
                      onChange("customerSearch", "");
                      onChange("customerId", "");
                    }}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={18} color={palette.soft} />
                  </Pressable>
                ) : null}
              </View>

              {selectedCustomer ? (
                <View style={[styles.selectedCustomerCard, { borderColor: toneSpec("green", palette).border, backgroundColor: toneSpec("green", palette).bg }]}> 
                  <View style={[styles.selectedCustomerIcon, { backgroundColor: toneSpec("green", palette).solid }]}> 
                    <Ionicons name="checkmark-outline" size={16} color="#06111F" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <AppText variant="label" color={palette.text} numberOfLines={1}>{clean(selectedCustomer.name, "Customer")}</AppText>
                    <AppText variant="caption" color={palette.soft} numberOfLines={1}>{clean(selectedCustomer.phone, "No phone saved")}</AppText>
                  </View>
                </View>
              ) : shouldShowCustomerResults ? (
                visibleCustomers.length > 0 ? (
                  <View style={styles.customerResultList}>
                    {visibleCustomers.map((customer) => (
                      <Pressable
                        key={customer.id}
                        onPress={() => selectCustomer(customer)}
                        style={({ pressed }) => [
                          styles.customerResult,
                          {
                            borderColor: palette.border,
                            backgroundColor: palette.stage,
                            opacity: pressed ? 0.82 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.customerAvatar, { borderColor: toneSpec("cyan", palette).border, backgroundColor: toneSpec("cyan", palette).bg }]}> 
                          <Ionicons name="person-outline" size={16} color={palette.cyan} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                          <AppText variant="label" color={palette.text} numberOfLines={1}>{clean(customer.name, "Customer")}</AppText>
                          <AppText variant="caption" color={palette.soft} numberOfLines={1}>{clean(customer.phone, "No phone")}</AppText>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={16} color={palette.soft} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.customerHintPanel, { borderColor: toneSpec("amber", palette).border, backgroundColor: toneSpec("amber", palette).bg }]}> 
                    <Ionicons name="alert-circle-outline" size={18} color={toneSpec("amber", palette).fg} />
                    <AppText variant="caption" color={palette.text} style={styles.cardText}>No matching customer found. Add the customer first, then come back to log the repair.</AppText>
                  </View>
                )
              ) : (
                <View style={[styles.customerHintPanel, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
                  <Ionicons name="people-outline" size={18} color={palette.soft} />
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>Customer list is hidden until you search, keeping this form clean and focused.</AppText>
                </View>
              )}
            </View>

            <View style={[styles.formSection, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <View style={styles.formSectionHeader}>
                <View style={[styles.stepBadge, { borderColor: toneSpec("cyan", palette).border, backgroundColor: toneSpec("cyan", palette).bg }]}> 
                  <AppText variant="caption" color={palette.cyan} style={styles.stepBadgeText}>2</AppText>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>Device intake</AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>Keep it short: device name and the issue reported by the customer.</AppText>
                </View>
              </View>

              <Field label="Device" value={form.device} placeholder="Example: Samsung Galaxy A54" palette={palette} onChangeText={(value) => onChange("device", value)} />
              <Field label="Issue" value={form.issue} placeholder="Example: screen broken, not charging, water damage" palette={palette} multiline onChangeText={(value) => onChange("issue", value)} />
            </View>

            <Pressable
              onPress={() => setShowMore((current) => !current)}
              style={({ pressed }) => [styles.moreToggle, { borderColor: palette.border, backgroundColor: palette.panel, opacity: pressed ? 0.84 : 1 }]}
            >
              <Ionicons name={showMore ? "chevron-up-outline" : "chevron-down-outline"} size={18} color={palette.text} />
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="label" color={palette.text}>{showMore ? "Hide optional details" : "More intake details"}</AppText>
                <AppText variant="caption" color={palette.soft}>Serial / IMEI and warranty are optional.</AppText>
              </View>
            </Pressable>

            {showMore ? (
              <View style={[styles.formSection, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <Field label="Serial or IMEI" value={form.serial} placeholder="Optional, useful for disputes" palette={palette} onChangeText={(value) => onChange("serial", value)} />
                <CalendarDateField label="Warranty end date" value={form.warrantyEnd} placeholder="Choose from calendar or leave blank" palette={palette} onChange={(value) => onChange("warrantyEnd", value)} />
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: palette.border }]}> 
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>Cancel</AsyncButton>
            <AsyncButton onPress={onSave} variant="primary" style={[styles.footerButton, styles.accentButton]} disabled={saving}>{saving ? "Saving" : "Log repair"}</AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function RepairsScreen() {
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(width, 760);
  const compact = layoutWidth < 560;
  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const role = String((user as { role?: string | null } | null)?.role || "").toUpperCase();
  const canCreate = role === "OWNER" || role === "CASHIER" || role === "MANAGER";
  const canChangeStatus = role === "OWNER" || role === "TECHNICIAN" || role === "MANAGER";
  const canAssign = role === "OWNER" || role === "MANAGER";
  const canArchive = role === "OWNER";
  const canDelete = role === "OWNER";

  const repairsQuery = useRepairs({ branchId: activeBranchId });
  const techniciansQuery = useRepairTechnicians({ branchId: activeBranchId });
  const customersQuery = useRepairCustomers();
  const createRepair = useCreateRepair();
  const updateStatus = useUpdateRepairStatus();
  const assignTechnician = useAssignTechnician();
  const archiveRepair = useArchiveRepair();
  const deleteRepair = useDeleteRepair();

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<RepairStatus | "ALL">("ALL");
  const [showAllRepairs, setShowAllRepairs] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [modalNotice, setModalNotice] = useState<Notice>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairRecord | null>(null);
  const [repairForm, setRepairForm] = useState<RepairForm>(() => emptyRepairForm());
  const [busyRepairId, setBusyRepairId] = useState("");

  const workspaceIsLoading = isHydrating || !user || !tenant;
  const repairs = repairsQuery.data || [];
  const technicians = techniciansQuery.data || [];
  const customers = customersQuery.data || [];
  const isLoading = workspaceIsLoading || (repairsQuery.isLoading && !repairsQuery.data);
  const isRefreshing = repairsQuery.isFetching || techniciansQuery.isFetching || customersQuery.isFetching;

  const summary = useMemo(() => ({
    total: repairs.length,
    received: repairs.filter((repair) => String(repair.status || "").toUpperCase() === "RECEIVED").length,
    inProgress: repairs.filter((repair) => String(repair.status || "").toUpperCase() === "IN_PROGRESS").length,
    completed: repairs.filter((repair) => String(repair.status || "").toUpperCase() === "COMPLETED").length,
    delivered: repairs.filter((repair) => String(repair.status || "").toUpperCase() === "DELIVERED").length,
  }), [repairs]);

  const filteredRepairs = useMemo(() => {
    let list = repairs;

    if (filterStatus !== "ALL") {
      list = list.filter((repair) => String(repair.status || "").toUpperCase() === filterStatus);
    }

    const search = query.trim().toLowerCase();
    if (search) {
      list = list.filter((repair) => [
        repair.device,
        repair.serial,
        repair.issue,
        repair.status,
        repair.customer?.name,
        repair.customer?.phone,
        repair.technician?.name,
        repair.storeLocation?.label,
        repair.storeLocation?.name,
      ].map((item) => String(item || "").toLowerCase()).join(" ").includes(search));
    }

    return list;
  }, [repairs, query, filterStatus]);

  const visibleRepairs = showAllRepairs ? filteredRepairs : filteredRepairs.slice(0, REPAIR_PREVIEW_LIMIT);
  const hasMoreRepairs = filteredRepairs.length > REPAIR_PREVIEW_LIMIT;

  function updateForm<K extends keyof RepairForm>(key: K, value: RepairForm[K]) {
    setModalNotice(null);
    setRepairForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    setRepairForm(emptyRepairForm());
    setModalNotice(null);
    setCreateModalOpen(true);
  }

  async function refreshAll() {
    await Promise.all([repairsQuery.refetch(), techniciansQuery.refetch(), customersQuery.refetch()]);
  }

  async function saveRepair() {
    const customerId = repairForm.customerId.trim();
    const device = repairForm.device.trim();
    const issue = repairForm.issue.trim();

    if (!customerId) {
      setModalNotice({ tone: "amber", title: "Choose customer", text: "Select the customer who brought the device for repair." });
      return;
    }

    if (!device) {
      setModalNotice({ tone: "amber", title: "Add device", text: "Add the device name before saving the repair." });
      return;
    }

    if (!issue) {
      setModalNotice({ tone: "amber", title: "Describe issue", text: "Describe what the customer reported before saving." });
      return;
    }

    try {
      setModalNotice(null);

      await createRepair.mutateAsync({
        customerId,
        device,
        issue,
        serial: repairForm.serial.trim() || null,
        warrantyEnd: repairForm.warrantyEnd.trim() || null,
      });

      setCreateModalOpen(false);
      setNotice({ tone: "green", title: "Repair logged", text: `${device} was added to the repair log.` });
    } catch (error) {
      setModalNotice({ tone: "red", title: "Repair not saved", text: repairErrorMessage(error) });
    }
  }

  async function handleStatusChange(repairId: string, status: RepairStatus) {
    try {
      setBusyRepairId(repairId);
      await updateStatus.mutateAsync({ repairId, status });
      setNotice({ tone: "green", title: "Repair updated", text: `Status changed to ${repairStatusLabel(status)}.` });
    } catch (error) {
      setNotice({ tone: "red", title: "Status not updated", text: repairErrorMessage(error) });
    } finally {
      setBusyRepairId("");
    }
  }

  async function handleAssign(repairId: string, technicianId?: string | null) {
    try {
      setBusyRepairId(repairId);
      await assignTechnician.mutateAsync({ repairId, technicianId: technicianId || null });
      setNotice({ tone: "green", title: "Technician updated", text: technicianId ? "Repair has been assigned." : "Repair is now unassigned." });
    } catch (error) {
      setNotice({ tone: "red", title: "Technician not updated", text: repairErrorMessage(error) });
    } finally {
      setBusyRepairId("");
    }
  }

  function confirmArchive(repair: RepairRecord) {
    Alert.alert("Archive repair?", `Archive the repair for ${clean(repair.device, "this device")}? It will leave the active list.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: async () => {
        try {
          setBusyRepairId(repair.id);
          await archiveRepair.mutateAsync(repair.id);
          setNotice({ tone: "green", title: "Repair archived", text: "The repair was removed from the active list." });
        } catch (error) {
          setNotice({ tone: "red", title: "Repair not archived", text: repairErrorMessage(error) });
        } finally {
          setBusyRepairId("");
        }
      }},
    ]);
  }

  function confirmDelete(repair: RepairRecord) {
    Alert.alert("Delete repair?", `Permanently delete the repair for ${clean(repair.device, "this device")}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          setBusyRepairId(repair.id);
          await deleteRepair.mutateAsync(repair.id);
          setNotice({ tone: "green", title: "Repair deleted", text: "The repair record was permanently deleted." });
        } catch (error) {
          setNotice({ tone: "red", title: "Repair not deleted", text: repairErrorMessage(error) });
        } finally {
          setBusyRepairId("");
        }
      }},
    ]);
  }

  return (
    <AppShell>
      {(palette) => isLoading ? <ScreenSkeleton palette={palette} layoutWidth={layoutWidth} /> : (
        <View style={[styles.stack, styles.screenBottomSpace]}>
          <View style={[styles.heroPanel, compact ? styles.heroPanelCompact : null, { borderColor: palette.borderStrong, backgroundColor: "rgba(34, 199, 244, 0.10)" }]}> 
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, compact ? styles.heroIconCompact : null]}>
                <Ionicons name="construct-outline" size={compact ? 20 : 23} color="#06111F" />
              </View>

              <View style={styles.heroContent}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroDot} />
                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Repair control</AppText>
                </View>
                <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>Track customer device repairs.</AppText>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>Log intake, assign technicians, and move repairs from received to delivered for {branchDisplayName(activeBranch)}.</AppText>
              </View>

              {!compact && canCreate ? <AsyncButton onPress={openCreateModal} variant="secondary" style={styles.heroButton}>New repair</AsyncButton> : null}
            </View>

            {compact && canCreate ? <AsyncButton onPress={openCreateModal} variant="secondary" fullWidth>New repair</AsyncButton> : null}
          </View>

          <NoticePanel notice={notice} palette={palette} />

          <View style={styles.responsiveGrid}>
            <SummaryCard label="Total repairs" value={String(summary.total)} helper="Active repair records" icon="albums-outline" tone="cyan" palette={palette} width={summaryWidth} />
            <SummaryCard label="Received" value={String(summary.received)} helper="Awaiting technician" icon="file-tray-outline" tone={summary.received > 0 ? "amber" : "slate"} palette={palette} width={summaryWidth} />
            <SummaryCard label="In progress" value={String(summary.inProgress)} helper="Under active service" icon="construct-outline" tone={summary.inProgress > 0 ? "blue" : "slate"} palette={palette} width={summaryWidth} />
            <SummaryCard label="Delivered" value={String(summary.delivered)} helper="Customer handovers" icon="bag-check-outline" tone={summary.delivered > 0 ? "green" : "slate"} palette={palette} width={summaryWidth} />
          </View>

          <View style={[styles.searchPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
            <View style={styles.searchRow}>
              <View style={[styles.searchBox, { borderColor: query ? toneSpec("cyan", palette).border : palette.border, backgroundColor: palette.stage }]}> 
                <Ionicons name="search-outline" size={17} color={query ? palette.cyan : palette.soft} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search device, customer, serial, issue"
                  placeholderTextColor={palette.soft}
                  style={[styles.searchInput, { color: palette.text }, { outlineStyle: "none" } as never]}
                />
                {query ? <Pressable onPress={() => setQuery("")} style={styles.clearButton}><Ionicons name="close-circle" size={18} color={palette.soft} /></Pressable> : null}
              </View>
              <AsyncButton onPress={refreshAll} variant="secondary" style={styles.refreshButton} disabled={isRefreshing}>{isRefreshing ? "Refreshing" : "Refresh"}</AsyncButton>
            </View>

            <View style={styles.choiceRow}>
              <ChoiceChip label="All" active={filterStatus === "ALL"} tone="cyan" palette={palette} onPress={() => setFilterStatus("ALL")} />
              {REPAIR_STATUSES.map((status) => <ChoiceChip key={String(status.value)} label={status.label} active={filterStatus === status.value} tone={statusTone(status.value)} palette={palette} onPress={() => setFilterStatus(status.value)} />)}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Repair records</AppText>
              <AppText variant="subtitle" color={palette.text}>Repair log</AppText>
            </View>
            <AppText variant="caption" color={palette.soft}>{visibleRepairs.length} of {filteredRepairs.length} shown</AppText>
          </View>

          {repairsQuery.isError ? (
            <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} />
              <AppText variant="subtitle" color={palette.text} center>Repairs could not load</AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>Refresh and try again.</AppText>
              <AsyncButton onPress={refreshAll} variant="secondary">Try again</AsyncButton>
            </View>
          ) : filteredRepairs.length === 0 ? (
            <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Ionicons name="construct-outline" size={32} color={palette.cyan} />
              <AppText variant="subtitle" color={palette.text} center>No repairs found</AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>Log customer device repairs here so owners and staff can track progress clearly.</AppText>
              {canCreate ? <AsyncButton onPress={openCreateModal} variant="primary">Log repair</AsyncButton> : null}
            </View>
          ) : (
            <>
              <View style={styles.responsiveGrid}>
                {visibleRepairs.map((repair) => (
                  <RepairCard
                    key={repair.id}
                    repair={repair}
                    palette={palette}
                    width={cardWidth}
                    technicians={technicians}
                    canChangeStatus={canChangeStatus}
                    canAssign={canAssign}
                    canArchive={canArchive}
                    canDelete={canDelete}
                    busyId={busyRepairId}
                    onStatusChange={handleStatusChange}
                    onAssign={handleAssign}
                    onArchive={confirmArchive}
                    onDelete={confirmDelete}
                    onViewDetails={setSelectedRepair}
                  />
                ))}
              </View>

              {hasMoreRepairs ? (
                <View style={styles.showMoreWrap}>
                  <AsyncButton onPress={() => setShowAllRepairs((current) => !current)} variant="secondary">
                    {showAllRepairs ? "Show fewer repairs" : "View more repairs"}
                  </AsyncButton>
                </View>
              ) : null}
            </>
          )}

          <RepairDetailsModal
            repair={selectedRepair}
            palette={palette}
            technicians={technicians}
            canChangeStatus={canChangeStatus}
            canAssign={canAssign}
            busyId={busyRepairId}
            onClose={() => setSelectedRepair(null)}
            onStatusChange={handleStatusChange}
            onAssign={handleAssign}
          />

          <RepairCreateModal
            open={createModalOpen}
            palette={palette}
            customers={customers}
            form={repairForm}
            notice={modalNotice}
            saving={createRepair.isPending}
            onChange={updateForm}
            onClose={() => {
              if (createRepair.isPending) return;
              setModalNotice(null);
              setCreateModalOpen(false);
            }}
            onSave={saveRepair}
          />
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  screenBottomSpace: { paddingBottom: 30 },
  eyebrow: { letterSpacing: 0.8, textTransform: "uppercase" },
  cardText: { flexShrink: 1, lineHeight: 18 },
  accentButton: { backgroundColor: ACCENT, borderColor: ACCENT },
  heroPanel: { position: "relative", overflow: "hidden", borderWidth: 1, padding: 16, gap: 16 },
  heroPanelCompact: { padding: 14, gap: 14 },
  heroGlow: { position: "absolute", right: -88, top: -88, width: 178, height: 178, backgroundColor: "rgba(34, 199, 244, 0.12)", transform: [{ rotate: "18deg" }] },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroIcon: { width: 56, height: 56, alignItems: "center", justifyContent: "center", backgroundColor: "#67E8F9" },
  heroIconCompact: { width: 46, height: 46 },
  heroContent: { flex: 1, minWidth: 0, maxWidth: "100%", gap: 6 },
  heroLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  heroDot: { width: 6, height: 6, backgroundColor: "#67E8F9" },
  heroTitle: { lineHeight: 24 },
  heroButton: { minHeight: 44, paddingHorizontal: 16, backgroundColor: "transparent" },
  responsiveGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { minHeight: 112, borderWidth: 1, padding: 13, gap: 8 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryIcon: { width: 30, height: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  noticePanel: { borderWidth: 1, padding: 14, flexDirection: "row", gap: 12 },
  noticeMark: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  searchPanel: { borderWidth: 1, padding: 12, gap: 10 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBox: { flex: 1, minHeight: 48, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minWidth: 0, fontFamily: "Quicksand_600SemiBold", fontSize: 13, paddingVertical: 0 },
  clearButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  refreshButton: { minHeight: 48, paddingHorizontal: 14 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  repairCard: { borderWidth: 1, padding: 13, gap: 12 },
  repairHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  repairIcon: { width: 34, height: 34, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statusPill: { flexShrink: 0, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  infoGrid: { flexDirection: "row", gap: 8 },
  infoBox: { flex: 1, borderWidth: 1, padding: 10, gap: 5 },
  controlBlock: { gap: 8 },
  horizontalChips: { gap: 8, paddingRight: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardActions: { flexDirection: "row", gap: 8 },
  smallAction: { flex: 1, minHeight: 44 },
  emptyPanel: { borderWidth: 1, padding: 22, alignItems: "center", gap: 12 },
  showMoreWrap: { alignItems: "center", paddingTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.68)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 560, maxHeight: "90%", borderWidth: 1, overflow: "hidden" },
  modalHeader: { padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12, borderBottomWidth: 1 },
  modalHeaderIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  closeButton: { width: 38, height: 38, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalScroll: { maxHeight: 560 },
  modalBody: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  fieldWrap: { gap: 7 },
  input: { minHeight: 50, borderWidth: 1, paddingHorizontal: 13, fontFamily: "Quicksand_600SemiBold", fontSize: 14 },
  textArea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  formSection: { borderWidth: 1, padding: 12, gap: 12 },
  formSectionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepBadge: { width: 30, height: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { fontSize: 11, fontFamily: "Quicksand_700Bold" },
  customerSearchShell: { minHeight: 50, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  customerSearchInput: { flex: 1, minWidth: 0, fontFamily: "Quicksand_600SemiBold", fontSize: 14, paddingVertical: 0 },
  customerResultList: { gap: 8 },
  customerResult: { borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  customerAvatar: { width: 34, height: 34, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  selectedCustomerCard: { borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  selectedCustomerIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  customerHintPanel: { borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  customerGrid: { gap: 8 },
  customerChip: { borderWidth: 1, padding: 10, gap: 3 },
  selectedPanel: { borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  detailHeroPanel: { borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailBox: { width: "48.7%", minHeight: 86, borderWidth: 1, padding: 11, gap: 5 },
  detailIssueText: { lineHeight: 21 },
  detailsModalCard: { maxWidth: 620 },
  moreToggle: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  dateSelectButton: { minHeight: 54, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  calendarPanel: { borderWidth: 1, padding: 12, gap: 12 },
  calendarTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  calendarNavButton: { width: 36, height: 36, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quickDateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickDateChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  weekRow: { flexDirection: "row" },
  weekDay: { width: "14.285%", textAlign: "center", fontFamily: "Quicksand_700Bold" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDayButton: { width: "14.285%", height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  calendarDayText: { fontFamily: "Quicksand_700Bold" },
  modalFooter: { padding: 16, flexDirection: "row", gap: 10, borderTopWidth: 1 },
  footerButton: { flex: 1, minHeight: 52 },
});
