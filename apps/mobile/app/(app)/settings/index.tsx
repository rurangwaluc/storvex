import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { routes } from "../../../src/constants/routes";
import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { useSettingsOverview } from "../../../src/features/settings/hooks";
import type {
  DocumentSettings,
  SetupCheck,
  StoreProfile,
} from "../../../src/features/settings/types";
import { useAuthStore } from "../../../src/store/authStore";

type IoniconName = keyof typeof Ionicons.glyphMap;

type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type ControlCard = {
  key: string;
  title: string;
  text: string;
  icon: IoniconName;
  status: string;
  tone: Tone;
  value?: string;
  href?: string;
  disabled?: boolean;
};

type SummaryItem = {
  label: string;
  value: string;
  icon: IoniconName;
  tone: Tone;
};

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function percent(value: unknown) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
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

function categoryLabel(value?: string | null) {
  const category = String(value || "").trim().toUpperCase();

  if (category === "ELECTRONICS_RETAIL") return "Electronics retail";
  if (category === "PHONE_SHOP") return "Phone shop";
  if (category === "LAPTOP_SHOP") return "Laptop shop";
  if (category === "ACCESSORIES_SHOP") return "Accessories shop";
  if (category === "REPAIR_SHOP") return "Repair shop";
  if (category === "MIXED_ELECTRONICS") return "Mixed electronics";

  return category.replaceAll("_", " ").toLowerCase() || "Store category not set";
}

function headerLabel(value?: string | null) {
  const mode = String(value || "").trim().toUpperCase();

  if (mode === "LOGO_ONLY") return "Logo only";
  if (mode === "NAME_ONLY") return "Business name only";
  return "Logo and business name";
}

function sizeLabel(value?: string | null) {
  const mode = String(value || "").trim().toUpperCase();

  if (mode === "COMPACT") return "Compact";
  if (mode === "STANDARD") return "Standard";
  return "Auto";
}

function taxLabel(settings?: DocumentSettings | null) {
  const mode = String(settings?.taxMode || "NONE").trim().toUpperCase();
  const display = String(settings?.taxDisplayMode || "HIDDEN").trim().toUpperCase();
  const rate = Number(settings?.taxRateBps || 0) / 100;

  if (mode === "NONE") return "No customer tax line";

  const name = settings?.taxName || settings?.taxSummary?.label || "Tax";
  const visibility =
    display === "CUSTOMER_FACING" && settings?.showTaxOnCustomerDocuments
      ? "shown to customers"
      : display === "INTERNAL_ONLY"
        ? "internal only"
        : "hidden from customers";

  return `${name}${rate > 0 ? ` ${rate}%` : ""}, ${visibility}`;
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
      border: "rgba(148, 163, 184, 0.20)",
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

function getResponsiveColumns(width: number, type: "summary" | "cards") {
  if (type === "summary") {
    if (width >= 1040) return 4;
    if (width >= 760) return 3;
    if (width >= 520) return 2;
    return 1;
  }

  if (width >= 860) return 2;
  return 1;
}

function itemWidth(columns: number): DimensionValue {
  if (columns >= 4) return "23.9%" as DimensionValue;
  if (columns === 3) return "32%" as DimensionValue;
  if (columns === 2) return "48.6%" as DimensionValue;

  return "100%" as DimensionValue;
}

function SettingsSkeleton({
  palette,
  width,
}: {
  palette: AppShellPalette;
  width: number;
}) {
  const summaryColumns = getResponsiveColumns(width, "summary");
  const cardColumns = getResponsiveColumns(width, "cards");

  return (
    <View style={styles.stack}>
      <View
        style={[
          styles.hero,
          {
            borderColor: palette.borderStrong,
            backgroundColor: "rgba(32, 200, 255, 0.09)",
          },
        ]}
      >
        <View style={styles.heroTop}>
          <Skeleton height={54} width={54} />

          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="34%" />
            <Skeleton height={28} width="70%" />
            <Skeleton height={14} width="90%" />
          </View>
        </View>

        <Skeleton height={64} width="100%" />
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View
            key={`summary-${item}`}
            style={[
              styles.summaryCard,
              {
                width: itemWidth(summaryColumns),
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={15} width="38%" />
            <Skeleton height={20} width="70%" />
          </View>
        ))}
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <View
            key={`card-${item}`}
            style={[
              styles.controlCard,
              {
                width: itemWidth(cardColumns),
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={40} width={40} />
            <Skeleton height={18} width="54%" />
            <Skeleton height={13} width="88%" />
            <Skeleton height={28} width="38%" />
          </View>
        ))}
      </View>
    </View>
  );
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
  const toneValues = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.pill,
        {
          borderColor: toneValues.border,
          backgroundColor: toneValues.bg,
        },
      ]}
    >
      <AppText variant="caption" color={toneValues.fg} style={styles.pillText}>
        {label}
      </AppText>
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
  const toneValues = toneSpec(item.tone, palette);

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
        <View
          style={[
            styles.summaryIcon,
            {
              backgroundColor: toneValues.bg,
              borderColor: toneValues.border,
            },
          ]}
        >
          <Ionicons name={item.icon} size={15} color={toneValues.fg} />
        </View>

        <AppText variant="caption" color={palette.soft} style={styles.summaryLabel}>
          {item.label}
        </AppText>
      </View>

      <AppText variant="label" color={palette.text} style={styles.summaryValue}>
        {item.value}
      </AppText>
    </View>
  );
}

