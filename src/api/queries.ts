import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { ProductDetail } from "@/types/product";

export function useProductDetail(
  id: number,
  options?: Omit<UseQueryOptions<ProductDetail>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch product detail");
      }
      const data = await response.json();
      return data.product as ProductDetail;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}
