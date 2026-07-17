import { useQuery } from "@tanstack/react-query";
import { Loader2, Palette, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  fetchMorphStudioCatalog,
  generateMorphStudioEdit,
  type MorphStudioCategory,
} from "@/lib/api/ai";
import { cn } from "@/lib/utils";

type Props = {
  image: string;
  onImageChange: (nextImage: string) => void;
  styleId?: string;
  styleTitle?: string;
  tone?: "light" | "dark";
};

const FALLBACK_CATEGORIES: MorphStudioCategory[] = [
  {
    id: "hair_color",
    label_uz: "Soch rangi",
    label_en: "Hair color",
    options: [
      { id: "hair_blonde", label_uz: "Sariq", label_en: "Blonde" },
      { id: "hair_brunette", label_uz: "Jigarrang", label_en: "Brunette" },
      { id: "hair_black", label_uz: "Qora", label_en: "Black" },
      { id: "hair_auburn", label_uz: "Qizil-jigarrang", label_en: "Auburn" },
      { id: "hair_ash", label_uz: "Kulrang", label_en: "Ash" },
      { id: "hair_platinum", label_uz: "Platina", label_en: "Platinum" },
      { id: "hair_highlights", label_uz: "Highlight", label_en: "Highlights" },
    ],
  },
  {
    id: "hair_style",
    label_uz: "Soch uslubi",
    label_en: "Hair style",
    options: [
      { id: "style_shorter", label_uz: "Qisqaroq", label_en: "Shorter" },
      { id: "style_longer", label_uz: "Uzunroq", label_en: "Longer" },
      { id: "style_curly", label_uz: "Jingalak", label_en: "Curly" },
      { id: "style_straight", label_uz: "Tekis", label_en: "Straight" },
      { id: "style_wavy", label_uz: "To'lqin", label_en: "Wavy" },
      { id: "style_volume", label_uz: "Hajmli", label_en: "Volume" },
      { id: "style_fade", label_uz: "Fade", label_en: "Fresh fade" },
    ],
  },
  {
    id: "skin_tone",
    label_uz: "Yuz rangi",
    label_en: "Skin tone",
    options: [
      { id: "skin_lighter", label_uz: "Yorug'roq", label_en: "Lighter" },
      { id: "skin_darker", label_uz: "Qorong'iroq", label_en: "Darker" },
      { id: "skin_warm", label_uz: "Iliq", label_en: "Warm" },
      { id: "skin_cool", label_uz: "Sovuq", label_en: "Cool" },
      { id: "skin_even", label_uz: "Tekis", label_en: "Even tone" },
      { id: "skin_glow", label_uz: "Yaltiroq", label_en: "Healthy glow" },
    ],
  },
  {
    id: "beard",
    label_uz: "Soqol",
    label_en: "Beard",
    options: [
      { id: "beard_clean", label_uz: "Toza soqol", label_en: "Clean shave" },
      { id: "beard_stubble", label_uz: "Qisqa soqol", label_en: "Stubble" },
      { id: "beard_full", label_uz: "To'liq soqol", label_en: "Full beard" },
      { id: "beard_shape", label_uz: "Shakllangan", label_en: "Shaped" },
    ],
  },
  {
    id: "look",
    label_uz: "Ko'rinish",
    label_en: "Look",
    options: [
      { id: "look_soft", label_uz: "Yumshoq", label_en: "Soft light" },
      { id: "look_sharp", label_uz: "Keskin", label_en: "Sharp contrast" },
      { id: "look_warm_light", label_uz: "Iliq yorug'", label_en: "Warm light" },
      { id: "look_cool_light", label_uz: "Sovuq yorug'", label_en: "Cool light" },
      { id: "look_wet", label_uz: "Nam soch", label_en: "Wet look" },
      { id: "look_matte", label_uz: "Matte", label_en: "Matte finish" },
    ],
  },
];

function categoryLabel(cat: MorphStudioCategory, lang: string): string {
  return lang.startsWith("en") ? cat.label_en : cat.label_uz;
}

function optionLabel(opt: { label_uz: string; label_en: string }, lang: string): string {
  return lang.startsWith("en") ? opt.label_en : opt.label_uz;
}

