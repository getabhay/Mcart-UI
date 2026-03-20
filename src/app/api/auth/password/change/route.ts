import { NextResponse } from "next/server";
import { changeCognitoPassword } from "@/lib/auth/server";
import { APP_TEXT } from "@/lib/constants/appText";

type Body = {
  accessToken?: string;
  oldPassword?: string;
  newPassword?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const accessToken = (body.accessToken ?? "").trim();
    const oldPassword = body.oldPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!accessToken) return NextResponse.json({ message: APP_TEXT.auth.validation.accessTokenRequired }, { status: 400 });
    if (!oldPassword) return NextResponse.json({ message: APP_TEXT.auth.validation.oldPasswordRequired }, { status: 400 });
    if (!newPassword) return NextResponse.json({ message: APP_TEXT.auth.validation.newPasswordRequired }, { status: 400 });

    await changeCognitoPassword({
      accessToken,
      previousPassword: oldPassword,
      proposedPassword: newPassword,
    });

    return NextResponse.json({ message: APP_TEXT.auth.success.passwordUpdated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : APP_TEXT.api.auth.passwordUpdateFailed;
    return NextResponse.json({ message }, { status: 400 });
  }
}
