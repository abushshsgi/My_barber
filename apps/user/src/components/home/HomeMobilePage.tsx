import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { HomeData } from "@/components/home/useHomeData";
import { HomeUnifiedSearchResults } from "@/components/home/HomeBlocks";
import { HomeMobileBanner } from "@/components/home/HomeMobileBanner";
import { SubscriptionWinBackBanner } from "@/components/subscriptions/SubscriptionWinBackBanner";
import {
  HomeMobileCategories,
  HomeMobileFeatured,
  HomeMobileFeaturedBarbers,
  HomeMobileNearby,
  HomeMobileWordmark,
  MotionSection,
  stagger,
} from "@/components/home/HomeMobileSections";

type Props = { data: HomeData };

/** Mobil home — brand + banner + kategoriyalar + top salon/usta + feed. */
export function HomeMobilePage({ data }: Props) {
  const { t } = useTranslation();
  const nearby = data.filtered.slice(0, 10);
  const listTitle = data.catalog.isNationwide
    ? t("home.catalogScope.allSalons", { defaultValue: "Barcha salonlar" })
    : t("home.nearby");

  return (
    <div className="min-w-0 bg-white pt-[max(env(safe-area-inset-top),0.75rem)]">
      {data.searchActive ? (
        <HomeUnifiedSearchResults
          searchActive={data.searchActive}
          salons={data.filtered}
          barbers={data.filteredBarbers}
          loading={data.loading}
        />
      ) : (
        <motion.div
          className="space-y-5 bg-white pb-4"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <MotionSection>
            <HomeMobileWordmark
              catalogScope={data.catalog.scope}
              onCatalogScopeChange={data.catalog.setScope}
            />
          </MotionSection>

          <MotionSection>
            <HomeMobileBanner />
          </MotionSection>

          <MotionSection>
            <SubscriptionWinBackBanner />
          </MotionSection>

          <MotionSection>
            <HomeMobileCategories />
          </MotionSection>

          <MotionSection>
            <HomeMobileFeatured salons={data.filtered} />
          </MotionSection>

          <MotionSection>
            <HomeMobileFeaturedBarbers barbers={data.browseBarbers} salons={data.filtered} />
          </MotionSection>

          <MotionSection>
            <HomeMobileNearby salons={nearby} title={listTitle} />
          </MotionSection>
        </motion.div>
      )}
    </div>
  );
}
