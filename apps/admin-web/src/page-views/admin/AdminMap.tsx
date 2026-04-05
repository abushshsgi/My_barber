"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminBarbers, fetchAdminSalons } from "@/lib/admin-api";
import { UZ_REGIONS } from "@/lib/uz-regions";
import { Loader2, MapPin, Scissors, Store } from "lucide-react";

const AdminMapLeaflet = dynamic(() => import("./AdminMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] w-full items-center justify-center rounded-xl bg-muted/30">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

export default function AdminMap() {
  const [region, setRegion] = useState("");

  const salonQuery = useQuery({
    queryKey: ["admin", "map", "salons", region],
    queryFn: () =>
      fetchAdminSalons({
        region: region || undefined,
      }),
  });

  const barberQuery = useQuery({
    queryKey: ["admin", "map", "barbers", region],
    queryFn: () =>
      fetchAdminBarbers({
        region: region || undefined,
      }),
  });

  const salons = salonQuery.data?.results ?? [];
  const barbers = barberQuery.data?.results ?? [];

  const hasCoords = (lat?: string, lng?: string) => {
    const la = parseFloat(lat ?? "");
    const ln = parseFloat(lng ?? "");
    return Number.isFinite(la) && Number.isFinite(ln);
  };
  const salonPins = salons.filter((s) => hasCoords(s.latitude, s.longitude)).length;
  const barberPins = barbers.filter((b) => hasCoords(b.latitude, b.longitude)).length;

  const isLoading = salonQuery.isLoading || barberQuery.isLoading;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">Xarita</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Salonlar va sartaroshlar</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Ro&apos;yxatdan o&apos;tishda saqlangan joylashuvlar: salonlar (yashil nuqta), sartaroshlar profili
          (siyoh rang). GPS kiritilmaganlar xaritada chiqmaydi.
        </p>
      </div>

      <Card className="flex flex-col gap-4 border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            {isLoading ? "Yuklanmoqda…" : `${salonPins} salon · ${barberPins} sartarosh (nuqta)`}
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <span className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 shrink-0 rounded-full bg-[#059669] ring-2 ring-white/80" />
              <Store className="h-3.5 w-3.5 opacity-80" />
              Salon
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 shrink-0 rounded-full bg-[#7c3aed] ring-2 ring-white/80" />
              <Scissors className="h-3.5 w-3.5 opacity-80" />
              Sartarosh
            </span>
          </span>
        </div>
        <Select value={region || "__all"} onValueChange={(v) => setRegion(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-full max-w-md rounded-xl sm:w-[280px]">
            <SelectValue placeholder="Viloyat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Barcha viloyatlar</SelectItem>
            {UZ_REGIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden border-border/60 p-0">
        {isLoading ? (
          <div className="flex h-[min(70vh,560px)] min-h-[420px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="h-[min(70vh,560px)] min-h-[420px] w-full">
            <AdminMapLeaflet salons={salons} barbers={barbers} />
          </div>
        )}
      </Card>
    </div>
  );
}
