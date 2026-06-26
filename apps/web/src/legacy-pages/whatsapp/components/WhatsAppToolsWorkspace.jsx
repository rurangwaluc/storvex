import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../../components/ui/AsyncButton";
import { searchProducts } from "../../../services/inventoryApi";
import {
  assignWhatsAppConversationOwner,
  clearWhatsAppConversationOwner,
  createWhatsAppAccount,
  createWhatsAppSaleDraft,
  setWhatsAppAccountActive,
  updateWhatsAppAccount,
} from "../../../services/whatsappApi";
import { cleanText, customerName, cx, formatDay, latestPreview, money, normalizeProductList, safeError, statusLabel, toneForStatus } from "../lib/whatsappInbox.utils";
import { Badge, EmptyState, MetricCard, SettingsIcon } from "./WhatsAppInboxPanels";

export function SetupWorkspace({ accounts, onRefresh }) {
  const account = accounts[0] || null;

  const [businessName, setBusinessName] = useState(account?.businessName || "");
  const [phoneNumber, setPhoneNumber] = useState(account?.phoneNumber || "");
  const [phoneNumberId, setPhoneNumberId] = useState(account?.phoneNumberId || "");
  const [wabaId, setWabaId] = useState(account?.wabaId || "");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const hasPhone = Boolean(phoneNumber.trim() || account?.phoneNumber);
  const hasPhoneNumberId = Boolean(phoneNumberId.trim() || account?.phoneNumberId);
  const hasWabaId = Boolean(wabaId.trim() || account?.wabaId);
  const hasToken = Boolean(accessToken.trim() || account?.hasAccessToken);
  const hasSavedAccount = Boolean(account?.id);
  const isConnected = hasSavedAccount && hasPhone && hasPhoneNumberId && hasWabaId && hasToken;
  const isLive = isConnected && Boolean(account?.isActive);

  const checklist = [
    {
      id: "business",
      label: "Business profile",
      text: hasPhone ? "Store number is saved for customers." : "Add the store WhatsApp number customers will use.",
      done: hasPhone,
    },
    {
      id: "meta",
      label: "Meta IDs",
      text:
        hasPhoneNumberId && hasWabaId
          ? "Phone number ID and WABA ID are ready."
          : "Add the Meta phone number ID and WhatsApp Business Account ID.",
      done: hasPhoneNumberId && hasWabaId,
    },
    {
      id: "token",
      label: "Access token",
      text: hasToken ? "Sending token is saved." : "Add the access token before sending messages.",
      done: hasToken,
    },
    {
      id: "active",
      label: "Account status",
      text: account?.isActive ? "Customer messaging is active." : "Activate only when credentials are correct.",
      done: Boolean(account?.isActive),
    },
  ];

  const completedSteps = checklist.filter((item) => item.done).length;
  const healthTone = isLive ? "success" : isConnected ? "warning" : hasSavedAccount ? "neutral" : "danger";
  const healthLabel = isLive ? "Connected" : isConnected ? "Ready to activate" : hasSavedAccount ? "Needs setup" : "Not connected";

  useEffect(() => {
    setBusinessName(account?.businessName || "");
    setPhoneNumber(account?.phoneNumber || "");
    setPhoneNumberId(account?.phoneNumberId || "");
    setWabaId(account?.wabaId || "");
    setAccessToken("");
  }, [account?.id]);

  async function save(event) {
    event.preventDefault();

    if (!phoneNumber.trim()) return toast.error("Store WhatsApp number is required");

    setSaving(true);

    try {
      const payload = {
        businessName: businessName.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneNumberId: phoneNumberId.trim() || null,
        wabaId: wabaId.trim() || null,
        ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
      };

      if (account?.id) await updateWhatsAppAccount(account.id, payload);
      else await createWhatsAppAccount(payload);

      toast.success("WhatsApp connection saved");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "WhatsApp connection failed"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!account?.id) return;

    setToggling(true);

    try {
      await setWhatsAppAccountActive(account.id, !account.isActive);
      toast.success(account.isActive ? "WhatsApp paused" : "WhatsApp activated");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Status update failed"));
    } finally {
      setToggling(false);
    }
  }

  return (
    <section className="svx-wa-page-panel svx-wa-setup-workspace">
      <div className="svx-wa-section-title">
        <p>Connection</p>
        <h2>WhatsApp account setup</h2>
        <span>
          Connect the store WhatsApp number safely. Customers only see the business number; staff
          manage conversations, draft sales, follow-ups and campaign reports inside Storvex.
        </span>
      </div>

      <div className="svx-wa-account-hero">
        <div className="svx-wa-account-hero-main">
          <Badge tone={healthTone}>{healthLabel}</Badge>
          <h3>{account?.businessName || businessName || "No WhatsApp account connected"}</h3>
          <p>
            {isLive
              ? "This workspace is ready to receive customer messages and send approved broadcasts."
              : isConnected
                ? "Credentials are saved. Activate the account when you are ready to send and receive customer messages."
                : "Finish the checklist below before turning on customer messaging."}
          </p>
        </div>

        <div className="svx-wa-account-hero-side">
          <span>Setup progress</span>
          <strong>{completedSteps}/4</strong>
          <small>{phoneNumber || "Store number not added"}</small>
        </div>
      </div>

      <div className="svx-wa-account-health-grid">
        <MetricCard label="Connection" value={healthLabel} note={isLive ? "Live for customers" : "Review setup"} tone={healthTone} />
        <MetricCard label="Store number" value={hasPhone ? "Saved" : "Missing"} note={phoneNumber || account?.phoneNumber || "Required"} tone={hasPhone ? "success" : "warning"} />
        <MetricCard label="Meta setup" value={hasPhoneNumberId && hasWabaId ? "Ready" : "Incomplete"} note="Phone ID + WABA ID" tone={hasPhoneNumberId && hasWabaId ? "success" : "warning"} />
        <MetricCard label="Token" value={hasToken ? "Saved" : "Missing"} note={account?.hasAccessToken ? "Stored securely" : "Required for sending"} tone={hasToken ? "success" : "warning"} />
      </div>

      <div className="svx-wa-setup-layout">
        <div className="svx-wa-setup-checklist">
          <div className="svx-wa-setup-card-title">
            <span>Owner checklist</span>
            <strong>Ready before sending</strong>
          </div>

          {checklist.map((item) => (
            <div key={item.id} className={cx("svx-wa-setup-step", item.done && "is-done")}>
              <span className="svx-wa-setup-step-mark">{item.done ? "✓" : ""}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={save} className="svx-wa-setup-form">
          <div className="svx-wa-setup-head">
            <div>
              <Badge tone={account?.isActive ? "success" : "neutral"}>
                {account?.isActive ? "Active" : "Paused"}
              </Badge>
              <h3>Connection details</h3>
              <p>Use the official Meta WhatsApp Business details for this store.</p>
            </div>

            {account?.id ? (
              <AsyncButton
                type="button"
                onClick={toggleActive}
                loading={toggling}
                loadingText="Updating..."
                variant="secondary"
              >
                {account.isActive ? "Pause" : "Activate"}
              </AsyncButton>
            ) : null}
          </div>

          <div className="svx-wa-form-grid">
            <label>
              <span>Business name</span>
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Business name shown to customers"
              />
            </label>

            <label>
              <span>Store WhatsApp number</span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="2507XXXXXXXX"
              />
            </label>

            <label>
              <span>Meta phone number ID</span>
              <input
                value={phoneNumberId}
                onChange={(event) => setPhoneNumberId(event.target.value)}
                placeholder="Phone number ID from Meta"
              />
            </label>

            <label>
              <span>WhatsApp Business Account ID</span>
              <input
                value={wabaId}
                onChange={(event) => setWabaId(event.target.value)}
                placeholder="WABA ID from Meta"
              />
            </label>

            <label className="is-wide">
              <span>Access token</span>
              <input
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder={
                  account?.hasAccessToken
                    ? "Already saved. Enter only if replacing."
                    : "Paste WhatsApp access token"
                }
              />
              <small>
                Storvex does not show saved tokens again. Paste a new token only when replacing the
                current one.
              </small>
            </label>
          </div>

          <div className="svx-wa-setup-actions">
            <AsyncButton type="submit" loading={saving} loadingText="Saving...">
              Save connection
            </AsyncButton>
            <p>
              Keep the account paused until the number, Meta IDs and token have been checked. This
              prevents customers from hitting an unfinished setup.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

export function ActivityWorkspace({ conversations, drafts, broadcasts }) {
  const rows = [
    ...conversations.slice(0, 6).map((item) => ({
      id: `conversation-${item.id}`,
      title: customerName(item),
      text: latestPreview(item),
      status: statusLabel(item.status),
      time: item.updatedAt || item.createdAt,
    })),
    ...drafts.slice(0, 4).map((item) => ({
      id: `draft-${item.id}`,
      title: "Draft sale",
      text: `${money(item.total)} · ${item.items?.length || 0} item(s)`,
      status: "Draft",
      time: item.updatedAt || item.createdAt,
    })),
    ...broadcasts.slice(0, 4).map((item) => ({
      id: `broadcast-${item.id}`,
      title: item.promotion?.title || "Broadcast",
      text: `${Number(item.recipientCount || 0)} customer(s) targeted`,
      status: statusLabel(item.status),
      time: item.updatedAt || item.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 12);

  return (
    <section className="svx-wa-page-panel">
      <div className="svx-wa-section-title">
        <p>Activity</p>
        <h2>WhatsApp workspace history</h2>
        <span>Recent customer messages, draft sales and campaign updates.</span>
      </div>

      {rows.length ? (
        <div className="svx-wa-activity-list">
          {rows.map((row) => (
            <article key={row.id} className="svx-wa-activity-row">
              <span className="svx-wa-activity-dot" />
              <div>
                <strong>{row.title}</strong>
                <p>{row.text}</p>
              </div>
              <Badge tone={toneForStatus(row.status)}>{row.status}</Badge>
              <small>{formatDay(row.time)}</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No WhatsApp activity yet"
          body="Activity will appear after customer conversations, draft sales, and broadcasts."
        />
      )}
    </section>
  );
}

export function CreateDraftModal({ open, conversation, onClose, onCreated }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [saleType, setSaleType] = useState("CREDIT");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setProducts([]);
      setItems([]);
      setSaleType("CREDIT");
      setAmountPaid("");
      setDueDate("");
    }
  }, [open]);

  if (!open) return null;

  async function runSearch(event) {
    event?.preventDefault?.();

    const clean = query.trim();
    if (!clean) return toast.error("Search product first");

    setSearching(true);

    try {
      const data = await searchProducts({ q: clean, limit: 12 });
      setProducts(normalizeProductList(data));
    } catch (err) {
      toast.error(safeError(err, "Product search failed"));
    } finally {
      setSearching(false);
    }
  }

  function addProduct(product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.sellPrice,
          stockQty: product.stockQty,
        },
      ];
    });
  }

  function updateQty(productId, nextQty) {
    const quantity = Math.max(1, Number(nextQty || 1));

    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  async function submit() {
    if (!conversation?.id) return;
    if (!items.length) return toast.error("Add at least one product");

    setSaving(true);

    try {
      const payload = {
        branchId: conversation.branchId || undefined,
        customerId: conversation.customerId || undefined,
        customer: conversation.customer
          ? undefined
          : { name: conversation.phone, phone: conversation.phone },
        saleType,
        dueDate: saleType === "CREDIT" && dueDate ? dueDate : null,
        amountPaid: Number(amountPaid || 0),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const result = await createWhatsAppSaleDraft(conversation.id, payload);

      toast.success("WhatsApp draft sale created");
      onCreated?.(result.draft);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Could not create draft sale"));
    } finally {
      setSaving(false);
    }
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  return (
    <div className="svx-wa-modal-backdrop">
      <div className="svx-wa-modal is-wide">
        <header className="svx-wa-modal-head">
          <div>
            <p>WhatsApp sale draft</p>
            <h2>Prepare customer order</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="svx-wa-modal-grid">
          <section>
            <form onSubmit={runSearch} className="svx-wa-search-form">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search product, SKU, model, barcode..."
              />
              <AsyncButton type="submit" loading={searching} loadingText="Searching...">
                Search
              </AsyncButton>
            </form>

            <div className="svx-wa-product-grid">
              {products.map((product) => (
                <button key={product.id} type="button" onClick={() => addProduct(product)}>
                  <strong>{product.name}</strong>
                  <span>Stock {product.stockQty}</span>
                  <small>{money(product.sellPrice)}</small>
                </button>
              ))}
            </div>
          </section>

          <aside className="svx-wa-draft-builder">
            <h3>Draft summary</h3>

            <div className="svx-wa-draft-items">
              {items.length ? (
                items.map((item) => (
                  <article key={item.productId}>
                    <div>
                      <strong>{item.name}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((entry) => entry.productId !== item.productId)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <label>
                      Qty
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateQty(item.productId, event.target.value)}
                      />
                    </label>
                  </article>
                ))
              ) : (
                <p>No product added yet.</p>
              )}
            </div>

            <div className="svx-wa-sale-type-grid">
              {["CREDIT", "CASH"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSaleType(type)}
                  className={cx(saleType === type && "is-active")}
                >
                  {statusLabel(type)}
                </button>
              ))}
            </div>

            {saleType === "CREDIT" ? (
              <div className="svx-wa-form-grid is-one">
                <label>
                  <span>Deposit paid now</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(event.target.value)}
                    placeholder="Deposit paid now"
                  />
                </label>

                <label>
                  <span>Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <div className="svx-wa-total-box">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>

            <AsyncButton onClick={submit} loading={saving} loadingText="Creating...">
              Create draft sale
            </AsyncButton>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function AssignModal({ open, staff, conversation, onClose, onAssigned }) {
  const [savingId, setSavingId] = useState("");

  if (!open) return null;

  async function assign(staffId) {
    if (!conversation?.id) return;

    setSavingId(staffId);

    try {
      const result = await assignWhatsAppConversationOwner(conversation.id, { assignedToId: staffId });
      toast.success("Conversation assigned");
      onAssigned?.(result.conversation);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Assignment failed"));
    } finally {
      setSavingId("");
    }
  }

  async function clear() {
    if (!conversation?.id) return;

    setSavingId("clear");

    try {
      const result = await clearWhatsAppConversationOwner(conversation.id);
      toast.success("Assignment cleared");
      onAssigned?.(result.conversation);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Could not clear assignment"));
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="svx-wa-modal-backdrop">
      <div className="svx-wa-modal">
        <header className="svx-wa-modal-head">
          <div>
            <p>Assign conversation</p>
            <h2>Choose responsible staff</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="svx-wa-staff-list">
          {staff.length ? (
            staff.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => assign(person.id)}
                disabled={Boolean(savingId)}
              >
                <span>
                  <strong>{person.name || person.email}</strong>
                  <small>{person.role}</small>
                </span>
                <em>{savingId === person.id ? "Assigning..." : "Assign"}</em>
              </button>
            ))
          ) : (
            <EmptyState
              title="No assignable staff"
              body="No staff members are available for WhatsApp assignment."
            />
          )}
        </div>

        <AsyncButton
          onClick={clear}
          loading={savingId === "clear"}
          loadingText="Clearing..."
          variant="secondary"
        >
          Clear assignment
        </AsyncButton>
      </div>
    </div>
  );
}

