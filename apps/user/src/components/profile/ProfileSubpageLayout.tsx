import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountDesktopShell } from "@/components/desktop/pages/AccountDesktopShell";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
  backTo?: string;
};

function ProfileSubpageMobile({ title, subtitle, children, className, right, backTo = "/profile" }: Props) {
  return (
    <div className={cn("min-h-full bg-surface pb-[calc(68px+env(safe-area-inset-bottom)+12px)]", className)}>
      <div className="px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-start gap-3">
          <Link
            to={backTo}
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background"
            aria-label="Orqaga"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-2xl font-bold leading-tight tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-1 text-xs font-medium text-muted-foreground">{subtitle}</p> : null}
          </div>
          {right}
        </div>
      </div>
      <div className="page-stagger rounded-t-[28px] bg-background px-5 pb-6 pt-5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </div>
  );
}

/** Ichki sahifalar — mobil krem fon; desktop: sidebar + glass panel. */
export function ProfileSubpageLayout({ title, subtitle, children, className, right, backTo = "/profile" }: Props) {
  return (
    <DesktopPageSplit
      mobile={
        <ProfileSubpageMobile title={title} subtitle={subtitle} className={className} right={right} backTo={backTo}>
          {children}
        </ProfileSubpageMobile>
      }
      desktop={
        <AccountDesktopShell title={title} subtitle={subtitle}>
          {children}
        </AccountDesktopShell>
      }
    />
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
      className={cn(
        "rounded-2xl border border-border bg-surface/30 p-4",
        "lg:border-border/45 lg:bg-background/55 lg:backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
