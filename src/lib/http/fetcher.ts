export type FetcherOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;

  // Next.js extended fetch option (optional)
  next?: { revalidate?: number };
};

export class HttpError extends Error {
  status: number;
  payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function fetchJson<T = unknown>(url: string, opts: FetcherOptions = {}): Promise<T> {
  // Build init without "any" and without @ts-expect-error
  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: opts.cache,
  };

  // Add Next.js `next` option only if present (typed safely)
  const res = await fetch(url, opts.next ? ({ ...init, next: opts.next } as RequestInit) : init);

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const payload: unknown = isJson
    ? await res.json().catch(() => undefined)
    : await res.text().catch(() => undefined);

  if (!res.ok) {
    let message = `HTTP ${res.status} calling ${url}`;
    if (isRecord(payload) && typeof payload.message === "string") {
      message = payload.message;
    }
    throw new HttpError(res.status, message, payload);
  }

  return payload as T;
}
