// src/app/search/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { searchProducts } from "@/features/search/searchApi";
import type { SearchResponse, SearchItem, FacetBucket, ProductVariant, AutocompleteItem } from "@/features/search/types";
import { autocomplete } from "@/features/search/autocompleteApi";
import { useSearchStore } from "@/features/search/searchStore";

function formatMoney(n: number): string {
  return `₹${n.toFixed(0)}`;
}

function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (u.endsWith("/null")) return false;
  return u.startsWith("http://") || u.startsWith("https://");
}

function titleCasePreserveSpecials(input: string): string {
  const parts = input.split(" ");
  const out = parts.map((word) => {
    if (!word) return word;
    const hy = word.split("-").map((seg) => {
      if (!seg) return seg;
      if (!/[a-zA-Z]/.test(seg)) return seg;
      return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
    });
    return hy.join("-");
  });
  return out.join(" ");
}

function formatFacetLabel(attrSlug: string, bucketLabel: string): string {
  if (attrSlug.toLowerCase() === "size" && bucketLabel.trim().length < 5) return bucketLabel.toUpperCase();
  return titleCasePreserveSpecials(bucketLabel);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function roundDiscountPct(mrp: number, selling: number): number {
  if (!(mrp > 0)) return 0;
  const pct = ((mrp - selling) / mrp) * 100;
  return Math.max(0, Math.min(99, Math.round(pct)));
}

const FILTER_COLOR_MAP: Record<string, string> = {
  black: "#111827",
  white: "#ffffff",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  grey: "#6b7280",
  gray: "#6b7280",
  pink: "#f1a9c4",
  brown: "#92400e",
  beige: "#d6c7a1",
  yellow: "#eab308",
  lavender: "#a78bfa",
  orange: "#f97316",
  purple: "#8b5cf6",
  maroon: "#7f1d1d",
  navy: "#1e3a8a",
  "navy-blue": "#1e3a8a",
};

function colorHexFromValue(value: string): string | null {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v;
  if (v.startsWith("rgb(") || v.startsWith("rgba(")) return v;
  return FILTER_COLOR_MAP[v] ?? null;
}

function isColorAttribute(attrSlug: string): boolean {
  const s = (attrSlug ?? "").trim().toLowerCase();
  return s === "color" || s === "colour" || s.includes("color") || s.includes("colour");
}

type VariantCard = {
  productId: number;
  slug: string;
  brandName: string;
  productName: string;
  avgRating: number | null;
  totalRatingCount: number;
  variantId: number | null;
  stockQuantity: number;
  outOfStock: boolean;
  onlyFewLeft: boolean;
  popularityScore: number;
  thumbnailUrl: string | null;
  sellingPrice: number | null;
  mrp: number | null;
};

function pickVariantThumb(p: SearchItem, v: ProductVariant): string | null {
  if (isValidImageUrl(v.thumbnailUrl)) return v.thumbnailUrl;
  if (isValidImageUrl(p.thumbnailUrl)) return p.thumbnailUrl;
  return null;
}

function buildVariantCards(items: SearchItem[]): VariantCard[] {
  const out: VariantCard[] = [];
  for (const p of items) {
    const vars = Array.isArray(p.variants) ? p.variants : [];
    if (vars.length > 0) {
      for (const v of vars) {
        const stock = typeof v.stockQuantity === "number" ? v.stockQuantity : 0;
        out.push({
          productId: p.id,
          slug: p.slug,
          brandName: p.brandName,
          productName: p.name,
          avgRating: p.avgRating,
          totalRatingCount: p.totalRatingCount ?? 0,
          variantId: v.id,
          stockQuantity: stock,
          outOfStock: stock <= 0,
          onlyFewLeft: stock > 0 && stock < 100,
          popularityScore: p.popularityScore ?? 0,
          thumbnailUrl: pickVariantThumb(p, v),
          sellingPrice: typeof v.sellingPrice === "number" ? v.sellingPrice : null,
          mrp: typeof v.mrp === "number" ? v.mrp : null,
        });
      }
      continue;
    }
    out.push({
      productId: p.id,
      slug: p.slug,
      brandName: p.brandName,
      productName: p.name,
      avgRating: p.avgRating,
      totalRatingCount: p.totalRatingCount ?? 0,
      variantId: null,
      stockQuantity: 0,
      outOfStock: false,
      onlyFewLeft: false,
      popularityScore: p.popularityScore ?? 0,
      thumbnailUrl: isValidImageUrl(p.thumbnailUrl) ? p.thumbnailUrl : null,
      sellingPrice: typeof p.minPrice === "number" ? p.minPrice : null,
      mrp: null,
    });
  }
  return out;
}

function priceUi(sellingPrice: number | null, mrp: number | null) {
  const selling = typeof sellingPrice === "number" ? sellingPrice : null;
  const m = typeof mrp === "number" ? mrp : null;
  if (selling == null) return { sellingText: "", mrpText: null as string | null, discountText: null as string | null };
  if (m != null && m > selling) {
    const pct = roundDiscountPct(m, selling);
    return { sellingText: formatMoney(selling), mrpText: formatMoney(m), discountText: `(${pct}% OFF)` };
  }
  return { sellingText: formatMoney(selling), mrpText: null as string | null, discountText: null as string | null };
}

const SORT_OPTIONS = [
  { value: "POPULARITY", label: "Popularity" },
  { value: "CUSTOMER_RATING", label: "Popularity (Customer Rating)" },
  { value: "BETTER_DISCOUNT", label: "Better Discount" },
  { value: "PRICE_LOW_TO_HIGH", label: "Price: low to high" },
  { value: "PRICE_HIGH_TO_LOW", label: "Price: high to low" },
] as const;

function CardImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!isValidImageUrl(src)) return <div className="aspect-square w-full rounded-md bg-gray-100 dark:bg-white/10" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="aspect-square w-full rounded-md object-cover" />;
}

