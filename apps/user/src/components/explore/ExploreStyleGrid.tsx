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
}: {
  entry: HairstyleEntry;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const imageUrl = getHairstyleDisplayUrl(entry);
  const galleryItems = useMemo(
    () => (entry.gallery.length > 0 ? entry.gallery : [{ view: "front", label: "Old", url: imageUrl }]),
    [entry.gallery, imageUrl],
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
        autoPlay={galleryItems.length > 1}
        showThumbs={false}
        badge={
          <span className="rounded-full bg-background/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm">
            {t("explorePage.sampleBadge")}
          </span>
        }
        className="pointer-events-none space-y-0"
      />
      <p className={cn("mt-2.5 truncate font-bold leading-tight", compact ? "text-sm" : "text-sm lg:text-[15px]")}>
        {entry.titleUz}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:text-[11px]">
        {t(`homePage.audience.${entry.audience}`)} · {entry.category}
      </p>
    </Link>
  );
}

function ExploreStyleSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="min-w-0 animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-surface" />
      <div className="mt-2.5 h-4 w-3/4 rounded bg-surface" />
      <div className="mt-1.5 h-3 w-1/2 rounded bg-surface" />
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
          "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4",
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
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4",
        className,
      )}
    >
      {items.map((entry) => (
        <ExploreStyleCard key={`${personaKey ?? "default"}-${entry.id}`} entry={entry} compact={compact} />
      ))}
    </div>
  );
}

export function ExploreAiStyleBanner({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Link
      to="/ai-style"
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 transition-colors",
        "hover:border-foreground/20 hover:bg-surface/80",
        className,
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
        <Sparkles className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{t("explorePage.aiStyleCtaTitle")}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{t("explorePage.aiStyleCtaDesc")}</span>
      </span>
      <span className="shrink-0 text-xs font-bold text-muted-foreground transition group-hover:text-foreground">
        {t("explorePage.tryAiStyle")} →
      </span>
    </Link>
  );
}
