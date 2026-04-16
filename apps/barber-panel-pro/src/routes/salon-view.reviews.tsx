import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { mockReviews } from "@/lib/mock-data";
import { Star } from "lucide-react";

export const Route = createFileRoute("/salon-view/reviews")({
  component: SalonReviewsPage,
});

function SalonReviewsPage() {
  const avg = mockReviews.reduce((s, r) => s + r.rating, 0) / mockReviews.length;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: mockReviews.filter((r) => r.rating === rating).length,
    pct: (mockReviews.filter((r) => r.rating === rating).length / mockReviews.length) * 100,
  }));

  return (
    <>
      <Topbar title="Salon Reviews" />
      <div className="p-6">
        {/* Summary */}
        <div className="flex gap-8 rounded-xl border border-border p-6">
          <div className="text-center">
            <span className="text-display text-5xl font-semibold">{avg.toFixed(1)}</span>
            <div className="mt-2 flex justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < Math.round(avg) ? "fill-foreground text-foreground" : "text-border"}`}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">{mockReviews.length} reviews</p>
          </div>
          <div className="flex-1 space-y-2">
            {distribution.map((d) => (
              <div key={d.rating} className="flex items-center gap-3">
                <span className="w-3 text-[12px] text-muted-foreground">{d.rating}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="w-6 text-right text-[12px] text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews list */}
        <div className="mt-6 space-y-3">
          {mockReviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[12px] font-medium">
                    {review.author.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.author}</p>
                    <p className="text-[11px] text-muted-foreground">{review.date}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < review.rating ? "fill-foreground text-foreground" : "text-border"}`}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
