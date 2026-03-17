import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const base = process.env.PRODUCT_SERVICE_BASE_URL;
    if (!base) {
      return NextResponse.json({ message: "PRODUCT_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    const { slug } = await ctx.params;

    const upstreamUrl = `${base}/api/v1/products/slug/${encodeURIComponent(slug)}`;

    const upstreamRes = await fetch(upstreamUrl, { method: "GET" });
    const data: unknown = await upstreamRes.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: "Unexpected error", details: msg }, { status: 500 });
  }
}
