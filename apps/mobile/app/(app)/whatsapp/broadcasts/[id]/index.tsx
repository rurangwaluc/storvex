import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../../../src/components/app/AppShell";
import { AppText } from "../../../../../src/components/ui/AppText";
import { AsyncButton } from "../../../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../../../src/components/ui/Skeleton";
import { routes } from "../../../../../src/constants/routes";
import {
  broadcastStatusLabel,
  broadcastTitle,
  useQueueWhatsAppBroadcast,
  useSendWhatsAppBroadcast,
  useWhatsAppBroadcast,
} from "../../../../../src/features/whatsapp/hooks";
import type {
  SendWhatsAppBroadcastPayload,
  WhatsAppBroadcast,
  WhatsAppBroadcastSendSummary,
} from "../../../../../src/features/whatsapp/types";

const ACCENT = "#22C7F4";
const GREEN = "#34D399";
const AMBER = "#FBBF24";
const RED = "#FB7185";

type SendForm = {
  limit: string;
};

type SendNotice = {
  tone: "red" | "amber" | "green";
  title: string;
  message: string;
} | null;

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
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

function toneSpec(
  tone: "cyan" | "green" | "amber" | "red" | "slate",
  palette: AppShellPalette,
) {
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

function dateLabel(value?: string | null) {
  if (!value) return "Not available";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not available";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function broadcastTone(broadcast?: WhatsAppBroadcast | null): "green" | "amber" | "red" | "slate" {
  const status = String(broadcast?.status || "").toUpperCase();

  if (status === "SENT") return "green";
  if (status === "QUEUED") return "amber";
  if (status === "FAILED") return "red";

  return "slate";
}

function errorMessage(error: unknown) {
  const err = error as {
    message?: string;
    response?: {
      data?: {
        code?: string;
        message?: string;
      };
    };
  };

  const code = String(err?.response?.data?.code || "").toUpperCase();
  const message = String(err?.response?.data?.message || err?.message || "").toLowerCase();

  if (message.includes("132001") || message.includes("template name does not exist")) {
    return "The WhatsApp message format is not approved yet for this sending account.";
  }

  if (message.includes("131030") || message.includes("recipient phone number not in allowed list")) {
    return "This customer number is not allowed for the current WhatsApp test setup.";
  }

  if (message.includes("oauth") || message.includes("access token")) {
    return "The WhatsApp sending account needs setup before messages can be sent.";
  }

  if (code === "BROADCAST_NOT_FOUND") return "This broadcast could not be found.";
  if (code === "BROADCAST_ALREADY_SENT") return "This broadcast has already been sent.";
  if (code === "ACCOUNT_REQUIRED") return "A WhatsApp sending account is required before sending.";
  if (code === "WHATSAPP_ACCOUNT_NOT_FOUND") {
    return "No active WhatsApp sending account was found for this store.";
  }
  if (code === "WHATSAPP_ACCOUNT_PHONE_NUMBER_ID_MISSING") {
    return "The WhatsApp sending number needs setup before messages can be sent.";
  }
  if (code === "WHATSAPP_ACCOUNT_ACCESS_TOKEN_MISSING") {
    return "The WhatsApp sending account needs setup before messages can be sent.";
  }
  if (code === "PROMOTION_REQUIRED" || code === "PROMOTION_REQUIRED_TO_SEND") {
    return "This broadcast needs a promotion before it can be sent.";
  }
  if (code === "NO_RECIPIENTS" || code === "NO_BROADCAST_RECIPIENTS") {
    return "No matching customers were found for this broadcast audience.";
  }
  if (code === "BRANCH_REQUIRED") return "Choose a selling location before sending this broadcast.";
  if (code === "PRODUCT_REQUIRED" || code === "PRODUCT_ID_REQUIRED_FOR_TARGET") {
    return "This audience needs a product-focused promotion.";
  }
  if (code === "LIMIT_INVALID") return "Customer limit must be a valid number.";

  return "The action could not be completed. Please try again.";
}

function whatsappFailureMessage(value: unknown) {
  const message = String(value || "").toLowerCase();

  if (message.includes("132001") || message.includes("template name does not exist")) {
    return "The WhatsApp message format is not approved yet for this sending account.";
  }

  if (message.includes("131030") || message.includes("recipient phone number not in allowed list")) {
    return "This customer number is not allowed for the current WhatsApp test setup.";
  }

  if (message.includes("oauth") || message.includes("access token")) {
    return "The WhatsApp sending account needs setup before messages can be sent.";
  }

  if (message.includes("phone_number_id")) {
    return "The WhatsApp sending number needs setup before messages can be sent.";
  }

  return clean(value, "Message could not be sent.");
}

function tileWidth(width: number): DimensionValue {
  return width >= 430 ? "48.8%" : "100%";
}

function StatusPill({
  broadcast,
  palette,
}: {
  broadcast: WhatsAppBroadcast;
  palette: AppShellPalette;
}) {
  const tone = broadcastTone(broadcast);
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
      <View style={[styles.statusDot, { backgroundColor: spec.solid }]} />
      <AppText variant="caption" color={spec.fg} style={styles.statusText}>
        {broadcastStatusLabel(broadcast)}
      </AppText>
    </View>
  );
}

