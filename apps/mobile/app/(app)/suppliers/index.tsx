import { useMemo, useState } from "react";
import {
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
import { routes } from "../../../src/constants/routes";
import {
  supplierIdTypeLabel,
  supplierSourceLabel,
  useCreateSupplier,
  useSuppliers,
} from "../../../src/features/suppliers/hooks";
import type { SupplierPayload, SupplierRecord, SupplierSourceType } from "../../../src/features/suppliers/types";
import { useAuthStore } from "../../../src/store/authStore";

const ACCENT = "#22C7F4";
const SUPPLIER_PREVIEW_LIMIT = 4;

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";
type SupplierFilter = "ALL" | "ACTIVE" | "INACTIVE";

type Notice = {
  tone: Tone;
  title: string;
  text: string;
} | null;

type SupplierForm = {
  name: string;
  idType: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
  companyName: string;
  taxId: string;
  sourceType: SupplierSourceType;
  sourceDetails: string;
  notes: string;
};

const SOURCE_OPTIONS: Array<{ value: SupplierSourceType; label: string }> = [
  { value: "BOUGHT", label: "Bought stock" },
  { value: "TRADE_IN", label: "Trade-in" },
  { value: "CONSIGNMENT", label: "Consignment" },
  { value: "GIFT", label: "Gifted stock" },
  { value: "OTHER", label: "Other source" },
];

const ID_OPTIONS = [
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "PASSPORT", label: "Passport" },
  { value: "OTHER", label: "Other ID" },
];

function clean(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
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

  if (tone === "green") return { fg: light ? "#047857" : "#34D399", bg: light ? "rgba(16,185,129,.10)" : "rgba(52,211,153,.14)", border: light ? "rgba(4,120,87,.22)" : "rgba(52,211,153,.30)", solid: light ? "#10B981" : "#34D399" };
  if (tone === "amber") return { fg: light ? "#B45309" : "#FBBF24", bg: light ? "rgba(245,158,11,.10)" : "rgba(251,191,36,.14)", border: light ? "rgba(180,83,9,.22)" : "rgba(251,191,36,.30)", solid: "#FBBF24" };
  if (tone === "red") return { fg: light ? "#BE123C" : "#FB7185", bg: light ? "rgba(225,29,72,.09)" : "rgba(251,113,133,.14)", border: light ? "rgba(190,18,60,.22)" : "rgba(251,113,133,.30)", solid: "#FB7185" };
  if (tone === "blue") return { fg: light ? "#2563EB" : "#60A5FA", bg: light ? "rgba(37,99,235,.09)" : "rgba(96,165,250,.14)", border: light ? "rgba(37,99,235,.22)" : "rgba(96,165,250,.30)", solid: "#60A5FA" };
  if (tone === "slate") return { fg: palette.soft, bg: "rgba(148,163,184,.10)", border: "rgba(148,163,184,.22)", solid: palette.soft };

  return { fg: palette.cyan, bg: "rgba(32,200,255,.12)", border: "rgba(32,200,255,.30)", solid: palette.cyan };
}

function getColumns(width: number, mode: "summary" | "cards") {
  if (mode === "summary") {
    if (width >= 760) return 4;
    if (width >= 430) return 2;
    return 1;
  }
  return width >= 760 ? 2 : 1;
}

function widthForColumns(columns: number): DimensionValue {
  if (columns >= 4) return "23.8%" as DimensionValue;
  if (columns === 2) return "48.7%" as DimensionValue;
  return "100%" as DimensionValue;
}

function emptySupplierForm(): SupplierForm {
  return {
    name: "",
    idType: "NATIONAL_ID",
    idNumber: "",
    phone: "",
    email: "",
    address: "",
    companyName: "",
    taxId: "",
    sourceType: "BOUGHT",
    sourceDetails: "",
    notes: "",
  };
}

function payloadFromForm(form: SupplierForm): SupplierPayload {
  return {
    name: form.name.trim(),
    idType: form.idType.trim(),
    idNumber: form.idNumber.trim(),
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    companyName: form.companyName.trim() || null,
    taxId: form.taxId.trim() || null,
    sourceType: form.sourceType || "OTHER",
    sourceDetails: form.sourceDetails.trim() || null,
    notes: form.notes.trim() || null,
  };
}

