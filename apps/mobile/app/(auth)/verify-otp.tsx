import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  Pressable,
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
import {
  useSendSignupOtp,
  useVerifySignupOtp,
} from "../../src/features/onboarding/hooks";
import type {
  OtpChannel,
  SendOtpResponse,
} from "../../src/features/onboarding/types";
import { ApiError } from "../../src/lib/api/errors";
import { useThemeMode } from "../../src/lib/theme/useThemeMode";
import { useOnboardingStore } from "../../src/store/onboardingStore";

const logo = require("../../assets/images/storvex_white.webp");
const logoDark = require("../../assets/images/storvex_dark.webp");
const icon = require("../../assets/images/storvex_icon.webp");

function cleanOtp(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 6);
}

function maskEmail(email?: string | null) {
  if (!email) return "your email";
  const [name, domain] = email.split("@");

  if (!domain) return email;

  const safeName =
    name.length <= 2 ? `${name[0] ?? "*"}*` : `${name.slice(0, 2)}***`;

  return `${safeName}@${domain}`;
}

function maskPhone(phone?: string | null) {
  if (!phone) return "your phone";
  const raw = phone.replace(/[^\d]/g, "");
  if (raw.length < 6) return phone;
  return `${raw.slice(0, 4)}••••${raw.slice(-2)}`;
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
    cyanPanel: isDark ? "rgba(32, 200, 255, 0.10)" : "rgba(14, 165, 233, 0.08)",
    panel: isDark ? "rgba(255, 255, 255, 0.07)" : "#F8FAFC",
    panelStrong: isDark ? "rgba(3, 17, 31, 0.34)" : "#FFFFFF",
    panelRaised: isDark ? "rgba(255, 255, 255, 0.095)" : "#FFFFFF",
    border: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.12)",
    borderStrong: isDark
      ? "rgba(125, 211, 252, 0.22)"
      : "rgba(15, 23, 42, 0.16)",
    beamTop: isDark
      ? "rgba(32, 200, 255, 0.18)"
      : "rgba(32, 200, 255, 0.10)",
    beamBottom: isDark
      ? "rgba(37, 99, 235, 0.18)"
      : "rgba(37, 99, 235, 0.10)",
    grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)",
    dangerPanel: isDark ? "rgba(127, 29, 29, 0.22)" : "#FEF2F2",
    dangerBorder: isDark ? "rgba(248, 113, 113, 0.28)" : "#FCA5A5",
    dangerText: isDark ? "#FCA5A5" : "#B91C1C",
    successPanel: isDark ? "rgba(34,197,94,0.14)" : "#ECFDF5",
    successBorder: isDark ? "rgba(74,222,128,0.28)" : "#86EFAC",
    successText: isDark ? "#86EFAC" : "#15803D",
    warningPanel: isDark ? "rgba(251, 191, 36, 0.12)" : "#FFFBEB",
    warningBorder: isDark ? "rgba(251, 191, 36, 0.26)" : "#FDE68A",
    warningText: isDark ? "#FBBF24" : "#92400E",
    buttonText: "#06111F",
  };
}

type Palette = ReturnType<typeof createPalette>;

type OtpPanelProps = {
  channel: OtpChannel;
  title: string;
  target: string;
  code: string;
  verified: boolean;
  disabled?: boolean;
  sendLoading?: boolean;
  verifyLoading?: boolean;
  sentMessage?: string | null;
  devOtp?: string | null;
  error?: string | null;
  onCodeChange: (value: string) => void;
  onSend: () => Promise<void> | void;
  onVerify: () => Promise<void> | void;
  palette: Palette;
  width: DimensionValue;
};

function ChannelIcon({ channel, verified, palette }: { channel: OtpChannel; verified: boolean; palette: Palette }) {
  return (
    <View
      style={[
        styles.channelIcon,
        {
          borderColor: verified ? palette.successBorder : palette.borderStrong,
          backgroundColor: verified ? palette.successPanel : palette.cyanPanel,
        },
      ]}
    >
      <AppText variant="subtitle" color={verified ? palette.successText : palette.cyanSoft}>
        {verified ? "✓" : channel === "EMAIL" ? "@" : "☎"}
      </AppText>
    </View>
  );
}

