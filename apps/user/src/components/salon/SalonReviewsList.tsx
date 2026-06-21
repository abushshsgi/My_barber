import { Star } from "lucide-react";
import type { Review } from "@/lib/mock-data";
import { resolveMediaUrl } from "@/lib/media-url";

export function SalonReviewsList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article key={review.id} className="rounded-2xl bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">{review.author}</p>
            <div className="flex items-center gap-1 text-sm font-bold">
              <Star className="h-3.5 w-3.5 fill-foreground" />
              {review.rating}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{review.date}</p>
          {review.text ? <p className="mt-3 text-sm leading-relaxed">{review.text}</p> : null}
          {review.photo ? (
            <img
              src={resolveMediaUrl(review.photo) ?? review.photo}
              alt=""
              className="mt-3 max-h-48 w-full rounded-xl object-cover"
            />
          ) : null}
        </article>
      ))}
    </div>
  );
}
