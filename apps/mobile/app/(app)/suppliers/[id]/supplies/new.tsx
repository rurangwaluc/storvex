import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type KeyboardTypeOptions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../../../src/components/app/AppShell";
import { AppText } from "../../../../../src/components/ui/AppText";
import { AsyncButton } from "../../../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../../../src/components/ui/Skeleton";
import { routes } from "../../../../../src/constants/routes";
import {
  supplierSourceLabel,
  useCreateSupplierSupply,
  useSupplier,
} from "../../../../../src/features/suppliers/hooks";
import type {
  SupplierSourceType,
  SupplierSupplyPayload,
} from "../../../../../src/features/suppliers/types";
import { useBranchStore } from "../../../../../src/store/branchStore";

const ACCENT = "#22C7F4";
const GREEN = "#34D399";
const AMBER = "#FBBF24";
const RED = "#FB7185";

const SOURCE_TYPES: Array<{ value: SupplierSourceType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "BOUGHT", label: "Bought stock", icon: "cash-outline" },
  { value: "GIFT", label: "Gifted stock", icon: "gift-outline" },
  { value: "TRADE_IN", label: "Trade-in", icon: "swap-horizontal-outline" },
  { value: "CONSIGNMENT", label: "Consignment", icon: "business-outline" },
  { value: "OTHER", label: "Other source", icon: "cube-outline" },
];

type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

type SupplyItemForm = {
  productId: string;
  productName: string;
  category: string;
  brand: string;
  serial: string;
  quantity: string;
  buyPrice: string;
  sellPrice: string;
  notes: string;
};

type SupplyForm = {
  sourceType: SupplierSourceType;
  sourceDetails: string;
  documentRef: string;
  notes: string;
  alsoUpdateStock: boolean;
  items: SupplyItemForm[];
};

const EMPTY_ITEM: SupplyItemForm = {
  productId: "",
  productName: "",
  category: "",
  brand: "",
  serial: "",
  quantity: "1",
  buyPrice: "",
  sellPrice: "",
  notes: "",
};

function emptyForm(): SupplyForm {
  return {
    sourceType: "BOUGHT",
    sourceDetails: "",
    documentRef: "",
    notes: "",
    alsoUpdateStock: true,
    items: [{ ...EMPTY_ITEM }],
  };
}

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
    bg: "rgba(34, 199, 244, 0.12)",
    border: "rgba(34, 199, 244, 0.30)",
    solid: ACCENT,
  };
}

function supplyErrorMessage(error: unknown) {
  const err = error as {
    message?: string;
    response?: { data?: { code?: string; message?: string; error?: string } };
  };

  const code = String(err?.response?.data?.code || err?.response?.data?.error || "").toUpperCase();

  if (code === "SUPPLIER_NOT_FOUND") return "This supplier could not be found.";
  if (code === "ITEMS_REQUIRED") return "Add at least one supplied item.";
  if (code === "PRODUCT_NAME_REQUIRED") return "Every supplied item needs a product name.";
  if (code === "QUANTITY_INVALID") return "Quantity must be more than 0.";
  if (code === "BUY_PRICE_INVALID") return "Buying price must be 0 or more.";
  if (code === "SELL_PRICE_INVALID") return "Selling price must be 0 or more.";
  if (code === "BRANCH_REQUIRED") return "Choose the receiving selling location before recording stock.";
  if (code === "SUBSCRIPTION_REQUIRED") return "Business access needs attention before supplier stock can be recorded.";

  return err?.response?.data?.message || err?.message || "Supplier stock could not be saved. Please try again.";
}

function branchDisplayName(branch?: { code?: string | null; name?: string | null } | null) {
  const name = clean(branch?.name, "");
  const code = clean(branch?.code, "");

  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;

  return "current selling location";
}

function calculateTotals(items: SupplyItemForm[]) {
  return items.reduce(
    (acc, item) => {
      const quantity = Math.max(0, num(item.quantity, 0));
      const buyPrice = Math.max(0, num(item.buyPrice, 0));
      const sellPrice = Math.max(0, num(item.sellPrice, 0));

      acc.units += quantity;
      acc.totalCost += quantity * buyPrice;
      acc.expectedSales += quantity * sellPrice;

      return acc;
    },
    { units: 0, totalCost: 0, expectedSales: 0 },
  );
}

