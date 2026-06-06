import { useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { AppShell, type AppShellPalette } from "../../../../src/components/app/AppShell";
import { AppBackButton } from "../../../../src/components/app/AppBackButton";
import { AppText } from "../../../../src/components/ui/AppText";
import { AsyncButton } from "../../../../src/components/ui/AsyncButton";
import { Skeleton } from "../../../../src/components/ui/Skeleton";
import { routes } from "../../../../src/constants/routes";
import {
  buildDocumentPrintUrl,
  isDocumentType,
} from "../../../../src/features/documents/api";
import {
  normalizeDocumentDetail,
  taxLabelForDocument,
  useDocumentDetail,
} from "../../../../src/features/documents/hooks";
import type {
  DocumentDetail,
  DocumentLineItem,
  DocumentStatus,
  DocumentType,
} from "../../../../src/features/documents/types";
import { useAuthStore } from "../../../../src/store/authStore";

function formatMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";

  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;

  return `${safe.toLocaleString()} RWF`;
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

function cleanText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeNumber(value: unknown) {
  const amount =
    typeof value === "string" ? Number(value.replace(/[^\d.-]/g, "")) : Number(value || 0);

  return Number.isFinite(amount) ? amount : 0;
}

function documentTitle(type?: DocumentType | null) {
  if (type === "receipts") return "Receipt preview";
  if (type === "invoices") return "Invoice preview";
  if (type === "delivery-notes") return "Delivery note preview";
  if (type === "proformas") return "Proforma preview";
  if (type === "warranties") return "Warranty preview";
  return "Document preview";
}

function documentLabel(type?: DocumentType | null) {
  if (type === "receipts") return "Receipt";
  if (type === "invoices") return "Invoice";
  if (type === "delivery-notes") return "Delivery note";
  if (type === "proformas") return "Proforma";
  if (type === "warranties") return "Warranty";
  return "Document";
}

function documentFilePrefix(type?: DocumentType | null) {
  if (type === "receipts") return "Receipt";
  if (type === "invoices") return "Invoice";
  if (type === "delivery-notes") return "Delivery-Note";
  if (type === "proformas") return "Proforma";
  if (type === "warranties") return "Warranty";
  return "Document";
}

function documentIcon(type?: DocumentType | null): keyof typeof Ionicons.glyphMap {
  if (type === "receipts") return "receipt-outline";
  if (type === "invoices") return "document-text-outline";
  if (type === "delivery-notes") return "cube-outline";
  if (type === "proformas") return "reader-outline";
  return "shield-checkmark-outline";
}

function statusTone(status?: DocumentStatus | null) {
  const value = String(status || "Ready").toUpperCase();

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

function itemName(item: DocumentLineItem) {
  return item.productName || item.name || item.description || "Item";
}

function itemIdentifier(item: DocumentLineItem) {
  return cleanText(item.serial || item.serialNumber || item.imei);
}

function itemQuantity(item: DocumentLineItem) {
  return safeNumber(item.quantity ?? item.qty ?? 1) || 1;
}

function itemUnitPrice(item: DocumentLineItem) {
  return safeNumber(item.unitPrice ?? item.price ?? 0);
}

function itemLineTotal(item: DocumentLineItem) {
  const provided = safeNumber(item.lineTotal ?? item.totalAmount ?? item.total ?? 0);
  if (provided > 0) return provided;

  return itemQuantity(item) * itemUnitPrice(item);
}

function safeFileName(value: string) {
  const cleaned = String(value || "document")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "document";
}

function taxShouldShow(document: DocumentDetail) {
  const mode = String(document.taxMode || "NONE").toUpperCase();
  const displayMode = String(document.taxDisplayMode || "HIDDEN").toUpperCase();
  const amount = safeNumber(document.taxAmount);

  if (mode === "NONE") return false;
  if (displayMode === "HIDDEN") return false;
  if (amount <= 0) return false;

  return Boolean(document.showTaxOnCustomerDocuments || displayMode === "CUSTOMER_FACING");
}

function taxIsIncluded(document: DocumentDetail) {
  return Boolean(document.pricesIncludeTax);
}

function mainTotal(document: DocumentDetail) {
  return safeNumber(document.finalTotal ?? document.totalAmount ?? document.amount);
}

function subtotalForDocument(document: DocumentDetail) {
  const subtotal = safeNumber(document.subtotalAmount);
  if (subtotal > 0) return subtotal;

  return mainTotal(document);
}

function taxableForDocument(document: DocumentDetail) {
  const taxable = safeNumber(document.taxableAmount);
  if (taxable > 0) return taxable;

  const subtotal = subtotalForDocument(document);
  const tax = safeNumber(document.taxAmount);

  if (tax > 0 && subtotal > tax) return subtotal - tax;

  return subtotal;
}

function paidForDocument(document: DocumentDetail) {
  return safeNumber(document.amountPaid);
}

function balanceForDocument(document: DocumentDetail) {
  return safeNumber(document.balanceDue);
}

function previewNote(type: DocumentType, document: DocumentDetail) {
  if (type === "receipts") {
    const balance = balanceForDocument(document);

    if (balance > 0) {
      return "This receipt shows a partial payment. The remaining balance is still visible for follow-up.";
    }

    return "This receipt is payment proof for the customer and business records.";
  }

  if (type === "invoices") {
    return "This invoice shows what the customer has been billed and what still needs to be paid.";
  }

  if (type === "proformas") {
    return "This proforma is a quotation before the final sale is confirmed.";
  }

  if (type === "delivery-notes") {
    return "This delivery note is proof that goods were handed to the customer.";
  }

  return "This warranty keeps after-sale support clear and traceable.";
}

function PreviewSkeleton({ palette }: { palette: AppShellPalette }) {
  return (
    <>
      <Skeleton height={46} width="42%" />

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

      <View style={styles.summaryGrid}>
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            style={[
              styles.summaryCard,
              {
                borderColor: palette.border,
                backgroundColor: palette.panel,
              },
            ]}
          >
            <Skeleton height={12} width="46%" />
            <Skeleton height={20} width="76%" />
          </View>
        ))}
      </View>

      <View
        style={[
          styles.infoPanel,
          {
            borderColor: palette.border,
            backgroundColor: palette.panel,
          },
        ]}
      >
        <Skeleton height={14} width="35%" />
        <Skeleton height={18} width="86%" />
        <Skeleton height={18} width="72%" />
        <Skeleton height={18} width="78%" />
      </View>

      {[1, 2, 3].map((item) => (
        <View
          key={item}
          style={[
            styles.itemCard,
            {
              borderColor: palette.border,
              backgroundColor: palette.panel,
            },
          ]}
        >
          <Skeleton height={16} width="60%" />
          <Skeleton height={13} width="76%" />
        </View>
      ))}
    </>
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
        {String(status || "Ready")}
      </AppText>
    </View>
  );
}

