import { Link } from "@tanstack/react-router";
import { CalendarPlus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AiStylePhotoInput,
  AiStylePhotoPreview,
  AiStyleScanLine,
  AiStyleUploadEmpty,
} from "@/components/ai-style/AiStyleUi";
import { styleCoverGradient } from "@/components/ai-style/ai-style-shared";
import type { useAiStyleFlow } from "@/components/ai-style/useAiStyleFlow";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Flow = ReturnType<typeof useAiStyleFlow>;

type Props = {
  flow: Flow;
  audience: Audience;
};

export function AiStyleVariantCamera({ flow, audience }: Props) {
  const { t } = useTranslation();
  const { photo, analyzing, done, result, fileRef, onFile, openFile, analyze, reset } = flow;
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const scrollTo = (next: number) => {
    const el = scroller.current;
    if (!el || !result) return;
    const clamped = Math.max(0, Math.min(result.suggestions.length - 1, next));
    const card = el.children[clamped] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setIndex(clamped);
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !result) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const node = child as HTMLElement;
      const nodeCenter = node.offsetLeft + node.offsetWidth / 2;
      const dist = Math.abs(center - nodeCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setIndex(closest);
  };

  return (
    <div className="-mx-5">
      <AiStylePhotoInput fileRef={fileRef} onFile={onFile} />

      {!photo ? (
        <div className="px-5">
          <p className="mb-3 text-[11px] text-muted-foreground">{t("aiStylePage.privacyNote")}</p>
          <AiStyleUploadEmpty onOpen={openFile} />
        </div>
      ) : (
        <div className="relative bg-foreground">
          <AiStylePhotoPreview
            photo={photo}
            analyzing={analyzing}
            onReset={reset}
            fullBleed
            imageClassName="aspect-[3/4] max-h-[52vh] min-h-[320px]"
          />
          {analyzing ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <AiStyleScanLine fullBleed />
            </div>
          ) : null}

          {!done ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground via-foreground/90 to-transparent p-5 pt-12">
              <button
                type="button"
                onClick={() => analyze(audience)}
                disabled={analyzing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-background px-5 py-4 text-sm font-bold text-foreground active:scale-[0.98] disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {analyzing ? t("aiStylePage.analyzing") : t("aiStylePage.analyzeCta")}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {done && result ? (
        <div className="mt-5 space-y-4 px-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t("aiStylePage.cameraLabel")}
              </p>
              <h2 className="text-lg font-bold">{t("aiStylePage.resultsTitle")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(`aiStylePage.faceShapes.${result.faceShapeKey}`)} ·{" "}
                {t(`aiStylePage.hairTypes.${result.hairTypeKey}`)}
              </p>
            </div>
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold uppercase text-background">
              {t("aiStylePage.betaBadge")}
            </span>
          </div>

          <div className="relative -mx-1">
            <div
              ref={scroller}
              onScroll={onScroll}
              className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
            >
              {result.suggestions.map((s) => (
                <article
                  key={s.id}
                  className="relative w-[84vw] max-w-[300px] shrink-0 snap-center overflow-hidden rounded-[28px] bg-foreground text-background shadow-[0_24px_56px_-20px_oklch(0.145_0_0/0.28)]"
                >
                  <div className="h-[160px]" style={{ background: styleCoverGradient(s.seed) }} />
                  <div className="absolute left-4 top-4 rounded-full bg-background px-2.5 py-1 text-[11px] font-bold text-foreground">
                    {t("aiStylePage.matchPct", { value: s.match })}
                  </div>
                  <div className="space-y-2 p-5 pt-4">
                    <h3 className="text-xl font-bold leading-tight">{s.title}</h3>
                    <p className="text-xs text-background/65">{t(s.reasonKey)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-background/45">
                      {s.barberName} · {s.salonName}
                    </p>
                    <Link
                      to="/booking/$salonId"
                      params={{ salonId: s.salonId }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-background py-3.5 text-sm font-bold text-foreground active:scale-[0.98]"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      {t("aiStylePage.bookCta")}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {result.suggestions.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => scrollTo(index - 1)}
                  disabled={index === 0}
                  className="absolute left-0 top-[38%] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm disabled:opacity-30"
                  aria-label={t("common.back")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo(index + 1)}
                  disabled={index === result.suggestions.length - 1}
                  className="absolute right-0 top-[38%] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm disabled:opacity-30"
                  aria-label="Keyingi"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>

          <div className="flex justify-center gap-1.5">
            {result.suggestions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-foreground" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>

          <p className="text-center text-[11px] font-medium text-muted-foreground">
            {t("aiStylePage.swipeHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
