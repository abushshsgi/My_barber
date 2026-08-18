import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Crown, Gift, Lock, Sparkles, UserPlus } from "lucide-react";
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
import { SubscriptionPlanAds } from "@/components/subscriptions/SubscriptionPlanAds";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscriptionPlans } from "@/hooks/use-subscription";
import type { MorphLimitKind } from "@/lib/morph-plan-limit";
import { planLabelFromMe } from "@/lib/morph-plan-limit";
import type { SubscriptionMe } from "@/lib/api/subscriptions";
import { nextUpgradePlan } from "@/lib/subscription-upgrade";
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
  const { t, i18n } = useTranslation();
  const plansQ = useSubscriptionPlans();
  const usage = me?.usage;
  const planName = planLabelFromMe(me, i18n.language);
  const credits =
    me?.referral_credits ?? me?.access?.referral_credits ?? 0;
  const refGenOn =
    me?.referral_generation_enabled ??
    me?.access?.referral_generation_enabled ??
    true;
  const locked =
    kind === "access" ||
    kind === "voice" ||
    (kind !== "chat" && !me?.has_active && credits <= 0);
  const isTryOn = kind === "tryon";
  const isChat = kind === "chat";
  const isVoice = kind === "voice";
  const plans = plansQ.data ?? [];
  const activeCode = me?.subscription?.plan_code ?? null;
  const next = nextUpgradePlan(activeCode);
  const offer = me?.welcome_offer;

  const used = isChat
    ? usage?.morph_chat_tokens_used ?? 0
    : isTryOn
      ? usage?.morph_ai_used ?? 0
      : usage?.morph_studio_used ?? 0;
  const limit = isChat
    ? usage?.morph_chat_tokens_limit ?? 0
    : isTryOn
      ? usage?.morph_ai_limit ?? 0
      : usage?.morph_studio_limit ?? 0;
  const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return (
    <div className="relative space-y-5 text-white">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#161616] to-[#0a0a0a] px-5 pb-6 pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.1),transparent_55%)]"
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
            {locked && kind !== "chat" && kind !== "voice"
              ? t("aiStylePage.limitSheet.accessTitle")
              : t(
                  isVoice
                    ? "aiStylePage.limitSheet.voiceTitle"
                    : isChat
                    ? "aiStylePage.limitSheet.chatTitle"
                    : isTryOn
                      ? "aiStylePage.limitSheet.tryonTitle"
                      : "aiStylePage.limitSheet.studioTitle",
                )}
          </h3>
          <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-white/50">
            {locked
              ? isVoice
                ? t("aiStylePage.limitSheet.voiceSubtitle")
                : t("aiStylePage.limitSheet.accessSubtitle")
              : planName
                ? t("aiStylePage.limitSheet.descWithPlan", { plan: planName })
                : t("aiStylePage.limitSheet.descFree")}
          </p>

          {locked && refGenOn && !isVoice ? (
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-1.5 text-sm font-bold text-white"
            >
              <Gift className="size-3.5 text-white/80" strokeWidth={2.25} />
              {t("aiStylePage.limitSheet.friendGift")}
            </motion.div>
          ) : null}
        </div>

        {!locked && limit > 0 ? (
          <div className="relative mt-7 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                {planName || "Plan"}
              </p>
              <p className="text-sm font-semibold tabular-nums text-white/90">
                {t("aiStylePage.limitSheet.usage", { pct: usagePct })}
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
          {isVoice
            ? t("aiStylePage.limitSheet.descVoice")
            : refGenOn
            ? t("aiStylePage.limitSheet.descLocked", {
                defaultValue:
                  "Yangi hisobda Morph AI ishlamaydi. 1 ta do'stni taklif qilsangiz — 1 generatsiya, yoki obuna sotib oling.",
              })
            : t("aiStylePage.limitSheet.descLockedSubOnly", {
                defaultValue: "Yangi hisobda Morph AI ishlamaydi. Obuna sotib oling.",
              })}
        </p>
      ) : null}

      {plans.length > 0 && (locked || next || !me?.has_active) ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
              {me?.has_active
                ? t("aiStylePage.limitSheet.plansUpgrade")
                : t("aiStylePage.limitSheet.plansTitle")}
            </p>
            <Link
              to="/wallet"
              search={{
                section: "subscriptions",
                plan: next || "starter",
                returnTo: "/ai-style",
              }}
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-white/70 hover:text-white"
            >
              {t("aiStylePage.limitSheet.seeAll")}
              <Crown className="size-3" strokeWidth={2.5} />
            </Link>
          </div>
          <SubscriptionPlanAds
            plans={plans}
            activeCode={me?.has_active ? activeCode : null}
            upgradeOnly={Boolean(me?.has_active)}
            onNavigate={onClose}
            variant="cards"
          />
        </div>
      ) : null}

      {!me?.has_active ? (
        <>
          <Link
            to="/wallet"
            search={{ section: "subscriptions", plan: "starter", returnTo: "/ai-style" }}
            onClick={onClose}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-[22px] bg-white text-[15px] font-bold text-[#0a0a0a]",
              "transition-[transform,background-color] duration-200 hover:bg-white/95 active:scale-[0.985]",
            )}
          >
            <Crown className="size-5" strokeWidth={2.25} />
            {offer?.eligible
              ? `Obuna olish (−${offer.discount_pct}%)`
              : t("aiStylePage.limitSheet.buyPlan", { defaultValue: "Obuna olish" })}
          </Link>
          {refGenOn ? (
            <Link
              to="/referrals"
              onClick={onClose}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-[22px] border border-white/20 bg-transparent text-[14px] font-bold text-white",
                "transition-[transform,background-color] duration-200 hover:bg-white/[0.06] active:scale-[0.985]",
              )}
            >
              <UserPlus className="size-4.5" />
              {t("aiStylePage.limitSheet.openReferrals", {
                defaultValue: "Do'st taklif qilish",
              })}
            </Link>
          ) : null}
        </>
      ) : next ? (
        <Link
          to="/wallet"
          search={{ section: "subscriptions", plan: next, returnTo: "/ai-style" }}
          onClick={onClose}
          className={cn(
            "flex h-14 items-center justify-center rounded-[22px] bg-white text-[15px] font-bold text-[#0a0a0a]",
            "transition-[transform,background-color] duration-200 hover:bg-white/95 active:scale-[0.985]",
          )}
        >
          {t("aiStylePage.limitSheet.upgradeTo", {
            plan: next === "plus" ? "Plus" : "Pro",
          })}
        </Link>
      ) : null}
    </div>
  );
}

