import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";

/** Sidebar ustunidagi bitta salon kartochkasi (flex column). */
export function BazaarSidebarSalonCard({ salon }: { salon: Salon }) {
  const cover = salon.coverUrl ?? getSalonCoverUrl(salon.coverSeed, salon.category);

  return (
    <div className="flex flex-col">
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        preload="intent"
        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative aspect-[5/4] w-full overflow-hidden bg-surface">
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-[14px] font-bold leading-snug">{salon.name}</h3>
            {salon.rating > 0 ? (
              <span className="flex shrink-0 items-center gap-0.5 text-[13px] font-bold">
                <Star className="h-3.5 w-3.5 fill-foreground" strokeWidth={0} />
                {salon.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          {salon.priceFrom > 0 ? (
            <p className="text-[13px]">
              <span className="font-semibold tabular-nums">{shortPrice(salon.priceFrom)}</span>
              <span className="font-normal text-muted-foreground"> dan</span>
            </p>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
