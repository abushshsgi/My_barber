import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Camera,
  Check,
  ChevronLeft,
  Dices,
  Download,
  Droplets,
  Eye,
  ImagePlus,
  Images,
  Loader2,
  Newspaper,
  Palette,
  RotateCcw,
  Scissors,
  Share2,
  Sparkles,
  Undo2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStylePhotoInput } from "@/components/ai-style/AiStyleUi";
import { MorphLimitUpsell } from "@/components/ai-style/MorphLimitUpsell";
import {
  studioCategoryIcon,
  studioPresetIcon,
} from "@/components/ai-style/studio-preset-icons";
import { useMorfAiStoryShare } from "@/components/ai-style/useMorfAiStoryShare";
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

type NewsAction = "finish" | "beard" | "compare" | "plan";

const NEWS_ITEMS: {
  id: NewsAction;
  categoryId?: string;
  Icon: typeof Palette;
}[] = [
  { id: "finish", categoryId: "finish", Icon: Droplets },
  { id: "beard", categoryId: "beard", Icon: Scissors },
  { id: "compare", Icon: Eye },
  { id: "plan", Icon: Sparkles },
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

const toolBtn =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-3 text-[11px] font-semibold tracking-tight text-white/90 transition active:scale-95 disabled:opacity-35 touch-manipulation cursor-pointer";

export function MorphAiStudioPage() {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const limitGate = useMorphLimitGate();
  const { sharing: storySharing, shareToStory, storyModal } = useMorfAiStoryShare("studio");
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
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("hair_color");
  const [comparing, setComparing] = useState(false);
  const [shareNudge, setShareNudge] = useState(false);
  const [newsPulse, setNewsPulse] = useState<NewsAction | null>(null);
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

  const allPresets = useMemo(
    () => categories.flatMap((c) => c.options.map((o) => ({ ...o, categoryId: c.id }))),
    [categories],
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

  useEffect(() => {
    if (!newsPulse) return;
    const timer = window.setTimeout(() => setNewsPulse(null), 2200);
    return () => window.clearTimeout(timer);
  }, [newsPulse]);

  useEffect(() => {
    if (!shareNudge) return;
    const timer = window.setTimeout(() => setShareNudge(false), 5200);
    return () => window.clearTimeout(timer);
  }, [shareNudge]);

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
    setActivePresetLabel(null);
    setComparing(false);
    setShareNudge(false);
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
    if (!original || loadingId) return;
    if (!(await limitGate.ensureStudio())) return;
    const presetMeta = allPresets.find((p) => p.id === presetId);
    if (presetMeta?.categoryId) setActiveCategory(presetMeta.categoryId);
    setLoadingId(presetId);
    setActivePresetId(presetId);
    setComparing(false);
    try {
      const result = await generateMorphStudioEdit(original, presetId, {
        styleId: draftMeta.styleId,
        styleTitle: draftMeta.styleTitle,
      });
      setHistory((prev) => [...prev, result.preview_image]);
      setCurrent(result.preview_image);
      setActivePresetLabel(result.preset_label);
      setShareNudge(true);
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

  const surpriseLook = () => {
    if (!allPresets.length || loadingId) return;
    const pool = allPresets.filter((p) => p.id !== activePresetId);
    const pick = (pool.length ? pool : allPresets)[
      Math.floor(Math.random() * (pool.length ? pool.length : allPresets.length))
    ];
    if (pick) void applyPreset(pick.id);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const next = history.slice(0, -1);
    setHistory(next);
    setCurrent(next[next.length - 1] ?? original);
    setComparing(false);
    if (next.length <= 1) {
      setActivePresetId(null);
      setActivePresetLabel(null);
      setShareNudge(false);
    }
  };

  const resetOriginal = () => {
    if (!original) return;
    setCurrent(original);
    setHistory([original]);
    setActivePresetId(null);
    setActivePresetLabel(null);
    setComparing(false);
    setShareNudge(false);
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

  const handleShareStory = () => {
    if (!current) return;
    void shareToStory({
      styleId: draftMeta.styleId || activePresetId || "studio",
      title:
        draftMeta.styleTitle ||
        activePresetLabel ||
        t("aiStylePage.studio.title", { defaultValue: "AI Studio" }),
      imageUrl: current,
    });
  };

  const compareSrc = beforeImage || original;
  const canCompare = Boolean(hasEditsReady(history, current, compareSrc));
  const displaySrc = comparing && compareSrc ? compareSrc : current;

  const onNewsTap = (item: (typeof NEWS_ITEMS)[number]) => {
    setNewsPulse(item.id);
    if (item.categoryId) {
      setActiveCategory(item.categoryId);
      toast.message(
        t(`aiStylePage.studio.news.${item.id}.body`, {
          defaultValue: "",
        }),
      );
      return;
    }
    if (item.id === "compare") {
      toast.message(t("aiStylePage.studio.holdToCompare"));
      return;
    }
    if (item.id === "plan") {
      void limitGate.ensureStudio();
    }
  };

  const showPicker = !current || pickerOpen;
  const hasEdits = history.length > 1;
  const motionDur = reduceMotion ? 0 : undefined;
  const busy = Boolean(loadingId);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#070707] text-white">
      <style>{`
        @keyframes morf-studio-scan {
          0% { transform: translateY(-100%); opacity: 0; }
          20% { opacity: 0.55; }
          80% { opacity: 0.55; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes morf-studio-chip-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .morf-studio-scan,
          .morf-studio-chip-in { animation: none !important; }
        }
        .morf-studio-scan {
          animation: morf-studio-scan 2.8s ease-in-out infinite;
        }
        .morf-studio-chip-in {
          animation: morf-studio-chip-in 0.4s ease-out both;
        }
      `}</style>

      {showPicker ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(255,255,255,0.1),transparent_50%),radial-gradient(ellipse_at_100%_80%,rgba(180,180,180,0.05),transparent_40%)]"
        />
      ) : null}

      <AnimatePresence mode="wait">
        {showPicker ? (
          <motion.div
            key="picker"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: motionDur ?? 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex min-h-[100dvh] flex-col"
          >
            <header
              className="flex items-center justify-between gap-3 px-4 pb-2"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <Link
                to="/ai-style"
                className="grid size-10 place-items-center rounded-full border border-white/12 bg-white/[0.06] text-white touch-manipulation cursor-pointer active:scale-95"
                aria-label={t("common.back")}
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
              </Link>
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
                  Morf AI
                </p>
                <h1 className="truncate text-[15px] font-semibold tracking-tight">
                  {t("aiStylePage.studio.title")}
                </h1>
              </div>
              <div className="size-10" aria-hidden />
            </header>

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 mt-1 max-w-md">
                <h2 className="text-[1.7rem] font-semibold leading-[1.12] tracking-tight">
                  {t("aiStylePage.studio.pickTitle")}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-white/45">
                  {t("aiStylePage.studio.pickLabel")}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/50">
                  <Users className="h-3 w-3" />
                  {t("aiStylePage.studio.socialProof")}
                </p>
              </div>

              <div className="mb-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <Newspaper className="h-3.5 w-3.5 text-white/40" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    {t("aiStylePage.studio.newsTitle")}
                  </p>
                </div>
                <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 no-scrollbar">
                  {NEWS_ITEMS.map((item, index) => {
                    const Icon = item.Icon;
                    const pulsed = newsPulse === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.2),
                          duration: 0.3,
                        }}
                        onClick={() => onNewsTap(item)}
                        className={cn(
                          "flex w-[9.75rem] shrink-0 flex-col gap-2 rounded-[20px] border px-3.5 py-3 text-left touch-manipulation cursor-pointer active:scale-[0.98] transition duration-200",
                          pulsed
                            ? "border-white/35 bg-white/[0.12]"
                            : "border-white/10 bg-white/[0.05] hover:bg-white/[0.08]",
                        )}
                      >
                        <span className="grid size-8 place-items-center rounded-full bg-white/10">
                          <Icon className="h-3.5 w-3.5 text-white/85" />
                        </span>
                        <span>
                          <span className="block text-[12px] font-semibold tracking-tight text-white/95">
                            {t(`aiStylePage.studio.news.${item.id}.title`)}
                          </span>
                          <span className="mt-0.5 block text-[10px] leading-snug text-white/45">
                            {t(`aiStylePage.studio.news.${item.id}.body`)}
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="group relative flex min-h-[92px] flex-col items-start justify-between overflow-hidden rounded-[22px] bg-white px-4 py-3.5 text-left text-black shadow-lg shadow-white/10 touch-manipulation cursor-pointer active:scale-[0.98]"
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
                  className="group relative flex min-h-[92px] flex-col items-start justify-between overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.06] px-4 py-3.5 text-left backdrop-blur-md touch-manipulation cursor-pointer active:scale-[0.98]"
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
                      {t("aiStylePage.studio.fromHistory")}
                    </p>
                    <span className="text-[11px] text-white/30">{sources.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pb-4 sm:grid-cols-4">
                    {sources.map((item, index) => (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: reduceMotion ? 0 : Math.min(index * 0.03, 0.24),
                          duration: 0.28,
                        }}
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
                          className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
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
                    {t("aiStylePage.studio.emptyHistory")}
                  </p>
                  <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-white/40">
                    {t("aiStylePage.studio.emptyHint")}
                  </p>
                </div>
              )}

              {current && pickerOpen ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="mt-3 w-full rounded-2xl border border-white/12 bg-white/[0.06] py-3.5 text-sm font-semibold backdrop-blur-md cursor-pointer"
                >
                  {t("aiStylePage.studio.keepEditing")}
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: motionDur ?? 0.25 }}
            className="relative flex min-h-[100dvh] flex-col"
          >
            {/* Full-viewport canvas — object-contain = zoom emas, butun rasm */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-[#070707]">
              <AnimatePresence mode="sync" initial={false}>
                {displaySrc ? (
                  <motion.img
                    key={`${displaySrc}-${comparing ? "before" : "after"}`}
                    src={displaySrc}
                    alt=""
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: motionDur ?? 0.28 }}
                    className="absolute inset-0 h-full w-full object-contain object-center"
                    decoding="async"
                  />
                ) : null}
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75" />
            </div>

            <AnimatePresence>
              {busy ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                >
                  {!reduceMotion ? (
                    <div className="absolute inset-x-0 top-0 h-1/2 morf-studio-scan bg-gradient-to-b from-transparent via-white/12 to-transparent" />
                  ) : null}
                  <div className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3.5 py-2 backdrop-blur-md">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white/90" />
                    <span className="text-[11px] font-semibold tracking-tight text-white/90">
                      {t("aiStylePage.studio.generating")}
                    </span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div
              className="pointer-events-none relative z-10 flex justify-center"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
                Morf · Studio
              </span>
            </div>

            <AnimatePresence>
              {comparing ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="pointer-events-none relative z-10 mt-3 flex justify-center"
                >
                  <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    {t("aiStylePage.studio.comparing")}
                  </span>
                </motion.div>
              ) : shareNudge && hasEdits ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  className="pointer-events-none relative z-10 mt-3 flex justify-center px-4"
                >
                  <span className="morf-studio-chip-in max-w-[92%] truncate rounded-full border border-white/20 bg-white/90 px-3.5 py-1.5 text-center text-[11px] font-semibold text-black shadow-lg">
                    {t("aiStylePage.studio.shareNudge")}
                  </span>
                </motion.div>
              ) : activePresetLabel && hasEdits ? (
                <div className="pointer-events-none relative z-10 mt-3 flex justify-center">
                  <span className="morf-studio-chip-in rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    {t("aiStylePage.studio.appliedChip", {
                      name: activePresetLabel,
                      defaultValue: "{{name}} · qo‘llandi",
                    })}
                  </span>
                </div>
              ) : null}
            </AnimatePresence>

            <div className="relative z-10 min-h-0 flex-1" />

            {/* Bottom control deck — back + tools live here */}
            <div
              className="relative z-30 px-3 pt-2"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <div className="overflow-hidden rounded-[26px] border border-white/12 bg-[#101010]/0.92 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <div className="space-y-2.5 px-3 pb-3 pt-3">
                  {/* Tools row: back, compare, undo, reset, change, surprise */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <Link
                      to="/ai-style"
                      className={cn(toolBtn, "shrink-0 size-9 px-0")}
                      aria-label={t("common.back")}
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                    </Link>
                    <button
                      type="button"
                      disabled={busy || !canCompare}
                      onPointerDown={() => canCompare && setComparing(true)}
                      onPointerUp={() => setComparing(false)}
                      onPointerLeave={() => setComparing(false)}
                      onPointerCancel={() => setComparing(false)}
                      onContextMenu={(e) => e.preventDefault()}
                      className={cn(
                        toolBtn,
                        "shrink-0",
                        comparing && "border-white bg-white text-black",
                      )}
                      aria-label={t("aiStylePage.studio.holdToCompare")}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{t("aiStylePage.beforeAfter.before", { defaultValue: "Before" })}</span>
                    </button>
                    <button
                      type="button"
                      onClick={undo}
                      disabled={busy || !hasEdits}
                      className={cn(toolBtn, "shrink-0")}
                      aria-label={t("aiStylePage.studio.undo")}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={resetOriginal}
                      disabled={busy || current === original}
                      className={cn(toolBtn, "shrink-0")}
                      aria-label={t("aiStylePage.studio.reset")}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      disabled={busy}
                      className={cn(toolBtn, "shrink-0")}
                      aria-label={t("aiStylePage.studio.changePhoto")}
                    >
                      <Images className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={surpriseLook}
                      disabled={busy}
                      className={cn(
                        toolBtn,
                        "ml-auto shrink-0 border-white/20 bg-white text-black hover:bg-white/90",
                      )}
                      title={t("aiStylePage.studio.surpriseHint")}
                    >
                      <Dices className="h-3.5 w-3.5" />
                      {t("aiStylePage.studio.surprise")}
                    </button>
                  </div>

                  <div className="flex gap-1 rounded-2xl bg-white/[0.05] p-1">
                    {categories.map((cat) => {
                      const active = cat.id === (currentCat?.id ?? activeCategory);
                      const CatIcon = studioCategoryIcon(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "relative flex min-h-9 flex-1 items-center justify-center gap-1 rounded-[12px] px-1.5 text-[11px] font-semibold tracking-tight transition-colors duration-200 touch-manipulation cursor-pointer sm:text-[12px]",
                            active ? "text-black" : "text-white/55 hover:text-white/80",
                          )}
                        >
                          {active ? (
                            <motion.span
                              layoutId={reduceMotion ? undefined : "studio-cat-pill"}
                              className="absolute inset-0 rounded-[12px] bg-white shadow-sm"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            />
                          ) : null}
                          <span className="relative z-10 inline-flex items-center gap-1">
                            <CatIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                            <span className="truncate">{labelFor(cat, i18n.language)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentCat?.id ?? activeCategory}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: motionDur ?? 0.22 }}
                      className="-mx-0.5 flex gap-2.5 overflow-x-auto px-0.5 pb-0.5 no-scrollbar"
                    >
                      {(currentCat?.options ?? []).map((opt, index) => {
                        const optBusy = loadingId === opt.id;
                        const selected = activePresetId === opt.id && !loadingId;
                        const swatch =
                          "swatch" in opt ? (opt.swatch as string | undefined) : undefined;
                        const PresetIcon = studioPresetIcon(opt.id);
                        return (
                          <motion.button
                            key={opt.id}
                            type="button"
                            disabled={busy}
                            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: reduceMotion ? 0 : Math.min(index * 0.03, 0.18),
                              duration: 0.22,
                            }}
                            onClick={() => void applyPreset(opt.id)}
                            className={cn(
                              "flex w-[4.35rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 transition duration-200 touch-manipulation cursor-pointer active:scale-[0.96] disabled:opacity-50",
                              selected && "bg-white/[0.08]",
                            )}
                          >
                            <span
                              className={cn(
                                "relative grid size-[3.1rem] place-items-center overflow-hidden rounded-full transition duration-200",
                                selected
                                  ? "ring-[2.5px] ring-white ring-offset-2 ring-offset-[#101010]"
                                  : "ring-1 ring-white/20",
                              )}
                              style={{
                                background: swatch
                                  ? `linear-gradient(145deg, ${swatch} 0%, ${swatch} 55%, #1a1a1a 100%)`
                                  : "linear-gradient(145deg, #3a3a3a, #141414)",
                              }}
                            >
                              {optBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin text-white drop-shadow" />
                              ) : selected ? (
                                <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={2.5} />
                              ) : !swatch ? (
                                <PresetIcon className="h-4 w-4 text-white/90 drop-shadow" />
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
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>

                  <div
                    className={cn(
                      "grid gap-2 pt-0.5",
                      hasEdits ? "grid-cols-[1fr_1fr_1.2fr]" : "grid-cols-[1fr_1.35fr]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void handleDownload()}
                      disabled={!current || downloading || busy}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/[0.07] text-[13px] font-semibold tracking-tight disabled:opacity-40 cursor-pointer touch-manipulation"
                    >
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {t("aiStylePage.download")}
                    </button>
                    {hasEdits ? (
                      <button
                        type="button"
                        onClick={handleShareStory}
                        disabled={busy || storySharing || !current}
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-white/15 text-[13px] font-semibold tracking-tight disabled:opacity-40 cursor-pointer touch-manipulation"
                      >
                        {storySharing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Share2 className="h-4 w-4" />
                        )}
                        {t("aiStylePage.studio.shareStory")}
                      </button>
                    ) : null}
                    <Link
                      to="/ai-style"
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-white text-[13px] font-semibold tracking-tight text-black shadow-lg shadow-white/10 cursor-pointer touch-manipulation active:scale-[0.98]"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                      {t("aiStylePage.studio.done")}
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
      {storyModal}
    </div>
  );
}

function hasEditsReady(
  history: string[],
  current: string | null,
  compareSrc: string | null,
): boolean {
  if (!current || !compareSrc) return false;
  if (history.length > 1) return current !== compareSrc;
  return current !== compareSrc;
}
