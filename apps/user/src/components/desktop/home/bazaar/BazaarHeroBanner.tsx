import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const BANNER_IMAGE =
  "https://images.pexels.com/photos/3992860/pexels-photo-3992860.jpeg?auto=compress&cs=tinysrgb&w=1200";

type Props = {
  className?: string;
};

export function BazaarHeroBanner({ className }: Props) {
  const { t } = useTranslation();

  return (
    <Link
      to="/today"
      className={cn(
        "group relative block aspect-[21/9] w-full max-h-[240px] overflow-hidden rounded-2xl border border-border",
        "shadow-[0_10px_36px_rgba(15,15,15,0.08)] transition-all hover:shadow-[0_14px_44px_rgba(15,15,15,0.14)]",
        className,
      )}
    >
      <img
        src={BANNER_IMAGE}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/25" />

      <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1.5 text-sm font-bold tracking-tight text-black shadow-sm">
        −30%
      </span>

      <div className="absolute inset-0 flex flex-col justify-between p-4 xl:p-5">
        <span className="w-fit rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground shadow-sm">
          {t("todayPage.heroBadge")}
        </span>

        <div>
          <h2 className="max-w-[20ch] text-lg font-bold leading-[1.15] tracking-tight text-white xl:text-[clamp(1.1rem,1.6vw,1.5rem)]">
            {t("todayPage.heroTitle")}
          </h2>
          <p className="mt-1.5 line-clamp-2 max-w-[32ch] text-xs font-medium leading-snug text-white/80 xl:text-sm">
            {t("todayPage.heroDesc")}
          </p>
          <span className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-foreground transition group-hover:bg-white/95 xl:mt-4 xl:px-4 xl:py-2.5 xl:text-sm">
            {t("todayPage.bookSelected")}
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
