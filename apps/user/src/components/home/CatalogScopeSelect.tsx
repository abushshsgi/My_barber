import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRegions } from "@/hooks/use-regions";
import { CATALOG_SCOPE_ALL, type CatalogScopeValue } from "@/lib/catalog-scope";
import { cn } from "@/lib/utils";

type Props = {
  value: CatalogScopeValue;
  onChange: (value: CatalogScopeValue) => void;
  className?: string;
  /** Compact chip style for mobile home */
  compact?: boolean;
};

/** Home / map — O‘zbekiston yoki viloyat tanlash. */
export function CatalogScopeSelect({ value, onChange, className, compact }: Props) {
  const { t } = useTranslation();
  const { data: regions = [], isLoading } = useRegions();

  return (
    <label
      className={cn(
        "flex min-w-0 items-center gap-2",
        compact ? "" : "w-full rounded-xl border border-border bg-background px-3 py-2.5",
        className,
      )}
    >
      <MapPin
        className={cn("shrink-0 text-muted-foreground", compact ? "size-3.5" : "size-4")}
        strokeWidth={2}
        aria-hidden
      />
      <select
        value={value}
        disabled={isLoading}
        onChange={(e) => onChange(e.target.value as CatalogScopeValue)}
        aria-label={t("home.catalogScope.label", { defaultValue: "Hudud" })}
        className={cn(
          "min-w-0 flex-1 appearance-none bg-transparent font-semibold text-foreground focus:outline-none disabled:opacity-50",
          compact ? "truncate text-[13px]" : "text-sm",
        )}
      >
        <option value={CATALOG_SCOPE_ALL}>
          {t("home.catalogScope.uzbekistan", { defaultValue: "O‘zbekiston" })}
        </option>
        {regions.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
