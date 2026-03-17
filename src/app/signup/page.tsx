"use client";

import React, { useState } from "react";
import Link from "next/link";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const canSubmit =
    name.trim().length > 0 &&
    isValidEmail(email) &&
    password.trim().length > 0 &&
    accepted;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!name.trim()) {
      setErr("Please enter name.");
      return;
    }

    if (!email.trim()) {
      setErr("Please enter email.");
      return;
    }

    if (!password.trim()) {
      setErr("Please enter password.");
      return;
    }

    if (!accepted) {
      setErr("Please accept the checkbox to continue.");
      return;
    }

    setOk("Sign up submitted successfully.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0E141B]">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-[#0B1118]">
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Sign Up</h1>
          <p className="text-xs text-gray-700 dark:text-gray-300">Create your account</p>
        </div>

        <form className="space-y-3 p-4" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-300 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100"
            placeholder="Password"
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
            I agree to Terms & Privacy Policy.
          </label>

          {err ? <div className="text-xs text-red-600 dark:text-red-400">{err}</div> : null}
          {ok ? <div className="text-xs text-green-700 dark:text-green-400">{ok}</div> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
            disabled={!canSubmit}
          >
            Submit
          </button>

          <Link
            href="/"
            className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B1118] dark:text-gray-100 dark:hover:bg-white/10"
          >
            Back
          </Link>
        </form>
      </div>
    </div>
  );
}
