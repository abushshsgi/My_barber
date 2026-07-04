import { motion } from "framer-motion";
import type { HomeData } from "@/components/home/useHomeData";
import { HomeUnifiedSearchResults } from "@/components/home/HomeBlocks";
import { HomeMobileTopBar } from "@/components/home/HomeMobileTopBar";
import {
  HomeMobileBookingsCta,
  HomeMobileCategories,
  HomeMobileFeatured,
  HomeMobileHero,
  HomeMobileMapTeaser,
  HomeMobileNearby,
  HomeMobileQuickActions,
  MotionSection,
  stagger,
} from "@/components/home/HomeMobileSections";

type Props = { data: HomeData };

/** Mobil bosh sahifa — salom, qidiruv, tez kirish va salon kashfiyoti. */
export function HomeMobilePage({ data }: Props) {
  const nearby = data.filtered.slice(0, 12);

  return (
    <div className="pb-3">
      <HomeMobileTopBar />

      {data.searchActive ? (
        <div className="px-4 pt-2">
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
          className="space-y-5 pt-1"
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
            <HomeMobileMapTeaser count={data.mapSalons.length} />
          </MotionSection>

          <MotionSection>
            <HomeMobileFeatured salons={data.filtered} />
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
