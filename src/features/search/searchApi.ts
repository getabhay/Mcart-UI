// src/features/search/searchApi.ts
import type { AutocompleteResponse, SearchRequest, SearchResponse } from "./types";

type ApiError = {
  message?: string;
  details?: unknown;
};

async function parseJsonSafe(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

function getErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const msg = (payload as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  return "Request failed";
}

async function throwIfNotOk(res: Response, json: unknown): Promise<void> {
  if (res.ok) return;
  const payload = json as ApiError;
  throw new Error(payload?.message ?? getErrorMessage(json));
}

export async function searchProducts(request: SearchRequest): Promise<SearchResponse> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const json = await parseJsonSafe(res);
  await throwIfNotOk(res, json);

  return json as SearchResponse;
}

// (Optional to keep) variant-level autocomplete
export async function autocompleteProducts(q: string, opts?: { size?: number }): Promise<AutocompleteResponse> {
  const query = q.trim();
  if (query.length === 0) return [];

  const params = new URLSearchParams({ q: query });
  if (typeof opts?.size === "number") params.set("size", String(opts.size));

  const res = await fetch(`/api/autocomplete?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = await parseJsonSafe(res);
  await throwIfNotOk(res, json);

  return json as AutocompleteResponse;
}

/**
 * Suggest API (name-only + autocorrect)
 * GET /api/suggest?q=...
 *
 * Backend example:
 * {
 *   q, correctedQuery, didYouMean: string[],
 *   products: [{ text, slug, ... }],
 *   brands, categories, usedQuery
 * }
 */
type SuggestResponse = {
  q?: string;
  correctedQuery?: string | null;
  didYouMean?: string[];
  usedQuery?: string | null;
  products?: Array<{ text?: string; slug?: string }>;
};

export type NameSuggestions = {
  correctedQuery: string | null;
  names: string[];
};

export async function suggestProductNames(q: string, opts?: { size?: number }): Promise<NameSuggestions> {
  const query = q.trim();
  if (query.length === 0) return { correctedQuery: null, names: [] };

  const params = new URLSearchParams({ q: query });
  // backend did not show `size` param for suggest; keep optional in case your BFF supports it later
  if (typeof opts?.size === "number") params.set("size", String(opts.size));

  const res = await fetch(`/api/suggest?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = await parseJsonSafe(res);
  await throwIfNotOk(res, json);

  const data = (json ?? {}) as SuggestResponse;

  const corrected =
    typeof data.correctedQuery === "string" && data.correctedQuery.trim().length > 0
      ? data.correctedQuery.trim()
      : null;

  const namesRaw =
    Array.isArray(data.products) ? data.products.map((p) => (typeof p?.text === "string" ? p.text.trim() : "")) : [];

  const seen = new Set<string>();
  const names = namesRaw
    .filter(Boolean)
    .filter((n) => {
      const key = n.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { correctedQuery: corrected, names };
}