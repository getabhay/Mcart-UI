// src/features/search/types.ts

export type FacetBucket = {
  key: string;
  label: string;
  count: number;
};

export type PriceFacet = {
  min: number | null;
  max: number | null;
};

export type RatingFacet = {
  buckets: Array<{
    key?: string;
    label?: string;
    count?: number;
  }>;
};

export type VariantAttr = {
  attributeId: number;
  attributeSlug: string;
  valueId: number;
  valueSlug: string;
};

export type ProductVariant = {
  id: number;
  sku: string;

  mrp: number;
  sellingPrice: number;

  stockQuantity: number;
  isActive: boolean;
  status: string;

  thumbnailUrl: string | null;

  attrs: VariantAttr[];
};

export type SearchItem = {
  id: number;
  name: string;
  slug: string;

  status: string;
  isActive: boolean;

  brandId: number;
  brandName: string;
  brandSlug: string;

  categoryId: number;
  categoryName: string;
  categorySlug: string;

  categoryPath: string;
  categoryPathIds: number[];
  categoryPathNames: string[];
  categoryPathSlugs: string[];

  minPrice: number;
  maxPrice: number;

  avgRating: number | null;

  /**
   * Backend fields (per latest response):
   * - totalRatingCount
   * - totalRatingCount1..totalRatingCount5 (optional breakdown)
   */
  totalRatingCount: number;
  totalRatingCount1?: number;
  totalRatingCount2?: number;
  totalRatingCount3?: number;
  totalRatingCount4?: number;
  totalRatingCount5?: number;

  popularityScore: number;

  variants: ProductVariant[];

  thumbnailUrl: string | null;
};

export type SearchFacets = {
  brands: FacetBucket[];
  categories: FacetBucket[];
  price: PriceFacet;
  rating: RatingFacet;

  productAttributes: Record<string, FacetBucket[]>;
  variantAttributes: Record<string, FacetBucket[]>;
};

export type SearchResponse = {
  total: number;
  totalVariantCount?: number;
  totalVariants?: number;
  page: number;
  size: number;

  originalQuery: string | null;
  correctedQuery: string | null;
  usedQuery: string | null;

  didYouMean: string[];
  items: SearchItem[];

  facets: SearchFacets;
};

// ✅ We will always send arrays to backend (as your curl examples)
export type SearchRequest = {
  page: number;
  size: number;

  q?: string;

  brandSlugs?: string[];
  brandIds?: number[];

  // ✅ Multi-category filters (new)
  categoryPathPrefixes?: string[];
  categoryIds?: number[];
  categorySlugs?: string[];

  // (Optional backward compatibility)
  categoryPathPrefix?: string;
  categoryId?: number;

  minPrice?: number;
  maxPrice?: number;
  minRating?: number;

  // ✅ always arrays
  attributes?: Record<string, string[]>;
  variantAttributes?: Record<string, string[]>;

  sort?: string;
};

/**
 * Autocomplete API types:
 * GET /api/search/products/autocomplete?q=women
 *
 * Response is an array where each entry is variant-level.
 */
export type AutocompleteItem = {
  id: number;
  name: string;
  slug: string;

  brandName: string;
  brandSlug: string;

  categoryName: string;
  categorySlug: string;

  thumbnailUrl: string | null;

  mrp: number;
  sellingPrice: number;

  variantId: number;
  sku: string;

  avgRating: number | null;
  totalRatingCount: number;
};

export type AutocompleteResponse = AutocompleteItem[];