function supplierErrorMessage(error: unknown) {
  const err = error as { message?: string; response?: { data?: { code?: string; message?: string; error?: string } } };
  const code = String(err?.response?.data?.code || err?.response?.data?.error || "").toUpperCase();

  if (code === "NAME_REQUIRED" || code === "SUPPLIER_NAME_REQUIRED") return "Add the supplier name.";
  if (code === "ID_TYPE_REQUIRED") return "Choose the identity document type.";
  if (code === "ID_NUMBER_REQUIRED") return "Add the supplier identity number.";
  if (code === "SUPPLIER_EXISTS") return "A supplier with these details already exists.";

  return err?.response?.data?.message || err?.message || "Supplier record could not be saved. Please try again.";
}

function SummaryCard({ label, value, helper, icon, tone, palette, width }: { label: string; value: string; helper: string; icon: IoniconName; tone: Tone; palette: AppShellPalette; width: DimensionValue }) {
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

function FilterChip({ label, active, tone, palette, onPress }: { label: string; active: boolean; tone: Tone; palette: AppShellPalette; onPress: () => void }) {
  const spec = toneSpec(tone, palette);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.filterChip, { borderColor: active ? spec.border : palette.border, backgroundColor: active ? spec.bg : palette.panel, opacity: pressed ? 0.82 : 1 }]}>
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.filterText}>{label}</AppText>
    </Pressable>
  );
}

function NoticePanel({ notice, palette, onClose }: { notice: Notice; palette: AppShellPalette; onClose: () => void }) {
  if (!notice) return null;
  const spec = toneSpec(notice.tone, palette);
  return (
    <View style={[styles.noticePanel, { borderColor: spec.border, backgroundColor: spec.bg }]}>
      <View style={[styles.noticeMark, { backgroundColor: spec.solid }]}>
        <Ionicons name={notice.tone === "red" ? "warning-outline" : "checkmark-outline"} size={15} color="#06111F" />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label" color={palette.text}>{notice.title}</AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>{notice.text}</AppText>
      </View>
      <Pressable onPress={onClose} style={[styles.noticeClose, { borderColor: spec.border }]}>
        <Ionicons name="close-outline" size={18} color={spec.fg} />
      </Pressable>
    </View>
  );
}

function Field({ label, value, placeholder, palette, keyboardType = "default", multiline = false, onChangeText }: { label: string; value: string; placeholder: string; palette: AppShellPalette; keyboardType?: "default" | "numeric" | "email-address" | "phone-pad"; multiline?: boolean; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.fieldWrap}>
      <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      <TextInput value={value} placeholder={placeholder} placeholderTextColor={palette.soft} keyboardType={keyboardType} multiline={multiline} onChangeText={onChangeText} style={[styles.input, multiline ? styles.textArea : null, { borderColor: palette.border, backgroundColor: palette.panel, color: palette.text }]} />
    </View>
  );
}

function ChoiceChip({ label, active, tone, palette, onPress }: { label: string; active: boolean; tone: Tone; palette: AppShellPalette; onPress: () => void }) {
  const spec = toneSpec(tone, palette);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choiceChip, { borderColor: active ? spec.border : palette.border, backgroundColor: active ? spec.bg : palette.panel, opacity: pressed ? 0.82 : 1 }]}>
      <AppText variant="caption" color={active ? spec.fg : palette.soft} style={styles.filterText}>{label}</AppText>
    </Pressable>
  );
}

