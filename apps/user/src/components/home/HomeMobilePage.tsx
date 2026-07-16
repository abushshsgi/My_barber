import { motion } from "framer-motion";
import type { HomeData } from "@/components/home/useHomeData";
import { HomeUnifiedSearchResults } from "@/components/home/HomeBlocks";
import {
  HomeMobileCategories,
  HomeMobileFeatured,
  HomeMobileNearby,
  HomeMobileWordmark,
  MotionSection,
  stagger,
} from "@/components/home/HomeMobileSections";

type Props = { data: HomeData };

/** Mobil home — ixcham, professional: brand + kategoriyalar + top + feed. */
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
          className="space-y-8 pb-4"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <MotionSection>
            <HomeMobileWordmark />
          </MotionSection>

          <MotionSection>
            <HomeMobileCategories />
          </MotionSection>

          <MotionSection>
            <HomeMobileFeatured salons={data.filtered} />
          </MotionSection>

          <MotionSection>
            <HomeMobileNearby salons={nearby} />
          </MotionSection>
        </motion.div>
      )}
    </div>
  );
}
