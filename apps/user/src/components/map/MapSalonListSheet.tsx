import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Navigation, Star, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  salons: Salon[];
  activeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export function MapSalonListSheet({ open, salons, activeId, onClose, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 z-50 mx-auto flex max-h-[70dvh] max-w-[480px] flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background shadow-[0_-8px_32px_rgba(0,0,0,0.15)] lg:max-w-[720px]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
              <h2 className="text-sm font-bold">
                {t("map.allSalons")}{" "}
                <span className="text-muted-foreground">({salons.length})</span>
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface active:scale-95"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {salons.map((s) => {
                const isActive = s.id === activeId;
                const coverSrc = s.coverUrl ?? getSalonCoverUrl(s.coverSeed);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelect(s.id);
                      onClose();
                    }}
                    className={cn(
                      "mb-1.5 flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left transition-colors",
                      isActive
                        ? "border-foreground/80 bg-surface"
                        : "border-transparent active:bg-surface/80",
                    )}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                      <img
                        src={coverSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-[12px] font-bold leading-tight">{s.name}</h4>
                      <p className="truncate text-[10px] text-muted-foreground">{s.address || "—"}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold">
                        <span className="flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-foreground" strokeWidth={0} />
                          {s.rating > 0 ? s.rating.toFixed(1) : "—"}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span>{formatDistanceKm(s.distanceKm)}</span>
                        {s.priceFrom > 0 ? (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span>{shortPrice(s.priceFrom)}+</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      to="/salon/$id"
                      params={{ id: s.id }}
                      onClick={(e) => e.stopPropagation()}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-background active:scale-95"
                    >
                      <Navigation className="h-3 w-3" />
                    </Link>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function MapSalonListToggle({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex w-full items-center justify-center gap-1 rounded-full bg-background/95 py-2 text-[11px] font-bold shadow-sm backdrop-blur-sm active:scale-[0.98]"
    >
      {t("map.allSalons")} ({count})
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
  );
}
