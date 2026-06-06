import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type DimensionValue,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  productCostPrice,
  productMinStock,
  productQuantity,
  productSellPrice,
  productStockStatus,
  useAdjustStock,
  useCreateStockProduct,
  useInventorySummary,
  useStockProducts,
} from "../../../src/features/stock/hooks";
import type {
  StockAdjustmentType,
  StockFilter,
  StockLossReason,
  StockProduct,
  StockSort,
} from "../../../src/features/stock/types";
import { useInterStoreDeals } from "../../../src/features/interstore/hooks";
import type { InterStoreDeal } from "../../../src/features/interstore/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const STOCK_PREVIEW_LIMIT = 4;
const MOVEMENT_PREVIEW_LIMIT = 3;

const WEB_TEXT_INPUT_FOCUS_RESET = {
  outlineStyle: "none",
  outlineWidth: 0,
  outlineColor: "transparent",
  boxShadow: "none",
} as unknown as TextStyle;


const LOSS_REASONS: { value: StockLossReason; label: string }[] = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "LOST", label: "Lost" },
  { value: "STOLEN", label: "Stolen" },
  { value: "EXPIRED", label: "Expired" },
  { value: "INTERNAL_USE", label: "Used inside business" },
  { value: "COUNTING_ERROR", label: "Counting correction" },
  { value: "OTHER", label: "Other" },
];

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

type ProductForm = {
  name: string;
  brand: string;
  category: string;
  sku: string;
  barcode: string;
  serial: string;
  costPrice: string;
  sellPrice: string;
  stockQty: string;
  minStockLevel: string;
};

