import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, CalendarPlus, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AiStylePhotoInput,
  AiStylePhotoPreview,
  AiStyleUploadEmpty,
} from "@/components/ai-style/AiStyleUi";
import { styleCoverGradient } from "@/components/ai-style/ai-style-shared";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import type { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Flow = ReturnType<typeof useAiStyleFlow>;

type Props = {
  flow: Flow;
  audience: Audience;
};

export function AiStyleVariantStudio({ flow, audience }: Props) {
  const { t } = useTranslation();
  const { photo, analyzing, done, result, fileRef, onFile, openFile, analyze, reset } = flow;
  const [saved, setSaved] = useState<string[]>([]);

  const toggleSave = (id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="relative">
      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />
      <p className="mb-3 text-[11px] text-muted-foreground">{t("aiStylePage.privacyNote")}</p>

      {!photo ? (
        <AiStyleUploadEmpty onOpen={openFile} compact />
      ) : (
        <AiStylePhotoPreview
          photo={photo}
          analyzing={analyzing}
          onReset={reset}
          className={done ? "rounded-2xl" : undefined}
          imageClassName={done ? "aspect-[16/10]" : "aspect-[4/5]"}
        />
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

      <AnimatePresence>
        {done && result ? (
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="mt-4 overflow-hidden rounded-[28px] border border-border bg-background shadow-[0_-12px_40px_-12px_oklch(0.145_0_0/0.15)]"
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
            <div className="p-4 pt-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("aiStylePage.studioLabel")}
                  </p>
                  <h2 className="text-lg font-bold">{t("aiStylePage.resultsTitle")}</h2>
                </div>
                <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase text-background">
                  {t("aiStylePage.betaBadge")}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {t(`aiStylePage.faceShapes.${result.faceShapeKey}`)} ·{" "}
                {t(`aiStylePage.hairTypes.${result.hairTypeKey}`)}
              </p>

              <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
                {result.suggestions.map((s) => {
                  const isSaved = saved.includes(s.id);
                  return (
                    <article
                      key={s.id}
                      className="w-[72vw] max-w-[260px] shrink-0 overflow-hidden rounded-[22px] border border-border bg-surface/30"
                    >
                      <div className="h-28" style={{ background: styleCoverGradient(s.seed) }} />
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold">{s.title}</h3>
                          <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                            {s.match}%
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          {t(s.reasonKey)}
                        </p>
                        <p className="mt-2 text-[10px] font-bold text-muted-foreground">
                          {s.barberName}
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
                          <Link
                            to="/booking/$salonId"
                            params={{ salonId: s.salonId }}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-foreground py-2 text-[10px] font-bold text-background"
                          >
                            <CalendarPlus className="h-3 w-3" />
                            {t("aiStylePage.bookShort")}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
