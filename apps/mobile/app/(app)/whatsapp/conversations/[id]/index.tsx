import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../../../src/components/app/AppShell";
import { AppText } from "../../../../../src/components/ui/AppText";
import { AsyncButton } from "../../../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../../../src/components/ui/Skeleton";
import { routes } from "../../../../../src/constants/routes";
import {
  productQuantity,
  productSellPrice,
  useStockProducts,
} from "../../../../../src/features/stock/hooks";
import type { StockProduct } from "../../../../../src/features/stock/types";
import {
  conversationDisplayName,
  useCreateWhatsAppSaleDraft,
  useMarkWhatsAppConversationRead,
  useReplyToWhatsAppConversation,
  useUpdateWhatsAppConversationStatus,
  useWhatsAppConversationMessages,
} from "../../../../../src/features/whatsapp/hooks";
import type {
  WhatsAppConversation,
  WhatsAppMessage,
} from "../../../../../src/features/whatsapp/types";
import { useBranchStore } from "../../../../../src/store/branchStore";

const SALE_ACTION_BLUE = "#22C7F4";
const PRODUCT_PREVIEW_LIMIT = 5;
const PRODUCT_SEARCH_LIMIT = 8;

type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type DraftForm = {
  customerName: string;
  customerPhone: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  saleType: "CASH" | "CREDIT";
  dueDate: string;
};

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

function statusTone(status?: string | null): Tone {
  const key = String(status || "").toUpperCase();

  if (key === "OPEN") return "green";
  if (key === "CLOSED") return "slate";

  return "cyan";
}

function statusLabel(status?: string | null) {
  const key = String(status || "").toUpperCase();

  if (key === "OPEN") return "Open";
  if (key === "CLOSED") return "Closed";

  return "Open";
}

function initials(value: unknown) {
  const text = clean(value, "C");
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "C";
  const second = parts[1]?.[0] || "";

  return `${first}${second}`.toUpperCase();
}

function dateTime(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeOnly(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(value?: string | null) {
  if (!value) return "Conversation";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Conversation";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function emptyDraftForm(): DraftForm {
  return {
    customerName: "",
    customerPhone: "",
    productId: "",
    quantity: "1",
    unitPrice: "",
    saleType: "CASH",
    dueDate: "",
  };
}

function messageText(message: WhatsAppMessage) {
  return clean(message.textContent, "Media or unsupported message");
}

function isOutbound(message: WhatsAppMessage) {
  return String(message.direction || "").toUpperCase() === "OUTBOUND";
}

function groupMessagesByDay(messages: WhatsAppMessage[]) {
  const groups: Array<{ key: string; label: string; messages: WhatsAppMessage[] }> = [];

  messages.forEach((message) => {
    const key = dayLabel(message.createdAt);
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      existing.messages.push(message);
      return;
    }

    groups.push({ key, label: key, messages: [message] });
  });

  return groups;
}

function errorMessage(error: unknown) {
  const err = error as {
    code?: string;
    message?: string;
    response?: {
      data?: {
        code?: string;
        message?: string;
      };
    };
  };

  const code = String(err?.response?.data?.code || err?.code || "").toUpperCase();
  const message = String(err?.response?.data?.message || err?.message || "").toLowerCase();

  if (code === "INSUFFICIENT_STOCK" || message.includes("insufficient stock")) {
    return "This product does not have enough stock in the selected selling location.";
  }

  if (code === "BRANCH_REQUIRED" || message.includes("branch")) {
    return "Choose a selling location before preparing this WhatsApp sale.";
  }

  if (message.includes("subscription")) {
    return "Business access needs attention before this WhatsApp sale can be prepared.";
  }

  return err?.response?.data?.message || err?.message || "The action could not be completed. Please try again.";
}

function StatusPill({ status, palette }: { status?: string | null; palette: AppShellPalette }) {
  const tone = statusTone(status);
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: spec.solid }]} />
      <AppText variant="caption" color={spec.fg} style={styles.statusText}>
        {statusLabel(status)}
      </AppText>
    </View>
  );
}

