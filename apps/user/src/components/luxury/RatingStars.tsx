import { Star } from "lucide-react";

export function RatingStars({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
      <Star className={`${px} fill-gold text-gold`} aria-hidden />
      <span>{value.toFixed(1)}</span>
      {count != null && <span className="text-muted-foreground">({count})</span>}
    </span>
  );
}