function InfoRow({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: AppShellPalette;
}) {
  return (
    <View style={styles.infoRow}>
      <AppText variant="caption" color={palette.soft}>
        {label}
      </AppText>

      <AppText variant="label" color={palette.text}>
        {value || "—"}
      </AppText>
    </View>
  );
}

function MoneyRow({
  label,
  value,
  palette,
  strong = false,
  accent = false,
}: {
  label: string;
  value: string;
  palette: AppShellPalette;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={[styles.moneyRow, strong ? styles.moneyRowStrong : null]}>
      <AppText variant={strong ? "label" : "caption"} color={strong ? palette.text : palette.soft}>
        {label}
      </AppText>

      <AppText variant={strong ? "subtitle" : "label"} color={accent ? palette.cyan : palette.text}>
        {value}
      </AppText>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  palette,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  palette: AppShellPalette;
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.summaryTop}>
        <View style={styles.smallIcon}>
          <Ionicons name={icon} size={15} color="#06111F" />
        </View>

        <AppText variant="caption" color={palette.soft}>
          {label}
        </AppText>
      </View>

      <AppText variant="label" color={palette.text}>
        {value}
      </AppText>
    </View>
  );
}

function DocumentTotalsPanel({
  document,
  type,
  palette,
}: {
  document: DocumentDetail;
  type: DocumentType;
  palette: AppShellPalette;
}) {
  const showTax = taxShouldShow(document);
  const included = taxIsIncluded(document);
  const subtotal = subtotalForDocument(document);
  const taxable = taxableForDocument(document);
  const tax = safeNumber(document.taxAmount);
  const total = mainTotal(document);
  const paid = paidForDocument(document);
  const balance = balanceForDocument(document);
  const label = taxLabelForDocument(document);

  return (
    <View
      style={[
        styles.totalsPanel,
        {
          borderColor: palette.borderStrong,
          backgroundColor: "rgba(32, 200, 255, 0.08)",
        },
      ]}
    >
      <View style={styles.panelHeader}>
        <View style={styles.itemIcon}>
          <Ionicons name="calculator-outline" size={16} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="label" color={palette.text}>
            Totals
          </AppText>

          <AppText variant="caption" color={palette.soft}>
            {showTax && included
              ? "Tax is already included in the customer price."
              : "Document payment summary."}
          </AppText>
        </View>
      </View>

      <View style={styles.moneyList}>
        {showTax && included ? (
          <>
            <MoneyRow
              label="Subtotal before tax"
              value={formatMoney(taxable)}
              palette={palette}
            />

            <MoneyRow label={label} value={formatMoney(tax)} palette={palette} />

            <MoneyRow label="Subtotal" value={formatMoney(subtotal)} palette={palette} />
          </>
        ) : (
          <MoneyRow label="Subtotal" value={formatMoney(subtotal)} palette={palette} />
        )}

        {type === "receipts" || paid > 0 ? (
          <MoneyRow label="Amount paid" value={formatMoney(paid)} palette={palette} />
        ) : null}

        {balance > 0 ? (
          <MoneyRow label="Balance due" value={formatMoney(balance)} palette={palette} />
        ) : null}

        <MoneyRow label="Total" value={formatMoney(total)} palette={palette} strong accent />
      </View>
    </View>
  );
}

