// frontend-stores/src/pages/settings/SettingsSecurity.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  changeMyPassword,
  getSecurityLoginEvents,
  getSecurityOverview,
  getSecuritySessions,
  revokeSecuritySession,
  revokeOtherSecuritySessions,
} from "../../services/securityApi";

const INITIAL_SESSIONS_VISIBLE = 3;
const INITIAL_LOGIN_EVENTS_VISIBLE = 5;
const LOAD_MORE_STEP = 5;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-muted)]";
}

function pageCard() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function successBadge() {
  return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
}

function infoBadge() {
  return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
}

function warningBadge() {
  return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
}

function processBadge() {
  return "bg-violet-500/10 text-violet-600 dark:text-violet-300";
}

function neutralBadge() {
  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function fieldLabel() {
  return "mb-1.5 block text-sm font-black text-[var(--color-text)]";
}

function inputClass() {
  return "app-input";
}

function formatDateTime(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeAgo(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const diff = Date.now() - d.getTime();

  if (diff < 60 * 1000) return "Just now";

  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h2
        className={cx(
          "mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.9rem]",
          strongText(),
        )}
      >
        {title}
      </h2>

      {subtitle ? (
        <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-300"
        : tone === "danger"
          ? "text-[var(--color-danger)]"
          : strongText();

  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-[var(--color-danger)]"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative min-h-[132px] overflow-hidden p-5 sm:p-6")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />

      <div className="pl-2">
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        <div className={cx("mt-2 text-[1.65rem] font-black tracking-[-0.04em]", toneClass)}>
          {value}
        </div>

        {note ? (
          <div className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>{note}</div>
        ) : null}
      </div>
    </article>
  );
}

function InfoStat({ label, value, sub }) {
  return (
    <div className={cx(softPanel(), "p-4")}>
      <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>

      <div className={cx("mt-2 text-sm font-black leading-6", strongText())}>{value || "—"}</div>

      {sub ? <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>{sub}</div> : null}
    </div>
  );
}

function StepCard({ number, title, text, active = false }) {
  return (
    <div
      className={cx(
        "rounded-[22px] border p-4 transition",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black",
            active
              ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
              : "bg-[var(--color-card)] text-[var(--color-text)]",
          )}
        >
          {number}
        </div>

        <div className="min-w-0">
          <div className={cx("text-sm font-black", strongText())}>{title}</div>
          <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>{text}</div>
        </div>
      </div>
    </div>
  );
}

function ProtectionPill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? successBadge()
      : tone === "info"
        ? infoBadge()
        : tone === "warning"
          ? warningBadge()
          : tone === "process"
            ? processBadge()
            : neutralBadge();

  return (
    <span
      className={cx("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black", cls)}
    >
      {children}
    </span>
  );
}

function sessionTone(session, currentSessionId) {
  if (session?.id === currentSessionId) return "success";
  if (session?.isRevoked) return "warning";
  return "info";
}

function loginEventTone(event) {
  const status = String(event?.status || "").toUpperCase();

  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "warning";
  if (status === "BLOCKED") return "process";

  return "neutral";
}

function EmptyState({ title, text }) {
  return (
    <div className={cx(softPanel(), "px-5 py-10 text-center")}>
      <div className={cx("text-base font-black", strongText())}>{title}</div>
      <div className={cx("mx-auto mt-2 max-w-md text-sm font-semibold leading-6", mutedText())}>
        {text}
      </div>
    </div>
  );
}

function LoadMorePanel({ visible, total, onLoadMore, label }) {
  if (total <= visible) return null;

  const remaining = total - visible;
  const nextCount = Math.min(LOAD_MORE_STEP, remaining);

  return (
    <div className={cx(softPanel(), "mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}>
      <div>
        <div className={cx("text-sm font-black", strongText())}>
          Showing {visible} of {total}
        </div>
        <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
          Load more only when you need deeper review.
        </div>
      </div>

      <button type="button" onClick={onLoadMore} className={secondaryBtn()}>
        Load {nextCount} more {label}
      </button>
    </div>
  );
}

function SessionCard({ session, currentSessionId, busyId, onRevoke }) {
  const isCurrent = session?.id === currentSessionId;
  const busy = busyId === session?.id;
  const tone = sessionTone(session, currentSessionId);

  return (
    <article className={cx(softPanel(), "p-4 sm:p-5")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ProtectionPill tone={tone}>
              {isCurrent ? "This device" : session?.isRevoked ? "Signed out" : "Signed in"}
            </ProtectionPill>

            {session?.deviceLabel ? (
              <ProtectionPill tone="info">{session.deviceLabel}</ProtectionPill>
            ) : null}
          </div>

          <div className={cx("mt-3 text-base font-black tracking-tight", strongText())}>
            {session?.deviceLabel || "Unknown device"}
          </div>

          <div className={cx("mt-1 break-words text-sm font-semibold leading-6", mutedText())}>
            {session?.userAgent || "No device details available"}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoStat
              label="Last active"
              value={formatTimeAgo(session?.lastSeenAt || session?.createdAt)}
            />
            <InfoStat label="Signed in" value={formatDateTime(session?.createdAt)} />
            <InfoStat label="Address" value={session?.ipAddress || "—"} />
            <InfoStat label="Access ends" value={formatDateTime(session?.expiresAt)} />
          </div>
        </div>

        <div className="shrink-0">
          {isCurrent ? (
            <div
              className={cx(
                "rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-black",
                mutedText(),
              )}
            >
              Current device
            </div>
          ) : (
            <AsyncButton
              type="button"
              loading={busy}
              loadingText="Signing out..."
              onClick={() => onRevoke(session.id)}
              className="bg-[var(--color-danger)] text-white hover:opacity-95"
            >
              Sign out device
            </AsyncButton>
          )}
        </div>
      </div>
    </article>
  );
}

function LoginEventCard({ event }) {
  const tone = loginEventTone(event);
  const status = String(event?.status || "").toUpperCase();

  const title =
    status === "SUCCESS"
      ? "Successful sign-in"
      : status === "FAILED"
        ? "Failed sign-in"
        : status === "BLOCKED"
          ? "Blocked sign-in"
          : "Sign-in event";

  return (
    <article className={cx(softPanel(), "p-4")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ProtectionPill tone={tone}>{title}</ProtectionPill>
            {event?.role ? <ProtectionPill tone="info">{event.role}</ProtectionPill> : null}
          </div>

          <div className={cx("mt-3 text-sm font-black", strongText())}>
            {event?.deviceLabel || "Unknown device"}
          </div>

          <div className={cx("mt-1 break-words text-sm font-semibold leading-6", mutedText())}>
            {event?.email || "No email recorded"}
          </div>

          {event?.reason ? (
            <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
              Note: {event.reason}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:min-w-[260px]">
          <InfoStat label="Time" value={formatDateTime(event?.createdAt)} />
          <InfoStat label="Address" value={event?.ipAddress || "—"} />
        </div>
      </div>
    </article>
  );
}

export default function SettingsSecurity() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingOther, setRevokingOther] = useState(false);
  const [revokeBusyId, setRevokeBusyId] = useState("");

  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loginEvents, setLoginEvents] = useState([]);

  const [visibleSessionsCount, setVisibleSessionsCount] = useState(INITIAL_SESSIONS_VISIBLE);
  const [visibleLoginEventsCount, setVisibleLoginEventsCount] = useState(
    INITIAL_LOGIN_EVENTS_VISIBLE,
  );

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    revokeOtherSessions: true,
  });

  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    document.title = "Login & security • Storvex";
  }, []);

  async function loadAll(showToast = false) {
    try {
      if (!overview && !sessions.length && !loginEvents.length) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [overviewData, sessionsData, eventsData] = await Promise.all([
        getSecurityOverview(),
        getSecuritySessions(),
        getSecurityLoginEvents(),
      ]);

      const nextSessions = Array.isArray(sessionsData) ? sessionsData : [];
      const nextEvents = Array.isArray(eventsData) ? eventsData : [];

      setOverview(overviewData || null);
      setSessions(nextSessions);
      setLoginEvents(nextEvents);

      setVisibleSessionsCount((current) =>
        Math.min(Math.max(current, INITIAL_SESSIONS_VISIBLE), Math.max(nextSessions.length, INITIAL_SESSIONS_VISIBLE)),
      );

      setVisibleLoginEventsCount((current) =>
        Math.min(
          Math.max(current, INITIAL_LOGIN_EVENTS_VISIBLE),
          Math.max(nextEvents.length, INITIAL_LOGIN_EVENTS_VISIBLE),
        ),
      );

      if (showToast) toast.success("Security details refreshed");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load security details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSessionId = overview?.currentSessionId || null;
  const activeSessionsCount = Number(overview?.summary?.activeSessions || 0);
  const recentLoginsCount = Number(overview?.summary?.recentLogins || 0);
  const failedAttemptsCount = Number(overview?.summary?.failedAttempts || 0);
  const lastPasswordChange = overview?.summary?.lastPasswordChangeAt || null;

  const visibleSessions = useMemo(
    () => sessions.slice(0, visibleSessionsCount),
    [sessions, visibleSessionsCount],
  );

  const visibleLoginEvents = useMemo(
    () => loginEvents.slice(0, visibleLoginEventsCount),
    [loginEvents, visibleLoginEventsCount],
  );

  const posture = useMemo(() => {
    if (activeSessionsCount <= 0) {
      return {
        label: "Session unavailable",
        tone: "warning",
        note: "We could not confirm an active device session for this account.",
      };
    }

    if (failedAttemptsCount > 0) {
      return {
        label: "Attention needed",
        tone: "process",
        note: "There were recent blocked or failed sign-in attempts.",
      };
    }

    return {
      label: "Protected",
      tone: "success",
      note: "Your account currently shows a normal active sign-in state.",
    };
  }, [activeSessionsCount, failedAttemptsCount]);

  function updateField(key, value) {
    setForm((curr) => ({ ...curr, [key]: value }));
  }

  function loadMoreSessions() {
    setVisibleSessionsCount((current) => Math.min(current + LOAD_MORE_STEP, sessions.length));
  }

  function loadMoreLoginEvents() {
    setVisibleLoginEventsCount((current) =>
      Math.min(current + LOAD_MORE_STEP, loginEvents.length),
    );
  }

  async function onRevokeSession(sessionId) {
    if (!sessionId) return;

    try {
      setRevokeBusyId(sessionId);
      await revokeSecuritySession(sessionId);
      toast.success("Device signed out");
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to sign out device");
    } finally {
      setRevokeBusyId("");
    }
  }

  async function onRevokeOtherSessions() {
    try {
      setRevokingOther(true);
      await revokeOtherSecuritySessions();
      toast.success("Other devices signed out");
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to sign out other devices");
    } finally {
      setRevokingOther(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();

    if (!form.currentPassword.trim()) {
      toast.error("Enter your current password");
      return;
    }

    if (!form.newPassword.trim()) {
      toast.error("Enter your new password");
      return;
    }

    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setSavingPassword(true);

      await changeMyPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        revokeOtherSessions: Boolean(form.revokeOtherSessions),
      });

      toast.success("Password updated");

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        revokeOtherSessions: true,
      });

      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return <PageSkeleton titleWidth="w-48" lines={4} variant="default" />;
  }

  const activeOtherSessionsCount = sessions.filter(
    (session) => session.id !== currentSessionId && !session.isRevoked,
  ).length;

  return (
    <div className="space-y-6">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <SectionHeading
                eyebrow="Security"
                title="Login & security"
                subtitle="Review signed-in devices, recent account access, and password protection from one clear security screen."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ProtectionPill tone={posture.tone}>{posture.label}</ProtectionPill>

              <AsyncButton
                type="button"
                loading={refreshing}
                loadingText="Refreshing..."
                onClick={() => loadAll(true)}
                className={secondaryBtn()}
              >
                Refresh security
              </AsyncButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Active devices"
            value={String(activeSessionsCount)}
            note="Devices that still have access to this account"
            tone="success"
          />

          <SummaryCard
            label="Recent sign-ins"
            value={String(recentLoginsCount)}
            note="Latest account access records"
            tone="neutral"
          />

          <SummaryCard
            label="Blocked or failed attempts"
            value={String(failedAttemptsCount)}
            note="Recent sign-in attempts that did not succeed"
            tone={failedAttemptsCount > 0 ? "warning" : "success"}
          />

          <SummaryCard
            label="Last password update"
            value={lastPasswordChange ? formatTimeAgo(lastPasswordChange) : "—"}
            note={
              lastPasswordChange
                ? formatDateTime(lastPasswordChange)
                : "No password update history yet"
            }
            tone="neutral"
          />
        </div>
      </section>

      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <SectionHeading
              eyebrow="Current session"
              title="Trusted device visibility"
              subtitle="See your current device first, then load more only when deeper device review is needed."
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <AsyncButton
              type="button"
              loading={revokingOther}
              loadingText="Signing out..."
              onClick={onRevokeOtherSessions}
              disabled={activeOtherSessionsCount === 0}
              className={secondaryBtn()}
            >
              Sign out other devices
            </AsyncButton>

            <Link to="/app/settings/audit" className={primaryBtn()}>
              Open audit logs
            </Link>
          </div>
        </div>

        <div className="mt-6">
          {sessions.length === 0 ? (
            <EmptyState
              title="No device sessions found"
              text="We could not find any saved device sessions for this account."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {visibleSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    currentSessionId={currentSessionId}
                    busyId={revokeBusyId}
                    onRevoke={onRevokeSession}
                  />
                ))}
              </div>

              <LoadMorePanel
                visible={visibleSessions.length}
                total={sessions.length}
                label="devices"
                onLoadMore={loadMoreSessions}
              />
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <div className={cx(pageCard(), "p-5 sm:p-6")}>
          <SectionHeading
            eyebrow="Access activity"
            title="Recent sign-in activity"
            subtitle="A short review feed by default, with load more for deeper investigation."
          />

          <div className="mt-6">
            {loginEvents.length === 0 ? (
              <EmptyState
                title="No sign-in activity found"
                text="Recent account access records will appear here once they are available."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3">
                  {visibleLoginEvents.map((event) => (
                    <LoginEventCard key={event.id} event={event} />
                  ))}
                </div>

                <LoadMorePanel
                  visible={visibleLoginEvents.length}
                  total={loginEvents.length}
                  label="events"
                  onLoadMore={loadMoreLoginEvents}
                />
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Password control"
              title="Change password"
              subtitle="Update your password and remove access from other devices at the same time."
            />

            <form onSubmit={onChangePassword} className="mt-6 space-y-4">
              <div>
                <label className={fieldLabel()}>Current password</label>
                <input
                  type="password"
                  className={inputClass()}
                  value={form.currentPassword}
                  onChange={(e) => updateField("currentPassword", e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className={fieldLabel()}>New password</label>
                <input
                  type="password"
                  className={inputClass()}
                  value={form.newPassword}
                  onChange={(e) => updateField("newPassword", e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className={fieldLabel()}>Confirm new password</label>
                <input
                  type="password"
                  className={inputClass()}
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>

              <label className={cx(softPanel(), "flex items-start gap-3 p-4")}>
                <input
                  type="checkbox"
                  checked={Boolean(form.revokeOtherSessions)}
                  onChange={(e) => updateField("revokeOtherSessions", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded"
                />

                <div>
                  <div className={cx("text-sm font-black", strongText())}>
                    Sign out other devices after password change
                  </div>
                  <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                    Recommended when you want the new password to apply everywhere immediately.
                  </div>
                </div>
              </label>

              <AsyncButton
                type="submit"
                loading={savingPassword}
                loadingText="Updating..."
                className="w-full"
              >
                Update password
              </AsyncButton>
            </form>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className={cx("text-lg font-black tracking-tight", strongText())}>
              How protection works
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <StepCard
                number="1"
                title="Signed-in device"
                text="Your account stays active on devices where you have already signed in."
                active={activeSessionsCount > 0}
              />

              <StepCard
                number="2"
                title="Access tracking"
                text="Recent sign-ins and failed attempts are recorded so account activity can be reviewed."
                active
              />

              <StepCard
                number="3"
                title="Password protection"
                text="Changing your password can also remove access from other devices in one step."
                active
              />
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className={cx("text-lg font-black tracking-tight", strongText())}>
              Security note
            </div>

            <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
              This page focuses on what matters most: which devices are signed in, when the
              account was accessed, and how quickly you can protect it.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}