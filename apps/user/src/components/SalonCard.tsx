"use client";

import { forwardRef } from "react";
import { StarRating } from "./StarRating";
import { MapPin, Crown, Clock, ArrowRight } from "lucide-react";
import { Link } from "@/navigation";
import { motion } from "framer-motion";
import type { Salon } from "@/types";
import { mediaSrc } from "@/lib/media";

export type SalonCardProps = {
  salon: Salon;
  index?: number;
};

function coverSrc(salon: Salon): string {
  const img = salon.coverImage as string | undefined;
  return mediaSrc(img, "/placeholder.svg");
}

export const SalonCard = forwardRef<HTMLDivElement, SalonCardProps>(function SalonCard(
  { salon, index = 0 },
  ref
) {
  return (
    <Link href={`/salon/${salon.id}`} className="block cursor-pointer">
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.05,
          duration: 0.35,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex gap-3.5 p-3 rounded-2xl bg-card border border-border/50 hover:border-accent/30 hover:bg-muted/35 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 group card-shadow">
          <div className="relative w-[100px] h-[100px] rounded-xl overflow-hidden shrink-0 bg-muted">
            <img
              src={coverSrc(salon)}
              alt={salon.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {salon.isPremium && (
              <div className="absolute top-1.5 left-1.5 gold-gradient px-1.5 py-0.5 rounded-md flex items-center gap-0.5 text-[9px] font-bold text-gold-foreground">
                <Crown className="h-2.5 w-2.5" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-foreground text-[15px] truncate group-hover:text-accent transition-colors duration-200">
                  {salon.name}
                </h3>
                <div className="shrink-0">
                  <StarRating rating={salon.rating} size="sm" />
                </div>
              </div>
              <p className="text-muted-foreground text-xs line-clamp-1 mt-0.5">
                {salon.description}
              </p>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {salon.distance} km
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {salon.workingHours.open}–{salon.workingHours.close}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

SalonCard.displayName = "SalonCard";
