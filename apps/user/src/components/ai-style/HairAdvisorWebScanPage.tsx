import { useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Plus, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HairAdvisorBarcodeCamera } from "@/components/ai-style/HairAdvisorBarcodeCamera";
import {
  confirmHairScanIngredients,
  createHairScan,
  createProductSubmission,
  addHairRoutineProduct,
  compareHairProducts,
  fetchHairScan,
  fetchHairScanHistory,
  fetchHairRoutineCurrent,
  patchHairRoutine,
  fetchProductSubmissions,
  submitHairFeedback,
  type HairAnalysis,
  type HairAnalysisRecommendation,
  type HairScan,
} from "@/lib/api/hair-advisor";
import { prepareSelfieFromFile } from "@/lib/selfie-image";
import { navigateBack } from "@/lib/mobile-back";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

export function HairAdvisorWebScanPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scan, setScan] = useState<HairScan | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<HairAnalysis | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [compareId, setCompareId] = useState("");
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [detailIng, setDetailIng] = useState<Record<string, unknown> | null>(null);
  const [routineNotes, setRoutineNotes] = useState("");

  const historyQ = useQuery({
    queryKey: ["hair-advisor", "history"],
    queryFn: fetchHairScanHistory,
  });
  const submissionsQ = useQuery({
    queryKey: ["hair-advisor", "submissions"],
    queryFn: fetchProductSubmissions,
  });
  const routineQ = useQuery({
    queryKey: ["hair-advisor", "routine"],
    queryFn: fetchHairRoutineCurrent,
    enabled: step === 4,
  });

  useEffect(() => {
    if (routineQ.data?.notes) setRoutineNotes(routineQ.data.notes);
  }, [routineQ.data?.notes]);

  const applyScanPayload = useCallback((payload: HairScan & { analysis?: HairAnalysis }) => {
    const { analysis: a, ...s } = payload;
    setScan(s);
    if (a) {
      setAnalysis(a);
      setStep(4);
    } else if (s.ingredients_draft?.length || s.status === "needs_confirmation") {
      setIngredients(s.ingredients_draft?.length ? [...s.ingredients_draft] : []);
      setStep(2);
    } else {
      setStep(1);
    }
  }, []);

  const runBarcode = useCallback(
    async (raw?: string) => {
      const code = (raw ?? barcode).replace(/\D/g, "");
      if (code.length < 8) {
        toast.error(t("hairAdvisor.barcodeMin"));
        return;
      }
      setBarcode(code);
      setBusy(true);
      try {
        const created = await createHairScan({ input_method: "barcode", barcode: code });
        setScan(created);
        setAnalysis(null);
        if (created.status === "product_not_found") {
          setMessage(created.message_uz ?? t("hairAdvisor.notInDb"));
          setStep(1);
        } else if (created.ingredients_draft?.length) {
          setIngredients([...created.ingredients_draft]);
          setStep(2);
          setMessage(created.message_uz ?? null);
        } else {
          setStep(1);
          setMessage(t("hairAdvisor.uploadLabel"));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("hairAdvisor.errorGeneric"));
      } finally {
        setBusy(false);
      }
    },
    [barcode, t],
  );

  const onLabelFile = async (file: File) => {
    setBusy(true);
    try {
      const dataUrl = await prepareSelfieFromFile(file);
      const created = await createHairScan({ input_method: "gallery", image: dataUrl });
      setScan(created);
      setIngredients(created.ingredients_draft?.length ? [...created.ingredients_draft] : []);
      if (created.ingredients_draft?.length) setStep(2);
      else setMessage(t("hairAdvisor.ocrEmpty"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("hairAdvisor.imageReadFail"));
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
      setMessage((out as { message_uz?: string }).message_uz ?? t("hairAdvisor.submitted"));
      void submissionsQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("hairAdvisor.submitFail"));
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!scan || ingredients.filter(Boolean).length < 1) return;
    setBusy(true);
    setStep(3);
    try {
      const out = await confirmHairScanIngredients(
        scan.id,
        ingredients.map((i) => i.trim()).filter(Boolean),
      );
      setAnalysis(out.analysis);
      setStep(4);
      void historyQ.refetch();
    } catch (e) {
      setStep(2);
      toast.error(e instanceof Error ? e.message : t("hairAdvisor.analyzeFail"));
    } finally {
      setBusy(false);
    }
  };

  const loadHistoryScan = async (scanId: string) => {
    setBusy(true);
    try {
      const detail = await fetchHairScan(scanId);
      applyScanPayload(detail);
      setMessage(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("hairAdvisor.errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setScan(null);
    setAnalysis(null);
    setIngredients([]);
    setMessage(null);
    setCompareResult(null);
    void historyQ.refetch();
    void submissionsQ.refetch();
  };

  const disclaimer =
    analysis?.result?.disclaimer_uz ??
    (analysis?.result?.catalog_tier === "verified"
      ? t("hairAdvisor.disclaimerVerified")
      : t("hairAdvisor.disclaimerProvisional"));

  const catalogTier = analysis?.result?.catalog_tier ?? scan?.catalog_tier;
  const stepLabels = [
    t("hairAdvisor.stepProduct"),
    t("hairAdvisor.stepIngredients"),
    t("hairAdvisor.stepAnalyze"),
    t("hairAdvisor.stepResult"),
  ];

  return (
    <div
      className="min-h-[100dvh] bg-[#FAFAFA] text-[#111111]"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
    >
      <header className="flex items-center gap-2 px-5 py-2">
        <button
          type="button"
          onClick={() => navigateBack(router, "/ai-style/care")}
          className="rounded-full p-2 hover:bg-[#111]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
          aria-label={t("hairAdvisor.back")}
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">{t("hairAdvisor.title")}</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-5 pb-16 pt-4">
        <div className="flex flex-wrap gap-2 text-xs font-medium text-[#111]/50" aria-label={t("hairAdvisor.progress")}>
          {stepLabels.map((label, i) => (
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

        {catalogTier ? <CatalogTierBadge tier={catalogTier} /> : null}

        {message ? (
          <p className="text-center text-sm font-medium text-emerald-700" role="status">
            {message}
          </p>
        ) : null}

        {step === 1 && (
          <motionCard>
            <label className="text-sm font-semibold" htmlFor="hair-barcode">
              {t("hairAdvisor.barcode")}
            </label>
            <input
              id="hair-barcode"
              className="w-full rounded-xl border border-[#111]/15 px-4 py-3 text-base"
              inputMode="numeric"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="4006381333931"
              autoComplete="off"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void runBarcode()}
              className="w-full rounded-xl bg-[#111] py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="mx-auto size-5 animate-spin" aria-hidden /> : t("hairAdvisor.checkBarcode")}
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-[#111]/20 py-2.5 text-sm font-semibold"
              onClick={() => setCameraOpen(true)}
            >
              {t("hairAdvisor.openBarcodeCamera")}
            </button>
            <HairAdvisorBarcodeCamera
              active={cameraOpen}
              onDetected={(code) => void runBarcode(code)}
              onClose={() => setCameraOpen(false)}
            />
            <label className="block text-sm font-semibold" htmlFor="hair-label-file">
              {t("hairAdvisor.labelImage")}
            </label>
            <input
              id="hair-label-file"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (scan?.status === "product_not_found") void submitUnknown(f);
                  else void onLabelFile(f);
                }
              }}
              className="text-sm"
            />
            {scan?.status === "product_not_found" ? (
              <p className="text-xs text-[#111]/70">{t("hairAdvisor.notInDbCta")}</p>
            ) : null}
          </motionCard>
        )}

        {step === 2 && (
          <motionCard>
            <p className="text-sm font-semibold">{t("hairAdvisor.confirmIngredients")}</p>
            {ingredients.length === 0 ? (
              <p className="text-sm text-[#111]/60">{t("hairAdvisor.emptyIngredients")}</p>
            ) : null}
            {ingredients.map((ing, idx) => (
              <div key={`${ing}-${idx}`} className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-[#111]/15 px-3 py-2 text-sm"
                  value={ing}
                  aria-label={`${t("hairAdvisor.ingredient")} ${idx + 1}`}
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[idx] = e.target.value;
                    setIngredients(next);
                  }}
                />
                <button
                  type="button"
                  className="rounded-lg border border-[#111]/15 p-2"
                  aria-label={t("hairAdvisor.removeIngredient")}
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
              <Plus className="size-4" /> {t("hairAdvisor.addIngredient")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void analyze()}
              className="w-full rounded-xl bg-[#111] py-3 text-sm font-semibold text-white"
            >
              {t("hairAdvisor.runAnalysis")}
            </button>
          </motionCard>
        )}

        {step === 3 && (
          <motionCard className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-[#111]/40" aria-hidden />
            <p className="text-sm font-medium">{t("hairAdvisor.analyzing")}</p>
          </motionCard>
        )}

        {step === 4 && analysis && (
          <motionCard className="space-y-4">
            <p className="text-xs text-[#111]/60">{disclaimer}</p>
            <RecommendationPill recommendation={analysis.recommendation as HairAnalysisRecommendation} />
            <p className="text-xs text-[#111]/55">
              {analysis.data_confidence === "high"
                ? t("hairAdvisor.confidenceHigh")
                : t("hairAdvisor.confidenceLimited")}
            </p>
            <p className="text-base font-semibold leading-relaxed">{analysis.explanation_uz}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#111]/80">
              {(analysis.result.explanation?.summary_bullets_uz ?? []).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {(analysis.result.key_ingredients ?? []).length > 0 ? (
              <div>
                <p className="text-sm font-semibold">{t("hairAdvisor.keyIngredients")}</p>
                <ul className="mt-2 space-y-2">
                  {(analysis.result.key_ingredients ?? []).slice(0, 8).map((row, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-[#111]/10 bg-[#f7f7f7] px-3 py-2 text-left text-sm"
                        onClick={() => setDetailIng(row)}
                      >
                        <span className="font-semibold">{String(row.inci ?? "")}</span>
                        <span className="mt-0.5 block text-xs text-[#111]/65">{String(row.note ?? "")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                className="w-full rounded-xl bg-[#111] py-2 text-sm font-semibold text-white"
                onClick={() =>
                  void submitHairFeedback({ analysis_id: analysis.id, helpful: true }).then(() =>
                    toast.success(t("hairAdvisor.feedbackThanks")),
                  )
                }
              >
                {t("hairAdvisor.markHelpful")}
              </button>
              {scan?.care_product?.id ? (
                <button
                  type="button"
                  className="w-full rounded-xl border border-[#111]/20 py-2 text-sm font-semibold"
                  onClick={() =>
                    void addHairRoutineProduct({
                      care_product_id: scan.care_product.id,
                      slot: "shampoo",
                    }).then(() => {
                      toast.success(t("hairAdvisor.addedToRoutine"));
                      void routineQ.refetch();
                    })
                  }
                >
                  {t("hairAdvisor.addToRoutine")}
                </button>
              ) : null}
            </div>
            <CompareBlock
              compareId={compareId}
              setCompareId={setCompareId}
              compareResult={compareResult}
              setCompareResult={setCompareResult}
              scanProductId={scan?.care_product?.id}
            />
            <RoutinePanel
              routine={routineQ.data}
              notes={routineNotes}
              setNotes={setRoutineNotes}
              onSaveNotes={async () => {
                if (!routineQ.data?.id) return;
                await patchHairRoutine(routineQ.data.id, { notes: routineNotes });
                toast.success(t("hairAdvisor.routineSaved"));
                void qc.invalidateQueries({ queryKey: ["hair-advisor", "routine"] });
              }}
            />
            <button type="button" className="w-full rounded-xl border border-[#111]/20 py-3 text-sm font-semibold" onClick={resetFlow}>
              {t("hairAdvisor.newScan")}
            </button>
          </motionCard>
        )}

        <SubmissionsPanel
          items={(submissionsQ.data ?? []) as Array<{ id: string; status: string; barcode?: string }>}
          loading={submissionsQ.isLoading}
          error={submissionsQ.isError}
        />

        <HistoryPanel
          items={historyQ.data ?? []}
          loading={historyQ.isLoading}
          error={historyQ.isError}
          onPick={(s) => void loadHistoryScan(s.id)}
        />
      </div>

      {detailIng ? (
        <dialog open className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <motionCard className="max-h-[80vh] w-full max-w-md overflow-y-auto">
            <h2 className="text-lg font-bold">{String(detailIng.inci ?? "")}</h2>
            <p className="mt-2 text-sm text-[#111]/80">{String(detailIng.note ?? "")}</p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-[#111]/20 py-2 text-sm font-semibold"
              onClick={() => setDetailIng(null)}
            >
              {t("hairAdvisor.closeDetail")}
            </button>
          </motionCard>
        </dialog>
      ) : null}
    </div>
  );
}

function CatalogTierBadge({ tier }: { tier: string }) {
  const { t } = useTranslation();
  const verified = tier === "verified";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        verified ? "bg-[#111] text-white" : "border border-[#111]/20 bg-white text-[#111]",
      )}
    >
      {verified ? <ShieldCheck className="size-3.5" aria-hidden /> : <ShieldAlert className="size-3.5" aria-hidden />}
      {verified ? t("hairAdvisor.badgeVerified") : t("hairAdvisor.badgeUnverified")}
    </span>
  );
}

function RecommendationPill({ recommendation }: { recommendation: HairAnalysisRecommendation | string }) {
  const { t } = useTranslation();
  const label =
    recommendation === "POTENTIAL_MATCH"
      ? t("hairAdvisor.recoMatch")
      : recommendation === "CAUTION"
        ? t("hairAdvisor.recoCaution")
        : t("hairAdvisor.recoInsufficient");
  const tone =
    recommendation === "POTENTIAL_MATCH"
      ? "bg-emerald-100 text-emerald-900"
      : recommendation === "CAUTION"
        ? "bg-amber-100 text-amber-900"
        : "bg-[#111]/10 text-[#111]";
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", tone)}>{label}</span>;
}

function CompareBlock({
  compareId,
  setCompareId,
  compareResult,
  setCompareResult,
  scanProductId,
}: {
  compareId: string;
  setCompareId: (v: string) => void;
  compareResult: string | null;
  setCompareResult: (v: string | null) => void;
  scanProductId?: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 border-t border-[#111]/10 pt-3">
      <p className="text-xs font-semibold">{t("hairAdvisor.compareTitle")}</p>
      <input
        className="w-full rounded-lg border border-[#111]/15 px-3 py-2 text-sm"
        placeholder={t("hairAdvisor.comparePlaceholder")}
        value={compareId}
        onChange={(e) => setCompareId(e.target.value)}
      />
      <button
        type="button"
        disabled={!scanProductId || !compareId}
        className="w-full rounded-lg border border-[#111]/20 py-2 text-sm disabled:opacity-50"
        onClick={async () => {
          try {
            const mine = scanProductId;
            const other = Number(compareId);
            if (!mine || !other) return;
            const out = await compareHairProducts([mine, other]);
            const summary = (out.result as { summary_uz?: string }).summary_uz;
            setCompareResult(summary ?? JSON.stringify(out.result).slice(0, 400));
          } catch (e) {
            toast.error(e instanceof Error ? e.message : t("hairAdvisor.compareFail"));
          }
        }}
      >
        {t("hairAdvisor.compareRun")}
      </button>
      {compareResult ? (
        <p className="max-h-32 overflow-auto text-xs text-[#111]/80" role="status">
          {compareResult}
        </p>
      ) : null}
    </div>
  );
}

function RoutinePanel({
  routine,
  notes,
  setNotes,
  onSaveNotes,
}: {
  routine?: { id: number; name: string; notes: string; items: Array<{ slot: string; care_product?: { brand?: string; name?: string } }> };
  notes: string;
  setNotes: (v: string) => void;
  onSaveNotes: () => void;
}) {
  const { t } = useTranslation();
  if (!routine) return null;
  return (
    <motionCard className="space-y-2 border border-dashed border-[#111]/15">
      <p className="text-sm font-semibold">{t("hairAdvisor.routineTitle", { name: routine.name })}</p>
      {routine.items.length === 0 ? (
        <p className="text-xs text-[#111]/60">{t("hairAdvisor.routineEmpty")}</p>
      ) : (
        <ul className="text-xs text-[#111]/75">
          {routine.items.map((item) => (
            <li key={item.slot + (item.care_product?.name ?? "")}>
              {item.slot}: {item.care_product?.brand} {item.care_product?.name}
            </li>
          ))}
        </ul>
      )}
      <label className="text-xs font-semibold" htmlFor="routine-notes">
        {t("hairAdvisor.routineNotes")}
      </label>
      <textarea
        id="routine-notes"
        className="w-full rounded-lg border border-[#111]/15 px-3 py-2 text-sm"
        rows={2}
        value={notes || routine.notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        type="button"
        className="w-full rounded-lg border border-[#111]/20 py-2 text-xs font-semibold"
        onClick={onSaveNotes}
      >
        {t("hairAdvisor.routineSave")}
      </button>
    </motionCard>
  );
}

function SubmissionsPanel({
  items,
  loading,
  error,
}: {
  items: Array<{ id: string; status: string; barcode?: string }>;
  loading: boolean;
  error: boolean;
}) {
  const { t } = useTranslation();
  if (loading) return <p className="text-xs text-[#111]/50">{t("hairAdvisor.loading")}</p>;
  if (error) return <p className="text-xs text-red-700">{t("hairAdvisor.loadFail")}</p>;
  if (items.length === 0) return <p className="text-xs text-[#111]/50">{t("hairAdvisor.submissionsEmpty")}</p>;
  return (
    <motionCard>
      <h3 className="text-sm font-semibold">{t("hairAdvisor.submissionsTitle")}</h3>
      <ul className="mt-2 space-y-1 text-xs text-[#111]/70">
        {items.slice(0, 6).map((s) => (
          <li key={s.id}>
            {s.barcode || s.id.slice(0, 8)} — {s.status}
          </li>
        ))}
      </ul>
    </motionCard>
  );
}

function HistoryPanel({
  items,
  loading,
  error,
  onPick,
}: {
  items: HairScan[];
  loading: boolean;
  error: boolean;
  onPick: (s: HairScan) => void;
}) {
  const { t } = useTranslation();
  if (loading) return null;
  if (error) return <p className="text-xs text-red-700">{t("hairAdvisor.loadFail")}</p>;
  if (items.length === 0) return <p className="text-xs text-[#111]/50">{t("hairAdvisor.historyEmpty")}</p>;
  return (
    <motionCard>
      <h3 className="text-sm font-semibold">{t("hairAdvisor.historyTitle")}</h3>
      <ul className="mt-2 space-y-1 text-xs text-[#111]/70">
        {items.slice(0, 8).map((s) => (
          <li key={s.id}>
            <button type="button" className="underline focus-visible:outline focus-visible:outline-2" onClick={() => onPick(s)}>
              {s.barcode || s.id.slice(0, 8)} — {s.status}
            </button>
          </li>
        ))}
      </ul>
    </motionCard>
  );
}

function motionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-4 rounded-2xl border border-[#111]/10 bg-white p-5 shadow-sm", className)}>{children}</div>
  );
}