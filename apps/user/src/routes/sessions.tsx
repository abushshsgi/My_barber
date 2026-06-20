import { createFileRoute } from "@tanstack/react-router";
import { Laptop, MonitorSmartphone, Smartphone, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { useRevokeOtherSessions, useRevokeSession, useUserSessions } from "@/hooks/use-sessions";
import { parseSubpageBackTo } from "@/lib/subpage-back";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sessions")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Faol sessiyalar — mysaloon.uz" }] }),
  component: SessionsPage,
});

function platformIcon(platform: string) {
  if (platform === "ios" || platform === "android") return Smartphone;
  if (platform === "web") return Laptop;
  return MonitorSmartphone;
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SessionsPage() {
  const { t, i18n } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/settings?section=security");
  const { data: sessions = [], isLoading } = useUserSessions();
  const revokeOne = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const busy = revokeOne.isPending || revokeOthers.isPending;
  const othersCount = sessions.filter((s) => !s.is_current).length;

  const handleRevoke = (id: number) => {
    revokeOne.mutate(id, {
      onSuccess: () => toast.success(t("sessions.revoked", { defaultValue: "Sessiya bekor qilindi" })),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const handleRevokeOthers = () => {
    revokeOthers.mutate(undefined, {
      onSuccess: (res) =>
        toast.success(
          t("sessions.revokedOthers", {
            defaultValue: "{{count}} ta boshqa sessiya bekor qilindi",
            count: res.revoked_count,
          }),
        ),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <ProfileSubpageLayout
      title={t("sessions.title", { defaultValue: "Faol sessiyalar" })}
      subtitle={t("sessions.subtitle", {
        defaultValue: "Hisobingiz qaysi qurilmalardan ochilganini ko'ring va boshqaring.",
      })}
      backTo={backTo}
    >
      {othersCount > 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={handleRevokeOthers}
          className="mb-4 w-full rounded-2xl border border-border px-4 py-3 text-sm font-bold"
        >
          {t("sessions.revokeOthers", { defaultValue: "Boshqa barcha sessiyalarni bekor qilish" })}
        </button>
      ) : null}

      {isLoading ? (
        <ProfileSubpageCard>
          <p className="text-sm text-muted-foreground">{t("common.loading", { defaultValue: "Yuklanmoqda…" })}</p>
        </ProfileSubpageCard>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<MonitorSmartphone className="h-7 w-7" />}
          title={t("sessions.empty", { defaultValue: "Faol sessiyalar yo'q" })}
          description={t("sessions.emptyHint", {
            defaultValue: "Keyingi kirishdan so'ng qurilmalar shu yerda ko'rinadi.",
          })}
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const Icon = platformIcon(session.platform);
            return (
              <ProfileSubpageCard
                key={session.id}
                className={cn(session.is_current && "ring-2 ring-foreground/15")}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold">{session.device_name}</p>
                      {session.is_current ? (
                        <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                          {t("sessions.current", { defaultValue: "Joriy" })}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("sessions.lastSeen", { defaultValue: "Oxirgi faollik" })}:{" "}
                      {formatWhen(session.last_seen_at, i18n.language)}
                    </p>
                    {session.ip_address ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">IP: {session.ip_address}</p>
                    ) : null}
                  </div>
                </div>
                {!session.is_current ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRevoke(session.id)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("sessions.revoke", { defaultValue: "Bekor qilish" })}
                  </button>
                ) : null}
              </ProfileSubpageCard>
            );
          })}
        </div>
      )}
    </ProfileSubpageLayout>
  );
}
