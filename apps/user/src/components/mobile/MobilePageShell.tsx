import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { MOBILE_CONTENT_PADDING_CLASS } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
  backTo?: string;
};

/** Neo Brutal mobil sahifa shell — orqaga tugma + neo-panel kontent. */
export function MobilePageShell({
  title,
  subtitle,
  children,
  className,
  right,
  backTo = "/profile",
}: Props) {
  return (
    <div className={cn("min-h-full", MOBILE_CONTENT_PADDING_CLASS, className)}>
      <div className="px-4 pb-4 pt-safe">
        <div className="flex items-start gap-3">
          <Link
            to={backTo}
            className="neo-pill mt-0.5 grid h-11 w-11 shrink-0 place-items-center"
            aria-label="Orqaga"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-1 text-xs font-semibold text-muted-foreground">{subtitle}</p> : null}
          </div>
          {right}
        </div>
      </div>
      <div className="page-stagger mx-3 mb-3 rounded-2xl neo-panel px-4 pb-6 pt-5">{children}</div>
    </div>
  );
}
