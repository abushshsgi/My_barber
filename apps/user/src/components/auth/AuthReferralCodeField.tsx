import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getStashedReferralCode,
  normalizeReferralCode,
  stashReferralCode,
  clearStashedReferralCode,
} from "@/lib/referral-storage";

type Props = {
  disabled?: boolean;
  /** URL ?ref= dan kelgan bo'lsa, avval shu qiymatni ko'rsatadi. */
  initialFromUrl?: string | null;
};

export function AuthReferralCodeField({ disabled, initialFromUrl }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState(() => {
    const fromUrl = normalizeReferralCode(initialFromUrl ?? "");
    if (fromUrl) return fromUrl;
    return getStashedReferralCode() ?? "";
  });
  const [open, setOpen] = useState(() => Boolean(normalizeReferralCode(initialFromUrl ?? "") || getStashedReferralCode()));

  useEffect(() => {
    const fromUrl = normalizeReferralCode(initialFromUrl ?? "");
    if (!fromUrl) return;
    setValue(fromUrl);
    stashReferralCode(fromUrl);
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

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full text-center text-xs font-bold text-muted-foreground underline disabled:opacity-60"
      >
        {t("auth.referralHaveCode", { defaultValue: "Taklif kodi bor?" })}
      </button>
    );
  }

  return (
    <div>
      <label
        htmlFor="auth-referral-code"
        className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
      >
        {t("auth.referralCode", { defaultValue: "Taklif kodi" })}{" "}
        <span className="font-medium normal-case tracking-normal text-muted-foreground/80">
          ({t("auth.referralOptional", { defaultValue: "ixtiyoriy" })})
        </span>
      </label>
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
        className="mt-2 h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-center font-mono text-lg font-bold tracking-[0.22em] uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none disabled:opacity-60"
      />
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("auth.referralHint", {
          defaultValue: "Do'stingiz ulashgan 8 belgilik kodni kiriting yoki havoladan oching.",
        })}
      </p>
    </div>
  );
}
