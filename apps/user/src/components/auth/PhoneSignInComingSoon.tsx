import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatUzLocalPhone } from "@/lib/phone";

/** Telefon login — hozircha faqat ko'rinish, ishlamaydi. */
export function PhoneSignInComingSoon() {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <label
        htmlFor="auth-phone-soon"
        className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
      >
        {t("auth.phone")}
      </label>
      <div className="mt-2 flex h-14 items-stretch overflow-hidden rounded-2xl border-2 border-border bg-muted/30 opacity-70">
        <span className="flex shrink-0 items-center border-r border-border px-4 text-sm font-bold tabular-nums text-muted-foreground">
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
        <span className="flex shrink-0 items-center px-3 text-muted-foreground/60">
          <Phone className="size-4" aria-hidden />
        </span>
      </div>
      <button
        type="button"
        disabled
        className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border-2 border-border bg-muted/40 py-4 text-sm font-bold text-muted-foreground"
      >
        {t("auth.continue")}
        <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          {t("auth.phoneComingSoon")}
        </span>
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">{t("auth.phoneComingSoonHint")}</p>
    </div>
  );
}

export function AuthMethodDivider() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("auth.orDivider")}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
