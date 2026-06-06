import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  broadcastStatusLabel,
  conversationDisplayName,
  conversationPreview,
  draftCustomerName,
  promotionStatusLabel,
  useWhatsAppBroadcasts,
  useWhatsAppConversations,
  useWhatsAppPromotions,
  useWhatsAppSaleDrafts,
} from "../../../src/features/whatsapp/hooks";
import type {
  WhatsAppConversation,
  WhatsAppConversationStatus,
  WhatsAppSaleDraft,
} from "../../../src/features/whatsapp/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const CONVERSATION_PREVIEW_LIMIT = 3;
const DRAFT_PREVIEW_LIMIT = 2;
const WHATSAPP_BLUE = "#22C7F4";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";
type StatusFilter = "ALL" | "OPEN" | "UNREAD" | "CLOSED";

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: unknown) {
  return `RWF ${Math.round(num(value)).toLocaleString()}`;
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
      fg: WHATSAPP_BLUE,
      bg: "rgba(34, 199, 244, 0.11)",
      border: "rgba(34, 199, 244, 0.30)",
      solid: WHATSAPP_BLUE,
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

function statusTone(status?: WhatsAppConversationStatus | null): Tone {
  const key = String(status || "").toUpperCase();

  if (key === "OPEN") return "green";
  if (key === "CLOSED") return "slate";
  if (key === "PENDING") return "amber";

  return "cyan";
}

function statusLabel(status?: WhatsAppConversationStatus | null) {
  const key = String(status || "").toUpperCase();

  if (key === "OPEN") return "Open";
  if (key === "CLOSED") return "Closed";
  if (key === "PENDING") return "Review";

  return key || "Conversation";
}

function dateLabel(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeLabel(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(value: unknown) {
  const text = clean(value, "C");
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "C";
  const second = parts[1]?.[0] || "";

  return `${first}${second}`.toUpperCase();
}

function getColumns(width: number) {
  if (width >= 760) return 4;
  if (width >= 430) return 2;
  return 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function SummaryCard({
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
  icon: IoniconName;
  tone: Tone;
  palette: AppShellPalette;
  width: DimensionValue;
}) {
  const spec = toneSpec(tone, palette);

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
        <View style={[styles.summaryIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
          <Ionicons name={icon} size={16} color={spec.fg} />
        </View>

        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
          {label}
        </AppText>
      </View>

      <AppText variant="subtitle" color={palette.text}>
        {value}
      </AppText>

      <AppText variant="caption" color={palette.soft} style={styles.cardText}>
        {helper}
      </AppText>
    </View>
  );
}

function FilterChip({
  label,
  active,
  tone,
  palette,
  onPress,
}: {
  label: string;
  active: boolean;
  tone: Tone;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.filterText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function ScreenSkeleton({ layoutWidth }: { layoutWidth: number }) {
  const cardWidth = widthForColumns(getColumns(layoutWidth));

  return (
    <View style={styles.stack}>
      <Skeleton height={92} width="100%" />

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ width: cardWidth }}>
            <Skeleton height={112} width="100%" />
          </View>
        ))}
      </View>

      <Skeleton height={106} width="100%" />
      <Skeleton height={86} width="100%" />

      {[1, 2, 3].map((item) => (
        <Skeleton key={item} height={138} width="100%" />
      ))}
    </View>
  );
}

function BusinessToolCard({
  title,
  subtitle,
  value,
  helper,
  icon,
  tone,
  palette,
  onPress,
}: {
  title: string;
  subtitle: string;
  value: string;
  helper: string;
  icon: IoniconName;
  tone: Tone;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(tone, palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.businessToolCard,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={styles.businessToolTop}>
        <View
          style={[
            styles.businessToolIcon,
            {
              borderColor: spec.border,
              backgroundColor: palette.stage,
            },
          ]}
        >
          <Ionicons name={icon} size={19} color={spec.fg} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="caption" color={spec.fg} style={styles.eyebrow}>
            {subtitle}
          </AppText>
          <AppText variant="subtitle" color={palette.text}>
            {title}
          </AppText>
        </View>

        <Ionicons name="chevron-forward-outline" size={18} color={spec.fg} />
      </View>

      <View style={styles.businessToolBottom}>
        <View
          style={[
            styles.businessToolMetric,
            {
              borderColor: spec.border,
              backgroundColor: palette.stage,
            },
          ]}
        >
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Records
          </AppText>
          <AppText variant="label" color={palette.text}>
            {value}
          </AppText>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            {helper}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

function ConversationCard({
  conversation,
  palette,
  onPress,
}: {
  conversation: WhatsAppConversation;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const tone = statusTone(conversation.status);
  const spec = toneSpec(tone, palette);
  const unread = num(conversation.unreadCount, 0);
  const name = conversationDisplayName(conversation);
  const lastDate = conversation.updatedAt || conversation.createdAt;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.conversationCard,
        {
          borderColor: unread > 0 ? toneSpec("amber", palette).border : palette.border,
          backgroundColor: unread > 0 ? toneSpec("amber", palette).bg : palette.panel,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.conversationTop}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCore, { backgroundColor: unread > 0 ? "#FBBF24" : WHATSAPP_BLUE }]}>
            <AppText variant="label" color="#06111F">
              {initials(name)}
            </AppText>
          </View>

          <View style={[styles.whatsappMini, { backgroundColor: "#25D366" }]}>
            <Ionicons name="logo-whatsapp" size={11} color="#06111F" />
          </View>
        </View>

        <View style={styles.conversationMain}>
          <View style={styles.conversationTitleRow}>
            <AppText variant="label" color={palette.text} style={styles.recordTitle} numberOfLines={1}>
              {name}
            </AppText>

            <AppText variant="caption" color={palette.soft}>
              {timeLabel(lastDate)}
            </AppText>
          </View>

          <AppText variant="caption" color={palette.soft} style={styles.phoneText} numberOfLines={1}>
            {clean(conversation.phone, "No phone")}
          </AppText>

          <AppText variant="caption" color={palette.text} style={styles.previewText} numberOfLines={2}>
            {conversationPreview(conversation)}
          </AppText>
        </View>

        <View style={styles.conversationRight}>
          {unread > 0 ? (
            <View style={styles.unreadBadge}>
              <AppText variant="caption" color="#06111F" style={styles.unreadText}>
                {unread > 99 ? "99+" : unread.toLocaleString()}
              </AppText>
            </View>
          ) : null}

          <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}>
            <AppText variant="caption" color={spec.fg} style={styles.statusText}>
              {statusLabel(conversation.status)}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.conversationFooter}>
        <View style={styles.footerMeta}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={palette.soft} />
          <AppText variant="caption" color={palette.soft}>
            Updated {dateLabel(lastDate)}
          </AppText>
        </View>

        <View style={styles.openLink}>
          <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.openText}>
            Open chat
          </AppText>
          <Ionicons name="chevron-forward-outline" size={14} color={WHATSAPP_BLUE} />
        </View>
      </View>
    </Pressable>
  );
}

