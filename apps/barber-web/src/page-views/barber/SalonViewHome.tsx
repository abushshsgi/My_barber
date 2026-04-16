"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin, Phone, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_SALON } from "@/lib/media";
import SalonViewShell from "./SalonViewShell";
import type { BarberSalonViewDetail, SalonMineRow } from "./salon-view-types";
import Image from "next/image";

async function fetchMineSalons(): Promise<SalonMineRow[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) return [];
  return res.json() as Promise<SalonMineRow[]>;
}

async function fetchSalonView(id: number): Promise<BarberSalonViewDetail> {
  const res = await apiFetch(`/api/v1/salons/${id}/barber_view/`);
  if (!res.ok) throw new Error("Salon yuklanmadi");
  return res.json() as Promise<BarberSalonViewDetail>;
}

export default function SalonViewHome() {
  const [salonId, setSalonId] = useState<number | null>(null);

  const { data: salons = [] } = useQuery({
    queryKey: ["salons", "mine", "salon-view-home"],
    queryFn: fetchMineSalons,
    staleTime: 60_000,
  });

  const active = useMemo(() => salonId ?? salons[0]?.id ?? null, [salonId, salons]);

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ["salon-view", "detail", active],
    queryFn: () => fetchSalonView(active!),
    enabled: !!active,
  });

  return (
    <SalonViewShell salonId={active} onSalonChange={setSalonId} title="Salon">
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}
        {error && (
          <p className="text-center text-sm text-destructive">{(error as Error).message}</p>
        )}

        {!isLoading && !error && detail && (
          <>
            <Card className="overflow-hidden rounded-3xl border-border/60">
              <div className="relative h-44 w-full bg-muted md:h-56">
                <Image
                  src={mediaSrc(detail.cover_image, PLACEHOLDER_SALON)}
                  alt={detail.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 900px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="space-y-2 p-4 md:p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold tracking-tight">{detail.name}</h2>
                    {detail.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="tabular-nums">{Number(detail.rating_avg || 0).toFixed(1)}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      ({detail.review_count ?? 0})
                    </span>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-start gap-2 rounded-2xl bg-card/40 p-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Manzil</p>
                      <p className="text-sm">{detail.address || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-2xl bg-card/40 p-3">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Telefon</p>
                      <p className="text-sm">{detail.phone || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {detail.images?.length > 0 && (
              <Card className="rounded-3xl border-border/60 p-4">
                <p className="mb-3 text-sm font-semibold">Gallery preview</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {detail.images
                    .slice()
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
                    .slice(0, 12)
                    .map((img) => (
                      <div key={img.id} className="aspect-square overflow-hidden rounded-2xl bg-muted">
                        <div className="relative h-full w-full">
                          <Image
                            src={mediaSrc(img.image, PLACEHOLDER_SALON)}
                            alt=""
                            fill
                            sizes="160px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </SalonViewShell>
  );
}

