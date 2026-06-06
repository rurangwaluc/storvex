import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Pressable,
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
  useDocumentSettings,
  useUpdateDocumentSettings,
} from "../../../src/features/settings/hooks";
import type { DocumentSettings } from "../../../src/features/settings/types";
import { useAuthStore } from "../../../src/store/authStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type TaxForm = {
  taxMode: string;
  taxDisplayMode: string;
  taxName: string;
  taxRatePercent: string;
  pricesIncludeTax: boolean;
};

type TaxModeOption = {
  value: string;
  title: string;
  text: string;
  icon: IoniconName;
  tone: Tone;
  name: string;
  rate: number;
};

type DisplayOption = {
  value: string;
  title: string;
  text: string;
  icon: IoniconName;
  tone: Tone;
};

const TAX_MODE_OPTIONS: TaxModeOption[] = [
  {
    value: "NONE",
    title: "No customer tax line",
    text: "Use this when the business should not show any tax line on customer documents.",
    icon: "eye-off-outline",
    tone: "blue",
    name: "",
    rate: 0,
  },
  {
    value: "VAT_18",
    title: "VAT 18%",
    text: "Use this when the business needs VAT shown or tracked at eighteen percent.",
    icon: "receipt-outline",
    tone: "cyan",
    name: "VAT",
    rate: 18,
  },
  {
    value: "TURNOVER_3_INTERNAL",
    title: "Turnover estimate 3%",
    text: "Use this as an internal owner estimate, not as a customer tax line by default.",
    icon: "analytics-outline",
    tone: "amber",
    name: "Turnover tax estimate",
    rate: 3,
  },
  {
    value: "VAT_18_PLUS_TURNOVER_3",
    title: "VAT + turnover estimate",
    text: "Track a combined twenty-one percent tax estimate for owner reporting.",
    icon: "layers-outline",
    tone: "green",
    name: "Tax",
    rate: 21,
  },
  {
    value: "CUSTOM",
    title: "Custom tax",
    text: "Set your own tax name and percentage when the standard options do not fit.",
    icon: "create-outline",
    tone: "slate",
    name: "Tax",
    rate: 0,
  },
];

const DISPLAY_OPTIONS: DisplayOption[] = [
  {
    value: "HIDDEN",
    title: "Hidden from customers",
    text: "No tax line appears on receipts, invoices, proformas, delivery notes, or warranties.",
    icon: "eye-off-outline",
    tone: "blue",
  },
  {
    value: "CUSTOMER_FACING",
    title: "Visible to customers",
    text: "Customer documents show the tax name and amount clearly.",
    icon: "eye-outline",
    tone: "cyan",
  },
  {
    value: "INTERNAL_ONLY",
    title: "Internal only",
    text: "The business can track tax internally while customers do not see the tax line.",
    icon: "lock-closed-outline",
    tone: "amber",
  },
];

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
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

function getColumns(width: number, mode: "choice" | "stats") {
  if (mode === "stats") {
    if (width >= 920) return 4;
    if (width >= 600) return 2;
    return 1;
  }

  if (width >= 920) return 3;
  if (width >= 560) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 3) return "32%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function numberToPercent(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";

  const percent = n / 100;

  if (Number.isInteger(percent)) return String(percent);

  return String(Number(percent.toFixed(2)));
}

function safePercent(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");

  const parts = cleaned.split(".");
  const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
  const n = Number(normalized || 0);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(100, n));
}

function percentToBps(value: unknown) {
  return Math.round(safePercent(value) * 100);
}

function modeOption(value: string) {
  const mode = String(value || "NONE").toUpperCase();

  return TAX_MODE_OPTIONS.find((option) => option.value === mode) || TAX_MODE_OPTIONS[0];
}

function displayOption(value: string) {
  const mode = String(value || "HIDDEN").toUpperCase();

  return DISPLAY_OPTIONS.find((option) => option.value === mode) || DISPLAY_OPTIONS[0];
}

