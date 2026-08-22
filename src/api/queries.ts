import axios from "axios";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { ProductDetail } from "@/types/product";

export function useProductDetail(
  id: number,
  options?: Omit<UseQueryOptions<ProductDetail>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/products/${id}`);
      return data.product as ProductDetail;
    },
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}
