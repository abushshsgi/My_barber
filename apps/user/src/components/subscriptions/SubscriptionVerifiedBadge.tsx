import { BadgeCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

export type SubscriptionBadgeLevel = "basic" | "plus" | "pro" | string | null | undefined;

/** Obuna tasdiq belgisi — ism yonidagi galochka. */
export function SubscriptionVerifiedBadge({
  badge,
  className,
  size = "md",
}: {
  badge?: SubscriptionBadgeLevel;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (!badge) return null;

  const sizeCls =
    size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4";

  const tone =
    badge === "pro"
      ? "text-foreground"
      : badge === "plus"
        ? "text-foreground/80"
        : "text-foreground/70";

  const label =
    badge === "pro"
      ? "Pro tasdiqlangan"
      : badge === "plus"
        ? "Plus tasdiqlangan"
        : "Tasdiqlangan";

  return (
    <BadgeCheck
      className={cn("shrink-0", sizeCls, tone, className)}
      strokeWidth={2.5}
      aria-label={label}
      title={label}
    />
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
  asLink?: boolean;
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
}: NameProps) {
  const meQ = useSubscriptionMe();
  const resolved = badge ?? (useMe ? meQ.data?.badge : null);

  const inner = (
    <span className={cn("inline-flex max-w-full items-center gap-1.5", className)}>
      <span className={cn("truncate", nameClassName)}>{name}</span>
      <SubscriptionVerifiedBadge badge={resolved} size={size} />
    </span>
  );

  if (asLink) {
    return (
      <Link to="/wallet" search={{ section: "subscriptions" }} className="inline-flex max-w-full">
        {inner}
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
}: {
  name: string;
  className?: string;
  nameClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <UserNameWithBadge
      name={name}
      useMe
      className={className}
      nameClassName={nameClassName}
      size={size}
    />
  );
}