function settingsToForm(settings?: DocumentSettings | null): TaxForm {
  const taxMode = clean(settings?.taxMode, "NONE").toUpperCase();
  const option = modeOption(taxMode);
  const displayMode = clean(settings?.taxDisplayMode, "HIDDEN").toUpperCase();
  const taxRateBps = Number(settings?.taxRateBps ?? option.rate * 100);

  return {
    taxMode,
    taxDisplayMode: taxMode === "NONE" ? "HIDDEN" : displayMode,
    taxName: clean(settings?.taxName, option.name),
    taxRatePercent: numberToPercent(taxRateBps),
    pricesIncludeTax: Boolean(settings?.pricesIncludeTax),
  };
}

function normalizePayload(form: TaxForm) {
  const taxMode = clean(form.taxMode, "NONE").toUpperCase();
  const option = modeOption(taxMode);
  const taxDisplayMode =
    taxMode === "NONE" ? "HIDDEN" : clean(form.taxDisplayMode, "HIDDEN").toUpperCase();
  const taxName = taxMode === "NONE" ? null : clean(form.taxName, option.name || "Tax");
  const taxRateBps = taxMode === "NONE" ? 0 : percentToBps(form.taxRatePercent || option.rate);

  return {
    taxMode,
    taxDisplayMode,
    taxName,
    taxRateBps,
    pricesIncludeTax: taxMode === "NONE" ? false : Boolean(form.pricesIncludeTax),
    showTaxOnCustomerDocuments: taxMode !== "NONE" && taxDisplayMode === "CUSTOMER_FACING",
  };
}

function applyModeDefaults(form: TaxForm, mode: string): TaxForm {
  const option = modeOption(mode);

  if (option.value === "NONE") {
    return {
      ...form,
      taxMode: "NONE",
      taxDisplayMode: "HIDDEN",
      taxName: "",
      taxRatePercent: "0",
      pricesIncludeTax: false,
    };
  }

  return {
    ...form,
    taxMode: option.value,
    taxDisplayMode:
      option.value === "TURNOVER_3_INTERNAL"
        ? "INTERNAL_ONLY"
        : form.taxDisplayMode === "HIDDEN"
          ? "CUSTOMER_FACING"
          : form.taxDisplayMode,
    taxName: option.name,
    taxRatePercent: option.rate ? String(option.rate) : form.taxRatePercent,
  };
}

