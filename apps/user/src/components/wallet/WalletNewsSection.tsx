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
    defaultTitle: "Pro obuna",
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

/** Mobil hamyon — katta promo kartochkalar. */
export function WalletNewsSection({ className }: Props) {
  const { t } = useTranslation();

  return (
    <section className={cn(className)}>
      <div className="mb-3 flex items-end justify-between gap-3 px-5">
        <h2 className="text-sm font-bold">{t("walletPage.news.title", { defaultValue: "Takliflar" })}</h2>
        <Link
          to="/offers"
          className="text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("common.viewAll", { defaultValue: "Barchasi" })}
        </Link>
      </div>

      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 [-webkit-overflow-scrolling:touch]">
        {NEWS_ITEMS.map((item) => {
          const Icon = item.icon;
          const dark = item.tone === "dark";
          return (
            <Link
              key={item.id}
              to={item.to}
              search={item.search}
              className={cn(
                "group relative flex min-h-[168px] w-[86%] max-w-[340px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[26px] p-5 transition-transform active:scale-[0.98]",
                dark
                  ? "bg-foreground text-background"
                  : "border border-border/70 bg-card text-foreground shadow-[0_1px_0_rgba(0,0,0,0.03)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-2xl",
                    dark ? "bg-background/15" : "bg-surface",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full transition-colors",
                    dark
                      ? "bg-background/15 text-background"
                      : "bg-surface text-muted-foreground group-hover:bg-foreground group-hover:text-background",
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                </span>
              </div>
              <div className="mt-5">
                <p className="text-[17px] font-bold leading-snug tracking-tight">
                  {t(item.titleKey, { defaultValue: item.defaultTitle })}
                </p>
                <p
                  className={cn(
                    "mt-2 text-[13px] leading-relaxed",
                    dark ? "text-background/70" : "text-muted-foreground",
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
