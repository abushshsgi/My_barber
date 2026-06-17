import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { List, Map as MapIcon, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Salon } from "@/lib/mock-data";
import { shortPrice } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";
import { formatDistanceKm } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

const CARD_HEIGHT = 172;
const IMAGE_WIDTH = 158;

const spring = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };

type Props = {
  salons: Salon[];
  activeId: string;
  onActiveChange: (id: string) => void;
};

function SalonCoverImage({
  salon,
  className,
  imgClassName,
  mode = "contain",
}: {
  salon: Salon;
  className?: string;
  imgClassName?: string;
  mode?: "contain" | "cover";
}) {
  const fallback = getSalonCoverUrl(salon.coverSeed);
  const [src, setSrc] = useState(salon.coverUrl ?? fallback);

  useEffect(() => {
    setSrc(salon.coverUrl ?? fallback);
  }, [salon.coverUrl, salon.coverSeed, fallback]);

  return (
    <div className={cn("relative overflow-hidden bg-[#E8E8E8]", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setSrc(fallback)}
        className={cn(
          "absolute inset-0 h-full w-full",
          mode === "cover" ? "object-cover object-center" : "object-contain object-center p-1",
          imgClassName,
        )}
      />
    </div>
  );
}

function SalonSlideCard({ salon, isActive }: { salon: Salon; isActive: boolean }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-2xl bg-background shadow-[0_10px_32px_rgba(0,0,0,0.18)] ring-1 transition-shadow",
        isActive ? "ring-foreground/45" : "ring-black/5",
      )}
      style={{ height: CARD_HEIGHT }}
    >
      <Link
        to="/salon/$id"
        params={{ id: salon.id }}
        className="active:opacity-95"
        style={{ width: IMAGE_WIDTH }}
      >
        <SalonCoverImage salon={salon} className="h-full w-full" mode="contain" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col px-3 py-3">
        <div className="min-w-0 flex-1">
          <Link to="/salon/$id" params={{ id: salon.id }}>
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight">{salon.name}</h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-muted-foreground">
            {salon.address || "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-semibold">
            {salon.rating > 0 ? (
              <span className="flex items-center gap-0.5">
                <Star className="h-3.5 w-3.5 fill-foreground" strokeWidth={0} />
                {salon.rating.toFixed(1)}
                {salon.reviewCount > 0 ? (
                  <span className="text-muted-foreground">({salon.reviewCount})</span>
                ) : null}
              </span>
            ) : null}
            <span className="text-muted-foreground">{formatDistanceKm(salon.distanceKm)}</span>
            {salon.priceFrom > 0 ? <span>{shortPrice(salon.priceFrom)}+</span> : null}
          </div>
        </div>

        <Link
          to="/booking/$salonId"
          params={{ salonId: salon.id }}
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-foreground py-2.5 text-[13px] font-bold text-background active:scale-[0.98]"
        >
          {t("map.bookNow")}
        </Link>
      </div>
    </div>
  );
}

const listCardVariants = {
  hidden: { opacity: 0, y: 56 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const listStaggerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } },
};

