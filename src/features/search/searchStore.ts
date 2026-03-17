// src/features/search/searchStore.ts
import { create } from "zustand";
import type { SearchRequest } from "./types";

export type DraftFilters = {
  brandSlugs: string[];

  // ✅ server-mode category filter (facet key = categoryPath)
  categoryPathPrefixes: string[];

  // ✅ suggestion-mode category filter
  categorySlugs: string[];

  minPrice: number | null;
  maxPrice: number | null;
  sort: string | null;

  attributes: Record<string, string[]>;
  variantAttributes: Record<string, string[]>;
};

export type SearchFilters = {
  page: number;
  size: number;

  draft: DraftFilters;
  applied: DraftFilters;

  appliedVersion: number;
};

type SearchStore = SearchFilters & {
  setPage: (page: number) => void;
  setSize: (size: number) => void;

  toggleBrandSlug: (slug: string) => void;

  // ✅ multi category path prefixes
  toggleDraftCategoryPathPrefix: (path: string) => void;
  setDraftCategoryPathPrefixes: (paths: string[]) => void;

  // ✅ suggestion category slugs
  toggleDraftCategorySlug: (slug: string) => void;
  setDraftCategorySlugs: (slugs: string[]) => void;

  clearDraftCategory: () => void;

  setPriceRange: (min: number | null, max: number | null) => void;
  clearPrice: () => void;
  setSort: (sort: string | null) => void;

  toggleAttribute: (group: "attributes" | "variantAttributes", attrSlug: string, valueSlug: string) => void;

  resetDraftToApplied: () => void;
  applyFilters: () => void;
  clearAllAndApply: () => void;

  hasUnappliedChanges: () => boolean;

  toRequestBody: () => Omit<SearchRequest, "q">;
};

const initialDraft: DraftFilters = {
  brandSlugs: [],

  categoryPathPrefixes: [],
  categorySlugs: [],

  minPrice: null,
  maxPrice: null,
  sort: null,

  attributes: {},
  variantAttributes: {},
};

function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function toggleInRecord(rec: Record<string, string[]>, key: string, value: string): Record<string, string[]> {
  const current = rec[key] ?? [];
  const next = toggleInArray(current, value);

  if (next.length === 0) {
    const { [key]: _removed, ...rest } = rec;
    return rest;
  }

  return { ...rec, [key]: next };
}

