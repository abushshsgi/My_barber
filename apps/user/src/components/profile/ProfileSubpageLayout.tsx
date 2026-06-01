import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
};

/** Ichki sahifalar — krem fon + oq kartochka (profil hero emas, ro'yxat emas). */
export function ProfileSubpageLayout({ title, subtitle, children, className, right }: Props) {
  return (
    <div
      className={cn(
        "min-h-full bg-surface pb-[calc(68px+env(safe-area-inset-bottom)+12px)]",
        className,
      )}
    >
      <div className="px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-start gap-3">
          <Link
            to="/profile"
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background active:opacity-80"
            aria-label="Profil"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-2xl font-bold leading-tight tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-xs font-medium text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {right}
        </div>
      </div>

      <div className="rounded-t-[28px] bg-background px-5 pb-6 pt-5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.08)]">
        {children}
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
    <div id={id} className={cn("rounded-2xl border border-border bg-surface/30 p-4", className)}>
      {children}
    </div>
  );
}
