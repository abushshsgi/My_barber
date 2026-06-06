import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 72;
const MAX_PULL = 120;

function getScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

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
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  const triggerRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshingRef.current = true;
    onRefreshingChange?.(true);
    setPull(THRESHOLD);
    pullRef.current = THRESHOLD;
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
      onRefreshingChange?.(false);
      setPull(0);
      pullRef.current = 0;
    }
  }, [onRefresh, onRefreshingChange]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || getScrollTop() > 2) return;
      startY.current = e.touches[0]?.clientY ?? 0;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return;

      if (getScrollTop() > 2) {
        pulling.current = false;
        setPull(0);
        pullRef.current = 0;
        return;
      }

      const y = e.touches[0]?.clientY ?? 0;
      const delta = y - startY.current;

      if (delta <= 0) {
        setPull(0);
        pullRef.current = 0;
        return;
      }

      const next = Math.min(delta * 0.55, MAX_PULL);
      setPull(next);
      pullRef.current = next;
      if (next > 8) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullRef.current >= THRESHOLD) void triggerRefresh();
      else {
        setPull(0);
        pullRef.current = 0;
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [triggerRefresh]);

  const ready = pull >= THRESHOLD;
  const offset = refreshing ? THRESHOLD : pull * 0.35;
  const showIndicator = pull > 8 || refreshing;

  return (
    <div className={cn("relative", className)}>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-[480px] justify-center lg:max-w-[720px]"
        style={{ top: "calc(env(safe-area-inset-top) + 6px)" }}
        animate={{ opacity: showIndicator ? 1 : 0, y: showIndicator ? 0 : -8 }}
        transition={{ duration: 0.18 }}
      >
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full bg-surface shadow-sm",
            ready || refreshing ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Loader2 className={cn("h-4 w-4", (ready || refreshing) && "animate-spin")} />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: offset }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
