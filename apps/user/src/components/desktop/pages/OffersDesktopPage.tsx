import { useTranslation } from "react-i18next";
import { DESKTOP_ACCOUNT_BG } from "@/components/desktop/ui/desktop-glass";
import { OffersPageContent } from "@/components/offers/OffersPageContent";
import { cn } from "@/lib/utils";

export function OffersDesktopPage() {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full", DESKTOP_ACCOUNT_BG)}>
      <div className="lg:pl-8 xl:pl-14">
        <div className="lg:max-w-4xl lg:pb-12">
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground xl:text-[36px]">
            {t("nav.offers", { defaultValue: "Aksiyalar" })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("offersPage.desktopSubtitle", {
              defaultValue: "Promokodlar, kuponlar va yaqin orada qo'shiladigan salon aksiyalari.",
            })}
          </p>
          <div className="mt-7">
            <OffersPageContent />
          </div>
        </div>
      </div>
    </div>
  );
}
