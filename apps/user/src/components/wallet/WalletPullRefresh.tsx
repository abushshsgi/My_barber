import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 72;
const MAX_PULL = 120;

export function WalletPullRefresh({
  onRefresh,
  onRefreshingChange,
  children,
  className,
}: {
  onRefresh: () => Promise<void>;
  onRefreshingChange?: (refreshing: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerRefresh = useCallback(async () => {
    setRefreshing(true);
    onRefreshingChange?.(true);
    setPull(THRESHOLD);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      onRefreshingChange?.(false);
      setPull(0);
    }
  }, [onRefresh, onRefreshingChange]);

  const onTouchStart = (e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) {
      pulling.current = false;
      setPull(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    setPull(Math.min(delta * 0.55, MAX_PULL));
  };

  const onTouchEnd = () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pull >= THRESHOLD) void triggerRefresh();
    else setPull(0);
  };

  const ready = pull >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={cn("relative min-h-full overflow-y-auto overscroll-y-contain", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        animate={{ height: refreshing ? THRESHOLD : pull, opacity: pull > 8 || refreshing ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        <div className="flex h-full items-end justify-center pb-2">
          <div
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full bg-surface shadow-sm",
              ready || refreshing ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Loader2 className={cn("h-4 w-4", (ready || refreshing) && "animate-spin")} />
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: refreshing ? THRESHOLD : pull * 0.35 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
