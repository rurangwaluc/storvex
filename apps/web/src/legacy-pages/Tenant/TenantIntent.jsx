import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import OnboardingShell, {
  OnboardingCard,
  OnboardingIconBadge,
} from "../../components/onboarding/OnboardingShell";
import {
  clearOnboardingState,
  getOnboardingResumeTarget,
  hasOnboardingDraft,
  readOnboardingState,
  saveOnboardingState,
} from "../../components/onboarding/onboardingStorage";
import AsyncButton from "../../components/ui/AsyncButton";
import { apiFetch } from "../../services/apiClient";
import { getOrCreateDeviceId } from "../../utils/deviceId";

const BUSINESS_CATEGORIES = [
  {
    value: "ELECTRONICS",
    label: "Electronics retailer",
    description: "Phones, laptops, accessories, repairs, and electronics stock.",
  },
  {
    value: "HARDWARE",
    label: "Hardware / quincaillerie",
    description: "Construction tools, fittings, paint, locks, and hardware items.",
  },
  {
    value: "HOME_KITCHEN",
    label: "Home and kitchen materials",
    description: "Home goods, kitchen supplies, appliances, and household materials.",
  },
  {
    value: "LIGHTING",
    label: "Lighting business",
    description: "Bulbs, fixtures, electrical lighting products, and lighting accessories.",
  },
  {
    value: "SPARE_PARTS",
    label: "Spare parts business",
    description: "Vehicle, machine, device, or repair-related spare parts.",
  },
];

