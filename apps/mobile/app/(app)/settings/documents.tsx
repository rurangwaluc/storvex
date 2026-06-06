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

type DocumentForm = {
  receiptPrefix: string;
  invoicePrefix: string;
  warrantyPrefix: string;
  proformaPrefix: string;
  receiptPadding: string;
  invoicePadding: string;
  warrantyPadding: string;
  proformaPadding: string;
  invoiceTerms: string;
  warrantyTerms: string;
  proformaTerms: string;
  deliveryNoteTerms: string;
  documentPrimaryColor: string;
  documentAccentColor: string;
  documentHeaderDisplay: string;
  documentSizeMode: string;
};

const HEADER_OPTIONS = [
  {
    value: "LOGO_AND_NAME",
    title: "Logo and business name",
    text: "Best default for most stores.",
    icon: "business-outline" as IoniconName,
  },
  {
    value: "LOGO_ONLY",
    title: "Logo only",
    text: "Best when the logo already contains the business name.",
    icon: "image-outline" as IoniconName,
  },
  {
    value: "NAME_ONLY",
    title: "Business name only",
    text: "Best when the store has no clean logo yet.",
    icon: "text-outline" as IoniconName,
  },
];

const SIZE_OPTIONS = [
  {
    value: "AUTO",
    title: "Auto",
    text: "Compact for simple receipts, standard for longer documents.",
    icon: "sparkles-outline" as IoniconName,
  },
  {
    value: "COMPACT",
    title: "Compact",
    text: "Tighter print spacing for simple one-page documents.",
    icon: "contract-outline" as IoniconName,
  },
  {
    value: "STANDARD",
    title: "Standard",
    text: "Balanced spacing for invoices, proformas, and warranties.",
    icon: "expand-outline" as IoniconName,
  },
];

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function numberString(value: unknown, fallback = "6") {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return String(Math.max(1, Math.min(12, Math.round(n))));
}

function settingsToForm(settings?: DocumentSettings | null): DocumentForm {
  return {
    receiptPrefix: clean(settings?.receiptPrefix, "RCT"),
    invoicePrefix: clean(settings?.invoicePrefix, "INV"),
    warrantyPrefix: clean(settings?.warrantyPrefix, "WAR"),
    proformaPrefix: clean(settings?.proformaPrefix, "PRF"),
    receiptPadding: numberString(settings?.receiptPadding, "6"),
    invoicePadding: numberString(settings?.invoicePadding, "6"),
    warrantyPadding: numberString(settings?.warrantyPadding, "6"),
    proformaPadding: numberString(settings?.proformaPadding, "6"),
    invoiceTerms: clean(settings?.invoiceTerms),
    warrantyTerms: clean(settings?.warrantyTerms),
    proformaTerms: clean(settings?.proformaTerms),
    deliveryNoteTerms: clean(settings?.deliveryNoteTerms),
    documentPrimaryColor: normalizeHex(settings?.documentPrimaryColor, "#0F4C81"),
    documentAccentColor: normalizeHex(settings?.documentAccentColor, "#E8EEF5"),
    documentHeaderDisplay: clean(settings?.documentHeaderDisplay, "LOGO_AND_NAME"),
    documentSizeMode: clean(settings?.documentSizeMode, "AUTO"),
  };
}

