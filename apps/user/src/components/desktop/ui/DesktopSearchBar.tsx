import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  large?: boolean;
};

export function DesktopSearchBar({ value, onChange, className, large }: Props) {
  const { t } = useTranslation();
  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground",
          large ? "h-5 w-5" : "h-4 w-4",
        )}
        strokeWidth={2.2}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("common.search")}
        className={cn(
          "w-full rounded-full border border-border bg-surface font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground",
          large ? "py-3.5 pl-12 pr-5 text-sm" : "py-2.5 pl-10 pr-4 text-sm",
        )}
      />
    </div>
  );
}
