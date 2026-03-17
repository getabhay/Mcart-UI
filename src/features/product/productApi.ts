import type { ProductDetail } from "./types";

type ApiError = { message?: string };

async function parseJsonSafe(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const res = await fetch(`/api/product/${encodeURIComponent(slug)}`, { method: "GET" });
  const json = await parseJsonSafe(res);

  if (!res.ok) {
    const msg = (json as ApiError)?.message ?? "Failed to load product";
    throw new Error(msg);
  }

  return json as ProductDetail;
}
