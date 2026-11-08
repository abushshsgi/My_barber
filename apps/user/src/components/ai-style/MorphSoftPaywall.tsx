import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Blurred preview image (optional). */
  previewUrl?: string | null;
  onSubscribe?: () => void;
};

/** Qisqa CTA — to‘liq tarif UI pastdagi sheetda ochiladi. */
export function MorphSoftPaywall({ className, onSubscribe }: Props) {
  const { t } = useTranslation();

  const ctaClass =
    "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111111] text-[14px] font-extrabold text-white";

  return (
    <section className={cn("space-y-2", className)}>
      {onSubscribe ? (
        <button type="button" onClick={onSubscribe} className={ctaClass}>
          <Crown className="size-4" strokeWidth={2.25} />
          {t("aiStylePage.limitSheet.buyPlan", { defaultValue: "Obuna olish" })}
        </button>
      ) : (
        <Link
          to="/wallet"
          search={{ section: "subscriptions", plan: "plus", returnTo: "/ai-style" }}
          className={ctaClass}
        >
          <Crown className="size-4" strokeWidth={2.25} />
          {t("aiStylePage.limitSheet.buyPlan", { defaultValue: "Obuna olish" })}
        </Link>
      )}
    </section>
  );
}
