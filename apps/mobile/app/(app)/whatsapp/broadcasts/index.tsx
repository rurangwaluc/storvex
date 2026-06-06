import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../../src/components/app/AppShell";
import { AppText } from "../../../../src/components/ui/AppText";
import { AsyncButton } from "../../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../../src/components/ui/Skeleton";
import { routes } from "../../../../src/constants/routes";
import {
  broadcastStatusLabel,
  broadcastTitle,
  useCreateWhatsAppBroadcast,
  useWhatsAppBroadcasts,
  useWhatsAppPromotions,
} from "../../../../src/features/whatsapp/hooks";
import type {
  WhatsAppBroadcast,
  WhatsAppPromotion,
  WhatsAppTargetMode,
} from "../../../../src/features/whatsapp/types";
import { useBranchStore } from "../../../../src/store/branchStore";

const ACCENT = "#22C7F4";
const GREEN = "#34D399";
const AMBER = "#FBBF24";
const RED = "#FB7185";
const LIST_PAGE_SIZE = 3;

type BroadcastForm = {
  promotionId: string;
  templateName: string;
  languageCode: string;
  targetMode: WhatsAppTargetMode;
};

type ModalNotice = {
  tone: "red" | "amber" | "green";
  title: string;
  message: string;
} | null;

const TARGET_OPTIONS: Array<{
  value: WhatsAppTargetMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    value: "ALL_OPTED_IN",
    label: "All WhatsApp customers",
    description: "Send to customers who can receive WhatsApp updates.",
    icon: "people-outline",
  },
  {
    value: "BRANCH_CUSTOMERS",
    label: "Current selling location",
    description: "Send to customers connected to the selected selling location.",
    icon: "storefront-outline",
  },
  {
    value: "CREDIT_CUSTOMERS",
    label: "Credit customers",
    description: "Send to customers who buy on credit.",
    icon: "card-outline",
  },
  {
    value: "OVERDUE_CREDIT_CUSTOMERS",
    label: "Overdue credit customers",
    description: "Send to customers with overdue balances.",
    icon: "alert-circle-outline",
  },
  {
    value: "PRODUCT_BUYERS",
    label: "Product buyers",
    description: "Send to customers linked to the promotion product.",
    icon: "cube-outline",
  },
];

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
  if (!value) return "Not sent";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not sent";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function emptyForm(): BroadcastForm {
  return {
    promotionId: "",
    templateName: "promo_template",
    languageCode: "en_US",
    targetMode: "ALL_OPTED_IN",
  };
}

function broadcastTone(broadcast: WhatsAppBroadcast): "green" | "amber" | "red" | "slate" {
  const status = String(broadcast.status || "").toUpperCase();

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

  if (code === "PROMOTION_REQUIRED") return "Choose the promotion to broadcast.";
  if (code === "PROMOTION_NOT_FOUND") return "The selected promotion could not be found.";
  if (code === "TEMPLATE_REQUIRED" || code === "TEMPLATE_NAME_REQUIRED") {
    return "The WhatsApp message format needs setup before sending.";
  }
  if (code === "ACCOUNT_REQUIRED") {
    return "A WhatsApp sending account is required before broadcasting.";
  }
  if (code === "WHATSAPP_ACCOUNT_NOT_FOUND") {
    return "No active WhatsApp sending account was found for this store.";
  }
  if (code === "WHATSAPP_ACCOUNT_PHONE_NUMBER_ID_MISSING") {
    return "The WhatsApp sending number needs setup before broadcasts can be sent.";
  }
  if (code === "WHATSAPP_ACCOUNT_ACCESS_TOKEN_MISSING") {
    return "The WhatsApp sending account needs setup before broadcasts can be sent.";
  }
  if (code === "BRANCH_REQUIRED") return "Choose a selling location before using this audience.";
  if (code === "PRODUCT_ID_REQUIRED_FOR_TARGET") {
    return "Product buyers audience needs a promotion connected to a product.";
  }

  return (
    err?.response?.data?.message ||
    err?.message ||
    "The broadcast could not be saved. Please try again."
  );
}

