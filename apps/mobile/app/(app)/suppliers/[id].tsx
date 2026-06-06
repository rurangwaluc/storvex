import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppText } from "../../../src/components/ui/AppText";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  supplierIdTypeLabel,
  supplierSourceLabel,
  supplyItems,
  supplyTotals,
  useActivateSupplier,
  useDeactivateSupplier,
  useSupplier,
  useSupplierSupplies,
} from "../../../src/features/suppliers/hooks";
import type { SupplierSupplyItem, SupplierSupplyRecord } from "../../../src/features/suppliers/types";

const ACCENT = "#22C7F4";
const SUPPLY_PREVIEW_LIMIT = 4;

type IoniconName = keyof typeof Ionicons.glyphMap;
type Tone = "cyan" | "green" | "amber" | "red" | "blue" | "slate";

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

function dateLabel(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isLightPalette(palette: AppShellPalette) {
  const stage = String(palette.stage || "").toLowerCase();
  const panel = String(palette.panel || "").toLowerCase();
  return stage.includes("fff") || stage.includes("f8") || stage.includes("f9") || panel.includes("fff") || panel.includes("f8") || panel.includes("f9");
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

function tileWidth(width: number): DimensionValue {
  return width >= 430 ? "48.8%" : "100%";
}

function branchName(supply: SupplierSupplyRecord) {
  const branch = supply.branch || supply.storeLocation;
  return clean(branch?.name || branch?.code, "Selling location not shown");
}

function supplierErrorMessage(error: unknown) {
  const err = error as { message?: string; response?: { data?: { code?: string; message?: string } } };
  const code = String(err?.response?.data?.code || "").toUpperCase();
  if (code === "SUPPLIER_NOT_FOUND") return "This supplier could not be found.";
  if (code === "SUBSCRIPTION_REQUIRED") return "Business access needs attention before supplier records can be updated.";
  return err?.response?.data?.message || err?.message || "Supplier action could not be completed. Please try again.";
}

function DetailTile({ label, value, helper, icon, tone, palette, width }: { label: string; value: string; helper: string; icon: IoniconName; tone: Tone; palette: AppShellPalette; width: DimensionValue }) {
  const spec = toneSpec(tone, palette);
  return (
    <View style={[styles.detailTile, { width, borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.detailTileTop}>
        <View style={[styles.detailTileIcon, { borderColor: spec.border, backgroundColor: spec.bg }]}><Ionicons name={icon} size={17} color={spec.fg} /></View>
        <AppText variant="caption" color={palette.soft} style={styles.eyebrow}>{label}</AppText>
      </View>
      <AppText variant="subtitle" color={palette.text} numberOfLines={2}>{value}</AppText>
      <AppText variant="caption" color={palette.soft} style={styles.cardText} numberOfLines={2}>{helper}</AppText>
    </View>
  );
}

function SupplyCard({ supply, palette }: { supply: SupplierSupplyRecord; palette: AppShellPalette }) {
  const totals = supplyTotals(supply);
  const items = supplyItems(supply).slice(0, 3);
  const extra = Math.max(0, supplyItems(supply).length - items.length);
  return (
    <View style={[styles.supplyCard, { borderColor: palette.border, backgroundColor: palette.panel }]}>
      <View style={styles.supplyHeader}>
        <View style={[styles.supplyIcon, { borderColor: toneSpec("cyan", palette).border, backgroundColor: toneSpec("cyan", palette).bg }]}><Ionicons name="cube-outline" size={17} color={palette.cyan} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="label" color={palette.text}>Supply recorded</AppText>
          <AppText variant="caption" color={palette.soft} style={styles.cardText}>{dateLabel(supply.createdAt)}</AppText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}><AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Cost</AppText><AppText variant="label" color={palette.text}>{money(totals.totalCost)}</AppText></View>
        <View style={[styles.infoBox, { borderColor: palette.border, backgroundColor: palette.stage }]}><AppText variant="caption" color={palette.soft} style={styles.eyebrow}>Units</AppText><AppText variant="label" color={palette.text}>{totals.totalQuantity.toLocaleString()}</AppText></View>
      </View>

      <View style={styles.detailStack}>
        <View style={styles.detailRow}><AppText variant="caption" color={palette.soft}>Selling location</AppText><AppText variant="caption" color={palette.text}>{branchName(supply)}</AppText></View>
        <View style={styles.detailRow}><AppText variant="caption" color={palette.soft}>Reference</AppText><AppText variant="caption" color={palette.text}>{clean(supply.documentRef, "Not provided")}</AppText></View>
      </View>

      {items.length ? <View style={styles.itemList}>{items.map((item: SupplierSupplyItem, index: number) => <View key={item.id || `${item.productName}-${index}`} style={[styles.itemRow, { borderColor: palette.border, backgroundColor: palette.stage }]}><View style={{ flex: 1, minWidth: 0 }}><AppText variant="label" color={palette.text} numberOfLines={1}>{clean(item.productName, "Product")}</AppText><AppText variant="caption" color={palette.soft}>{clean(item.serial, "No serial recorded")}</AppText></View><AppText variant="caption" color={palette.text}>{num(item.quantity).toLocaleString()} units</AppText></View>)}</View> : null}
      {extra > 0 ? <AppText variant="caption" color={palette.soft}>+{extra} more item{extra === 1 ? "" : "s"}</AppText> : null}
    </View>
  );
}

export default function SupplierDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const supplierId = String(id || "");
  const cardWidth = tileWidth(Math.min(width, 760));

  const supplierQuery = useSupplier(supplierId);
  const suppliesQuery = useSupplierSupplies(supplierId);
  const activateSupplier = useActivateSupplier();
  const deactivateSupplier = useDeactivateSupplier();

  const supplier = supplierQuery.data || null;
  const supplies = suppliesQuery.data || [];
  const active = supplier?.isActive !== false;
  const visibleSupplies = supplies.slice(0, SUPPLY_PREVIEW_LIMIT);

  const totals = supplies.reduce(
    (acc: { cost: number; sell: number; units: number; items: number }, supply: SupplierSupplyRecord) => {
    const total = supplyTotals(supply);
    acc.cost += total.totalCost;
    acc.sell += total.totalSell;
    acc.units += total.totalQuantity;
    acc.items += total.itemsCount;
    return acc;
    },
    { cost: 0, sell: 0, units: 0, items: 0 },
  );

  async function refreshAll() {
    await Promise.all([supplierQuery.refetch(), suppliesQuery.refetch()]);
  }

  async function changeSupplierStatus() {
    if (!supplier?.id) return;

    if (active) {
      Alert.alert("Deactivate supplier?", "This keeps supplier history but blocks normal new supplier activity.", [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: async () => {
          try { await deactivateSupplier.mutateAsync(supplier.id); await refreshAll(); }
          catch (error) { Alert.alert("Supplier not updated", supplierErrorMessage(error)); }
        } },
      ]);
      return;
    }

    try {
      await activateSupplier.mutateAsync(supplier.id);
      await refreshAll();
    } catch (error) {
      Alert.alert("Supplier not updated", supplierErrorMessage(error));
    }
  }

  return (
    <AppShell>
      {(palette) => (
        <View style={[styles.stack, styles.screenBottomSpace]}>
          {supplierQuery.isLoading ? <><Skeleton height={132} width="100%" /><Skeleton height={210} width="100%" /><Skeleton height={132} width="100%" /></> : null}

          {!supplierQuery.isLoading && supplierQuery.isError ? <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}><Ionicons name="warning-outline" size={30} color={toneSpec("amber", palette).fg} /><AppText variant="subtitle" color={palette.text} center>Supplier could not load</AppText><AppText variant="caption" color={palette.soft} center style={styles.cardText}>Refresh and try again.</AppText><AsyncButton onPress={refreshAll} variant="secondary">Refresh</AsyncButton></View> : null}

          {!supplierQuery.isLoading && !supplierQuery.isError && !supplier ? <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}><Ionicons name="business-outline" size={30} color={toneSpec("red", palette).fg} /><AppText variant="subtitle" color={palette.text} center>Supplier not found</AppText><AppText variant="caption" color={palette.soft} center style={styles.cardText}>Go back and choose another supplier record.</AppText><AsyncButton onPress={() => router.replace(routes.suppliers as never)} variant="secondary">Back to suppliers</AsyncButton></View> : null}

          {supplier ? <>
            <View style={[styles.hero, { borderColor: "rgba(34,199,244,.30)", backgroundColor: "rgba(34,199,244,.10)" }]}>
              <View style={styles.heroTop}>
                <Pressable onPress={() => router.push(routes.suppliers as never)} style={({ pressed }) => [styles.backButton, { borderColor: palette.border, opacity: pressed ? 0.78 : 1 }]}><Ionicons name="chevron-back-outline" size={20} color={palette.text} /></Pressable>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}><AppText variant="caption" color={ACCENT} style={styles.eyebrow}>Supplier profile</AppText><AppText variant="title" color={palette.text}>{clean(supplier.name, "Supplier")}</AppText><AppText variant="caption" color={palette.soft} style={styles.cardText}>Review supplier identity, contact details, and supply history.</AppText></View>
                <View style={[styles.statusPill, { borderColor: toneSpec(active ? "green" : "amber", palette).border, backgroundColor: toneSpec(active ? "green" : "amber", palette).bg }]}><AppText variant="caption" color={toneSpec(active ? "green" : "amber", palette).fg} style={styles.statusText}>{active ? "Active" : "Inactive"}</AppText></View>
              </View>
              <View style={styles.actionRow}>
                <AsyncButton
                  onPress={refreshAll}
                  variant="secondary"
                  style={styles.actionButton}
                  disabled={supplierQuery.isFetching || suppliesQuery.isFetching}
                >
                  {supplierQuery.isFetching || suppliesQuery.isFetching ? "Refreshing" : "Refresh"}
                </AsyncButton>

                <AsyncButton
                  onPress={() => router.push(routes.supplierSupplyNew(supplier.id) as never)}
                  variant="primary"
                  style={[styles.actionButton, styles.accentButton]}
                  disabled={!active}
                >
                  Record supply
                </AsyncButton>

                <AsyncButton
                  onPress={changeSupplierStatus}
                  variant={active ? "danger" : "primary"}
                  style={[styles.actionButton, !active ? styles.accentButton : null]}
                  disabled={activateSupplier.isPending || deactivateSupplier.isPending}
                >
                  {active ? "Deactivate" : "Reactivate"}
                </AsyncButton>
              </View>
            </View>

            <View style={styles.tileGrid}>
              <DetailTile label="Contact" value={clean(supplier.phone, "No phone")} helper={clean(supplier.email, "No email recorded")} icon="call-outline" tone="cyan" palette={palette} width={cardWidth} />
              <DetailTile label="Identity" value={supplierIdTypeLabel(supplier.idType)} helper={clean(supplier.idNumber, "No identity number recorded")} icon="id-card-outline" tone="blue" palette={palette} width={cardWidth} />
              <DetailTile label="Source" value={supplierSourceLabel(supplier.sourceType)} helper={clean(supplier.sourceDetails, "No source details recorded")} icon="cube-outline" tone="green" palette={palette} width={cardWidth} />
              <DetailTile label="Total cost" value={money(totals.cost)} helper={`${totals.units.toLocaleString()} supplied unit${totals.units === 1 ? "" : "s"}`} icon="wallet-outline" tone="amber" palette={palette} width={cardWidth} />
              <DetailTile label="Company" value={clean(supplier.companyName, "Not provided")} helper={clean(supplier.taxId, "No tax number recorded")} icon="business-outline" tone="slate" palette={palette} width={cardWidth} />
              <DetailTile label="Created" value={dateLabel(supplier.createdAt)} helper="When this supplier profile was saved." icon="calendar-outline" tone="slate" palette={palette} width={cardWidth} />
            </View>

            {supplier.notes || supplier.address ? <View style={[styles.notePanel, { borderColor: palette.border, backgroundColor: palette.panel }]}><AppText variant="caption" color={ACCENT} style={styles.eyebrow}>Supplier notes</AppText><AppText variant="body" color={palette.text} style={styles.cardText}>{clean(supplier.notes || supplier.address, "No notes recorded")}</AppText></View> : null}

            <View style={styles.sectionHeader}><View style={{ flex: 1 }}><AppText variant="caption" color={ACCENT} style={styles.eyebrow}>Supply history</AppText><AppText variant="subtitle" color={palette.text}>Supplied stock records</AppText></View><AppText variant="caption" color={palette.soft}>{visibleSupplies.length} of {supplies.length} shown</AppText></View>

            {suppliesQuery.isLoading ? <><Skeleton height={138} width="100%" /><Skeleton height={138} width="100%" /></> : visibleSupplies.length === 0 ? <View style={[styles.emptyPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}><Ionicons name="cube-outline" size={30} color={palette.cyan} /><AppText variant="subtitle" color={palette.text} center>No supplies recorded</AppText><AppText variant="caption" color={palette.soft} center style={styles.cardText}>Supply history will appear here after stock is recorded from this supplier.</AppText></View> : <ScrollView horizontal={false} contentContainerStyle={styles.supplyList}>{visibleSupplies.map((supply: SupplierSupplyRecord) => <SupplyCard key={supply.id} supply={supply} palette={palette} />)}</ScrollView>}
          </> : null}
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
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backButton: { width: 38, height: 38, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statusPill: { flexShrink: 0, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionButton: { flex: 1, minWidth: 150, minHeight: 48 },
  tileGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailTile: { minHeight: 126, borderWidth: 1, padding: 12, gap: 9 },
  detailTileTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  detailTileIcon: { width: 34, height: 34, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  notePanel: { borderWidth: 1, padding: 13, gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  supplyList: { gap: 12 },
  supplyCard: { borderWidth: 1, padding: 13, gap: 12 },
  supplyHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  supplyIcon: { width: 34, height: 34, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  infoGrid: { flexDirection: "row", gap: 8 },
  infoBox: { flex: 1, borderWidth: 1, padding: 10, gap: 5 },
  detailStack: { gap: 7 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  itemList: { gap: 8 },
  itemRow: { borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  emptyPanel: { borderWidth: 1, padding: 22, alignItems: "center", gap: 12 },
});
