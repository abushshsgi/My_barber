"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Star } from "lucide-react";
import { EmptyState } from "@/panel/components/EmptyState";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= count ? "fill-foreground text-foreground" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export default function SalonReviews() {
  const { salonReviews, salons, salonView } = useApp();
  const avg = salonReviews.length
    ? salonReviews.reduce((s, r) => s + r.rating, 0) / salonReviews.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: salonReviews.filter((r) => r.rating === rating).length,
    pct: salonReviews.length
      ? (salonReviews.filter((r) => r.rating === rating).length / salonReviews.length) * 100
      : 0,
  }));

  return (
    <div className="page-container space-y-6 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Salon sharhlari</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {salonView?.name ? `${salonView.name} bo‘yicha mijozlar fikrlari.` : "Salon bo‘yicha mijozlar fikrlari."}
        </p>
      </div>

      {salons.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No salon connected"
          description="Salon View ishlashi uchun avval salonga ulangan bo‘lishingiz kerak."
        />
      ) : !salonView ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Loading salon…</p>
        </div>
      ) : salonReviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Hali salon uchun sharhlar yo‘q."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-6 shadow-sm">
          <div>
            <p className="text-5xl font-bold">{avg.toFixed(1)}</p>
            <Stars count={Math.round(avg)} />
            <p className="text-sm text-muted-foreground mt-1">{salonReviews.length} sharh</p>
          </div>
          <div className="flex-1 space-y-2">
            {distribution.map((d) => (
              <div key={d.rating} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{d.rating}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {salonReviews.length > 0 && (
        <div className="space-y-3">
          {salonReviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border bg-card p-5 shadow-sm flex gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                {review.author.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{review.author}</div>
                  <div className="text-xs text-muted-foreground">{review.date}</div>
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < review.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-foreground/90">{review.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
