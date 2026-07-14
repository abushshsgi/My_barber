import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  clearStashedReferralCode,
  normalizeReferralCode,
  stashReferralCode,
} from "@/lib/referral-storage";

type Props = {
  disabled?: boolean;
  /** URL ?ref= dan kelgan bo'lsa — maydon ochiq va kod to'ldiriladi. */
  initialFromUrl?: string | null;
};

export function AuthReferralCodeField({ disabled, initialFromUrl }: Props) {
  const { t } = useTranslation();
  const fromUrl = normalizeReferralCode(initialFromUrl ?? "");
  const fromLink = Boolean(fromUrl);

  const [value, setValue] = useState(() => fromUrl);
  const [open, setOpen] = useState(() => fromLink);

  useEffect(() => {
    const next = normalizeReferralCode(initialFromUrl ?? "");
    if (!next) return;
    setValue(next);
    stashReferralCode(next);
    setOpen(true);
  }, [initialFromUrl]);

  const onChange = (raw: string) => {
    const next = normalizeReferralCode(raw);
    setValue(next);
    if (next) {
      stashReferralCode(next);
    } else {
      clearStashedReferralCode();
    }
  };

  const closeManual = () => {
    if (fromLink) return;
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="mx-auto block cursor-pointer text-center text-xs font-semibold text-muted-foreground underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("auth.referralHaveCode", { defaultValue: "Taklif kodi bor?" })}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/40 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <label
          htmlFor="auth-referral-code"
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
        >
          {t("auth.referralCode", { defaultValue: "Taklif kodi" })}{" "}
          <span className="font-medium normal-case tracking-normal text-muted-foreground/80">
            ({t("auth.referralOptional", { defaultValue: "ixtiyoriy" })})
          </span>
        </label>
        {!fromLink ? (
          <button
            type="button"
            disabled={disabled}
            onClick={closeManual}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-60"
            aria-label={t("auth.referralHide", { defaultValue: "Yashirish" })}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <input
        id="auth-referral-code"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={8}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("auth.referralPlaceholder", { defaultValue: "8 belgilik kod" })}
        className="mt-2.5 h-12 w-full rounded-xl border border-border bg-background px-4 text-center font-mono text-lg font-bold tracking-[0.28em] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-[border-color,box-shadow] placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:text-muted-foreground/45 focus:border-foreground/40 focus:outline-none focus:ring-4 focus:ring-foreground/[0.06] disabled:opacity-60"
      />
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {fromLink
          ? t("auth.referralFromLinkHint", {
              defaultValue: "Do'stingiz havolasidan kod avtomatik qo'yildi.",
            })
          : t("auth.referralHint", {
              defaultValue: "Do'stingiz ulashgan 8 belgilik kodni kiriting yoki havoladan oching.",
            })}
      </p>
    </div>
  );
}
