"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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

export default function SalonViewGallery() {
  const [salonId, setSalonId] = useState<number | null>(null);

  const { data: salons = [] } = useQuery({
    queryKey: ["salons", "mine", "salon-view-gallery"],
    queryFn: fetchMineSalons,
    staleTime: 60_000,
  });

  const active = useMemo(() => salonId ?? salons[0]?.id ?? null, [salonId, salons]);

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ["salon-view", "gallery", active],
    queryFn: () => fetchSalonView(active!),
    enabled: !!active,
  });

  const images = useMemo(() => {
    const imgs = detail?.images ?? [];
    return imgs
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
  }, [detail?.images]);

  return (
    <SalonViewShell salonId={active} onSalonChange={setSalonId} title="Gallery">
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
            </Card>

            <Card className="rounded-3xl border-border/60 p-4">
              <p className="mb-3 text-sm font-semibold">Rasmlar</p>
              {images.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hozircha rasm yo‘q.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img) => (
                    <div key={img.id} className="aspect-square overflow-hidden rounded-2xl bg-muted">
                      <div className="relative h-full w-full">
                        <Image
                          src={mediaSrc(img.image, PLACEHOLDER_SALON)}
                          alt=""
                          fill
                          sizes="240px"
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </SalonViewShell>
  );
}

