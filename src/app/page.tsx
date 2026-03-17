"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SearchItem } from "@/features/search/types";

type CategoryFlat = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
};

type HomeCard = {
  id: number;
  name: string;
  slug: string;
  brandName: string;
  thumbnailUrl: string | null;
  sellingPrice: number;
  mrp: number;
  variantId: number | null;
};

type HomeRow = {
  key: string;
  title: string;
  categorySlug: string | null;
  queryTerm: string;
  cards: HomeCard[];
};

const MAX_COLLECTIONS = 10;

function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const u = url.trim();
  if (!u || u.endsWith("/null")) return false;
  return u.startsWith("http://") || u.startsWith("https://");
}

function formatMoney(n: number): string {
  return `₹${n.toFixed(0)}`;
}

function toHomeCards(item: SearchItem): HomeCard[] {
  const vars = Array.isArray(item.variants) ? item.variants : [];
  if (vars.length === 0) {
    return [
      {
        id: item.id,
        name: item.name,
        slug: item.slug,
        brandName: item.brandName,
        thumbnailUrl: isValidImageUrl(item.thumbnailUrl) ? item.thumbnailUrl : null,
        sellingPrice: item.minPrice,
        mrp: item.maxPrice,
        variantId: null,
      },
    ];
  }

  return vars.map((v) => {
    const selling = typeof v.sellingPrice === "number" ? v.sellingPrice : item.minPrice;
    const mrp = typeof v.mrp === "number" ? v.mrp : item.maxPrice;
    const thumb = isValidImageUrl(v.thumbnailUrl) ? v.thumbnailUrl : item.thumbnailUrl;
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      brandName: item.brandName,
      thumbnailUrl: isValidImageUrl(thumb) ? thumb : null,
      sellingPrice: selling,
      mrp,
      variantId: v.id ?? null,
    };
  });
}

type CollectionTarget = {
  title: string;
  queryTerm: string;
  keywords: string[];
  excludeKeywords?: string[];
};

function pickCollections(categories: CategoryFlat[]): Array<{ title: string; slug: string | null; queryTerm: string }> {
  const roots = categories.filter((c) => c.parentId == null);
  const primaryTargets: CollectionTarget[] = [
    { title: "Mens Collections", queryTerm: "mens", keywords: ["men", "mens"], excludeKeywords: ["accessor"] },
    { title: "Womens Collections", queryTerm: "women", keywords: ["women", "womens", "ladies"], excludeKeywords: ["accessor"] },
  ];
  const secondaryTargets: CollectionTarget[] = [
    { title: "Boys Collections", queryTerm: "boys", keywords: ["boy", "boys"] },
    { title: "Girls Collections", queryTerm: "girls", keywords: ["girl", "girls"] },
    { title: "Baby Collections", queryTerm: "baby", keywords: ["baby", "infant", "newborn"] },
    { title: "Mens Accessories", queryTerm: "mens accessories", keywords: ["men", "mens", "accessor"] },
    { title: "Womens Accessories", queryTerm: "women accessories", keywords: ["women", "womens", "ladies", "accessor"] },
  ];

  const used = new Set<number>();
  const rows: Array<{ title: string; slug: string | null; queryTerm: string }> = [];

  function takeFromTargets(targets: CollectionTarget[]) {
    for (const t of targets) {
      const found = roots.find((c) => {
        if (used.has(c.id)) return false;
        const name = c.name.toLowerCase();
        const has = t.keywords.some((k) => name.includes(k));
        if (!has) return false;
        if (!t.excludeKeywords?.length) return true;
        return !t.excludeKeywords.some((k) => name.includes(k));
      });

      rows.push({ title: t.title, slug: found?.slug ?? null, queryTerm: t.queryTerm });
      if (found) used.add(found.id);
    }
  }

  takeFromTargets(primaryTargets);
  takeFromTargets(secondaryTargets);

  const dynamicRoots = roots.filter((r) => !used.has(r.id)).slice(0, MAX_COLLECTIONS);
  for (const r of dynamicRoots) {
    rows.push({ title: `${r.name} Collections`, slug: r.slug, queryTerm: r.slug });
  }

  return rows.slice(0, MAX_COLLECTIONS).map((row) => {
    if (row.slug) return row;
    const found = roots.find((c) => {
      const name = c.name.toLowerCase();
      return name.includes(row.queryTerm.toLowerCase());
    });
    return { title: row.title, slug: found?.slug ?? null, queryTerm: row.queryTerm };
  });
}

