// src/app/api/search/route.ts
import { NextResponse } from "next/server";
import { fetchJson, HttpError } from "@/lib/http/fetcher";

export async function POST(req: Request) {
  try {
    const base = process.env.SEARCH_SERVICE_BASE_URL;
    if (!base) {
      return NextResponse.json({ message: "SEARCH_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    const body: unknown = await req.json().catch(() => ({}));

    const upstreamUrl = `${base}/api/search/products`;

    const data = await fetchJson(upstreamUrl, {
      method: "POST",
      body,
      cache: "no-store",
    });

    return NextResponse.json(data);
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message, details: e.payload }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: "Unexpected error", details: msg }, { status: 500 });
  }
}

// Optional: if someone hits /api/search in the browser
export async function GET() {
  return NextResponse.json({ message: "Method Not Allowed. Use POST /api/search" }, { status: 405 });
}