import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  confirmHairScanProduct,
  fetchHairScan,
  type HairScanDetail,
} from "@/lib/api/hair-advisor";
import { resolveScanToAnalysis } from "@/components/hair-advisor-2/scan-flow";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";
import { recognitionMessageFromMeta } from "@/lib/hair-advisor-recognition-feedback";

type Props = {
  scanId: string;
  scanPath: string;
  resultPath: (id: string) => string;
};

export function HairAdvisor2ProductPickPage({ scanId, scanPath, resultPath }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [scan, setScan] = useState<HairScanDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await fetchHairScan(scanId);
      setScan(detail);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    void load();
  }, [load]);

  const candidates = scan?.product_candidates ?? [];
  const ocrBrand = scan?.recognition_meta?.ocr_brand;
  const ocrName = scan?.recognition_meta?.ocr_product_name;
  const title =
    recognitionMessageFromMeta(scan?.recognition_meta as Record<string, unknown> | undefined) ||
    "Mahsulotni tasdiqlang";

  const onPick = async (careProductId: number) => {
    setBusyId(careProductId);
    try {
      const updated = await confirmHairScanProduct(scanId, careProductId);
      const resolved = await resolveScanToAnalysis(updated);
      if ("needIngredients" in resolved) {
        void router.navigate({ to: `/ai-style/care/ingredient/recover/${scanId}` as never });
        return;
      }
      void router.navigate({ to: resultPath(resolved.scan.id) as never });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlanmadi");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-white">
        <Loader2 className="size-7 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  if (!candidates.length) {
    return (
      <div className="min-h-[100dvh] bg-white px-5 pt-16 text-center">
        <p className="text-lg font-semibold">Mahsulot topilmadi</p>
        <p className="mt-2 text-sm text-[#71717A]">Ishonchli nomzod yo‘q. Qayta skanerlang.</p>
        <button
          type="button"
          className="mt-6 rounded-2xl bg-[#111] px-6 py-3 text-sm font-semibold text-white"
          onClick={() => void router.navigate({ to: scanPath as never })}
        >
          Qayta skanerlash
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] text-[#111]">
      <header
        className="flex items-center gap-3 border-b border-[#ECECEC] bg-white px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button type="button" aria-label="Orqaga" onClick={() => navigateBack(router, scanPath)} className="size-10">
          <ChevronLeft className="size-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{title}</h1>
          {ocrBrand || ocrName ? (
            <p className="text-xs text-[#71717A]">AI: {[ocrBrand, ocrName].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
      </header>

      <p className="px-5 py-4 text-[15px] leading-relaxed text-[#52525B]">
        Bir nechta mos keluvchi mahsulot topildi. To‘g‘risini tanlang — faqat katalogdagi haqiqiy yozuvlar
        ko‘rsatiladi.
      </p>

      <div className="flex gap-2 px-4 pb-2">
        <button
          type="button"
          className="flex-1 rounded-2xl border border-[#E4E4E7] bg-white py-3 text-sm font-semibold"
          onClick={() => void router.navigate({ to: scanPath as never })}
        >
          Qayta skanerlash
        </button>
        <button
          type="button"
          className="flex-1 rounded-2xl border border-[#E4E4E7] bg-white py-3 text-sm font-semibold text-[#71717A]"
          onClick={() => void router.navigate({ to: scanPath as never })}
        >
          Bu mahsulotlar emas
        </button>
      </div>

      <ul className="space-y-3 px-4 pb-24">
        {candidates.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void onPick(p.id)}
              className={cn(
                "flex w-full gap-4 rounded-[20px] bg-white p-4 text-left shadow-sm ring-1 ring-[#E8E8EB] transition",
                busyId === p.id && "ring-2 ring-[#8B5CF6]",
              )}
            >
              {p.image_url ? (
                <img src={p.image_url} alt="" className="size-[72px] shrink-0 rounded-xl bg-[#F4F4F5] object-contain" />
              ) : (
                <div className="size-[72px] shrink-0 rounded-xl bg-[#F4F4F5]" />
              )}
              <div className="min-w-0 flex-1">
                {p.brand ? <p className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">{p.brand}</p> : null}
                <p className="text-[17px] font-semibold leading-snug">{p.name}</p>
                {typeof p.volume_ml === "number" && p.volume_ml > 0 ? (
                  <p className="mt-1 text-sm text-[#71717A]">{p.volume_ml} ml</p>
                ) : null}
                {p.is_verified ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#EAF7ED] px-2 py-0.5 text-xs font-semibold text-[#16803C]">
                    <ShieldCheck className="size-3.5" />
                    Tasdiqlangan
                  </span>
                ) : null}
              </div>
              {busyId === p.id ? <Loader2 className="size-5 animate-spin text-[#8B5CF6]" /> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
