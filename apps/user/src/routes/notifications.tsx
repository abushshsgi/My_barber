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
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Notification } from "@/lib/mock-data";
import {
  useMarkAllNotificationsRead,
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
type FilterKey = "all" | "unread" | Channel;

const CHANNELS: { key: Channel; labelKey: string; descKey: string; icon: typeof Bell }[] = [
  { key: "booking", labelKey: "notifications.channels.booking", descKey: "notifications.channels.bookingDesc", icon: CalendarCheck },
  { key: "chat_message", labelKey: "notifications.channels.chat", descKey: "notifications.channels.chatDesc", icon: MessageSquare },
  { key: "promo", labelKey: "notifications.channels.promo", descKey: "notifications.channels.promoDesc", icon: Tag },
  { key: "review", labelKey: "notifications.channels.review", descKey: "notifications.channels.reviewDesc", icon: Star },
];

const FILTERS: { key: FilterKey; labelKey: string }[] = [
  { key: "all", labelKey: "notifications.filters.all" },
  { key: "unread", labelKey: "notifications.filters.unread" },
  { key: "booking", labelKey: "notifications.filters.booking" },
  { key: "chat_message", labelKey: "notifications.filters.chat" },
  { key: "promo", labelKey: "notifications.filters.promo" },
  { key: "review", labelKey: "notifications.filters.review" },
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
  const items = apiItems;
  const markAllMutation = useMarkAllNotificationsRead();
  const markOneMutation = useMarkNotificationRead();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showSettings, setShowSettings] = useState(false);
  const { prefs, update, mounted } = usePrefs();

  const markAll = () => markAllMutation.mutate();
  const markOne = (id: string) => {
    const num = parseInt(id, 10);
    if (Number.isFinite(num)) markOneMutation.mutate(num);
  };

  const enabledItems = useMemo(
    () => (mounted ? items.filter((n) => prefs[n.type]) : items),
    [items, prefs, mounted],
  );

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: enabledItems.length,
      unread: enabledItems.filter((n) => !n.read).length,
      booking: enabledItems.filter((n) => n.type === "booking").length,
      chat_message: enabledItems.filter((n) => n.type === "chat_message").length,
      promo: enabledItems.filter((n) => n.type === "promo").length,
      review: enabledItems.filter((n) => n.type === "review").length,
    };
    return c;
  }, [enabledItems]);

  const filtered = useMemo(() => {
    if (filter === "all") return enabledItems;
    if (filter === "unread") return enabledItems.filter((n) => !n.read);
    return enabledItems.filter((n) => n.type === filter);
  }, [enabledItems, filter]);

  const allOff = Object.values(prefs).every((v) => !v);

  if (!userId) {
    return (
      <ProfileSubpageLayout title={t("notifications.title")}>
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
            className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-6 py-3.5 text-sm font-bold text-background"
          >
            {t("auth.login", { defaultValue: "Kirish" })}
          </Link>
        </div>
      </ProfileSubpageLayout>
    );
  }

  return (
    <ProfileSubpageLayout
      title={t("notifications.title")}
      right={
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full transition-colors",
              showSettings ? "bg-foreground text-background" : "bg-background text-foreground shadow-sm",
            )}
            aria-label={t("notifications.settings", { defaultValue: "Sozlamalar" })}
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            onClick={markAll}
            disabled={markAllMutation.isPending || items.length === 0}
            className="rounded-full bg-background px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-foreground shadow-sm disabled:opacity-50"
          >
            {t("notifications.markAll")}
          </button>
        </div>
      }
    >
      {showSettings && (
        <section className="mb-4 rounded-2xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("notifications.channelSettings", { defaultValue: "Bildirishnoma kanallari" })}
            </p>
            <span className="text-[10px] font-bold text-muted-foreground">
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
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left active:bg-surface"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-surface">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold leading-tight">{t(c.labelKey)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                        {t(c.descKey)}
                      </p>
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
                          "h-5 w-5 rounded-full bg-background shadow transition-transform",
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

      <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-bold transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground/70",
              )}
            >
              {t(f.labelKey)}
              <span
                className={cn(
                  "inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                  active ? "bg-background/15 text-background" : "bg-surface text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {allOff && (
        <div className="mx-5 mt-3 flex items-start gap-3 rounded-2xl bg-foreground/5 p-4">
          <BellOff className="mt-0.5 h-4 w-4" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold leading-tight">
              {t("notifications.allOffTitle", { defaultValue: "Hamma kanallar o'chirilgan" })}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t("notifications.allOffHint", { defaultValue: "Sozlamalardan kerakli kanallarni yoqing" })}
            </p>
          </div>
          <button
            onClick={() => CHANNELS.forEach((c) => update(c.key, true))}
            className="rounded-full bg-foreground px-3 py-1.5 text-[11px] font-bold text-background"
          >
            {t("notifications.enableAll", { defaultValue: "Yoqish" })}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : isError ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title={t("common.loadError")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Bell className="h-7 w-7" />} title={t("notifications.empty")} />
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((n) => {
            const Icon = TYPE_ICON[n.type];
            const content = (
              <div
                onClick={() => markOne(n.id)}
                className={cn(
                  "flex gap-3 px-5 py-4 transition-colors active:bg-surface",
                  !n.read && "bg-surface/40",
                )}
              >
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-surface">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  {!n.read && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-foreground ring-2 ring-background" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-sm font-bold">{n.title}</h3>
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                      {n.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  {n.read && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      <Check className="h-3 w-3" /> {t("notifications.read", { defaultValue: "O'qildi" })}
                    </p>
                  )}
                </div>
              </div>
            );
            const target = getNotificationLinkProps(n);
            const hasLink = Boolean(n.bookingId || n.chatId || n.reviewId || n.link);
            return hasLink ? (
              <Link
                key={n.id}
                to={target.to as never}
                params={target.params as never}
                search={target.search as never}
                onClick={() => markOne(n.id)}
                className="block"
              >
                {content}
              </Link>
            ) : (
              <div key={n.id} onClick={() => markOne(n.id)} role="presentation">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </ProfileSubpageLayout>
  );
}