function DraftCard({
  draft,
  palette,
  onPress,
}: {
  draft: WhatsAppSaleDraft;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const balance = num(draft.balanceDue, 0);
  const tone: Tone = balance > 0 ? "amber" : "green";
  const spec = toneSpec(tone, palette);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recordCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.recordHeader}>
        <View style={[styles.recordIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
          <Ionicons name="receipt-outline" size={17} color={spec.fg} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="label" color={palette.text} style={styles.recordTitle} numberOfLines={1}>
            {draftCustomerName(draft)}
          </AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            {(draft.items || []).length} item(s)
          </AppText>
        </View>

        <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}>
          <AppText variant="caption" color={spec.fg} style={styles.statusText}>
            {clean(draft.saleType, "Draft")}
          </AppText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Total
          </AppText>
          <AppText variant="label" color={palette.text}>
            {money(draft.total)}
          </AppText>
        </View>

        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Balance
          </AppText>
          <AppText variant="label" color={balance > 0 ? toneSpec("amber", palette).fg : palette.text}>
            {money(balance)}
          </AppText>
        </View>
      </View>

      <AsyncButton onPress={onPress} variant="secondary" fullWidth style={styles.cardButton}>
        Open sale draft
      </AsyncButton>
    </Pressable>
  );
}

export default function WhatsAppSalesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(width, 760);
  const compact = layoutWidth < 560;

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [showAllConversations, setShowAllConversations] = useState(false);
  const [showAllDrafts, setShowAllDrafts] = useState(false);

  const conversationsQuery = useWhatsAppConversations();
  const draftsQuery = useWhatsAppSaleDrafts(activeBranchId);
  const promotionsQuery = useWhatsAppPromotions({ limit: 40 });
  const broadcastsQuery = useWhatsAppBroadcasts({ limit: 40 });

  const conversations = conversationsQuery.data || [];
  const drafts = draftsQuery.data || [];
  const promotions = promotionsQuery.data || [];
  const broadcasts = broadcastsQuery.data || [];

  const isLoading =
    isHydrating ||
    !user ||
    !tenant ||
    conversationsQuery.isLoading ||
    draftsQuery.isLoading;

  const isRefreshing =
    conversationsQuery.isFetching ||
    draftsQuery.isFetching ||
    promotionsQuery.isFetching ||
    broadcastsQuery.isFetching;

  const summaryWidth = widthForColumns(getColumns(layoutWidth));

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const conversationStatus = String(conversation.status || "").toUpperCase();
      const unread = num(conversation.unreadCount, 0);

      const matchesStatus =
        status === "ALL" ||
        (status === "UNREAD" && unread > 0) ||
        conversationStatus === status;

      const customer = conversationDisplayName(conversation).toLowerCase();
      const phone = String(conversation.phone || "").toLowerCase();
      const preview = conversationPreview(conversation).toLowerCase();

      const matchesQuery =
        !q ||
        customer.includes(q) ||
        phone.includes(q) ||
        preview.includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [conversations, query, status]);

  const openConversations = conversations.filter(
    (conversation) => String(conversation.status || "").toUpperCase() === "OPEN",
  ).length;

  const unreadConversations = conversations.filter(
    (conversation) => num(conversation.unreadCount, 0) > 0,
  ).length;

  const closedConversations = conversations.filter(
    (conversation) => String(conversation.status || "").toUpperCase() === "CLOSED",
  ).length;

  const readyDrafts = drafts.filter(
    (draft) => num(draft.total, 0) > 0 && (draft.items || []).length > 0,
  ).length;

  const sentPromotions = promotions.filter(
    (promotion) => promotionStatusLabel(promotion) === "Sent",
  ).length;

  const sentBroadcasts = broadcasts.filter(
    (broadcast) => broadcastStatusLabel(broadcast) === "Sent",
  ).length;

  const queuedBroadcasts = broadcasts.filter(
    (broadcast) => broadcastStatusLabel(broadcast) === "Queued",
  ).length;

  const visibleConversations = showAllConversations
    ? filteredConversations
    : filteredConversations.slice(0, CONVERSATION_PREVIEW_LIMIT);

  const visibleDrafts = showAllDrafts
    ? drafts
    : drafts.slice(0, DRAFT_PREVIEW_LIMIT);

  async function refreshAll(): Promise<void> {
    await Promise.all([
      conversationsQuery.refetch(),
      draftsQuery.refetch(),
      promotionsQuery.refetch(),
      broadcastsQuery.refetch(),
    ]);
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <ScreenSkeleton layoutWidth={layoutWidth} />
        ) : (
          <View style={styles.stack}>
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
                  <Ionicons name="logo-whatsapp" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />
                    <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.eyebrow}>
                      WhatsApp operations
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Sell, promote, and broadcast from WhatsApp.
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Control customer chats, sale drafts, promotions, and broadcasts for {clean(activeBranch?.name, "the current selling location")}.
                  </AppText>
                </View>

                {!compact ? (
                  <AsyncButton onPress={refreshAll} variant="secondary" style={styles.heroButton}>
                    {isRefreshing ? "Refreshing" : "Refresh"}
                  </AsyncButton>
                ) : null}
              </View>

              {compact ? (
                <AsyncButton onPress={refreshAll} variant="secondary" fullWidth>
                  {isRefreshing ? "Refreshing" : "Refresh"}
                </AsyncButton>
              ) : null}
            </View>

            <View style={styles.responsiveGrid}>
              <SummaryCard
                label="Open chats"
                value={String(openConversations)}
                helper="Customer conversations"
                icon="chatbubbles-outline"
                tone="green"
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Unread"
                value={String(unreadConversations)}
                helper="Needs attention"
                icon="notifications-outline"
                tone={unreadConversations > 0 ? "amber" : "slate"}
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Sale drafts"
                value={String(readyDrafts)}
                helper="Ready to complete"
                icon="receipt-outline"
                tone={readyDrafts > 0 ? "cyan" : "slate"}
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Broadcasts"
                value={String(broadcasts.length)}
                helper={queuedBroadcasts > 0 ? `${queuedBroadcasts} queued` : `${sentBroadcasts} sent`}
                icon="radio-outline"
                tone={queuedBroadcasts > 0 ? "amber" : broadcasts.length > 0 ? "blue" : "slate"}
                palette={palette}
                width={summaryWidth}
              />
            </View>

            <View style={styles.businessToolsGrid}>
              <BusinessToolCard
                title="Promotions"
                subtitle="Customer offers"
                value={promotions.length.toLocaleString()}
                helper={`${sentPromotions.toLocaleString()} sent offer${sentPromotions === 1 ? "" : "s"}. Prepare product or store-wide messages before broadcasting.`}
                icon="megaphone-outline"
                tone="blue"
                palette={palette}
                onPress={() => router.push(routes.whatsappPromotions as never)}
              />

              <BusinessToolCard
                title="Broadcasts"
                subtitle="Audience sending"
                value={broadcasts.length.toLocaleString()}
                helper={`${sentBroadcasts.toLocaleString()} sent broadcast${sentBroadcasts === 1 ? "" : "s"}. Choose the audience and send WhatsApp offers safely.`}
                icon="send-outline"
                tone="green"
                palette={palette}
                onPress={() => router.push(routes.whatsappBroadcasts as never)}
              />
            </View>

            <View style={[styles.searchPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <View style={[styles.searchBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
                <Ionicons name="search-outline" size={17} color={palette.soft} />
                <TextInput
                  value={query}
                  onChangeText={(value) => {
                    setQuery(value);
                    setShowAllConversations(false);
                  }}
                  placeholder="Search customer, phone, or message"
                  placeholderTextColor={palette.soft}
                  style={[styles.searchInput, { color: palette.text }]}
                />
              </View>

              <View style={styles.filterRow}>
                <FilterChip
                  label="All"
                  active={status === "ALL"}
                  tone="cyan"
                  palette={palette}
                  onPress={() => {
                    setStatus("ALL");
                    setShowAllConversations(false);
                  }}
                />
                <FilterChip
                  label="Open"
                  active={status === "OPEN"}
                  tone="green"
                  palette={palette}
                  onPress={() => {
                    setStatus("OPEN");
                    setShowAllConversations(false);
                  }}
                />
                <FilterChip
                  label="Unread"
                  active={status === "UNREAD"}
                  tone="amber"
                  palette={palette}
                  onPress={() => {
                    setStatus("UNREAD");
                    setShowAllConversations(false);
                  }}
                />
                <FilterChip
                  label="Closed"
                  active={status === "CLOSED"}
                  tone="slate"
                  palette={palette}
                  onPress={() => {
                    setStatus("CLOSED");
                    setShowAllConversations(false);
                  }}
                />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={WHATSAPP_BLUE} style={styles.eyebrow}>
                  Customer conversations
                </AppText>
                <AppText variant="subtitle" color={palette.text}>
                  Inbox control
                </AppText>
              </View>

              <AppText variant="caption" color={palette.soft}>
                {visibleConversations.length} of {filteredConversations.length} shown
              </AppText>
            </View>

            {conversationsQuery.isError ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} />
                <AppText variant="subtitle" color={palette.text} center>
                  WhatsApp conversations could not load
                </AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                  Check the connection and refresh this screen.
                </AppText>
                <AsyncButton onPress={refreshAll} variant="secondary">
                  Try again
                </AsyncButton>
              </View>
            ) : filteredConversations.length === 0 ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <Ionicons name="logo-whatsapp" size={32} color={WHATSAPP_BLUE} />
                <AppText variant="subtitle" color={palette.text} center>
                  No conversations found
                </AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                  No customer conversations match the current search and filters.
                </AppText>
              </View>
            ) : (
              <>
                <View style={styles.recordList}>
                  {visibleConversations.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      palette={palette}
                      onPress={() => router.push(routes.whatsappConversation(conversation.id) as never)}
                    />
                  ))}
                </View>

                {filteredConversations.length > CONVERSATION_PREVIEW_LIMIT ? (
                  <View style={styles.showMoreWrap}>
                    <AsyncButton
                      onPress={() => setShowAllConversations((current) => !current)}
                      variant="secondary"
                    >
                      {showAllConversations ? "Show fewer conversations" : "View more conversations"}
                    </AsyncButton>
                  </View>
                ) : null}
              </>
            )}

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={toneSpec("green", palette).fg} style={styles.eyebrow}>
                  Sale drafts
                </AppText>
                <AppText variant="subtitle" color={palette.text}>
                  WhatsApp sales to complete
                </AppText>
              </View>

              <AppText variant="caption" color={palette.soft}>
                {visibleDrafts.length} of {drafts.length} shown
              </AppText>
            </View>

            {draftsQuery.isError ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} />
                <AppText variant="subtitle" color={palette.text} center>
                  Sale drafts could not load
                </AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                  Refresh this screen and try again.
                </AppText>
              </View>
            ) : drafts.length === 0 ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <Ionicons name="receipt-outline" size={32} color={WHATSAPP_BLUE} />
                <AppText variant="subtitle" color={palette.text} center>
                  No WhatsApp sale drafts
                </AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                  Open a customer conversation to prepare a WhatsApp sale.
                </AppText>
              </View>
            ) : (
              <>
                <View style={styles.recordList}>
                  {visibleDrafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      palette={palette}
                      onPress={() => router.push(routes.whatsappDraft(draft.id) as never)}
                    />
                  ))}
                </View>

                {drafts.length > DRAFT_PREVIEW_LIMIT ? (
                  <View style={styles.showMoreWrap}>
                    <AsyncButton
                      onPress={() => setShowAllDrafts((current) => !current)}
                      variant="secondary"
                    >
                      {showAllDrafts ? "Show fewer drafts" : "View more drafts"}
                    </AsyncButton>
                  </View>
                ) : null}
              </>
            )}
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
    backgroundColor: WHATSAPP_BLUE,
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
    backgroundColor: WHATSAPP_BLUE,
  },

  heroTitle: {
    lineHeight: 24,
  },

  heroButton: {
    minHeight: 44,
    paddingHorizontal: 16,
  },

  responsiveGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    minHeight: 112,
    borderWidth: 1,
    padding: 13,
    gap: 8,
  },

  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  summaryIcon: {
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

  businessToolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  businessToolCard: {
    flex: 1,
    minWidth: 180,
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  businessToolTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  businessToolIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  businessToolBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  businessToolMetric: {
    minWidth: 86,
    borderWidth: 1,
    padding: 9,
    gap: 4,
  },

  searchPanel: {
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

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },

  recordList: {
    gap: 10,
  },

  conversationCard: {
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  conversationTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  avatarWrap: {
    width: 44,
    height: 44,
    position: "relative",
  },

  avatarCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  whatsappMini: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  conversationMain: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },

  conversationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  phoneText: {
    lineHeight: 16,
  },

  previewText: {
    lineHeight: 18,
  },

  conversationRight: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 7,
  },

  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBBF24",
  },

  unreadText: {
    fontSize: 10,
    fontFamily: "Quicksand_800ExtraBold",
  },

  conversationFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  footerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },

  openLink: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  openText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  recordCard: {
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  recordHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  recordIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  recordTitle: {
    lineHeight: 18,
  },

  statusPill: {
    flexShrink: 0,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  infoGrid: {
    flexDirection: "row",
    gap: 8,
  },

  infoBox: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    gap: 5,
  },

  cardButton: {
    minHeight: 48,
  },

  emptyPanel: {
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },

  showMoreWrap: {
    alignItems: "center",
    paddingTop: 4,
  },
});