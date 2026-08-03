import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Check,
  ChevronLeft,
  Download,
  ImagePlus,
  Images,
  Loader2,
  RotateCcw,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStylePhotoInput } from "@/components/ai-style/AiStyleUi";
import { MorphLimitUpsell } from "@/components/ai-style/MorphLimitUpsell";
import { useMorphLimitGate } from "@/hooks/use-morph-limit-gate";
import {
  fetchMorphStudioCatalog,
  generateMorphStudioEdit,
  persistAiStyleHistory,
  refreshAiStyleHistoryCache,
  type MorphStudioCategory,
} from "@/lib/api/ai";
import { downloadAiStyleImage } from "@/lib/ai-style-image";
import {
  FACE_HISTORY_UPDATED_EVENT,
  appendFaceProfileHistory,
  loadFaceProfileHistory,
  type FaceProfileHistoryEntry,
} from "@/lib/face-profile";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  saveMorphAiGeneration,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";
import {
  peekMorphStudioDraft,
  stashMorphStudioDraft,
  type MorphStudioDraft,
} from "@/lib/morph-ai-studio-session";
import { prepareSelfieDataUrl, prepareSelfieFromFile } from "@/lib/selfie-image";
import { isMorphPlanLimitError } from "@/lib/morph-plan-limit";
import { cn } from "@/lib/utils";

const FALLBACK_CATEGORIES: MorphStudioCategory[] = [
  {
    id: "hair_color",
    label_uz: "Rang",
    label_en: "Color",
    options: [
      { id: "hair_blonde", label_uz: "Sariq", label_en: "Blonde", swatch: "#E8D5A3" },
      { id: "hair_brunette", label_uz: "Jigarrang", label_en: "Brunette", swatch: "#4A2F1F" },
      { id: "hair_black", label_uz: "Qora", label_en: "Black", swatch: "#111111" },
      { id: "hair_auburn", label_uz: "Mis", label_en: "Copper", swatch: "#A0522D" },
      { id: "hair_ash", label_uz: "Kulrang", label_en: "Ash", swatch: "#8B8680" },
      { id: "hair_platinum", label_uz: "Platina", label_en: "Platinum", swatch: "#F2EDE4" },
      { id: "hair_highlights", label_uz: "Highlight", label_en: "Highlights", swatch: "#C4A574" },
    ],
  },
  {
    id: "beard",
    label_uz: "Soqol",
    label_en: "Beard",
    options: [
      { id: "beard_clean", label_uz: "Toza", label_en: "Clean" },
      { id: "beard_stubble", label_uz: "Qisqa", label_en: "Stubble" },
      { id: "beard_full", label_uz: "To'liq", label_en: "Full" },
      { id: "beard_shape", label_uz: "Shakl", label_en: "Shaped" },
    ],
  },
  {
    id: "finish",
    label_uz: "Finish",
    label_en: "Finish",
    options: [
      { id: "finish_wet", label_uz: "Nam", label_en: "Wet" },
      { id: "finish_matte", label_uz: "Matte", label_en: "Matte" },
      { id: "finish_gloss", label_uz: "Yaltiroq", label_en: "Gloss" },
      { id: "finish_volume", label_uz: "Hajm", label_en: "Volume" },
      { id: "finish_soft_light", label_uz: "Yumshoq yorug'", label_en: "Soft light" },
      { id: "finish_sharp", label_uz: "Keskin", label_en: "Crisp" },
    ],
  },
];

function labelFor(item: { label_uz: string; label_en: string }, lang: string): string {
  return lang.startsWith("en") ? item.label_en : item.label_uz;
}

type SourceItem = {
  id: string;
  title: string;
  image: string;
  beforeImage?: string;
  styleId?: string;
  kind: "generation" | "selfie";
};

const glassBtn =
  "grid size-10 place-items-center rounded-full border border-white/15 bg-black/35 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl transition active:scale-95 disabled:opacity-35 touch-manipulation cursor-pointer";

