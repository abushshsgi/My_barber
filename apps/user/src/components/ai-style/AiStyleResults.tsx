import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bookmark, CalendarPlus, Loader2, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { isCatalogStyleId, styleCoverGradient } from "@/components/ai-style/ai-style-shared";
import { cn } from "@/lib/utils";

type Suggestion = AiAnalysisResult["suggestions"][number];

function StylePreview({
  suggestion,
  tryOnPreview,
}: {
  suggestion: Suggestion;
  tryOnPreview?: string;
}) {
  const src = tryOnPreview || suggestion.imageUrl;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="h-full w-full" style={{ background: styleCoverGradient(suggestion.seed) }} />
  );
}

export function AiStyleResultsSummary({
  result,
  tone = "light",
}: {
  result: AiAnalysisResult;
  tone?: "light" | "dark";
}) {
  const { t } = useTranslation();
  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "rounded-2xl p-4",
        dark ? "bg-background/10 text-background" : "border border-border bg-background",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.16em]",
          dark ? "text-background/55" : "text-muted-foreground",
        )}
      >
        {t("aiStylePage.analysisTitle")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold",
            dark ? "bg-background/15" : "bg-surface",
          )}
        >
          {t(`aiStylePage.faceShapes.${result.faceShapeKey}`)}
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold",
            dark ? "bg-background/15" : "bg-surface",
          )}
        >
          {t(`aiStylePage.hairTypes.${result.hairTypeKey}`)}
        </span>
      </div>
      <p
        className={cn(
          "mt-3 text-xs leading-relaxed",
          dark ? "text-background/75" : "text-muted-foreground",
        )}
      >
        {result.summaryUz ?? t("aiStylePage.resultDesc")}
      </p>
    </div>
  );
}

