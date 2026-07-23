import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
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
      className="group block min-w-0 transition-opacity hover:opacity-95 active:opacity-90"
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
      <p className={cn("mt-2 truncate font-bold leading-tight", compact ? "text-sm" : "text-sm lg:text-[15px]")}>
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
  compact?: boolean;
  className?: string;
};

export function ExploreStyleGrid({
  items,
  personaKey,
  isLoading,
  isError,
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
      <p className={cn("text-center text-sm text-destructive", className)}>
        {t("common.loadError")}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className={cn("text-center text-sm text-muted-foreground", className)}>
        {t("explorePage.empty")}
      </p>
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
          priority={index < 6}
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
        <span className="text-sm font-extrabold leading-tight">{t("explorePage.aiStyleCtaTitle")}</span>
        <span className="text-xs text-background/70">{t("explorePage.tryAiStyle")}</span>
      </div>
      <span className="flex shrink-0 items-center justify-center border-l border-background/15 px-4">
        <Sparkles className="size-5 transition group-hover:rotate-12" strokeWidth={2.2} />
      </span>
    </Link>
  );
}
