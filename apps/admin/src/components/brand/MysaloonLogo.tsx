import { cn } from "@/lib/utils";

export const MYSALOON_DOT = "#ff5c5c";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
  subtitle?: string;
  /** Narrow icon rail — just M. */
  compact?: boolean;
  alt?: string;
};

const WORD_SIZE = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
} as const;

/** Official Mysaloon wordmark for Admin. */
export function MysaloonLogo({
  size = "md",
  className,
  subtitle,
  compact = false,
  alt = "Mysaloon",
}: Props) {
  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg bg-sidebar-primary font-heading text-base font-bold text-sidebar-primary-foreground",
          className,
        )}
        aria-label={alt}
        title={alt}
      >
        M
        <span style={{ color: MYSALOON_DOT }} aria-hidden>
          .
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-heading font-semibold tracking-tight text-sidebar-primary",
        WORD_SIZE[size],
        className,
      )}
      aria-label={alt}
    >
      <span>Mysaloon</span>
      <span style={{ color: MYSALOON_DOT }} aria-hidden>
        .
      </span>
      {subtitle ? (
        <span className="ml-1.5 text-[0.7em] font-semibold tracking-wide text-muted-foreground">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
