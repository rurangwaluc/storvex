/* STEP 342CK-C / SIMPLE SECURITY */
/* STEP 342CK-G2 / FINAL SECURITY UX */
/* STEP 342CK-E2 / SECURITY BUTTON FOUNDATION */
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

const INITIAL_VISIBLE = 3;
const LOAD_STEP = 5;

function timeAgo(value) {
  if (!value) return "Activity time unavailable";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Activity time unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
}

function SessionRow({ session, currentId, busyId, onSignOut }) {
  const current = session.id === currentId;
  const revoked = Boolean(session.isRevoked);
  const rawLabel = String(session.deviceLabel || "").trim();
  const label = !rawLabel || rawLabel.toLowerCase() === "unknown device"
    ? "Unrecognized session"
    : rawLabel;
  const rawAgent = String(session.userAgent || "").trim();
  const agentTechnical = /^(node(?:\.js)?(?:\/|\s|$)|axios(?:\/|\s|$))/i.test(rawAgent);
  const detail = !rawAgent || agentTechnical
    ? "Device details unavailable"
    : rawAgent;
  return (
    <div className="svx-sec-session">
      <div className="svx-sec-device-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="13" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
      </div>
      <div className="svx-sec-device-info">
        <strong>{label}</strong>
        <span>
          {revoked ? "Signed out" : current ? "Current device" : "Signed in"}
          {" · "}
          {timeAgo(session.lastSeenAt || session.createdAt)}
        </span>
        <small title={detail}>{detail}</small>
      </div>
      {current ? (
        <span className="svx-sec-current">Current</span>
      ) : revoked ? (
        <span className="svx-sec-muted-status">Signed out</span>
      ) : (
        <AsyncButton
          type="button"
          loading={busyId === session.id}
          loadingText="Signing out..."
          onClick={() => onSignOut(session.id)}
          variant="secondary"
          className="svx-sec-btn svx-sec-btn-danger"
        >
          Sign out
        </AsyncButton>
      )}
    </div>
  );
}

