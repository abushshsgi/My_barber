import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { nextUpgradePlan, upgradeCtaLabel } from "@/lib/subscription-upgrade";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** compact = pill; bar = full-width CTA */
  variant?: "pill" | "bar";
};

/** Profil — obuna / upgrade CTA (faol userlarga faqat yuqori tarif). */
export function ProfileUpgradeButton({ className, variant = "pill" }: Props) {
  const { t } = useAppTranslation();
  const meQ = useSubscriptionMe();
  const hasActive = meQ.data?.has_active === true;
  const code = meQ.data?.subscription?.plan_code ?? null;
  const next = nextUpgradePlan(code);
  const isPro = code === "pro";

  const label = isPro
    ? t("profile.upgradeManage", { defaultValue: "Obunani boshqarish" })
    : hasActive
      ? upgradeCtaLabel(code, true)
      : t("profile.upgrade", { defaultValue: "Obuna olish" });

  const plan = !hasActive ? "plus" : next ?? "pro";

  return (
    <Link
      to="/wallet"
      search={{ section: "subscriptions", plan }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-bold transition-[transform,opacity] active:scale-[0.98]",
        variant === "bar"
          ? "w-full rounded-2xl bg-foreground px-4 py-3.5 text-sm text-background"
          : "rounded-full bg-foreground px-4 py-2 text-[12px] text-background",
        className,
      )}
    >
      <Sparkles className={variant === "bar" ? "size-4" : "size-3.5"} strokeWidth={2.25} />
      {label}
    </Link>
  );
}