/** Airbnb qidiruv ro'yxati — katta rasm yuqorida, ma'lumot pastda. */
function SalonVerticalCard({
  salon,
  isActive,
  onSelect,
}: {
  salon: Salon;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <article
      className={cn(
        "mb-5 w-full text-left",
        isActive && "rounded-2xl ring-2 ring-foreground/25 ring-offset-2 ring-offset-background",
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left active:opacity-95">
        <SalonCoverImage
          salon={salon}
          mode="cover"
          className="aspect-[4/3] w-full rounded-2xl"
        />
        <div className="mt-2.5 flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[16px] font-bold leading-snug tracking-tight">{salon.name}</h3>
          {salon.rating > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold">
              <Star className="h-3.5 w-3.5 fill-foreground" strokeWidth={0} />
              {salon.rating.toFixed(2)}
              {salon.reviewCount > 0 ? (
                <span className="text-muted-foreground">({salon.reviewCount})</span>
              ) : null}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">
          {salon.address || "—"}
          {salon.distanceKm > 0 ? ` · ${formatDistanceKm(salon.distanceKm)}` : ""}
        </p>
        {salon.priceFrom > 0 ? (
          <p className="mt-1 text-[14px] font-bold">
            {shortPrice(salon.priceFrom)}
            <span className="text-[12px] font-semibold text-muted-foreground">+</span>
          </p>
        ) : null}
      </button>

      <Link
        to="/booking/$salonId"
        params={{ salonId: salon.id }}
        className="mt-2.5 flex w-full items-center justify-center rounded-xl bg-foreground py-3 text-[13px] font-bold text-background active:scale-[0.98]"
      >
        {t("map.bookNow")}
      </Link>
    </article>
  );
}

export function MapAirbnbCarousel({ salons, activeId, onActiveChange }: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    if (listOpen) return;
    const root = scrollRef.current;
    if (!root || !activeId) return;
    const el = root.querySelector(`[data-salon-id="${activeId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId, listOpen]);

  useEffect(() => {
    if (!listOpen || !activeId) return;
    const el = listScrollRef.current?.querySelector(`[data-list-id="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [listOpen, activeId]);

  const syncActiveFromScroll = () => {
    const root = scrollRef.current;
    if (!root || salons.length === 0) return;
    const center = root.scrollLeft + root.clientWidth / 2;
    let closestId = salons[0].id;
    let closestDist = Infinity;
    root.querySelectorAll<HTMLElement>("[data-salon-id]").forEach((el) => {
      const id = el.dataset.salonId;
      if (!id) return;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(elCenter - center);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    });
    if (closestId !== activeId) onActiveChange(closestId);
  };

  const onScroll = () => {
    if (scrollRaf.current != null) return;
    scrollRaf.current = window.requestAnimationFrame(() => {
      scrollRaf.current = null;
      syncActiveFromScroll();
    });
  };

  if (salons.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {listOpen ? (
          <>
            <motion.button
              type="button"
              aria-label={t("common.close")}
              className="absolute inset-0 z-30 bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setListOpen(false)}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-[20px] bg-background shadow-[0_-20px_60px_rgba(0,0,0,0.22)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={spring}
              style={{
                top: "calc(env(safe-area-inset-top) + 96px)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
                <h2 className="text-[15px] font-bold tracking-tight">
                  {t("map.allSalons")}{" "}
                  <span className="text-muted-foreground">({salons.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setListOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-surface active:scale-95"
                  aria-label={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <motion.div
                ref={listScrollRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-24"
                initial="hidden"
                animate="visible"
                variants={listStaggerVariants}
              >
                {salons.map((s) => (
                  <motion.div
                    key={s.id}
                    data-list-id={s.id}
                    variants={listCardVariants}
                  >
                    <SalonVerticalCard
                      salon={s}
                      isActive={s.id === activeId}
                      onSelect={() => onActiveChange(s.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>

              <motion.button
                type="button"
                onClick={() => setListOpen(false)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ delay: 0.15, ...spring }}
                className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-[14px] font-bold text-background shadow-[0_8px_28px_rgba(0,0,0,0.28)] active:scale-[0.97]"
                style={{ marginBottom: "env(safe-area-inset-bottom)" }}
              >
                <MapIcon className="h-4 w-4" strokeWidth={2.5} />
                {t("nav.map")}
              </motion.button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {!listOpen ? (
        <div
          className="absolute inset-x-0 bottom-0 z-30 px-3"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        >
          <div className="mb-2 flex justify-center">
            <motion.button
              type="button"
              onClick={() => setListOpen(true)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-4 py-2.5 text-[12px] font-bold shadow-[0_4px_20px_rgba(0,0,0,0.14)] active:opacity-90"
            >
              <List className="h-4 w-4" />
              {t("map.allSalons")} ({salons.length})
            </motion.button>
          </div>

          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="no-scrollbar flex gap-3 snap-x snap-mandatory overflow-x-auto pb-1"
          >
            {salons.map((s) => (
              <div
                key={s.id}
                data-salon-id={s.id}
                className="w-[calc(100%-2px)] shrink-0 snap-center sm:w-[94%]"
              >
                <SalonSlideCard salon={s} isActive={s.id === activeId} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
