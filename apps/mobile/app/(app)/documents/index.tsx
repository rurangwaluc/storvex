import { useEffect, useMemo, useState } from "react";
import { Href, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppShell, type AppShellPalette } from "../../../src/components/app/AppShell";
import { AppBackButton } from "../../../src/components/app/AppBackButton";
import { AppText } from "../../../src/components/ui/AppText";
import { AppTextInput } from "../../../src/components/ui/AppTextInput";
import { AsyncButton } from "../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../src/components/ui/Skeleton";
import { routes } from "../../../src/constants/routes";
import {
  DOCUMENT_SECTIONS,
  normalizeDocuments,
  taxLabelForDocument,
  useDocumentsList,
} from "../../../src/features/documents/hooks";
import type {
  DocumentDetail,
  DocumentRecord,
  DocumentSection,
  DocumentStatus,
  DocumentType,
} from "../../../src/features/documents/types";
import { useAuthStore } from "../../../src/store/authStore";
import { useBranchStore } from "../../../src/store/branchStore";

const PAGE_SIZE = 8;

type DocumentFilterKey = "all" | "ready" | "pending" | "attention";

const DOCUMENT_FILTERS: Array<{
  key: DocumentFilterKey;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "pending", label: "Pending" },
  { key: "attention", label: "Needs attention" },
];

function useDebouncedValue(value: string, delay = 260) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function asObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  const amount =
    typeof value === "string" ? Number(value.replace(/[^\d.-]/g, "")) : Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return safeNumber(value);
}

function safeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }

  return fallback;
}

function nestedText(source: Record<string, unknown>, path: string[]) {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return "";
    }

    current = (current as Record<string, unknown>)[key];
  }

  return cleanText(current);
}

