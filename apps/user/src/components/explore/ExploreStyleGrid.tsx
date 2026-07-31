import { Link } from "@tanstack/react-router";
import { Loader2, RotateCw, Scissors, Sparkles, WifiOff } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ExploreStyleGallery } from "@/components/explore/ExploreStyleGallery";
import { getHairstyleDisplayUrl, type HairstyleEntry } from "@/lib/hairstyles/catalog";
import { cn } from "@/lib/utils";

function ExploreStyleCard({
  entry,
  compact,
  priority,
}: {
  entry: HairstyleEntry;
  compact?: boolean;
  priority?: boolean;
}) {
  const imageUrl = getHairstyleDisplayUrl(entry);
  const frontItem = useMemo(
    () => entry.gallery.find((item) => item.view === "front"),
    [entry.gallery],
  );
  const galleryItems = useMemo(
    () => [frontItem ?? { view: "front", label: "Old", url: imageUrl }],
    [frontItem, imageUrl],
  );

  return (
    <Link
      to="/explore/$styleId"
      params={{ styleId: entry.id }}
      className="group block min-w-0 cursor-pointer transition-opacity duration-200 hover:opacity-95 active:opacity-90"
    >
      <ExploreStyleGallery
        items={galleryItems}
        title={entry.titleUz}
        autoPlay={false}
        showThumbs={false}
        variant="gridCard"
        priority={priority}
        className="pointer-events-none space-y-0"
      />
      <p
        className={cn(
          "mt-2 truncate font-bold leading-tight",
          compact ? "text-sm" : "text-sm lg:text-[15px]",
        )}
      >
        {entry.titleUz}
      </p>
      {!compact ? (
        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:text-[11px]">
          {entry.category}
        </p>
      ) : null}
    </Link>
  );
}

function ExploreStyleSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="min-w-0 animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-surface" />
      <div className="mt-2 h-4 w-3/4 rounded bg-surface" />
      {!compact ? <div className="mt-1.5 h-3 w-1/2 rounded bg-surface" /> : null}
    </div>
  );
}

type GridProps = {
  items: HairstyleEntry[];
  personaKey?: string | null;
  isLoading?: boolean;
  isError?: boolean;
  isRetrying?: boolean;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
};

export function ExploreStyleGrid({
  items,
  personaKey,
  isLoading,
  isError,
  isRetrying,
  onRetry,
  compact,
  className,
}: GridProps) {
  const { t } = useTranslation();
  const skeletonCount = compact ? 6 : 10;

  if (isLoading) {
    return (
      <div
        className={cn(
          compact
            ? "grid grid-cols-2 gap-2"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4",
          className,
        )}
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ExploreStyleSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "rounded-3xl border border-border bg-surface/60 px-5 py-8 text-center",
          className,
        )}
      >
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <WifiOff className="size-5" strokeWidth={2.25} />
        </span>
        <p className="mt-3 text-[15px] font-bold">{t("common.loadError")}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-snug text-muted-foreground">
          {t("explorePage.loadErrorHint", {
            defaultValue: "Internetni tekshiring va qayta urinib ko‘ring.",
          })}
        </p>
        {onRetry ? (
          <button
            type="button"
            disabled={isRetrying}
            onClick={onRetry}
            className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[13px] font-bold text-background transition-opacity duration-200 hover:opacity-90 touch-manipulation active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRetrying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCw className="size-4" strokeWidth={2.25} />
            )}
            {t("common.retry", { defaultValue: "Qayta urinish" })}
          </button>
        ) : null}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-3xl border border-dashed border-border bg-surface/40 px-5 py-8 text-center",
          className,
        )}
      >
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Scissors className="size-5" strokeWidth={2.25} />
        </span>
        <p className="mt-3 text-[15px] font-bold">{t("explorePage.empty")}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-snug text-muted-foreground">
          {t("explorePage.emptyHint", {
            defaultValue: "Boshqa model yoki filtrni tanlab ko‘ring.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        compact
          ? "grid grid-cols-2 gap-2"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4",
        className,
      )}
    >
      {items.map((entry, index) => (
        <ExploreStyleCard
          key={`${personaKey ?? "default"}-${entry.id}`}
          entry={entry}
          compact={compact}
          priority={index < 4}
        />
      ))}
    </div>
  );
}

export function ExploreAiStyleBanner({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Link
      to="/ai-style"
      preload="intent"
      className={cn(
        "group relative flex items-stretch overflow-hidden rounded-[1.35rem] bg-foreground text-background",
        "transition active:scale-[0.99]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-4 pr-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-background/55">
          Morf AI
        </span>
        <span className="text-sm font-extrabold leading-tight">
          {t("explorePage.aiStyleCtaTitle")}
        </span>
        <span className="text-xs text-background/70">{t("explorePage.tryAiStyle")}</span>
      </div>
      <span className="flex shrink-0 items-center justify-center border-l border-background/15 px-4">
        <Sparkles className="size-5 transition group-hover:rotate-12" strokeWidth={2.2} />
      </span>
    </Link>
  );
}
