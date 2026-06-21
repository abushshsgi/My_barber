import { cn } from "@/lib/utils";

/** Dekorativ laurel — Airbnb uslubidagi reyting ramkasi. */
export function SalonLaurel({ className, mirrored }: { className?: string; mirrored?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 72"
      fill="none"
      aria-hidden
      className={cn("text-foreground/75", mirrored && "scale-x-[-1]", className)}
    >
      <path
        d="M20 4C10 14 6 28 8 42c1.2 4.8 3.2 9 6 12.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M14 18c-2.5 1.5-4 4-4 6.5s1.2 5 3.5 6.5M12 32c-1.8 1.2-3 3-3 5s1 3.8 2.8 5M11 46c-1.2 1-2 2.4-2 4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <ellipse cx="11" cy="20" rx="2.2" ry="4" fill="currentColor" opacity="0.35" transform="rotate(-25 11 20)" />
      <ellipse cx="9" cy="34" rx="2" ry="3.5" fill="currentColor" opacity="0.3" transform="rotate(-15 9 34)" />
      <ellipse cx="8" cy="48" rx="1.8" ry="3.2" fill="currentColor" opacity="0.28" transform="rotate(-8 8 48)" />
      <ellipse cx="15" cy="26" rx="1.6" ry="3" fill="currentColor" opacity="0.25" transform="rotate(-35 15 26)" />
      <ellipse cx="13" cy="40" rx="1.5" ry="2.8" fill="currentColor" opacity="0.22" transform="rotate(-20 13 40)" />
    </svg>
  );
}

export function formatSalonRating(value: number, locale: string): string {
  const fixed = value.toFixed(2);
  return locale.startsWith("ru") ? fixed.replace(".", ",") : fixed;
}
