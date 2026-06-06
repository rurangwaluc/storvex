import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import PublicLayout from "../../components/layout/PublicLayout";
import { apiFetch } from "../../services/apiClient";
import { getOrCreateDeviceId } from "../../utils/deviceId";
import AsyncButton from "../../components/ui/AsyncButton";

const SHOP_TYPE_OPTIONS = [
  { value: "ELECTRONICS_RETAIL", label: "Electronics store" },
  { value: "PHONE_SHOP", label: "Phone shop" },
  { value: "LAPTOP_SHOP", label: "Laptop shop" },
  { value: "ACCESSORIES_SHOP", label: "Accessories shop" },
  { value: "REPAIR_SHOP", label: "Repair and service shop" },
  { value: "MIXED_ELECTRONICS", label: "Mixed electronics shop" },
];

const TRUST_POINTS = [
  "Owner account",
  "Store profile",
  "First branch",
  "Trial or paid activation",
];

function cleanString(value) {
  return String(value || "").trim();
}

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function normalizePhone(value) {
  const digits = String(value || "").trim().replace(/[^\d]/g, "");

  if (!digits) return "";
  if (digits.startsWith("07") && digits.length === 10) return `250${digits.slice(1)}`;
  if (digits.startsWith("2507") && digits.length === 12) return digits;

  return digits;
}

function displayPhone(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");

  if (digits.startsWith("2507") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }

  return value || "";
}

function isValidRwandaPhone(value) {
  return /^2507\d{8}$/.test(normalizePhone(value));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function readPreviousOnboarding() {
  try {
    const raw = localStorage.getItem("storvex_onboarding");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveOnboardingState(next) {
  localStorage.setItem("storvex_onboarding", JSON.stringify(next));

  localStorage.setItem("storvex_intentId", next.intentId || "");
  localStorage.setItem("storvex_ownerPhone", next.phone || "");
  localStorage.setItem("storvex_ownerEmail", next.email || "");
  localStorage.setItem("storvex_storeName", next.storeName || "");
  localStorage.setItem("storvex_ownerName", next.ownerName || "");
  localStorage.setItem("storvex_shopType", next.shopType || "");
  localStorage.setItem("storvex_district", next.district || "");
  localStorage.setItem("storvex_sector", next.sector || "");
  localStorage.setItem("storvex_address", next.address || "");
  localStorage.setItem("storvex_deviceId", next.deviceId || "");

  localStorage.setItem("storvex_emailVerified", "false");
  localStorage.setItem("storvex_phoneVerified", "false");

  localStorage.removeItem("storvex_signupMode");
  localStorage.removeItem("storvex_planKey");
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";
}

function surfaceCard() {
  return "rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-sm font-black text-[var(--color-text)]">
      {children}
      {required ? <span className="text-[var(--color-danger)]"> *</span> : null}
    </label>
  );
}

function HelpText({ children }) {
  return (
    <p className="mt-1.5 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
      {children}
    </p>
  );
}

function FormPanel({ children, className = "" }) {
  return (
    <section
      className={cx(
        "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
        {title}
      </h2>
      {text ? (
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
          {text}
        </p>
      ) : null}
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-[var(--color-text)]">
        {value || "—"}
      </p>
    </div>
  );
}

function ProgressStep({ number, label, active = false, done = false }) {
  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded-2xl border px-4 py-3",
        active || done
          ? "border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]",
      )}
    >
      <div
        className={cx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black",
          done || active
            ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
            : "bg-[var(--color-card)] text-[var(--color-text-muted)]",
        )}
      >
        {done ? "✓" : number}
      </div>

      <div className="text-sm font-black text-[var(--color-text)]">{label}</div>
    </div>
  );
}

function StoreCategorySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const selected =
    SHOP_TYPE_OPTIONS.find((option) => option.value === value) ||
    SHOP_TYPE_OPTIONS[0];

  function choose(option) {
    onChange(option.value);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        className={cx(
          "flex min-h-[76px] w-full items-center justify-between gap-4 rounded-[22px]",
          "border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3",
          "text-left shadow-[var(--shadow-soft)] outline-none transition",
          "hover:border-[var(--color-primary)] focus:border-[var(--color-primary)]",
          "focus:ring-4 focus:ring-[var(--color-primary-ring)]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Selected category
          </p>
          <p className="mt-1 truncate text-sm font-black text-[var(--color-text)]">
            {selected.label}
          </p>
        </div>

        <div
          className={cx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            "bg-[var(--color-primary-soft)] text-lg font-black text-[var(--color-primary)]",
            "transition",
            open ? "rotate-180" : "",
          )}
        >
          ↓
        </div>
      </button>

      {open ? (
        <div
          role="listbox"
          className={cx(
            "absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[24px]",
            "border border-[var(--color-border)] bg-[var(--color-card)] p-2",
            "shadow-[var(--shadow-card)]",
          )}
        >
          {SHOP_TYPE_OPTIONS.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={cx(
                  "flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left transition",
                  active
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
                )}
              >
                <span className="text-sm font-black">{option.label}</span>

                {active ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-primary-contrast)]">
                    Selected
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function TenantIntent() {
  const nav = useNavigate();
  const previous = useMemo(() => readPreviousOnboarding(), []);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    storeName: previous?.storeName || "",
    ownerName: previous?.ownerName || "",
    email: previous?.email || "",
    phone: displayPhone(previous?.phone || ""),
    shopType: previous?.shopType || "ELECTRONICS_RETAIL",
    district: previous?.district || "",
    sector: previous?.sector || "",
    address: previous?.address || "",
  });

  const normalizedPhone = normalizePhone(form.phone);
  const normalizedEmail = normalizeEmail(form.email);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const storeName = cleanString(form.storeName);
    const ownerName = cleanString(form.ownerName);
    const phone = normalizePhone(form.phone);

    if (!storeName) {
      toast.error("Enter the store name");
      return false;
    }

    if (storeName.length < 2) {
      toast.error("Store name is too short");
      return false;
    }

    if (!ownerName) {
      toast.error("Enter the owner name");
      return false;
    }

    if (ownerName.length < 2) {
      toast.error("Owner name is too short");
      return false;
    }

    if (!normalizedEmail) {
      toast.error("Enter the owner email");
      return false;
    }

    if (!isValidEmail(normalizedEmail)) {
      toast.error("Enter a valid email address");
      return false;
    }

    if (!phone) {
      toast.error("Enter the owner phone number");
      return false;
    }

    if (!isValidRwandaPhone(phone)) {
      toast.error("Use a Rwanda phone number like 078xxxxxxx or 25078xxxxxxx");
      return false;
    }

    if (!cleanString(form.shopType)) {
      toast.error("Choose the store category");
      return false;
    }

    return true;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();

      const payload = {
        storeName: cleanString(form.storeName),
        ownerName: cleanString(form.ownerName),
        email: normalizedEmail,
        phone: normalizedPhone,
        shopType: cleanString(form.shopType) || undefined,
        district: cleanString(form.district) || undefined,
        sector: cleanString(form.sector) || undefined,
        address: cleanString(form.address) || undefined,
        deviceId,
      };

      const data = await apiFetch("/auth/owner-intent", {
        method: "POST",
        body: payload,
      });

      const intentId = data?.intentId || data?.intent?.id || "";

      if (!intentId) {
        throw new Error("Store setup could not be started. Please try again.");
      }

      saveOnboardingState({
        intentId,
        storeName: payload.storeName,
        ownerName: payload.ownerName,
        email: payload.email,
        phone: payload.phone,
        shopType: payload.shopType || "",
        district: payload.district || "",
        sector: payload.sector || "",
        address: payload.address || "",
        deviceId,
        emailVerified: false,
        phoneVerified: false,
        signupMode: "",
        planKey: "",
      });

      toast.success("Store setup started");
      nav("/verify-otp");
    } catch (error) {
      toast.error(error?.message || "Failed to start store setup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className={cx(surfaceCard(), "p-5 sm:p-6 lg:p-7")}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Step 1 of 5
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
                  Create the owner account.
                </h1>

                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[var(--color-text-muted)]">
                  Start with the real store identity and owner contact. This becomes the foundation
                  for verification, activation, password creation, and the first branch.
                </p>
              </div>

              <div className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-black text-[var(--color-text)]">
                No payment on this step
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST_POINTS.map((item) => (
                <DetailTile key={item} label="Included" value={item} />
              ))}
            </div>
          </section>

          <section className={cx(surfaceCard(), "p-5")}>
            <div className="grid gap-3 md:grid-cols-5">
              <ProgressStep number="1" label="Create store account" active />
              <ProgressStep number="2" label="Verify email and phone" />
              <ProgressStep number="3" label="Choose activation" />
              <ProgressStep number="4" label="Create password" />
              <ProgressStep number="5" label="Open workspace" />
            </div>
          </section>

          <section className={cx(surfaceCard(), "p-5 sm:p-6 lg:p-7")}>
            <div className="mb-6 border-b border-[var(--color-border)] pb-6">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Owner setup
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                Add store and owner details
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                Use real business details. These help receipts, warranties, branch records,
                and store settings look professional from day one.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <FormPanel>
                  <SectionTitle
                    eyebrow="Business"
                    title="Store identity"
                    text="This name becomes the business identity customers and staff will see."
                  />

                  <div className="grid gap-4">
                    <div>
                      <FieldLabel required>Store name</FieldLabel>
                      <input
                        className={inputClass()}
                        value={form.storeName}
                        onChange={(event) => setField("storeName", event.target.value)}
                        placeholder="Example: Kigali Tech Store"
                        autoComplete="organization"
                        required
                      />
                    </div>

                    <div>
                      <FieldLabel required>Store category</FieldLabel>

                      <StoreCategorySelect
                        value={form.shopType}
                        onChange={(nextValue) => setField("shopType", nextValue)}
                      />

                      <HelpText>
                        Choose the closest match. Product categories can still be customized later.
                      </HelpText>
                    </div>
                  </div>
                </FormPanel>

                <FormPanel>
                  <SectionTitle
                    eyebrow="Owner"
                    title="Owner access"
                    text="This person becomes the first account with full control."
                  />

                  <div className="grid gap-4">
                    <div>
                      <FieldLabel required>Owner name</FieldLabel>
                      <input
                        className={inputClass()}
                        value={form.ownerName}
                        onChange={(event) => setField("ownerName", event.target.value)}
                        placeholder="Example: Jean Luc Rurangwa"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div>
                      <FieldLabel required>Email</FieldLabel>
                      <input
                        type="email"
                        className={inputClass()}
                        value={form.email}
                        onChange={(event) => setField("email", event.target.value)}
                        placeholder="owner@store.com"
                        autoComplete="email"
                        required
                      />
                      <HelpText>A verification code will be sent to this email.</HelpText>
                    </div>

                    <div>
                      <FieldLabel required>Phone</FieldLabel>
                      <input
                        className={inputClass()}
                        value={form.phone}
                        onChange={(event) => setField("phone", event.target.value)}
                        placeholder="078xxxxxxx or 25078xxxxxxx"
                        autoComplete="tel"
                        required
                      />
                      <HelpText>
                        Use a Rwanda number that can receive verification and payment requests.
                      </HelpText>
                    </div>
                  </div>
                </FormPanel>
              </div>

              <FormPanel>
                <SectionTitle
                  eyebrow="Location"
                  title="Business location"
                  text="Location improves branch identity and customer-facing documents."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>District</FieldLabel>
                    <input
                      className={inputClass()}
                      value={form.district}
                      onChange={(event) => setField("district", event.target.value)}
                      placeholder="Example: Nyarugenge"
                    />
                  </div>

                  <div>
                    <FieldLabel>Sector</FieldLabel>
                    <input
                      className={inputClass()}
                      value={form.sector}
                      onChange={(event) => setField("sector", event.target.value)}
                      placeholder="Example: Nyarugenge"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel>Address</FieldLabel>
                    <input
                      className={inputClass()}
                      value={form.address}
                      onChange={(event) => setField("address", event.target.value)}
                      placeholder="Example: Kigali, TCB"
                    />
                  </div>
                </div>
              </FormPanel>

              <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-[var(--color-text)]">
                      Next: verify email and phone
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                      Trial or paid activation comes after verification.
                    </p>
                  </div>

                  <AsyncButton
                    type="submit"
                    loading={loading}
                    loadingText="Starting setup..."
                    className="w-full sm:w-auto"
                  >
                    Continue to verification
                  </AsyncButton>
                </div>
              </div>
            </form>

            <p className="mt-6 text-center text-sm font-semibold text-[var(--color-text-muted)]">
              Already have a store account?{" "}
              <Link
                to="/login"
                className="font-black text-[var(--color-text)] underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
}