function SuggestionActions({
  suggestion,
  saved,
  onToggleSave,
  compact,
  tryOnPreview,
  tryOnLoading,
  onGenerateTryOn,
}: {
  suggestion: Suggestion;
  saved: boolean;
  onToggleSave: (id: string) => void;
  compact?: boolean;
  tryOnPreview?: string;
  tryOnLoading?: boolean;
  onGenerateTryOn?: (styleId: string) => void;
}) {
  const { t } = useTranslation();
  const canTryOn = Boolean(onGenerateTryOn && isCatalogStyleId(suggestion.id));

  return (
    <div className={cn("mt-3 flex flex-wrap gap-1.5", compact && "mt-2")}>
      {canTryOn ? (
        <button
          type="button"
          disabled={tryOnLoading || Boolean(tryOnPreview)}
          onClick={() => onGenerateTryOn?.(suggestion.id)}
          className={cn(
            "inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-bold",
            tryOnPreview
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-surface",
          )}
        >
          {tryOnLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {tryOnPreview ? t("aiStylePage.tryOnDone") : t("aiStylePage.tryOnMe")}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onToggleSave(suggestion.id)}
        className={cn(
          "inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-bold",
          saved ? "border-foreground bg-foreground text-background" : "border-border bg-surface",
        )}
      >
        <Bookmark className="h-3 w-3" />
        {t("aiStylePage.save")}
      </button>
      {isCatalogStyleId(suggestion.id) ? (
        <Link
          to="/explore/$styleId"
          params={{ styleId: suggestion.id }}
          className="inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-surface px-2 py-2 text-[10px] font-bold"
        >
          {t("aiStylePage.viewStyle")}
        </Link>
      ) : null}
      {suggestion.salonId ? (
        <Link
          to="/booking/$salonId"
          params={{ salonId: suggestion.salonId }}
          className="inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-lg bg-foreground px-2 py-2 text-[10px] font-bold text-background"
        >
          <CalendarPlus className="h-3 w-3" />
          {t("aiStylePage.bookShort")}
        </Link>
      ) : (
        <span className="inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-lg bg-muted px-2 py-2 text-[10px] font-bold text-muted-foreground">
          <CalendarPlus className="h-3 w-3" />
          {t("aiStylePage.bookShort")}
        </span>
      )}
    </div>
  );
}

export function AiStyleSuggestionsCarousel({
  suggestions,
  saved,
  onToggleSave,
  tryOnByStyle,
  tryOnLoadingId,
  onGenerateTryOn,
  focusStyleId,
}: {
  suggestions: Suggestion[];
  saved: string[];
  onToggleSave: (id: string) => void;
  tryOnByStyle?: Record<string, string>;
  tryOnLoadingId?: string | null;
  onGenerateTryOn?: (styleId: string) => void;
  focusStyleId?: string;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!focusStyleId) return;
    const el = document.getElementById(`ai-style-suggestion-${focusStyleId}`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusStyleId, suggestions]);

  return (
    <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
      {suggestions.map((suggestion, index) => (
        <motion.article
          key={suggestion.id}
          id={`ai-style-suggestion-${suggestion.id}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06 }}
          className={cn(
            "w-[200px] shrink-0 snap-center",
            focusStyleId === suggestion.id && "ring-2 ring-foreground ring-offset-2 rounded-2xl",
          )}
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <div className="relative aspect-[3/4] overflow-hidden">
              <StylePreview
                suggestion={suggestion}
                tryOnPreview={tryOnByStyle?.[suggestion.id]}
              />
              <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">
                {tryOnLoadingId === suggestion.id
                  ? t("aiStylePage.tryOnGenerating")
                  : tryOnByStyle?.[suggestion.id]
                    ? t("aiStylePage.tryOnBadge")
                    : t("aiStylePage.matchPct", { value: suggestion.match })}
              </span>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                #{index + 1}
              </p>
              <h3 className="mt-0.5 text-sm font-bold leading-tight">{suggestion.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                {suggestion.reason ?? (suggestion.reasonKey ? t(suggestion.reasonKey) : "")}
              </p>
              <SuggestionActions
                suggestion={suggestion}
                saved={saved.includes(suggestion.id)}
                onToggleSave={onToggleSave}
                tryOnPreview={tryOnByStyle?.[suggestion.id]}
                tryOnLoading={tryOnLoadingId === suggestion.id}
                onGenerateTryOn={onGenerateTryOn}
              />
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

export function AiStyleSuggestionsStack({
  suggestions,
  saved,
  onToggleSave,
  tryOnByStyle,
  tryOnLoadingId,
  onGenerateTryOn,
}: {
  suggestions: Suggestion[];
  saved: string[];
  onToggleSave: (id: string) => void;
  tryOnByStyle?: Record<string, string>;
  tryOnLoadingId?: string | null;
  onGenerateTryOn?: (styleId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <motion.article
          key={suggestion.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className="overflow-hidden rounded-[22px] border border-border bg-background"
        >
          <div className="relative h-32 overflow-hidden">
            <StylePreview
              suggestion={suggestion}
              tryOnPreview={tryOnByStyle?.[suggestion.id]}
            />
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  #{index + 1}
                </p>
                <h3 className="mt-0.5 text-base font-bold">{suggestion.title}</h3>
              </div>
              <span className="shrink-0 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background">
                {t("aiStylePage.matchPct", { value: suggestion.match })}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {suggestion.reason ?? (suggestion.reasonKey ? t(suggestion.reasonKey) : "")}
            </p>
            <p className="mt-2 text-[10px] font-bold text-muted-foreground">
              {suggestion.barberName} · {suggestion.salonName}
            </p>
            <SuggestionActions
              suggestion={suggestion}
              saved={saved.includes(suggestion.id)}
              onToggleSave={onToggleSave}
              tryOnPreview={tryOnByStyle?.[suggestion.id]}
              tryOnLoading={tryOnLoadingId === suggestion.id}
              onGenerateTryOn={onGenerateTryOn}
            />
          </div>
        </motion.article>
      ))}
    </div>
  );
}

export function AiStyleResultsBlock({
  result,
  saved,
  onToggleSave,
  onReset,
  layout = "carousel",
  summaryTone = "light",
  tryOnByStyle,
  tryOnLoadingId,
  onGenerateTryOn,
  focusStyleId,
}: {
  result: AiAnalysisResult;
  saved: string[];
  onToggleSave: (id: string) => void;
  onReset: () => void;
  layout?: "carousel" | "stack";
  summaryTone?: "light" | "dark";
  tryOnByStyle?: Record<string, string>;
  tryOnLoadingId?: string | null;
  onGenerateTryOn?: (styleId: string) => void;
  focusStyleId?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <AiStyleResultsSummary result={result} tone={summaryTone} />
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{t("aiStylePage.resultsTitle")}</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {layout === "carousel" ? t("aiStylePage.swipeHint") : t("aiStylePage.resultsHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-[10px] font-bold"
        >
          {t("aiStylePage.tryAgain")}
        </button>
      </div>
      {layout === "carousel" ? (
        <AiStyleSuggestionsCarousel
          suggestions={result.suggestions}
          saved={saved}
          onToggleSave={onToggleSave}
          tryOnByStyle={tryOnByStyle}
          tryOnLoadingId={tryOnLoadingId}
          onGenerateTryOn={onGenerateTryOn}
          focusStyleId={focusStyleId}
        />
      ) : (
        <AiStyleSuggestionsStack
          suggestions={result.suggestions}
          saved={saved}
          onToggleSave={onToggleSave}
          tryOnByStyle={tryOnByStyle}
          tryOnLoadingId={tryOnLoadingId}
          onGenerateTryOn={onGenerateTryOn}
        />
      )}
    </div>
  );
}
