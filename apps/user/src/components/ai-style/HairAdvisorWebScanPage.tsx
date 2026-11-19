import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  confirmHairScanIngredients,
  createHairScan,
  createProductSubmission,
  addHairRoutineProduct,
  compareHairProducts,
  fetchHairScanHistory,
  fetchProductSubmissions,
  submitHairFeedback,
  type HairAnalysis,
  type HairScan,
} from "@/lib/api/hair-advisor";
import { prepareSelfieFromFile } from "@/lib/selfie-image";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

export function HairAdvisorWebScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [scan, setScan] = useState<HairScan | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<HairAnalysis | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [compareId, setCompareId] = useState("");
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const historyQ = useQuery({
    queryKey: ["hair-advisor", "history"],
    queryFn: fetchHairScanHistory,
  });
  const submissionsQ = useQuery({
    queryKey: ["hair-advisor", "submissions"],
    queryFn: fetchProductSubmissions,
  });

  const runBarcode = useCallback(async () => {
    const code = barcode.replace(/\D/g, "");
    if (code.length < 8) {
      toast.error("Barcode kamida 8 raqam bo'lishi kerak.");
      return;
    }
    setBusy(true);
    try {
      const created = await createHairScan({ input_method: "barcode", barcode: code });
      setScan(created);
      if (created.status === "product_not_found") {
        setMessage(created.message_uz ?? "Mahsulot bazamizda topilmadi.");
        setStep(1);
      } else if (created.ingredients_draft?.length) {
        setIngredients([...created.ingredients_draft]);
        setStep(2);
        setMessage(created.message_uz ?? null);
      } else {
        setStep(1);
        setMessage("Tarkib yorlig'i rasmini yuklang.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }, [barcode]);

  const onLabelFile = async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      const created = await createHairScan({ input_method: "gallery", image: dataUrl });
      setScan(created);
      setIngredients(created.ingredients_draft?.length ? [...created.ingredients_draft] : []);
      if (created.ingredients_draft?.length) setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rasm o'qilmadi");
    } finally {
      setBusy(false);
    }
  };

  const submitUnknown = async (file: File) => {
    if (!scan) return;
    setBusy(true);
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      const out = await createProductSubmission({
        hair_scan_id: scan.id,
        barcode: scan.barcode,
        ingredient_label_image: dataUrl,
        finalize: false,
      });
      const list = (out as { normalized_ingredients?: string[] }).normalized_ingredients ?? [];
      if (list.length) {
        setIngredients(list);
        setStep(2);
      }
      setMessage(
        (out as { message_uz?: string }).message_uz ?? "Mahsulot ma'lumotlari tekshiruvga yuborildi.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuborilmadi");
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!scan || ingredients.length < 1) return;
    setBusy(true);
    setStep(3);
    try {
      const out = await confirmHairScanIngredients(scan.id, ingredients);
      setAnalysis(out.analysis);
      setStep(4);
    } catch (e) {
      setStep(2);
      toast.error(e instanceof Error ? e.message : "Tahlil xatosi");
    } finally {
      setBusy(false);
    }
  };

  const disclaimer =
    analysis?.result?.disclaimer_uz ??
    (analysis?.result?.catalog_tier === "verified"
      ? "Mahsulot ma'lumotlari MySaloon tomonidan tekshirilgan."
      : "Bu dastlabki tahlil. Mahsulot tarkibi hali MySaloon tomonidan tasdiqlanmagan.");

  return (
    <div
      className="min-h-[100dvh] bg-[#FAFAFA] text-[#111111]"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <motionHeader onBack={() => navigateBack(router, "/ai-style/care")} />
      <div className="mx-auto max-w-lg space-y-6 px-5 pb-16 pt-4">
        <div className="flex gap-2 text-xs font-medium text-[#111]/50">
          {["Mahsulot", "Tarkib", "Tahlil", "Natija"].map((label, i) => (
            <span
              key={label}
              className={cn(
                "rounded-full px-3 py-1",
                step >= (i + 1) as Step ? "bg-[#111] text-white" : "bg-[#111]/10",
              )}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {message ? <p className="text-center text-sm font-medium text-emerald-700">{message}</p> : null}

        {step === 1 && (
          <div className="space-y-4 rounded-2xl border border-[#111]/10 bg-white p-5 shadow-sm">
            <label className="text-sm font-semibold">Barcode</label>
            <input
              className="w-full rounded-xl border border-[#111]/15 px-4 py-3 text-base"
              inputMode="numeric"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="4006381333931"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void runBarcode()}
              className="w-full rounded-xl bg-[#111] py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="mx-auto size-5 animate-spin" /> : "Barcode tekshirish"}
            </button>
            <label className="block text-sm font-semibold">Tarkib yorlig'i rasmi</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (scan?.status === "product_not_found") void submitUnknown(f);
                  else void onLabelFile(f);
                }
              }}
              className="text-sm"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 rounded-2xl border border-[#111]/10 bg-white p-5">
            <p className="text-sm font-semibold">Tarkibni tasdiqlang yoki tahrirlang</p>
            {ingredients.map((ing, idx) => (
              <div key={`${ing}-${idx}`} className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-[#111]/15 px-3 py-2 text-sm"
                  value={ing}
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[idx] = e.target.value;
                    setIngredients(next);
                  }}
                />
                <button
                  type="button"
                  className="rounded-lg border border-[#111]/15 p-2"
                  onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                >
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
            <button
              type="button"
              disabled={busy}
              onClick={() => void analyze()}
              className="w-full rounded-xl bg-[#111] py-3 text-sm font-semibold text-white"
            >
              Tahlil qilish
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-[#111]/40" />
            <p className="text-sm font-medium">Tahlil qilinmoqda…</p>
          </div>
        )}

        {step === 4 && analysis && (
          <div className="space-y-4 rounded-2xl border border-[#111]/10 bg-white p-5">
            <p className="text-xs text-[#111]/60">{disclaimer}</p>
            <p className="text-base font-semibold leading-relaxed">{analysis.explanation_uz}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#111]/80">
              {(analysis.result.explanation?.summary_bullets_uz ?? []).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                className="w-full rounded-xl bg-[#111] py-2 text-sm font-semibold text-white"
                onClick={() => void submitHairFeedback({ analysis_id: analysis.id, helpful: true }).then(() => toast.success("Rahmat!"))}
              >
                Foydali deb belgilash
              </button>
              {scan?.care_product?.id ? (
                <button
                  type="button"
                  className="w-full rounded-xl border border-[#111]/20 py-2 text-sm font-semibold"
                  onClick={() =>
                    void addHairRoutineProduct({
                      care_product_id: scan.care_product.id,
                      slot: "shampoo",
                    }).then(() => toast.success("Rutinaga qo'shildi"))
                  }
                >
                  Rutinaga qo&apos;shish
                </button>
              ) : null}
            </div>
            <div className="space-y-2 border-t border-[#111]/10 pt-3">
              <p className="text-xs font-semibold">Mahsulotni solishtirish</p>
              <input
                className="w-full rounded-lg border border-[#111]/15 px-3 py-2 text-sm"
                placeholder="Boshqa care_product ID"
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
              />
              <button
                type="button"
                disabled={!scan?.care_product?.id || !compareId}
                className="w-full rounded-lg border border-[#111]/20 py-2 text-sm"
                onClick={async () => {
                  try {
                    const mine = scan?.care_product?.id;
                    const other = Number(compareId);
                    if (!mine || !other) return;
                    const out = await compareHairProducts([mine, other]);
                    setCompareResult(JSON.stringify(out.result).slice(0, 400));
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Solishtirish xatosi");
                  }
                }}
              >
                Solishtirish
              </button>
              {compareResult ? <pre className="max-h-32 overflow-auto text-xs">{compareResult}</pre> : null}
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-[#111]/20 py-3 text-sm font-semibold"
              onClick={() => {
                setStep(1);
                setScan(null);
                setAnalysis(null);
                setIngredients([]);
                setMessage(null);
                void historyQ.refetch();
              }}
            >
              Yangi skan
            </button>
          </div>
        )}

        {(submissionsQ.data as unknown[] | undefined)?.length ? (
          <motionSubmissions items={(submissionsQ.data ?? []) as Array<{ id: string; status: string; barcode?: string }>} />
        ) : null}

        {(historyQ.data?.length ?? 0) > 0 ? (
          <motionHistory
            items={historyQ.data ?? []}
            onPick={(s) => {
              setScan(s);
              if (s.ingredients_draft?.length) {
                setIngredients([...s.ingredients_draft]);
                setStep(2);
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function motionSubmissions({
  items,
}: {
  items: Array<{ id: string; status: string; barcode?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[#111]/10 bg-white p-4">
      <h3 className="text-sm font-semibold">Topshiruvlarim</h3>
      <ul className="mt-2 space-y-1 text-xs text-[#111]/70">
        {items.slice(0, 6).map((s) => (
          <li key={s.id}>
            {s.barcode || s.id.slice(0, 8)} — {s.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

function motionHistory({
  items,
  onPick,
}: {
  items: HairScan[];
  onPick: (s: HairScan) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#111]/10 bg-white p-4">
      <h3 className="text-sm font-semibold">So&apos;nggi skanlar</h3>
      <ul className="mt-2 space-y-1 text-xs text-[#111]/70">
        {items.slice(0, 8).map((s) => (
          <li key={s.id}>
            <button type="button" className="underline" onClick={() => onPick(s)}>
              {s.barcode || s.id.slice(0, 8)} — {s.status}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function motionHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-5 py-2">
      <button type="button" onClick={onBack} className="rounded-full p-2 hover:bg-[#111]/5">
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="text-lg font-semibold tracking-tight">Hair Advisor skaner</h1>
    </div>
  );
}