import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="hidden shrink-0 border-t border-border/60 bg-background px-6 py-8 lg:block">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold tracking-tight">mysaloon.uz</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("footer.tagline", { defaultValue: "Salon va sartarosh bron platformasi" })}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">© {year} mysaloon.uz</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
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
    </footer>
  );
}
