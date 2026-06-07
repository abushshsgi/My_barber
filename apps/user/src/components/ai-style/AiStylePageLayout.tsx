import { Link } from "@tanstack/react-router";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

type Props = {
  children: React.ReactNode;
  step: Step;
};

export function AiStylePageLayout({ children, step }: Props) {
  const { t } = useTranslation();
  const steps = [
    { n: 1 as const, label: t("aiStylePage.steps.upload") },
    { n: 2 as const, label: t("aiStylePage.steps.analyze") },
    { n: 3 as const, label: t("aiStylePage.steps.results") },
  ];

  return (
    <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+16px)]">
      <header className="relative overflow-hidden bg-foreground px-5 pb-10 pt-[calc(env(safe-area-inset-top)+12px)] text-background">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-background/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-background/5 blur-2xl" />

        <div className="relative flex items-start gap-3">
          <Link
            to="/profile"
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-background/20 bg-background/10 active:opacity-80"
            aria-label="Orqaga"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-background/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                <Sparkles className="h-3 w-3" />
                {t("aiStylePage.aiBadge")}
              </span>
              <span className="rounded-full border border-background/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-background/70">
                {t("aiStylePage.betaBadge")}
              </span>
            </div>
            <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight">
              {t("aiStylePage.title")}
            </h1>
            <p className="mt-1.5 max-w-[280px] text-sm leading-relaxed text-background/70">
              {t("aiStylePage.introDesc")}
            </p>
          </div>
        </div>

        <div className="relative mt-6">
          <AudienceSwitch showProfileHint={false} />
        </div>

        <div className="relative mt-5 flex items-center gap-2">
          {steps.map((item, index) => {
            const active = step >= item.n;
            const current = step === item.n;
            return (
              <div key={item.n} className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors",
                    current
                      ? "bg-background text-foreground"
                      : active
                        ? "bg-background/25 text-background"
                        : "border border-background/25 text-background/45",
                  )}
                >
                  {item.n}
                </div>
                <p
                  className={cn(
                    "truncate text-[10px] font-bold uppercase tracking-wide",
                    active ? "text-background" : "text-background/45",
                  )}
                >
                  {item.label}
                </p>
                {index < steps.length - 1 ? (
                  <div
                    className={cn(
                      "mx-1 hidden h-px min-w-3 flex-1 sm:block",
                      step > item.n ? "bg-background/40" : "bg-background/15",
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </header>

      <main className="relative -mt-6 rounded-t-[28px] bg-background px-5 pb-6 pt-6 shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.18)]">
        {children}
      </main>
    </div>
  );
}
