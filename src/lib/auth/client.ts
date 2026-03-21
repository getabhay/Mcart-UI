import { AUTH_KEY, AUTH_TOKEN_KEY, type StoredAuth, type StoredTokens } from "@/lib/auth/storage";
import { APP_TEXT } from "@/lib/constants/appText";

export type AuthProvider = "LOCAL" | "GOOGLE" | "FACEBOOK";

type AuthApiResponse = {
  auth?: StoredAuth;
  tokens?: StoredTokens;
  returnTo?: string;
};

type SocialState = {
  provider: AuthProvider;
  returnTo: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string } & T;
  if (!res.ok) throw new Error(data.message || APP_TEXT.common.requestFailed);
  return data;
}

export async function localSignUp(input: { name: string; email: string; password: string }): Promise<AuthApiResponse> {
  return postJson<AuthApiResponse>("/api/auth/local/signup", input);
}

export async function localSignIn(input: { email: string; password: string }): Promise<AuthApiResponse> {
  return postJson<AuthApiResponse>("/api/auth/local/signin", input);
}

export async function socialCallback(input: { code: string; state: string }): Promise<AuthApiResponse> {
  return postJson<AuthApiResponse>("/api/auth/social/callback", input);
}

function isValidProvider(value: unknown): value is AuthProvider {
  return value === "LOCAL" || value === "GOOGLE" || value === "FACEBOOK";
}

function decodeIdTokenClaims(idToken: string): { email: string | null; name: string | null } {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return { email: null, name: null };
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { email?: unknown; name?: unknown };
    return {
      email: typeof payload.email === "string" ? payload.email : null,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return { email: null, name: null };
  }
}

function resolveAuth(data: AuthApiResponse, fallbackProvider: AuthProvider): StoredAuth {
  if (
    data.auth?.isLoggedIn === true &&
    typeof data.auth.email === "string" &&
    typeof data.auth.displayName === "string" &&
    isValidProvider(data.auth.provider)
  ) {
    return data.auth;
  }

  const claims = decodeIdTokenClaims(data.tokens?.idToken ?? "");
  if (!claims.email) {
    throw new Error(APP_TEXT.common.requestFailed);
  }
  return {
    isLoggedIn: true,
    email: claims.email,
    displayName: claims.name || claims.email,
    provider: fallbackProvider,
  };
}

export function persistAuth(data: AuthApiResponse, fallbackProvider: AuthProvider = "LOCAL"): void {
  if (typeof window === "undefined") return;
  if (!data.tokens?.idToken || !data.tokens.accessToken) {
    throw new Error(APP_TEXT.common.requestFailed);
  }
  const auth = resolveAuth(data, fallbackProvider);
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  window.localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(data.tokens));
  window.dispatchEvent(new Event("mcart:auth-updated"));
}

function encodeState(data: SocialState): string {
  return btoa(JSON.stringify(data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeState(input: string): SocialState {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = padded + "===".slice((padded.length + 3) % 4);
  const json = atob(normalized);
  const parsed = JSON.parse(json) as Partial<SocialState>;
  const provider = parsed.provider;
  if (!provider || !["GOOGLE", "FACEBOOK"].includes(provider)) {
    throw new Error(APP_TEXT.auth.errors.invalidSocialState);
  }
  return {
    provider,
    returnTo: typeof parsed.returnTo === "string" && parsed.returnTo.trim().length > 0 ? parsed.returnTo : "/",
  };
}

export function startSocialSignIn(provider: "GOOGLE" | "FACEBOOK", returnTo = "/"): void {
  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.trim();
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.trim();
  const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI?.trim();

  if (!domain || !clientId || !redirectUri) {
    throw new Error(APP_TEXT.auth.errors.missingSocialConfig);
  }

  const state = encodeState({ provider, returnTo });
  const providerValue = provider === "GOOGLE" ? "Google" : "Facebook";
  const url = new URL(`https://${domain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/oauth2/authorize`);
  url.searchParams.set("identity_provider", providerValue);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  window.location.assign(url.toString());
}
