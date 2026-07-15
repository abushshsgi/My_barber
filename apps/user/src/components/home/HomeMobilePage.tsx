import { motion } from "framer-motion";
import type { HomeData } from "@/components/home/useHomeData";
import { HomeUnifiedSearchResults, HomeTrendingStrip } from "@/components/home/HomeBlocks";
import { HomeMobileTopBar } from "@/components/home/HomeMobileTopBar";
import {
  HomeMobileBookingsCta,
  HomeMobileCategories,
  HomeMobileFeatured,
  HomeMobileHero,
  HomeMobileMixedDiscovery,
  HomeMobileNearby,
  HomeMobileQuickActions,
  MotionSection,
  stagger,
} from "@/components/home/HomeMobileSections";

type Props = { data: HomeData };

/** Mobil bosh sahifa — yengil hero, ixcham kashfiyot. */
export function HomeMobilePage({ data }: Props) {
  const nearby = data.filtered.slice(0, 12);

  return (
    <div className="min-w-0 overflow-x-clip">
      <HomeMobileTopBar />

      {data.searchActive ? (
        <div className="pt-1">
          <HomeMobileHero {...data} />
          <HomeUnifiedSearchResults
            searchActive={data.searchActive}
            salons={data.filtered}
            barbers={data.filteredBarbers}
            loading={data.loading}
          />
        </div>
      ) : (
        <motion.div
          className="space-y-4 pb-2 pt-1"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <MotionSection>
            <HomeMobileHero {...data} />
          </MotionSection>

          <MotionSection>
            <HomeMobileQuickActions />
          </MotionSection>

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
