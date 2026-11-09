import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Raqam o'zgarganda eski qiymat pastga tushadi, yangisi yuqoridan tushib keladi. */
export function SlideNumber({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const text = typeof value === "number" ? value.toLocaleString() : value;
  const [shown, setShown] = useState(text);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const shownRef = useRef(text);

  useEffect(() => {
    if (text === shownRef.current) return;
    const previous = shownRef.current;
    shownRef.current = text;
    setLeaving(previous);
    setShown(text);
    setTick((n) => n + 1);
    const timer = window.setTimeout(() => setLeaving(null), 620);
    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <span
      className={cn(
        "relative inline-grid overflow-hidden align-bottom leading-none tabular-nums",
        className,
      )}
    >
      <span
        key={`in-${tick}`}
        className={cn("col-start-1 row-start-1", leaving != null && "admin-slot-enter")}
      >
        {shown}
      </span>
      {leaving != null ? (
        <span key={`out-${tick}`} className="admin-slot-leave col-start-1 row-start-1">
          {leaving}
        </span>
      ) : null}
    </span>
  );
}
