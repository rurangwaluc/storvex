import { Href, router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  filterNavGroupsByRole,
  type AppNavItem,
} from "../../../src/constants/appNav";
import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import { useAuthStore } from "../../../src/store/authStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

const ALL_WORK_ROLES = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "STOREKEEPER",
  "TECHNICIAN",
] as const;

const MORE_GROUPS = [
  {
    section: "Daily tools",
    items: [
      {
        key: "documents",
        label: "Documents",
        helper: "Receipts, invoices, delivery notes, and business proof",
        href: routes.documents,
        icon: "document-text-outline",
        area: "documents",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER"],
      },
      {
        key: "repairs",
        label: "Repairs",
        helper: "Repair jobs and technician work",
        href: routes.repairs,
        icon: "construct-outline",
        area: "repairs",
        roles: ["OWNER", "MANAGER", "CASHIER", "TECHNICIAN"],
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        helper: "Customer conversations and follow-up",
        href: routes.whatsapp,
        icon: "logo-whatsapp",
        area: "whatsapp",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "TECHNICIAN"],
      },
      {
        key: "interstore",
        label: "Inter-store movement",
        helper: "Move stock between selling locations",
        href: routes.interstore,
        icon: "swap-horizontal-outline",
        area: "interstore",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
    ],
  },
  {
    section: "Business control",
    items: [
      {
        key: "reports",
        label: "Reports",
        helper: "Business performance and activity",
        href: routes.reports,
        icon: "bar-chart-outline",
        area: "reports",
        roles: ["OWNER", "MANAGER"],
      },
      {
        key: "expenses",
        label: "Expenses",
        helper: "Track business spending and proof",
        href: routes.expenses,
        icon: "wallet-outline",
        area: "expenses",
        roles: ["OWNER", "MANAGER"],
      },
      {
        key: "suppliers",
        label: "Suppliers",
        helper: "Supplier records, balances, and stock receiving",
        href: routes.suppliers,
        icon: "business-outline",
        area: "suppliers",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
      {
        key: "settings",
        label: "Settings",
        helper: "Business preferences and access",
        href: routes.settings,
        icon: "settings-outline",
        area: "settings",
        roles: ["OWNER"],
      },
      {
        key: "support",
        label: "Support",
        helper: "Get help when something is blocked",
        href: routes.support,
        icon: "headset-outline",
        area: "support",
        roles: [...ALL_WORK_ROLES],
      },
    ],
  },
] satisfies { section: string; items: AppNavItem[] }[];

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

function itemTone(key: string): Tone {
  if (key === "expenses") return "amber";
  if (key === "reports") return "blue";
  if (key === "settings") return "green";
  if (key === "support") return "slate";
  if (key === "repairs") return "red";
  return "cyan";
}

function getColumns(width: number) {
  if (width >= 680) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function StatusPill({
  label,
  palette,
}: {
  label: string;
  palette: AppShellPalette;
}) {
  const spec = toneSpec("cyan", palette);

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
      <View style={[styles.statusDot, { backgroundColor: spec.solid }]} />

      <AppText variant="caption" color={spec.fg} style={styles.statusText}>
        {label}
      </AppText>
    </View>
  );
}

function SectionSkeleton({
  palette,
  layoutWidth,
}: {
  palette: AppShellPalette;
  layoutWidth: number;
}) {
  const itemWidth = widthForColumns(getColumns(layoutWidth));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <View
        style={[
          styles.heroPanel,
          {
            borderColor: palette.borderStrong,
            backgroundColor: "rgba(32, 200, 255, 0.08)",
          },
        ]}
      >
        <View style={styles.heroTop}>
          <Skeleton height={56} width={56} />

          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="36%" />
            <Skeleton height={24} width="72%" />
            <Skeleton height={14} width="64%" />
          </View>
        </View>
      </View>

      <View style={styles.groupList}>
        {[1, 2].map((group) => (
          <View key={group} style={styles.group}>
            <Skeleton height={14} width="34%" />

            <View style={styles.responsiveGrid}>
              {[1, 2, 3].map((item) => (
                <View
                  key={item}
                  style={[
                    styles.item,
                    {
                      width: itemWidth,
                      borderColor: palette.border,
                      backgroundColor: palette.panel,
                    },
                  ]}
                >
                  <Skeleton height={38} width={38} />

                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton height={16} width="42%" />
                    <Skeleton height={13} width="76%" />
                  </View>

                  <Skeleton height={18} width={18} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function MoreItem({
  item,
  palette,
  width,
}: {
  item: AppNavItem;
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const tone = itemTone(item.key);
  const spec = toneSpec(tone, palette);

  return (
    <Pressable
      onPress={() => router.push(item.href as Href)}
      style={({ pressed }) => [
        styles.item,
        {
          width,
          borderColor: palette.border,
          backgroundColor: palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          {
            borderColor: spec.border,
            backgroundColor: spec.bg,
          },
        ]}
      >
        <Ionicons name={item.icon as IoniconName} size={18} color={spec.fg} />
      </View>

      <View style={styles.itemBody}>
        <AppText variant="label" color={palette.text}>
          {item.label}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {item.helper}
        </AppText>
      </View>

      <Ionicons name="chevron-forward" size={18} color={spec.fg} />
    </Pressable>
  );
}

function NotePanel({ palette }: { palette: AppShellPalette }) {
  const spec = toneSpec("cyan", palette);

  return (
    <View
      style={[
        styles.notePanel,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <View
        style={[
          styles.noteMark,
          {
            borderColor: spec.border,
            backgroundColor: spec.solid,
          },
        ]}
      >
        <Ionicons name="information-outline" size={16} color="#06111F" />
      </View>

      <View style={{ flex: 1, gap: 5 }}>
        <AppText variant="label" color={palette.text}>
          Tools match each responsibility
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          Managers get full WhatsApp access. Other staff only see the tools that support their daily work.
        </AppText>
      </View>
    </View>
  );
}

export default function MoreScreen() {
  const { width } = useWindowDimensions();

  const layoutWidth = Math.min(width, 720);
  const compact = layoutWidth < 560;
  const itemWidth = widthForColumns(getColumns(layoutWidth));

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  const isLoading = isHydrating || !user || !tenant;
  const groups = filterNavGroupsByRole(MORE_GROUPS, user?.role || "OWNER");
  const itemCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <SectionSkeleton palette={palette} layoutWidth={layoutWidth} />
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
                  <Ionicons name="menu-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />

                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      More tools
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Everything else you need.
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Open documents, reports, settings, support, and other tools available for your responsibility.
                  </AppText>
                </View>

                {!compact ? (
                  <StatusPill
                    label={`${itemCount} tool${itemCount === 1 ? "" : "s"}`}
                    palette={palette}
                  />
                ) : null}
              </View>

              {compact ? (
                <View style={styles.compactStatusRow}>
                  <StatusPill
                    label={`${itemCount} tool${itemCount === 1 ? "" : "s"}`}
                    palette={palette}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.groupList}>
              {groups.map((group) => (
                <View key={group.section} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupLine} />

                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      {group.section}
                    </AppText>
                  </View>

                  <View style={styles.responsiveGrid}>
                    {group.items.map((item) => (
                      <MoreItem
                        key={item.key}
                        item={item}
                        palette={palette}
                        width={itemWidth}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <NotePanel palette={palette} />
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
    paddingBottom: 96,
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

  compactStatusRow: {
    alignItems: "flex-start",
  },

  statusPill: {
    flexShrink: 0,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusDot: {
    width: 7,
    height: 7,
  },

  statusText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  groupList: {
    gap: 18,
  },

  group: {
    gap: 10,
  },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  groupLine: {
    width: 18,
    height: 2,
    backgroundColor: "#67E8F9",
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  item: {
    minHeight: 96,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconBox: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  itemBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },

  notePanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  noteMark: {
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
});
