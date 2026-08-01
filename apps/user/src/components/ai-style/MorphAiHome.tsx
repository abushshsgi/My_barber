import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Droplets,
  ImagePlus,
  ScanFace,
  UserRound,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SubscriptionPromoBanner } from "@/components/subscriptions/SubscriptionPlanAds";
import { MorphLimitMeter } from "@/components/subscriptions/MorphLimitMeter";
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

function prettyLookTitle(title: string) {
  const raw = title.trim();
  if (!raw) return "Try-on";
  if (!/[-_]/.test(raw) && !/^(men|women)\b/i.test(raw)) return raw;
  return raw
    .replace(/^(men|women)[-_]/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

const fadeUp = (delay = 0, reduce = false) =>
  reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
      };

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

  const samples = useMemo(() => styles.slice(0, 8), [styles]);
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
      if (out.length >= 10) break;
    }
    return out;
  }, [generations]);

  const openHistory = () => {
    void navigate({ to: "/ai-style/history" });
  };

  const iconBtn =
    "grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white backdrop-blur-md transition-colors duration-200 cursor-pointer active:bg-white/12";

  return (
    <div className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain bg-[#050505] text-white [-webkit-overflow-scrolling:touch]">
      {/* Atmosphere — not flat black */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -10%, rgba(202,138,4,0.14), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 30%, rgba(255,255,255,0.04), transparent 50%), radial-gradient(ellipse 50% 35% at 0% 70%, rgba(255,255,255,0.03), transparent 45%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black, transparent)",
        }}
      />

      <header
        className="sticky top-0 z-20 flex items-center gap-1.5 px-4 pb-2"
        style={{ paddingTop: "max(0.65rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => navigateBack(router, "/")}
          className={iconBtn}
          aria-label={t("nav.home")}
        >
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

      <div className="relative z-[1] mx-auto w-full max-w-3xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 md:max-w-5xl md:px-8">
        {/* Hero — brand first */}
        <motion.section {...fadeUp(0, !!reduceMotion)} className="pt-4 md:pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#CA8A04]">
            {t("aiStylePage.home.studioTag")}
          </p>
          <h1 className="mt-3 font-display text-[clamp(3.4rem,14vw,5.5rem)] font-extrabold leading-[0.88] tracking-[-0.06em]">
            MORF
          </h1>
          <p className="mt-1 font-display text-[clamp(1.35rem,5vw,2rem)] font-medium leading-none tracking-[-0.03em] text-white/35">
            AI
          </p>
          <p className="mt-4 max-w-[20rem] text-[14px] leading-relaxed text-white/55 md:max-w-sm md:text-[15px]">
            {t("aiStylePage.home.subtitle")}
          </p>

          <button
            type="button"
            onClick={onStartNew}
            className="mt-7 flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white px-5 text-[15px] font-bold text-[#050505] transition-opacity duration-200 active:opacity-90 md:h-14"
          >
            <span>{t("aiStylePage.home.newLook")}</span>
            <ChevronRight className="size-5 shrink-0 opacity-50" strokeWidth={2.5} />
          </button>
        </motion.section>

        {/* Capture + tools — bento */}
        <motion.section {...fadeUp(0.06, !!reduceMotion)} className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onOpenCamera}
            className="group relative flex min-h-[7.5rem] cursor-pointer flex-col justify-between overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.05] p-4 text-left transition-colors duration-200 active:bg-white/[0.08] md:min-h-[8.5rem]"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-white/10">
              <ScanFace className="size-5 text-white" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-[14px] font-bold tracking-tight">{t("aiStylePage.openCamera")}</p>
              <p className="mt-0.5 text-[11px] text-white/40">{t("aiStylePage.home.tools.galleryDesc")}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onOpenGallery}
            className="group relative flex min-h-[7.5rem] cursor-pointer flex-col justify-between overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.05] p-4 text-left transition-colors duration-200 active:bg-white/[0.08] md:min-h-[8.5rem]"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-white/10">
              <ImagePlus className="size-5 text-white" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-[14px] font-bold tracking-tight">{t("aiStylePage.pickFromGallery")}</p>
              <p className="mt-0.5 text-[11px] text-white/40">{t("aiStylePage.home.tools.stylesDesc")}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              void (async () => {
                const gate = ensureMorphStudio ?? ensureMorphAccess;
                if (gate && !(await gate())) return;
                void navigate({ to: "/ai-style/studio" });
              })();
            }}
            className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] px-3.5 py-3.5 text-left transition-colors duration-200 active:bg-white/[0.07]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#CA8A04]/15 text-[#CA8A04]">
              <Wand2 className="size-4" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold">{t("aiStylePage.home.tools.studio")}</span>
              <span className="mt-0.5 block truncate text-[10px] text-white/40">
                {t("aiStylePage.home.tools.studioDesc")}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                if (ensureMorphAccess && !(await ensureMorphAccess())) return;
                void navigate({ to: "/ai-style/care" });
              })();
            }}
            className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] px-3.5 py-3.5 text-left transition-colors duration-200 active:bg-white/[0.07]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white/80">
              <Droplets className="size-4" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold">{t("aiStylePage.home.tools.care")}</span>
              <span className="mt-0.5 block truncate text-[10px] text-white/40">
                {t("aiStylePage.home.tools.careDesc")}
              </span>
            </span>
          </button>
        </motion.section>

        <motion.div {...fadeUp(0.1, !!reduceMotion)} className="mt-4 space-y-2.5">
          {morphLocked ? (
            <MorphSoftPaywall className="[&_a]:border-white/15 [&_a]:text-white/55 [&_a:hover]:bg-white/5" />
          ) : (
            <MorphLimitMeter tone="oled" />
          )}
          {!morphLocked ? <SubscriptionPromoBanner className="border-white/10" /> : null}
        </motion.div>

        {/* My looks — filmstrip */}
        <motion.section {...fadeUp(0.14, !!reduceMotion)} className="mt-9">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                {t("aiStylePage.home.myLooksLabel")}
              </p>
              <h2 className="mt-1 font-display text-[1.35rem] font-bold tracking-[-0.03em] md:text-[1.5rem]">
                {t("aiStylePage.home.myLooksTitle")}
              </h2>
            </div>
            <button
              type="button"
              onClick={openHistory}
              className="mb-0.5 inline-flex cursor-pointer items-center gap-0.5 text-[12px] font-semibold text-white/45 transition-colors duration-200 hover:text-white/70"
            >
              {t("aiStylePage.historyViewAll")}
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {myLooks.length > 0 ? (
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
              {myLooks.map((look, i) => (
                <button
                  key={look.id}
                  type="button"
                  onClick={openHistory}
                  className={cn(
                    "relative shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-opacity duration-200 active:opacity-85",
                    i === 0 ? "h-[9.5rem] w-[7rem] md:h-44 md:w-32" : "h-[9.5rem] w-[6.25rem] md:h-44 md:w-[7.25rem]",
                  )}
                  aria-label={look.title}
                >
                  <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8">
                    <p className="truncate text-[11px] font-semibold text-white/90">{look.title}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartNew}
              className="w-full cursor-pointer rounded-[22px] border border-dashed border-white/15 bg-white/[0.03] px-5 py-7 text-left transition-colors duration-200 active:bg-white/[0.06]"
            >
              <p className="text-[14px] font-semibold text-white/90">{t("aiStylePage.historyEmpty")}</p>
              <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-white/40">
                {t("aiStylePage.home.myLooksEmptyHint", {
                  defaultValue: "Try-on qiling — natijalar shu yerda va Historyda chiqadi",
                })}
              </p>
            </button>
          )}
        </motion.section>

        {/* Lookbook — horizontal journey */}
        <motion.section {...fadeUp(0.18, !!reduceMotion)} className="mt-10 mb-4">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                {t("aiStylePage.home.samplesLabel")}
              </p>
              <h2 className="mt-1 font-display text-[1.35rem] font-bold tracking-[-0.03em] md:text-[1.5rem]">
                {t("aiStylePage.home.samplesTitle")}
              </h2>
            </div>
            <Link
              to="/explore"
              className="mb-0.5 inline-flex cursor-pointer items-center gap-0.5 text-[12px] font-semibold text-white/45 transition-colors duration-200 hover:text-white/70"
            >
              {t("nav.explore")}
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:gap-3.5 md:px-0">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "shrink-0 animate-pulse rounded-[22px] bg-white/[0.06]",
                      i === 0 ? "h-[17rem] w-[13rem] md:h-[20rem] md:w-[15rem]" : "h-[17rem] w-[11rem] md:h-[20rem] md:w-[13rem]",
                    )}
                  />
                ))
              : samples.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={reduceMotion ? false : { opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * index, duration: 0.3, ease: "easeOut" }}
                    className="shrink-0"
                  >
                    <Link
                      to="/explore/$styleId"
                      params={{ styleId: entry.id }}
                      className={cn(
                        "group relative block cursor-pointer overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] transition-opacity duration-200 active:opacity-90",
                        index === 0
                          ? "h-[17rem] w-[13rem] md:h-[20rem] md:w-[15rem]"
                          : "h-[17rem] w-[11rem] md:h-[20rem] md:w-[13rem]",
                      )}
                    >
                      <img
                        src={getHairstyleDisplayUrl(entry)}
                        alt={entry.titleUz || entry.title}
                        className="h-full w-full object-cover transition duration-500 group-active:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#CA8A04]">
                          {index === 0 ? "01" : String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-1 truncate text-[14px] font-bold text-white md:text-[15px]">
                          {entry.titleUz || entry.title}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
