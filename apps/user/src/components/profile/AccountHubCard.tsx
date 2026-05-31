import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  to: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  className?: string;
};

export function AccountHubCard({ to, icon: Icon, titleKey, descKey, className }: Props) {
  const { t } = useTranslation();

  return (
    <Link
      to={to as never}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-4 active:bg-surface transition-colors",
        className,
      )}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">{t(titleKey)}</p>
        <p className="mt-0.5 text-[11px] font-medium leading-snug text-muted-foreground">
          {t(descKey)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
