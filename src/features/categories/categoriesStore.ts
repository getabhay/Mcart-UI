import { create } from "zustand";

export type CategoryNode = {
  id: number;
  name: string;
  parentId: number | null;
  isLeaf: boolean;

  // optional (tree may not include slug)
  slug?: string;
};

type CategoryBySlug = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  isLeaf: boolean;
  isActive?: boolean;
};

type CategoriesState = {
  loaded: boolean;
  loading: boolean;
  error: string | null;

  nodes: CategoryNode[];

  byId: Record<number, CategoryNode>;
  childrenByParent: Record<string, number[]>; // key = parentId or "root"

  // slug cache (resolved via /api/categories/slug/:slug)
  slugToId: Record<string, number>;
  bySlugResolved: Record<string, CategoryBySlug>;

  loadTreeOnce: () => Promise<void>;
  resolveBySlug: (slug: string) => Promise<CategoryBySlug | null>;

  getChildrenIds: (parentId: number | null) => number[];
};

function keyParent(parentId: number | null): string {
  return parentId == null ? "root" : String(parentId);
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  loaded: false,
  loading: false,
  error: null,

  nodes: [],
  byId: {},
  childrenByParent: {},

  slugToId: {},
  bySlugResolved: {},

  loadTreeOnce: async () => {
    const s = get();
    if (s.loaded || s.loading) return;

    set({ loading: true, error: null });

    try {
      const res = await fetch("/api/categories/tree", { method: "GET" });
      const json = (await res.json().catch(() => ([]))) as unknown;

      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "message" in (json as Record<string, unknown>)
            ? String((json as Record<string, unknown>).message)
            : "Failed to load categories tree";
        throw new Error(msg);
      }

      const arr = Array.isArray(json) ? (json as CategoryNode[]) : [];

      const byId: Record<number, CategoryNode> = {};
      const childrenByParent: Record<string, number[]> = {};

      for (const n of arr) {
        if (!n || typeof n.id !== "number") continue;
        byId[n.id] = n;

        const k = keyParent(n.parentId ?? null);
        if (!childrenByParent[k]) childrenByParent[k] = [];
        childrenByParent[k].push(n.id);
      }

      // sort children by name
      for (const k of Object.keys(childrenByParent)) {
        childrenByParent[k].sort((a, b) => (byId[a]?.name ?? "").localeCompare(byId[b]?.name ?? ""));
      }

      set({
        loaded: true,
        loading: false,
        error: null,
        nodes: arr,
        byId,
        childrenByParent,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ loading: false, error: msg });
    }
  },

  resolveBySlug: async (slug: string) => {
    const clean = (slug ?? "").trim();
    if (!clean) return null;

    const s = get();
    if (s.bySlugResolved[clean]) return s.bySlugResolved[clean];

    try {
      const res = await fetch(`/api/categories/slug/${encodeURIComponent(clean)}`, { method: "GET" });
      const json = (await res.json().catch(() => ({}))) as unknown;

      if (!res.ok) return null;

      if (!json || typeof json !== "object") return null;

      const obj = json as Record<string, unknown>;
      const id = Number(obj.id);
      const name = typeof obj.name === "string" ? obj.name : clean;
      const parentId = obj.parentId == null ? null : Number(obj.parentId);
      const isLeaf = Boolean(obj.isLeaf);
      const isActive = typeof obj.isActive === "boolean" ? obj.isActive : undefined;
      const slugStr = typeof obj.slug === "string" ? obj.slug : clean;

      if (!Number.isFinite(id) || id <= 0) return null;

      const resolved: CategoryBySlug = { id, name, slug: slugStr, parentId, isLeaf, isActive };

      set((prev) => ({
        slugToId: { ...prev.slugToId, [clean]: id },
        bySlugResolved: { ...prev.bySlugResolved, [clean]: resolved },
      }));

      return resolved;
    } catch {
      return null;
    }
  },

  getChildrenIds: (parentId) => {
    const s = get();
    return s.childrenByParent[keyParent(parentId)] ?? [];
  },
}));