function summaryLabel(form: TaxForm) {
  const payload = normalizePayload(form);
  const mode = String(payload.taxMode).toUpperCase();
  const display = String(payload.taxDisplayMode).toUpperCase();
  const rate = Number(payload.taxRateBps) / 100;

  if (mode === "NONE") return "No tax line will appear on customer documents.";

  const visibility =
    display === "CUSTOMER_FACING"
      ? "shown to customers"
      : display === "INTERNAL_ONLY"
        ? "tracked internally"
        : "hidden from customers";

  return `${payload.taxName || "Tax"}${rate > 0 ? ` ${rate}%` : ""}, ${visibility}.`;
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

function TaxSkeleton({ palette, width }: { palette: AppShellPalette; width: number }) {
  const choiceWidth = widthForColumns(getColumns(width, "choice"));

  return (
    <View style={styles.stack}>
      <View style={styles.topBar}>
        <Skeleton height={42} width={42} />

        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={12} width="28%" />
          <Skeleton height={24} width="58%" />
        </View>
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
          <Skeleton height={13} width="36%" />
          <Skeleton height={28} width="78%" />
          <Skeleton height={14} width="92%" />
        </View>
      </View>

      {[1, 2, 3].map((section) => (
        <View
          key={section}
          style={[
            styles.panel,
            {
              borderColor: palette.border,
              backgroundColor: palette.panelStrong,
            },
          ]}
        >
          <Skeleton height={13} width="26%" />
          <Skeleton height={24} width="48%" />

          <View style={styles.responsiveGrid}>
            {[1, 2, 3].map((item) => (
              <View key={`${section}-${item}`} style={{ width: choiceWidth }}>
                <Skeleton height={92} width="100%" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function SectionLabel({
  eyebrow,
  title,
  text,
  palette,
}: {
  eyebrow: string;
  title: string;
  text: string;
  palette: AppShellPalette;
}) {
  return (
    <View style={styles.sectionLabel}>
      <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
        {eyebrow}
      </AppText>

      <AppText variant="title" color={palette.text}>
        {title}
      </AppText>

      <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
        {text}
      </AppText>
    </View>
  );
}

function Panel({
  eyebrow,
  title,
  text,
  palette,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  palette: AppShellPalette;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: palette.border,
          backgroundColor: palette.panelStrong,
        },
      ]}
    >
      <SectionLabel eyebrow={eyebrow} title={title} text={text} palette={palette} />
      {children}
    </View>
  );
}

function ChoiceCard({
  title,
  text,
  icon,
  tone,
  active,
  editable,
  palette,
  width,
  onPress,
}: {
  title: string;
  text: string;
  icon: IoniconName;
  tone: Tone;
  active: boolean;
  editable: boolean;
  palette: AppShellPalette;
  width: DimensionValue;
  onPress: () => void;
}) {
  const spec = toneSpec(active ? tone : "slate", palette);

  return (
    <Pressable
      disabled={!editable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        {
          width,
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.panel,
          opacity: pressed ? 0.78 : editable ? 1 : 0.64,
        },
      ]}
    >
      <View
        style={[
          styles.choiceIcon,
          {
            borderColor: active ? spec.border : palette.border,
            backgroundColor: active ? spec.solid : "rgba(148, 163, 184, 0.08)",
          },
        ]}
      >
        <Ionicons
          name={active ? "checkmark" : icon}
          size={16}
          color={active ? "#06111F" : palette.soft}
        />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={active ? spec.fg : palette.text}>
          {title}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.choiceText}>
          {text}
        </AppText>
      </View>
    </Pressable>
  );
}

function StatCard({
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
        styles.statCard,
        {
          width,
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          {
            borderColor: spec.border,
            backgroundColor: spec.bg,
          },
        ]}
      >
        <Ionicons name={icon} size={15} color={spec.fg} />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="caption" color={palette.soft} style={styles.statLabel}>
          {label}
        </AppText>

        <AppText variant="label" color={palette.text} style={styles.statValue}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  palette,
  editable,
  width,
  keyboardType = "default",
  autoCapitalize = "words",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  palette: AppShellPalette;
  editable: boolean;
  width: DimensionValue;
  keyboardType?: "default" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
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

function ToggleRow({
  title,
  text,
  icon,
  value,
  editable,
  palette,
  onPress,
}: {
  title: string;
  text: string;
  icon: IoniconName;
  value: boolean;
  editable: boolean;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(value ? "cyan" : "slate", palette);

  return (
    <Pressable
      disabled={!editable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggleRow,
        {
          borderColor: value ? spec.border : palette.border,
          backgroundColor: value ? spec.bg : palette.panel,
          opacity: pressed ? 0.78 : editable ? 1 : 0.64,
        },
      ]}
    >
      <View
        style={[
          styles.toggleIcon,
          {
            borderColor: value ? spec.border : palette.border,
            backgroundColor: value ? spec.solid : "rgba(148, 163, 184, 0.08)",
          },
        ]}
      >
        <Ionicons
          name={value ? "checkmark" : icon}
          size={16}
          color={value ? "#06111F" : palette.soft}
        />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {title}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.choiceText}>
          {text}
        </AppText>
      </View>

      <View
        style={[
          styles.switchTrack,
          {
            borderColor: value ? spec.border : palette.border,
            backgroundColor: value ? spec.solid : "rgba(148, 163, 184, 0.14)",
          },
        ]}
      >
        <View
          style={[
            styles.switchKnob,
            {
              backgroundColor: value ? "#06111F" : palette.soft,
              transform: [{ translateX: value ? 13 : 0 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

function TaxPreview({ form, palette }: { form: TaxForm; palette: AppShellPalette }) {
  const payload = normalizePayload(form);
  const mode = String(payload.taxMode).toUpperCase();
  const display = String(payload.taxDisplayMode).toUpperCase();
  const customerFacing = mode !== "NONE" && display === "CUSTOMER_FACING";
  const included = Boolean(payload.pricesIncludeTax);
  const subtotal = 100000;
  const taxAmount = customerFacing
    ? Math.round((subtotal * Number(payload.taxRateBps)) / 10000)
    : 0;
  const total = included ? subtotal : subtotal + taxAmount;

  return (
    <View
      style={[
        styles.previewCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.previewHeader}>
        <View style={[styles.previewLogo, { backgroundColor: palette.cyan }]}>
          <AppText variant="caption" color="#06111F" style={styles.previewLogoText}>
            SV
          </AppText>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="label" color={palette.text}>
            Customer document preview
          </AppText>

          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            TAX DISPLAY
          </AppText>
        </View>
      </View>

      <View style={styles.previewRows}>
        <View style={styles.previewRow}>
          <AppText variant="caption" color={palette.soft}>
            Items subtotal
          </AppText>

          <AppText variant="label" color={palette.text}>
            RWF {subtotal.toLocaleString()}
          </AppText>
        </View>

        {customerFacing ? (
          <View style={styles.previewRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" color={palette.soft}>
                {String(payload.taxName || "Tax")}
              </AppText>

              <AppText variant="caption" color={palette.soft}>
                {included ? "Included in item prices" : "Added before final total"}
              </AppText>
            </View>

            <AppText variant="label" color={palette.text}>
              RWF {taxAmount.toLocaleString()}
            </AppText>
          </View>
        ) : (
          <View
            style={[
              styles.hiddenPreview,
              {
                borderColor: palette.border,
                backgroundColor: "rgba(148, 163, 184, 0.08)",
              },
            ]}
          >
            <Ionicons name="eye-off-outline" size={16} color={palette.soft} />

            <AppText variant="caption" color={palette.soft} style={styles.choiceText}>
              Customers will not see a separate tax line.
            </AppText>
          </View>
        )}

        <View style={[styles.previewTotal, { borderTopColor: palette.border }]}>
          <AppText variant="label" color={palette.text}>
            Final total
          </AppText>

          <AppText variant="subtitle" color={palette.text}>
            RWF {total.toLocaleString()}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export default function TaxDisplaySettingsScreen() {
  const { width } = useWindowDimensions();

  const user = useAuthStore((state) => state.user);
  const settingsQuery = useDocumentSettings();
  const updateSettings = useUpdateDocumentSettings();

  const role = String(user?.role || "OWNER").toUpperCase();
  const isOwner = role === "OWNER";
  const editable = isOwner && !updateSettings.isPending;

  const settings = settingsQuery.data || null;
  const [form, setForm] = useState<TaxForm>(() => settingsToForm(null));

  useEffect(() => {
    if (!settings) return;
    setForm(settingsToForm(settings));
  }, [settings]);

  const initialForm = useMemo(() => settingsToForm(settings), [settings]);

  const normalizedForm = useMemo(() => normalizePayload(form), [form]);
  const initialPayload = useMemo(() => normalizePayload(initialForm), [initialForm]);

  const dirty = useMemo(() => {
    return JSON.stringify(normalizedForm) !== JSON.stringify(initialPayload);
  }, [normalizedForm, initialPayload]);

  const choiceWidth = widthForColumns(getColumns(width, "choice"));
  const statWidth = widthForColumns(getColumns(width, "stats"));
  const selectedMode = modeOption(form.taxMode);
  const selectedDisplay = displayOption(form.taxDisplayMode);
  const taxDisabled = form.taxMode === "NONE";

  function updateField(key: keyof TaxForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save() {
    if (!isOwner) {
      Alert.alert(
        "Owner-only setting",
        "Managers can review tax display, but only the owner can save tax settings.",
      );
      return;
    }

    if (!dirty || updateSettings.isPending) return;

    if (form.taxMode === "CUSTOM" && !clean(form.taxName)) {
      Alert.alert("Tax name needed", "Add a short tax name before saving a custom tax.");
      return;
    }

    if (form.taxMode !== "NONE" && percentToBps(form.taxRatePercent) <= 0) {
      Alert.alert("Tax rate needed", "Choose a tax rate greater than zero or select no tax line.");
      return;
    }

    try {
      await updateSettings.mutateAsync(normalizedForm);

      Alert.alert(
        "Tax display updated",
        "Customer documents will now follow the saved tax display settings.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save tax display settings.";
      Alert.alert("Could not save", message);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        settingsQuery.isLoading ? (
          <TaxSkeleton palette={palette} width={width} />
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
                  Tax display
                </AppText>
              </View>

              <StatusPill
                label={roleLabel(role)}
                tone={isOwner ? "cyan" : "slate"}
                palette={palette}
              />
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
              <View style={styles.heroGlow} />

              <View style={styles.logoMark}>
                <Ionicons name="calculator-outline" size={28} color="#06111F" />
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroDot} />

                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    TAX CONTROL
                  </AppText>
                </View>

                <AppText variant="subtitle" color={palette.text}>
                  Decide what customers see
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.heroText}>
                  Control whether tax is hidden, tracked internally, or shown clearly on customer documents.
                </AppText>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              <StatCard
                label="Current mode"
                value={selectedMode.title}
                icon={selectedMode.icon}
                tone={selectedMode.tone}
                palette={palette}
                width={statWidth}
              />

              <StatCard
                label="Visibility"
                value={taxDisabled ? "Hidden" : selectedDisplay.title}
                icon={selectedDisplay.icon}
                tone={taxDisabled ? "blue" : selectedDisplay.tone}
                palette={palette}
                width={statWidth}
              />

              <StatCard
                label="Rate"
                value={`${safePercent(form.taxRatePercent)}%`}
                icon="pricetag-outline"
                tone="green"
                palette={palette}
                width={statWidth}
              />

              <StatCard
                label="Access"
                value={isOwner ? "Can save changes" : "Review only"}
                icon={isOwner ? "key-outline" : "lock-closed-outline"}
                tone={isOwner ? "amber" : "slate"}
                palette={palette}
                width={statWidth}
              />
            </View>

            {!isOwner ? (
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
                  name="lock-closed-outline"
                  size={18}
                  color={toneSpec("amber", palette).fg}
                />

                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="label" color={palette.text}>
                    Read-only access
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.warningText}>
                    Your current role is {roleLabel(role)}. Only the owner can save tax display changes.
                  </AppText>
                </View>
              </View>
            ) : null}

            <Panel
              eyebrow="Tax mode"
              title="Choose how tax is handled"
              text="Pick the option that matches how the business wants to track or show tax on documents."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                {TAX_MODE_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    text={option.text}
                    icon={option.icon}
                    tone={option.tone}
                    active={form.taxMode === option.value}
                    editable={editable}
                    palette={palette}
                    width={choiceWidth}
                    onPress={() => setForm((current) => applyModeDefaults(current, option.value))}
                  />
                ))}
              </View>
            </Panel>

            <Panel
              eyebrow="Customer visibility"
              title="Decide who sees the tax line"
              text="Customer-facing means it appears on documents. Internal only means it stays for owner tracking."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                {DISPLAY_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    text={option.text}
                    icon={option.icon}
                    tone={option.tone}
                    active={form.taxDisplayMode === option.value}
                    editable={editable && !taxDisabled}
                    palette={palette}
                    width={choiceWidth}
                    onPress={() => updateField("taxDisplayMode", option.value)}
                  />
                ))}
              </View>
            </Panel>

            <Panel
              eyebrow="Tax details"
              title="Name, rate, and price behavior"
              text="These values control the tax label, percentage, and whether item prices already include tax."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <Field
                  label="Tax name"
                  value={form.taxName}
                  editable={editable && form.taxMode === "CUSTOM"}
                  placeholder="Tax"
                  palette={palette}
                  width={choiceWidth}
                  onChange={(value) => updateField("taxName", value)}
                />

                <Field
                  label="Tax rate percent"
                  value={form.taxRatePercent}
                  editable={editable && form.taxMode === "CUSTOM"}
                  keyboardType="decimal-pad"
                  autoCapitalize="none"
                  placeholder="18"
                  palette={palette}
                  width={choiceWidth}
                  onChange={(value) => updateField("taxRatePercent", value)}
                />
              </View>

              <ToggleRow
                title="Prices include tax"
                text="Turn this on when item prices already include the tax amount. Turn it off when tax should be added before the final total."
                icon="pricetag-outline"
                value={form.pricesIncludeTax}
                editable={editable && !taxDisabled}
                palette={palette}
                onPress={() => updateField("pricesIncludeTax", !form.pricesIncludeTax)}
              />
            </Panel>

            <Panel
              eyebrow="Preview"
              title="What customers will understand"
              text="Use this preview before saving so the owner knows exactly what appears on customer documents."
              palette={palette}
            >
              <TaxPreview form={form} palette={palette} />
            </Panel>

            <View
              style={[
                styles.summaryPanel,
                {
                  borderColor: toneSpec(taxDisabled ? "blue" : selectedMode.tone, palette).border,
                  backgroundColor: toneSpec(taxDisabled ? "blue" : selectedMode.tone, palette).bg,
                },
              ]}
            >
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor: toneSpec(
                      taxDisabled ? "blue" : selectedMode.tone,
                      palette,
                    ).solid,
                  },
                ]}
              >
                <Ionicons
                  name={taxDisabled ? "eye-off-outline" : "calculator-outline"}
                  size={17}
                  color="#06111F"
                />
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label" color={palette.text}>
                  Saved behavior preview
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.summaryText}>
                  {summaryLabel(form)}
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.saveDock,
                {
                  borderColor: dirty ? toneSpec("cyan", palette).border : palette.border,
                  backgroundColor: dirty ? toneSpec("cyan", palette).bg : palette.stage,
                },
              ]}
            >
              <View
                style={[
                  styles.saveIcon,
                  {
                    backgroundColor: dirty
                      ? toneSpec("cyan", palette).solid
                      : "rgba(148, 163, 184, 0.14)",
                  },
                ]}
              >
                <Ionicons
                  name={dirty ? "create-outline" : "checkmark"}
                  size={17}
                  color={dirty ? "#06111F" : palette.soft}
                />
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label" color={dirty ? palette.cyan : palette.text}>
                  {dirty ? "Unsaved changes" : "Tax display is current"}
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.saveText}>
                  {isOwner
                    ? "Save when the tax display behavior is correct."
                    : "Only the owner can save tax display settings."}
                </AppText>
              </View>

              <AppButton
                disabled={!dirty || !isOwner}
                loading={updateSettings.isPending}
                onPress={save}
                style={styles.saveButton}
              >
                Save
              </AppButton>
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

  logoMark: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  statCard: {
    minHeight: 74,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  statLabel: {
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  statValue: {
    lineHeight: 19,
  },

  panel: {
    borderWidth: 1,
    padding: 16,
    gap: 15,
  },

  sectionLabel: {
    gap: 6,
  },

  sectionText: {
    lineHeight: 18,
  },

  choiceCard: {
    minHeight: 104,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  choiceIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  choiceText: {
    lineHeight: 17,
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

  toggleRow: {
    minHeight: 92,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  toggleIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  switchTrack: {
    width: 42,
    height: 24,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  switchKnob: {
    width: 16,
    height: 16,
  },

  previewCard: {
    borderWidth: 1,
    overflow: "hidden",
  },

  previewHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  previewLogo: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  previewLogoText: {
    fontSize: 10,
    fontWeight: "900",
  },

  previewRows: {
    padding: 14,
    gap: 12,
  },

  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  hiddenPreview: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  previewTotal: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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

  summaryPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  summaryIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryText: {
    lineHeight: 18,
  },

  saveDock: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  saveIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    lineHeight: 18,
  },

  saveButton: {
    minHeight: 48,
    minWidth: 104,
  },
});