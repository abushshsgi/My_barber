import { SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AudienceFilter } from "@/hooks/use-audience";
import { categoriesForAudience } from "@/hooks/use-audience";
import {
  DEFAULT_MAP_FILTERS,
  MAP_AMENITY_CODES,
  countActiveMapFilters,
  type MapFiltersState,
  type MapPriceBucket,
  type MapRatingMin,
  type MapDistanceMax,
} from "@/lib/map-filters";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  filters: MapFiltersState;
  onChange: (next: MapFiltersState) => void;
  mapAudience: AudienceFilter;
  variant?: "inline" | "dialog";
};

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-background text-foreground hover:border-foreground/30",
      )}
    >
      {children}
    </button>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MapFiltersForm({ filters, onChange, mapAudience }: Omit<Props, "variant">) {
  const { t } = useTranslation();
  const categories = categoriesForAudience(mapAudience);

  const priceOptions: { id: MapPriceBucket; label: string }[] = [
    { id: "any", label: t("map.filters.price.any") },
    { id: "under100", label: t("map.filters.price.under100") },
    { id: "100-200", label: t("map.filters.price.100-200") },
    { id: "200-500", label: t("map.filters.price.200-500") },
    { id: "500plus", label: t("map.filters.price.500plus") },
  ];

  const ratingOptions: { id: MapRatingMin; label: string }[] = [
    { id: "any", label: t("map.filters.rating.any") },
    { id: "4.5", label: t("map.filters.rating.4_5") },
    { id: "4.0", label: t("map.filters.rating.4_0") },
    { id: "3.5", label: t("map.filters.rating.3_5") },
  ];

  const distanceOptions: { id: MapDistanceMax; label: string }[] = [
    { id: "any", label: t("map.filters.distance.any") },
    { id: "1", label: t("map.filters.distance.1km") },
    { id: "3", label: t("map.filters.distance.3km") },
    { id: "5", label: t("map.filters.distance.5km") },
    { id: "10", label: t("map.filters.distance.10km") },
  ];

  const toggleAmenity = (code: string) => {
    const set = new Set(filters.amenities);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    onChange({ ...filters, amenities: [...set] });
  };

  return (
    <div className="space-y-4">
      <FilterSection title={t("map.filters.priceTitle")}>
        {priceOptions.map((opt) => (
          <FilterChip
            key={opt.id}
            active={filters.price === opt.id}
            onClick={() => onChange({ ...filters, price: opt.id })}
          >
            {opt.label}
          </FilterChip>
        ))}
      </FilterSection>

      <FilterSection title={t("map.filters.ratingTitle")}>
        {ratingOptions.map((opt) => (
          <FilterChip
            key={opt.id}
            active={filters.ratingMin === opt.id}
            onClick={() => onChange({ ...filters, ratingMin: opt.id })}
          >
            {opt.label}
          </FilterChip>
        ))}
      </FilterSection>

      <FilterSection title={t("map.filters.categoryTitle")}>
        {categories.map((key) => (
          <FilterChip
            key={key}
            active={filters.category === key}
            onClick={() => onChange({ ...filters, category: key })}
          >
            {t(`home.categories.${key}`, { defaultValue: key })}
          </FilterChip>
        ))}
      </FilterSection>

      <FilterSection title={t("map.filters.amenitiesTitle")}>
        {MAP_AMENITY_CODES.map((code) => (
          <FilterChip
            key={code}
            active={filters.amenities.includes(code)}
            onClick={() => toggleAmenity(code)}
          >
            {t(`map.filters.amenity.${code}`)}
          </FilterChip>
        ))}
      </FilterSection>

      <FilterSection title={t("map.filters.distanceTitle")}>
        {distanceOptions.map((opt) => (
          <FilterChip
            key={opt.id}
            active={filters.distanceMax === opt.id}
            onClick={() => onChange({ ...filters, distanceMax: opt.id })}
          >
            {opt.label}
          </FilterChip>
        ))}
      </FilterSection>

      <FilterSection title={t("map.filters.moreTitle")}>
        <FilterChip
          active={filters.guestFavorite}
          onClick={() => onChange({ ...filters, guestFavorite: !filters.guestFavorite })}
        >
          {t("map.filters.guestFavorite")}
        </FilterChip>
      </FilterSection>

      {countActiveMapFilters(filters) > 0 ? (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_MAP_FILTERS)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <X className="h-3.5 w-3.5" />
          {t("map.filters.clear")}
        </button>
      ) : null}
    </div>
  );
}

export function MapFilters({ filters, onChange, mapAudience, variant = "inline" }: Props) {
  const { t } = useTranslation();
  const activeCount = countActiveMapFilters(filters);

  if (variant === "dialog") {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-bold transition-colors",
              activeCount > 0
                ? "border-foreground bg-foreground text-background"
                : "border-border/60 bg-background text-foreground",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.4} />
            {t("map.filters.title")}
            {activeCount > 0 ? <span className="tabular-nums">({activeCount})</span> : null}
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("map.filters.title")}</DialogTitle>
          </DialogHeader>
          <MapFiltersForm filters={filters} onChange={onChange} mapAudience={mapAudience} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-background/80 p-3.5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-bold">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.4} />
          {t("map.filters.title")}
          {activeCount > 0 ? (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
              {activeCount}
            </span>
          ) : null}
        </p>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_MAP_FILTERS)}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            {t("map.filters.clear")}
          </button>
        ) : null}
      </div>
      <MapFiltersForm filters={filters} onChange={onChange} mapAudience={mapAudience} />
    </div>
  );
}
