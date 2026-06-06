import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";

import { AppButton } from "../../src/components/ui/AppButton";
import { AppScreen } from "../../src/components/ui/AppScreen";
import { AppText } from "../../src/components/ui/AppText";
import { AppTextInput } from "../../src/components/ui/AppTextInput";
import { AsyncButton } from "../../src/components/ui/AsyncButton";
import { ThemeToggle } from "../../src/components/ui/ThemeToggle";
import { routes } from "../../src/constants/routes";
import { useCreateOwnerIntent } from "../../src/features/onboarding/hooks";
import { ApiError } from "../../src/lib/api/errors";
import { useThemeMode } from "../../src/lib/theme/useThemeMode";
import { useOnboardingStore } from "../../src/store/onboardingStore";

const logo = require("../../assets/images/storvex_white.webp");
const logoDark = require("../../assets/images/storvex_dark.webp");

type IoniconName = keyof typeof Ionicons.glyphMap;
type FieldKey = "storeName" | "ownerName" | "email" | "phone";

type FieldErrors = {
  storeName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
};

type BusinessField = {
  key: FieldKey;
  label: string;
  helper: string;
  placeholder: string;
  icon: IoniconName;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
};

const businessTypes = [
  "Electronics retail",
  "Phones and accessories",
  "Computer and laptop shop",
  "Phone repair and accessories",
  "Electronics repair shop",
  "Gaming and electronics",
  "Appliances and electronics",
  "Wholesale electronics",
  "Mixed electronics store",
];

const requiredFields: BusinessField[] = [
  {
    key: "storeName",
    label: "Business",
    helper: "The name customers know.",
    placeholder: "Kigali Tech Store",
    icon: "storefront-outline",
    autoCapitalize: "words",
  },
  {
    key: "ownerName",
    label: "Owner",
    helper: "Main person in control.",
    placeholder: "Luc Rurangwa",
    icon: "person-outline",
    autoCapitalize: "words",
  },
  {
    key: "email",
    label: "Email",
    helper: "Used for OTP and access.",
    placeholder: "owner@example.com",
    icon: "mail-outline",
    keyboardType: "email-address",
    autoCapitalize: "none",
    autoCorrect: false,
  },
  {
    key: "phone",
    label: "Phone",
    helper: "Rwanda phone number.",
    placeholder: "07XXXXXXXX",
    icon: "call-outline",
    keyboardType: "phone-pad",
  },
];

function normalizePhone(value: string) {
  return value.trim().replace(/[^\d]/g, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

function isValidRwandaPhone(value: string) {
  const cleaned = normalizePhone(value);
  return /^07\d{8}$/.test(cleaned) || /^2507\d{8}$/.test(cleaned);
}

function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function createPalette(isDark: boolean) {
  return {
    isDark,
    page: isDark ? "#06111F" : "#F4F7FB",
    stage: isDark ? "#06111F" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#06111F",
    muted: isDark ? "#AFC1D6" : "#516173",
    soft: isDark ? "#9FB2C8" : "#64748B",
    cyan: "#20C8FF",
    cyanSoft: isDark ? "#67E8F9" : "#0369A1",
    cyanPale: isDark ? "rgba(32, 200, 255, 0.12)" : "rgba(6, 182, 212, 0.09)",
    green: "#22C55E",
    amber: isDark ? "#FBBF24" : "#B45309",
    panel: isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC",
    panelStrong: isDark ? "rgba(255, 255, 255, 0.10)" : "#FFFFFF",
    inputBg: isDark ? "rgba(3, 17, 31, 0.72)" : "rgba(255,255,255,0.92)",
    border: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.12)",
    borderStrong: isDark ? "rgba(125, 211, 252, 0.24)" : "rgba(14, 165, 233, 0.28)",
    beamTop: isDark ? "rgba(32, 200, 255, 0.18)" : "rgba(32, 200, 255, 0.10)",
    beamBottom: isDark ? "rgba(37, 99, 235, 0.16)" : "rgba(37, 99, 235, 0.08)",
    grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)",
    dangerPanel: isDark ? "rgba(127, 29, 29, 0.22)" : "#FEF2F2",
    dangerBorder: isDark ? "rgba(248, 113, 113, 0.28)" : "#FCA5A5",
    dangerText: isDark ? "#FCA5A5" : "#B91C1C",
    buttonText: "#06111F",
    shadow: isDark ? "#000000" : "#0F172A",
  };
}

