import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ChevronLeft,
  Download,
  ImagePlus,
  Loader2,
  Palette,
  RotateCcw,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStylePhotoInput } from "@/components/ai-style/AiStyleUi";
import {
  fetchMorphStudioCatalog,
  generateMorphStudioEdit,
  type MorphStudioCategory,
} from "@/lib/api/ai";
import { downloadAiStyleImage } from "@/lib/ai-style-image";
import {
  FACE_HISTORY_UPDATED_EVENT,
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

function labelFor(
  item: { label_uz: string; label_en: string },
  lang: string,
): string {
  return lang.startsWith("en") ? item.label_en : item.label_uz;
}

type SourceItem = {
  id: string;
  title: string;
  image: string;
  styleId?: string;
  kind: "generation" | "selfie";
};

export function MorphAiStudioPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftMeta, setDraftMeta] = useState<Pick<MorphStudioDraft, "styleId" | "styleTitle" | "source">>({});
  const [original, setOriginal] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("hair_color");
  const [generations, setGenerations] = useState<MorphAiGeneration[]>(() => loadMorphAiGenerations());
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
      setOriginal(draft.image);
      setCurrent(draft.image);
      setHistory([draft.image]);
      setDraftMeta({
        styleId: draft.styleId,
        styleTitle: draft.styleTitle,
        source: draft.source,
      });
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      setGenerations(loadMorphAiGenerations());
      setSelfies(loadFaceProfileHistory());
    };
    refresh();
    window.addEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, refresh);
    window.addEventListener(FACE_HISTORY_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, refresh);
      window.removeEventListener(FACE_HISTORY_UPDATED_EVENT, refresh);
    };
  }, []);

  const sources: SourceItem[] = useMemo(() => {
    const fromGen = generations.map((g) => ({
      id: `gen-${g.id}`,
      title: g.title || "Try-on",
      image: g.previewImage,
      styleId: g.styleId,
      kind: "generation" as const,
    }));
    const fromSelfie = selfies
      .filter((s) => s.photoDataUrl)
      .map((s) => ({
        id: `selfie-${s.id}`,
        title: t("aiStylePage.studio.selfie", { defaultValue: "Selfie" }),
        image: s.photoDataUrl,
        kind: "selfie" as const,
      }));
    return [...fromGen, ...fromSelfie].slice(0, 24);
  }, [generations, selfies, t]);

  const selectImage = (
    image: string,
    meta?: { styleId?: string; styleTitle?: string; source?: MorphStudioDraft["source"] },
  ) => {
    setOriginal(image);
    setCurrent(image);
    setHistory([image]);
    setDraftMeta({
      styleId: meta?.styleId,
      styleTitle: meta?.styleTitle,
      source: meta?.source,
    });
    stashMorphStudioDraft({
      image,
      styleId: meta?.styleId,
      styleTitle: meta?.styleTitle,
      source: meta?.source,
    });
    setPickerOpen(false);
  };

  const applyPreset = async (presetId: string) => {
    if (!current || loadingId) return;
    setLoadingId(presetId);
    try {
      const result = await generateMorphStudioEdit(current, presetId, {
        styleId: draftMeta.styleId,
        styleTitle: draftMeta.styleTitle,
      });
      setHistory((prev) => [...prev, result.preview_image]);
      setCurrent(result.preview_image);
      stashMorphStudioDraft({
        image: result.preview_image,
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
        beforeImage: original ?? undefined,
      });
      toast.success(
        t("aiStylePage.studio.applied", {
          name: result.preset_label,
          defaultValue: "{{name}} qo‘llandi",
        }),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : t("aiStylePage.studio.failed");
      const needsSub = /obuna|Bepul Morph|Studio|limiti tugadi/i.test(message);
      if (needsSub) {
        toast.error(message, {
          action: {
            label: t("subscriptions.subscribe", { defaultValue: "Obuna bo'lish" }),
            onClick: () => {
              void navigate({ to: "/wallet", search: { section: "subscriptions" } });
            },
          },
          duration: 8_000,
        });
      } else {
        toast.error(message);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    const next = history.slice(0, -1);
    setHistory(next);
    setCurrent(next[next.length - 1] ?? original);
  };

  const resetOriginal = () => {
    if (!original) return;
    setCurrent(original);
    setHistory([original]);
  };

  const onFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      const prepared = await prepareSelfieDataUrl(dataUrl);
      selectImage(prepared, { source: "gallery", styleTitle: "Studio" });
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#070707] text-white">
      <header
        className="relative z-20 flex items-center justify-between gap-3 px-4 pb-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <Link
          to="/ai-style"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3.5 py-2 text-sm font-bold backdrop-blur-md touch-manipulation"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          {t("common.back")}
        </Link>
        <div className="min-w-0 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            Morf AI
          </p>
          <h1 className="truncate text-sm font-bold">
            {t("aiStylePage.studio.title", { defaultValue: "AI Studio" })}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex min-h-11 items-center rounded-full border border-white/12 bg-white/10 px-3 text-xs font-bold backdrop-blur-md touch-manipulation"
        >
          {t("aiStylePage.studio.changePhoto", { defaultValue: "Rasm" })}
        </button>
      </header>

      <AnimatePresence mode="wait">
        {showPicker ? (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                {t("aiStylePage.studio.pickLabel", { defaultValue: "Rasm tanlang" })}
              </p>
              <p className="mt-1 text-lg font-bold leading-tight">
                {t("aiStylePage.studio.pickTitle", {
                  defaultValue: "History, try-on yoki yangi selfie",
                })}
              </p>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-black touch-manipulation active:scale-[0.98]"
              >
                <Camera className="h-4 w-4" />
                {t("aiStylePage.openCamera")}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 text-sm font-bold touch-manipulation active:scale-[0.98]"
              >
                <ImagePlus className="h-4 w-4" />
                {t("aiStylePage.pickFromGallery")}
              </button>
            </div>

            {sources.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {t("aiStylePage.studio.fromHistory", { defaultValue: "History / Try-on" })}
                </p>
                <div className="grid grid-cols-3 gap-2 pb-4">
                  {sources.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        selectImage(item.image, {
                          styleId: item.styleId,
                          styleTitle: item.title,
                          source: item.kind === "generation" ? "generation" : "history",
                        })
                      }
                      className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5 touch-manipulation active:scale-[0.98]"
                    >
                      <img src={item.image} alt="" className="h-full w-full object-cover object-top" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-6">
                        <p className="truncate text-[10px] font-bold">{item.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 px-6 text-center">
                <Palette className="mb-3 h-8 w-8 text-white/35" />
                <p className="text-sm font-bold text-white/80">
                  {t("aiStylePage.studio.emptyHistory", {
                    defaultValue: "Hali try-on yoki selfie yo‘q",
                  })}
                </p>
                <p className="mt-1 text-xs text-white/45">
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
                className="mt-3 w-full rounded-2xl border border-white/15 py-3.5 text-sm font-bold"
              >
                {t("aiStylePage.studio.keepEditing", { defaultValue: "Tahrirni davom ettirish" })}
              </button>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-[28px] bg-neutral-900">
              {current ? (
                <img
                  src={current}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              ) : null}
              {loadingId ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[2px]">
                  <Loader2 className="h-9 w-9 animate-spin text-white" />
                  <p className="text-sm font-semibold text-white">
                    {t("aiStylePage.studio.generating", {
                      defaultValue: "AI tahrir qo‘llanmoqda…",
                    })}
                  </p>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
              <div className="absolute right-3 top-3 flex gap-1.5">
                <button
                  type="button"
                  onClick={undo}
                  disabled={Boolean(loadingId) || history.length <= 1}
                  className="pointer-events-auto grid size-10 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md disabled:opacity-35"
                  aria-label={t("aiStylePage.studio.undo")}
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetOriginal}
                  disabled={Boolean(loadingId) || current === original}
                  className="pointer-events-auto grid size-10 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md disabled:opacity-35"
                  aria-label={t("aiStylePage.studio.reset")}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              className="shrink-0 space-y-3 px-4 pt-3"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar">
                {categories.map((cat) => {
                  const active = cat.id === (currentCat?.id ?? activeCategory);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold transition-colors touch-manipulation",
                        active ? "bg-white text-black" : "bg-white/10 text-white/75",
                      )}
                    >
                      {labelFor(cat, i18n.language)}
                    </button>
                  );
                })}
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 no-scrollbar">
                {(currentCat?.options ?? []).map((opt) => {
                  const busy = loadingId === opt.id;
                  const swatch = "swatch" in opt ? (opt.swatch as string | undefined) : undefined;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={Boolean(loadingId)}
                      onClick={() => void applyPreset(opt.id)}
                      className={cn(
                        "flex w-[4.75rem] shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2.5 touch-manipulation active:scale-[0.97] disabled:opacity-50",
                      )}
                    >
                      <span
                        className="relative grid size-11 place-items-center overflow-hidden rounded-full ring-2 ring-white/15"
                        style={{
                          background: swatch
                            ? `linear-gradient(145deg, ${swatch}, #1a1a1a)`
                            : "linear-gradient(145deg, #2a2a2a, #111)",
                        }}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-white/80" />
                        )}
                      </span>
                      <span className="w-full truncate text-center text-[10px] font-bold leading-tight">
                        {labelFor(opt, i18n.language)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={!current || downloading || Boolean(loadingId)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 text-sm font-bold disabled:opacity-40"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {t("aiStylePage.download")}
                </button>
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/ai-style" })}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-black"
                >
                  {t("aiStylePage.studio.done", { defaultValue: "Tayyor" })}
                </button>
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
            selectImage(prepared, { source: "camera", styleTitle: "Studio" });
          });
        }}
      />
    </div>
  );
}
