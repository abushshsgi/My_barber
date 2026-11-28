import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hasStoredUserCredential } from "@/lib/api/client";
import { useDisplayUser } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

const ProfileAccountDropdown = lazy(() =>
  import("./ProfileAccountDropdown").then((m) => ({ default: m.ProfileAccountDropdown })),
);

type Props = {
  notificationsUnread?: number;
};

/**
 * Radix dropdown faqat autentifikatsiyadan keyin — Explore mehmonida
 * bootstrap vaqtida vendor-radix yuklanmasin.
 */
export function ProfileAccountEntry({ notificationsUnread }: Props) {
  const { t } = useTranslation();
  const user = useDisplayUser();
  const hasCredential = hasStoredUserCredential();
  const signedIn = hasCredential || Boolean(user.id);

  if (!signedIn) {
    return (
      <Link
        to="/auth"
        className={cn(
          "relative inline-flex h-11 min-w-11 items-center justify-center rounded-full px-2 font-bold transition-colors",
          "text-muted-foreground hover:bg-background hover:text-foreground",
        )}
        aria-label={t("nav.profile")}
        title={t("nav.profile")}
      >
        <User className="h-5 w-5 shrink-0" strokeWidth={2.2} />
      </Link>
    );
  }

  return (
    <Suspense
      fallback={
        <span
          className="relative inline-flex h-11 min-w-11 items-center justify-center rounded-full px-2 text-muted-foreground"
          aria-hidden
        >
          <User className="h-5 w-5 shrink-0" strokeWidth={2.2} />
        </span>
      }
    >
      <ProfileAccountDropdown notificationsUnread={notificationsUnread} />
    </Suspense>
  );
}