function ControlCardView({
  card,
  palette,
  width,
}: {
  card: ControlCard;
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const toneValues = toneSpec(card.tone, palette);

  function handlePress() {
    if (card.href) {
      router.push(card.href as never);
      return;
    }

    Alert.alert(
    card.title,
    "This setting is controlled from its dedicated business screen.",
  );
  }

  return (
    <Pressable
      disabled={card.disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.controlCard,
        {
          width,
          borderColor: card.href ? toneValues.border : palette.border,
          backgroundColor: palette.panel,
          opacity: pressed ? 0.8 : card.disabled ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: toneValues.bg,
              borderColor: toneValues.border,
            },
          ]}
        >
          <Ionicons name={card.icon} size={19} color={toneValues.fg} />
        </View>

        <View style={styles.cardTopRight}>
          <StatusPill label={card.status} tone={card.tone} palette={palette} />

          {card.href ? (
            <View
              style={[
                styles.arrowBox,
                {
                  borderColor: palette.border,
                  backgroundColor: "rgba(148, 163, 184, 0.08)",
                },
              ]}
            >
              <Ionicons name="chevron-forward" size={15} color={palette.soft} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardBody}>
        <AppText variant="label" color={palette.text} style={styles.cardTitle}>
          {card.title}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {card.text}
        </AppText>
      </View>

      {card.value ? (
        <View
          style={[
            styles.cardValuePill,
            {
              borderColor: toneValues.border,
              backgroundColor: toneValues.bg,
            },
          ]}
        >
          <AppText variant="caption" color={toneValues.fg} style={styles.cardValue}>
            {card.value}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function ChecklistRow({
  check,
  palette,
}: {
  check: SetupCheck;
  palette: AppShellPalette;
}) {
  const done = Boolean(check.done);
  const required = Boolean(check.required);
  const tone: Tone = done ? "green" : required ? "amber" : "slate";
  const toneValues = toneSpec(tone, palette);
  const icon: IoniconName = done ? "checkmark" : required ? "alert" : "ellipse-outline";

  return (
    <View style={styles.checkRow}>
      <View
        style={[
          styles.checkIcon,
          {
            backgroundColor: toneValues.bg,
            borderColor: toneValues.border,
          },
        ]}
      >
        <Ionicons name={icon} size={14} color={toneValues.fg} />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <AppText variant="label" color={palette.text}>
          {clean(check.label || check.title, "Setup item")}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.checkText}>
          {clean(check.description || check.text, done ? "Completed" : "Needs review")}
        </AppText>
      </View>
    </View>
  );
}

function buildCards(
  profile: StoreProfile | null,
  docs: DocumentSettings | null,
  role?: string | null,
): ControlCard[] {
  return [
    {
      key: "business",
      title: "Business identity",
      text: "Name, contact details, address, logo, country, currency, and local business profile.",
      icon: "storefront-outline",
      status: profile?.name ? "Active" : "Needs setup",
      tone: profile?.name ? "cyan" : "amber",
      value: categoryLabel(profile?.shopType),
      href: routes.settingsBusiness,
    },
    {
    key: "documents",
    title: "Documents and print",
    text: "Receipt, invoice, proforma, delivery note, and warranty document behavior.",
    icon: "document-text-outline",
    status: "Ready",
    tone: "green",
    value: `${headerLabel(docs?.documentHeaderDisplay)}. ${sizeLabel(docs?.documentSizeMode)} spacing`,
    href: routes.settingsDocuments,
    },
      {
      key: "tax",
      title: "Tax display",
      text: "Choose whether tax stays hidden, internal only, or visible on customer documents.",
      icon: "calculator-outline",
      status: docs?.taxMode && docs.taxMode !== "NONE" ? "Configured" : "Hidden",
      tone: docs?.taxMode && docs.taxMode !== "NONE" ? "amber" : "blue",
      value: taxLabel(docs),
      href: routes.settingsTaxDisplay,
    },
    {
      key: "locations",
      title: "Store locations",
      text: "Control main store, selling locations, and where staff can work.",
      icon: "location-outline",
      status: "Linked",
      tone: "cyan",
      value: clean(profile?.district || profile?.address, "Current selling location"),
      href: routes.settingsLocations,
    },
    {
    key: "security",
    title: "Security",
    text: "Password, login activity, active devices, and owner protection rules.",
    icon: "shield-checkmark-outline",
    status: "Protected",
    tone: "green",
    value: "Sessions and login history",
    href: routes.settingsSecurity,
    },
    {
    key: "roles",
    title: "Roles and access",
    text: "Review who can sell, manage stock, view reports, and change sensitive settings.",
    icon: "people-circle-outline",
    status: roleLabel(role),
    tone: role === "OWNER" ? "cyan" : "blue",
    value: "Business-friendly access control",
    href: routes.settingsAccess,
  },
  ];
}

export default function SettingsScreen() {
  const { width } = useWindowDimensions();

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  const [refreshing, setRefreshing] = useState(false);
  const overview = useSettingsOverview();

  const profile = overview.data?.profile || null;
  const docs = overview.data?.documentSettings || null;
  const checklist = overview.data?.checklist || null;

  const activeUser = overview.data?.workspace?.user || user;
  const activeTenant = overview.data?.workspace?.tenant || tenant;

  const role = String(activeUser?.role || user?.role || "OWNER").toUpperCase();
  const isReadOnly = role !== "OWNER";
  const readiness = percent(checklist?.readinessPercent);
  const checks = Array.isArray(checklist?.checks) ? checklist.checks.slice(0, 4) : [];

  const summaryColumns = getResponsiveColumns(width, "summary");
  const cardColumns = getResponsiveColumns(width, "cards");

  const summaryWidth = itemWidth(summaryColumns);
  const cardWidth = itemWidth(cardColumns);

  const cards = useMemo(() => buildCards(profile, docs, role), [profile, docs, role]);
  const loading = isHydrating || overview.isLoading;

  const summaryItems = useMemo<SummaryItem[]>(
    () => [
      {
        label: "Category",
        value: categoryLabel(profile?.shopType),
        icon: "albums-outline",
        tone: "cyan",
      },
      {
        label: "Currency",
        value: clean(profile?.currencyCode, "RWF"),
        icon: "cash-outline",
        tone: "green",
      },
      {
        label: "Timezone",
        value: clean(profile?.timezone, "Africa/Kigali"),
        icon: "time-outline",
        tone: "blue",
      },
      {
        label: "Current role",
        value: roleLabel(role),
        icon: "person-circle-outline",
        tone: role === "OWNER" ? "amber" : "slate",
      },
    ],
    [profile?.currencyCode, profile?.shopType, profile?.timezone, role],
  );

  async function refresh() {
    setRefreshing(true);

    try {
      await overview.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        loading ? (
          <SettingsSkeleton palette={palette} width={width} />
        ) : (
          <View style={styles.stack}>
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

              <View style={styles.heroTop}>
                <View style={styles.logoMark}>
                  <AppText variant="subtitle" color="#06111F">
                    {initials(profile?.name || activeTenant?.name)}
                  </AppText>
                </View>

                <View style={{ flex: 1, gap: 5 }}>
                  <View style={styles.heroBadgeRow}>
                    <View style={styles.heroDot} />

                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      BUSINESS CONTROL CENTER
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text}>
                    {clean(profile?.name || activeTenant?.name, "Your business")}
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.heroText}>
                    {isReadOnly
                      ? "Review settings. Only the owner can save changes."
                      : "Control how your business looks, prints, protects, and operates."}
                  </AppText>
                </View>

                <StatusPill
                  label={isReadOnly ? "View only" : "Owner"}
                  tone={isReadOnly ? "slate" : "cyan"}
                  palette={palette}
                />
              </View>

              <View style={styles.readinessBlock}>
                <View style={styles.readinessTop}>
                  <View>
                    <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                      SETUP READINESS
                    </AppText>

                    <AppText variant="caption" color={palette.soft} style={styles.readinessHint}>
                      {checklist?.isOperationallyReady
                        ? "Your business foundation is ready."
                        : "Review the remaining setup items."}
                    </AppText>
                  </View>

                  <AppText
                    variant="subtitle"
                    color={readiness >= 80 ? toneSpec("green", palette).fg : toneSpec("amber", palette).fg}
                  >
                    {readiness}%
                  </AppText>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${readiness}%`,
                        backgroundColor:
                          readiness >= 80
                            ? toneSpec("green", palette).solid
                            : toneSpec("cyan", palette).solid,
                      },
                    ]}
                  />
                </View>
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
                  CONTROL AREAS
                </AppText>

                <AppText variant="title" color={palette.text}>
                  What you can manage
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.sectionSubtitle}>
                  Focused controls for the parts of the business that owners care about most.
                </AppText>
              </View>

              <Pressable
                onPress={refresh}
                style={({ pressed }) => [
                  styles.refreshButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                    opacity: pressed || refreshing ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="refresh" size={17} color={palette.cyan} />
              </Pressable>
            </View>

            <View style={styles.responsiveGrid}>
              {cards.map((card) => (
                <ControlCardView
                  key={card.key}
                  card={card}
                  palette={palette}
                  width={cardWidth}
                />
              ))}
            </View>

            <View style={styles.group}>
              <View style={styles.sectionHeaderCompact}>
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    SETUP CHECKLIST
                  </AppText>

                  <AppText variant="label" color={palette.text}>
                    Business readiness
                  </AppText>
                </View>

                <StatusPill
                  label={checklist?.isOperationallyReady ? "Ready" : "Review"}
                  tone={checklist?.isOperationallyReady ? "green" : "amber"}
                  palette={palette}
                />
              </View>

              <View
                style={[
                  styles.checkPanel,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                {checks.length ? (
                  checks.map((check) => (
                    <ChecklistRow key={String(check.key)} check={check} palette={palette} />
                  ))
                ) : (
                  <AppText variant="caption" color={palette.soft}>
                    Setup checklist will appear here when the backend returns setup checks.
                  </AppText>
                )}
              </View>
            </View>

            <View
              style={[
                styles.ownerNote,
                {
                  borderColor: isReadOnly ? toneSpec("amber", palette).border : palette.border,
                  backgroundColor: isReadOnly ? toneSpec("amber", palette).bg : palette.panel,
                },
              ]}
            >
              <View
                style={[
                  styles.noteIcon,
                  {
                    backgroundColor: isReadOnly
                      ? toneSpec("amber", palette).solid
                      : toneSpec("cyan", palette).solid,
                  },
                ]}
              >
                <Ionicons
                  name={isReadOnly ? "lock-closed-outline" : "key-outline"}
                  size={17}
                  color="#06111F"
                />
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label" color={palette.text}>
                  {isReadOnly ? "Owner-only changes" : "Owner control"}
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.noteText}>
                  {isReadOnly
                    ? "Managers can review important business settings, but saving changes stays owner-only."
                    : "Owner controls are available for business identity, documents, tax display, store locations, security, and access."}
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

  hero: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },

  heroGlow: {
    position: "absolute",
    right: -90,
    top: -90,
    width: 190,
    height: 190,
    backgroundColor: "rgba(32, 200, 255, 0.12)",
    transform: [{ rotate: "18deg" }],
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  heroDot: {
    width: 6,
    height: 6,
    backgroundColor: "#67E8F9",
  },

  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  heroText: {
    lineHeight: 18,
  },

  logoMark: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  readinessBlock: {
    gap: 10,
  },

  readinessTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  readinessHint: {
    marginTop: 3,
    lineHeight: 17,
  },

  progressTrack: {
    height: 8,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    minHeight: 94,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },

  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  summaryIcon: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryLabel: {
    flex: 1,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  summaryValue: {
    lineHeight: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  sectionSubtitle: {
    lineHeight: 18,
  },

  sectionHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  refreshButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  controlCard: {
    minHeight: 168,
    borderWidth: 1,
    padding: 15,
    gap: 14,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  cardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  arrowBox: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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

  cardBody: {
    gap: 6,
  },

  cardTitle: {
    lineHeight: 20,
  },

  cardText: {
    lineHeight: 18,
  },

  cardValuePill: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  cardValue: {
    lineHeight: 17,
  },

  group: {
    gap: 10,
  },

  checkPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 13,
  },

  checkRow: {
    flexDirection: "row",
    gap: 12,
  },

  checkIcon: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  checkText: {
    lineHeight: 17,
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