import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  CalendarPlus,
  Bookmark,
  Music2,
  Star,
  Volume2,
  VolumeX,
  ChevronLeft,
  Play,
  Pause,
} from "lucide-react";
import { salons, shortPrice } from "@/lib/mock-data";
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
  comments: number;
  views: number;
  duration: string;
  bgHue: number;
  badge: string;
  category: string;
  music: string;
  avatarSeed: string;
}

const REELS: Reel[] = [
  {
    id: "r1",
    title: "Klassik fade + dizayn",
    salonId: salons[0].id,
    salonName: salons[0].name,
    barber: "Otabek",
    likes: 1240,
    comments: 42,
    views: 18400,
    duration: "0:24",
    bgHue: 240,
    badge: "Trend #1",
    category: "Barber",
    music: "Lo-fi Beats · Chill Vibes",
    avatarSeed: "otabek",
  },
  {
    id: "r2",
    title: "Balayage — kuzgi ohang",
    salonId: salons[1]?.id ?? salons[0].id,
    salonName: salons[1]?.name ?? salons[0].name,
    barber: "Madina",
    likes: 2310,
    comments: 87,
    views: 31200,
    duration: "0:31",
    bgHue: 18,
    badge: "Yangi",
    category: "Go'zallik",
    music: "Acoustic Glow · Studio M",
    avatarSeed: "madina",
  },
  {
    id: "r3",
    title: "Soqol kontur + skin fade",
    salonId: salons[2]?.id ?? salons[0].id,
    salonName: salons[2]?.name ?? salons[0].name,
    barber: "Sardor",
    likes: 845,
    comments: 19,
    views: 9800,
    duration: "0:18",
    bgHue: 140,
    badge: "Top",
    category: "Barber",
    music: "Urban Cut · Beat Lab",
    avatarSeed: "sardor",
  },
  {
    id: "r4",
    title: "French nails — minimal",
    salonId: salons[3]?.id ?? salons[0].id,
    salonName: salons[3]?.name ?? salons[0].name,
    barber: "Nilufar",
    likes: 1980,
    comments: 64,
    views: 22100,
    duration: "0:27",
    bgHue: 320,
    badge: "Viral",
    category: "Manikyur",
    music: "Soft Pop · Nail House",
    avatarSeed: "nilufar",
  },
];

const BADGE_STYLES: Record<string, string> = {
  "Trend #1": "bg-amber-400/95 text-amber-950",
  Yangi: "bg-emerald-400/95 text-emerald-950",
  Top: "bg-sky-400/95 text-sky-950",
  Viral: "bg-fuchsia-400/95 text-fuchsia-950",
};

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function salonFor(id: string) {
  return salons.find((s) => s.id === id) ?? salons[0];
}

