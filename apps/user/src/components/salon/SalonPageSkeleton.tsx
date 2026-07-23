import { cn } from "@/lib/utils";

export function SalonPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse overflow-x-clip pb-28", className)}>
      <div className="h-[min(52vh,75vw)] min-h-[280px] bg-muted" />
      <div className="relative z-10 -mt-10 space-y-4 rounded-t-[1.75rem] bg-background px-4 pt-5 shadow-[0_-18px_48px_-28px_rgba(0,0,0,0.2)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-8 w-2/3 rounded-lg bg-muted" />
        <div className="h-6 w-36 rounded-full bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="flex gap-2 pt-1">
          <div className="h-8 w-16 rounded-full bg-muted" />
          <div className="h-8 w-20 rounded-full bg-muted" />
          <div className="h-8 w-16 rounded-full bg-muted" />
        </div>
        <div className="h-24 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
