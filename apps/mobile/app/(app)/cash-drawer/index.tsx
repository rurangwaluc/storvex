import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { AppTextInput } from "../../../src/components/ui/AppTextInput";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { AppBackButton } from "../../../src/components/app/AppBackButton";
import { routes } from "../../../src/constants/routes";
import {
  useCashDrawerMovements,
  useCashDrawerStatus,
  useCloseCashDrawer,
  useOpenCashDrawer,
} from "../../../src/features/cashDrawer/hooks";
import type { CashDrawerMovement } from "../../../src/features/cashDrawer/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const ACTIVITY_LIMIT = 5;

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

function normalizeMoney(value: string) {
  return String(value || "").replace(/[^\d]/g, "");
}

function toAmount(value: string) {
  const amount = Number(normalizeMoney(value));
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
}

function safeNumber(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: unknown, options: { compact?: boolean } = {}) {
  const safe = safeNumber(value);

  if (!options.compact) return `${safe.toLocaleString()} RWF`;

  const abs = Math.abs(safe);

  if (abs >= 1_000_000_000) {
    const next = safe / 1_000_000_000;
    return `${Number.isInteger(next) ? next.toFixed(0) : next.toFixed(1)}B RWF`;
  }

  if (abs >= 1_000_000) {
    const next = safe / 1_000_000;
    return `${Number.isInteger(next) ? next.toFixed(0) : next.toFixed(1)}M RWF`;
  }

  if (abs >= 100_000) {
    const next = safe / 1_000;
    return `${Number.isInteger(next) ? next.toFixed(0) : next.toFixed(1)}K RWF`;
  }

  return `${safe.toLocaleString()} RWF`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function calculateExpectedCash(params: {
  openingCash: unknown;
  movements?: CashDrawerMovement[];
}) {
  const openingCash = safeNumber(params.openingCash);
  const movements = params.movements || [];

  return movements.reduce((total, movement) => {
    const amount = safeNumber(movement.amount);

    if (movement.type === "IN") return total + amount;
    if (movement.type === "OUT") return total - amount;

    return total;
  }, openingCash);
}

function varianceLabel(value: number) {
  if (value === 0) return "Cash matches";
  if (value < 0) return `Cash short by ${formatMoney(Math.abs(value))}`;
  return `Cash over by ${formatMoney(value)}`;
}

function movementTitle(movement: CashDrawerMovement) {
  if (movement.type === "IN") return "Cash added";
  if (movement.type === "OUT") return "Cash removed";
  return "Cash activity";
}

function movementReason(movement: CashDrawerMovement) {
  const reason = String(movement.reason || "").trim();
  return reason || "Other";
}

function movementNote(movement: CashDrawerMovement) {
  const note = String(movement.note || "").trim();
  return note || "No note saved";
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

function getColumns(width: number, type: "money" | "activity") {
  if (type === "money") {
    if (width >= 680) return 2;
    return 1;
  }

  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function MoneyText({
  value,
  color,
  compact = false,
}: {
  value: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={compact ? 0.54 : 0.62}
      style={[
        styles.moneyText,
        {
          color,
          fontSize: compact ? 20 : 22,
          lineHeight: compact ? 25 : 28,
        },
      ]}
    >
      {value}
    </Text>
  );
}

function StatusPill({
  open,
  palette,
}: {
  open: boolean;
  palette: AppShellPalette;
}) {
  const spec = toneSpec(open ? "green" : "red", palette);

  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: spec.bg,
          borderColor: spec.border,
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: spec.solid,
          },
        ]}
      />

      <AppText variant="caption" color={spec.fg} style={styles.statusText}>
        {open ? "Drawer open" : "Drawer closed"}
      </AppText>
    </View>
  );
}

function MoneyBox({
  label,
  value,
  tone = "slate",
  palette,
  width,
  compact,
}: {
  label: string;
  value: string;
  tone?: Tone;
  palette: AppShellPalette;
  width: DimensionValue;
  compact: boolean;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.moneyBox,
        {
          width,
          borderColor: palette.border,
          backgroundColor: "rgba(148, 163, 184, 0.06)",
        },
      ]}
    >
      <View style={styles.moneyBoxTop}>
        <View
          style={[
            styles.smallDot,
            {
              backgroundColor: tone === "slate" ? palette.soft : spec.solid,
            },
          ]}
        />

        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          {label}
        </AppText>
      </View>

      <MoneyText
        value={value}
        color={tone === "slate" ? palette.text : spec.fg}
        compact={compact}
      />
    </View>
  );
}

