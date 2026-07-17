import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAiStyleHeroUrl } from "@/lib/cover-images";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";
import { stashMorphStudioDraft } from "@/lib/morph-ai-studio-session";
import { navigateBack } from "@/lib/mobile-back";
import { loadSavedAiStyles, type SavedAiStyle } from "@/lib/saved-ai-styles";
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
    return [...fromGen, ...fromSaved].slice(0, 8);
  }, [generations, saved]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-neutral-950 text-white">
      <motion.img
        src={getAiStyleHeroUrl(audience === "women" ? "hero-women" : "hero-men")}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/85" />

      <header
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={() => navigateBack(router, "/")}
          className="grid size-11 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md active:opacity-70"
          aria-label={t("nav.home")}
        >
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <Link
          to="/profile"
          className="grid size-11 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md active:opacity-70"
          aria-label={t("nav.profile")}
        >
          <UserRound className="size-[18px]" strokeWidth={2} />
        </Link>
      </header>

      <div
        className="absolute inset-x-0 bottom-0 z-10 px-5"
        style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <p className="font-display text-[clamp(3rem,12vw,4.5rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
            MORF
          </p>
          <p className="mt-3 max-w-[18rem] text-[15px] leading-snug text-white/75">
            {t("aiStylePage.home.headline")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="mt-7 space-y-3"
        >
          <button
            type="button"
            onClick={onStartNew}
            className="flex h-14 w-full items-center justify-center rounded-full bg-white text-[15px] font-bold text-black active:scale-[0.98]"
          >
            {t("aiStylePage.home.newLook")}
          </button>

          <div className="flex items-center justify-center gap-1 text-[13px] font-semibold text-white/80">
            <button type="button" onClick={onOpenCamera} className="px-3 py-2 active:opacity-60">
              {t("aiStylePage.openCamera")}
            </button>
            <span className="text-white/30">·</span>
            <button type="button" onClick={onOpenGallery} className="px-3 py-2 active:opacity-60">
              {t("aiStylePage.pickFromGallery")}
            </button>
            <span className="text-white/30">·</span>
            <button
              type="button"
              onClick={() => void navigate({ to: "/ai-style/studio" })}
              className="px-3 py-2 active:opacity-60"
            >
              {t("aiStylePage.home.tools.studio")}
            </button>
          </div>
        </motion.div>

        {myLooks.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="mt-6"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-white/55">
                {t("aiStylePage.home.myLooksTitle")}
              </p>
              <Link to="/ai-style/history" className="text-[12px] font-semibold text-white/70">
                {t("aiStylePage.historyViewAll")}
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
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl active:opacity-80"
                >
                  <img src={look.image} alt="" className="h-full w-full object-cover object-top" />
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