function OtpDigitPreview({ code, palette }: { code: string; palette: Palette }) {
  const digits = Array.from({ length: 6 }).map((_, index) => code[index] ?? "");

  return (
    <View style={styles.digitRow}>
      {digits.map((digit, index) => {
        const active = index === code.length && code.length < 6;
        const filled = Boolean(digit);

        return (
          <View
            key={`${index}-${digit || "empty"}`}
            style={[
              styles.digitBox,
              {
                borderColor: filled || active ? palette.cyan : palette.border,
                backgroundColor: filled ? palette.cyanPanel : palette.panelStrong,
              },
            ]}
          >
            <AppText variant="label" color={filled ? palette.text : palette.soft}>
              {filled ? "•" : ""}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

function OtpPanel({
  channel,
  title,
  target,
  code,
  verified,
  disabled = false,
  sendLoading = false,
  verifyLoading = false,
  sentMessage,
  devOtp,
  error,
  onCodeChange,
  onSend,
  onVerify,
  palette,
  width,
}: OtpPanelProps) {
  const locked = disabled || verified;
  const canVerify = !disabled && code.length >= 4;

  return (
    <View
      style={[
        styles.otpPanel,
        {
          width,
          borderColor: verified ? palette.successBorder : palette.border,
          backgroundColor: verified ? palette.successPanel : palette.panel,
          opacity: disabled ? 0.58 : 1,
        },
      ]}
    >
      <View style={styles.otpPanelHeader}>
        <ChannelIcon channel={channel} verified={verified} palette={palette} />

        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <View style={styles.otpTitleRow}>
            <AppText
              variant="caption"
              color={verified ? palette.successText : palette.cyanSoft}
              style={styles.eyebrow}
            >
              {channel === "EMAIL" ? "Email check" : "Phone check"}
            </AppText>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: verified ? "#22C55E" : disabled ? "rgba(148, 163, 184, 0.22)" : "#67E8F9",
                },
              ]}
            >
              <AppText variant="caption" color={disabled ? palette.soft : "#06111F"}>
                {verified ? "Done" : disabled ? "Locked" : "Pending"}
              </AppText>
            </View>
          </View>

          <AppText variant="subtitle" color={palette.text}>
            {title}
          </AppText>

          <AppText variant="caption" color={palette.soft}>
            {verified ? "Ownership confirmed." : `Send a code to ${target}.`}
          </AppText>
        </View>
      </View>

      {disabled && !verified ? (
        <View
          style={[
            styles.infoBox,
            {
              borderColor: palette.warningBorder,
              backgroundColor: palette.warningPanel,
            },
          ]}
        >
          <AppText variant="caption" color={palette.warningText}>
            Verify email first, then phone verification unlocks.
          </AppText>
        </View>
      ) : null}

      {sentMessage ? (
        <View
          style={[
            styles.infoBox,
            {
              borderColor: palette.border,
              backgroundColor: palette.panelStrong,
            },
          ]}
        >
          <AppText variant="caption" color={palette.soft}>
            {sentMessage}
          </AppText>
        </View>
      ) : null}

      {devOtp ? (
        <View
          style={[
            styles.devBox,
            {
              borderColor: palette.borderStrong,
              backgroundColor: palette.panelStrong,
            },
          ]}
        >
          <AppText variant="caption" color={palette.cyanSoft}>
            Dev OTP: {devOtp}
          </AppText>
        </View>
      ) : null}

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              borderColor: palette.dangerBorder,
              backgroundColor: palette.dangerPanel,
            },
          ]}
        >
          <AppText variant="caption" color={palette.dangerText}>
            {error}
          </AppText>
        </View>
      ) : null}

      {!verified ? (
        <View style={styles.otpActions}>
          <OtpDigitPreview code={code} palette={palette} />

          <AppTextInput
            label="Verification code"
            placeholder="Enter 6-digit code"
            value={code}
            onChangeText={(value) => onCodeChange(cleanOtp(value))}
            keyboardType="number-pad"
            editable={!locked}
            maxLength={6}
          />

          <View style={styles.otpButtonRow}>
            <AsyncButton
              onPress={onSend}
              variant="secondary"
              disabled={disabled || sendLoading}
              style={[
                styles.otpSmallButton,
                {
                  backgroundColor: palette.panelStrong,
                  borderColor: palette.border,
                  borderRadius: 0,
                },
              ]}
            >
              {sendLoading ? "Sending..." : sentMessage ? "Send again" : "Send code"}
            </AsyncButton>

            <AsyncButton
              onPress={onVerify}
              disabled={!canVerify || verifyLoading}
              style={styles.otpSmallButton}
            >
              {verifyLoading ? "Checking..." : "Verify"}
            </AsyncButton>
          </View>
        </View>
      ) : (
        <View style={styles.verifiedRow}>
          <View style={styles.verifiedMark}>
            <AppText variant="caption" color="#06111F">
              ✓
            </AppText>
          </View>
          <AppText variant="caption" color={palette.successText}>
            {title} verified successfully.
          </AppText>
        </View>
      )}
    </View>
  );
}

