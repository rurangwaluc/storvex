import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../../components/ui/AsyncButton";
import { previewWhatsAppBroadcastRecipients } from "../../../services/whatsappBroadcastsApi";
import {
  createWhatsAppBroadcast,
  createWhatsAppPromotion,
  deleteWhatsAppBroadcast,
  deleteWhatsAppPromotion,
  getWhatsAppBroadcastReport,
  queueWhatsAppBroadcast,
  sendWhatsAppBroadcastNow,
} from "../../../services/whatsappApi";
import {
  AUDIENCE_OPTIONS,
  BROADCAST_FAILURE_CACHE_KEY,
  BROADCAST_LIST_LIMIT,
  BROADCAST_PREVIEW_CACHE_KEY,
  DEFAULT_MESSAGE_FORMAT,
  DEFAULT_MESSAGE_LANGUAGE,
  FORCE_QUEUE_RECIPIENT_COUNT,
  LARGE_AUDIENCE_WARNING_COUNT,
  PROMOTION_LIST_LIMIT,
  RECIPIENT_PREVIEW_VISIBLE_LIMIT,
} from "../lib/whatsappInbox.constants";
import {
  categoryLabel,
  cleanPhone,
  cleanText,
  cx,
  formatCompactNumber,
  getRegisteredBusinessCategory,
  safeError,
  statusLabel,
  toneForStatus,
} from "../lib/whatsappInbox.utils";
import { Badge, EmptyState } from "./WhatsAppInboxPanels";

function recipientName(recipient) {
  return cleanText(recipient?.name) || cleanPhone(recipient?.phone) || "WhatsApp customer";
}

function recipientPhone(recipient) {
  return cleanPhone(recipient?.phone || recipient?.customerPhone);
}

function previewRecipientCount(preview) {
  return Number(preview?.recipientCount || preview?.count || 0);
}

function previewRecipients(preview) {
  const rows = preview?.recipients || preview?.previewRecipients || preview?.items || [];
  return Array.isArray(rows) ? rows : [];
}

function readBroadcastPreviewCache() {
  try {
    const raw =
      (typeof localStorage !== "undefined" && localStorage.getItem(BROADCAST_PREVIEW_CACHE_KEY)) ||
      "{}";

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeBroadcastPreviewCache(nextCache) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(BROADCAST_PREVIEW_CACHE_KEY, JSON.stringify(nextCache || {}));
  } catch {
    // Local cache is only used to keep draft recipient counts visible after refresh.
  }
}

function cachedBroadcastPreview(broadcastId) {
  const id = cleanText(broadcastId);
  if (!id) return null;

  const cache = readBroadcastPreviewCache();
  const preview = cache[id];
  return preview && typeof preview === "object" ? preview : null;
}

function rememberBroadcastPreview({ broadcastId, preview, targeting, promotionId }) {
  const id = cleanText(broadcastId);
  if (!id || !preview) return null;

  const count = previewRecipientCount(preview);
  const rows = previewRecipients(preview).slice(0, 20).map((recipient) => ({
    id: cleanText(recipient.id),
    name: cleanText(recipient.name) || "Customer",
    phone: cleanText(recipient.phone),
  }));

  const snapshot = {
    broadcastId: id,
    promotionId: cleanText(promotionId),
    recipientCount: count,
    recipients: rows,
    audienceLabel: cleanText(preview.audienceLabel) || cleanText(preview.label),
    warning: cleanText(preview.warning),
    canSend: preview.canSend !== false && count > 0,
    targeting: targeting || { mode: "ALL_OPTED_IN" },
    savedAt: new Date().toISOString(),
  };

  const cache = readBroadcastPreviewCache();
  cache[id] = snapshot;
  writeBroadcastPreviewCache(cache);

  return snapshot;
}

function enrichBroadcastWithCachedPreview(broadcast) {
  const cached = cachedBroadcastPreview(broadcast?.id);
  if (!cached) return broadcast;

  const liveRecipientCount = Number(broadcast?.recipientCount || 0);
  const cachedRecipientCount = Number(cached.recipientCount || 0);

  return {
    ...broadcast,
    recipientCount: liveRecipientCount > 0 ? liveRecipientCount : cachedRecipientCount,
    recipientPreview: cached,
    targetingPreview: cached.targeting || broadcast?.targetingPreview || null,
  };
}

function broadcastRecipientCount(broadcast) {
  return Number(broadcast?.recipientCount || broadcast?.recipientPreview?.recipientCount || 0);
}

function readBroadcastFailureCache() {
  try {
    const raw =
      (typeof localStorage !== "undefined" && localStorage.getItem(BROADCAST_FAILURE_CACHE_KEY)) ||
      "{}";

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeBroadcastFailureCache(nextCache) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(BROADCAST_FAILURE_CACHE_KEY, JSON.stringify(nextCache || {}));
  } catch {
    // Failure details are helpful UI context only; sending must not depend on local storage.
  }
}

function rememberBroadcastFailure({ broadcastId, summary = null, message = "" }) {
  const id = cleanText(broadcastId);
  if (!id) return null;

  const failures = Array.isArray(summary?.failurePreview)
    ? summary.failurePreview.slice(0, 5).map((item) => ({
        customerId: cleanText(item.customerId),
        phone: cleanText(item.phone),
        message: cleanText(item.message) || "This customer message could not be sent.",
      }))
    : [];

  const snapshot = {
    broadcastId: id,
    failed: Number(summary?.failed || failures.length || 1),
    delivered: Number(summary?.delivered || 0),
    attempted: Number(summary?.attempted || 0),
    skippedDuplicate: Number(summary?.skippedDuplicate || 0),
    message: cleanText(message) || failures[0]?.message || "The last send attempt needs attention.",
    failures,
    savedAt: new Date().toISOString(),
  };

  const cache = readBroadcastFailureCache();
  cache[id] = snapshot;
  writeBroadcastFailureCache(cache);

  return snapshot;
}

function clearBroadcastFailure(broadcastId) {
  const id = cleanText(broadcastId);
  if (!id) return;

  const cache = readBroadcastFailureCache();
  if (!cache[id]) return;

  delete cache[id];
  writeBroadcastFailureCache(cache);
}