function nestedNumber(source: Record<string, unknown>, path: string[]) {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return optionalNumber(current);
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";

  const amount = safeNumber(value);

  return `${amount.toLocaleString()} RWF`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function normalizeStatus(status?: DocumentStatus | null) {
  return String(status || "Ready").trim().toUpperCase();
}

function statusTone(status?: DocumentStatus | null) {
  const value = normalizeStatus(status);

  if (
    ["PAID", "DELIVERED", "ACTIVE", "COMPLETED", "CONVERTED", "SENT", "READY"].includes(
      value,
    )
  ) {
    return "success";
  }

  if (
    [
      "PARTIAL",
      "DRAFT",
      "PENDING",
      "EXPIRING",
      "EXPIRING SOON",
      "PROFORMA",
      "INVOICE",
    ].includes(value)
  ) {
    return "warning";
  }

  if (["OVERDUE", "EXPIRED", "CANCELLED", "RETURNED"].includes(value)) {
    return "danger";
  }

  return "neutral";
}

function statusLabel(status?: DocumentStatus | null) {
  const value = normalizeStatus(status);

  if (value === "PAID") return "Paid";
  if (value === "PARTIAL") return "Partly paid";
  if (value === "PENDING") return "Pending";
  if (value === "DRAFT") return "Draft";
  if (value === "SENT") return "Sent";
  if (value === "DELIVERED") return "Delivered";
  if (value === "ACTIVE") return "Active";
  if (value === "COMPLETED") return "Completed";
  if (value === "CONVERTED") return "Converted";
  if (value === "OVERDUE") return "Overdue";
  if (value === "EXPIRED") return "Expired";
  if (value === "CANCELLED") return "Cancelled";

  return cleanText(status, "Ready");
}

function matchesStatusFilter(document: DocumentRecord, filter: DocumentFilterKey) {
  if (filter === "all") return true;

  const tone = statusTone(document.status);

  if (filter === "ready") return tone === "success";
  if (filter === "pending") return tone === "warning";

  return tone === "danger";
}

function searchableText(document: DocumentRecord) {
  return [
    document.number,
    document.customerName,
    document.customerPhone,
    document.status,
    document.note,
    document.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterDocuments(
  documents: DocumentRecord[],
  query: string,
  filter: DocumentFilterKey,
) {
  const q = query.trim().toLowerCase();

  return documents.filter((document) => {
    const statusMatch = matchesStatusFilter(document, filter);
    if (!statusMatch) return false;

    if (!q) return true;

    return searchableText(document).includes(q);
  });
}

function sectionIcon(type: DocumentType): keyof typeof Ionicons.glyphMap {
  if (type === "receipts") return "receipt-outline";
  if (type === "invoices") return "document-text-outline";
  if (type === "delivery-notes") return "cube-outline";
  if (type === "proformas") return "reader-outline";
  return "shield-checkmark-outline";
}

function filterLabel(filter: DocumentFilterKey) {
  if (filter === "ready") return "ready records";
  if (filter === "pending") return "pending records";
  if (filter === "attention") return "records needing attention";
  return "records";
}

function openDocument(document: DocumentRecord) {
  router.push(`/(app)/documents/${document.type}/${encodeURIComponent(document.id)}` as Href);
}

function documentTypeLabel(type: DocumentType) {
  if (type === "receipts") return "Receipt";
  if (type === "invoices") return "Invoice";
  if (type === "delivery-notes") return "Delivery note";
  if (type === "proformas") return "Proforma";
  return "Warranty";
}

function documentPurpose(type: DocumentType) {
  if (type === "receipts") return "Customer payment proof";
  if (type === "invoices") return "Customer billing record";
  if (type === "delivery-notes") return "Goods handover proof";
  if (type === "proformas") return "Customer quotation";
  return "After-sale support record";
}

function documentAmountLabel(type: DocumentType) {
  if (type === "receipts") return "Receipt total";
  if (type === "invoices") return "Invoice total";
  if (type === "delivery-notes") return "Goods value";
  if (type === "proformas") return "Quoted total";
  return "Covered value";
}

function rawDocument(document: DocumentRecord) {
  return asObject(document.raw);
}

function rawSale(document: DocumentRecord) {
  return asObject(rawDocument(document).sale);
}

function documentTotal(document: DocumentRecord) {
  const raw = rawDocument(document);
  const sale = rawSale(document);

  return (
    optionalNumber(document.totalAmount) ??
    optionalNumber(document.amount) ??
    optionalNumber(raw.totalAmount) ??
    optionalNumber(raw.total) ??
    optionalNumber(raw.amount) ??
    optionalNumber(sale.totalAmount) ??
    optionalNumber(sale.total) ??
    0
  );
}

function documentPaid(document: DocumentRecord) {
  const raw = rawDocument(document);
  const sale = rawSale(document);

  return (
    optionalNumber(document.amountPaid) ??
    optionalNumber(raw.amountPaid) ??
    optionalNumber(raw.paidAmount) ??
    optionalNumber(raw.receivedAmount) ??
    optionalNumber(sale.amountPaid) ??
    optionalNumber(sale.paidAmount) ??
    0
  );
}

function documentBalance(document: DocumentRecord) {
  const raw = rawDocument(document);
  const sale = rawSale(document);

  return (
    optionalNumber(document.balanceDue) ??
    optionalNumber(raw.balanceDue) ??
    optionalNumber(raw.balance) ??
    optionalNumber(sale.balanceDue) ??
    optionalNumber(sale.balance) ??
    0
  );
}

function documentTaxAmount(document: DocumentRecord) {
  const raw = rawDocument(document);
  const sale = rawSale(document);

  return (
    optionalNumber(raw.taxAmount) ??
    optionalNumber(sale.taxAmount) ??
    nestedNumber(raw, ["sale", "taxAmount"]) ??
    0
  );
}

function documentTaxSnapshot(document: DocumentRecord): Partial<DocumentDetail> {
  const raw = rawDocument(document);
  const sale = rawSale(document);

  const taxMode = cleanText(raw.taxMode || sale.taxMode || nestedText(raw, ["sale", "taxMode"]), "NONE");
  const taxDisplayMode = cleanText(
    raw.taxDisplayMode ||
      sale.taxDisplayMode ||
      nestedText(raw, ["sale", "taxDisplayMode"]),
    "HIDDEN",
  );

  return {
    taxName: cleanText(raw.taxName || raw.taxLabel || sale.taxName || sale.taxLabel),
    taxMode,
    taxDisplayMode,
    taxRateBps:
      optionalNumber(raw.taxRateBps) ??
      optionalNumber(sale.taxRateBps) ??
      nestedNumber(raw, ["sale", "taxRateBps"]) ??
      0,
    taxAmount: documentTaxAmount(document),
    taxableAmount:
      optionalNumber(raw.taxableAmount) ??
      optionalNumber(sale.taxableAmount) ??
      nestedNumber(raw, ["sale", "taxableAmount"]) ??
      0,
    subtotalAmount:
      optionalNumber(raw.subtotalAmount) ??
      optionalNumber(raw.subtotal) ??
      optionalNumber(sale.subtotalAmount) ??
      optionalNumber(sale.subtotal) ??
      0,
    pricesIncludeTax: safeBoolean(raw.pricesIncludeTax ?? sale.pricesIncludeTax, false),
    showTaxOnCustomerDocuments: safeBoolean(
      raw.showTaxOnCustomerDocuments ?? sale.showTaxOnCustomerDocuments,
      false,
    ),
  };
}

function shouldShowTax(document: DocumentRecord) {
  const snapshot = documentTaxSnapshot(document);
  const mode = String(snapshot.taxMode || "NONE").toUpperCase();
  const displayMode = String(snapshot.taxDisplayMode || "HIDDEN").toUpperCase();
  const tax = safeNumber(snapshot.taxAmount);

  if (mode === "NONE") return false;
  if (displayMode === "HIDDEN") return false;
  if (tax <= 0) return false;

  return Boolean(snapshot.showTaxOnCustomerDocuments || displayMode === "CUSTOMER_FACING");
}

function paymentNote(document: DocumentRecord) {
  const balance = documentBalance(document);
  const paid = documentPaid(document);

  if (document.type === "receipts") {
    if (balance > 0) return "Part payment received";
    if (paid > 0) return "Payment received";
    return "Payment proof";
  }

  if (document.type === "invoices") {
    if (balance > 0) return "Payment still expected";
    return "Billing record";
  }

  if (document.type === "delivery-notes") return "Goods handover";
  if (document.type === "proformas") return "Quotation shared";
  return "Support record";
}

function DocumentsSkeleton({ palette }: { palette: AppShellPalette }) {
  return (
    <>
      <View
        style={[
          styles.heroPanel,
          {
            borderColor: palette.borderStrong,
            backgroundColor: "rgba(32, 200, 255, 0.08)",
          },
        ]}
      >
        <View style={styles.heroTop}>
          <Skeleton height={42} width={42} />

          <View style={{ flex: 1, gap: 10 }}>
            <Skeleton height={14} width="42%" />
            <Skeleton height={22} width="76%" />
            <Skeleton height={14} width="62%" />
          </View>
        </View>
      </View>

      <View style={styles.sectionGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            style={[
              styles.sectionCard,
              {
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={34} width={34} />
            <Skeleton height={16} width="60%" />
            <Skeleton height={13} width="88%" />
          </View>
        ))}
      </View>

      <Skeleton height={54} width="100%" />

      <View style={styles.filterRow}>
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} height={36} width={88} />
        ))}
      </View>

      {[1, 2, 3, 4].map((item) => (
        <View
          key={item}
          style={[
            styles.documentCard,
            {
              borderColor: palette.border,
              backgroundColor: palette.panel,
            },
          ]}
        >
          <Skeleton height={16} width="50%" />
          <Skeleton height={13} width="72%" />
          <Skeleton height={18} width="34%" />
        </View>
      ))}
    </>
  );
}

