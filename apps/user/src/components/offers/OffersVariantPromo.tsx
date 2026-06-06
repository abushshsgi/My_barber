import { Link } from "@tanstack/react-router";
import { Check, Tag, Ticket } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { MOCK_COUPONS } from "@/components/offers/offers-shared";
import type { Offer } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = { list: Offer[] };

export function OffersVariantPromo({ list }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [activeCoupon, setActiveCoupon] = useState<string | null>(MOCK_COUPONS[0]?.code ?? null);

  const onApply = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const match = MOCK_COUPONS.find((c) => c.code === trimmed);
    if (match) {
      setApplied(match.code);
      setActiveCoupon(match.code);
    } else {
      setApplied(trimmed);
    }
  };

  return (
    <div className="space-y-5">
      <ProfileSubpageCard>
        <label htmlFor="promo-code" className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("offersPage.promoInputLabel")}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("offersPage.promoPlaceholder")}
            className="min-w-0 flex-1 rounded-2xl border-0 bg-surface px-4 py-3 text-sm font-bold uppercase tracking-wide placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
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
      </ProfileSubpageCard>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("offersPage.savedCoupons")}
        </h3>
        <div className="mt-3 space-y-2">
          {MOCK_COUPONS.map((c) => {
            const active = activeCoupon === c.code;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCoupon(c.code)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all",
                  active ? "border-foreground bg-surface/50" : "border-border bg-background",
                )}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                  <Ticket className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-bold tracking-wider">{c.code}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t(c.labelKey)}</p>
                </div>
                {active ? (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase text-background">
                    {t("offersPage.active")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("offersPage.salonOffers")}
        </h3>
        <div className="mt-3 space-y-2">
          {list.map((o) => (
            <Link
              key={o.id}
              to="/salon/$id"
              params={{ id: o.salonId }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface/30 p-4 active:scale-[0.99] transition-transform"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                <Tag className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {o.salonName}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold">{o.title}</p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  −{o.discountPct}% · {t("offersPage.validUntil", { date: o.validUntil })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
