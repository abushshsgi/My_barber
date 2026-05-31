import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, CalendarPlus, ChevronUp, ChevronDown, Play } from "lucide-react";
import { salons } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Reels — mysaloon.uz" },
      { name: "description", content: "Salonlardan trend uslublar video lentasi." },
    ],
  }),
  component: ReelsPage,
});

interface Reel {
  id: string;
  title: string;
  salonId: string;
  salonName: string;
  barber: string;
  likes: number;
  bgHue: number;
  badge: string;
}

const REELS: Reel[] = [
  { id: "r1", title: "Klassik fade + dizayn", salonId: salons[0].id, salonName: salons[0].name, barber: "Otabek", likes: 1240, bgHue: 240, badge: "Trend #1" },
  { id: "r2", title: "Balayage — kuzgi ohang", salonId: salons[1]?.id ?? salons[0].id, salonName: salons[1]?.name ?? salons[0].name, barber: "Madina", likes: 2310, bgHue: 18, badge: "Yangi" },
  { id: "r3", title: "Soqol kontur + skin fade", salonId: salons[2]?.id ?? salons[0].id, salonName: salons[2]?.name ?? salons[0].name, barber: "Sardor", likes: 845, bgHue: 140, badge: "Top" },
  { id: "r4", title: "French nails — minimal", salonId: salons[3]?.id ?? salons[0].id, salonName: salons[3]?.name ?? salons[0].name, barber: "Nilufar", likes: 1980, bgHue: 320, badge: "Viral" },
];

function ReelsPage() {
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const reel = REELS[idx];

  const next = () => setIdx((i) => (i + 1) % REELS.length);
  const prev = () => setIdx((i) => (i - 1 + REELS.length) % REELS.length);

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={reel.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, oklch(0.55 0.18 ${reel.bgHue}), oklch(0.22 0.10 ${(reel.bgHue + 60) % 360}))`,
          }}
        >
          {/* Pseudo play indicator */}
          <div className="absolute inset-0 grid place-items-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.85, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="grid h-24 w-24 place-items-center rounded-full bg-white/15 backdrop-blur-md"
            >
              <Play className="h-10 w-10 fill-white text-white" />
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Top: counter */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md">
          Reels · {idx + 1}/{REELS.length}
        </span>
        <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-black">
          {reel.badge}
        </span>
      </div>

      {/* Right rail actions */}
      <div className="absolute bottom-32 right-3 z-20 flex flex-col items-center gap-5">
        <button
          onClick={() => setLiked((l) => ({ ...l, [reel.id]: !l[reel.id] }))}
          className="flex flex-col items-center gap-1"
        >
          <motion.div
            whileTap={{ scale: 0.8 }}
            animate={{ scale: liked[reel.id] ? [1, 1.3, 1] : 1 }}
            className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur-md"
          >
            <Heart
              className={cn("h-6 w-6", liked[reel.id] ? "fill-red-500 text-red-500" : "text-white")}
            />
          </motion.div>
          <span className="text-[10px] font-bold text-white">
            {reel.likes + (liked[reel.id] ? 1 : 0)}
          </span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur-md">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white">42</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur-md">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white">Yub</span>
        </button>
      </div>

      {/* Bottom info + CTA */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 p-5 pr-20"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
          @{reel.barber} · {reel.salonName}
        </p>
        <h2 className="mt-1 text-2xl font-bold leading-tight text-white">
          {reel.title}
        </h2>
        <Link
          to="/booking/$salonId"
          params={{ salonId: reel.salonId }}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black active:scale-95"
        >
          <CalendarPlus className="h-4 w-4" />
          Hoziroq bron qilish
        </Link>
      </div>

      {/* Prev/Next */}
      <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
        <button
          onClick={prev}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur-md active:scale-95"
        >
          <ChevronUp className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={next}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur-md active:scale-95"
        >
          <ChevronDown className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
}
