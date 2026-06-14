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
import "./Settings.css";
import "./SettingsSecurity.css";

const INITIAL_SESSIONS_VISIBLE = 3;
const INITIAL_LOGIN_EVENTS_VISIBLE = 5;
const LOAD_MORE_STEP = 5;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function pageCard() {
  return "svx-security-card";
}

function inputClass() {
  return "svx-security-input";
}

function fieldLabel() {
  return "svx-security-label";
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

function securityButton(tone = "secondary") {
  if (tone === "primary") return "svx-security-button is-primary";
  if (tone === "danger") return "svx-security-button is-danger";
  return "svx-security-button is-secondary";
}

function securityTone(tone = "neutral") {
  if (tone === "success") return "is-success";
  if (tone === "warning") return "is-warning";
  if (tone === "danger") return "is-danger";
  if (tone === "process") return "is-process";
  if (tone === "info") return "is-info";
  return "is-neutral";
}

function Pill({ tone = "neutral", children }) {
  return <span className={cx("svx-security-pill", securityTone(tone))}>{children}</span>;
}

function SectionHeader({ eyebrow, title, subtitle, action = null, compact = false }) {
  return (
    <div className={cx("svx-security-section-head", compact && "is-compact")}> 
      <div>
        {eyebrow ? <p className="svx-security-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p className="svx-security-section-text">{subtitle}</p> : null}
      </div>
      {action ? <div className="svx-security-section-action">{action}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, note, tone = "neutral" }) {
  return (
    <article className={cx("svx-security-metric", securityTone(tone))}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </article>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="svx-security-info-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
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
    <div className="svx-security-empty">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function LoadMorePanel({ visible, total, onLoadMore, label }) {
  if (total <= visible) return null;

  const remaining = total - visible;
  const nextCount = Math.min(LOAD_MORE_STEP, remaining);

  return (
    <div className="svx-security-load-more">
      <div>
        <strong>
          Showing {visible} of {total}
        </strong>
        <p>Load more only when you need deeper review.</p>
      </div>
      <button type="button" onClick={onLoadMore} className={securityButton("secondary")}>
        Load {nextCount} more {label}
      </button>
    </div>
  );
}

function SessionCard({ session, currentSessionId, busyId, onRevoke }) {
  const isCurrent = session?.id === currentSessionId;
  const busy = busyId === session?.id;
  const tone = sessionTone(session, currentSessionId);
  const lastActive = formatTimeAgo(session?.lastSeenAt || session?.createdAt);
  const signedIn = formatDateTime(session?.createdAt);
  const accessEnds = formatDateTime(session?.expiresAt);

  return (
    <article className="svx-security-session-row">
      <div className="svx-security-session-main">
        <div className="svx-security-row-pills">
          <Pill tone={tone}>{isCurrent ? "Current device" : session?.isRevoked ? "Signed out" : "Signed in"}</Pill>
          {session?.deviceLabel ? <Pill tone="info">{session.deviceLabel}</Pill> : null}
        </div>

        <h3>{session?.deviceLabel || "Unknown device"}</h3>
        <p>{session?.userAgent || "No device details available"}</p>
      </div>

      <div className="svx-security-info-grid">
        <InfoItem label="Last active" value={lastActive} />
        <InfoItem label="Signed in" value={signedIn} />
        <InfoItem label="Address" value={session?.ipAddress || "—"} />
        <InfoItem label="Access ends" value={accessEnds} />
      </div>

      <div className="svx-security-row-action">
        {isCurrent ? (
          <span className="svx-security-current-device">This device</span>
        ) : (
          <AsyncButton
            type="button"
            loading={busy}
            loadingText="Signing out..."
            onClick={() => onRevoke(session.id)}
            className={securityButton("danger")}
          >
            Sign out
          </AsyncButton>
        )}
      </div>
    </article>
  );
}

function LoginEventRow({ event }) {
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
    <article className="svx-security-event-row">
      <div className="svx-security-event-main">
        <div className="svx-security-row-pills">
          <Pill tone={tone}>{title}</Pill>
          {event?.role ? <Pill tone="info">{event.role}</Pill> : null}
        </div>

        <strong>{event?.deviceLabel || "Unknown device"}</strong>
        <p>{event?.email || "No email recorded"}</p>
        {event?.reason ? <small>Note: {event.reason}</small> : null}
      </div>

      <div className="svx-security-event-side">
        <InfoItem label="Time" value={formatDateTime(event?.createdAt)} />
        <InfoItem label="Address" value={event?.ipAddress || "—"} />
      </div>
    </article>
  );
}

function SecurityNote({ activeSessionsCount, failedAttemptsCount, activeOtherSessionsCount }) {
  const items = [
    {
      label: "Device access",
      value:
        activeOtherSessionsCount > 0
          ? `${activeOtherSessionsCount} other active device${activeOtherSessionsCount === 1 ? "" : "s"}`
          : "Only this device matters now",
    },
    {
      label: "Sign-in health",
      value:
        failedAttemptsCount > 0
          ? `${failedAttemptsCount} failed or blocked attempt${failedAttemptsCount === 1 ? "" : "s"}`
          : "No failed attempts found",
    },
    {
      label: "Protection action",
      value:
        activeSessionsCount > 1
          ? "Use sign out other devices if access looks suspicious."
          : "Change password only when needed.",
    },
  ];

  return (
    <section className={cx(pageCard(), "svx-security-note-card")}>
      <p className="svx-security-eyebrow">Security note</p>
      <h3>What matters most</h3>
      <div className="svx-security-note-list">
        {items.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
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
        label: "Needs review",
        tone: "warning",
        note: "We could not confirm an active device session.",
      };
    }

    if (failedAttemptsCount > 0) {
      return {
        label: "Attention needed",
        tone: "process",
        note: "Recent failed or blocked sign-ins were found.",
      };
    }

    return {
      label: "Protected",
      tone: "success",
      note: "No urgent account security issue found.",
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
    <div className="svx-settings-page svx-settings-security">
      <section className={cx(pageCard(), "svx-security-hero")}>
        <SectionHeader
          eyebrow="Security"
          title="Login & security"
          subtitle="Protect owner access, review active devices, and change the password without turning security into a technical report."
          action={
            <div className="svx-security-hero-actions">
              <Pill tone={posture.tone}>{posture.label}</Pill>
              <AsyncButton
                type="button"
                loading={refreshing}
                loadingText="Refreshing..."
                onClick={() => loadAll(true)}
                className={securityButton("secondary")}
              >
                Refresh
              </AsyncButton>
            </div>
          }
        />

        <div className="svx-security-metrics-grid">
          <MetricCard
            label="Active devices"
            value={String(activeSessionsCount)}
            note="Devices signed into this owner account"
            tone="success"
          />
          <MetricCard
            label="Recent sign-ins"
            value={String(recentLoginsCount)}
            note="Latest account access records"
            tone="info"
          />
          <MetricCard
            label="Failed attempts"
            value={String(failedAttemptsCount)}
            note="Blocked or unsuccessful access attempts"
            tone={failedAttemptsCount > 0 ? "warning" : "success"}
          />
          <MetricCard
            label="Password updated"
            value={lastPasswordChange ? formatTimeAgo(lastPasswordChange) : "—"}
            note={lastPasswordChange ? formatDateTime(lastPasswordChange) : "No update history yet"}
            tone="neutral"
          />
        </div>
      </section>

      <section className="svx-security-grid-main">
        <section className={cx(pageCard(), "svx-security-password-card")}>
          <SectionHeader
            eyebrow="Password"
            title="Change password"
            subtitle="Use this when access feels risky, a staff device was lost, or the owner password needs rotation."
            compact
          />

          <form onSubmit={onChangePassword} className="svx-security-password-form">
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

            <label className="svx-security-check-row">
              <input
                type="checkbox"
                checked={Boolean(form.revokeOtherSessions)}
                onChange={(e) => updateField("revokeOtherSessions", e.target.checked)}
              />
              <span>
                <strong>Sign out other devices after password change</strong>
                <small>Recommended when you want the new password to apply everywhere immediately.</small>
              </span>
            </label>

            <AsyncButton
              type="submit"
              loading={savingPassword}
              loadingText="Updating..."
              className={securityButton("primary")}
            >
              Update password
            </AsyncButton>
          </form>
        </section>

        <SecurityNote
          activeSessionsCount={activeSessionsCount}
          failedAttemptsCount={failedAttemptsCount}
          activeOtherSessionsCount={activeOtherSessionsCount}
        />
      </section>

      <section className={cx(pageCard(), "svx-security-devices-card")}>
        <SectionHeader
          eyebrow="Devices"
          title="Signed-in devices"
          subtitle="Start with the current device. Load more only when the owner needs a deeper security review."
          action={
            <div className="svx-security-device-actions">
              <AsyncButton
                type="button"
                loading={revokingOther}
                loadingText="Signing out..."
                onClick={onRevokeOtherSessions}
                disabled={activeOtherSessionsCount === 0}
                className={securityButton("secondary")}
              >
                Sign out other devices
              </AsyncButton>
              <Link to="/app/settings/audit" className={securityButton("primary")}>
                Open audit logs
              </Link>
            </div>
          }
        />

        {sessions.length === 0 ? (
          <EmptyState
            title="No device sessions found"
            text="We could not find any saved device sessions for this account."
          />
        ) : (
          <>
            <div className="svx-security-session-list">
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
      </section>

      <section className={cx(pageCard(), "svx-security-events-card")}>
        <SectionHeader
          eyebrow="Recent access"
          title="Sign-in activity"
          subtitle="A short security feed for owners. Open audit logs when a full operational investigation is needed."
          action={
            <Link to="/app/settings/audit" className={securityButton("secondary")}>
              Full audit logs
            </Link>
          }
        />

        {loginEvents.length === 0 ? (
          <EmptyState
            title="No sign-in activity found"
            text="Recent account access records will appear here once they are available."
          />
        ) : (
          <>
            <div className="svx-security-event-list">
              {visibleLoginEvents.map((event) => (
                <LoginEventRow key={event.id} event={event} />
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
      </section>
    </div>
  );
}
