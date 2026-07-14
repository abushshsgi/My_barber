import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatUzLocalPhone } from "@/lib/phone";

/** Telefon login — hozircha faqat ko'rinish, ishlamaydi. */
export function PhoneSignInComingSoon() {
  const { t } = useTranslation();

  return (
    <div className="relative opacity-60">
      <label
        htmlFor="auth-phone-soon"
        className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {t("auth.phone")}
      </label>
      <div className="mt-2.5 flex h-12 items-stretch overflow-hidden rounded-xl border border-border bg-surface/50">
        <span className="flex shrink-0 items-center border-r border-border px-3.5 text-sm font-bold tabular-nums text-muted-foreground">
          +998
        </span>
        <input
          id="auth-phone-soon"
          type="tel"
          disabled
          readOnly
          value={formatUzLocalPhone("901234567")}
          className="min-w-0 flex-1 cursor-not-allowed border-0 bg-transparent px-4 text-sm font-bold leading-none text-muted-foreground"
          aria-disabled
        />
        <span className="flex shrink-0 items-center px-3.5 text-muted-foreground/50">
          <Phone className="size-4" aria-hidden />
        </span>
      </div>
      <button
        type="button"
        disabled
        className="mt-3.5 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-border/80 bg-muted/30 text-sm font-bold text-muted-foreground"
      >
        {t("auth.continue")}
        <span className="rounded-md bg-foreground/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("auth.phoneComingSoon")}
        </span>
      </button>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
        {t("auth.phoneComingSoonHint")}
      </p>
    </div>
  );
}

export function AuthMethodDivider() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border" />
      <span className="rounded-full bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {t("auth.orDivider")}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border" />
    </div>
  );
}
