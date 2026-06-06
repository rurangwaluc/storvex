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
  productQuantity,
  productSellPrice,
  useStockProducts,
} from "../../../../src/features/stock/hooks";
import type { StockProduct } from "../../../../src/features/stock/types";
import {
  promotionStatusLabel,
  useCreateWhatsAppPromotion,
  useWhatsAppPromotions,
} from "../../../../src/features/whatsapp/hooks";
import type { WhatsAppPromotion } from "../../../../src/features/whatsapp/types";
import { useBranchStore } from "../../../../src/store/branchStore";

const ACCENT = "#22C7F4";
const GREEN = "#34D399";
const AMBER = "#FBBF24";
const RED = "#FB7185";
const LIST_PAGE_SIZE = 3;

type PromotionForm = {
  title: string;
  message: string;
  productId: string;
};

type Notice = {
  tone: "green" | "amber" | "red" | "cyan";
  title: string;
  text: string;
} | null;

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

  if (code === "TITLE_REQUIRED") return "Add a clear promotion title.";
  if (code === "MESSAGE_REQUIRED") return "Write the message customers will receive.";
  if (code === "PRODUCT_NOT_FOUND") return "The selected product could not be found.";

  return (
    err?.response?.data?.message ||
    err?.message ||
    "The promotion could not be saved. Please try again."
  );
}

function emptyForm(): PromotionForm {
  return {
    title: "",
    message: "",
    productId: "",
  };
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
          name={notice.tone === "red" ? "warning-outline" : "information-circle-outline"}
          size={17}
          color="#06111F"
        />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {notice.title}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {notice.text}
        </AppText>
      </View>

      <Pressable onPress={onClose} style={[styles.noticeClose, { borderColor: spec.border }]}>
        <Ionicons name="close-outline" size={18} color={spec.fg} />
      </Pressable>
    </View>
  );
}

function StatusPill({
  promotion,
  palette,
}: {
  promotion: WhatsAppPromotion;
  palette: AppShellPalette;
}) {
  const isSent = Boolean(promotion.sentAt);
  const spec = toneSpec(isSent ? "green" : "amber", palette);

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
        {promotionStatusLabel(promotion)}
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
  tone: "cyan" | "green" | "amber" | "slate";
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
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.productIcon,
          {
            borderColor: spec.border,
            backgroundColor: spec.bg,
          },
        ]}
      >
        <Ionicons
          name={selected ? "checkmark-outline" : "cube-outline"}
          size={16}
          color={spec.fg}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label" color={palette.text} numberOfLines={1}>
          {clean(product.name, "Product")}
        </AppText>
        <AppText variant="caption" color={palette.soft} numberOfLines={1}>
          {clean(product.brand || product.category || product.sku || product.serial, "No reference")}
        </AppText>
      </View>

      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <AppText
          variant="caption"
          color={qty > 0 ? toneSpec("green", palette).fg : toneSpec("red", palette).fg}
        >
          {qty.toLocaleString()} units
        </AppText>
        <AppText variant="caption" color={palette.text}>
          {money(productSellPrice(product))}
        </AppText>
      </View>
    </Pressable>
  );
}

