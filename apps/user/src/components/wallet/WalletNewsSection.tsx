import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarCheck, Sparkles, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type NewsItem = {
  id: string;
  icon: typeof Wallet;
  titleKey: string;
  defaultTitle: string;
  bodyKey: string;
  defaultBody: string;
  to: "/wallet" | "/wallet/top-up" | "/map" | "/offers";
  search?: { section: "gift" | "loyalty" | "subscriptions"; plan?: string };
  /** Monochrome accents only — no rainbow chips */
  tone: "dark" | "soft";
};

/** Sovg‘a / Kelgan dublikatlari olib tashlangan — yangi foydali kartochkalar. */
const NEWS_ITEMS: NewsItem[] = [
  {
    id: "book",
    icon: CalendarCheck,
    titleKey: "walletPage.news.bookTitle",
    defaultTitle: "Balans bilan bron",
    bodyKey: "walletPage.news.bookBody",
    defaultBody: "Yaqin atrofdagi ustani tanlang — hamyondan to'lang.",
    to: "/map",
    tone: "dark",
  },
  {
    id: "pro",
    icon: Sparkles,
    titleKey: "walletPage.news.proTitle",
    defaultTitle: "Pro Imtiyozlar",
    bodyKey: "walletPage.news.proBody",
    defaultBody: "AI stil va bonuslar — balansdan bir zumda.",
    to: "/wallet",
    search: { section: "subscriptions", plan: "pro" },
    tone: "soft",
  },
  {
    id: "topup",
    icon: Wallet,
    titleKey: "walletPage.news.topUpTitle",
    defaultTitle: "Tez to'ldirish",
    bodyKey: "walletPage.news.topUpBody",
    defaultBody: "Click, Payme yoki kartadan balansni to'ldiring.",
    to: "/wallet/top-up",
    tone: "soft",
  },
];

type Props = {
  className?: string;
};

/** Mobil hamyon — ixcham promo kartochkalar (2 ta ekranga sigadi). */
export function WalletNewsSection({ className }: Props) {
  const { t } = useTranslation();

  return (
    <section className={cn(className)}>
      <div className="mb-2.5 flex items-end justify-between gap-3 px-5">
        <h2 className="text-sm font-bold">
          {t("walletPage.news.title", { defaultValue: "Yangiliklar" })}
        </h2>
        <Link
          to="/offers"
          className="text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("common.viewAll", { defaultValue: "Barchasi" })}
        </Link>
      </div>

      <div className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-5 pb-1 [-webkit-overflow-scrolling:touch]">
        {NEWS_ITEMS.map((item) => {
          const Icon = item.icon;
          const dark = item.tone === "dark";
          return (
            <Link
              key={item.id}
              to={item.to}
              search={item.search}
              className={cn(
                "group relative flex w-[min(156px,42vw)] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[20px] p-3.5 transition-transform active:scale-[0.98]",
                "min-h-[124px]",
                dark
                  ? "bg-foreground text-background"
                  : "border border-border/60 bg-card text-foreground shadow-[0_1px_0_rgba(0,0,0,0.03)]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl",
                    dark ? "bg-background/15" : "bg-surface",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full transition-colors",
                    dark
                      ? "bg-background/12 text-background"
                      : "bg-surface text-muted-foreground group-hover:bg-foreground group-hover:text-background",
                  )}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-[13px] font-bold leading-snug tracking-tight">
                  {t(item.titleKey, { defaultValue: item.defaultTitle })}
                </p>
                <p
                  className={cn(
                    "mt-1 line-clamp-2 text-[11px] leading-snug",
                    dark ? "text-background/65" : "text-muted-foreground",
                  )}
                >
                  {t(item.bodyKey, { defaultValue: item.defaultBody })}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
