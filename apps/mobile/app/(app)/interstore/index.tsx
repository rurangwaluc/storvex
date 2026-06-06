import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
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
import {
  dealRemainingQuantity,
  useCreateInterStoreDeal,
  useInternalSupplierProducts,
  useInternalSuppliers,
  useInterStoreDeals,
  useReceiveInterStoreDeal,
  useReturnInterStoreDeal,
  useSellInterStoreDeal,
} from "../../../src/features/interstore/hooks";
import type {
  InterStoreDeal,
  InterStoreDealStatus,
  InterStoreScopeMode,
  InterStoreSupplier,
  InterStoreSupplierFilter,
  InterStoreSupplierProduct,
} from "../../../src/features/interstore/types";
import { routes } from "../../../src/constants/routes";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";
type SupplierMode = "EXTERNAL" | "INTERNAL";

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

type DealForm = {
  supplierMode: SupplierMode;
  supplierSearch: string;
  supplierTenantId: string;
  supplierName: string;
  supplierPhone: string;
  productSearch: string;
  productId: string;
  productName: string;
  productCategory: string;
  serial: string;
  agreedPrice: string;
  resellerName: string;
  resellerPhone: string;
  resellerStore: string;
  dueDate: string;
  notes: string;
};

type SaleForm = {
  soldQuantity: string;
  soldPrice: string;
};

type ReturnForm = {
  returnedQuantity: string;
};

const PAGE_SIZE = 6;
const STATUSES: ("ALL" | InterStoreDealStatus)[] = [
  "ALL",
  "BORROWED",
  "RECEIVED",
  "SOLD",
  "PAID",
  "RETURNED",
];

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanOptional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function money(value: unknown) {
  return `RWF ${Math.round(toNumber(value, 0)).toLocaleString()}`;
}

