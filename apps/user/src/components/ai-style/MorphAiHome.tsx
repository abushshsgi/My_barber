import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Droplets,
  Images,
  Palette,
  Scissors,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { getHairstyleDisplayUrl } from "@/lib/hairstyles/catalog";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";
import { loadSavedAiStyles, type SavedAiStyle } from "@/lib/saved-ai-styles";
import { getAiStyleHeroUrl } from "@/lib/cover-images";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  audience: Audience;
  onStartNew: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
};

const TOOLS = [
  { id: "styles", icon: Scissors, titleKey: "aiStylePage.home.tools.styles", descKey: "aiStylePage.home.tools.stylesDesc" },
  { id: "care", icon: Droplets, titleKey: "aiStylePage.home.tools.care", descKey: "aiStylePage.home.tools.careDesc" },
  { id: "color", icon: Palette, titleKey: "aiStylePage.home.tools.color", descKey: "aiStylePage.home.tools.colorDesc" },
  { id: "gallery", icon: Images, titleKey: "aiStylePage.home.tools.gallery", descKey: "aiStylePage.home.tools.galleryDesc" },
] as const;

export function MorphAiHome({ audience, onStartNew, onOpenCamera, onOpenGallery }: Props) {
  const { t } = useTranslation();
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

  const samples = useMemo(() => styles.slice(0, 8), [styles]);
  const myLooks = useMemo(() => {
    const fromGen = generations.map((g) => ({
      id: g.id,
      title: g.title,
      image: g.previewImage,
      kind: "gen" as const,
      styleId: g.styleId,
    }));
    const genStyleIds = new Set(generations.map((g) => g.styleId));
    const fromSaved = saved
      .filter((s) => !genStyleIds.has(s.styleId))
      .map((s) => ({
        id: `saved-${s.styleId}`,
        title: s.title,
        image: s.previewImage,
        kind: "saved" as const,
        styleId: s.styleId,
      }));
    return [...fromGen, ...fromSaved].slice(0, 12);
  }, [generations, saved]);

  return (
    <div className="min-h-[100dvh] bg-[#0c0c0c] text-white">
      <div className="relative overflow-hidden">
        <img
          src={getAiStyleHeroUrl(audience === "women" ? "hero-women" : "hero-men")}
          alt=""
          className="h-[38dvh] w-full object-cover object-top opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-[#0c0c0c]" />
        <div
          className="absolute inset-x-0 bottom-0 space-y-3 px-5 pb-6"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">
            <Wand2 className="h-3.5 w-3.5" />
            {t("aiStylePage.title")}
          </div>
          <h1 className="max-w-[18rem] text-[2rem] font-bold leading-[1.05] tracking-tight">
            {t("aiStylePage.home.headline")}
          </h1>
          <p className="max-w-[22rem] text-sm text-white/70">{t("aiStylePage.home.subtitle")}</p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onStartNew}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-black active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              {t("aiStylePage.home.newLook")}
            </button>
            <button
              type="button"
              onClick={onOpenCamera}
              className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3.5 text-sm font-bold text-white backdrop-blur-md active:scale-[0.98]"
            >
              {t("aiStylePage.openCamera")}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-5 pb-[max(7.5rem,env(safe-area-inset-bottom))] pt-6">
        {myLooks.length > 0 ? (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                  {t("aiStylePage.home.myLooksLabel")}
                </p>
                <h2 className="mt-1 text-lg font-bold">{t("aiStylePage.home.myLooksTitle")}</h2>
              </div>
              <Link
                to="/ai-style/history"
                className="inline-flex items-center gap-0.5 text-xs font-bold text-white/70"
              >
                {t("aiStylePage.historyViewAll")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
              {myLooks.map((look, index) => (
                <motion.div
                  key={look.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                  className="relative h-44 w-32 shrink-0 overflow-hidden rounded-[22px] bg-white/5"
                >
                  <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pb-2.5 pt-8">
                    <p className="truncate text-[11px] font-bold">{look.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
              {t("aiStylePage.home.toolsLabel")}
            </p>
            <h2 className="mt-1 text-lg font-bold">{t("aiStylePage.home.toolsTitle")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={tool.id === "gallery" ? onOpenGallery : onStartNew}
                  className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-left transition active:scale-[0.98]"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-white text-black">
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <p className="mt-3 text-sm font-bold">{t(tool.titleKey)}</p>
                  <p className="mt-1 text-[11px] leading-snug text-white/55">{t(tool.descKey)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                {t("aiStylePage.home.samplesLabel")}
              </p>
              <h2 className="mt-1 text-lg font-bold">{t("aiStylePage.home.samplesTitle")}</h2>
            </div>
            <Link to="/explore" className="inline-flex items-center gap-0.5 text-xs font-bold text-white/70">
              {t("nav.explore")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {samples.map((entry, index) => (
              <Link
                key={entry.id}
                to="/explore/$styleId"
                params={{ styleId: entry.id }}
                className={cn(
                  "group relative overflow-hidden rounded-[22px] bg-white/5",
                  index === 0 ? "col-span-2 aspect-[16/10]" : "aspect-[3/4]",
                )}
              >
                <img
                  src={getHairstyleDisplayUrl(entry)}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-active:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-3 pt-10">
                  <p className="text-sm font-bold">{entry.titleUz || entry.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
