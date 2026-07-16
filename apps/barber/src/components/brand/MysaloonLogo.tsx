import { cn } from "@/lib/utils";

export const MYSALOON_ORANGE = "#fe841a";
export const BRAND_LOGO_SRC = "/brand-logo.png";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const MARK_SIZE: Record<Size, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-9",
  lg: "size-11",
  xl: "size-14",
};

type Props = {
  size?: Size;
  className?: string;
  imgClassName?: string;
  subtitle?: string;
  alt?: string;
};

/** Official Mysaloon brand mark for Partner app. */
export function MysaloonLogo({
  size = "md",
  className,
  imgClassName,
  subtitle,
  alt = "Mysaloon",
}: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={BRAND_LOGO_SRC}
        alt={alt}
        width={512}
        height={512}
        decoding="async"
        className={cn(
          "shrink-0 rounded-lg object-cover shadow-sm",
          MARK_SIZE[size],
          imgClassName,
        )}
      />
      {subtitle ? (
        <span
          className={cn(
            "font-bold tracking-tight text-foreground",
            size === "xs" || size === "sm" ? "text-sm" : "text-[15px] sm:text-base",
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
