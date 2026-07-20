import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Crown, Lock, Sparkles, UserPlus, Users } from "lucide-react";
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

function trialPlanLabel(code: string | undefined) {
  const c = (code || "starter").toLowerCase();
  if (c === "plus") return "Plus";
  if (c === "pro") return "Pro";
  return "Starter";
}

function FriendSteps({ progress, required }: { progress: number; required: number }) {
  const safeRequired = Math.max(1, required);
  const clamped = Math.min(progress, safeRequired);

  return (
    <div className="flex items-center justify-center">
      {Array.from({ length: safeRequired }, (_, i) => {
        const done = i < clamped;
        return (
          <div key={i} className="flex items-center">
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.12 + i * 0.08, type: "spring", stiffness: 320, damping: 20 }}
              className={cn(
                "relative grid size-12 place-items-center rounded-full border-2 sm:size-14",
                done
                  ? "border-white bg-white text-black shadow-[0_0_20px_-6px_rgba(255,255,255,0.45)]"
                  : "border-white/20 bg-white/[0.04] text-white/35",
              )}
            >
              {done ? (
                <Check className="size-5 sm:size-6" strokeWidth={2.75} />
              ) : (
                <Users className="size-5 sm:size-6" strokeWidth={1.75} />
              )}
            </motion.span>
            {i < safeRequired - 1 ? (
              <span
                className={cn(
                  "mx-1.5 h-0.5 w-6 rounded-full sm:mx-2.5 sm:w-10",
                  i < clamped ? "bg-white/70" : "bg-white/12",
                )}
              />
            ) : null}
          </div>
        );
      })}
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
  const days = trial?.trial_days ?? 7;
  const rewardPlan = trialPlanLabel(trial?.trial_plan);

  const used = isTryOn ? usage?.morph_ai_used ?? 0 : usage?.morph_studio_used ?? 0;
  const limit = isTryOn ? usage?.morph_ai_limit ?? 0 : usage?.morph_studio_limit ?? 0;
  const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return (
    <div className="relative space-y-5 text-white">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#161616] to-[#0a0a0a] px-5 pb-6 pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.1),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/[0.04] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-0 h-36 w-36 rounded-full bg-white/[0.03] blur-3xl"
        />

        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative"
          >
            <span
              aria-hidden
              className="absolute inset-0 animate-pulse rounded-[26px] bg-white/10 blur-xl"
            />
            <span className="relative grid size-[72px] place-items-center rounded-[26px] border border-white/20 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
              {locked ? (
                <Lock className="size-8 text-white" strokeWidth={1.6} />
              ) : (
                <Sparkles className="size-8 text-white" strokeWidth={1.6} />
              )}
            </span>
          </motion.div>

          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.28em] text-white/45">
            Morf AI
          </p>
          <h3 className="mt-2 max-w-[20rem] text-[1.65rem] font-bold leading-[1.15] tracking-tight sm:text-[1.85rem]">
            {locked
              ? t("aiStylePage.limitSheet.accessTitle")
              : t(
                  isTryOn
                    ? "aiStylePage.limitSheet.tryonTitle"
                    : "aiStylePage.limitSheet.studioTitle",
                )}
          </h3>
          <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-white/50">
            {locked
              ? t("aiStylePage.limitSheet.accessSubtitle")
              : planName
                ? t("aiStylePage.limitSheet.descWithPlan", { plan: planName })
                : t("aiStylePage.limitSheet.descFree")}
          </p>

          {locked ? (
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-1.5 text-sm font-bold text-white"
            >
              <Crown className="size-3.5 text-white/80" strokeWidth={2.25} />
              {days} kun {rewardPlan} · bepul
            </motion.div>
          ) : null}
        </div>

        {locked && trial ? (
          <div className="relative mt-7 space-y-4">
            <FriendSteps progress={progress} required={required} />
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
                Referal
              </p>
              <p className="text-sm font-semibold tabular-nums text-white/85">
                {Math.min(progress, required)}/{required}
                {remaining > 0 ? (
                  <span className="ml-2 font-medium text-white/55">· yana {remaining}</span>
                ) : null}
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round((Math.min(progress, required) / Math.max(1, required)) * 100)}%`,
                }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ) : !locked && limit > 0 ? (
          <div className="relative mt-7 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                {planName || "Plan"}
              </p>
              <p className="text-sm font-semibold tabular-nums text-white/90">
                {t("aiStylePage.limitSheet.usage", { used, limit })}
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white" style={{ width: `${usagePct}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      {locked ? (
        <p className="px-0.5 text-center text-[14px] leading-relaxed text-white/45">
          {t("aiStylePage.limitSheet.descLocked", { required, days })}
        </p>
      ) : null}

      <div className={cn("grid gap-3", locked ? "sm:grid-cols-2" : "grid-cols-1")}>
        <Link
          to="/wallet"
          search={{ section: "subscriptions" }}
          onClick={onClose}
          className={cn(
            "group relative flex min-h-[88px] flex-col justify-center overflow-hidden rounded-[22px] px-4 py-4",
            "bg-white text-black",
            "shadow-[0_16px_40px_-18px_rgba(255,255,255,0.25)] transition-[transform,opacity] duration-200",
            "hover:opacity-95 active:scale-[0.985]",
          )}
        >
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-black/55">
            <Crown className="size-3.5" strokeWidth={2.5} />
            Darhol
          </span>
          <span className="mt-1 text-[15px] font-bold leading-snug">
            {t("aiStylePage.limitSheet.buyPlan")}
          </span>
        </Link>

        {locked ? (
          <Link
            to="/referrals"
            onClick={onClose}
            className={cn(
              "flex min-h-[88px] flex-col justify-center rounded-[22px] border border-white/20 bg-transparent px-4 py-4",
              "transition-[transform,background-color] duration-200",
              "hover:bg-white/[0.06] active:scale-[0.985]",
            )}
          >
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
              <UserPlus className="size-3.5" strokeWidth={2.25} />
              Referal
            </span>
            <span className="mt-1 text-[15px] font-bold leading-snug text-white">
              {remaining > 0
                ? t("aiStylePage.limitSheet.inviteFriends", { count: remaining })
                : t("aiStylePage.limitSheet.openReferrals")}
            </span>
          </Link>
        ) : (
          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            onClick={onClose}
            className={cn(
              "flex h-14 items-center justify-center rounded-[22px] border border-white/20 bg-transparent text-[15px] font-bold text-white",
              "transition-[transform,background-color] duration-200 hover:bg-white/[0.06] active:scale-[0.985]",
            )}
          >
            {t("aiStylePage.limitSheet.switchPlan")}
          </Link>
        )}
      </div>
    </div>
  );
}

const shellClass =
  "border-white/10 bg-[#0a0a0a] text-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] " +
  "[&>button]:text-white/70 [&>button]:hover:text-white [&>button]:hover:bg-white/10 " +
  "[&>button]:ring-offset-[#0a0a0a]";

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
        <DrawerContent
          className={cn(
            "rounded-t-[32px] border-white/10 bg-[#0a0a0a] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 text-white",
            "[&_[data-vaul-handle]]:bg-white/25",
          )}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{subtitle}</DrawerDescription>
          </DrawerHeader>
          <MorphLimitUpsellBody kind={kind} me={me} onClose={() => onOpenChange(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          shellClass,
          "max-h-[min(92vh,820px)] w-[min(94vw,580px)] max-w-[580px] gap-0 overflow-y-auto rounded-[32px] p-6 sm:p-7",
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <MorphLimitUpsellBody kind={kind} me={me} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
