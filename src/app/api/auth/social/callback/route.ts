import { NextResponse } from "next/server";
import { decodeState } from "@/lib/auth/social-state";
import { APP_TEXT } from "@/lib/constants/appText";
import {
  decodeJwtClaims,
  exchangeCodeForTokens,
  findUserByEmail,
  saveUserProfile,
  saveUserSignup,
  type AuthProvider,
} from "@/lib/auth/server";

type Body = {
  code?: string;
  state?: string;
};

function isSocialProvider(value: AuthProvider): value is "GOOGLE" | "FACEBOOK" {
  return value === "GOOGLE" || value === "FACEBOOK";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const code = (body.code ?? "").trim();
    const state = (body.state ?? "").trim();
    if (!code) return NextResponse.json({ message: APP_TEXT.auth.validation.missingAuthCode }, { status: 400 });
    if (!state) return NextResponse.json({ message: APP_TEXT.auth.validation.missingState }, { status: 400 });

    const decoded = decodeState(state);
    if (!isSocialProvider(decoded.provider)) {
      return NextResponse.json({ message: APP_TEXT.auth.validation.invalidProviderInState }, { status: 400 });
    }

    const tokens = await exchangeCodeForTokens(code);
    const claims = decodeJwtClaims(tokens.idToken);

    if (!claims.email) {
      return NextResponse.json({ message: APP_TEXT.auth.validation.socialTokenNoEmail }, { status: 400 });
    }

    const existsByProvider = await findUserByEmail(claims.email, decoded.provider);
    const existsAnyProvider = existsByProvider ? true : await findUserByEmail(claims.email);
    const socialEmailVerified = true;

    if (!existsAnyProvider) {
      await saveUserSignup({
        name: claims.name || claims.email,
        email: claims.email,
        provider: decoded.provider,
        cognitoSub: claims.sub || `${decoded.provider.toLowerCase()}-${claims.email}`,
        emailVerified: socialEmailVerified,
      });
    }

    await saveUserProfile({
      name: claims.name || claims.email,
      email: claims.email,
      provider: decoded.provider,
      cognitoSub: claims.sub || `${decoded.provider.toLowerCase()}-${claims.email}`,
      emailVerified: socialEmailVerified,
      status: "ACTIVE",
    });

    return NextResponse.json({
      auth: {
        isLoggedIn: true,
        email: claims.email,
        displayName: claims.name || claims.email,
        provider: decoded.provider,
      },
      tokens,
      returnTo: decoded.returnTo,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : APP_TEXT.api.auth.socialSigninFailed;
    return NextResponse.json({ message }, { status: 400 });
  }
}