function PromotionCard({
  promotion,
  palette,
  onPress,
}: {
  promotion: WhatsAppPromotion;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  const productName = clean(promotion.product?.name, "Store-wide offer");
  const broadcastCount = num(promotion.usage?.broadcastCount, 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.promotionCard,
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
          <Ionicons name="megaphone-outline" size={18} color={ACCENT} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <AppText variant="subtitle" color={palette.text} numberOfLines={2}>
            {clean(promotion.title, "Promotion")}
          </AppText>
          <AppText variant="caption" color={palette.soft} numberOfLines={2} style={styles.cardText}>
            {clean(promotion.message, "No message")}
          </AppText>
        </View>

        <StatusPill promotion={promotion} palette={palette} />
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
            Product
          </AppText>
          <AppText variant="label" color={palette.text} numberOfLines={1}>
            {productName}
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
            Broadcasts
          </AppText>
          <AppText variant="label" color={palette.text}>
            {broadcastCount.toLocaleString()}
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
            Created
          </AppText>
          <AppText variant="label" color={palette.text}>
            {dateLabel(promotion.createdAt)}
          </AppText>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <AppText variant="caption" color={palette.soft}>
          {promotion.canEdit ? "Ready to edit or broadcast" : "Kept as business history"}
        </AppText>
        <Ionicons name="chevron-forward-outline" size={18} color={palette.soft} />
      </View>
    </Pressable>
  );
}

function CreatePromotionModal({
  open,
  palette,
  form,
  products,
  productsLoading,
  productQuery,
  saving,
  notice,
  onChange,
  onProductQuery,
  onClose,
  onClearNotice,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  form: PromotionForm;
  products: StockProduct[];
  productsLoading: boolean;
  productQuery: string;
  saving: boolean;
  notice: Notice;
  onChange: (key: keyof PromotionForm, value: string) => void;
  onProductQuery: (value: string) => void;
  onClose: () => void;
  onClearNotice: () => void;
  onSave: () => Promise<void>;
}) {
  const visibleProducts = products.slice(0, productQuery.trim() ? 6 : 4);

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
                New WhatsApp promotion
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Prepare a customer offer
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Create the message first. Broadcast will choose who receives it.
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
            <NoticePanel notice={notice} palette={palette} onClose={onClearNotice} />

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                Promotion title
              </AppText>
              <TextInput
                value={form.title}
                onChangeText={(value) => onChange("title", value)}
                placeholder="Example: Fresh HP laptops in stock"
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
            </View>

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                Customer message
              </AppText>
              <TextInput
                value={form.message}
                onChangeText={(value) => onChange("message", value)}
                placeholder="Write the message customers will receive..."
                placeholderTextColor={palette.soft}
                multiline
                style={[
                  styles.textArea,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                    color: palette.text,
                  },
                ]}
              />
            </View>

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
                  Customer preview
                </AppText>
              </View>

              <AppText variant="label" color={palette.text}>
                {clean(form.title, "Promotion title")}
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.previewText}>
                {clean(form.message, "Your customer message will appear here.")}
              </AppText>
            </View>

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                Product focus
              </AppText>

              <View
                style={[
                  styles.searchBox,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <Ionicons name="search-outline" size={17} color={palette.soft} />
                <TextInput
                  value={productQuery}
                  onChangeText={onProductQuery}
                  placeholder="Search product"
                  placeholderTextColor={palette.soft}
                  style={[styles.searchInput, { color: palette.text }]}
                />
              </View>

              <Pressable
                onPress={() => onChange("productId", "")}
                style={({ pressed }) => [
                  styles.productChoice,
                  {
                    borderColor: !form.productId
                      ? toneSpec("cyan", palette).border
                      : palette.border,
                    backgroundColor: !form.productId
                      ? toneSpec("cyan", palette).bg
                      : palette.panel,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.productIcon,
                    {
                      borderColor: toneSpec("cyan", palette).border,
                      backgroundColor: toneSpec("cyan", palette).bg,
                    },
                  ]}
                >
                  <Ionicons name="storefront-outline" size={16} color={ACCENT} />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <AppText variant="label" color={palette.text}>
                    Store-wide promotion
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    Use this when the offer is not tied to one product.
                  </AppText>
                </View>
              </Pressable>

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
                        onPress={() => onChange("productId", product.id)}
                      />
                    ))
                  : null}

                {!productsLoading && products.length === 0 ? (
                  <View
                    style={[
                      styles.emptyMini,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.panel,
                      },
                    ]}
                  >
                    <Ionicons name="cube-outline" size={19} color={palette.soft} />
                    <AppText variant="caption" color={palette.soft} center>
                      No products found for this selling location.
                    </AppText>
                  </View>
                ) : null}
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
              {saving ? "Saving" : "Save promotion"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WhatsAppPromotionsScreen() {
  const router = useRouter();
  const activeBranchId = useBranchStore((state) => state.activeBranchId);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "SENT">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalNotice, setModalNotice] = useState<Notice>(null);
  const [visibleLimit, setVisibleLimit] = useState(LIST_PAGE_SIZE);
  const [shouldLoadProducts, setShouldLoadProducts] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [form, setForm] = useState<PromotionForm>(() => emptyForm());

  const promotionsQuery = useWhatsAppPromotions({
    q: query,
    sent: filter === "SENT" ? true : filter === "DRAFT" ? false : null,
    limit: 80,
  });

  const productsQuery = useStockProducts({
    branchId: activeBranchId,
    q: productQuery,
    filter: "all",
    sort: "newest",
    enabled: shouldLoadProducts && modalOpen && Boolean(activeBranchId),
  });

  const createPromotion = useCreateWhatsAppPromotion();

  const promotions = promotionsQuery.data || [];
  const visiblePromotions = promotions.slice(0, visibleLimit);
  const hasMorePromotions = promotions.length > visiblePromotions.length;
  const products = shouldLoadProducts && modalOpen ? productsQuery.data || [] : [];

  const stats = useMemo(() => {
    const total = promotions.length;
    const sent = promotions.filter((item) => Boolean(item.sentAt)).length;
    const drafts = total - sent;
    const used = promotions.filter((item) => num(item.usage?.broadcastCount, 0) > 0).length;

    return { total, sent, drafts, used };
  }, [promotions]);

  function updateForm(key: keyof PromotionForm, value: string) {
    setModalNotice(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSearch(value: string) {
    setQuery(value);
    setVisibleLimit(LIST_PAGE_SIZE);
  }

  function handleFilter(nextFilter: "ALL" | "DRAFT" | "SENT") {
    setFilter(nextFilter);
    setVisibleLimit(LIST_PAGE_SIZE);
  }

  function loadMorePromotions() {
    setVisibleLimit((current) => current + LIST_PAGE_SIZE);
  }

  function openCreateModal() {
    setModalNotice(null);
    setShouldLoadProducts(true);
    setModalOpen(true);
  }

  function closeCreateModal() {
    if (createPromotion.isPending) return;

    setModalOpen(false);
    setModalNotice(null);
    setShouldLoadProducts(false);
    setProductQuery("");
  }

  async function savePromotion() {
    const title = form.title.trim();
    const message = form.message.trim();

    if (!title) {
      setModalNotice({
        tone: "amber",
        title: "Add promotion title",
        text: "Give this promotion a clear title.",
      });
      return;
    }

    if (!message) {
      setModalNotice({
        tone: "amber",
        title: "Write customer message",
        text: "Add the message customers will receive.",
      });
      return;
    }

    try {
      setModalNotice(null);

      const result = await createPromotion.mutateAsync({
        title,
        message,
        productId: form.productId || null,
      });

      setModalOpen(false);
      setModalNotice(null);
      setShouldLoadProducts(false);
      setProductQuery("");
      setForm(emptyForm());

      if (result.promotion?.id) {
        router.push(routes.whatsappPromotion(result.promotion.id) as never);
      }
    } catch (error) {
      setModalNotice({
        tone: "red",
        title: "Promotion not saved",
        text: errorMessage(error),
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
                  WhatsApp promotions
                </AppText>
                <AppText variant="title" color={palette.text}>
                  Promote products to customers
                </AppText>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  Prepare offers first, then send them through WhatsApp broadcasts.
                </AppText>
              </View>
            </View>

            <AsyncButton
              onPress={openCreateModal}
              variant="primary"
              fullWidth
              style={styles.accentButton}
            >
              Create promotion
            </AsyncButton>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              label="Promotions"
              value={stats.total.toLocaleString()}
              icon="megaphone-outline"
              tone="cyan"
              palette={palette}
            />
            <StatCard
              label="Drafts"
              value={stats.drafts.toLocaleString()}
              icon="create-outline"
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
              label="Used"
              value={stats.used.toLocaleString()}
              icon="radio-outline"
              tone="slate"
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
                placeholder="Search promotions"
                placeholderTextColor={palette.soft}
                style={[styles.searchInput, { color: palette.text }]}
              />
            </View>

            <View style={styles.filterRow}>
              {(["ALL", "DRAFT", "SENT"] as const).map((item) => {
                const active = filter === item;
                const spec = toneSpec(
                  item === "SENT" ? "green" : item === "DRAFT" ? "amber" : "cyan",
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
                      {item === "ALL" ? "All" : item === "DRAFT" ? "Drafts" : "Sent"}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {promotionsQuery.isLoading ? (
            <View style={styles.stack}>
              <Skeleton height={132} width="100%" />
              <Skeleton height={132} width="100%" />
              <Skeleton height={132} width="100%" />
            </View>
          ) : null}

          {!promotionsQuery.isLoading && promotionsQuery.isError ? (
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
                Promotions could not load
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                Refresh and try again.
              </AppText>

              <AsyncButton
                onPress={async () => {
                  await promotionsQuery.refetch();
                }}
                variant="secondary"
              >
                Refresh
              </AsyncButton>
            </View>
          ) : null}

          {!promotionsQuery.isLoading && !promotionsQuery.isError && promotions.length === 0 ? (
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
                <Ionicons name="megaphone-outline" size={25} color={ACCENT} />
              </View>

              <AppText variant="subtitle" color={palette.text} center>
                No promotions yet
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                Create a clean customer offer, then use Broadcast to send it to the right people.
              </AppText>

              <AsyncButton onPress={openCreateModal} variant="primary" style={styles.accentButton}>
                Create first promotion
              </AsyncButton>
            </View>
          ) : null}

          {!promotionsQuery.isLoading && promotions.length > 0 ? (
            <View style={styles.list}>
              {visiblePromotions.map((promotion) => (
                <PromotionCard
                  key={promotion.id}
                  promotion={promotion}
                  palette={palette}
                  onPress={() => router.push(routes.whatsappPromotion(promotion.id) as never)}
                />
              ))}

              {hasMorePromotions ? (
                <View style={styles.loadMoreWrap}>
                  <AsyncButton onPress={loadMorePromotions} variant="secondary">
                    Load more promotions
                  </AsyncButton>
                </View>
              ) : null}
            </View>
          ) : null}

          <CreatePromotionModal
            open={modalOpen}
            palette={palette}
            form={form}
            products={products}
            productsLoading={shouldLoadProducts && modalOpen && (productsQuery.isLoading || productsQuery.isFetching)}
            productQuery={productQuery}
            saving={createPromotion.isPending}
            notice={modalNotice}
            onChange={updateForm}
            onProductQuery={(value) => {
              setModalNotice(null);
              setProductQuery(value);
            }}
            onClose={closeCreateModal}
            onClearNotice={() => setModalNotice(null)}
            onSave={savePromotion}
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

  promotionCard: {
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

  noticePanel: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  noticeIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeClose: {
    width: 30,
    height: 30,
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

  textArea: {
    minHeight: 118,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily: "Quicksand_600SemiBold",
    fontSize: 14,
    textAlignVertical: "top",
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

  productIcon: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
});