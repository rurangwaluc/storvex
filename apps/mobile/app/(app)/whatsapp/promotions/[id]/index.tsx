import { useEffect, useMemo, useState } from "react";
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
  productQuantity,
  productSellPrice,
  useStockProducts,
} from "../../../../../src/features/stock/hooks";
import type { StockProduct } from "../../../../../src/features/stock/types";
import {
  promotionStatusLabel,
  useDeleteWhatsAppPromotion,
  useUpdateWhatsAppPromotion,
  useWhatsAppPromotion,
} from "../../../../../src/features/whatsapp/hooks";
import type { WhatsAppPromotion } from "../../../../../src/features/whatsapp/types";
import { useBranchStore } from "../../../../../src/store/branchStore";

const ACCENT = "#22C7F4";
const GREEN = "#34D399";
const AMBER = "#FBBF24";
const RED = "#FB7185";

type PromotionForm = {
  title: string;
  message: string;
  productId: string;
};

type Notice = {
  tone: "green" | "amber" | "red" | "cyan" | "slate";
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

function tileWidth(width: number): DimensionValue {
  return width >= 430 ? "48.8%" : "100%";
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
  if (code === "PROMOTION_NOT_FOUND") return "This promotion could not be found.";
  if (code === "PROMOTION_ALREADY_SENT") {
    return "This promotion has already been used and is kept as business history.";
  }

  return (
    err?.response?.data?.message ||
    err?.message ||
    "The action could not be completed. Please try again."
  );
}

function formFromPromotion(promotion?: WhatsAppPromotion | null): PromotionForm {
  return {
    title: clean(promotion?.title, ""),
    message: clean(promotion?.message, ""),
    productId: clean(promotion?.productId, ""),
  };
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
        styles.noticeInlinePanel,
        {
          borderColor: spec.border,
          backgroundColor: spec.bg,
        },
      ]}
    >
      <View style={[styles.noticeInlineIcon, { backgroundColor: spec.solid }]}>
        <Ionicons
          name={notice.tone === "red" ? "warning-outline" : "information-outline"}
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

      <Pressable
        onPress={onClose}
        style={[styles.noticeInlineClose, { borderColor: spec.border }]}
      >
        <Ionicons name="close-outline" size={18} color={spec.fg} />
      </Pressable>
    </View>
  );
}

