import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/salon-view/reviews")({
  component: SalonReviewsPage,
});

function SalonReviewsPage() {
  const { reviews, salon } = useBarberContext();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-foreground">Salon sharhlari</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {salon.name} bo'yicha mijozlar fikrlari.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-6 shadow-card">
        <div>
          <div className="font-heading text-5xl font-semibold">{salon.rating.toFixed(1)}</div>
          <div className="flex items-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-4",
                  i < Math.round(salon.rating)
                    ? "fill-foreground text-foreground"
                    : "text-muted-foreground/30",
                )}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{salon.reviews_count} sharh</div>
        </div>
        <div className="flex-1 text-sm text-muted-foreground">
          Salon mijozlardan yuqori baholarga ega. Davom eting!
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-card flex gap-3">
            <img src={r.avatar} alt="" className="size-10 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{r.client}</div>
                <div className="text-xs text-muted-foreground">{r.date}</div>
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "size-3.5",
                      i < r.rating
                        ? "fill-foreground text-foreground"
                        : "text-muted-foreground/30",
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-foreground/90">{r.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
