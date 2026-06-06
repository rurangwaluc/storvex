import { useEffect, useMemo, useState } from "react";
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
  useStoreProfile,
  useUpdateStoreProfile,
} from "../../../src/features/settings/hooks";
import type { StoreProfile } from "../../../src/features/settings/types";
import { useAuthStore } from "../../../src/store/authStore";

type FieldKey =
  | "name"
  | "email"
  | "phone"
  | "shopType"
  | "district"
  | "sector"
  | "address"
  | "receiptHeader"
  | "receiptFooter"
  | "countryCode"
  | "currencyCode"
  | "timezone";

type ProfileForm = Record<FieldKey, string> & {
  cashDrawerBlockCashSales: boolean;
};

type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

const STORE_CATEGORIES = [
  { value: "ELECTRONICS_RETAIL", label: "Electronics retail", icon: "hardware-chip-outline" },
  { value: "PHONE_SHOP", label: "Phone shop", icon: "phone-portrait-outline" },
  { value: "LAPTOP_SHOP", label: "Laptop shop", icon: "laptop-outline" },
  { value: "ACCESSORIES_SHOP", label: "Accessories shop", icon: "cube-outline" },
  { value: "REPAIR_SHOP", label: "Repair shop", icon: "construct-outline" },
  { value: "MIXED_ELECTRONICS", label: "Mixed electronics", icon: "storefront-outline" },
] as const;

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function profileToForm(profile?: StoreProfile | null): ProfileForm {
  return {
    name: clean(profile?.name),
    email: clean(profile?.email),
    phone: clean(profile?.phone),
    shopType: clean(profile?.shopType),
    district: clean(profile?.district),
    sector: clean(profile?.sector),
    address: clean(profile?.address),
    receiptHeader: clean(profile?.receiptHeader),
    receiptFooter: clean(profile?.receiptFooter),
    countryCode: clean(profile?.countryCode, "RW"),
    currencyCode: clean(profile?.currencyCode, "RWF"),
    timezone: clean(profile?.timezone, "Africa/Kigali"),
    cashDrawerBlockCashSales: Boolean(profile?.cashDrawerBlockCashSales),
  };
}

function categoryLabel(value?: string | null) {
  const found = STORE_CATEGORIES.find((item) => item.value === value);
  return found?.label || "Choose category";
}

