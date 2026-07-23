import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gift, Inbox, Sparkles, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type NewsItem = {
  id: string;
  icon: typeof Wallet;
  titleKey: string;
  defaultTitle: string;
  bodyKey: string;
  defaultBody: string;
  to: "/wallet" | "/wallet/top-up" | "/wallet/gifts" | "/offers";
  search?: { section: "gift" | "loyalty" | "subscriptions"; plan?: string };
  accent: string;
};

const NEWS_ITEMS: NewsItem[] = [
  {
    id: "received",
    icon: Inbox,
    titleKey: "walletPage.news.receivedTitle",
    defaultTitle: "Kelgan sovg'alar",
    bodyKey: "walletPage.news.receivedBody",
    defaultBody: "Kimdan kelganini ko'ring va kolleksiyaga qo'shing.",
    to: "/wallet/gifts",
    accent: "bg-rose-500/12 text-rose-800",
  },
  {
    id: "gift",
    icon: Gift,
    titleKey: "walletPage.news.giftTitle",
    defaultTitle: "Sovg'a yuboring",
    bodyKey: "walletPage.news.giftBody",
    defaultBody: "Do'stingizga balans yuboring — bir zumda.",
    to: "/wallet",
    search: { section: "gift" },
    accent: "bg-violet-500/12 text-violet-800",
  },
  {
    id: "topup",
    icon: Wallet,
    titleKey: "walletPage.news.topUpTitle",
    defaultTitle: "Tez to'ldirish",
    bodyKey: "walletPage.news.topUpBody",
    defaultBody: "Click, Payme yoki kartadan balansni to'ldiring.",
    to: "/wallet/top-up",
    accent: "bg-emerald-500/12 text-emerald-800",
  },
  {
    id: "pro",
    icon: Sparkles,
    titleKey: "walletPage.news.proTitle",
    defaultTitle: "Pro imtiyozlar",
    bodyKey: "walletPage.news.proBody",
    defaultBody: "Obuna bilan AI stil va bonuslar ochiladi.",
    to: "/wallet",
    search: { section: "subscriptions", plan: "pro" },
    accent: "bg-sky-500/12 text-sky-800",
  },
];

type Props = {
  className?: string;
};

/** Mobil hamyon — yangiliklar / tip karusel. */
export function WalletNewsSection({ className }: Props) {
  const { t } = useTranslation();

  return (
    <section className={cn(className)}>
      <div className="mb-3 flex items-end justify-between gap-3 px-5">
        <h2 className="text-sm font-bold">{t("walletPage.news.title", { defaultValue: "Yangiliklar" })}</h2>
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
          return (
            <Link
              key={item.id}
              to={item.to}
              search={item.search}
              className="group relative flex w-[72%] max-w-[260px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[22px] border border-border/70 bg-card p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-transform active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", item.accent)}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-[15px] font-bold leading-snug tracking-tight">
                  {t(item.titleKey, { defaultValue: item.defaultTitle })}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
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
