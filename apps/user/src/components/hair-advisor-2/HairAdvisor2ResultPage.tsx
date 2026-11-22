import { useRouter } from "@tanstack/react-router";
import { Bookmark, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addHairRoutineProduct,
  compareHairProducts,
  fetchHairScan,
  type HairAnalysis,
  type HairScanDetail,
} from "@/lib/api/hair-advisor";
import { addMyCareProduct, fetchMyCareProducts } from "@/lib/api/care-products";
import { useHairCareProfile } from "@/hooks/use-hair-care-profile";
import { useCareProducts } from "@/hooks/use-care-products";
import { navigateBack } from "@/lib/mobile-back";
import { HAIR_ADVISOR_RESULT_DEMO, isHairAdvisorResultDemoScanId } from "./hair-advisor-result-demo";
import { HairAdvisor2ProductHeader } from "./HairAdvisor2ProductHeader";
import { compatibilityLabel } from "./scan-flow";

type Props = {
  scanId: string;
  inciListPath: (scanId: string) => string;
  scanPath: string;
};

export function HairAdvisor2ResultPage({ scanId, inciListPath, scanPath }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<HairScanDetail | null>(null);
  const [analysis, setAnalysis] = useState<HairAnalysis | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareId, setCompareId] = useState("");
  const [expandedAi, setExpandedAi] = useState(false);
  const [saved, setSaved] = useState(false);
  const profileQ = useHairCareProfile();
  const currentProductId = payload?.care_product?.id;
  const catalogQ = useCareProducts({
    exclude_ids: currentProductId ? [currentProductId] : undefined,
    enabled: compareOpen,
  });

  const load = useCallback(async () => {
    if (isHairAdvisorResultDemoScanId(scanId)) {
      setPayload(HAIR_ADVISOR_RESULT_DEMO);
      setAnalysis(HAIR_ADVISOR_RESULT_DEMO.analysis ?? null);
      setLoading(false);
      setSaved(false);
      return;
    }
    setLoading(true);
    try {
      const detail = await fetchHairScan(scanId);
      setPayload(detail);
      setAnalysis(detail.analysis ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!currentProductId) return;
    void fetchMyCareProducts()
      .then((rows) => setSaved(rows.some((r) => r.id === currentProductId)))
      .catch(() => undefined);
  }, [currentProductId]);

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-white">
        <Loader2 className="size-7 animate-spin text-[#111111]/40" />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-[100dvh] bg-white px-5 pt-16 text-center text-sm text-[#71717A]">Skan topilmadi</div>
    );
  }

  const product = payload.care_product;
  const ingredients: string[] =
    analysis?.result?.ingredients ??
    payload.ingredients_confirmed ??
    payload.ingredients_draft ??
    product?.ingredients ??
    [];
  const bullets = analysis?.result?.explanation?.summary_bullets_uz ?? [];
  const cautions = analysis?.result?.explanation?.cautions_uz ?? [];
  const benefits = bullets.slice(0, 2);
  const concerns = (cautions.length ? cautions : bullets.filter((b) => /ehtiyot|noqulay|ta'sir/i.test(b))).slice(0, 2);
  const keyIng = (analysis?.result?.key_ingredients ?? []).slice(0, 3);
  const fitLabel = compatibilityLabel(analysis?.recommendation);
  const fitTone =
    analysis?.recommendation === "POTENTIAL_MATCH"
      ? "bg-[#EAF7ED] text-[#16803C]"
      : analysis?.recommendation === "CAUTION"
        ? "bg-[#FFF7E8] text-[#B7791F]"
        : "bg-[#F7F7F8] text-[#71717A]";

  return (
    <div className="min-h-[100dvh] bg-white text-[#111111]">
      <header
        className="flex items-center justify-between px-5 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button type="button" aria-label="Orqaga" onClick={() => navigateBack(router, scanPath)} className="size-11">
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          aria-label="Saqlash"
          disabled={!product?.id}
          onClick={async () => {
            if (!product?.id) return;
            try {
              await addMyCareProduct({ product_id: product.id, source: "scan" });
              await addHairRoutineProduct({ care_product_id: product.id, slot: "shampoo" }).catch(() => undefined);
              setSaved(true);
              toast.success("Mahsulot saqlandi");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Saqlanmadi");
            }
          }}
          className="size-11 text-[#71717A]"
        >
          <Bookmark className="size-5" fill={saved ? "currentColor" : "none"} />
        </button>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-5 pb-28">
        <HairAdvisor2ProductHeader
          product={product}
          barcode={payload.barcode}
          verified={product?.is_verified || payload.catalog_tier === "verified"}
        />

        <section className="rounded-[20px] bg-[#F7F7F8] p-4 ring-1 ring-[#E8E8EB]">
          <p className="text-[16px] font-semibold">Sochingizga mosligi</p>
          <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${fitTone}`}>{fitLabel}</p>
          {!analysis || !profileQ.data?.complete ? (
            <button
              type="button"
              className="mt-2 text-left text-sm font-medium text-[#111111] underline"
              onClick={() => void router.navigate({ to: `/ai-style/care/ingredient/recover/${scanId}` as never })}
            >
              Aniq tavsiya uchun soch profilingizni to'ldiring
            </button>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Card title="Asosiy foydasi">
            {benefits.length ? benefits.map((b) => <p key={b} className="text-sm leading-snug text-[#111111]/85">{b}</p>) : (
              <p className="text-sm text-[#71717A]">—</p>
            )}
          </Card>
          <Card title="E'tibor bering">
            {concerns.length ? concerns.map((b) => <p key={b} className="text-sm leading-snug text-[#111111]/85">{b}</p>) : (
              <p className="text-sm text-[#71717A]">—</p>
            )}
          </Card>
        </section>

        <button
          type="button"
          onClick={() => void router.navigate({ to: inciListPath(scanId) as never })}
          className="flex w-full items-center justify-between rounded-[20px] bg-[#F7F7F8] px-4 py-4 text-left ring-1 ring-[#E8E8EB]"
        >
          <div>
            <p className="text-[16px] font-semibold">Tarkibi (INCI)</p>
            <p className="mt-1 text-sm text-[#71717A]">{ingredients.length} ta ingredient</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(keyIng.length ? keyIng.map((k) => String(k.inci ?? "")) : ingredients.slice(0, 3)).map((chip) => (
                <span key={chip} className="rounded-full bg-white px-2 py-0.5 text-xs text-[#111111]/80 ring-1 ring-[#E8E8EB]">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 text-[#71717A]" />
        </button>

        <section className="rounded-[20px] bg-[#F7F7F8] p-4 ring-1 ring-[#E8E8EB]">
          <p className="text-[16px] font-semibold">MySaloon tavsiyasi</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#111111]/85">
            {expandedAi ? analysis?.explanation_uz : (analysis?.explanation_uz ?? "").slice(0, 160)}
            {(analysis?.explanation_uz?.length ?? 0) > 160 ? "…" : ""}
          </p>
          {(analysis?.explanation_uz?.length ?? 0) > 160 ? (
            <button type="button" className="mt-2 text-sm font-semibold text-[#111111]" onClick={() => setExpandedAi((v) => !v)}>
              {expandedAi ? "Yig'ish" : "Batafsil"}
            </button>
          ) : null}
        </section>
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 border-t border-[#E8E8EB] bg-white px-5 py-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          className="h-14 w-full rounded-[18px] bg-[#111111] text-[16px] font-semibold text-white"
        >
          Taqqoslash
        </button>
      </div>

      {compareOpen ? (
        <dialog open className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[20px] bg-white p-5 text-[#111111]">
            <p className="text-lg font-bold">Taqqoslash</p>
            <input
              className="mt-3 w-full rounded-xl border border-[#E8E8EB] px-3 py-2 text-sm"
              placeholder="Mahsulot ID yoki qidiruv"
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
              list="ha2-compare-list"
            />
            <datalist id="ha2-compare-list">
              {(catalogQ.data ?? [])
                .filter((p) => `${p.id}`.includes(compareId) || p.name.toLowerCase().includes(compareId.toLowerCase()))
                .slice(0, 12)
                .map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.brand} {p.name}
                  </option>
                ))}
            </datalist>
            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-[#111111] py-2.5 text-sm font-semibold text-white"
              onClick={async () => {
                const mine = product?.id;
                const other = Number(compareId);
                if (!mine || !other) return;
                try {
                  const out = await compareHairProducts([mine, other]);
                  const summary = (out.result as { summary_uz?: string }).summary_uz;
                  toast.message(summary ?? "Solishtirish tayyor");
                  setCompareOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Xatolik");
                }
              }}
            >
              Solishtirish
            </button>
            <button type="button" className="mt-2 w-full py-2 text-sm text-[#71717A]" onClick={() => setCompareOpen(false)}>
              Bekor
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] bg-[#F7F7F8] p-4 ring-1 ring-[#E8E8EB]">
      <p className="text-[16px] font-semibold">{title}</p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}