function cleanString(value) {
  return String(value || "").trim();
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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function isValidRwandaPhone(value) {
  return /^2507\d{8}$/.test(normalizePhone(value));
}

function RequiredMark() {
  return <span className="svx-onboard-required"> *</span>;
}

function HelpText({ children }) {
  return <p className="svx-onboard-help">{children}</p>;
}

function Field({ label, required = false, children, help }) {
  return (
    <div className="svx-onboard-field">
      <label>
        {label}
        {required ? <RequiredMark /> : null}
      </label>

      {children}

      {help ? <HelpText>{help}</HelpText> : null}
    </div>
  );
}

function StoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5V20H20V10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 4H21L20 10.5H4L3 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 20V14H15V20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function OwnerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12.5C14.4853 12.5 16.5 10.4853 16.5 8C16.5 5.51472 14.4853 3.5 12 3.5C9.51472 3.5 7.5 5.51472 7.5 8C7.5 10.4853 9.51472 12.5 12 12.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4.5 20.5C5.55 16.95 8.25 15.25 12 15.25C15.75 15.25 18.45 16.95 19.5 20.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21C15.5 17.5 18 14.3 18 10.5C18 7.18629 15.3137 4.5 12 4.5C8.68629 4.5 6 7.18629 6 10.5C6 14.3 8.5 17.5 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 12.25C13.1046 12.25 14 11.3546 14 10.25C14 9.14543 13.1046 8.25 12 8.25C10.8954 8.25 10 9.14543 10 10.25C10 11.3546 10.8954 12.25 12 12.25Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8C7.5 5.51472 9.51472 3.5 12 3.5C14.4853 3.5 16.5 5.51472 16.5 8V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 10H18V20H6V10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallLockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8C7.5 5.51472 9.51472 3.5 12 3.5C14.4853 3.5 16.5 5.51472 16.5 8V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 10H18V20H6V10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BusinessCategoryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState("down");
  const pickerRef = useRef(null);

  const selected = BUSINESS_CATEGORIES.find((category) => category.value === value);

  function chooseMenuPlacement() {
    const picker = pickerRef.current;
    if (!picker) return;

    const rect = picker.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const preferredMenuHeight = 340;
    const shouldOpenUp = spaceBelow < preferredMenuHeight && spaceAbove > spaceBelow;

    setPlacement(shouldOpenUp ? "up" : "down");
  }

  function toggleDropdown() {
    chooseMenuPlacement();
    setOpen((current) => !current);
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!pickerRef.current) return;
      if (pickerRef.current.contains(event.target)) return;
      setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handleResizeOrScroll() {
      if (!open) return;
      chooseMenuPlacement();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [open]);

  return (
    <div
      ref={pickerRef}
      className={`svx-business-category-picker ${open ? "is-open" : ""} ${
        placement === "up" ? "is-up" : "is-down"
      }`}
    >
      <button
        type="button"
        className="svx-business-category-button"
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "" : "svx-business-category-placeholder"}>
          {selected ? selected.label : "Select business category"}
        </span>

        <span className="svx-business-category-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>

      {open ? (
        <div className="svx-business-category-menu" role="listbox">
          {BUSINESS_CATEGORIES.map((category, index) => {
            const active = category.value === value;

            return (
              <button
                key={category.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`svx-business-category-option ${active ? "is-active" : ""}`}
                onClick={() => {
                  onChange(category.value);
                  setOpen(false);
                }}
              >
                <span className="svx-business-category-icon">
                  {active ? "✓" : index + 1}
                </span>

                <span>
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ResumeDraftCard({ draft, onContinue, onStartOver }) {
  if (!hasOnboardingDraft(draft)) return null;

  return (
    <div className="mb-6 rounded-[22px] border border-[rgba(37,99,235,0.22)] bg-[var(--color-primary-soft)] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Saved setup found
          </p>

          <h2 className="mt-1 text-lg font-black text-[var(--color-text)]">
            Continue setup for {draft.storeName}
          </h2>

          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            Continue from where you stopped, or start fresh with a new setup.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:flex">
          <button
            type="button"
            onClick={onStartOver}
            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            Start over
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            Continue setup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantIntent() {
  const nav = useNavigate();
  const previous = useMemo(() => readOnboardingState(), []);
  const [draftVisible, setDraftVisible] = useState(hasOnboardingDraft(previous));

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    storeName: previous?.storeName || "",
    ownerName: previous?.ownerName || "",
    email: previous?.email || "",
    phone: displayPhone(previous?.phone || ""),
    shopType: previous?.shopType || "",
    country: previous?.country || "Rwanda",
    district: previous?.district || "",
    sector: previous?.sector || "",
    address: previous?.address || "",
  });

  const normalizedPhone = normalizePhone(form.phone);
  const normalizedEmail = normalizeEmail(form.email);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function continueDraft() {
    nav(getOnboardingResumeTarget(previous));
  }

  function startOver() {
    clearOnboardingState();

    setDraftVisible(false);
    setForm({
      storeName: "",
      ownerName: "",
      email: "",
      phone: "",
      shopType: "",
      country: "Rwanda",
      district: "",
      sector: "",
      address: "",
    });

    toast.success("Fresh setup started");
  }

  function validate() {
    const storeName = cleanString(form.storeName);
    const ownerName = cleanString(form.ownerName);
    const shopType = cleanString(form.shopType);
    const phone = normalizePhone(form.phone);

    if (!storeName) {
      toast.error("Enter the store name");
      return false;
    }

    if (storeName.length < 2) {
      toast.error("Store name is too short");
      return false;
    }

    if (!shopType) {
      toast.error("Choose the business category");
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

    if (!cleanString(form.country)) {
      toast.error("Enter the country");
      return false;
    }

    if (!cleanString(form.district)) {
      toast.error("Enter the district or city");
      return false;
    }

    if (!cleanString(form.sector)) {
      toast.error("Enter the sector or locality");
      return false;
    }

    if (!cleanString(form.address)) {
      toast.error("Enter the store address or landmark");
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
        shopType: cleanString(form.shopType),
        district: cleanString(form.district),
        sector: cleanString(form.sector),
        address: cleanString(form.address),
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
        shopType: payload.shopType,
        country: cleanString(form.country),
        district: payload.district,
        sector: payload.sector,
        address: payload.address,
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
    <OnboardingShell
      activeStep={1}
      footer={
        <p className="svx-onboard-login-note">
          Already have a store account? <Link to="/login">Log in</Link>
        </p>
      }
    >
      {draftVisible ? (
        <ResumeDraftCard
          draft={previous}
          onContinue={continueDraft}
          onStartOver={startOver}
        />
      ) : null}

      <form onSubmit={submit} className="svx-onboard-form">
        <div className="svx-onboard-form-heading">
          <div>
            <span className="svx-onboard-step-pill">Step 1 of 3</span>

            <h2>Tell us about your business.</h2>

            <p>
              Start with the real store identity and owner contact. This becomes the foundation for
              verification and activation.
            </p>
          </div>

          <span className="svx-onboard-safe-pill">
            <span>✓</span>
            No payment on this step
          </span>
        </div>

        <div className="svx-onboard-form-grid">
          <OnboardingCard>
            <div className="svx-onboard-card-title-row">
              <OnboardingIconBadge>
                <StoreIcon />
              </OnboardingIconBadge>

              <div>
                <h3>Store details</h3>
                <p>Name the store and choose the closest business type.</p>
              </div>
            </div>

            <div className="svx-onboard-field-group">
              <Field label="Store name" required>
                <input
                  className="svx-onboard-input"
                  value={form.storeName}
                  onChange={(event) => setField("storeName", event.target.value)}
                  placeholder="Example: Kigali Tech Store"
                  autoComplete="organization"
                  required
                />
              </Field>

              <Field label="Business category" required>
                <BusinessCategoryPicker
                  value={form.shopType}
                  onChange={(nextValue) => setField("shopType", nextValue)}
                />
              </Field>
            </div>
          </OnboardingCard>

          <OnboardingCard>
            <div className="svx-onboard-card-title-row">
              <OnboardingIconBadge>
                <OwnerIcon />
              </OnboardingIconBadge>

              <div>
                <h3>Owner details</h3>
                <p>The first owner gets full access after verification.</p>
              </div>
            </div>

            <div className="svx-onboard-field-group">
              <Field label="Owner name" required>
                <input
                  className="svx-onboard-input"
                  value={form.ownerName}
                  onChange={(event) => setField("ownerName", event.target.value)}
                  placeholder="Example: Jean Luc Rurangwa"
                  autoComplete="name"
                  required
                />
              </Field>

              <Field label="Email" required help="A verification code will be sent to this email.">
                <input
                  type="email"
                  className="svx-onboard-input"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                  placeholder="owner@store.com"
                  autoComplete="email"
                  required
                />
              </Field>

              <Field
                label="Phone"
                required
                help="Use a Rwanda number that can receive verification."
              >
                <input
                  className="svx-onboard-input"
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  placeholder="078xx xxxx or 25078xxxxxxx"
                  autoComplete="tel"
                  required
                />
              </Field>
            </div>
          </OnboardingCard>
        </div>

        <OnboardingCard>
          <div className="svx-onboard-card-title-row">
            <OnboardingIconBadge>
              <LocationIcon />
            </OnboardingIconBadge>

            <div>
              <h3>Store location</h3>
              <p>Use flexible location names now, so Storvex can support more markets later.</p>
            </div>
          </div>

          <div className="svx-onboard-location-grid">
            <Field label="Country" required>
              <input
                className="svx-onboard-input"
                value={form.country}
                onChange={(event) => setField("country", event.target.value)}
                placeholder="Example: Rwanda"
                required
              />
            </Field>

            <Field label="District / city" required>
              <input
                className="svx-onboard-input"
                value={form.district}
                onChange={(event) => setField("district", event.target.value)}
                placeholder="Example: Nyarugenge"
                required
              />
            </Field>

            <Field label="Sector / locality" required>
              <input
                className="svx-onboard-input"
                value={form.sector}
                onChange={(event) => setField("sector", event.target.value)}
                placeholder="Example: Nyarugenge"
                required
              />
            </Field>

            <Field label="Address / landmark" required>
              <input
                className="svx-onboard-input"
                value={form.address}
                onChange={(event) => setField("address", event.target.value)}
                placeholder="Example: Kigali, TCB"
                required
              />
            </Field>
          </div>
        </OnboardingCard>

        <OnboardingCard className="svx-onboard-next-card">
          <div className="svx-onboard-next-copy">
            <div className="svx-onboard-lock-icon">
              <LockIcon />

              <span className="svx-onboard-lock-mini">
                <SmallLockIcon />
              </span>
            </div>

            <div>
              <strong>Next: secure your account</strong>
              <p>Verify email and phone before choosing how to start.</p>
            </div>
          </div>

          <AsyncButton type="submit" loading={loading} loadingText="Saving setup...">
            Continue to verification
            <span aria-hidden="true">→</span>
          </AsyncButton>
        </OnboardingCard>
      </form>
    </OnboardingShell>
  );
}