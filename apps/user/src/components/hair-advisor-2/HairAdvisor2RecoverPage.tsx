import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HairConditionAsk } from "@/components/ai-style/HairConditionAsk";
import {
  confirmHairScanIngredients,
  createProductSubmission,
  fetchHairScan,
  type HairScanDetail,
} from "@/lib/api/hair-advisor";
import { useHairCareProfile } from "@/hooks/use-hair-care-profile";
import { navigateBack } from "@/lib/mobile-back";
import { prepareSelfieFromFile } from "@/lib/selfie-image";

type Props = {
  scanId: string;
  scanPath: string;
  resultPath: (scanId: string) => string;
};

export function HairAdvisor2RecoverPage({ scanId, scanPath, resultPath }: Props) {
  const router = useRouter();
  const profileQ = useHairCareProfile();
  const [scan, setScan] = useState<HairScanDetail | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [needProfile, setNeedProfile] = useState(false);

  useEffect(() => {
    void fetchHairScan(scanId)
      .then((s) => {
        setScan(s);
        const draft = s.ingredients_draft?.length ? [...s.ingredients_draft] : [];
        setIngredients(draft);
      })
      .catch(() => toast.error("Skan topilmadi"));
  }, [scanId]);

  useEffect(() => {
    if (profileQ.data && !profileQ.data.complete) setNeedProfile(true);
  }, [profileQ.data]);

  const notFound = scan?.status === "product_not_found";

  const onLabel = async (file: File) => {
    if (!scan) return;
    setBusy(true);
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      const out = (await createProductSubmission({
        hair_scan_id: scan.id,
        barcode: scan.barcode,
        ingredient_label_image: dataUrl,
        finalize: false,
      })) as { normalized_ingredients?: string[]; message_uz?: string };
      const list = out.normalized_ingredients ?? [];
      if (list.length) setIngredients(list);
      else void fetchHairScan(scan.id).then((fresh) => {
        if (fresh.ingredients_draft?.length) setIngredients([...fresh.ingredients_draft]);
      });
      toast.message(out.message_uz ?? (notFound ? "Yuborildi. Admin tekshiradi." : "Tarkib o'qildi."));
      if (list.length) setNeedProfile(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rasm o'qilmadi");
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!scan) return;
    const list = ingredients.map((i) => i.trim()).filter(Boolean);
    if (!list.length) {
      toast.error("Kamida bitta ingredient kerak");
      return;
    }
    setBusy(true);
    try {
      const out = await confirmHairScanIngredients(scan.id, list);
      void router.navigate({ to: resultPath(out.scan.id) as never });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Tahlil xatosi";
      if (msg.includes("profil")) setNeedProfile(true);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (needProfile && !profileQ.data?.complete) {
    return (
      <div className="min-h-[100dvh] bg-white px-5 text-[#111]">
        <button type="button" onClick={() => navigateBack(router, scanPath)} className="mt-4">
          <ChevronLeft />
        </button>
        <HairConditionAsk
          lead="Aniq tavsiya uchun soch profilingizni to'ldiring. Skan natijangiz saqlanadi."
          onDone={() => {
            setNeedProfile(false);
            void profileQ.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white px-5 pb-12 text-[#111]" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      <button type="button" aria-label="Orqaga" onClick={() => navigateBack(router, scanPath)}>
        <ChevronLeft className="size-6" />
      </button>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {notFound ? "Mahsulot topilmadi" : "Tarkib kerak"}
      </h1>
      <p className="mt-2 text-sm text-[#71717A]">
        {notFound
          ? "Mahsulot bazamizda yo'q. Tarkib yorlig'i fotosini yuboring — admin tekshiradi."
          : "To'liq INCI hali tasdiqlanmagan. Yorliq rasmini yuklang yoki ingredientlarni tasdiqlang."}
      </p>

      <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#E8E8EB] bg-[#F7F7F8] px-4 py-10 text-center">
        <span className="text-sm font-semibold">Tarkib yorlig'i rasmi</span>
        <span className="mt-1 text-xs text-[#71717A]">JPEG yoki PNG</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onLabel(f);
          }}
        />
      </label>

      {ingredients.length > 0 ? (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-semibold">Aniqlangan tarkib</p>
          {ingredients.map((ing, idx) => (
            <div key={`${ing}-${idx}`} className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-[#E8E8EB] px-3 py-2 text-sm"
                value={ing}
                onChange={(e) => {
                  const next = [...ingredients];
                  next[idx] = e.target.value;
                  setIngredients(next);
                }}
              />
              <button type="button" aria-label="O'chirish" onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium"
            onClick={() => setIngredients([...ingredients, ""])}
          >
            <Plus className="size-4" /> Ingredient qo'shish
          </button>
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy || ingredients.length === 0}
        onClick={() => void analyze()}
        className="mt-8 flex h-14 w-full items-center justify-center rounded-[18px] bg-[#111111] text-base font-semibold text-white disabled:opacity-40"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : "Tahlil qilish"}
      </button>
    </div>
  );
}