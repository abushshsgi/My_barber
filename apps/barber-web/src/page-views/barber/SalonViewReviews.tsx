"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2, Star } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import SalonViewShell from "./SalonViewShell";
import type { ApiReview, SalonMineRow } from "./salon-view-types";

async function fetchMineSalons(): Promise<SalonMineRow[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) return [];
  return res.json() as Promise<SalonMineRow[]>;
}

async function fetchSalonReviews(salonId: number): Promise<ApiReview[]> {
  const res = await apiFetch(`/api/v1/reviews/?salon=${salonId}`);
  if (!res.ok) throw new Error("Sharhlar yuklanmadi");
  const j = (await res.json()) as { results?: ApiReview[] } | ApiReview[];
  return Array.isArray(j) ? j : j.results || [];
}

export default function SalonViewReviews() {
  const [salonId, setSalonId] = useState<number | null>(null);

  const { data: salons = [] } = useQuery({
    queryKey: ["salons", "mine", "salon-view-reviews"],
    queryFn: fetchMineSalons,
    staleTime: 60_000,
  });

  const active = useMemo(() => salonId ?? salons[0]?.id ?? null, [salonId, salons]);

  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ["salon-view", "reviews", active],
    queryFn: () => fetchSalonReviews(active!),
    enabled: !!active,
  });

  const avg =
    reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  return (
    <SalonViewShell salonId={active} onSalonChange={setSalonId} title="Reviews">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
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

        {!isLoading && !error && reviews.length > 0 && (
          <>
            <Card className="rounded-3xl border-border/60 p-5 text-center">
              <p className="mb-1 text-4xl font-bold">{avg.toFixed(1)}</p>
              <StarRating rating={avg} size="md" showValue={false} />
              <p className="mt-1 text-sm text-muted-foreground">{reviews.length} ta sharh</p>
            </Card>

            <Card className="rounded-3xl border-border/60 space-y-2 p-4">
              {[5, 4, 3, 2, 1].map((r) => {
                const count = reviews.filter((rv) => rv.rating === r).length;
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={r} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-right">{r}</span>
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="gold-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
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
                <Card className="rounded-3xl border-border/60 p-3">
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
                  {review.text && (
                    <p className="text-sm leading-relaxed text-foreground/90">{review.text}</p>
                  )}
                </Card>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </SalonViewShell>
  );
}

