"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getValidSessionFromStorage } from "@/lib/auth/token";
import { clearStoredAuth, readStoredAuth, readStoredTokens, writeStoredAuth, writeStoredTokens } from "@/lib/auth/storage";
import { APP_TEXT, toFriendlyAuthError, toFriendlyProfileError } from "@/lib/constants/appText";
import { useRouter } from "next/navigation";

type BackendProfile = {
  id: number;
  name: string;
  email: string;
  provider: "LOCAL" | "GOOGLE" | "FACEBOOK";
  cognitoSub: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  status: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const formatted = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
  return formatted.replace(/\bam\b/g, "AM").replace(/\bpm\b/g, "PM");
}

function profileAge(createdAt: string): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "-";
  const now = new Date();
  if (created > now) return "0 days";

  let years = now.getFullYear() - created.getFullYear();
  let months = now.getMonth() - created.getMonth();
  let days = now.getDate() - created.getDate();

  if (days < 0) {
    const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += daysInPrevMonth;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);

  return parts.length > 0 ? parts.join(" ") : "0 days";
}

const SESSION_EXPIRED_MSG = APP_TEXT.common.sessionExpired;

export default function ProfilePage() {
  const router = useRouter();
  const [sub, setSub] = useState<string>("");
  const [tokenUsername, setTokenUsername] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; status: string }>({
    name: "",
    email: "",
    status: APP_TEXT.profilePage.status.active,
  });
  const [pwd, setPwd] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [showPwdForm, setShowPwdForm] = useState(false);

  function isSessionExpiryMessage(message: string): boolean {
    const msg = message.toLowerCase();
    return (
      msg.includes("session expired") ||
      msg.includes("access token has expired") ||
      msg.includes("token expiry") ||
      msg.includes("no authentication token") ||
      msg.includes("notauthorizedexception: access token has expired") ||
      msg.includes("token is expired") ||
      msg.includes("token has expired") ||
      msg.includes("refresh token") ||
      msg.includes("expired")
    );
  }

  function isUserNotFoundMessage(message: string): boolean {
    const msg = toFriendlyProfileError(message).toLowerCase();
    return msg.includes("profile was not found") || msg.includes("user not found");
  }

  const forceLogout = useCallback((kind: "page" | "password") => {
    clearStoredAuth();
    setProfile(null);
    setSub("");
    setAccessToken("");
    if (kind === "page") setError(SESSION_EXPIRED_MSG);
    if (kind === "password") setPwdErr(SESSION_EXPIRED_MSG);
    window.dispatchEvent(new Event("mcart:auth-updated"));
    router.replace("/");
  }, [router]);

  async function refreshSessionTokens(): Promise<boolean> {
    const auth = readStoredAuth();
    const tokens = readStoredTokens();
    if (!auth.isLoggedIn || !tokens?.refreshToken) return false;

    const refreshRes = await fetch("/api/auth/token/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: tokens.refreshToken,
        username: auth.email,
      }),
    });

    const refreshData = (await refreshRes.json().catch(() => ({}))) as {
      message?: string;
      tokens?: { idToken: string; accessToken: string; refreshToken?: string; expiresIn?: number; tokenType?: string };
    };

    if (!refreshRes.ok || !refreshData.tokens?.idToken || !refreshData.tokens.accessToken) return false;

    writeStoredTokens({
      idToken: refreshData.tokens.idToken,
      accessToken: refreshData.tokens.accessToken,
      refreshToken: refreshData.tokens.refreshToken ?? tokens.refreshToken,
      expiresIn: refreshData.tokens.expiresIn,
      tokenType: refreshData.tokens.tokenType,
    });
    setAccessToken(refreshData.tokens.accessToken);
    return true;
  }

  async function fetchProfileBySub(cognitoSub: string) {
    const res = await fetch(`/api/users/profile/cognito/${encodeURIComponent(cognitoSub)}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Partial<BackendProfile> & { message?: string };
    if (!res.ok) throw new Error(data.message || APP_TEXT.profilePage.errors.fetchFailed);
    return data as BackendProfile;
  }

  async function fetchProfileByEmail(email: string, provider: string) {
    const params = new URLSearchParams({ email });
    if (provider) params.set("provider", provider);
    const res = await fetch(`/api/users/profile/by-email?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Partial<BackendProfile> & { message?: string };
    if (!res.ok) throw new Error(data.message || APP_TEXT.profilePage.errors.fallbackFetchFailed);
    return data as BackendProfile;
  }

  function isDuplicateQueryError(message: string): boolean {
    const msg = message.toLowerCase();
    return msg.includes("query did not return a unique result") || msg.includes("2 results were returned");
  }

  function toFriendlyPasswordError(message: string): string {
    const msg = message.toLowerCase();
    if (
      msg.includes("notauthorizedexception: incorrect username or password") ||
      msg.includes("incorrect username or password")
    ) {
      return APP_TEXT.profilePage.errors.incorrectCurrentPassword;
    }
    return toFriendlyAuthError(message);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        let session;
        try {
          session = getValidSessionFromStorage();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : SESSION_EXPIRED_MSG;
          if (!isSessionExpiryMessage(msg)) throw e;
          const refreshed = await refreshSessionTokens();
          if (!refreshed) {
            if (!cancelled) {
              forceLogout("page");
            }
            return;
          }
          session = getValidSessionFromStorage();
        }

        setSub(session.sub);
        setTokenUsername(session.username);
        setAccessToken(session.accessToken);

        let data: BackendProfile;
        try {
          data = await fetchProfileBySub(session.sub);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : APP_TEXT.profilePage.errors.fetchFailed;
          if (!isDuplicateQueryError(message)) throw e;

          const auth = readStoredAuth();
          const provider = auth.isLoggedIn ? auth.provider : "";
          if (!session.email) throw new Error(message);
          data = await fetchProfileByEmail(session.email, provider);
        }

        if (cancelled) return;
        setProfile(data);
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          status: data.status ?? APP_TEXT.profilePage.status.active,
        });
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : APP_TEXT.profilePage.errors.loadFailed;
          const fallback = e instanceof Error ? toFriendlyProfileError(e.message) : APP_TEXT.profilePage.errors.loadFailed;
          if (isSessionExpiryMessage(msg) || isUserNotFoundMessage(msg)) {
            forceLogout("page");
          } else {
            setError(fallback);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [forceLogout]);

  useEffect(() => {
    function onAuthUpdated() {
      const auth = readStoredAuth();
      if (auth.isLoggedIn) return;
      setProfile(null);
      setSub("");
      setAccessToken("");
      router.replace("/");
    }

    window.addEventListener("mcart:auth-updated", onAuthUpdated as EventListener);
    window.addEventListener("storage", onAuthUpdated);
    return () => {
      window.removeEventListener("mcart:auth-updated", onAuthUpdated as EventListener);
      window.removeEventListener("storage", onAuthUpdated);
    };
  }, [router]);

  async function onSaveProfile() {
    if (!sub) return;
    setSaveMsg(null);
    setError(null);
    if (!form.name.trim()) {
      setError(APP_TEXT.profilePage.errors.nameRequired);
      return;
    }
    if (!form.email.trim()) {
      setError(APP_TEXT.profilePage.errors.emailRequired);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/profile/cognito/${encodeURIComponent(sub)}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          status: form.status.trim().toUpperCase(),
          cognitoSub: (tokenUsername || sub).trim(),
          accessToken: accessToken.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<BackendProfile> & { message?: string };
      if (!res.ok) throw new Error(data.message || APP_TEXT.profilePage.errors.updateFailed);

      const next = data as BackendProfile;
      setProfile(next);
      setForm({
        name: next.name ?? "",
        email: next.email ?? "",
        status: next.status ?? APP_TEXT.profilePage.status.active,
      });
      setIsEditing(false);
      setSaveMsg(APP_TEXT.profilePage.success.profileUpdated);

      const existingAuth = readStoredAuth();
      if (existingAuth.isLoggedIn) {
        writeStoredAuth({
          ...existingAuth,
          email: next.email || existingAuth.email,
          displayName: next.name || existingAuth.displayName,
        });
        window.dispatchEvent(new Event("mcart:auth-updated"));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : APP_TEXT.profilePage.errors.updateFailed;
      if (isSessionExpiryMessage(message) || isUserNotFoundMessage(message)) {
        forceLogout("page");
      } else {
        setError(toFriendlyProfileError(message));
      }
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword() {
    if (!canChangePassword) return;
    setPwdMsg(null);
    setPwdErr(null);
    if (!pwd.oldPassword.trim()) {
      setPwdErr(APP_TEXT.profilePage.errors.currentPasswordRequired);
      return;
    }
    if (!pwd.newPassword.trim()) {
      setPwdErr(APP_TEXT.profilePage.errors.newPasswordRequired);
      return;
    }
    if (pwd.newPassword.length < 8) {
      setPwdErr(APP_TEXT.profilePage.errors.minPasswordLength);
      return;
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdErr(APP_TEXT.profilePage.errors.confirmPasswordMismatch);
      return;
    }

    async function tryChangePassword(token: string) {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: token,
          oldPassword: pwd.oldPassword,
          newPassword: pwd.newPassword,
        }),
      });
      return (await res.json().catch(() => ({}))) as { message?: string };
    }

    async function refreshAndRetry(): Promise<boolean> {
      const refreshed = await refreshSessionTokens();
      if (!refreshed) return false;
      const latestTokens = readStoredTokens();
      if (!latestTokens?.accessToken) return false;

      const retry = await tryChangePassword(latestTokens.accessToken);
      if (retry.message && retry.message.toLowerCase().includes("exception")) {
        throw new Error(retry.message);
      }
      return true;
    }

    setPwdLoading(true);
    try {
      const data = await tryChangePassword(accessToken);
      if (data.message && data.message.toLowerCase().includes("notauthorizedexception: access token has expired")) {
        const refreshed = await refreshAndRetry();
        if (!refreshed) {
          forceLogout("password");
          return;
        }
      } else if (data.message && data.message.toLowerCase().includes("exception")) {
        throw new Error(data.message || APP_TEXT.profilePage.errors.updatePasswordFailed);
      }
      setPwd({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPwdMsg(APP_TEXT.profilePage.success.passwordUpdated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : APP_TEXT.profilePage.errors.updatePasswordFailed;
      if (
        isSessionExpiryMessage(msg) ||
        isUserNotFoundMessage(msg)
      ) {
        forceLogout("password");
        return;
      }
      setPwdErr(toFriendlyPasswordError(msg));
    } finally {
      setPwdLoading(false);
    }
  }

  const displayRows = useMemo(
    () =>
      profile
        ? [
            { label: APP_TEXT.profilePage.labels.verified, value: profile.emailVerified ? APP_TEXT.profilePage.labels.yes : APP_TEXT.profilePage.labels.no },
            { label: APP_TEXT.profilePage.labels.status, value: profile.status || "-" },
            { label: APP_TEXT.profilePage.labels.profileAge, value: profileAge(profile.createdAt) },
            { label: APP_TEXT.profilePage.labels.lastProfileUpdate, value: formatDate(profile.updatedAt) },
          ]
        : [],
    [profile]
  );
  const canChangePassword = profile?.provider === "LOCAL";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0E141B]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-500/10" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />

        <div className="relative border-b border-gray-200 bg-gradient-to-r from-amber-50 via-white to-sky-50 px-6 py-5 dark:border-white/10 dark:from-[#111a24] dark:via-[#0E141B] dark:to-[#101922]">
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-100">
            {showPwdForm ? APP_TEXT.profilePage.title.password : APP_TEXT.profilePage.title.profile}
          </h1>
          <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
            {showPwdForm ? APP_TEXT.profilePage.subtitle.password : APP_TEXT.profilePage.subtitle.profile}
          </p>
        </div>

        <div className="relative space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            {!showPwdForm ? (
              <>
                <button
                  type="button"
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    isEditing
                      ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                      : "bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  }`}
                  onClick={() => {
                    setError(null);
                    setSaveMsg(null);
                    setIsEditing((prev) => {
                      const next = !prev;
                      if (!next && profile) {
                        setForm({
                          name: profile.name ?? "",
                          email: profile.email ?? "",
                          status: profile.status ?? APP_TEXT.profilePage.status.active,
                        });
                      } else {
                        setShowPwdForm(false);
                      }
                      return next;
                    });
                  }}
                  disabled={loading || !profile}
                >
                  {isEditing ? APP_TEXT.profilePage.button.cancelUpdate : APP_TEXT.profilePage.button.updateProfile}
                </button>
                {isEditing ? (
                  <button
                    type="button"
                    className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    onClick={onSaveProfile}
                    disabled={saving}
                  >
                    {saving ? APP_TEXT.profilePage.button.saving : APP_TEXT.profilePage.button.saveChanges}
                  </button>
                ) : null}
              </>
            ) : null}
            {!isEditing && !showPwdForm ? (
              canChangePassword ? (
                <button
                  type="button"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
                  onClick={() => {
                    setPwdErr(null);
                    setPwdMsg(null);
                    setShowPwdForm(true);
                  }}
                  disabled={loading || !profile}
                >
                  {APP_TEXT.profilePage.button.changePassword}
                </button>
              ) : null
            ) : null}
          </div>

          {loading ? <p className="text-sm text-gray-700 dark:text-gray-300">{APP_TEXT.profilePage.loading}</p> : null}
          {!loading && error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {saveMsg ? <p className="text-sm text-green-700 dark:text-green-400">{saveMsg}</p> : null}

          {!loading && !error && profile && !showPwdForm ? (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-2xl border border-gray-200 bg-white/80 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-[#0B1118]/80">
                {!isEditing ? (
                  <>
                    <div className="grid grid-cols-[170px_1fr] gap-4 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{APP_TEXT.profilePage.labels.name}</div>
                      <div className="text-gray-900 dark:text-gray-100">{profile.name || "-"}</div>
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-4 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{APP_TEXT.profilePage.labels.email}</div>
                      <div className="text-gray-900 dark:text-gray-100">{profile.email || "-"}</div>
                    </div>
                  </>
                ) : null}
                {isEditing ? (
                  <>
                    <div className="rounded-xl border border-dashed border-gray-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-white/20 dark:bg-[#121b25] dark:text-gray-300">
                      {APP_TEXT.profilePage.labels.editFields}
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-4 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{APP_TEXT.profilePage.labels.name}</div>
                      <input
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-4 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{APP_TEXT.profilePage.labels.email}</div>
                      <input
                        type="email"
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-[170px_1fr] gap-4 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{APP_TEXT.profilePage.labels.status}</div>
                      <select
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value={APP_TEXT.profilePage.status.active}>{APP_TEXT.profilePage.status.active}</option>
                        <option value={APP_TEXT.profilePage.status.inactive}>{APP_TEXT.profilePage.status.inactive}</option>
                      </select>
                    </div>
                    <div className="rounded-xl border border-dashed border-gray-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-white/20 dark:bg-[#121b25] dark:text-gray-300">
                      {APP_TEXT.profilePage.labels.nonEditableDetails}
                    </div>
                  </>
                ) : null}

                {displayRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[170px_1fr] gap-4 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-white/10"
                  >
                    <div className="font-semibold text-gray-800 dark:text-gray-200">{row.label}</div>
                    <div className="text-gray-900 dark:text-gray-100">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showPwdForm && canChangePassword ? (
            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <div className="grid gap-2">
                <input
                  type="password"
                  placeholder={APP_TEXT.profilePage.placeholders.currentPassword}
                  value={pwd.oldPassword}
                  onChange={(e) => setPwd((prev) => ({ ...prev, oldPassword: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                />
                <input
                  type="password"
                  placeholder={APP_TEXT.profilePage.placeholders.newPassword}
                  value={pwd.newPassword}
                  onChange={(e) => setPwd((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                />
                <input
                  type="password"
                  placeholder={APP_TEXT.profilePage.placeholders.confirmNewPassword}
                  value={pwd.confirmPassword}
                  onChange={(e) => setPwd((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
                />
                {pwdErr ? <p className="text-xs whitespace-pre-line text-red-600 dark:text-red-400">{pwdErr}</p> : null}
                {pwdMsg ? <p className="text-xs text-green-700 dark:text-green-400">{pwdMsg}</p> : null}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    onClick={onChangePassword}
                    disabled={pwdLoading || !accessToken}
                  >
                    {pwdLoading ? APP_TEXT.profilePage.button.updatingPassword : APP_TEXT.profilePage.button.updatePassword}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
                    onClick={() => {
                      setShowPwdForm(false);
                      setPwdErr(null);
                      setPwdMsg(null);
                      setPwd({ oldPassword: "", newPassword: "", confirmPassword: "" });
                    }}
                    disabled={pwdLoading}
                  >
                    {APP_TEXT.profilePage.button.cancel}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
