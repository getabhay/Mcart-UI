// src/lib/categories.ts
import { cache } from "react";

export type CategoryFlat = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  isLeaf: boolean;
};

export type CategoryNode = CategoryFlat & {
  children: CategoryNode[];
};

function getBaseUrl(): string {
  // Prefer product service base if you have it; fallback to search service base.
  const productBase = process.env.PRODUCT_SERVICE_BASE_URL;
  const searchBase = process.env.SEARCH_SERVICE_BASE_URL;
  const base = productBase ?? searchBase;

  if (!base) {
    throw new Error("Missing env: PRODUCT_SERVICE_BASE_URL (or SEARCH_SERVICE_BASE_URL as fallback)");
  }
  return base.replace(/\/+$/, "");
}

function buildTree(list: CategoryFlat[]): CategoryNode[] {
  const byId = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  // init nodes
  for (const c of list) {
    byId.set(c.id, { ...c, children: [] });
  }

  // link children
  for (const c of list) {
    const node = byId.get(c.id);
    if (!node) continue;

    if (c.parentId == null) {
      roots.push(node);
      continue;
    }

    const parent = byId.get(c.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node); // orphan safety
  }

  // stable sorting
  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);

  return roots;
}

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const base = getBaseUrl();
  const url = `${base}/api/v1/categories/tree`;

  const res = await fetch(url, {
    // ✅ Cache on Next server for 1 hour
    next: { revalidate: 3600 },
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Category tree fetch failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as CategoryFlat[];

  // defensive sanitization
  const normalized: CategoryFlat[] = (data ?? [])
    .filter((x) => x && typeof x.id === "number")
    .map((x) => ({
      id: x.id,
      name: String(x.name ?? ""),
      slug: String(x.slug ?? ""),
      parentId: x.parentId ?? null,
      isLeaf: Boolean(x.isLeaf),
    }))
    .filter((x) => x.name && x.slug);

  return buildTree(normalized);
});