import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  getStoreProfile,
  getStoreSetupChecklist,
  updateStoreProfile,
} from "../../services/storeApi";
import {
  getTenantSettings,
  uploadTenantLogoViaApi,
} from "../../services/tenantsApi";
import { getUserRole } from "../../utils/role";

import "./Settings.css";
import "./SettingsGeneral.css";

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeStoreCategory(value) {
  const raw = cleanString(value).toUpperCase();

  if (!raw) return "";

  if (
    [
      "ELECTRONICS",
      "ELECTRONICS_RETAIL",
      "PHONE_SHOP",
      "LAPTOP_SHOP",
      "ACCESSORIES_SHOP",
      "REPAIR_SHOP",
      "MIXED_ELECTRONICS",
    ].includes(raw)
  ) {
    return "ELECTRONICS";
  }

  if (
    raw === "HARDWARE" ||
    raw === "QUINCAILLERIE"
  ) {
    return "HARDWARE";
  }

  if (
    raw === "HOME_KITCHEN" ||
    raw === "HOME_AND_KITCHEN"
  ) {
    return "HOME_KITCHEN";
  }

  if (
    raw === "LIGHTING" ||
    raw === "LIGHTING_BUSINESS"
  ) {
    return "LIGHTING";
  }

  if (
    raw === "SPARE_PARTS" ||
    raw === "SPARE_PARTS_BUSINESS"
  ) {
    return "SPARE_PARTS";
  }

  return raw;
}

function businessCategoryLabel(value) {
  switch (normalizeStoreCategory(value)) {
    case "ELECTRONICS":
      return "Electronics store";
    case "HARDWARE":
      return "Hardware store";
    case "HOME_KITCHEN":
      return "Home and kitchen store";
    case "LIGHTING":
      return "Lighting store";
    case "SPARE_PARTS":
      return "Spare parts store";
    default:
      return "Not configured";
  }
}

function initialsFromName(name) {
  const parts = cleanString(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "SV";
  }

  return parts
    .map((part) =>
      String(part[0] || "").toUpperCase(),
    )
    .join("");
}

