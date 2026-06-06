import { useEffect, useMemo, useRef, useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppButton } from "../../../src/components/ui/AppButton";
import { AppText } from "../../../src/components/ui/AppText";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import {
  useCloseStoreLocation,
  useCreateStoreLocation,
  useReopenStoreLocation,
  useSetMainStoreLocation,
  useStoreLocations,
  useUpdateStoreLocation,
} from "../../../src/features/settings/hooks";
import type {
  StoreLocation,
  StoreLocationPayload,
} from "../../../src/features/settings/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";
type FormMode = "create" | "edit" | null;

type LocationForm = {
  name: string;
  code: string;
  phone: string;
  email: string;
  countryCode: string;
  district: string;
  sector: string;
  address: string;
};

type PendingAction = "main" | "close" | "reopen" | null;

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

type SummaryItem = {
  label: string;
  value: string;
  icon: IoniconName;
  tone: Tone;
};

const EMPTY_FORM: LocationForm = {
  name: "",
  code: "",
  phone: "",
  email: "",
  countryCode: "RW",
  district: "",
  sector: "",
  address: "",
};

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanOptional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function comparable(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function locationFingerprint(value: {
  name?: unknown;
  district?: unknown;
  sector?: unknown;
  address?: unknown;
}) {
  return [
    comparable(value.name),
    comparable(value.district),
    comparable(value.sector),
    comparable(value.address),
  ]
    .filter(Boolean)
    .join("|");
}

function formFromLocation(location?: StoreLocation | null): LocationForm {
  if (!location) return EMPTY_FORM;

  return {
    name: clean(location.name, ""),
    code: clean(location.code, ""),
    phone: clean(location.phone, ""),
    email: clean(location.email, ""),
    countryCode: clean(location.countryCode, "RW"),
    district: clean(location.district, ""),
    sector: clean(location.sector, ""),
    address: clean(location.address, ""),
  };
}

function payloadFromForm(form: LocationForm): StoreLocationPayload {
  return {
    name: clean(form.name, ""),
    code: normalizeCode(form.code),
    phone: cleanOptional(form.phone),
    email: cleanOptional(form.email),
    countryCode: clean(form.countryCode, "RW").toUpperCase(),
    district: cleanOptional(form.district),
    sector: cleanOptional(form.sector),
    address: cleanOptional(form.address),
  };
}

function duplicateMessage(
  form: LocationForm,
  locations: StoreLocation[],
  editingLocationId?: string | null,
) {
  const nextCode = normalizeCode(form.code);
  const nextName = comparable(form.name);
  const nextFingerprint = locationFingerprint(form);

  const match = locations.find((location) => {
    if (editingLocationId && location.id === editingLocationId) return false;

    const existingCode = normalizeCode(location.code);
    const existingName = comparable(location.name);
    const existingFingerprint = locationFingerprint(location);

    if (nextCode && existingCode && nextCode === existingCode) return true;
    if (nextName && existingName && nextName === existingName) return true;
    if (nextFingerprint && existingFingerprint && nextFingerprint === existingFingerprint) return true;

    return false;
  });

  if (!match) return null;

  const sameCode = nextCode && normalizeCode(match.code) === nextCode;
  const sameName = nextName && comparable(match.name) === nextName;

  if (sameCode) {
    return `A selling location already uses the short code ${nextCode}.`;
  }

  if (sameName) {
    return `A selling location named ${clean(match.name, "this name")} already exists.`;
  }

  return `A very similar selling location already exists: ${clean(match.name, "existing location")}.`;
}

function roleLabel(value?: string | null) {
  const role = String(value || "").trim().toUpperCase();

  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  if (role === "CASHIER") return "Cashier";
  if (role === "SELLER") return "Seller";
  if (role === "STOREKEEPER") return "Storekeeper";
  if (role === "TECHNICIAN") return "Technician";

  return role || "Staff";
}

function statusLabel(value?: string | null) {
  const status = String(value || "").trim().toUpperCase();

  if (status === "ACTIVE") return "Active";
  if (status === "CLOSED") return "Closed";
  if (status === "ARCHIVED") return "Closed";
  if (status === "INACTIVE") return "Inactive";
  if (status === "SUSPENDED") return "Paused";

  return status ? status.replaceAll("_", " ").toLowerCase() : "Active";
}

function statusTone(value?: string | null): Tone {
  const status = String(value || "").trim().toUpperCase();

  if (status === "ACTIVE") return "green";
  if (status === "CLOSED" || status === "ARCHIVED") return "amber";
  if (status === "INACTIVE" || status === "SUSPENDED") return "slate";

  return "green";
}

function typeLabel(location?: StoreLocation | null) {
  if (location?.isMain) return "Main store";

  const type = String(location?.type || "").trim().toUpperCase();

  if (type === "MAIN") return "Main store";
  if (type === "STANDARD") return "Selling location";
  if (type === "BRANCH") return "Selling location";
  if (type === "WAREHOUSE") return "Stock location";
  if (type === "STORE") return "Store location";
  if (type === "SHOP") return "Shop location";

  return "Selling location";
}

function isClosed(location?: StoreLocation | null) {
  const status = String(location?.status || "ACTIVE").toUpperCase();
  return status === "ARCHIVED" || status === "CLOSED" || status === "INACTIVE";
}

function addressLine(location?: StoreLocation | null) {
  const parts = [
    clean(location?.district, ""),
    clean(location?.sector, ""),
    clean(location?.address, ""),
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Address not added";
}

function contactLine(location?: StoreLocation | null) {
  const phone = clean(location?.phone, "");
  const email = clean(location?.email, "");

  if (phone && email) return `${phone}\n${email}`;
  if (phone) return phone;
  if (email) return email;

  return "No contact details added";
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

function getColumns(width: number, mode: "summary" | "locations" | "fields") {
  if (mode === "summary") {
    if (width >= 920) return 4;
    if (width >= 600) return 2;
    return 1;
  }

  if (mode === "locations") {
    if (width >= 920) return 2;
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
          name={notice.tone === "green" ? "checkmark" : "information-circle-outline"}
          size={18}
          color="#06111F"
        />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="label" color={palette.text}>
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

function StoreLocationsSkeleton({
  palette,
  width,
}: {
  palette: AppShellPalette;
  width: number;
}) {
  const summaryWidth = widthForColumns(getColumns(width, "summary"));
  const locationWidth = widthForColumns(getColumns(width, "locations"));

  return (
    <View style={styles.stack}>
      <View style={styles.topBar}>
        <Skeleton height={42} width={42} />

        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={12} width="28%" />
          <Skeleton height={24} width="58%" />
        </View>

        <Skeleton height={30} width={74} />
      </View>

      <View
        style={[
          styles.hero,
          {
            borderColor: palette.borderStrong,
            backgroundColor: "rgba(32, 200, 255, 0.10)",
          },
        ]}
      >
        <Skeleton height={60} width={60} />

        <View style={{ flex: 1, gap: 10 }}>
          <Skeleton height={13} width="38%" />
          <Skeleton height={28} width="76%" />
          <Skeleton height={14} width="92%" />
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View
            key={`summary-${item}`}
            style={[
              styles.summaryCard,
              {
                width: summaryWidth,
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={34} width={34} />

            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={11} width="42%" />
              <Skeleton height={18} width="72%" />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2].map((item) => (
          <View
            key={`location-${item}`}
            style={[
              styles.locationCard,
              {
                width: locationWidth,
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <View style={styles.locationTop}>
              <Skeleton height={42} width={42} />

              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton height={19} width="58%" />
                <Skeleton height={13} width="38%" />
              </View>
            </View>

            <View style={styles.locationStatusRow}>
              <Skeleton height={28} width={72} />
              <Skeleton height={28} width={92} />
              <Skeleton height={28} width={84} />
            </View>

            <Skeleton height={62} width="100%" />
            <Skeleton height={62} width="100%" />

            <View style={styles.locationFooter}>
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton height={11} width="32%" />
                <Skeleton height={18} width="46%" />
              </View>

              <Skeleton height={42} width={108} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryCard({
  item,
  palette,
  width,
}: {
  item: SummaryItem;
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const spec = toneSpec(item.tone, palette);

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
      <View
        style={[
          styles.summaryIcon,
          {
            borderColor: spec.border,
            backgroundColor: spec.bg,
          },
        ]}
      >
        <Ionicons name={item.icon} size={15} color={spec.fg} />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="caption" color={palette.soft} style={styles.summaryLabel}>
          {item.label}
        </AppText>

        <AppText variant="label" color={palette.text} style={styles.summaryValue}>
          {item.value}
        </AppText>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  editable,
  palette,
  width,
  keyboardType = "default",
  autoCapitalize = "words",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  editable: boolean;
  palette: AppShellPalette;
  width: DimensionValue;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words" | "characters";
  onChange: (value: string) => void;
}) {
  return (
    <View style={[styles.field, { width }]}>
      <AppText variant="caption" color={palette.soft} style={styles.fieldLabel}>
        {label}
      </AppText>

      <TextInput
        value={value}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={palette.soft}
        onChangeText={onChange}
        style={[
          styles.input,
          {
            borderColor: palette.border,
            backgroundColor: palette.panel,
            color: palette.text,
            opacity: editable ? 1 : 0.64,
          },
        ]}
      />
    </View>
  );
}

function DetailBox({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: AppShellPalette;
}) {
  return (
    <View
      style={[
        styles.detailBox,
        {
          borderColor: palette.border,
          backgroundColor: palette.stage,
        },
      ]}
    >
      <AppText variant="caption" color={palette.soft} style={styles.detailLabel}>
        {label}
      </AppText>

      <AppText variant="label" color={palette.text} style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

function EmptyLocations({
  palette,
  canAdd,
  onCreate,
}: {
  palette: AppShellPalette;
  canAdd: boolean;
  onCreate: () => void;
}) {
  return (
    <View
      style={[
        styles.emptyPanel,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: palette.cyan }]}>
        <Ionicons name="location-outline" size={22} color="#06111F" />
      </View>

      <View style={{ flex: 1, gap: 7 }}>
        <AppText variant="label" color={palette.text}>
          No selling locations found
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.emptyText}>
          Add the first selling location so sales, stock, cash drawer activity, and
          documents have a clear place to belong.
        </AppText>

        {canAdd ? (
          <Pressable
            onPress={onCreate}
            style={[styles.inlineAction, { borderColor: palette.border }]}
          >
            <Ionicons name="add" size={16} color={palette.cyan} />
            <AppText variant="label" color={palette.cyan}>
              Add selling location
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function LocationFormModal({
  mode,
  visible,
  form,
  palette,
  width,
  editable,
  saving,
  duplicateWarning,
  onChange,
  onCancel,
  onSave,
}: {
  mode: Exclude<FormMode, null>;
  visible: boolean;
  form: LocationForm;
  palette: AppShellPalette;
  width: number;
  editable: boolean;
  saving: boolean;
  duplicateWarning: string | null;
  onChange: (key: keyof LocationForm, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const fieldWidth = widthForColumns(getColumns(width, "fields"));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            {
              borderColor: toneSpec("cyan", palette).border,
              backgroundColor: palette.stage,
            },
          ]}
        >
          <View style={styles.formHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                {mode === "create" ? "ADD LOCATION" : "EDIT LOCATION"}
              </AppText>

              <AppText variant="title" color={palette.text}>
                {mode === "create" ? "New selling location" : "Update selling location"}
              </AppText>

              <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                Use clear store names and short codes that staff can recognize quickly.
              </AppText>
            </View>

            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Ionicons name="close" size={18} color={palette.text} />
            </Pressable>
          </View>

          {duplicateWarning ? (
            <View
              style={[
                styles.warningPanel,
                {
                  borderColor: toneSpec("amber", palette).border,
                  backgroundColor: toneSpec("amber", palette).bg,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={toneSpec("amber", palette).fg}
              />

              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label" color={palette.text}>
                  Similar location found
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.warningText}>
                  {duplicateWarning}
                </AppText>
              </View>
            </View>
          ) : null}

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.responsiveGrid}>
              <Field
                label="Location name"
                value={form.name}
                placeholder="Example: Kigali Main Store"
                editable={editable}
                palette={palette}
                width={fieldWidth}
                onChange={(value) => onChange("name", value)}
              />

              <Field
                label="Short code"
                value={form.code}
                placeholder="Example: KGL_MAIN"
                editable={editable}
                autoCapitalize="characters"
                palette={palette}
                width={fieldWidth}
                onChange={(value) => onChange("code", normalizeCode(value))}
              />

              <Field
                label="Phone"
                value={form.phone}
                placeholder="Example: 0780000000"
                editable={editable}
                keyboardType="phone-pad"
                autoCapitalize="none"
                palette={palette}
                width={fieldWidth}
                onChange={(value) => onChange("phone", value)}
              />

              <Field
                label="Email"
                value={form.email}
                placeholder="store@example.com"
                editable={editable}
                keyboardType="email-address"
                autoCapitalize="none"
                palette={palette}
                width={fieldWidth}
                onChange={(value) => onChange("email", value)}
              />

              <Field
                label="Country"
                value={form.countryCode}
                placeholder="RW"
                editable={editable}
                autoCapitalize="characters"
                palette={palette}
                width={fieldWidth}
                onChange={(value) => onChange("countryCode", value.toUpperCase())}
              />

              <Field
                label="District"
                value={form.district}
                placeholder="Example: Gasabo"
                editable={editable}
                palette={palette}
                width={fieldWidth}
                onChange={(value) => onChange("district", value)}
              />

              <Field
                label="Sector"
                value={form.sector}
                placeholder="Example: Kimironko"
                editable={editable}
                palette={palette}
                width={fieldWidth}
                onChange={(value) => onChange("sector", value)}
              />

              <Field
                label="Address"
                value={form.address}
                placeholder="Example: KG 11 Ave"
                editable={editable}
                palette={palette}
                width={fieldWidth}
                onChange={(value) => onChange("address", value)}
              />
            </View>
          </ScrollView>

          <View style={styles.formActions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppText variant="label" color={palette.text}>
                Cancel
              </AppText>
            </Pressable>

            <AppButton
              loading={saving}
              disabled={!editable || Boolean(duplicateWarning)}
              onPress={onSave}
              style={styles.saveButton}
            >
              {mode === "create" ? "Add location" : "Save changes"}
            </AppButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LocationCard({
  location,
  active,
  role,
  palette,
  width,
  pendingAction,
  onUse,
  onEdit,
  onSetMain,
  onClose,
  onReopen,
}: {
  location: StoreLocation;
  active: boolean;
  role: string;
  palette: AppShellPalette;
  width: DimensionValue;
  pendingAction: PendingAction;
  onUse: () => void;
  onEdit: () => void;
  onSetMain: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  const closed = isClosed(location);
  const main = Boolean(location.isMain);
  const spec = toneSpec(active ? "cyan" : statusTone(location.status), palette);

  return (
    <View
      style={[
        styles.locationCard,
        {
          width,
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.panel,
        },
      ]}
    >
      <View style={styles.locationTop}>
        <View
          style={[
            styles.locationIcon,
            {
              borderColor: spec.border,
              backgroundColor: active ? spec.solid : spec.bg,
            },
          ]}
        >
          <Ionicons
            name={main ? "storefront-outline" : "location-outline"}
            size={20}
            color={active ? "#06111F" : spec.fg}
          />
        </View>

        <View style={styles.locationTitleBlock}>
          <View style={styles.locationNameRow}>
            <AppText variant="label" color={palette.text} style={styles.locationName}>
              {clean(location.name, "Selling location")}
            </AppText>

            {active ? <StatusPill label="Current" tone="cyan" palette={palette} /> : null}
          </View>

          <AppText variant="caption" color={palette.soft} style={styles.locationSubtitle}>
            {typeLabel(location)}
          </AppText>
        </View>
      </View>

      <View style={styles.locationStatusRow}>
        <StatusPill
          label={statusLabel(location.status)}
          tone={statusTone(location.status)}
          palette={palette}
        />

        {main ? <StatusPill label="Main store" tone="amber" palette={palette} /> : null}

        {location.canOperate !== false ? (
          <StatusPill label="Work access" tone="green" palette={palette} />
        ) : (
          <StatusPill label="Review only" tone="slate" palette={palette} />
        )}
      </View>

      <View style={styles.detailGrid}>
        <DetailBox label="Short code" value={clean(location.code, "Not added")} palette={palette} />
        <DetailBox label="Address" value={addressLine(location)} palette={palette} />
        <DetailBox label="Contact" value={contactLine(location)} palette={palette} />
      </View>

      <View style={styles.locationFooter}>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="caption" color={palette.soft} style={styles.footerLabel}>
            Current role
          </AppText>

          <AppText variant="label" color={palette.text}>
            {roleLabel(role)}
          </AppText>
        </View>

        <Pressable
          disabled={active || closed}
          onPress={onUse}
          style={({ pressed }) => [
            styles.useButton,
            {
              borderColor: active ? spec.border : palette.border,
              backgroundColor: active ? spec.solid : palette.stage,
              opacity: pressed ? 0.76 : active || closed ? 0.58 : 1,
            },
          ]}
        >
          <Ionicons
            name={active ? "checkmark" : "swap-horizontal-outline"}
            size={16}
            color={active ? "#06111F" : palette.cyan}
          />

          <AppText variant="label" color={active ? "#06111F" : palette.cyan}>
            {active ? "In use" : "Use here"}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.actionGrid}>
        <AppButton disabled={closed} onPress={onEdit} style={styles.cardActionButton}>
          Edit
        </AppButton>

        <AppButton
          disabled={main || closed}
          loading={pendingAction === "main"}
          onPress={onSetMain}
          style={styles.cardActionButton}
        >
          Set main
        </AppButton>

        {closed ? (
          <AppButton
            loading={pendingAction === "reopen"}
            onPress={onReopen}
            style={styles.cardActionButton}
          >
            Reopen
          </AppButton>
        ) : (
          <AppButton
            disabled={main}
            loading={pendingAction === "close"}
            onPress={onClose}
            style={styles.cardActionButton}
          >
            Close
          </AppButton>
        )}
      </View>
    </View>
  );
}

export default function StoreLocationsSettingsScreen() {
  const { width } = useWindowDimensions();
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranch = useBranchStore((state) => state.activeBranch);
  const setActiveBranch = useBranchStore((state) => state.setActiveBranch);
  const setBranches = useBranchStore((state) => state.setBranches);

  const locationsQuery = useStoreLocations();
  const createLocation = useCreateStoreLocation();
  const updateLocation = useUpdateStoreLocation();
  const setMainLocation = useSetMainStoreLocation();
  const closeLocation = useCloseStoreLocation();
  const reopenLocation = useReopenStoreLocation();

  const [mode, setMode] = useState<FormMode>(null);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
  const [form, setForm] = useState<LocationForm>(EMPTY_FORM);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const role = String(user?.role || "OWNER").toUpperCase();
  const canManage = role === "OWNER" || role === "MANAGER";

  const locations = useMemo(
    () => locationsQuery.data?.branches || [],
    [locationsQuery.data?.branches],
  );

  useEffect(() => {
    if (locations.length) {
      setBranches(locations);
    }
  }, [locations, setBranches]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const mainLocation = locations.find((location) => location.isMain) || null;
  const activeLocation =
    activeBranch ||
    locations.find((location) => location.isMain) ||
    locations[0] ||
    null;

  const openLocations = locations.filter((location) => !isClosed(location));
  const usage = locationsQuery.data?.usage || null;
  const canAdd = canManage && usage?.canAddBranch !== false;

  const duplicateWarning = useMemo(
    () => duplicateMessage(form, locations, editingLocation?.id),
    [editingLocation?.id, form, locations],
  );

  const summaryWidth = widthForColumns(getColumns(width, "summary"));
  const locationWidth = widthForColumns(getColumns(width, "locations"));

  const loading = isHydrating || locationsQuery.isLoading;
  const saving = createLocation.isPending || updateLocation.isPending;
  const actionBusy =
    setMainLocation.isPending || closeLocation.isPending || reopenLocation.isPending;

  const summaryItems = useMemo<SummaryItem[]>(
    () => [
      {
        label: "Current location",
        value: clean(activeLocation?.name, "Not selected"),
        icon: "navigate-outline",
        tone: "cyan",
      },
      {
        label: "Main store",
        value: clean(mainLocation?.name, "Not marked"),
        icon: "storefront-outline",
        tone: "amber",
      },
      {
        label: "Open locations",
        value: `${openLocations.length} ${openLocations.length === 1 ? "location" : "locations"}`,
        icon: "checkmark-circle-outline",
        tone: "green",
      },
      {
        label: "Allowed locations",
        value:
          usage?.effectiveBranchLimit == null
            ? "No fixed limit"
            : `${usage.activeBranches || openLocations.length}/${usage.effectiveBranchLimit}`,
        icon: "speedometer-outline",
        tone: usage?.atLimit ? "amber" : "blue",
      },
    ],
    [
      activeLocation?.name,
      mainLocation?.name,
      openLocations.length,
      usage?.activeBranches,
      usage?.atLimit,
      usage?.effectiveBranchLimit,
    ],
  );

  function showNotice(nextNotice: Notice) {
    setNotice(nextNotice);

    if (noticeTimer.current) clearTimeout(noticeTimer.current);

    noticeTimer.current = setTimeout(() => {
      setNotice(null);
    }, 4200);
  }

  function updateField(key: keyof LocationForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    if (!canAdd) {
      Alert.alert(
        "Location limit reached",
        "This plan is already using all allowed selling locations.",
      );
      return;
    }

    setEditingLocation(null);
    setForm(EMPTY_FORM);
    setMode("create");
  }

  function startEdit(location: StoreLocation) {
    setEditingLocation(location);
    setForm(formFromLocation(location));
    setMode("edit");
  }

  function closeForm() {
    setMode(null);
    setEditingLocation(null);
    setForm(EMPTY_FORM);
  }

  async function saveForm() {
    if (!canManage || saving) return;

    const payload = payloadFromForm(form);

    if (!payload.name) {
      Alert.alert("Location name needed", "Add a clear name for this selling location.");
      return;
    }

    if (!payload.code) {
      Alert.alert("Short code needed", "Add a short code for this selling location.");
      return;
    }

    const duplicate = duplicateMessage(form, locations, editingLocation?.id);

    if (duplicate) {
      Alert.alert("Similar location found", duplicate);
      return;
    }

    try {
      if (mode === "edit" && editingLocation?.id) {
        await updateLocation.mutateAsync({
          branchId: editingLocation.id,
          payload,
        });

        showNotice({
          tone: "green",
          title: "Location updated",
          text: `${payload.name} has been saved.`,
        });
      } else {
        await createLocation.mutateAsync(payload);

        showNotice({
          tone: "green",
          title: "Location added",
          text: `${payload.name} is ready for business work.`,
        });
      }

      await locationsQuery.refetch();
      closeForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save selling location.";
      Alert.alert("Could not save", message);
    }
  }

  function useLocation(location: StoreLocation) {
    if (isClosed(location)) {
      Alert.alert("Location is closed", "Reopen this selling location before using it for daily work.");
      return;
    }

    setActiveBranch(location);

    showNotice({
      tone: "cyan",
      title: "Selling location changed",
      text: `${clean(
        location.name,
        "This selling location",
      )} is now used for sales, stock, cash drawer activity, and customer documents on this device.`,
    });
  }

  async function runLocationAction(
    location: StoreLocation,
    action: Exclude<PendingAction, null>,
  ) {
    if (!canManage || actionBusy) return;

    setPendingId(location.id);
    setPendingAction(action);

    try {
      if (action === "main") {
        await setMainLocation.mutateAsync(location.id);

        showNotice({
          tone: "green",
          title: "Main store updated",
          text: `${clean(location.name, "This location")} is now the main store.`,
        });
      }

      if (action === "close") {
        await closeLocation.mutateAsync(location.id);

        showNotice({
          tone: "amber",
          title: "Location closed",
          text: `${clean(location.name, "This location")} is no longer open for daily work.`,
        });
      }

      if (action === "reopen") {
        await reopenLocation.mutateAsync(location.id);

        showNotice({
          tone: "green",
          title: "Location reopened",
          text: `${clean(location.name, "This location")} is open for daily work.`,
        });
      }

      await locationsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update selling location.";
      Alert.alert("Could not update", message);
    } finally {
      setPendingId(null);
      setPendingAction(null);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        loading ? (
          <StoreLocationsSkeleton palette={palette} width={width} />
        ) : (
          <View style={styles.stack}>
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
                  Store locations
                </AppText>
              </View>

              <StatusPill
                label={roleLabel(role)}
                tone={canManage ? "cyan" : "slate"}
                palette={palette}
              />
            </View>

            <NoticePanel notice={notice} palette={palette} onClose={() => setNotice(null)} />

            <View
              style={[
                styles.hero,
                {
                  borderColor: palette.borderStrong,
                  backgroundColor: "rgba(32, 200, 255, 0.10)",
                },
              ]}
            >
              <View style={styles.heroGlow} />

              <View style={styles.heroIcon}>
                <Ionicons name="location-outline" size={28} color="#06111F" />
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroDot} />

                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    LOCATION CONTROL
                  </AppText>
                </View>

                <AppText variant="subtitle" color={palette.text}>
                  Manage where business work happens
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.heroText}>
                  Add selling locations, update details, choose the main store, and control which
                  location this device uses for daily work.
                </AppText>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              {summaryItems.map((item) => (
                <SummaryCard
                  key={item.label}
                  item={item}
                  palette={palette}
                  width={summaryWidth}
                />
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                  SELLING LOCATIONS
                </AppText>

                <AppText variant="title" color={palette.text}>
                  Where the business operates
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                  Sales, stock, cash drawer activity, and customer documents follow the selected location.
                </AppText>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => locationsQuery.refetch()}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.panel,
                      opacity: pressed || locationsQuery.isFetching ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons name="refresh" size={17} color={palette.cyan} />
                </Pressable>

                <Pressable
                  onPress={startCreate}
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      borderWidth: canAdd ? 0 : 1,
                      borderColor: canAdd ? "transparent" : toneSpec("amber", palette).border,
                      backgroundColor: canAdd ? palette.cyan : toneSpec("amber", palette).bg,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={canAdd ? "add" : "lock-closed-outline"}
                    size={17}
                    color={canAdd ? "#06111F" : toneSpec("amber", palette).fg}
                  />

                  <AppText
                    variant="label"
                    color={canAdd ? "#06111F" : toneSpec("amber", palette).fg}
                  >
                    {canAdd ? "Add" : "Plan limit"}
                  </AppText>
                </Pressable>
              </View>
            </View>

            <LocationFormModal
              mode={mode || "create"}
              visible={Boolean(mode)}
              form={form}
              palette={palette}
              width={width}
              editable={canManage && !saving}
              saving={saving}
              duplicateWarning={duplicateWarning}
              onChange={updateField}
              onCancel={closeForm}
              onSave={saveForm}
            />

            {locationsQuery.isError ? (
              <View
                style={[
                  styles.warningPanel,
                  {
                    borderColor: toneSpec("red", palette).border,
                    backgroundColor: toneSpec("red", palette).bg,
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={toneSpec("red", palette).fg}
                />

                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="label" color={palette.text}>
                    Could not load selling locations
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.warningText}>
                    Check the connection and try refreshing.
                  </AppText>
                </View>
              </View>
            ) : null}

            {locations.length ? (
              <View style={styles.responsiveGrid}>
                {locations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    active={location.id === activeLocation?.id}
                    role={role}
                    palette={palette}
                    width={locationWidth}
                    pendingAction={pendingId === location.id ? pendingAction : null}
                    onUse={() => useLocation(location)}
                    onEdit={() => startEdit(location)}
                    onSetMain={() => runLocationAction(location, "main")}
                    onClose={() => runLocationAction(location, "close")}
                    onReopen={() => runLocationAction(location, "reopen")}
                  />
                ))}
              </View>
            ) : (
              <EmptyLocations palette={palette} canAdd={canAdd} onCreate={startCreate} />
            )}

            <View
              style={[
                styles.ownerNote,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={[styles.noteIcon, { backgroundColor: palette.cyan }]}>
                <Ionicons name="information-circle-outline" size={18} color="#06111F" />
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label" color={palette.text}>
                  Current location affects daily work
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.noteText}>
                  Choose the selling location this device should use. Sales, stock, cash drawer
                  activity, customer documents, and business activity follow this selection.
                </AppText>
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

  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusText: {
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
    padding: 16,
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
    width: 60,
    height: 60,
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
    minHeight: 78,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  summaryIcon: {
    width: 34,
    height: 34,
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
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  modalBackdrop: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
    backgroundColor: "rgba(2, 8, 23, 0.72)",
  },

  modalCard: {
    width: "100%",
    maxWidth: 860,
    maxHeight: "92%",
    alignSelf: "center",
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },

  modalScroll: {
    maxHeight: 520,
  },

  modalScrollContent: {
    paddingBottom: 4,
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

  field: {
    gap: 8,
  },

  fieldLabel: {
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  input: {
    minHeight: 54,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
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

  locationCard: {
    minHeight: 312,
    borderWidth: 1,
    padding: 14,
    gap: 13,
  },

  locationTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  locationIcon: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  locationTitleBlock: {
    flex: 1,
    gap: 4,
  },

  locationNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  locationName: {
    flex: 1,
    lineHeight: 20,
  },

  locationSubtitle: {
    lineHeight: 17,
  },

  locationStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  detailGrid: {
    gap: 8,
  },

  detailBox: {
    borderWidth: 1,
    padding: 11,
    gap: 5,
  },

  detailLabel: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  detailValue: {
    lineHeight: 20,
  },

  locationFooter: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  footerLabel: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  useButton: {
    minHeight: 42,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  cardActionButton: {
    minHeight: 42,
    minWidth: 96,
    flexGrow: 1,
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

  emptyText: {
    lineHeight: 18,
  },

  inlineAction: {
    alignSelf: "flex-start",
    minHeight: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  warningPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  warningText: {
    lineHeight: 18,
  },

  ownerNote: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  noteIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  noteText: {
    lineHeight: 18,
  },
});