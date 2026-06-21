import { Star } from "lucide-react";
import type { Review } from "@/lib/mock-data";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating ? "fill-foreground text-foreground" : "fill-muted text-muted",
          )}
        />
      ))}
    </div>
  );
}

export function SalonReviewsList({
  reviews,
  compact = false,
}: {
  reviews: Review[];
  compact?: boolean;
}) {
  if (!reviews.length) return null;

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {reviews.map((review) => (
        <article
          key={review.id}
          className={cn(
            "rounded-xl border border-border bg-background p-4",
            !compact && "p-5 shadow-sm",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold">
              {review.author
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{review.author}</p>
                <StarRow rating={review.rating} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{review.date}</p>
              {review.text ? (
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">{review.text}</p>
              ) : null}
              {review.photo ? (
                <img
                  src={resolveMediaUrl(review.photo) ?? review.photo}
                  alt=""
                  className="mt-3 max-h-52 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
