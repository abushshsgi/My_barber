import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bookmark, CalendarPlus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleCamera } from "@/components/ai-style/AiStyleCamera";
import {
  AiStylePhotoInput,
  AiStylePhotoPreview,
  AiStyleSteps,
  AiStyleUploadEmpty,
} from "@/components/ai-style/AiStyleUi";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { styleCoverGradient } from "@/components/ai-style/ai-style-shared";
import type { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
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
    <ProfileSubpageCard className="border-foreground bg-foreground text-background">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-background/55">
            {t("aiStylePage.analysisTitle")}
          </p>
          <p className="mt-2 text-sm font-bold">
            {t(`aiStylePage.faceShapes.${result.faceShapeKey}`)} ·{" "}
            {t(`aiStylePage.hairTypes.${result.hairTypeKey}`)}
          </p>
          {result.summaryUz ? (
            <p className="mt-2 text-xs leading-relaxed text-background/75">{result.summaryUz}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-[9px] font-bold uppercase text-foreground">
          {t("aiStylePage.aiBadge")}
        </span>
      </div>
    </ProfileSubpageCard>
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
    <div>
      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />
      <AiStyleSteps step={step} />
      <p className="mb-3 text-[11px] text-muted-foreground">{t("aiStylePage.privacyNote")}</p>

      {!photo ? (
        <AiStyleUploadEmpty
          onOpenGallery={openFile}
          onOpenCamera={openCamera}
          validating={validating}
        />
      ) : (
        <AiStylePhotoPreview
          photo={photo}
          analyzing={analyzing}
          validating={validating}
          onReset={reset}
        />
      )}

      <AiStyleCamera
        open={cameraOpen}
        onClose={closeCamera}
        onCapture={onCameraCapture}
      />

      {photo && !done ? (
        <button
          type="button"
          onClick={() => void analyze(audience)}
          disabled={analyzing || validating}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-4 text-sm font-bold text-background active:scale-[0.98] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {analyzing ? t("aiStylePage.analyzing") : t("aiStylePage.analyzeCta")}
        </button>
      ) : null}

      {done && result ? (
        <div className="mt-6 space-y-4">
          <ResultsSummary result={result} />
          <h2 className="text-sm font-bold">{t("aiStylePage.resultsTitle")}</h2>

          <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
            {result.suggestions.map((s, i) => {
              const isSaved = saved.includes(s.id);
              return (
                <motion.article
                  key={s.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="w-[78vw] max-w-[280px] shrink-0 snap-center overflow-hidden rounded-[22px] border border-border bg-surface/30"
                >
                  <div className="h-28" style={{ background: styleCoverGradient(s.seed) }} />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold">{s.title}</h3>
                      <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-bold">
                        {t("aiStylePage.matchPct", { value: s.match })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {s.reason ?? (s.reasonKey ? t(s.reasonKey) : "")}
                    </p>
                    <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                      {s.barberName} · {s.salonName}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSave(s.id)}
                        className={cn(
                          "inline-flex flex-1 items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-bold",
                          isSaved
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background",
                        )}
                      >
                        <Bookmark className="h-3 w-3" />
                        {t("aiStylePage.save")}
                      </button>
                      {s.salonId ? (
                        <Link
                          to="/booking/$salonId"
                          params={{ salonId: s.salonId }}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-foreground py-2 text-[10px] font-bold text-background"
                        >
                          <CalendarPlus className="h-3 w-3" />
                          {t("aiStylePage.bookShort")}
                        </Link>
                      ) : (
                        <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-muted py-2 text-[10px] font-bold text-muted-foreground">
                          <CalendarPlus className="h-3 w-3" />
                          {t("aiStylePage.bookShort")}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <p className="text-center text-[11px] font-medium text-muted-foreground">
            {t("aiStylePage.swipeHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