type Palette = ReturnType<typeof createPalette>;

type FormState = {
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
};

function inputWidth(twoColumn: boolean): DimensionValue {
  return twoColumn ? ("48.5%" as DimensionValue) : ("100%" as DimensionValue);
}

function BusinessInfoCard({
  field,
  value,
  error,
  palette,
  width,
  onChangeText,
}: {
  field: BusinessField;
  value: string;
  error?: string;
  palette: Palette;
  width: DimensionValue;
  onChangeText: (value: string) => void;
}) {
  const hasValue = value.trim().length > 0;
  const hasError = Boolean(error);

  return (
    <View
      style={[
        styles.infoCard,
        {
          width,
          borderColor: hasError
            ? palette.dangerBorder
            : hasValue
              ? palette.borderStrong
              : palette.border,
          backgroundColor: hasError ? palette.dangerPanel : palette.panelStrong,
        },
      ]}
    >
      <View style={styles.infoCardHeader}>
        <View
          style={[
            styles.infoIcon,
            {
              backgroundColor: hasValue ? palette.cyan : palette.cyanPale,
              borderColor: hasValue ? palette.cyan : palette.borderStrong,
            },
          ]}
        >
          <Ionicons
            name={field.icon}
            size={17}
            color={hasValue ? palette.buttonText : palette.cyanSoft}
          />
        </View>

        <View style={styles.infoTitleWrap}>
          <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
            {field.label}
          </AppText>
          <AppText variant="caption" color={palette.soft} numberOfLines={1}>
            {field.helper}
          </AppText>
        </View>
      </View>

      <AppTextInput
        label=""
        placeholder={field.placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={field.keyboardType || "default"}
        autoCapitalize={field.autoCapitalize || "sentences"}
        autoCorrect={field.autoCorrect}
        error={error}
        style={[
          styles.embeddedInput,
          {
            backgroundColor: palette.inputBg,
            borderColor: hasError ? palette.dangerBorder : palette.border,
          },
        ]}
      />
    </View>
  );
}

function AssuranceCard({
  icon,
  title,
  detail,
  palette,
}: {
  icon: IoniconName;
  title: string;
  detail: string;
  palette: Palette;
}) {
  return (
    <View style={[styles.assuranceCard, { borderColor: palette.border, backgroundColor: palette.panelStrong }]}> 
      <View style={[styles.assuranceIcon, { backgroundColor: palette.cyanPale, borderColor: palette.borderStrong }]}> 
        <Ionicons name={icon} size={16} color={palette.cyanSoft} />
      </View>
      <View style={styles.assuranceText}>
        <AppText variant="label" color={palette.text}>
          {title}
        </AppText>
        <AppText variant="caption" color={palette.soft} style={styles.cardText}>
          {detail}
        </AppText>
      </View>
    </View>
  );
}

export default function BusinessIntentScreen() {
  const { resolvedMode } = useThemeMode();
  const { width, height } = useWindowDimensions();

  const isDark = resolvedMode === "dark";
  const isTablet = width >= 768;
  const compact = height < 760;
  const narrow = width < 390;
  const tiny = width < 360;
  const useTwoColumnIdentity = width >= 380;

  const palette = useMemo(() => createPalette(isDark), [isDark]);
  const createIntent = useCreateOwnerIntent();
  const setOwnerIntent = useOnboardingStore((state) => state.setOwnerIntent);

  const [form, setForm] = useState<FormState>({
    storeName: "",
    ownerName: "",
    email: "",
    phone: "",
  });

  const [shopType, setShopType] = useState("Electronics retail");
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [district, setDistrict] = useState("");
  const [sector, setSector] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const completion = useMemo(() => {
    const completed = [form.storeName, form.ownerName, form.email, form.phone].filter((value) =>
      value.trim(),
    ).length;

    return { completed, label: `${completed}/4 ready`, percent: `${Math.max(8, completed * 25)}%` };
  }, [form]);

  function setField(key: FieldKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const nextErrors: FieldErrors = {};

    if (!form.storeName.trim()) nextErrors.storeName = "Business name is required.";
    if (!form.ownerName.trim()) nextErrors.ownerName = "Owner name is required.";

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else if (!isValidRwandaPhone(form.phone)) {
      nextErrors.phone = "Use 07XXXXXXXX or 2507XXXXXXXX.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleContinue() {
    Keyboard.dismiss();
    setFormError(null);

    if (!validate()) return;

    try {
      const response = await createIntent.mutateAsync({
        storeName: form.storeName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        shopType,
        district: district.trim() || null,
        sector: sector.trim() || null,
        mode: "TRIAL",
      });

      setOwnerIntent({
        intentId: response.intentId,
        intent: response.intent,
      });

      router.push(routes.verifyOtp);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  return (
    <>
      <AppScreen
        scroll
        padded={false}
        contentStyle={{
          flexGrow: 1,
          backgroundColor: palette.page,
        }}
      >
        <View
          style={[
            styles.page,
            {
              paddingHorizontal: isTablet ? 40 : tiny ? 12 : 18,
              paddingTop: isTablet ? 30 : 16,
              paddingBottom: isTablet ? 30 : 16,
            },
          ]}
        >
          <View
            style={[
              styles.stage,
              {
                maxWidth: isTablet ? 650 : 460,
                minHeight: compact ? 720 : 790,
                backgroundColor: palette.stage,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                paddingHorizontal: tiny ? 14 : 20,
              },
            ]}
          >
            <View pointerEvents="none" style={[styles.backgroundBeamTop, { backgroundColor: palette.beamTop }]} />
            <View pointerEvents="none" style={[styles.backgroundBeamBottom, { backgroundColor: palette.beamBottom }]} />
            <View pointerEvents="none" style={[styles.gridLineOne, { backgroundColor: palette.grid }]} />
            <View pointerEvents="none" style={[styles.gridLineTwo, { backgroundColor: palette.grid }]} />
            <View pointerEvents="none" style={[styles.gridLineThree, { backgroundColor: palette.grid }]} />

            <View style={styles.header}>
              <Image source={isDark ? logo : logoDark} style={styles.logo} resizeMode="contain" />

              <View style={styles.headerActions}>
                <ThemeToggle />

                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.backButton,
                    {
                      borderColor: palette.borderStrong,
                      backgroundColor: isDark ? "rgba(14, 165, 233, 0.10)" : "rgba(2, 6, 23, 0.05)",
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons name="arrow-back-outline" size={14} color={isDark ? "#D7F8FF" : "#06111F"} />
                  {!narrow ? (
                    <AppText variant="caption" color={isDark ? "#D7F8FF" : "#06111F"}>
                      Back
                    </AppText>
                  ) : null}
                </Pressable>
              </View>
            </View>

            <View style={[styles.content, compact ? styles.contentCompact : null]}>
              <View style={styles.titleBlock}>
                <View style={styles.kickerRow}>
                  <View style={styles.kickerDot} />
                  <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                    Business intent
                  </AppText>
                </View>

                <AppText variant="display" color={palette.text} style={tiny ? styles.titleTiny : null}>
                  Create the owner workspace.
                </AppText>

                <AppText variant="muted" color={palette.muted} style={styles.cardText}>
                  Add the owner and business details first. Storvex opens the workspace only after OTP verification and final confirmation.
                </AppText>
              </View>

              <View style={[styles.progressPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                <View style={styles.progressTopRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                      Step 1 of 6
                    </AppText>
                    <AppText variant="label" color={palette.text}>
                      Owner and business details
                    </AppText>
                  </View>

                  <View style={[styles.progressBadge, { backgroundColor: palette.cyan }]}> 
                    <AppText variant="caption" color={palette.buttonText}>
                      {completion.label}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: palette.border }]}> 
                  <View style={[styles.progressFill, { width: completion.percent as DimensionValue, backgroundColor: palette.cyan }]} />
                </View>
              </View>

              <View style={[styles.formPanel, { borderColor: palette.border, backgroundColor: palette.panel }]}> 
                {formError ? (
                  <View
                    style={[
                      styles.formError,
                      {
                        backgroundColor: palette.dangerPanel,
                        borderColor: palette.dangerBorder,
                      },
                    ]}
                  >
                    <Ionicons name="alert-circle-outline" size={16} color={palette.dangerText} />
                    <AppText variant="caption" color={palette.dangerText} style={{ flex: 1 }}>
                      {formError}
                    </AppText>
                  </View>
                ) : null}

                <View style={styles.panelHeaderRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                      Required setup
                    </AppText>
                    <AppText variant="subtitle" color={palette.text}>
                      Four details to protect the owner account.
                    </AppText>
                  </View>

                  <View style={[styles.securePill, { borderColor: palette.borderStrong, backgroundColor: palette.cyanPale }]}> 
                    <Ionicons name="shield-checkmark-outline" size={14} color={palette.cyanSoft} />
                    <AppText variant="caption" color={palette.cyanSoft}>
                      Secure
                    </AppText>
                  </View>
                </View>

                <View style={styles.identityGrid}>
                  {requiredFields.map((field) => (
                    <BusinessInfoCard
                      key={field.key}
                      field={field}
                      value={form[field.key]}
                      error={errors[field.key]}
                      palette={palette}
                      width={inputWidth(useTwoColumnIdentity)}
                      onChangeText={(value) => setField(field.key, value)}
                    />
                  ))}
                </View>

                <View style={styles.sectionDivider}>
                  <View style={[styles.optionalLine, { backgroundColor: palette.border }]} />
                  <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                    Business type
                  </AppText>
                  <View style={[styles.optionalLine, { backgroundColor: palette.border }]} />
                </View>

                <Pressable
                  onPress={() => setBusinessTypeOpen(true)}
                  style={({ pressed }) => [
                    styles.dropdownButton,
                    {
                      borderColor: palette.borderStrong,
                      backgroundColor: palette.panelStrong,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <View style={[styles.dropdownIconLeft, { backgroundColor: palette.cyanPale, borderColor: palette.borderStrong }]}> 
                    <Ionicons name="hardware-chip-outline" size={18} color={palette.cyanSoft} />
                  </View>

                  <View style={styles.dropdownContent}>
                    <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                      Selected type
                    </AppText>
                    <AppText variant="label" color={palette.text}>
                      {shopType}
                    </AppText>
                  </View>

                  <View style={[styles.dropdownIcon, { backgroundColor: palette.cyan }]}> 
                    <Ionicons name="chevron-down-outline" size={16} color={palette.buttonText} />
                  </View>
                </Pressable>

                <View style={styles.sectionDivider}>
                  <View style={[styles.optionalLine, { backgroundColor: palette.border }]} />
                  <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                    Optional location
                  </AppText>
                  <View style={[styles.optionalLine, { backgroundColor: palette.border }]} />
                </View>

                <View style={[styles.twoColumnFields, narrow ? styles.twoColumnFieldsNarrow : null]}>
                  <View style={styles.twoColumnItem}>
                    <AppTextInput
                      label="District"
                      placeholder="Nyarugenge"
                      value={district}
                      onChangeText={setDistrict}
                      autoCapitalize="words"
                      style={[styles.locationInput, { backgroundColor: palette.inputBg, borderColor: palette.border }]}
                    />
                  </View>

                  <View style={styles.twoColumnItem}>
                    <AppTextInput
                      label="Sector"
                      placeholder="Nyarugenge"
                      value={sector}
                      onChangeText={setSector}
                      autoCapitalize="words"
                      style={[styles.locationInput, { backgroundColor: palette.inputBg, borderColor: palette.border }]}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.assuranceGrid}>
                <AssuranceCard
                  icon="business-outline"
                  title="No business opened yet"
                  detail="This step only prepares verification."
                  palette={palette}
                />
                <AssuranceCard
                  icon="lock-closed-outline"
                  title="Owner protected"
                  detail="Email and phone OTP come next."
                  palette={palette}
                />
              </View>

              <View style={styles.actions}>
                <AsyncButton fullWidth onPress={handleContinue} style={styles.primaryButton}>
                  Continue to OTP
                </AsyncButton>

                <AppButton
                  fullWidth
                  variant="secondary"
                  onPress={() => router.push(routes.login)}
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.055)" : "#FFFFFF",
                      borderColor: palette.border,
                    },
                  ]}
                >
                  I already have a workspace
                </AppButton>
              </View>
            </View>
          </View>
        </View>
      </AppScreen>

      <Modal
        visible={businessTypeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBusinessTypeOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBusinessTypeOpen(false)}>
          <Pressable
            style={[
              styles.dropdownPanel,
              {
                backgroundColor: palette.stage,
                borderColor: palette.borderStrong,
                maxWidth: isTablet ? 520 : 390,
              },
            ]}
          >
            <View style={styles.dropdownPanelHeader}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                  Business type
                </AppText>
                <AppText variant="subtitle" color={palette.text}>
                  Choose the closest match
                </AppText>
              </View>

              <Pressable
                onPress={() => setBusinessTypeOpen(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    borderColor: palette.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="close-outline" size={18} color={palette.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.dropdownOptions}>
                {businessTypes.map((type) => {
                  const selected = shopType === type;

                  return (
                    <Pressable
                      key={type}
                      onPress={() => {
                        setShopType(type);
                        setBusinessTypeOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownOption,
                        {
                          borderColor: selected ? "rgba(103, 232, 249, 0.55)" : palette.border,
                          backgroundColor: selected ? "rgba(14, 165, 233, 0.18)" : palette.panel,
                          opacity: pressed ? 0.78 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.optionMark,
                          {
                            backgroundColor: selected ? "#67E8F9" : "rgba(148, 163, 184, 0.35)",
                          },
                        ]}
                      >
                        {selected ? <Ionicons name="checkmark-outline" size={13} color="#06111F" /> : null}
                      </View>

                      <AppText variant="label" color={selected ? palette.text : palette.muted}>
                        {type}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stage: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    paddingTop: 20,
    paddingBottom: 20,
    shadowOpacity: 0.34,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },

  backgroundBeamTop: {
    position: "absolute",
    top: -130,
    right: -90,
    width: 270,
    height: 270,
    transform: [{ rotate: "18deg" }],
  },

  backgroundBeamBottom: {
    position: "absolute",
    left: -120,
    bottom: 118,
    width: 240,
    height: 240,
    transform: [{ rotate: "-24deg" }],
  },

  gridLineOne: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 98,
    height: 1,
  },

  gridLineTwo: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 308,
    height: 1,
  },

  gridLineThree: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 82,
    width: 1,
  },

  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    zIndex: 2,
  },

  logo: {
    width: 126,
    height: 34,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  backButton: {
    minHeight: 36,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  content: {
    paddingTop: 34,
    gap: 18,
    zIndex: 2,
  },

  contentCompact: {
    paddingTop: 28,
    gap: 15,
  },

  titleBlock: {
    gap: 12,
  },

  titleTiny: {
    fontSize: 28,
    lineHeight: 35,
  },

  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  kickerDot: {
    width: 7,
    height: 7,
    backgroundColor: "#22C55E",
  },

  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  progressPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  progressTrack: {
    height: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: 4,
  },

  formPanel: {
    borderWidth: 1,
    padding: 14,
    gap: 15,
  },

  formError: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  panelHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  securePill: {
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  identityGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  infoCard: {
    minHeight: 136,
    borderWidth: 1,
    padding: 11,
    gap: 10,
  },

  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  infoTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  embeddedInput: {
    minHeight: 46,
    borderRadius: 0,
  },

  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  optionalLine: {
    flex: 1,
    height: 1,
  },

  dropdownButton: {
    minHeight: 66,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  dropdownIconLeft: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownContent: {
    flex: 1,
    gap: 4,
  },

  dropdownIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  twoColumnFields: {
    flexDirection: "row",
    gap: 10,
  },

  twoColumnFieldsNarrow: {
    flexDirection: "column",
  },

  twoColumnItem: {
    flex: 1,
  },

  locationInput: {
    borderRadius: 0,
  },

  assuranceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  assuranceCard: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },

  assuranceIcon: {
    width: 30,
    height: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  assuranceText: {
    flex: 1,
    gap: 3,
  },

  actions: {
    gap: 12,
  },

  primaryButton: {
    minHeight: 60,
    backgroundColor: "#20C8FF",
    borderColor: "#20C8FF",
    borderRadius: 8,
  },

  secondaryButton: {
    minHeight: 56,
    borderRadius: 0,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownPanel: {
    width: "100%",
    maxHeight: "78%",
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 20 },
    elevation: 16,
  },

  dropdownPanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 16,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownOptions: {
    gap: 10,
  },

  dropdownOption: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  optionMark: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  cardText: {
    lineHeight: 20,
  },
});