function NoticePanel({ notice, palette }: { notice: Notice; palette: AppShellPalette }) {
  if (!notice) return null;

  const spec = toneSpec(notice.tone, palette);

  return (
    <View style={[styles.noticePanel, { borderColor: spec.border, backgroundColor: spec.bg }]}> 
      <Ionicons name={notice.tone === "red" ? "warning-outline" : "checkmark-circle-outline"} size={20} color={spec.fg} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
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
  keyboardType?: KeyboardTypeOptions;
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

function ChoiceChip({
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
        styles.choiceChip,
        {
          borderColor: active ? spec.border : palette.border,
          backgroundColor: active ? spec.bg : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.chipText}>{label}</AppText>
    </Pressable>
  );
}

function SummaryCard({ label, value, helper, icon, tone, palette }: { label: string; value: string; helper: string; icon: keyof typeof Ionicons.glyphMap; tone: Tone; palette: AppShellPalette }) {
  const spec = toneSpec(tone, palette);

  return (
    <View style={[styles.summaryCard, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
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

function SupplyItemCard({
  item,
  index,
  canRemove,
  showDetails,
  palette,
  onChange,
  onRemove,
  onToggleDetails,
}: {
  item: SupplyItemForm;
  index: number;
  canRemove: boolean;
  showDetails: boolean;
  palette: AppShellPalette;
  onChange: (index: number, item: SupplyItemForm) => void;
  onRemove: (index: number) => void;
  onToggleDetails: (index: number) => void;
}) {
  const quantity = Math.max(0, num(item.quantity, 0));
  const totalCost = quantity * Math.max(0, num(item.buyPrice, 0));
  const expectedSales = quantity * Math.max(0, num(item.sellPrice, 0));

  function setField(key: keyof SupplyItemForm, value: string) {
    onChange(index, { ...item, [key]: value });
  }

  return (
    <View style={[styles.itemCard, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
      <View style={styles.itemHeader}>
        <View style={[styles.itemIcon, { borderColor: toneSpec("cyan", palette).border, backgroundColor: toneSpec("cyan", palette).bg }]}> 
          <Ionicons name="cube-outline" size={17} color={palette.cyan} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>Item {index + 1}</AppText>
          <AppText variant="subtitle" color={palette.text} numberOfLines={1}>{clean(item.productName, "New stock item")}</AppText>
        </View>
        {canRemove ? (
          <Pressable onPress={() => onRemove(index)} style={[styles.removeButton, { borderColor: toneSpec("red", palette).border, backgroundColor: toneSpec("red", palette).bg }]}> 
            <Ionicons name="trash-outline" size={16} color={toneSpec("red", palette).fg} />
          </Pressable>
        ) : null}
      </View>

      <Field label="Product name" value={item.productName} placeholder="Example: HP EliteBook 840" palette={palette} onChangeText={(value) => setField("productName", value)} />

      <View style={styles.twoFields}>
        <View style={styles.fieldHalf}><Field label="Quantity" value={item.quantity} placeholder="1" keyboardType="numeric" palette={palette} onChangeText={(value) => setField("quantity", value)} /></View>
        <View style={styles.fieldHalf}><Field label="Buying price" value={item.buyPrice} placeholder="0" keyboardType="numeric" palette={palette} onChangeText={(value) => setField("buyPrice", value)} /></View>
      </View>

      <Field label="Selling price" value={item.sellPrice} placeholder="0" keyboardType="numeric" palette={palette} onChangeText={(value) => setField("sellPrice", value)} />

      <Pressable
        onPress={() => onToggleDetails(index)}
        style={({ pressed }) => [
          styles.moreDetailsButton,
          {
            borderColor: palette.border,
            backgroundColor: palette.stage,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <Ionicons name={showDetails ? "chevron-up-outline" : "chevron-down-outline"} size={17} color={palette.soft} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <AppText variant="label" color={palette.text}>
            {showDetails ? "Hide item details" : "More item details"}
          </AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>
            Brand, category, serial, IMEI, warranty, or condition note.
          </AppText>
        </View>
      </Pressable>

      {showDetails ? (
        <View style={styles.advancedStack}>
          <View style={styles.twoFields}>
            <View style={styles.fieldHalf}><Field label="Category" value={item.category} placeholder="Phone, Laptop, Accessory" palette={palette} onChangeText={(value) => setField("category", value)} /></View>
            <View style={styles.fieldHalf}><Field label="Brand" value={item.brand} placeholder="Samsung, HP, Lenovo" palette={palette} onChangeText={(value) => setField("brand", value)} /></View>
          </View>

          <Field label="Serial or IMEI" value={item.serial} placeholder="Optional, useful for high-value items" palette={palette} onChangeText={(value) => setField("serial", value)} />
          <Field label="Item note" value={item.notes} placeholder="Condition, warranty, packaging, or supplier promise" palette={palette} multiline onChangeText={(value) => setField("notes", value)} />
        </View>
      ) : null}

      <View style={styles.itemStats}>
        <View style={[styles.statBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Cost</AppText>
          <AppText variant="label" color={palette.text}>{money(totalCost)}</AppText>
        </View>
        <View style={[styles.statBox, { borderColor: palette.border, backgroundColor: palette.stage }]}> 
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Expected sales</AppText>
          <AppText variant="label" color={palette.text}>{money(expectedSales)}</AppText>
        </View>
      </View>
    </View>
  );
}

export default function SupplierSupplyNewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const supplierId = String(id || "");
  const compact = Math.min(width, 760) < 560;
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const supplierQuery = useSupplier(supplierId);
  const createSupply = useCreateSupplierSupply();

  const [form, setForm] = useState<SupplyForm>(() => emptyForm());
  const [notice, setNotice] = useState<Notice>(null);
  const [showSupplyDetails, setShowSupplyDetails] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const supplier = supplierQuery.data || null;
  const totals = useMemo(() => calculateTotals(form.items), [form.items]);

  function updateForm<K extends keyof SupplyForm>(key: K, value: SupplyForm[K]) {
    setNotice(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, item: SupplyItemForm) {
    setNotice(null);
    setForm((current) => ({
      ...current,
      items: current.items.map((currentItem, itemIndex) => (itemIndex === index ? item : currentItem)),
    }));
  }

  function addItem() {
    setNotice(null);
    setForm((current) => ({ ...current, items: [...current.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(index: number) {
    setNotice(null);
    setExpandedItems((current) => {
      const next: Record<number, boolean> = {};

      Object.entries(current).forEach(([key, value]) => {
        const currentIndex = Number(key);
        if (!Number.isInteger(currentIndex) || currentIndex === index) return;
        next[currentIndex > index ? currentIndex - 1 : currentIndex] = value;
      });

      return next;
    });

    setForm((current) => {
      const nextItems = current.items.filter((_item, itemIndex) => itemIndex !== index);
      return { ...current, items: nextItems.length ? nextItems : [{ ...EMPTY_ITEM }] };
    });
  }

  function toggleItemDetails(index: number) {
    setExpandedItems((current) => ({ ...current, [index]: !current[index] }));
  }

  function validatePayload(payload: SupplierSupplyPayload) {
    if (!payload.items.length) {
      return "Add at least one supplied item.";
    }

    for (let index = 0; index < payload.items.length; index += 1) {
      const item = payload.items[index];
      const row = index + 1;

      if (!item.productName.trim()) return `Item ${row} needs a product name.`;
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) return `Item ${row} quantity must be more than 0.`;
      if (!Number.isFinite(item.buyPrice) || item.buyPrice < 0) return `Item ${row} buying price must be 0 or more.`;
      if (!Number.isFinite(item.sellPrice) || item.sellPrice < 0) return `Item ${row} selling price must be 0 or more.`;
    }

    return null;
  }

  async function saveSupply() {
    if (!supplierId) return;

    const payload: SupplierSupplyPayload = {
      sourceType: form.sourceType,
      sourceDetails: clean(form.sourceDetails, "") || null,
      documentRef: clean(form.documentRef, "") || null,
      notes: clean(form.notes, "") || null,
      alsoUpdateStock: Boolean(form.alsoUpdateStock),
      items: form.items.map((item) => ({
        productId: clean(item.productId, "") || null,
        productName: clean(item.productName, ""),
        category: clean(item.category, "") || null,
        subcategory: null,
        subcategoryOther: null,
        brand: clean(item.brand, "") || null,
        serial: clean(item.serial, "") || null,
        quantity: Math.floor(num(item.quantity, 0)),
        buyPrice: num(item.buyPrice, 0),
        sellPrice: num(item.sellPrice, 0),
        notes: clean(item.notes, "") || null,
      })),
    };

    const validationError = validatePayload(payload);

    if (validationError) {
      setNotice({ tone: "amber", title: "Check supplier stock", text: validationError });
      return;
    }

    try {
      setNotice(null);

      await createSupply.mutateAsync({ supplierId, payload });

      router.replace(routes.supplier(supplierId) as never);
    } catch (error) {
      setNotice({ tone: "red", title: "Supplier stock not saved", text: supplyErrorMessage(error) });
    }
  }

  return (
    <AppShell>
      {(palette) => (
        <View style={[styles.stack, styles.screenBottomSpace]}>
          {supplierQuery.isLoading ? (
            <>
              <Skeleton height={132} width="100%" />
              <Skeleton height={112} width="100%" />
              <Skeleton height={270} width="100%" />
            </>
          ) : null}

          {!supplierQuery.isLoading && supplierQuery.isError ? (
            <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} />
              <AppText variant="subtitle" color={palette.text} center>Supplier could not load</AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>Refresh and try again.</AppText>
              <AsyncButton onPress={async () => { await supplierQuery.refetch(); }} variant="secondary">Refresh</AsyncButton>
            </View>
          ) : null}

          {!supplierQuery.isLoading && !supplierQuery.isError && !supplier ? (
            <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
              <Ionicons name="business-outline" size={30} color={toneSpec("red", palette).fg} />
              <AppText variant="subtitle" color={palette.text} center>Supplier not found</AppText>
              <AppText variant="caption" color={palette.soft} center style={styles.cardText}>Go back and choose another supplier.</AppText>
              <AsyncButton onPress={() => router.replace(routes.suppliers as never)} variant="secondary">Back to suppliers</AsyncButton>
            </View>
          ) : null}

          {supplier ? (
            <>
              <View style={[styles.hero, compact ? styles.heroCompact : null, { borderColor: "rgba(34,199,244,.30)", backgroundColor: "rgba(34,199,244,.10)" }]}> 
                <View style={styles.heroTop}>
                  <Pressable onPress={() => router.push(routes.supplier(supplier.id) as never)} style={({ pressed }) => [styles.backButton, { borderColor: palette.border, opacity: pressed ? 0.78 : 1 }]}> 
                    <Ionicons name="chevron-back-outline" size={20} color={palette.text} />
                  </Pressable>

                  <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                    <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>Supplier stock</AppText>
                    <AppText variant="title" color={palette.text}>Record supplied stock</AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>Save stock received from {clean(supplier.name, "this supplier")} for {branchDisplayName(activeBranch)}.</AppText>
                  </View>
                </View>
              </View>

              <NoticePanel notice={notice} palette={palette} />

              <View style={styles.summaryGrid}>
                <SummaryCard label="Supplier" value={clean(supplier.name, "Supplier")} helper={clean(supplier.phone || supplier.companyName, "Supplier profile")} icon="business-outline" tone="cyan" palette={palette} />
                <SummaryCard label="Receiving location" value={branchDisplayName(activeBranch)} helper={form.alsoUpdateStock ? "Stock will update now" : "Record only"} icon="storefront-outline" tone={form.alsoUpdateStock ? "green" : "amber"} palette={palette} />
                <SummaryCard label="Units" value={totals.units.toLocaleString()} helper={`${form.items.length} item line${form.items.length === 1 ? "" : "s"}`} icon="cube-outline" tone="blue" palette={palette} />
                <SummaryCard label="Total cost" value={money(totals.totalCost)} helper={`Expected sales ${money(totals.expectedSales)}`} icon="wallet-outline" tone="amber" palette={palette} />
              </View>

              <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>Supply details</AppText>
                <AppText variant="subtitle" color={palette.text}>Source and proof</AppText>

                <View style={styles.choiceRow}>
                  {SOURCE_TYPES.map((source) => (
                    <ChoiceChip
                      key={String(source.value)}
                      label={source.label}
                      active={form.sourceType === source.value}
                      tone={form.sourceType === source.value ? "cyan" : "slate"}
                      palette={palette}
                      onPress={() => updateForm("sourceType", source.value)}
                    />
                  ))}
                </View>

                <Pressable
                  onPress={() => updateForm("alsoUpdateStock", !form.alsoUpdateStock)}
                  style={({ pressed }) => [
                    styles.togglePanel,
                    {
                      borderColor: form.alsoUpdateStock ? toneSpec("green", palette).border : toneSpec("amber", palette).border,
                      backgroundColor: form.alsoUpdateStock ? toneSpec("green", palette).bg : toneSpec("amber", palette).bg,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <Ionicons name={form.alsoUpdateStock ? "checkmark-circle-outline" : "document-text-outline"} size={22} color={form.alsoUpdateStock ? toneSpec("green", palette).fg : toneSpec("amber", palette).fg} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText variant="label" color={palette.text}>{form.alsoUpdateStock ? "Add quantities to stock now" : "Save supply record only"}</AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>{form.alsoUpdateStock ? "Use this when items physically arrived at the selling location." : "Use this when recording proof before stock is physically received."}</AppText>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setShowSupplyDetails((current) => !current)}
                  style={({ pressed }) => [
                    styles.moreDetailsButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.stage,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <Ionicons name={showSupplyDetails ? "chevron-up-outline" : "chevron-down-outline"} size={17} color={palette.soft} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <AppText variant="label" color={palette.text}>
                      {showSupplyDetails ? "Hide proof details" : "More proof details"}
                    </AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>
                      Receipt, invoice reference, source note, or supplier promise.
                    </AppText>
                  </View>
                </Pressable>

                {showSupplyDetails ? (
                  <View style={styles.advancedStack}>
                    <Field label="Receipt or invoice reference" value={form.documentRef} placeholder="Example: INV-2026-001" palette={palette} onChangeText={(value) => updateForm("documentRef", value)} />
                    <Field label="Source details" value={form.sourceDetails} placeholder="Example: supplier shop, delivery note, purchase context" palette={palette} onChangeText={(value) => updateForm("sourceDetails", value)} />
                    <Field label="Supply note" value={form.notes} placeholder="Supplier promise, payment note, warranty terms, or receiving note" palette={palette} multiline onChangeText={(value) => updateForm("notes", value)} />
                  </View>
                ) : null}
              </View>

              {form.items.map((item, index) => (
                <SupplyItemCard
                  key={index}
                  item={item}
                  index={index}
                  canRemove={form.items.length > 1}
                  showDetails={Boolean(expandedItems[index])}
                  palette={palette}
                  onChange={updateItem}
                  onRemove={removeItem}
                  onToggleDetails={toggleItemDetails}
                />
              ))}

              <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <View style={styles.addItemRow}>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText variant="label" color={palette.text}>Need to add another item?</AppText>
                    <AppText variant="caption" color={palette.soft} style={styles.cardText}>Add another line when this supplier delivered more than one product.</AppText>
                  </View>
                  <AsyncButton onPress={addItem} variant="secondary" style={styles.addButton}>Add item</AsyncButton>
                </View>
              </View>

              <View style={styles.footerActions}>
                <AsyncButton onPress={() => router.push(routes.supplier(supplier.id) as never)} variant="secondary" style={styles.footerButton} disabled={createSupply.isPending}>Cancel</AsyncButton>
                <AsyncButton onPress={saveSupply} variant="primary" style={[styles.footerButton, styles.accentButton]} disabled={createSupply.isPending}>{createSupply.isPending ? "Saving" : "Save supplier stock"}</AsyncButton>
              </View>
            </>
          ) : null}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  screenBottomSpace: { paddingBottom: 30 },
  eyebrow: { letterSpacing: 0.8, textTransform: "uppercase" },
  cardText: { flexShrink: 1, lineHeight: 18 },
  accentButton: { backgroundColor: ACCENT, borderColor: ACCENT },
  hero: { borderWidth: 1, padding: 14, gap: 14 },
  heroCompact: { padding: 13 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backButton: { width: 38, height: 38, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  noticePanel: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { flexGrow: 1, minWidth: 145, borderWidth: 1, padding: 12, gap: 8 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryIcon: { width: 30, height: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  panel: { borderWidth: 1, padding: 14, gap: 12 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  fieldWrap: { gap: 7 },
  input: { minHeight: 50, borderWidth: 1, paddingHorizontal: 13, fontFamily: "Quicksand_600SemiBold", fontSize: 14 },
  textArea: { minHeight: 94, paddingTop: 12, textAlignVertical: "top" },
  twoFields: { flexDirection: "row", gap: 10 },
  fieldHalf: { flex: 1, minWidth: 0 },
  togglePanel: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  moreDetailsButton: { borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  advancedStack: { gap: 12 },
  itemCard: { borderWidth: 1, padding: 13, gap: 12 },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemIcon: { width: 34, height: 34, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  removeButton: { width: 36, height: 36, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  itemStats: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, borderWidth: 1, padding: 10, gap: 5 },
  addItemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  addButton: { minHeight: 44, paddingHorizontal: 14 },
  footerActions: { flexDirection: "row", gap: 10 },
  footerButton: { flex: 1, minHeight: 52 },
  emptyPanel: { borderWidth: 1, padding: 22, alignItems: "center", gap: 12 },
});