function normalizePaths(paths: string[]): string[] {
  const set = new Set<string>();
  for (const p of paths ?? []) {
    const v = (p ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set.values());
}

function normalizeSlugs(slugs: string[]): string[] {
  const set = new Set<string>();
  for (const s of slugs ?? []) {
    const v = (s ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set.values());
}

function draftEquals(a: DraftFilters, b: DraftFilters): boolean {
  if (!arraysEqual(a.brandSlugs, b.brandSlugs)) return false;
  if (!arraysEqual(a.categoryPathPrefixes, b.categoryPathPrefixes)) return false;
  if (!arraysEqual(a.categorySlugs, b.categorySlugs)) return false;

  if ((a.minPrice ?? null) !== (b.minPrice ?? null)) return false;
  if ((a.maxPrice ?? null) !== (b.maxPrice ?? null)) return false;
  if ((a.sort ?? null) !== (b.sort ?? null)) return false;

  return (
    stableStringify(a.attributes) === stableStringify(b.attributes) &&
    stableStringify(a.variantAttributes) === stableStringify(b.variantAttributes)
  );
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  page: 0,
  size: 22,

  draft: { ...initialDraft },
  applied: { ...initialDraft },

  appliedVersion: 0,

  setPage: (page) => set({ page }),
  setSize: (size) => set({ size, page: 0 }),

  toggleBrandSlug: (slug) =>
    set((s) => ({
      draft: { ...s.draft, brandSlugs: toggleInArray(s.draft.brandSlugs, slug) },
    })),

  // ✅ server-mode: categoryPathPrefixes (facet key = categoryPath)
  toggleDraftCategoryPathPrefix: (path) =>
    set((s) => {
      const v = (path ?? "").trim();
      if (!v) return { draft: s.draft };
      const next = toggleInArray(s.draft.categoryPathPrefixes, v);
      return { draft: { ...s.draft, categoryPathPrefixes: next } };
    }),

  setDraftCategoryPathPrefixes: (paths) =>
    set((s) => ({
      draft: { ...s.draft, categoryPathPrefixes: normalizePaths(paths) },
    })),

  // ✅ suggestion-mode: categorySlugs
  toggleDraftCategorySlug: (slug) =>
    set((s) => {
      const v = (slug ?? "").trim();
      if (!v) return { draft: s.draft };
      const next = toggleInArray(s.draft.categorySlugs, v);
      return { draft: { ...s.draft, categorySlugs: next } };
    }),

  setDraftCategorySlugs: (slugs) =>
    set((s) => ({
      draft: { ...s.draft, categorySlugs: normalizeSlugs(slugs) },
    })),

  clearDraftCategory: () =>
    set((s) => ({
      draft: { ...s.draft, categoryPathPrefixes: [], categorySlugs: [] },
    })),

  setPriceRange: (min, max) => set((s) => ({ draft: { ...s.draft, minPrice: min, maxPrice: max } })),
  clearPrice: () => set((s) => ({ draft: { ...s.draft, minPrice: null, maxPrice: null } })),
  setSort: (sort) =>
    set((s) => ({
      draft: { ...s.draft, sort: sort ?? null },
      applied: { ...s.applied, sort: sort ?? null },
      appliedVersion: s.appliedVersion + 1,
      page: 0,
    })),

  toggleAttribute: (group, attrSlug, valueSlug) =>
    set((s) => ({
      draft: { ...s.draft, [group]: toggleInRecord(s.draft[group], attrSlug, valueSlug) },
    })),

  resetDraftToApplied: () =>
    set((s) => ({
      draft: {
        brandSlugs: [...s.applied.brandSlugs],
        categoryPathPrefixes: [...s.applied.categoryPathPrefixes],
        categorySlugs: [...s.applied.categorySlugs],
        minPrice: s.applied.minPrice,
        maxPrice: s.applied.maxPrice,
        sort: s.applied.sort,
        attributes: { ...s.applied.attributes },
        variantAttributes: { ...s.applied.variantAttributes },
      },
      page: 0,
    })),

  applyFilters: () =>
    set((s) => ({
      applied: {
        brandSlugs: [...s.draft.brandSlugs],
        categoryPathPrefixes: [...s.draft.categoryPathPrefixes],
        categorySlugs: [...s.draft.categorySlugs],
        minPrice: s.draft.minPrice,
        maxPrice: s.draft.maxPrice,
        sort: s.draft.sort,
        attributes: { ...s.draft.attributes },
        variantAttributes: { ...s.draft.variantAttributes },
      },
      appliedVersion: s.appliedVersion + 1,
      page: 0,
    })),

  clearAllAndApply: () =>
    set((s) => ({
      draft: { ...initialDraft },
      applied: { ...initialDraft },
      appliedVersion: s.appliedVersion + 1,
      page: 0,
    })),

  hasUnappliedChanges: () => {
    const s = get();
    return !draftEquals(s.draft, s.applied);
  },

  toRequestBody: () => {
    const s = get();
    const a = s.applied;

    return {
      page: s.page,
      size: s.size,

      brandSlugs: a.brandSlugs.length ? a.brandSlugs : undefined,

      // ✅ server-mode category filter
      categoryPathPrefixes: a.categoryPathPrefixes.length ? a.categoryPathPrefixes : undefined,

      // ✅ suggestion-mode category filter
      categorySlugs: a.categorySlugs.length ? a.categorySlugs : undefined,

      minPrice: a.minPrice ?? undefined,
      maxPrice: a.maxPrice ?? undefined,
      sort: a.sort ?? undefined,

      attributes: Object.keys(a.attributes).length ? a.attributes : undefined,
      variantAttributes: Object.keys(a.variantAttributes).length ? a.variantAttributes : undefined,
    };
  },
}));

