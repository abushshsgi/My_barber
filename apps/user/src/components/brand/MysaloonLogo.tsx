import { cn } from "@/lib/utils";
import { MysaloonAppMark } from "@/components/brand/MysaloonAppMark";

/** Period accent from official wordmark. */
export const MYSALOON_DOT = "#ff5c5c";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const WORD_SIZE: Record<Size, string> = {
  xs: "text-sm",
  sm: "text-[1.05rem] leading-none",
  md: "text-xl leading-none",
  lg: "text-2xl leading-none",
  xl: "text-3xl leading-none",
};

type Props = {
  size?: Size;
  className?: string;
  /** Light surface / dark surface / inherit parent color. */
  tone?: "onLight" | "onDark" | "inherit";
  /** Optional trailing label, e.g. Partner / Admin */
  subtitle?: string;
  alt?: string;
  /** Capacitor: oldinda monogram mark. */
  withAppMark?: boolean;
};

/** Official Mysaloon wordmark: Mysaloon. */
export function MysaloonLogo({
  size = "md",
  className,
  tone = "onLight",
  subtitle,
  alt = "Mysaloon",
  withAppMark = false,
}: Props) {
  const letter =
    tone === "onDark" ? "text-white" : tone === "inherit" ? "text-current" : "text-foreground";

  const markSize =
    size === "xs" ? 22 : size === "sm" ? 28 : size === "md" ? 34 : size === "lg" ? 40 : 48;

  return (
    <span
      className={cn(
        "inline-flex items-center font-extrabold tracking-tight",
        withAppMark ? "gap-2" : "items-baseline",
        WORD_SIZE[size],
        letter,
        className,
      )}
      aria-label={alt}
    >
      {withAppMark ? (
        <MysaloonAppMark size={markSize} tone={tone === "onDark" ? "onDark" : "onLight"} useImage />
      ) : null}
      <span className={cn(withAppMark && "inline-flex items-baseline")}>
        <span>Mysaloon</span>
        <span style={{ color: MYSALOON_DOT }} aria-hidden>
          .
        </span>
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