function initials(name?: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "SV";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
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

function normalizePayload(form: ProfileForm) {
  return {
    name: clean(form.name) || null,
    email: clean(form.email) || null,
    phone: clean(form.phone) || null,
    shopType: clean(form.shopType) || null,
    district: clean(form.district) || null,
    sector: clean(form.sector) || null,
    address: clean(form.address) || null,
    receiptHeader: clean(form.receiptHeader) || null,
    receiptFooter: clean(form.receiptFooter) || null,
    countryCode: clean(form.countryCode, "RW"),
    currencyCode: clean(form.currencyCode, "RWF"),
    timezone: clean(form.timezone, "Africa/Kigali"),
    cashDrawerBlockCashSales: Boolean(form.cashDrawerBlockCashSales),
  };
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

function getColumns(width: number, mode: "fields" | "category" | "stats") {
  if (mode === "stats") {
    if (width >= 920) return 4;
    if (width >= 600) return 2;
    return 1;
  }

  if (mode === "category") {
    if (width >= 980) return 3;
    if (width >= 560) return 2;
    return 1;
  }

  if (width >= 980) return 3;
  if (width >= 660) return 2;
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

function BusinessSkeleton({
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
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  palette: AppShellPalette;
  editable: boolean;
  width: DimensionValue;
  keyboardType?: "default" | "email-address" | "phone-pad";
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
  icon: keyof typeof Ionicons.glyphMap;
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

function CategoryPicker({
  value,
  onChange,
  palette,
  editable,
  width,
}: {
  value: string;
  onChange: (value: string) => void;
  palette: AppShellPalette;
  editable: boolean;
  width: DimensionValue;
}) {
  return (
    <View style={[styles.field, { width: "100%" }]}>
      <AppText variant="caption" color={palette.soft} style={styles.fieldLabel}>
        Store category
      </AppText>

      <View style={styles.responsiveGrid}>
        {STORE_CATEGORIES.map((category) => {
          const active = value === category.value;
          const spec = toneSpec(active ? "cyan" : "slate", palette);

          return (
            <Pressable
              key={category.value}
              disabled={!editable}
              onPress={() => onChange(category.value)}
              style={({ pressed }) => [
                styles.categoryCard,
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
                  styles.categoryIcon,
                  {
                    borderColor: active ? spec.border : palette.border,
                    backgroundColor: active ? spec.solid : "rgba(148, 163, 184, 0.08)",
                  },
                ]}
              >
                <Ionicons
                  name={active ? "checkmark" : category.icon}
                  size={16}
                  color={active ? "#06111F" : palette.soft}
                />
              </View>

              <View style={{ flex: 1 }}>
                <AppText variant="label" color={active ? spec.fg : palette.text}>
                  {category.label}
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.categoryHint}>
                  {active ? "Selected business type" : "Tap to select"}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SwitchPanel({
  title,
  text,
  value,
  onChange,
  palette,
  editable,
}: {
  title: string;
  text: string;
  value: boolean;
  onChange: (value: boolean) => void;
  palette: AppShellPalette;
  editable: boolean;
}) {
  const spec = toneSpec(value ? "green" : "slate", palette);

  return (
    <Pressable
      disabled={!editable}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.switchPanel,
        {
          borderColor: value ? spec.border : palette.border,
          backgroundColor: value ? spec.bg : palette.panel,
          opacity: pressed ? 0.78 : editable ? 1 : 0.64,
        },
      ]}
    >
      <View
        style={[
          styles.switchIcon,
          {
            borderColor: spec.border,
            backgroundColor: value ? spec.solid : "rgba(148, 163, 184, 0.08)",
          },
        ]}
      >
        <Ionicons
          name={value ? "checkmark" : "lock-closed-outline"}
          size={15}
          color={value ? "#06111F" : palette.soft}
        />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.switchTitleRow}>
          <AppText variant="label" color={palette.text}>
            {title}
          </AppText>

          <StatusPill label={value ? "On" : "Off"} tone={value ? "green" : "slate"} palette={palette} />
        </View>

        <AppText variant="caption" color={palette.soft} style={styles.switchText}>
          {text}
        </AppText>
      </View>
    </Pressable>
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
  children: React.ReactNode;
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

export default function BusinessProfileSettingsScreen() {
  const { width } = useWindowDimensions();

  const user = useAuthStore((state) => state.user);
  const profileQuery = useStoreProfile();
  const updateProfile = useUpdateStoreProfile();

  const role = String(user?.role || "OWNER").toUpperCase();
  const isOwner = role === "OWNER";
  const editable = isOwner && !updateProfile.isPending;

  const profile = profileQuery.data || null;

  const [form, setForm] = useState<ProfileForm>(() => profileToForm(null));

  useEffect(() => {
    if (!profile) return;
    setForm(profileToForm(profile));
  }, [profile]);

  const initialForm = useMemo(() => profileToForm(profile), [profile]);

  const dirty = useMemo(() => {
    return JSON.stringify(normalizePayload(form)) !== JSON.stringify(normalizePayload(initialForm));
  }, [form, initialForm]);

  const fieldWidth = widthForColumns(getColumns(width, "fields"));
  const categoryWidth = widthForColumns(getColumns(width, "category"));
  const statWidth = widthForColumns(getColumns(width, "stats"));
  const fullWidth = "100%" as DimensionValue;

  function updateField(key: FieldKey, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save() {
    if (!isOwner) {
      Alert.alert(
        "Owner-only setting",
        "Managers can review the business profile, but only the owner can save changes.",
      );
      return;
    }

    if (!dirty || updateProfile.isPending) return;

    const payload = normalizePayload(form);

    if (!payload.name) {
      Alert.alert("Business name required", "Add the business name before saving.");
      return;
    }

    try {
      await updateProfile.mutateAsync(payload);

      Alert.alert(
        "Business profile updated",
        "Your mobile business profile now matches the saved store settings.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save business profile.";
      Alert.alert("Could not save", message);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        profileQuery.isLoading ? (
          <BusinessSkeleton palette={palette} width={width} />
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
                  Business profile
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
                <AppText variant="subtitle" color="#06111F">
                  {initials(form.name)}
                </AppText>
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroDot} />

                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    BUSINESS IDENTITY
                  </AppText>
                </View>

                <AppText variant="subtitle" color={palette.text}>
                  {clean(form.name, "Your business")}
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.heroText}>
                  {categoryLabel(form.shopType)}
                </AppText>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              <StatCard
                label="Country"
                value={clean(form.countryCode, "RW")}
                icon="flag-outline"
                tone="cyan"
                palette={palette}
                width={statWidth}
              />

              <StatCard
                label="Currency"
                value={clean(form.currencyCode, "RWF")}
                icon="cash-outline"
                tone="green"
                palette={palette}
                width={statWidth}
              />

              <StatCard
                label="Timezone"
                value={clean(form.timezone, "Africa/Kigali")}
                icon="time-outline"
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
                    Your current role is {roleLabel(role)}. Only the owner can save business profile changes.
                  </AppText>
                </View>
              </View>
            ) : null}

            <Panel
              eyebrow="Main details"
              title="How the business appears"
              text="These details appear across documents, receipts, reports, and owner-facing screens."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <Field
                  label="Business name"
                  value={form.name}
                  editable={editable}
                  placeholder="Example: Gizmocean"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("name", value)}
                />

                <Field
                  label="Business email"
                  value={form.email}
                  editable={editable}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="example@business.com"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("email", value)}
                />

                <Field
                  label="Business phone"
                  value={form.phone}
                  editable={editable}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  placeholder="250788123456"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("phone", value)}
                />

                <CategoryPicker
                  value={form.shopType}
                  editable={editable}
                  palette={palette}
                  width={categoryWidth}
                  onChange={(value) => updateField("shopType", value)}
                />
              </View>
            </Panel>

            <Panel
              eyebrow="Location"
              title="Store address"
              text="Use clean customer-friendly wording. This is not for technical location IDs."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <Field
                  label="District"
                  value={form.district}
                  editable={editable}
                  placeholder="Example: Gasabo"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("district", value)}
                />

                <Field
                  label="Sector"
                  value={form.sector}
                  editable={editable}
                  placeholder="Example: Kimironko"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("sector", value)}
                />

                <Field
                  label="Address"
                  value={form.address}
                  editable={editable}
                  multiline
                  placeholder="Example: Kigali, TCB"
                  palette={palette}
                  width={fullWidth}
                  onChange={(value) => updateField("address", value)}
                />
              </View>
            </Panel>

            <Panel
              eyebrow="Local rules"
              title="Business operating format"
              text="These settings keep the app aligned with Rwanda operations and store cash behavior."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <Field
                  label="Country"
                  value={form.countryCode}
                  editable={editable}
                  placeholder="RW"
                  palette={palette}
                  width={fieldWidth}
                  autoCapitalize="characters"
                  onChange={(value) => updateField("countryCode", value.toUpperCase())}
                />

                <Field
                  label="Currency"
                  value={form.currencyCode}
                  editable={editable}
                  placeholder="RWF"
                  palette={palette}
                  width={fieldWidth}
                  autoCapitalize="characters"
                  onChange={(value) => updateField("currencyCode", value.toUpperCase())}
                />

                <Field
                  label="Timezone"
                  value={form.timezone}
                  editable={editable}
                  placeholder="Africa/Kigali"
                  palette={palette}
                  width={fieldWidth}
                  autoCapitalize="none"
                  onChange={(value) => updateField("timezone", value)}
                />

                <View style={{ width: fullWidth }}>
                  <SwitchPanel
                    title="Protect cash sales when drawer is closed"
                    text="Cash sales stay blocked until a cash drawer session is open. This keeps cash control clean."
                    value={form.cashDrawerBlockCashSales}
                    editable={editable}
                    palette={palette}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        cashDrawerBlockCashSales: value,
                      }))
                    }
                  />
                </View>
              </View>
            </Panel>

            <Panel
              eyebrow="Document notes"
              title="Receipt header and footer"
              text="Use short customer-friendly text. Full invoice, proforma, warranty, and delivery terms are handled in Document settings."
              palette={palette}
            >
              <View style={styles.responsiveGrid}>
                <Field
                  label="Receipt header"
                  value={form.receiptHeader}
                  editable={editable}
                  multiline
                  placeholder="Example: Kigali, TCB"
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("receiptHeader", value)}
                />

                <Field
                  label="Receipt footer"
                  value={form.receiptFooter}
                  editable={editable}
                  multiline
                  placeholder="Example: Thank you for your business."
                  palette={palette}
                  width={fieldWidth}
                  onChange={(value) => updateField("receiptFooter", value)}
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
                    backgroundColor: dirty ? toneSpec("cyan", palette).solid : "rgba(148, 163, 184, 0.14)",
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
                  {dirty ? "Unsaved changes" : "Business profile is current"}
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.saveText}>
                  {isOwner
                    ? "Save when you are happy with these details."
                    : "Only the owner can save changes."}
                </AppText>
              </View>

              <AppButton
                disabled={!dirty || !isOwner}
                loading={updateProfile.isPending}
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

  categoryCard: {
    minHeight: 74,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  categoryIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryHint: {
    marginTop: 3,
    lineHeight: 16,
  },

  switchPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  switchIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  switchTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  switchText: {
    lineHeight: 18,
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