export default function Home() {
  const [rows, setRows] = useState<HomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rowSectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const catRes = await fetch("/api/categories/tree", { method: "GET" });
        const catJson = (await catRes.json().catch(() => [])) as unknown;
        const categories = (Array.isArray(catJson) ? catJson : []) as CategoryFlat[];
        const collections = pickCollections(categories).slice(0, MAX_COLLECTIONS);

        const rowPromises = collections.map(async (col) => {
          const body = col.slug
            ? { page: 0, size: 24, categorySlugs: [col.slug], sort: "POPULARITY" }
            : { page: 0, size: 24, q: col.queryTerm, sort: "POPULARITY" };
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = (await res.json().catch(() => ({}))) as { items?: SearchItem[] };
          const items = Array.isArray(json?.items) ? json.items : [];
          const cards = items.flatMap(toHomeCards);
          return { key: col.slug ?? col.queryTerm, title: col.title, categorySlug: col.slug, queryTerm: col.queryTerm, cards };
        });

        const built = await Promise.all(rowPromises);
        if (!cancelled) setRows(built.filter((r) => r.cards.length > 0));
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

  return (
    <div className="relative space-y-7 overflow-x-hidden overflow-y-hidden rounded-3xl border border-gray-200/80 bg-[radial-gradient(circle_at_15%_5%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.16),transparent_32%),linear-gradient(145deg,#ffffff_0%,#f8fbff_55%,#eef9ff_100%)] p-4 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_15%_5%,rgba(14,165,233,0.12),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.12),transparent_32%),linear-gradient(145deg,#07111c_0%,#0b1726_55%,#0f1f2a_100%)] md:p-6">
      <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl dark:bg-cyan-500/15" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl dark:bg-emerald-500/10" />

      <div className="relative overflow-visible rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="inline-flex items-center rounded-full border border-gray-200/80 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-700 dark:border-white/15 dark:bg-white/10 dark:text-gray-200">
          Curated Styles
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100 md:text-3xl">Premium Collections</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Mens and Womens are shown first, followed by all live collections.
        </p>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">Error: {error}</div> : null}

      {!loading && !error && !hasRows ? (
        <div className="rounded-md border border-gray-200 p-3 text-sm text-gray-700 dark:border-white/10 dark:text-gray-200">
          No collections available right now.
        </div>
      ) : null}

      <div className="space-y-7">
        {rows.map((row) => (
          <section
            key={row.key}
            data-row-key={row.key}
            ref={(node) => {
              rowSectionRefs.current[row.key] = node;
            }}
            className="space-y-3 scroll-mt-36"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200/70 pb-2 dark:border-white/10">
              <h2 className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-lg font-black uppercase tracking-[0.06em] text-transparent dark:from-gray-100 dark:via-gray-200 dark:to-gray-400">
                {row.title}
              </h2>
              <Link
                href={`/search?q=${encodeURIComponent(row.categorySlug ?? row.queryTerm)}`}
                className="text-xs font-bold uppercase tracking-[0.08em] text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Browse
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {row.cards.slice(0, 10).map((c) => {
                const href = c.variantId != null ? `/p/${encodeURIComponent(c.slug)}?variantId=${encodeURIComponent(String(c.variantId))}` : `/p/${encodeURIComponent(c.slug)}`;
                const hasDiscount = c.mrp > c.sellingPrice;
                const discount = hasDiscount ? Math.round(((c.mrp - c.sellingPrice) / c.mrp) * 100) : 0;
                return (
                  <Link
                    key={`${row.key}-${c.id}-${c.variantId ?? "p"}`}
                    href={href}
                    className="rounded-2xl border border-gray-200/80 bg-white/90 p-2 shadow-[0_16px_32px_-22px_rgba(17,24,39,0.8)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_-24px_rgba(17,24,39,0.9)] dark:border-white/10 dark:bg-white/5"
                  >
                    {isValidImageUrl(c.thumbnailUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumbnailUrl} alt={c.name} className="aspect-square w-full rounded-xl object-cover" />
                    ) : (
                      <div className="aspect-square w-full rounded-xl bg-gray-100 dark:bg-white/10" />
                    )}

                    <div className="mt-2 space-y-1">
                      <div className="truncate text-xs font-extrabold text-gray-900 dark:text-gray-100">{c.brandName}</div>
                      <div className="line-clamp-2 text-[12px] text-gray-900 dark:text-gray-200">{c.name}</div>
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100">{formatMoney(c.sellingPrice)}</span>
                        {hasDiscount ? <span className="text-[11px] text-gray-500 line-through dark:text-gray-400">{formatMoney(c.mrp)}</span> : null}
                        {hasDiscount ? <span className="text-[11px] font-bold" style={{ color: "#ff905a" }}>({discount}% OFF)</span> : null}
                      </div>
                    </div>
                  </Link>
                );
              })}

              {row.cards.length > 10 ? (
                <Link
                  href={`/search?q=${encodeURIComponent(row.categorySlug ?? row.queryTerm)}`}
                  className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/75 p-3 text-center text-base font-extrabold text-gray-800 transition hover:-translate-y-1 hover:shadow-md dark:border-white/20 dark:bg-white/5 dark:text-gray-100"
                >
                  View All
                </Link>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
