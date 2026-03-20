"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { localSignUp, persistAuth, startSocialSignIn } from "@/lib/auth/client";
import { APP_TEXT, toFriendlyAuthError } from "@/lib/constants/appText";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"GOOGLE" | "FACEBOOK" | null>(null);
  const [showLoginAction, setShowLoginAction] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const canSubmit =
    name.trim().length > 0 &&
    isValidEmail(email) &&
    password.trim().length > 0 &&
    accepted;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setShowLoginAction(false);

    if (!name.trim()) {
      setErr(APP_TEXT.signupPage.errors.enterName);
      return;
    }

    if (!email.trim()) {
      setErr(APP_TEXT.signupPage.errors.enterEmail);
      return;
    }

    if (!password.trim()) {
      setErr(APP_TEXT.signupPage.errors.enterPassword);
      return;
    }

    if (!accepted) {
      setErr(APP_TEXT.signupPage.errors.acceptCheckbox);
      return;
    }

    setLoading(true);
    try {
      const result = await localSignUp({ name: name.trim(), email: email.trim(), password });
      persistAuth(result);
      setOk(APP_TEXT.signupPage.success.signupRedirecting);
      router.replace("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : APP_TEXT.auth.errors.signupFailed;
      const friendly = toFriendlyAuthError(message);
      setErr(friendly);
      setShowLoginAction(friendly.includes("Please login instead") || friendly === APP_TEXT.auth.errors.accountExists);
    } finally {
      setLoading(false);
    }
  }

  function onSocial(provider: "GOOGLE" | "FACEBOOK") {
    setErr(null);
    setOk(null);
    setShowLoginAction(false);
    setSocialLoading(provider);
    try {
      startSocialSignIn(provider, "/");
    } catch (e: unknown) {
      setSocialLoading(null);
      setErr(e instanceof Error ? e.message : APP_TEXT.auth.errors.socialStartFailed);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0E141B]">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-[#0B1118]">
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">{APP_TEXT.signupPage.title}</h1>
          <p className="text-xs text-gray-700 dark:text-gray-300">{APP_TEXT.signupPage.subtitle}</p>
        </div>

        <form className="space-y-3 p-4" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
            placeholder={APP_TEXT.signupPage.placeholders.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
            placeholder={APP_TEXT.signupPage.placeholders.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
            placeholder={APP_TEXT.signupPage.placeholders.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            {APP_TEXT.signupPage.consent}
          </label>

          {err ? <div className="text-xs text-red-600 dark:text-red-400">{err}</div> : null}
          {ok ? <div className="text-xs text-green-700 dark:text-green-400">{ok}</div> : null}
          {showLoginAction ? (
            <button
              type="button"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
              onClick={() => router.push("/")}
            >
              {APP_TEXT.signupPage.button.goToLogin}
            </button>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
            disabled={!canSubmit || loading}
          >
            {loading ? APP_TEXT.signupPage.button.creating : APP_TEXT.signupPage.button.submit}
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
            onClick={() => onSocial("GOOGLE")}
            disabled={socialLoading !== null}
          >
            {socialLoading === "GOOGLE"
              ? APP_TEXT.signupPage.button.redirectingGoogle
              : APP_TEXT.signupPage.button.continueGoogle}
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
            onClick={() => onSocial("FACEBOOK")}
            disabled={socialLoading !== null}
          >
            {socialLoading === "FACEBOOK"
              ? APP_TEXT.signupPage.button.redirectingFacebook
              : APP_TEXT.signupPage.button.continueFacebook}
          </button>

          <Link
            href="/"
            className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
          >
            {APP_TEXT.signupPage.button.back}
          </Link>
        </form>
      </div>
    </div>
  );
}
