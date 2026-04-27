import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/reviews")({
  component: ReviewsPage,
});

function Stars({ value, size = 4 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            `size-${size}`,
            i < value ? "fill-foreground text-foreground" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function ReviewsPage() {
  const { reviews } = useBarberContext();
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length);
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-foreground">Sharhlar</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Mijozlardan kelgan baholar va izohlar.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-card">
        <div className="text-center sm:text-left sm:border-r border-border sm:pr-6">
          <div className="font-heading text-5xl font-semibold text-foreground">
            {avg.toFixed(1)}
          </div>
          <div className="mt-2 flex justify-center sm:justify-start">
            <Stars value={Math.round(avg)} size={5} />
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{reviews.length} ta sharh</div>
        </div>
        <div className="sm:col-span-2 space-y-2">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-muted-foreground">{d.star}★</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground"
                  style={{
                    width: `${(d.count / Math.max(1, reviews.length)) * 100}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start gap-3">
              <img src={r.avatar} alt="" className="size-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="font-medium text-sm">{r.client}</div>
                  <div className="text-xs text-muted-foreground">{r.date}</div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-xs text-muted-foreground">· {r.service}</span>
                </div>
                <p className="mt-2 text-sm text-foreground/90">{r.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
