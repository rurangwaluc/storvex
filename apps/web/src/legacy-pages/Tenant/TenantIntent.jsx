import SearchableCountryPicker from "../../components/onboarding/SearchableCountryPicker";
import { HeroDesktopPreview, HeroPhonePreview } from "../../components/layout/StorvexLockedHero";
import { useTheme } from "../../theme/ThemeProvider";
import "./BusinessSetupPremium.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Factory,
  Home,
  Lightbulb,
  LockKeyhole,
  MapPinHouse,
  RotateCcw,
  ShieldCheck,
  Store,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { getDeviceIdentity } from "../../utils/deviceId";
import {
  displayMarketPhone,
  normalizeMarketPhone,
} from "../../lib/marketPhone";

const DEFAULT_LAUNCH_COUNTRY_CODE = "RW";

const BUSINESS_CATEGORIES = [
  {
    value: "ELECTRONICS",
    label: "Electronics retailer",
    description: "Phones, laptops, accessories, repairs, and electronics stock.",
    icon: Boxes,
  },
  {
    value: "HARDWARE",
    label: "Hardware / quincaillerie",
    description: "Construction tools, fittings, paint, locks, and hardware items.",
    icon: Wrench,
  },
  {
    value: "HOME_KITCHEN",
    label: "Home and kitchen materials",
    description: "Home goods, kitchen supplies, appliances, and household materials.",
    icon: Home,
  },
  {
    value: "LIGHTING",
    label: "Lighting business",
    description: "Bulbs, fixtures, electrical lighting products, and lighting accessories.",
    icon: Lightbulb,
  },
  {
    value: "SPARE_PARTS",
    label: "Spare parts business",
    description: "Vehicle, machine, device, or repair-related spare parts.",
    icon: Factory,
  },
];

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
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
          <ChevronDown size={17} strokeWidth={2.5} />
        </span>
      </button>

      {open ? (
        <div className="svx-business-category-menu" role="listbox">
          {BUSINESS_CATEGORIES.map((category) => {
            const active = category.value === value;
            const Icon = category.icon;

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
                  {active ? <Check size={17} strokeWidth={3} /> : <Icon size={18} strokeWidth={2.2} />}
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
    <div className="svx-onboard-draft-card">
      <div className="svx-onboard-draft-copy">
        <span className="svx-onboard-draft-icon">
          <RotateCcw size={20} strokeWidth={2.3} />
        </span>

        <div>
          <p>Saved setup found</p>
          <h2>Continue setup for {draft.storeName}</h2>
          <span>Continue from where you stopped, or start fresh with a new setup.</span>
        </div>
      </div>

      <div className="svx-onboard-draft-actions">
        <button type="button" onClick={onStartOver} className="svx-onboard-secondary-action">
          Start over
        </button>

        <button type="button" onClick={onContinue} className="svx-onboard-primary-action">
          Continue setup
        </button>
      </div>
    </div>
  );
}

const LOCATION_EXAMPLES = {
  RW: {
    firstLabel: "District / city",
    secondLabel: "Sector / locality",
    district: "Example: Gasabo",
    sector: "Example: Kacyiru",
    address: "Example: KG 5 Ave, near the market",
  },
  AO: {
    firstLabel: "City / municipality",
    secondLabel: "Area / neighborhood",
    district: "Example: Luanda",
    sector: "Example: Talatona",
    address: "Example: Near Talatona Shopping",
  },
  KE: {
    firstLabel: "City / town",
    secondLabel: "Area / neighborhood",
    district: "Example: Nairobi",
    sector: "Example: Westlands",
    address: "Example: Near Sarit Centre",
  },
  UG: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Kampala",
    sector: "Example: Kololo",
    address: "Example: Near Acacia Mall",
  },
  TZ: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Dar es Salaam",
    sector: "Example: Masaki",
    address: "Example: Near Slipway",
  },
  BI: {
    firstLabel: "City / province",
    secondLabel: "Area / neighborhood",
    district: "Example: Bujumbura",
    sector: "Example: Rohero",
    address: "Example: Near the central market",
  },
  NG: {
    firstLabel: "City / town",
    secondLabel: "Area / neighborhood",
    district: "Example: Lagos",
    sector: "Example: Ikeja",
    address: "Example: Near a main shopping centre",
  },
  GH: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Accra",
    sector: "Example: Osu",
    address: "Example: Near Oxford Street",
  },
  ZA: {
    firstLabel: "City / municipality",
    secondLabel: "Area / neighborhood",
    district: "Example: Johannesburg",
    sector: "Example: Sandton",
    address: "Example: Near Sandton City",
  },
  BF: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Ouagadougou",
    sector: "Example: Ouaga 2000",
    address: "Example: Near a main road or landmark in Ouagadougou",
  },
  BJ: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Cotonou",
    sector: "Example: Akpakpa",
    address: "Example: Near a main road or landmark in Cotonou",
  },
  BW: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Gaborone",
    sector: "Example: Broadhurst",
    address: "Example: Near a main road or landmark in Gaborone",
  },
  CD: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Kinshasa",
    sector: "Example: Gombe",
    address: "Example: Near a main road or landmark in Kinshasa",
  },
  CF: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Bangui",
    sector: "Example: PK5",
    address: "Example: Near a main road or landmark in Bangui",
  },
  CG: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Brazzaville",
    sector: "Example: Poto-Poto",
    address: "Example: Near a main road or landmark in Brazzaville",
  },
  CI: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Abidjan",
    sector: "Example: Cocody",
    address: "Example: Near a main road or landmark in Abidjan",
  },
  CM: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Douala",
    sector: "Example: Bonapriso",
    address: "Example: Near a main road or landmark in Douala",
  },
  CV: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Praia",
    sector: "Example: Achada Santo António",
    address: "Example: Near a main road or landmark in Praia",
  },
  DJ: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Djibouti City",
    sector: "Example: Balbala",
    address: "Example: Near a main road or landmark in Djibouti City",
  },
  DZ: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Algiers",
    sector: "Example: Bab El Oued",
    address: "Example: Near a main road or landmark in Algiers",
  },
  EG: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Cairo",
    sector: "Example: Nasr City",
    address: "Example: Near a main road or landmark in Cairo",
  },
  ER: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Asmara",
    sector: "Example: Tiravolo",
    address: "Example: Near a main road or landmark in Asmara",
  },
  ET: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Addis Ababa",
    sector: "Example: Bole",
    address: "Example: Near a main road or landmark in Addis Ababa",
  },
  GA: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Libreville",
    sector: "Example: Louis",
    address: "Example: Near a main road or landmark in Libreville",
  },
  GM: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Banjul",
    sector: "Example: Serrekunda",
    address: "Example: Near a main road or landmark in Banjul",
  },
  GN: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Conakry",
    sector: "Example: Kaloum",
    address: "Example: Near a main road or landmark in Conakry",
  },
  GQ: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Malabo",
    sector: "Example: Ela Nguema",
    address: "Example: Near a main road or landmark in Malabo",
  },
  GW: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Bissau",
    sector: "Example: Bandim",
    address: "Example: Near a main road or landmark in Bissau",
  },
  KM: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Moroni",
    sector: "Example: Mtsangani",
    address: "Example: Near a main road or landmark in Moroni",
  },
  LR: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Monrovia",
    sector: "Example: Sinkor",
    address: "Example: Near a main road or landmark in Monrovia",
  },
  LS: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Maseru",
    sector: "Example: Thetsane",
    address: "Example: Near a main road or landmark in Maseru",
  },
  LY: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Tripoli",
    sector: "Example: Hay Al Andalus",
    address: "Example: Near a main road or landmark in Tripoli",
  },
  MA: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Casablanca",
    sector: "Example: Maarif",
    address: "Example: Near a main road or landmark in Casablanca",
  },
  MG: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Antananarivo",
    sector: "Example: Analakely",
    address: "Example: Near a main road or landmark in Antananarivo",
  },
  ML: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Bamako",
    sector: "Example: ACI 2000",
    address: "Example: Near a main road or landmark in Bamako",
  },
  MR: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Nouakchott",
    sector: "Example: Tevragh Zeina",
    address: "Example: Near a main road or landmark in Nouakchott",
  },
  MU: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Port Louis",
    sector: "Example: Cassis",
    address: "Example: Near a main road or landmark in Port Louis",
  },
  MW: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Lilongwe",
    sector: "Example: Area 18",
    address: "Example: Near a main road or landmark in Lilongwe",
  },
  MZ: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Maputo",
    sector: "Example: Polana",
    address: "Example: Near a main road or landmark in Maputo",
  },
  NA: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Windhoek",
    sector: "Example: Klein Windhoek",
    address: "Example: Near a main road or landmark in Windhoek",
  },
  NE: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Niamey",
    sector: "Example: Plateau",
    address: "Example: Near a main road or landmark in Niamey",
  },
  SC: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Victoria",
    sector: "Example: Mont Fleuri",
    address: "Example: Near a main road or landmark in Victoria",
  },
  SD: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Khartoum",
    sector: "Example: Bahri",
    address: "Example: Near a main road or landmark in Khartoum",
  },
  SL: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Freetown",
    sector: "Example: Aberdeen",
    address: "Example: Near a main road or landmark in Freetown",
  },
  SN: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Dakar",
    sector: "Example: Plateau",
    address: "Example: Near a main road or landmark in Dakar",
  },
  SO: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Mogadishu",
    sector: "Example: Hodan",
    address: "Example: Near a main road or landmark in Mogadishu",
  },
  SS: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Juba",
    sector: "Example: Konyo Konyo",
    address: "Example: Near a main road or landmark in Juba",
  },
  ST: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: São Tomé",
    sector: "Example: Água Grande",
    address: "Example: Near a main road or landmark in São Tomé",
  },
  SZ: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Mbabane",
    sector: "Example: Ezulwini",
    address: "Example: Near a main road or landmark in Mbabane",
  },
  TD: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: N'Djamena",
    sector: "Example: Moursal",
    address: "Example: Near a main road or landmark in N'Djamena",
  },
  TG: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Lomé",
    sector: "Example: Bè",
    address: "Example: Near a main road or landmark in Lomé",
  },
  TN: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Tunis",
    sector: "Example: La Marsa",
    address: "Example: Near a main road or landmark in Tunis",
  },
  ZM: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Lusaka",
    sector: "Example: Kabulonga",
    address: "Example: Near a main road or landmark in Lusaka",
  },
  ZW: {
    firstLabel: "City / district",
    secondLabel: "Area / neighborhood",
    district: "Example: Harare",
    sector: "Example: Avondale",
    address: "Example: Near a main road or landmark in Harare",
  },

};