function SupplierCard({ supplier, palette, width, onPress }: { supplier: SupplierRecord; palette: AppShellPalette; width: DimensionValue; onPress: () => void }) {
  const active = supplier.isActive !== false;
  const statusSpec = toneSpec(active ? "green" : "amber", palette);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.supplierCard, { width, borderColor: palette.border, backgroundColor: palette.panel, opacity: pressed ? 0.9 : 1 }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { borderColor: statusSpec.border, backgroundColor: statusSpec.bg }]}>
          <Ionicons name="business-outline" size={17} color={statusSpec.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="label" color={palette.text} numberOfLines={1}>{clean(supplier.name, "Supplier")}</AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText} numberOfLines={1}>{clean(supplier.companyName || supplier.phone || supplier.email, "No contact detail")}</AppText>
        </View>
        <View style={[styles.statusPill, { borderColor: statusSpec.border, backgroundColor: statusSpec.bg }]}>
          <AppText variant="caption" color={statusSpec.fg} style={styles.statusText}>{active ? "Active" : "Inactive"}</AppText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Source</AppText>
          <AppText variant="label" color={palette.text} numberOfLines={1}>{supplierSourceLabel(supplier.sourceType)}</AppText>
        </View>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
          <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Identity</AppText>
          <AppText variant="label" color={palette.text} numberOfLines={1}>{supplierIdTypeLabel(supplier.idType)}</AppText>
        </View>
      </View>

      <View style={styles.detailStack}>
        <View style={styles.detailRow}><AppText variant="caption" color={palette.soft}>Phone</AppText><AppText variant="caption" color={palette.text}>{clean(supplier.phone, "Not provided")}</AppText></View>
        <View style={styles.detailRow}><AppText variant="caption" color={palette.soft}>Email</AppText><AppText variant="caption" color={palette.text}>{clean(supplier.email, "Not provided")}</AppText></View>
      </View>

      <AsyncButton onPress={onPress} variant="secondary" fullWidth style={styles.cardButton}>Open supplier</AsyncButton>
    </Pressable>
  );
}

function SupplierModal({ open, palette, form, saving, notice, onChange, onClose, onClearNotice, onSave }: { open: boolean; palette: AppShellPalette; form: SupplierForm; saving: boolean; notice: Notice; onChange: <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) => void; onClose: () => void; onClearNotice: () => void; onSave: () => Promise<void> }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { borderColor: palette.borderStrong, backgroundColor: palette.stage }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="caption" color={ACCENT} style={styles.eyebrow}>New supplier</AppText>
              <AppText variant="subtitle" color={palette.text}>Add supplier profile</AppText>
              <AppText variant="caption" color={palette.soft} style={styles.cardText}>Save identity and contact details before recording supplied stock.</AppText>
            </View>
            <Pressable onPress={onClose} disabled={saving} style={[styles.closeButton, { borderColor: palette.border, opacity: saving ? 0.5 : 1 }]}><Ionicons name="close-outline" size={22} color={palette.text} /></Pressable>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <NoticePanel notice={notice} palette={palette} onClose={onClearNotice} />
            <Field label="Supplier name" value={form.name} placeholder="Example: Kigali Tech Imports" palette={palette} onChangeText={(value) => onChange("name", value)} />

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Source type</AppText>
              <View style={styles.choiceRow}>{SOURCE_OPTIONS.map((option) => <ChoiceChip key={option.value} label={option.label} active={form.sourceType === option.value} tone="cyan" palette={palette} onPress={() => onChange("sourceType", option.value)} />)}</View>
            </View>

            <View style={styles.fieldWrap}>
              <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Identity type</AppText>
              <View style={styles.choiceRow}>{ID_OPTIONS.map((option) => <ChoiceChip key={option.value} label={option.label} active={form.idType === option.value} tone="blue" palette={palette} onPress={() => onChange("idType", option.value)} />)}</View>
            </View>

            <Field label="Identity number" value={form.idNumber} placeholder="Document or supplier reference" palette={palette} onChangeText={(value) => onChange("idNumber", value)} />
            <View style={styles.twoFields}>
              <View style={styles.fieldHalf}><Field label="Phone" value={form.phone} placeholder="078..." palette={palette} keyboardType="phone-pad" onChangeText={(value) => onChange("phone", value)} /></View>
              <View style={styles.fieldHalf}><Field label="Email" value={form.email} placeholder="supplier@example.com" palette={palette} keyboardType="email-address" onChangeText={(value) => onChange("email", value)} /></View>
            </View>
            <Field label="Company" value={form.companyName} placeholder="Company name if available" palette={palette} onChangeText={(value) => onChange("companyName", value)} />
            <Field label="Tax number" value={form.taxId} placeholder="Tax number if available" palette={palette} onChangeText={(value) => onChange("taxId", value)} />
            <Field label="Address" value={form.address} placeholder="Supplier address" palette={palette} onChangeText={(value) => onChange("address", value)} />
            <Field label="Source details" value={form.sourceDetails} placeholder="How this supplier usually provides stock" palette={palette} multiline onChangeText={(value) => onChange("sourceDetails", value)} />
            <Field label="Notes" value={form.notes} placeholder="Internal note for owner or manager" palette={palette} multiline onChangeText={(value) => onChange("notes", value)} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <AsyncButton onPress={onClose} variant="secondary" style={styles.footerButton} disabled={saving}>Cancel</AsyncButton>
            <AsyncButton onPress={onSave} variant="primary" style={[styles.footerButton, styles.accentButton]} disabled={saving}>{saving ? "Saving" : "Save supplier"}</AsyncButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ScreenSkeleton({ layoutWidth }: { layoutWidth: number }) {
  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));
  return <View style={[styles.stack, styles.screenBottomSpace]}><Skeleton height={96} width="100%" /><View style={styles.responsiveGrid}>{[1,2,3,4].map((item) => <View key={item} style={{ width: summaryWidth }}><Skeleton height={112} width="100%" /></View>)}</View><Skeleton height={98} width="100%" /><View style={styles.responsiveGrid}>{[1,2,3,4].map((item) => <View key={item} style={{ width: cardWidth }}><Skeleton height={196} width="100%" /></View>)}</View></View>;
}

