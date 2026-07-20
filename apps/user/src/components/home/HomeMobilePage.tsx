import { motion } from "framer-motion";
import type { HomeData } from "@/components/home/useHomeData";
import { HomeUnifiedSearchResults } from "@/components/home/HomeBlocks";
import { HomeMobileBanner } from "@/components/home/HomeMobileBanner";
import { HomeSubscriptionMarketing } from "@/components/home/HomeSubscriptionMarketing";
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

/** Mobil home — brand + banner + obuna marketing + kategoriyalar + top salon/usta + feed. */
export function HomeMobilePage({ data }: Props) {
  const nearby = data.filtered.slice(0, 10);

  return (
    <div className="min-w-0 pt-[max(env(safe-area-inset-top),0.75rem)]">
      {data.searchActive ? (
        <HomeUnifiedSearchResults
          searchActive={data.searchActive}
          salons={data.filtered}
          barbers={data.filteredBarbers}
          loading={data.loading}
        />
      ) : (
        <motion.div
          className="space-y-5 pb-4"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <MotionSection>
            <HomeMobileWordmark />
          </MotionSection>

          <MotionSection>
            <HomeMobileBanner />
          </MotionSection>

          <MotionSection>
            <HomeSubscriptionMarketing />
          </MotionSection>

          <MotionSection>
            <HomeMobileCategories />
          </MotionSection>

          <MotionSection>
            <HomeMobileFeatured salons={data.filtered} />
          </MotionSection>

          <MotionSection>
            <HomeMobileFeaturedBarbers barbers={data.browseBarbers} />
          </MotionSection>

          <MotionSection>
            <HomeMobileNearby salons={nearby} />
          </MotionSection>
        </motion.div>
      )}
    </div>
  );
}