function profileSnapshot(value) {
  return {
    name: value?.name || "",
    email: value?.email || "",
    phone: value?.phone || "",
    shopType: normalizeStoreCategory(
      value?.shopType,
    ),
    district: value?.district || "",
    sector: value?.sector || "",
    address: value?.address || "",
    logoUrl: value?.logoUrl || "",
    logoKey: value?.logoKey || "",
    countryCode: value?.countryCode || "RW",
    currencyCode:
      value?.currencyCode || "RWF",
    timezone:
      value?.timezone || "Africa/Kigali",
  };
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  autoComplete,
  inputMode,
  className = "",
}) {
  return (
    <div
      className={[
        "svx-general-field",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label>{label}</label>

      <input
        type={type}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function SectionHeading({
  title,
  description,
}) {
  return (
    <div className="svx-general-section-heading">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export default function SettingsGeneral() {
  const role = useMemo(
    () => getUserRole(),
    [],
  );

  const isOwner = role === "OWNER";
  const isReadOnly = !isOwner;
  const fileInputRef = useRef(null);

  const [profile, setProfile] =
    useState(null);

  const [checklist, setChecklist] =
    useState(null);

  const [form, setForm] = useState(
    profileSnapshot(null),
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingLogo, setUploadingLogo] =
    useState(false);

  useEffect(() => {
    let alive = true;

    Promise.allSettled([
      getStoreProfile(),
      getStoreSetupChecklist(),
      getTenantSettings(),
    ])
      .then(
        ([
          profileResult,
          checklistResult,
          tenantResult,
        ]) => {
          if (!alive) return;

          if (
            profileResult.status ===
            "fulfilled"
          ) {
            const storeProfile =
              profileResult.value?.profile ||
              null;

            const tenant =
              tenantResult.status ===
              "fulfilled"
                ? tenantResult.value?.tenant ||
                  null
                : null;

            const nextProfile =
              storeProfile
                ? {
                    ...storeProfile,
                    logoKey:
                      tenant?.logoKey ||
                      storeProfile.logoKey ||
                      null,
                    logoUrl:
                      tenant?.logoSignedUrl ||
                      tenant?.logoUrl ||
                      storeProfile.logoUrl ||
                      null,
                  }
                : null;

            setProfile(nextProfile);
            setForm(
              profileSnapshot(nextProfile),
            );
          }

          if (
            checklistResult.status ===
            "fulfilled"
          ) {
            setChecklist(
              checklistResult.value,
            );
          }
        },
      )
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const dirty = useMemo(() => {
    if (!profile) return false;

    return (
      JSON.stringify(form) !==
      JSON.stringify(
        profileSnapshot(profile),
      )
    );
  }, [form, profile]);

  const missingRequired = useMemo(() => {
    const checks = Array.isArray(
      checklist?.checks,
    )
      ? checklist.checks
      : [];

    return checks.filter(
      (item) =>
        item?.required && !item?.done,
    );
  }, [checklist]);

  function setField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function refreshChecklist() {
    const data =
      await getStoreSetupChecklist();

    setChecklist(data);
  }

  async function onSave() {
    if (isReadOnly) {
      toast.error(
        "Only the owner can update business settings",
      );
      return;
    }

    if (!dirty || saving) return;

    setSaving(true);

    try {
      const payload = {
        name: cleanString(form.name),
        email:
          cleanString(form.email) || null,
        phone:
          cleanString(form.phone) || null,
        shopType: normalizeStoreCategory(
          profile?.shopType ||
            form.shopType,
        ),
        district:
          cleanString(form.district) ||
          null,
        sector:
          cleanString(form.sector) ||
          null,
        address:
          cleanString(form.address) ||
          null,
        countryCode:
          cleanString(
            form.countryCode,
          ).toUpperCase() || "RW",
        currencyCode:
          cleanString(
            form.currencyCode,
          ).toUpperCase() || "RWF",
        timezone:
          cleanString(form.timezone) ||
          "Africa/Kigali",
      };

      const data =
        await updateStoreProfile(payload);

      const updated =
        data?.profile || {};

      const nextProfile = {
        ...(profile || {}),
        ...updated,
        logoKey: form.logoKey || null,
        logoUrl: form.logoUrl || null,
      };

      setProfile(nextProfile);
      setForm(
        profileSnapshot(nextProfile),
      );

      await refreshChecklist();

      toast.success(
        "Business settings saved",
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not save business settings",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onLogoSelected(file) {
    if (!file) return;

    if (isReadOnly) {
      toast.error(
        "Only the owner can upload a logo",
      );
      return;
    }

    setUploadingLogo(true);

    try {
      const data =
        await uploadTenantLogoViaApi(
          file,
        );

      const tenant =
        data?.tenant || null;

      if (!tenant?.logoKey) {
        throw new Error(
          "The logo could not be attached to the business",
        );
      }

      const nextLogoUrl =
        tenant.logoSignedUrl ||
        tenant.logoUrl ||
        "";

      setProfile((current) => ({
        ...(current || {}),
        logoKey: tenant.logoKey,
        logoUrl: nextLogoUrl,
      }));

      setForm((current) => ({
        ...current,
        logoKey: tenant.logoKey,
        logoUrl: nextLogoUrl,
      }));

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await refreshChecklist();

      toast.success(
        "Business logo updated",
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not upload the logo",
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="w-52"
        lines={4}
        showTable={false}
      />
    );
  }

  return (
    <div className="svx-settings-page svx-general-page">
      <div className="svx-general-page-heading">
        <div>
          <h1>General</h1>
          <p>
            Business identity, contact
            details and location.
          </p>
        </div>

        <div className="svx-general-page-actions">
          {isReadOnly ? (
            <span className="svx-general-readonly">
              View only
            </span>
          ) : (
            <button
              type="button"
              className="svx-general-save-button"
              disabled={!dirty || saving}
              onClick={onSave}
            >
              {saving
                ? "Saving..."
                : dirty
                  ? "Save changes"
                  : "Saved"}
            </button>
          )}
        </div>
      </div>

      {missingRequired.length ? (
        <div
          className="svx-general-notice"
          role="status"
        >
          <strong>
            Complete your business details
          </strong>
          <p>
            {missingRequired
              .slice(0, 2)
              .map(
                (item) =>
                  item?.label ||
                  "Required information",
              )
              .join(", ")}
            {missingRequired.length > 2
              ? ` and ${
                  missingRequired.length - 2
                } more`
              : ""}
            .
          </p>
        </div>
      ) : null}

      <section className="svx-general-section">
        <SectionHeading
          title="Business identity"
          description="The name and logo shown across Storvex."
        />

        <div className="svx-general-identity-layout">
          <div className="svx-general-logo-row">
            <div className="svx-general-logo-preview">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Business logo"
                />
              ) : (
                <span>
                  {initialsFromName(
                    form.name,
                  )}
                </span>
              )}
            </div>

            <div className="svx-general-logo-copy">
              <strong>Business logo</strong>
              <p>
                PNG, JPEG or WebP. Maximum
                3 MB.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="svx-general-hidden-input"
                disabled={
                  isReadOnly ||
                  uploadingLogo
                }
                onChange={(event) =>
                  onLogoSelected(
                    event.target.files?.[0] ||
                      null,
                  )
                }
              />

              <button
                type="button"
                className="svx-general-logo-button"
                disabled={
                  isReadOnly ||
                  uploadingLogo
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                {uploadingLogo
                  ? "Uploading..."
                  : form.logoUrl
                    ? "Change logo"
                    : "Upload logo"}
              </button>
            </div>
          </div>

          <div className="svx-general-identity-fields">
            <Field
              label="Business name"
              value={form.name}
              disabled={
                isReadOnly || saving
              }
              autoComplete="organization"
              onChange={(value) =>
                setField("name", value)
              }
            />

            <div className="svx-general-business-type">
              <span>Business type</span>
              <strong>
                {businessCategoryLabel(
                  form.shopType,
                )}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="svx-general-section">
        <SectionHeading
          title="Contact details"
          description="How customers and staff reach the business."
        />

        <div className="svx-general-grid is-two">
          <Field
            label="Email"
            type="email"
            value={form.email}
            disabled={isReadOnly || saving}
            autoComplete="email"
            onChange={(value) =>
              setField("email", value)
            }
          />

          <Field
            label="Phone"
            value={form.phone}
            disabled={isReadOnly || saving}
            autoComplete="tel"
            inputMode="tel"
            onChange={(value) =>
              setField("phone", value)
            }
          />
        </div>
      </section>

      <section className="svx-general-section">
        <SectionHeading
          title="Business location"
          description="The address used in business records."
        />

        <div className="svx-general-grid is-two">
          <Field
            label="District"
            value={form.district}
            disabled={isReadOnly || saving}
            autoComplete="address-level2"
            onChange={(value) =>
              setField("district", value)
            }
          />

          <Field
            label="Sector"
            value={form.sector}
            disabled={isReadOnly || saving}
            autoComplete="address-level3"
            onChange={(value) =>
              setField("sector", value)
            }
          />

          <Field
            label="Address"
            value={form.address}
            disabled={isReadOnly || saving}
            autoComplete="street-address"
            className="is-full"
            onChange={(value) =>
              setField("address", value)
            }
          />
        </div>
      </section>

      <section className="svx-general-section">
        <SectionHeading
          title="Regional settings"
          description="Used for money, dates and local time."
        />

        <div className="svx-general-grid is-three">
          <Field
            label="Country"
            value={form.countryCode}
            disabled={isReadOnly || saving}
            onChange={(value) =>
              setField(
                "countryCode",
                value.toUpperCase(),
              )
            }
          />

          <Field
            label="Currency"
            value={form.currencyCode}
            disabled={isReadOnly || saving}
            onChange={(value) =>
              setField(
                "currencyCode",
                value.toUpperCase(),
              )
            }
          />

          <Field
            label="Timezone"
            value={form.timezone}
            disabled={isReadOnly || saving}
            onChange={(value) =>
              setField("timezone", value)
            }
          />
        </div>
      </section>

      {dirty && !isReadOnly ? (
        <div className="svx-general-savebar">
          <div>
            <strong>Unsaved changes</strong>
            <p>
              Save to update your business
              information.
            </p>
          </div>

          <AsyncButton
            loading={saving}
            loadingText="Saving..."
            disabled={saving}
            onClick={onSave}
          >
            Save changes
          </AsyncButton>
        </div>
      ) : null}
    </div>
  );
}
