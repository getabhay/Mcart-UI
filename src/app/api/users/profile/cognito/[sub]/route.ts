import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ sub: string }> }) {
  try {
    const { sub } = await context.params;
    const cognitoSub = sub.trim();
    if (!cognitoSub) {
      return NextResponse.json({ message: "Missing cognito sub" }, { status: 400 });
    }

    const base = process.env.PRODUCT_SERVICE_BASE_URL?.replace(/\/+$/, "");
    if (!base) {
      return NextResponse.json({ message: "PRODUCT_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    const upstream = await fetch(`${base}/api/v1/users/profile/cognito/${encodeURIComponent(cognitoSub)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = (await upstream.json().catch(() => ({}))) as unknown;
    return NextResponse.json(json, { status: upstream.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
