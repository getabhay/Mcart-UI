"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { decodeState, persistAuth, socialCallback } from "@/lib/auth/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(true);

  const code = useMemo(() => (searchParams.get("code") ?? "").trim(), [searchParams]);
  const state = useMemo(() => (searchParams.get("state") ?? "").trim(), [searchParams]);
  const oauthError = useMemo(() => (searchParams.get("error_description") ?? searchParams.get("error") ?? "").trim(), [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (oauthError) {
        setError(oauthError);
        setWorking(false);
        return;
      }
      if (!code || !state) {
        setError("Missing social authentication parameters");
        setWorking(false);
        return;
      }

      try {
        const result = await socialCallback({ code, state });
        if (cancelled) return;
        const provider = decodeState(state).provider;
        persistAuth(result, provider);
        router.replace(result.returnTo || "/");
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Social sign in failed");
      } finally {
        if (!cancelled) setWorking(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [code, oauthError, router, state]);

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0E141B]">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Authentication</h1>
        {working ? (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Completing sign in...</p>
        ) : error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">Sign in successful. Redirecting...</p>
        )}
      </div>
    </div>
  );
}
