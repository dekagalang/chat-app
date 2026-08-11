import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { ProductDetail } from "@/types/product";

export function useAutolarisProductDetail(
  slug: string | string[] | undefined,
  options?: Omit<UseQueryOptions<ProductDetail>, "queryKey" | "queryFn"> & {
    enabled?: boolean;
  },
) {
  const { enabled = true, ...queryOptions } = options || {};

  return useQuery({
    queryKey: ["autolaris", "product-detail", slug],
    queryFn: async () => {
      if (!slug || typeof slug !== "string") {
        throw new Error("Invalid product slug");
      }

      const response = await fetch(`/api/v1/produk/detail/${encodeURIComponent(slug)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch product detail");
      }

      const data = await response.json();
      return (data?.data ?? data) as ProductDetail;
    },
    enabled: enabled && !!slug && typeof slug === "string",
    staleTime: 0,
    ...queryOptions,
  });
}
