import { NextResponse } from "next/server";
import { APP_TEXT } from "@/lib/constants/appText";
import { updateCognitoUserAttributes } from "@/lib/auth/server";

type BackendProfile = {
  id: number;
  name: string;
  email: string;
  provider: "LOCAL" | "GOOGLE" | "FACEBOOK";
  cognitoSub: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  status: string;
};

type UpdateBody = {
  name?: string;
  email?: string;
  status?: string;
  cognitoSub?: string;
  accessToken?: string;
};

export async function PUT(req: Request, context: { params: Promise<{ sub: string }> }) {
  try {
    const { sub } = await context.params;
    const routeCognitoSub = sub.trim();
    if (!routeCognitoSub) {
      return NextResponse.json({ message: "Missing cognito sub" }, { status: 400 });
    }

    const base = process.env.PRODUCT_SERVICE_BASE_URL?.replace(/\/+$/, "");
    if (!base) {
      return NextResponse.json({ message: "PRODUCT_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as UpdateBody;
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const status = (body.status ?? "").trim().toUpperCase();
    const tokenUsernameAsCognitoSub = (body.cognitoSub ?? "").trim();
    const cognitoSub = tokenUsernameAsCognitoSub || routeCognitoSub;
    const accessToken = (body.accessToken ?? "").trim();

    if (!name) return NextResponse.json({ message: APP_TEXT.profilePage.errors.nameRequired }, { status: 400 });
    if (!email) return NextResponse.json({ message: APP_TEXT.profilePage.errors.emailRequired }, { status: 400 });
    if (!accessToken) return NextResponse.json({ message: APP_TEXT.auth.validation.accessTokenRequired }, { status: 400 });
    if (!status) return NextResponse.json({ message: "Status is required" }, { status: 400 });
    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return NextResponse.json({ message: "Invalid status. Only ACTIVE or INACTIVE is allowed." }, { status: 400 });
    }

    const currentRes = await fetch(`${base}/api/v1/users/profile/cognito/${encodeURIComponent(cognitoSub)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const current = (await currentRes.json().catch(() => ({}))) as Partial<BackendProfile> & { message?: string };
    if (!currentRes.ok) {
      return NextResponse.json({ message: current.message || "Unable to fetch current profile" }, { status: currentRes.status });
    }

    await updateCognitoUserAttributes({
      accessToken,
      name,
      email,
    });

    const updatePayload = {
      name,
      email,
      provider: current.provider ?? "LOCAL",
      cognitoSub,
      emailVerified: current.emailVerified ?? false,
      status,
    };

    const updateRes = await fetch(`${base}/api/v1/users/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
      cache: "no-store",
    });
    const updateJson = (await updateRes.json().catch(() => null)) as unknown;
    if (!updateRes.ok) {
      const text = updateJson === null ? await updateRes.text().catch(() => "") : "";
      if (updateJson && typeof updateJson === "object") return NextResponse.json(updateJson, { status: updateRes.status });
      return NextResponse.json({ message: text || APP_TEXT.profilePage.errors.updateFailed }, { status: updateRes.status });
    }

    const refreshedRes = await fetch(`${base}/api/v1/users/profile/cognito/${encodeURIComponent(cognitoSub)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const refreshedJson = (await refreshedRes.json().catch(() => updateJson)) as unknown;
    return NextResponse.json(refreshedJson, { status: refreshedRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
