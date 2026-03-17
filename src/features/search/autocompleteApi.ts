// src/features/search/autocompleteApi.ts

export type AutocompleteItem = {
  id: number;
  name: string;
  slug: string;

  brandName: string;
  brandSlug: string;

  categoryName: string;
  categorySlug: string;

  // ✅ from backend (may be null/empty)
  thumbnailUrl?: string | null;
};

export type AutocompleteResponse = AutocompleteItem[];

type ApiError = { message?: string };

async function parseJsonSafe(res: Response): Promise<unknown> {
  return res.json().catch(() => ([]));
}

export async function autocomplete(q: string, size = 10): Promise<AutocompleteResponse> {
  const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}&size=${size}`, { method: "GET" });
  const json = await parseJsonSafe(res);

  if (!res.ok) {
    const msg = (json as ApiError)?.message ?? "Autocomplete failed";
    throw new Error(msg);
  }

  return json as AutocompleteResponse;
}