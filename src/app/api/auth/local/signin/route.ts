import { NextResponse } from "next/server";
import { cognitoSignIn, decodeJwtClaims, findUserByEmail } from "@/lib/auth/server";
import { APP_TEXT } from "@/lib/constants/appText";

type Body = {
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!email) return NextResponse.json({ message: APP_TEXT.auth.validation.emailRequired }, { status: 400 });
    if (!password) return NextResponse.json({ message: APP_TEXT.auth.validation.passwordRequired }, { status: 400 });

    const exists = await findUserByEmail(email, "LOCAL");
    if (!exists) {
      return NextResponse.json({ message: APP_TEXT.api.auth.backendUserNotFound }, { status: 404 });
    }

    const tokens = await cognitoSignIn({ email, password });
    const claims = decodeJwtClaims(tokens.idToken);

    return NextResponse.json({
      auth: {
        isLoggedIn: true,
        email: claims.email || email,
        displayName: claims.name || email,
        provider: "LOCAL",
      },
      tokens,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : APP_TEXT.api.auth.signinFailed;
    return NextResponse.json({ message }, { status: 400 });
  }
}