function ItemCard({
  item,
  palette,
}: {
  item: DocumentLineItem;
  palette: AppShellPalette;
}) {
  const identifier = itemIdentifier(item);

  return (
    <View
      style={[
        styles.itemCard,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      <View style={styles.itemTop}>
        <View style={styles.itemIcon}>
          <Ionicons name="cube-outline" size={16} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color={palette.text}>
            {itemName(item)}
          </AppText>

          {item.description ? (
            <AppText variant="caption" color={palette.soft}>
              {item.description}
            </AppText>
          ) : null}
        </View>

        <AppText variant="label" color={palette.text}>
          {formatMoney(itemLineTotal(item))}
        </AppText>
      </View>

      <View style={styles.itemMetaGrid}>
        <InfoRow label="Quantity" value={String(itemQuantity(item))} palette={palette} />
        <InfoRow label="Unit price" value={formatMoney(itemUnitPrice(item))} palette={palette} />

        {identifier ? (
          <InfoRow label="Identifier" value={identifier} palette={palette} />
        ) : null}
      </View>
    </View>
  );
}

function ActionPanel({
  document,
  type,
  token,
  palette,
}: {
  document: DocumentDetail;
  type: DocumentType;
  token?: string | null;
  palette: AppShellPalette;
}) {
  const [opening, setOpening] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");

  const documentUrl = buildDocumentPrintUrl(type, document.id, token);
  const fileName = `${safeFileName(documentFilePrefix(type))}-${safeFileName(
    document.number,
  )}.pdf`;

  async function openDownloadableDocument() {
    setError("");

    try {
      setOpening(true);
      const supported = await Linking.canOpenURL(documentUrl);

      if (!supported) {
        setError("This device could not open the document link.");
        return;
      }

      await Linking.openURL(documentUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not open this document.";
      setError(message);
    } finally {
      setOpening(false);
    }
  }

  async function shareDocument() {
    setError("");

    if (Platform.OS === "web") {
      await openDownloadableDocument();
      return;
    }

    try {
      setSharing(true);

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        setError("Sharing is not available on this device.");
        return;
      }

      const targetUri = `${FileSystem.cacheDirectory || ""}${fileName}`;
      const downloaded = await FileSystem.downloadAsync(documentUrl, targetUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (downloaded.status < 200 || downloaded.status >= 300) {
        setError("The document could not be downloaded for sharing.");
        return;
      }

      await Sharing.shareAsync(downloaded.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: `Share ${document.number}`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not share this document.";
      setError(message);
    } finally {
      setSharing(false);
    }
  }

  return (
    <View
      style={[
        styles.actionPanel,
        {
          borderColor: palette.borderStrong,
          backgroundColor: "rgba(32, 200, 255, 0.08)",
        },
      ]}
    >
      <View style={styles.actionTop}>
        <View style={styles.itemIcon}>
          <Ionicons name="share-social-outline" size={16} color="#06111F" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="label" color={palette.text}>
            Save or share document
          </AppText>

          <AppText variant="caption" color={palette.soft}>
            Open the branded PDF, or share it from the phone when using the mobile app.
          </AppText>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <AppText variant="caption" color="#FCA5A5">
            {error}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actionButtons}>
        <AsyncButton
          fullWidth
          disabled={opening || sharing}
          onPress={openDownloadableDocument}
          style={styles.downloadButton}
        >
          {opening ? "Opening document..." : "Open PDF"}
        </AsyncButton>

        <AsyncButton
          fullWidth
          disabled={opening || sharing}
          onPress={shareDocument}
          style={styles.shareButton}
        >
          {sharing ? "Preparing PDF..." : "Share or save PDF"}
        </AsyncButton>
      </View>
    </View>
  );
}

export default function DocumentPreviewScreen() {
  const params = useLocalSearchParams<{
    type?: string | string[];
    id?: string | string[];
  }>();

  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const token = useAuthStore((state) => state.token);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const type = isDocumentType(rawType) ? rawType : null;

  const detailQuery = useDocumentDetail(type, documentId);

  const document = useMemo(
    () => (type ? normalizeDocumentDetail(type, detailQuery.data) : null),
    [type, detailQuery.data],
  );

  const isLoading = isHydrating || !user || !tenant || detailQuery.isLoading;

  return (
    <AppShell>
      {(palette) =>
        isLoading ? (
          <PreviewSkeleton palette={palette} />
        ) : (
          <>
            <AppBackButton
              label="Back to documents"
              to={routes.documents}
              palette={palette}
            />

            {!type || !documentId ? (
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
                  Document not selected
                </AppText>

                <AppText variant="caption" color={palette.soft}>
                  Go back and choose a document to preview.
                </AppText>
              </View>
            ) : null}

            {detailQuery.isError ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    borderColor: "rgba(239, 68, 68, 0.22)",
                    backgroundColor: "rgba(239, 68, 68, 0.10)",
                  },
                ]}
              >
                <AppText variant="label" color="#FCA5A5">
                  Could not load this document.
                </AppText>

                <AsyncButton
                  fullWidth
                  onPress={async () => {
                    await detailQuery.refetch();
                  }}
                  style={styles.retryButton}
                >
                  Try again
                </AsyncButton>
              </View>
            ) : null}

            {document && type ? (
              <>
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
                      <Ionicons name={documentIcon(type)} size={22} color="#06111F" />
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText variant="caption" color={palette.cyan}>
                        {documentLabel(type)}
                      </AppText>

                      <AppText variant="subtitle" color={palette.text}>
                        {documentTitle(type)}
                      </AppText>
                    </View>

                    <StatusBadge status={document.status} />
                  </View>

                  <View style={styles.heroDetails}>
                    <InfoRow label="Document number" value={document.number} palette={palette} />
                    <InfoRow label="Date" value={formatDate(document.date)} palette={palette} />
                  </View>
                </View>

                <View style={styles.summaryGrid}>
                  <SummaryCard
                    label="Total"
                    value={formatMoney(mainTotal(document))}
                    icon="cash-outline"
                    palette={palette}
                  />

                  <SummaryCard
                    label="Status"
                    value={String(document.status || "Ready")}
                    icon="shield-checkmark-outline"
                    palette={palette}
                  />

                  <SummaryCard
                    label="Customer"
                    value={document.customerName || "Walk-in customer"}
                    icon="person-outline"
                    palette={palette}
                  />

                  <SummaryCard
                    label="Items"
                    value={String(document.items.length)}
                    icon="cube-outline"
                    palette={palette}
                  />
                </View>

                <View
                  style={[
                    styles.infoPanel,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.panel,
                    },
                  ]}
                >
                  <View style={styles.panelHeader}>
                    <View style={styles.itemIcon}>
                      <Ionicons name="person-outline" size={16} color="#06111F" />
                    </View>

                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText variant="label" color={palette.text}>
                        Customer and business details
                      </AppText>

                      <AppText variant="caption" color={palette.soft}>
                        Clean record details for this document.
                      </AppText>
                    </View>
                  </View>

                  <InfoRow
                    label="Customer"
                    value={document.customerName || "Walk-in customer"}
                    palette={palette}
                  />

                  {document.customerPhone ? (
                    <InfoRow label="Phone" value={document.customerPhone} palette={palette} />
                  ) : null}

                  {document.customerAddress ? (
                    <InfoRow
                      label="Address"
                      value={document.customerAddress}
                      palette={palette}
                    />
                  ) : null}

                  {document.businessName ? (
                    <InfoRow
                      label="Business"
                      value={document.businessName}
                      palette={palette}
                    />
                  ) : null}

                  {document.dueDate ? (
                    <InfoRow
                      label="Pay-by date"
                      value={formatDate(document.dueDate)}
                      palette={palette}
                    />
                  ) : null}

                  {document.expiryDate ? (
                    <InfoRow
                      label="Expiry date"
                      value={formatDate(document.expiryDate)}
                      palette={palette}
                    />
                  ) : null}

                  {document.deliveredBy ? (
                    <InfoRow
                      label="Delivered by"
                      value={document.deliveredBy}
                      palette={palette}
                    />
                  ) : null}

                  {document.receivedBy ? (
                    <InfoRow
                      label="Received by"
                      value={document.receivedBy}
                      palette={palette}
                    />
                  ) : null}

                  {document.receivedByPhone ? (
                    <InfoRow
                      label="Receiver phone"
                      value={document.receivedByPhone}
                      palette={palette}
                    />
                  ) : null}
                </View>

                <DocumentTotalsPanel document={document} type={type} palette={palette} />

                <ActionPanel
                  document={document}
                  type={type}
                  token={token}
                  palette={palette}
                />

                <View style={styles.sectionTitle}>
                  <AppText variant="subtitle" color={palette.text}>
                    Items
                  </AppText>

                  <AppText variant="caption" color={palette.soft}>
                    {document.items.length > 0
                      ? `${document.items.length} item${document.items.length === 1 ? "" : "s"} on this document`
                      : "No item lines returned for this document yet"}
                  </AppText>
                </View>

                {document.items.length > 0 ? (
                  <View style={styles.list}>
                    {document.items.map((item, index) => (
                      <ItemCard
                        key={item.id || `${itemName(item)}-${index}`}
                        item={item}
                        palette={palette}
                      />
                    ))}
                  </View>
                ) : (
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
                      No item details
                    </AppText>

                    <AppText variant="caption" color={palette.soft}>
                      The document can still be opened using the branded PDF.
                    </AppText>
                  </View>
                )}

                {document.notes ? (
                  <View
                    style={[
                      styles.infoPanel,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.panel,
                      },
                    ]}
                  >
                    <InfoRow label="Notes" value={document.notes} palette={palette} />
                  </View>
                ) : null}

                <Pressable
                  style={[
                    styles.bottomNote,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.panel,
                    },
                  ]}
                >
                  <View style={styles.noteMark}>
                    <AppText variant="caption" color="#06111F">
                      i
                    </AppText>
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText variant="label" color={palette.text}>
                      Phone-first document flow
                    </AppText>

                    <AppText variant="caption" color={palette.soft}>
                      {previewNote(type, document)}
                    </AppText>
                  </View>
                </Pressable>
              </>
            ) : null}
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

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  summaryCard: {
    minWidth: "47%",
    flex: 1,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },

  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  smallIcon: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  infoPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  totalsPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  moneyList: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 10,
    gap: 9,
  },

  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  moneyRowStrong: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 12,
    marginTop: 2,
  },

  infoRow: {
    gap: 4,
  },

  actionPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  actionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  actionButtons: {
    gap: 10,
  },

  downloadButton: {
    minHeight: 54,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
    borderRadius: 8,
  },

  shareButton: {
    minHeight: 54,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
    borderRadius: 8,
  },

  retryButton: {
    minHeight: 48,
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
    borderRadius: 8,
  },

  sectionTitle: {
    gap: 4,
  },

  list: {
    gap: 10,
  },

  itemCard: {
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },

  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  itemIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  itemMetaGrid: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.16)",
    paddingTop: 10,
    gap: 8,
  },

  emptyBox: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },

  errorBox: {
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.22)",
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    padding: 14,
    gap: 10,
  },

  bottomNote: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  noteMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },
});