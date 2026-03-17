import { redirect } from "next/navigation";

type BrandPageProps = {
  params: { brandSlug: string };
};

export default function BrandPage({ params }: BrandPageProps) {
  const slug = (params.brandSlug ?? "").trim();
  const href = slug ? `/search?q=${encodeURIComponent(slug)}` : "/search";
  redirect(href);
}
