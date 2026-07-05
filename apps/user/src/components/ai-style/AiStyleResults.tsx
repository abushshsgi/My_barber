import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bookmark, CalendarPlus, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { AiStyleMoreStyles } from "@/components/ai-style/AiStyleMoreStyles";
import { isCatalogStyleId, styleCoverGradient } from "@/components/ai-style/ai-style-shared";
import type { Audience } from "@/lib/mock-data";
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
        className="h-full w-full object-cover object-top"
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
  minimal = false,
}: {
  result: AiAnalysisResult;
  tone?: "light" | "dark";
  minimal?: boolean;
}) {
  const { t } = useTranslation();
  const dark = tone === "dark";

  if (minimal) {
    return (
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
          {t("aiStylePage.analysisTitle")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-bold text-white">
            {t(`aiStylePage.faceShapes.${result.faceShapeKey}`)}
          </span>
          <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-bold text-white">
            {t(`aiStylePage.hairTypes.${result.hairTypeKey}`)}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-neutral-600">
          {result.summaryUz ?? t("aiStylePage.resultDesc")}
        </p>
      </div>
    );
  }

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

function IconActionButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-12 w-12 place-items-center rounded-full transition-colors",
        active ? "bg-black text-white" : "bg-neutral-100 text-black",
        disabled && "opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function SpotlightCard({
  suggestion,
  index,
  saved,
  onToggleSave,
  tryOnPreview,
  tryOnLoading,
  onGenerateTryOn,
}: {
  suggestion: Suggestion;
  index: number;
  saved: boolean;
  onToggleSave: (id: string) => void;
  tryOnPreview?: string;
  tryOnLoading?: boolean;
  onGenerateTryOn?: (styleId: string) => void;
}) {
  const { t } = useTranslation();
  const canTryOn = Boolean(onGenerateTryOn && isCatalogStyleId(suggestion.id));
  const reason = suggestion.reason ?? (suggestion.reasonKey ? t(suggestion.reasonKey) : "");

  return (
    <article
      id={`ai-style-suggestion-${suggestion.id}`}
      data-index={index}
      className="w-full"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-neutral-100">
        <StylePreview suggestion={suggestion} tryOnPreview={tryOnPreview} />

        {tryOnLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-[2px]">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
            <p className="text-xs font-semibold text-white">{t("aiStylePage.tryOnGenerating")}</p>
          </div>
        ) : null}

        {tryOnPreview && !tryOnLoading ? (
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-black">
            {t("aiStylePage.tryOnBadge")}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/55 to-transparent px-4 pb-4 pt-20">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">
                #{index + 1}
              </p>
              <h3 className="mt-0.5 truncate text-xl font-bold text-white">{suggestion.title}</h3>
            </div>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-black">
              {t("aiStylePage.matchPct", { value: suggestion.match })}
            </span>
          </div>
        </div>
      </div>

      {reason ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-600">{reason}</p>
      ) : null}

      {suggestion.salonId ? (
        <Link
          to="/booking/$salonId"
          params={{ salonId: suggestion.salonId }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-bold text-white active:opacity-90"
        >
          <CalendarPlus className="h-4 w-4" />
          {t("aiStylePage.bookCta")}
        </Link>
      ) : (
        <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold text-neutral-400">
          <CalendarPlus className="h-4 w-4" />
          {t("aiStylePage.bookCta")}
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-2">
        {canTryOn ? (
          <IconActionButton
            label={tryOnPreview ? t("aiStylePage.tryOnDone") : t("aiStylePage.tryOnMe")}
            active={Boolean(tryOnPreview)}
            disabled={tryOnLoading || Boolean(tryOnPreview)}
            onClick={() => onGenerateTryOn?.(suggestion.id)}
          >
            {tryOnLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </IconActionButton>
        ) : null}
        <IconActionButton
          label={t("aiStylePage.save")}
          active={saved}
          onClick={() => onToggleSave(suggestion.id)}
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        </IconActionButton>
        {isCatalogStyleId(suggestion.id) ? (
          <Link
            to="/explore/$styleId"
            params={{ styleId: suggestion.id }}
            aria-label={t("aiStylePage.viewStyle")}
            className="grid h-12 w-12 place-items-center rounded-full bg-neutral-100 text-black transition-colors active:opacity-80"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function AiStyleSuggestionsSpotlight({
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!focusStyleId) return;
    const el = document.getElementById(`ai-style-suggestion-${focusStyleId}`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusStyleId, suggestions]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const cards = root.querySelectorAll<HTMLElement>("[data-index]");
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) setActive(index);
        }
      },
      { root, threshold: [0.55, 0.75] },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [suggestions]);

  return (
    <div>
      <div
        ref={scrollRef}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 no-scrollbar"
      >
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex-[0_0_100%] snap-center"
          >
            <SpotlightCard
              suggestion={suggestion}
              index={index}
              saved={saved.includes(suggestion.id)}
              onToggleSave={onToggleSave}
              tryOnPreview={tryOnByStyle?.[suggestion.id]}
              tryOnLoading={tryOnLoadingId === suggestion.id}
              onGenerateTryOn={onGenerateTryOn}
            />
          </motion.div>
        ))}
      </div>

      {suggestions.length > 1 ? (
        <div className="mt-4 flex justify-center gap-1.5">
          {suggestions.map((suggestion, index) => (
            <span
              key={suggestion.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === active ? "w-5 bg-black" : "w-1.5 bg-neutral-300",
              )}
            />
          ))}
        </div>
      ) : null}
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
            "inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-bold",
            tryOnPreview ? "border-foreground bg-foreground text-background" : "border-border bg-surface",
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
          "inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-bold",
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
          className="inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-surface px-2 py-2.5 text-[10px] font-bold"
        >
          {t("aiStylePage.viewStyle")}
        </Link>
      ) : null}
      {suggestion.salonId ? (
        <Link
          to="/booking/$salonId"
          params={{ salonId: suggestion.salonId }}
          className="inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-xl bg-foreground px-2 py-2.5 text-[10px] font-bold text-background"
        >
          <CalendarPlus className="h-3 w-3" />
          {t("aiStylePage.bookShort")}
        </Link>
      ) : (
        <span className="inline-flex min-w-[calc(50%-0.25rem)] flex-1 items-center justify-center gap-1 rounded-xl bg-muted px-2 py-2.5 text-[10px] font-bold text-muted-foreground">
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
  minimal = false,
}: {
  suggestions: Suggestion[];
  saved: string[];
  onToggleSave: (id: string) => void;
  tryOnByStyle?: Record<string, string>;
  tryOnLoadingId?: string | null;
  onGenerateTryOn?: (styleId: string) => void;
  focusStyleId?: string;
  minimal?: boolean;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!focusStyleId || minimal) return;
    const el = document.getElementById(`ai-style-suggestion-${focusStyleId}`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusStyleId, suggestions, minimal]);

  if (minimal) {
    return (
      <AiStyleSuggestionsSpotlight
        suggestions={suggestions}
        saved={saved}
        onToggleSave={onToggleSave}
        tryOnByStyle={tryOnByStyle}
        tryOnLoadingId={tryOnLoadingId}
        onGenerateTryOn={onGenerateTryOn}
        focusStyleId={focusStyleId}
      />
    );
  }

  return (
    <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
      {suggestions.map((suggestion, index) => (
        <motion.article
          key={suggestion.id}
          id={`ai-style-suggestion-${suggestion.id}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06 }}
          className={cn(
            "w-[min(72vw,220px)] shrink-0 snap-center",
            focusStyleId === suggestion.id && "rounded-2xl ring-2 ring-black ring-offset-2",
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
  variant = "default",
  audience,
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
  variant?: "default" | "minimal";
  audience?: Audience;
  tryOnByStyle?: Record<string, string>;
  tryOnLoadingId?: string | null;
  onGenerateTryOn?: (styleId: string) => void;
  focusStyleId?: string;
}) {
  const { t } = useTranslation();
  const minimal = variant === "minimal";
  const suggestedIds = result.suggestions.map((s) => s.id);

  return (
    <div className="space-y-5">
      <AiStyleResultsSummary result={result} tone={summaryTone} minimal={minimal} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-black">{t("aiStylePage.resultsTitle")}</h2>
        <button
          type="button"
          onClick={onReset}
          className={cn(
            "shrink-0 text-[11px] font-bold",
            minimal ? "text-neutral-500 underline underline-offset-2" : "rounded-full border border-border bg-background px-3.5 py-2 text-[10px]",
          )}
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
          minimal={minimal}
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
      {minimal && audience ? (
        <AiStyleMoreStyles
          audience={audience}
          excludeIds={suggestedIds}
          tryOnByStyle={tryOnByStyle}
          tryOnLoadingId={tryOnLoadingId}
          onGenerateTryOn={onGenerateTryOn}
        />
      ) : null}
    </div>
  );
}