function toDateLabel(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toIsoDate(value: string) {
  const cleanValue = clean(value, "");
  if (!cleanValue) return null;
  const d = new Date(cleanValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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

function statusMeta(status: unknown): { label: string; tone: Tone } {
  const key = String(status || "").toUpperCase();

  if (key === "BORROWED") return { label: "Borrowed", tone: "amber" };
  if (key === "RECEIVED") return { label: "Received", tone: "blue" };
  if (key === "SOLD") return { label: "Sold", tone: "cyan" };
  if (key === "PAID") return { label: "Paid", tone: "green" };
  if (key === "RETURNED") return { label: "Returned", tone: "slate" };

  return { label: key || "Unknown", tone: "slate" };
}

function supplierLabel(deal: InterStoreDeal) {
  if (deal.supplierTenantId) return "Internal store";
  return clean(deal.externalSupplierName, "External supplier");
}

function branchName(branch: { code?: string | null; name?: string | null } | null | undefined) {
  const code = clean(branch?.code, "");
  const name = clean(branch?.name, "");
  if (code && name) return `${code} · ${name}`;
  return name || code || "Current selling location";
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

function emptyDealForm(): DealForm {
  return {
    supplierMode: "EXTERNAL",
    supplierSearch: "",
    supplierTenantId: "",
    supplierName: "",
    supplierPhone: "",
    productSearch: "",
    productId: "",
    productName: "",
    productCategory: "",
    serial: "",
    agreedPrice: "",
    resellerName: "",
    resellerPhone: "",
    resellerStore: "",
    dueDate: "",
    notes: "",
  };
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
    <View style={[styles.summaryCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.summaryTop}>
        <View style={[styles.summaryIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <Ionicons name={icon} size={16} color={spec.fg} />
        </View>
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      </View>
      <AppText variant="subtitle" color={palette.text}>{value}</AppText>
      <AppText variant="caption" color={palette.soft} style={styles.cardText}>{helper}</AppText>
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
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.filterText}>{label}</AppText>
    </Pressable>
  );
}

function NoticePanel({ notice, palette }: { notice: Notice; palette: AppShellPalette }) {
  if (!notice) return null;
  const spec = toneSpec(notice.tone, palette);

  return (
    <View style={[styles.noticePanel, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
      <View style={[styles.noticeMark, { backgroundColor: spec.solid }]}> 
        <Ionicons name="checkmark-outline" size={15} color="#06111F" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" color={palette.text}>{notice.title}</AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>{notice.text}</AppText>
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
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.soft}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        style={[
          styles.input,
          multiline ? styles.textArea : null,
          { borderColor: palette.border, backgroundColor: palette.panel, color: palette.text },
        ]}
      />
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
      <View style={styles.responsiveGrid}>{[1, 2, 3, 4].map((item) => <View key={item} style={{ width: summaryWidth }}><Skeleton height={112} width="100%" /></View>)}</View>
      <Skeleton height={54} width="100%" />
      <View style={styles.responsiveGrid}>{[1, 2, 3, 4].map((item) => <View key={item} style={{ width: cardWidth }}><Skeleton height={228} width="100%" /></View>)}</View>
    </View>
  );
}
function DealCard({
  deal,
  palette,
  width,
  onViewDetails,
}: {
  deal: InterStoreDeal;
  palette: AppShellPalette;
  width: DimensionValue;
  onViewDetails: () => void;
}) {
  const meta = statusMeta(deal.status);
  const spec = toneSpec(meta.tone, palette);
  const remaining = dealRemainingQuantity(deal);
  const status = String(deal.status || "").toUpperCase();

  return (
    <View style={[styles.dealCard, { width, borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.dealHeader}>
        <View style={[styles.productIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <Ionicons name="swap-horizontal-outline" size={18} color={spec.fg} />
        </View>
        <View style={styles.productTitleWrap}>
          <AppText variant="label" color={palette.text} style={styles.productTitle}>{clean(deal.productName, "Product")}</AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>Serial {clean(deal.serial)}</AppText>
        </View>
        <View style={[styles.statusPill, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
          <AppText variant="caption" color={spec.fg} style={styles.statusText}>{meta.label}</AppText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Supplier</AppText>
          <AppText variant="label" color={palette.text}>{supplierLabel(deal)}</AppText>
        </View>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Reseller</AppText>
          <AppText variant="label" color={palette.text}>{clean(deal.resellerName)}</AppText>
        </View>
      </View>

      <View style={styles.detailStack}>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Agreed price</AppText>
          <AppText variant="caption" color={palette.text}>{money(deal.agreedPrice)}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Units</AppText>
          <AppText variant="caption" color={palette.text}>{clean(deal.quantity)} taken · {clean(deal.soldQuantity, "0")} sold · {remaining} left</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Due date</AppText>
          <AppText variant="caption" color={palette.text}>{toDateLabel(deal.dueDate)}</AppText>
        </View>
        <View style={styles.detailRow}>
          <AppText variant="caption" color={palette.soft}>Selling location</AppText>
          <AppText variant="caption" color={palette.text}>{branchName(deal.branch || deal.borrowerBranch)}</AppText>
        </View>
      </View>

      {deal.notes ? (
        <View style={[styles.noteBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>{deal.notes}</AppText>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <AsyncButton onPress={onViewDetails} variant="primary" fullWidth style={styles.actionButton}>
          View details
        </AsyncButton>
      </View>
    </View>
  );
}

export default function InterStoreScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(width, 760);
  const compact = layoutWidth < 560;

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const activeBranch = useBranchStore((state) => state.activeBranch);
  const branches = useBranchStore((state) => state.branches);

  const [scopeMode, setScopeMode] = useState<InterStoreScopeMode>("CURRENT");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | InterStoreDealStatus>("ALL");
  const [supplierFilter, setSupplierFilter] = useState<InterStoreSupplierFilter>("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [notice, setNotice] = useState<Notice>(null);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealForm, setDealForm] = useState<DealForm>(() => emptyDealForm());
  const [selectedDeal, setSelectedDeal] = useState<InterStoreDeal | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [saleForm, setSaleForm] = useState<SaleForm>({ soldQuantity: "1", soldPrice: "" });
  const [returnForm, setReturnForm] = useState<ReturnForm>({ returnedQuantity: "1" });

  const role = String(user?.role || "").toUpperCase();
  const canViewAllBranches = role === "OWNER";
  const scopeParams = useMemo(
    () => (scopeMode === "ALL" && canViewAllBranches ? { allBranches: true } : { branchId: activeBranchId }),
    [activeBranchId, canViewAllBranches, scopeMode],
  );

  const dealsQuery = useInterStoreDeals(scopeParams);
  const createDeal = useCreateInterStoreDeal();
  const receiveDeal = useReceiveInterStoreDeal(scopeParams);
  const sellDeal = useSellInterStoreDeal(scopeParams);
  const returnDeal = useReturnInterStoreDeal(scopeParams);
  const suppliersQuery = useInternalSuppliers(dealForm.supplierSearch);
  const supplierProductsQuery = useInternalSupplierProducts(dealForm.supplierTenantId || null, dealForm.productSearch);

  const isLoading = isHydrating || !user || !tenant || dealsQuery.isLoading;
  const isRefreshing = dealsQuery.isFetching;
  const deals = dealsQuery.data?.deals || [];
  const suppliers = suppliersQuery.data || [];
  const supplierProducts = supplierProductsQuery.data || [];

  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();

    return deals.filter((deal) => {
      const dealStatus = String(deal.status || "").toUpperCase();
      const isInternal = Boolean(deal.supplierTenantId);

      if (status !== "ALL" && dealStatus !== status) return false;
      if (supplierFilter === "INTERNAL" && !isInternal) return false;
      if (supplierFilter === "EXTERNAL" && isInternal) return false;

      if (!q) return true;

      return [
        deal.productName,
        deal.serial,
        deal.resellerName,
        deal.resellerPhone,
        deal.externalSupplierName,
        deal.branch?.name,
        deal.borrowerBranch?.name,
      ]
        .map((item) => String(item || "").toLowerCase())
        .some((item) => item.includes(q));
    });
  }, [deals, query, status, supplierFilter]);

  const visibleDeals = filteredDeals.slice(0, visibleCount);
  const hasMore = visibleDeals.length < filteredDeals.length;

  const summary = useMemo(() => {
    return {
      total: deals.length,
      borrowed: deals.filter((deal) => String(deal.status).toUpperCase() === "BORROWED").length,
      received: deals.filter((deal) => String(deal.status).toUpperCase() === "RECEIVED").length,
      sold: deals.filter((deal) => String(deal.status).toUpperCase() === "SOLD").length,
      paid: deals.filter((deal) => String(deal.status).toUpperCase() === "PAID").length,
    };
  }, [deals]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, status, supplierFilter, scopeMode, deals.length]);

  function updateDealForm(key: keyof DealForm, value: string) {
    setDealForm((current) => ({ ...current, [key]: value }));
  }

  function chooseSupplier(supplier: InterStoreSupplier) {
    setDealForm((current) => ({
      ...current,
      supplierTenantId: supplier.id,
      supplierSearch: clean(supplier.name, ""),
      productId: "",
      productName: "",
      productCategory: "",
      serial: "",
      agreedPrice: "",
    }));
  }

  function chooseSupplierProduct(product: InterStoreSupplierProduct) {
    setDealForm((current) => ({
      ...current,
      productId: product.id,
      productSearch: clean(product.name, ""),
      productName: clean(product.name, ""),
      productCategory: clean(product.category, ""),
      serial: clean(product.serial || product.sku || product.barcode, ""),
      agreedPrice: String(toNumber(product.suggestedPrice, 0) || ""),
    }));
  }

  function openNewDeal() {
    setDealForm(emptyDealForm());
    setNotice(null);
    setDealModalOpen(true);
  }

  async function refreshAll() {
    await dealsQuery.refetch();
  }

  function validateDealForm() {
    if (dealForm.supplierMode === "INTERNAL") {
      if (!dealForm.supplierTenantId) return "Choose the internal store supplying this product.";
      if (!dealForm.productId) return "Choose the product from that internal store.";
    } else {
      if (!dealForm.supplierName.trim()) return "Supplier name is required.";
    }

    if (!dealForm.productName.trim()) return "Product name is required.";
    if (!dealForm.serial.trim()) return "Serial or product reference is required.";
    if (!dealForm.resellerName.trim()) return "Reseller name is required.";
    if (!dealForm.resellerPhone.trim()) return "Reseller phone is required.";

    const price = Number(dealForm.agreedPrice);
    if (!Number.isFinite(price) || price <= 0) return "Agreed price must be greater than 0.";

    if (dealForm.dueDate.trim() && !toIsoDate(dealForm.dueDate)) {
      return "Due date must be a valid date.";
    }

    return null;
  }

  async function saveDeal() {
    const error = validateDealForm();
    if (error) {
      Alert.alert("Check movement details", error);
      return;
    }

    await createDeal.mutateAsync({
      supplierTenantId: dealForm.supplierMode === "INTERNAL" ? dealForm.supplierTenantId : null,
      externalSupplierName: dealForm.supplierMode === "EXTERNAL" ? dealForm.supplierName.trim() : null,
      externalSupplierPhone: dealForm.supplierMode === "EXTERNAL" ? cleanOptional(dealForm.supplierPhone) : null,
      productId: dealForm.supplierMode === "INTERNAL" ? dealForm.productId : null,
      productName: dealForm.productName.trim(),
      productCategory: cleanOptional(dealForm.productCategory),
      serial: dealForm.serial.trim(),
      quantity: 1,
      agreedPrice: dealForm.agreedPrice,
      resellerName: dealForm.resellerName.trim(),
      resellerPhone: dealForm.resellerPhone.trim(),
      resellerStore: cleanOptional(dealForm.resellerStore),
      dueDate: toIsoDate(dealForm.dueDate),
      notes: cleanOptional(dealForm.notes),
    });

    setDealModalOpen(false);
    setNotice({
      tone: "green",
      title: "Movement recorded",
      text: "The product movement is now visible in this selling location.",
    });
  }

  function confirmReceive(deal: InterStoreDeal) {
    Alert.alert(
      "Receive this product?",
      "Receiving adds the product into stock for this selling location.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Receive",
          onPress: async () => {
            await receiveDeal.mutateAsync(deal.id);
            setNotice({ tone: "green", title: "Product received", text: `${clean(deal.productName, "Product")} is now marked as received.` });
          },
        },
      ],
    );
  }

  function openSale(deal: InterStoreDeal) {
    setSelectedDeal(deal);
    setSaleForm({ soldQuantity: "1", soldPrice: deal.soldPrice ? String(deal.soldPrice) : "" });
    setSaleModalOpen(true);
  }

  function openReturn(deal: InterStoreDeal) {
    setSelectedDeal(deal);
    setReturnForm({ returnedQuantity: "1" });
    setReturnModalOpen(true);
  }

  async function saveSale() {
    if (!selectedDeal) return;
    const quantity = Number(saleForm.soldQuantity);
    const price = saleForm.soldPrice.trim() ? Number(saleForm.soldPrice) : null;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert("Check sale", "Sold quantity must be greater than 0.");
      return;
    }

    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      Alert.alert("Check sale", "Sold price must be greater than 0.");
      return;
    }

    await sellDeal.mutateAsync({
      id: selectedDeal.id,
      payload: {
        soldQuantity: quantity,
        soldPrice: price ?? undefined,
      },
    });

    setSaleModalOpen(false);
    setSelectedDeal(null);
    setNotice({ tone: "green", title: "Sale recorded", text: "The inter-store sale was recorded." });
  }

  async function saveReturn() {
    if (!selectedDeal) return;
    const quantity = Number(returnForm.returnedQuantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert("Check return", "Returned quantity must be greater than 0.");
      return;
    }

    await returnDeal.mutateAsync({
      id: selectedDeal.id,
      payload: { returnedQuantity: quantity },
    });

    setReturnModalOpen(false);
    setSelectedDeal(null);
    setNotice({ tone: "green", title: "Return recorded", text: "The return was recorded for this product movement." });
  }

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <ScreenSkeleton palette={palette} layoutWidth={layoutWidth} />
        ) : (
          <View style={[styles.stack, styles.screenBottomSpace]}>
            <View style={[styles.heroPanel, compact ? styles.heroPanelCompact : null, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.10)" }]}> 
              <View style={styles.heroGlow} />
              <View style={styles.heroTop}>
                <View style={[styles.heroIcon, compact ? styles.heroIconCompact : null]}> 
                  <Ionicons name="swap-horizontal-outline" size={compact ? 20 : 23} color="#06111F" />
                </View>
                <View style={styles.heroContent}>
                  <View style={styles.heroLabelRow}>
                    <View style={styles.heroDot} />
                    <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Inter-store movement</AppText>
                  </View>
                  <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>Control products taken from other stores.</AppText>
                  <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                    Track borrowed products, receipt, sales progress, returns, and supplier settlement for {branchName(activeBranch)}.
                  </AppText>
                </View>
                {!compact ? <AsyncButton onPress={openNewDeal} variant="primary" style={styles.heroButton}>New movement</AsyncButton> : null}
              </View>
              {compact ? <AsyncButton onPress={openNewDeal} variant="primary" fullWidth>New movement</AsyncButton> : null}
            </View>

            <NoticePanel notice={notice} palette={palette} />

            <View style={styles.responsiveGrid}>
              <SummaryCard label="Total" value={String(summary.total)} helper="Visible movements" icon="albums-outline" tone="cyan" palette={palette} width={summaryWidth} />
              <SummaryCard label="Borrowed" value={String(summary.borrowed)} helper="Waiting to receive" icon="time-outline" tone="amber" palette={palette} width={summaryWidth} />
              <SummaryCard label="Received" value={String(summary.received)} helper="Inside stock" icon="download-outline" tone="blue" palette={palette} width={summaryWidth} />
              <SummaryCard label="Sold" value={String(summary.sold)} helper="Needs settlement" icon="cash-outline" tone="green" palette={palette} width={summaryWidth} />
            </View>

            <View style={[styles.searchPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <View style={styles.searchRow}>
                <View style={[styles.searchBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
                  <Ionicons name="search-outline" size={17} color={palette.soft} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search product, serial, reseller, or supplier"
                    placeholderTextColor={palette.soft}
                    style={[styles.searchInput, { color: palette.text }]}
                  />
                </View>
                <AsyncButton onPress={refreshAll} variant="secondary" style={styles.refreshButton}>{isRefreshing ? "Refreshing" : "Refresh"}</AsyncButton>
              </View>

              <View style={styles.filterRow}>
                {STATUSES.map((item) => (
                  <FilterChip key={item} label={item === "ALL" ? "All" : statusMeta(item).label} active={status === item} tone={item === "ALL" ? "cyan" : statusMeta(item).tone} palette={palette} onPress={() => setStatus(item)} />
                ))}
                <FilterChip label="Internal" active={supplierFilter === "INTERNAL"} tone="blue" palette={palette} onPress={() => setSupplierFilter(supplierFilter === "INTERNAL" ? "ALL" : "INTERNAL")} />
                <FilterChip label="External" active={supplierFilter === "EXTERNAL"} tone="slate" palette={palette} onPress={() => setSupplierFilter(supplierFilter === "EXTERNAL" ? "ALL" : "EXTERNAL")} />
              </View>

              {canViewAllBranches && branches.length > 1 ? (
                <View style={styles.filterRow}>
                  <FilterChip label="Current location" active={scopeMode === "CURRENT"} tone="cyan" palette={palette} onPress={() => setScopeMode("CURRENT")} />
                  <FilterChip label="All locations" active={scopeMode === "ALL"} tone="blue" palette={palette} onPress={() => setScopeMode("ALL")} />
                </View>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Movement records</AppText>
                <AppText variant="subtitle" color={palette.text}>Inter-store records</AppText>
              </View>
              <AppText variant="caption" color={palette.soft}>{visibleDeals.length} of {filteredDeals.length} shown</AppText>
            </View>

            {dealsQuery.isError ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} />
                <AppText variant="subtitle" color={palette.text} center>Movements could not load</AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>Check the connection and refresh this screen.</AppText>
                <AsyncButton onPress={refreshAll} variant="secondary">Try again</AsyncButton>
              </View>
            ) : filteredDeals.length === 0 ? (
              <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <Ionicons name="swap-horizontal-outline" size={32} color={palette.cyan} />
                <AppText variant="subtitle" color={palette.text} center>No movements found</AppText>
                <AppText variant="caption" color={palette.soft} center style={styles.cardText}>Record the first product taken from another store or supplier.</AppText>
                <AsyncButton onPress={openNewDeal} variant="primary">New movement</AsyncButton>
              </View>
            ) : (
              <>
                <View style={styles.responsiveGrid}>
                  {visibleDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} palette={palette} width={cardWidth} onViewDetails={() => router.push(routes.interstoreDetail(deal.id))} />
                  ))}
                </View>
                {filteredDeals.length > PAGE_SIZE ? (
                  <AsyncButton onPress={() => setVisibleCount(hasMore ? filteredDeals.length : PAGE_SIZE)} variant="secondary" fullWidth>
                    {hasMore ? `View ${filteredDeals.length - visibleDeals.length} more` : "Show fewer"}
                  </AsyncButton>
                ) : null}
              </>
            )}

            <DealModal
              open={dealModalOpen}
              palette={palette}
              form={dealForm}
              suppliers={suppliers}
              supplierProducts={supplierProducts}
              supplierLoading={suppliersQuery.isFetching}
              productLoading={supplierProductsQuery.isFetching}
              saving={createDeal.isPending}
              onChange={updateDealForm}
              onChooseSupplier={chooseSupplier}
              onChooseProduct={chooseSupplierProduct}
              onClose={() => setDealModalOpen(false)}
              onSave={saveDeal}
            />

            <SaleModal open={saleModalOpen} palette={palette} deal={selectedDeal} form={saleForm} saving={sellDeal.isPending} onChange={(key, value) => setSaleForm((current) => ({ ...current, [key]: value }))} onClose={() => { setSaleModalOpen(false); setSelectedDeal(null); }} onSave={saveSale} />
            <ReturnModal open={returnModalOpen} palette={palette} deal={selectedDeal} form={returnForm} saving={returnDeal.isPending} onChange={(value) => setReturnForm({ returnedQuantity: value })} onClose={() => { setReturnModalOpen(false); setSelectedDeal(null); }} onSave={saveReturn} />
          </View>
        )
      }
    </AppShell>
  );
}
function DealModal({
  open,
  palette,
  form,
  suppliers,
  supplierProducts,
  supplierLoading,
  productLoading,
  saving,
  onChange,
  onChooseSupplier,
  onChooseProduct,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  form: DealForm;
  suppliers: InterStoreSupplier[];
  supplierProducts: InterStoreSupplierProduct[];
  supplierLoading: boolean;
  productLoading: boolean;
  saving: boolean;
  onChange: (key: keyof DealForm, value: string) => void;
  onChooseSupplier: (supplier: InterStoreSupplier) => void;
  onChooseProduct: (product: InterStoreSupplierProduct) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>New movement</AppText>
              <AppText variant="subtitle" color={palette.text}>Record product taken from another store</AppText>
            </View>
            <Pressable onPress={onClose} style={[styles.closeButton, { borderColor: palette.border }]}> 
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.choiceRow}>
              <FilterChip label="External supplier" active={form.supplierMode === "EXTERNAL"} tone="cyan" palette={palette} onPress={() => onChange("supplierMode", "EXTERNAL")} />
              <FilterChip label="Internal store" active={form.supplierMode === "INTERNAL"} tone="blue" palette={palette} onPress={() => onChange("supplierMode", "INTERNAL")} />
            </View>

            {form.supplierMode === "EXTERNAL" ? (
              <>
                <Field label="Supplier name" value={form.supplierName} placeholder="Example: Kigali Tech Store" palette={palette} onChangeText={(value) => onChange("supplierName", value)} />
                <Field label="Supplier phone" value={form.supplierPhone} placeholder="Optional phone" palette={palette} keyboardType="phone-pad" onChangeText={(value) => onChange("supplierPhone", value)} />
                <Field label="Product name" value={form.productName} placeholder="Example: HP EliteBook 840" palette={palette} onChangeText={(value) => onChange("productName", value)} />
                <Field label="Category" value={form.productCategory} placeholder="Laptop, Phone, Accessory" palette={palette} onChangeText={(value) => onChange("productCategory", value)} />
                <Field label="Serial or reference" value={form.serial} placeholder="Serial number or product reference" palette={palette} onChangeText={(value) => onChange("serial", value)} />
              </>
            ) : (
              <>
                <Field label="Find internal store" value={form.supplierSearch} placeholder="Search store name, phone, or email" palette={palette} onChangeText={(value) => onChange("supplierSearch", value)} />
                <View style={styles.selectionList}>
                  {supplierLoading ? <AppText variant="caption" color={palette.soft}>Searching stores...</AppText> : null}
                  {suppliers.slice(0, 5).map((supplier) => {
                    const selected = form.supplierTenantId === supplier.id;
                    const spec = toneSpec(selected ? "blue" : "slate", palette);
                    return (
                      <Pressable key={supplier.id} onPress={() => onChooseSupplier(supplier)} style={[styles.selectionRow, { borderColor: selected ? spec.border : palette.border, backgroundColor: selected ? spec.bg : palette.panel }]}> 
                        <View style={{ flex: 1, gap: 3 }}>
                          <AppText variant="label" color={selected ? spec.fg : palette.text}>{clean(supplier.name, "Store")}</AppText>
                          <AppText variant="caption" color={palette.soft}>{clean(supplier.phone || supplier.email, "No contact")}</AppText>
                        </View>
                        {selected ? <Ionicons name="checkmark-circle-outline" size={20} color={spec.fg} /> : null}
                      </Pressable>
                    );
                  })}
                </View>

                <Field label="Find supplier product" value={form.productSearch} placeholder="Search product, serial, barcode, or brand" palette={palette} onChangeText={(value) => onChange("productSearch", value)} />
                <View style={styles.selectionList}>
                  {!form.supplierTenantId ? <AppText variant="caption" color={palette.soft}>Choose an internal store first.</AppText> : null}
                  {productLoading ? <AppText variant="caption" color={palette.soft}>Searching products...</AppText> : null}
                  {supplierProducts.slice(0, 5).map((product) => {
                    const selected = form.productId === product.id;
                    const spec = toneSpec(selected ? "green" : "slate", palette);
                    return (
                      <Pressable key={product.id} onPress={() => onChooseProduct(product)} style={[styles.selectionRow, { borderColor: selected ? spec.border : palette.border, backgroundColor: selected ? spec.bg : palette.panel }]}> 
                        <View style={{ flex: 1, gap: 3 }}>
                          <AppText variant="label" color={selected ? spec.fg : palette.text}>{clean(product.name, "Product")}</AppText>
                          <AppText variant="caption" color={palette.soft}>{clean(product.serial || product.sku || product.barcode, "No reference")} · {clean(product.stockQty, "0")} available</AppText>
                        </View>
                        {selected ? <Ionicons name="checkmark-circle-outline" size={20} color={spec.fg} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.twoFields}>
              <View style={styles.fieldHalf}>
                <Field label="Agreed price" value={form.agreedPrice} placeholder="0" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("agreedPrice", value)} />
              </View>
              <View style={styles.fieldHalf}>
                <Field label="Due date" value={form.dueDate} placeholder="YYYY-MM-DD" palette={palette} onChangeText={(value) => onChange("dueDate", value)} />
              </View>
            </View>

            <View style={[styles.noticePanel, { borderColor: toneSpec("amber", palette).border, backgroundColor: toneSpec("amber", palette).bg }]}> 
              <Ionicons name="information-circle-outline" size={22} color={toneSpec("amber", palette).fg} />
              <AppText variant="caption" color={palette.soft} style={[styles.cardText, { flex: 1 }]}>For serialized electronics, one movement record handles one unit. Use a separate record for each serial.</AppText>
            </View>

            <Field label="Reseller name" value={form.resellerName} placeholder="Person taking or reselling the product" palette={palette} onChangeText={(value) => onChange("resellerName", value)} />
            <Field label="Reseller phone" value={form.resellerPhone} placeholder="Phone number" palette={palette} keyboardType="phone-pad" onChangeText={(value) => onChange("resellerPhone", value)} />
            <Field label="Reseller store" value={form.resellerStore} placeholder="Optional store or workplace" palette={palette} onChangeText={(value) => onChange("resellerStore", value)} />
            <Field label="Note" value={form.notes} placeholder="Add clear movement notes" palette={palette} multiline onChangeText={(value) => onChange("notes", value)} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>Cancel</AsyncButton>
            <AsyncButton onPress={onSave} variant="primary" style={styles.footerButton} disabled={saving}>{saving ? "Saving" : "Save movement"}</AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SaleModal({
  open,
  palette,
  deal,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  deal: InterStoreDeal | null;
  form: SaleForm;
  saving: boolean;
  onChange: (key: keyof SaleForm, value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Record sale</AppText>
              <AppText variant="subtitle" color={palette.text}>{clean(deal?.productName, "Selected product")}</AppText>
              <AppText variant="caption" color={palette.soft}>Remaining units: {dealRemainingQuantity(deal)}</AppText>
            </View>
            <Pressable onPress={onClose} style={[styles.closeButton, { borderColor: palette.border }]}> 
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <Field label="Sold quantity" value={form.soldQuantity} placeholder="1" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("soldQuantity", value)} />
            <Field label="Sold price" value={form.soldPrice} placeholder="Optional" palette={palette} keyboardType="numeric" onChangeText={(value) => onChange("soldPrice", value)} />
          </View>
          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>Cancel</AsyncButton>
            <AsyncButton onPress={onSave} variant="primary" style={styles.footerButton} disabled={saving}>{saving ? "Saving" : "Save sale"}</AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReturnModal({
  open,
  palette,
  deal,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  palette: AppShellPalette;
  deal: InterStoreDeal | null;
  form: ReturnForm;
  saving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={toneSpec("red", palette).fg} style={styles.eyebrow}>Record return</AppText>
              <AppText variant="subtitle" color={palette.text}>{clean(deal?.productName, "Selected product")}</AppText>
              <AppText variant="caption" color={palette.soft}>Remaining units: {dealRemainingQuantity(deal)}</AppText>
            </View>
            <Pressable onPress={onClose} style={[styles.closeButton, { borderColor: palette.border }]}> 
              <Ionicons name="close-outline" size={22} color={palette.text} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <Field label="Returned quantity" value={form.returnedQuantity} placeholder="1" palette={palette} keyboardType="numeric" onChangeText={onChange} />
            <View style={[styles.noticePanel, { borderColor: toneSpec("red", palette).border, backgroundColor: toneSpec("red", palette).bg }]}> 
              <Ionicons name="alert-circle-outline" size={22} color={toneSpec("red", palette).fg} />
              <AppText variant="caption" color={palette.soft} style={[styles.cardText, { flex: 1 }]}>Confirm that the product is physically leaving this selling location.</AppText>
            </View>
          </View>
          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>Cancel</AsyncButton>
            <AsyncButton onPress={onSave} variant="danger" style={styles.footerButton} disabled={saving}>{saving ? "Saving" : "Save return"}</AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  screenBottomSpace: { paddingBottom: 30 },
  eyebrow: { letterSpacing: 0.8, textTransform: "uppercase" },
  heroPanel: { position: "relative", overflow: "hidden", borderWidth: 1, padding: 16, gap: 16 },
  heroPanelCompact: { padding: 14, gap: 14 },
  heroGlow: { position: "absolute", right: -88, top: -88, width: 178, height: 178, backgroundColor: "rgba(32, 200, 255, 0.12)", transform: [{ rotate: "18deg" }] },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroIcon: { width: 56, height: 56, alignItems: "center", justifyContent: "center", backgroundColor: "#67E8F9" },
  heroIconCompact: { width: 46, height: 46 },
  heroContent: { flex: 1, minWidth: 0, maxWidth: "100%", gap: 6 },
  heroLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  heroDot: { width: 6, height: 6, backgroundColor: "#67E8F9" },
  heroTitle: { lineHeight: 24 },
  heroButton: { minHeight: 44, paddingHorizontal: 16 },
  responsiveGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { minHeight: 112, borderWidth: 1, padding: 13, gap: 8 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryIcon: { width: 30, height: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cardText: { flexShrink: 1, lineHeight: 18 },
  noticePanel: { borderWidth: 1, padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  noticeMark: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  searchPanel: { borderWidth: 1, padding: 12, gap: 10 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBox: { flex: 1, minHeight: 48, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minWidth: 0, fontFamily: "Quicksand_600SemiBold", fontSize: 13, paddingVertical: 0 },
  refreshButton: { minHeight: 48, paddingHorizontal: 14 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  filterText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  dealCard: { borderWidth: 1, padding: 13, gap: 12 },
  dealHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  productIcon: { width: 34, height: 34, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  productTitleWrap: { flex: 1, minWidth: 0, gap: 4 },
  productTitle: { lineHeight: 18 },
  statusPill: { flexShrink: 0, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  infoGrid: { flexDirection: "row", gap: 8 },
  infoBox: { flex: 1, borderWidth: 1, padding: 10, gap: 5 },
  detailStack: { gap: 7 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  noteBox: { borderWidth: 1, borderStyle: "dashed", padding: 10 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, minHeight: 48 },
  closedPanel: { flex: 1, borderWidth: 1, padding: 12 },
  emptyPanel: { borderWidth: 1, padding: 22, alignItems: "center", gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.68)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 560, maxHeight: "92%", borderWidth: 1, overflow: "hidden" },
  modalHeader: { padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  closeButton: { width: 38, height: 38, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalScroll: { maxHeight: 560 },
  modalBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  fieldWrap: { gap: 7 },
  input: { minHeight: 50, borderWidth: 1, paddingHorizontal: 13, fontFamily: "Quicksand_600SemiBold", fontSize: 14 },
  textArea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  twoFields: { flexDirection: "row", gap: 10 },
  fieldHalf: { flex: 1, minWidth: 0 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectionList: { gap: 8 },
  selectionRow: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  modalFooter: { padding: 16, flexDirection: "row", gap: 10 },
  footerButton: { flex: 1, minHeight: 52 },
});
