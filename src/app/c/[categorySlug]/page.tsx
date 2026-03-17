import { redirect } from "next/navigation";

type CategoryPageProps = {
  params: { categorySlug: string };
};

export default function CategoryPage({ params }: CategoryPageProps) {
  const slug = (params.categorySlug ?? "").trim();
  const href = slug ? `/search?q=${encodeURIComponent(slug)}` : "/search";
  redirect(href);
}
