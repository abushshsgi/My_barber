import { useTranslation } from "react-i18next";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { OffersPageContent } from "@/components/offers/OffersPageContent";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import { cn } from "@/lib/utils";

/** Desktop aksiyalar — to'liq kenglik, yangi bento layout. */
export function OffersDesktopPage() {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full min-w-0 pb-10", DESKTOP_BAZAAR_INSET)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <MysaloonLogo size="xs" className="opacity-70" />
          <h1 className="mt-2 text-[2.5rem] font-extrabold tracking-tight xl:text-[2.85rem]">
            {t("nav.offers", { defaultValue: "Aksiyalar" })}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
            {t("offersPage.desktopSubtitle", {
              defaultValue: "Promokodlar, kuponlar va yaqin orada qo'shiladigan salon aksiyalari.",
            })}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <OffersPageContent desktop />
      </div>
    </div>
  );
}
