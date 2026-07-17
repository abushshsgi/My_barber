import { Link, useNavigate } from "@tanstack/react-router";
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
import { stashMorphStudioDraft } from "@/lib/morph-ai-studio-session";
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

  const tools = [
    {
      id: "styles",
      icon: Scissors,
      titleKey: "aiStylePage.home.tools.styles",
      descKey: "aiStylePage.home.tools.stylesDesc",
      onClick: onStartNew,
    },
    {
      id: "studio",
      icon: Palette,
      titleKey: "aiStylePage.home.tools.studio",
      descKey: "aiStylePage.home.tools.studioDesc",
      onClick: () => void navigate({ to: "/ai-style/studio" }),
    },
    {
      id: "care",
      icon: Droplets,
      titleKey: "aiStylePage.home.tools.care",
      descKey: "aiStylePage.home.tools.careDesc",
      onClick: () => void navigate({ to: "/ai-style/care" }),
    },
    {
      id: "gallery",
      icon: Images,
      titleKey: "aiStylePage.home.tools.gallery",
      descKey: "aiStylePage.home.tools.galleryDesc",
      onClick: onOpenGallery,
    },
  ] as const;

  return (
    <div className="relative h-full min-h-0 touch-pan-y overflow-y-auto overscroll-y-contain bg-[#0b0b0b] text-white [-webkit-overflow-scrolling:touch]">
      <section className="relative isolate min-h-[48dvh]">
        <img
          src={getAiStyleHeroUrl(audience === "women" ? "hero-women" : "hero-men")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-[#0b0b0b]" />
        <div
          className="relative z-[1] flex min-h-[48dvh] flex-col justify-end px-5 pb-7"
          style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
        >
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur-md">
            <Wand2 className="h-3.5 w-3.5" />
            {t("aiStylePage.title")}
          </div>
          <h1 className="max-w-[17.5rem] text-[1.85rem] font-bold leading-[1.08] tracking-tight">
            {t("aiStylePage.home.headline")}
          </h1>
          <p className="mt-2 max-w-[21rem] text-[13px] leading-relaxed text-white/70">
            {t("aiStylePage.home.subtitle")}
          </p>
          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={onStartNew}
              className="relative z-[2] inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black touch-manipulation active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              {t("aiStylePage.home.newLook")}
            </button>
            <button
              type="button"
              onClick={onOpenCamera}
              className="relative z-[2] min-h-12 shrink-0 rounded-2xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-md touch-manipulation active:scale-[0.98]"
            >
              {t("aiStylePage.openCamera")}
            </button>
          </div>
        </div>
      </section>

      <div className="relative z-[1] space-y-9 px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-2">
        {myLooks.length > 0 ? (
          <section>
            <div className="mb-3.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                  {t("aiStylePage.home.myLooksLabel")}
                </p>
                <h2 className="mt-1 text-lg font-bold">{t("aiStylePage.home.myLooksTitle")}</h2>
              </div>
              <Link
                to="/ai-style/history"
                className="relative z-[2] inline-flex min-h-10 items-center gap-0.5 px-1 text-xs font-bold text-white/75 touch-manipulation"
              >
                {t("aiStylePage.historyViewAll")}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
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
                  className="relative h-48 w-[8.5rem] shrink-0 overflow-hidden rounded-[22px] bg-white/5 text-left touch-manipulation active:scale-[0.98]"
                >
                  <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2.5 pt-10">
                    <p className="truncate text-[11px] font-bold">{look.title}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
              {t("aiStylePage.home.toolsLabel")}
            </p>
            <h2 className="mt-1 text-lg font-bold">{t("aiStylePage.home.toolsTitle")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={tool.onClick}
                  className="relative z-[2] rounded-[22px] border border-white/10 bg-white/[0.045] p-4 text-left touch-manipulation transition active:scale-[0.98]"
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
          <div className="mb-3.5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                {t("aiStylePage.home.samplesLabel")}
              </p>
              <h2 className="mt-1 text-lg font-bold">{t("aiStylePage.home.samplesTitle")}</h2>
            </div>
            <Link
              to="/explore"
              className="relative z-[2] inline-flex min-h-10 items-center gap-0.5 px-1 text-xs font-bold text-white/75 touch-manipulation"
            >
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
                  "group relative z-[2] overflow-hidden rounded-[22px] bg-white/5 touch-manipulation",
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
