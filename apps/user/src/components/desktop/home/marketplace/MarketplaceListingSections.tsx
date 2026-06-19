import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Salon } from "@/lib/mock-data";
import { DesktopSalonCard } from "@/components/desktop/ui/DesktopSalonCard";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  salons: Salon[];
  viewAllTo?: string;
  className?: string;
};

export function MarketplaceListingRow({ title, subtitle, salons, viewAllTo, className }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (salons.length === 0) return null;

  const scroll = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className={cn("py-2", className)}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {viewAllTo ? (
            <Link to={viewAllTo} className="mr-2 text-sm font-semibold underline-offset-2 hover:underline">
              Hammasi
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Oldinga"
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background hover:shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Keyingi"
            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background hover:shadow-sm"
          >
            <ChevRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {salons.map((salon) => (
          <div key={salon.id} className="w-[280px] shrink-0">
            <DesktopSalonCard salon={salon} variant="marketplace" />
          </div>
        ))}
      </div>
    </section>
  );
}

type GridProps = {
  title: string;
  subtitle?: string;
  salons: Salon[];
  loading?: boolean;
  emptyHint?: string;
};

export function MarketplaceListingGrid({ title, subtitle, salons, loading, emptyHint }: GridProps) {
  return (
    <section className="mt-4 pt-6">
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      {loading ? (
        <div className="mt-6 grid grid-cols-4 gap-x-6 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-xl bg-surface" />
              <div className="mt-3 h-4 w-3/4 rounded bg-surface" />
              <div className="mt-2 h-3 w-1/2 rounded bg-surface" />
            </div>
          ))}
        </div>
      ) : salons.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="mt-6 grid grid-cols-4 gap-x-6 gap-y-10 xl:grid-cols-5">
          {salons.map((salon) => (
            <DesktopSalonCard key={salon.id} salon={salon} variant="marketplace" />
          ))}
        </div>
      )}
    </section>
  );
}
