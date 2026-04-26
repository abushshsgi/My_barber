"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            cls,
            i <= value ? "fill-foreground text-foreground" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { reviews } = useApp();
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Sharhlar</h1>
        <p className="text-muted-foreground text-sm mt-1">Mijozlardan kelgan baholar va izohlar.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-sm">
        <div className="text-center sm:text-left sm:border-r border-border sm:pr-6">
          <div className="text-5xl font-bold text-foreground">{avg.toFixed(1)}</div>
          <div className="mt-2 flex justify-center sm:justify-start">
            <Stars value={Math.round(avg)} size="md" />
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{reviews.length} ta sharh</div>
        </div>
        <div className="sm:col-span-2 space-y-2">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-muted-foreground">{d.star}★</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${(d.count / Math.max(1, reviews.length)) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                {review.author.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="font-medium text-sm">{review.author}</div>
                  <div className="text-xs text-muted-foreground">{review.date}</div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={review.rating} />
                </div>
                <p className="mt-2 text-sm text-foreground/90">{review.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
