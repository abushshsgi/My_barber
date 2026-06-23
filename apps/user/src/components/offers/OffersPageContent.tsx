import { Link } from "@tanstack/react-router";
import { Check, Percent, Sparkles, Tag, Ticket } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { MOCK_COUPONS } from "@/components/offers/offers-shared";
import { PageSpotlightEmpty } from "@/components/ui/PageSpotlightEmpty";
import { cn } from "@/lib/utils";

/** Backend offers API hali yo'q — kuponlar va bo'sh holat ko'rsatiladi. */
const salonOffers: never[] = [];

export function OffersPageContent() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [activeCoupon, setActiveCoupon] = useState<string | null>(MOCK_COUPONS[0]?.code ?? null);

  const onApply = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const match = MOCK_COUPONS.find((c) => c.code === trimmed);
    setApplied(match ? match.code : trimmed);
    if (match) setActiveCoupon(match.code);
  };

  return (
    <div className="page-stagger space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(135deg,#111_0%,#2a2a2a_55%,#111_100%)] px-5 py-6 text-background sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
            <Sparkles className="h-3.5 w-3.5" />
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

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">{t("offersPage.savedCoupons")}</h3>
          <span className="text-[11px] font-semibold text-muted-foreground">{MOCK_COUPONS.length} ta</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {MOCK_COUPONS.map((c) => {
            const active = activeCoupon === c.code;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCoupon(c.code)}
                className={cn(
                  "flex flex-col items-start rounded-[22px] border-2 p-4 text-left transition-all active:scale-[0.98]",
                  active ? "border-foreground bg-surface/60 shadow-sm" : "border-border bg-background hover:border-foreground/30",
                )}
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
                  <Ticket className="h-4 w-4" />
                </div>
                <p className="mt-3 font-mono text-lg font-bold tracking-wide">{c.code}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t(c.labelKey)}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-surface/30 p-4">
        <AudienceSwitch />
      </section>

      {salonOffers.length === 0 ? (
        <PageSpotlightEmpty
          icon={Tag}
          tone="warm"
          title={t("offersPage.empty")}
          description={t("offersPage.emptyHint", {
            defaultValue: "Tez orada yangi salon aksiyalari shu yerda paydo bo'ladi. Hozircha kuponlardan foydalaning.",
          })}
          action={
            <Link
              to="/today"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98] hover:opacity-95"
            >
              <Percent className="h-4 w-4" />
              {t("offersPage.viewToday", { defaultValue: "Bugungi takliflar" })}
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