function broadcastFailureDetails(broadcast) {
  const cached = readBroadcastFailureCache()[cleanText(broadcast?.id)] || null;
  if (cached) return cached;

  if (broadcastStatusValue(broadcast) !== "FAILED") return null;

  const count = broadcastRecipientCount(broadcast);
  return {
    failed: count || 0,
    sent: Number(broadcast?.sentCount || broadcast?.deliveredCount || 0),
    delivered: Number(broadcast?.deliveredCount || 0),
    read: Number(broadcast?.readCount || 0),
    failed: Number(broadcast?.failedCount || 0),
    attempted: count || 0,
    skippedDuplicate: 0,
    message: count
      ? "The last send attempt failed. Check WhatsApp account setup, approved template, and recipient phone numbers."
      : "This failed broadcast has no saved recipient preview. Preview recipients again before retrying.",
    failures: [],
  };
}

function canActOnBroadcastAudience(broadcast) {
  return broadcastRecipientCount(broadcast) > 0;
}

function broadcastStatusValue(broadcast) {
  return String(broadcast?.status || "DRAFT").trim().toUpperCase();
}

function canQueueBroadcast(broadcast) {
  return broadcastStatusValue(broadcast) === "DRAFT";
}

function canSendBroadcast(broadcast) {
  return ["DRAFT", "QUEUED", "FAILED"].includes(broadcastStatusValue(broadcast));
}

function sendActionLabel(broadcast) {
  const status = broadcastStatusValue(broadcast);

  if (status === "SENT") return "Sent";
  if (status === "QUEUED") return "Send queued now";
  if (status === "FAILED") return "Retry send";

  return "Send now";
}

function primaryBroadcastAction({ broadcast, recipientCount }) {
  const status = broadcastStatusValue(broadcast);
  const hasAudience = Number(recipientCount || 0) > 0;

  if (!hasAudience) {
    return {
      kind: "BLOCKED",
      label: "Preview first",
      disabled: true,
      title: "Preview recipients before queueing or sending",
    };
  }

  if (status === "SENT") {
    return {
      kind: "CLOSED",
      label: "Sent",
      disabled: true,
      title: "This campaign has already been sent",
    };
  }

  if (status === "QUEUED") {
    return {
      kind: "SEND",
      label: "Send queued now",
      disabled: false,
      title: "Send this queued campaign now",
    };
  }

  if (status === "FAILED") {
    return {
      kind: "SEND",
      label: "Retry send",
      disabled: false,
      title: "Retry sending this campaign to the saved recipients",
    };
  }

  if (shouldForceQueue(recipientCount) || isLargeAudience(recipientCount)) {
    return {
      kind: "QUEUE",
      label: shouldForceQueue(recipientCount) ? "Queue required" : "Queue campaign",
      disabled: false,
      title: "Queue this larger campaign instead of sending immediately",
    };
  }

  return {
    kind: "SEND",
    label: "Send now",
    disabled: false,
    title: "Send this campaign to the saved recipients now",
  };
}

function secondaryQueueAvailable({ broadcast, recipientCount }) {
  return (
    broadcastStatusValue(broadcast) === "DRAFT" &&
    Number(recipientCount || 0) > 0 &&
    !isLargeAudience(recipientCount)
  );
}

