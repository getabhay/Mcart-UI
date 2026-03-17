"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductDetail, Variant, ProductImage } from "@/features/product/types";
import { getProductBySlug } from "@/features/product/productApi";

const CART_COUNT_KEY = "mcart_cart_count_v1";

function formatMoney(n: number): string {
  return `₹${n.toFixed(0)}`;
}

function getAttrValue(variant: Variant, attrName: string): string | null {
  const found = variant.attributes.find((a) => a.attributeName.toLowerCase() === attrName.toLowerCase());
  return found?.value ?? null;
}

function getVariantColor(v: Variant): string | null {
  return getAttrValue(v, "Color") ?? getAttrValue(v, "Colour");
}

function getVariantSize(v: Variant): string | null {
  return getAttrValue(v, "Size");
}

function isVariantInStock(v: Variant): boolean {
  if (typeof v.stockQuantity === "number") return v.stockQuantity > 0;
  return (v.status ?? "").toUpperCase() === "ACTIVE";
}

function sortImages(images: ProductImage[]): ProductImage[] {
  return [...images].sort((a, b) => a.displayOrder - b.displayOrder);
}

function dedupeByUrl(images: ProductImage[]): ProductImage[] {
  const seen = new Set<string>();
  const out: ProductImage[] = [];
  for (const img of images) {
    if (!seen.has(img.imageUrl)) {
      seen.add(img.imageUrl);
      out.push(img);
    }
  }
  return out;
}

function buildGalleryImages(product: ProductDetail, variant: Variant | null): ProductImage[] {
  const variantImgs = variant?.images?.length ? sortImages(variant.images) : [];
  const productImgs = product.images?.length ? sortImages(product.images) : [];
  return dedupeByUrl([...variantImgs, ...productImgs]);
}

const COLOR_MAP: Record<string, string> = {
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

function colorHex(value: string | null): string {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "#d1d5db";
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v;
  if (v.startsWith("rgb(") || v.startsWith("rgba(")) return v;
  return COLOR_MAP[v] ?? "#d1d5db";
}

function deriveParentTags(path: string | null | undefined, leafName: string): string[] {
  const raw = (path ?? "").trim();
  if (!raw) return [];
  const parts = raw
    .split(/[/>|]/g)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^\d+$/.test(p));
  if (parts.length === 0) return [];
  const leaf = leafName.trim().toLowerCase();
  return parts.filter((p, i) => !(i === parts.length - 1 && p.toLowerCase() === leaf));
}

function IconLink() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

function IconTwitter() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d="M22 5.9c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.2 1.7-2.1-.7.4-1.6.8-2.5.9A3.8 3.8 0 0 0 12.4 8v.8A10.8 10.8 0 0 1 4.6 4.8a3.8 3.8 0 0 0 1.2 5 3.8 3.8 0 0 1-1.7-.5v.1c0 1.8 1.2 3.3 2.9 3.7-.3.1-.7.1-1 .1l-.7-.1c.5 1.6 2 2.8 3.8 2.8A7.7 7.7 0 0 1 3 17.4 10.8 10.8 0 0 0 8.8 19c7.1 0 11-5.9 11-11v-.5c.8-.5 1.5-1.2 2.1-2z" />
    </svg>
  );
}

function IconGooglePlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <text x="3" y="15" fontSize="10" fontWeight="700" fill="#db4437">G+</text>
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M7 9V4h10v5" />
      <path d="M6 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1" />
      <path d="M7 14h10v6H7z" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 7h12l-1 14H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

function IconHeart({ filled = false }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M12 21s-7-4.35-9.5-8.5C.7 9.1 2.4 5.8 5.9 5.2c1.9-.3 3.6.6 4.6 1.9 1-1.3 2.7-2.2 4.6-1.9 3.5.6 5.2 3.9 3.4 7.3C19 16.65 12 21 12 21z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-4.35-9.5-8.5C.7 9.1 2.4 5.8 5.9 5.2c1.9-.3 3.6.6 4.6 1.9 1-1.3 2.7-2.2 4.6-1.9 3.5.6 5.2 3.9 3.4 7.3C19 16.65 12 21 12 21z" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 10 12 2H4v8l8 8 8-8z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function readRatingCount(obj: unknown, key: string): number {
  if (!obj || typeof obj !== "object") return 0;
  const val = (obj as Record<string, unknown>)[key];
  return typeof val === "number" && Number.isFinite(val) ? val : 0;
}

function readCartCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(CART_COUNT_KEY);
  const n = Number(raw ?? "0");
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function writeCartCount(next: number) {
  if (typeof window === "undefined") return;
  const safe = Math.max(0, Math.floor(next));
  window.localStorage.setItem(CART_COUNT_KEY, String(safe));
  window.dispatchEvent(new Event("mcart:cart-count"));
}

function IconZoom() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  );
}


export default function ProductDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ productSlug: string }>();
  const slug = params.productSlug;

  const requestedVariantId = useMemo(() => {
    const raw = searchParams.get("variantId");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProductDetail | null>(null);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [hoverImageUrl, setHoverImageUrl] = useState<string | null>(null);
  const [selectedColorChoice, setSelectedColorChoice] = useState<string | null>(null);
  const [selectedSizeChoice, setSelectedSizeChoice] = useState<string | null>(null);
  const [selectionOutOfStock, setSelectionOutOfStock] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const [isMainImageHovered, setIsMainImageHovered] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [zoomPanelPos, setZoomPanelPos] = useState({ x: 16, y: 16 });
  const mainImageRef = useRef<HTMLDivElement | null>(null);
  const [isRatingHovered, setIsRatingHovered] = useState(false);
  const [isRatingPinned, setIsRatingPinned] = useState(false);
  const [cartQty, setCartQty] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const product = await getProductBySlug(slug);
        if (cancelled) return;
        setData(product);
        const fromQuery =
          requestedVariantId != null ? product.variants.find((v) => v.id === requestedVariantId)?.id ?? null : null;
        const firstVariant = product.variants[0] ?? null;
        const initial = product.variants.find((v) => v.id === (fromQuery ?? firstVariant?.id ?? -1)) ?? firstVariant;
        setSelectedVariantId(initial?.id ?? null);
        setSelectedColorChoice(initial ? getVariantColor(initial) : null);
        setSelectedSizeChoice(initial ? getVariantSize(initial) : null);
        setSelectionOutOfStock(false);
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
  }, [slug, requestedVariantId]);

  const selectedVariant = useMemo(() => {
    if (!data) return null;
    if (selectedVariantId == null) return data.variants[0] ?? null;
    return data.variants.find((v) => v.id === selectedVariantId) ?? data.variants[0] ?? null;
  }, [data, selectedVariantId]);

  useEffect(() => {
    if (!data || requestedVariantId == null) return;
    const exists = data.variants.some((v) => v.id === requestedVariantId);
    if (exists && requestedVariantId !== selectedVariantId) {
      setSelectedVariantId(requestedVariantId);
    }
  }, [data, requestedVariantId, selectedVariantId]);

  useEffect(() => {
    if (!selectedVariant) return;
    setSelectedColorChoice(getVariantColor(selectedVariant));
    setSelectedSizeChoice(getVariantSize(selectedVariant));
    setSelectionOutOfStock(false);
  }, [selectedVariant]);

  const galleryImages = useMemo(() => {
    if (!data) return [];
    return buildGalleryImages(data, selectedVariant);
  }, [data, selectedVariant]);

  const displayImageUrl = hoverImageUrl ?? selectedImageUrl;

  useEffect(() => {
    if (!data) return;
    const first = galleryImages[0]?.imageUrl ?? null;
    if (selectedImageUrl && galleryImages.some((i) => i.imageUrl === selectedImageUrl)) return;
    setSelectedImageUrl(first);
  }, [data, galleryImages, selectedImageUrl]);

  useEffect(() => {
    if (!hoverImageUrl) return;
    if (!galleryImages.some((i) => i.imageUrl === hoverImageUrl)) {
      setHoverImageUrl(null);
    }
  }, [galleryImages, hoverImageUrl]);

  useEffect(() => {
    if (galleryImages.length < 2) return;
    if (hoverImageUrl) return;
    if (isMainImageHovered) return;
    if (zoomEnabled) return;
    const t = window.setInterval(() => {
      setSelectedImageUrl((prev) => {
        const current = prev ?? galleryImages[0]?.imageUrl ?? null;
        if (!current) return current;
        const idx = galleryImages.findIndex((i) => i.imageUrl === current);
        const nextIdx = idx >= 0 ? (idx + 1) % galleryImages.length : 0;
        return galleryImages[nextIdx]?.imageUrl ?? current;
      });
    }, 2800);
    return () => window.clearInterval(t);
  }, [galleryImages, hoverImageUrl, isMainImageHovered, zoomEnabled]);

  const colorOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const v of data.variants) {
      const c = getVariantColor(v);
      if (c) set.add(c);
    }
    return Array.from(set);
  }, [data]);

  const sizeOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const v of data.variants) {
      const s = getVariantSize(v);
      if (s) set.add(s);
    }
    return Array.from(set);
  }, [data]);

  function pickVariant(nextColor: string | null, nextSize: string | null): Variant | null {
    if (!data) return null;
    return (
      data.variants.find((v) => {
        const vc = getVariantColor(v);
        const vs = getVariantSize(v);
        const colorOk = nextColor ? vc?.toLowerCase() === nextColor.toLowerCase() : true;
        const sizeOk = nextSize ? vs?.toLowerCase() === nextSize.toLowerCase() : true;
        return colorOk && sizeOk;
      }) ?? null
    );
  }

  if (loading) return null;
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">Error: {error}</div>;
  if (!data) return null;

  const selectedColor = selectedColorChoice ?? (selectedVariant ? getVariantColor(selectedVariant) : null);
  const selectedSize = selectedSizeChoice ?? (selectedVariant ? getVariantSize(selectedVariant) : null);

  const showRating =
    data.ratingSummary !== null &&
    typeof data.ratingSummary.averageRating === "number" &&
    data.ratingSummary.totalRatings > 0;
  const ratingText = showRating ? `${data.ratingSummary!.averageRating} (${data.ratingSummary!.totalRatings})` : null;
  const showRatingsPanel = showRating && (isRatingHovered || isRatingPinned);
  const source = data as unknown as Record<string, unknown>;
  const summary = data.ratingSummary as unknown as Record<string, unknown> | null;
  const ratingBreakdown = {
    5: readRatingCount(source, "totalRatingCount5") || readRatingCount(summary, "totalRatingCount5") || readRatingCount(summary, "ratingCount5"),
    4: readRatingCount(source, "totalRatingCount4") || readRatingCount(summary, "totalRatingCount4") || readRatingCount(summary, "ratingCount4"),
    3: readRatingCount(source, "totalRatingCount3") || readRatingCount(summary, "totalRatingCount3") || readRatingCount(summary, "ratingCount3"),
    2: readRatingCount(source, "totalRatingCount2") || readRatingCount(summary, "totalRatingCount2") || readRatingCount(summary, "ratingCount2"),
    1: readRatingCount(source, "totalRatingCount1") || readRatingCount(summary, "totalRatingCount1") || readRatingCount(summary, "ratingCount1"),
  };
  const maxRatingBucket = Math.max(1, ratingBreakdown[5], ratingBreakdown[4], ratingBreakdown[3], ratingBreakdown[2], ratingBreakdown[1]);

  const parentTags = deriveParentTags(data.category.path, data.category.name);
  const inStock = !selectionOutOfStock && (selectedVariant ? isVariantInStock(selectedVariant) : false);

  const selling = selectedVariant ? selectedVariant.sellingPrice : data.minPrice;
  const mrp = selectedVariant ? selectedVariant.mrp : data.maxPrice;
  const discount = mrp > selling ? `${Math.round(((mrp - selling) / mrp) * 100)}% OFF` : null;
  const zoomLevel = 6;
  function onMainImageMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!zoomEnabled) return;
    const el = mainImageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const x = (cursorX / rect.width) * 100;
    const y = (cursorY / rect.height) * 100;
    setZoomPos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });

    // Cursor-centered magnifier panel (single zoom UI).
    const panelSize = 176;
    const half = panelSize / 2;
    const panelX = Math.max(half + 8, Math.min(rect.width - half - 8, cursorX));
    const panelY = Math.max(half + 8, Math.min(rect.height - half - 8, cursorY));
    setZoomPanelPos({ x: panelX, y: panelY });

    if (!zoomActive) setZoomActive(true);
  }

  return (
    <div className="space-y-6 rounded-3xl border border-gray-200/80 bg-gradient-to-br from-white via-gray-50 to-indigo-50/40 p-4 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0b1118] dark:via-[#0f1724] dark:to-[#111827] dark:shadow-[0_20px_50px_-35px_rgba(0,0,0,0.9)] md:p-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-8">
        <div className="space-y-4 rounded-2xl border border-gray-200/70 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div
            ref={mainImageRef}
            className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            onMouseMove={onMainImageMove}
            onMouseEnter={() => {
              setIsMainImageHovered(true);
              if (zoomEnabled) setZoomActive(true);
            }}
            onMouseLeave={() => {
              setIsMainImageHovered(false);
              setZoomActive(false);
            }}
          >
            <button
              type="button"
              aria-label={zoomEnabled ? "Disable zoom" : `Enable ${zoomLevel}x zoom`}
              title={zoomEnabled ? "Disable zoom" : `Enable ${zoomLevel}x zoom`}
              className={`absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white/90 dark:bg-[#0f172a]/90 ${
                zoomEnabled ? "border-black text-black dark:border-white dark:text-white" : "border-gray-300 text-gray-700 dark:border-white/20 dark:text-gray-200"
              }`}
              onClick={() => {
                setZoomEnabled((v) => !v);
                setZoomActive(false);
              }}
            >
              <IconZoom />
            </button>

            {displayImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayImageUrl} alt={data.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" />
            )}

            {zoomEnabled && zoomActive && displayImageUrl ? (
              <>
                <div
                  className="pointer-events-none absolute z-10 hidden h-44 w-44 overflow-hidden rounded-full border-2 border-black bg-white shadow md:block dark:border-white dark:bg-[#0b1220]"
                  style={{ left: zoomPanelPos.x, top: zoomPanelPos.y, transform: "translate(-50%, -50%)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      transform: `scale(${zoomLevel})`,
                    }}
                  />
                  <div className="absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {zoomLevel}x
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {galleryImages.length > 0 ? (
            <div className="flex gap-2 overflow-auto pb-1">
              {galleryImages.map((img) => (
                <button
                  key={img.imageUrl}
                  type="button"
                  className={`h-16 w-16 flex-none overflow-hidden rounded-md border border-gray-200 dark:border-white/10 ${
                    (hoverImageUrl ?? selectedImageUrl) === img.imageUrl ? "ring-2 ring-black dark:ring-white" : ""
                  }`}
                  onMouseEnter={() => setHoverImageUrl(img.imageUrl)}
                  onMouseLeave={() => setHoverImageUrl(null)}
                  onClick={() => {
                    setSelectedImageUrl(img.imageUrl);
                    setHoverImageUrl(null);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Share</div>
              <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                title="Copy Link"
                aria-label="Copy Link"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-xs hover:bg-gray-50 dark:border-white/15 dark:text-gray-100 dark:hover:bg-white/10"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                  } catch {
                    // ignore
                  }
                }}
              >
                <IconLink />
              </button>
              <a
                title="G+"
                aria-label="G+"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-xs hover:bg-gray-50 dark:border-white/15 dark:text-gray-100 dark:hover:bg-white/10"
                href={`https://plus.google.com/share?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : pathname)}`}
                target="_blank"
                rel="noreferrer"
              >
                <IconGooglePlus />
              </a>
              <a
                title="Twitter"
                aria-label="Twitter"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-xs hover:bg-gray-50 dark:border-white/15 dark:text-gray-100 dark:hover:bg-white/10"
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : pathname)}&text=${encodeURIComponent(data.name)}`}
                target="_blank"
                rel="noreferrer"
              >
                <IconTwitter />
              </a>
              <a
                title="Mail"
                aria-label="Mail"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-xs hover:bg-gray-50 dark:border-white/15 dark:text-gray-100 dark:hover:bg-white/10"
                href={`mailto:?subject=${encodeURIComponent(data.name)}&body=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : pathname)}`}
              >
                <IconMail />
              </a>
              <button
                type="button"
                title="Print"
                aria-label="Print"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-xs hover:bg-gray-50 dark:border-white/15 dark:text-gray-100 dark:hover:bg-white/10"
                onClick={() => window.print()}
              >
                <IconPrint />
              </button>
            </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 md:p-5">
          <div className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">{data.brand.name}</div>
          <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">{data.name}</h1>
          {data.shortDescription ? <div className="text-sm text-gray-700 dark:text-gray-300">{data.shortDescription}</div> : null}
          {ratingText ? (
            <div
              className="relative inline-block"
              onMouseEnter={() => setIsRatingHovered(true)}
              onMouseLeave={() => setIsRatingHovered(false)}
            >
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded bg-white/95 px-2 py-1 text-[11px] font-semibold text-gray-900 ring-1 ring-gray-200 dark:bg-[#0f172a]/90 dark:text-gray-100 dark:ring-white/15"
                onClick={() => setIsRatingPinned((v) => !v)}
              >
                <span>{data.ratingSummary!.averageRating.toFixed(1)}</span>
                <span className="text-green-600">★</span>
                <span className="text-gray-400">|</span>
                <span>{data.ratingSummary!.totalRatings}</span>
              </button>

              {showRatingsPanel ? (
                <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[420px] rounded-md border border-gray-200 bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-[#0f172a]">
                  <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Ratings</div>
                  <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
                    <div className="space-y-1.5">
                      {[5, 4, 3, 2, 1].map((r) => {
                        const count = ratingBreakdown[r as 1 | 2 | 3 | 4 | 5];
                        const width = `${Math.round((count / maxRatingBucket) * 100)}%`;
                        return (
                          <div key={r} className="grid grid-cols-[28px_1fr_48px] items-center gap-2 text-xs">
                            <div className="inline-flex items-center gap-0.5 text-gray-700 dark:text-gray-300">
                              <span>{r}</span>
                              <span className="text-green-600">★</span>
                            </div>
                            <div className="h-2 rounded bg-gray-100 dark:bg-white/10">
                              <div className="h-2 rounded bg-green-500" style={{ width }} />
                            </div>
                            <div className="text-right text-gray-600 dark:text-gray-300">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded-md bg-gray-50 p-3 text-center dark:bg-white/5">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {data.ratingSummary!.averageRating.toFixed(1)}
                        <span className="ml-1 text-green-600">★</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">({data.ratingSummary!.totalRatings} ratings)</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <hr className="border-gray-200 dark:border-white/10" />

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">{formatMoney(selling)}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">MRP</span>
            <span className="text-sm text-gray-500 line-through dark:text-gray-400">{formatMoney(mrp)}</span>
            {discount ? <span className="text-sm font-semibold" style={{ color: "#ff905a" }}>({discount})</span> : null}
            <span className="ml-auto inline-flex items-center gap-2 text-base font-medium">
              <span className="text-gray-700 dark:text-gray-300">
                Availability:{" "}
                <span className={`inline-flex items-center gap-1.5 ${inStock ? "text-green-700" : "text-red-600"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${inStock ? "bg-green-500" : "bg-red-500"}`} />
                  {inStock ? "In Stock" : "Out of Stock"}
                </span>
              </span>
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">(inclusive of all taxes)</div>

          <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
            <IconTag />
            <span className="text-gray-600 dark:text-gray-400">Product code:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{selectedVariant?.sku ?? "-"}</span>
          </div>

          {parentTags.length > 0 ? (
            <div className="text-sm">
              <div className="mb-1 text-gray-600 dark:text-gray-400">Product tags</div>
              <div className="flex flex-wrap gap-1.5">
                {parentTags.map((t) => (
                  <span key={t} className="rounded-full border border-gray-200 bg-white/70 px-2 py-0.5 text-xs dark:border-white/15 dark:bg-white/5">{t}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
            <IconFolder />
            <span className="text-gray-600 dark:text-gray-400">Category:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{data.category.name}</span>
          </div>

          {data.variants.length > 0 ? (
            <div className="space-y-2 py-1">
              {colorOptions.length > 0 ? (
                <div>
                  <div className="mb-1 inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">Color : <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedColor ?? "-"}</span></div>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => {
                      const selected = selectedColor?.toLowerCase() === c.toLowerCase();
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-2.5 py-1.5 text-sm dark:border-white/15 dark:bg-white/5 ${selected ? "ring-2 ring-black dark:ring-white" : ""}`}
                          onClick={() => {
                            setSelectedColorChoice(c);
                            const chosen = pickVariant(c, selectedSize);
                            if (!chosen) {
                              setSelectionOutOfStock(true);
                              return;
                            }
                            setSelectionOutOfStock(false);
                            setSelectedVariantId(chosen.id);
                            router.replace(`${pathname}?variantId=${encodeURIComponent(String(chosen.id))}`, { scroll: false });
                          }}
                        >
                          <span className="h-4 w-4 rounded-full border border-gray-300" style={{ backgroundColor: colorHex(c) }} />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {sizeOptions.length > 0 ? (
                <div>
                  <div className="mb-1 inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">Select Size :</div>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((s) => {
                      const selected = selectedSize?.toLowerCase() === s.toLowerCase();
                      return (
                        <button
                          key={s}
                          type="button"
                          className={`rounded-md border border-gray-200 bg-white/80 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10 ${selected ? "ring-2 ring-black dark:ring-white" : ""}`}
                          onClick={() => {
                            setSelectedSizeChoice(s);
                            const chosen = pickVariant(selectedColor, s);
                            if (!chosen) {
                              setSelectionOutOfStock(true);
                              return;
                            }
                            setSelectionOutOfStock(false);
                            setSelectedVariantId(chosen.id);
                            router.replace(`${pathname}?variantId=${encodeURIComponent(String(chosen.id))}`, { scroll: false });
                          }}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {cartQty === 0 ? (
                    <button
                      type="button"
                      className="rounded-md bg-black px-5 py-2.5 text-base font-semibold text-white shadow-lg shadow-black/20 disabled:opacity-50 dark:bg-white dark:text-black dark:shadow-none"
                      disabled={!inStock}
                      onClick={() => {
                        setCartQty(1);
                        writeCartCount(readCartCount() + 1);
                      }}
                    >
                      <span className="inline-flex items-center gap-2"><IconBag />Add to cart</span>
                    </button>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/70 px-2 py-1.5 dark:border-white/15 dark:bg-white/5">
                        <button
                          type="button"
                          className="rounded px-2.5 py-0.5 text-lg font-semibold hover:bg-gray-100 dark:hover:bg-white/10"
                          onClick={() => {
                            if (cartQty <= 0) return;
                            setCartQty((q) => Math.max(0, q - 1));
                            writeCartCount(readCartCount() - 1);
                          }}
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-base font-semibold">{cartQty}</span>
                        <button
                          type="button"
                          className="rounded px-2.5 py-0.5 text-lg font-semibold hover:bg-gray-100 dark:hover:bg-white/10"
                          onClick={() => {
                            setCartQty((q) => q + 1);
                            writeCartCount(readCartCount() + 1);
                          }}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="rounded-md bg-green-600 px-4 py-2 text-base font-semibold text-white shadow-md shadow-green-700/30 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                      >
                        Go to Cart {"→"}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className={`rounded-md border border-gray-200 px-4 py-2.5 text-base dark:border-white/15 ${wishlisted ? "bg-pink-50 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300" : "hover:bg-gray-50 dark:hover:bg-white/10"}`}
                    onClick={() => setWishlisted((v) => !v)}
                    aria-label="Wishlist"
                  >
                    <IconHeart filled={wishlisted} />
                  </button>
                </div>

                <div className="ml-auto" />
              </div>
            </div>
          ) : null}

          {data.attributes.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="border-b border-gray-200 px-4 py-3 text-base font-semibold text-gray-900 dark:border-white/10 dark:text-gray-100">Product Specififcation</div>
              <div className="divide-y divide-gray-200 dark:divide-white/10">
                {data.attributes.map((a) => (
                  <div key={`${a.attributeId}-${a.value}`} className="grid grid-cols-[42%_58%] text-sm md:grid-cols-[36%_64%]">
                    <div className="bg-gray-50 px-4 py-3 text-gray-600 dark:bg-white/5 dark:text-gray-300">{a.attributeName}</div>
                    <div className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.value || "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.description ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Description</div>
              <div className="text-sm leading-6 text-gray-700 dark:text-gray-300">{data.description}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
