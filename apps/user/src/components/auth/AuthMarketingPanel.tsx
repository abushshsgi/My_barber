import { CalendarClock, MapPin, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const FEATURES = [
  { key: "featureMap", icon: MapPin },
  { key: "featureBook", icon: CalendarClock },
  { key: "featureAi", icon: Sparkles },
] as const;

export function AuthMarketingPanel() {
  const { t } = useTranslation();

  return (
    <div className="relative hidden min-h-[100dvh] flex-col overflow-hidden bg-surface p-8 xl:p-10 lg:flex">
      <div
        className="auth-blob-drift pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-foreground/[0.04] blur-3xl"
        aria-hidden
      />
      <div
        className="auth-blob-drift-slow pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-foreground/[0.03] blur-3xl"
        aria-hidden
      />

      <div className="auth-marketing-stagger relative flex min-h-full flex-col justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight xl:text-3xl">mysaloon</span>
          <span className="text-base font-bold text-muted-foreground">.uz</span>
        </div>

        <div className="my-8 max-w-md flex flex-col justify-center py-4">
          <h2 className="text-[clamp(1.875rem,3vw,2.75rem)] font-bold leading-[1.08] tracking-tight text-foreground">
            {t("home.title")}
          </h2>

          <p className="mt-4 max-w-sm text-base font-medium leading-relaxed text-muted-foreground xl:text-lg">
            {t("homePage.editorialTagline")}
          </p>

          <ul className="auth-feature-stagger mt-8 space-y-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3.5 py-3 backdrop-blur-sm transition-colors hover:border-border hover:bg-background/80"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background">
                  <Icon className="size-4" strokeWidth={2.2} />
                </span>
                <span className="text-sm font-semibold leading-snug text-foreground">
                  {t(`auth.marketing.${key}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t("footer.tagline")}
        </p>
      </div>
    </div>
  );
}
