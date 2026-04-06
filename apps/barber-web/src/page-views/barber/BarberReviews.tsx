"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBarberMe } from "@/data/barber-me";
import { apiFetch } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/StarRating";
import { Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type ApiReview = {
  id: number;
  author_name: string;
  rating: number;
  text: string;
  photo: string | null;
  created_at: string;
};

async function fetchReviewsForBarber(barberId: number): Promise<ApiReview[]> {
  const res = await apiFetch(`/api/v1/reviews/?barber=${barberId}`);
  if (!res.ok) throw new Error("Sharhlar yuklanmadi");
  const j = (await res.json()) as { results?: ApiReview[] } | ApiReview[];
  return Array.isArray(j) ? j : j.results || [];
}

const BarberReviews = () => {
  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ["barber", "auth", "me"],
    queryFn: fetchBarberMe,
    staleTime: 60_000,
  });

  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ["barber", "reviews", "list", me?.id],
    queryFn: () => fetchReviewsForBarber(me!.id),
    enabled: !!me?.id,
  });

  const avg =
    reviews.length > 0
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : 0;

  if (loadingMe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur-lg">
        <h1 className="text-xl font-bold">Sharhlar</h1>
      </div>

      <div className="space-y-4 p-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}
        {error && (
          <p className="text-center text-sm text-destructive">{(error as Error).message}</p>
        )}

        {!isLoading && !error && reviews.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Hozircha sharh yo‘q.</p>
        )}

        {!isLoading && reviews.length > 0 && (
          <>
            <Card className="p-5 text-center">
              <p className="mb-1 text-4xl font-bold">{avg.toFixed(1)}</p>
              <StarRating rating={avg} size="md" showValue={false} />
              <p className="mt-1 text-sm text-muted-foreground">{reviews.length} ta sharh</p>
            </Card>

            <Card className="space-y-2 p-4">
              {[5, 4, 3, 2, 1].map((r) => {
                const count = reviews.filter((rv) => rv.rating === r).length;
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-right">{r}</span>
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="gold-gradient h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </Card>

            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {(review.author_name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{review.author_name || "Mijoz"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleString()}
                      </p>
                    </div>
                    <StarRating rating={review.rating} size="sm" showValue={false} />
                  </div>
                  {review.text ? (
                    <p className="text-sm text-muted-foreground">{review.text}</p>
                  ) : null}
                  {review.photo ? (
                    <img
                      src={mediaSrc(review.photo, PLACEHOLDER_AVATAR)}
                      alt=""
                      className="mt-2 max-h-48 w-full rounded-xl object-cover"
                    />
                  ) : null}
                </Card>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default BarberReviews;
