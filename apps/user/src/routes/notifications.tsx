import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarCheck,
  MessageSquare,
  Star,
  Tag,
  Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Notification } from "@/lib/mock-data";
import {
  useMarkNotificationRead,
  useNotificationsApi,
} from "@/hooks/use-notifications-api";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { getNotificationLinkProps } from "@/lib/notification-links";
import { getAuthUserId } from "@/lib/auth-user";
import { readScopedNotifPrefsRaw, writeScopedNotifPrefsRaw } from "@/lib/user-prefs";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Bildirishnomalar — mysaloon.uz" }] }),
  component: Notifications,
});

const TYPE_ICON: Record<Notification["type"], typeof Bell> = {
  booking: CalendarCheck,
  chat_message: MessageSquare,
  review: Star,
  promo: Tag,
};

type Channel = "booking" | "chat_message" | "review" | "promo";

const CHANNELS: { key: Channel; labelKey: string; descKey: string; icon: typeof Bell }[] = [
  { key: "booking", labelKey: "notifications.channels.booking", descKey: "notifications.channels.bookingDesc", icon: CalendarCheck },
  { key: "chat_message", labelKey: "notifications.channels.chat", descKey: "notifications.channels.chatDesc", icon: MessageSquare },
  { key: "promo", labelKey: "notifications.channels.promo", descKey: "notifications.channels.promoDesc", icon: Tag },
  { key: "review", labelKey: "notifications.channels.review", descKey: "notifications.channels.reviewDesc", icon: Star },
];

const defaultPrefs: Record<Channel, boolean> = {
  booking: true,
  chat_message: true,
  promo: true,
  review: true,
};

function usePrefs() {
  const [prefs, setPrefs] = useState<Record<Channel, boolean>>(defaultPrefs);
  const [mounted, setMounted] = useState(false);
  const userId = getAuthUserId();

  useEffect(() => {
    setMounted(true);
    if (!userId) {
      setPrefs(defaultPrefs);
      return;
    }
    try {
      const raw = readScopedNotifPrefsRaw(userId);
      if (raw) setPrefs({ ...defaultPrefs, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
  }, [userId]);

  const update = (key: Channel, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      if (userId != null) {
        try {
          writeScopedNotifPrefsRaw(userId, JSON.stringify(next));
        } catch {
          /* noop */
        }
      }
      return next;
    });
  };

  return { prefs, update, mounted };
}

function Notifications() {
  const { t } = useTranslation();
  const userId = getAuthUserId();
  const { data: apiItems = [], isLoading, isError } = useNotificationsApi();
  const markOneMutation = useMarkNotificationRead();
  const [showSettings, setShowSettings] = useState(false);
  const { prefs, update, mounted } = usePrefs();

  const markOne = (id: string) => {
    const num = parseInt(id, 10);
    if (Number.isFinite(num)) markOneMutation.mutate(num);
  };

  const items = useMemo(
    () => (mounted ? apiItems.filter((n) => prefs[n.type]) : apiItems),
    [apiItems, prefs, mounted],
  );

  const allOff = Object.values(prefs).every((v) => !v);

  if (!userId) {
    return (
      <ProfileSubpageLayout title={t("notifications.title")} backTo="/profile" flush>
        <div className="px-4 py-6">
          <EmptyState
            icon={<Bell className="h-7 w-7" />}
            title={t("notifications.loginRequired", { defaultValue: "Kirish kerak" })}
            description={t("notifications.loginHint", {
              defaultValue: "Bildirishnomalarni ko'rish uchun hisobingizga kiring.",
            })}
          />
          <div className="mt-4">
            <Link
              to="/auth"
              className="inline-flex w-full items-center justify-center rounded-xl bg-foreground px-6 py-3.5 text-sm font-bold text-background"
            >
              {t("auth.login", { defaultValue: "Kirish" })}
            </Link>
          </div>
        </div>
      </ProfileSubpageLayout>
    );
  }

  return (
    <ProfileSubpageLayout
      flush
      title={t("notifications.title")}
      backTo="/profile"
      right={
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={cn(
            "grid size-10 place-items-center rounded-full border border-border transition-colors active:scale-95",
            showSettings ? "bg-foreground text-background" : "bg-surface text-foreground",
          )}
          aria-label={t("notifications.settings", { defaultValue: "Sozlamalar" })}
        >
          <Settings2 className="size-[18px]" />
        </button>
      }
    >
      {showSettings && (
        <section className="border-b border-border bg-surface/50 px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("notifications.channelSettings", { defaultValue: "Bildirishnoma kanallari" })}
            </p>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {t("notifications.channelsOn", {
                defaultValue: "{{on}}/{{total}} yoqilgan",
                on: Object.values(prefs).filter(Boolean).length,
                total: CHANNELS.length,
              })}
            </span>
          </div>
          <ul className="space-y-1">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              const on = prefs[c.key];
              return (
                <li key={c.key}>
                  <button
                    onClick={() => update(c.key, !on)}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left active:bg-background"
                  >
                    <div className="grid size-9 place-items-center rounded-full bg-background">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{t(c.labelKey)}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t(c.descKey)}</p>
                    </div>
                    <span
                      role="switch"
                      aria-checked={on}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                        on ? "bg-foreground" : "bg-border",
                      )}
                    >
                      <span
                        className={cn(
                          "size-5 rounded-full bg-background shadow transition-transform",
                          on ? "translate-x-[22px]" : "translate-x-[2px]",
                        )}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {allOff && (
        <div className="flex items-start gap-3 border-b border-border bg-surface/40 px-4 py-4">
          <BellOff className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">
              {t("notifications.allOffTitle", { defaultValue: "Hamma kanallar o'chirilgan" })}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("notifications.allOffHint", { defaultValue: "Sozlamalardan kerakli kanallarni yoqing" })}
            </p>
          </div>
          <button
            onClick={() => CHANNELS.forEach((c) => update(c.key, true))}
            className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
          >
            {t("notifications.enableAll", { defaultValue: "Yoqish" })}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : isError ? (
        <div className="px-4 py-10">
          <EmptyState icon={<Bell className="h-7 w-7" />} title={t("common.loadError")} />
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-16">
          <EmptyState icon={<Bell className="h-7 w-7" />} title={t("notifications.empty")} />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((n) => {
            const Icon = TYPE_ICON[n.type];
            const content = (
              <div
                onClick={() => markOne(n.id)}
                className={cn(
                  "flex gap-3 px-4 py-4 transition-colors active:bg-surface",
                  !n.read && "bg-surface/30",
                )}
              >
                <div className="relative shrink-0">
                  <div className="grid size-11 place-items-center rounded-full bg-surface">
                    <Icon className="size-[18px]" strokeWidth={2} />
                  </div>
                  {!n.read ? (
                    <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-foreground ring-2 ring-background" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold">{n.title}</h3>
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{n.time}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                </div>
              </div>
            );
            const target = getNotificationLinkProps(n);
            const hasLink = Boolean(n.bookingId || n.chatId || n.reviewId || n.link);
            return (
              <li key={n.id}>
                {hasLink ? (
                  <Link
                    to={target.to as never}
                    params={target.params as never}
                    search={target.search as never}
                    onClick={() => markOne(n.id)}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ProfileSubpageLayout>
  );
}
