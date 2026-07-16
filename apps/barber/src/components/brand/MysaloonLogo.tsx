import { cn } from "@/lib/utils";

export const MYSALOON_DOT = "#ff5c5c";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const WORD_SIZE: Record<Size, string> = {
  xs: "text-sm",
  sm: "text-[15px] leading-none sm:text-base",
  md: "text-[15px] leading-none sm:text-base",
  lg: "text-2xl leading-none",
  xl: "text-3xl leading-none",
};

type Props = {
  size?: Size;
  className?: string;
  subtitle?: string;
  tone?: "onLight" | "onDark" | "inherit";
  alt?: string;
};

/** Official Mysaloon wordmark for Partner app. */
export function MysaloonLogo({
  size = "md",
  className,
  subtitle,
  tone = "onLight",
  alt = "Mysaloon",
}: Props) {
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
      <span style={{ color: MYSALOON_DOT }} aria-hidden>
        .
      </span>
      {subtitle ? (
        <span
          className={cn(
            "ml-1.5 text-[0.7em] font-bold tracking-wide",
            tone === "onDark" ? "text-white/70" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
