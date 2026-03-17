// src/app/api/categories/tree/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const base = process.env.PRODUCT_SERVICE_BASE_URL ?? process.env.SEARCH_SERVICE_BASE_URL;
    if (!base) {
      return NextResponse.json({ message: "PRODUCT_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    const upstreamUrl = `${base.replace(/\/+$/, "")}/api/v1/categories/tree`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      // ✅ Cache at Next server layer
      next: { revalidate: 3600 },
      headers: { "Content-Type": "application/json" },
    });

    const data = await upstreamRes.json().catch(() => ([]));

    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: "Unexpected error", details: msg }, { status: 500 });
  }
}