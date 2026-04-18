"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Star } from "lucide-react";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= count ? "fill-foreground text-foreground" : "text-border"}`} />
      ))}
    </div>
  );
}

export default function SalonReviews() {
  const { reviews } = useApp();
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    pct: (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100,
  }));

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">Salon reviews</p>
      </div>

      <div className="glass-card p-6 flex flex-col sm:flex-row gap-6">
        <div className="text-center sm:text-left">
          <p className="text-5xl font-bold">{avg.toFixed(1)}</p>
          <Stars count={Math.round(avg)} />
          <p className="text-sm text-muted-foreground mt-1">{reviews.length} reviews</p>
        </div>
        <div className="flex-1 space-y-2">
          {distribution.map((d) => (
            <div key={d.rating} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-3">{d.rating}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-foreground/70 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-6 text-right">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-semibold">{review.author.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium">{review.author}</span>
              </div>
              <span className="text-xs text-muted-foreground">{review.date}</span>
            </div>
            <Stars count={review.rating} />
            <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