export function MorphAiStudioPage() {
  const { t, i18n } = useTranslation();
  const limitGate = useMorphLimitGate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftMeta, setDraftMeta] = useState<
    Pick<MorphStudioDraft, "styleId" | "styleTitle" | "source">
  >({});
  const [original, setOriginal] = useState<string | null>(null);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("hair_color");
  const [generations, setGenerations] = useState<MorphAiGeneration[]>(() =>
    loadMorphAiGenerations(),
  );
  const [selfies, setSelfies] = useState<FaceProfileHistoryEntry[]>(() => loadFaceProfileHistory());

  const catalogQ = useQuery({
    queryKey: ["morph-studio-catalog"],
    queryFn: fetchMorphStudioCatalog,
    staleTime: 60 * 60 * 1000,
  });

  const categories = catalogQ.data?.categories?.length
    ? catalogQ.data.categories
    : FALLBACK_CATEGORIES;

  const currentCat = useMemo(
    () => categories.find((c) => c.id === activeCategory) ?? categories[0],
    [categories, activeCategory],
  );

  useEffect(() => {
    const draft = peekMorphStudioDraft();
    if (draft?.image) {
      const base = draft.baseImage || draft.image;
      setOriginal(base);
      setCurrent(draft.image);
      setHistory(draft.image !== base ? [base, draft.image] : [base]);
      setBeforeImage(draft.beforeImage || base);
      setDraftMeta({
        styleId: draft.styleId,
        styleTitle: draft.styleTitle,
        source: draft.source,
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await refreshAiStyleHistoryCache();
      if (cancelled) return;
      setGenerations(loadMorphAiGenerations());
      setSelfies(list.length ? list : loadFaceProfileHistory());
    };
    void refresh();
    const onLocal = () => {
      setGenerations(loadMorphAiGenerations());
      setSelfies(loadFaceProfileHistory());
    };
    window.addEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onLocal);
    window.addEventListener(FACE_HISTORY_UPDATED_EVENT, onLocal);
    return () => {
      cancelled = true;
      window.removeEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onLocal);
      window.removeEventListener(FACE_HISTORY_UPDATED_EVENT, onLocal);
    };
  }, []);

  const sources: SourceItem[] = useMemo(() => {
    const fromGen = generations.map((g) => ({
      id: `gen-${g.id}`,
      title: g.title || "Try-on",
      image: g.previewImage,
      beforeImage: g.beforeImage,
      styleId: g.styleId,
      kind: "generation" as const,
    }));
    const fromSelfie = selfies
      .filter((s) => s.photoDataUrl)
      .map((s) => ({
        id: `selfie-${s.id}`,
        title: t("aiStylePage.studio.selfie", { defaultValue: "Selfie" }),
        image: s.photoDataUrl,
        beforeImage: s.photoDataUrl,
        kind: "selfie" as const,
      }));
    return [...fromGen, ...fromSelfie].slice(0, 24);
  }, [generations, selfies, t]);

  const persistStudioSelfie = (prepared: string, source: "gallery" | "camera_scan") => {
    const scannedAt = new Date().toISOString();
    appendFaceProfileHistory({
      photoDataUrl: prepared,
      scannedAt,
      source,
    });
    void persistAiStyleHistory({ image: prepared, source });
  };

  const selectImage = (
    image: string,
    meta?: {
      styleId?: string;
      styleTitle?: string;
      source?: MorphStudioDraft["source"];
      beforeImage?: string;
    },
  ) => {
    const before = meta?.beforeImage || image;
    setOriginal(image);
    setCurrent(image);
    setHistory([image]);
    setBeforeImage(before);
    setActivePresetId(null);
    setDraftMeta({
      styleId: meta?.styleId,
      styleTitle: meta?.styleTitle,
      source: meta?.source,
    });
    stashMorphStudioDraft({
      image,
      baseImage: image,
      beforeImage: before,
      styleId: meta?.styleId,
      styleTitle: meta?.styleTitle,
      source: meta?.source,
    });
    setPickerOpen(false);
  };

  const applyPreset = async (presetId: string) => {
    // Har tahrir asl (original) rasmga qo'llanadi — tahrir ustiga tahrir yo'q.
    if (!original || loadingId) return;
    if (!(await limitGate.ensureStudio())) return;
    setLoadingId(presetId);
    setActivePresetId(presetId);
    try {
      const result = await generateMorphStudioEdit(original, presetId, {
        styleId: draftMeta.styleId,
        styleTitle: draftMeta.styleTitle,
      });
      setHistory((prev) => [...prev, result.preview_image]);
      setCurrent(result.preview_image);
      stashMorphStudioDraft({
        image: result.preview_image,
        baseImage: original,
        beforeImage: beforeImage || original || undefined,
        styleId: draftMeta.styleId,
        styleTitle: draftMeta.styleTitle ?? result.preset_label,
        source: draftMeta.source ?? "tryon",
      });
      saveMorphAiGeneration({
        styleId: draftMeta.styleId || result.preset_id,
        title: draftMeta.styleTitle
          ? `${draftMeta.styleTitle} · ${result.preset_label}`
          : `Studio · ${result.preset_label}`,
        previewImage: result.preview_image,
        beforeImage: beforeImage || original || undefined,
      });
      limitGate.invalidateUsage();
      toast.success(
        t("aiStylePage.studio.applied", {
          name: result.preset_label,
          defaultValue: "{{name}} qo‘llandi",
        }),
      );
    } catch (e) {
      if (isMorphPlanLimitError(e)) {
        void limitGate.openFromApiLimit("studio");
        return;
      }
      toast.error(e instanceof Error ? e.message : t("aiStylePage.studio.failed"));
    } finally {
      setLoadingId(null);
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    const next = history.slice(0, -1);
    setHistory(next);
    setCurrent(next[next.length - 1] ?? original);
    if (next.length <= 1) setActivePresetId(null);
  };

  const resetOriginal = () => {
    if (!original) return;
    setCurrent(original);
    setHistory([original]);
    setActivePresetId(null);
    stashMorphStudioDraft({
      image: original,
      baseImage: original,
      beforeImage: beforeImage || original || undefined,
      styleId: draftMeta.styleId,
      styleTitle: draftMeta.styleTitle,
      source: draftMeta.source,
    });
  };

  const onFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      const prepared = await prepareSelfieDataUrl(dataUrl);
      persistStudioSelfie(prepared, "gallery");
      selectImage(prepared, { source: "gallery", styleTitle: "Studio", beforeImage: prepared });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiStylePage.studio.pickFailed"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (!current) return;
    setDownloading(true);
    try {
      await downloadAiStyleImage(current, `morf-studio-${Date.now()}.jpg`);
      toast.success(t("aiStylePage.downloaded"));
    } catch {
      toast.error(t("aiStylePage.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const showPicker = !current || pickerOpen;
  const hasEdits = history.length > 1;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <style>{`
        @keyframes morf-studio-scan {
          0% { transform: translateY(-120%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(120%); opacity: 0; }
        }
        @keyframes morf-studio-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.85; }
        }
        @media (prefers-reduced-motion: reduce) {
          .morf-studio-scan,
          .morf-studio-pulse { animation: none !important; }
        }
        .morf-studio-scan {
          animation: morf-studio-scan 2.4s ease-in-out infinite;
        }
        .morf-studio-pulse {
          animation: morf-studio-pulse 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Atmospheric backdrop when picker / empty */}
      {showPicker ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(180,180,180,0.06),transparent_45%)]"
        />
      ) : null}

      <AnimatePresence mode="wait">
        {showPicker ? (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex min-h-[100dvh] flex-col"
          >
            <header
              className="flex items-center justify-between gap-3 px-4 pb-2"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <Link
                to="/ai-style"
                className={glassBtn}
                aria-label={t("common.back")}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
              </Link>
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
                  Morf AI
                </p>
                <h1 className="truncate text-[15px] font-semibold tracking-tight">
                  {t("aiStylePage.studio.title", { defaultValue: "AI Studio" })}
                </h1>
              </div>
              <div className="size-10" aria-hidden />
            </header>

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="mb-5 mt-2 max-w-md">
                <h2 className="text-[1.65rem] font-semibold leading-[1.15] tracking-tight">
                  {t("aiStylePage.studio.pickTitle", {
                    defaultValue: "Lookni tanlang",
                  })}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-white/45">
                  {t("aiStylePage.studio.pickLabel", {
                    defaultValue: "History, try-on yoki yangi selfie bilan boshlang",
                  })}
                </p>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="group relative flex min-h-[88px] flex-col items-start justify-between overflow-hidden rounded-[22px] bg-white px-4 py-3.5 text-left text-black shadow-[0_12px_40px_rgba(255,255,255,0.08)] touch-manipulation cursor-pointer active:scale-[0.98]"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-black/8">
                    <Camera className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight">
                    {t("aiStylePage.openCamera")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative flex min-h-[88px] flex-col items-start justify-between overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.06] px-4 py-3.5 text-left backdrop-blur-md touch-manipulation cursor-pointer active:scale-[0.98]"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-white/10">
                    <ImagePlus className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold tracking-tight text-white/90">
                    {t("aiStylePage.pickFromGallery")}
                  </span>
                </button>
              </div>

              {sources.length > 0 ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      {t("aiStylePage.studio.fromHistory", { defaultValue: "Recent" })}
                    </p>
                    <span className="text-[11px] text-white/30">{sources.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pb-4 sm:grid-cols-4">
                    {sources.map((item, index) => (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(index * 0.03, 0.24), duration: 0.28 }}
                        onClick={() =>
                          selectImage(item.image, {
                            styleId: item.styleId,
                            styleTitle: item.title,
                            source: item.kind === "generation" ? "generation" : "history",
                            beforeImage: item.beforeImage || item.image,
                          })
                        }
                        className="group relative aspect-[3/4] overflow-hidden rounded-[18px] bg-white/[0.04] ring-1 ring-white/10 touch-manipulation cursor-pointer active:scale-[0.97]"
                      >
                        <img
                          src={item.image}
                          alt=""
                          className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        <p className="absolute inset-x-0 bottom-0 truncate px-2 pb-2 text-[10px] font-medium text-white/85">
                          {item.title}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.02] px-8 text-center">
                  <div className="mb-4 grid size-14 place-items-center rounded-full bg-white/[0.06] ring-1 ring-white/10">
                    <Images className="h-6 w-6 text-white/40" />
                  </div>
                  <p className="text-sm font-semibold text-white/80">
                    {t("aiStylePage.studio.emptyHistory", {
                      defaultValue: "Hali try-on yoki selfie yo‘q",
                    })}
                  </p>
                  <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-white/40">
                    {t("aiStylePage.studio.emptyHint", {
                      defaultValue: "Kamera yoki galereyadan rasm yuklang",
                    })}
                  </p>
                </div>
              )}

              {current && pickerOpen ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="mt-3 w-full rounded-2xl border border-white/12 bg-white/[0.06] py-3.5 text-sm font-semibold backdrop-blur-md cursor-pointer"
                >
                  {t("aiStylePage.studio.keepEditing", { defaultValue: "Tahrirni davom ettirish" })}
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative flex min-h-[100dvh] flex-col"
          >
            {/* Full-bleed canvas */}
            <div className="absolute inset-0">
              {current ? (
                <img
                  src={current}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/80" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/70 to-transparent" />
            </div>

            {/* AI generating overlay */}
            <AnimatePresence>
              {loadingId ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[3px]"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 morf-studio-scan bg-gradient-to-b from-transparent via-white/25 to-transparent" />
                  <div className="relative flex flex-col items-center gap-3 rounded-3xl border border-white/15 bg-black/50 px-7 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                    <div className="relative grid size-12 place-items-center">
                      <span className="absolute inset-0 rounded-full border border-white/20 morf-studio-pulse" />
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-sm font-semibold tracking-tight">
                      {t("aiStylePage.studio.generating", {
                        defaultValue: "AI tahrir qo‘llanmoqda…",
                      })}
                    </p>
                    <p className="text-[11px] text-white/45">Morf AI Studio</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Floating top chrome */}
            <header
              className="relative z-30 flex items-center justify-between gap-2 px-4"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <Link to="/ai-style" className={glassBtn} aria-label={t("common.back")}>
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
              </Link>

              <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-white/70" />
                <div className="min-w-0 text-center">
                  <p className="truncate text-[12px] font-semibold tracking-tight">
                    {t("aiStylePage.studio.title", { defaultValue: "AI Studio" })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className={cn(glassBtn, "text-[11px] font-semibold")}
                aria-label={t("aiStylePage.studio.changePhoto", { defaultValue: "Rasm" })}
              >
                <Images className="h-4 w-4" />
              </button>
            </header>

            {/* Floating edit tools */}
            <div className="relative z-30 mt-3 flex justify-end gap-1.5 px-4">
              <button
                type="button"
                onClick={undo}
                disabled={Boolean(loadingId) || !hasEdits}
                className={glassBtn}
                aria-label={t("aiStylePage.studio.undo")}
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={resetOriginal}
                disabled={Boolean(loadingId) || current === original}
                className={glassBtn}
                aria-label={t("aiStylePage.studio.reset")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Spacer keeps canvas visible */}
            <div className="relative z-10 min-h-0 flex-1" />

            {/* Bottom glass dock */}
            <div
              className="relative z-30 px-3"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <div className="overflow-hidden rounded-[28px] border border-white/12 bg-black/45 shadow-[0_-8px_48px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <div className="space-y-3 px-3.5 pb-3.5 pt-3.5">
                  {/* Category segmented control */}
                  <div className="flex gap-1 rounded-2xl bg-white/[0.06] p-1">
                    {categories.map((cat) => {
                      const active = cat.id === (currentCat?.id ?? activeCategory);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "relative min-h-9 flex-1 rounded-[14px] px-2 text-[12px] font-semibold tracking-tight transition-colors duration-200 touch-manipulation cursor-pointer",
                            active ? "text-black" : "text-white/55 hover:text-white/80",
                          )}
                        >
                          {active ? (
                            <motion.span
                              layoutId="studio-cat-pill"
                              className="absolute inset-0 rounded-[14px] bg-white shadow-sm"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            />
                          ) : null}
                          <span className="relative z-10">
                            {labelFor(cat, i18n.language)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Preset scroller */}
                  <div className="-mx-0.5 flex gap-2.5 overflow-x-auto px-0.5 pb-0.5 no-scrollbar">
                    {(currentCat?.options ?? []).map((opt) => {
                      const busy = loadingId === opt.id;
                      const selected = activePresetId === opt.id && !loadingId;
                      const swatch =
                        "swatch" in opt ? (opt.swatch as string | undefined) : undefined;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={Boolean(loadingId)}
                          onClick={() => void applyPreset(opt.id)}
                          className={cn(
                            "flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1.5 transition duration-200 touch-manipulation cursor-pointer active:scale-[0.96] disabled:opacity-50",
                            selected && "bg-white/[0.08]",
                          )}
                        >
                          <span
                            className={cn(
                              "relative grid size-[3.25rem] place-items-center overflow-hidden rounded-full transition duration-200",
                              selected
                                ? "ring-[2.5px] ring-white ring-offset-2 ring-offset-black/60"
                                : "ring-1 ring-white/20",
                            )}
                            style={{
                              background: swatch
                                ? `linear-gradient(145deg, ${swatch} 0%, ${swatch} 55%, #1a1a1a 100%)`
                                : "linear-gradient(145deg, #3a3a3a, #141414)",
                            }}
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin text-white drop-shadow" />
                            ) : selected ? (
                              <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={2.5} />
                            ) : !swatch ? (
                              <Sparkles className="h-3.5 w-3.5 text-white/85 drop-shadow" />
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "w-full truncate text-center text-[10px] font-semibold leading-tight",
                              selected ? "text-white" : "text-white/65",
                            )}
                          >
                            {labelFor(opt, i18n.language)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-[1fr_1.35fr] gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => void handleDownload()}
                      disabled={!current || downloading || Boolean(loadingId)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.08] text-sm font-semibold tracking-tight disabled:opacity-40 cursor-pointer touch-manipulation"
                    >
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {t("aiStylePage.download")}
                    </button>
                    <Link
                      to="/ai-style"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold tracking-tight text-black shadow-[0_8px_28px_rgba(255,255,255,0.18)] cursor-pointer touch-manipulation active:scale-[0.98]"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                      {t("aiStylePage.studio.done", { defaultValue: "Tayyor" })}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />
      <AiStyleCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(payload) => {
          setCameraOpen(false);
          void prepareSelfieDataUrl(payload.dataUrl).then((prepared) => {
            persistStudioSelfie(prepared, "camera_scan");
            selectImage(prepared, {
              source: "camera",
              styleTitle: "Studio",
              beforeImage: prepared,
            });
          });
        }}
      />
      <MorphLimitUpsell
        open={limitGate.open}
        onOpenChange={limitGate.setOpen}
        kind={limitGate.kind}
        me={limitGate.me}
      />
    </div>
  );
}
