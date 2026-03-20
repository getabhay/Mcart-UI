import { NextResponse } from "next/server";
import { cognitoRefreshTokens } from "@/lib/auth/server";
import { APP_TEXT } from "@/lib/constants/appText";

type Body = {
  refreshToken?: string;
  username?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const refreshToken = (body.refreshToken ?? "").trim();
    const username = (body.username ?? "").trim().toLowerCase();

    if (!refreshToken) return NextResponse.json({ message: APP_TEXT.auth.validation.refreshTokenRequired }, { status: 400 });
    if (!username) return NextResponse.json({ message: APP_TEXT.auth.validation.usernameRequired }, { status: 400 });

    const tokens = await cognitoRefreshTokens({ refreshToken, username });
    return NextResponse.json({ tokens });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : APP_TEXT.api.auth.refreshTokenFailed;
    return NextResponse.json({ message }, { status: 400 });
  }
}
