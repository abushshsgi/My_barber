import { Link } from "@tanstack/react-router";
import { Crown, Lock, Sparkles, UserPlus } from "lucide-react";
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

function ReferralProgress({ progress, required }: { progress: number; required: number }) {
  const safeRequired = Math.max(1, required);
  const clamped = Math.min(progress, safeRequired);
  const pct = Math.round((clamped / safeRequired) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
          Referal
        </p>
        <p className="text-sm font-semibold tabular-nums text-white/90">
          {clamped}/{safeRequired}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: safeRequired }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < clamped ? "bg-amber-300" : "bg-white/12",
            )}
          />
        ))}
      </div>
    </div>
  );
}

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
  const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] bg-[#141210] px-5 pb-5 pt-6 text-white shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-10 h-52 w-52 rounded-full bg-stone-400/15 blur-3xl"
        />

        <div className="relative flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-[22px] border border-white/10 bg-white/8 shadow-inner backdrop-blur-sm">
            {locked ? (
              <Lock className="h-7 w-7 text-amber-200" strokeWidth={1.75} />
            ) : (
              <Sparkles className="h-7 w-7 text-amber-200" strokeWidth={1.75} />
            )}
          </span>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
            Morf AI
          </p>
          <p className="mt-1.5 max-w-[18rem] text-xl font-bold leading-snug tracking-tight sm:text-2xl">
            {locked
              ? t("aiStylePage.limitSheet.accessTitle")
              : t(
                  isTryOn
                    ? "aiStylePage.limitSheet.tryonTitle"
                    : "aiStylePage.limitSheet.studioTitle",
                )}
          </p>
        </div>

        <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
          {locked && trial ? (
            <ReferralProgress progress={progress} required={required} />
          ) : !locked && limit > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                  {planName || "Plan"}
                </p>
                <p className="text-sm font-semibold tabular-nums text-white/90">
                  {t("aiStylePage.limitSheet.usage", { used, limit })}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-200 transition-[width] duration-500"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                <Crown className="h-5 w-5 text-amber-200" strokeWidth={1.75} />
              </span>
              <p className="text-sm leading-snug text-white/80">
                {t("aiStylePage.limitSheet.accessSubtitle")}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-[15px] leading-relaxed text-muted-foreground">
        {locked
          ? t("aiStylePage.limitSheet.descLocked", {
              required,
              days: trial?.trial_days ?? 7,
            })
          : planName
            ? t("aiStylePage.limitSheet.descWithPlan", { plan: planName })
            : t("aiStylePage.limitSheet.descFree")}
      </p>

      <div className="flex flex-col gap-3">
        <Link
          to="/wallet"
          search={{ section: "subscriptions" }}
          onClick={onClose}
          className={cn(
            "flex h-14 items-center justify-center gap-2 rounded-2xl bg-foreground text-[15px] font-bold text-background",
            "shadow-[0_12px_28px_-16px_rgba(0,0,0,0.55)] transition-[transform,opacity] duration-200",
            "hover:opacity-95 active:scale-[0.99]",
          )}
        >
          <Crown className="h-4 w-4" strokeWidth={2.25} />
          {t("aiStylePage.limitSheet.buyPlan")}
        </Link>
        {locked ? (
          <Link
            to="/referrals"
            onClick={onClose}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-2xl border border-border/80 bg-surface/70 text-[15px] font-bold",
              "transition-[transform,background-color] duration-200 hover:bg-surface active:scale-[0.99]",
            )}
          >
            <UserPlus className="h-5 w-5" />
            {remaining > 0
              ? t("aiStylePage.limitSheet.inviteFriends", { count: remaining })
              : t("aiStylePage.limitSheet.openReferrals")}
          </Link>
        ) : (
          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            onClick={onClose}
            className={cn(
              "flex h-14 items-center justify-center rounded-2xl border border-border/80 bg-surface/70 text-[15px] font-bold",
              "transition-[transform,background-color] duration-200 hover:bg-surface active:scale-[0.99]",
            )}
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
        <DrawerContent className="rounded-t-[32px] border-none px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="text-left text-xl font-bold tracking-tight">{title}</DrawerTitle>
            <DrawerDescription className="text-left text-[15px]">{subtitle}</DrawerDescription>
          </DrawerHeader>
          <MorphLimitUpsellBody kind={kind} me={me} onClose={() => onOpenChange(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,760px)] w-[min(92vw,560px)] max-w-[560px] gap-0 overflow-y-auto rounded-[28px] border-border/60 p-7 sm:rounded-[28px]">
        <DialogHeader className="space-y-1.5 pb-4 text-left">
          <DialogTitle className="pr-8 text-2xl font-bold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed">{subtitle}</DialogDescription>
        </DialogHeader>
        <MorphLimitUpsellBody kind={kind} me={me} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
