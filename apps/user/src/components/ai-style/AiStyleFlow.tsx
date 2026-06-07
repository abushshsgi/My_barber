import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bookmark, CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import { AiStylePageLayout } from "@/components/ai-style/AiStylePageLayout";
import {
  AiStyleAnalyzeCta,
  AiStylePhotoInput,
  AiStylePhotoPreview,
  AiStyleUploadEmpty,
} from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { styleCoverGradient } from "@/components/ai-style/ai-style-shared";
import type { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Flow = ReturnType<typeof useAiStyleFlow>;

type Props = {
  flow: Flow;
  audience: Audience;
};

function ResultsSummary({ result }: { result: AiAnalysisResult }) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-[24px] bg-foreground p-4 text-background">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/55">
        {t("aiStylePage.analysisTitle")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-background/10 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-background/55">
            {t("aiStylePage.faceShape")}
          </p>
          <p className="mt-1 text-sm font-bold">
            {t(`aiStylePage.faceShapes.${result.faceShapeKey}`)}
          </p>
        </div>
        <div className="rounded-2xl bg-background/10 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-background/55">
            {t("aiStylePage.hairTypeLabel")}
          </p>
          <p className="mt-1 text-sm font-bold">
            {t(`aiStylePage.hairTypes.${result.hairTypeKey}`)}
          </p>
        </div>
      </div>
      {result.summaryUz ? (
        <p className="mt-3 text-xs leading-relaxed text-background/75">{result.summaryUz}</p>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-background/75">
          {t("aiStylePage.resultDesc")}
        </p>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  index,
  saved,
  onToggleSave,
}: {
  suggestion: AiAnalysisResult["suggestions"][number];
  index: number;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="overflow-hidden rounded-[22px] border border-border bg-surface/35"
    >
      <div className="flex gap-3 p-3">
        <div
          className="h-24 w-20 shrink-0 rounded-2xl"
          style={{ background: styleCoverGradient(suggestion.seed) }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                #{index + 1}
              </p>
              <h3 className="mt-0.5 text-sm font-bold leading-tight">{suggestion.title}</h3>
            </div>
            <span className="shrink-0 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background">
              {t("aiStylePage.matchPct", { value: suggestion.match })}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {suggestion.reason ?? (suggestion.reasonKey ? t(suggestion.reasonKey) : "")}
          </p>
          <p className="mt-2 text-[10px] font-bold text-muted-foreground">
            {suggestion.barberName} · {suggestion.salonName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border px-3 py-3">
        <button
          type="button"
          onClick={() => onToggleSave(suggestion.id)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-bold",
            saved
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background",
          )}
        >
          <Bookmark className="h-3.5 w-3.5" />
          {t("aiStylePage.save")}
        </button>
        {suggestion.salonId ? (
          <Link
            to="/booking/$salonId"
            params={{ salonId: suggestion.salonId }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground py-2.5 text-[11px] font-bold text-background"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            {t("aiStylePage.bookShort")}
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-[11px] font-bold text-muted-foreground">
            <CalendarPlus className="h-3.5 w-3.5" />
            {t("aiStylePage.bookShort")}
          </span>
        )}
      </div>
    </motion.article>
  );
}

export function AiStyleFlow({ flow, audience }: Props) {
  const { t } = useTranslation();
  const {
    photo,
    validating,
    analyzing,
    done,
    result,
    error,
    cameraOpen,
    faceHint,
    fileRef,
    onFile,
    onCameraCapture,
    openFile,
    openCamera,
    closeCamera,
    analyze,
    reset,
  } = flow;
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (photo && faceHint?.source === "camera_scan") {
      toast.success(t("aiStylePage.faceProfileSaved"));
    }
  }, [photo, faceHint, t]);

  const step: 1 | 2 | 3 = !photo ? 1 : analyzing || validating ? 2 : done ? 3 : 2;

  const toggleSave = (id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <AiStylePageLayout step={step}>
      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />

      {!photo ? (
        <AiStyleUploadEmpty
          onOpenGallery={openFile}
          onOpenCamera={openCamera}
          validating={validating}
        />
      ) : (
        <div className="space-y-4">
          <AiStylePhotoPreview
            photo={photo}
            analyzing={analyzing}
            validating={validating}
            onReset={reset}
          />

          {!done ? (
            <AiStyleAnalyzeCta
              analyzing={analyzing}
              validating={validating}
              onAnalyze={() => void analyze(audience)}
            />
          ) : null}
        </div>
      )}

      <AiStyleCamera open={cameraOpen} onClose={closeCamera} onCapture={onCameraCapture} />

      {done && result ? (
        <div className="mt-6 space-y-4">
          <ResultsSummary result={result} />

          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">{t("aiStylePage.resultsTitle")}</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("aiStylePage.resultsHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[10px] font-bold"
            >
              {t("aiStylePage.tryAgain")}
            </button>
          </div>

          <div className="space-y-3">
            {result.suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                saved={saved.includes(suggestion.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        </div>
      ) : null}
    </AiStylePageLayout>
  );
}
