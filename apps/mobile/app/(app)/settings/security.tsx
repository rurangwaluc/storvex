import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
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
  useChangeSecurityPassword,
  useRevokeOtherSecuritySessions,
  useRevokeSecuritySession,
  useSecurityLoginEvents,
  useSecurityOverview,
  useSecuritySessions,
} from "../../../src/features/settings/hooks";
import type {
  SecurityLoginEvent,
  SecuritySession,
} from "../../../src/features/settings/types";
import { useAuthStore } from "../../../src/store/authStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type SummaryItem = {
  label: string;
  value: string;
  icon: IoniconName;
  tone: Tone;
};

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

function clean(value: unknown, fallback = "—") {
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

function passwordProblems(value: string) {
  const password = String(value || "");
  const problems: string[] = [];

  if (password.length < 8) problems.push("Use at least 8 characters.");
  if (!/[a-z]/.test(password)) problems.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(password)) problems.push("Add an uppercase letter.");
  if (!/[0-9]/.test(password)) problems.push("Add a number.");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("Add a symbol.");

  return problems;
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleString();
}

function shortDate(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleDateString();
}

function sessionStatus(session: SecuritySession) {
  if (session.isRevoked) return "Signed out";

  if (session.expiresAt) {
    const expiresAt = new Date(session.expiresAt);

    if (!Number.isNaN(expiresAt.getTime()) && expiresAt < new Date()) {
      return "Expired";
    }
  }

  return "Active";
}

function sessionTone(session: SecuritySession): Tone {
  const status = sessionStatus(session);

  if (status === "Active") return "green";
  if (status === "Expired") return "amber";

  return "slate";
}

function eventStatusLabel(event: SecurityLoginEvent) {
  const status = String(event.status || "").toUpperCase();

  if (status === "SUCCESS") return "Successful sign-in";
  if (status === "BLOCKED") return "Device signed out";
  if (status === "FAILED") return "Failed sign-in";

  return "Sign-in activity";
}