function normalizeHex(value: unknown, fallback: string) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  const next = raw.startsWith("#") ? raw : `#${raw}`;

  if (/^#[0-9a-fA-F]{6}$/.test(next)) return next.toUpperCase();

  if (/^#[0-9a-fA-F]{3}$/.test(next)) {
    const r = next[1];
    const g = next[2];
    const b = next[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return fallback;
}

function normalizePayload(form: DocumentForm) {
  return {
    receiptPrefix: clean(form.receiptPrefix, "RCT").toUpperCase(),
    invoicePrefix: clean(form.invoicePrefix, "INV").toUpperCase(),
    warrantyPrefix: clean(form.warrantyPrefix, "WAR").toUpperCase(),
    proformaPrefix: clean(form.proformaPrefix, "PRF").toUpperCase(),
    receiptPadding: Number(numberString(form.receiptPadding, "6")),
    invoicePadding: Number(numberString(form.invoicePadding, "6")),
    warrantyPadding: Number(numberString(form.warrantyPadding, "6")),
    proformaPadding: Number(numberString(form.proformaPadding, "6")),
    invoiceTerms: clean(form.invoiceTerms) || null,
    warrantyTerms: clean(form.warrantyTerms) || null,
    proformaTerms: clean(form.proformaTerms) || null,
    deliveryNoteTerms: clean(form.deliveryNoteTerms) || null,
    documentPrimaryColor: normalizeHex(form.documentPrimaryColor, "#0F4C81"),
    documentAccentColor: normalizeHex(form.documentAccentColor, "#E8EEF5"),
    documentHeaderDisplay: clean(form.documentHeaderDisplay, "LOGO_AND_NAME"),
    documentSizeMode: clean(form.documentSizeMode, "AUTO"),
  };
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

function getColumns(width: number, mode: "fields" | "choice" | "stats") {
  if (mode === "stats") {
    if (width >= 920) return 4;
    if (width >= 600) return 2;
    return 1;
  }

  if (mode === "choice") {
    if (width >= 920) return 3;
    if (width >= 560) return 2;
    return 1;
  }

  if (width >= 920) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 3) return "32%" as DimensionValue;
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

function DocumentsSkeleton({
  palette,
  width,
}: {
  palette: AppShellPalette;
  width: number;
}) {
  const fieldWidth = widthForColumns(getColumns(width, "fields"));

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
            {[1, 2, 3, 4].map((item) => (
              <View key={`${section}-${item}`} style={{ width: fieldWidth }}>
                <Skeleton height={52} width="100%" />
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  palette,
  editable,
  width,
  keyboardType = "default",
  multiline = false,
  autoCapitalize = "characters",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  palette: AppShellPalette;
  editable: boolean;
  width: DimensionValue;
  keyboardType?: "default" | "number-pad";
  multiline?: boolean;
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
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        onChangeText={onChange}
        style={[
          styles.input,
          multiline ? styles.textarea : null,
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

function ChoiceCard({
  title,
  text,
  icon,
  active,
  editable,
  palette,
  width,
  onPress,
}: {
  title: string;
  text: string;
  icon: IoniconName;
  active: boolean;
  editable: boolean;
  palette: AppShellPalette;
  width: DimensionValue;
  onPress: () => void;
}) {
  const spec = toneSpec(active ? "cyan" : "slate", palette);

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
        <Ionicons name={active ? "checkmark" : icon} size={16} color={active ? "#06111F" : palette.soft} />
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

function PreviewCard({
  title,
  prefix,
  padding,
  terms,
  primaryColor,
  accentColor,
  headerMode,
  sizeMode,
  palette,
  width,
}: {
  title: string;
  prefix: string;
  padding: string;
  terms: string;
  primaryColor: string;
  accentColor: string;
  headerMode: string;
  sizeMode: string;
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const showLogo = headerMode !== "NAME_ONLY";
  const showName = headerMode !== "LOGO_ONLY";

  return (
    <View
      style={[
        styles.previewCard,
        {
          width,
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={[styles.previewHeader, { backgroundColor: primaryColor }]}>
        <View style={styles.previewHeaderRow}>
          {showLogo ? (
            <View style={styles.previewLogo}>
              <AppText variant="caption" color="#06111F" style={styles.previewLogoText}>
                LOGO
              </AppText>
            </View>
          ) : null}

          <View style={{ flex: 1, gap: 3 }}>
            {showName ? (
              <AppText variant="label" color="#FFFFFF">
                Business name
              </AppText>
            ) : null}

            <AppText variant="caption" color="rgba(255,255,255,0.78)" style={styles.eyebrow}>
              {title}
            </AppText>
          </View>

          <View style={styles.previewSizePill}>
            <AppText variant="caption" color="#FFFFFF" style={styles.previewSizeText}>
              {sizeMode}
            </AppText>
          </View>
        </View>

        <View style={[styles.previewGlow, { backgroundColor: `${accentColor}88` }]} />
      </View>

      <View style={styles.previewBody}>
        <AppText variant="caption" color={palette.soft} style={styles.fieldLabel}>
          Number preview
        </AppText>

        <AppText variant="label" color={palette.text}>
          {clean(prefix, "DOC")}-2026-{String(1).padStart(Number(numberString(padding, "6")), "0")}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.previewTerms}>
          {clean(terms, "No terms added yet.")}
        </AppText>
      </View>
    </View>
  );
}

export default function DocumentPrintSettingsScreen() {
  const { width } = useWindowDimensions();

  const user = useAuthStore((state) => state.user);
  const settingsQuery = useDocumentSettings();
  const updateSettings = useUpdateDocumentSettings();

  const role = String(user?.role || "OWNER").toUpperCase();
  const isOwner = role === "OWNER";
  const editable = isOwner && !updateSettings.isPending;

  const settings = settingsQuery.data || null;

  const [form, setForm] = useState<DocumentForm>(() => settingsToForm(null));

  useEffect(() => {
    if (!settings) return;
    setForm(settingsToForm(settings));
  }, [settings]);

  const initialForm = useMemo(() => settingsToForm(settings), [settings]);

  const dirty = useMemo(() => {
    return JSON.stringify(normalizePayload(form)) !== JSON.stringify(normalizePayload(initialForm));
  }, [form, initialForm]);

  const fieldWidth = widthForColumns(getColumns(width, "fields"));
  const choiceWidth = widthForColumns(getColumns(width, "choice"));
  const statWidth = widthForColumns(getColumns(width, "stats"));
  const previewWidth = widthForColumns(width >= 900 ? 2 : 1);
  const fullWidth = "100%" as DimensionValue;

  function updateField(key: keyof DocumentForm, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save() {
    if (!isOwner) {
      Alert.alert(
        "Owner-only setting",
        "Managers can review document settings, but only the owner can save changes.",
      );
      return;
    }

    if (!dirty || updateSettings.isPending) return;

    try {
      await updateSettings.mutateAsync(normalizePayload(form));

      Alert.alert(
        "Document settings updated",
        "Your receipts, invoices, proformas, warranties, and delivery notes now use the saved print settings.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save document settings.";
      Alert.alert("Could not save", message);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        settingsQuery.isLoading ? (
          <DocumentsSkeleton palette={palette} width={width} />
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
                  Documents and print
                </AppText>
              </View>

              <StatusPill label={roleLabel(role)} tone={isOwner ? "cyan" : "slate"} palette={palette} />
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
                <Ionicons name="document-text-outline" size={28} color="#06111F" />
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroDot} />

                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    PRINT CONTROL
                  </AppText>
                </View>

                <AppText variant="subtitle" color={palette.text}>
                  Customer documents
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.heroText}>
                  Control how receipts, invoices, proformas, delivery notes, and warranties look.
                </AppText>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              <StatCard
                label="Receipt"
                value={clean(form.receiptPrefix, "RCT")}
                icon="receipt-outline"
                tone="cyan"
                palette={palette}
                width={statWidth}
              />

              <StatCard
                label="Invoice"
                value={clean(form.invoicePrefix, "INV")}
                icon="document-outline"
                tone="green"
                palette={palette}
                width={statWidth}
              />

              <StatCard
                label="Warranty"
                value={clean(form.warrantyPrefix, "WAR")}
                icon="shield-checkmark-outline"
                tone="blue"
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
                <Ionicons name="lock-closed-outline" size={18} color={toneSpec("amber", palette).fg} />

                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="label" color={palette.text}>
                    Read-only access
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.warningText}>
                    Your current role is {roleLabel(role)}. Only the owner can save document print changes.
                  </AppText>
                </View>
              </View>
            ) : null}

            <Panel
              eyebrow="Preview"
              title="How documents will look"
              text="Quick previews help the owner understand print behavior before saving."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <PreviewCard
                  title="Receipt"
                  prefix={form.receiptPrefix}
                  padding={form.receiptPadding}
                  terms={form.invoiceTerms}
                  primaryColor={form.documentPrimaryColor}
                  accentColor={form.documentAccentColor}
                  headerMode={form.documentHeaderDisplay}
                  sizeMode={form.documentSizeMode}
                  palette={palette}
                  width={previewWidth}
                />

                <PreviewCard
                  title="Warranty"
                  prefix={form.warrantyPrefix}
                  padding={form.warrantyPadding}
                  terms={form.warrantyTerms}
                  primaryColor={form.documentPrimaryColor}
                  accentColor={form.documentAccentColor}
                  headerMode={form.documentHeaderDisplay}
                  sizeMode={form.documentSizeMode}
                  palette={palette}
                  width={previewWidth}
                />
              </View>
            </Panel>

            <Panel
              eyebrow="Numbering"
              title="Document numbers"
              text="Control the short code and number length used on customer documents."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <Field
                  label="Receipt prefix"
                  value={form.receiptPrefix}
                  editable={editable}
                  placeholder="RCT"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("receiptPrefix", value.toUpperCase())}
                />

                <Field
                  label="Receipt digits"
                  value={form.receiptPadding}
                  editable={editable}
                  keyboardType="number-pad"
                  placeholder="6"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("receiptPadding", value.replace(/\D/g, ""))}
                />

                <Field
                  label="Invoice prefix"
                  value={form.invoicePrefix}
                  editable={editable}
                  placeholder="INV"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("invoicePrefix", value.toUpperCase())}
                />

                <Field
                  label="Invoice digits"
                  value={form.invoicePadding}
                  editable={editable}
                  keyboardType="number-pad"
                  placeholder="6"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("invoicePadding", value.replace(/\D/g, ""))}
                />

                <Field
                  label="Proforma prefix"
                  value={form.proformaPrefix}
                  editable={editable}
                  placeholder="PRF"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("proformaPrefix", value.toUpperCase())}
                />

                <Field
                  label="Proforma digits"
                  value={form.proformaPadding}
                  editable={editable}
                  keyboardType="number-pad"
                  placeholder="6"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("proformaPadding", value.replace(/\D/g, ""))}
                />

                <Field
                  label="Warranty prefix"
                  value={form.warrantyPrefix}
                  editable={editable}
                  placeholder="WAR"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("warrantyPrefix", value.toUpperCase())}
                />

                <Field
                  label="Warranty digits"
                  value={form.warrantyPadding}
                  editable={editable}
                  keyboardType="number-pad"
                  placeholder="6"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("warrantyPadding", value.replace(/\D/g, ""))}
                />
              </View>
            </Panel>

            <Panel
              eyebrow="Branding"
              title="Document appearance"
              text="Control header style, spacing, and colors used on printable customer documents."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                {HEADER_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    text={option.text}
                    icon={option.icon}
                    active={form.documentHeaderDisplay === option.value}
                    editable={editable}
                    palette={palette}
                    width={choiceWidth}
                    onPress={() => updateField("documentHeaderDisplay", option.value)}
                  />
                ))}
              </View>

              <View style={styles.responsiveGrid}>
                {SIZE_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    text={option.text}
                    icon={option.icon}
                    active={form.documentSizeMode === option.value}
                    editable={editable}
                    palette={palette}
                    width={choiceWidth}
                    onPress={() => updateField("documentSizeMode", option.value)}
                  />
                ))}
              </View>

              <View style={styles.responsiveGrid}>
                <Field
                  label="Primary color"
                  value={form.documentPrimaryColor}
                  editable={editable}
                  placeholder="#0F4C81"
                  palette={palette}
                  width={fieldWidth}
                  autoCapitalize="characters"
                  onChange={(value) => updateField("documentPrimaryColor", value)}
                />

                <Field
                  label="Accent color"
                  value={form.documentAccentColor}
                  editable={editable}
                  placeholder="#E8EEF5"
                  palette={palette}
                  width={fieldWidth}
                  autoCapitalize="characters"
                  onChange={(value) => updateField("documentAccentColor", value)}
                />
              </View>
            </Panel>

            <Panel
              eyebrow="Terms"
              title="Customer document notes"
              text="Use short, business-friendly terms. These appear on customer-facing documents."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <Field
                  label="Invoice terms"
                  value={form.invoiceTerms}
                  editable={editable}
                  multiline
                  autoCapitalize="sentences"
                  placeholder="Example: Payment is due within 7 days."
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("invoiceTerms", value)}
                />

                <Field
                  label="Proforma terms"
                  value={form.proformaTerms}
                  editable={editable}
                  multiline
                  autoCapitalize="sentences"
                  placeholder="Example: Prices are valid for 7 days."
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("proformaTerms", value)}
                />

                <Field
                  label="Warranty terms"
                  value={form.warrantyTerms}
                  editable={editable}
                  multiline
                  autoCapitalize="sentences"
                  placeholder="Example: Warranty applies under store warranty conditions."
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("warrantyTerms", value)}
                />

                <Field
                  label="Delivery note terms"
                  value={form.deliveryNoteTerms}
                  editable={editable}
                  multiline
                  autoCapitalize="sentences"
                  placeholder="Example: Goods received in good condition."
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("deliveryNoteTerms", value)}
                />
              </View>
            </Panel>

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
                  {dirty ? "Unsaved changes" : "Document settings are current"}
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.saveText}>
                  {isOwner
                    ? "Save when the print setup looks right."
                    : "Only the owner can save document settings."}
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

  textarea: {
    minHeight: 104,
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: 20,
  },

  choiceCard: {
    minHeight: 90,
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

  previewCard: {
    overflow: "hidden",
    borderWidth: 1,
  },

  previewHeader: {
    position: "relative",
    overflow: "hidden",
    minHeight: 104,
    padding: 14,
  },

  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  previewLogo: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },

  previewLogoText: {
    fontSize: 9,
    fontWeight: "900",
  },

  previewSizePill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  previewSizeText: {
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  previewGlow: {
    position: "absolute",
    left: -30,
    right: -30,
    bottom: -42,
    height: 72,
  },

  previewBody: {
    gap: 8,
    padding: 14,
  },

  previewTerms: {
    marginTop: 2,
    lineHeight: 17,
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