function DetailTile({
  label,
  value,
  helper,
  icon,
  tone,
  palette,
  width,
}: {
  label: string;
  value: string;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "cyan" | "green" | "amber" | "red" | "slate";
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.detailTile,
        {
          width,
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.detailTileTop}>
        <View
          style={[
            styles.detailTileIcon,
            {
              borderColor: spec.border,
              backgroundColor: spec.bg,
            },
          ]}
        >
          <Ionicons name={icon} size={17} color={spec.fg} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            {label}
          </AppText>
        </View>
      </View>

      <AppText variant="subtitle" color={palette.text} numberOfLines={2}>
        {value}
      </AppText>

      <AppText variant="caption" color={palette.soft} style={styles.cardText} numberOfLines={2}>
        {helper}
      </AppText>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
  palette,
}: {
  label: string;
  value: string;
  tone: "cyan" | "green" | "amber" | "red" | "slate";
  palette: AppShellPalette;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.summaryMetric,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <AppText variant="caption" color={spec.fg} style={styles.eyebrow}>
        {label}
      </AppText>
      <AppText variant="subtitle" color={palette.text}>
        {value}
      </AppText>
    </View>
  );
}

function SendSummaryPanel({
  summary,
  palette,
}: {
  summary: WhatsAppBroadcastSendSummary;
  palette: AppShellPalette;
}) {
  const attempted = num(summary.attempted, 0);
  const delivered = num(summary.delivered, 0);
  const failed = num(summary.failed, 0);
  const skipped = num(summary.skippedDuplicate, 0);
  const failures = summary.failurePreview || [];

  return (
    <View
      style={[
        styles.summaryPanel,
        {
          borderColor: toneSpec(failed > 0 ? "amber" : "green", palette).border,
          backgroundColor: toneSpec(failed > 0 ? "amber" : "green", palette).bg,
        },
      ]}
    >
      <View style={styles.summaryTop}>
        <Ionicons
          name={failed > 0 ? "warning-outline" : "checkmark-done-outline"}
          size={22}
          color={toneSpec(failed > 0 ? "amber" : "green", palette).fg}
        />

        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="label" color={palette.text}>
            Broadcast result
          </AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            Review how many customer messages were sent successfully.
          </AppText>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryMetric
          label="Selected"
          value={attempted.toLocaleString()}
          tone="cyan"
          palette={palette}
        />
        <SummaryMetric
          label="Sent"
          value={delivered.toLocaleString()}
          tone="green"
          palette={palette}
        />
        <SummaryMetric
          label="Not sent"
          value={failed.toLocaleString()}
          tone={failed > 0 ? "red" : "slate"}
          palette={palette}
        />
        <SummaryMetric
          label="Already sent"
          value={skipped.toLocaleString()}
          tone="slate"
          palette={palette}
        />
      </View>

      {failures.length > 0 ? (
        <View style={styles.failureList}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Needs attention
          </AppText>

          {failures.slice(0, 3).map((failure, index) => (
            <View
              key={`${failure.customerId || failure.phone || index}`}
              style={[
                styles.failureItem,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.failureTop}>
                <View
                  style={[
                    styles.failureIcon,
                    {
                      borderColor: toneSpec("red", palette).border,
                      backgroundColor: toneSpec("red", palette).bg,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={15} color={toneSpec("red", palette).fg} />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>
                    {clean(failure.phone, "Customer")}
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    {whatsappFailureMessage(failure.message)}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SendBroadcastModal({
  open,
  palette,
  form,
  saving,
  notice,
  onChange,
  onClose,
  onSend,
}: {
  open: boolean;
  palette: AppShellPalette;
  form: SendForm;
  saving: boolean;
  notice: SendNotice;
  onChange: (key: keyof SendForm, value: string) => void;
  onClose: () => void;
  onSend: () => Promise<void>;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              borderColor: palette.borderStrong,
              backgroundColor: palette.stage,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>
                Send WhatsApp broadcast
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Confirm customer sending
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Leave the limit blank to send with the normal audience rules, or enter a small number for testing.
              </AppText>
            </View>

            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[
                styles.closeButton,
                {
                  borderColor: palette.border,
                  opacity: saving ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <View
              style={[
                styles.noticePanel,
                {
                  borderColor: toneSpec("amber", palette).border,
                  backgroundColor: toneSpec("amber", palette).bg,
                },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={toneSpec("amber", palette).fg} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <AppText variant="label" color={palette.text}>
                  Send only to the right customers
                </AppText>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  Check the promotion message, selected customers, and WhatsApp account before sending.
                </AppText>
              </View>
            </View>

            {notice ? (
              <View
                style={[
                  styles.modalNotice,
                  {
                    borderColor: toneSpec(notice.tone, palette).border,
                    backgroundColor: toneSpec(notice.tone, palette).bg,
                  },
                ]}
              >
                <Ionicons
                  name={notice.tone === "green" ? "checkmark-circle-outline" : "warning-outline"}
                  size={20}
                  color={toneSpec(notice.tone, palette).fg}
                />

                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <AppText variant="label" color={palette.text}>
                    {notice.title}
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    {notice.message}
                  </AppText>
                </View>
              </View>
            ) : null}

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                Customer limit
              </AppText>
              <TextInput
                value={form.limit}
                onChangeText={(value) => onChange("limit", value)}
                keyboardType="numeric"
                placeholder="Example: 20"
                placeholderTextColor={palette.soft}
                style={[
                  styles.input,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                    color: palette.text,
                  },
                ]}
              />
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Leave this blank to use the normal sending limit.
              </AppText>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <AsyncButton
              onPress={onClose}
              variant="secondary"
              disabled={saving}
              style={styles.footerButton}
            >
              Cancel
            </AsyncButton>

            <AsyncButton
              onPress={onSend}
              variant="primary"
              disabled={saving}
              style={[styles.footerButton, styles.accentButton]}
            >
              {saving ? "Sending" : "Send now"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WhatsAppBroadcastDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const broadcastId = String(id || "");
  const cardWidth = tileWidth(Math.min(width, 760));

  const broadcastQuery = useWhatsAppBroadcast(broadcastId);
  const queueBroadcast = useQueueWhatsAppBroadcast();
  const sendBroadcast = useSendWhatsAppBroadcast();

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendForm, setSendForm] = useState<SendForm>({ limit: "" });
  const [sendNotice, setSendNotice] = useState<SendNotice>(null);
  const [sendSummary, setSendSummary] = useState<WhatsAppBroadcastSendSummary | null>(null);

  const broadcast = broadcastQuery.data || null;

  const status = String(broadcast?.status || "").toUpperCase();
  const canQueue = Boolean(broadcast && status === "DRAFT");
  const canSend = Boolean(broadcast && status !== "SENT");

  const title = useMemo(() => broadcastTitle(broadcast), [broadcast]);

  function updateSendForm(key: keyof SendForm, value: string) {
    setSendNotice(null);
    setSendForm((current) => ({ ...current, [key]: value }));
  }

  function closeSendModal() {
    if (sendBroadcast.isPending) return;
    setSendNotice(null);
    setSendModalOpen(false);
  }

  function openSendModal() {
    setSendNotice(null);
    setSendModalOpen(true);
  }

  async function queueCurrentBroadcast() {
    if (!broadcast) return;

    try {
      await queueBroadcast.mutateAsync(broadcast.id);
      await broadcastQuery.refetch();
    } catch (error) {
      Alert.alert("Broadcast not queued", errorMessage(error));
    }
  }

  async function sendCurrentBroadcast() {
    if (!broadcast) return;

    const limitText = sendForm.limit.trim();
    const limit = limitText ? Number(limitText) : undefined;

    if (limitText && (!Number.isInteger(limit) || Number(limit) <= 0)) {
      setSendNotice({
        tone: "amber",
        title: "Check customer limit",
        message: "Customer limit must be a whole number greater than 0.",
      });
      return;
    }

    try {
      setSendNotice(null);
      const payload: SendWhatsAppBroadcastPayload = {};

      if (limit) {
        payload.limit = limit;
      }

      const result = await sendBroadcast.mutateAsync({
        broadcastId: broadcast.id,
        payload,
      });

      setSendSummary(result.summary || null);
      setSendModalOpen(false);
      await broadcastQuery.refetch();
    } catch (error) {
      setSendNotice({
        tone: "red",
        title: "Broadcast not sent",
        message: errorMessage(error),
      });
    }
  }

  return (
    <AppShell>
      {(palette) => (
        <View style={styles.stack}>
          {broadcastQuery.isLoading ? (
            <>
              <Skeleton height={132} width="100%" />
              <Skeleton height={210} width="100%" />
              <Skeleton height={132} width="100%" />
            </>
          ) : null}

          {!broadcastQuery.isLoading && broadcastQuery.isError ? (
            <View
              style={[
                styles.emptyState,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    borderColor: toneSpec("amber", palette).border,
                    backgroundColor: toneSpec("amber", palette).bg,
                  },
                ]}
              >
                <Ionicons name="warning-outline" size={24} color={toneSpec("amber", palette).fg} />
              </View>

              <AppText variant="subtitle" color={palette.text} center>
                Broadcast could not load
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                Refresh and try again.
              </AppText>

              <AsyncButton
                onPress={async () => {
                  await broadcastQuery.refetch();
                }}
                variant="secondary"
              >
                Refresh
              </AsyncButton>
            </View>
          ) : null}

          {!broadcastQuery.isLoading && !broadcastQuery.isError && !broadcast ? (
            <View
              style={[
                styles.emptyState,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    borderColor: toneSpec("red", palette).border,
                    backgroundColor: toneSpec("red", palette).bg,
                  },
                ]}
              >
                <Ionicons name="radio-outline" size={24} color={toneSpec("red", palette).fg} />
              </View>

              <AppText variant="subtitle" color={palette.text} center>
                Broadcast was not found
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                Go back to broadcasts and choose another record.
              </AppText>

              <AsyncButton
                onPress={() => router.replace(routes.whatsappBroadcasts as never)}
                variant="secondary"
              >
                Back to broadcasts
              </AsyncButton>
            </View>
          ) : null}

          {broadcast ? (
            <>
              <View
                style={[
                  styles.hero,
                  {
                    borderColor: "rgba(34, 199, 244, 0.30)",
                    backgroundColor: "rgba(34, 199, 244, 0.10)",
                  },
                ]}
              >
                <View style={styles.heroTop}>
                  <Pressable
                    onPress={() => router.push(routes.whatsappBroadcasts as never)}
                    style={({ pressed }) => [
                      styles.backButton,
                      {
                        borderColor: palette.border,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="chevron-back-outline" size={20} color={palette.text} />
                  </Pressable>

                  <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                    <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>
                      WhatsApp broadcast
                    </AppText>
                    <AppText variant="title" color={palette.text}>
                      {title}
                    </AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      Review the customer offer and sending result.
                    </AppText>
                  </View>

                  <StatusPill broadcast={broadcast} palette={palette} />
                </View>

                <View style={styles.actionRow}>
                  <AsyncButton
                    onPress={queueCurrentBroadcast}
                    variant="secondary"
                    disabled={!canQueue || queueBroadcast.isPending}
                    style={styles.actionButton}
                  >
                    {queueBroadcast.isPending ? "Queuing" : "Queue"}
                  </AsyncButton>

                  <AsyncButton
                    onPress={openSendModal}
                    variant="primary"
                    disabled={!canSend || sendBroadcast.isPending}
                    style={[styles.actionButton, styles.accentButton]}
                  >
                    Send
                  </AsyncButton>
                </View>
              </View>

              {status === "SENT" ? (
                <View
                  style={[
                    styles.noticePanel,
                    {
                      borderColor: toneSpec("green", palette).border,
                      backgroundColor: toneSpec("green", palette).bg,
                    },
                  ]}
                >
                  <Ionicons name="checkmark-done-outline" size={20} color={toneSpec("green", palette).fg} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText variant="label" color={palette.text}>
                      Broadcast sent
                    </AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      This customer campaign is now saved in WhatsApp broadcast history.
                    </AppText>
                  </View>
                </View>
              ) : null}

              {status === "FAILED" ? (
                <View
                  style={[
                    styles.noticePanel,
                    {
                      borderColor: toneSpec("red", palette).border,
                      backgroundColor: toneSpec("red", palette).bg,
                    },
                  ]}
                >
                  <Ionicons name="warning-outline" size={20} color={toneSpec("red", palette).fg} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText variant="label" color={palette.text}>
                      Broadcast needs attention
                    </AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      Review the selected customers and WhatsApp account before trying again.
                    </AppText>
                  </View>
                </View>
              ) : null}

              {sendSummary ? <SendSummaryPanel summary={sendSummary} palette={palette} /> : null}

              <View
                style={[
                  styles.messageCard,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <View style={styles.messageHeader}>
                  <View
                    style={[
                      styles.messageIcon,
                      {
                        borderColor: "rgba(37, 211, 102, 0.32)",
                        backgroundColor: "rgba(37, 211, 102, 0.12)",
                      },
                    ]}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color={GREEN} />
                  </View>

                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>
                      Customer message
                    </AppText>
                    <AppText variant="subtitle" color={palette.text}>
                      Promotion preview
                    </AppText>
                  </View>
                </View>

                <View
                  style={[
                    styles.chatBubble,
                    {
                      borderColor: "rgba(37, 211, 102, 0.26)",
                      backgroundColor: "rgba(37, 211, 102, 0.12)",
                    },
                  ]}
                >
                  <AppText variant="label" color={palette.text}>
                    {clean(broadcast.promotion?.title, "WhatsApp offer")}
                  </AppText>
                  <AppText variant="body" color={palette.text} style={styles.messageBody}>
                    {clean(broadcast.promotion?.message, "No promotion message is attached.")}
                  </AppText>
                </View>
              </View>

              <View
                style={[
                  styles.reportPanel,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <View style={styles.reportHeader}>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>
                      Broadcast details
                    </AppText>
                    <AppText variant="subtitle" color={palette.text}>
                      Sending overview
                    </AppText>
                  </View>

                  <View
                    style={[
                      styles.reportBadge,
                      {
                        borderColor: toneSpec(broadcastTone(broadcast), palette).border,
                        backgroundColor: toneSpec(broadcastTone(broadcast), palette).bg,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={toneSpec(broadcastTone(broadcast), palette).fg}
                      style={styles.statusText}
                    >
                      {broadcastStatusLabel(broadcast)}
                    </AppText>
                  </View>
                </View>

                <View style={styles.detailTilesGrid}>
                  <DetailTile
                    label="Customers selected"
                    value={num(broadcast.recipientCount, 0).toLocaleString()}
                    helper="Customers included in this broadcast record."
                    icon="people-outline"
                    tone="cyan"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Messages sent"
                    value={num(broadcast.deliveredCount, 0).toLocaleString()}
                    helper="Customer messages accepted for sending."
                    icon="checkmark-done-outline"
                    tone="green"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Message type"
                    value="Store offer"
                    helper="Used for product and store promotions."
                    icon="document-text-outline"
                    tone="slate"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Message language"
                    value="English"
                    helper="Customer-facing message language."
                    icon="language-outline"
                    tone="slate"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="WhatsApp account"
                    value={
                      clean(broadcast.account?.businessName, "") ||
                      clean(broadcast.account?.phoneNumber, "Account not shown")
                    }
                    helper="Store number used to send this broadcast."
                    icon="logo-whatsapp"
                    tone="green"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Created by"
                    value={clean(broadcast.createdBy?.name || broadcast.createdBy?.role, "Staff member")}
                    helper="Team member who prepared this broadcast."
                    icon="person-outline"
                    tone="slate"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Queued"
                    value={dateLabel(broadcast.queuedAt)}
                    helper="When this broadcast was prepared for sending."
                    icon="time-outline"
                    tone="amber"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Sent"
                    value={dateLabel(broadcast.sentAt)}
                    helper="When customer messages were successfully sent."
                    icon="send-outline"
                    tone="green"
                    palette={palette}
                    width={cardWidth}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.nextPanel,
                  {
                    borderColor: "rgba(34, 199, 244, 0.28)",
                    backgroundColor: "rgba(34, 199, 244, 0.10)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.nextIcon,
                    {
                      borderColor: "rgba(34, 199, 244, 0.30)",
                      backgroundColor: "rgba(34, 199, 244, 0.13)",
                    },
                  ]}
                >
                  <Ionicons name="megaphone-outline" size={20} color={ACCENT} />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                  <AppText variant="label" color={palette.text}>
                    Manage promotion
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Open the promotion connected to this broadcast.
                  </AppText>
                </View>

                <Pressable
                  disabled={!broadcast.promotionId}
                  onPress={() => {
                    if (!broadcast.promotionId) return;
                    router.push(routes.whatsappPromotion(broadcast.promotionId) as never);
                  }}
                  style={({ pressed }) => [
                    styles.nextButton,
                    {
                      borderColor: "rgba(34, 199, 244, 0.30)",
                      backgroundColor: "rgba(34, 199, 244, 0.14)",
                      opacity: !broadcast.promotionId ? 0.45 : pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <AppText variant="caption" color={ACCENT} style={styles.nextButtonText}>
                    Open
                  </AppText>
                </Pressable>
              </View>

              <SendBroadcastModal
                open={sendModalOpen}
                palette={palette}
                form={sendForm}
                saving={sendBroadcast.isPending}
                notice={sendNotice}
                onChange={updateSendForm}
                onClose={closeSendModal}
                onSend={sendCurrentBroadcast}
              />
            </>
          ) : null}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },

  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  cardText: {
    flexShrink: 1,
    lineHeight: 18,
  },

  accentButton: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },

  hero: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  backButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  statusPill: {
    flexShrink: 0,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 6,
    height: 6,
  },

  statusText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    minHeight: 48,
  },

  noticePanel: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  messageCard: {
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  messageIcon: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  chatBubble: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    borderWidth: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    padding: 13,
    gap: 8,
  },

  messageBody: {
    lineHeight: 22,
  },

  reportPanel: {
    borderWidth: 1,
    padding: 13,
    gap: 13,
  },

  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  reportBadge: {
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  detailTilesGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  detailTile: {
    minHeight: 126,
    borderWidth: 1,
    padding: 12,
    gap: 9,
  },

  detailTileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  detailTileIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryPanel: {
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },

  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  summaryMetric: {
    flex: 1,
    minWidth: 118,
    borderWidth: 1,
    padding: 10,
    gap: 5,
  },

  failureList: {
    gap: 8,
  },

  failureItem: {
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },

  failureTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  failureIcon: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  nextPanel: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  nextIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  nextButton: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  nextButtonText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  emptyState: {
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  modalCard: {
    width: "100%",
    maxWidth: 560,
    borderWidth: 1,
    overflow: "hidden",
  },

  modalHeader: {
    padding: 16,
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

  modalBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },

  modalNotice: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  fieldWrap: {
    gap: 7,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontFamily: "Quicksand_600SemiBold",
    fontSize: 14,
  },

  modalFooter: {
    padding: 16,
    flexDirection: "row",
    gap: 10,
  },

  footerButton: {
    flex: 1,
    minHeight: 52,
  },
});