import { cn } from "@/lib/utils";

/** Payme so'z belgisi — to'lov qatori va moliya sahifasida. */
export function PaymeLogo({
  className,
  height = 22,
}: {
  className?: string;
  height?: number;
}) {
  const width = Math.round(height * (92 / 22));
  return (
    <svg
      viewBox="0 0 92 22"
      width={width}
      height={height}
      role="img"
      aria-label="Payme"
      className={cn("shrink-0", className)}
    >
      <text
        x="0"
        y="18"
        fill="#00CCCC"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="20"
        fontWeight="800"
        letterSpacing="-0.6"
      >
        payme
      </text>
    </svg>
  );
}
