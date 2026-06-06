import { Link } from "@tanstack/react-router";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { salonCoverGradient, salonForOffer } from "@/components/offers/offers-shared";
import type { Offer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = { list: Offer[] };

export function OffersVariantSwipe({ list }: Props) {
  const { t } = useTranslation();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = (next: number) => {
    const el = scroller.current;
    if (!el || list.length === 0) return;
    const clamped = Math.max(0, Math.min(list.length - 1, next));
    const card = el.children[clamped] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setIndex(clamped);
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el || list.length === 0) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const node = child as HTMLElement;
      const nodeCenter = node.offsetLeft + node.offsetWidth / 2;
      const dist = Math.abs(center - nodeCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setIndex(closest);
  };

  if (list.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="relative -mx-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
        >
          {list.map((o) => {
            const salon = salonForOffer(o.salonId);
            const seed = salon?.coverSeed ?? o.salonId;
            return (
              <article
                key={o.id}
                className="relative w-[84vw] max-w-[320px] shrink-0 snap-center overflow-hidden rounded-[28px] bg-foreground text-background shadow-[0_24px_56px_-20px_oklch(0.145_0_0/0.28)]"
              >
                <div className="h-[200px]" style={{ background: salonCoverGradient(seed) }} />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                  <span className="rounded-full bg-background px-3 py-1 text-sm font-bold text-foreground">
                    −{o.discountPct}%
                  </span>
                  <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-background/80 backdrop-blur-sm">
                    {t("offersPage.swipeBadge")}
                  </span>
                </div>

                <div className="space-y-3 p-5 pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-background/50">
                      {o.salonName}
                    </p>
                    <h3 className="mt-1 text-xl font-bold leading-tight">{o.title}</h3>
                    <p className="mt-2 text-xs font-medium text-background/60">
                      {t("offersPage.validUntil", { date: o.validUntil })}
                      {salon ? ` · ${salon.distanceKm} km` : ""}
                    </p>
                  </div>

                  <Link
                    to="/booking/$salonId"
                    params={{ salonId: o.salonId }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-background py-3.5 text-sm font-bold text-foreground active:scale-[0.98] transition-transform"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    {t("offersPage.bookNow")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {list.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => scrollTo(index - 1)}
              disabled={index === 0}
              className="absolute left-0 top-[42%] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm disabled:opacity-30"
              aria-label={t("common.back")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo(index + 1)}
              disabled={index === list.length - 1}
              className="absolute right-0 top-[42%] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm disabled:opacity-30"
              aria-label="Keyingi"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex justify-center gap-1.5">
        {list.map((o, i) => (
          <button
            key={o.id}
            type="button"
            onClick={() => scrollTo(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-5 bg-foreground" : "w-1.5 bg-border",
            )}
            aria-label={`${i + 1}`}
          />
        ))}
      </div>

      <p className="text-center text-[11px] font-medium text-muted-foreground">
        {t("offersPage.swipeHint")}
      </p>
    </div>
  );
}