function matchesPromotionQuery(promotion, query) {
  const q = cleanText(query).toLowerCase();
  if (!q) return true;

  return [promotion?.title, promotion?.message, promotion?.category]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function matchesBroadcastQuery(broadcast, query) {
  const q = cleanText(query).toLowerCase();
  if (!q) return true;

  return [
    broadcast?.promotion?.title,
    broadcast?.promotion?.message,
    broadcast?.templateName,
    broadcast?.status,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function isLargeAudience(count) {
  return Number(count || 0) >= LARGE_AUDIENCE_WARNING_COUNT;
}

function shouldForceQueue(count) {
  return Number(count || 0) >= FORCE_QUEUE_RECIPIENT_COUNT;
}


function promotionBroadcastCount(promotion) {
  return Number(promotion?.usage?.broadcastCount || promotion?.broadcastCount || 0);
}

function canDeletePromotionRecord(promotion) {
  return Boolean(promotion?.id) && promotionBroadcastCount(promotion) === 0;
}

function canRemoveBroadcastRecord(broadcast) {
  const status = broadcastStatusValue(broadcast);
  const delivered = Number(broadcast?.deliveredCount || 0);

  if (!broadcast?.id) return false;
  if (status === "SENT" || delivered > 0) return false;

  return ["DRAFT", "QUEUED", "FAILED"].includes(status);
}

function cleanupBroadcastActionLabel(broadcast) {
  const status = broadcastStatusValue(broadcast);

  if (status === "QUEUED") return "Cancel queue";
  if (status === "FAILED") return "Remove record";
  if (status === "SENT") return "History";

  return "Delete draft";
}

function cleanupBroadcastTitle(broadcast) {
  const status = broadcastStatusValue(broadcast);

  if (status === "QUEUED") return "Cancel queued broadcast?";
  if (status === "FAILED") return "Remove failed broadcast record?";

  return "Delete draft broadcast?";
}


function percentLabel(value) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function reportStatusTone(value) {
  const status = String(value || "").toUpperCase();
  if (status === "READ") return "success";
  if (status === "DELIVERED" || status === "SENT") return "info";
  if (status === "FAILED") return "danger";
  return "neutral";
}

function reportInsightTone(value) {
  const tone = String(value || "").toLowerCase();
  if (tone === "danger") return "danger";
  if (tone === "warning") return "warning";
  if (tone === "success") return "success";
  if (tone === "info") return "info";
  return "neutral";
}

function reportTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function recipientDisplayName(recipient) {
  return cleanText(recipient?.customerName) || cleanText(recipient?.phone) || "WhatsApp customer";
}

function recipientStatusTime(recipient) {
  const status = String(recipient?.status || "").toUpperCase();
  if (status === "READ") return recipient?.readAt || recipient?.deliveredAt || recipient?.sentAt;
  if (status === "DELIVERED") return recipient?.deliveredAt || recipient?.sentAt;
  if (status === "FAILED") return recipient?.failedAt || recipient?.sentAt;
  return recipient?.sentAt;
}

function cleanupBroadcastMessage(broadcast) {
  const title = broadcast?.promotion?.title || "this broadcast";
  const status = broadcastStatusValue(broadcast);

  if (status === "QUEUED") {
    return `This will cancel ${title} before it is sent. Customer conversations will not receive this campaign.`;
  }

  if (status === "FAILED") {
    return `This removes the failed, unsent ${title} record from the campaign list. It does not delete customer messages or sent campaign history.`;
  }

  return `This removes the unsent draft for ${title}. This cannot be undone.`;
}

export function BroadcastsWorkspace({ accounts, promotions, broadcasts, onRefresh }) {
  const registeredBusinessCategory = useMemo(() => getRegisteredBusinessCategory(), []);
  const registeredBusinessCategoryLabel = categoryLabel(registeredBusinessCategory);

  const [promotionTitle, setPromotionTitle] = useState("");
  const [promotionMessage, setPromotionMessage] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [targetMode, setTargetMode] = useState("ALL_OPTED_IN");
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [savingBroadcast, setSavingBroadcast] = useState(false);
  const [previewingRecipients, setPreviewingRecipients] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [lastPreviewKey, setLastPreviewKey] = useState("");
  const [promotionLimit, setPromotionLimit] = useState(PROMOTION_LIST_LIMIT);
  const [broadcastLimit, setBroadcastLimit] = useState(BROADCAST_LIST_LIMIT);
  const [promotionSearch, setPromotionSearch] = useState("");
  const [broadcastSearch, setBroadcastSearch] = useState("");
  const [broadcastStatusFilter, setBroadcastStatusFilter] = useState("ALL");
  const [busyBroadcastId, setBusyBroadcastId] = useState("");
  const [sendConfirmBroadcast, setSendConfirmBroadcast] = useState(null);
  const [cleanupConfirmAction, setCleanupConfirmAction] = useState(null);
  const [campaignReport, setCampaignReport] = useState(null);
  const [loadingReportId, setLoadingReportId] = useState("");
  const [openBroadcastMenu, setOpenBroadcastMenu] = useState(null);
  const [broadcastPreviewCacheVersion, setBroadcastPreviewCacheVersion] = useState(0);

  const visibleBroadcasts = useMemo(
    () => broadcasts.map(enrichBroadcastWithCachedPreview),
    [broadcasts, broadcastPreviewCacheVersion]
  );

  const filteredPromotions = useMemo(() => {
    return promotions.filter((promotion) => matchesPromotionQuery(promotion, promotionSearch));
  }, [promotions, promotionSearch]);

  const filteredBroadcasts = useMemo(() => {
    return visibleBroadcasts.filter((broadcast) => {
      const matchesStatus =
        broadcastStatusFilter === "ALL" || broadcastStatusValue(broadcast) === broadcastStatusFilter;

      return matchesStatus && matchesBroadcastQuery(broadcast, broadcastSearch);
    });
  }, [visibleBroadcasts, broadcastSearch, broadcastStatusFilter]);

  const selectedPromotion = useMemo(
    () => promotions.find((item) => item.id === promotionId) || null,
    [promotionId, promotions]
  );

  useEffect(() => {
    setPromotionLimit(PROMOTION_LIST_LIMIT);
  }, [promotionSearch]);

  useEffect(() => {
    setBroadcastLimit(BROADCAST_LIST_LIMIT);
  }, [broadcastSearch, broadcastStatusFilter]);

  useEffect(() => {
    function closeBroadcastMenu(event) {
      if (!event.target?.closest?.(".svx-wa-record-more-menu")) {
        setOpenBroadcastMenu(null);
      }
    }

    function closeBroadcastMenuOnEscape(event) {
      if (event.key === "Escape") {
        setOpenBroadcastMenu(null);
      }
    }

    window.addEventListener("pointerdown", closeBroadcastMenu);
    window.addEventListener("keydown", closeBroadcastMenuOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeBroadcastMenu);
      window.removeEventListener("keydown", closeBroadcastMenuOnEscape);
    };
  }, []);

  function toggleBroadcastRowMenu(broadcastId, event) {
    event.stopPropagation();

    const trigger = event.currentTarget;
    const triggerRect = trigger?.getBoundingClientRect?.();
    const estimatedMenuHeight = 230;
    const viewportHeight =
      typeof window !== "undefined" ? window.innerHeight : estimatedMenuHeight * 2;
    const spaceBelow = triggerRect ? viewportHeight - triggerRect.bottom : viewportHeight;
    const spaceAbove = triggerRect ? triggerRect.top : 0;
    const placement =
      spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow ? "up" : "down";

    setOpenBroadcastMenu((current) => {
      if (current?.id === broadcastId) return null;

      return {
        id: broadcastId,
        placement,
      };
    });
  }


  async function openCampaignReport(broadcast) {
    if (!broadcast?.id) return;

    setOpenBroadcastMenu(null);
    setLoadingReportId(broadcast.id);

    try {
      const result = await getWhatsAppBroadcastReport(broadcast.id, { limit: 250 });
      setCampaignReport({
        broadcast: result.broadcast || broadcast,
        report: result.report || null,
      });
    } catch (err) {
      toast.error(safeError(err, "Campaign report failed"));
    } finally {
      setLoadingReportId("");
    }
  }

  function closeCampaignReport() {
    setCampaignReport(null);
  }

  function currentTargeting() {
    return {
      mode: targetMode,
      branchId: null,
      category: targetMode === "CATEGORY_CUSTOMERS" ? registeredBusinessCategory : null,
      productId:
        targetMode === "PRODUCT_BUYERS" ? selectedPromotion?.productId || null : null,
      customerIds: [],
    };
  }

  function currentPreviewKey() {
    const targeting = currentTargeting();
    return JSON.stringify({
      promotionId: promotionId || "",
      mode: targeting.mode,
      category: targeting.category || "",
      productId: targeting.productId || "",
    });
  }

  function hasValidRecipientPreview() {
    return (
      lastPreviewKey === currentPreviewKey() &&
      previewRecipientCount(recipientPreview) > 0 &&
      recipientPreview?.canSend !== false
    );
  }

  function resetRecipientPreview() {
    setRecipientPreview(null);
    setLastPreviewKey("");
  }

  async function previewRecipientsForBroadcast() {
    if (!promotionId) {
      toast.error("Choose a promotion first");
      return;
    }

    if (targetMode === "PRODUCT_BUYERS" && !selectedPromotion?.productId) {
      toast.error("Product buyers needs a promotion connected to a product");
      return;
    }

    setPreviewingRecipients(true);

    try {
      const result = await previewWhatsAppBroadcastRecipients({
        promotionId,
        limit: 20,
        targeting: currentTargeting(),
      });

      const preview = result?.preview || null;
      setRecipientPreview(preview);
      setLastPreviewKey(currentPreviewKey());

      const count = previewRecipientCount(preview);
      if (count > 0 && preview?.canSend !== false) {
        toast.success(`${count} recipient${count === 1 ? "" : "s"} found`);
      } else {
        toast.error(preview?.warning || "No matching WhatsApp recipients found");
      }
    } catch (err) {
      toast.error(safeError(err, "Recipient preview failed"));
      setRecipientPreview(null);
      setLastPreviewKey("");
    } finally {
      setPreviewingRecipients(false);
    }
  }

  async function savePromotion(event) {
    event.preventDefault();

    if (!promotionTitle.trim()) return toast.error("Promotion title is required");
    if (!promotionMessage.trim()) return toast.error("Customer message is required");

    setSavingPromotion(true);

    try {
      await createWhatsAppPromotion({
        title: promotionTitle.trim(),
        message: promotionMessage.trim(),
        productId: null,
        category: registeredBusinessCategory,
      });

      toast.success("Promotion created");
      setPromotionTitle("");
      setPromotionMessage("");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Promotion could not be saved"));
    } finally {
      setSavingPromotion(false);
    }
  }

  async function saveBroadcast(event) {
    event.preventDefault();

    if (!promotionId) return toast.error("Choose a promotion first");

    if (!hasValidRecipientPreview()) {
      toast.error("Preview recipients before creating this broadcast");
      return;
    }

    setSavingBroadcast(true);

    try {
      const targeting = currentTargeting();
      const result = await createWhatsAppBroadcast({
        accountId: accounts[0]?.id || undefined,
        promotionId,
        templateName: DEFAULT_MESSAGE_FORMAT,
        languageCode: DEFAULT_MESSAGE_LANGUAGE,
        targeting,
      });

      if (result?.broadcast?.id) {
        rememberBroadcastPreview({
          broadcastId: result.broadcast.id,
          preview: recipientPreview,
          targeting,
          promotionId,
        });
        setBroadcastPreviewCacheVersion((value) => value + 1);
      }

      toast.success("Broadcast draft created");
      setPromotionId("");
      setTargetMode("ALL_OPTED_IN");
      resetRecipientPreview();
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Broadcast could not be created"));
    } finally {
      setSavingBroadcast(false);
    }
  }

  async function sendBroadcast(broadcast) {
    if (!broadcast?.id) return;

    const cachedPreview = cachedBroadcastPreview(broadcast.id);
    const count = broadcastRecipientCount(broadcast) || Number(cachedPreview?.recipientCount || 0);

    if (!canSendBroadcast(broadcast)) {
      toast.error("This broadcast has already been sent");
      return;
    }

    if (!count) {
      toast.error("Preview recipients before sending this broadcast");
      return;
    }

    setSendConfirmBroadcast({
      ...broadcast,
      recipientCount: count,
      targetingPreview: cachedPreview?.targeting || broadcast?.targetingPreview || { mode: "ALL_OPTED_IN" },
    });
  }

  async function confirmSendBroadcast() {
    const broadcast = sendConfirmBroadcast;
    if (!broadcast?.id) return;

    const count = broadcastRecipientCount(broadcast);

    setBusyBroadcastId(broadcast.id);

    try {
      const result = await sendWhatsAppBroadcastNow(broadcast.id, {
        limit: Math.max(50, count || 1),
        targeting: broadcast.targetingPreview || { mode: "ALL_OPTED_IN" },
      });

      const summary = result?.summary || {};

      if (Number(summary.failed || 0) > 0 || Number(summary.delivered || 0) === 0) {
        rememberBroadcastFailure({
          broadcastId: broadcast.id,
          summary,
          message: Number(summary.delivered || 0) > 0
            ? "Some WhatsApp messages need attention."
            : "WhatsApp could not deliver this broadcast.",
        });
      } else {
        clearBroadcastFailure(broadcast.id);
      }

      setSendConfirmBroadcast(null);
      toast.success(result.summary?.delivered ? "Broadcast sent" : "Broadcast checked");
      await onRefresh?.();
    } catch (err) {
      const message = safeError(err, "Broadcast could not be sent");
      rememberBroadcastFailure({
        broadcastId: broadcast.id,
        message,
      });
      toast.error(message);
    } finally {
      setBusyBroadcastId("");
    }
  }

  async function queueBroadcast(broadcast) {
    const id = broadcast?.id;
    const count = broadcastRecipientCount(broadcast) || Number(cachedBroadcastPreview(id)?.recipientCount || 0);

    if (!canQueueBroadcast(broadcast)) {
      toast("Broadcast is already queued or sent");
      return;
    }

    if (!count) {
      toast.error("Preview recipients before queueing this broadcast");
      return;
    }

    setBusyBroadcastId(id);

    try {
      await queueWhatsAppBroadcast(id);
      toast.success("Broadcast queued");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Broadcast could not be queued"));
    } finally {
      setBusyBroadcastId("");
    }
  }


  function requestDeletePromotion(promotion) {
    if (!promotion?.id) return;

    if (!canDeletePromotionRecord(promotion)) {
      toast("Promotion is already used in broadcasts, so it must stay in campaign history.");
      return;
    }

    setCleanupConfirmAction({
      type: "PROMOTION",
      id: promotion.id,
      title: "Delete promotion?",
      label: promotion.title || "Promotion",
      message: "This promotion has not been used in any broadcast. Deleting it removes the draft offer from the campaign library.",
      confirmLabel: "Delete promotion",
    });
  }

  function requestRemoveBroadcast(broadcast) {
    if (!broadcast?.id) return;

    if (!canRemoveBroadcastRecord(broadcast)) {
      toast("Sent broadcast history cannot be deleted.");
      return;
    }

    setCleanupConfirmAction({
      type: "BROADCAST",
      id: broadcast.id,
      title: cleanupBroadcastTitle(broadcast),
      label: broadcast?.promotion?.title || "Customer broadcast",
      message: cleanupBroadcastMessage(broadcast),
      confirmLabel: cleanupBroadcastActionLabel(broadcast),
    });
  }

  async function confirmCampaignCleanup() {
    const action = cleanupConfirmAction;
    if (!action?.id) return;

    setBusyBroadcastId(action.id);

    try {
      if (action.type === "PROMOTION") {
        await deleteWhatsAppPromotion(action.id);
        toast.success("Promotion deleted");
      } else {
        await deleteWhatsAppBroadcast(action.id);
        clearBroadcastFailure(action.id);
        const cache = readBroadcastPreviewCache();
        delete cache[action.id];
        writeBroadcastPreviewCache(cache);
        setBroadcastPreviewCacheVersion((value) => value + 1);
        toast.success(action.confirmLabel === "Cancel queue" ? "Queued broadcast cancelled" : "Broadcast removed");
      }

      setCleanupConfirmAction(null);
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Campaign record could not be removed"));
    } finally {
      setBusyBroadcastId("");
    }
  }

  const previewCount = previewRecipientCount(recipientPreview);
  const previewRows = previewRecipients(recipientPreview).slice(0, RECIPIENT_PREVIEW_VISIBLE_LIMIT);
  const previewReady = hasValidRecipientPreview();
  const sendConfirmCount = broadcastRecipientCount(sendConfirmBroadcast);
  const sendConfirmTitle = sendConfirmBroadcast?.promotion?.title || "Customer broadcast";

  return (
    <section className="svx-wa-page-panel">
      <div className="svx-wa-section-title">
        <p>Customer growth</p>
        <h2>Promotions and broadcasts</h2>
        <span>Create customer offers, choose an audience, and send from the store number.</span>
      </div>

      <div className="svx-wa-campaign-grid">
        <form onSubmit={savePromotion} className="svx-wa-form-card">
          <h3>Create promotion</h3>

          <label>
            <span>Promotion title</span>
            <input
              value={promotionTitle}
              onChange={(event) => setPromotionTitle(event.target.value)}
              placeholder="Weekend laptop offer"
            />
          </label>

          <label>
            <span>Business category</span>
            <input
              value={registeredBusinessCategoryLabel}
              readOnly
              disabled
              aria-label="Registered business category"
            />
          </label>

          <label>
            <span>Customer message</span>
            <textarea
              value={promotionMessage}
              onChange={(event) => setPromotionMessage(event.target.value)}
              placeholder="Write the customer message..."
              rows={5}
            />
          </label>

          <AsyncButton type="submit" loading={savingPromotion} loadingText="Saving...">
            Create promotion
          </AsyncButton>
        </form>

        <form onSubmit={saveBroadcast} className="svx-wa-form-card">
          <h3>Create broadcast</h3>

          <label>
            <span>Promotion</span>
            <select
              value={promotionId}
              onChange={(event) => {
                setPromotionId(event.target.value);
                resetRecipientPreview();
              }}
            >
              <option value="">Choose promotion</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.title}
                </option>
              ))}
            </select>
          </label>

          <div className="svx-wa-audience-list">
            {AUDIENCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTargetMode(option.value);
                  resetRecipientPreview();
                }}
                className={cx(targetMode === option.value && "is-active")}
              >
                <strong>{option.label}</strong>
                <span>{option.helper}</span>
              </button>
            ))}
          </div>

          {targetMode === "CATEGORY_CUSTOMERS" ? (
            <label>
              <span>Target category</span>
              <input
                value={registeredBusinessCategoryLabel}
                readOnly
                disabled
                aria-label="Registered business broadcast category"
              />
            </label>
          ) : null}

          <div className="svx-wa-recipient-preview-card">
            <div className="svx-wa-recipient-preview-head">
              <div>
                <strong>Recipient preview</strong>
                <span>
                  {recipientPreview
                    ? `${previewCount} matching customer${previewCount === 1 ? "" : "s"}`
                    : "Preview matching customers before creating a broadcast."}
                </span>
              </div>
              <AsyncButton
                type="button"
                loading={previewingRecipients}
                loadingText="Checking..."
                onClick={previewRecipientsForBroadcast}
                disabled={!promotionId || savingBroadcast}
                className="svx-wa-secondary-action"
              >
                Preview recipients
              </AsyncButton>
            </div>

            {recipientPreview ? (
              previewCount > 0 ? (
                <div className="svx-wa-recipient-preview-success">
                  <div className="svx-wa-recipient-preview-count">
                    <strong>{previewCount}</strong>
                    <span>
                      Recipient{previewCount === 1 ? "" : "s"} ready for this broadcast
                    </span>
                    <small>{recipientPreview.audienceLabel || "Selected WhatsApp audience"}</small>
                  </div>

                  {isLargeAudience(previewCount) ? (
                    <p className="svx-wa-recipient-preview-scale-note">
                      Showing the first {Math.min(previewRows.length || RECIPIENT_PREVIEW_VISIBLE_LIMIT, previewCount)} of {formatCompactNumber(previewCount)} recipients. Queue is recommended for large campaigns.
                    </p>
                  ) : null}

                  {previewRows.length ? (
                    <div className="svx-wa-recipient-preview-list">
                      {previewRows.map((recipient) => (
                        <span key={recipient.id || recipient.phone}>
                          <strong>{recipientName(recipient)}</strong>
                          <small>{recipientPhone(recipient)}</small>
                        </span>
                      ))}
                      {previewCount > previewRows.length ? (
                        <em>+{previewCount - previewRows.length} more customer{previewCount - previewRows.length === 1 ? "" : "s"}</em>
                      ) : null}
                    </div>
                  ) : (
                    <p className="svx-wa-recipient-preview-note">
                      {previewCount} matching recipient{previewCount === 1 ? "" : "s"} found. Customer names are hidden because this preview response did not include customer rows.
                    </p>
                  )}
                </div>
              ) : (
                <p className="svx-wa-recipient-preview-warning">
                  {recipientPreview.warning || "No matching customers found for this audience."}
                </p>
              )
            ) : null}
          </div>

          <AsyncButton
            type="submit"
            loading={savingBroadcast}
            loadingText="Creating..."
            disabled={!previewReady || previewingRecipients}
          >
            Create broadcast
          </AsyncButton>
        </form>

        <section className="svx-wa-campaign-records-shell">
          <div className="svx-wa-records-head">
            <div>
              <p>Campaign records</p>
              <h3>Campaign library</h3>
              <span>Search, review, queue, retry, and send customer campaigns without turning the page into a wall of cards.</span>
            </div>

            <div className="svx-wa-records-summary" aria-label="Campaign record totals">
              <span>
                <small>Promotions</small>
                <strong>{formatCompactNumber(promotions.length)}</strong>
              </span>
              <span>
                <small>Broadcasts</small>
                <strong>{formatCompactNumber(visibleBroadcasts.length)}</strong>
              </span>
            </div>
          </div>

          <div className="svx-wa-records-grid">
            <section className="svx-wa-record-column">
              <div className="svx-wa-record-column-head">
                <div>
                  <h4>Promotions</h4>
                  <span>Showing {Math.min(filteredPromotions.length, promotionLimit)} of {formatCompactNumber(filteredPromotions.length)}</span>
                </div>
                <Badge tone="neutral">{formatCompactNumber(promotions.length)}</Badge>
              </div>

              <div className="svx-wa-list-toolbar">
                <input
                  value={promotionSearch}
                  onChange={(event) => setPromotionSearch(event.target.value)}
                  placeholder="Search promotions..."
                />
              </div>

              <div className="svx-wa-record-table" role="list" aria-label="Promotions">
                {filteredPromotions.slice(0, promotionLimit).map((promotion) => (
                  <article key={promotion.id} className="svx-wa-promotion-row" role="listitem">
                    <div className="svx-wa-record-status-cell">
                      <Badge tone={promotion.sentAt ? "success" : "warning"}>
                        {promotion.sentAt ? "Sent" : "Draft"}
                      </Badge>
                    </div>

                    <div className="svx-wa-record-main-cell">
                      <strong>{promotion.title}</strong>
                      <span>{promotion.message || "No message"}</span>
                    </div>

                    <div className="svx-wa-record-number-cell">
                      <small>Broadcasts</small>
                      <strong>{formatCompactNumber(promotionBroadcastCount(promotion))}</strong>
                    </div>

                    <div className="svx-wa-record-cleanup-cell">
                      <button
                        type="button"
                        onClick={() => requestDeletePromotion(promotion)}
                        disabled={!canDeletePromotionRecord(promotion) || busyBroadcastId === promotion.id}
                        title={
                          canDeletePromotionRecord(promotion)
                            ? "Delete this unused promotion"
                            : "Used promotions stay in campaign history"
                        }
                      >
                        {canDeletePromotionRecord(promotion) ? "Delete" : "Used"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {filteredPromotions.length === 0 ? (
                <div className="svx-wa-list-empty">No promotions match this search.</div>
              ) : null}

              {filteredPromotions.length > promotionLimit ? (
                <button
                  type="button"
                  className="svx-wa-secondary-action svx-wa-load-more-action"
                  onClick={() => setPromotionLimit((value) => value + PROMOTION_LIST_LIMIT)}
                >
                  Load more promotions
                </button>
              ) : null}
            </section>

            <section className="svx-wa-record-column is-broadcasts">
              <div className="svx-wa-record-column-head">
                <div>
                  <h4>Broadcasts</h4>
                  <span>Showing {Math.min(filteredBroadcasts.length, broadcastLimit)} of {formatCompactNumber(filteredBroadcasts.length)}</span>
                </div>
                <Badge tone="neutral">{formatCompactNumber(visibleBroadcasts.length)}</Badge>
              </div>

              <div className="svx-wa-list-toolbar svx-wa-broadcast-toolbar">
                <input
                  value={broadcastSearch}
                  onChange={(event) => setBroadcastSearch(event.target.value)}
                  placeholder="Search broadcasts..."
                />
                <select
                  value={broadcastStatusFilter}
                  onChange={(event) => setBroadcastStatusFilter(event.target.value)}
                  aria-label="Filter broadcasts by status"
                >
                  <option value="ALL">All statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="QUEUED">Queued</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Needs attention</option>
                </select>
              </div>

              <div className="svx-wa-record-table is-broadcast-table" role="list" aria-label="Broadcasts">
                {filteredBroadcasts.slice(0, broadcastLimit).map((broadcast) => {
                  const recipientCount = broadcastRecipientCount(broadcast);
                  const failureDetails = broadcastFailureDetails(broadcast);
                  const hasAudience = canActOnBroadcastAudience(broadcast);
                  const forceQueue = shouldForceQueue(recipientCount);
                  const queueDisabled = busyBroadcastId === broadcast.id || !canQueueBroadcast(broadcast) || !hasAudience;
                  const sendDisabled = busyBroadcastId === broadcast.id || !canSendBroadcast(broadcast) || !hasAudience || forceQueue;

                  return (
                    <article
                      key={broadcast.id}
                      className={cx("svx-wa-broadcast-row", openBroadcastMenu?.id === broadcast.id && "is-menu-open")}
                      role="listitem"
                    >
                      <div className="svx-wa-record-status-cell">
                        <Badge tone={toneForStatus(broadcast.status)}>
                          {statusLabel(broadcast.status)}
                        </Badge>
                      </div>

                      <div className="svx-wa-record-main-cell">
                        <strong>{broadcast.promotion?.title || "Customer broadcast"}</strong>
                        <span>{broadcast.promotion?.message || "No promotion message attached"}</span>

                        {!hasAudience ? (
                          <em className="svx-wa-row-warning">Preview recipients first — this draft cannot be queued or sent safely.</em>
                        ) : null}

                        {hasAudience && isLargeAudience(recipientCount) ? (
                          <em className="svx-wa-row-scale-note">
                            {forceQueue ? "Queue required" : "Queue recommended"} for {formatCompactNumber(recipientCount)} recipients.
                          </em>
                        ) : null}

                        {failureDetails ? (
                          <em className="svx-wa-row-issue-chip">Issue needs review</em>
                        ) : null}
                      </div>

                      <div className="svx-wa-record-metrics-cell" aria-label="Broadcast performance">
                        <span><strong>{formatCompactNumber(recipientCount)}</strong> customers</span>
                        <span><strong>{formatCompactNumber(broadcast.sentCount || failureDetails?.sent || broadcast.deliveredCount || 0)}</strong> sent</span>
                        <span><strong>{formatCompactNumber(broadcast.deliveredCount || failureDetails?.delivered || 0)}</strong> delivered</span>
                        <span><strong>{formatCompactNumber(broadcast.readCount || failureDetails?.read || 0)}</strong> read</span>
                        <span><strong>{formatCompactNumber(broadcast.failedCount || failureDetails?.failed || 0)}</strong> failed</span>
                      </div>

                      <div className="svx-wa-record-actions-cell">
                        {(() => {
                          const primaryAction = primaryBroadcastAction({ broadcast, recipientCount });
                          const primaryDisabled =
                            busyBroadcastId === broadcast.id || primaryAction.disabled;

                          return (
                            <AsyncButton
                              onClick={() => {
                                if (primaryAction.kind === "QUEUE") {
                                  queueBroadcast(broadcast);
                                  return;
                                }

                                if (primaryAction.kind === "SEND") {
                                  sendBroadcast(broadcast);
                                }
                              }}
                              loading={busyBroadcastId === broadcast.id}
                              loadingText={primaryAction.kind === "QUEUE" ? "Queueing..." : "Sending..."}
                              disabled={primaryDisabled}
                              title={primaryAction.title}
                              className="svx-wa-record-primary-action"
                            >
                              {primaryAction.label}
                            </AsyncButton>
                          );
                        })()}

                        <div
                          className={cx(
                            "svx-wa-record-more-menu",
                            openBroadcastMenu?.id === broadcast.id && "is-open",
                            openBroadcastMenu?.id === broadcast.id && openBroadcastMenu?.placement === "up" && "is-up"
                          )}
                        >
                          <button
                            type="button"
                            className="svx-wa-record-more-trigger"
                            aria-label="Open campaign actions"
                            aria-expanded={openBroadcastMenu?.id === broadcast.id}
                            onClick={(event) => toggleBroadcastRowMenu(broadcast.id, event)}
                          >
                            <span aria-hidden="true">•••</span>
                          </button>

                          {openBroadcastMenu?.id === broadcast.id ? (
                            <div
                              className="svx-wa-record-more-panel"
                              role="menu"
                            >
                              {secondaryQueueAvailable({ broadcast, recipientCount }) ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenBroadcastMenu(null);
                                    queueBroadcast(broadcast);
                                  }}
                                  disabled={busyBroadcastId === broadcast.id}
                                >
                                  Queue for later
                                </button>
                              ) : null}

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openCampaignReport(broadcast)}
                                disabled={loadingReportId === broadcast.id}
                              >
                                {loadingReportId === broadcast.id ? "Opening report..." : "View performance report"}
                              </button>

                              {failureDetails ? (
                                <div className="svx-wa-record-more-issue">
                                  <strong>Issue</strong>
                                  <span>{failureDetails.message}</span>
                                  <small>
                                    Attempted {formatCompactNumber(failureDetails.attempted || recipientCount || 0)} · Failed {formatCompactNumber(failureDetails.failed || 0)}
                                  </small>
                                </div>
                              ) : null}

                              {canRemoveBroadcastRecord(broadcast) ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="is-danger"
                                  onClick={() => {
                                    setOpenBroadcastMenu(null);
                                    requestRemoveBroadcast(broadcast);
                                  }}
                                  disabled={busyBroadcastId === broadcast.id}
                                  title={cleanupBroadcastMessage(broadcast)}
                                >
                                  {cleanupBroadcastActionLabel(broadcast)}
                                </button>
                              ) : (
                                <span className="svx-wa-record-more-note">
                                  Sent campaign history is protected.
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredBroadcasts.length === 0 ? (
                <div className="svx-wa-list-empty">No broadcasts match this view.</div>
              ) : null}

              {filteredBroadcasts.length > broadcastLimit ? (
                <button
                  type="button"
                  className="svx-wa-secondary-action svx-wa-load-more-action"
                  onClick={() => setBroadcastLimit((value) => value + BROADCAST_LIST_LIMIT)}
                >
                  Load more broadcasts
                </button>
              ) : null}
            </section>
          </div>
        </section>
      </div>




      {campaignReport ? (
        <div className="svx-wa-report-backdrop" role="presentation">
          <section
            className="svx-wa-campaign-report-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-campaign-report-title"
          >
            <div className="svx-wa-report-head">
              <div>
                <Badge tone={toneForStatus(campaignReport.broadcast?.status)}>Campaign report</Badge>
                <h3 id="wa-campaign-report-title">
                  {campaignReport.broadcast?.promotion?.title || "Customer broadcast"}
                </h3>
                <p>{campaignReport.broadcast?.promotion?.message || "Performance report for this WhatsApp campaign."}</p>
              </div>
              <button type="button" onClick={closeCampaignReport}>Close</button>
            </div>

            <div className="svx-wa-report-body">
              <div className="svx-wa-report-score-grid">
                <article>
                  <span>Audience</span>
                  <strong>{formatCompactNumber(campaignReport.report?.summary?.attemptedCount || 0)}</strong>
                  <small>Recipients logged</small>
                </article>
                <article>
                  <span>Delivered</span>
                  <strong>{percentLabel(campaignReport.report?.summary?.deliveryRate || 0)}</strong>
                  <small>{formatCompactNumber(campaignReport.report?.summary?.deliveredCount || 0)} customers</small>
                </article>
                <article>
                  <span>Read</span>
                  <strong>{percentLabel(campaignReport.report?.summary?.readRate || 0)}</strong>
                  <small>{formatCompactNumber(campaignReport.report?.summary?.readCount || 0)} customers</small>
                </article>
                <article className={campaignReport.report?.summary?.failedCount ? "is-danger" : ""}>
                  <span>Failed</span>
                  <strong>{formatCompactNumber(campaignReport.report?.summary?.failedCount || 0)}</strong>
                  <small>{percentLabel(campaignReport.report?.summary?.failureRate || 0)} failure rate</small>
                </article>
              </div>

              <div className="svx-wa-report-breakdown">
                <span><strong>{formatCompactNumber(campaignReport.report?.summary?.sentCount || 0)}</strong> sent</span>
                <span><strong>{formatCompactNumber(campaignReport.report?.summary?.pendingCount || 0)}</strong> pending</span>
                <span><strong>{formatCompactNumber(campaignReport.report?.summary?.deliveredCount || 0)}</strong> delivered</span>
                <span><strong>{formatCompactNumber(campaignReport.report?.summary?.readCount || 0)}</strong> read</span>
              </div>

              {campaignReport.report?.insights?.length ? (
                <div className="svx-wa-report-insights">
                  {campaignReport.report.insights.map((insight, index) => (
                    <article key={`${insight.title}-${index}`} className={`is-${reportInsightTone(insight.tone)}`}>
                      <strong>{insight.title}</strong>
                      <span>{insight.message}</span>
                    </article>
                  ))}
                </div>
              ) : null}

              {campaignReport.report?.summary?.latestFailureReason ? (
                <div className="svx-wa-report-latest-issue">
                  <strong>Latest failure reason</strong>
                  <span>{campaignReport.report.summary.latestFailureReason}</span>
                </div>
              ) : null}

              <div className="svx-wa-report-section-head">
                <div>
                  <strong>Recipient status</strong>
                  <span>
                    Showing {formatCompactNumber(campaignReport.report?.recipients?.length || 0)} recipient{campaignReport.report?.recipients?.length === 1 ? "" : "s"}
                  </span>
                </div>
                {campaignReport.report?.needsAttention?.length ? (
                  <Badge tone="danger">{formatCompactNumber(campaignReport.report.needsAttention.length)} need attention</Badge>
                ) : (
                  <Badge tone="success">No failures</Badge>
                )}
              </div>

              <div className="svx-wa-report-recipient-list">
                {(campaignReport.report?.recipients || []).slice(0, 80).map((recipient) => (
                  <article key={recipient.id || recipient.messageId || recipient.phone}>
                    <div>
                      <strong>{recipientDisplayName(recipient)}</strong>
                      <span>{recipient.phone || "No phone"}</span>
                      {recipient.failureReason ? <em>{recipient.failureReason}</em> : null}
                    </div>
                    <div>
                      <Badge tone={reportStatusTone(recipient.status)}>{statusLabel(recipient.status)}</Badge>
                      <small>{reportTime(recipientStatusTime(recipient))}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {cleanupConfirmAction ? (
        <div className="svx-wa-modal-backdrop" role="presentation">
          <section
            className="svx-wa-send-confirm-modal svx-wa-cleanup-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-cleanup-confirm-title"
          >
            <div className="svx-wa-send-confirm-head">
              <Badge tone="warning">Clean up</Badge>
              <h3 id="wa-cleanup-confirm-title">{cleanupConfirmAction.title}</h3>
              <p>
                <strong>{cleanupConfirmAction.label}</strong> — {cleanupConfirmAction.message}
              </p>
            </div>

            <div className="svx-wa-send-confirm-actions">
              <button
                type="button"
                onClick={() => setCleanupConfirmAction(null)}
                disabled={Boolean(busyBroadcastId)}
              >
                Keep record
              </button>
              <AsyncButton
                type="button"
                onClick={confirmCampaignCleanup}
                loading={busyBroadcastId === cleanupConfirmAction.id}
                loadingText="Working..."
              >
                {cleanupConfirmAction.confirmLabel}
              </AsyncButton>
            </div>
          </section>
        </div>
      ) : null}

      {sendConfirmBroadcast ? (
        <div className="svx-wa-modal-backdrop" role="presentation">
          <section
            className="svx-wa-send-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-send-confirm-title"
          >
            <div className="svx-wa-send-confirm-head">
              <Badge tone="warning">Send now</Badge>
              <h3 id="wa-send-confirm-title">Send broadcast now?</h3>
              <p>
                This will immediately send <strong>{sendConfirmTitle}</strong> to
                <strong> {sendConfirmCount}</strong> WhatsApp customer
                {sendConfirmCount === 1 ? "" : "s"}. Messages will be logged in customer conversations and this action cannot be undone.
              </p>
            </div>

            <div className="svx-wa-send-confirm-summary">
              <span>
                <small>Recipients</small>
                <strong>{sendConfirmCount}</strong>
              </span>
              <span>
                <small>Status after send</small>
                <strong>Sent or needs attention</strong>
              </span>
            </div>

            {isLargeAudience(sendConfirmCount) ? (
              <div className="svx-wa-send-confirm-warning">
                <strong>{shouldForceQueue(sendConfirmCount) ? "Queue required for this audience" : "Queue recommended"}</strong>
                <span>Large campaigns are safer when queued instead of sent instantly.</span>
              </div>
            ) : null}

            <div className="svx-wa-send-confirm-actions">
              <button
                type="button"
                onClick={() => setSendConfirmBroadcast(null)}
                disabled={Boolean(busyBroadcastId)}
              >
                Not now
              </button>
              <AsyncButton
                type="button"
                onClick={confirmSendBroadcast}
                loading={busyBroadcastId === sendConfirmBroadcast.id}
                loadingText="Sending..."
              >
                Send now
              </AsyncButton>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

