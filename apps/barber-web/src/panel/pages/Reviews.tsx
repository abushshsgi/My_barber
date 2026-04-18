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

export default function Reviews() {
  const { reviews } = useApp();
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">What your clients say</p>
      </div>

      <div className="glass-card p-5 flex items-center gap-6">
        <div>
          <p className="text-4xl font-bold">{avg.toFixed(1)}</p>
          <Stars count={Math.round(avg)} />
          <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
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
