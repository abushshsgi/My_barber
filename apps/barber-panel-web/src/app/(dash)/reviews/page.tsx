"use client";

import { Topbar } from "@/components/Topbar";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyReviews } from "@/queries/reviews";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i < count ? "fill-foreground text-foreground" : "text-border")}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const q = useMyReviews();
  const rows = q.data ?? [];
  const avg = rows.length ? rows.reduce((s, r) => s + Number(r.rating || 0), 0) / rows.length : 0;

  return (
    <>
      <Topbar title="Reviews" />
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-border p-5">
          <span className="text-display text-4xl font-semibold">{avg.toFixed(1)}</span>
          <div>
            <Stars count={Math.round(avg)} />
            <p className="mt-1 text-[13px] text-muted-foreground">{rows.length} reviews</p>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((review) => {
            const d = new Date(review.created_at);
            const dateLabel = Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
            return (
              <div key={review.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[12px] font-medium">
                      {(review.author_name || "?")
                        .split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{review.author_name}</p>
                      <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
                    </div>
                  </div>
                  <Stars count={review.rating} />
                </div>
                <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">{review.text}</p>
              </div>
            );
          })}
          {q.isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {!q.isLoading && rows.length === 0 && <div className="text-sm text-muted-foreground">No reviews yet.</div>}
        </div>
      </div>
    </>
  );
}

