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

const WORD_SIZE: Record<Size, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

type Props = {
  /** Square official mark (black canvas + white Mysaloon. + orange period). */
  variant?: "mark" | "wordmark";
  size?: Size;
  className?: string;
  imgClassName?: string;
  /** Light card / dark surface / inherit parent color. */
  tone?: "onLight" | "onDark" | "inherit";
  /** Optional trailing label, e.g. Partner / Admin */
  subtitle?: string;
  alt?: string;
};

/** Official Mysaloon brand mark / wordmark. */
export function MysaloonLogo({
  variant = "mark",
  size = "md",
  className,
  imgClassName,
  tone = "onLight",
  subtitle,
  alt = "Mysaloon",
}: Props) {
  if (variant === "wordmark") {
    const letter =
      tone === "onDark"
        ? "text-white"
        : tone === "inherit"
          ? "text-current"
          : "text-foreground";
    return (
      <span
        className={cn(
          "inline-flex items-baseline font-extrabold tracking-tight",
          WORD_SIZE[size],
          letter,
          className,
        )}
        aria-label={alt}
      >
        <span>Mysaloon</span>
        <span style={{ color: MYSALOON_ORANGE }} aria-hidden>
          .
        </span>
        {subtitle ? (
          <span
            className={cn(
              "ml-1.5 text-[0.55em] font-bold tracking-wide",
              tone === "onDark"
                ? "text-white/70"
                : tone === "inherit"
                  ? "opacity-70"
                  : "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={BRAND_LOGO_SRC}
        alt={alt}
        width={512}
        height={512}
        decoding="async"
        className={cn(
          "shrink-0 rounded-lg object-cover",
          MARK_SIZE[size],
          imgClassName,
        )}
      />
      {subtitle ? (
        <span
          className={cn(
            "font-bold tracking-tight",
            size === "xs" || size === "sm" ? "text-sm" : "text-base",
            tone === "onDark" ? "text-white" : "text-foreground",
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
