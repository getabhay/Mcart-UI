// src/app/api/categories/slug/[slug]/route.ts
import { NextResponse, type NextRequest } from "next/server";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const base = process.env.PRODUCT_SERVICE_BASE_URL || process.env.SEARCH_SERVICE_BASE_URL;
    if (!base) {
      return NextResponse.json({ message: "PRODUCT_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    const { slug } = await ctx.params;
    const upstreamUrl = `${base}/api/v1/categories/slug/${encodeURIComponent(slug)}`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data: unknown = await upstreamRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: "Unexpected error", details: msg }, { status: 500 });
  }
}
