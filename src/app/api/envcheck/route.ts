import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SEARCH_SERVICE_BASE_URL: process.env.SEARCH_SERVICE_BASE_URL ?? null,
    PRODUCT_SERVICE_BASE_URL: process.env.PRODUCT_SERVICE_BASE_URL ?? null,
    COGNITO_REGION: process.env.COGNITO_REGION ?? null,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? null,
    COGNITO_DOMAIN: process.env.COGNITO_DOMAIN ?? null,
    COGNITO_REDIRECT_URI: process.env.COGNITO_REDIRECT_URI ?? null,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? null,
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? null,
    NEXT_PUBLIC_COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ?? null,
    COGNITO_CLIENT_SECRET_SET: Boolean(process.env.COGNITO_CLIENT_SECRET?.trim()),
  });
}
