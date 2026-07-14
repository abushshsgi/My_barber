import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Percent, Ticket } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { cn } from "@/lib/utils";

/** Backend offers API hali yo'q — bo'sh holat ko'rsatiladi. */
const salonOffers: never[] = [];

type Props = {
  /** Desktop to'liq kenglik layout */
  desktop?: boolean;
};

export function OffersPageContent({ desktop = false }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);

  const onApply = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setApplied(trimmed);
  };

  if (desktop) {
    return (
      <div className="w-full min-w-0 space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch xl:gap-8">
          <section className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[2rem] bg-foreground px-8 py-9 text-background xl:px-10 xl:py-10">
            <div
              className="pointer-events-none absolute -right-16 top-0 size-64 rounded-full bg-background/10 blur-3xl"
              aria-hidden
            />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-background/55">
                {t("offersPage.heroBadge", { defaultValue: "Maxsus takliflar" })}
              </p>
              <h2 className="mt-4 max-w-xl text-[2.4rem] font-extrabold leading-[1.08] tracking-tight xl:text-[2.85rem]">
                {t("offersPage.heroTitle", { defaultValue: "Kuponlar va salon aksiyalari" })}
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-background/70">
                {t("offersPage.subtitle", {
                  defaultValue: "Salonlar va xizmatlar bo'yicha maxsus takliflar",
                })}
              </p>
            </div>
            <Link
              to="/today"
              className="relative mt-10 inline-flex w-fit items-center gap-2 rounded-2xl bg-background px-5 py-3.5 text-sm font-bold text-foreground transition hover:bg-background/95"
            >
              <Percent className="size-4" />
              {t("offersPage.viewToday", { defaultValue: "Bugungi takliflar" })}
              <ArrowUpRight className="size-4" />
            </Link>
          </section>

          <section className="flex flex-col justify-between rounded-[2rem] border border-border bg-surface/50 p-7 xl:p-8">
            <div>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
                <Ticket className="size-5" strokeWidth={2.1} />
              </div>
              <label
                htmlFor="promo-code-desktop"
                className="mt-5 block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
              >
                {t("offersPage.promoInputLabel")}
              </label>
              <div className="mt-3 flex gap-2">
                <input
                  id="promo-code-desktop"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t("offersPage.promoPlaceholder")}
                  className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-bold uppercase tracking-wide placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <button
                  type="button"
                  onClick={onApply}
                  className="shrink-0 rounded-2xl bg-foreground px-5 py-3.5 text-xs font-bold text-background active:scale-[0.98]"
                >
                  {t("offersPage.promoApply")}
                </button>
              </div>
              {applied ? (
                <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-foreground">
                  <Check className="h-3.5 w-3.5" />
                  {t("offersPage.promoApplied", { code: applied })}
                </p>
              ) : (
                <p className="mt-3 text-[12px] text-muted-foreground">{t("offersPage.promoHint")}</p>
              )}
            </div>
            <div className="mt-8 border-t border-border pt-6">
              <AudienceSwitch />
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-dashed border-border/80 bg-background/60 px-8 py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-surface">
            <Ticket className="size-7 text-foreground" strokeWidth={1.7} />
          </div>
          <h3 className="mt-5 text-2xl font-extrabold tracking-tight">{t("offersPage.empty")}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("offersPage.emptyHint", {
              defaultValue: "Tez orada yangi salon aksiyalari shu yerda paydo bo'ladi. Hozircha kuponlardan foydalaning.",
            })}
          </p>
          {salonOffers.length > 0 ? null : (
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {t("offersPage.comingSoon", { defaultValue: "Tez orada" })}
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page-stagger space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-foreground px-5 py-6 text-background sm:px-7 sm:py-8">
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
            {t("offersPage.heroBadge", { defaultValue: "Maxsus takliflar" })}
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {t("offersPage.heroTitle", { defaultValue: "Kuponlar va salon aksiyalari" })}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/75">
            {t("offersPage.subtitle", { defaultValue: "Salonlar va xizmatlar bo'yicha maxsus takliflar" })}
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-background p-4 sm:p-5">
        <label htmlFor="promo-code" className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("offersPage.promoInputLabel")}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("offersPage.promoPlaceholder")}
            className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-bold uppercase tracking-wide placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <button
            type="button"
            onClick={onApply}
            className="shrink-0 rounded-2xl bg-foreground px-4 py-3 text-xs font-bold text-background active:scale-[0.98]"
          >
            {t("offersPage.promoApply")}
          </button>
        </div>
        {applied ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-foreground">
            <Check className="h-3.5 w-3.5" />
            {t("offersPage.promoApplied", { code: applied })}
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">{t("offersPage.promoHint")}</p>
        )}
      </section>

      <section className={cn("rounded-[24px] border border-border bg-surface/30 p-4")}>
        <AudienceSwitch />
      </section>

      {salonOffers.length === 0 ? (
        <section className="rounded-[24px] border border-dashed border-border px-5 py-12 text-center">
          <Ticket className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-lg font-bold">{t("offersPage.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("offersPage.emptyHint", {
              defaultValue: "Tez orada yangi salon aksiyalari shu yerda paydo bo'ladi.",
            })}
          </p>
          <Link
            to="/today"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background"
          >
            <Percent className="h-4 w-4" />
            {t("offersPage.viewToday", { defaultValue: "Bugungi takliflar" })}
          </Link>
        </section>
      ) : null}
    </div>
  );
}
