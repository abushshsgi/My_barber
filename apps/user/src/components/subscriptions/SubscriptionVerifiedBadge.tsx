import { BadgeCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { SubscriptionVerifiedInfoTrigger } from "@/components/subscriptions/SubscriptionVerifiedInfo";
import { cn } from "@/lib/utils";

export type SubscriptionBadgeLevel = "basic" | "plus" | "pro" | string | null | undefined;

/** Obuna tasdiq belgisi — ism yonidagi galochka (bosiladi → marketing). */
export function SubscriptionVerifiedBadge({
  badge,
  className,
  size = "md",
  interactive = true,
}: {
  badge?: SubscriptionBadgeLevel;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** false bo‘lsa — faqat ikonka, dialog ochilmaydi */
  interactive?: boolean;
}) {
  if (!badge) return null;

  if (interactive) {
    return <SubscriptionVerifiedInfoTrigger badge={badge} size={size} className={className} />;
  }

  const sizeCls = size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4";
  const tone =
    badge === "pro"
      ? "text-foreground"
      : badge === "plus"
        ? "text-foreground/80"
        : "text-foreground/70";

  const label =
    badge === "pro" ? "Pro tasdiqlangan" : badge === "plus" ? "Plus tasdiqlangan" : "Tasdiqlangan";

  return (
    <span className={cn("inline-flex shrink-0", className)} title={label}>
      <BadgeCheck
        className={cn(sizeCls, tone)}
        strokeWidth={2.5}
        aria-label={label}
      />
    </span>
  );
}

type NameProps = {
  name: string;
  badge?: SubscriptionBadgeLevel;
  /** Agar badge berilmasa — joriy userning obunasidan oladi */
  useMe?: boolean;
  className?: string;
  nameClassName?: string;
  size?: "sm" | "md" | "lg";
  /** Butun qatorni obunalar sahifasiga bog‘lash (eski usul) */
  asLink?: boolean;
  /** Faqat ismni shu yo‘lga bog‘lash — galochka alohida bosiladi */
  nameTo?: "/settings" | "/profile" | "/wallet";
};

/** Ism + obuna galochkasi. */
export function UserNameWithBadge({
  name,
  badge,
  useMe = false,
  className,
  nameClassName,
  size = "md",
  asLink = false,
  nameTo,
}: NameProps) {
  const meQ = useSubscriptionMe();
  const resolved = badge ?? (useMe ? meQ.data?.badge : null);

  const nameEl = <span className={cn("truncate", nameClassName)}>{name}</span>;

  const inner = (
    <span className={cn("inline-flex max-w-full items-center gap-1.5", className)}>
      {nameTo ? (
        <Link to={nameTo} className="min-w-0 truncate">
          {nameEl}
        </Link>
      ) : (
        nameEl
      )}
      <SubscriptionVerifiedBadge badge={resolved} size={size} />
    </span>
  );

  if (asLink) {
    return (
      <Link to="/wallet" search={{ section: "subscriptions" }} className="inline-flex max-w-full">
        <span className={cn("inline-flex max-w-full items-center gap-1.5", className)}>
          {nameEl}
          <SubscriptionVerifiedBadge badge={resolved} size={size} interactive={false} />
        </span>
      </Link>
    );
  }

  return inner;
}

/** Faqat joriy user uchun — me.badge. */
export function MyNameWithBadge({
  name,
  className,
  nameClassName,
  size = "md",
  nameTo,
}: {
  name: string;
  className?: string;
  nameClassName?: string;
  size?: "sm" | "md" | "lg";
  nameTo?: "/settings" | "/profile" | "/wallet";
}) {
  return (
    <UserNameWithBadge
      name={name}
      useMe
      className={className}
      nameClassName={nameClassName}
      size={size}
      nameTo={nameTo}
    />
  );
}
