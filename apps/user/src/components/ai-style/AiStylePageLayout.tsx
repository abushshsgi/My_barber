import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

type Props = {
  children: React.ReactNode;
  step: Step;
  footer?: React.ReactNode;
};

export function AiStylePageLayout({ children, step, footer }: Props) {
  const { t } = useTranslation();
  const steps = [
    t("aiStylePage.steps.upload"),
    t("aiStylePage.steps.analyze"),
    t("aiStylePage.steps.results"),
  ];

  return (
    <div className="flex min-h-full flex-col bg-surface pb-[calc(68px+env(safe-area-inset-bottom))]">
      <div className="px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background active:opacity-80"
            aria-label="Orqaga"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight">{t("aiStylePage.title")}</h1>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {t("aiStylePage.subtitle")}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <AudienceSwitch showProfileHint={false} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          {steps.map((label, index) => {
            const n = (index + 1) as Step;
            const active = step >= n;
            const current = step === n;
            return (
              <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div
                  className={cn(
                    "h-1 rounded-full transition-colors",
                    active ? "bg-foreground" : "bg-border",
                    current && "ring-2 ring-foreground/20 ring-offset-2 ring-offset-surface",
                  )}
                />
                <p
                  className={cn(
                    "truncate text-[9px] font-bold uppercase tracking-wide",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5">{children}</div>

      {footer ? (
        <div
          className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] border-t border-border bg-background/95 px-5 py-3 backdrop-blur-md"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
