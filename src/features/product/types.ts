export type ProductImage = {
  imageUrl: string;
  imageType: string; // "GALLERY" etc
  displayOrder: number;
};

export type ProductAttribute = {
  attributeId: number;
  attributeName: string;
  value: string;
};

export type Variant = {
  id: number;
  sku: string;
  mrp: number;
  sellingPrice: number;
  stockQuantity?: number;
  status: string;
  attributes: ProductAttribute[];
  images: ProductImage[];
};

export type BrandRef = {
  id: number;
  name: string;
  slug: string;
};

export type CategoryRef = {
  id: number;
  name: string;
  slug: string;
  path: string;
};

export type RatingSummary = {
  averageRating: number;
  totalRatings: number;
};

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;

  shortDescription: string | null;
  description: string | null;

  status: string;

  brand: BrandRef;
  category: CategoryRef;

  minPrice: number;
  maxPrice: number;

  attributes: ProductAttribute[];
  variants: Variant[];

  images: ProductImage[];

  ratingSummary: RatingSummary | null;
};