function ReelBackground({ hue }: { hue: number }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(155deg, oklch(0.58 0.2 ${hue}), oklch(0.28 0.12 ${(hue + 55) % 360}) 55%, oklch(0.14 0.06 ${(hue + 120) % 360}))`,
        }}
      />
      <motion.div
        className="absolute -left-[20%] top-[10%] h-[55%] w-[55%] rounded-full opacity-50 blur-3xl"
        style={{ background: `oklch(0.72 0.22 ${hue})` }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[15%] bottom-[20%] h-[45%] w-[45%] rounded-full opacity-40 blur-3xl"
        style={{ background: `oklch(0.65 0.18 ${(hue + 90) % 360})` }}
        animate={{ x: [0, -25, 0], y: [0, 15, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.45)_100%)]" />
    </>
  );
}

function ActionButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1.5">
      <motion.div
        whileTap={{ scale: 0.82 }}
        className={cn(
          "grid h-[52px] w-[52px] place-items-center rounded-full border border-white/10 shadow-lg backdrop-blur-xl transition-colors",
          active ? "bg-white/25" : "bg-black/25 group-hover:bg-white/15",
        )}
      >
        {children}
      </motion.div>
      <span className="text-[10px] font-bold tracking-wide text-white drop-shadow-sm">{label}</span>
    </button>
  );
}

function ReelsPage() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [-120, 0, 120], [0.55, 1, 0.55]);

  const reel = REELS[idx];
  const salon = salonFor(reel.salonId);
  const isLiked = !!liked[reel.id];

  const next = useCallback(() => setIdx((i) => (i + 1) % REELS.length), []);
  const prev = useCallback(() => setIdx((i) => (i - 1 + REELS.length) % REELS.length), []);

  useEffect(() => {
    setProgress(0);
    setPlaying(true);
    if (reduced) return;
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 0.55));
    }, 80);
    return () => window.clearInterval(id);
  }, [idx, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") next();
      if (e.key === "ArrowUp") prev();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const toggleLike = useCallback(() => {
    setLiked((l) => ({ ...l, [reel.id]: !l[reel.id] }));
  }, [reel.id]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!isLiked) setLiked((l) => ({ ...l, [reel.id]: true }));
      setBurst(true);
      window.setTimeout(() => setBurst(false), 700);
    } else {
      setPlaying((p) => !p);
    }
    lastTap.current = now;
  };

  const onDragEnd = (_: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y < -70) next();
    else if (info.offset.y > 70) prev();
    animate(dragY, 0, { type: "spring", stiffness: 400, damping: 32 });
  };

  return (
    <div className="relative mx-auto h-[calc(100dvh-68px-env(safe-area-inset-bottom))] max-w-[480px] overflow-hidden bg-black lg:h-[calc(100dvh-24px)] lg:rounded-[28px] lg:shadow-2xl lg:ring-1 lg:ring-white/10">
      <AnimatePresence mode="wait">
        <motion.div
          key={reel.id}
          style={{ opacity: dragOpacity, y: dragY }}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.35}
          onDragEnd={onDragEnd}
          onClick={handleTap}
          className="absolute inset-0 cursor-pointer touch-pan-y"
        >
          <ReelBackground hue={reel.bgHue} />

          <AnimatePresence>
            {!playing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="pointer-events-none absolute inset-0 grid place-items-center"
              >
                <div className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-black/35 backdrop-blur-md">
                  <Play className="ml-1 h-9 w-9 fill-white text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {burst && (
              <motion.div
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.35, 1.6] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65 }}
                className="pointer-events-none absolute inset-0 grid place-items-center"
              >
                <Heart className="h-28 w-28 fill-red-500 text-red-500 drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Top chrome */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
      >
        <div className="pointer-events-auto flex items-center gap-2 px-4">
          <Link
            to="/"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/30 backdrop-blur-md active:scale-95"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </Link>
          <div className="flex flex-1 gap-1">
            {REELS.map((r, i) => (
              <div key={r.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={false}
                  animate={{
                    width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
                  }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>
            ))}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              BADGE_STYLES[reel.badge] ?? "bg-white/90 text-black",
            )}
          >
            {reel.badge}
          </span>
        </div>

        <div className="pointer-events-auto mt-3 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white drop-shadow">Reels</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur-sm">
              {reel.duration}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/60">
              {formatCount(reel.views)} ko'rish
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMuted((m) => !m);
              }}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/30 backdrop-blur-md active:scale-95"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-white" />
              ) : (
                <Volume2 className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div
        className="absolute bottom-36 right-3 z-20 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          to="/salon/$id"
          params={{ id: reel.salonId }}
          className="relative mb-1"
        >
          <div
            className="h-12 w-12 rounded-full border-2 border-white p-0.5 shadow-lg"
            style={{
              background: `linear-gradient(135deg, oklch(0.75 0.12 ${reel.bgHue}), oklch(0.45 0.08 ${(reel.bgHue + 40) % 360}))`,
            }}
          />
          <span className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-emerald-400 ring-2 ring-black" />
        </Link>

        <ActionButton
          label={formatCount(reel.likes + (isLiked ? 1 : 0))}
          onClick={toggleLike}
          active={isLiked}
        >
          <motion.div animate={isLiked ? { scale: [1, 1.25, 1] } : { scale: 1 }}>
            <Heart
              className={cn(
                "h-6 w-6 transition-colors",
                isLiked ? "fill-red-500 text-red-500" : "text-white",
              )}
            />
          </motion.div>
        </ActionButton>

        <ActionButton label={String(reel.comments)}>
          <MessageCircle className="h-6 w-6 text-white" />
        </ActionButton>

        <ActionButton
          label={saved[reel.id] ? "Saqlangan" : "Saqlash"}
          onClick={() => setSaved((s) => ({ ...s, [reel.id]: !s[reel.id] }))}
          active={!!saved[reel.id]}
        >
          <Bookmark
            className={cn(
              "h-6 w-6",
              saved[reel.id] ? "fill-white text-white" : "text-white",
            )}
          />
        </ActionButton>

        <ActionButton label="Yuborish">
          <Share2 className="h-6 w-6 text-white" />
        </ActionButton>
      </div>

      {/* Bottom info */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
      >
        <div className="pointer-events-auto space-y-3 px-4 pb-4">
          <div className="flex items-center gap-2 overflow-hidden rounded-full bg-black/30 py-1.5 pl-2 pr-3 backdrop-blur-md">
            <Music2 className="h-3.5 w-3.5 shrink-0 text-white" />
            <motion.p
              className="whitespace-nowrap text-[11px] font-semibold text-white/90"
              animate={playing && !reduced ? { x: ["0%", "-50%"] } : { x: 0 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
              {reel.music} · {reel.music}
            </motion.p>
          </div>

          <div className="flex items-start gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-md"
              style={{
                background: `linear-gradient(145deg, oklch(0.7 0.14 ${reel.bgHue}), oklch(0.42 0.1 ${(reel.bgHue + 30) % 360}))`,
              }}
            >
              {reel.barber[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/salon/$id"
                  params={{ id: reel.salonId }}
                  className="text-sm font-bold text-white hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  @{reel.barber}
                </Link>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80">
                  {reel.category}
                </span>
              </div>
              <Link
                to="/salon/$id"
                params={{ id: reel.salonId }}
                className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-white/75"
                onClick={(e) => e.stopPropagation()}
              >
                {reel.salonName}
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  {salon.rating.toFixed(1)}
                </span>
              </Link>
            </div>
          </div>

          <h2 className="text-[17px] font-bold leading-snug text-white drop-shadow-sm">
            {reel.title}
          </h2>

          <p className="text-[11px] font-medium text-white/55">
            {shortPrice(salon.priceFrom)} dan · {salon.distanceKm} km
          </p>

          <div className="flex gap-2 pt-1">
            <Link
              to="/booking/$salonId"
              params={{ salonId: reel.salonId }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-bold text-black shadow-lg active:scale-[0.98]"
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarPlus className="h-4 w-4" />
              Bron qilish
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPlaying((p) => !p);
              }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md active:scale-95"
              aria-label={playing ? "Pauza" : "Ijro etish"}
            >
              {playing ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Swipe hint */}
      <div className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+148px)] left-1/2 z-10 -translate-x-1/2">
        <motion.span
          animate={reduced ? undefined : { y: [0, -6, 0], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40"
        >
          Yuqoriga suring
        </motion.span>
      </div>
    </div>
  );
}