function IconSearchSmall() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
    </svg>
  );
}

function FacetSection({
  title,
  children,
  defaultOpen = true,
  right,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <details className="border-b border-gray-200 pb-2 last:border-b-0 dark:border-white/10" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-0 text-sm font-bold uppercase text-gray-900 dark:text-gray-100">
        <span>{title}</span>
        {right ? <span>{right}</span> : null}
      </summary>
      <div className="px-1 py-0">{children}</div>
    </details>
  );
}

function CheckboxRow({
  checked,
  label,
  onToggle,
  leading,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  leading?: React.ReactNode;
}) {
  return (
    <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10" onClick={onToggle}>
      <span className={`h-4 w-4 flex rounded border ${checked ? "bg-black dark:bg-white" : "bg-white dark:bg-transparent"} dark:border-white/30`} />
      {leading ? <span className="flex">{leading}</span> : null}
      <span className="truncate">{label}</span>
    </button>
  );
}

function FilterSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mb-2 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-gray-300 dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-white/30"
    />
  );
}

export default function SearchPage() {
  const sp = useSearchParams();
  const q = useMemo(() => (sp.get("q") ?? "").trim(), [sp]);
  const browseMode = q.length === 0;

  const {
    page,
    size,
    draft,
    appliedVersion,
    toggleBrandSlug,
    toggleAttribute,
    setPriceRange,
    clearPrice,
    setSort,
    toRequestBody,
    setPage,
    toggleDraftCategoryPathPrefix,
    setDraftCategorySlugs,
    clearDraftCategory,
    applyFilters,
    hasUnappliedChanges,
    clearAllAndApply,
  } = useSearchStore();

  const [sDraftBrandSlugs, setSDraftBrandSlugs] = useState<string[]>([]);
  const [sDraftCategorySlugs, setSDraftCategorySlugs] = useState<string[]>([]);
  const [sAppliedBrandSlugs, setSAppliedBrandSlugs] = useState<string[]>([]);
  const [sAppliedCategorySlugs, setSAppliedCategorySlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [filterQuery, setFilterQuery] = useState<Record<string, string>>({});
  const [filterSearchOpen, setFilterSearchOpen] = useState<Record<string, boolean>>({});
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  function scrollToResultsTop() {
    if (!resultsTopRef.current) return;
    resultsTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    setSDraftBrandSlugs([]);
    setSDraftCategorySlugs([]);
    setSAppliedBrandSlugs([]);
    setSAppliedCategorySlugs([]);
    clearDraftCategory();
    setPage(0);
  }, [q, clearDraftCategory, setPage]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      setSuggestions([]);
      try {
        const body = toRequestBody();
        const res = await searchProducts({ ...body, q: browseMode ? undefined : q, page, size });
        if (cancelled) return;
        setData(res);
        if (!browseMode && (res.total ?? 0) === 0 && q.length >= 2) {
          const sug = await autocomplete(q, 12);
          if (!cancelled) setSuggestions(sug as AutocompleteItem[]);
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [q, browseMode, page, size, appliedVersion, toRequestBody]);

  const items: SearchItem[] = useMemo(() => data?.items ?? [], [data?.items]);
  const hasRealResults = items.length > 0;
  const showingSuggestions = !browseMode && !loading && !err && !hasRealResults && suggestions.length > 0;
  const variantCards = useMemo(() => buildVariantCards(items), [items]);
  const sortedVariantCards = useMemo(() => {
    const sort = draft.sort ?? "POPULARITY";
    const list = [...variantCards];
    const discountPct = (c: VariantCard): number => (c.mrp && c.sellingPrice && c.mrp > c.sellingPrice ? ((c.mrp - c.sellingPrice) / c.mrp) * 100 : 0);
    const priceOrMax = (c: VariantCard): number => (typeof c.sellingPrice === "number" ? c.sellingPrice : Number.MAX_SAFE_INTEGER);
    if (sort === "CUSTOMER_RATING") return list.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || (b.totalRatingCount ?? 0) - (a.totalRatingCount ?? 0));
    if (sort === "BETTER_DISCOUNT") return list.sort((a, b) => discountPct(b) - discountPct(a) || priceOrMax(a) - priceOrMax(b));
    if (sort === "PRICE_LOW_TO_HIGH") return list.sort((a, b) => priceOrMax(a) - priceOrMax(b));
    if (sort === "PRICE_HIGH_TO_LOW") return list.sort((a, b) => priceOrMax(b) - priceOrMax(a));
    return list.sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
  }, [variantCards, draft.sort]);
  const visibleCards = useMemo(() => sortedVariantCards.slice(0, Math.max(1, size)), [sortedVariantCards, size]);

  const facets = data?.facets;
  const facetBrands: FacetBucket[] = useMemo(() => facets?.brands ?? [], [facets?.brands]);
  const facetCategories: FacetBucket[] = useMemo(() => facets?.categories ?? [], [facets?.categories]);
  const facetVariantAttrs = facets?.variantAttributes ?? {};
  const facetProductAttrs = facets?.productAttributes ?? {};
  const facetPriceMin = facets?.price?.min ?? null;
  const facetPriceMax = facets?.price?.max ?? null;
  const sliderEnabled = facetPriceMin != null && facetPriceMax != null && facetPriceMin < facetPriceMax;
  const [sliderMin, setSliderMin] = useState<number>(0);
  const [sliderMax, setSliderMax] = useState<number>(0);
  useEffect(() => {
    if (!sliderEnabled || facetPriceMin == null || facetPriceMax == null) return;
    setSliderMin(clamp(draft.minPrice ?? facetPriceMin, facetPriceMin, facetPriceMax));
    setSliderMax(clamp(draft.maxPrice ?? facetPriceMax, facetPriceMin, facetPriceMax));
  }, [sliderEnabled, facetPriceMin, facetPriceMax, draft.minPrice, draft.maxPrice]);

  function updateDraftPriceFromSliders(nextMin: number, nextMax: number) {
    if (!sliderEnabled || facetPriceMin == null || facetPriceMax == null) return;
    const min = clamp(nextMin, facetPriceMin, nextMax);
    const max = clamp(nextMax, min, facetPriceMax);
    setPriceRange(min, max);
  }

  const showSuggestionFilters = showingSuggestions;
  const showServerFilters = !browseMode && hasRealResults;
  const showFilters = showSuggestionFilters || showServerFilters;
  const currentPage = (data?.page ?? page) + 1;
  const pageSize = data?.size ?? size;
  const totalResults = data?.total ?? 0;
  const variantResultCount = variantCards.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / Math.max(1, pageSize)));
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const unappliedServer = hasUnappliedChanges();
  const unappliedSuggestions = sDraftBrandSlugs.join("|") !== sAppliedBrandSlugs.join("|") || sDraftCategorySlugs.join("|") !== sAppliedCategorySlugs.join("|");
  const filteredFacetCategories = useMemo(() => {
    const qv = (filterQuery.categories ?? "").trim().toLowerCase();
    if (!qv) return facetCategories;
    return facetCategories.filter((c) => titleCasePreserveSpecials(c.label).toLowerCase().includes(qv));
  }, [facetCategories, filterQuery.categories]);
  const filteredFacetBrands = useMemo(() => {
    const qv = (filterQuery.brands ?? "").trim().toLowerCase();
    if (!qv) return facetBrands;
    return facetBrands.filter((b) => titleCasePreserveSpecials(b.label).toLowerCase().includes(qv));
  }, [facetBrands, filterQuery.brands]);

  return (
    <div className={`rounded-3xl border border-gray-200/80 bg-gradient-to-br from-white via-gray-50 to-cyan-50/50 p-3 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1118] dark:via-[#0f1724] dark:to-[#0f1a2b] dark:shadow-[0_18px_45px_-35px_rgba(0,0,0,0.9)] md:p-4 ${showFilters ? "grid gap-6 md:grid-cols-[280px_1fr]" : "space-y-4"}`}>
      {showFilters ? (
        <aside className="sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto space-y-3 rounded-2xl border border-gray-200/70 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="border-b border-gray-200 pb-2 dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xl font-semibold uppercase text-gray-900 dark:text-gray-100">Filters</div>
            {showSuggestionFilters ? (
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-gray-100" disabled={!unappliedSuggestions} onClick={() => { setSAppliedBrandSlugs([...sDraftBrandSlugs]); setSAppliedCategorySlugs([...sDraftCategorySlugs]); setDraftCategorySlugs(sDraftCategorySlugs); applyFilters(); setPage(0); }}>Apply</button>
                <button
                  type="button"
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-white/5 dark:text-gray-100"
                  onClick={() => {
                    setSDraftBrandSlugs([]);
                    setSDraftCategorySlugs([]);
                    setSAppliedBrandSlugs([]);
                    setSAppliedCategorySlugs([]);
                    setSuggestions([]);
                    clearDraftCategory();
                    setDraftCategorySlugs([]);
                    clearAllAndApply();
                    setPage(0);
                  }}
                >
                  Clear All
                </button>
              </div>
            ) : showServerFilters ? (
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-gray-100" disabled={!unappliedServer} onClick={() => applyFilters()}>Apply</button>
                <button type="button" className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-white/5 dark:text-gray-100" onClick={() => { clearDraftCategory(); clearAllAndApply(); }}>Clear All</button>
              </div>
            ) : null}
            </div>
          </div>

          {showServerFilters ? (
            <>
              <FacetSection
                title="Categories"
                defaultOpen
                right={
                  <button
                    type="button"
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFilterSearchOpen((s) => ({ ...s, categories: !s.categories }));
                    }}
                    aria-label="Search categories"
                  >
                    <IconSearchSmall />
                  </button>
                }
              >
                {filterSearchOpen.categories ? (
                  <FilterSearchInput
                    value={filterQuery.categories ?? ""}
                    onChange={(v) => setFilterQuery((s) => ({ ...s, categories: v }))}
                    placeholder="Search categories"
                  />
                ) : null}
                {filteredFacetCategories.map((c) => (
                  <CheckboxRow
                    key={c.key}
                    checked={draft.categoryPathPrefixes.includes((c.key ?? "").trim())}
                    label={titleCasePreserveSpecials(c.label)}
                    onToggle={() => toggleDraftCategoryPathPrefix((c.key ?? "").trim())}
                  />
                ))}
              </FacetSection>
              <FacetSection
                title="Brands"
                defaultOpen
                right={
                  <button
                    type="button"
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFilterSearchOpen((s) => ({ ...s, brands: !s.brands }));
                    }}
                    aria-label="Search brands"
                  >
                    <IconSearchSmall />
                  </button>
                }
              >
                {filterSearchOpen.brands ? (
                  <FilterSearchInput
                    value={filterQuery.brands ?? ""}
                    onChange={(v) => setFilterQuery((s) => ({ ...s, brands: v }))}
                    placeholder="Search brands"
                  />
                ) : null}
                {filteredFacetBrands.map((b) => (
                  <CheckboxRow
                    key={b.key}
                    checked={draft.brandSlugs.includes(b.key)}
                    label={titleCasePreserveSpecials(b.label)}
                    onToggle={() => toggleBrandSlug(b.key)}
                  />
                ))}
              </FacetSection>
              {Object.entries(facetVariantAttrs).map(([attrSlug, buckets]) => (
                <FacetSection
                  key={`v-${attrSlug}`}
                  title={titleCasePreserveSpecials(attrSlug)}
                  defaultOpen={false}
                  right={
                    <button
                      type="button"
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFilterSearchOpen((s) => ({ ...s, [`v-${attrSlug}`]: !s[`v-${attrSlug}`] }));
                      }}
                      aria-label={`Search ${titleCasePreserveSpecials(attrSlug)}`}
                    >
                      <IconSearchSmall />
                    </button>
                  }
                >
                  {filterSearchOpen[`v-${attrSlug}`] ? (
                    <FilterSearchInput
                      value={filterQuery[`v-${attrSlug}`] ?? ""}
                      onChange={(v) => setFilterQuery((s) => ({ ...s, [`v-${attrSlug}`]: v }))}
                      placeholder={`Search ${titleCasePreserveSpecials(attrSlug)}`}
                    />
                  ) : null}
                  {buckets
                    .filter((b) =>
                      formatFacetLabel(attrSlug, b.label)
                        .toLowerCase()
                        .includes((filterQuery[`v-${attrSlug}`] ?? "").trim().toLowerCase())
                    )
                    .map((b) => (
                      <CheckboxRow
                        key={b.key}
                        checked={(draft.variantAttributes[attrSlug] ?? []).includes(b.key)}
                        label={formatFacetLabel(attrSlug, b.label)}
                        leading={
                          isColorAttribute(attrSlug) ? (
                            <span
                              data-colorhex={String(b.key ?? b.label ?? "")}
                              className="h-4 w-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: colorHexFromValue(b.key) ?? colorHexFromValue(b.label) ?? "#d1d5db" }}
                            />
                          ) : null
                        }
                        onToggle={() => toggleAttribute("variantAttributes", attrSlug, b.key)}
                      />
                    ))}
                </FacetSection>
              ))}
              {Object.entries(facetProductAttrs).map(([attrSlug, buckets]) => (
                <FacetSection
                  key={`p-${attrSlug}`}
                  title={titleCasePreserveSpecials(attrSlug)}
                  defaultOpen={false}
                  right={
                    <button
                      type="button"
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFilterSearchOpen((s) => ({ ...s, [`p-${attrSlug}`]: !s[`p-${attrSlug}`] }));
                      }}
                      aria-label={`Search ${titleCasePreserveSpecials(attrSlug)}`}
                    >
                      <IconSearchSmall />
                    </button>
                  }
                >
                  {filterSearchOpen[`p-${attrSlug}`] ? (
                    <FilterSearchInput
                      value={filterQuery[`p-${attrSlug}`] ?? ""}
                      onChange={(v) => setFilterQuery((s) => ({ ...s, [`p-${attrSlug}`]: v }))}
                      placeholder={`Search ${titleCasePreserveSpecials(attrSlug)}`}
                    />
                  ) : null}
                  {buckets
                    .filter((b) =>
                      formatFacetLabel(attrSlug, b.label)
                        .toLowerCase()
                        .includes((filterQuery[`p-${attrSlug}`] ?? "").trim().toLowerCase())
                    )
                    .map((b) => (
                      <CheckboxRow
                        key={b.key}
                        checked={(draft.attributes[attrSlug] ?? []).includes(b.key)}
                        label={formatFacetLabel(attrSlug, b.label)}
                        leading={
                          isColorAttribute(attrSlug) ? (
                            <span
                              data-colorhex={String(b.key ?? b.label ?? "")}
                              className="h-4 w-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: colorHexFromValue(b.key) ?? colorHexFromValue(b.label) ?? "#d1d5db" }}
                            />
                          ) : null
                        }
                        onToggle={() => toggleAttribute("attributes", attrSlug, b.key)}
                      />
                    ))}
                </FacetSection>
              ))}
              <FacetSection title="Price" defaultOpen={false}>
                {!sliderEnabled ? <div className="text-xs text-gray-600 dark:text-gray-300">Price range not available.</div> : (
                  <>
                    <div className="text-xs text-gray-700 dark:text-gray-300">Selected: <span className="font-medium">{formatMoney(sliderMin)} - {formatMoney(sliderMax)}</span></div>
                    <div className="mt-3 space-y-3">
                      <div className="relative h-9">
                        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded bg-gray-200 dark:bg-white/10" />
                        {facetPriceMin != null && facetPriceMax != null ? (
                          <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-black" style={{ left: `${((sliderMin - facetPriceMin) / (facetPriceMax - facetPriceMin)) * 100}%`, right: `${100 - ((sliderMax - facetPriceMin) / (facetPriceMax - facetPriceMin)) * 100}%` }} />
                        ) : null}
                        <input type="range" min={facetPriceMin ?? 0} max={sliderMax} value={sliderMin} onChange={(e) => { const next = Math.min(Number(e.target.value), sliderMax); setSliderMin(next); updateDraftPriceFromSliders(next, sliderMax); }} className="dual-range pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2 appearance-none bg-transparent" />
                        <input type="range" min={sliderMin} max={facetPriceMax ?? 0} value={sliderMax} onChange={(e) => { const next = Math.max(Number(e.target.value), sliderMin); setSliderMax(next); updateDraftPriceFromSliders(sliderMin, next); }} className="dual-range pointer-events-none absolute left-0 top-1/2 w-full -translate-y-1/2 appearance-none bg-transparent" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300"><span>{formatMoney(facetPriceMin ?? 0)}</span><span>{formatMoney(facetPriceMax ?? 0)}</span></div>
                      <button type="button" className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10" onClick={() => clearPrice()}>Clear Price</button>
                    </div>
                  </>
                )}
              </FacetSection>
            </>
          ) : null}
        </aside>
      ) : null}

      <main className="space-y-4 rounded-2xl border border-gray-200/70 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 md:p-4">
        <div ref={resultsTopRef} />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Products
            {!loading && !err ? <span className="ml-1 text-gray-600 dark:text-gray-300">({variantResultCount})</span> : null}
          </h1>
          {hasRealResults ? (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <span>Sort by</span>
              <select className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-white/15 dark:bg-white/5 dark:text-gray-100" value={draft.sort ?? "POPULARITY"} onChange={(e) => setSort(e.target.value)}>
                {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
          ) : null}
        </div>

        {err ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">Error: {err}</div> : null}

        {hasRealResults ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {visibleCards.map((c) => {
              const href = c.variantId != null ? `/p/${encodeURIComponent(c.slug)}?variantId=${encodeURIComponent(String(c.variantId))}` : `/p/${encodeURIComponent(c.slug)}`;
              const pui = priceUi(c.sellingPrice, c.mrp);
              const ratingValue = c.avgRating ?? 0;
              const hasRating = ratingValue > 0;
              return (
                <Link key={`${c.productId}-${c.variantId ?? "p"}`} href={href} className={`rounded-xl border border-gray-200 bg-white/85 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 ${c.outOfStock ? "pointer-events-none cursor-not-allowed opacity-50 grayscale" : ""}`} aria-disabled={c.outOfStock}>
                  <div className="relative">
                    <CardImage src={c.thumbnailUrl} alt={c.productName} />
                    {hasRating ? <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-white/95 px-2 py-1 text-[11px] font-semibold text-gray-900 dark:bg-[#0f172a]/90 dark:text-gray-100"><span>{ratingValue.toFixed(1)}</span><span className="text-green-600">★</span><span className="text-gray-400">|</span><span>{c.totalRatingCount}</span></div> : null}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="truncate text-sm font-extrabold text-gray-900 dark:text-gray-100">{c.brandName}</div>
                    <div className="line-clamp-2 text-[13px] text-gray-900 dark:text-gray-200">{c.productName}</div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100">{pui.sellingText}</span>
                      {pui.mrpText ? <span className="text-xs text-gray-500 line-through dark:text-gray-400">{pui.mrpText}</span> : null}
                      {pui.discountText ? <span className="text-xs font-bold" style={{ color: "#ff905a" }}>{pui.discountText}</span> : null}
                      {c.onlyFewLeft ? <span className="text-xs font-bold" style={{ color: "#ff905a" }}>Only Few Left!</span> : null}
                      {c.outOfStock ? <span className="text-xs font-bold" style={{ color: "#ff905a" }}>(Out of stock)</span> : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}

        {!loading && !err && hasRealResults ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 text-sm text-gray-700 dark:text-gray-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1 text-base font-bold hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/10"
                disabled={!canGoPrev || loading}
                onClick={() => {
                  setPage(0);
                  scrollToResultsTop();
                }}
              >
                {"<<"} Page 1
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1 text-base font-bold hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/10"
                disabled={!canGoPrev || loading}
                onClick={() => {
                  setPage(Math.max(0, (data?.page ?? page) - 1));
                  scrollToResultsTop();
                }}
              >
                {"<"}Previous
              </button>
            </div>
            <div className="text-sm font-normal">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md px-3 py-1 text-base font-bold hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/10"
                disabled={!canGoNext || loading}
                onClick={() => {
                  setPage((data?.page ?? page) + 1);
                  scrollToResultsTop();
                }}
              >
                Next{">"}
              </button>
            </div>
          </div>
        ) : null}

        {showingSuggestions ? <div className="rounded-md border border-gray-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-200">No exact matches found for <span className="font-medium">{q}</span>. Showing suggestions:</div> : null}
        {!loading && !err && !hasRealResults && !showingSuggestions && !browseMode ? <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-700 dark:border-white/10 dark:text-gray-200">No results found for <span className="font-medium">{q}</span>.</div> : null}
      </main>

      <style>{`
        .dual-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          pointer-events: auto;
          height: 14px;
          width: 14px;
          border-radius: 9999px;
          background: #111827;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px #d1d5db;
          cursor: pointer;
        }
        .dual-range::-moz-range-thumb {
          pointer-events: auto;
          height: 14px;
          width: 14px;
          border-radius: 9999px;
          background: #111827;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px #d1d5db;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

