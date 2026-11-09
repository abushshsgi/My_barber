import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

let slot = 0;

function nextEnterDelay() {
  const delay = (slot % 8) * 55;
  slot += 1;
  return delay;
}

/** Sahifaga kirganda va raqam o'zgaganda yangi qiymat yuqoridan tushib keladi. */
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
  const [intro, setIntro] = useState(true);
  const [delay] = useState(nextEnterDelay);
  const shownRef = useRef(text);
  const mounted = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 700 + delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (text === shownRef.current) return;
    const previous = shownRef.current;
    shownRef.current = text;
    setLeaving(previous);
    setShown(text);
    setTick((n) => n + 1);
    const timer = window.setTimeout(() => setLeaving(null), 620);
    return () => window.clearTimeout(timer);
  }, [text]);

  const entering = intro || leaving != null;

  return (
    <span
      className={cn(
        "relative inline-grid overflow-hidden align-bottom leading-none tabular-nums",
        className,
      )}
    >
      <span
        key={`in-${tick}`}
        className={cn("col-start-1 row-start-1", entering && "admin-slot-enter")}
        style={entering ? { animationDelay: leaving != null ? "0ms" : `${delay}ms` } : undefined}
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
