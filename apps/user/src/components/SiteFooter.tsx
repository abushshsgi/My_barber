import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const { t } = useTranslation();
  const isHome = useRouterState({ select: (s) => s.location.pathname === "/" });
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "hidden shrink-0 border-t border-border/60 bg-background py-10 lg:block",
        isHome ? "px-[50px]" : "px-6 xl:px-10 2xl:px-12",
      )}
    >
      <div className="grid w-full gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-sm font-bold tracking-tight">mysaloon.uz</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("footer.tagline", { defaultValue: "Salon va sartarosh bron platformasi" })}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">© {year} mysaloon.uz</p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("nav.discovery", { defaultValue: "Kashf etish" })}
          </p>
          <nav className="mt-3 flex flex-col gap-2 text-sm font-semibold">
            <Link to="/explore" className="text-foreground hover:underline">
              {t("home.quick.trends")}
            </Link>
            <Link to="/map" className="text-foreground hover:underline">
              {t("nav.map")}
            </Link>
            <Link to="/today" className="text-foreground hover:underline">
              {t("home.quick.today")}
            </Link>
            <Link to="/offers" className="text-foreground hover:underline">
              {t("home.quick.offers")}
            </Link>
          </nav>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("nav.account", { defaultValue: "Hisob" })}
          </p>
          <nav className="mt-3 flex flex-col gap-2 text-sm font-semibold">
            <Link to="/profile" className="text-foreground hover:underline">
              {t("nav.profile")}
            </Link>
            <Link to="/bookings" className="text-foreground hover:underline">
              {t("nav.bookings")}
            </Link>
            <Link to="/wallet" className="text-foreground hover:underline">
              {t("nav.wallet")}
            </Link>
            <Link to="/favorites" className="text-foreground hover:underline">
              {t("profile.favorites")}
            </Link>
          </nav>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("footer.legal", { defaultValue: "Huquqiy" })}
          </p>
          <nav className="mt-3 flex flex-col gap-2 text-sm font-semibold">
            <Link to="/privacy" className="text-foreground hover:underline">
              {t("profile.privacy")}
            </Link>
            <Link to="/support" className="text-foreground hover:underline">
              {t("profile.support")}
            </Link>
            <Link to="/settings" className="text-muted-foreground hover:text-foreground hover:underline">
              {t("profile.settings")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
