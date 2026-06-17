import { lazy, Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Scissors, MapPin } from "lucide-react";
import { fetchAllSalonsForMap, fetchAllBarbersForMap } from "@/lib/admin-api";
import { UZ_REGIONS, type UzRegionCode } from "@/lib/uz-regions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KPICard } from "@/components/admin/KPICard";

const AdminMap2GIS = lazy(() => import("@/components/admin/AdminMap2GIS"));

export const Route = createFileRoute("/admin/map")({
  component: MapPage,
});

function MapPage() {
  const [region, setRegion] = useState<UzRegionCode | "">("");

  const salonsQ = useQuery({
    queryKey: ["admin", "map", "salons", { region }],
    queryFn: () => fetchAllSalonsForMap(region),
  });

  const barbersQ = useQuery({
    queryKey: ["admin", "map", "barbers", { region }],
    queryFn: () => fetchAllBarbersForMap(region),
  });

  const salons = salonsQ.data ?? [];
  const barbers = barbersQ.data ?? [];
  const isLoading = salonsQ.isLoading || barbersQ.isLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Geo xarita
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Salonlar va sartaroshlarning O'zbekiston bo'ylab joylashuvi.
          </p>
        </div>
        <Select
          value={region || "all"}
          onValueChange={(v) => setRegion(v === "all" ? "" : (v as UzRegionCode))}
        >
          <SelectTrigger className="w-56 bg-card">
            <SelectValue placeholder="Hudud" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Butun O'zbekiston</SelectItem>
            {UZ_REGIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Salonlar"
          value={salons.length}
          hint={region ? "Tanlangan hududda" : "Jami"}
        />
        <KPICard
          label="Xaritadagi sartaroshlar"
          value={barbers.length}
          hint="Koordinatasi mavjud"
        />
        <KPICard label="Hududlar" value={region ? 1 : UZ_REGIONS.length} hint="Faol hududlar" />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading text-lg font-medium text-foreground">
            Joylashuvlar xaritasi
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-foreground" />
              <span className="text-muted-foreground">Salon</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Scissors className="size-3.5 text-foreground" />
              <span className="text-muted-foreground">Sartarosh</span>
            </div>
          </div>
        </div>

        <div className="h-[560px] w-full bg-background relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              <MapPin className="size-4 mr-2 animate-pulse" />
              Xarita yuklanmoqda...
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  <MapPin className="size-4 mr-2 animate-pulse" />
                  Xarita yuklanmoqda...
                </div>
              }
            >
              <AdminMap2GIS salons={salons} barbers={barbers} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
