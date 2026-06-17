import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Persona katalog rasmlari 768×1024, fon #E8E8E8 — to'liq ko'rinish uchun contain. */
const CATALOG_BG = "#E8E8E8";

type HairstylePreviewImageProps = {
  src: string;
  alt: string;
  /** card — detail/try-on; thumb — explore grid */
  variant?: "card" | "thumb";
  className?: string;
  badge?: ReactNode;
};

export function HairstylePreviewImage({
  src,
  alt,
  variant = "card",
  className,
  badge,
}: HairstylePreviewImageProps) {
  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden",
        variant === "card" ? "rounded-3xl" : "rounded-2xl",
        className,
      )}
      style={{ backgroundColor: CATALOG_BG }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
      {badge ? <div className="absolute left-3 top-3 z-[1]">{badge}</div> : null}
    </div>
  );
}

export function HairstylePreviewFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[280px] sm:max-w-[300px] md:max-w-[320px]", className)}>
      {children}
    </div>
  );
}