export default function SettingsSecurity() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loginEvents, setLoginEvents] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [revokeBusyId, setRevokeBusyId] = useState("");
  const [revokingOther, setRevokingOther] = useState(false);
  const [confirmBulkSignOut, setConfirmBulkSignOut] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    revokeOtherSessions: true,
  });

  useEffect(() => {
    document.title = "Login & security • Storvex";
  }, []);

  async function loadAll(showToast = false) {
    try {
      setRefreshing(true);
      const [overviewData, sessionsData, eventsData] = await Promise.all([
        getSecurityOverview(),
        getSecuritySessions(),
        getSecurityLoginEvents(),
      ]);

      setOverview(overviewData || null);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setLoginEvents(Array.isArray(eventsData) ? eventsData : []);
      if (showToast) toast.success("Security details refreshed");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to load security details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function onChangePassword(event) {
    event.preventDefault();

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
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function onRevokeSession(sessionId) {
    if (!sessionId) return;
    try {
      setRevokeBusyId(sessionId);
      await revokeSecuritySession(sessionId);
      toast.success("Device signed out");
      await loadAll();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to sign out device");
    } finally {
      setRevokeBusyId("");
    }
  }

  async function onRevokeOtherSessions() {
    try {
      setRevokingOther(true);
      await revokeOtherSecuritySessions();
      toast.success("Other devices signed out");
      setConfirmBulkSignOut(false);
      await loadAll();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to sign out other devices");
    } finally {
      setRevokingOther(false);
    }
  }

  const currentId = overview?.currentSessionId || null;
  const activeSessions = useMemo(
    () => sessions.filter((session) => !session.isRevoked),
    [sessions],
  );
  const orderedSessions = useMemo(
    () => [...activeSessions].sort((a, b) => {
      if (a.id === currentId) return -1;
      if (b.id === currentId) return 1;
      return new Date(b.lastSeenAt || b.createdAt || 0)
        - new Date(a.lastSeenAt || a.createdAt || 0);
    }),
    [activeSessions, currentId],
  );
  const otherDevices = activeSessions.filter((s) => s.id !== currentId).length;
  const failedAttempts = Number(overview?.summary?.failedAttempts || 0);
  const recentFailures = loginEvents.filter((event) =>
    ["FAILED", "BLOCKED"].includes(String(event?.status || "").toUpperCase())
  ).length;
  const needsAttention = failedAttempts > 0 || recentFailures > 0;
  const displayed = orderedSessions.slice(0, visibleCount);

  if (loading) {
    return <PageSkeleton titleWidth="w-48" lines={4} variant="default" />;
  }

  return (
    <div className="svx-settings-page svx-settings-security svx-sec-simple">
      <header className="svx-sec-header">
        <div>
          <h2>Login & security</h2>
          <p>Manage your password and signed-in devices.</p>
        </div>
        <AsyncButton
          type="button"
          loading={refreshing}
          loadingText="Refreshing..."
          onClick={() => loadAll(true)}
          variant="secondary"
          className="svx-sec-btn svx-sec-btn-secondary"
        >
          Refresh
        </AsyncButton>
      </header>

      {needsAttention ? (
        <div className="svx-sec-warning" role="status">
          <div>
            <strong>Review recent sign-in attempts</strong>
            <p>Failed or blocked sign-ins have been recorded on this account.</p>
          </div>
          <Link to="/app/settings/audit">View activity</Link>
        </div>
      ) : null}

      <section className="svx-sec-section">
        <div className="svx-sec-section-heading">
          <div>
            <h3>Change password</h3>
            <p>Use a strong password that you don't use elsewhere.</p>
          </div>
        </div>

        <form onSubmit={onChangePassword} className="svx-sec-form">
          <label>
            <span>Current password</span>
            <input type="password" autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) => changeField("currentPassword", e.target.value)}
              placeholder="Enter current password" />
          </label>
          <label>
            <span>New password</span>
            <input type="password" autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) => changeField("newPassword", e.target.value)}
              placeholder="At least 6 characters" />
          </label>
          <label>
            <span>Confirm new password</span>
            <input type="password" autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => changeField("confirmPassword", e.target.value)}
              placeholder="Re-enter new password" />
          </label>
          <label className="svx-sec-checkbox">
            <input type="checkbox"
              checked={form.revokeOtherSessions}
              onChange={(e) => changeField("revokeOtherSessions", e.target.checked)}
            />
            <span>Sign out other devices after changing password</span>
          </label>
          <div className="svx-sec-form-footer">
            <AsyncButton
              type="submit"
              loading={savingPassword}
              loadingText="Updating..."
              variant="primary"
              className="svx-sec-btn svx-sec-btn-primary"
            >
              Update password
            </AsyncButton>
          </div>
        </form>
      </section>

      <section className="svx-sec-section">
        <div className="svx-sec-section-heading svx-sec-device-heading">
          <div>
            <h3>Signed-in devices</h3>
            <p>Review where your account is currently signed in.</p>
          </div>
          <div className="svx-sec-device-tools">
            <span className="svx-sec-device-count">
              {activeSessions.length} active
            </span>
            {otherDevices > 0 ? (
              <AsyncButton
                type="button"
                loading={revokingOther}
                loadingText="Signing out..."
                onClick={() => setConfirmBulkSignOut(true)}
                variant="secondary"
          className="svx-sec-btn svx-sec-btn-secondary"
              >
                Sign out other devices
              </AsyncButton>
            ) : null}
          </div>
        </div>

        {confirmBulkSignOut && otherDevices > 0 ? (
          <div
            className="svx-sec-confirm"
            role="group"
            aria-label="Confirm other device sign-out"
          >
            <div>
              <strong>
                Sign out {otherDevices} other {otherDevices === 1 ? "device" : "devices"}?
              </strong>
              <p>
                These sessions will be signed out. Your current session
                will remain active.
              </p>
            </div>
            <div className="svx-sec-confirm-actions">
              <button
                type="button"
                className="svx-sec-confirm-cancel"
                disabled={revokingOther}
                onClick={() => setConfirmBulkSignOut(false)}
              >
                Cancel
              </button>
              <AsyncButton
                type="button"
                variant="secondary"
                loading={revokingOther}
                loadingText="Signing out..."
                onClick={onRevokeOtherSessions}
                className="svx-sec-btn svx-sec-btn-danger"
              >
                Confirm sign out
              </AsyncButton>
            </div>
          </div>
        ) : null}

        {activeSessions.length ? (
          <div className="svx-sec-device-list">
            {displayed.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                currentId={currentId}
                busyId={revokeBusyId}
                onSignOut={onRevokeSession}
              />
            ))}
            {visibleCount < orderedSessions.length ? (
              <button type="button" className="svx-sec-more"
                onClick={() => setVisibleCount((n) =>
                  Math.min(n + LOAD_STEP, orderedSessions.length)
                )}>
                Show more devices
              </button>
            ) : null}
          </div>
        ) : (
          <p className="svx-sec-empty">
            No active device sessions were returned. Refresh to check again.
          </p>
        )}
      </section>

      <div className="svx-sec-activity-link">
        <div>
          <strong>Sign-in history</strong>
          <p>Review successful, failed and blocked sign-ins.</p>
        </div>
        <Link to="/app/settings/audit">
          View activity <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
