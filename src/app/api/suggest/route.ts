// src/app/api/suggest/route.ts
import { NextResponse } from "next/server";
import { fetchJson, HttpError } from "@/lib/http/fetcher";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const base = process.env.SEARCH_SERVICE_BASE_URL;
    if (!base) {
      return NextResponse.json({ message: "SEARCH_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    const upstreamUrl = `${base}/api/search/suggest?q=${encodeURIComponent(q)}`;

    // ✅ ensure no caching (recommended for typeahead)
    const data = await fetchJson(upstreamUrl, { cache: "no-store" });

    return NextResponse.json(data);
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message, details: e.payload }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: "Unexpected error", details: msg }, { status: 500 });
  }
}