import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SEARCH_SERVICE_BASE_URL: process.env.SEARCH_SERVICE_BASE_URL ?? null,
    PRODUCT_SERVICE_BASE_URL: process.env.PRODUCT_SERVICE_BASE_URL ?? null,
  });
}