function StepRail({ palette, emailVerified, phoneVerified }: { palette: Palette; emailVerified: boolean; phoneVerified: boolean }) {
  const steps = [
    { label: "Intent", done: true },
    { label: "Email", done: emailVerified },
    { label: "Phone", done: phoneVerified },
    { label: "Access", done: false },
  ];

  return (
    <View
      style={[
        styles.stepRail,
        {
          borderColor: palette.border,
          backgroundColor: palette.panel,
        },
      ]}
    >
      {steps.map((step, index) => (
        <View key={step.label} style={styles.stepRailItem}>
          <View
            style={[
              styles.stepRailMark,
              {
                backgroundColor: step.done ? palette.cyan : palette.panelStrong,
                borderColor: step.done ? palette.cyan : palette.border,
              },
            ]}
          >
            <AppText variant="caption" color={step.done ? palette.buttonText : palette.soft}>
              {step.done ? "✓" : index + 1}
            </AppText>
          </View>

          <AppText variant="caption" color={step.done ? palette.cyanSoft : palette.soft}>
            {step.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function MissingSignupSession({
  palette,
  isDark,
  isTablet,
}: {
  palette: Palette;
  isDark: boolean;
  isTablet: boolean;
}) {
  return (
    <AppScreen
      scroll={false}
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
            paddingHorizontal: isTablet ? 40 : 20,
            paddingVertical: isTablet ? 30 : 18,
          },
        ]}
      >
        <View
          style={[
            styles.missingStage,
            {
              maxWidth: isTablet ? 540 : 420,
              backgroundColor: palette.stage,
              borderColor: palette.border,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.backgroundBeamTop,
              { backgroundColor: palette.beamTop },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.backgroundBeamBottom,
              { backgroundColor: palette.beamBottom },
            ]}
          />
          <View style={[styles.gridLineOne, { backgroundColor: palette.grid }]} />
          <View style={[styles.gridLineThree, { backgroundColor: palette.grid }]} />

          <View style={styles.missingHeader}>
            <Image
              source={isDark ? logo : logoDark}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemeToggle />
          </View>

          <View style={styles.missingBody}>
            <View style={styles.missingTopRow}>
              <View style={styles.missingIconWrap}>
                <View style={styles.missingIconGlow} />
                <View style={styles.missingIcon}>
                  <Image
                    source={icon}
                    style={styles.missingIconImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={styles.missingTitleWrap}>
                <View style={styles.kickerRow}>
                  <View style={styles.kickerDot} />
                  <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                    Signup session
                  </AppText>
                </View>

                <AppText variant="title" color={palette.text}>
                  Start with business intent.
                </AppText>

                <AppText variant="caption" color={palette.soft}>
                  OTP needs the owner and business details from the first step.
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.missingSummary,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panel,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <View style={styles.summaryIndex}>
                  <AppText variant="caption" color="#06111F">
                    1
                  </AppText>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>
                    Create business intent
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    Add business name, owner name, email, and phone.
                  </AppText>
                </View>
              </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: palette.border },
                ]}
              />

              <View style={styles.summaryRow}>
                <View style={styles.summaryIndex}>
                  <AppText variant="caption" color="#06111F">
                    2
                  </AppText>
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="label" color={palette.text}>
                    Verify ownership
                  </AppText>
                  <AppText variant="caption" color={palette.soft}>
                    Then confirm both email and phone ownership.
                  </AppText>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.recoveryNote,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panelStrong,
                },
              ]}
            >
              <View style={styles.recoveryMark}>
                <AppText variant="caption" color="#06111F">
                  !
                </AppText>
              </View>

              <AppText variant="caption" color={palette.soft}>
                This can happen after refreshing, clearing the app, or opening the OTP page directly.
              </AppText>
            </View>

            <View style={styles.actions}>
              <AppButton
                fullWidth
                onPress={() => router.replace(routes.businessIntent)}
                style={styles.primaryButton}
              >
                Create business intent
              </AppButton>

              <AppButton
                fullWidth
                variant="secondary"
                onPress={() => router.replace(routes.landing)}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.055)"
                      : "#FFFFFF",
                    borderColor: palette.border,
                  },
                ]}
              >
                Back to landing
              </AppButton>
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