function CustomerHeader({
  conversation,
  palette,
}: {
  conversation: WhatsAppConversation | null;
  palette: AppShellPalette;
}) {
  const name = conversationDisplayName(conversation);
  const phone = clean(conversation?.customer?.phone || conversation?.phone, "No phone");
  const unread = num(conversation?.unreadCount, 0);
  const updatedAt = dateTime(conversation?.updatedAt || conversation?.createdAt);

  return (
    <View style={[styles.customerCard, { borderColor: palette.borderStrong, backgroundColor: palette.panel }]}>
      <View style={styles.customerTopRow}>
        <View style={styles.customerIdentity}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing} />
            <View style={styles.avatarCore}>
              <AppText variant="label" color="#06111F">
                {initials(name)}
              </AppText>
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <View style={styles.heroLabelRow}>
              <View style={styles.whatsAppDot} />
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                WhatsApp customer
              </AppText>
            </View>
            <AppText variant="subtitle" color={palette.text} style={styles.customerName}>
              {name}
            </AppText>
            <AppText variant="caption" color={palette.soft} style={styles.cardText}>
              {phone}
            </AppText>
          </View>
        </View>

        <StatusPill status={conversation?.status} palette={palette} />
      </View>

      <View style={styles.customerMetaGrid}>
        <View style={[styles.customerMetaBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Messages
          </AppText>
          <AppText variant="label" color={palette.text}>
            {num(conversation?.messageCount, 0).toLocaleString()}
          </AppText>
        </View>

        <View style={[styles.customerMetaBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Unread
          </AppText>
          <AppText variant="label" color={unread > 0 ? toneSpec("amber", palette).fg : palette.text}>
            {unread.toLocaleString()}
          </AppText>
        </View>

        <View style={[styles.customerMetaBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Updated
          </AppText>
          <AppText variant="caption" color={palette.text}>
            {updatedAt}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  palette,
}: {
  message: WhatsAppMessage;
  palette: AppShellPalette;
}) {
  const outbound = isOutbound(message);
  const inboundSpec = toneSpec("slate", palette);
  const outboundSpec = toneSpec("green", palette);
  const bubbleBg = outbound ? "rgba(52, 211, 153, 0.16)" : palette.panel;
  const bubbleBorder = outbound ? outboundSpec.border : inboundSpec.border;

  return (
    <View style={[styles.messageRow, outbound ? styles.messageRowOutbound : styles.messageRowInbound]}>
      {!outbound ? (
        <View style={[styles.messageMiniAvatar, { backgroundColor: palette.panelStrong, borderColor: palette.border }]}>
          <Ionicons name="person-outline" size={13} color={palette.soft} />
        </View>
      ) : null}

      <View
        style={[
          styles.messageBubble,
          outbound ? styles.outboundBubble : styles.inboundBubble,
          { borderColor: bubbleBorder, backgroundColor: bubbleBg },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.messageTail,
            outbound ? styles.messageTailOutbound : styles.messageTailInbound,
            { backgroundColor: bubbleBg, borderColor: bubbleBorder },
          ]}
        />

        <AppText variant="body" color={palette.text} style={styles.messageText}>
          {messageText(message)}
        </AppText>

        <View style={styles.messageFooter}>
          <AppText variant="caption" color={outbound ? outboundSpec.fg : palette.soft} style={styles.messageTime}>
            {timeOnly(message.createdAt)}
          </AppText>
          {outbound ? <Ionicons name="checkmark-done-outline" size={15} color={outboundSpec.fg} /> : null}
        </View>
      </View>

      {outbound ? (
        <View style={[styles.messageMiniAvatar, { backgroundColor: outboundSpec.solid, borderColor: outboundSpec.border }]}>
          <Ionicons name="storefront-outline" size={13} color="#06111F" />
        </View>
      ) : null}
    </View>
  );
}

function StatusAction({
  label,
  icon,
  active,
  tone,
  palette,
  loading,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  tone: Tone;
  palette: AppShellPalette;
  loading: boolean;
  onPress: () => void;
}) {
  const spec = toneSpec(active ? tone : "slate", palette);

  return (
    <Pressable
      disabled={loading || active}
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusAction,
        {
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.stage,
          opacity: pressed || loading ? 0.72 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={15} color={active ? spec.fg : palette.soft} />
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.statusActionText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SalesAssistPanel({
  palette,
  conversation,
  onCreateDraft,
}: {
  palette: AppShellPalette;
  conversation: WhatsAppConversation | null;
  onCreateDraft: () => void;
}) {
  const name = conversationDisplayName(conversation);

  return (
    <View style={[styles.salesPanel, { borderColor: "rgba(34, 199, 244, 0.34)", backgroundColor: "rgba(34, 199, 244, 0.10)" }]}>
      <View style={styles.salesPanelTop}>
        <View style={[styles.salesPanelIcon, { backgroundColor: SALE_ACTION_BLUE }]}>
          <Ionicons name="receipt-outline" size={18} color="#06111F" />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="caption" color={SALE_ACTION_BLUE} style={styles.eyebrow}>
            Sale from chat
          </AppText>
          <AppText variant="label" color={palette.text}>
            Prepare a sale for {name}
          </AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            Select product, quantity, and payment terms without leaving the customer conversation.
          </AppText>
        </View>
      </View>

      <AsyncButton
        onPress={onCreateDraft}
        variant="primary"
        fullWidth
        style={[styles.salesPanelButton, styles.sameBlueButton]}
      >
        Create sale draft
      </AsyncButton>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  palette,
  keyboardType = "default",
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  palette: AppShellPalette;
  keyboardType?: "default" | "numeric" | "phone-pad";
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
        {label}
      </AppText>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.soft}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={[
          styles.input,
          {
            borderColor: palette.border,
            backgroundColor: palette.panel,
            color: palette.text,
          },
        ]}
      />
    </View>
  );
}

function ProductChoice({
  product,
  selected,
  palette,
  onPress,
}: {
  product: StockProduct;
  selected: boolean;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const spec = toneSpec(selected ? "green" : "slate", palette);
  const qty = productQuantity(product);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.productChoice,
        {
          borderColor: selected ? spec.border : palette.border,
          backgroundColor: selected ? spec.bg : palette.panel,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.productChoiceIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
        <Ionicons name={selected ? "checkmark-outline" : "cube-outline"} size={16} color={spec.fg} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {clean(product.name, "Product")}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {clean(product.brand || product.category || product.sku || product.serial, "No reference")}
        </AppText>
      </View>

      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <AppText variant="caption" color={qty > 0 ? toneSpec("green", palette).fg : toneSpec("red", palette).fg}>
          {qty.toLocaleString()} units
        </AppText>
        <AppText variant="caption" color={palette.text}>
          {money(productSellPrice(product))}
        </AppText>
      </View>
    </Pressable>
  );
}

function CreateDraftModal({
  open,
  palette,
  form,
  products,
  productsLoading,
  productQuery,
  saving,
  onChange,
  onProductQuery,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  form: DraftForm;
  products: StockProduct[];
  productsLoading: boolean;
  productQuery: string;
  saving: boolean;
  onChange: (key: keyof DraftForm, value: string) => void;
  onProductQuery: (value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const visibleProducts = productQuery.trim()
    ? products.slice(0, PRODUCT_SEARCH_LIMIT)
    : products.slice(0, PRODUCT_PREVIEW_LIMIT);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={SALE_ACTION_BLUE} style={styles.eyebrow}>
                WhatsApp sale draft
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Prepare sale from this chat
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Choose the product and confirm the selling terms before completing the sale.
              </AppText>
            </View>
            <Pressable onPress={onClose} disabled={saving} style={[styles.closeButton, { borderColor: palette.border }]}>
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Field
              label="Customer name"
              value={form.customerName}
              placeholder="Customer name"
              palette={palette}
              onChangeText={(value) => onChange("customerName", value)}
            />
            <Field
              label="Customer phone"
              value={form.customerPhone}
              placeholder="2507..."
              palette={palette}
              keyboardType="phone-pad"
              onChangeText={(value) => onChange("customerPhone", value)}
            />

            <View style={styles.twoFields}>
              <View style={styles.fieldHalf}>
                <Field
                  label="Quantity"
                  value={form.quantity}
                  placeholder="1"
                  palette={palette}
                  keyboardType="numeric"
                  onChangeText={(value) => onChange("quantity", value)}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Field
                  label="Unit price"
                  value={form.unitPrice}
                  placeholder="Selling price"
                  palette={palette}
                  keyboardType="numeric"
                  onChangeText={(value) => onChange("unitPrice", value)}
                />
              </View>
            </View>

            <View style={styles.choiceRow}>
              <Pressable
                onPress={() => onChange("saleType", "CASH")}
                style={[
                  styles.choiceChip,
                  {
                    borderColor: form.saleType === "CASH" ? toneSpec("green", palette).border : palette.border,
                    backgroundColor: form.saleType === "CASH" ? toneSpec("green", palette).bg : palette.panel,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={form.saleType === "CASH" ? toneSpec("green", palette).fg : palette.soft}
                  style={styles.filterText}
                >
                  Cash sale
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => onChange("saleType", "CREDIT")}
                style={[
                  styles.choiceChip,
                  {
                    borderColor: form.saleType === "CREDIT" ? toneSpec("amber", palette).border : palette.border,
                    backgroundColor: form.saleType === "CREDIT" ? toneSpec("amber", palette).bg : palette.panel,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={form.saleType === "CREDIT" ? toneSpec("amber", palette).fg : palette.soft}
                  style={styles.filterText}
                >
                  Credit sale
                </AppText>
              </Pressable>
            </View>

            {form.saleType === "CREDIT" ? (
              <Field
                label="Due date"
                value={form.dueDate}
                placeholder="YYYY-MM-DD"
                palette={palette}
                onChangeText={(value) => onChange("dueDate", value)}
              />
            ) : null}

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                Product
              </AppText>
              <View style={[styles.searchBox, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <Ionicons name="search-outline" size={17} color={palette.soft} />
                <TextInput
                  value={productQuery}
                  onChangeText={onProductQuery}
                  placeholder="Search product"
                  placeholderTextColor={palette.soft}
                  style={[styles.searchInput, { color: palette.text }]}
                />
              </View>

              <View style={styles.productList}>
                {productsLoading ? (
                  <>
                    <Skeleton height={72} width="100%" />
                    <Skeleton height={72} width="100%" />
                    <Skeleton height={72} width="100%" />
                  </>
                ) : null}

                {!productsLoading
                  ? visibleProducts.map((product) => (
                      <ProductChoice
                        key={product.id}
                        product={product}
                        selected={form.productId === product.id}
                        palette={palette}
                        onPress={() => {
                          onChange("productId", product.id);
                          if (!form.unitPrice) {
                            onChange("unitPrice", String(productSellPrice(product) || ""));
                          }
                        }}
                      />
                    ))
                  : null}

                {!productsLoading && !productQuery.trim() && products.length > PRODUCT_PREVIEW_LIMIT ? (
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Showing 5 products. Search to find more.
                  </AppText>
                ) : null}

                {!productsLoading && productQuery.trim() && visibleProducts.length === 0 ? (
                  <View style={[styles.noProductsPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                    <Ionicons name="search-outline" size={20} color={palette.soft} />
                    <AppText variant="caption" color={palette.soft} center>
                      No matching product found.
                    </AppText>
                  </View>
                ) : null}

                {!productsLoading && !productQuery.trim() && products.length === 0 ? (
                  <View style={[styles.noProductsPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                    <Ionicons name="cube-outline" size={20} color={palette.soft} />
                    <AppText variant="caption" color={palette.soft} center>
                      No products are available in this selling location.
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>
              Cancel
            </AsyncButton>
            <AsyncButton
              onPress={onSave}
              variant="primary"
              style={[styles.footerButton, styles.sameBlueButton]}
              disabled={saving || productsLoading}
            >
              {saving ? "Saving" : "Create draft"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WhatsAppConversationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = String(id || "");
  const { width, height } = useWindowDimensions();
  const layoutWidth = Math.min(width, 760);
  const compact = layoutWidth < 560;
  const chatScrollRef = useRef<ScrollView | null>(null);
  const chatBoardHeight = Math.max(380, Math.min(height * 0.58, compact ? 540 : 640));
  const activeBranchId = useBranchStore((state) => state.activeBranchId);

  const messagesQuery = useWhatsAppConversationMessages(conversationId);
  const markRead = useMarkWhatsAppConversationRead();
  const replyMutation = useReplyToWhatsAppConversation();
  const statusMutation = useUpdateWhatsAppConversationStatus();
  const createDraft = useCreateWhatsAppSaleDraft();

  const [reply, setReply] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [shouldLoadProducts, setShouldLoadProducts] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftForm, setDraftForm] = useState<DraftForm>(() => emptyDraftForm());

  const productsQuery = useStockProducts({
    branchId: activeBranchId,
    q: productQuery,
    filter: "all",
    sort: "newest",
    enabled: shouldLoadProducts && draftModalOpen && Boolean(activeBranchId),
  });

  const conversation = messagesQuery.data?.conversation || null;
  const messages = messagesQuery.data?.messages || [];
  const products = shouldLoadProducts && draftModalOpen ? productsQuery.data || [] : [];
  const isLoading = messagesQuery.isLoading;
  const statusLoading = statusMutation.isPending;

  useEffect(() => {
    if (!conversationId) return;
    markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!conversation) return;

    setDraftForm((current) => ({
      ...current,
      customerName: current.customerName || clean(conversation.customer?.name, ""),
      customerPhone: current.customerPhone || clean(conversation.customer?.phone || conversation.phone, ""),
    }));
  }, [conversation]);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      ),
    [messages],
  );

  const groupedMessages = useMemo(() => groupMessagesByDay(sortedMessages), [sortedMessages]);

  useEffect(() => {
    if (!draftModalOpen || !shouldLoadProducts || !activeBranchId) return;

    productsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, draftModalOpen, shouldLoadProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: false });
    }, 80);

    return () => clearTimeout(timer);
  }, [sortedMessages.length]);

  function updateDraftForm(key: keyof DraftForm, value: string) {
    setDraftForm((current) => ({ ...current, [key]: value }));
  }

  function openDraftModal() {
    if (!activeBranchId) {
      Alert.alert(
        "Choose selling location",
        "Choose the selling location before preparing a WhatsApp sale.",
      );
      return;
    }

    setShouldLoadProducts(true);
    setDraftModalOpen(true);
  }

  function closeDraftModal() {
    if (createDraft.isPending) return;

    setDraftModalOpen(false);
    setShouldLoadProducts(false);
    setProductQuery("");
  }

  async function refreshMessages(): Promise<void> {
    await messagesQuery.refetch();
  }

  async function sendReply(): Promise<void> {
    const text = reply.trim();

    if (!text) {
      Alert.alert("Add a reply", "Write the message before sending.");
      return;
    }

    try {
      await replyMutation.mutateAsync({ conversationId, text });
      setReply("");
      await messagesQuery.refetch();

      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    } catch (error) {
      Alert.alert("Reply could not be sent", errorMessage(error));
    }
  }

  async function changeStatus(status: "OPEN" | "CLOSED"): Promise<void> {
    try {
      await statusMutation.mutateAsync({ conversationId, status });
      await messagesQuery.refetch();
    } catch (error) {
      Alert.alert("Status could not be updated", errorMessage(error));
    }
  }

  async function saveDraft(): Promise<void> {
    if (!activeBranchId) {
      Alert.alert(
        "Choose selling location",
        "Choose the selling location before preparing this WhatsApp sale.",
      );
      return;
    }

    const qty = Number(draftForm.quantity);
    const price = draftForm.unitPrice.trim() ? Number(draftForm.unitPrice) : undefined;

    if (!draftForm.customerName.trim() || !draftForm.customerPhone.trim()) {
      Alert.alert("Check customer details", "Customer name and phone are required.");
      return;
    }

    if (!draftForm.productId) {
      Alert.alert("Choose product", "Select the product the customer wants.");
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      Alert.alert("Check quantity", "Quantity must be greater than 0.");
      return;
    }

    if (price !== undefined && (!Number.isFinite(price) || price <= 0)) {
      Alert.alert("Check price", "Unit price must be greater than 0.");
      return;
    }

    if (draftForm.saleType === "CREDIT" && draftForm.dueDate.trim()) {
      const due = new Date(draftForm.dueDate.trim());

      if (Number.isNaN(due.getTime())) {
        Alert.alert("Check due date", "Use YYYY-MM-DD format.");
        return;
      }
    }

    try {
      const result = await createDraft.mutateAsync({
        conversationId,
        payload: {
          branchId: activeBranchId,
          customer: {
            name: draftForm.customerName.trim(),
            phone: draftForm.customerPhone.trim(),
          },
          saleType: draftForm.saleType,
          dueDate: draftForm.saleType === "CREDIT" ? draftForm.dueDate.trim() || null : null,
          items: [
            {
              productId: draftForm.productId,
              quantity: qty,
              unitPrice: price,
            },
          ],
        },
      });

      setDraftModalOpen(false);
      setShouldLoadProducts(false);
      setDraftForm(emptyDraftForm());
      setProductQuery("");

      if (result.draft?.id) {
        router.push(routes.whatsappDraft(result.draft.id) as never);
      }
    } catch (error) {
      Alert.alert("Draft could not be created", errorMessage(error));
    }
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <Skeleton height={58} width="100%" />
            <Skeleton height={128} width="100%" />
            <Skeleton height={460} width="100%" />
          </View>
        ) : (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <View style={[styles.topBar, { borderColor: palette.border, backgroundColor: palette.panel }]}>
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

              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="caption" color={SALE_ACTION_BLUE} style={styles.eyebrow}>
                  WhatsApp conversation
                </AppText>
                <AppText variant="subtitle" color={palette.text}>
                  {conversationDisplayName(conversation)}
                </AppText>
              </View>

              <StatusPill status={conversation?.status} palette={palette} />
            </View>

            <CustomerHeader conversation={conversation} palette={palette} />

            <View style={[styles.chatShell, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <View style={[styles.chatHeader, { borderBottomColor: palette.border }]}>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <AppText variant="caption" color={SALE_ACTION_BLUE} style={styles.eyebrow}>
                    Live sales chat
                  </AppText>
                  <AppText variant="subtitle" color={palette.text}>
                    Reply like a real conversation.
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Keep the customer moving from question to order without losing the chat context.
                  </AppText>
                </View>

                {!compact ? (
                  <AsyncButton
                    onPress={openDraftModal}
                    variant="primary"
                    style={[styles.headerDraftButton, styles.sameBlueButton]}
                  >
                    Create sale
                  </AsyncButton>
                ) : null}
              </View>

              <View style={styles.statusActionsRow}>
                <StatusAction
                  label="Open"
                  icon="chatbubble-ellipses-outline"
                  active={String(conversation?.status || "").toUpperCase() === "OPEN"}
                  tone="green"
                  palette={palette}
                  loading={statusLoading}
                  onPress={() => changeStatus("OPEN")}
                />

                <StatusAction
                  label="Close"
                  icon="checkmark-done-outline"
                  active={String(conversation?.status || "").toUpperCase() === "CLOSED"}
                  tone="slate"
                  palette={palette}
                  loading={statusLoading}
                  onPress={() => changeStatus("CLOSED")}
                />
              </View>

              <SalesAssistPanel
                palette={palette}
                conversation={conversation}
                onCreateDraft={openDraftModal}
              />

              <View
                style={[
                  styles.chatBoard,
                  {
                    height: chatBoardHeight,
                    borderColor: palette.border,
                    backgroundColor: palette.stage,
                  },
                ]}
              >
                {messagesQuery.isError ? (
                  <View style={styles.chatEmptyState}>
                    <Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} />
                    <AppText variant="subtitle" color={palette.text} center>
                      Messages could not load
                    </AppText>
                    <AsyncButton onPress={refreshMessages} variant="secondary">
                      Try again
                    </AsyncButton>
                  </View>
                ) : sortedMessages.length === 0 ? (
                  <View style={styles.chatEmptyState}>
                    <Ionicons name="chatbubble-outline" size={32} color={toneSpec("green", palette).fg} />
                    <AppText variant="subtitle" color={palette.text} center>
                      No messages yet
                    </AppText>
                    <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                      This conversation is ready for customer follow-up.
                    </AppText>
                  </View>
                ) : (
                  <ScrollView
                    ref={chatScrollRef}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    style={styles.messagesScroller}
                    contentContainerStyle={styles.messagesContent}
                  >
                    <View style={styles.chatTimeline}>
                      {groupedMessages.map((group) => (
                        <View key={group.key} style={styles.dayGroup}>
                          <View style={[styles.dayPill, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                            <AppText variant="caption" color={palette.soft} style={styles.dayText}>
                              {group.label}
                            </AppText>
                          </View>

                          {group.messages.map((message) => (
                            <MessageBubble key={message.id} message={message} palette={palette} />
                          ))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>

              <View style={[styles.composerWrap, { borderColor: palette.border, backgroundColor: palette.stage }]}>
                <View style={[styles.composerInputWrap, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                  <TextInput
                    value={reply}
                    onChangeText={setReply}
                    placeholder="Message customer..."
                    placeholderTextColor={palette.soft}
                    multiline
                    style={[styles.composerInput, { color: palette.text }]}
                  />
                </View>

                <Pressable
                  onPress={sendReply}
                  disabled={replyMutation.isPending}
                  style={({ pressed }) => [
                    styles.sendButton,
                    {
                      backgroundColor: SALE_ACTION_BLUE,
                      opacity: pressed || replyMutation.isPending ? 0.76 : 1,
                    },
                  ]}
                >
                  <Ionicons name={replyMutation.isPending ? "hourglass-outline" : "send-outline"} size={19} color="#06111F" />
                </Pressable>
              </View>

              <View style={styles.composerFooter}>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  Replies are recorded in the customer conversation.
                </AppText>
                <Pressable onPress={openDraftModal} style={styles.footerDraftLink}>
                  <Ionicons name="receipt-outline" size={14} color={SALE_ACTION_BLUE} />
                  <AppText variant="caption" color={SALE_ACTION_BLUE} style={styles.footerDraftText}>
                    Prepare sale
                  </AppText>
                </Pressable>
              </View>
            </View>

            <CreateDraftModal
              open={draftModalOpen}
              palette={palette}
              form={draftForm}
              products={products}
              productsLoading={shouldLoadProducts && draftModalOpen && (productsQuery.isLoading || productsQuery.isFetching)}
              productQuery={productQuery}
              saving={createDraft.isPending}
              onChange={updateDraftForm}
              onProductQuery={setProductQuery}
              onClose={closeDraftModal}
              onSave={saveDraft}
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

  screenBottomSpace: {
    paddingBottom: 30,
  },

  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  cardText: {
    flexShrink: 1,
    lineHeight: 18,
  },

  sameBlueButton: {
    backgroundColor: SALE_ACTION_BLUE,
    borderColor: SALE_ACTION_BLUE,
  },

  topBar: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
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
    paddingHorizontal: 9,
    paddingVertical: 7,
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

  customerCard: {
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },

  customerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  customerIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatarWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(52, 211, 153, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.34)",
  },

  avatarCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  whatsAppDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#25D366",
  },

  customerName: {
    lineHeight: 23,
  },

  customerMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  customerMetaBox: {
    flex: 1,
    minWidth: 145,
    borderWidth: 1,
    padding: 10,
    gap: 5,
  },

  chatShell: {
    borderWidth: 1,
    overflow: "hidden",
  },

  chatHeader: {
    padding: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  headerDraftButton: {
    minHeight: 42,
    paddingHorizontal: 14,
  },

  statusActionsRow: {
    paddingHorizontal: 14,
    paddingTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  statusAction: {
    minHeight: 40,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexGrow: 1,
  },

  statusActionText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  salesPanel: {
    margin: 14,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },

  salesPanelTop: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  salesPanelIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  salesPanelButton: {
    minHeight: 42,
  },

  chatBoard: {
    marginHorizontal: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  messagesScroller: {
    flex: 1,
  },

  messagesContent: {
    padding: 13,
    paddingBottom: 18,
  },

  chatTimeline: {
    gap: 16,
  },

  dayGroup: {
    gap: 10,
  },

  dayPill: {
    alignSelf: "center",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  dayText: {
    fontSize: 10,
    letterSpacing: 0.3,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
  },

  messageRowInbound: {
    justifyContent: "flex-start",
  },

  messageRowOutbound: {
    justifyContent: "flex-end",
  },

  messageMiniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  messageBubble: {
    maxWidth: "78%",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 7,
    gap: 7,
    position: "relative",
  },

  inboundBubble: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
  },

  outboundBubble: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
  },

  messageTail: {
    position: "absolute",
    top: 8,
    width: 10,
    height: 10,
    borderWidth: 1,
    transform: [{ rotate: "45deg" }],
  },

  messageTailInbound: {
    left: -5,
  },

  messageTailOutbound: {
    right: -5,
  },

  messageText: {
    lineHeight: 21,
  },

  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
  },

  messageTime: {
    fontSize: 10,
  },

  chatEmptyState: {
    minHeight: 310,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 22,
  },

  composerWrap: {
    margin: 14,
    marginBottom: 8,
    borderWidth: 1,
    padding: 9,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
  },

  composerInputWrap: {
    flex: 1,
    minHeight: 50,
    maxHeight: 132,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },

  composerInput: {
    minHeight: 30,
    maxHeight: 108,
    padding: 0,
    fontFamily: "Quicksand_600SemiBold",
    fontSize: 14,
    textAlignVertical: "top",
  },

  sendButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  composerFooter: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  footerDraftLink: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  footerDraftText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
    maxHeight: 560,
  },

  modalBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },

  twoFields: {
    flexDirection: "row",
    gap: 10,
  },

  fieldHalf: {
    flex: 1,
    minWidth: 0,
  },

  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  choiceChip: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  filterText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
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

  productList: {
    gap: 8,
  },

  productChoice: {
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  productChoiceIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  noProductsPanel: {
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
});