import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Edit2,
  Heart,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  Tag,
  Sparkles,
  Gift,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { bookings, salons, userProfile, loyaltyMock } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { useFavorites } from "@/hooks/use-favorites";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profil — mysaloon.uz" }] }),
  component: Profile,
});

function Profile() {
  const { t } = useTranslation();
  const { ids: favIds } = useFavorites();

  const stats = [
    { label: t("profile.bookings"), value: bookings.length, to: "/bookings" as const },
    { label: t("profile.reviews"), value: 8, to: "/bookings" as const },
    { label: t("profile.favorites"), value: favIds.length || salons.length, to: "/favorites" as const },
  ];

  const quick = [
    { icon: Sparkles, label: t("profile.loyalty"), to: "/loyalty" as const, hint: `${loyaltyMock.points} ball` },
    { icon: Tag, label: t("profile.offers"), to: "/offers" as const },
    { icon: Gift, label: t("profile.giftcard"), to: "/giftcard" as const },
  ];

  const menu = [
    { icon: Edit2, label: t("profile.editProfile"), to: "/profile" as const },
    { icon: Heart, label: t("profile.favorites"), to: "/favorites" as const },
    { icon: Settings, label: t("profile.settings"), to: "/settings" as const },
    { icon: HelpCircle, label: t("profile.support"), to: "/support" as const },
    { icon: Shield, label: t("profile.privacy"), to: "/privacy" as const },
  ];

  return (
    <div className="pb-8">
      <PageHeader title={t("profile.title")} />

      <div className="px-5">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-foreground text-2xl font-bold text-background">
            {userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold tracking-tight">
              {userProfile.name}
            </h2>
            <p className="mt-0.5 text-xs font-bold text-muted-foreground">
              {userProfile.phone}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-border">
        {stats.map((s, i) => (
          <Link
            key={s.label}
            to={s.to}
            className={i < stats.length - 1 ? "border-r border-border py-4 text-center" : "py-4 text-center"}
          >
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick — new pages */}
      <div className="mt-6 grid grid-cols-3 gap-2 px-5">
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <Link
              key={q.label}
              to={q.to}
              className="flex flex-col items-start gap-2 rounded-2xl bg-surface p-3 active:scale-[0.97] transition-transform"
            >
              <Icon className="h-4 w-4" strokeWidth={2.4} />
              <span className="text-[11px] font-bold leading-tight">{q.label}</span>
              {q.hint && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  {q.hint}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 px-5">
        <div className="overflow-hidden rounded-2xl border border-border">
          {menu.map((m, i) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.label}
                to={m.to}
                className={
                  "flex items-center gap-3 px-4 py-4 transition-colors active:bg-surface" +
                  (i < menu.length - 1 ? " border-b border-border" : "")
                }
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-surface">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="flex-1 text-sm font-bold">{m.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 px-5">
        <Link
          to="/auth"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border py-4 text-sm font-bold text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t("common.logout")}
        </Link>
      </div>

      <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        mysaloon.uz · v1.0
      </p>
    </div>
  );
}