function SectionCard({
  section,
  active,
  palette,
  onPress,
}: {
  section: DocumentSection;
  active: boolean;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sectionCard,
        {
          borderColor: active ? "#20C8FF" : palette.border,
          backgroundColor: active ? "rgba(32, 200, 255, 0.12)" : palette.panel,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.sectionTop}>
        <View style={styles.sectionIcon}>
          <Ionicons name={sectionIcon(section.type)} size={17} color="#06111F" />
        </View>

        <View
          style={[
            styles.sectionBadge,
            {
              backgroundColor: active
                ? "rgba(103, 232, 249, 0.22)"
                : "rgba(148, 163, 184, 0.12)",
            },
          ]}
        >
          <AppText variant="caption" color={active ? palette.cyan : palette.soft}>
            {section.badge}
          </AppText>
        </View>
      </View>

      <AppText variant="label" color={palette.text}>
        {section.title}
      </AppText>

      <AppText variant="caption" color={palette.soft}>
        {section.helper}
      </AppText>
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  palette,
  onPress,
}: {
  label: string;
  active: boolean;
  palette: AppShellPalette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          borderColor: active ? "#20C8FF" : palette.border,
          backgroundColor: active ? "#67E8F9" : palette.panel,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppText variant="caption" color={active ? "#06111F" : palette.soft}>
        {label}
      </AppText>
    </Pressable>
  );
}