const DEFAULT_LOCATION_EXAMPLES = {
  firstLabel: "City / district",
  secondLabel: "Area / neighborhood",
  district: "Enter your city or district",
  sector: "Enter your area or neighborhood",
  address: "Enter your street, building or nearby landmark",
};

function getLocationExamples(countryCode) {
  return LOCATION_EXAMPLES[
    String(countryCode || "").trim().toUpperCase()
  ] || DEFAULT_LOCATION_EXAMPLES;
}

export default function TenantIntent() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const previous = useMemo(() => readOnboardingState(), []);

  const requestedPlanKey = useMemo(
    () =>
      cleanString(searchParams.get("plan"))
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .toUpperCase(),
    [searchParams],
  );

  const previousHasDraft = hasOnboardingDraft(previous);

  const selectedPlanKey =
    requestedPlanKey ||
    (previousHasDraft
      ? cleanString(previous?.planKey).toUpperCase()
      : "");

  const planWasExplicitlySelected = Boolean(
    requestedPlanKey ||
      (previousHasDraft && previous?.planSelectionExplicit === true),
  );

  const reviewMode = searchParams.get("review") === "1";

  const [draftVisible, setDraftVisible] = useState(
    hasOnboardingDraft(previous) && !reviewMode,
  );

  const { resolvedTheme, toggleTheme } = useTheme();
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [testimonialPaused, setTestimonialPaused] = useState(false);

  const testimonials = [
    {
      quote: "Storvex gave us the tools to manage our store easily and sell more.",
      caption: "Example testimonial / Preview content",
    },
    {
      quote: "We can keep sales, products and stock information together in one place.",
      caption: "Example testimonial / Preview content",
    },
    {
      quote: "Managing daily retail operations should be simpler and faster.",
      caption: "Example testimonial / Preview content",
    },
  ];

  useEffect(() => {
    if (testimonialPaused) return;

    const timer = setInterval(() => {
      setTestimonialIndex((current) =>
        (current + 1) % testimonials.length
      );
    }, 6000);

    return () => clearInterval(timer);
  }, [testimonialPaused]);

  const [loading, setLoading] = useState(false);
  const [verifiedAccount, setVerifiedAccount] = useState(null);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [markets, setMarkets] = useState([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketLoadError, setMarketLoadError] = useState("");
  const [form, setForm] = useState({
    storeName: previous?.storeName || "",
    ownerName: previous?.ownerName || "",
    email: previous?.email || "",
    phone: previous?.phone || "",
    shopType: previous?.shopType || "",
    countryCode: previous?.countryCode || "",
    district: previous?.district || "",
    sector: previous?.sector || "",
    address: previous?.address || "",
  });

  const selectedMarket =
    markets.find(
      (market) => market.countryCode === form.countryCode,
    ) || null;

  const marketAvailable =
    selectedMarket?.onboardingEnabled === true;

  const normalizedPhone = selectedMarket
    ? normalizeMarketPhone(form.phone, selectedMarket)
    : "";

  const locationExamples = getLocationExamples(form.countryCode);

  const normalizedEmail = normalizeEmail(
    verifiedAccount?.email || form.email
  );

  useEffect(() => {
    let cancelled = false;

    async function loadVerifiedAccount() {
      try {
        const response = await fetch("/api/auth/account/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Account session unavailable.");
        }

        const data = await response.json();
        const account = data?.account;

        if (
          !account?.accountId ||
          account.emailVerified !== true ||
          !isValidEmail(account.email) ||
          !cleanString(account.fullName)
        ) {
          throw new Error("Verified Storvex account required.");
        }

        if (cancelled) return;

        setVerifiedAccount(account);
        setForm((current) => ({
          ...current,
          ownerName: account.fullName,
          email: normalizeEmail(account.email),
        }));
      } catch {
        if (!cancelled) {
          toast.error("Please sign in to your verified Storvex account.");
          nav("/signup", { replace: true });
        }
      } finally {
        if (!cancelled) setCheckingAccount(false);
      }
    }

    loadVerifiedAccount();

    return () => { cancelled = true; };
  }, [nav]);

  useEffect(() => {
    let cancelled = false;

    setMarketsLoading(true);
    setMarketLoadError("");

    Promise.all([
      apiFetch("/auth/markets"),
      apiFetch("/auth/country-hint").catch(() => ({
        countryCode: null,
      })),
    ])
      .then(([marketsData, hintData]) => {
        if (cancelled) return;

        const available = Array.isArray(marketsData?.markets)
          ? marketsData.markets
          : [];

        setMarkets(available);

        setForm((current) => {
          const currentCountry = cleanString(current.countryCode).toUpperCase();

          const currentExists = available.some(
            (market) =>
              market.countryCode === currentCountry,
          );

          if (currentExists) {
            return current;
          }

          const hintedCountryCode = cleanString(
            hintData?.countryCode,
          ).toUpperCase();

          const hintedMarket = available.find(
            (market) =>
              market.countryCode === hintedCountryCode,
          );

          const launchMarket = available.find(
            (market) =>
              market.countryCode ===
              DEFAULT_LAUNCH_COUNTRY_CODE,
          );

          const firstAvailableMarket = available.find(
            (market) => market.onboardingEnabled === true,
          );

          return {
            ...current,
            countryCode:
              hintedMarket?.countryCode ||
              launchMarket?.countryCode ||
              firstAvailableMarket?.countryCode ||
              "",
            phone: "",
          };
        });

        if (!available.length) {
          setMarketLoadError(
            "We couldn't load available countries. Please try again.",
          );
        }
      })
      .catch(() => {
        if (cancelled) return;

        setMarkets([]);
        setMarketLoadError(
          "We couldn't load available countries. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setMarketsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedMarket) return;

    setForm((current) => ({
      ...current,
      phone: displayMarketPhone(
        current.phone,
        selectedMarket,
      ),
    }));
  }, [selectedMarket?.countryCode]);

  function setField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function setCountry(countryCode) {
    setForm((current) => {
      if (current.countryCode === countryCode) {
        return current;
      }

      return {
        ...current,
        countryCode,
        phone: "",
      };
    });
  }

  function continueDraft() {
    if (requestedPlanKey) {
      saveOnboardingState({
        ...(previous || {}),
        planKey: requestedPlanKey,
        planSelectionExplicit: true,
        planSelectionSource: "PRICING",
        signupMode: "PAID",
      });
    }

    nav(getOnboardingResumeTarget(previous));
  }

  function startOver() {
    clearOnboardingState();

    if (requestedPlanKey) {
      localStorage.setItem("storvex_planKey", requestedPlanKey);
      localStorage.setItem("storvex_planSelectionExplicit", "true");
      localStorage.setItem("storvex_planSelectionSource", "PRICING");
      localStorage.setItem("storvex_signupMode", "PAID");
    }

    setDraftVisible(false);
    setForm({
      storeName: "",
      ownerName: "",
      email: "",
      phone: "",
      shopType: "",
      countryCode: DEFAULT_LAUNCH_COUNTRY_CODE,
      district: "",
      sector: "",
      address: "",
    });

    toast.success("Fresh setup started");
  }

  function validate() {
    if (marketsLoading) {
      toast.error(
        "Countries are still loading. Please wait.",
      );
      return false;
    }

    if (marketLoadError || !selectedMarket) {
      toast.error(
        marketLoadError ||
          "Choose a valid business country.",
      );
      return false;
    }

    if (!marketAvailable) {
      toast.error(
        `Storvex isn't available in ${selectedMarket.countryName} yet.`,
      );
      return false;
    }

    const storeName = cleanString(form.storeName);
    const ownerName = cleanString(form.ownerName);
    const shopType = cleanString(form.shopType);
    const phone = normalizeMarketPhone(
      form.phone,
      selectedMarket,
    );

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

    if (!cleanString(form.phone)) {
      toast.error("Enter the owner phone number");
      return false;
    }

    if (!phone) {
      toast.error(`Use a valid ${selectedMarket.countryName} mobile number (${selectedMarket.callingCode})`);
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

    if (
      checkingAccount ||
      !verifiedAccount?.accountId ||
      verifiedAccount.emailVerified !== true
    ) {
      toast.error("Verify your Storvex account before continuing.");
      return;
    }

    if (!validate()) return;

    setLoading(true);

    try {
      const { deviceId, browserFingerprint } = await getDeviceIdentity();

      const payload = {
        storeName: cleanString(form.storeName),
        ownerName: cleanString(verifiedAccount.fullName),
        email: normalizeEmail(verifiedAccount.email),
        phone: normalizedPhone,
        countryCode: selectedMarket.countryCode,
        shopType: cleanString(form.shopType),
        district: cleanString(form.district),
        sector: cleanString(form.sector),
        address: cleanString(form.address),
        deviceId,
        browserFingerprint,
      };

      const response = await fetch("/api/auth/account/business/intent", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to start business setup."
        );
      }

      const intentId = data?.intentId || "";
      const onboardingToken = data?.onboardingToken || "";

      if (!intentId || !onboardingToken || data.emailVerified !== true) {
        throw new Error(
          "Your verified email could not be connected to this store. Please try again."
        );
      }

      saveOnboardingState({
        intentId,
        onboardingToken,
        storeName: payload.storeName,
        ownerName: payload.ownerName,
        email: payload.email,
        phone: payload.phone,
        shopType: payload.shopType,
        countryCode: selectedMarket.countryCode,
        country: selectedMarket.countryName,
        currencyCode:
          selectedMarket.currencyCode || "",
        timezone:
          selectedMarket.timezone || "",
        callingCode:
          selectedMarket.callingCode || "",
        subscriptionPaymentsEnabled:
          selectedMarket.subscriptionPaymentsEnabled === true,
        district: payload.district,
        sector: payload.sector,
        address: payload.address,
        deviceId,
        browserFingerprint,
        accountBusinessIntent: true,
        emailVerified: data.emailVerified === true,
        emailVerifiedFor: payload.email,
        phoneVerified: data.phoneVerified === true,
        phoneVerifiedFor: "",
        signupMode: selectedPlanKey ? "PAID" : "",
        planKey: selectedPlanKey,
        planSelectionExplicit: planWasExplicitlySelected,
        planSelectionSource: requestedPlanKey
          ? "PRICING"
          : planWasExplicitlySelected
            ? previous?.planSelectionSource || "ONBOARDING"
            : "",
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
    <div className="svx-business-premium">
      <div className="svx-business-premium__shell">
        <header className="svx-business-premium__header">
          <Link to="/" className="svx-business-premium__logo">
            <img src="/storvex-header-tricolor.png" alt="Storvex" />
          </Link>

          <div className="svx-business-premium__header-actions">
            <button
              type="button"
              className="svx-business-premium__theme"
              onClick={toggleTheme}
              aria-label="Toggle light and dark theme"
            >
              {resolvedTheme === "dark" ? "☀" : "☾"}
            </button>

            <Link
              className="svx-business-premium__help"
              to="/login"
            >
              Need help?
            </Link>

            <Link
              className="svx-business-premium__exit"
              to="/login"
            >
              Exit setup
            </Link>
          </div>
        </header>

        <div className="svx-business-premium__columns">
          <aside className="svx-business-premium__intro">
            <div className="svx-business-premium__intro-top">
              <span className="svx-business-premium__eyebrow">
                BUSINESS SETUP · STEP 1 OF 3
              </span>

              <h1>Let’s set up<br />your store.</h1>

              <p className="svx-business-premium__intro-text">
                Add your business details so we can set up your store,
                connect it to your account and get you ready to sell.
              </p>

              <div className="svx-business-premium__milestones">
                <div className="is-active">
                  <span><Store size={20} strokeWidth={2.2} /></span>
                  <p>
                    <strong>Set up your store</strong>
                    <small>Tell us about your business</small>
                  </p>
                </div>
                <div>
                  <span><LockKeyhole size={19} strokeWidth={2} /></span>
                  <p>
                    <strong>Choose your plan</strong>
                    <small>Pick what works for you</small>
                  </p>
                </div>
                <div>
                  <span><Boxes size={19} strokeWidth={2} /></span>
                  <p>
                    <strong>Start selling</strong>
                    <small>Add products and go live</small>
                  </p>
                </div>
              </div>
            </div>

            <div className="svx-business-premium__visual-area">
              <div className="svx-business-premium__art" aria-hidden="true">
                <div className="svx-business-premium__lime" />
                <div className="svx-business-premium__coral" />
                <div className="svx-business-premium__devices">
                  <HeroDesktopPreview />
                  <HeroPhonePreview />
                </div>
              </div>

              <div
                className="svx-business-premium__testimonial"
                aria-label="Illustrative testimonial carousel"
                onMouseEnter={() => setTestimonialPaused(true)}
                onMouseLeave={() => setTestimonialPaused(false)}
                onFocusCapture={() => setTestimonialPaused(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setTestimonialPaused(false);
                  }
                }}
              >
                <span className="svx-business-premium__quote-icon" aria-hidden="true">
                  ❞
                </span>
                <div className="svx-business-premium__testimonial-copy">
                  <p key={testimonialIndex} className="svx-business-premium__testimonial-slide">
                    “{testimonials[testimonialIndex].quote}”
                  </p>
                  <small>{testimonials[testimonialIndex].caption}</small>
                </div>
              </div>

              <div
                className="svx-business-premium__dots"
                aria-label="Choose testimonial"
              >
                {testimonials.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    className={index === testimonialIndex ? "is-active" : ""}
                    onClick={() => setTestimonialIndex(index)}
                    aria-label={`Show example testimonial ${index + 1}`}
                    aria-pressed={index === testimonialIndex}
                  />
                ))}
              </div>
            </div>
          </aside>

          <main className="svx-business-premium__main">
            <div
              className="svx-business-premium__progress svx-business-premium__progress-three"
              aria-label="Onboarding progress"
            >
              <div className="is-active" aria-current="step">
                <span>1</span>
                <strong>Business details</strong>
              </div>
              <div className="svx-business-premium__progress-line" />
              <div>
                <span>2</span>
                <strong>Verification</strong>
              </div>
              <div className="svx-business-premium__progress-line" />
              <div>
                <span>3</span>
                <strong>Choose plan</strong>
              </div>
            </div>

            {draftVisible ? (
              <ResumeDraftCard
                draft={previous}
                onContinue={continueDraft}
                onStartOver={startOver}
              />
            ) : null}

            <section className="svx-business-premium__verified">
              <div className="svx-business-premium__verified-heading">
                <span className="svx-business-premium__verified-icon">
                  <Check size={21} strokeWidth={2.6} />
                </span>
                <div>
                  <strong>Your account <em>(verified)</em></strong>
                  <p>This account will be the owner of this store.</p>
                </div>
              </div>
              <div className="svx-business-premium__account">
                <span className="svx-business-premium__avatar">
                  <UserRoundCheck size={22} strokeWidth={2} />
                </span>
                <div className="svx-business-premium__account-identity">
                  <strong>{verifiedAccount?.fullName || "Loading your account..."}</strong>
                  <p>{verifiedAccount?.email || ""}</p>
                </div>
                <span className="svx-business-premium__account-status">
                  Verified
                </span>
              </div>
            </section>

            <form
              onSubmit={submit}
              className="svx-business-premium__form"
            >
              <section className="svx-business-premium__card">
                <div className="svx-business-premium__card-heading">
                  <span className="svx-business-premium__card-icon is-store">
                    <Store size={22} strokeWidth={2.1} />
                  </span>
                  <div>
                    <h2>Store details</h2>
                    <p>Tell us about your business.</p>
                  </div>
                </div>

                {selectedPlanKey ? (
                  <p className="svx-business-premium__plan-note">
                    Your selected plan will be saved for the next step.
                  </p>
                ) : null}

                <div className="svx-business-premium__fields svx-business-premium__store-grid">
                  <Field label="Country" required>
                    <SearchableCountryPicker
                      markets={markets}
                      value={form.countryCode}
                      onChange={setCountry}
                      loading={marketsLoading}
                      disabled={marketsLoading || Boolean(marketLoadError)}
                    />
                    {!marketsLoading && selectedMarket && !marketAvailable ? (
                      <p className="svx-business-premium__validation">
                        Storvex isn't available in {selectedMarket.countryName} yet.
                      </p>
                    ) : null}
                    {marketLoadError ? (
                      <p className="svx-business-premium__validation">
                        {marketLoadError}
                      </p>
                    ) : null}
                  </Field>

                  <Field label="Store name" required>
                    <input
                      className="svx-onboard-input"
                      value={form.storeName}
                      onChange={(event) => setField("storeName", event.target.value)}
                      placeholder="Example: City Electronics"
                      autoComplete="organization"
                      required
                    />
                  </Field>

                  <Field label="Business category" required>
                    <BusinessCategoryPicker
                      value={form.shopType}
                      onChange={(value) => setField("shopType", value)}
                    />
                  </Field>

                  <Field
                    label="Business phone"
                    required
                    help={selectedMarket
                      ? `Use a number that can receive verification (${selectedMarket.callingCode}).`
                      : "Choose your business country first."}
                  >
                    <input
                      className="svx-onboard-input"
                      value={form.phone}
                      onChange={(event) => setField("phone", event.target.value)}
                      placeholder={selectedMarket
                        ? `${selectedMarket.callingCode} mobile number`
                        : "Mobile number"}
                      autoComplete="tel"
                      required
                    />
                  </Field>
                </div>
              </section>

              <section className="svx-business-premium__card">
                <div className="svx-business-premium__card-heading">
                  <span className="svx-business-premium__card-icon is-location">
                    <MapPinHouse size={22} strokeWidth={2.1} />
                  </span>
                  <div>
                    <h2>Store location</h2>
                    <p>Help customers find your store.</p>
                  </div>
                </div>

                <div className="svx-business-premium__location">
                  <Field label={locationExamples.firstLabel} required>
                    <input
                      className="svx-onboard-input"
                      value={form.district}
                      onChange={(event) => setField("district", event.target.value)}
                      placeholder={locationExamples.district}
                      required
                    />
                  </Field>

                  <Field label={locationExamples.secondLabel} required>
                    <input
                      className="svx-onboard-input"
                      value={form.sector}
                      onChange={(event) => setField("sector", event.target.value)}
                      placeholder={locationExamples.sector}
                      required
                    />
                  </Field>

                  <div className="svx-business-premium__address">
                    <Field label="Address / landmark" required>
                      <input
                        className="svx-onboard-input"
                        value={form.address}
                        onChange={(event) => setField("address", event.target.value)}
                        placeholder={locationExamples.address}
                        required
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <AsyncButton
                type="submit"
                loading={loading}
                loadingText="Saving business details..."
                className="svx-business-premium__continue"
                disabled={
                  loading ||
                  checkingAccount ||
                  marketsLoading ||
                  Boolean(marketLoadError) ||
                  !marketAvailable
                }
              >
                Continue to verification <span aria-hidden="true">→</span>
              </AsyncButton>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}