export default function SuppliersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(width, 760);
  const compact = layoutWidth < 560;
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  const suppliersQuery = useSuppliers();
  const createSupplier = useCreateSupplier();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SupplierFilter>("ALL");
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalNotice, setModalNotice] = useState<Notice>(null);
  const [pageNotice, setPageNotice] = useState<Notice>(null);
  const [form, setForm] = useState<SupplierForm>(() => emptySupplierForm());

  const suppliers = suppliersQuery.data || [];
  const isLoading = isHydrating || !user || !tenant || (suppliersQuery.isLoading && !suppliersQuery.data);
  const isRefreshing = suppliersQuery.isFetching;
  const summaryWidth = widthForColumns(getColumns(layoutWidth, "summary"));
  const cardWidth = widthForColumns(getColumns(layoutWidth, "cards"));

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const active = supplier.isActive !== false;
      const matchesFilter = filter === "ALL" || (filter === "ACTIVE" && active) || (filter === "INACTIVE" && !active);
      const haystack = [supplier.name, supplier.companyName, supplier.phone, supplier.email, supplier.idNumber, supplier.taxId, supplierSourceLabel(supplier.sourceType)].map((item) => String(item || "").toLowerCase()).join(" ");
      return matchesFilter && (!q || haystack.includes(q));
    });
  }, [suppliers, query, filter]);

  const activeSuppliers = suppliers.filter((supplier) => supplier.isActive !== false).length;
  const inactiveSuppliers = suppliers.length - activeSuppliers;
  const verifiedSuppliers = suppliers.filter((supplier) => Boolean(supplier.verifiedAt)).length;
  const visibleSuppliers = showAllSuppliers ? filteredSuppliers : filteredSuppliers.slice(0, SUPPLIER_PREVIEW_LIMIT);
  const hasMoreSuppliers = filteredSuppliers.length > SUPPLIER_PREVIEW_LIMIT;

  function updateForm<K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) { setModalNotice(null); setForm((current) => ({ ...current, [key]: value })); }
  function openCreateModal() { setForm(emptySupplierForm()); setModalNotice(null); setModalOpen(true); }
  function closeCreateModal() { if (createSupplier.isPending) return; setModalNotice(null); setModalOpen(false); }
  function validateSupplierForm() { if (!form.name.trim()) return "Add the supplier name."; if (!form.idType.trim()) return "Choose the identity document type."; if (!form.idNumber.trim()) return "Add the supplier identity or reference number."; return null; }

  async function saveSupplier() {
    const error = validateSupplierForm();
    if (error) { setModalNotice({ tone: "amber", title: "Check supplier details", text: error }); return; }
    try {
      const supplier = await createSupplier.mutateAsync(payloadFromForm(form));
      setModalOpen(false); setModalNotice(null); setForm(emptySupplierForm());
      setPageNotice({ tone: "green", title: "Supplier saved", text: "Supplier profile is now available for stock supply records." });
      if (supplier?.id) router.push(routes.supplier(supplier.id) as never);
    } catch (error) { setModalNotice({ tone: "red", title: "Supplier not saved", text: supplierErrorMessage(error) }); }
  }

  return (
    <AppShell>
      {(palette) => isLoading ? <ScreenSkeleton layoutWidth={layoutWidth} /> : (
        <View style={[styles.stack, styles.screenBottomSpace]}>
          <View style={[styles.heroPanel, compact ? styles.heroPanelCompact : null, { borderColor: palette.borderStrong, backgroundColor: "rgba(32, 200, 255, 0.10)" }]}>
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, compact ? styles.heroIconCompact : null]}><Ionicons name="business-outline" size={compact ? 20 : 23} color="#06111F" /></View>
              <View style={styles.heroContent}>
                <View style={styles.heroLabelRow}><View style={styles.heroDot} /><AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Suppliers</AppText></View>
                <AppText variant="subtitle" color={palette.text} style={styles.heroTitle}>Control supplier profiles and stock sources.</AppText>
                <AppText variant="caption" color={palette.soft} style={styles.cardText}>Track who supplies stock to {tenant?.name || "this business"} before supply records affect inventory.</AppText>
              </View>
              {!compact ? <AsyncButton onPress={openCreateModal} variant="primary" style={[styles.heroButton, styles.accentButton]}>Add supplier</AsyncButton> : null}
            </View>
            {compact ? <AsyncButton onPress={openCreateModal} variant="primary" fullWidth style={styles.accentButton}>Add supplier</AsyncButton> : null}
          </View>

          <NoticePanel notice={pageNotice} palette={palette} onClose={() => setPageNotice(null)} />

          <View style={styles.responsiveGrid}>
            <SummaryCard label="Suppliers" value={String(suppliers.length)} helper="Saved supplier profiles" icon="business-outline" tone="cyan" palette={palette} width={summaryWidth} />
            <SummaryCard label="Active" value={String(activeSuppliers)} helper="Can be used for supply records" icon="checkmark-done-outline" tone="green" palette={palette} width={summaryWidth} />
            <SummaryCard label="Inactive" value={String(inactiveSuppliers)} helper="Blocked from new activity" icon="pause-circle-outline" tone={inactiveSuppliers > 0 ? "amber" : "slate"} palette={palette} width={summaryWidth} />
            <SummaryCard label="Verified" value={String(verifiedSuppliers)} helper="Identity confirmed" icon="shield-checkmark-outline" tone={verifiedSuppliers > 0 ? "blue" : "slate"} palette={palette} width={summaryWidth} />
          </View>

          <View style={[styles.searchPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}>
            <View style={styles.searchRow}>
              <View style={[styles.searchBox, { borderColor: palette.border, backgroundColor: palette.stage }]}>
                <Ionicons name="search-outline" size={17} color={palette.soft} />
                <TextInput value={query} onChangeText={(value) => { setQuery(value); setShowAllSuppliers(false); }} placeholder="Search supplier, phone, company, or reference" placeholderTextColor={palette.soft} style={[styles.searchInput, { color: palette.text }]} />
              </View>
              <AsyncButton onPress={async () => { await suppliersQuery.refetch(); }} variant="secondary" style={styles.refreshButton} disabled={isRefreshing}>{isRefreshing ? "Refreshing" : "Refresh"}</AsyncButton>
            </View>
            <View style={styles.filterRow}>
              <FilterChip label="All" active={filter === "ALL"} tone="cyan" palette={palette} onPress={() => { setFilter("ALL"); setShowAllSuppliers(false); }} />
              <FilterChip label="Active" active={filter === "ACTIVE"} tone="green" palette={palette} onPress={() => { setFilter("ACTIVE"); setShowAllSuppliers(false); }} />
              <FilterChip label="Inactive" active={filter === "INACTIVE"} tone="amber" palette={palette} onPress={() => { setFilter("INACTIVE"); setShowAllSuppliers(false); }} />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}><AppText variant="caption" color={palette.cyan} style={styles.eyebrow}>Supplier records</AppText><AppText variant="subtitle" color={palette.text}>Supplier control</AppText></View>
            <AppText variant="caption" color={palette.soft}>{visibleSuppliers.length.toLocaleString()} of {filteredSuppliers.length.toLocaleString()} shown</AppText>
          </View>

          {suppliersQuery.isError ? (
            <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}><Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} /><AppText variant="subtitle" color={palette.text} center>Suppliers could not load</AppText><AppText variant="caption" color={palette.soft} center style={styles.cardText}>Check the connection and refresh this screen.</AppText><AsyncButton onPress={async () => { await suppliersQuery.refetch(); }} variant="secondary">Try again</AsyncButton></View>
          ) : filteredSuppliers.length === 0 ? (
            <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}><Ionicons name="business-outline" size={32} color={palette.cyan} /><AppText variant="subtitle" color={palette.text} center>No suppliers found</AppText><AppText variant="caption" color={palette.soft} center style={styles.cardText}>Add suppliers before recording supply history and stock sources.</AppText><AsyncButton onPress={openCreateModal} variant="primary" style={styles.accentButton}>Add supplier</AsyncButton></View>
          ) : (
            <>
              <View style={styles.responsiveGrid}>{visibleSuppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} palette={palette} width={cardWidth} onPress={() => router.push(routes.supplier(supplier.id) as never)} />)}</View>
              {hasMoreSuppliers ? <View style={styles.showMoreWrap}><AsyncButton onPress={() => setShowAllSuppliers((current) => !current)} variant="secondary">{showAllSuppliers ? "Show fewer suppliers" : "View more suppliers"}</AsyncButton></View> : null}
            </>
          )}

          <SupplierModal open={modalOpen} palette={palette} form={form} saving={createSupplier.isPending} notice={modalNotice} onChange={updateForm} onClose={closeCreateModal} onClearNotice={() => setModalNotice(null)} onSave={saveSupplier} />
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
  noticePanel: { borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  noticeMark: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  noticeClose: { width: 30, height: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  searchPanel: { borderWidth: 1, padding: 12, gap: 10 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBox: { flex: 1, minHeight: 48, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minWidth: 0, fontFamily: "Quicksand_600SemiBold", fontSize: 13, paddingVertical: 0 },
  refreshButton: { minHeight: 48, paddingHorizontal: 14 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  filterText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  supplierCard: { borderWidth: 1, padding: 13, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardIcon: { width: 34, height: 34, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statusPill: { flexShrink: 0, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  infoGrid: { flexDirection: "row", gap: 8 },
  infoBox: { flex: 1, borderWidth: 1, padding: 10, gap: 5 },
  detailStack: { gap: 7 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardButton: { minHeight: 48 },
  emptyPanel: { borderWidth: 1, padding: 22, alignItems: "center", gap: 12 },
  showMoreWrap: { alignItems: "center", paddingTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.68)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 560, maxHeight: "92%", borderWidth: 1, overflow: "hidden" },
  modalHeader: { padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  closeButton: { width: 38, height: 38, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalScroll: { maxHeight: 590 },
  modalBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  fieldWrap: { gap: 7 },
  input: { minHeight: 50, borderWidth: 1, paddingHorizontal: 13, fontFamily: "Quicksand_600SemiBold", fontSize: 14 },
  textArea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  twoFields: { flexDirection: "row", gap: 10 },
  fieldHalf: { flex: 1, minWidth: 0 },
  modalFooter: { padding: 16, flexDirection: "row", gap: 10 },
  footerButton: { flex: 1, minHeight: 52 },
});
