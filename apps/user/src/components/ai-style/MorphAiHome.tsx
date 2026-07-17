import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Droplets,
  ImagePlus,
  Palette,
  ScanFace,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AiStyleChrome } from "@/components/ai-style/AiStyleChrome";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { getAiStyleHeroUrl } from "@/lib/cover-images";
import { getHairstyleDisplayUrl } from "@/lib/hairstyles/catalog";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";
import { stashMorphStudioDraft } from "@/lib/morph-ai-studio-session";
import { loadSavedAiStyles, type SavedAiStyle } from "@/lib/saved-ai-styles";
import { navigateBack } from "@/lib/mobile-back";
import type { Audience } from "@/lib/mock-data";

type Props = {
  audience: Audience;
  onStartNew: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
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

export function MorphAiHome({ audience, onStartNew, onOpenCamera, onOpenGallery }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const { personaId } = useExplorePersona();
  const { data: styles = [] } = useHairstyles(audience === "women" ? "women" : "men", personaId, {
    ignoreAgeGroup: true,
  });
  const [generations, setGenerations] = useState<MorphAiGeneration[]>(() => loadMorphAiGenerations());
  const [saved, setSaved] = useState<SavedAiStyle[]>(() => loadSavedAiStyles());

  useEffect(() => {
    const refresh = () => {
      setGenerations(loadMorphAiGenerations());
      setSaved(loadSavedAiStyles());
    };
    refresh();
    window.addEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, refresh);
  }, []);

  const samples = useMemo(() => styles.slice(0, 10), [styles]);
  const myLooks = useMemo(() => {
    const fromGen = generations.map((g) => ({
      id: g.id,
      title: prettyLookTitle(g.title),
      image: g.previewImage,
      styleId: g.styleId,
    }));
    const genStyleIds = new Set(generations.map((g) => g.styleId));
    const fromSaved = saved
      .filter((s) => !genStyleIds.has(s.styleId))
      .map((s) => ({
        id: `saved-${s.styleId}`,
        title: prettyLookTitle(s.title),
        image: s.previewImage,
        styleId: s.styleId,
      }));
    return [...fromGen, ...fromSaved].slice(0, 12);
  }, [generations, saved]);

  const destinations = [
    {
      id: "tryon",
      label: t("aiStylePage.home.newLook"),
      hint: t("aiStylePage.home.tools.stylesDesc"),
      icon: Sparkles,
      onClick: onStartNew,
      primary: true,
    },
    {
      id: "studio",
      label: t("aiStylePage.home.tools.studio"),
      hint: t("aiStylePage.home.tools.studioDesc"),
      icon: Palette,
      onClick: () => void navigate({ to: "/ai-style/studio" }),
      primary: false,
    },
    {
      id: "care",
      label: t("aiStylePage.home.tools.care"),
      hint: t("aiStylePage.home.tools.careDesc"),
      icon: Droplets,
      onClick: () => void navigate({ to: "/ai-style/care" }),
      primary: false,
    },
  ] as const;

  return (
    <div className="relative h-full min-h-0 touch-pan-y overflow-y-auto overscroll-y-contain bg-[oklch(0.97_0.01_85)] text-foreground [-webkit-overflow-scrolling:touch]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_-5%,oklch(0.88_0.04_75)_0%,transparent_42%),radial-gradient(ellipse_at_-10%_40%,oklch(0.93_0.02_95)_0%,transparent_38%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />

      <AiStyleChrome
        tone="light"
        onBack={() => navigateBack(router, "/")}
      />

      {/* Brand masthead — typography first, image as side plane (not dark full-bleed hero) */}
      <section className="relative z-[1] px-5 pt-2">
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-3 sm:grid-cols-[1.25fr_0.75fr]">
          <div className="flex min-h-[220px] flex-col justify-end pb-1">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-display text-[clamp(3.2rem,13vw,5rem)] font-extrabold leading-[0.82] tracking-[-0.045em]"
            >
              MORF
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45 }}
              className="mt-2 text-xs font-bold uppercase tracking-[0.28em] text-foreground/55"
            >
              {t("aiStylePage.home.studioTag", { defaultValue: "AI studio" })}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.4 }}
              className="mt-4 max-w-[16rem] text-[14px] leading-snug text-muted-foreground"
            >
              {t("aiStylePage.home.subtitle")}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative min-h-[220px] overflow-hidden"
          >
            <img
              src={getAiStyleHeroUrl(audience === "women" ? "hero-women" : "hero-men")}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
            />
            <motion.div
              aria-hidden
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ left: ["-40%", "120%"] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
            />
          </motion.div>
        </div>

        {/* Capture strip — two equal rows, not hero CTA pills */}
        <div className="mt-6 grid grid-cols-2 gap-px bg-foreground/15">
          <button
            type="button"
            onClick={onOpenCamera}
            className="flex min-h-[4.5rem] flex-col items-start justify-center gap-1 bg-[oklch(0.97_0.01_85)] px-4 py-3 text-left touch-manipulation active:bg-surface"
          >
            <ScanFace className="size-5" strokeWidth={2} />
            <span className="text-[13px] font-bold leading-tight">{t("aiStylePage.openCamera")}</span>
          </button>
          <button
            type="button"
            onClick={onOpenGallery}
            className="flex min-h-[4.5rem] flex-col items-start justify-center gap-1 bg-[oklch(0.97_0.01_85)] px-4 py-3 text-left touch-manipulation active:bg-surface"
          >
            <ImagePlus className="size-5" strokeWidth={2} />
            <span className="text-[13px] font-bold leading-tight">{t("aiStylePage.pickFromGallery")}</span>
          </button>
        </div>
      </section>

      <div className="relative z-[1] space-y-10 px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-9">
        {/* Destinations as vertical index — not 2x2 tool cards */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("aiStylePage.home.toolsLabel")}
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight">
            {t("aiStylePage.home.toolsTitle")}
          </h2>
          <div className="mt-4 divide-y divide-foreground/10 border-y border-foreground/10">
            {destinations.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.35 }}
                  onClick={item.onClick}
                  className="flex w-full items-center gap-4 py-4 text-left touch-manipulation active:opacity-70"
                >
                  <span
                    className={
                      item.primary
                        ? "grid size-11 place-items-center rounded-full bg-foreground text-background"
                        : "grid size-11 place-items-center rounded-full border border-foreground/20"
                    }
                  >
                    <Icon className="size-[18px]" strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-foreground/30" />
                </motion.button>
              );
            })}
          </div>
        </section>

        {myLooks.length > 0 ? (
          <section>
            <div className="mb-3.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("aiStylePage.home.myLooksLabel")}
                </p>
                <h2 className="mt-1 text-lg font-bold">{t("aiStylePage.home.myLooksTitle")}</h2>
              </div>
              <Link
                to="/ai-style/history"
                className="inline-flex min-h-10 items-center gap-0.5 px-1 text-xs font-bold touch-manipulation"
              >
                {t("aiStylePage.historyViewAll")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {myLooks.map((look, index) => (
                <motion.button
                  key={look.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                  onClick={() => {
                    stashMorphStudioDraft({
                      image: look.image,
                      styleId: look.styleId,
                      styleTitle: look.title,
                      source: "generation",
                    });
                    void navigate({ to: "/ai-style/studio" });
                  }}
                  className="relative h-44 w-[7.25rem] shrink-0 overflow-hidden text-left touch-manipulation active:opacity-90"
                >
                  <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8">
                    <p className="truncate text-[11px] font-bold text-white">{look.title}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Sample reel — horizontal filmstrip instead of masonry cards */}
        <section>
          <div className="mb-3.5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t("aiStylePage.home.samplesLabel")}
              </p>
              <h2 className="mt-1 text-lg font-bold">{t("aiStylePage.home.samplesTitle")}</h2>
            </div>
            <Link
              to="/explore"
              className="inline-flex min-h-10 items-center gap-0.5 px-1 text-xs font-bold touch-manipulation"
            >
              {t("nav.explore")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {samples.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * index, duration: 0.35 }}
              >
                <Link
                  to="/explore/$styleId"
                  params={{ styleId: entry.id }}
                  className="block w-[8.5rem] shrink-0 touch-manipulation active:opacity-90 sm:w-40"
                >
                  <img
                    src={getHairstyleDisplayUrl(entry)}
                    alt=""
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <p className="mt-2 truncate text-[12px] font-bold leading-tight">
                    {entry.titleUz || entry.title}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
