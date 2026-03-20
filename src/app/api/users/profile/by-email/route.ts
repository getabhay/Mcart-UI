import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get("email") ?? "").trim();
    const provider = (url.searchParams.get("provider") ?? "").trim();

    if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

    const base = process.env.PRODUCT_SERVICE_BASE_URL?.replace(/\/+$/, "");
    if (!base) return NextResponse.json({ message: "PRODUCT_SERVICE_BASE_URL is not set" }, { status: 500 });

    const params = new URLSearchParams({ email });
    if (provider) params.set("provider", provider);

    const upstream = await fetch(`${base}/api/v1/users/profile/by-email?${params.toString()}`, {
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
