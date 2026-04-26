import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGIONS, type RegionCode } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function FilterToolbar({
  search,
  onSearchChange,
  region,
  onRegionChange,
  searchPlaceholder = "Qidirish...",
  children,
  className,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  region?: RegionCode | "";
  onRegionChange?: (v: RegionCode | "") => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap", className)}>
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 bg-card"
        />
      </div>

      {onRegionChange && (
        <Select
          value={region || "all"}
          onValueChange={(v) => onRegionChange(v === "all" ? "" : (v as RegionCode))}
        >
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Hudud" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha hududlar</SelectItem>
            {REGIONS.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {children}
    </div>
  );
}
