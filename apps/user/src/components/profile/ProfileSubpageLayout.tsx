import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
  backTo?: string;
};

/** Ichki sahifalar — krem fon + oq kartochka (mobil); desktop da 2-kolonka. */
export function ProfileSubpageLayout({ title, subtitle, children, className, right, backTo = "/profile" }: Props) {
  return (
    <div
      className={cn(
        "min-h-full bg-surface pb-[calc(68px+env(safe-area-inset-bottom)+12px)] lg:bg-background lg:pb-8",
        className,
      )}
    >
      <div className="lg:mx-auto lg:max-w-[720px] lg:px-6 lg:pt-6">
        <div className="lg:grid lg:grid-cols-[minmax(180px,220px)_1fr] lg:items-start lg:gap-8">
          {/* Header — mobile full; desktop sticky left column */}
          <div className="px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)] lg:sticky lg:top-20 lg:px-0 lg:pb-0 lg:pt-0">
            <div className="flex items-start gap-3 lg:flex-col lg:gap-4">
              <Link
                to={backTo}
                className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background active:opacity-80 lg:mt-0"
                aria-label="Orqaga"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
              </Link>
              <div className="min-w-0 flex-1 pt-0.5 lg:pt-0">
                <h1 className="text-2xl font-bold leading-tight tracking-tight lg:text-3xl">{title}</h1>
                {subtitle && (
                  <p className="mt-1 text-xs font-medium text-muted-foreground lg:text-sm">{subtitle}</p>
                )}
              </div>
              {right ? <div className="lg:hidden">{right}</div> : null}
            </div>
            {right ? <div className="mt-4 hidden lg:block">{right}</div> : null}
          </div>

          {/* Content — mobile sheet; desktop card */}
          <div className="rounded-t-[28px] bg-background px-5 pb-6 pt-5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.08)] lg:max-w-[560px] lg:rounded-2xl lg:border lg:border-border lg:px-6 lg:py-6 lg:shadow-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileSubpageCard({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn("rounded-2xl border border-border bg-surface/30 p-4", className)}
    >
      {children}
    </div>
  );
}