export default function VerifyOtpScreen() {
  const { resolvedMode } = useThemeMode();
  const { width, height } = useWindowDimensions();

  const isDark = resolvedMode === "dark";
  const palette = useMemo(() => createPalette(isDark), [isDark]);

  const isTablet = width >= 768;
  const compact = height < 760;
  const wideOtpCards = width >= 760;
  const otpWidth = (wideOtpCards ? "48.7%" : "100%") as DimensionValue;

  const intentId = useOnboardingStore((state) => state.intentId);
  const intent = useOnboardingStore((state) => state.intent);
  const emailVerified = useOnboardingStore((state) => state.emailVerified);
  const phoneVerified = useOnboardingStore((state) => state.phoneVerified);
  const setOtpStatus = useOnboardingStore((state) => state.setOtpStatus);

  const sendOtp = useSendSignupOtp();
  const verifyOtp = useVerifySignupOtp();

  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  const [emailSend, setEmailSend] = useState<SendOtpResponse | null>(null);
  const [phoneSend, setPhoneSend] = useState<SendOtpResponse | null>(null);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  const canContinue = emailVerified && phoneVerified;

  async function handleSend(channel: OtpChannel) {
    if (!intentId) return;

    if (channel === "EMAIL") setEmailError(null);
    if (channel === "PHONE") setPhoneError(null);

    try {
      const response = await sendOtp.mutateAsync({
        intentId,
        channel,
      });

      setOtpStatus({
        emailVerified: response.emailVerified,
        phoneVerified: response.phoneVerified,
      });

      if (channel === "EMAIL") {
        setEmailSend(response);
      } else {
        setPhoneSend(response);
      }
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (channel === "EMAIL") setEmailError(message);
      if (channel === "PHONE") setPhoneError(message);
    }
  }

  async function handleVerify(channel: OtpChannel) {
    if (!intentId) return;

    Keyboard.dismiss();

    if (channel === "EMAIL") setEmailError(null);
    if (channel === "PHONE") setPhoneError(null);

    const code = channel === "EMAIL" ? emailCode : phoneCode;

    try {
      const response = await verifyOtp.mutateAsync({
        intentId,
        channel,
        code,
      });

      setOtpStatus({
        emailVerified: response.emailVerified,
        phoneVerified: response.phoneVerified,
      });

      if (channel === "EMAIL") setEmailCode("");
      if (channel === "PHONE") setPhoneCode("");
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (channel === "EMAIL") setEmailError(message);
      if (channel === "PHONE") setPhoneError(message);
    }
  }

  function handleContinue() {
    setScreenError(null);

    if (!canContinue) {
      setScreenError("Verify both email and phone before choosing access.");
      return;
    }

    router.push(routes.choosePath);
  }

  if (!intentId || !intent) {
    return (
      <MissingSignupSession
        palette={palette}
        isDark={isDark}
        isTablet={isTablet}
      />
    );
  }

  return (
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
            paddingHorizontal: isTablet ? 40 : 20,
            paddingTop: isTablet ? 30 : 18,
            paddingBottom: isTablet ? 30 : 18,
          },
        ]}
      >
        <View
          style={[
            styles.stage,
            {
              maxWidth: isTablet ? 720 : 440,
              minHeight: compact ? 720 : 790,
              backgroundColor: palette.stage,
              borderColor: palette.border,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.backgroundBeamTop,
              { backgroundColor: palette.beamTop },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.backgroundBeamBottom,
              { backgroundColor: palette.beamBottom },
            ]}
          />
          <View style={[styles.gridLineOne, { backgroundColor: palette.grid }]} />
          <View style={[styles.gridLineTwo, { backgroundColor: palette.grid }]} />
          <View style={[styles.gridLineThree, { backgroundColor: palette.grid }]} />

          <View style={styles.header}>
            <Image
              source={isDark ? logo : logoDark}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.headerActions}>
              <ThemeToggle />

              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  {
                    borderColor: palette.borderStrong,
                    backgroundColor: isDark
                      ? "rgba(14, 165, 233, 0.10)"
                      : "rgba(2, 6, 23, 0.05)",
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={isDark ? "#D7F8FF" : "#06111F"}
                >
                  Back
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.titleBlock}>
              <View style={styles.kickerRow}>
                <View style={styles.kickerDot} />
                <AppText variant="caption" color={palette.cyanSoft} style={styles.eyebrow}>
                  Verify ownership
                </AppText>
              </View>

              <AppText variant="display" color={palette.text}>
                Protect the owner account.
              </AppText>

              <AppText variant="muted" color={palette.muted}>
                Confirm both owner contact points before Storvex creates the business workspace.
              </AppText>
            </View>

            <StepRail
              palette={palette}
              emailVerified={emailVerified}
              phoneVerified={phoneVerified}
            />

            <View
              style={[
                styles.progressStrip,
                {
                  borderColor: canContinue ? palette.successBorder : palette.border,
                  backgroundColor: canContinue ? palette.successPanel : palette.panel,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="caption" color={canContinue ? palette.successText : palette.cyanSoft} style={styles.eyebrow}>
                  Step 2 of 6
                </AppText>
                <AppText variant="label" color={palette.text}>
                  {canContinue ? "Verification complete" : "Email and phone confirmation"}
                </AppText>
              </View>

              <View style={[styles.progressBadge, { backgroundColor: canContinue ? "#22C55E" : "#67E8F9" }]}> 
                <AppText variant="caption" color="#06111F">
                  {(emailVerified ? 1 : 0) + (phoneVerified ? 1 : 0)}/2 done
                </AppText>
              </View>
            </View>

            {screenError ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    borderColor: palette.dangerBorder,
                    backgroundColor: palette.dangerPanel,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.dangerText}>
                  {screenError}
                </AppText>
              </View>
            ) : null}

            <View style={styles.otpGrid}>
              <OtpPanel
                channel="EMAIL"
                title="Verify email"
                target={maskEmail(intent.email)}
                code={emailCode}
                verified={emailVerified}
                sendLoading={sendOtp.isPending}
                verifyLoading={verifyOtp.isPending}
                sentMessage={emailSend?.message ?? null}
                devOtp={emailSend?.devOtp ?? null}
                error={emailError}
                onCodeChange={setEmailCode}
                onSend={() => handleSend("EMAIL")}
                onVerify={() => handleVerify("EMAIL")}
                palette={palette}
                width={otpWidth}
              />

              <OtpPanel
                channel="PHONE"
                title="Verify phone"
                target={maskPhone(intent.phone)}
                code={phoneCode}
                verified={phoneVerified}
                disabled={!emailVerified}
                sendLoading={sendOtp.isPending}
                verifyLoading={verifyOtp.isPending}
                sentMessage={phoneSend?.message ?? null}
                devOtp={phoneSend?.devOtp ?? null}
                error={phoneError}
                onCodeChange={setPhoneCode}
                onSend={() => handleSend("PHONE")}
                onVerify={() => handleVerify("PHONE")}
                palette={palette}
                width={otpWidth}
              />
            </View>

            <View
              style={[
                styles.ownerNote,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.panelStrong,
                },
              ]}
            >
              <View style={styles.ownerNoteMark}>
                <AppText variant="caption" color="#06111F">
                  ✓
                </AppText>
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <AppText variant="label" color={palette.text}>
                  Owner-first protection
                </AppText>
                <AppText variant="caption" color={palette.soft}>
                  The workspace opens only after both contacts are verified.
                </AppText>
              </View>
            </View>

            <View style={styles.actions}>
              <AppButton
                fullWidth
                onPress={handleContinue}
                disabled={!canContinue}
                style={[
                  styles.primaryButton,
                  {
                    opacity: canContinue ? 1 : 0.55,
                  },
                ]}
              >
                Continue to access choice
              </AppButton>

              <AppButton
                fullWidth
                variant="secondary"
                onPress={() => router.push(routes.businessIntent)}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.055)"
                      : "#FFFFFF",
                    borderColor: palette.border,
                  },
                ]}
              >
                Edit business details
              </AppButton>
            </View>
          </View>
        </View>
      </View>
    </AppScreen>
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
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },

  missingStage: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
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

  missingHeader: {
    minHeight: 42,
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
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  content: {
    paddingTop: 38,
    gap: 18,
    zIndex: 2,
  },

  missingBody: {
    paddingTop: 24,
    gap: 16,
    zIndex: 2,
  },

  missingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  missingIconWrap: {
    width: 74,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
  },

  missingIconGlow: {
    position: "absolute",
    width: 74,
    height: 74,
    backgroundColor: "rgba(32, 200, 255, 0.14)",
    transform: [{ rotate: "10deg" }],
  },

  missingIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    shadowColor: "#20C8FF",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },

  missingIconImage: {
    width: 40,
    height: 40,
  },

  missingTitleWrap: {
    flex: 1,
    gap: 7,
  },

  missingSummary: {
    borderWidth: 1,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
    padding: 13,
  },

  summaryIndex: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  summaryDivider: {
    height: 1,
  },

  recoveryNote: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  recoveryMark: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  titleBlock: {
    gap: 12,
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

  stepRail: {
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },

  stepRailItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },

  stepRailMark: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  progressStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    borderWidth: 1,
    padding: 14,
  },

  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  otpGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  otpPanel: {
    borderWidth: 1,
    padding: 15,
    gap: 13,
  },

  otpPanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  channelIcon: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  otpTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  digitRow: {
    flexDirection: "row",
    gap: 7,
  },

  digitBox: {
    flex: 1,
    minWidth: 32,
    height: 38,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  infoBox: {
    borderWidth: 1,
    padding: 12,
  },

  devBox: {
    borderWidth: 1,
    padding: 12,
  },

  errorBox: {
    borderWidth: 1,
    padding: 12,
  },

  otpActions: {
    gap: 12,
  },

  otpButtonRow: {
    flexDirection: "row",
    gap: 10,
  },

  otpSmallButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 0,
  },

  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  verifiedMark: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
  },

  ownerNote: {
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },

  ownerNoteMark: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#67E8F9",
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
});