function EditPromotionModal({
  open,
  palette,
  form,
  products,
  productsLoading,
  productQuery,
  saving,
  canEdit,
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
  canEdit: boolean;
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
                Edit promotion
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Refine customer offer
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Keep the message short, clear, and easy for a customer to reply to.
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

          {!canEdit ? (
            <View
              style={[
                styles.lockedPanel,
                {
                  borderColor: toneSpec("amber", palette).border,
                  backgroundColor: toneSpec("amber", palette).bg,
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={toneSpec("amber", palette).fg} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <AppText variant="label" color={palette.text}>
                  Promotion is kept as history
                </AppText>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                  This promotion has already been used, so it should stay unchanged for business records.
                </AppText>
              </View>
            </View>
          ) : null}

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
                editable={canEdit && !saving}
                onChangeText={(value) => onChange("title", value)}
                placeholder="Example: Fresh HP laptops in stock"
                placeholderTextColor={palette.soft}
                style={[
                  styles.input,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                    color: palette.text,
                    opacity: canEdit ? 1 : 0.65,
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
                editable={canEdit && !saving}
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
                    opacity: canEdit ? 1 : 0.65,
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
                    opacity: canEdit ? 1 : 0.65,
                  },
                ]}
              >
                <Ionicons name="search-outline" size={17} color={palette.soft} />
                <TextInput
                  value={productQuery}
                  editable={canEdit && !saving}
                  onChangeText={onProductQuery}
                  placeholder="Search product"
                  placeholderTextColor={palette.soft}
                  style={[styles.searchInput, { color: palette.text }]}
                />
              </View>

              <Pressable
                disabled={!canEdit || saving}
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
                    opacity: !canEdit ? 0.65 : pressed ? 0.8 : 1,
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
                        onPress={() => {
                          if (!canEdit || saving) return;
                          onChange("productId", product.id);
                        }}
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
              disabled={saving || !canEdit}
              style={[styles.footerButton, styles.accentButton]}
            >
              {saving ? "Saving" : "Save changes"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WhatsAppPromotionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const promotionId = String(id || "");
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const cardWidth = tileWidth(Math.min(width, 760));

  const promotionQuery = useWhatsAppPromotion(promotionId);
  const updatePromotion = useUpdateWhatsAppPromotion();
  const deletePromotion = useDeleteWhatsAppPromotion();

  const [modalOpen, setModalOpen] = useState(false);
  const [shouldLoadProducts, setShouldLoadProducts] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [form, setForm] = useState<PromotionForm>(() => formFromPromotion(null));
  const [editNotice, setEditNotice] = useState<Notice>(null);

  const promotion = promotionQuery.data || null;
  const canEdit = Boolean(promotion?.canEdit);
  const canDelete = Boolean(promotion?.canDelete);

  const productsQuery = useStockProducts({
    branchId: activeBranchId,
    q: productQuery,
    filter: "all",
    sort: "newest",
    enabled: shouldLoadProducts && modalOpen && Boolean(activeBranchId),
  });

  const products = shouldLoadProducts && modalOpen ? productsQuery.data || [] : [];

  const usageCount = num(promotion?.usage?.broadcastCount, 0);

  const productName = promotion?.product
    ? clean(promotion.product.name, "Product")
    : "Store-wide promotion";

  const productPrice = promotion?.product ? money(promotion.product.sellPrice) : "Not tied to one product";

  const productStock = promotion?.product
    ? `${num(promotion.product.stockQty, 0).toLocaleString()} units`
    : "Applies to the full store";

  useEffect(() => {
    setForm(formFromPromotion(promotion));
  }, [promotion]);

  function updateForm(key: keyof PromotionForm, value: string) {
    setEditNotice(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openEditModal() {
    setEditNotice(null);
    setForm(formFromPromotion(promotion));
    setShouldLoadProducts(true);
    setModalOpen(true);
  }

  function closeEditModal() {
    if (updatePromotion.isPending) return;

    setModalOpen(false);
    setEditNotice(null);
    setShouldLoadProducts(false);
    setProductQuery("");
  }

  async function savePromotion() {
    if (!promotion) return;

    const title = form.title.trim();
    const message = form.message.trim();

    if (!title) {
      setEditNotice({
        tone: "red",
        title: "Add promotion title",
        text: "Give this promotion a clear title.",
      });
      return;
    }

    if (!message) {
      setEditNotice({
        tone: "red",
        title: "Write customer message",
        text: "Add the message customers will receive.",
      });
      return;
    }

    try {
      setEditNotice(null);

      await updatePromotion.mutateAsync({
        promotionId: promotion.id,
        payload: {
          title,
          message,
          productId: form.productId || null,
        },
      });

      setModalOpen(false);
      setEditNotice(null);
      setShouldLoadProducts(false);
      setProductQuery("");
      await promotionQuery.refetch();
    } catch (error) {
      setEditNotice({
        tone: "red",
        title: "Promotion not updated",
        text: errorMessage(error),
      });
    }
  }

  async function deleteCurrentPromotion() {
    if (!promotion || !canDelete) return;

    Alert.alert(
      "Delete promotion",
      "This removes the promotion from WhatsApp promotions. Business records already created from it stay unchanged.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePromotion.mutateAsync(promotion.id);
              router.replace(routes.whatsappPromotions as never);
            } catch (error) {
              Alert.alert("Promotion not deleted", errorMessage(error));
            }
          },
        },
      ],
    );
  }

  return (
    <AppShell>
      {(palette) => (
        <View style={styles.stack}>
          {promotionQuery.isLoading ? (
            <>
              <Skeleton height={130} width="100%" />
              <Skeleton height={220} width="100%" />
              <Skeleton height={120} width="100%" />
            </>
          ) : null}

          {!promotionQuery.isLoading && promotionQuery.isError ? (
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
                Promotion could not load
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                Refresh and try again.
              </AppText>

              <AsyncButton
                onPress={async () => {
                  await promotionQuery.refetch();
                }}
                variant="secondary"
              >
                Refresh
              </AsyncButton>
            </View>
          ) : null}

          {!promotionQuery.isLoading && !promotionQuery.isError && !promotion ? (
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
                <Ionicons name="megaphone-outline" size={24} color={toneSpec("red", palette).fg} />
              </View>

              <AppText variant="subtitle" color={palette.text} center>
                Promotion was not found
              </AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                Go back to the promotions list and choose another record.
              </AppText>

              <AsyncButton
                onPress={() => router.replace(routes.whatsappPromotions as never)}
                variant="secondary"
              >
                Back to promotions
              </AsyncButton>
            </View>
          ) : null}

          {promotion ? (
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
                    onPress={() => router.push(routes.whatsappPromotions as never)}
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
                      WhatsApp promotion
                    </AppText>
                    <AppText variant="title" color={palette.text}>
                      {clean(promotion.title, "Promotion")}
                    </AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      Review this customer offer before sending it through a broadcast.
                    </AppText>
                  </View>

                  <StatusPill promotion={promotion} palette={palette} />
                </View>

                <View style={styles.actionRow}>
                  <AsyncButton
                    onPress={openEditModal}
                    variant="primary"
                    disabled={!canEdit}
                    style={[styles.actionButton, styles.accentButton]}
                  >
                    Edit
                  </AsyncButton>

                  <AsyncButton
                    onPress={deleteCurrentPromotion}
                    variant="secondary"
                    disabled={!canDelete || deletePromotion.isPending}
                    style={styles.actionButton}
                  >
                    Delete
                  </AsyncButton>
                </View>
              </View>

              {!canEdit ? (
                <View
                  style={[
                    styles.noticePanel,
                    {
                      borderColor: toneSpec("amber", palette).border,
                      backgroundColor: toneSpec("amber", palette).bg,
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={toneSpec("amber", palette).fg} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText variant="label" color={palette.text}>
                      Kept as business history
                    </AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      This promotion has already been used in a broadcast, so it should stay unchanged.
                    </AppText>
                  </View>
                </View>
              ) : null}

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
                      Preview
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
                    {clean(promotion.title, "Promotion")}
                  </AppText>
                  <AppText variant="body" color={palette.text} style={styles.messageBody}>
                    {clean(promotion.message, "No message")}
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
                      Promotion details
                    </AppText>
                    <AppText variant="subtitle" color={palette.text}>
                      Offer overview
                    </AppText>
                  </View>

                  <View
                    style={[
                      styles.reportBadge,
                      {
                        borderColor: toneSpec(promotion.sentAt ? "green" : "amber", palette).border,
                        backgroundColor: toneSpec(promotion.sentAt ? "green" : "amber", palette).bg,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={toneSpec(promotion.sentAt ? "green" : "amber", palette).fg}
                      style={styles.statusText}
                    >
                      {promotionStatusLabel(promotion)}
                    </AppText>
                  </View>
                </View>

                <View style={styles.detailTilesGrid}>
                  <DetailTile
                    label="Product focus"
                    value={productName}
                    helper={promotion.product ? "Product connected to this customer offer." : "This offer can be used for the whole store."}
                    icon="cube-outline"
                    tone="cyan"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Product price"
                    value={productPrice}
                    helper={promotion.product ? "Selling price shown from the selected product." : "No single product price is attached."}
                    icon="cash-outline"
                    tone={promotion.product ? "green" : "slate"}
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Available stock"
                    value={productStock}
                    helper={promotion.product ? "Current stock available for this product." : "The offer is not limited to one product."}
                    icon="layers-outline"
                    tone={promotion.product ? "amber" : "slate"}
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Broadcast use"
                    value={`${usageCount.toLocaleString()} broadcast${usageCount === 1 ? "" : "s"}`}
                    helper="How many broadcasts used this promotion."
                    icon="radio-outline"
                    tone={usageCount > 0 ? "green" : "slate"}
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Created"
                    value={dateLabel(promotion.createdAt)}
                    helper="When this customer offer was prepared."
                    icon="calendar-outline"
                    tone="slate"
                    palette={palette}
                    width={cardWidth}
                  />

                  <DetailTile
                    label="Last updated"
                    value={dateLabel(promotion.updatedAt)}
                    helper="Most recent saved change to this offer."
                    icon="time-outline"
                    tone="slate"
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
                  <Ionicons name="send-outline" size={20} color={ACCENT} />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                  <AppText variant="label" color={palette.text}>
                    Ready for broadcast
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Use Broadcast to choose the customer audience and send this offer.
                  </AppText>
                </View>

                <Pressable
                  onPress={() => router.push(routes.whatsappBroadcasts as never)}
                  style={({ pressed }) => [
                    styles.nextButton,
                    {
                      borderColor: "rgba(34, 199, 244, 0.30)",
                      backgroundColor: "rgba(34, 199, 244, 0.14)",
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <AppText variant="caption" color={ACCENT} style={styles.nextButtonText}>
                    Broadcast
                  </AppText>
                </Pressable>
              </View>

              <EditPromotionModal
                open={modalOpen}
                palette={palette}
                form={form}
                products={products}
                productsLoading={
                  shouldLoadProducts &&
                  modalOpen &&
                  (productsQuery.isLoading || productsQuery.isFetching)
                }
                productQuery={productQuery}
                saving={updatePromotion.isPending}
                canEdit={canEdit}
                notice={editNotice}
                onChange={updateForm}
                onProductQuery={(value) => {
                  setEditNotice(null);
                  setProductQuery(value);
                }}
                onClose={closeEditModal}
                onClearNotice={() => setEditNotice(null)}
                onSave={savePromotion}
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

  noticeInlinePanel: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  noticeInlineIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeInlineClose: {
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

  lockedPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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