function StatusBadge({ status }: { status?: DocumentStatus | null }) {
  const tone = statusTone(status);

  const bg =
    tone === "success"
      ? "rgba(34, 197, 94, 0.16)"
      : tone === "warning"
        ? "rgba(245, 158, 11, 0.18)"
        : tone === "danger"
          ? "rgba(239, 68, 68, 0.16)"
          : "rgba(148, 163, 184, 0.14)";

  const color =
    tone === "success"
      ? "#86EFAC"
      : tone === "warning"
        ? "#FDE68A"
        : tone === "danger"
          ? "#FCA5A5"
          : "#CBD5E1";

  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <AppText variant="caption" color={color}>
        {statusLabel(status)}
      </AppText>
    </View>
  );
}

function DetailLine({
  label,
  value,
  palette,
  strong = false,
}: {
  label: string;
  value: string;
  palette: AppShellPalette;
  strong?: boolean;
}) {
  return (
    <View style={styles.detailLine}>
      <AppText variant="caption" color={palette.soft}>
        {label}
      </AppText>

      <AppText variant={strong ? "label" : "caption"} color={palette.text}>
        {value}
      </AppText>
    </View>
  );
}

function MoneyPill({
  label,
  value,
  palette,
  tone = "neutral",
}: {
  label: string;
  value: string;
  palette: AppShellPalette;
  tone?: "neutral" | "success" | "warning";
}) {
  const backgroundColor =
    tone === "success"
      ? "rgba(34, 197, 94, 0.12)"
      : tone === "warning"
        ? "rgba(245, 158, 11, 0.14)"
        : "rgba(148, 163, 184, 0.10)";

  const borderColor =
    tone === "success"
      ? "rgba(34, 197, 94, 0.20)"
      : tone === "warning"
        ? "rgba(245, 158, 11, 0.24)"
        : palette.border;

  return (
    <View style={[styles.moneyPill, { backgroundColor, borderColor }]}>
      <AppText variant="caption" color={palette.soft}>
        {label}
      </AppText>

      <AppText variant="label" color={palette.text}>
        {value}
      </AppText>
    </View>
  );
}

function TaxLine({
  document,
  palette,
}: {
  document: DocumentRecord;
  palette: AppShellPalette;
}) {
  if (!shouldShowTax(document)) return null;

  const snapshot = documentTaxSnapshot(document);
  const label = taxLabelForDocument(snapshot);
  const tax = safeNumber(snapshot.taxAmount);

  return (
    <View style={styles.taxLine}>
      <View style={styles.taxIcon}>
        <Ionicons name="calculator-outline" size={14} color="#06111F" />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="caption" color={palette.soft}>
          Tax included
        </AppText>

        <AppText variant="caption" color={palette.text}>
          {label}
        </AppText>
      </View>

      <AppText variant="caption" color={palette.text}>
        {formatMoney(tax)}
      </AppText>
    </View>
  );
}

