import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { useBarberMe } from "@/lib/barber-queries";

export type ReviewApi = {
  id: number;
  booking: number;
  author_name: string;
  rating: number;
  text: string;
  photo: string | null;
  created_at: string;
};

export function useMyReviews() {
  const me = useBarberMe();
  const barberId = me.data?.id;
  return useQuery({
    queryKey: ["reviews", "barber", barberId ?? null],
    enabled: !!barberId,
    queryFn: () => apiJson<ReviewApi[]>(`/api/v1/reviews/?barber=${encodeURIComponent(String(barberId))}`),
  });
}