function MessageBox({
  type,
  message,
  palette,
}: {
  type: "success" | "error" | "warning";
  message: string;
  palette: AppShellPalette;
}) {
  const tone: Tone = type === "success" ? "green" : type === "warning" ? "amber" : "red";
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.messageBox,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <Ionicons
        name={
          type === "success"
            ? "checkmark-circle-outline"
            : type === "warning"
              ? "alert-circle-outline"
              : "warning-outline"
        }
        size={18}
        color={spec.fg}
      />

      <AppText variant="caption" color={spec.fg} style={styles.cardText}>
        {message}
      </AppText>
    </View>
  );
}

function SectionHeader({
  title,
  helper,
  icon,
  palette,
}: {
  title: string;
  helper: string;
  icon: IoniconName;
  palette: AppShellPalette;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <AppText variant="subtitle" color={palette.text}>
          {title}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {helper}
        </AppText>
      </View>

      <View
        style={[
          styles.headerIcon,
          {
            borderColor: toneSpec("cyan", palette).border,
            backgroundColor: toneSpec("cyan", palette).bg,
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={palette.cyan} />
      </View>
    </View>
  );
}

function CashDrawerSkeleton({
  palette,
  layoutWidth,
}: {
  palette: AppShellPalette;
  layoutWidth: number;
}) {
  const moneyWidth = widthForColumns(getColumns(layoutWidth, "money"));

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
            <Skeleton height={14} width="42%" />
            <Skeleton height={24} width="68%" />
            <Skeleton height={14} width="78%" />
          </View>
        </View>
      </View>

      {[1, 2].map((item) => (
        <View
          key={item}
          style={[
            styles.panel,
            {
              borderColor: palette.border,
              backgroundColor: palette.panel,
            },
          ]}
        >
          <Skeleton height={18} width="46%" />

          <View style={styles.responsiveGrid}>
            <View style={{ width: moneyWidth }}>
              <Skeleton height={92} width="100%" />
            </View>

            <View style={{ width: moneyWidth }}>
              <Skeleton height={92} width="100%" />
            </View>
          </View>

          <Skeleton height={52} width="100%" />
        </View>
      ))}
    </View>
  );
}

function MovementCard({
  movement,
  palette,
  compact,
}: {
  movement: CashDrawerMovement;
  palette: AppShellPalette;
  compact: boolean;
}) {
  const isIn = movement.type === "IN";
  const tone: Tone = isIn ? "green" : "red";
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.movementCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View
        style={[
          styles.movementIcon,
          {
            borderColor: spec.border,
            backgroundColor: spec.bg,
          },
        ]}
      >
        <Ionicons
          name={isIn ? "arrow-down-outline" : "arrow-up-outline"}
          size={17}
          color={spec.fg}
        />
      </View>

      <View style={styles.movementBody}>
        <View style={styles.movementTop}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <AppText variant="label" color={palette.text}>
              {movementTitle(movement)}
            </AppText>

            <AppText variant="caption" color={palette.soft} style={styles.cardText}>
              {movementReason(movement)}
            </AppText>
          </View>

          <MoneyText
            value={formatMoney(movement.amount, { compact })}
            color={spec.fg}
            compact={compact}
          />
        </View>

        <View style={styles.movementDetails}>
          <View style={styles.detailBlock}>
            <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
              Note
            </AppText>

            <AppText variant="caption" color={palette.text} style={styles.cardText}>
              {movementNote(movement)}
            </AppText>
          </View>

          <View style={styles.detailBlock}>
            <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
              Time
            </AppText>

            <AppText variant="caption" color={palette.text} style={styles.cardText}>
              {formatDateTime(movement.createdAt)}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CashDrawerScreen() {
  const { width } = useWindowDimensions();

  const layoutWidth = Math.min(width, 720);
  const compact = layoutWidth < 560;
  const moneyWidth = widthForColumns(getColumns(layoutWidth, "money"));

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const statusQuery = useCashDrawerStatus();
  const openDrawer = useOpenCashDrawer();
  const closeDrawer = useCloseCashDrawer();

  const [openingCash, setOpeningCash] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [message, setMessage] = useState("");
  const [screenError, setScreenError] = useState("");

  const status = statusQuery.data;
  const isOpen = Boolean(status?.openSession?.id);
  const blockCashSales = Boolean(status?.settings?.blockCashSales ?? true);

  const movementsQuery = useCashDrawerMovements(isOpen);

  const isLoading = isHydrating || !user || !tenant || statusQuery.isLoading;

  const movements = movementsQuery.data?.movements || [];
  const openingAmount = status?.openSession?.openingCash ?? 0;

  const expectedCash = useMemo(
    () =>
      calculateExpectedCash({
        openingCash: openingAmount,
        movements,
      }),
    [openingAmount, movements],
  );

  const countedAmount = toAmount(countedCash);
  const variance = countedAmount - expectedCash;
  const hasVariance = variance !== 0;
  const closeNoteRequired = isOpen && countedCash.length > 0 && hasVariance;

  const shownMovements = movements.slice(0, ACTIVITY_LIMIT);

  async function handleRefresh() {
    setMessage("");
    setScreenError("");
    await statusQuery.refetch();
    await movementsQuery.refetch();
  }

  async function handleOpenDrawer() {
    setMessage("");
    setScreenError("");

    const amount = toAmount(openingCash);

    try {
      await openDrawer.mutateAsync({
        openingCash: amount,
      });

      setOpeningCash("");
      setMessage("Cash drawer opened.");
      await statusQuery.refetch();
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Cash drawer could not be opened.";
      setScreenError(text);
    }
  }

  async function handleCloseDrawer() {
    setMessage("");
    setScreenError("");

    if (closeNoteRequired && !closeNote.trim()) {
      setScreenError("Explain the cash difference before closing the drawer.");
      return;
    }

    try {
      await closeDrawer.mutateAsync({
        countedCash: countedAmount,
        note: closeNoteRequired
          ? `${varianceLabel(variance)}. ${closeNote.trim()}`
          : closeNote.trim(),
      });

      setCountedCash("");
      setCloseNote("");
      setMessage("Cash drawer closed.");
      await statusQuery.refetch();
      await movementsQuery.refetch();
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Cash drawer could not be closed.";
      setScreenError(text);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <CashDrawerSkeleton palette={palette} layoutWidth={layoutWidth} />
        ) : (
            <View style={[styles.stack, styles.screenBottomSpace]}>
              <AppBackButton label="Back to Sales" to={routes.sales} palette={palette} />

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
                      Cash drawer
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Control physical cash.
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Open the drawer before cash sales, then close it after counting the money.
                  </AppText>
                </View>

                {!compact ? <StatusPill open={isOpen} palette={palette} /> : null}
              </View>

              {compact ? (
                <View style={styles.compactStatusRow}>
                  <StatusPill open={isOpen} palette={palette} />
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.panel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.panelTop}>
                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="subtitle" color={palette.text}>
                    Drawer status
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Cash sales are {blockCashSales ? "blocked" : "allowed"} when the drawer is closed.
                  </AppText>
                </View>

                <StatusPill open={isOpen} palette={palette} />
              </View>

              {isOpen ? (
                <View style={styles.responsiveGrid}>
                  <MoneyBox
                    label="Opening cash"
                    value={formatMoney(openingAmount, { compact })}
                    tone="blue"
                    palette={palette}
                    width={moneyWidth}
                    compact={compact}
                  />

                  <MoneyBox
                    label="Expected cash"
                    value={formatMoney(expectedCash, { compact })}
                    tone="cyan"
                    palette={palette}
                    width={moneyWidth}
                    compact={compact}
                  />
                </View>
              ) : (
                <MessageBox
                  type="warning"
                  message="Drawer is closed. Open it before taking physical cash."
                  palette={palette}
                />
              )}

              <Pressable
                onPress={handleRefresh}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Ionicons name="refresh-outline" size={17} color="#06111F" />

                <AppText variant="label" color="#06111F">
                  Refresh status
                </AppText>
              </Pressable>
            </View>

            {!isOpen ? (
              <View
                style={[
                  styles.panel,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <SectionHeader
                  title="Open drawer"
                  helper="Enter the cash already inside before starting cash sales."
                  icon="log-in-outline"
                  palette={palette}
                />

                <AppTextInput
                  label="Opening cash"
                  value={openingCash}
                  onChangeText={(value) => setOpeningCash(normalizeMoney(value))}
                  placeholder="0"
                  keyboardType="numeric"
                />

                <AsyncButton
                  fullWidth
                  onPress={handleOpenDrawer}
                  disabled={openDrawer.isPending}
                  style={styles.primaryButton}
                >
                  Open cash drawer
                </AsyncButton>
              </View>
            ) : (
              <View
                style={[
                  styles.panel,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <SectionHeader
                  title="Close drawer"
                  helper="Count the real cash in the drawer before closing."
                  icon="log-out-outline"
                  palette={palette}
                />

                <View style={styles.responsiveGrid}>
                  <MoneyBox
                    label="Expected cash"
                    value={formatMoney(expectedCash, { compact })}
                    tone="cyan"
                    palette={palette}
                    width={moneyWidth}
                    compact={compact}
                  />

                  <MoneyBox
                    label="Counted cash"
                    value={formatMoney(countedAmount, { compact })}
                    tone={countedCash.length > 0 ? "blue" : "slate"}
                    palette={palette}
                    width={moneyWidth}
                    compact={compact}
                  />
                </View>

                {countedCash.length > 0 ? (
                  <MessageBox
                    type={variance === 0 ? "success" : "warning"}
                    message={`${varianceLabel(variance)}. This difference stays visible for owner review.`}
                    palette={palette}
                  />
                ) : null}

                <AppTextInput
                  label="Counted cash"
                  value={countedCash}
                  onChangeText={(value) => {
                    setCountedCash(normalizeMoney(value));
                    setScreenError("");
                    setMessage("");
                  }}
                  placeholder="0"
                  keyboardType="numeric"
                />

                <AppTextInput
                  label={closeNoteRequired ? "Explanation required" : "Closing note"}
                  value={closeNote}
                  onChangeText={(value) => {
                    setCloseNote(value);
                    setScreenError("");
                    setMessage("");
                  }}
                  placeholder={
                    closeNoteRequired
                      ? "Explain why cash is short or over"
                      : "Optional note"
                  }
                />

                <AsyncButton
                  fullWidth
                  onPress={handleCloseDrawer}
                  disabled={closeDrawer.isPending}
                  style={styles.dangerButton}
                >
                  Close cash drawer
                </AsyncButton>
              </View>
            )}

            {screenError ? (
              <MessageBox type="error" message={screenError} palette={palette} />
            ) : null}

            {message ? (
              <MessageBox type="success" message={message} palette={palette} />
            ) : null}

            <View
              style={[
                styles.panel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <SectionHeader
                title="Latest cash activity"
                helper={`Showing up to ${ACTIVITY_LIMIT} recent cash records to keep the screen clean.`}
                icon="receipt-outline"
                palette={palette}
              />

              {movementsQuery.isLoading && isOpen ? (
                <View style={styles.list}>
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} height={82} />
                  ))}
                </View>
              ) : !isOpen ? (
                <View
                  style={[
                    styles.emptyBox,
                    {
                      borderColor: palette.border,
                      backgroundColor: "rgba(148, 163, 184, 0.06)",
                    },
                  ]}
                >
                  <AppText variant="label" color={palette.text}>
                    No open drawer
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Open the drawer to see cash activity.
                  </AppText>
                </View>
              ) : !movements.length ? (
                <View
                  style={[
                    styles.emptyBox,
                    {
                      borderColor: palette.border,
                      backgroundColor: "rgba(148, 163, 184, 0.06)",
                    },
                  ]}
                >
                  <AppText variant="label" color={palette.text}>
                    No cash activity yet
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Cash sales and drawer movements will appear here.
                  </AppText>
                </View>
              ) : (
                <View style={styles.list}>
                  {shownMovements.map((movement) => (
                    <MovementCard
                      key={movement.id}
                      movement={movement}
                      palette={palette}
                      compact={compact}
                    />
                  ))}
                </View>
              )}
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

  compactStatusRow: {
    alignItems: "flex-start",
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  panel: {
    borderWidth: 1,
    padding: 15,
    gap: 14,
  },

  panelTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
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

  moneyBox: {
    minHeight: 92,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },

  moneyBoxTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  smallDot: {
    width: 6,
    height: 6,
  },

  moneyText: {
    width: "100%",
    maxWidth: "100%",
    fontWeight: "900",
    letterSpacing: -0.7,
    includeFontPadding: false,
  },

  messageBox: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  sectionHeaderText: {
    flex: 1,
    gap: 5,
  },

  headerIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButton: {
    minHeight: 46,
    backgroundColor: "#67E8F9",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  primaryButton: {
    minHeight: 58,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
  },

  dangerButton: {
    minHeight: 58,
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  list: {
    gap: 10,
  },

  movementCard: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  movementIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  movementBody: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },

  movementTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  movementDetails: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 10,
    gap: 8,
  },

  detailBlock: {
    gap: 3,
  },

  emptyBox: {
    borderWidth: 1,
    padding: 14,
    gap: 5,
  },

  cardText: {
    flexShrink: 1,
    lineHeight: 18,
  },
});