import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const MAP_PILL_SKELETONS = [
  { top: "26%", left: "32%", width: 76 },
  { top: "38%", left: "54%", width: 68 },
  { top: "52%", left: "41%", width: 82 },
  { top: "44%", left: "68%", width: 64 },
  { top: "61%", left: "28%", width: 70 },
  { top: "33%", left: "72%", width: 58 },
] as const;

function ShimmerBlock({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("map-shimmer rounded-xl bg-foreground/[0.06]", className)} style={style} />;
}

export function MapAreaSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[oklch(0.96_0_0)]",
        className,
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {MAP_PILL_SKELETONS.map((pill, i) => (
        <div
          key={i}
          className="map-shimmer-pill absolute h-8 rounded-full bg-background/90 shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-1 ring-foreground/10"
          style={{
            top: pill.top,
            left: pill.left,
            width: pill.width,
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/40 to-transparent" />
    </div>
  );
}

function MapCardSkeleton() {
  return (
    <div className="space-y-3">
      <ShimmerBlock className="aspect-[16/10] w-full rounded-2xl" />
      <div className="space-y-2 px-1">
        <div className="flex items-start justify-between gap-3">
          <ShimmerBlock className="h-4 w-3/4 rounded-lg" />
          <ShimmerBlock className="h-4 w-10 shrink-0 rounded-lg" />
        </div>
        <ShimmerBlock className="h-3 w-full rounded-md" />
        <ShimmerBlock className="h-3 w-5/6 rounded-md" />
        <div className="flex justify-between pt-1">
          <ShimmerBlock className="h-3 w-24 rounded-md" />
          <ShimmerBlock className="h-4 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function MapPanelSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 pb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/50 shadow-[0_2px_14px_rgba(0,0,0,0.07)]"
        >
          <ShimmerBlock className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <ShimmerBlock className="h-3.5 w-3/4 rounded-md" />
              <ShimmerBlock className="h-3.5 w-8 shrink-0 rounded-md" />
            </div>
            <ShimmerBlock className="h-2.5 w-full rounded-md" />
            <div className="flex justify-between">
              <ShimmerBlock className="h-2.5 w-16 rounded-md" />
              <ShimmerBlock className="h-3 w-12 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MapPanelHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <ShimmerBlock className="h-3 w-16 rounded-md" />
      <ShimmerBlock className="h-6 w-32 rounded-lg" />
      <div className="flex gap-2">
        <ShimmerBlock className="h-10 min-w-0 flex-1 rounded-full" />
        <ShimmerBlock className="h-10 w-[88px] shrink-0 rounded-full" />
      </div>
    </div>
  );
}

export function MapMobileSheetSkeleton() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 overflow-hidden rounded-t-[22px] border-t border-border/50 bg-background pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-12px_48px_rgba(0,0,0,0.12)]"
      aria-hidden
    >
      <div className="flex justify-center py-2">
        <ShimmerBlock className="h-1 w-10 rounded-full" />
      </div>

      <div className="px-4 pb-3">
        <div className="flex gap-2">
          <ShimmerBlock className="h-10 min-w-0 flex-1 rounded-full" />
          <ShimmerBlock className="h-10 w-[88px] shrink-0 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 px-4 pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShimmerBlock
            key={i}
            className="h-[108px] rounded-xl"
            style={{ animationDelay: `${i * 80}ms` } as CSSProperties}
          />
        ))}
      </div>

      <div className="px-4 pb-4">
        <ShimmerBlock className="h-[112px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function MapLoadingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="map-loading-dot flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
      </span>
      {label ? (
        <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
      ) : null}
    </div>
  );
}
