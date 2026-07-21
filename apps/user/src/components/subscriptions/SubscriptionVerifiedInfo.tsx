import { useState, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Sparkles, Wand2, Zap } from "lucide-react";
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
import { cn } from "@/lib/utils";

type BadgeLevel = "basic" | "plus" | "pro" | string;

function planLabel(badge: BadgeLevel): string {
  if (badge === "pro") return "Pro";
  if (badge === "plus") return "Plus";
  return "Starter";
}

function VerifiedInfoBody({
  badge,
  onClose,
}: {
  badge: BadgeLevel;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const plan = planLabel(badge);

  const perks = [
    {
      icon: BadgeCheck,
      text: t("subscriptionVerified.perkBadge", {
        defaultValue: "Ism yonida tasdiq galochkasi — boshqalar ko‘radi.",
      }),
    },
    {
      icon: Wand2,
      text: t("subscriptionVerified.perkMorph", {
        defaultValue: "Morph AI try-on va uslub generatsiyasi.",
      }),
    },
    {
      icon: Zap,
      text: t("subscriptionVerified.perkLimits", {
        defaultValue: "Yuqori oylik limitlar — Plus va Pro da yanada ko‘proq.",
      }),
    },
    {
      icon: Sparkles,
      text: t("subscriptionVerified.perkStudio", {
        defaultValue: "Studio, oila va premium imkoniyatlar.",
      }),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
          <BadgeCheck className="size-6" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("subscriptionVerified.eyebrow", { defaultValue: "Mysaloon tasdiq" })}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            {t("subscriptionVerified.title", {
              plan,
              defaultValue: "Bu foydalanuvchi tasdiqlangan — {{plan}}",
            })}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("subscriptionVerified.body", {
              defaultValue:
                "Galochka Mysaloon obunasini bildiradi. U Morph AI, yuqori limitlar va profil belgisiga ega — siz ham shunday bo‘lishingiz mumkin.",
            })}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {perks.map((perk) => (
          <li key={perk.text} className="flex items-start gap-3 text-sm text-foreground">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-surface">
              <perk.icon className="size-4 text-foreground/80" strokeWidth={2.25} />
            </span>
            <span className="pt-1.5 leading-snug">{perk.text}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-2.5 pt-1">
        <Link
          to="/wallet"
          search={{ section: "subscriptions" }}
          onClick={onClose}
          className="flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3.5 text-sm font-bold text-background transition-opacity active:opacity-90"
        >
          {t("subscriptionVerified.cta", {
            defaultValue: "Men ham galochka olaman",
          })}
        </Link>
        <p className="text-center text-[11px] font-medium text-muted-foreground">
          {t("subscriptionVerified.ctaHint", {
            defaultValue: "Starter dan boshlang — bir zumda ochiladi.",
          })}
        </p>
      </div>
    </div>
  );
}

/** Galochkani bosganda — tasdiq nima ekanini marketing matn bilan ko‘rsatadi. */
export function SubscriptionVerifiedInfoTrigger({
  badge,
  size = "md",
  className,
}: {
  badge: BadgeLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const sizeCls = size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4";
  const tone =
    badge === "pro"
      ? "text-foreground"
      : badge === "plus"
        ? "text-foreground/80"
        : "text-foreground/70";

  const label =
    badge === "pro"
      ? t("subscriptionVerified.ariaPro", { defaultValue: "Pro tasdiqlangan" })
      : badge === "plus"
        ? t("subscriptionVerified.ariaPlus", { defaultValue: "Plus tasdiqlangan" })
        : t("subscriptionVerified.ariaBasic", { defaultValue: "Tasdiqlangan" });

  const onOpen = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const trigger = (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full p-0.5 transition-opacity hover:opacity-80 active:opacity-70",
        className,
      )}
      aria-label={label}
      title={label}
    >
      <BadgeCheck className={cn(sizeCls, tone)} strokeWidth={2.5} aria-hidden />
    </button>
  );

  const title = t("subscriptionVerified.title", {
    plan: planLabel(badge),
    defaultValue: "Bu foydalanuvchi tasdiqlangan — {{plan}}",
  });
  const subtitle = t("subscriptionVerified.body", {
    defaultValue:
      "Galochka Mysaloon obunasini bildiradi. U Morph AI, yuqori limitlar va profil belgisiga ega — siz ham shunday bo‘lishingiz mumkin.",
  });

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="rounded-t-[28px] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{subtitle}</DrawerDescription>
            </DrawerHeader>
            <VerifiedInfoBody badge={badge} onClose={() => setOpen(false)} />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 overflow-y-auto rounded-[28px] p-6 sm:p-7">
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <VerifiedInfoBody badge={badge} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
