import { NextResponse } from "next/server";
import { fetchJson, HttpError } from "@/lib/http/fetcher";

export async function GET() {
  try {
    const base = process.env.PRODUCT_SERVICE_BASE_URL;
    if (!base) {
      return NextResponse.json({ message: "PRODUCT_SERVICE_BASE_URL is not set" }, { status: 500 });
    }

    // Adjust this to your actual endpoint
    const upstreamUrl = `${base}/api/categories/tree`;
    const data = await fetchJson(upstreamUrl);

    return NextResponse.json(data);
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      return NextResponse.json({ message: e.message, details: e.payload }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: "Unexpected error", details: msg }, { status: 500 });
  }
}
