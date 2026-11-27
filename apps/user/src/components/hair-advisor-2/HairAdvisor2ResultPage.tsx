import { Link, useRouter } from "@tanstack/react-router";
import { Bookmark, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { compatibilityLabel, compatibilityState } from "./scan-flow";

type Props = {
  scanId: string;
  inciListPath: (scanId: string) => string;
  scanPath: string;
};

export function HairAdvisor2ResultPage({ scanId, inciListPath, scanPath }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<HairScanDetail | null>(null);
  const [analysis, setAnalysis] = useState<HairAnalysis | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareId, setCompareId] = useState("");
  const [expandedAi, setExpandedAi] = useState(false);
  const [saved, setSaved] = useState(false);
  const profileQ = useHairCareProfile();
  const currentProductId = payload?.care_product?.id;
  const isDemo = isHairAdvisorResultDemoScanId(scanId);
  const catalogQ = useCareProducts({
    exclude_ids: currentProductId ? [currentProductId] : undefined,
    enabled: compareOpen && !isDemo,
  });

  const load = useCallback(async () => {
    if (isDemo) {
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
      toast.error(e instanceof Error ? e.message : t("hairAdvisor.loadFail"));
    } finally {
      setLoading(false);
    }
  }, [isDemo, scanId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!currentProductId || isDemo) return;
    void fetchMyCareProducts()
      .then((rows) => setSaved(rows.some((r) => r.id === currentProductId)))
      .catch(() => undefined);
  }, [currentProductId, isDemo]);

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-white">
        <Loader2 className="size-7 animate-spin text-[#111111]/40" />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-[100dvh] bg-white px-5 pt-16 text-center text-sm text-[#71717A]">
        {t("hairAdvisor.scanNotFound")}
      </div>
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
  const fitState = compatibilityState(analysis?.recommendation);
  const fitLabel = compatibilityLabel(analysis?.recommendation);
  const fitTone =
    fitState === "potentially_suitable"
      ? "bg-[#EAF7ED] text-[#16803C]"
      : fitState === "mixed"
        ? "bg-[#FFF7E8] text-[#B7791F]"
        : fitState === "potentially_unsuitable"
          ? "bg-[#FEF2F2] text-[#B91C1C]"
          : "bg-[#F7F7F8] text-[#71717A]";

  return (
    <div className="min-h-[100dvh] bg-white text-[#111111]">
      <header
        className="flex items-center justify-between px-5 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={() => navigateBack(router, scanPath)}
          className="size-11"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          aria-label={t("common.save")}
          disabled={!product?.id || isDemo}
          onClick={async () => {
            if (!product?.id) return;
            try {
              await addMyCareProduct({ product_id: product.id, source: "scan" });
              await addHairRoutineProduct({ care_product_id: product.id, slot: "shampoo" }).catch(() => undefined);
              setSaved(true);
              toast.success(t("hairAdvisor.addedToRoutine"));
            } catch (e) {
              toast.error(e instanceof Error ? e.message : t("hairAdvisor.errorGeneric"));
            }
          }}
          className="size-11 text-[#71717A]"
        >
          <Bookmark className="size-5" fill={saved ? "currentColor" : "none"} />
        </button>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-5 pb-10">
        {isDemo ? (
          <p
            className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm font-medium text-[#92400E]"
            role="status"
          >
            {t("hairAdvisor.demoNotice")}
          </p>
        ) : null}

        <HairAdvisor2ProductHeader
          product={product}
          barcode={payload.barcode}
          verified={product?.is_verified || payload.catalog_tier === "verified"}
        />

        <section className="rounded-[20px] bg-[#F7F7F8] p-4 ring-1 ring-[#E8E8EB]">
          <p className="text-[16px] font-semibold">{t("hairAdvisor.resultCompatibility")}</p>
          <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${fitTone}`}>{fitLabel}</p>
          {!analysis || !profileQ.data?.complete ? (
            <button
              type="button"
              className="mt-2 text-left text-sm font-medium text-[#111111] underline"
              onClick={() => void router.navigate({ to: `/ai-style/care/ingredient/recover/${scanId}` as never })}
            >
              {t("hairAdvisor.fillProfileCta")}
            </button>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Card title={t("hairAdvisor.resultBenefits")}>
            {benefits.length ? benefits.map((b) => <p key={b} className="text-sm leading-snug text-[#111111]/85">{b}</p>) : (
              <p className="text-sm text-[#71717A]">—</p>
            )}
          </Card>
          <Card title={t("hairAdvisor.resultCautions")}>
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
            <p className="text-[16px] font-semibold">{t("hairAdvisor.resultInci")}</p>
            <p className="mt-1 text-sm text-[#71717A]">{t("hairAdvisor.ingredientCount", { count: ingredients.length })}</p>
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
          <p className="text-[16px] font-semibold">{t("hairAdvisor.resultRecommendation")}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#111111]/85">
            {expandedAi ? analysis?.explanation_uz : (analysis?.explanation_uz ?? "").slice(0, 160)}
            {(analysis?.explanation_uz?.length ?? 0) > 160 ? "…" : ""}
          </p>
          {(analysis?.explanation_uz?.length ?? 0) > 160 ? (
            <button type="button" className="mt-2 text-sm font-semibold text-[#111111]" onClick={() => setExpandedAi((v) => !v)}>
              {expandedAi ? t("hairAdvisor.collapse") : t("hairAdvisor.expand")}
            </button>
          ) : null}
        </section>

        <section
          className="space-y-2 border-t border-[#E8E8EB] pt-6"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <Link
            to="/ai-style"
            className="flex h-12 w-full items-center justify-center rounded-[18px] bg-[#111111] text-[15px] font-semibold text-white"
          >
            {t("hairAdvisor.continueMorf")}
          </Link>
          <Link
            to={scanPath as never}
            className="flex h-12 w-full items-center justify-center rounded-[18px] border border-[#E8E8EB] text-[15px] font-semibold text-[#111111]"
          >
            {t("hairAdvisor.scanAnother")}
          </Link>
          <Link
            to={scanPath as never}
            search={{ history: "1" }}
            className="flex h-12 w-full items-center justify-center rounded-[18px] border border-[#E8E8EB] text-[15px] font-semibold text-[#111111]"
          >
            {t("hairAdvisor.openScanHistory")}
          </Link>
          {!isDemo && product?.id ? (
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="flex h-12 w-full items-center justify-center rounded-[18px] border border-[#E8E8EB] text-[15px] font-semibold text-[#111111]"
            >
              {t("hairAdvisor.compareTitle")}
            </button>
          ) : null}
        </section>
      </main>

      {compareOpen ? (
        <dialog open className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[20px] bg-white p-5 text-[#111111]">
            <p className="text-lg font-bold">{t("hairAdvisor.compareTitle")}</p>
            <input
              className="mt-3 w-full rounded-xl border border-[#E8E8EB] px-3 py-2 text-sm"
              placeholder={t("hairAdvisor.comparePlaceholder")}
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
                  toast.message(summary ?? t("hairAdvisor.compareRun"));
                  setCompareOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : t("hairAdvisor.compareFail"));
                }
              }}
            >
              {t("hairAdvisor.compareRun")}
            </button>
            <button type="button" className="mt-2 w-full py-2 text-sm text-[#71717A]" onClick={() => setCompareOpen(false)}>
              {t("common.cancel")}
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