import type { AuthProvider } from "@/lib/auth/server";

export type SocialState = {
  provider: AuthProvider;
  returnTo: string;
};

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function encodeState(state: SocialState): string {
  return toBase64Url(JSON.stringify(state));
}

export function decodeState(input: string): SocialState {
  const json = fromBase64Url(input);
  const parsed = JSON.parse(json) as Partial<SocialState>;
  const provider = parsed.provider;
  if (!provider || !["GOOGLE", "FACEBOOK"].includes(provider)) {
    throw new Error("Invalid social provider state");
  }
  return {
    provider,
    returnTo: typeof parsed.returnTo === "string" && parsed.returnTo.trim().length > 0 ? parsed.returnTo : "/",
  };
}
