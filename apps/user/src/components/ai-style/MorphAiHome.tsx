import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Droplets, ImagePlus, ScanFace, UserRound, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { getHairstyleDisplayUrl } from "@/lib/hairstyles/catalog";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";
import { stashMorphStudioDraft } from "@/lib/morph-ai-studio-session";
import { navigateBack } from "@/lib/mobile-back";
import { loadSavedAiStyles, type SavedAiStyle } from "@/lib/saved-ai-styles";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  audience: Audience;
  onStartNew: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  ensureMorphAccess?: () => Promise<boolean>;
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

export function MorphAiHome({
  audience,
  onStartNew,
  onOpenCamera,
  onOpenGallery,
  ensureMorphAccess,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const { personaId } = useExplorePersona();
  const { data: styles = [], isLoading } = useHairstyles(
    audience === "women" ? "women" : "men",
    personaId,
    { ignoreAgeGroup: true },
  );
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

  const samples = useMemo(() => styles.slice(0, 6), [styles]);
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
    return [...fromGen, ...fromSaved].slice(0, 6);
  }, [generations, saved]);

  return (
    <div className="relative h-full min-h-0 touch-pan-y overflow-y-auto overscroll-y-contain bg-background text-foreground [-webkit-overflow-scrolling:touch]">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-background/90 px-4 backdrop-blur-md"
        style={{ paddingTop: "max(0.65rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => navigateBack(router, "/")}
          className="grid size-10 place-items-center rounded-full active:bg-surface"
          aria-label={t("nav.home")}
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <p className="min-w-0 flex-1 text-center text-[13px] font-extrabold tracking-[0.2em]">
          {t("aiStylePage.title")}
        </p>
        <Link
          to="/profile"
          className="grid size-10 place-items-center rounded-full active:bg-surface"
          aria-label={t("nav.profile")}
        >
          <UserRound className="size-[18px]" strokeWidth={2} />
        </Link>
      </header>

      <div className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-[2.75rem] font-extrabold leading-none tracking-[-0.04em]">
            MORF
          </h1>
          <p className="mt-2 max-w-[20rem] text-[14px] leading-snug text-muted-foreground">
            {t("aiStylePage.home.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="mt-6 space-y-2.5"
        >
          <button
            type="button"
            onClick={onStartNew}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-foreground text-[15px] font-bold text-background active:scale-[0.99]"
          >
            {t("aiStylePage.home.newLook")}
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenCamera}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface/60 text-[13px] font-bold active:scale-[0.99]"
            >
              <ScanFace className="size-4" strokeWidth={2} />
              {t("aiStylePage.openCamera")}
            </button>
            <button
              type="button"
              onClick={onOpenGallery}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface/60 text-[13px] font-bold active:scale-[0.99]"
            >
              <ImagePlus className="size-4" strokeWidth={2} />
              {t("aiStylePage.pickFromGallery")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  if (ensureMorphAccess && !(await ensureMorphAccess())) return;
                  void navigate({ to: "/ai-style/studio" });
                })();
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface/40 px-3 text-left text-[13px] font-bold active:scale-[0.99]"
            >
              <Wand2 className="size-4 shrink-0" strokeWidth={2} />
              <span className="min-w-0 truncate">{t("aiStylePage.home.tools.studio")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  if (ensureMorphAccess && !(await ensureMorphAccess())) return;
                  void navigate({ to: "/ai-style/care" });
                })();
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface/40 px-3 text-left text-[13px] font-bold active:scale-[0.99]"
            >
              <Droplets className="size-4 shrink-0" strokeWidth={2} />
              <span className="min-w-0 truncate">{t("aiStylePage.home.tools.care")}</span>
            </button>
          </div>
        </motion.div>

        {myLooks.length > 0 ? (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-bold">{t("aiStylePage.home.myLooksTitle")}</p>
              <Link
                to="/ai-style/history"
                className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-muted-foreground"
              >
                {t("aiStylePage.historyViewAll")}
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {myLooks.map((look) => (
                <button
                  key={look.id}
                  type="button"
                  onClick={() => {
                    stashMorphStudioDraft({
                      image: look.image,
                      styleId: look.styleId,
                      styleTitle: look.title,
                      source: "generation",
                    });
                    void navigate({ to: "/ai-style/studio" });
                  }}
                  className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-surface active:opacity-80"
                >
                  <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-9">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {t("aiStylePage.home.samplesLabel")}
              </p>
              <h2 className="mt-0.5 text-[17px] font-bold">
                {t("aiStylePage.home.samplesTitle")}
              </h2>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-muted-foreground"
            >
              {t("nav.explore")}
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "animate-pulse rounded-2xl bg-surface",
                      i === 0 ? "col-span-2 aspect-[16/10]" : "aspect-[3/4]",
                    )}
                  />
                ))
              : samples.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * index, duration: 0.35 }}
                    className={cn(index === 0 && "col-span-2")}
                  >
                    <Link
                      to="/explore/$styleId"
                      params={{ styleId: entry.id }}
                      className="group relative block overflow-hidden rounded-2xl bg-surface active:opacity-90"
                    >
                      <img
                        src={getHairstyleDisplayUrl(entry)}
                        alt=""
                        className={cn(
                          "w-full object-cover transition duration-500 group-active:scale-[1.02]",
                          index === 0 ? "aspect-[16/10]" : "aspect-[3/4]",
                        )}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
                        <p className="truncate text-[13px] font-bold text-white">
                          {entry.titleUz || entry.title}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
          </div>
        </section>
      </div>
    </div>
  );
}