function selectedTargetOption(value: WhatsAppTargetMode) {
  return TARGET_OPTIONS.find((item) => item.value === value) || TARGET_OPTIONS[0];
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

function StatCard({
  label,
  value,
  icon,
  tone,
  palette,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "cyan" | "green" | "amber" | "red" | "slate";
  palette: AppShellPalette;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <View
      style={[
        styles.statCard,
        {
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
        <Ionicons name={icon} size={16} color={spec.fg} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          {label}
        </AppText>
        <AppText variant="subtitle" color={palette.text}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function PromotionChoice({
  promotion,
  selected,
  palette,
  onPress,
}: {
  promotion: WhatsAppPromotion;
  selected: boolean;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(selected ? "green" : "slate", palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.promotionChoice,
        {
          borderColor: selected ? spec.border : palette.border,
          backgroundColor: selected ? spec.bg : palette.panel,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.choiceIcon,
          {
            borderColor: spec.border,
            backgroundColor: spec.bg,
          },
        ]}
      >
        <Ionicons
          name={selected ? "checkmark-outline" : "megaphone-outline"}
          size={16}
          color={spec.fg}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label" color={palette.text} numberOfLines={1}>
          {clean(promotion.title, "Promotion")}
        </AppText>
        <AppText variant="caption" color={palette.soft} numberOfLines={2} style={styles.cardText}>
          {clean(promotion.message, "No message")}
        </AppText>
      </View>
    </Pressable>
  );
}

function TargetChoice({
  option,
  selected,
  palette,
  onPress,
}: {
  option: (typeof TARGET_OPTIONS)[number];
  selected: boolean;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(selected ? "cyan" : "slate", palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.targetChoice,
        {
          borderColor: selected ? spec.border : palette.border,
          backgroundColor: selected ? spec.bg : palette.panel,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.choiceIcon,
          {
            borderColor: spec.border,
            backgroundColor: spec.bg,
          },
        ]}
      >
        <Ionicons name={option.icon} size={16} color={spec.fg} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {option.label}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {option.description}
        </AppText>
      </View>
    </Pressable>
  );
}

function BroadcastCard({
  broadcast,
  palette,
  onPress,
}: {
  broadcast: WhatsAppBroadcast;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const recipients = num(broadcast.recipientCount, 0);
  const delivered = num(broadcast.deliveredCount, 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.broadcastCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.cardIcon,
            {
              borderColor: "rgba(34, 199, 244, 0.30)",
              backgroundColor: "rgba(34, 199, 244, 0.12)",
            },
          ]}
        >
          <Ionicons name="radio-outline" size={18} color={ACCENT} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <AppText variant="subtitle" color={palette.text} numberOfLines={2}>
            {broadcastTitle(broadcast)}
          </AppText>
          <AppText variant="caption" color={palette.soft} numberOfLines={2} style={styles.cardText}>
            {clean(broadcast.promotion?.message, "WhatsApp customer offer")}
          </AppText>
        </View>

        <StatusPill broadcast={broadcast} palette={palette} />
      </View>

      <View style={styles.detailsGrid}>
        <View
          style={[
            styles.detailBox,
            {
              borderColor: palette.border,
              backgroundColor: palette.stage,
            },
          ]}
        >
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Recipients
          </AppText>
          <AppText variant="label" color={palette.text}>
            {recipients.toLocaleString()}
          </AppText>
        </View>

        <View
          style={[
            styles.detailBox,
            {
              borderColor: palette.border,
              backgroundColor: palette.stage,
            },
          ]}
        >
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Delivered
          </AppText>
          <AppText variant="label" color={palette.text}>
            {delivered.toLocaleString()}
          </AppText>
        </View>

        <View
          style={[
            styles.detailBox,
            {
              borderColor: palette.border,
              backgroundColor: palette.stage,
            },
          ]}
        >
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Sent date
          </AppText>
          <AppText variant="label" color={palette.text}>
            {dateLabel(broadcast.sentAt || broadcast.queuedAt || broadcast.createdAt)}
          </AppText>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <AppText variant="caption" color={palette.soft}>
          {broadcast.status === "SENT" ? "Kept as broadcast history" : "Open to review or send"}
        </AppText>
        <Ionicons name="chevron-forward-outline" size={18} color={palette.soft} />
      </View>
    </Pressable>
  );
}

function CreateBroadcastModal({
  open,
  palette,
  form,
  promotions,
  promotionsLoading,
  saving,
  notice,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  form: BroadcastForm;
  promotions: WhatsAppPromotion[];
  promotionsLoading: boolean;
  saving: boolean;
  notice: ModalNotice;
  onChange: (key: keyof BroadcastForm, value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const selectedPromotion = promotions.find((promotion) => promotion.id === form.promotionId) || null;
  const target = selectedTargetOption(form.targetMode);

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
                New WhatsApp broadcast
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Choose offer and audience
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Prepare the broadcast first, then open it to review and send.
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

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                Promotion
              </AppText>

              <View style={styles.choiceList}>
                {promotionsLoading ? (
                  <>
                    <Skeleton height={76} width="100%" />
                    <Skeleton height={76} width="100%" />
                    <Skeleton height={76} width="100%" />
                  </>
                ) : null}

                {!promotionsLoading
                  ? promotions.slice(0, 5).map((promotion) => (
                      <PromotionChoice
                        key={promotion.id}
                        promotion={promotion}
                        selected={form.promotionId === promotion.id}
                        palette={palette}
                        onPress={() => onChange("promotionId", promotion.id)}
                      />
                    ))
                  : null}

                {!promotionsLoading && promotions.length === 0 ? (
                  <View
                    style={[
                      styles.emptyMini,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.panel,
                      },
                    ]}
                  >
                    <Ionicons name="megaphone-outline" size={19} color={palette.soft} />
                    <AppText variant="caption" color={palette.soft} center>
                      Create a promotion before preparing a broadcast.
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                Audience
              </AppText>

              <View style={styles.choiceList}>
                {TARGET_OPTIONS.map((option) => (
                  <TargetChoice
                    key={option.value}
                    option={option}
                    selected={form.targetMode === option.value}
                    palette={palette}
                    onPress={() => onChange("targetMode", option.value)}
                  />
                ))}
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

            <View
              style={[
                styles.previewPanel,
                {
                  borderColor: "rgba(34, 199, 244, 0.28)",
                  backgroundColor: "rgba(34, 199, 244, 0.10)",
                },
              ]}
            >
              <View style={styles.previewTop}>
                <Ionicons name="logo-whatsapp" size={18} color={GREEN} />
                <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>
                  Broadcast preview
                </AppText>
              </View>

              <AppText variant="label" color={palette.text}>
                {clean(selectedPromotion?.title, "Choose a promotion")}
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.previewText}>
                {clean(selectedPromotion?.message, "The selected promotion message will appear here.")}
              </AppText>

              <View
                style={[
                  styles.previewAudience,
                  {
                    borderColor: toneSpec("cyan", palette).border,
                    backgroundColor: toneSpec("cyan", palette).bg,
                  },
                ]}
              >
                <Ionicons name={target.icon} size={15} color={toneSpec("cyan", palette).fg} />
                <AppText variant="caption" color={toneSpec("cyan", palette).fg} style={styles.previewAudienceText}>
                  {target.label}
                </AppText>
              </View>
            </View>
          </ScrollView>

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
              onPress={onSave}
              variant="primary"
              disabled={saving}
              style={[styles.footerButton, styles.accentButton]}
            >
              {saving ? "Saving" : "Create broadcast"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WhatsAppBroadcastsScreen() {
  const router = useRouter();
  const activeBranchId = useBranchStore((state) => state.activeBranchId);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "QUEUED" | "SENT" | "FAILED">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(LIST_PAGE_SIZE);
  const [modalNotice, setModalNotice] = useState<ModalNotice>(null);
  const [form, setForm] = useState<BroadcastForm>(() => emptyForm());

  const broadcastsQuery = useWhatsAppBroadcasts({
    q: query,
    status: filter === "ALL" ? null : filter,
    limit: 80,
  });

  const promotionsQuery = useWhatsAppPromotions({
    sent: null,
    limit: 80,
  });

  const createBroadcast = useCreateWhatsAppBroadcast();

  const broadcasts = broadcastsQuery.data || [];
  const visibleBroadcasts = broadcasts.slice(0, visibleLimit);
  const hasMoreBroadcasts = broadcasts.length > visibleBroadcasts.length;
  const promotions = promotionsQuery.data || [];

  const stats = useMemo(() => {
    const total = broadcasts.length;
    const sent = broadcasts.filter((item) => String(item.status || "").toUpperCase() === "SENT").length;
    const queued = broadcasts.filter((item) => String(item.status || "").toUpperCase() === "QUEUED").length;
    const failed = broadcasts.filter((item) => String(item.status || "").toUpperCase() === "FAILED").length;

    return { total, sent, queued, failed };
  }, [broadcasts]);

  function openCreateModal() {
    setModalNotice(null);
    setModalOpen(true);
  }

  function handleSearch(value: string) {
    setQuery(value);
    setVisibleLimit(LIST_PAGE_SIZE);
  }

  function handleFilter(nextFilter: "ALL" | "DRAFT" | "QUEUED" | "SENT" | "FAILED") {
    setFilter(nextFilter);
    setVisibleLimit(LIST_PAGE_SIZE);
  }

  function loadMoreBroadcasts() {
    setVisibleLimit((current) => current + LIST_PAGE_SIZE);
  }

  function updateForm(key: keyof BroadcastForm, value: string) {
    setModalNotice(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function closeCreateModal() {
    if (createBroadcast.isPending) return;

    setModalOpen(false);
    setModalNotice(null);
  }

  async function saveBroadcast() {
    setModalNotice(null);

    const promotionId = form.promotionId.trim();
    const templateName = form.templateName.trim();
    const languageCode = form.languageCode.trim() || "en_US";
    const selectedPromotion = promotions.find((promotion) => promotion.id === promotionId);

    if (!promotionId) {
      setModalNotice({
        tone: "amber",
        title: "Choose promotion",
        message: "Select the promotion this broadcast will send.",
      });
      return;
    }

    if (!templateName) {
      setModalNotice({
        tone: "amber",
        title: "Message format missing",
        message: "The WhatsApp message format needs setup before this broadcast can be created.",
      });
      return;
    }

    if (form.targetMode === "BRANCH_CUSTOMERS" && !activeBranchId) {
      setModalNotice({
        tone: "amber",
        title: "Choose selling location",
        message: "Choose the selling location before using this audience.",
      });
      return;
    }

    if (form.targetMode === "PRODUCT_BUYERS" && !selectedPromotion?.productId) {
      setModalNotice({
        tone: "amber",
        title: "Choose product promotion",
        message: "Product buyers audience needs a promotion connected to a product.",
      });
      return;
    }

    try {
      const result = await createBroadcast.mutateAsync({
        promotionId,
        templateName,
        languageCode,
        targeting: {
          mode: form.targetMode,
          branchId: form.targetMode === "BRANCH_CUSTOMERS" ? activeBranchId || null : null,
          productId:
            form.targetMode === "PRODUCT_BUYERS"
              ? selectedPromotion?.productId || null
              : null,
          customerIds: [],
        },
      });

      if (!result.broadcast?.id) {
        setModalNotice({
          tone: "red",
          title: "Broadcast not opened",
          message:
            "The broadcast was saved, but the app did not receive the broadcast record. Refresh and try again.",
        });
        await broadcastsQuery.refetch();
        return;
      }

      setModalOpen(false);
      setModalNotice(null);
      setForm(emptyForm());

      router.push(routes.whatsappBroadcast(result.broadcast.id) as never);
    } catch (error) {
      setModalNotice({
        tone: "red",
        title: "Broadcast not created",
        message: errorMessage(error),
      });
    }
  }

  return (
    <AppShell>
      {(palette) => (
        <View style={styles.stack}>
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
                onPress={() => router.push(routes.whatsapp as never)}
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

              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>
                  WhatsApp broadcasts
                </AppText>
                <AppText variant="title" color={palette.text}>
                  Send offers to customers
                </AppText>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  Choose a prepared promotion, select the audience, then review before sending.
                </AppText>
              </View>
            </View>

            <Pressable
              onPress={openCreateModal}
              style={({ pressed }) => [
                styles.openCreateButton,
                {
                  backgroundColor: ACCENT,
                  borderColor: ACCENT,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Ionicons name="add-outline" size={18} color="#06111F" />
              <AppText variant="label" color="#06111F" center>
                Create broadcast
              </AppText>
            </Pressable>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              label="Broadcasts"
              value={stats.total.toLocaleString()}
              icon="radio-outline"
              tone="cyan"
              palette={palette}
            />
            <StatCard
              label="Queued"
              value={stats.queued.toLocaleString()}
              icon="time-outline"
              tone="amber"
              palette={palette}
            />
            <StatCard
              label="Sent"
              value={stats.sent.toLocaleString()}
              icon="checkmark-done-outline"
              tone="green"
              palette={palette}
            />
            <StatCard
              label="Failed"
              value={stats.failed.toLocaleString()}
              icon="warning-outline"
              tone="red"
              palette={palette}
            />
          </View>

          <View
            style={[
              styles.controlPanel,
              {
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <View
              style={[
                styles.searchBox,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.stage,
                },
              ]}
            >
              <Ionicons name="search-outline" size={17} color={palette.soft} />
              <TextInput
                value={query}
                onChangeText={handleSearch}
                placeholder="Search broadcasts"
                placeholderTextColor={palette.soft}
                style={[styles.searchInput, { color: palette.text }]}
              />
            </View>

            <View style={styles.filterRow}>
              {(["ALL", "DRAFT", "QUEUED", "SENT", "FAILED"] as const).map((item) => {
                const active = filter === item;
                const spec = toneSpec(
                  item === "SENT"
                    ? "green"
                    : item === "QUEUED"
                      ? "amber"
                      : item === "FAILED"
                        ? "red"
                        : item === "DRAFT"
                          ? "slate"
                          : "cyan",
                  palette,
                );

                return (
                  <Pressable
                    key={item}
                    onPress={() => handleFilter(item)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      {
                        borderColor: active ? spec.border : palette.border,
                        backgroundColor: active ? spec.bg : palette.stage,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={active ? spec.fg : palette.soft}
                      style={styles.filterText}
                    >
                      {item === "ALL" ? "All" : item.charAt(0) + item.slice(1).toLowerCase()}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {broadcastsQuery.isLoading ? (
            <View style={styles.stack}>
              <Skeleton height={132} width="100%" />
              <Skeleton height={132} width="100%" />
              <Skeleton height={132} width="100%" />
            </View>
          ) : null}

          {!broadcastsQuery.isLoading && broadcastsQuery.isError ? (
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
                Broadcasts could not load
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                Refresh and try again.
              </AppText>

              <AsyncButton
                onPress={async () => {
                  await broadcastsQuery.refetch();
                }}
                variant="secondary"
              >
                Refresh
              </AsyncButton>
            </View>
          ) : null}

          {!broadcastsQuery.isLoading && !broadcastsQuery.isError && broadcasts.length === 0 ? (
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
                    borderColor: "rgba(34, 199, 244, 0.30)",
                    backgroundColor: "rgba(34, 199, 244, 0.12)",
                  },
                ]}
              >
                <Ionicons name="radio-outline" size={25} color={ACCENT} />
              </View>

              <AppText variant="subtitle" color={palette.text} center>
                No broadcasts yet
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                Create a promotion, then prepare a broadcast for the right customer audience.
              </AppText>

              <Pressable
                onPress={openCreateModal}
                style={({ pressed }) => [
                  styles.openCreateButton,
                  {
                    backgroundColor: ACCENT,
                    borderColor: ACCENT,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Ionicons name="add-outline" size={18} color="#06111F" />
                <AppText variant="label" color="#06111F" center>
                  Create first broadcast
                </AppText>
              </Pressable>
            </View>
          ) : null}

          {!broadcastsQuery.isLoading && broadcasts.length > 0 ? (
            <View style={styles.list}>
              {visibleBroadcasts.map((broadcast) => (
                <BroadcastCard
                  key={broadcast.id}
                  broadcast={broadcast}
                  palette={palette}
                  onPress={() => router.push(routes.whatsappBroadcast(broadcast.id) as never)}
                />
              ))}

              {hasMoreBroadcasts ? (
                <View style={styles.loadMoreWrap}>
                  <AsyncButton onPress={loadMoreBroadcasts} variant="secondary">
                    Load more broadcasts
                  </AsyncButton>
                </View>
              ) : null}
            </View>
          ) : null}

          <CreateBroadcastModal
            open={modalOpen}
            palette={palette}
            form={form}
            promotions={promotions}
            promotionsLoading={promotionsQuery.isLoading || promotionsQuery.isFetching}
            saving={createBroadcast.isPending}
            notice={modalNotice}
            onChange={updateForm}
            onClose={closeCreateModal}
            onSave={saveBroadcast}
          />
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

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  statCard: {
    flex: 1,
    minWidth: 145,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  controlPanel: {
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },

  searchBox: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Quicksand_600SemiBold",
    fontSize: 13,
    paddingVertical: 0,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  filterText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  list: {
    gap: 12,
  },

  loadMoreWrap: {
    alignItems: "center",
    paddingTop: 4,
  },

  broadcastCard: {
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  cardIcon: {
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

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  detailBox: {
    flex: 1,
    minWidth: 116,
    borderWidth: 1,
    padding: 10,
    gap: 5,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
    maxHeight: "92%",
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

  modalScroll: {
    maxHeight: 590,
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

  choiceList: {
    gap: 8,
  },

  promotionChoice: {
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  targetChoice: {
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  choiceIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  previewPanel: {
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },

  previewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  previewText: {
    lineHeight: 19,
  },

  previewAudience: {
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  previewAudienceText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  emptyMini: {
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
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

  openCreateButton: {
    minHeight: 54,
    width: "100%",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
});