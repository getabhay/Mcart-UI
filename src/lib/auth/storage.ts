export const AUTH_KEY = "mcart_auth_v1";
export const AUTH_TOKEN_KEY = "mcart_auth_tokens_v1";

export type StoredAuth =
  | { isLoggedIn: false }
  | {
      isLoggedIn: true;
      email: string;
      displayName: string;
      provider: "LOCAL" | "GOOGLE" | "FACEBOOK";
    };

export type StoredTokens = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

export function readStoredAuth(): StoredAuth {
  if (typeof window === "undefined") return { isLoggedIn: false };
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return { isLoggedIn: false };

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    if (!parsed || typeof parsed !== "object" || parsed.isLoggedIn !== true) return { isLoggedIn: false };
    if (typeof parsed.email !== "string" || typeof parsed.displayName !== "string" || typeof parsed.provider !== "string") {
      return { isLoggedIn: false };
    }
    if (!["LOCAL", "GOOGLE", "FACEBOOK"].includes(parsed.provider)) return { isLoggedIn: false };
    return {
      isLoggedIn: true,
      email: parsed.email,
      displayName: parsed.displayName,
      provider: parsed.provider as "LOCAL" | "GOOGLE" | "FACEBOOK",
    };
  } catch {
    return { isLoggedIn: false };
  }
}

export function writeStoredAuth(auth: StoredAuth): void {
  if (typeof window === "undefined") return;
  if (!auth.isLoggedIn) {
    window.localStorage.removeItem(AUTH_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function writeStoredTokens(tokens: StoredTokens): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokens));
}

export function readStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTokens>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.idToken !== "string" || typeof parsed.accessToken !== "string") return null;
    return {
      idToken: parsed.idToken,
      accessToken: parsed.accessToken,
      refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : undefined,
      expiresIn: typeof parsed.expiresIn === "number" ? parsed.expiresIn : undefined,
      tokenType: typeof parsed.tokenType === "string" ? parsed.tokenType : undefined,
    };
  } catch {
    return null;
  }
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}