function eventTone(event: SecurityLoginEvent): Tone {
  const status = String(event.status || "").toUpperCase();

  if (status === "SUCCESS") return "green";
  if (status === "BLOCKED") return "amber";
  if (status === "FAILED") return "red";

  return "slate";
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
    if (width >= 420) return 2;
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

function SecuritySkeleton({
  palette,
  width,
}: {
  palette: AppShellPalette;
  width: number;
}) {
  const effectiveWidth = Math.min(width, 420);
  const summaryWidth = widthForColumns(getColumns(effectiveWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(effectiveWidth, "cards"));

  return (
    <View style={styles.stack}>
      <View style={styles.topBar}>
        <Skeleton height={42} width={42} />

        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={12} width="28%" />
          <Skeleton height={24} width="48%" />
        </View>

        <Skeleton height={30} width={78} />
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
          <Skeleton height={13} width="34%" />
          <Skeleton height={28} width="74%" />
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
              <Skeleton height={11} width="40%" />
              <Skeleton height={18} width="70%" />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2].map((item) => (
          <View
            key={`card-${item}`}
            style={[
              styles.panel,
              {
                width: cardWidth,
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={18} width="48%" />
            <Skeleton height={13} width="82%" />
            <Skeleton height={54} width="100%" />
            <Skeleton height={42} width="44%" />
          </View>
        ))}
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

function PasswordModal({
  visible,
  palette,
  saving,
  onCancel,
  onSave,
}: {
  visible: boolean;
  palette: AppShellPalette;
  saving: boolean;
  onCancel: () => void;
  onSave: (payload: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions: boolean;
  }) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);

  const newPasswordProblems = passwordProblems(newPassword);
  const passwordLooksReady = newPassword.length > 0 && newPasswordProblems.length === 0;

  function resetAndCancel() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setRevokeOtherSessions(true);
    onCancel();
  }

  function submit() {
    if (!currentPassword.trim()) {
      Alert.alert("Current password needed", "Enter your current password.");
      return;
    }

    const problems = passwordProblems(newPassword);

    if (problems.length) {
      Alert.alert("Password not strong enough", problems.join("\n"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords do not match", "Confirm the new password correctly.");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Use a different password", "The new password must be different from the current password.");
      return;
    }

    onSave({
      currentPassword,
      newPassword,
      revokeOtherSessions,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndCancel}>
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
                PASSWORD PROTECTION
              </AppText>

              <AppText variant="title" color={palette.text}>
                Change password
              </AppText>

              <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                Use at least 8 characters with uppercase, lowercase, number, and symbol.
              </AppText>
            </View>

            <Pressable
              onPress={resetAndCancel}
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

          <View style={styles.formStack}>
            <TextInput
              value={currentPassword}
              secureTextEntry
              placeholder="Current password"
              placeholderTextColor={palette.soft}
              onChangeText={setCurrentPassword}
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                  color: palette.text,
                },
              ]}
            />

            <TextInput
              value={newPassword}
              secureTextEntry
              placeholder="New password"
              placeholderTextColor={palette.soft}
              onChangeText={setNewPassword}
              style={[
                styles.input,
                {
                  borderColor:
                    newPassword.length && !passwordLooksReady
                      ? toneSpec("amber", palette).border
                      : passwordLooksReady
                        ? toneSpec("green", palette).border
                        : palette.border,
                  backgroundColor: palette.panel,
                  color: palette.text,
                },
              ]}
            />

            <View
              style={[
                styles.passwordRuleBox,
                {
                  borderColor: passwordLooksReady
                    ? toneSpec("green", palette).border
                    : toneSpec("amber", palette).border,
                  backgroundColor: passwordLooksReady
                    ? toneSpec("green", palette).bg
                    : toneSpec("amber", palette).bg,
                },
              ]}
            >
              <Ionicons
                name={passwordLooksReady ? "checkmark-circle-outline" : "information-circle-outline"}
                size={17}
                color={passwordLooksReady ? toneSpec("green", palette).fg : toneSpec("amber", palette).fg}
              />

              <AppText
                variant="caption"
                color={passwordLooksReady ? toneSpec("green", palette).fg : palette.soft}
                style={styles.sectionText}
              >
                {passwordLooksReady
                  ? "Password strength looks good."
                  : "Required: 8+ characters, uppercase, lowercase, number, and symbol."}
              </AppText>
            </View>

            <TextInput
              value={confirmPassword}
              secureTextEntry
              placeholder="Confirm new password"
              placeholderTextColor={palette.soft}
              onChangeText={setConfirmPassword}
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                  color: palette.text,
                },
              ]}
            />

            <Pressable
              onPress={() => setRevokeOtherSessions((value) => !value)}
              style={[
                styles.toggleRow,
                {
                  borderColor: revokeOtherSessions
                    ? toneSpec("cyan", palette).border
                    : palette.border,
                  backgroundColor: revokeOtherSessions
                    ? toneSpec("cyan", palette).bg
                    : palette.panel,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: revokeOtherSessions ? palette.cyan : palette.border,
                    backgroundColor: revokeOtherSessions ? palette.cyan : "transparent",
                  },
                ]}
              >
                {revokeOtherSessions ? (
                  <Ionicons name="checkmark" size={14} color="#06111F" />
                ) : null}
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="label" color={palette.text}>
                  Sign out other devices
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                  Keep this device signed in and remove other active sessions.
                </AppText>
              </View>
            </Pressable>
          </View>

          <View style={styles.formActions}>
            <Pressable
              onPress={resetAndCancel}
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

            <AppButton loading={saving} onPress={submit} style={styles.saveButton}>
              Save password
            </AppButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SessionCard({
  session,
  currentSessionId,
  palette,
  width,
  loading,
  onSignOut,
}: {
  session: SecuritySession;
  currentSessionId?: string | null;
  palette: AppShellPalette;
  width: DimensionValue;
  loading: boolean;
  onSignOut: () => void;
}) {
  const isCurrent = session.id === currentSessionId;
  const tone = isCurrent ? "cyan" : sessionTone(session);
  const status = sessionStatus(session);

  return (
    <View
      style={[
        styles.sessionCard,
        {
          width,
          borderColor: isCurrent ? toneSpec("cyan", palette).border : palette.border,
          backgroundColor: isCurrent ? toneSpec("cyan", palette).bg : palette.panel,
        },
      ]}
    >
      <View style={styles.sessionTop}>
        <View
          style={[
            styles.sessionIcon,
            {
              borderColor: toneSpec(tone, palette).border,
              backgroundColor: toneSpec(tone, palette).bg,
            },
          ]}
        >
          <Ionicons name="phone-portrait-outline" size={18} color={toneSpec(tone, palette).fg} />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color={palette.text} style={styles.sessionName}>
            {clean(session.deviceLabel, "Unknown device")}
          </AppText>

          <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
            Last activity: {formatDate(session.lastSeenAt || session.createdAt)}
          </AppText>
        </View>

        <StatusPill label={isCurrent ? "Current" : status} tone={tone} palette={palette} />
      </View>

      <View style={styles.detailGrid}>
        <DetailBox label="IP address" value={clean(session.ipAddress, "Not recorded")} palette={palette} />
        <DetailBox label="Started" value={formatDate(session.createdAt)} palette={palette} />
      </View>

      {!isCurrent && !session.isRevoked && status === "Active" ? (
        <AppButton loading={loading} onPress={onSignOut} style={styles.cardActionButton}>
          Sign out device
        </AppButton>
      ) : null}
    </View>
  );
}

function LoginEventRow({
  event,
  palette,
}: {
  event: SecurityLoginEvent;
  palette: AppShellPalette;
}) {
  const tone = eventTone(event);
  const spec = toneSpec(tone, palette);

  return (
    <View style={styles.eventRow}>
      <View
        style={[
          styles.eventIcon,
          {
            borderColor: spec.border,
            backgroundColor: spec.bg,
          },
        ]}
      >
        <Ionicons
          name={tone === "green" ? "checkmark" : tone === "red" ? "alert" : "log-out-outline"}
          size={14}
          color={spec.fg}
        />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {eventStatusLabel(event)}
        </AppText>

        <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
          {clean(event.deviceLabel, "Unknown device")}{"\n"}
          {formatDate(event.createdAt)}
        </AppText>
      </View>

      <StatusPill label={String(event.status || "SUCCESS")} tone={tone} palette={palette} />
    </View>
  );
}

export default function SecuritySettingsScreen() {
  const { width } = useWindowDimensions();
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = useAuthStore((state) => state.user);

  const overviewQuery = useSecurityOverview();
  const sessionsQuery = useSecuritySessions();
  const loginEventsQuery = useSecurityLoginEvents();

  const changePassword = useChangeSecurityPassword();
  const revokeSession = useRevokeSecuritySession();
  const revokeOthers = useRevokeOtherSecuritySessions();

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showAllLoginEvents, setShowAllLoginEvents] = useState(false);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const overview = overviewQuery.data || null;
  const sessions = sessionsQuery.data || [];
  const loginEvents = loginEventsQuery.data || [];

  const role = String(user?.role || overview?.role || "OWNER").toUpperCase();
  const canManage = role === "OWNER" || role === "MANAGER";

  const summary = overview?.summary || null;
  const effectiveWidth = contentWidth || Math.min(width, 420);

  const activeSessions = useMemo(
    () => sessions.filter((session) => !session.isRevoked && sessionStatus(session) === "Active"),
    [sessions],
  );

  const olderSessions = useMemo(
    () => sessions.filter((session) => session.isRevoked || sessionStatus(session) !== "Active"),
    [sessions],
  );

  const visibleSessions = useMemo(() => {
    if (showAllSessions) return sessions;
    if (activeSessions.length) return activeSessions.slice(0, 4);

    return olderSessions.slice(0, 2);
  }, [activeSessions, olderSessions, sessions, showAllSessions]);

  const hiddenSessionCount = Math.max(0, sessions.length - visibleSessions.length);

  const visibleLoginEvents = useMemo(
    () => (showAllLoginEvents ? loginEvents : loginEvents.slice(0, 6)),
    [loginEvents, showAllLoginEvents],
  );

  const summaryWidth = widthForColumns(getColumns(effectiveWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(effectiveWidth, "cards"));

  const loading =
    overviewQuery.isLoading || sessionsQuery.isLoading || loginEventsQuery.isLoading;

  const summaryItems = useMemo<SummaryItem[]>(
    () => [
      {
        label: "Active devices",
        value: String(summary?.activeSessions ?? activeSessions.length),
        icon: "phone-portrait-outline",
        tone: "cyan",
      },
      {
        label: "Recent sign-ins",
        value: String(summary?.recentLogins ?? loginEvents.length),
        icon: "log-in-outline",
        tone: "green",
      },
      {
        label: "Password changed",
        value: shortDate(summary?.lastPasswordChangeAt),
        icon: "key-outline",
        tone: summary?.lastPasswordChangeAt ? "blue" : "amber",
      },
      {
        label: "Account status",
        value: overview?.isActive === false ? "Inactive" : "Active",
        icon: "shield-checkmark-outline",
        tone: overview?.isActive === false ? "red" : "green",
      },
    ],
    [
      activeSessions.length,
      loginEvents.length,
      overview?.isActive,
      summary?.activeSessions,
      summary?.lastPasswordChangeAt,
      summary?.recentLogins,
    ],
  );

  function showNotice(nextNotice: Notice) {
    setNotice(nextNotice);

    if (noticeTimer.current) clearTimeout(noticeTimer.current);

    noticeTimer.current = setTimeout(() => {
      setNotice(null);
    }, 4200);
  }

  async function refreshAll() {
    await Promise.all([
      overviewQuery.refetch(),
      sessionsQuery.refetch(),
      loginEventsQuery.refetch(),
    ]);
  }

  async function savePassword(payload: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions: boolean;
  }) {
    try {
      await changePassword.mutateAsync(payload);
      setPasswordOpen(false);

      showNotice({
        tone: "green",
        title: "Password updated",
        text: payload.revokeOtherSessions
          ? "Your password was changed and other devices were signed out."
          : "Your password was changed successfully.",
      });

      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update password.";
      Alert.alert("Could not update password", message);
    }
  }

  function confirmSignOutDevice(session: SecuritySession) {
    Alert.alert(
      "Sign out this device?",
      `${clean(session.deviceLabel, "This device")} will no longer access this business account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            void signOutDevice(session);
          },
        },
      ],
    );
  }

  async function signOutDevice(session: SecuritySession) {
    if (!session.id || revokeSession.isPending) return;

    setPendingSessionId(session.id);

    try {
      await revokeSession.mutateAsync(session.id);

      showNotice({
        tone: "green",
        title: "Device signed out",
        text: `${clean(session.deviceLabel, "The selected device")} can no longer use this account.`,
      });

      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign out device.";
      Alert.alert("Could not sign out device", message);
    } finally {
      setPendingSessionId(null);
    }
  }

  function confirmSignOutOtherDevices() {
    Alert.alert(
      "Sign out other devices?",
      "This device will stay active. Every other active device will be removed from this business account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out others",
          style: "destructive",
          onPress: () => {
            void signOutOtherDevices();
          },
        },
      ],
    );
  }

  async function signOutOtherDevices() {
    try {
      await revokeOthers.mutateAsync();

      showNotice({
        tone: "green",
        title: "Other devices signed out",
        text: "This device remains active. Other active devices were removed.",
      });

      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign out other devices.";
      Alert.alert("Could not sign out other devices", message);
    }
  }

  return (
    <AppShell>
      {(palette) =>
        loading ? (
          <SecuritySkeleton palette={palette} width={width} />
        ) : (
          <View
            style={styles.stack}
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
                  Security
                </AppText>
              </View>

              <StatusPill label={roleLabel(role)} tone={canManage ? "cyan" : "slate"} palette={palette} />
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
                <Ionicons name="shield-checkmark-outline" size={28} color="#06111F" />
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.heroLabelRow}>
                  <View style={styles.heroDot} />

                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    ACCOUNT PROTECTION
                  </AppText>
                </View>

                <AppText variant="subtitle" color={palette.text}>
                  Protect owner access and active devices
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.heroText}>
                  Review sign-ins, manage active devices, and update the password used for business access.
                </AppText>
              </View>
            </View>

            <View style={styles.responsiveGrid}>
              {summaryItems.map((item) => (
                <SummaryCard key={item.label} item={item} palette={palette} width={summaryWidth} />
              ))}
            </View>

            <View style={styles.responsiveGrid}>
              <View
                style={[
                  styles.panel,
                  {
                    width: cardWidth,
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <View style={styles.panelHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      PASSWORD
                    </AppText>

                    <AppText variant="title" color={palette.text}>
                      Password protection
                    </AppText>

                    <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                      Keep owner access protected with a strong password.
                    </AppText>
                  </View>

                  <View style={[styles.panelIcon, { backgroundColor: palette.cyan }]}>
                    <Ionicons name="key-outline" size={18} color="#06111F" />
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <DetailBox
                    label="Account email"
                    value={clean(overview?.email || user?.email, "Not recorded")}
                    palette={palette}
                  />

                  <DetailBox
                    label="Last password change"
                    value={formatDate(summary?.lastPasswordChangeAt)}
                    palette={palette}
                  />
                </View>

                <AppButton
                  disabled={!canManage}
                  loading={changePassword.isPending}
                  onPress={() => setPasswordOpen(true)}
                  style={styles.fullButton}
                >
                  Change password
                </AppButton>
              </View>

              <View
                style={[
                  styles.panel,
                  {
                    width: cardWidth,
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <View style={styles.panelHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      DEVICES
                    </AppText>

                    <AppText variant="title" color={palette.text}>
                      Active devices
                    </AppText>

                    <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                      Remove devices that should no longer access this account.
                    </AppText>
                  </View>

                  <View style={[styles.panelIcon, { backgroundColor: palette.cyan }]}>
                    <Ionicons name="phone-portrait-outline" size={18} color="#06111F" />
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <DetailBox
                    label="Current device"
                    value={clean(overview?.currentDeviceLabel, "Current device")}
                    palette={palette}
                  />

                  <DetailBox
                    label="Last activity"
                    value={formatDate(overview?.lastSeenAt || overview?.lastLoginAt)}
                    palette={palette}
                  />
                </View>

                <AppButton
                  disabled={!canManage || activeSessions.length <= 1}
                  loading={revokeOthers.isPending}
                  onPress={confirmSignOutOtherDevices}
                  style={styles.fullButton}
                >
                  Sign out other devices
                </AppButton>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                  DEVICE SESSIONS
                </AppText>

                <AppText variant="title" color={palette.text}>
                  Signed-in devices
                </AppText>

                <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                  Current devices are shown first. Older activity stays available for review.
                </AppText>
              </View>

              <Pressable
                onPress={refreshAll}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                    opacity:
                      pressed ||
                      overviewQuery.isFetching ||
                      sessionsQuery.isFetching ||
                      loginEventsQuery.isFetching
                        ? 0.72
                        : 1,
                  },
                ]}
              >
                <Ionicons name="refresh" size={17} color={palette.cyan} />
              </Pressable>
            </View>

            {visibleSessions.length ? (
              <View style={styles.responsiveGrid}>
                {visibleSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    currentSessionId={overview?.currentSessionId}
                    palette={palette}
                    width={cardWidth}
                    loading={pendingSessionId === session.id}
                    onSignOut={() => confirmSignOutDevice(session)}
                  />
                ))}

                {hiddenSessionCount > 0 || showAllSessions ? (
                  <Pressable
                    onPress={() => setShowAllSessions((value) => !value)}
                    style={[
                      styles.showMoreButton,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.panel,
                      },
                    ]}
                  >
                    <Ionicons
                      name={showAllSessions ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={palette.cyan}
                    />

                    <AppText variant="label" color={palette.cyan}>
                      {showAllSessions
                        ? "Show fewer devices"
                        : `Show ${hiddenSessionCount} more devices`}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : (
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
                  <Ionicons name="phone-portrait-outline" size={22} color="#06111F" />
                </View>

                <View style={{ flex: 1, gap: 5 }}>
                  <AppText variant="label" color={palette.text}>
                    No device sessions found
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                    Signed-in devices will appear here after successful account access.
                  </AppText>
                </View>
              </View>
            )}

            <View
              style={[
                styles.panel,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.panelHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    LOGIN ACTIVITY
                  </AppText>

                  <AppText variant="title" color={palette.text}>
                    Recent account access
                  </AppText>
                </View>

                <StatusPill label={`${loginEvents.length} records`} tone="blue" palette={palette} />
              </View>

              {visibleLoginEvents.length ? (
                <View style={styles.eventsList}>
                  {visibleLoginEvents.map((event) => (
                    <LoginEventRow key={event.id} event={event} palette={palette} />
                  ))}

                  {loginEvents.length > 6 ? (
                    <Pressable
                      onPress={() => setShowAllLoginEvents((value) => !value)}
                      style={[
                        styles.showMoreButton,
                        {
                          borderColor: palette.border,
                          backgroundColor: palette.stage,
                        },
                      ]}
                    >
                      <Ionicons
                        name={showAllLoginEvents ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={palette.cyan}
                      />

                      <AppText variant="label" color={palette.cyan}>
                        {showAllLoginEvents ? "Show fewer records" : "Show all records"}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <AppText variant="caption" color={palette.soft} style={styles.sectionText}>
                  Login activity will appear here after successful sign-ins.
                </AppText>
              )}
            </View>

            <PasswordModal
              visible={passwordOpen}
              palette={palette}
              saving={changePassword.isPending}
              onCancel={() => setPasswordOpen(false)}
              onSave={savePassword}
            />
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

  panel: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  panelIcon: {
    width: 38,
    height: 38,
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

  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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

  fullButton: {
    minHeight: 46,
  },

  sessionCard: {
    borderWidth: 1,
    padding: 14,
    gap: 13,
  },

  sessionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  sessionIcon: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  sessionName: {
    lineHeight: 20,
  },

  cardActionButton: {
    minHeight: 42,
  },

  showMoreButton: {
    width: "100%",
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  eventsList: {
    gap: 12,
  },

  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  eventIcon: {
    width: 30,
    height: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    maxWidth: 720,
    maxHeight: "92%",
    alignSelf: "center",
    borderWidth: 1,
    padding: 16,
    gap: 14,
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

  formStack: {
    gap: 10,
  },

  input: {
    minHeight: 54,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
  },

  passwordRuleBox: {
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  toggleRow: {
    borderWidth: 1,
    padding: 12,
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