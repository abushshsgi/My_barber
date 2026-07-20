import { Link } from "@tanstack/react-router";
import { Sparkles, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MorphLimitKind } from "@/lib/morph-plan-limit";
import { planLabelFromMe } from "@/lib/morph-plan-limit";
import type { SubscriptionMe } from "@/lib/api/subscriptions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MorphLimitKind;
  me: SubscriptionMe | null;
};

function MorphLimitUpsellBody({
  kind,
  me,
  onClose,
}: {
  kind: MorphLimitKind;
  me: SubscriptionMe | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const usage = me?.usage;
  const planName = planLabelFromMe(me);
  const locked = kind === "access" || !me?.has_active;
  const isTryOn = kind === "tryon";
  const trial = me?.referral_trial;
  const required = trial?.required_referrals ?? 3;
  const progress = trial?.progress ?? trial?.invite_count ?? 0;
  const remaining = trial?.remaining_invites ?? Math.max(0, required - progress);

  const used = isTryOn ? usage?.morph_ai_used ?? 0 : usage?.morph_studio_used ?? 0;
  const limit = isTryOn ? usage?.morph_ai_limit ?? 0 : usage?.morph_studio_limit ?? 0;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-stone-700 p-4 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              Morf AI
            </p>
            <p className="mt-0.5 text-base font-bold leading-snug">
              {locked
                ? t("aiStylePage.limitSheet.accessTitle")
                : t(
                    isTryOn
                      ? "aiStylePage.limitSheet.tryonTitle"
                      : "aiStylePage.limitSheet.studioTitle",
                  )}
            </p>
            {!locked && limit > 0 ? (
              <p className="mt-1 text-xs text-white/80">
                {t("aiStylePage.limitSheet.usage", { used, limit })}
              </p>
            ) : null}
            {locked && trial ? (
              <p className="mt-1 text-xs text-white/80">
                {t("aiStylePage.limitSheet.referralProgress", {
                  progress: Math.min(progress, required),
                  required,
                })}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {locked
          ? t("aiStylePage.limitSheet.descLocked", {
              required,
              days: trial?.trial_days ?? 7,
            })
          : planName
            ? t("aiStylePage.limitSheet.descWithPlan", { plan: planName })
            : t("aiStylePage.limitSheet.descFree")}
      </p>

      <div className="flex flex-col gap-2.5">
        <Link
          to="/wallet"
          search={{ section: "subscriptions" }}
          onClick={onClose}
          className={cn(
            "flex h-12 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background",
            "active:scale-[0.99]",
          )}
        >
          {t("aiStylePage.limitSheet.buyPlan")}
        </Link>
        {locked ? (
          <Link
            to="/referrals"
            onClick={onClose}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface/60 text-sm font-bold active:scale-[0.99]"
          >
            <UserPlus className="h-4 w-4" />
            {remaining > 0
              ? t("aiStylePage.limitSheet.inviteFriends", { count: remaining })
              : t("aiStylePage.limitSheet.openReferrals")}
          </Link>
        ) : (
          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            onClick={onClose}
            className="flex h-12 items-center justify-center rounded-2xl border border-border bg-surface/60 text-sm font-bold active:scale-[0.99]"
          >
            {t("aiStylePage.limitSheet.switchPlan")}
          </Link>
        )}
      </div>
    </div>
  );
}

export function MorphLimitUpsell({ open, onOpenChange, kind, me }: Props) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const locked = kind === "access" || !me?.has_active;
  const title = locked
    ? t("aiStylePage.limitSheet.accessTitle")
    : t(
        kind === "tryon" ? "aiStylePage.limitSheet.tryonTitle" : "aiStylePage.limitSheet.studioTitle",
      );
  const subtitle = locked
    ? t("aiStylePage.limitSheet.accessSubtitle")
    : t("aiStylePage.limitSheet.subtitle");

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[28px] border-none px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <DrawerHeader className="px-0 pb-1 text-left">
            <DrawerTitle className="text-left text-lg font-bold">{title}</DrawerTitle>
            <DrawerDescription className="text-left text-sm">{subtitle}</DrawerDescription>
          </DrawerHeader>
          <MorphLimitUpsellBody kind={kind} me={me} onClose={() => onOpenChange(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] gap-0 rounded-2xl p-5 sm:rounded-2xl">
        <DialogHeader className="space-y-1 pb-3 text-left">
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm">{subtitle}</DialogDescription>
        </DialogHeader>
        <MorphLimitUpsellBody kind={kind} me={me} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
