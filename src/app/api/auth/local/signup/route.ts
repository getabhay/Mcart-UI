import { NextResponse } from "next/server";
import { cognitoSignUpAndSignIn, decodeJwtClaims, saveUserProfile, saveUserSignup } from "@/lib/auth/server";
import { APP_TEXT } from "@/lib/constants/appText";

type Body = {
  name?: string;
  email?: string;
  password?: string;
};

function normalize(input: Body) {
  return {
    name: (input.name ?? "").trim(),
    email: (input.email ?? "").trim().toLowerCase(),
    password: input.password ?? "",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const input = normalize(body);

    if (!input.name) return NextResponse.json({ message: APP_TEXT.auth.validation.nameRequired }, { status: 400 });
    if (!input.email) return NextResponse.json({ message: APP_TEXT.auth.validation.emailRequired }, { status: 400 });
    if (!input.password) return NextResponse.json({ message: APP_TEXT.auth.validation.passwordRequired }, { status: 400 });

    await saveUserSignup({
      name: input.name,
      email: input.email,
      provider: "LOCAL",
      cognitoSub: `pending-${input.email}`,
      emailVerified: false,
    });

    const tokens = await cognitoSignUpAndSignIn(input);
    const claims = decodeJwtClaims(tokens.idToken);

    await saveUserProfile({
      name: claims.name || input.name,
      email: claims.email || input.email,
      provider: "LOCAL",
      cognitoSub: claims.sub || `local-${input.email}`,
      emailVerified: claims.emailVerified,
      status: "ACTIVE",
    });

    return NextResponse.json({
      auth: {
        isLoggedIn: true,
        email: claims.email || input.email,
        displayName: claims.name || input.name,
        provider: "LOCAL",
      },
      tokens,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : APP_TEXT.api.auth.signupFailed;
    return NextResponse.json({ message }, { status: 400 });
  }
}
