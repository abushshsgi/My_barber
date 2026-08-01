import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Camera,
  ChevronLeft,
  Clock3,
  Droplets,
  Images,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MorphSoftPaywall } from "@/components/ai-style/MorphSoftPaywall";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { getHairstyleDisplayUrl } from "@/lib/hairstyles/catalog";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  refreshMorphAiGenerationsCache,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";
import { navigateBack } from "@/lib/mobile-back";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  audience: Audience;
  onStartNew: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  ensureMorphAccess?: () => Promise<boolean>;
  ensureMorphStudio?: () => Promise<boolean>;
};

type SampleCard = {
  id: string;
  title: string;
  image: string;
};

function prettyLookTitle(title: string) {
  const raw = title.trim();
  if (!raw) return "Try-on";
  if (!/[-_]/.test(raw) && !/^(men|women)\b/i.test(raw)) return raw;
  return raw
    .replace(/^(men|women)[-_]/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function MarqueeRow({
  items,
  direction,
  duration = 42,
  paused,
}: {
  items: SampleCard[];
  direction: "left" | "right";
  duration?: number;
  paused: boolean;
}) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <div className="relative overflow-hidden">
      <div
        className={cn(
          "flex w-max gap-2.5 will-change-transform",
          direction === "left" ? "morf-marquee-left" : "morf-marquee-right",
          paused && "morf-marquee-paused",
        )}
        style={{ ["--morf-marquee-duration" as string]: `${duration}s` }}
      >
        {loop.map((entry, i) => (
          <Link
            key={`${entry.id}-${i}`}
            to="/explore/$styleId"
            params={{ styleId: entry.id }}
            className="group relative h-[8.75rem] w-[6.5rem] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] md:h-40 md:w-[7.5rem]"
          >
            <img
              src={entry.image}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-active:scale-[1.04]"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
            <p className="absolute inset-x-0 bottom-0 truncate px-2 pb-2 text-[10px] font-semibold text-white/90">
              {entry.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LimitBadge({ remaining, limit }: { remaining: number; limit: number }) {
  const low = remaining <= Math.max(1, Math.floor(limit * 0.2));
  return (
    <Link
      to="/wallet"
      search={{ section: "subscriptions", plan: "plus", returnTo: "/ai-style" }}
      className={cn(
        "absolute -right-1 -top-1 grid min-w-7 cursor-pointer place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ring-2 ring-[#050505]",
        low ? "bg-[#CA8A04] text-black" : "bg-white text-black",
      )}
      aria-label={`${remaining}/${limit}`}
    >
      {remaining}
    </Link>
  );
}

export function MorphAiHome({
  audience,
  onStartNew,
  onOpenCamera,
  onOpenGallery,
  ensureMorphAccess,
  ensureMorphStudio,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const meQ = useSubscriptionMe();
  const morphLocked = Boolean(meQ.data && !meQ.data.has_active);
  const usage = meQ.data?.has_active ? meQ.data.usage : null;
  const remaining = usage?.morph_ai_remaining;
  const limit = usage?.morph_ai_limit;
  const { personaId } = useExplorePersona();
  const { data: styles = [], isLoading } = useHairstyles(
    audience === "women" ? "women" : "men",
    personaId,
    { ignoreAgeGroup: true },
  );
  const [generations, setGenerations] = useState<MorphAiGeneration[]>(() => loadMorphAiGenerations());

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await refreshMorphAiGenerationsCache();
      if (!cancelled) setGenerations(list);
    };
    void refresh();
    const onUpdate = () => setGenerations(loadMorphAiGenerations());
    window.addEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onUpdate);
    };
  }, []);

  const sampleCards = useMemo<SampleCard[]>(
    () =>
      styles.slice(0, 12).map((entry) => ({
        id: entry.id,
        title: entry.titleUz || entry.title,
        image: getHairstyleDisplayUrl(entry),
      })),
    [styles],
  );

  const rowA = useMemo(() => sampleCards.filter((_, i) => i % 2 === 0), [sampleCards]);
  const rowB = useMemo(() => sampleCards.filter((_, i) => i % 2 === 1), [sampleCards]);

  const myLooks = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; title: string; image: string; styleId: string }[] = [];
    for (const g of generations) {
      if (!g.previewImage) continue;
      const fingerprint = `${g.styleId}::${g.previewImage.slice(0, 96)}`;
      if (seen.has(fingerprint) || seen.has(g.id)) continue;
      seen.add(fingerprint);
      seen.add(g.id);
      out.push({
        id: g.id,
        title: prettyLookTitle(g.title),
        image: g.previewImage,
        styleId: g.styleId,
      });
      if (out.length >= 8) break;
    }
    return out;
  }, [generations]);

  const openHistory = () => {
    void navigate({ to: "/ai-style/history" });
  };

  const openRestyle = (styleId: string) => {
    if (!styleId) {
      openHistory();
      return;
    }
    void navigate({ to: "/explore/$styleId/try", params: { styleId } });
  };

  const openStudio = () => {
    void (async () => {
      const gate = ensureMorphStudio ?? ensureMorphAccess;
      if (gate && !(await gate())) return;
      void navigate({ to: "/ai-style/studio" });
    })();
  };

  const openCare = () => {
    void (async () => {
      if (ensureMorphAccess && !(await ensureMorphAccess())) return;
      void navigate({ to: "/ai-style/care" });
    })();
  };

  const toolActions = [
    {
      key: "camera",
      label: t("aiStylePage.openCamera"),
      icon: Camera,
      onClick: onOpenCamera,
    },
    {
      key: "gallery",
      label: t("aiStylePage.pickFromGallery"),
      icon: Images,
      onClick: onOpenGallery,
    },
    {
      key: "studio",
      label: t("aiStylePage.home.tools.studio"),
      icon: Wand2,
      onClick: openStudio,
    },
    {
      key: "care",
      label: t("aiStylePage.home.tools.care"),
      icon: Droplets,
      onClick: openCare,
    },
  ] as const;

  const iconBtn =
    "grid size-10 place-items-center rounded-full bg-white/[0.06] text-white/90 ring-1 ring-white/10 transition-colors duration-200 cursor-pointer active:bg-white/12";

  return (
    <div className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain bg-[#050505] text-white no-scrollbar [-webkit-overflow-scrolling:touch]">
      <style>{`
        @keyframes morf-marquee-left {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes morf-marquee-right {
          from { transform: translate3d(-50%, 0, 0); }
          to { transform: translate3d(0, 0, 0); }
        }
        .morf-marquee-left {
          animation: morf-marquee-left var(--morf-marquee-duration, 42s) linear infinite;
        }
        .morf-marquee-right {
          animation: morf-marquee-right var(--morf-marquee-duration, 48s) linear infinite;
        }
        .morf-marquee-paused {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .morf-marquee-left,
          .morf-marquee-right {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,255,255,0.07), transparent 55%), radial-gradient(ellipse 40% 30% at 85% 40%, rgba(202,138,4,0.08), transparent 50%)",
        }}
      />

      <header
        className="sticky top-0 z-20 flex items-center gap-1.5 px-4 pb-2"
        style={{ paddingTop: "max(0.65rem, env(safe-area-inset-top))" }}
      >
        <button type="button" onClick={() => navigateBack(router, "/")} className={iconBtn} aria-label={t("nav.home")}>
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <div className="min-w-0 flex-1" />
        <Link to="/ai-style/history" className={iconBtn} aria-label={t("aiStylePage.historyButton")}>
          <Clock3 className="size-[17px]" strokeWidth={2} />
        </Link>
        <Link to="/profile" className={iconBtn} aria-label={t("nav.profile")}>
          <UserRound className="size-[17px]" strokeWidth={2} />
        </Link>
      </header>

      <div className="relative z-[1] mx-auto flex w-full max-w-lg flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 md:max-w-2xl md:px-8 md:pt-10">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            aria-hidden
            className="relative mb-5 grid size-14 place-items-center rounded-[22px] bg-white text-[#050505] shadow-[0_0_40px_-8px_rgba(255,255,255,0.35)]"
            animate={
              reduceMotion
                ? undefined
                : {
                    boxShadow: [
                      "0 0 36px -10px rgba(255,255,255,0.25)",
                      "0 0 52px -8px rgba(202,138,4,0.35)",
                      "0 0 36px -10px rgba(255,255,255,0.25)",
                    ],
                  }
            }
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="size-6" strokeWidth={1.75} />
            {!morphLocked && remaining != null && limit != null && limit > 0 ? (
              <LimitBadge remaining={remaining} limit={limit} />
            ) : null}
          </motion.div>

          <p className="max-w-[18rem] text-[15px] leading-snug text-white/55 md:text-[16px]">
            {t("aiStylePage.home.subtitle")}
          </p>

          <button
            type="button"
            onClick={onStartNew}
            className="relative mt-6 flex h-12 w-full max-w-sm cursor-pointer items-center gap-3 rounded-full bg-white px-2 pl-5 text-left text-[#050505] transition-opacity duration-200 active:opacity-90 md:h-14"
          >
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
              {t("aiStylePage.home.newLook")}
            </span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#050505] text-white">
              <ArrowUpRight className="size-4" strokeWidth={2.25} />
            </span>
          </button>
        </motion.section>

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
          className="mt-8 grid grid-cols-4 gap-2"
        >
          {toolActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.key}
                type="button"
                onClick={action.onClick}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3, ease: "easeOut" }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl px-1 py-2 transition-colors duration-200 active:bg-white/[0.05]"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
                  <Icon className="size-[18px] text-white" strokeWidth={1.75} />
                </span>
                <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-white/50">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </motion.section>

        {morphLocked ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="mt-6"
          >
            <MorphSoftPaywall className="[&_a]:border-white/15 [&_a]:text-white/55 [&_a:hover]:bg-white/5" />
          </motion.div>
        ) : null}

        {myLooks.length > 0 ? (
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35, ease: "easeOut" }}
            className="mt-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white/80">
                {t("aiStylePage.home.myLooksTitle")}
              </p>
              <button
                type="button"
                onClick={openHistory}
                className="cursor-pointer text-[12px] font-medium text-white/40 transition-colors duration-200 hover:text-white/70"
              >
                {t("aiStylePage.historyViewAll")}
              </button>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5">
              {myLooks.map((look, i) => (
                <motion.button
                  key={look.id}
                  type="button"
                  onClick={() => openRestyle(look.styleId)}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * i, duration: 0.25 }}
                  className="relative h-[4.5rem] w-[4.5rem] shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-white/15 active:opacity-85"
                  aria-label={look.title}
                >
                  <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                </motion.button>
              ))}
            </div>
          </motion.section>
        ) : null}

        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4, ease: "easeOut" }}
          className="mt-9"
        >
          <div className="mb-3 flex items-center justify-between px-0.5">
            <p className="text-[13px] font-semibold text-white/80">
              {t("aiStylePage.home.samplesTitle")}
            </p>
            <Link
              to="/explore"
              className="inline-flex cursor-pointer items-center gap-0.5 text-[12px] font-medium text-white/40 transition-colors duration-200 hover:text-white/70"
            >
              {t("nav.explore")}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              {[0, 1].map((row) => (
                <div key={row} className="no-scrollbar flex gap-2.5 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[8.75rem] w-[6.5rem] shrink-0 animate-pulse rounded-2xl bg-white/[0.06]"
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              <MarqueeRow
                items={rowA.length >= 3 ? rowA : sampleCards}
                direction="right"
                duration={40}
                paused={!!reduceMotion}
              />
              <MarqueeRow
                items={rowB.length >= 3 ? rowB : [...sampleCards].reverse()}
                direction="left"
                duration={46}
                paused={!!reduceMotion}
              />
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
