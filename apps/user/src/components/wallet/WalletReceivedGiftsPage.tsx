import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Crown,
  Gift,
  Inbox,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { useReceivedGifts, useWalletBalance } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { parseWalletBalance, type ApiReceivedGift } from "@/lib/api/wallet";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Filter = "all" | "starred";

function favoritesKey(userId: number | null) {
  return `mysaloon.gift-favorites.${userId ?? "anon"}`;
}

function loadFavorites(userId: number | null): Set<string> {
  try {
    const raw = localStorage.getItem(favoritesKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveFavorites(userId: number | null, ids: Set<string>) {
  localStorage.setItem(favoritesKey(userId), JSON.stringify([...ids]));
}

function formatGiftDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const USE_ACTIONS = [
  {
    id: "book",
    to: "/map" as const,
    search: undefined,
    icon: CalendarCheck,
    title: "Bron",
    hint: "Xarita · hamyon",
  },
  {
    id: "pro",
    to: "/wallet" as const,
    search: { section: "subscriptions" as const, plan: "pro" as const },
    icon: Crown,
    title: "Obuna",
    hint: "Pro · AI",
  },
  {
    id: "ai",
    to: "/explore" as const,
    search: undefined,
    icon: Sparkles,
    title: "AI stil",
    hint: "Explore",
  },
] as const;

function ReceivedGiftCard({
  gift,
  starred,
  onToggleStar,
}: {
  gift: ApiReceivedGift;
  starred: boolean;
  onToggleStar: () => void;
}) {
  const { t, i18n } = useTranslation();
  const amount = parseWalletBalance(gift.gift_amount ?? gift.amount);
  const from = gift.design?.preview.from ?? "oklch(0.18 0 0)";
  const to = gift.design?.preview.to ?? "oklch(0.32 0 0)";
  const accent = gift.design?.preview.accent ?? "oklch(0.97 0.01 85)";
  const designLabel = i18n.language?.startsWith("uz")
    ? gift.design?.name_uz || gift.design?.name || gift.design_id
    : gift.design?.name || gift.design?.name_uz || gift.design_id;

  return (
    <article className="overflow-hidden rounded-[28px] border border-border/50 bg-card shadow-[0_14px_40px_-28px_rgba(0,0,0,0.4)]">
      <div
        className="relative min-h-[200px] px-5 py-5"
        style={{
          background: `linear-gradient(148deg, ${from}, ${to})`,
          color: accent,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12">
            <Gift className="h-4 w-4" />
          </span>
          <MysaloonLogo size="xs" tone="inherit" className="opacity-80" />
        </div>
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-60">
          {designLabel}
        </p>
        <p className="mt-1.5 text-[2.15rem] font-bold tracking-tight tabular-nums leading-none">
          {formatPrice(amount)}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-45">
              {t("walletPage.received.from", { defaultValue: "Yuboruvchi" })}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold">
              {gift.sender_name || "Do'st"}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-45">
              {t("walletPage.received.to", { defaultValue: "Oluvchi" })}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold">
              {gift.recipient_name || "Siz"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3.5 px-5 py-4">
        {gift.message?.trim() ? (
          <p className="text-[13px] leading-relaxed text-foreground/90">“{gift.message.trim()}”</p>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            {t("walletPage.received.noMessage", { defaultValue: "Xabarsiz sovg'a" })}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {formatGiftDate(gift.created_at)}
          </p>
          <button
            type="button"
            onClick={onToggleStar}
            aria-pressed={starred}
            aria-label={
              starred
                ? t("walletPage.received.unstar", { defaultValue: "Sevimlidan olib tashlash" })
                : t("walletPage.received.star", { defaultValue: "Kolleksiyaga qo'shish" })
            }
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
              starred
                ? "bg-foreground text-background"
                : "bg-surface text-foreground hover:bg-surface/80",
            )}
          >
            <Star className={cn("h-3.5 w-3.5", starred && "fill-current")} />
            {starred
              ? t("walletPage.received.inCollection", { defaultValue: "Kolleksiyada" })
              : t("walletPage.received.collect", { defaultValue: "Saqlash" })}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <Link
            to="/map"
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-foreground px-3 py-2.5 text-[12px] font-bold text-background transition-transform active:scale-[0.98]"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Bron qilish
          </Link>
          <Link
            to="/wallet"
            search={{ section: "subscriptions", plan: "pro" }}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-2.5 text-[12px] font-bold transition-transform active:scale-[0.98]"
          >
            <Crown className="h-3.5 w-3.5" />
            Obuna
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Qabul qilingan sovg'a kartalar — kolleksiya + ishlatish. */
export function WalletReceivedGiftsPage() {
  const { t } = useTranslation();
  const userId = getAuthUserId();
  const { data: gifts = [], isLoading } = useReceivedGifts();
  const { balance } = useWalletBalance();
  const [filter, setFilter] = useState<Filter>("all");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFavorites(loadFavorites(userId));
  }, [userId]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(userId, next);
      return next;
    });
  };

  const visible = useMemo(() => {
    if (filter === "starred") return gifts.filter((g) => favorites.has(g.id));
    return gifts;
  }, [filter, gifts, favorites]);

  const totalReceived = useMemo(
    () => gifts.reduce((sum, g) => sum + parseWalletBalance(g.gift_amount ?? g.amount), 0),
    [gifts],
  );

  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-[24px] bg-foreground px-5 py-4 text-background">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-background/60">
              {t("walletPage.received.statsTitle", { defaultValue: "Kolleksiya" })}
            </p>
            <p className="mt-1.5 text-[1.75rem] font-bold tabular-nums tracking-tight">
              {formatPrice(totalReceived)}
            </p>
            <p className="mt-1.5 text-[12px] font-medium text-background/65">
              {t("walletPage.received.count", {
                defaultValue: "{{count}} ta sovg'a · balans {{balance}}",
                count: gifts.length,
                balance: formatPrice(balance),
              })}
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-background/12">
            <Inbox className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Sovg'ani ishlatish — 3 ustunli grid */}
      <section>
        <h2 className="text-sm font-bold">
          {t("walletPage.received.useTitle", { defaultValue: "Sovg'ani ishlatish" })}
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t("walletPage.received.useHint", {
            defaultValue: "Pul hamyonga tushgan — bron, obuna yoki AI uchun sarflang.",
          })}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {USE_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={action.to}
                search={action.search}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-[18px] border border-border/50 bg-card px-2 py-3.5 text-center",
                  "transition-transform active:scale-[0.97]",
                )}
              >
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface text-foreground">
                  <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold leading-tight text-foreground">
                    {action.title}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                    {action.hint}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 rounded-[16px] bg-surface/80 p-1">
          {(
            [
              { id: "all", label: t("walletPage.received.filterAll", { defaultValue: "Barchasi" }) },
              {
                id: "starred",
                label: t("walletPage.received.filterStarred", { defaultValue: "Kolleksiya" }),
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "min-w-0 flex-1 cursor-pointer rounded-[12px] px-3 py-2 text-[12px] font-bold transition-colors",
                filter === tab.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground",
              )}
            >
              {tab.label}
              {tab.id === "starred" ? ` · ${favorites.size}` : ""}
            </button>
          ))}
        </div>
      </div>

      <Link
        to="/wallet"
        search={{ section: "gift" }}
        className="flex items-center justify-center gap-2 rounded-[18px] border border-border/60 bg-card px-3.5 py-3.5 text-foreground transition-transform active:scale-[0.98]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground text-background">
          <Plus className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <span className="text-[13px] font-bold">
          {t("walletPage.received.sendCta", { defaultValue: "Sovg'a yuborish" })}
        </span>
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-[28px] bg-surface" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-border/80 px-5 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface">
            <Gift className="h-5 w-5 text-muted-foreground" />
          </span>
          <p className="mt-4 text-sm font-bold">
            {filter === "starred"
              ? t("walletPage.received.emptyStarred", {
                  defaultValue: "Kolleksiya hali bo'sh",
                })
              : t("walletPage.received.empty", {
                  defaultValue: "Hali sovg'a kelmagan",
                })}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {filter === "starred"
              ? t("walletPage.received.emptyStarredHint", {
                  defaultValue: "Kartadagi «Saqlash» orqali qo'shing.",
                })
              : t("walletPage.received.emptyHint", {
                  defaultValue: "Do'stlaringiz yuborgan sovg'alar shu yerda ko'rinadi.",
                })}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((gift) => (
            <ReceivedGiftCard
              key={gift.id}
              gift={gift}
              starred={favorites.has(gift.id)}
              onToggleStar={() => toggleFavorite(gift.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
