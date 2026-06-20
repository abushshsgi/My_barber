import { useTranslation } from "react-i18next";
import { useRegions } from "@/hooks/use-regions";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showAllOption?: boolean;
  className?: string;
  id?: string;
};

export function RegionCitySelect({
  value,
  onChange,
  disabled,
  showAllOption = false,
  className,
  id,
}: Props) {
  const { t } = useTranslation();
  const { data: regions = [], isLoading } = useRegions();

  return (
    <select
      id={id}
      value={value}
      disabled={disabled || isLoading}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold focus:border-foreground focus:outline-none disabled:opacity-50",
        className,
      )}
    >
      {showAllOption ? (
        <option value="">{t("addresses.allCities", { defaultValue: "Barcha shaharlar" })}</option>
      ) : (
        <option value="">{t("addresses.selectCity", { defaultValue: "Tanlang…" })}</option>
      )}
      {regions.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