function DocumentCard({
  document,
  palette,
}: {
  document: DocumentRecord;
  palette: AppShellPalette;
}) {
  const total = documentTotal(document);
  const paid = documentPaid(document);
  const balance = documentBalance(document);
  const showPaid = document.type === "receipts" || paid > 0;
  const showBalance = balance > 0;

  return (
    <Pressable
      onPress={() => openDocument(document)}
      style={({ pressed }) => [
        styles.documentCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View style={styles.documentTop}>
        <View style={styles.documentIcon}>
          <Ionicons name={sectionIcon(document.type)} size={17} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 5 }}>
          <AppText variant="label" color={palette.text}>
            {document.number}
          </AppText>

          <AppText variant="caption" color={palette.soft}>
            {documentPurpose(document.type)}
          </AppText>
        </View>

        <StatusBadge status={document.status} />
      </View>

      <View style={styles.customerPanel}>
        <DetailLine
          label="Customer"
          value={document.customerName || "Walk-in customer"}
          palette={palette}
          strong
        />

        {document.customerPhone ? (
          <DetailLine label="Phone" value={document.customerPhone} palette={palette} />
        ) : null}

        <DetailLine label="Date" value={formatDate(document.date)} palette={palette} />
      </View>

      <View style={styles.moneyGrid}>
        <MoneyPill
          label={documentAmountLabel(document.type)}
          value={formatMoney(total)}
          palette={palette}
        />

        {showPaid ? (
          <MoneyPill
            label="Amount paid"
            value={formatMoney(paid)}
            palette={palette}
            tone={paid > 0 ? "success" : "neutral"}
          />
        ) : null}

        {showBalance ? (
          <MoneyPill
            label="Balance due"
            value={formatMoney(balance)}
            palette={palette}
            tone="warning"
          />
        ) : null}
      </View>

      <TaxLine document={document} palette={palette} />

      <View style={styles.openRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={palette.cyan}>
            Preview {documentTypeLabel(document.type).toLowerCase()}
          </AppText>

          <AppText variant="caption" color={palette.soft}>
            {paymentNote(document)}
          </AppText>
        </View>

        <Ionicons name="chevron-forward" size={17} color={palette.cyan} />
      </View>
    </Pressable>
  );
}

export default function DocumentsScreen() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const activeBranch = useBranchStore((state) => state.activeBranch);

  const [activeType, setActiveType] = useState<DocumentType>("receipts");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DocumentFilterKey>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const debouncedQuery = useDebouncedValue(query);

  const activeSection = useMemo(
    () =>
      DOCUMENT_SECTIONS.find((section) => section.type === activeType) ||
      DOCUMENT_SECTIONS[0],
    [activeType],
  );

  const documentsQuery = useDocumentsList(activeType, debouncedQuery.trim());

  const allDocuments = useMemo(
    () => normalizeDocuments(activeType, documentsQuery.data),
    [activeType, documentsQuery.data],
  );

  const filteredDocuments = useMemo(
    () => filterDocuments(allDocuments, debouncedQuery, filter),
    [allDocuments, debouncedQuery, filter],
  );

  const visibleDocuments = filteredDocuments.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredDocuments.length;

  const isLoading = isHydrating || !user || !tenant || documentsQuery.isLoading;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeType, debouncedQuery, filter]);

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <DocumentsSkeleton palette={palette} />
        ) : (
          <>
            <AppBackButton label="Back to More" to={routes.more} palette={palette} />

            <View
              style={[
                styles.heroPanel,
                {
                  borderColor: palette.borderStrong,
                  backgroundColor: "rgba(32, 200, 255, 0.10)",
                },
              ]}
            >
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Ionicons name="folder-open-outline" size={22} color="#06111F" />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="caption" color={palette.cyan}>
                    DOCUMENT CENTER
                  </AppText>

                  <AppText variant="subtitle" color={palette.text}>
                    Customer proof and business records.
                  </AppText>
                </View>
              </View>

              <View style={styles.heroDetails}>
                <DetailLine
                  label="Current location"
                  value={activeBranch?.name || "Main selling location"}
                  palette={palette}
                />

                <DetailLine label="Showing" value={activeSection.title} palette={palette} />
              </View>
            </View>

            <View style={styles.sectionGrid}>
              {DOCUMENT_SECTIONS.map((section) => (
                <SectionCard
                  key={section.type}
                  section={section}
                  active={section.type === activeType}
                  palette={palette}
                  onPress={() => {
                    setActiveType(section.type);
                    setQuery("");
                    setFilter("all");
                    setVisibleCount(PAGE_SIZE);
                  }}
                />
              ))}
            </View>

            <AppTextInput
              label={`Search ${activeSection.title}`}
              value={query}
              onChangeText={setQuery}
              placeholder="Search customer, phone, or document number"
            />

            <View style={styles.filterWrap}>
              <AppText variant="caption" color={palette.soft}>
                FILTER RECORDS
              </AppText>

              <View style={styles.filterRow}>
                {DOCUMENT_FILTERS.map((item) => (
                  <FilterChip
                    key={item.key}
                    label={item.label}
                    active={filter === item.key}
                    palette={palette}
                    onPress={() => setFilter(item.key)}
                  />
                ))}
              </View>
            </View>

            {documentsQuery.isFetching && !documentsQuery.isLoading ? (
              <View
                style={[
                  styles.refreshBox,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.soft}>
                  Updating documents...
                </AppText>
              </View>
            ) : null}

            <View
              style={[
                styles.activePanel,
                {
                  borderColor: palette.borderStrong,
                  backgroundColor: "rgba(32, 200, 255, 0.08)",
                },
              ]}
            >
              <View style={styles.activePanelTop}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name={sectionIcon(activeSection.type)}
                    size={17}
                    color="#06111F"
                  />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <AppText variant="label" color={palette.text}>
                    {activeSection.title}
                  </AppText>

                  <AppText variant="caption" color={palette.soft}>
                    Showing {visibleDocuments.length} of {filteredDocuments.length}{" "}
                    {filterLabel(filter)}.
                  </AppText>
                </View>
              </View>

              <AppText variant="caption" color={palette.soft}>
                {activeSection.canCreate
                  ? `Mobile creation for ${activeSection.title.toLowerCase()} comes next.`
                  : "These records are created from sales and payments."}
              </AppText>
            </View>

            {visibleDocuments.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.panel,
                  },
                ]}
              >
                <AppText variant="label" color={palette.text}>
                  No {activeSection.title.toLowerCase()} found
                </AppText>

                <AppText variant="caption" color={palette.soft}>
                  {query.trim()
                    ? "Try another search term or change the filter."
                    : "When records exist, they will appear here."}
                </AppText>
              </View>
            ) : (
              <View style={styles.list}>
                {visibleDocuments.map((document) => (
                  <DocumentCard
                    key={`${document.type}-${document.id}`}
                    document={document}
                    palette={palette}
                  />
                ))}
              </View>
            )}

            {canLoadMore ? (
              <AsyncButton
                fullWidth
                onPress={() => setVisibleCount((current) => current + PAGE_SIZE)}
                disabled={documentsQuery.isFetching}
                style={styles.loadMoreButton}
              >
                Load 8 more
              </AsyncButton>
            ) : null}

            <AsyncButton
              fullWidth
              onPress={async () => {
                await documentsQuery.refetch();
              }}
              disabled={documentsQuery.isFetching}
              style={styles.refreshButton}
            >
              Refresh documents
            </AsyncButton>
          </>
        )
      }
    </AppShell>
  );
}

const styles = StyleSheet.create({
  heroPanel: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  heroIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  heroDetails: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 12,
    gap: 9,
  },

  sectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  sectionCard: {
    width: "48%",
    borderWidth: 1,
    padding: 13,
    gap: 9,
  },

  sectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  sectionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  filterWrap: {
    gap: 8,
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

  activePanel: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },

  activePanelTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  list: {
    gap: 10,
  },

  documentCard: {
    borderWidth: 1,
    padding: 14,
    gap: 13,
  },

  documentTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  documentIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  customerPanel: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 12,
    gap: 9,
  },

  detailLine: {
    gap: 2,
  },

  moneyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  moneyPill: {
    minWidth: "47%",
    flex: 1,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },

  taxLine: {
    borderWidth: 1,
    borderColor: "rgba(32, 200, 255, 0.22)",
    backgroundColor: "rgba(32, 200, 255, 0.08)",
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  taxIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  openRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  refreshBox: {
    borderWidth: 1,
    padding: 12,
  },

  emptyBox: {
    borderWidth: 1,
    padding: 15,
    gap: 5,
  },

  loadMoreButton: {
    minHeight: 54,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
    borderRadius: 8,
  },

  refreshButton: {
    minHeight: 54,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
    borderRadius: 8,
  },
});