// src/app/api/autocomplete/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const base = process.env.SEARCH_SERVICE_BASE_URL;
    if (!base) {
      return NextResponse.json({ message: "SEARCH_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const size = (searchParams.get("size") ?? "10").trim();

    // ✅ No query => no suggestions
    if (!q) return NextResponse.json([], { status: 200 });

    const upstreamUrl =
      `${base}/api/search/products/autocomplete` +
      `?q=${encodeURIComponent(q)}` +
      `&size=${encodeURIComponent(size)}`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
    });

    // ✅ Autocomplete returns an array
    const data: unknown = await upstreamRes.json().catch(() => ([]));

    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: "Unexpected error", details: msg }, { status: 500 });
  }
}