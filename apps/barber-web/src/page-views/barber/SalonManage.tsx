"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { mediaSrc } from "@/lib/media";
import {
  ChevronLeft,
  ImagePlus,
  Loader2,
  Trash2,
  Star,
  GripVertical,
  ChevronUp,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SalonImageRow = { id: number; image: string; sort_order: number };

type SalonDetail = {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  address: string;
  is_published?: boolean;
  cover_image: string | null;
  images: SalonImageRow[];
};

type MeUser = { id: number };

function imageUrl(path: string | null | undefined): string {
  return mediaSrc(path ?? null, "");
}

async function fetchSalon(id: number): Promise<SalonDetail> {
  const res = await apiFetch(`/api/v1/salons/${id}/`);
  if (res.status === 404) throw new Error("Salon topilmadi");
  if (!res.ok) throw new Error("Salon yuklanmadi");
  return res.json() as Promise<SalonDetail>;
}

async function fetchMe(): Promise<MeUser> {
  const res = await apiFetch("/api/v1/barber/auth/me/");
  if (!res.ok) throw new Error("Profil yuklanmadi");
  return res.json() as Promise<MeUser>;
}

export default function SalonManage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id;
  const salonId = typeof idParam === "string" ? parseInt(idParam, 10) : NaN;
  const galleryRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const {
    data: salon,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["salon", salonId],
    queryFn: () => fetchSalon(salonId),
    enabled: Number.isFinite(salonId) && salonId > 0,
  });

  const sortedImages = useMemo(() => {
    if (!salon?.images?.length) return [];
    return [...salon.images].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.id - b.id;
    });
  }, [salon?.images]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["salon", salonId] });

  const uploadGallery = useMutation({
    mutationFn: async (files: FileList) => {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("images", f));
      const res = await apiFetch(`/api/v1/salons/${salonId}/add_images/`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof (data as { detail?: string }).detail === "string"
            ? (data as { detail: string }).detail
            : "Rasmlar yuklanmadi"
        );
      }
    },
    onSuccess: () => {
      invalidate();
      setErr(null);
      if (galleryRef.current) galleryRef.current.value = "";
    },
    onError: (e: Error) => setErr(e.message),
  });

  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("cover", file);
      const res = await apiFetch(`/api/v1/salons/${salonId}/upload_cover/`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof (data as { detail?: string }).detail === "string"
            ? (data as { detail: string }).detail
            : "Oblojka yuklanmadi"
        );
      }
    },
    onSuccess: () => {
      invalidate();
      setErr(null);
      if (coverRef.current) coverRef.current.value = "";
    },
    onError: (e: Error) => setErr(e.message),
  });

  const setCoverFromGallery = useMutation({
    mutationFn: async (salonImageId: number) => {
      const res = await apiFetch(`/api/v1/salons/${salonId}/set_cover_from_gallery/`, {
        method: "POST",
        body: JSON.stringify({ salon_image_id: salonImageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof (data as { detail?: string }).detail === "string"
            ? (data as { detail: string }).detail
            : "Oblojka o‘rnatilmadi"
        );
      }
    },
    onSuccess: () => {
      invalidate();
      setErr(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const reorderImages = useMutation({
    mutationFn: async (imageIds: number[]) => {
      const res = await apiFetch(`/api/v1/salons/${salonId}/reorder_images/`, {
        method: "POST",
        body: JSON.stringify({ image_ids: imageIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof (data as { detail?: string }).detail === "string"
            ? (data as { detail: string }).detail
            : "Tartib saqlanmadi"
        );
      }
    },
    onSuccess: () => {
      invalidate();
      setErr(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const removeImage = useMutation({
    mutationFn: async (imageId: number) => {
      const res = await apiFetch(`/api/v1/salons/${salonId}/remove_image/`, {
        method: "POST",
        body: JSON.stringify({ image_id: imageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof (data as { detail?: string }).detail === "string"
            ? (data as { detail: string }).detail
            : "Rasm o‘chirilmadi"
        );
      }
    },
    onSuccess: () => {
      invalidate();
      setErr(null);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const busy =
    uploadGallery.isPending ||
    uploadCover.isPending ||
    setCoverFromGallery.isPending ||
    reorderImages.isPending ||
    removeImage.isPending;

  const applyReorder = (nextIds: number[]) => {
    reorderImages.mutate(nextIds);
  };

  const onDropOn = (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const ids = sortedImages.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    applyReorder(next);
  };

  const moveToFirst = (imageId: number) => {
    const ids = sortedImages.map((i) => i.id);
    const i = ids.indexOf(imageId);
    if (i <= 0) return;
    ids.splice(i, 1);
    ids.unshift(imageId);
    applyReorder(ids);
  };

  if (!Number.isFinite(salonId) || salonId <= 0) {
    return (
      <div className="min-h-screen p-6 text-center text-sm text-muted-foreground">
        Noto‘g‘ri salon manzili.
        <Button asChild variant="link" className="block mx-auto mt-2">
          <Link href="/salon">Orqaga</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isError || !salon) {
    return (
      <div className="min-h-screen p-6 text-center space-y-3">
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Xato"}</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/salon">Salonlar ro‘yxati</Link>
        </Button>
      </div>
    );
  }

  const isOwner = me?.id === salon.owner_id;
  const coverSrc = imageUrl(salon.cover_image ?? undefined);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-xl shrink-0" asChild>
          <Link href="/salon" aria-label="Orqaga">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold truncate">{salon.name}</h1>
          <p className="text-xs text-muted-foreground truncate">
            {salon.address?.trim() || "Salon boshqaruvi"}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {err && <p className="text-sm text-destructive text-center">{err}</p>}

        {/* Oblojka */}
        <Card className="p-4 rounded-2xl border border-border/60 overflow-hidden">
          <p className="text-sm font-medium mb-1">Oblojka</p>
          <p className="text-xs text-muted-foreground mb-3">
            Asosiy rasm — ro‘yxat va kartada ko‘rinadi. Yuklang yoki galereyadan tanlang.
          </p>
          <div className="aspect-[21/9] max-h-40 rounded-xl overflow-hidden bg-muted/40 border border-border/50 mb-3">
            {coverSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={coverSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                Oblojka yo‘q
              </div>
            )}
          </div>
          {isOwner && (
            <>
              <input
                ref={coverRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCover.mutate(f);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl w-full h-10 mb-2"
                disabled={busy}
                onClick={() => coverRef.current?.click()}
              >
                {uploadCover.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2 inline" />
                    Oblojka yuklash
                  </>
                )}
              </Button>
              {sortedImages.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Galereyadan tanlash</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {sortedImages.map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        disabled={busy}
                        onClick={() => setCoverFromGallery.mutate(img.id)}
                        className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border/60 ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl(img.image)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/55 text-[9px] text-white text-center py-0.5">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Galereya */}
        {isOwner ? (
          <Card className="p-4 rounded-2xl border border-border/60">
            <p className="text-sm font-medium mb-1">Galereya</p>
            <p className="text-xs text-muted-foreground mb-3">
              Bir nechta rasm qo‘shing. Tartibni o‘zgartirish: surib qo‘ying yoki «1-o‘ringa» tugmasi.
            </p>
            <input
              ref={galleryRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) uploadGallery.mutate(files);
              }}
            />
            <Button
              type="button"
              className="rounded-xl gold-gradient text-gold-foreground border-0 w-full h-11 mb-1"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
            >
              {uploadGallery.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" /> Yuklanmoqda...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2 inline" />
                  Galereyaga rasm qo‘shish
                </>
              )}
            </Button>
          </Card>
        ) : (
          <p className="text-xs text-muted-foreground text-center px-2">
            Rasmlarni faqat salon egasi boshqaradi.
          </p>
        )}

        {sortedImages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Galereya bo‘sh{isOwner ? " — yuqoridan rasm qo‘shing." : "."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sortedImages.map((img, idx) => (
              <div
                key={img.id}
                draggable={isOwner}
                onDragStart={() => isOwner && setDragId(img.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => {
                  if (isOwner) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!isOwner) return;
                  onDropOn(img.id);
                  setDragId(null);
                }}
                className={cn(
                  "relative aspect-square rounded-xl overflow-hidden border border-border/60 bg-muted/30 group",
                  dragId === img.id && "opacity-50 ring-2 ring-accent"
                )}
              >
                <span className="absolute top-1.5 left-1.5 z-10 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  {idx + 1}
                </span>
                {isOwner && (
                  <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
                    <span
                      className="bg-black/50 text-white p-1 rounded-md cursor-grab active:cursor-grabbing"
                      title="Surib tartibni o‘zgartiring"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(img.image)}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none"
                />
                {isOwner && (
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 p-1.5 bg-gradient-to-t from-black/75 to-transparent pt-6">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-[10px] px-1.5 flex-1 min-w-0 rounded-md"
                      disabled={busy || idx === 0}
                      onClick={() => moveToFirst(img.id)}
                    >
                      <ChevronUp className="h-3 w-3 mr-0.5 shrink-0" />
                      1-o‘ringa
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 px-1.5 rounded-md"
                      disabled={busy}
                      onClick={() => setCoverFromGallery.mutate(img.id)}
                      title="Oblojka qilish"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-7 px-1.5 rounded-md"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Bu rasmni o‘chirishni tasdiqlaysizmi?")) {
                          removeImage.mutate(img.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full rounded-xl"
          type="button"
          onClick={() => router.push("/salon")}
        >
          Barcha salonlar
        </Button>
      </div>
    </div>
  );
}