type AdjustmentForm = {
  type: StockAdjustmentType;
  quantity: string;
  newStockQty: string;
  lossReason: StockLossReason | "";
  note: string;
};

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: unknown) {
  const n = toNumber(value, 0);
  return `RWF ${Math.round(n).toLocaleString()}`;
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function productSearchText(product: StockProduct) {
  return normalizeSearchText([
    product.name,
    product.brand,
    product.category,
    product.subcategory,
    product.subcategoryOther,
    product.sku,
    product.barcode,
    product.serial,
  ].filter(Boolean).join(" "));
}

function productMatchesSearch(product: StockProduct, search: string) {
  const needle = normalizeSearchText(search);
  if (!needle) return true;
  return productSearchText(product).includes(needle);
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
    if (width >= 430) return 2;
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

function categoryText(product: StockProduct) {
  const lines: string[] = [];

  if (product.category) lines.push(`Category: ${String(product.category)}`);

  if (String(product.category || "") === "Accessories") {
    if (product.subcategory === "Other") lines.push(`Type: ${clean(product.subcategoryOther, "Other")}`);
    else if (product.subcategory) lines.push(`Type: ${String(product.subcategory)}`);
  }

  if (product.brand) lines.push(`Brand: ${String(product.brand)}`);

  return lines.length ? lines.join("\n") : "No category set";
}

function branchDisplayName(branch: { code?: string | null; name?: string | null } | null | undefined) {
  const name = clean(branch?.name, "");
  const code = clean(branch?.code, "");

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;

  return "the current selling location";
}

function stockErrorMessage(error: unknown) {
  const err = error as {
    code?: string;
    message?: string;
    response?: {
      data?: {
        code?: string;
        message?: string;
        error?: string;
      };
    };
  };

  const code = String(err?.response?.data?.code || err?.response?.data?.error || err?.code || "").toUpperCase();
  const message = String(err?.response?.data?.message || err?.response?.data?.error || err?.message || "").toLowerCase();

  if (code === "BRANCH_REQUIRED" || message.includes("branch")) {
    return "Choose the selling location before saving this stock record.";
  }

  if (code === "PRODUCT_NOT_FOUND" || message.includes("product_not_found")) {
    return "This product could not be found. Refresh stock and try again.";
  }

  if (code === "PRODUCT_NAME_REQUIRED" || code === "NAME_REQUIRED") {
    return "Add a clear product name before saving.";
  }

  if (code === "DUPLICATE_REFERENCE" || message.includes("duplicate")) {
    return "Another product already uses this reference. Use a different reference.";
  }

  if (code === "INVALID_QUANTITY" || message.includes("quantity")) {
    return "Check the stock quantity and enter a valid whole number.";
  }

  if (code === "INSUFFICIENT_STOCK" || message.includes("insufficient stock")) {
    return "This stock reduction is more than the available stock.";
  }

  if (message.includes("subscription")) {
    return "Business access needs attention before stock can be updated.";
  }

  return "The stock record could not be saved. Please try again.";
}

function emptyProductForm(): ProductForm {
  return {
    name: "",
    brand: "",
    category: "",
    sku: "",
    barcode: "",
    serial: "",
    costPrice: "",
    sellPrice: "",
    stockQty: "0",
    minStockLevel: "",
  };
}

function emptyAdjustmentForm(): AdjustmentForm {
  return {
    type: "RESTOCK",
    quantity: "",
    newStockQty: "",
    lossReason: "",
    note: "",
  };
}

function statusToneFromFilter(filter: StockFilter): Tone {
  if (filter === "low") return "amber";
  if (filter === "out") return "red";
  return "cyan";
}

function movementStatusLabel(status: unknown) {
  const key = String(status || "").toUpperCase();

  if (key === "BORROWED") return "Waiting";
  if (key === "RECEIVED") return "Inside store";
  if (key === "SOLD") return "Sold";
  if (key === "PAID") return "Paid";
  if (key === "RETURNED") return "Returned";

  return key || "Movement";
}

function movementTone(status: unknown): Tone {
  const key = String(status || "").toUpperCase();

  if (key === "BORROWED") return "amber";
  if (key === "RECEIVED") return "blue";
  if (key === "SOLD") return "cyan";
  if (key === "PAID") return "green";
  if (key === "RETURNED") return "slate";

  return "slate";
}

function dueLabel(value: unknown) {
  if (!value) return "No due date";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "No due date";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function NoticePanel({ notice, palette }: { notice: Notice; palette: AppShellPalette }) {
  if (!notice) return null;

  const spec = toneSpec(notice.tone, palette);

  return (
    <View style={[styles.noticePanel, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <View style={[styles.noticeMark, { backgroundColor: spec.solid }]}>
        <Ionicons
          name={notice.tone === "red" ? "warning-outline" : notice.tone === "amber" ? "alert-circle-outline" : "checkmark-outline"}
          size={15}
          color="#06111F"
        />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>
          {notice.title}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {notice.text}
        </AppText>
      </View>
    </View>
  );
}

function ScreenSkeleton({ palette, layoutWidth }: { palette: AppShellPalette; layoutWidth: number }) {
  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  return (
    <View style={[styles.stack, styles.screenBottomSpace]}>
      <View style={[styles.heroPanel, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.08)" }]}>
        <View style={styles.heroTop}>
          <Skeleton height={56} width={56} />
          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="38%" />
            <Skeleton height={24} width="74%" />
            <Skeleton height={14} width="66%" />
          </View>
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ width: summaryWidth }}>
            <Skeleton height={112} width="100%" />
          </View>
        ))}
      </View>

      <Skeleton height={88} width="100%" />

      <View style={styles.responsiveGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={{ width: cardWidth }}>
            <Skeleton height={194} width="100%" />
          </View>
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  palette,
  keyboardType = "default",
  multiline = false,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  palette: AppShellPalette;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
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
        multiline={multiline}
        onChangeText={onChangeText}
        style={[
          styles.input,
          WEB_TEXT_INPUT_FOCUS_RESET,
          multiline ? styles.textArea : null,
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

function AttentionPanel({
  palette,
  lowProducts,
  outProducts,
  onLowPress,
  onOutPress,
}: {
  palette: AppShellPalette;
  lowProducts: StockProduct[];
  outProducts: StockProduct[];
  onLowPress: () => void;
  onOutPress: () => void;
}) {
  const lowCount = lowProducts.length;
  const outCount = outProducts.length;
  const healthy = lowCount === 0 && outCount === 0;

  const tone: Tone = outCount > 0 ? "red" : lowCount > 0 ? "amber" : "green";
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.controlPanel, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <View style={styles.panelHeader}>
        <View style={[styles.panelIcon, { backgroundColor: spec.solid }]}>
          <Ionicons
            name={healthy ? "shield-checkmark-outline" : "warning-outline"}
            size={18}
            color="#06111F"
          />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="caption" color={spec.fg} style={styles.eyebrow}>
            Stock health
          </AppText>
          <AppText variant="subtitle" color={palette.text}>
            {healthy ? "Stock looks controlled." : "Stock needs attention."}
          </AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            {healthy
              ? "No low-stock or out-of-stock products are visible in this selling location."
              : "Review the products below before sales or movement records become inaccurate."}
          </AppText>
        </View>
      </View>

      <View style={styles.responsiveGrid}>
        <Pressable
          onPress={onLowPress}
          style={({ pressed }) => [
            styles.attentionBox,
            {
              borderColor: palette.border,
              backgroundColor: palette.stage,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Low stock
          </AppText>
          <AppText variant="subtitle" color={palette.text}>
            {lowCount.toLocaleString()}
          </AppText>
          <AppText variant="caption" color={palette.soft}>
            Products near alert level
          </AppText>
        </Pressable>

        <Pressable
          onPress={onOutPress}
          style={({ pressed }) => [
            styles.attentionBox,
            {
              borderColor: palette.border,
              backgroundColor: palette.stage,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Out of stock
          </AppText>
          <AppText variant="subtitle" color={palette.text}>
            {outCount.toLocaleString()}
          </AppText>
          <AppText variant="caption" color={palette.soft}>
            Products that need restock
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function MovementCard({
  deal,
  palette,
  onOpen,
}: {
  deal: InterStoreDeal;
  palette: AppShellPalette;
  onOpen: () => void;
}) {
  const tone = movementTone(deal.status);
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.movementCard, { borderColor: palette.border, backgroundColor: palette.stage }]}>
      <View style={styles.productHeader}>
        <View style={[styles.productIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}>
          <Ionicons name="swap-horizontal-outline" size={17} color={spec.fg} />
        </View>

        <View style={styles.productTitleWrap}>
          <AppText variant="label" color={palette.text} style={styles.productTitle}>
            {clean(deal.productName, "Movement record")}
          </AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            {clean(deal.serial, "No reference")}
          </AppText>
        </View>

        <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}>
          <AppText variant="caption" color={spec.fg} style={styles.statusText}>
            {movementStatusLabel(deal.status)}
          </AppText>
        </View>
      </View>

      <View style={styles.detailStack}>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Supplier</AppText>
          <AppText variant="caption" color={palette.text}>{deal.supplierTenantId ? "Internal store" : clean(deal.externalSupplierName, "External supplier")}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Units</AppText>
          <AppText variant="caption" color={palette.text}>
            Taken: {toNumber(deal.quantity)}
            {"\n"}
            Sold: {toNumber(deal.soldQuantity)}
          </AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Due date</AppText>
          <AppText variant="caption" color={palette.text}>{dueLabel(deal.dueDate)}</AppText>
        </View>
      </View>

      <AsyncButton onPress={onOpen} variant="secondary" fullWidth style={styles.cardButton}>
        View details
      </AsyncButton>
    </View>
  );
}

function ProductCard({
  product,
  palette,
  width,
  onAdjust,
}: {
  product: StockProduct;
  palette: AppShellPalette;
  width: DimensionValue;
  onAdjust: () => void;
}) {
  const status = productStockStatus(product);
  const statusSpec = toneSpec(status.tone, palette);
  const qty = productQuantity(product);
  const min = productMinStock(product);
  const cost = productCostPrice(product);
  const sell = productSellPrice(product);

  return (
    <View style={[styles.productCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.productHeader}>
        <View style={[styles.productIcon, { borderColor: statusSpec.border, backgroundColor: statusSpec.bg }]}>
          <Ionicons name="cube-outline" size={17} color={statusSpec.fg} />
        </View>

        <View style={styles.productTitleWrap}>
          <AppText variant="label" color={palette.text} style={styles.productTitle}>
            {clean(product.name, "Product")}
          </AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            {categoryText(product)}
          </AppText>
        </View>

        <View style={[styles.statusPill, { borderColor: statusSpec.border, backgroundColor: statusSpec.bg }]}>
          <AppText variant="caption" color={statusSpec.fg} style={styles.statusText}>
            {status.label}
          </AppText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Available
          </AppText>
          <AppText variant="label" color={palette.text}>
            {qty.toLocaleString()} units
          </AppText>
        </View>

        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
            Low alert
          </AppText>
          <AppText variant="label" color={palette.text}>
            {min === null ? "Not set" : `${min.toLocaleString()} units`}
          </AppText>
        </View>
      </View>

      <View style={styles.detailStack}>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Selling price</AppText>
          <AppText variant="caption" color={palette.text}>{money(sell)}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Cost value</AppText>
          <AppText variant="caption" color={palette.text}>{money(cost * qty)}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Reference</AppText>
          <AppText variant="caption" color={palette.text}>{clean(product.sku || product.barcode || product.serial, "Not set")}</AppText>
        </View>
      </View>

      <AsyncButton onPress={onAdjust} variant="secondary" fullWidth style={styles.cardButton}>
        Adjust stock
      </AsyncButton>
    </View>
  );
}

export default function StockScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(width, 760);
  const compact = layoutWidth < 560;

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filter, setFilter] = useState<StockFilter>("all");
  const [sort, setSort] = useState<StockSort>("newest");
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [productNotice, setProductNotice] = useState<Notice>(null);
  const [adjustmentNotice, setAdjustmentNotice] = useState<Notice>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(() => emptyProductForm());
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>(() => emptyAdjustmentForm());

  const movementScope = useMemo(
    () => ({
      branchId: activeBranchId || undefined,
    }),
    [activeBranchId],
  );

  const remoteSearchQuery = useMemo(() => {
    const text = searchText.trim();
    return text.length >= 2 ? text : "";
  }, [searchText]);

  const summaryQuery = useInventorySummary(activeBranchId);
  const productsQuery = useStockProducts({
    branchId: activeBranchId,
    q: debouncedQuery,
    filter,
    sort,
  });
  const movementsQuery = useInterStoreDeals(movementScope);
  

  const createProduct = useCreateStockProduct();
  const adjustStock = useAdjustStock();

  const workspaceIsLoading = isHydrating || !user || !tenant;

  const productsInitialLoading =
    productsQuery.isLoading && !productsQuery.data && !debouncedQuery.trim();

  const summaryInitialLoading =
    summaryQuery.isLoading && !summaryQuery.data;

  const movementsInitialLoading =
    movementsQuery.isLoading && !movementsQuery.data;

    const movementsLoading = movementsInitialLoading || movementsQuery.isFetching;

  const isLoading = workspaceIsLoading || productsInitialLoading;

  const isRefreshing = summaryQuery.isFetching || productsQuery.isFetching || movementsQuery.isFetching;
  const fetchedProducts = productsQuery.data || [];
  const products = useMemo(
    () => fetchedProducts.filter((product) => productMatchesSearch(product, searchText)),
    [fetchedProducts, searchText],
  );
  const hasActiveSearch = Boolean(searchText.trim());
  const searchIsSettling = remoteSearchQuery !== debouncedQuery;
  const searchIsRefreshing = hasActiveSearch && (searchIsSettling || productsQuery.isFetching);
  const summary = summaryQuery.data;
  const movements = movementsQuery.data?.deals || [];

  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  const lowProducts = useMemo(
    () =>
      products.filter((product) => {
        const qty = productQuantity(product);
        const min = productMinStock(product);
        return qty > 0 && min !== null && qty <= min;
      }),
    [products],
  );

  const outProducts = useMemo(
    () => products.filter((product) => productQuantity(product) <= 0),
    [products],
  );

  const activeMovements = useMemo(
    () =>
      movements.filter((deal) =>
        ["BORROWED", "RECEIVED", "SOLD"].includes(String(deal.status || "").toUpperCase()),
      ),
    [movements],
  );

  const movementSummary = useMemo(
    () => ({
      borrowed: movements.filter((deal) => String(deal.status || "").toUpperCase() === "BORROWED").length,
      received: movements.filter((deal) => String(deal.status || "").toUpperCase() === "RECEIVED").length,
      sold: movements.filter((deal) => String(deal.status || "").toUpperCase() === "SOLD").length,
    }),
    [movements],
  );

  const filteredText = useMemo(() => {
    if (filter === "low") return "Low stock products";
    if (filter === "out") return "Out-of-stock products";
    return "Product records";
  }, [filter]);

  const visibleProducts = showAllProducts ? products : products.slice(0, STOCK_PREVIEW_LIMIT);
  const hasMoreProducts = products.length > STOCK_PREVIEW_LIMIT;
  const visibleMovements = activeMovements.slice(0, MOVEMENT_PREVIEW_LIMIT);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(remoteSearchQuery);
    }, 280);

    return () => clearTimeout(timer);
  }, [remoteSearchQuery]);

  useEffect(() => {
    setShowAllProducts(false);
  }, [debouncedQuery, filter, sort, activeBranchId]);

  function updateProductForm(key: keyof ProductForm, value: string) {
    setProductNotice(null);
    setProductForm((current) => ({ ...current, [key]: value }));
  }

  function updateAdjustmentForm<K extends keyof AdjustmentForm>(key: K, value: AdjustmentForm[K]) {
    setAdjustmentNotice(null);
    setAdjustmentForm((current) => ({ ...current, [key]: value }));
  }

  function openAddProduct() {
    setProductForm(emptyProductForm());
    setNotice(null);
    setProductNotice(null);
    setProductModalOpen(true);
  }

  function openAdjustStock(product: StockProduct) {
    setSelectedProduct(product);
    setAdjustmentForm({ ...emptyAdjustmentForm(), newStockQty: String(productQuantity(product)) });
    setNotice(null);
    setAdjustmentNotice(null);
    setAdjustModalOpen(true);
  }

  async function refreshAll() {
    await Promise.all([summaryQuery.refetch(), productsQuery.refetch(), movementsQuery.refetch()]);
  }

  function validateProductForm() {
    if (!productForm.name.trim()) return "Product name is required.";
    if (Number(productForm.costPrice || 0) < 0) return "Cost price cannot be negative.";
    if (Number(productForm.sellPrice || 0) < 0) return "Selling price cannot be negative.";

    const openingStock = Number(productForm.stockQty || 0);
    if (!Number.isInteger(openingStock) || openingStock < 0) {
      return "Opening stock must be 0 or more.";
    }

    if (productForm.minStockLevel.trim()) {
      const min = Number(productForm.minStockLevel);
      if (!Number.isInteger(min) || min < 0) return "Low-stock level must be 0 or more.";
    }

    return null;
  }

  async function saveProduct() {
    const error = validateProductForm();
    if (error) {
      setProductNotice({
        tone: "red",
        title: "Check product details",
        text: error,
      });
      return;
    }

    try {
      setProductNotice(null);

      await createProduct.mutateAsync({
        name: productForm.name.trim(),
        brand: productForm.brand.trim() || null,
        category: productForm.category.trim() || null,
        sku: productForm.sku.trim() || null,
        barcode: productForm.barcode.trim() || null,
        serial: productForm.serial.trim() || null,
        costPrice: productForm.costPrice.trim() || "0",
        sellPrice: productForm.sellPrice.trim() || "0",
        stockQty: productForm.stockQty.trim() || "0",
        minStockLevel: productForm.minStockLevel.trim() || null,
      });

      setProductModalOpen(false);
      setNotice({
        tone: "green",
        title: "Product added",
        text: "The product and opening stock are now available in this selling location.",
      });
    } catch (saveError) {
      setProductNotice({
        tone: "red",
        title: "Product not saved",
        text: stockErrorMessage(saveError),
      });
    }
  }

  function validateAdjustment() {
    if (!selectedProduct?.id) return "Choose a product first.";

    if (adjustmentForm.type === "CORRECTION") {
      const newStock = Number(adjustmentForm.newStockQty);
      if (!Number.isInteger(newStock) || newStock < 0) return "Correct stock must be 0 or more.";
      return null;
    }

    const quantity = Number(adjustmentForm.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) return "Quantity must be greater than 0.";

    if (adjustmentForm.type === "LOSS") {
      if (!adjustmentForm.lossReason) return "Choose why stock reduced.";
      if ((adjustmentForm.lossReason === "STOLEN" || adjustmentForm.lossReason === "OTHER") && !adjustmentForm.note.trim()) {
        return "Add a note for this stock reduction.";
      }
    }

    return null;
  }

  async function saveAdjustment() {
    const error = validateAdjustment();
    if (error) {
      setAdjustmentNotice({
        tone: "red",
        title: "Check stock change",
        text: error,
      });
      return;
    }

    const product = selectedProduct;
    if (!product?.id) return;

    const actionLabel =
      adjustmentForm.type === "RESTOCK"
        ? "Restock"
        : adjustmentForm.type === "LOSS"
          ? "Reduce stock"
          : "Correct stock";

    try {
      setAdjustmentNotice(null);

      await adjustStock.mutateAsync({
        productId: product.id,
        type: adjustmentForm.type,
        quantity: adjustmentForm.type === "CORRECTION" ? undefined : adjustmentForm.quantity,
        newStockQty: adjustmentForm.type === "CORRECTION" ? adjustmentForm.newStockQty : undefined,
        lossReason: adjustmentForm.type === "LOSS" ? adjustmentForm.lossReason : null,
        note: adjustmentForm.note.trim() || null,
      });

      setAdjustModalOpen(false);
      setSelectedProduct(null);
      setNotice({
        tone: "green",
        title: "Stock updated",
        text: `${actionLabel} was recorded for ${clean(product.name, "this product")}.`,
      });
    } catch (saveError) {
      setAdjustmentNotice({
        tone: "red",
        title: "Stock not updated",
        text: stockErrorMessage(saveError),
      });
    }
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
        <ScreenSkeleton palette={palette} layoutWidth={layoutWidth} />
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
                  <Ionicons name="analytics-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>

                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                      Stock control center
                    </AppText>
                  </View>

                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>
                    Control products, stock health, and movement.
                  </AppText>

                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Track products, low-stock pressure, stock value, and inter-store movement for {branchDisplayName(activeBranch)}.
                  </AppText>
                </View>

                {!compact ? (
                  <AsyncButton onPress={openAddProduct} variant="primary" style={styles.heroButton}>
                    Add product
                  </AsyncButton>
                ) : null}
              </View>

              {compact ? (
                <AsyncButton onPress={openAddProduct} variant="primary" fullWidth>
                  Add product
                </AsyncButton>
              ) : null}
            </View>

            <NoticePanel notice={notice} palette={palette} />

            <View style={styles.responsiveGrid}>
              <SummaryCard
                label="Products"
                value={String(summary?.totalActiveProducts ?? products.length)}
                helper="Active product records"
                icon="albums-outline"
                tone="cyan"
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Units"
                value={String(
                  summary?.totalStockUnits ??
                    products.reduce((total, product) => total + productQuantity(product), 0),
                )}
                helper="Available in location"
                icon="cube-outline"
                tone="green"
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Needs attention"
                value={String((summary?.lowStockCount ?? lowProducts.length) + (summary?.outOfStockCount ?? outProducts.length))}
                helper="Low or out of stock"
                icon="warning-outline"
                tone={lowProducts.length || outProducts.length ? "amber" : "slate"}
                palette={palette}
                width={summaryWidth}
              />
              <SummaryCard
                label="Stock value"
                value={money(
                  summary?.stockCostValue ??
                    products.reduce(
                      (total, product) => total + productCostPrice(product) * productQuantity(product),
                      0,
                    ),
                )}
                helper="Based on cost price"
                icon="wallet-outline"
                tone="blue"
                palette={palette}
                width={summaryWidth}
              />
            </View>

            <AttentionPanel
              palette={palette}
              lowProducts={lowProducts}
              outProducts={outProducts}
              onLowPress={() => setFilter("low")}
              onOutPress={() => setFilter("out")}
            />

            <View style={[styles.controlPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <View style={styles.panelHeader}>
                <View style={[styles.panelIcon, { backgroundColor: toneSpec("blue", palette).solid }]}>
                  <Ionicons name="swap-horizontal-outline" size={18} color="#06111F" />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                    Inter-store movement
                  </AppText>
                  <AppText variant="subtitle" color={palette.text}>
                    Stock moving between stores
                  </AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Borrowed, received, and sold movement records affect stock confidence.
                  </AppText>
                </View>

                <AsyncButton onPress={() => router.push(routes.interstore as never)} variant="secondary" style={styles.panelButton}>
                  Open
                </AsyncButton>
              </View>

              <View style={styles.responsiveGrid}>
                <SummaryCard
                  label="Waiting"
                  value={String(movementSummary.borrowed)}
                  helper="Not received yet"
                  icon="time-outline"
                  tone={movementSummary.borrowed > 0 ? "amber" : "slate"}
                  palette={palette}
                  width={summaryWidth}
                />
                <SummaryCard
                  label="Inside store"
                  value={String(movementSummary.received)}
                  helper="Ready for sale"
                  icon="download-outline"
                  tone={movementSummary.received > 0 ? "blue" : "slate"}
                  palette={palette}
                  width={summaryWidth}
                />
                <SummaryCard
                  label="Sold"
                  value={String(movementSummary.sold)}
                  helper="Needs settlement"
                  icon="cash-outline"
                  tone={movementSummary.sold > 0 ? "cyan" : "slate"}
                  palette={palette}
                  width={summaryWidth}
                />
                <SummaryCard
                  label="Active records"
                  value={String(activeMovements.length)}
                  helper="Needs monitoring"
                  icon="pulse-outline"
                  tone={activeMovements.length > 0 ? "green" : "slate"}
                  palette={palette}
                  width={summaryWidth}
                />
              </View>

              {movementsInitialLoading ? (
                <View style={styles.movementList}>
                  <Skeleton height={92} width="100%" />
                  <Skeleton height={92} width="100%" />
                </View>
              ) : visibleMovements.length > 0 ? (
                <View style={styles.movementList}>
                  {visibleMovements.map((deal) => (
                    <MovementCard
                      key={deal.id}
                      deal={deal}
                      palette={palette}
                      onOpen={() => router.push(routes.interstoreDetail(String(deal.id)) as never)}
                    />
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyMini, { borderColor: palette.border, backgroundColor: palette.stage }]}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={toneSpec("green", palette).fg} />
                  <AppText variant="label" color={palette.text}>
                    No active movement pressure
                  </AppText>
                  <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                    There are no borrowed, received, or sold movement records requiring attention in this location.
                  </AppText>
                </View>
              )}
            </View>

            <View style={[styles.searchPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
              <View style={styles.searchRow}>
                <View
                  style={[
                    styles.searchBox,
                    {
                      borderColor: searchFocused ? palette.cyan : palette.border,
                      backgroundColor: searchFocused ? "rgba(34, 199, 244, 0.08)" : palette.stage,
                    },
                  ]}
                >
                  <Ionicons name="search-outline" size={17} color={searchFocused ? palette.cyan : palette.soft} />
                  <TextInput
                    value={searchText}
                    onChangeText={setSearchText}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Search product, brand, barcode, or reference"
                    placeholderTextColor={palette.soft}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    selectionColor={palette.cyan}
                    style={[styles.searchInput, WEB_TEXT_INPUT_FOCUS_RESET, { color: palette.text }]}
                  />
                  {searchText.trim() ? (
                    <Pressable
                      onPress={() => setSearchText("")}
                      style={({ pressed }) => [styles.clearSearchButton, { opacity: pressed ? 0.72 : 1 }]}
                    >
                      <Ionicons name="close-circle" size={18} color={palette.soft} />
                    </Pressable>
                  ) : null}
                </View>

                <AsyncButton
                onPress={refreshAll}
                variant="secondary"
                style={styles.refreshButton}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing" : "Refresh"}
              </AsyncButton>
              </View>

              {hasActiveSearch ? (
                <View style={styles.searchStatusRow}>
                  <AppText variant="caption" color={searchIsRefreshing ? palette.cyan : palette.soft} style={styles.cardText}>
                    {searchIsRefreshing
                      ? "Searching stock records..."
                      : `${products.length.toLocaleString()} matching product${products.length === 1 ? "" : "s"}`}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.filterRow}>
                <FilterChip label="All" active={filter === "all"} tone="cyan" palette={palette} onPress={() => setFilter("all")} />
                <FilterChip label="Low stock" active={filter === "low"} tone="amber" palette={palette} onPress={() => setFilter("low")} />
                <FilterChip label="Out" active={filter === "out"} tone="red" palette={palette} onPress={() => setFilter("out")} />
                <FilterChip label="Newest" active={sort === "newest"} tone="blue" palette={palette} onPress={() => setSort("newest")} />
                <FilterChip label="Name" active={sort === "name"} tone="slate" palette={palette} onPress={() => setSort("name")} />
                <FilterChip label="Lowest stock" active={sort === "stock_low"} tone="amber" palette={palette} onPress={() => setSort("stock_low")} />
                <FilterChip label="Highest stock" active={sort === "stock_high"} tone="green" palette={palette} onPress={() => setSort("stock_high")} />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={toneSpec(statusToneFromFilter(filter), palette).fg} style={styles.eyebrow}>
                  {filteredText}
                </AppText>
                <AppText variant="subtitle" color={palette.text}>
                  Products and stock
                </AppText>
              </View>

              <AppText variant="caption" color={palette.soft}>
                {visibleProducts.length.toLocaleString()} of {products.length.toLocaleString()} shown
              </AppText>
            </View>

            {productsQuery.isError ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} />
                <AppText variant="subtitle" color={palette.text} center>
                  Stock could not load
                </AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                  Check the connection and refresh this screen.
                </AppText>
                <AsyncButton onPress={refreshAll} variant="secondary">
                  Try again
                </AsyncButton>
              </View>
            ) : products.length === 0 ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
                <Ionicons name="cube-outline" size={32} color={palette.cyan} />
                <AppText variant="subtitle" color={palette.text} center>
                  {debouncedQuery ? "No matching products found" : "No products found"}
                </AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>
                  {debouncedQuery
                    ? "Try another product name, brand, barcode, serial, or reference."
                    : "Add the first product for this selling location, then stock movement and sales can use it."}
                </AppText>
                <AsyncButton onPress={openAddProduct} variant="primary">
                  Add product
                </AsyncButton>
              </View>
            ) : (
              <>
                <View style={styles.responsiveGrid}>
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      palette={palette}
                      width={cardWidth}
                      onAdjust={() => openAdjustStock(product)}
                    />
                  ))}
                </View>

                {hasMoreProducts ? (
                  <View style={styles.showMoreWrap}>
                    <AsyncButton
                      onPress={() => setShowAllProducts((current) => !current)}
                      variant="secondary"
                    >
                      {showAllProducts ? "Show fewer products" : "View more products"}
                    </AsyncButton>
                  </View>
                ) : null}
              </>
            )}

            <ProductModal
              open={productModalOpen}
              palette={palette}
              form={productForm}
              onChange={updateProductForm}
              notice={productNotice}
              onClose={() => {
                if (createProduct.isPending) return;
                setProductNotice(null);
                setProductModalOpen(false);
              }}
              onSave={saveProduct}
              saving={createProduct.isPending}
            />

            <AdjustmentModal
              open={adjustModalOpen}
              palette={palette}
              product={selectedProduct}
              form={adjustmentForm}
              onChange={updateAdjustmentForm}
              notice={adjustmentNotice}
              onClose={() => {
                if (adjustStock.isPending) return;
                setAdjustmentNotice(null);
                setAdjustModalOpen(false);
                setSelectedProduct(null);
              }}
              onSave={saveAdjustment}
              saving={adjustStock.isPending}
            />
          </View>
        )
      }
    </AppShell>
  );
}

function ProductModal({
  open,
  palette,
  form,
  saving,
  notice,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  form: ProductForm;
  saving: boolean;
  notice: Notice;
  onChange: (key: keyof ProductForm, value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                New product
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                Add product and opening stock
              </AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                Save the product details owners and staff need for sales and stock control.
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[styles.closeButton, { borderColor: palette.border, opacity: saving ? 0.5 : 1 }]}
            >
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <NoticePanel notice={notice} palette={palette} />

            <Field label="Product name" value={form.name} placeholder="Example: HP EliteBook 840" palette={palette} onChangeText={(value) => onChange("name", value)} />
            <View style={styles.twoFields}>
              <View style={styles.fieldHalf}>
                <Field label="Brand" value={form.brand} placeholder="HP, Dell, Samsung" palette={palette} onChangeText={(value) => onChange("brand", value)} />
              </View>
              <View style={styles.fieldHalf}>
                <Field label="Category" value={form.category} placeholder="Laptop, Phone, Accessory" palette={palette} onChangeText={(value) => onChange("category", value)} />
              </View>
            </View>
            <View style={styles.twoFields}>
              <View style={styles.fieldHalf}>
                <Field label="Cost price" value={form.costPrice} placeholder="0" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("costPrice", value)} />
              </View>
              <View style={styles.fieldHalf}>
                <Field label="Selling price" value={form.sellPrice} placeholder="0" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("sellPrice", value)} />
              </View>
            </View>
            <View style={styles.twoFields}>
              <View style={styles.fieldHalf}>
                <Field label="Opening stock" value={form.stockQty} placeholder="0" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("stockQty", value)} />
              </View>
              <View style={styles.fieldHalf}>
                <Field label="Low-stock alert" value={form.minStockLevel} placeholder="Example: 3" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("minStockLevel", value)} />
              </View>
            </View>
            <Field label="Reference" value={form.sku} placeholder="SKU or internal reference" palette={palette} onChangeText={(value) => onChange("sku", value)} />
            <Field label="Barcode" value={form.barcode} placeholder="Scan or type barcode" palette={palette} onChangeText={(value) => onChange("barcode", value)} />
            <Field label="Serial number" value={form.serial} placeholder="For serialized items" palette={palette} onChangeText={(value) => onChange("serial", value)} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>
              Cancel
            </AsyncButton>
            <AsyncButton onPress={onSave} variant="primary" style={styles.footerButton} disabled={saving}>
              {saving ? "Saving" : "Save product"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AdjustmentModal({
  open,
  palette,
  product,
  form,
  saving,
  notice,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  product: StockProduct | null;
  form: AdjustmentForm;
  saving: boolean;
  notice: Notice;
  onChange: <K extends keyof AdjustmentForm>(key: K, value: AdjustmentForm[K]) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const currentQty = productQuantity(product);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>
                Stock change
              </AppText>
              <AppText variant="subtitle" color={palette.text}>
                {clean(product?.name, "Selected product")}
              </AppText>
              <AppText variant="caption" color={palette.soft}>
                Current stock: {currentQty.toLocaleString()} units
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[styles.closeButton, { borderColor: palette.border, opacity: saving ? 0.5 : 1 }]}
            >
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <NoticePanel notice={notice} palette={palette} />

            <View style={styles.choiceRow}>
              <FilterChip label="Restock" active={form.type === "RESTOCK"} tone="green" palette={palette} onPress={() => onChange("type", "RESTOCK")} />
              <FilterChip label="Reduce" active={form.type === "LOSS"} tone="red" palette={palette} onPress={() => onChange("type", "LOSS")} />
              <FilterChip label="Correct" active={form.type === "CORRECTION"} tone="blue" palette={palette} onPress={() => onChange("type", "CORRECTION")} />
            </View>

            {form.type === "CORRECTION" ? (
              <Field label="Correct stock count" value={form.newStockQty} placeholder="0" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("newStockQty", value)} />
            ) : (
              <Field label="Quantity" value={form.quantity} placeholder="0" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("quantity", value)} />
            )}

            {form.type === "LOSS" ? (
              <View style={styles.fieldWrap}>
                <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>
                  Reason
                </AppText>
                <View style={styles.choiceRow}>
                  {LOSS_REASONS.map((reason) => (
                    <FilterChip
                      key={reason.value}
                      label={reason.label}
                      active={form.lossReason === reason.value}
                      tone="red"
                      palette={palette}
                      onPress={() => onChange("lossReason", reason.value)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <Field
              label="Note"
              value={form.note}
              placeholder="Add a clear reason or proof note"
              palette={palette}
              multiline
              onChangeText={(value) => onChange("note", value)}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>
              Cancel
            </AsyncButton>
            <AsyncButton onPress={onSave} variant={form.type === "LOSS" ? "danger" : "primary"} style={styles.footerButton} disabled={saving}>
              {saving ? "Saving" : "Save change"}
            </AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
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

  noticePanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  noticeMark: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  controlPanel: {
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
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  panelButton: {
    minHeight: 42,
    paddingHorizontal: 14,
  },

  attentionBox: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    padding: 12,
    gap: 5,
  },

  movementList: {
    gap: 10,
  },

  movementCard: {
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },

  emptyMini: {
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },

  searchPanel: {
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchBox: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchStatusRow: {
    paddingHorizontal: 2,
  },

  clearSearchButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Quicksand_600SemiBold",
    fontSize: 13,
    paddingVertical: 0,
  },

  refreshButton: {
    minHeight: 48,
    paddingHorizontal: 14,
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

  productCard: {
    borderWidth: 1,
    padding: 13,
    gap: 12,
  },

  productHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  productIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  productTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  productTitle: {
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

  detailStack: {
    gap: 7,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top",
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

