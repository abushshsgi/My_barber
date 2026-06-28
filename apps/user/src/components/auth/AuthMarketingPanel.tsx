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
    <div className="relative hidden min-h-[100dvh] flex-col justify-between overflow-hidden bg-surface p-10 xl:p-14 lg:flex">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-foreground/[0.04] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-foreground/[0.03] blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight xl:text-4xl">mysaloon</span>
        <span className="text-lg font-bold text-muted-foreground xl:text-xl">.uz</span>
      </div>

      <div className="relative my-10 max-w-xl flex-1 flex flex-col justify-center">
        <span className="inline-flex w-fit items-center rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-sm">
          {t("auth.marketing.badge")}
        </span>

        <h2 className="mt-6 text-[clamp(2.5rem,4.2vw,4.25rem)] font-bold leading-[1.02] tracking-tight text-foreground">
          {t("home.title")}
        </h2>

        <p className="mt-5 max-w-lg text-xl font-medium leading-snug text-muted-foreground xl:text-2xl xl:leading-snug">
          {t("homePage.editorialTagline")}
        </p>

        <ul className="mt-10 space-y-4">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li
              key={key}
              className="flex items-start gap-4 rounded-2xl border border-border/70 bg-background/60 px-4 py-4 backdrop-blur-sm"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                <Icon className="size-5" strokeWidth={2.2} />
              </span>
              <span className="pt-2 text-base font-semibold leading-snug text-foreground xl:text-lg">
                {t(`auth.marketing.${key}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t("footer.tagline")}
      </p>
    </div>
  );
}
