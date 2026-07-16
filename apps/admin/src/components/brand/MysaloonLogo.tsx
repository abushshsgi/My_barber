import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/brand-logo.png";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
  imgClassName?: string;
  subtitle?: string;
  alt?: string;
};

const MARK_SIZE = {
  sm: "size-7",
  md: "size-8",
  lg: "size-9",
} as const;

/** Official Mysaloon brand mark for Admin. */
export function MysaloonLogo({
  size = "md",
  className,
  imgClassName,
  subtitle,
  alt = "Mysaloon",
}: Props) {
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
        <span className="font-heading text-lg font-semibold tracking-tight text-sidebar-primary">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
