import { useTranslation } from "react-i18next";

export function DesktopHomeMarketingHead() {
  const { t } = useTranslation();

  return (
    <section className="mb-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">mysaloon.uz</p>
      <div className="mt-2 max-w-3xl">
        <h1 className="text-[clamp(1.75rem,2.6vw,2.5rem)] font-bold leading-[1.08] tracking-tight text-foreground">
          {t("home.title")}
        </h1>
        <p className="mt-2 text-base font-medium leading-relaxed text-muted-foreground">
          {t("homePage.editorialTagline")}
        </p>
      </div>
    </section>
  );
}