export function MorphStudioPanel({
  image,
  onImageChange,
  styleId,
  styleTitle,
  tone = "dark",
}: Props) {
  const { t, i18n } = useTranslation();
  const dark = tone === "dark";
  const catalogQ = useQuery({
    queryKey: ["morph-studio-catalog"],
    queryFn: fetchMorphStudioCatalog,
    staleTime: 60 * 60 * 1000,
  });

  const categories = catalogQ.data?.categories?.length
    ? catalogQ.data.categories
    : FALLBACK_CATEGORIES;

  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "hair_color");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [originalImage] = useState(image);
  const [history, setHistory] = useState<string[]>([image]);

  const currentCat = useMemo(
    () => categories.find((c) => c.id === activeCategory) ?? categories[0],
    [categories, activeCategory],
  );

  const applyPreset = async (presetId: string) => {
    if (loadingId) return;
    setLoadingId(presetId);
    try {
      const result = await generateMorphStudioEdit(image, presetId, {
        styleId,
        styleTitle,
      });
      setHistory((prev) => [...prev, result.preview_image]);
      onImageChange(result.preview_image);
      toast.success(
        t("aiStylePage.studio.applied", {
          name: result.preset_label,
          defaultValue: "{{name}} qo‘llandi",
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiStylePage.studio.failed"));
    } finally {
      setLoadingId(null);
    }
  };

  const undo = () => {
    if (history.length <= 1) {
      onImageChange(originalImage);
      setHistory([originalImage]);
      return;
    }
    const next = history.slice(0, -1);
    setHistory(next);
    onImageChange(next[next.length - 1] ?? originalImage);
  };

  const resetOriginal = () => {
    onImageChange(originalImage);
    setHistory([originalImage]);
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-[22px] border p-4",
        dark
          ? "border-white/12 bg-white/[0.06] text-white backdrop-blur-xl"
          : "border-border bg-neutral-50 text-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]",
              dark ? "text-white/55" : "text-muted-foreground",
            )}
          >
            <Palette className="h-3.5 w-3.5" />
            {t("aiStylePage.studio.title", { defaultValue: "Morf Studio" })}
          </p>
          <p className={cn("mt-1 text-sm font-bold", dark ? "text-white" : "text-foreground")}>
            {t("aiStylePage.studio.subtitle", {
              defaultValue: "Rang, uslub va ko‘rinishni o‘zgartiring",
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={Boolean(loadingId) || history.length <= 1}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-[11px] font-bold touch-manipulation disabled:opacity-40",
              dark ? "bg-white/10 text-white" : "bg-white text-foreground border border-border",
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("aiStylePage.studio.undo", { defaultValue: "Orqaga" })}
          </button>
          <button
            type="button"
            onClick={resetOriginal}
            disabled={Boolean(loadingId) || image === originalImage}
            className={cn(
              "inline-flex h-9 items-center rounded-xl px-2.5 text-[11px] font-bold touch-manipulation disabled:opacity-40",
              dark ? "bg-white/10 text-white" : "bg-white text-foreground border border-border",
            )}
          >
            {t("aiStylePage.studio.reset", { defaultValue: "Asliga" })}
          </button>
        </div>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 no-scrollbar">
        {categories.map((cat) => {
          const active = cat.id === (currentCat?.id ?? activeCategory);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors touch-manipulation",
                active
                  ? dark
                    ? "bg-white text-black"
                    : "bg-black text-white"
                  : dark
                    ? "bg-white/10 text-white/80"
                    : "bg-white text-muted-foreground border border-border",
              )}
            >
              {categoryLabel(cat, i18n.language)}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(currentCat?.options ?? []).map((opt) => {
          const busy = loadingId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={Boolean(loadingId)}
              onClick={() => void applyPreset(opt.id)}
              className={cn(
                "flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-bold touch-manipulation active:scale-[0.98] disabled:opacity-50",
                dark
                  ? "border border-white/15 bg-black/25 text-white"
                  : "border border-border bg-white text-foreground",
              )}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 opacity-70" />
              )}
              <span className="truncate">{optionLabel(opt, i18n.language)}</span>
            </button>
          );
        })}
      </div>

      {loadingId ? (
        <p className={cn("text-center text-[11px]", dark ? "text-white/60" : "text-muted-foreground")}>
          {t("aiStylePage.studio.generating", {
            defaultValue: "Studio o‘zgartirish qo‘llanmoqda…",
          })}
        </p>
      ) : null}
    </div>
  );
}
