import { motion } from "framer-motion";
import type { HomeData } from "@/components/home/useHomeData";
import { HomeUnifiedSearchResults, HomeTrendingStrip } from "@/components/home/HomeBlocks";
import {
  HomeMobileBookingsCta,
  HomeMobileCategories,
  HomeMobileFeatured,
  HomeMobileMixedDiscovery,
  HomeMobileNearby,
  MotionSection,
  stagger,
} from "@/components/home/HomeMobileSections";

type Props = { data: HomeData };

/** Mobil bosh sahifa — katta snap kartochkalar, yengil scroll. */
export function HomeMobilePage({ data }: Props) {
  const nearby = data.filtered.slice(0, 12);

  return (
    <div className="min-w-0 pt-[max(env(safe-area-inset-top),0.5rem)]">
      {data.searchActive ? (
        <div className="pt-1">
          <HomeUnifiedSearchResults
            searchActive={data.searchActive}
            salons={data.filtered}
            barbers={data.filteredBarbers}
            loading={data.loading}
          />
        </div>
      ) : (
        <motion.div
          className="space-y-6 pb-2 pt-2"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <MotionSection>
            <HomeMobileFeatured salons={data.filtered} />
          </MotionSection>

          <MotionSection>
            <HomeMobileMixedDiscovery items={data.mixedDiscovery} />
          </MotionSection>

          <MotionSection>
            <HomeTrendingStrip trending={data.exploreRow} compact />
          </MotionSection>

          <MotionSection>
            <HomeMobileCategories />
          </MotionSection>

          <MotionSection>
            <HomeMobileNearby salons={nearby} />
          </MotionSection>

          <MotionSection>
            <HomeMobileBookingsCta />
          </MotionSection>
        </motion.div>
      )}
    </div>
  );
}
