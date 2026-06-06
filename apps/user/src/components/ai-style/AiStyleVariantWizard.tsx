import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarPlus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
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
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-[9px] font-bold uppercase text-foreground">
          {t("aiStylePage.betaBadge")}
        </span>
      </div>
    </ProfileSubpageCard>
  );
}

function SuggestionList({ result }: { result: AiAnalysisResult }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {result.suggestions.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex gap-3 rounded-2xl border border-border bg-background p-3"
        >
          <div
            className="h-20 w-20 shrink-0 rounded-xl"
            style={{ background: styleCoverGradient(s.seed) }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-bold">{s.title}</h3>
              <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold">
                {t("aiStylePage.matchPct", { value: s.match })}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{t(s.reasonKey)}</p>
            <p className="mt-1 text-[10px] font-bold text-muted-foreground">
              {s.barberName} · {s.salonName}
            </p>
            <Link
              to="/booking/$salonId"
              params={{ salonId: s.salonId }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold underline"
            >
              <CalendarPlus className="h-3 w-3" />
              {t("aiStylePage.bookCta")}
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function AiStyleVariantWizard({ flow, audience }: Props) {
  const { t } = useTranslation();
  const { photo, analyzing, done, result, fileRef, onFile, openFile, analyze, reset } = flow;

  const step: 1 | 2 | 3 = !photo ? 1 : analyzing ? 2 : done ? 3 : 2;

  return (
    <div>
      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />
      <AiStyleSteps step={step} />
      <p className="mb-3 text-[11px] text-muted-foreground">{t("aiStylePage.privacyNote")}</p>

      {!photo ? (
        <AiStyleUploadEmpty onOpen={openFile} />
      ) : (
        <AiStylePhotoPreview photo={photo} analyzing={analyzing} onReset={reset} />
      )}

      {photo && !done ? (
        <button
          type="button"
          onClick={() => analyze(audience)}
          disabled={analyzing}
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
          <SuggestionList result={result} />
        </div>
      ) : null}
    </div>
  );
}