const shellClass =
  "morph-ai-type border-white/10 bg-[#0a0a0a] text-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] " +
  "[&>button]:text-white/70 [&>button]:hover:text-white [&>button]:hover:bg-white/10 " +
  "[&>button]:ring-offset-[#0a0a0a]";

export function MorphLimitUpsell({ open, onOpenChange, kind, me }: Props) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const locked =
    kind === "access" ||
    kind === "voice" ||
    (kind !== "chat" &&
      !me?.has_active &&
      (me?.referral_credits ?? me?.access?.referral_credits ?? 0) <= 0);
  const title = locked
    ? kind === "voice"
      ? t("aiStylePage.limitSheet.voiceTitle")
      : t("aiStylePage.limitSheet.accessTitle")
    : t(
        kind === "chat"
          ? "aiStylePage.limitSheet.chatTitle"
          : kind === "tryon"
            ? "aiStylePage.limitSheet.tryonTitle"
            : "aiStylePage.limitSheet.studioTitle",
      );
  const subtitle = locked
    ? kind === "voice"
      ? t("aiStylePage.limitSheet.voiceSubtitle")
      : t("aiStylePage.limitSheet.accessSubtitle")
    : t("aiStylePage.limitSheet.subtitle");

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={cn(
            "morph-ai-type rounded-t-[32px] border-white/10 bg-[#0a0a0a] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 text-white",
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
