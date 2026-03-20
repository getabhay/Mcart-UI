import { AUTH_TOKEN_KEY, type StoredTokens } from "@/lib/auth/storage";
import { APP_TEXT } from "@/lib/constants/appText";

type JwtPayload = {
  sub?: string;
  exp?: number;
  email?: string;
  name?: string;
  "cognito:username"?: string;
};

function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid token format");
  const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const payloadRaw = atob(padded);
  return JSON.parse(payloadRaw) as JwtPayload;
}

function getStoredTokens(): StoredTokens | null {
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

export function getValidSessionFromStorage(): {
  sub: string;
  username: string;
  email: string | null;
  name: string | null;
  exp: number;
  idToken: string;
  accessToken: string;
} {
  const tokens = getStoredTokens();
  if (!tokens?.idToken) throw new Error(APP_TEXT.common.sessionExpired);
  if (!tokens.accessToken) throw new Error(APP_TEXT.common.sessionExpired);

  const payload = decodeJwtPayload(tokens.idToken);
  const exp = payload.exp;
  if (typeof exp !== "number") throw new Error(APP_TEXT.common.sessionExpired);

  const nowEpoch = Math.floor(Date.now() / 1000);
  if (exp <= nowEpoch) throw new Error(APP_TEXT.common.sessionExpired);

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const username = typeof payload["cognito:username"] === "string" ? payload["cognito:username"] : sub;
  if (!sub) throw new Error(APP_TEXT.common.sessionExpired);

  return {
    sub,
    username,
    email: typeof payload.email === "string" ? payload.email : null,
    name: typeof payload.name === "string" ? payload.name : null,
    exp,
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
  };
}
