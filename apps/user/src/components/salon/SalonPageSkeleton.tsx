import { cn } from "@/lib/utils";

export function SalonPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse pb-28", className)}>
      <div className="aspect-[4/3] bg-muted" />
      <div className="relative z-10 -mt-6 space-y-3 px-4">
        <div className="h-7 w-2/3 rounded-lg bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-4 w-1/3 rounded bg-muted" />
      </div>
      <div className="mt-6 space-y-4 px-4">
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
